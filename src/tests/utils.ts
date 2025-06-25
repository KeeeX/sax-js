import create from "@keeex/utils-test/snapshot/node/snapshot.js";

import {ParserEvents} from "../consts.js";
import * as sax from "../sax.js";
import {SAXParserOpts} from "../saxparser.js";
import {EventHandler} from "../types.js";

export interface ParseEvent {
  eventType: keyof ParserEvents;
  value?: unknown;
}

interface Options {
  strict?: boolean;
  opt?: SAXParserOpts;
}

export const getParser = (
  options?: Options,
): {parseEvents: Array<ParseEvent>; parser: sax.SAXParser} => {
  const parser = sax.parser(options?.strict, options?.opt);
  const parseEvents: Array<ParseEvent> = [];
  const castedParser = parser as unknown as Record<string, EventHandler | undefined>;
  Object.entries(ParserEvents).forEach(([eventType, eventListener]) => {
    castedParser[eventListener] = (value) => {
      const evt: ParseEvent = {eventType: eventType as keyof ParserEvents};
      if (value) {
        if (value instanceof Error) {
          evt.value = value.message;
        } else {
          /**
           * This is to do a deep copy of the event as some event re-use same object and change value
           * in them. For exemple the event "opentagstart" object is the same as the event "opentag"
           * but at the time of opentagstart the value is incomplete and get filled as the parsing
           * continue.
           **/
          evt.value = JSON.parse(JSON.stringify(value));
        }
      }
      if (eventType === "error") {
        parser.resume();
      }
      parseEvents.push(evt);
    };
  });
  return {parseEvents, parser};
};

export const snapshotManager = create();

export const serializeEvents = (parseEvents: Array<ParseEvent>): Readonly<unknown> =>
  JSON.parse(JSON.stringify(parseEvents)) as Readonly<unknown>;
