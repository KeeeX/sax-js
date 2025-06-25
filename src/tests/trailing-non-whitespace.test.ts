import {getParser, snapshotManager} from "./utils.js";

describe("unclosed root", function () {
  it("should throw error", async function () {
    const {parseEvents, parser} = getParser({strict: true});
    parser.write("<root>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
