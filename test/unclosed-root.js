const tests = require("./index.js");

tests.test({
  xml: "<root>",
  expect: [
    [
      "opentagstart",
      {
        name: "root",
        attributes: {},
      },
    ],
    [
      "opentag",
      {
        name: "root",
        attributes: {},
        isSelfClosing: false,
      },
    ],
    [
      "error",
      "Unclosed root tag\nLine: 0\nColumn: 6\nChar: ",
    ],
  ],
  strict: true,
  opt: {},
});
