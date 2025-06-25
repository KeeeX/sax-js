import {getParser, snapshotManager} from "./utils.js";

describe("script close better", function () {
  it("should parse xml", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<html><head><script>'<div>foo</div></'</script></head></html>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
