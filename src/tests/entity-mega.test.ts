import {ENTITIES} from "../consts.js";

import {getParser, snapshotManager} from "./utils.js";

describe("entity-mega", function () {
  it("should parse xml with mega entity", async function () {
    const {parseEvents, parser} = getParser();
    let xml = "<r>";
    for (const i of Object.keys(ENTITIES)) {
      xml += `&${i};`;
    }
    xml += "</r>";
    parser.write(xml).close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
