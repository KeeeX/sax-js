import {getParser, snapshotManager} from "./utils.js";

describe("strict script hanlding", function () {
  it("should parse xml with script tag", async function () {
    const {parseEvents, parser} = getParser({
      strict: false,
      opt: {lowercase: true, noscript: true},
    });
    parser.write("<xml><script>hello world</script></xml>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should parse xml with script tag with ctag content", async function () {
    const {parseEvents, parser} = getParser({
      strict: false,
      opt: {lowercase: true, noscript: true},
    });
    parser.write("<xml><script><![CDATA[hello world]]></script></xml>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
