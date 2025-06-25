import {getParser, snapshotManager} from "./utils.js";

describe("attribute with equals", function () {
  it("should not alter an attribute with multiple equals", async function () {
    const {parseEvents, parser} = getParser();
    parser.write('<a href="query.svc?x=1&y=2&z=3"/>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
