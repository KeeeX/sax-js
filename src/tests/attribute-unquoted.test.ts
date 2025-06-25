import {getParser, snapshotManager} from "./utils.js";

describe("attribute-unquoted", function () {
  it("should parse xml with unquoted attributes", async function () {
    const {parseEvents, parser} = getParser({
      strict: false,
      opt: {xmlns: true},
    });
    parser.write("<root length=12").write("345></root>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
