import {getParser, snapshotManager} from "./utils.js";

describe("flush", function () {
  it("should parse xml with chunks flushed", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("<T>flush").flush().write("rest</T>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
