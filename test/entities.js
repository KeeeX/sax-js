import tests from "./index.js";

tests.test({
  xml: "<r>&rfloor; "
    + "&spades; &copy; &rarr; &amp; "
    + "&lt; < <  <   < &gt; &real; &weierp; &euro;</r>",
  expect: [
    ["opentagstart", {"name": "R", "attributes": {}}],
    ["opentag", {"name": "R", "attributes": {}, "isSelfClosing": false}],
    ["text", "⌋ ♠ © → & < < <  <   < > ℜ ℘ €"],
    ["closetag", "R"],
  ],
});
