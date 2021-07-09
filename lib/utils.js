"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qname = exports.isAttribEnd = exports.isQuote = exports.notMatch = exports.isMatch = exports.isWhitespace = exports.charAt = exports.textopts = void 0;
const textopts = (opt, text) => {
    let result = text;
    if (opt.trim)
        result = result.trim();
    if (opt.normalize)
        result = result.replace(/\s+/gu, " ");
    return result;
};
exports.textopts = textopts;
const charAt = (chunk, i) => {
    let result = "";
    if (i < chunk.length) {
        result = chunk.charAt(i);
    }
    return result;
};
exports.charAt = charAt;
const isWhitespace = (c) => c === " " || c === "\n" || c === "\r" || c === "\t";
exports.isWhitespace = isWhitespace;
const isMatch = (regex, c) => regex.test(c);
exports.isMatch = isMatch;
const notMatch = (regex, c) => !exports.isMatch(regex, c);
exports.notMatch = notMatch;
const isQuote = (c) => c === "\"" || c === "'";
exports.isQuote = isQuote;
const isAttribEnd = (c) => c === ">" || exports.isWhitespace(c);
exports.isAttribEnd = isAttribEnd;
const qname = (name, attribute = false) => {
    const i = name.indexOf(":");
    const qualName = i < 0 ? ["", name] : name.split(":");
    let prefix = qualName[0];
    let local = qualName[1];
    // <x "xmlns"="http://foo">
    if (attribute && name === "xmlns") {
        prefix = "xmlns";
        local = "";
    }
    return { prefix, local };
};
exports.qname = qname;
//# sourceMappingURL=utils.js.map