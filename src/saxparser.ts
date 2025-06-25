/* eslint-disable max-lines */
import {
  BufferType,
  MAX_BUFFER_LENGTH,
  STATE,
  XML_ENTITIES,
  ENTITIES,
  rootNS,
  CDATA,
  DOCTYPE,
  nameStart,
  nameBody,
  entityBody,
  entityStart,
  XML_NAMESPACE,
  XMLNS_NAMESPACE,
  ParserEvents,
  ParserEventsInterface,
} from "./consts.js";
import {EntitiesList, EventHandler, Namespace, TagElem} from "./types.js";
import {
  textopts,
  charAt,
  isMatch,
  isQuote,
  isAttribEnd,
  qname,
  isWhitespace,
  notMatch,
  TextOpts,
} from "./utils.js";

export interface SAXParserOpts extends TextOpts {
  maxBufferLength?: number;
  lowercase?: boolean;
  lowercasetags?: boolean;
  noscript?: boolean;
  strictEntities?: boolean;
  xmlns?: boolean;
  position?: boolean;
}

const emptyBuffers: Record<BufferType, string> = {
  attribName: "",
  attribValue: "",
  cdata: "",
  comment: "",
  doctype: "",
  entity: "",
  procInstBody: "",
  procInstName: "",
  script: "",
  sgmlDecl: "",
  tagName: "",
  textNode: "",
};

type CaseFunction = (str: string) => string;

const cfToLowerCase = (str: string): string => str.toLowerCase();
const cfToUpperCase = (str: string): string => str.toUpperCase();

export default class SAXParser implements ParserEventsInterface {
  public ontext: EventHandler | undefined;
  public onprocessinginstruction: EventHandler | undefined;
  public onsgmldeclaration: EventHandler | undefined;
  public ondoctype: EventHandler | undefined;
  public oncomment: EventHandler | undefined;
  public onopentagstart: EventHandler | undefined;
  public onattribute: EventHandler | undefined;
  public onopentag: EventHandler | undefined;
  public onclosetag: EventHandler | undefined;
  public onopencdata: EventHandler | undefined;
  public oncdata: EventHandler | undefined;
  public onclosecdata: EventHandler | undefined;
  public onerror: EventHandler | undefined;
  public onend: EventHandler | undefined;
  public onready: EventHandler | undefined;
  public onscript: EventHandler | undefined;
  public onopennamespace: EventHandler | undefined;
  public onclosenamespace: EventHandler | undefined;
  private readonly strict: boolean;
  private readonly opt: SAXParserOpts = {};
  private q = "";
  private c = "";
  private bufferCheckPosition = MAX_BUFFER_LENGTH;
  private maxBufferLength = MAX_BUFFER_LENGTH;
  private looseCase: CaseFunction = cfToLowerCase;
  private tags: Array<TagElem> = [];
  private closed = false;
  private closedRoot = false;
  private sawRoot = false;
  private tag: TagElem | null = null;
  private error: Error | null = null;
  private noscript = true;
  private state = STATE.BEGIN;
  private strictEntities = false;
  public parserEntities: EntitiesList = {};
  private attribList: Array<Array<string>> = [];
  private namespace: Namespace | undefined;
  private trackPosition = false;
  #position = 0;
  private line = 0;
  private column = 0;
  private buffers: Record<BufferType, string> = {...emptyBuffers};
  #startTagPosition = 0;
  private sawDoctype = false;

  public constructor(strict = false, opt: SAXParserOpts = {}) {
    this.strict = Boolean(strict);
    this.opt = opt;
    this.fullReset();
  }

  public get ns(): Namespace | undefined {
    return this.namespace;
  }

  public get position(): number {
    return this.#position;
  }

  public get startTagPosition(): number {
    return this.#startTagPosition;
  }

  public emit(event: ParserEvents, data?: unknown): void {
    const handler = this[event];
    if (handler) handler(data);
  }

  public resume(): this {
    this.error = null;
    return this;
  }

  public close(): this {
    return this.write(null);
  }

  public flush(): this {
    this.flushBuffers();
    return this;
  }

  public write(rawChunk: string | Uint8Array | null): this {
    if (this.error) {
      throw this.error;
    }
    if (this.closed) {
      return this.raiseError("Cannot write after close. Assign an onready handler.");
    }
    if (rawChunk === null) {
      return this.end();
    }
    /* eslint-disable-next-line @typescript-eslint/init-declarations */
    let chunk;
    if (typeof rawChunk === "string") {
      chunk = rawChunk;
    } else {
      chunk = new TextDecoder().decode(rawChunk);
    }
    let i = 0;
    while ((this.c = charAt(chunk, i++))) {
      const c = this.c;
      if (this.trackPosition) {
        this.#position++;
        if (c === "\n") {
          this.line++;
          this.column = 0;
        } else {
          this.column++;
        }
      }

      i = this.readStateRouter(i, chunk);
    } // while

    if (this.#position >= this.bufferCheckPosition) {
      this.checkBufferLength();
    }
    return this;
  }

  public end(): this {
    if (this.sawRoot && !this.closedRoot) this.strictFail("Unclosed root tag");
    if (
      this.state !== STATE.BEGIN &&
      this.state !== STATE.BEGIN_WHITESPACE &&
      this.state !== STATE.TEXT
    ) {
      this.raiseError("Unexpected end");
    }
    this.closeText();
    this.c = "";
    this.closed = true;
    this.emit(ParserEvents.end);
    this.fullReset();
    return this;
  }

  private resetDefault(): void {
    this.q = "";
    this.c = "";
    this.tags = [];
    this.closed = false;
    this.closedRoot = false;
    this.sawRoot = false;
    this.tag = null;
    this.error = null;
    this.attribList = [];
    this.#position = 0;
    this.line = 0;
    this.column = 0;
    this.#startTagPosition = 0;
  }

  private fullReset(): void {
    this.clearBuffers();
    this.resetDefault();
    this.bufferCheckPosition = this.opt.maxBufferLength ?? MAX_BUFFER_LENGTH;
    this.maxBufferLength = this.bufferCheckPosition;
    this.opt.lowercase = this.opt.lowercase ?? this.opt.lowercasetags;
    this.looseCase = this.opt.lowercase ? cfToLowerCase : cfToUpperCase;
    this.noscript = Boolean(this.strict || this.opt.noscript);
    this.state = STATE.BEGIN;
    this.strictEntities = Boolean(this.opt.strictEntities);
    this.parserEntities = (
      this.strictEntities ? Object.create(XML_ENTITIES) : Object.create(ENTITIES)
    ) as EntitiesList;

    // namespaces form a prototype chain.
    // it always points at the current tag,
    // which protos to its parent tag.
    if (this.opt.xmlns) {
      this.namespace = Object.create(rootNS) as Namespace;
    }

    // mostly just for error reporting
    this.trackPosition = this.opt.position !== false;
    this.emit(ParserEvents.ready);
  }

  private checkBufferLength(): void {
    const SAFETY_LENGTH = 10;
    const maxAllowed = Math.max(this.maxBufferLength, SAFETY_LENGTH);
    let maxActual = 0;
    for (const bufferType of Object.values(BufferType)) {
      const len = this.buffers[bufferType].length;
      if (len > maxAllowed) {
        // Text/cdata nodes can get big, and since they're buffered,
        // we can get here under normal conditions.
        // Avoid issues by emitting the text node now,
        // so at least it won't get any bigger.
        switch (bufferType) {
          case BufferType.textNode:
            this.closeText();
            break;

          case BufferType.cdata:
            this.emitNode(ParserEvents.cdata, this.buffers[bufferType]);
            this.buffers[bufferType] = "";
            break;

          case BufferType.script:
            this.emitNode(ParserEvents.script, this.buffers[bufferType]);
            this.buffers[bufferType] = "";
            break;

          default:
            this.raiseError(`Max buffer length exceeded: ${bufferType}`);
        }
      }
      maxActual = Math.max(maxActual, len);
    }
    // schedule the next check for the earliest possible buffer overrun.
    const m = this.maxBufferLength - maxActual;
    this.bufferCheckPosition = m + this.#position;
  }

  private closeText(): void {
    this.buffers[BufferType.textNode] = textopts(this.opt, this.buffers[BufferType.textNode]);
    if (this.buffers[BufferType.textNode]) {
      this.emit(ParserEvents.text, this.buffers[BufferType.textNode]);
    }
    this.buffers[BufferType.textNode] = "";
  }

  private clearBuffers(): void {
    this.buffers = {...emptyBuffers};
  }

  private emitNode(nodeType: ParserEvents, data?: unknown): void {
    if (this.buffers[BufferType.textNode]) this.closeText();
    this.emit(nodeType, data);
  }

  private raiseError(er: string): this {
    let erMsg = er;
    this.closeText();
    if (this.trackPosition) {
      erMsg += `\nLine: ${this.line}\nColumn: ${this.column}\nChar: ${this.c}`;
    }
    const error = new Error(erMsg);
    this.error = error;
    this.emit(ParserEvents.error, error);
    return this;
  }

  private strictFail(message: string): void {
    if (this.strict) {
      this.raiseError(message);
    }
  }

  private beginWhiteSpace(): void {
    if (this.c === "<") {
      this.state = STATE.OPEN_WAKA;
      this.#startTagPosition = this.#position;
    } else if (!isWhitespace(this.c)) {
      // have to process this as a text node.
      // weird, but happens.
      this.strictFail("Non-whitespace before first tag.");
      this.buffers[BufferType.textNode] = this.c;
      this.state = STATE.TEXT;
    }
  }

  private newTag(): void {
    if (!this.strict) {
      this.buffers[BufferType.tagName] = this.looseCase(this.buffers[BufferType.tagName]);
    }
    const parent = this.tags[this.tags.length - 1] || this;
    this.tag = {name: this.buffers[BufferType.tagName], attributes: {}};
    const tag = this.tag;

    // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
    if (this.opt.xmlns) {
      tag.ns = parent.ns;
    }
    this.attribList.length = 0;
    this.emitNode(ParserEvents.opentagstart, tag);
  }

  private attrib(): void {
    if (!this.strict) {
      this.buffers[BufferType.attribName] = this.looseCase(this.buffers[BufferType.attribName]);
    }

    if (
      this.attribList.findIndex((c) => c[0] === this.buffers[BufferType.attribName]) !== -1 ||
      Object.hasOwn(this.tag?.attributes ?? {}, this.buffers[BufferType.attribName])
    ) {
      this.buffers[BufferType.attribName] = "";
      this.buffers[BufferType.attribValue] = "";
      return;
    }

    if (this.opt.xmlns) {
      const qn = qname(this.buffers[BufferType.attribName], true);
      const prefix = qn.prefix;
      const local = qn.local;

      if (prefix === "xmlns") {
        // namespace binding attribute. push the binding into scope
        if (local === "xml" && this.buffers[BufferType.attribValue] !== XML_NAMESPACE) {
          this.strictFail(
            `xml: prefix must be bound to ${XML_NAMESPACE}\n` +
              `Actual: ${this.buffers[BufferType.attribValue]}`,
          );
        } else if (local === "xmlns" && this.buffers[BufferType.attribValue] !== XMLNS_NAMESPACE) {
          this.strictFail(
            `xmlns: prefix must be bound to ${XMLNS_NAMESPACE}\n` +
              `Actual: ${this.buffers[BufferType.attribValue]}`,
          );
        } else {
          const tag = this.tag;
          const parent = this.tags[this.tags.length - 1] || this;
          if (!tag) throw new Error("Unexpected state");
          if (tag.ns === parent.ns) {
            tag.ns = Object.create(parent.ns ?? null) as Namespace;
          }
          tag.ns ??= {};
          tag.ns[local] = this.buffers[BufferType.attribValue];
        }
      }

      // defer onattribute events until all attributes have been seen
      // so any new bindings can take effect. preserve attribute order
      // so deferred events can be emitted in document order
      this.attribList.push([
        this.buffers[BufferType.attribName],
        this.buffers[BufferType.attribValue],
      ]);
    } else {
      // in non-xmlns mode, we can emit the event right away
      if (!this.tag) throw new Error("Unexpected state");
      this.tag.attributes[this.buffers[BufferType.attribName]] =
        this.buffers[BufferType.attribValue];
      this.emitNode(ParserEvents.attribute, {
        name: this.buffers[BufferType.attribName],
        value: this.buffers[BufferType.attribValue],
      });
    }

    this.buffers[BufferType.attribName] = "";
    this.buffers[BufferType.attribValue] = "";
  }

  /* eslint-disable-next-line max-lines-per-function */
  private openTag(selfClosing = false): void {
    if (this.opt.xmlns) {
      // emit namespace binding events
      const tag = this.tag;
      if (!tag) throw new Error("Unexpected state");

      // add namespace info to tag
      const qn = qname(this.buffers[BufferType.tagName]);
      tag.prefix = qn.prefix;
      tag.local = qn.local;
      if (tag.ns) {
        tag.uri = tag.ns[qn.prefix] || "";
      } else {
        tag.uri = "";
      }

      if (tag.prefix && !tag.uri) {
        this.strictFail(
          `Unbound namespace prefix: ${JSON.stringify(this.buffers[BufferType.tagName])}`,
        );
        tag.uri = qn.prefix;
      }

      const parent = this.tags[this.tags.length - 1] || this;
      if (tag.ns && parent.ns !== tag.ns) {
        Object.keys(tag.ns).forEach((p) => {
          this.emitNode(ParserEvents.opennamespace, {
            prefix: p,
            uri: tag.ns ? tag.ns[p] : undefined,
          });
        });
      }

      // handle deferred onattribute events
      // Note: do not apply default ns to attributes:
      // http://www.w3.org/TR/REC-xml-names/#defaulting
      for (let i = 0, l = this.attribList.length; i < l; i++) {
        const nv = this.attribList[i];
        const name = nv[0];
        const value = nv[1];
        const qualName = qname(name, true);
        const prefix = qualName.prefix;
        const local = qualName.local;
        /* eslint-disable-next-line @typescript-eslint/init-declarations */
        let uri;
        if (prefix === "") {
          uri = "";
        } else if (tag.ns) {
          uri = tag.ns[prefix] || "";
        } else {
          uri = "";
        }
        const a = {
          local,
          name,
          prefix,
          uri,
          value,
        };

        // if there's any attributes with an undefined namespace,
        // then fail on them now.
        if (prefix && prefix !== "xmlns" && !uri) {
          this.strictFail(`Unbound namespace prefix: ${JSON.stringify(prefix)}`);
          a.uri = prefix;
        }
        if (!this.tag) throw new Error("Unexpected state");
        this.tag.attributes[name] = a;
        this.emitNode(ParserEvents.attribute, a);
      }
      this.attribList.length = 0;
    }

    if (!this.tag) throw new Error("Unexpected state");
    this.tag.isSelfClosing = Boolean(selfClosing);

    // process the tag
    this.sawRoot = true;
    this.tags.push(this.tag);
    this.emitNode(ParserEvents.opentag, this.tag);
    if (!selfClosing) {
      // special case for <script> in non-strict mode.
      if (!this.noscript && this.buffers[BufferType.tagName].toLowerCase() === "script") {
        this.state = STATE.SCRIPT;
      } else {
        this.state = STATE.TEXT;
      }
      this.tag = null;
      this.buffers[BufferType.tagName] = "";
    }
    this.buffers[BufferType.attribName] = "";
    this.buffers[BufferType.attribValue] = "";
    this.attribList.length = 0;
  }

  // eslint-disable-next-line max-lines-per-function
  private closeTag(): void {
    if (!this.buffers[BufferType.tagName]) {
      this.strictFail("Weird empty close tag.");
      this.buffers[BufferType.textNode] += "</>";
      this.state = STATE.TEXT;
      return;
    }

    if (this.buffers[BufferType.script]) {
      if (this.buffers[BufferType.tagName] !== "script") {
        this.buffers[BufferType.script] += `</${this.buffers[BufferType.tagName]}>`;
        this.buffers[BufferType.tagName] = "";
        this.state = STATE.SCRIPT;
        return;
      }
      this.emitNode(ParserEvents.script, this.buffers[BufferType.script]);
      this.buffers[BufferType.script] = "";
    }

    // first make sure that the closing tag actually exists.
    // <a><b></c></b></a> will close everything, otherwise.
    let t = this.tags.length;
    let tagName = this.buffers[BufferType.tagName];
    if (!this.strict) {
      tagName = this.looseCase(tagName);
    }
    const closeTo = tagName;
    while (t--) {
      const close = this.tags[t];
      if (close.name === closeTo) {
        break;
      } else {
        // fail the first time in strict mode
        this.strictFail("Unexpected close tag");
      }
    }

    // didn't find it.  we already failed for strict, so just abort.
    if (t < 0) {
      this.strictFail(`Unmatched closing tag: ${this.buffers[BufferType.tagName]}`);
      this.buffers[BufferType.textNode] += `</${this.buffers[BufferType.tagName]}>`;
      this.state = STATE.TEXT;
      return;
    }
    this.buffers[BufferType.tagName] = tagName;
    let s = this.tags.length;
    while (s-- > t) {
      const tag = this.tags.pop();
      if (!tag) throw new Error("Unexpected state");
      this.tag = tag;
      this.buffers[BufferType.tagName] = this.tag.name;
      this.emitNode(ParserEvents.closetag, this.buffers[BufferType.tagName]);

      const parent = this.tags[this.tags.length - 1] || this;
      if (this.opt.xmlns && tag.ns !== parent.ns && tag.ns) {
        // remove namespace bindings introduced by tag
        Object.keys(tag.ns).forEach((p) => {
          if (!tag.ns) throw new Error("Unexpected state");
          const n = tag.ns[p];
          this.emitNode(ParserEvents.closenamespace, {prefix: p, uri: n});
        });
      }
    }
    if (t === 0) this.closedRoot = true;
    this.buffers[BufferType.tagName] = "";
    this.buffers[BufferType.attribValue] = "";
    this.buffers[BufferType.attribName] = "";
    this.attribList.length = 0;
    this.state = STATE.TEXT;
  }

  private parseEntity(): string {
    let entity = this.buffers[BufferType.entity];
    const entityLC = entity.toLowerCase();
    /* eslint-disable-next-line @typescript-eslint/init-declarations */
    let num;
    let numStr = "";

    if (this.parserEntities[entity]) {
      return this.parserEntities[entity];
    }
    if (this.parserEntities[entityLC]) {
      return this.parserEntities[entityLC];
    }
    entity = entityLC;
    const HEXA = 16;
    const DECI = 10;
    if (entity.startsWith("#")) {
      if (entity.charAt(1) === "x") {
        const HEXA_DIGIT_COUNT = 2;
        entity = entity.slice(HEXA_DIGIT_COUNT);
        num = parseInt(entity, HEXA);
        numStr = num.toString(HEXA);
      } else {
        entity = entity.slice(1);
        num = parseInt(entity, DECI);
        numStr = num.toString(DECI);
      }
    }
    entity = entity.replace(/^0+/u, "");
    if (num === undefined || isNaN(num) || numStr.toLowerCase() !== entity) {
      this.strictFail("Invalid character entity");
      return `&${this.buffers[BufferType.entity]};`;
    }

    return String.fromCodePoint(num);
  }

  private flushBuffers(): void {
    this.closeText();
    if (this.buffers[BufferType.cdata] !== "") {
      this.emitNode(ParserEvents.cdata, this.buffers[BufferType.cdata]);
      this.buffers[BufferType.cdata] = "";
    }
    if (this.buffers[BufferType.script] !== "") {
      this.emitNode(ParserEvents.script, this.buffers[BufferType.script]);
      this.buffers[BufferType.script] = "";
    }
  }

  private handleBegin(): void {
    this.state = STATE.BEGIN_WHITESPACE;
    if (this.c === "\uFEFF") {
      return;
    }
    this.beginWhiteSpace();
  }

  private handleText(initialI: number, chunk: string): number {
    let i = initialI;
    let c = this.c;
    if (this.sawRoot && !this.closedRoot) {
      const starti = i - 1;
      while (c && c !== "<" && c !== "&") {
        c = charAt(chunk, i++);
        if (c && this.trackPosition) {
          this.#position++;
          if (c === "\n") {
            this.line++;
            this.column = 0;
          } else {
            this.column++;
          }
        }
      }
      this.buffers[BufferType.textNode] += chunk.substring(starti, i - 1);
    }
    if (c === "<" && !(this.sawRoot && this.closedRoot && !this.strict)) {
      this.state = STATE.OPEN_WAKA;
      this.#startTagPosition = this.#position;
    } else {
      if (!isWhitespace(c) && (!this.sawRoot || this.closedRoot)) {
        this.strictFail("Text data outside of root node.");
      }
      if (c === "&") {
        this.state = STATE.TEXT_ENTITY;
      } else {
        this.buffers[BufferType.textNode] += c;
      }
    }
    return i;
  }

  private handleScript(): void {
    // only non-strict
    if (this.c === "<") {
      this.state = STATE.SCRIPT_ENDING;
    } else {
      this.buffers[BufferType.script] += this.c;
    }
  }

  private handleScriptEnding(): void {
    if (this.c === "/") {
      this.state = STATE.CLOSE_TAG;
    } else {
      this.buffers[BufferType.script] += `<${this.c}`;
      this.state = STATE.SCRIPT;
    }
  }

  private handleOpenWaka(): void {
    let c = this.c;
    // either a /, ?, !, or text is coming next.
    if (c === "!") {
      this.state = STATE.SGML_DECL;
      this.buffers[BufferType.sgmlDecl] = "";
    } else if (isWhitespace(c)) {
      // wait for it...
    } else if (isMatch(nameStart, c)) {
      this.state = STATE.OPEN_TAG;
      this.buffers[BufferType.tagName] = c;
    } else if (c === "/") {
      this.state = STATE.CLOSE_TAG;
      this.buffers[BufferType.tagName] = "";
    } else if (c === "?") {
      this.state = STATE.PROC_INST;
      this.buffers[BufferType.procInstName] = "";
      this.buffers[BufferType.procInstBody] = "";
    } else {
      this.strictFail("Unencoded <");
      // if there was some whitespace, then add that in.
      if (this.#startTagPosition + 1 < this.#position) {
        const pad = this.#position - this.#startTagPosition;
        c = new Array(pad).join(" ") + c;
      }
      this.buffers[BufferType.textNode] += `<${c}`;
      this.state = STATE.TEXT;
    }
  }

  private handleSGMLDecl(): void {
    if ((this.buffers[BufferType.sgmlDecl] + this.c).toUpperCase() === CDATA) {
      this.emitNode(ParserEvents.opencdata);
      this.state = STATE.CDATA;
      this.buffers[BufferType.sgmlDecl] = "";
      this.buffers[BufferType.cdata] = "";
    } else if (this.buffers[BufferType.sgmlDecl] + this.c === "--") {
      this.state = STATE.COMMENT;
      this.buffers[BufferType.comment] = "";
      this.buffers[BufferType.sgmlDecl] = "";
    } else if ((this.buffers[BufferType.sgmlDecl] + this.c).toUpperCase() === DOCTYPE) {
      this.state = STATE.DOCTYPE;
      if (this.sawDoctype || this.buffers[BufferType.doctype] || this.sawRoot) {
        this.strictFail("Inappropriately located doctype declaration");
      }
      this.buffers[BufferType.doctype] = "";
      this.buffers[BufferType.sgmlDecl] = "";
    } else if (this.c === ">") {
      this.emitNode(ParserEvents.sgmldeclaration, this.buffers[BufferType.sgmlDecl]);
      this.buffers[BufferType.sgmlDecl] = "";
      this.state = STATE.TEXT;
    } else if (isQuote(this.c)) {
      this.state = STATE.SGML_DECL_QUOTED;
      this.buffers[BufferType.sgmlDecl] += this.c;
    } else {
      this.buffers[BufferType.sgmlDecl] += this.c;
    }
  }

  private handleSGMLDeclQuoted(): void {
    if (this.c === this.q) {
      this.state = STATE.SGML_DECL;
      this.q = "";
    }
    this.buffers[BufferType.sgmlDecl] += this.c;
  }

  private handleDoctype(): void {
    if (this.c === ">") {
      this.state = STATE.TEXT;
      this.emitNode(ParserEvents.doctype, this.buffers[BufferType.doctype]);
      this.sawDoctype = true; // just remember that we saw it.
      this.buffers[BufferType.doctype] = "";
    } else {
      this.buffers[BufferType.doctype] += this.c;
      if (this.c === "[") {
        this.state = STATE.DOCTYPE_DTD;
      } else if (isQuote(this.c)) {
        this.state = STATE.DOCTYPE_QUOTED;
        this.q = this.c;
      }
    }
  }

  private handleDoctypeQuoted(): void {
    this.buffers[BufferType.doctype] += this.c;
    if (this.c === this.q) {
      this.q = "";
      this.state = STATE.DOCTYPE;
    }
  }

  private handleDoctypeDTD(): void {
    this.buffers[BufferType.doctype] += this.c;
    if (this.c === "]") {
      this.state = STATE.DOCTYPE;
    } else if (isQuote(this.c)) {
      this.state = STATE.DOCTYPE_DTD_QUOTED;
      this.q = this.c;
    }
  }

  private handleDoctypeDTDQuoted(): void {
    this.buffers[BufferType.doctype] += this.c;
    if (this.c === this.q) {
      this.state = STATE.DOCTYPE_DTD;
      this.q = "";
    }
  }

  private handleComment(): void {
    if (this.c === "-") {
      this.state = STATE.COMMENT_ENDING;
    } else {
      this.buffers[BufferType.comment] += this.c;
    }
  }

  private handleCommentEnding(): void {
    if (this.c === "-") {
      this.state = STATE.COMMENT_ENDED;
      this.buffers[BufferType.comment] = textopts(this.opt, this.buffers[BufferType.comment]);
      if (this.buffers[BufferType.comment]) {
        this.emitNode(ParserEvents.comment, this.buffers[BufferType.comment]);
      }
      this.buffers[BufferType.comment] = "";
    } else {
      this.buffers[BufferType.comment] += `-${this.c}`;
      this.state = STATE.COMMENT;
    }
  }

  private handleCommentEnded(): void {
    if (this.c === ">") {
      this.state = STATE.TEXT;
    } else {
      this.strictFail("Malformed comment");
      // allow <!-- blah -- bloo --> in non-strict mode,
      // which is a comment of " blah -- bloo "
      this.buffers[BufferType.comment] += `--${this.c}`;
      this.state = STATE.COMMENT;
    }
  }

  private handleCData(): void {
    if (this.c === "]") {
      this.state = STATE.CDATA_ENDING;
    } else {
      this.buffers[BufferType.cdata] += this.c;
    }
  }

  private handleCDataEnding(): void {
    if (this.c === "]") {
      this.state = STATE.CDATA_ENDING_2;
    } else {
      this.buffers[BufferType.cdata] += `]${this.c}`;
      this.state = STATE.CDATA;
    }
  }

  private handleCDataEnding2(): void {
    if (this.c === ">") {
      if (this.buffers[BufferType.cdata]) {
        this.emitNode(ParserEvents.cdata, this.buffers[BufferType.cdata]);
      }
      this.emitNode(ParserEvents.closecdata);
      this.buffers[BufferType.cdata] = "";
      this.state = STATE.TEXT;
    } else if (this.c === "]") {
      this.buffers[BufferType.cdata] += "]";
    } else {
      this.buffers[BufferType.cdata] += `]]${this.c}`;
      this.state = STATE.CDATA;
    }
  }

  private handleProcInst(): void {
    if (this.c === "?") {
      this.state = STATE.PROC_INST_ENDING;
    } else if (isWhitespace(this.c)) {
      this.state = STATE.PROC_INST_BODY;
    } else {
      this.buffers[BufferType.procInstName] += this.c;
    }
  }

  private handleProcInstBody(): void {
    if (!this.buffers[BufferType.procInstBody] && isWhitespace(this.c)) {
      return;
    }
    if (this.c === "?") {
      this.state = STATE.PROC_INST_ENDING;
    } else {
      this.buffers[BufferType.procInstBody] += this.c;
    }
  }

  private handleProcInstEnding(): void {
    if (this.c === ">") {
      this.emitNode(ParserEvents.processinginstruction, {
        name: this.buffers[BufferType.procInstName],
        body: this.buffers[BufferType.procInstBody],
      });
      this.buffers[BufferType.procInstName] = "";
      this.buffers[BufferType.procInstBody] = "";
      this.state = STATE.TEXT;
    } else {
      this.buffers[BufferType.procInstBody] += `?${this.c}`;
      this.state = STATE.PROC_INST_BODY;
    }
  }

  private handleOpenTag(): void {
    if (isMatch(nameBody, this.c)) {
      this.buffers[BufferType.tagName] += this.c;
    } else {
      this.newTag();
      if (this.c === ">") {
        this.openTag();
      } else if (this.c === "/") {
        this.state = STATE.OPEN_TAG_SLASH;
      } else {
        if (!isWhitespace(this.c)) {
          this.strictFail("Invalid character in tag name");
        }
        this.state = STATE.ATTRIB;
      }
    }
  }

  private handleOpenTagSlash(): void {
    if (this.c === ">") {
      this.openTag(true);
      this.closeTag();
    } else {
      this.strictFail("Forward-slash in opening tag not followed by >");
      this.state = STATE.ATTRIB;
    }
  }

  private handleAttrib(): void {
    // haven't read the attribute name yet.
    if (isWhitespace(this.c)) {
      return;
    }
    if (this.c === ">") {
      this.openTag();
    } else if (this.c === "/") {
      this.state = STATE.OPEN_TAG_SLASH;
    } else if (isMatch(nameStart, this.c)) {
      this.buffers[BufferType.attribName] = this.c;
      this.buffers[BufferType.attribValue] = "";
      this.state = STATE.ATTRIB_NAME;
    } else {
      this.strictFail("Invalid attribute name");
    }
  }

  private handleAttribName(): void {
    if (this.c === "=") {
      this.state = STATE.ATTRIB_VALUE;
    } else if (this.c === ">") {
      this.strictFail("Attribute without value");
      this.buffers[BufferType.attribValue] = this.buffers[BufferType.attribName];
      this.attrib();
      this.openTag();
    } else if (isWhitespace(this.c)) {
      this.state = STATE.ATTRIB_NAME_SAW_WHITE;
    } else if (isMatch(nameBody, this.c)) {
      this.buffers[BufferType.attribName] += this.c;
    } else {
      this.strictFail("Invalid attribute name");
    }
  }

  private handleAttribNameSawWhite(): void {
    if (this.c === "=") {
      this.state = STATE.ATTRIB_VALUE;
    } else if (!isWhitespace(this.c)) {
      this.strictFail("Attribute without value");
      if (!this.tag) throw new Error("Unexpected state");
      this.tag.attributes[this.buffers[BufferType.attribName]] = "";
      this.buffers[BufferType.attribValue] = "";
      this.emitNode(ParserEvents.attribute, {
        name: this.buffers[BufferType.attribName],
        value: "",
      });
      this.buffers[BufferType.attribName] = "";
      if (this.c === ">") {
        this.openTag();
      } else if (isMatch(nameStart, this.c)) {
        this.buffers[BufferType.attribName] = this.c;
        this.state = STATE.ATTRIB_NAME;
      } else {
        this.strictFail("Invalid attribute name");
        this.state = STATE.ATTRIB;
      }
    }
  }

  private handleAttribValue(): void {
    if (isWhitespace(this.c)) {
      return;
    }
    if (isQuote(this.c)) {
      this.q = this.c;
      this.state = STATE.ATTRIB_VALUE_QUOTED;
    } else {
      this.strictFail("Unquoted attribute value");
      this.state = STATE.ATTRIB_VALUE_UNQUOTED;
      this.buffers[BufferType.attribValue] = this.c;
    }
  }

  private handleAttribValueQuoted(): void {
    if (this.c !== this.q) {
      if (this.c === "&") {
        this.state = STATE.ATTRIB_VALUE_ENTITY_Q;
      } else {
        this.buffers[BufferType.attribValue] += this.c;
      }
      return;
    }
    this.attrib();
    this.q = "";
    this.state = STATE.ATTRIB_VALUE_CLOSED;
  }

  private handleAttribValueClosed(): void {
    if (isWhitespace(this.c)) {
      this.state = STATE.ATTRIB;
    } else if (this.c === ">") {
      this.openTag();
    } else if (this.c === "/") {
      this.state = STATE.OPEN_TAG_SLASH;
    } else if (isMatch(nameStart, this.c)) {
      this.strictFail("No whitespace between attributes");
      this.buffers[BufferType.attribName] = this.c;
      this.buffers[BufferType.attribValue] = "";
      this.state = STATE.ATTRIB_NAME;
    } else {
      this.strictFail("Invalid attribute name");
    }
  }

  private handleAttribValueUnquoted(): void {
    if (!isAttribEnd(this.c)) {
      if (this.c === "&") {
        this.state = STATE.ATTRIB_VALUE_ENTITY_U;
      } else {
        this.buffers[BufferType.attribValue] += this.c;
      }
      return;
    }
    this.attrib();
    if (this.c === ">") {
      this.openTag();
    } else {
      this.state = STATE.ATTRIB;
    }
  }

  private handleCloseTag(): void {
    if (!this.buffers[BufferType.tagName]) {
      if (isWhitespace(this.c)) {
        return;
      }
      if (notMatch(nameStart, this.c)) {
        if (this.buffers[BufferType.script]) {
          this.buffers[BufferType.script] += `</${this.c}`;
          this.state = STATE.SCRIPT;
        } else {
          this.strictFail("Invalid tagname in closing tag.");
        }
      } else {
        this.buffers[BufferType.tagName] = this.c;
      }
    } else if (this.c === ">") {
      this.closeTag();
    } else if (isMatch(nameBody, this.c)) {
      this.buffers[BufferType.tagName] += this.c;
    } else if (this.buffers[BufferType.script]) {
      this.buffers[BufferType.script] += `</${this.buffers[BufferType.tagName]}`;
      this.buffers[BufferType.tagName] = "";
      this.state = STATE.SCRIPT;
    } else {
      if (!isWhitespace(this.c)) {
        this.strictFail("Invalid tagname in closing tag");
      }
      this.state = STATE.CLOSE_TAG_SAW_WHITE;
    }
  }

  private handleCloseTagSawWhite(): void {
    if (isWhitespace(this.c)) {
      return;
    }
    if (this.c === ">") {
      this.closeTag();
    } else {
      this.strictFail("Invalid characters in closing tag");
    }
  }

  private handleTextEntity(): void {
    /* eslint-disable-next-line @typescript-eslint/init-declarations */
    let returnState;
    /* eslint-disable-next-line @typescript-eslint/init-declarations */
    let buffer;
    switch (this.state) {
      case STATE.TEXT_ENTITY:
        returnState = STATE.TEXT;
        buffer = BufferType.textNode;
        break;

      case STATE.ATTRIB_VALUE_ENTITY_Q:
        returnState = STATE.ATTRIB_VALUE_QUOTED;
        buffer = BufferType.attribValue;
        break;

      case STATE.ATTRIB_VALUE_ENTITY_U:
        returnState = STATE.ATTRIB_VALUE_UNQUOTED;
        buffer = BufferType.attribValue;
        break;
      default:
        throw new Error("Unexpected state");
    }

    if (this.c === ";") {
      this.buffers[buffer] += this.parseEntity();
      this.buffers[BufferType.entity] = "";
      this.state = returnState;
    } else if (isMatch(this.buffers[BufferType.entity].length ? entityBody : entityStart, this.c)) {
      this.buffers[BufferType.entity] += this.c;
    } else {
      this.strictFail("Invalid character in entity name");
      this.buffers[buffer] += `&${this.buffers[BufferType.entity]}${this.c}`;
      this.buffers[BufferType.entity] = "";
      this.state = returnState;
    }
  }

  /* eslint-disable-next-line max-lines-per-function */
  private readStateRouter(initialI: number, chunk: string): number {
    let i = initialI;
    switch (this.state) {
      case STATE.BEGIN:
        this.handleBegin();
        break;
      case STATE.BEGIN_WHITESPACE:
        this.beginWhiteSpace();
        break;
      case STATE.TEXT:
        i = this.handleText(initialI, chunk);
        break;
      case STATE.SCRIPT:
        this.handleScript();
        break;
      case STATE.SCRIPT_ENDING:
        this.handleScriptEnding();
        break;
      case STATE.OPEN_WAKA:
        this.handleOpenWaka();
        break;
      case STATE.SGML_DECL:
        this.handleSGMLDecl();
        break;
      case STATE.SGML_DECL_QUOTED:
        this.handleSGMLDeclQuoted();
        break;
      case STATE.DOCTYPE:
        this.handleDoctype();
        break;
      case STATE.DOCTYPE_QUOTED:
        this.handleDoctypeQuoted();
        break;
      case STATE.DOCTYPE_DTD:
        this.handleDoctypeDTD();
        break;
      case STATE.DOCTYPE_DTD_QUOTED:
        this.handleDoctypeDTDQuoted();
        break;
      case STATE.COMMENT:
        this.handleComment();
        break;
      case STATE.COMMENT_ENDING:
        this.handleCommentEnding();
        break;
      case STATE.COMMENT_ENDED:
        this.handleCommentEnded();
        break;
      case STATE.CDATA:
        this.handleCData();
        break;
      case STATE.CDATA_ENDING:
        this.handleCDataEnding();
        break;
      case STATE.CDATA_ENDING_2:
        this.handleCDataEnding2();
        break;
      case STATE.PROC_INST:
        this.handleProcInst();
        break;
      case STATE.PROC_INST_BODY:
        this.handleProcInstBody();
        break;
      case STATE.PROC_INST_ENDING:
        this.handleProcInstEnding();
        break;
      case STATE.OPEN_TAG:
        this.handleOpenTag();
        break;
      case STATE.OPEN_TAG_SLASH:
        this.handleOpenTagSlash();
        break;
      case STATE.ATTRIB:
        this.handleAttrib();
        break;
      case STATE.ATTRIB_NAME:
        this.handleAttribName();
        break;
      case STATE.ATTRIB_NAME_SAW_WHITE:
        this.handleAttribNameSawWhite();
        break;
      case STATE.ATTRIB_VALUE:
        this.handleAttribValue();
        break;
      case STATE.ATTRIB_VALUE_QUOTED:
        this.handleAttribValueQuoted();
        break;
      case STATE.ATTRIB_VALUE_CLOSED:
        this.handleAttribValueClosed();
        break;
      case STATE.ATTRIB_VALUE_UNQUOTED:
        this.handleAttribValueUnquoted();
        break;
      case STATE.CLOSE_TAG:
        this.handleCloseTag();
        break;
      case STATE.CLOSE_TAG_SAW_WHITE:
        this.handleCloseTagSawWhite();
        break;
      case STATE.TEXT_ENTITY:
        this.handleTextEntity();
        break;
      case STATE.ATTRIB_VALUE_ENTITY_Q:
        this.handleTextEntity();
        break;
      case STATE.ATTRIB_VALUE_ENTITY_U:
        this.handleTextEntity();
        break;
      default:
        throw new Error(`Unknown state: ${this.state}`);
    }
    return i;
  }
}
