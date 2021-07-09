import tests from "./index.js";

tests.test({
  xml: "<r><![CDATA[ this is character data  ]]></r>",
  expect: [
    ["opentagstart", {"name": "R", "attributes": {}}],
    ["opentag", {"name": "R", "attributes": {}, "isSelfClosing": false}],
    ["opencdata", undefined],
    ["cdata", " this is character data  "],
    ["closecdata", undefined],
    ["closetag", "R"],
  ],
});
