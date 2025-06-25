import {getParser, snapshotManager} from "./utils.js";

describe("emoji", function () {
  it("should parse xml with emoji", async function () {
    const {parseEvents, parser} = getParser({
      strict: false,
    });
    parser.write("<a>&#x1f525;</a>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
