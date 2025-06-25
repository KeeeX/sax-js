import {getParser, snapshotManager} from "./utils.js";

describe("script", function () {
  it("should parse xml", async function () {
    const {parseEvents, parser} = getParser();
    parser
      .write("<html><head><script>if (1 < 0) { console.log('elo there'); }</script></head></html>")
      .close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
