import {getParser, snapshotManager} from "./utils.js";

describe("cdata", function () {
  it("should parse xml with cdata", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<r><![CDATA[ this is character data  ]]></r>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
