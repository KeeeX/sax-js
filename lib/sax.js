/* eslint-disable max-lines, max-lines-per-function, max-statements */
const SAXParser = require("./saxparser.js");
const SAXStream = require("./saxstream.js");

const parser = function(strict, opt) {
  return new SAXParser(strict, opt);
};

const createStream = (strict, opt) => new SAXStream(strict, opt);

module.exports = {
  parser,
  createStream,
  SAXParser,
  SAXStream,
};
