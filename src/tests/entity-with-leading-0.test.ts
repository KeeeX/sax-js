import {getParser, snapshotManager} from "./utils.js";

describe("entity-with-leading-0", function () {
  it("should parse xml with entity starting with 0", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
    });
    parser.write("<xml>&#Xd;&#X0d;\n</xml>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
