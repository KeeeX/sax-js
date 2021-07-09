"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable max-lines */
const consts_js_1 = require("./consts.js");
const utils_js_1 = require("./utils.js");
const emptyBuffers = {
    comment: "",
    sgmlDecl: "",
    textNode: "",
    tagName: "",
    doctype: "",
    procInstName: "",
    procInstBody: "",
    entity: "",
    attribName: "",
    attribValue: "",
    cdata: "",
    script: "",
};
const cfToLowerCase = (str) => str.toLowerCase();
const cfToUpperCase = (str) => str.toUpperCase();
class SAXParser {
    constructor(strict = false, opt = {}) {
        this.opt = {};
        this.q = "";
        this.c = "";
        this.bufferCheckPosition = consts_js_1.MAX_BUFFER_LENGTH;
        this.maxBufferLength = consts_js_1.MAX_BUFFER_LENGTH;
        this.looseCase = cfToLowerCase;
        this.tags = [];
        this.closed = false;
        this.closedRoot = false;
        this.sawRoot = false;
        this.tag = null;
        this.error = null;
        this.noscript = true;
        this.state = consts_js_1.STATE.BEGIN;
        this.strictEntities = false;
        this.parserEntities = {};
        this.attribList = [];
        this.trackPosition = false;
        this.position = 0;
        this.line = 0;
        this.column = 0;
        this.buffers = { ...emptyBuffers };
        this.startTagPosition = 0;
        this.sawDoctype = false;
        this.strict = Boolean(strict);
        this.opt = opt;
        this.fullReset();
    }
    get ns() {
        return this.namespace;
    }
    emit(event, data) {
        const handler = this[event];
        if (handler)
            handler(data);
    }
    resume() {
        this.error = null;
        return this;
    }
    close() {
        return this.write(null);
    }
    flush() {
        this.flushBuffers();
        return this;
    }
    // eslint-disable-next-line max-lines-per-function
    write(rawChunk) {
        if (this.error) {
            throw this.error;
        }
        if (this.closed) {
            return this.raiseError("Cannot write after close. Assign an onready handler.");
        }
        if (rawChunk === null) {
            return this.end();
        }
        let chunk;
        if (typeof rawChunk === "string") {
            chunk = rawChunk;
        }
        else {
            chunk = new TextDecoder().decode(rawChunk);
        }
        let i = 0;
        while ((this.c = utils_js_1.charAt(chunk, i++))) {
            const c = this.c;
            if (this.trackPosition) {
                this.position++;
                if (c === "\n") {
                    this.line++;
                    this.column = 0;
                }
                else {
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
    end() {
        if (this.sawRoot && !this.closedRoot)
            this.strictFail("Unclosed root tag");
        if ((this.state !== consts_js_1.STATE.BEGIN)
            && (this.state !== consts_js_1.STATE.BEGIN_WHITESPACE)
            && (this.state !== consts_js_1.STATE.TEXT)) {
            this.raiseError("Unexpected end");
        }
        this.closeText();
        this.c = "";
        this.closed = true;
        this.emit(consts_js_1.ParserEvents.end);
        this.fullReset();
        return this;
    }
    resetDefault() {
        this.q = "";
        this.c = "";
        this.tags = [];
        this.closed = false;
        this.closedRoot = false;
        this.sawRoot = false;
        this.tag = null;
        this.error = null;
        this.attribList = [];
        this.position = 0;
        this.line = 0;
        this.column = 0;
        this.startTagPosition = 0;
    }
    fullReset() {
        this.clearBuffers();
        this.resetDefault();
        this.bufferCheckPosition = this.opt.maxBufferLength ?? consts_js_1.MAX_BUFFER_LENGTH;
        this.maxBufferLength = this.bufferCheckPosition;
        this.opt.lowercase = this.opt.lowercase ?? this.opt.lowercasetags;
        this.looseCase = this.opt.lowercase ? cfToLowerCase : cfToUpperCase;
        this.noscript = Boolean(this.strict || this.opt.noscript);
        this.state = consts_js_1.STATE.BEGIN;
        this.strictEntities = Boolean(this.opt.strictEntities);
        this.parserEntities = (this.strictEntities
            ? Object.create(consts_js_1.XML_ENTITIES)
            : Object.create(consts_js_1.ENTITIES));
        // namespaces form a prototype chain.
        // it always points at the current tag,
        // which protos to its parent tag.
        if (this.opt.xmlns) {
            this.namespace = Object.create(consts_js_1.rootNS);
        }
        // mostly just for error reporting
        this.trackPosition = this.opt.position !== false;
        this.emit(consts_js_1.ParserEvents.ready);
    }
    checkBufferLength() {
        const SAFETY_LENGTH = 10;
        const maxAllowed = Math.max(this.maxBufferLength, SAFETY_LENGTH);
        let maxActual = 0;
        for (const bufferType of Object.values(consts_js_1.BufferType)) {
            const len = this.buffers[bufferType].length;
            if (len > maxAllowed) {
                // Text/cdata nodes can get big, and since they're buffered,
                // we can get here under normal conditions.
                // Avoid issues by emitting the text node now,
                // so at least it won't get any bigger.
                switch (bufferType) {
                    case consts_js_1.BufferType.textNode:
                        this.closeText();
                        break;
                    case consts_js_1.BufferType.cdata:
                        this.emitNode(consts_js_1.ParserEvents.cdata, this.buffers[bufferType]);
                        this.buffers[bufferType] = "";
                        break;
                    case consts_js_1.BufferType.script:
                        this.emitNode(consts_js_1.ParserEvents.script, this.buffers[bufferType]);
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
        this.bufferCheckPosition = m + this.position;
    }
    closeText() {
        this.buffers[consts_js_1.BufferType.textNode] = utils_js_1.textopts(this.opt, this.buffers[consts_js_1.BufferType.textNode]);
        if (this.buffers[consts_js_1.BufferType.textNode]) {
            this.emit(consts_js_1.ParserEvents.text, this.buffers[consts_js_1.BufferType.textNode]);
        }
        this.buffers[consts_js_1.BufferType.textNode] = "";
    }
    clearBuffers() {
        this.buffers = { ...emptyBuffers };
    }
    emitNode(nodeType, data) {
        if (this.buffers[consts_js_1.BufferType.textNode])
            this.closeText();
        this.emit(nodeType, data);
    }
    raiseError(er) {
        let erMsg = er;
        this.closeText();
        if (this.trackPosition) {
            erMsg += `\nLine: ${this.line}\nColumn: ${this.column}\nChar: ${this.c}`;
        }
        const error = new Error(erMsg);
        this.error = error;
        this.emit(consts_js_1.ParserEvents.error, error);
        return this;
    }
    strictFail(message) {
        if (this.strict) {
            this.raiseError(message);
        }
    }
    beginWhiteSpace() {
        if (this.c === "<") {
            this.state = consts_js_1.STATE.OPEN_WAKA;
            this.startTagPosition = this.position;
        }
        else if (!utils_js_1.isWhitespace(this.c)) {
            // have to process this as a text node.
            // weird, but happens.
            this.strictFail("Non-whitespace before first tag.");
            this.buffers[consts_js_1.BufferType.textNode] = this.c;
            this.state = consts_js_1.STATE.TEXT;
        }
    }
    newTag() {
        if (!this.strict) {
            this.buffers[consts_js_1.BufferType.tagName] = this.looseCase(this.buffers[consts_js_1.BufferType.tagName]);
        }
        const parent = this.tags[this.tags.length - 1] || this;
        this.tag = { name: this.buffers[consts_js_1.BufferType.tagName], attributes: {} };
        const tag = this.tag;
        // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
        if (this.opt.xmlns) {
            tag.ns = parent.ns;
        }
        this.attribList.length = 0;
        this.emitNode(consts_js_1.ParserEvents.opentagstart, tag);
    }
    // eslint-disable-next-line max-lines-per-function
    attrib() {
        if (!this.strict) {
            this.buffers[consts_js_1.BufferType.attribName] = this.looseCase(this.buffers[consts_js_1.BufferType.attribName]);
        }
        if (this.attribList.findIndex(c => c[0] === this.buffers[consts_js_1.BufferType.attribName]) !== -1
            || Object.prototype.hasOwnProperty.call(this.tag?.attributes, this.buffers[consts_js_1.BufferType.attribName])) {
            this.buffers[consts_js_1.BufferType.attribName] = "";
            this.buffers[consts_js_1.BufferType.attribValue] = "";
            return;
        }
        if (this.opt.xmlns) {
            const qn = utils_js_1.qname(this.buffers[consts_js_1.BufferType.attribName], true);
            const prefix = qn.prefix;
            const local = qn.local;
            if (prefix === "xmlns") {
                // namespace binding attribute. push the binding into scope
                if (local === "xml" && this.buffers[consts_js_1.BufferType.attribValue] !== consts_js_1.XML_NAMESPACE) {
                    this.strictFail(`xml: prefix must be bound to ${consts_js_1.XML_NAMESPACE}\n`
                        + `Actual: ${this.buffers[consts_js_1.BufferType.attribValue]}`);
                }
                else if (local === "xmlns" && this.buffers[consts_js_1.BufferType.attribValue] !== consts_js_1.XMLNS_NAMESPACE) {
                    this.strictFail(`xmlns: prefix must be bound to ${consts_js_1.XMLNS_NAMESPACE}\n`
                        + `Actual: ${this.buffers[consts_js_1.BufferType.attribValue]}`);
                }
                else {
                    const tag = this.tag;
                    const parent = this.tags[this.tags.length - 1] || this;
                    if (!tag)
                        throw new Error("Unexpected state");
                    if (tag.ns === parent.ns) {
                        tag.ns = Object.create(parent.ns ?? null);
                    }
                    if (!tag.ns) {
                        tag.ns = {};
                    }
                    tag.ns[local] = this.buffers[consts_js_1.BufferType.attribValue];
                }
            }
            // defer onattribute events until all attributes have been seen
            // so any new bindings can take effect. preserve attribute order
            // so deferred events can be emitted in document order
            this.attribList.push([
                this.buffers[consts_js_1.BufferType.attribName],
                this.buffers[consts_js_1.BufferType.attribValue],
            ]);
        }
        else {
            // in non-xmlns mode, we can emit the event right away
            if (!this.tag)
                throw new Error("Unexpected state");
            this.tag.attributes[this.buffers[consts_js_1.BufferType.attribName]]
                = this.buffers[consts_js_1.BufferType.attribValue];
            this.emitNode(consts_js_1.ParserEvents.attribute, {
                name: this.buffers[consts_js_1.BufferType.attribName],
                value: this.buffers[consts_js_1.BufferType.attribValue],
            });
        }
        this.buffers[consts_js_1.BufferType.attribName] = "";
        this.buffers[consts_js_1.BufferType.attribValue] = "";
    }
    // eslint-disable-next-line complexity, max-lines-per-function
    openTag(selfClosing = false) {
        if (this.opt.xmlns) {
            // emit namespace binding events
            const tag = this.tag;
            if (!tag)
                throw new Error("Unexpected state");
            // add namespace info to tag
            const qn = utils_js_1.qname(this.buffers[consts_js_1.BufferType.tagName]);
            tag.prefix = qn.prefix;
            tag.local = qn.local;
            if (tag.ns) {
                tag.uri = tag.ns[qn.prefix] || "";
            }
            else {
                tag.uri = "";
            }
            if (tag.prefix && !tag.uri) {
                this.strictFail(`Unbound namespace prefix: ${JSON.stringify(this.buffers[consts_js_1.BufferType.tagName])}`);
                tag.uri = qn.prefix;
            }
            const parent = this.tags[this.tags.length - 1] || this;
            if (tag.ns && parent.ns !== tag.ns) {
                Object.keys(tag.ns).forEach(p => {
                    this.emitNode(consts_js_1.ParserEvents.opennamespace, {
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
                const qualName = utils_js_1.qname(name, true);
                const prefix = qualName.prefix;
                const local = qualName.local;
                let uri;
                if (prefix === "") {
                    uri = "";
                }
                else if (tag.ns) {
                    uri = tag.ns[prefix] || "";
                }
                else {
                    uri = "";
                }
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
                    this.strictFail(`Unbound namespace prefix: ${JSON.stringify(prefix)}`);
                    a.uri = prefix;
                }
                if (!this.tag)
                    throw new Error("Unexpected state");
                this.tag.attributes[name] = a;
                this.emitNode(consts_js_1.ParserEvents.attribute, a);
            }
            this.attribList.length = 0;
        }
        if (!this.tag)
            throw new Error("Unexpected state");
        this.tag.isSelfClosing = Boolean(selfClosing);
        // process the tag
        this.sawRoot = true;
        this.tags.push(this.tag);
        this.emitNode(consts_js_1.ParserEvents.opentag, this.tag);
        if (!selfClosing) {
            // special case for <script> in non-strict mode.
            if (!this.noscript && this.buffers[consts_js_1.BufferType.tagName].toLowerCase() === "script") {
                this.state = consts_js_1.STATE.SCRIPT;
            }
            else {
                this.state = consts_js_1.STATE.TEXT;
            }
            this.tag = null;
            this.buffers[consts_js_1.BufferType.tagName] = "";
        }
        this.buffers[consts_js_1.BufferType.attribName] = "";
        this.buffers[consts_js_1.BufferType.attribValue] = "";
        this.attribList.length = 0;
    }
    // eslint-disable-next-line max-lines-per-function
    closeTag() {
        if (!this.buffers[consts_js_1.BufferType.tagName]) {
            this.strictFail("Weird empty close tag.");
            this.buffers[consts_js_1.BufferType.textNode] += "</>";
            this.state = consts_js_1.STATE.TEXT;
            return;
        }
        if (this.buffers[consts_js_1.BufferType.script]) {
            if (this.buffers[consts_js_1.BufferType.tagName] !== "script") {
                this.buffers[consts_js_1.BufferType.script] += `</${this.buffers[consts_js_1.BufferType.tagName]}>`;
                this.buffers[consts_js_1.BufferType.tagName] = "";
                this.state = consts_js_1.STATE.SCRIPT;
                return;
            }
            this.emitNode(consts_js_1.ParserEvents.script, this.buffers[consts_js_1.BufferType.script]);
            this.buffers[consts_js_1.BufferType.script] = "";
        }
        // first make sure that the closing tag actually exists.
        // <a><b></c></b></a> will close everything, otherwise.
        let t = this.tags.length;
        let tagName = this.buffers[consts_js_1.BufferType.tagName];
        if (!this.strict) {
            tagName = this.looseCase(tagName);
        }
        const closeTo = tagName;
        while (t--) {
            const close = this.tags[t];
            if (close.name === closeTo) {
                break;
            }
            else {
                // fail the first time in strict mode
                this.strictFail("Unexpected close tag");
            }
        }
        // didn't find it.  we already failed for strict, so just abort.
        if (t < 0) {
            this.strictFail(`Unmatched closing tag: ${this.buffers[consts_js_1.BufferType.tagName]}`);
            this.buffers[consts_js_1.BufferType.textNode] += `</${this.buffers[consts_js_1.BufferType.tagName]}>`;
            this.state = consts_js_1.STATE.TEXT;
            return;
        }
        this.buffers[consts_js_1.BufferType.tagName] = tagName;
        let s = this.tags.length;
        while (s-- > t) {
            const tag = this.tags.pop();
            if (!tag)
                throw new Error("Unexpected state");
            this.tag = tag;
            this.buffers[consts_js_1.BufferType.tagName] = this.tag.name;
            this.emitNode(consts_js_1.ParserEvents.closetag, this.buffers[consts_js_1.BufferType.tagName]);
            const parent = this.tags[this.tags.length - 1] || this;
            if (this.opt.xmlns && tag.ns !== parent.ns && tag.ns) {
                // remove namespace bindings introduced by tag
                Object.keys(tag.ns).forEach(p => {
                    if (!tag.ns)
                        throw new Error("Unexpected state");
                    const n = tag.ns[p];
                    this.emitNode(consts_js_1.ParserEvents.closenamespace, { prefix: p, uri: n });
                });
            }
        }
        if (t === 0)
            this.closedRoot = true;
        this.buffers[consts_js_1.BufferType.tagName] = "";
        this.buffers[consts_js_1.BufferType.attribValue] = "";
        this.buffers[consts_js_1.BufferType.attribName] = "";
        this.attribList.length = 0;
        this.state = consts_js_1.STATE.TEXT;
    }
    parseEntity() {
        let entity = this.buffers[consts_js_1.BufferType.entity];
        const entityLC = entity.toLowerCase();
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
        if (entity.charAt(0) === "#") {
            if (entity.charAt(1) === "x") {
                const HEXA_DIGIT_COUNT = 2;
                entity = entity.slice(HEXA_DIGIT_COUNT);
                num = parseInt(entity, HEXA);
                numStr = num.toString(HEXA);
            }
            else {
                entity = entity.slice(1);
                num = parseInt(entity, DECI);
                numStr = num.toString(DECI);
            }
        }
        entity = entity.replace(/^0+/u, "");
        if (num === undefined || isNaN(num) || numStr.toLowerCase() !== entity) {
            this.strictFail("Invalid character entity");
            return `&${this.buffers[consts_js_1.BufferType.entity]};`;
        }
        return String.fromCodePoint(num);
    }
    flushBuffers() {
        this.closeText();
        if (this.buffers[consts_js_1.BufferType.cdata] !== "") {
            this.emitNode(consts_js_1.ParserEvents.cdata, this.buffers[consts_js_1.BufferType.cdata]);
            this.buffers[consts_js_1.BufferType.cdata] = "";
        }
        if (this.buffers[consts_js_1.BufferType.script] !== "") {
            this.emitNode(consts_js_1.ParserEvents.script, this.buffers[consts_js_1.BufferType.script]);
            this.buffers[consts_js_1.BufferType.script] = "";
        }
    }
    handleBegin() {
        this.state = consts_js_1.STATE.BEGIN_WHITESPACE;
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
                c = utils_js_1.charAt(chunk, i++);
                if (c && this.trackPosition) {
                    this.position++;
                    if (c === "\n") {
                        this.line++;
                        this.column = 0;
                    }
                    else {
                        this.column++;
                    }
                }
            }
            this.buffers[consts_js_1.BufferType.textNode] += chunk.substring(starti, i - 1);
        }
        if (c === "<" && !(this.sawRoot && this.closedRoot && !this.strict)) {
            this.state = consts_js_1.STATE.OPEN_WAKA;
            this.startTagPosition = this.position;
        }
        else {
            if (!utils_js_1.isWhitespace(c) && (!this.sawRoot || this.closedRoot)) {
                this.strictFail("Text data outside of root node.");
            }
            if (c === "&") {
                this.state = consts_js_1.STATE.TEXT_ENTITY;
            }
            else {
                this.buffers[consts_js_1.BufferType.textNode] += c;
            }
        }
        return i;
    }
    handleScript() {
        // only non-strict
        if (this.c === "<") {
            this.state = consts_js_1.STATE.SCRIPT_ENDING;
        }
        else {
            this.buffers[consts_js_1.BufferType.script] += this.c;
        }
    }
    handleScriptEnding() {
        if (this.c === "/") {
            this.state = consts_js_1.STATE.CLOSE_TAG;
        }
        else {
            this.buffers[consts_js_1.BufferType.script] += `<${this.c}`;
            this.state = consts_js_1.STATE.SCRIPT;
        }
    }
    handleOpenWaka() {
        let c = this.c;
        // either a /, ?, !, or text is coming next.
        if (c === "!") {
            this.state = consts_js_1.STATE.SGML_DECL;
            this.buffers[consts_js_1.BufferType.sgmlDecl] = "";
        }
        else if (utils_js_1.isWhitespace(c)) {
            // wait for it...
        }
        else if (utils_js_1.isMatch(consts_js_1.nameStart, c)) {
            this.state = consts_js_1.STATE.OPEN_TAG;
            this.buffers[consts_js_1.BufferType.tagName] = c;
        }
        else if (c === "/") {
            this.state = consts_js_1.STATE.CLOSE_TAG;
            this.buffers[consts_js_1.BufferType.tagName] = "";
        }
        else if (c === "?") {
            this.state = consts_js_1.STATE.PROC_INST;
            this.buffers[consts_js_1.BufferType.procInstName] = "";
            this.buffers[consts_js_1.BufferType.procInstBody] = "";
        }
        else {
            this.strictFail("Unencoded <");
            // if there was some whitespace, then add that in.
            if (this.startTagPosition + 1 < this.position) {
                const pad = this.position - this.startTagPosition;
                c = new Array(pad).join(" ") + c;
            }
            this.buffers[consts_js_1.BufferType.textNode] += `<${c}`;
            this.state = consts_js_1.STATE.TEXT;
        }
    }
    handleSGMLDecl() {
        if ((this.buffers[consts_js_1.BufferType.sgmlDecl] + this.c).toUpperCase() === consts_js_1.CDATA) {
            this.emitNode(consts_js_1.ParserEvents.opencdata);
            this.state = consts_js_1.STATE.CDATA;
            this.buffers[consts_js_1.BufferType.sgmlDecl] = "";
            this.buffers[consts_js_1.BufferType.cdata] = "";
        }
        else if (this.buffers[consts_js_1.BufferType.sgmlDecl] + this.c === "--") {
            this.state = consts_js_1.STATE.COMMENT;
            this.buffers[consts_js_1.BufferType.comment] = "";
            this.buffers[consts_js_1.BufferType.sgmlDecl] = "";
        }
        else if ((this.buffers[consts_js_1.BufferType.sgmlDecl] + this.c).toUpperCase() === consts_js_1.DOCTYPE) {
            this.state = consts_js_1.STATE.DOCTYPE;
            if (this.sawDoctype || this.buffers[consts_js_1.BufferType.doctype] || this.sawRoot) {
                this.strictFail("Inappropriately located doctype declaration");
            }
            this.buffers[consts_js_1.BufferType.doctype] = "";
            this.buffers[consts_js_1.BufferType.sgmlDecl] = "";
        }
        else if (this.c === ">") {
            this.emitNode(consts_js_1.ParserEvents.sgmldeclaration, this.buffers[consts_js_1.BufferType.sgmlDecl]);
            this.buffers[consts_js_1.BufferType.sgmlDecl] = "";
            this.state = consts_js_1.STATE.TEXT;
        }
        else if (utils_js_1.isQuote(this.c)) {
            this.state = consts_js_1.STATE.SGML_DECL_QUOTED;
            this.buffers[consts_js_1.BufferType.sgmlDecl] += this.c;
        }
        else {
            this.buffers[consts_js_1.BufferType.sgmlDecl] += this.c;
        }
    }
    handleSGMLDeclQuoted() {
        if (this.c === this.q) {
            this.state = consts_js_1.STATE.SGML_DECL;
            this.q = "";
        }
        this.buffers[consts_js_1.BufferType.sgmlDecl] += this.c;
    }
    handleDoctype() {
        if (this.c === ">") {
            this.state = consts_js_1.STATE.TEXT;
            this.emitNode(consts_js_1.ParserEvents.doctype, this.buffers[consts_js_1.BufferType.doctype]);
            this.sawDoctype = true; // just remember that we saw it.
            this.buffers[consts_js_1.BufferType.doctype] = "";
        }
        else {
            this.buffers[consts_js_1.BufferType.doctype] += this.c;
            if (this.c === "[") {
                this.state = consts_js_1.STATE.DOCTYPE_DTD;
            }
            else if (utils_js_1.isQuote(this.c)) {
                this.state = consts_js_1.STATE.DOCTYPE_QUOTED;
                this.q = this.c;
            }
        }
    }
    handleDoctypeQuoted() {
        this.buffers[consts_js_1.BufferType.doctype] += this.c;
        if (this.c === this.q) {
            this.q = "";
            this.state = consts_js_1.STATE.DOCTYPE;
        }
    }
    handleDoctypeDTD() {
        this.buffers[consts_js_1.BufferType.doctype] += this.c;
        if (this.c === "]") {
            this.state = consts_js_1.STATE.DOCTYPE;
        }
        else if (utils_js_1.isQuote(this.c)) {
            this.state = consts_js_1.STATE.DOCTYPE_DTD_QUOTED;
            this.q = this.c;
        }
    }
    handleDoctypeDTDQuoted() {
        this.buffers[consts_js_1.BufferType.doctype] += this.c;
        if (this.c === this.q) {
            this.state = consts_js_1.STATE.DOCTYPE_DTD;
            this.q = "";
        }
    }
    handleComment() {
        if (this.c === "-") {
            this.state = consts_js_1.STATE.COMMENT_ENDING;
        }
        else {
            this.buffers[consts_js_1.BufferType.comment] += this.c;
        }
    }
    handleCommentEnding() {
        if (this.c === "-") {
            this.state = consts_js_1.STATE.COMMENT_ENDED;
            this.buffers[consts_js_1.BufferType.comment] = utils_js_1.textopts(this.opt, this.buffers[consts_js_1.BufferType.comment]);
            if (this.buffers[consts_js_1.BufferType.comment]) {
                this.emitNode(consts_js_1.ParserEvents.comment, this.buffers[consts_js_1.BufferType.comment]);
            }
            this.buffers[consts_js_1.BufferType.comment] = "";
        }
        else {
            this.buffers[consts_js_1.BufferType.comment] += `-${this.c}`;
            this.state = consts_js_1.STATE.COMMENT;
        }
    }
    handleCommentEnded() {
        if (this.c === ">") {
            this.state = consts_js_1.STATE.TEXT;
        }
        else {
            this.strictFail("Malformed comment");
            // allow <!-- blah -- bloo --> in non-strict mode,
            // which is a comment of " blah -- bloo "
            this.buffers[consts_js_1.BufferType.comment] += `--${this.c}`;
            this.state = consts_js_1.STATE.COMMENT;
        }
    }
    handleCData() {
        if (this.c === "]") {
            this.state = consts_js_1.STATE.CDATA_ENDING;
        }
        else {
            this.buffers[consts_js_1.BufferType.cdata] += this.c;
        }
    }
    handleCDataEnding() {
        if (this.c === "]") {
            this.state = consts_js_1.STATE.CDATA_ENDING_2;
        }
        else {
            this.buffers[consts_js_1.BufferType.cdata] += `]${this.c}`;
            this.state = consts_js_1.STATE.CDATA;
        }
    }
    handleCDataEnding2() {
        if (this.c === ">") {
            if (this.buffers[consts_js_1.BufferType.cdata]) {
                this.emitNode(consts_js_1.ParserEvents.cdata, this.buffers[consts_js_1.BufferType.cdata]);
            }
            this.emitNode(consts_js_1.ParserEvents.closecdata);
            this.buffers[consts_js_1.BufferType.cdata] = "";
            this.state = consts_js_1.STATE.TEXT;
        }
        else if (this.c === "]") {
            this.buffers[consts_js_1.BufferType.cdata] += "]";
        }
        else {
            this.buffers[consts_js_1.BufferType.cdata] += `]]${this.c}`;
            this.state = consts_js_1.STATE.CDATA;
        }
    }
    handleProcInst() {
        if (this.c === "?") {
            this.state = consts_js_1.STATE.PROC_INST_ENDING;
        }
        else if (utils_js_1.isWhitespace(this.c)) {
            this.state = consts_js_1.STATE.PROC_INST_BODY;
        }
        else {
            this.buffers[consts_js_1.BufferType.procInstName] += this.c;
        }
    }
    handleProcInstBody() {
        if (!this.buffers[consts_js_1.BufferType.procInstBody] && utils_js_1.isWhitespace(this.c)) {
            return;
        }
        if (this.c === "?") {
            this.state = consts_js_1.STATE.PROC_INST_ENDING;
        }
        else {
            this.buffers[consts_js_1.BufferType.procInstBody] += this.c;
        }
    }
    handleProcInstEnding() {
        if (this.c === ">") {
            this.emitNode(consts_js_1.ParserEvents.processinginstruction, {
                name: this.buffers[consts_js_1.BufferType.procInstName],
                body: this.buffers[consts_js_1.BufferType.procInstBody],
            });
            this.buffers[consts_js_1.BufferType.procInstName] = "";
            this.buffers[consts_js_1.BufferType.procInstBody] = "";
            this.state = consts_js_1.STATE.TEXT;
        }
        else {
            this.buffers[consts_js_1.BufferType.procInstBody] += `?${this.c}`;
            this.state = consts_js_1.STATE.PROC_INST_BODY;
        }
    }
    handleOpenTag() {
        if (utils_js_1.isMatch(consts_js_1.nameBody, this.c)) {
            this.buffers[consts_js_1.BufferType.tagName] += this.c;
        }
        else {
            this.newTag();
            if (this.c === ">") {
                this.openTag();
            }
            else if (this.c === "/") {
                this.state = consts_js_1.STATE.OPEN_TAG_SLASH;
            }
            else {
                if (!utils_js_1.isWhitespace(this.c)) {
                    this.strictFail("Invalid character in tag name");
                }
                this.state = consts_js_1.STATE.ATTRIB;
            }
        }
    }
    handleOpenTagSlash() {
        if (this.c === ">") {
            this.openTag(true);
            this.closeTag();
        }
        else {
            this.strictFail("Forward-slash in opening tag not followed by >");
            this.state = consts_js_1.STATE.ATTRIB;
        }
    }
    handleAttrib() {
        // haven't read the attribute name yet.
        if (utils_js_1.isWhitespace(this.c)) {
            return;
        }
        if (this.c === ">") {
            this.openTag();
        }
        else if (this.c === "/") {
            this.state = consts_js_1.STATE.OPEN_TAG_SLASH;
        }
        else if (utils_js_1.isMatch(consts_js_1.nameStart, this.c)) {
            this.buffers[consts_js_1.BufferType.attribName] = this.c;
            this.buffers[consts_js_1.BufferType.attribValue] = "";
            this.state = consts_js_1.STATE.ATTRIB_NAME;
        }
        else {
            this.strictFail("Invalid attribute name");
        }
    }
    handleAttribName() {
        if (this.c === "=") {
            this.state = consts_js_1.STATE.ATTRIB_VALUE;
        }
        else if (this.c === ">") {
            this.strictFail("Attribute without value");
            this.buffers[consts_js_1.BufferType.attribValue] = this.buffers[consts_js_1.BufferType.attribName];
            this.attrib();
            this.openTag();
        }
        else if (utils_js_1.isWhitespace(this.c)) {
            this.state = consts_js_1.STATE.ATTRIB_NAME_SAW_WHITE;
        }
        else if (utils_js_1.isMatch(consts_js_1.nameBody, this.c)) {
            this.buffers[consts_js_1.BufferType.attribName] += this.c;
        }
        else {
            this.strictFail("Invalid attribute name");
        }
    }
    handleAttribNameSawWhite() {
        if (this.c === "=") {
            this.state = consts_js_1.STATE.ATTRIB_VALUE;
        }
        else if (!utils_js_1.isWhitespace(this.c)) {
            this.strictFail("Attribute without value");
            if (!this.tag)
                throw new Error("Unexpected state");
            this.tag.attributes[this.buffers[consts_js_1.BufferType.attribName]] = "";
            this.buffers[consts_js_1.BufferType.attribValue] = "";
            this.emitNode(consts_js_1.ParserEvents.attribute, {
                name: this.buffers[consts_js_1.BufferType.attribName],
                value: "",
            });
            this.buffers[consts_js_1.BufferType.attribName] = "";
            if (this.c === ">") {
                this.openTag();
            }
            else if (utils_js_1.isMatch(consts_js_1.nameStart, this.c)) {
                this.buffers[consts_js_1.BufferType.attribName] = this.c;
                this.state = consts_js_1.STATE.ATTRIB_NAME;
            }
            else {
                this.strictFail("Invalid attribute name");
                this.state = consts_js_1.STATE.ATTRIB;
            }
        }
    }
    handleAttribValue() {
        if (utils_js_1.isWhitespace(this.c)) {
            return;
        }
        if (utils_js_1.isQuote(this.c)) {
            this.q = this.c;
            this.state = consts_js_1.STATE.ATTRIB_VALUE_QUOTED;
        }
        else {
            this.strictFail("Unquoted attribute value");
            this.state = consts_js_1.STATE.ATTRIB_VALUE_UNQUOTED;
            this.buffers[consts_js_1.BufferType.attribValue] = this.c;
        }
    }
    handleAttribValueQuoted() {
        if (this.c !== this.q) {
            if (this.c === "&") {
                this.state = consts_js_1.STATE.ATTRIB_VALUE_ENTITY_Q;
            }
            else {
                this.buffers[consts_js_1.BufferType.attribValue] += this.c;
            }
            return;
        }
        this.attrib();
        this.q = "";
        this.state = consts_js_1.STATE.ATTRIB_VALUE_CLOSED;
    }
    handleAttribValueClosed() {
        if (utils_js_1.isWhitespace(this.c)) {
            this.state = consts_js_1.STATE.ATTRIB;
        }
        else if (this.c === ">") {
            this.openTag();
        }
        else if (this.c === "/") {
            this.state = consts_js_1.STATE.OPEN_TAG_SLASH;
        }
        else if (utils_js_1.isMatch(consts_js_1.nameStart, this.c)) {
            this.strictFail("No whitespace between attributes");
            this.buffers[consts_js_1.BufferType.attribName] = this.c;
            this.buffers[consts_js_1.BufferType.attribValue] = "";
            this.state = consts_js_1.STATE.ATTRIB_NAME;
        }
        else {
            this.strictFail("Invalid attribute name");
        }
    }
    handleAttribValueUnquoted() {
        if (!utils_js_1.isAttribEnd(this.c)) {
            if (this.c === "&") {
                this.state = consts_js_1.STATE.ATTRIB_VALUE_ENTITY_U;
            }
            else {
                this.buffers[consts_js_1.BufferType.attribValue] += this.c;
            }
            return;
        }
        this.attrib();
        if (this.c === ">") {
            this.openTag();
        }
        else {
            this.state = consts_js_1.STATE.ATTRIB;
        }
    }
    handleCloseTag() {
        if (!this.buffers[consts_js_1.BufferType.tagName]) {
            if (utils_js_1.isWhitespace(this.c)) {
                return;
            }
            if (utils_js_1.notMatch(consts_js_1.nameStart, this.c)) {
                if (this.buffers[consts_js_1.BufferType.script]) {
                    this.buffers[consts_js_1.BufferType.script] += `</${this.c}`;
                    this.state = consts_js_1.STATE.SCRIPT;
                }
                else {
                    this.strictFail("Invalid tagname in closing tag.");
                }
            }
            else {
                this.buffers[consts_js_1.BufferType.tagName] = this.c;
            }
        }
        else if (this.c === ">") {
            this.closeTag();
        }
        else if (utils_js_1.isMatch(consts_js_1.nameBody, this.c)) {
            this.buffers[consts_js_1.BufferType.tagName] += this.c;
        }
        else if (this.buffers[consts_js_1.BufferType.script]) {
            this.buffers[consts_js_1.BufferType.script] += `</${this.buffers[consts_js_1.BufferType.tagName]}`;
            this.buffers[consts_js_1.BufferType.tagName] = "";
            this.state = consts_js_1.STATE.SCRIPT;
        }
        else {
            if (!utils_js_1.isWhitespace(this.c)) {
                this.strictFail("Invalid tagname in closing tag");
            }
            this.state = consts_js_1.STATE.CLOSE_TAG_SAW_WHITE;
        }
    }
    handleCloseTagSawWhite() {
        if (utils_js_1.isWhitespace(this.c)) {
            return;
        }
        if (this.c === ">") {
            this.closeTag();
        }
        else {
            this.strictFail("Invalid characters in closing tag");
        }
    }
    handleTextEntity() {
        let returnState;
        let buffer;
        switch (this.state) {
            case consts_js_1.STATE.TEXT_ENTITY:
                returnState = consts_js_1.STATE.TEXT;
                buffer = consts_js_1.BufferType.textNode;
                break;
            case consts_js_1.STATE.ATTRIB_VALUE_ENTITY_Q:
                returnState = consts_js_1.STATE.ATTRIB_VALUE_QUOTED;
                buffer = consts_js_1.BufferType.attribValue;
                break;
            case consts_js_1.STATE.ATTRIB_VALUE_ENTITY_U:
                returnState = consts_js_1.STATE.ATTRIB_VALUE_UNQUOTED;
                buffer = consts_js_1.BufferType.attribValue;
                break;
            default:
                throw new Error("Unexpected state");
        }
        if (this.c === ";") {
            this.buffers[buffer] += this.parseEntity();
            this.buffers[consts_js_1.BufferType.entity] = "";
            this.state = returnState;
        }
        else if (utils_js_1.isMatch(this.buffers[consts_js_1.BufferType.entity].length ? consts_js_1.entityBody : consts_js_1.entityStart, this.c)) {
            this.buffers[consts_js_1.BufferType.entity] += this.c;
        }
        else {
            this.strictFail("Invalid character in entity name");
            this.buffers[buffer] += `&${this.buffers[consts_js_1.BufferType.entity]}${this.c}`;
            this.buffers[consts_js_1.BufferType.entity] = "";
            this.state = returnState;
        }
    }
    // eslint-disable-next-line complexity
    readStateRouter(initialI, chunk) {
        let i = initialI;
        switch (this.state) {
            /* eslint-disable max-statements-per-line */
            case consts_js_1.STATE.BEGIN:
                this.handleBegin();
                break;
            case consts_js_1.STATE.BEGIN_WHITESPACE:
                this.beginWhiteSpace();
                break;
            case consts_js_1.STATE.TEXT:
                i = this.handleText(initialI, chunk);
                break;
            case consts_js_1.STATE.SCRIPT:
                this.handleScript();
                break;
            case consts_js_1.STATE.SCRIPT_ENDING:
                this.handleScriptEnding();
                break;
            case consts_js_1.STATE.OPEN_WAKA:
                this.handleOpenWaka();
                break;
            case consts_js_1.STATE.SGML_DECL:
                this.handleSGMLDecl();
                break;
            case consts_js_1.STATE.SGML_DECL_QUOTED:
                this.handleSGMLDeclQuoted();
                break;
            case consts_js_1.STATE.DOCTYPE:
                this.handleDoctype();
                break;
            case consts_js_1.STATE.DOCTYPE_QUOTED:
                this.handleDoctypeQuoted();
                break;
            case consts_js_1.STATE.DOCTYPE_DTD:
                this.handleDoctypeDTD();
                break;
            case consts_js_1.STATE.DOCTYPE_DTD_QUOTED:
                this.handleDoctypeDTDQuoted();
                break;
            case consts_js_1.STATE.COMMENT:
                this.handleComment();
                break;
            case consts_js_1.STATE.COMMENT_ENDING:
                this.handleCommentEnding();
                break;
            case consts_js_1.STATE.COMMENT_ENDED:
                this.handleCommentEnded();
                break;
            case consts_js_1.STATE.CDATA:
                this.handleCData();
                break;
            case consts_js_1.STATE.CDATA_ENDING:
                this.handleCDataEnding();
                break;
            case consts_js_1.STATE.CDATA_ENDING_2:
                this.handleCDataEnding2();
                break;
            case consts_js_1.STATE.PROC_INST:
                this.handleProcInst();
                break;
            case consts_js_1.STATE.PROC_INST_BODY:
                this.handleProcInstBody();
                break;
            case consts_js_1.STATE.PROC_INST_ENDING:
                this.handleProcInstEnding();
                break;
            case consts_js_1.STATE.OPEN_TAG:
                this.handleOpenTag();
                break;
            case consts_js_1.STATE.OPEN_TAG_SLASH:
                this.handleOpenTagSlash();
                break;
            case consts_js_1.STATE.ATTRIB:
                this.handleAttrib();
                break;
            case consts_js_1.STATE.ATTRIB_NAME:
                this.handleAttribName();
                break;
            case consts_js_1.STATE.ATTRIB_NAME_SAW_WHITE:
                this.handleAttribNameSawWhite();
                break;
            case consts_js_1.STATE.ATTRIB_VALUE:
                this.handleAttribValue();
                break;
            case consts_js_1.STATE.ATTRIB_VALUE_QUOTED:
                this.handleAttribValueQuoted();
                break;
            case consts_js_1.STATE.ATTRIB_VALUE_CLOSED:
                this.handleAttribValueClosed();
                break;
            case consts_js_1.STATE.ATTRIB_VALUE_UNQUOTED:
                this.handleAttribValueUnquoted();
                break;
            case consts_js_1.STATE.CLOSE_TAG:
                this.handleCloseTag();
                break;
            case consts_js_1.STATE.CLOSE_TAG_SAW_WHITE:
                this.handleCloseTagSawWhite();
                break;
            case consts_js_1.STATE.TEXT_ENTITY:
                this.handleTextEntity();
                break;
            case consts_js_1.STATE.ATTRIB_VALUE_ENTITY_Q:
                this.handleTextEntity();
                break;
            case consts_js_1.STATE.ATTRIB_VALUE_ENTITY_U:
                this.handleTextEntity();
                break;
            /* eslint-enable max-statements-per-line */
            default:
                throw new Error(`Unknown state: ${this.state}`);
        }
        return i;
    }
}
exports.default = SAXParser;
//# sourceMappingURL=saxparser.js.map