import tests from "./index.js";

// https://github.com/isaacs/sax-js/issues/35
tests.test({
  xml: "<xml>&#Xd;&#X0d;\n</xml>",
  expect: [
    ["opentagstart", {name: "xml", attributes: {}}],
    ["opentag", {name: "xml", attributes: {}, isSelfClosing: false}],
    ["text", "\r\r\n"],
    ["closetag", "xml"],
  ],
  strict: true,
  opt: {},
});
