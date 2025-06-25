import {getParser, snapshotManager} from "./utils.js";

describe("case", function () {
  it("should parse xml with default to uppercase", async function () {
    const {parseEvents, parser} = getParser({strict: false});
    parser.write('<span class="test" hello="world"></span>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should parse xml to lowercase", async function () {
    const {parseEvents, parser} = getParser({opt: {lowercase: true}, strict: false});
    parser.write('<span class="test" hello="world"></span>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should parse xml to lowercase with deprecated option", async function () {
    const {parseEvents, parser} = getParser({opt: {lowercasetags: true}, strict: false});
    parser.write('<span class="test" hello="world"></span>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
