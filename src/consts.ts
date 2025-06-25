/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */

import {EntitiesBaseList, EntitiesList, EventHandler, Namespace} from "./types.js";

// When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
// When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
// since that's the earliest that a buffer overrun could occur.  This way, checks are
// as rare as required, but as often as necessary to ensure never crossing this bound.
// Furthermore, buffers are only tested at most once per write(), so passing a very
// large string into write() might have undesirable effects, but this is manageable by
// the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
// edge case, result in creating at most one complete copy of the string passed in.
// Set to Infinity to have unlimited buffers.
export const MAX_BUFFER_LENGTH = 64 * 1024;

export enum BufferType {
  comment = "comment",
  sgmlDecl = "sgmlDecl",
  textNode = "textNode",
  tagName = "tagName",
  doctype = "doctype",
  procInstName = "procInstName",
  procInstBody = "procInstBody",
  entity = "entity",
  attribName = "attribName",
  attribValue = "attribValue",
  cdata = "cdata",
  script = "script",
}

export enum StreamEvents {
  text = "ontext",
  processinginstruction = "onprocessinginstruction",
  sgmldeclaration = "onsgmldeclaration",
  doctype = "ondoctype",
  comment = "oncomment",
  opentagstart = "onopentagstart",
  attribute = "onattribute",
  opentag = "onopentag",
  closetag = "onclosetag",
  opencdata = "onopencdata",
  cdata = "oncdata",
  closecdata = "onclosecdata",
  ready = "onready",
  script = "onscript",
  opennamespace = "onopennamespace",
  closenamespace = "onclosenamespace",
}

export interface StreamEventsInterface {
  ontext: Array<EventHandler>;
  onprocessinginstruction: Array<EventHandler>;
  onsgmldeclaration: Array<EventHandler>;
  ondoctype: Array<EventHandler>;
  oncomment: Array<EventHandler>;
  onopentagstart: Array<EventHandler>;
  onattribute: Array<EventHandler>;
  onopentag: Array<EventHandler>;
  onclosetag: Array<EventHandler>;
  onopencdata: Array<EventHandler>;
  oncdata: Array<EventHandler>;
  onclosecdata: Array<EventHandler>;
  onready: Array<EventHandler>;
  onscript: Array<EventHandler>;
  onopennamespace: Array<EventHandler>;
  onclosenamespace: Array<EventHandler>;
  onerror: Array<EventHandler>;
  onend: Array<EventHandler>;
}

export enum ParserEvents {
  text = "ontext",
  processinginstruction = "onprocessinginstruction",
  sgmldeclaration = "onsgmldeclaration",
  doctype = "ondoctype",
  comment = "oncomment",
  opentagstart = "onopentagstart",
  attribute = "onattribute",
  opentag = "onopentag",
  closetag = "onclosetag",
  opencdata = "onopencdata",
  cdata = "oncdata",
  closecdata = "onclosecdata",
  error = "onerror",
  end = "onend",
  ready = "onready",
  script = "onscript",
  opennamespace = "onopennamespace",
  closenamespace = "onclosenamespace",
}

export interface ParserEventsInterface {
  ontext: EventHandler | undefined;
  onprocessinginstruction: EventHandler | undefined;
  onsgmldeclaration: EventHandler | undefined;
  ondoctype: EventHandler | undefined;
  oncomment: EventHandler | undefined;
  onopentagstart: EventHandler | undefined;
  onattribute: EventHandler | undefined;
  onopentag: EventHandler | undefined;
  onclosetag: EventHandler | undefined;
  onopencdata: EventHandler | undefined;
  oncdata: EventHandler | undefined;
  onclosecdata: EventHandler | undefined;
  onerror: EventHandler | undefined;
  onend: EventHandler | undefined;
  onready: EventHandler | undefined;
  onscript: EventHandler | undefined;
  onopennamespace: EventHandler | undefined;
  onclosenamespace: EventHandler | undefined;
}

let S = 0;
/* eslint-disable sort-keys */
export const STATE: Record<string, number | string> = {
  BEGIN: S++, // leading byte order mark or whitespace
  BEGIN_WHITESPACE: S++, // leading whitespace
  TEXT: S++, // general stuff
  TEXT_ENTITY: S++, // &amp and such.
  OPEN_WAKA: S++, // <
  SGML_DECL: S++, // <!BLARG
  SGML_DECL_QUOTED: S++, // <!BLARG foo "bar
  DOCTYPE: S++, // <!DOCTYPE
  DOCTYPE_QUOTED: S++, // <!DOCTYPE "//blah
  DOCTYPE_DTD: S++, // <!DOCTYPE "//blah" [ ...
  DOCTYPE_DTD_QUOTED: S++, // <!DOCTYPE "//blah" [ "foo
  COMMENT_STARTING: S++, // <!-
  COMMENT: S++, // <!--
  COMMENT_ENDING: S++, // <!-- blah -
  COMMENT_ENDED: S++, // <!-- blah --
  CDATA: S++, // <![CDATA[ something
  CDATA_ENDING: S++, // ]
  CDATA_ENDING_2: S++, // ]]
  PROC_INST: S++, // <?hi
  PROC_INST_BODY: S++, // <?hi there
  PROC_INST_ENDING: S++, // <?hi "there" ?
  OPEN_TAG: S++, // <strong
  OPEN_TAG_SLASH: S++, // <strong /
  ATTRIB: S++, // <a
  ATTRIB_NAME: S++, // <a foo
  ATTRIB_NAME_SAW_WHITE: S++, // <a foo _
  ATTRIB_VALUE: S++, // <a foo=
  ATTRIB_VALUE_QUOTED: S++, // <a foo="bar
  ATTRIB_VALUE_CLOSED: S++, // <a foo="bar"
  ATTRIB_VALUE_UNQUOTED: S++, // <a foo=bar
  ATTRIB_VALUE_ENTITY_Q: S++, // <foo bar="&quot;"
  ATTRIB_VALUE_ENTITY_U: S++, // <foo bar=&quot
  CLOSE_TAG: S++, // </a
  CLOSE_TAG_SAW_WHITE: S++, // </a   >
  SCRIPT: S++, // <script> ...
  /* eslint-disable-next-line no-useless-assignment */
  SCRIPT_ENDING: S++, // <script> ... <
};
/* eslint-enable sort-keys */

export const XML_ENTITIES: EntitiesList = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

export const entitiesBase: EntitiesBaseList = {
  Aacute: 193,
  aacute: 225,
  Acirc: 194,
  acirc: 226,
  acute: 180,
  AElig: 198,
  aelig: 230,
  Agrave: 192,
  agrave: 224,
  alefsym: 8501,
  Alpha: 913,
  alpha: 945,
  amp: "&",
  and: 8743,
  ang: 8736,
  apos: "'",
  Aring: 197,
  aring: 229,
  asymp: 8776,
  Atilde: 195,
  atilde: 227,
  Auml: 196,
  auml: 228,
  bdquo: 8222,
  Beta: 914,
  beta: 946,
  brvbar: 166,
  bull: 8226,
  cap: 8745,
  Ccedil: 199,
  ccedil: 231,
  cedil: 184,
  cent: 162,
  Chi: 935,
  chi: 967,
  circ: 710,
  clubs: 9827,
  cong: 8773,
  copy: 169,
  crarr: 8629,
  cup: 8746,
  curren: 164,
  dagger: 8224,
  Dagger: 8225,
  darr: 8595,
  dArr: 8659,
  deg: 176,
  Delta: 916,
  delta: 948,
  diams: 9830,
  divide: 247,
  Eacute: 201,
  eacute: 233,
  Ecirc: 202,
  ecirc: 234,
  Egrave: 200,
  egrave: 232,
  empty: 8709,
  emsp: 8195,
  ensp: 8194,
  Epsilon: 917,
  epsilon: 949,
  equiv: 8801,
  Eta: 919,
  eta: 951,
  ETH: 208,
  eth: 240,
  Euml: 203,
  euml: 235,
  euro: 8364,
  exist: 8707,
  fnof: 402,
  forall: 8704,
  frac12: 189,
  frac14: 188,
  frac34: 190,
  frasl: 8260,
  Gamma: 915,
  gamma: 947,
  ge: 8805,
  gt: ">",
  harr: 8596,
  hArr: 8660,
  hearts: 9829,
  hellip: 8230,
  Iacute: 205,
  iacute: 237,
  Icirc: 206,
  icirc: 238,
  iexcl: 161,
  Igrave: 204,
  igrave: 236,
  image: 8465,
  infin: 8734,
  int: 8747,
  Iota: 921,
  iota: 953,
  iquest: 191,
  isin: 8712,
  Iuml: 207,
  iuml: 239,
  Kappa: 922,
  kappa: 954,
  Lambda: 923,
  lambda: 955,
  lang: 9001,
  laquo: 171,
  larr: 8592,
  lArr: 8656,
  lceil: 8968,
  ldquo: 8220,
  le: 8804,
  lfloor: 8970,
  lowast: 8727,
  loz: 9674,
  lrm: 8206,
  lsaquo: 8249,
  lsquo: 8216,
  lt: "<",
  macr: 175,
  mdash: 8212,
  micro: 181,
  middot: 183,
  minus: 8722,
  Mu: 924,
  mu: 956,
  nabla: 8711,
  nbsp: 160,
  ndash: 8211,
  ne: 8800,
  ni: 8715,
  not: 172,
  notin: 8713,
  nsub: 8836,
  Ntilde: 209,
  ntilde: 241,
  Nu: 925,
  nu: 957,
  Oacute: 211,
  oacute: 243,
  Ocirc: 212,
  ocirc: 244,
  OElig: 338,
  oelig: 339,
  Ograve: 210,
  ograve: 242,
  oline: 8254,
  Omega: 937,
  omega: 969,
  Omicron: 927,
  omicron: 959,
  oplus: 8853,
  or: 8744,
  ordf: 170,
  ordm: 186,
  Oslash: 216,
  oslash: 248,
  Otilde: 213,
  otilde: 245,
  otimes: 8855,
  Ouml: 214,
  ouml: 246,
  para: 182,
  part: 8706,
  permil: 8240,
  perp: 8869,
  Phi: 934,
  phi: 966,
  Pi: 928,
  pi: 960,
  piv: 982,
  plusmn: 177,
  pound: 163,
  prime: 8242,
  Prime: 8243,
  prod: 8719,
  prop: 8733,
  Psi: 936,
  psi: 968,
  quot: '"',
  radic: 8730,
  rang: 9002,
  raquo: 187,
  rarr: 8594,
  rArr: 8658,
  rceil: 8969,
  rdquo: 8221,
  real: 8476,
  reg: 174,
  rfloor: 8971,
  Rho: 929,
  rho: 961,
  rlm: 8207,
  rsaquo: 8250,
  rsquo: 8217,
  sbquo: 8218,
  Scaron: 352,
  scaron: 353,
  sdot: 8901,
  sect: 167,
  shy: 173,
  Sigma: 931,
  sigma: 963,
  sigmaf: 962,
  sim: 8764,
  spades: 9824,
  sub: 8834,
  sube: 8838,
  sum: 8721,
  sup: 8835,
  sup1: 185,
  sup2: 178,
  sup3: 179,
  supe: 8839,
  szlig: 223,
  Tau: 932,
  tau: 964,
  there4: 8756,
  Theta: 920,
  theta: 952,
  thetasym: 977,
  thinsp: 8201,
  THORN: 222,
  thorn: 254,
  tilde: 732,
  times: 215,
  trade: 8482,
  Uacute: 218,
  uacute: 250,
  uarr: 8593,
  uArr: 8657,
  Ucirc: 219,
  ucirc: 251,
  Ugrave: 217,
  ugrave: 249,
  uml: 168,
  upsih: 978,
  Upsilon: 933,
  upsilon: 965,
  Uuml: 220,
  uuml: 252,
  weierp: 8472,
  Xi: 926,
  xi: 958,
  Yacute: 221,
  yacute: 253,
  yen: 165,
  yuml: 255,
  Yuml: 376,
  Zeta: 918,
  zeta: 950,
  zwj: 8205,
  zwnj: 8204,
};

export const ENTITIES = Object.keys(entitiesBase).reduce<EntitiesList>((acc, key) => {
  const e = entitiesBase[key];
  const s = typeof e === "number" ? String.fromCharCode(e) : e;
  acc[key] = s;
  return acc;
}, {});

for (const s of Object.keys(STATE)) {
  STATE[STATE[s]] = s;
}

export const CDATA = "[CDATA[";
export const DOCTYPE = "DOCTYPE";
export const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
export const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
export const rootNS: Namespace = {xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE};

// this really needs to be replaced with character classes.
// XML allows all manner of ridiculous numbers and digits.

// http://www.w3.org/TR/REC-xml/#NT-NameStartChar
// This implementation works on strings, a single character at a time
// as such, it cannot ever support astral-plane characters (10000-EFFFF)
// without a significant breaking change to either this  parser, or the
// JavaScript language.  Implementation of an emoji-capable xml parser
// is left as an exercise for the reader.
export const nameStart =
  /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/u;
export const nameBody =
  // eslint-disable-next-line no-misleading-character-class
  /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/u;
export const entityStart =
  /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/u;
export const entityBody =
  // eslint-disable-next-line no-misleading-character-class
  /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/u;
