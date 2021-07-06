const tests = require("./index.js");

// split high-order numeric attributes into surrogate pairs
tests.test({
  xml: "<a>&#x1f525;</a>",
  expect: [
    ["opentagstart", {name: "A", attributes: {}}],
    ["opentag", {name: "A", attributes: {}, isSelfClosing: false}],
    ["text", "\ud83d\udd25"],
    ["closetag", "A"],
  ],
  strict: false,
  opt: {},
});
