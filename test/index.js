/* eslint-disable no-console */
/* eslint-disable no-process-env */
import esMain from "es-main";
import t from "tap";
import * as sax from "../lib/sax.js";
import {ParserEvents} from "../lib/consts.js";

// handy way to do simple unit tests
// if the options contains an xml string, it'll be written and the parser closed.
// otherwise, it's assumed that the test will write and close.
const test = options => {
  const xml = options.xml;
  const parser = sax.parser(options.strict, options.opt);
  const expect = options.expect;
  let e = 0;
  Object.keys(ParserEvents).forEach(ev => {
    parser[`on${ev}`] = n => {
      if (process.env.DEBUG) {
        console.error({
          expect: expect[e],
          actual: [ev, n],
        });
      }
      if (e >= expect.length && (ev === "end" || ev === "ready")) {
        return;
      }
      t.ok(e < expect.length, "no unexpected events");

      if (!expect[e]) {
        t.fail("did not expect this event", {
          event: ev,
          expect,
          data: n,
        });
        return;
      }

      t.equal(ev, expect[e][0]);
      if (ev === "error") {
        t.equal(n.message, expect[e][1]);
      } else {
        t.same(n, expect[e][1]);
      }
      e++;
      if (ev === "error") {
        parser.resume();
      }
    };
  });
  if (xml) {
    parser.write(xml).close();
  }
  return parser;
};

if (esMain(import.meta)) {
  t.pass("common test file");
}

const exported = {
  sax,
  test,
};

export default exported;
