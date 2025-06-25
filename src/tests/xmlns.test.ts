import {getParser, snapshotManager} from "./utils.js";

describe("xmlns", function () {
  it("xmlns as tag name", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write("<xmlns/>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("attribute namespace in same parent", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write('<parent xmlns:a="http://ATTRIBUTE" a:attr="value" />').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("attribute namespace in same parent 2", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write('<parent a:attr="value" xmlns:a="http://ATTRIBUTE" />').close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("rebinding", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    const xml =
      '<root xmlns:x="x1" xmlns:y="y1" x:a="x1" y:a="y1">' +
      '<rebind xmlns:x="x2">' +
      '<check x:a="x2" y:a="y1"/>' +
      "</rebind>" +
      '<check x:a="x1" y:a="y1"/>' +
      "</root>";
    parser.write(xml).close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("strict", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    const xml =
      "<root>" +
      '<plain attr="normal" />' +
      '<ns1 xmlns="uri:default">' +
      '<plain attr="normal"/>' +
      "</ns1>" +
      '<ns2 xmlns:a="uri:nsa">' +
      '<plain attr="normal"/>' +
      '<a:ns a:attr="namespaced"/>' +
      "</ns2>" +
      "</root>";
    parser.write(xml).close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("unbound-element", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write("<unbound:root/>");
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("unbound-element 2", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write('<unbound:root xmlns:unbound="someuri"/>');
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("unbound", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write("<root unbound:attr='value'/>");
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("xml-default-ns", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write("<elm xmlns='http://foo' attr='bar'/>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("xml-default-prefix-attribute", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write("<root xml:lang='en'/>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("xml-default-prefix", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write("<xml:root/>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });

  it("xml-default-redefine", async function () {
    const {parseEvents, parser} = getParser({
      strict: true,
      opt: {xmlns: true},
    });
    parser.write("<xml:root xmlns:xml='ERROR'/>").close();
    await snapshotManager.evalSnapshot(this, parseEvents);
  });
});
