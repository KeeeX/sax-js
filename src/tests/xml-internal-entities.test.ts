import {getParser, snapshotManager} from "./utils.js";

describe("xml-internal-entities", function () {
  it("should parse xml with entities", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
    });
    const entitiesToTest: Record<string, boolean> = {
      /* eslint-disable @typescript-eslint/naming-convention */
      // 'ENTITY_NAME': IS_VALID || [invalidCharPos, invalidChar],
      "control0": true, // This is a vanilla control.
      // entityStart
      "_uscore": true,
      "#hash": true,
      ":colon": true,
      "-bad": false,
      ".bad": false,
      // general entity
      "u_score": true,
      "d-ash": true,
      "d.ot": true,
      "all:_#-.": true,
      /* eslint-enable @typescript-eslint/naming-convention */
    };
    let counter = 0;
    let xml = '<a test="&amp;" ';
    for (const entity of Object.keys(entitiesToTest)) {
      const attribName = `test${counter}`;
      const attribValue = `Testing ${entity}`;
      xml += `${attribName}="&${entity};" `;
      if (entitiesToTest[entity]) {
        parser.parserEntities[entity] = attribValue;
      }
      counter++;
    }
    xml += "/>";
    parser.write(xml).close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
