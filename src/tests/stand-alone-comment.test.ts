import {getParser, snapshotManager} from "./utils.js";

describe("stand alone comment", function () {
  it("should parse xml only a comment", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
    });
    parser.write("<!-- stand alone comment -->").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
