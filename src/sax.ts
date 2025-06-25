import SAXParser, {SAXParserOpts} from "./saxparser.js";
import SAXStream from "./saxstream.js";

export const parser = (strict = false, opt: SAXParserOpts = {}): SAXParser =>
  new SAXParser(strict, opt);

export const createStream = (strict = false, opt: SAXParserOpts = {}): SAXStream =>
  new SAXStream(strict, opt);

export {SAXParser, SAXStream};
