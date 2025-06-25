import {getParser, snapshotManager} from "./utils.js";

describe("cdata-end-split", function () {
  it("should parse xml with cdata end split", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<r><![CDATA[ this is ]").write("]>").write("</r>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
