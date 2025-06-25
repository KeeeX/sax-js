import {getParser, snapshotManager} from "./utils.js";

describe("stray-ending", function () {
  it("should parse xml with stray ending in unstrict mode", async function () {
    const {parseEvents, parser} = getParser({strict: false});
    parser.write("<a><b></c></b></a>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
