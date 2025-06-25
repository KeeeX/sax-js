import {getParser, snapshotManager} from "./utils.js";

describe("handling of text outside root node", function () {
  it("should parse xml without error not in strict mode", async function () {
    const {parseEvents, parser} = getParser({
      strict: false,
    });
    parser.write("<root>abc</root>de<f").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should fail to parse xml in strict mode", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
    });
    parser.write("<root>abc</root>de<f").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
