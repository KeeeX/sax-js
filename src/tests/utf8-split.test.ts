import assert from "node:assert";

import {createStream} from "../sax.js";

describe("utf8-split", function () {
  it("should parse xml with utf8", function () {
    const saxStream = createStream();

    const b = Buffer.from("误");

    saxStream.on("text", (text) => {
      assert.equal(text, b.toString());
    });
    saxStream.write(Buffer.from("<test><a>"));
    saxStream.write(b.subarray(0, 1));
    saxStream.write(b.subarray(1));
    saxStream.write(Buffer.from("</a><b>"));
    saxStream.write(b.subarray(0, 2));
    saxStream.write(b.subarray(2));
    saxStream.write(Buffer.from("</b><c>"));
    saxStream.write(b);
    saxStream.write(Buffer.from("</c>"));
    saxStream.write(Buffer.concat([Buffer.from("<d>"), b.subarray(0, 1)]));
    saxStream.end(Buffer.concat([b.subarray(1), Buffer.from("</d></test>")]));
  });

  it("should parse xml with utf8 2", function () {
    const saxStream = createStream();

    const b = Buffer.from("误");

    saxStream.on("text", (text) => {
      assert.equal(text, "�");
    });

    saxStream.write(Buffer.from("<root>"));
    saxStream.write(Buffer.from("<e>"));
    saxStream.write(Buffer.from([0xc0]));
    saxStream.write(Buffer.from("</e>"));
    saxStream.write(Buffer.concat([Buffer.from("<f>"), b.subarray(0, 1)]));
    saxStream.write(Buffer.from("</root>"));
    saxStream.end();
  });
});
