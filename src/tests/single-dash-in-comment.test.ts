import {getParser, snapshotManager} from "./utils.js";

describe("single-dash-in-comment", function () {
  it("should parse xml a single dash in comment", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
    });
    parser.write("<xml>\n<!-- \n  comment with a single dash- in it\n-->\n<data/>\n</xml>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
