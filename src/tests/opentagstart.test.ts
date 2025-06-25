import {getParser, snapshotManager} from "./utils.js";

describe("opentagstart", function () {
  it("should parse xml", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
    });
    parser.write("<root length='12345'></root>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
