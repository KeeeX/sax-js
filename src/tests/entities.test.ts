import {getParser, snapshotManager} from "./utils.js";

describe("entities", function () {
  it("should parse xml with entities", async function () {
    const {parseEvents, parser} = getParser();
    parser
      .write(
        "<r>&rfloor; &spades; &copy; &rarr; &amp; &lt; < <  <   < &gt; &real; &weierp; &euro;</r>",
      )
      .close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
