import tests from "./index.js";

tests.test({
  expect: [
    ["opentagstart", {"name": "R", "attributes": {}}],
    ["opentag", {"name": "R", "attributes": {}, "isSelfClosing": false}],
    ["opencdata", undefined],
    ["cdata", " this is "],
    ["closecdata", undefined],
    ["opencdata", undefined],
    ["cdata", "character data  "],
    ["closecdata", undefined],
    ["closetag", "R"],
  ],
}).write("<r><![CDATA[ this is ]]>")
  .write("<![CDA")
  .write("T")
  .write("A[")
  .write("character data  ")
  .write("]]></r>")
  .close();
