const tests = require("./index.js");

// https://github.com/isaacs/sax-js/issues/124
tests.test({
  xml: "<!-- stand alone comment -->",
  expect: [
    [
      "comment",
      " stand alone comment ",
    ],
  ],
  strict: true,
  opt: {},
});
