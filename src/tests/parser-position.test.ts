import {ParserEvents} from "../consts.js";
import * as sax from "../sax.js";
import {EventHandler} from "../types.js";

import {ParseEvent, snapshotManager} from "./utils.js";

interface ParseEventPosition extends ParseEvent {
  position: number;
  startTagPosition: number;
}

export const getParser = (): {parseEvents: Array<ParseEvent>; parser: sax.SAXParser} => {
  const parser = sax.parser();
  const parseEvents: Array<ParseEventPosition> = [];
  const castedParser = parser as unknown as Record<string, EventHandler | undefined>;
  Object.entries(ParserEvents).forEach(([eventType, eventListener]) => {
    castedParser[eventListener] = (value) => {
      const evt: ParseEventPosition = {
        eventType: eventType as keyof ParserEvents,
        position: parser.position,
        startTagPosition: parser.startTagPosition,
      };
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

describe("parser-position", function () {
  it("parser should have the position of the event", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<div>abcdefgh</div>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("parser should have the position of the event 2", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<div>abcde").write("fgh</div>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
