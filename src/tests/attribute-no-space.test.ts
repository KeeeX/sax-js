import {getParser, snapshotManager} from "./utils.js";

describe("attribute-no-space", function () {
  it("should parse as parser is not strict", async function () {
    const {parseEvents, parser} = getParser({
      strict: false,
      opt: {lowercase: true},
    });
    parser.write('<root attr1="first"attr2="second"/>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  /**
   * the reason it continue to parse is because there is a onError handler that tells the parser to
   * continue and not throw an error
   */
  it("should parse but have an error as the parser is in strict mode", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {lowercase: true},
    });
    parser.write('<root attr1="first"attr2="second"/>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should parse as xml is valid", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {lowercase: true},
    });
    parser.write('<root attr1="first" attr2="second"/>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should parse as xml is valid with newline as whitespace", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {lowercase: true},
    });
    parser.write('<root attr1="first"\nattr2="second"/>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("should parse as xml is valid with multiple spaces", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {lowercase: true},
    });
    parser.write('<root attr1="first"  attr2="second"/>').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
