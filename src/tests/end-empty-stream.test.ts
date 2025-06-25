import {createStream} from "../../lib/sax.js";

describe("end empty stream", function () {
  it("should not throw", function () {
    const saxStream = createStream();
    saxStream.end();
  });
});
