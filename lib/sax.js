"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAXStream = exports.SAXParser = exports.createStream = exports.parser = void 0;
/* eslint-disable max-lines, max-lines-per-function, max-statements */
const saxparser_js_1 = __importDefault(require("./saxparser.js"));
exports.SAXParser = saxparser_js_1.default;
const saxstream_js_1 = __importDefault(require("./saxstream.js"));
exports.SAXStream = saxstream_js_1.default;
const parser = (strict = false, opt = {}) => new saxparser_js_1.default(strict, opt);
exports.parser = parser;
const createStream = (strict = false, opt = {}) => new saxstream_js_1.default(strict, opt);
exports.createStream = createStream;
//# sourceMappingURL=sax.js.map