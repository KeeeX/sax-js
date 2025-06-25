import {getParser, snapshotManager} from "./utils.js";

describe("unbalanced quote in processing instruction", function () {
  it("should parse xml", async function () {
    const {parseEvents, parser} = getParser({
      strict: false,
      opt: {lowercase: true, noscript: true},
    });
    parser.write('<?has unbalanced "quotes?><xml>body</xml>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
