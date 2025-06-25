import {getParser, snapshotManager} from "./utils.js";

describe("not string", function () {
  it("should parse xml with attributes", async function () {
    const {parseEvents, parser} = getParser({strict: true});
    parser.write(Buffer.from("<x>y</x>")).close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
