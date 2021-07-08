/* eslint-disable max-lines, max-lines-per-function, max-statements */
import SAXParser from "./saxparser.js";
import SAXStream from "./saxstream.js";

export const parser = function(strict, opt) {
  return new SAXParser(strict, opt);
};

export const createStream = (strict, opt) => new SAXStream(strict, opt);

export {
  SAXParser,
  SAXStream,
};
