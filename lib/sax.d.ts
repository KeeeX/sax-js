import SAXParser, { SAXParserOpts } from "./saxparser.js";
import SAXStream from "./saxstream.js";
export declare const parser: (strict?: boolean, opt?: SAXParserOpts) => SAXParser;
export declare const createStream: (strict?: boolean, opt?: SAXParserOpts) => SAXStream;
export { SAXParser, SAXStream, };
declare const exported: {
    parser: (strict?: boolean, opt?: SAXParserOpts) => SAXParser;
    createStream: (strict?: boolean, opt?: SAXParserOpts) => SAXStream;
    SAXParser: typeof SAXParser;
    SAXStream: typeof SAXStream;
};
export default exported;
//# sourceMappingURL=sax.d.ts.map