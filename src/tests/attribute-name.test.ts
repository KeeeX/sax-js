import {getParser, snapshotManager} from "./utils.js";

describe("attribute-name", function () {
  it("should parse xml with attributes", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write("<root length='12345'></root>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
