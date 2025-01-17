import tests from "./index.js";

tests.test({
  xml: "<xml:root/>",
  expect: [
    [
      "opentagstart",
      {
        name: "xml:root",
        attributes: {},
        ns: {},
      },
    ],
    [
      "opentag",
      {
        name: "xml:root",
        uri: "http://www.w3.org/XML/1998/namespace",
        prefix: "xml",
        local: "root",
        attributes: {},
        ns: {},
        isSelfClosing: true,
      },
    ],
    [
      "closetag",
      "xml:root",
    ],
  ],
  strict: true,
  opt: {xmlns: true},
});
