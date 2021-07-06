const {ENTITIES} = require("../lib/consts.js");
const tests = require("./index.js");

let xml = "<r>";
let text = "";
for (const i of Object.keys(ENTITIES)) {
  xml += `&${i};`;
  text += ENTITIES[i];
}
xml += "</r>";
tests.test({
  xml,
  expect: [
    ["opentagstart", {"name": "R", "attributes": {}}],
    ["opentag", {"name": "R", "attributes": {}, "isSelfClosing": false}],
    ["text", text],
    ["closetag", "R"],
  ],
});
