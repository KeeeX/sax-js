import tests from "./index.js";

tests.test({
  strict: true,
  opt: {xmlns: true},
  expect: [
    [
      "opentagstart",
      {
        name: "unbound:root",
        attributes: {},
        ns: {},
      },
    ],
    [
      "error",
      "Unbound namespace prefix: \"unbound:root\"\nLine: 0\nColumn: 15\nChar: >",
    ],
    [
      "opentag",
      {
        name: "unbound:root",
        uri: "unbound",
        prefix: "unbound",
        local: "root",
        attributes: {},
        ns: {},
        isSelfClosing: true,
      },
    ],
    [
      "closetag",
      "unbound:root",
    ],
  ],
}).write("<unbound:root/>");

tests.test({
  strict: true,
  opt: {xmlns: true},
  expect: [
    [
      "opentagstart",
      {
        name: "unbound:root",
        attributes: {},
        ns: {},
      },
    ],
    [
      "opennamespace",
      {
        prefix: "unbound",
        uri: "someuri",
      },
    ],
    [
      "attribute",
      {
        name: "xmlns:unbound",
        value: "someuri",
        prefix: "xmlns",
        local: "unbound",
        uri: "http://www.w3.org/2000/xmlns/",
      },
    ],
    [
      "opentag",
      {
        name: "unbound:root",
        uri: "someuri",
        prefix: "unbound",
        local: "root",
        attributes: {
          "xmlns:unbound": {
            name: "xmlns:unbound",
            value: "someuri",
            prefix: "xmlns",
            local: "unbound",
            uri: "http://www.w3.org/2000/xmlns/",
          },
        },
        ns: {"unbound": "someuri"},
        isSelfClosing: true,
      },
    ],
    [
      "closetag",
      "unbound:root",
    ],
    [
      "closenamespace",
      {
        prefix: "unbound",
        uri: "someuri",
      },
    ],
  ],
}).write("<unbound:root xmlns:unbound=\"someuri\"/>");
