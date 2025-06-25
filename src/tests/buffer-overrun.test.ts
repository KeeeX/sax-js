import {getParser, snapshotManager} from "./utils.js";

describe("buffer-overrun", function () {
  it("should overrun the buffer", async function () {
    // set this really low so that I don't have to put 64 MB of xml in here.
    const {parseEvents, parser} = getParser({opt: {maxBufferLength: 5}});
    parser
      .write("<abcdefghijklmn")
      .write("opqrstuvwxyzABC")
      .write("DEFGHIJKLMNOPQR")
      .write("STUVWXYZ>")
      .write("yo")
      .write("</abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ>")
      .close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
