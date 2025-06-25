import {getParser, snapshotManager} from "./utils.js";

describe("trailing attribute no value", function () {
  it("should parse xml with trailing attributes without value", async function () {
    const {parseEvents, parser} = getParser({
      opt: {trim: true},
    });
    parser.write("<root attrib>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
