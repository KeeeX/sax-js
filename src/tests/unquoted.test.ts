import {getParser, snapshotManager} from "./utils.js";

describe("unquoted", function () {
  it("should parse xml with unquotted attributes", async function () {
    const {parseEvents, parser} = getParser({
      strict: false,
    });
    parser.write("<span class=test hello=world></span>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
