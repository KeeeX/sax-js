import tests from "./index.js";

const iExpect = [];
const myAttributes = {};
const ENTITIES = {};

// generates xml like test0="&control;"
const entitiesToTest = {
  // 'ENTITY_NAME': IS_VALID || [invalidCharPos, invalidChar],
  "control0": true, // This is a vanilla control.
  // entityStart
  "_uscore": true,
  "#hash": true,
  ":colon": true,
  "-bad": [0, "-"],
  ".bad": [0, "."],
  // general entity
  "u_score": true,
  "d-ash": true,
  "d.ot": true,
  "all:_#-.": true,
};

let xmlStart = "<a test=\"&amp;\" ";
const xmlEnd = "/>";

iExpect.push([
  "opentagstart",
  {
    name: "a",
    attributes: {},
  },
]);

iExpect.push([
  "attribute",
  {
    name: "test",
    value: "&",
  },
]);
myAttributes["test"] = "&";

let entI = 0;

for (const entity of Object.keys(entitiesToTest)) {
  const attribName = `test${entI}`;
  const attribValue = `Testing ${entity}`;

  // add the first part to use in calculation below
  xmlStart += `${attribName}="&`;

  if (typeof entitiesToTest[entity] === "object") {
    iExpect.push([
      "error",
      `Invalid character in entity name\nLine: 0\nColumn: ${
        xmlStart.length + entitiesToTest[entity][0] + 1
      }\nChar: ${entitiesToTest[entity][1]}`,
    ]);
    iExpect.push([
      "attribute",
      {name: attribName, value: `&${entity};`},
    ]);
    myAttributes[attribName] = `&${entity};`;
  } else {
    ENTITIES[entity] = attribValue;
    iExpect.push(["attribute", {name: attribName, value: attribValue}]);
    myAttributes[attribName] = attribValue;
  }

  xmlStart += `${entity};" `;
  entI++;
}

iExpect.push([
  "opentag",
  {
    name: "a",
    attributes: myAttributes,
    isSelfClosing: true,
  },
]);
iExpect.push(["closetag", "a"]);

const parser = tests.test({
  strict: true,
  expect: iExpect,
});

for (const entity of Object.keys(entitiesToTest)) {
  parser.parserEntities[entity] = ENTITIES[entity];
}

parser.write(xmlStart + xmlEnd).close();
