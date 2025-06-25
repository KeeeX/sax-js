import {getParser, snapshotManager} from "./utils.js";

describe("cyrillic", function () {
  it("should parse xml with cyrillic", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<Р>тест</Р>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
