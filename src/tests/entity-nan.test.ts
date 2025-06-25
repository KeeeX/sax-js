import {getParser, snapshotManager} from "./utils.js";

describe("attribute-nan", function () {
  it("should parse xml with NaN", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<r>&#NaN;</r>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
