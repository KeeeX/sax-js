import {getParser, snapshotManager} from "./utils.js";

describe("cdata-multiple", function () {
  it("should parse xml with multiple cdata", async function () {
    const {parseEvents, parser} = getParser();
    parser
      .write("<r><![CDATA[ this is ]]>")
      .write("<![CDA")
      .write("T")
      .write("A[")
      .write("character data  ")
      .write("]]></r>")
      .close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
