import {getParser, snapshotManager} from "./utils.js";

describe("duplicate-attribute", function () {
  it("should parse xml with duplicate attributes", async function () {
    const {parseEvents, parser} = getParser({strict: false});
    parser.write('<span id="hello" id="there"></span>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
