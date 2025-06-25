import {getParser, snapshotManager} from "./utils.js";

describe("cdata-fake-end", function () {
  it("should parse xml with cdata", async function () {
    const {parseEvents, parser} = getParser();
    const x = "<r><![CDATA[[[[[[[[[]]]]]]]]]]></r>";
    for (let i = 0; i < x.length; i++) {
      parser.write(x.charAt(i));
    }
    parser.close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should parse xml with cdata 2", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<r><![CDATA[[[[[[[[[]]]]]]]]]]></r>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
