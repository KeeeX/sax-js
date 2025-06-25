import {getParser, snapshotManager} from "./utils.js";

describe("self closing", function () {
  it("self closing child", async function () {
    const {parseEvents, parser} = getParser({strict: false});
    parser.write("<root><child><haha /></child><monkey>=(|)</monkey></root>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("self closing child strict", async function () {
    const {parseEvents, parser} = getParser({strict: true});
    parser.write("<root><child><haha /></child><monkey>=(|)</monkey></root>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("self closing tag", async function () {
    const {parseEvents, parser} = getParser({strict: true});
    parser.write("<root>   <haha /> <haha/>  <monkey> =(|)     </monkey></root>  ").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
