import {getParser, snapshotManager} from "./utils.js";

describe("byte order mark (bom)", function () {
  it("should ignore bom at the start", async function () {
    const {parseEvents, parser} = getParser();
    parser.write("\uFEFF<P></P>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should consume bom", async function () {
    const {parseEvents, parser} = getParser();
    parser.write('\uFEFF<P BOM="\uFEFF">\uFEFFStarts and ends with BOM\uFEFF</P>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should error as bom after whitespace is invalid", async function () {
    const {parseEvents, parser} = getParser({strict: true});
    parser.write(" \uFEFF<P></P>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should error as there is two bom at the start", async function () {
    const {parseEvents, parser} = getParser({strict: true});
    parser.write("\uFEFF\uFEFF<P></P>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
