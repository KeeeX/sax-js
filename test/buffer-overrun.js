// set this really low so that I don't have to put 64 MB of xml in here.
import tests from "./index.js";

tests.test({
  opt: {maxBufferLength: 5},
  expect: [
    ["error", "Max buffer length exceeded: tagName\nLine: 0\nColumn: 15\nChar: "],
    ["error", "Max buffer length exceeded: tagName\nLine: 0\nColumn: 30\nChar: "],
    ["error", "Max buffer length exceeded: tagName\nLine: 0\nColumn: 45\nChar: "],
    ["opentagstart", {
      "name": "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "attributes": {},
    }],
    ["opentag", {
      "name": "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "attributes": {},
      "isSelfClosing": false,
    }],
    ["text", "yo"],
    ["closetag", "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ"],
  ],
})
  .write("<abcdefghijklmn")
  .write("opqrstuvwxyzABC")
  .write("DEFGHIJKLMNOPQR")
  .write("STUVWXYZ>")
  .write("yo")
  .write("</abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ>")
  .close();
