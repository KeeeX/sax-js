const t = require("tap");
const parser = require("../lib/sax.js").parser(true);

t.plan(1);
parser.onopentag = node => {
  t.same(node, {name: "x", attributes: {}, isSelfClosing: false});
};
const xml = Buffer.from("<x>y</x>");
parser.write(xml).close();
