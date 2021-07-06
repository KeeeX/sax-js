const {
  BUFFERS,
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
} = require("./consts.js");
const {textopts, charAt, isMatch, isQuote, isAttribEnd, qname, isWhitespace, notMatch} = require("./utils.js");

class SAXParser {
  constructor(strict, opt) {
    this.strict = Boolean(strict);
    this.opt = opt || {};
    this.fullReset();
  }

  fullReset() {
    this.clearBuffers();
    this.q = "";
    this.c = "";
    this.bufferCheckPosition = this.opt.maxBufferLength ?? MAX_BUFFER_LENGTH;
    this.maxBufferLength = this.bufferCheckPosition;
    this.opt.lowercase = this.opt.lowercase || this.opt.lowercasetags;
    this.looseCase = this.opt.lowercase ? "toLowerCase" : "toUpperCase";
    this.tags = [];
    this.closed = false;
    this.closedRoot = false;
    this.sawRoot = false;
    this.tag = null;
    this.error = null;
    this.noscript = Boolean(this.strict || this.opt.noscript);
    this.state = STATE.BEGIN;
    this.strictEntities = this.opt.strictEntities;
    this.ENTITIES = this.strictEntities
      ? Object.create(XML_ENTITIES)
      : Object.create(ENTITIES);
    this.attribList = [];

      // namespaces form a prototype chain.
      // it always points at the current tag,
      // which protos to its parent tag.
    if (this.opt.xmlns) {
      this.ns = Object.create(rootNS);
    }

      // mostly just for error reporting
    this.trackPosition = this.opt.position !== false;
    if (this.trackPosition) {
      this.position = 0;
      this.line = 0;
      this.column = 0;
    }
    this.emit("onready");
  }

  checkBufferLength() {
    const SAFETY_LENGTH = 10;
    const maxAllowed = Math.max(this.maxBufferLength, SAFETY_LENGTH);
    let maxActual = 0;
    for (let i = 0, l = BUFFERS.length; i < l; i++) {
      const len = this[BUFFERS[i]].length;
      if (len > maxAllowed) {
        // Text/cdata nodes can get big, and since they're buffered,
        // we can get here under normal conditions.
        // Avoid issues by emitting the text node now,
        // so at least it won't get any bigger.
        switch (BUFFERS[i]) {
        case "textNode":
          this.closeText();
          break;

        case "cdata":
          this.emitNode("oncdata", this.cdata);
          this.cdata = "";
          break;

        case "script":
          this.emitNode("onscript", this.script);
          this.script = "";
          break;

        default:
          this.raiseError(`Max buffer length exceeded: ${BUFFERS[i]}`);
        }
      }
      maxActual = Math.max(maxActual, len);
    }
    // schedule the next check for the earliest possible buffer overrun.
    const m = this.maxBufferLength - maxActual;
    this.bufferCheckPosition = m + this.position;
  }

  closeText() {
    this.textNode = textopts(this.opt, this.textNode);
    if (this.textNode) this.emit("ontext", this.textNode);
    this.textNode = "";
  }

  clearBuffers() {
    for (let i = 0, l = BUFFERS.length; i < l; i++) {
      this[BUFFERS[i]] = "";
    }
  }

  emit(event, data) {
    this[event] && this[event](data);
  }

  emitNode(nodeType, data) {
    if (this.textNode) this.closeText();
    this.emit(nodeType, data);
  }

  raiseError(er) {
    let erMsg = er;
    this.closeText();
    if (this.trackPosition) {
      erMsg += `\nLine: ${this.line
      }\nColumn: ${this.column
      }\nChar: ${this.c}`;
    }
    const error = new Error(erMsg);
    this.error = error;
    this.emit("onerror", error);
    return this;
  }

  end() {
    if (this.sawRoot && !this.closedRoot) this.strictFail("Unclosed root tag");
    if ((this.state !== STATE.BEGIN)
        && (this.state !== STATE.BEGIN_WHITESPACE)
        && (this.state !== STATE.TEXT)) {
      this.raiseError("Unexpected end");
    }
    this.closeText();
    this.c = "";
    this.closed = true;
    this.emit("onend");
    this.fullReset();
    return this;
  }

  strictFail(message) {
    if (this.strict) {
      this.raiseError(message);
    }
  }

  // eslint-disable-next-line max-lines-per-function
  write(rawChunk) {
    if (this.error) {
      throw this.error;
    }
    if (this.closed) {
      return this.raiseError(
        "Cannot write after close. Assign an onready handler.",
      );
    }
    if (rawChunk === null) {
      return this.end();
    }
    const chunk = typeof rawChunk === "object"
      ? rawChunk.toString()
      : rawChunk;
    let i = 0;
    while ((this.c = charAt(chunk, i++))) {
      const c = this.c;
      if (this.trackPosition) {
        this.position++;
        if (c === "\n") {
          this.line++;
          this.column = 0;
        } else {
          this.column++;
        }
      }

      i = this.readStateRouter(i, chunk);
    } // while

    if (this.position >= this.bufferCheckPosition) {
      this.checkBufferLength();
    }
    return this;
  }

  beginWhiteSpace() {
    if (this.c === "<") {
      this.state = STATE.OPEN_WAKA;
      this.startTagPosition = this.position;
    } else if (!isWhitespace(this.c)) {
      // have to process this as a text node.
      // weird, but happens.
      this.strictFail("Non-whitespace before first tag.");
      this.textNode = this.c;
      this.state = STATE.TEXT;
    }
  }

  newTag() {
    if (!this.strict) this.tagName = this.tagName[this.looseCase]();
    const parent = this.tags[this.tags.length - 1] || this;
    this.tag = {name: this.tagName, attributes: {}};
    const tag = this.tag;

    // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
    if (this.opt.xmlns) {
      tag.ns = parent.ns;
    }
    this.attribList.length = 0;
    this.emitNode("onopentagstart", tag);
  }

  attrib() {
    if (!this.strict) {
      this.attribName = this.attribName[this.looseCase]();
    }

    if (this.attribList.indexOf(this.attribName) !== -1
        || Object.prototype.hasOwnProperty.call(this.tag.attributes, this.attribName)) {
      this.attribName = "";
      this.attribValue = "";
      return;
    }

    if (this.opt.xmlns) {
      const qn = qname(this.attribName, true);
      const prefix = qn.prefix;
      const local = qn.local;

      if (prefix === "xmlns") {
        // namespace binding attribute. push the binding into scope
        if (local === "xml" && this.attribValue !== XML_NAMESPACE) {
          this.strictFail(`xml: prefix must be bound to ${XML_NAMESPACE}\n`
            + `Actual: ${this.attribValue}`);
        } else if (local === "xmlns" && this.attribValue !== XMLNS_NAMESPACE) {
          this.strictFail(`xmlns: prefix must be bound to ${XMLNS_NAMESPACE}\n`
            + `Actual: ${this.attribValue}`);
        } else {
          const tag = this.tag;
          const parent = this.tags[this.tags.length - 1] || this;
          if (tag.ns === parent.ns) {
            tag.ns = Object.create(parent.ns);
          }
          tag.ns[local] = this.attribValue;
        }
      }

      // defer onattribute events until all attributes have been seen
      // so any new bindings can take effect. preserve attribute order
      // so deferred events can be emitted in document order
      this.attribList.push([this.attribName, this.attribValue]);
    } else {
      // in non-xmlns mode, we can emit the event right away
      this.tag.attributes[this.attribName] = this.attribValue;
      this.emitNode("onattribute", {
        name: this.attribName,
        value: this.attribValue,
      });
    }

    this.attribName = "";
    this.attribValue = "";
  }

  // eslint-disable-next-line max-lines-per-function
  openTag(selfClosing) {
    if (this.opt.xmlns) {
      // emit namespace binding events
      const tag = this.tag;

      // add namespace info to tag
      const qn = qname(this.tagName);
      tag.prefix = qn.prefix;
      tag.local = qn.local;
      tag.uri = tag.ns[qn.prefix] || "";

      if (tag.prefix && !tag.uri) {
        this.strictFail(`Unbound namespace prefix: ${
          JSON.stringify(this.tagName)}`);
        tag.uri = qn.prefix;
      }

      const parent = this.tags[this.tags.length - 1] || this;
      if (tag.ns && parent.ns !== tag.ns) {
        Object.keys(tag.ns).forEach(p => {
          this.emitNode("onopennamespace", {
            prefix: p,
            uri: tag.ns[p],
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
        const uri = prefix === "" ? "" : (tag.ns[prefix] || "");
        const a = {
          name,
          value,
          prefix,
          local,
          uri,
        };

        // if there's any attributes with an undefined namespace,
        // then fail on them now.
        if (prefix && prefix !== "xmlns" && !uri) {
          this.strictFail(`Unbound namespace prefix: ${
            JSON.stringify(prefix)}`);
          a.uri = prefix;
        }
        this.tag.attributes[name] = a;
        this.emitNode("onattribute", a);
      }
      this.attribList.length = 0;
    }

    this.tag.isSelfClosing = Boolean(selfClosing);

    // process the tag
    this.sawRoot = true;
    this.tags.push(this.tag);
    this.emitNode("onopentag", this.tag);
    if (!selfClosing) {
      // special case for <script> in non-strict mode.
      if (!this.noscript && this.tagName.toLowerCase() === "script") {
        this.state = STATE.SCRIPT;
      } else {
        this.state = STATE.TEXT;
      }
      this.tag = null;
      this.tagName = "";
    }
    this.attribName = "";
    this.attribValue = "";
    this.attribList.length = 0;
  }

  // eslint-disable-next-line max-lines-per-function
  closeTag() {
    if (!this.tagName) {
      this.strictFail("Weird empty close tag.");
      this.textNode += "</>";
      this.state = STATE.TEXT;
      return;
    }

    if (this.script) {
      if (this.tagName !== "script") {
        this.script += `</${this.tagName}>`;
        this.tagName = "";
        this.state = STATE.SCRIPT;
        return;
      }
      this.emitNode("onscript", this.script);
      this.script = "";
    }

    // first make sure that the closing tag actually exists.
    // <a><b></c></b></a> will close everything, otherwise.
    let t = this.tags.length;
    let tagName = this.tagName;
    if (!this.strict) {
      tagName = tagName[this.looseCase]();
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
      this.strictFail(`Unmatched closing tag: ${this.tagName}`);
      this.textNode += `</${this.tagName}>`;
      this.state = STATE.TEXT;
      return;
    }
    this.tagName = tagName;
    let s = this.tags.length;
    while (s-- > t) {
      this.tag = this.tags.pop();
      const tag = this.tag;
      this.tagName = this.tag.name;
      this.emitNode("onclosetag", this.tagName);

      const x = {};
      if (tag.ns) {
        for (const i of Object.keys(tag.ns)) {
          x[i] = tag.ns[i];
        }
      }

      const parent = this.tags[this.tags.length - 1] || this;
      if (this.opt.xmlns && tag.ns !== parent.ns) {
        // remove namespace bindings introduced by tag
        Object.keys(tag.ns).forEach(p => {
          const n = tag.ns[p];
          this.emitNode("onclosenamespace", {prefix: p, uri: n});
        });
      }
    }
    if (t === 0) this.closedRoot = true;
    this.tagName = "";
    this.attribValue = "";
    this.attribName = "";
    this.attribList.length = 0;
    this.state = STATE.TEXT;
  }

  parseEntity() {
    let entity = this.entity;
    const entityLC = entity.toLowerCase();
    let num;
    let numStr = "";

    if (this.ENTITIES[entity]) {
      return this.ENTITIES[entity];
    }
    if (this.ENTITIES[entityLC]) {
      return this.ENTITIES[entityLC];
    }
    entity = entityLC;
    const HEXA = 16;
    const DECI = 10;
    if (entity.charAt(0) === "#") {
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
    if (isNaN(num) || numStr.toLowerCase() !== entity) {
      this.strictFail("Invalid character entity");
      return `&${this.entity};`;
    }

    return String.fromCodePoint(num);
  }

  resume() {
    this.error = null;
    return this;
  }

  close() {
    return this.write(null);
  }

  flush() {
    this.flushBuffers(this);
  }

  flushBuffers() {
    this.closeText();
    if (this.cdata !== "") {
      this.emitNode("oncdata", this.cdata);
      this.cdata = "";
    }
    if (this.script !== "") {
      this.emitNode("onscript", this.script);
      this.script = "";
    }
  }

  handleBegin() {
    this.state = STATE.BEGIN_WHITESPACE;
    if (this.c === "\uFEFF") {
      return;
    }
    this.beginWhiteSpace();
  }

  handleText(initialI, chunk) {
    let i = initialI;
    let c = this.c;
    if (this.sawRoot && !this.closedRoot) {
      const starti = i - 1;
      while (c && c !== "<" && c !== "&") {
        c = charAt(chunk, i++);
        if (c && this.trackPosition) {
          this.position++;
          if (c === "\n") {
            this.line++;
            this.column = 0;
          } else {
            this.column++;
          }
        }
      }
      this.textNode += chunk.substring(starti, i - 1);
    }
    if (c === "<" && !(this.sawRoot && this.closedRoot && !this.strict)) {
      this.state = STATE.OPEN_WAKA;
      this.startTagPosition = this.position;
    } else {
      if (!isWhitespace(c) && (!this.sawRoot || this.closedRoot)) {
        this.strictFail("Text data outside of root node.");
      }
      if (c === "&") {
        this.state = STATE.TEXT_ENTITY;
      } else {
        this.textNode += c;
      }
    }
    return i;
  }

  handleScript() {
    // only non-strict
    if (this.c === "<") {
      this.state = STATE.SCRIPT_ENDING;
    } else {
      this.script += this.c;
    }
  }

  handleScriptEnding() {
    if (this.c === "/") {
      this.state = STATE.CLOSE_TAG;
    } else {
      this.script += `<${this.c}`;
      this.state = STATE.SCRIPT;
    }
  }

  handleOpenWaka() {
    let c = this.c;
    // either a /, ?, !, or text is coming next.
    if (c === "!") {
      this.state = STATE.SGML_DECL;
      this.sgmlDecl = "";
    } else if (isWhitespace(c)) {
      // wait for it...
    } else if (isMatch(nameStart, c)) {
      this.state = STATE.OPEN_TAG;
      this.tagName = c;
    } else if (c === "/") {
      this.state = STATE.CLOSE_TAG;
      this.tagName = "";
    } else if (c === "?") {
      this.state = STATE.PROC_INST;
      this.procInstName = "";
      this.procInstBody = "";
    } else {
      this.strictFail("Unencoded <");
      // if there was some whitespace, then add that in.
      if (this.startTagPosition + 1 < this.position) {
        const pad = this.position - this.startTagPosition;
        c = new Array(pad).join(" ") + c;
      }
      this.textNode += `<${c}`;
      this.state = STATE.TEXT;
    }
  }

  handleSGMLDecl() {
    if ((this.sgmlDecl + this.c).toUpperCase() === CDATA) {
      this.emitNode("onopencdata");
      this.state = STATE.CDATA;
      this.sgmlDecl = "";
      this.cdata = "";
    } else if (this.sgmlDecl + this.c === "--") {
      this.state = STATE.COMMENT;
      this.comment = "";
      this.sgmlDecl = "";
    } else if ((this.sgmlDecl + this.c).toUpperCase() === DOCTYPE) {
      this.state = STATE.DOCTYPE;
      if (this.doctype || this.sawRoot) {
        this.strictFail("Inappropriately located doctype declaration");
      }
      this.doctype = "";
      this.sgmlDecl = "";
    } else if (this.c === ">") {
      this.emitNode("onsgmldeclaration", this.sgmlDecl);
      this.sgmlDecl = "";
      this.state = STATE.TEXT;
    } else if (isQuote(this.c)) {
      this.state = STATE.SGML_DECL_QUOTED;
      this.sgmlDecl += this.c;
    } else {
      this.sgmlDecl += this.c;
    }
  }

  handleSGMLDeclQuoted() {
    if (this.c === this.q) {
      this.state = STATE.SGML_DECL;
      this.q = "";
    }
    this.sgmlDecl += this.c;
  }

  handleDoctype() {
    if (this.c === ">") {
      this.state = STATE.TEXT;
      this.emitNode("ondoctype", this.doctype);
      this.doctype = true; // just remember that we saw it.
    } else {
      this.doctype += this.c;
      if (this.c === "[") {
        this.state = STATE.DOCTYPE_DTD;
      } else if (isQuote(this.c)) {
        this.state = STATE.DOCTYPE_QUOTED;
        this.q = this.c;
      }
    }
  }

  handleDoctypeQuoted() {
    this.doctype += this.c;
    if (this.c === this.q) {
      this.q = "";
      this.state = STATE.DOCTYPE;
    }
  }

  handleDoctypeDTD() {
    this.doctype += this.c;
    if (this.c === "]") {
      this.state = STATE.DOCTYPE;
    } else if (isQuote(this.c)) {
      this.state = STATE.DOCTYPE_DTD_QUOTED;
      this.q = this.c;
    }
  }

  handleDoctypeDTDQuoted() {
    this.doctype += this.c;
    if (this.c === this.q) {
      this.state = STATE.DOCTYPE_DTD;
      this.q = "";
    }
  }

  handleComment() {
    if (this.c === "-") {
      this.state = STATE.COMMENT_ENDING;
    } else {
      this.comment += this.c;
    }
  }

  handleCommentEnding() {
    if (this.c === "-") {
      this.state = STATE.COMMENT_ENDED;
      this.comment = textopts(this.opt, this.comment);
      if (this.comment) {
        this.emitNode("oncomment", this.comment);
      }
      this.comment = "";
    } else {
      this.comment += `-${this.c}`;
      this.state = STATE.COMMENT;
    }
  }

  handleCommentEnded() {
    if (this.c === ">") {
      this.state = STATE.TEXT;
    } else {
      this.strictFail("Malformed comment");
      // allow <!-- blah -- bloo --> in non-strict mode,
      // which is a comment of " blah -- bloo "
      this.comment += `--${this.c}`;
      this.state = STATE.COMMENT;
    }
  }

  handleCData() {
    if (this.c === "]") {
      this.state = STATE.CDATA_ENDING;
    } else {
      this.cdata += this.c;
    }
  }

  handleCDataEnding() {
    if (this.c === "]") {
      this.state = STATE.CDATA_ENDING_2;
    } else {
      this.cdata += `]${this.c}`;
      this.state = STATE.CDATA;
    }
  }

  handleCDataEnding2() {
    if (this.c === ">") {
      if (this.cdata) {
        this.emitNode("oncdata", this.cdata);
      }
      this.emitNode("onclosecdata");
      this.cdata = "";
      this.state = STATE.TEXT;
    } else if (this.c === "]") {
      this.cdata += "]";
    } else {
      this.cdata += `]]${this.c}`;
      this.state = STATE.CDATA;
    }
  }

  handleProcInst() {
    if (this.c === "?") {
      this.state = STATE.PROC_INST_ENDING;
    } else if (isWhitespace(this.c)) {
      this.state = STATE.PROC_INST_BODY;
    } else {
      this.procInstName += this.c;
    }
  }

  handleProcInstBody() {
    if (!this.procInstBody && isWhitespace(this.c)) {
      return;
    }
    if (this.c === "?") {
      this.state = STATE.PROC_INST_ENDING;
    } else {
      this.procInstBody += this.c;
    }
  }

  handleProcInstEnding() {
    if (this.c === ">") {
      this.emitNode("onprocessinginstruction", {
        name: this.procInstName,
        body: this.procInstBody,
      });
      this.procInstName = "";
      this.procInstBody = "";
      this.state = STATE.TEXT;
    } else {
      this.procInstBody += `?${this.c}`;
      this.state = STATE.PROC_INST_BODY;
    }
  }

  handleOpenTag() {
    if (isMatch(nameBody, this.c)) {
      this.tagName += this.c;
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

  handleOpenTagSlash() {
    if (this.c === ">") {
      this.openTag(true);
      this.closeTag();
    } else {
      this.strictFail("Forward-slash in opening tag not followed by >");
      this.state = STATE.ATTRIB;
    }
  }

  handleAttrib() {
    // haven't read the attribute name yet.
    if (isWhitespace(this.c)) {
      return;
    }
    if (this.c === ">") {
      this.openTag();
    } else if (this.c === "/") {
      this.state = STATE.OPEN_TAG_SLASH;
    } else if (isMatch(nameStart, this.c)) {
      this.attribName = this.c;
      this.attribValue = "";
      this.state = STATE.ATTRIB_NAME;
    } else {
      this.strictFail("Invalid attribute name");
    }
  }

  handleAttribName() {
    if (this.c === "=") {
      this.state = STATE.ATTRIB_VALUE;
    } else if (this.c === ">") {
      this.strictFail("Attribute without value");
      this.attribValue = this.attribName;
      this.attrib();
      this.openTag();
    } else if (isWhitespace(this.c)) {
      this.state = STATE.ATTRIB_NAME_SAW_WHITE;
    } else if (isMatch(nameBody, this.c)) {
      this.attribName += this.c;
    } else {
      this.strictFail("Invalid attribute name");
    }
  }

  handleAttribNameSawWhite() {
    if (this.c === "=") {
      this.state = STATE.ATTRIB_VALUE;
    } else if (!isWhitespace(this.c)) {
      this.strictFail("Attribute without value");
      this.tag.attributes[this.attribName] = "";
      this.attribValue = "";
      this.emitNode("onattribute", {
        name: this.attribName,
        value: "",
      });
      this.attribName = "";
      if (this.c === ">") {
        this.openTag();
      } else if (isMatch(nameStart, this.c)) {
        this.attribName = this.c;
        this.state = STATE.ATTRIB_NAME;
      } else {
        this.strictFail("Invalid attribute name");
        this.state = STATE.ATTRIB;
      }
    }
  }

  handleAttribValue() {
    if (isWhitespace(this.c)) {
      return;
    }
    if (isQuote(this.c)) {
      this.q = this.c;
      this.state = STATE.ATTRIB_VALUE_QUOTED;
    } else {
      this.strictFail("Unquoted attribute value");
      this.state = STATE.ATTRIB_VALUE_UNQUOTED;
      this.attribValue = this.c;
    }
  }

  handleAttribValueQuoted() {
    if (this.c !== this.q) {
      if (this.c === "&") {
        this.state = STATE.ATTRIB_VALUE_ENTITY_Q;
      } else {
        this.attribValue += this.c;
      }
      return;
    }
    this.attrib();
    this.q = "";
    this.state = STATE.ATTRIB_VALUE_CLOSED;
  }

  handleAttribValueClosed() {
    if (isWhitespace(this.c)) {
      this.state = STATE.ATTRIB;
    } else if (this.c === ">") {
      this.openTag();
    } else if (this.c === "/") {
      this.state = STATE.OPEN_TAG_SLASH;
    } else if (isMatch(nameStart, this.c)) {
      this.strictFail("No whitespace between attributes");
      this.attribName = this.c;
      this.attribValue = "";
      this.state = STATE.ATTRIB_NAME;
    } else {
      this.strictFail("Invalid attribute name");
    }
  }

  handleAttribValueUnquoted() {
    if (!isAttribEnd(this.c)) {
      if (this.c === "&") {
        this.state = STATE.ATTRIB_VALUE_ENTITY_U;
      } else {
        this.attribValue += this.c;
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

  handleCloseTag() {
    if (!this.tagName) {
      if (isWhitespace(this.c)) {
        return;
      }
      if (notMatch(nameStart, this.c)) {
        if (this.script) {
          this.script += `</${this.c}`;
          this.state = STATE.SCRIPT;
        } else {
          this.strictFail("Invalid tagname in closing tag.");
        }
      } else {
        this.tagName = this.c;
      }
    } else if (this.c === ">") {
      this.closeTag();
    } else if (isMatch(nameBody, this.c)) {
      this.tagName += this.c;
    } else if (this.script) {
      this.script += `</${this.tagName}`;
      this.tagName = "";
      this.state = STATE.SCRIPT;
    } else {
      if (!isWhitespace(this.c)) {
        this.strictFail("Invalid tagname in closing tag");
      }
      this.state = STATE.CLOSE_TAG_SAW_WHITE;
    }
  }

  handleCloseTagSawWhite() {
    if (isWhitespace(this.c)) {
      return;
    }
    if (this.c === ">") {
      this.closeTag();
    } else {
      this.strictFail("Invalid characters in closing tag");
    }
  }

  handleTextEntity() {
    let returnState;
    let buffer;
    switch (this.state) {
    case STATE.TEXT_ENTITY:
      returnState = STATE.TEXT;
      buffer = "textNode";
      break;

    case STATE.ATTRIB_VALUE_ENTITY_Q:
      returnState = STATE.ATTRIB_VALUE_QUOTED;
      buffer = "attribValue";
      break;

    case STATE.ATTRIB_VALUE_ENTITY_U:
      returnState = STATE.ATTRIB_VALUE_UNQUOTED;
      buffer = "attribValue";
      break;
    }

    if (this.c === ";") {
      this[buffer] += this.parseEntity();
      this.entity = "";
      this.state = returnState;
    } else if (isMatch(this.entity.length ? entityBody : entityStart, this.c)) {
      this.entity += this.c;
    } else {
      this.strictFail("Invalid character in entity name");
      this[buffer] += `&${this.entity}${this.c}`;
      this.entity = "";
      this.state = returnState;
    }
  }

  // eslint-disable-next-line complexity
  readStateRouter(initialI, chunk) {
    let i = initialI;
    switch (this.state) {
    /* eslint-disable max-statements-per-line */
    case STATE.BEGIN: this.handleBegin(); break;
    case STATE.BEGIN_WHITESPACE: this.beginWhiteSpace(); break;
    case STATE.TEXT: i = this.handleText(initialI, chunk); break;
    case STATE.SCRIPT: this.handleScript(); break;
    case STATE.SCRIPT_ENDING: this.handleScriptEnding(); break;
    case STATE.OPEN_WAKA: this.handleOpenWaka(); break;
    case STATE.SGML_DECL: this.handleSGMLDecl(); break;
    case STATE.SGML_DECL_QUOTED: this.handleSGMLDeclQuoted(); break;
    case STATE.DOCTYPE: this.handleDoctype(); break;
    case STATE.DOCTYPE_QUOTED: this.handleDoctypeQuoted(); break;
    case STATE.DOCTYPE_DTD: this.handleDoctypeDTD(); break;
    case STATE.DOCTYPE_DTD_QUOTED: this.handleDoctypeDTDQuoted(); break;
    case STATE.COMMENT: this.handleComment(); break;
    case STATE.COMMENT_ENDING: this.handleCommentEnding(); break;
    case STATE.COMMENT_ENDED: this.handleCommentEnded(); break;
    case STATE.CDATA: this.handleCData(); break;
    case STATE.CDATA_ENDING: this.handleCDataEnding(); break;
    case STATE.CDATA_ENDING_2: this.handleCDataEnding2(); break;
    case STATE.PROC_INST: this.handleProcInst(); break;
    case STATE.PROC_INST_BODY: this.handleProcInstBody(); break;
    case STATE.PROC_INST_ENDING: this.handleProcInstEnding(); break;
    case STATE.OPEN_TAG: this.handleOpenTag(); break;
    case STATE.OPEN_TAG_SLASH: this.handleOpenTagSlash(); break;
    case STATE.ATTRIB: this.handleAttrib(); break;
    case STATE.ATTRIB_NAME: this.handleAttribName(); break;
    case STATE.ATTRIB_NAME_SAW_WHITE: this.handleAttribNameSawWhite(); break;
    case STATE.ATTRIB_VALUE: this.handleAttribValue(); break;
    case STATE.ATTRIB_VALUE_QUOTED: this.handleAttribValueQuoted(); break;
    case STATE.ATTRIB_VALUE_CLOSED: this.handleAttribValueClosed(); break;
    case STATE.ATTRIB_VALUE_UNQUOTED: this.handleAttribValueUnquoted(); break;
    case STATE.CLOSE_TAG: this.handleCloseTag(); break;
    case STATE.CLOSE_TAG_SAW_WHITE: this.handleCloseTagSawWhite(); break;
    case STATE.TEXT_ENTITY: this.handleTextEntity(); break;
    case STATE.ATTRIB_VALUE_ENTITY_Q: this.handleTextEntity(); break;
    case STATE.ATTRIB_VALUE_ENTITY_U: this.handleTextEntity(); break;
    /* eslint-enable max-statements-per-line */

    default:
      throw new Error(this, `Unknown state: ${this.state}`);
    }

    return i;
  }
}

module.exports = SAXParser;
