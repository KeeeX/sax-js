import t from "tap";
import {parser as createParser} from "../lib/sax.js";

const parser = createParser(true);

t.plan(1);
parser.onopentag = node => {
  t.same(node, {name: "x", attributes: {}, isSelfClosing: false});
};
const xml = Buffer.from("<x>y</x>");
parser.write(xml).close();
