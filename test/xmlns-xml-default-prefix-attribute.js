import tests from "./index.js";

tests.test({
  xml: "<root xml:lang='en'/>",
  expect: [
    [
      "opentagstart",
      {
        name: "root",
        attributes: {},
        ns: {},
      },
    ],
    [
      "attribute",
      {
        name: "xml:lang",
        local: "lang",
        prefix: "xml",
        uri: "http://www.w3.org/XML/1998/namespace",
        value: "en",
      },
    ],
    [
      "opentag",
      {
        name: "root",
        uri: "",
        prefix: "",
        local: "root",
        attributes: {
          "xml:lang": {
            name: "xml:lang",
            local: "lang",
            prefix: "xml",
            uri: "http://www.w3.org/XML/1998/namespace",
            value: "en",
          },
        },
        ns: {},
        isSelfClosing: true,
      },
    ],
    [
      "closetag",
      "root",
    ],
  ],
  strict: true,
  opt: {xmlns: true},
});
