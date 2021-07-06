const textopts = (opt, text) => {
  let result = text;
  if (opt.trim) result = result.trim();
  if (opt.normalize) result = result.replace(/\s+/gu, " ");
  return result;
};

const charAt = (chunk, i) => {
  let result = "";
  if (i < chunk.length) {
    result = chunk.charAt(i);
  }
  return result;
};

const isWhitespace = c => c === " " || c === "\n" || c === "\r" || c === "\t";

const isMatch = (regex, c) => regex.test(c);

const notMatch = (regex, c) => !isMatch(regex, c);

const isQuote = c => c === "\"" || c === "'";

const isAttribEnd = c => c === ">" || isWhitespace(c);

const qname = (name, attribute) => {
  const i = name.indexOf(":");
  const qualName = i < 0 ? ["", name] : name.split(":");
  let prefix = qualName[0];
  let local = qualName[1];

    // <x "xmlns"="http://foo">
  if (attribute && name === "xmlns") {
    prefix = "xmlns";
    local = "";
  }

  return {prefix, local};
};

module.exports = {
  textopts,
  charAt,
  isWhitespace,
  isMatch,
  isQuote,
  isAttribEnd,
  notMatch,
  qname,
};
