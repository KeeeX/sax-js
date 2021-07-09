export interface TextOpts {
  trim?: boolean;
  normalize?: boolean;
}

export const textopts = (opt: TextOpts, text: string): string => {
  let result = text;
  if (opt.trim) result = result.trim();
  if (opt.normalize) result = result.replace(/\s+/gu, " ");
  return result;
};

export const charAt = (chunk: string, i: number): string => {
  let result = "";
  if (i < chunk.length) {
    result = chunk.charAt(i);
  }
  return result;
};

export const isWhitespace = (c: string): boolean => c === " " || c === "\n" || c === "\r" || c === "\t";

export const isMatch = (regex: RegExp, c: string): boolean => regex.test(c);

export const notMatch = (regex: RegExp, c: string): boolean => !isMatch(regex, c);

export const isQuote = (c: string): boolean => c === "\"" || c === "'";

export const isAttribEnd = (c: string): boolean => c === ">" || isWhitespace(c);

export const qname = (name: string, attribute = false): {
  prefix: string;
  local: string;
} => {
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
