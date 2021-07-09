"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const string_decoder_1 = __importDefault(require("string_decoder"));
const safe_buffer_1 = require("safe-buffer");
const consts_js_1 = require("./consts.js");
const saxparser_js_1 = __importDefault(require("./saxparser.js"));
// eslint-disable-next-line @typescript-eslint/naming-convention
const { StringDecoder } = string_decoder_1.default;
class SAXStream {
    constructor(strict = false, opt = {}) {
        this.events = {
            ontext: [],
            onprocessinginstruction: [],
            onsgmldeclaration: [],
            ondoctype: [],
            oncomment: [],
            onopentagstart: [],
            onattribute: [],
            onopentag: [],
            onclosetag: [],
            onopencdata: [],
            oncdata: [],
            onclosecdata: [],
            onready: [],
            onscript: [],
            onopennamespace: [],
            onclosenamespace: [],
            onerror: [],
            onend: [],
        };
        this._parser = new saxparser_js_1.default(strict, opt);
        this._parser.onend = () => {
            this.emit(consts_js_1.ParserEvents.end);
        };
        this._parser.onerror = err => {
            this.emit(consts_js_1.ParserEvents.error, err);
            this._parser.resume();
        };
    }
    get ontext() {
        return this._parser.ontext;
    }
    set ontext(handler) {
        this._parser.ontext = handler;
    }
    get onprocessinginstruction() {
        return this._parser.onprocessinginstruction;
    }
    set onprocessinginstruction(handler) {
        this._parser.onprocessinginstruction = handler;
    }
    get onsgmldeclaration() {
        return this._parser.onsgmldeclaration;
    }
    set onsgmldeclaration(handler) {
        this._parser.onsgmldeclaration = handler;
    }
    get ondoctype() {
        return this._parser.ondoctype;
    }
    set ondoctype(handler) {
        this._parser.ondoctype = handler;
    }
    get oncomment() {
        return this._parser.oncomment;
    }
    set oncomment(handler) {
        this._parser.oncomment = handler;
    }
    get onopentagstart() {
        return this._parser.onopentagstart;
    }
    set onopentagstart(handler) {
        this._parser.onopentagstart = handler;
    }
    get onattribute() {
        return this._parser.onattribute;
    }
    set onattribute(handler) {
        this._parser.onattribute = handler;
    }
    get onopentag() {
        return this._parser.onopentag;
    }
    set onopentag(handler) {
        this._parser.onopentag = handler;
    }
    get onclosetag() {
        return this._parser.onclosetag;
    }
    set onclosetag(handler) {
        this._parser.onclosetag = handler;
    }
    get onopencdata() {
        return this._parser.onopencdata;
    }
    set onopencdata(handler) {
        this._parser.onopencdata = handler;
    }
    get oncdata() {
        return this._parser.oncdata;
    }
    set oncdata(handler) {
        this._parser.oncdata = handler;
    }
    get onclosecdata() {
        return this._parser.onclosecdata;
    }
    set onclosecdata(handler) {
        this._parser.onclosecdata = handler;
    }
    get onready() {
        return this._parser.onready;
    }
    set onready(handler) {
        this._parser.onready = handler;
    }
    get onscript() {
        return this._parser.onscript;
    }
    set onscript(handler) {
        this._parser.onscript = handler;
    }
    get onopennamespace() {
        return this._parser.onopennamespace;
    }
    set onopennamespace(handler) {
        this._parser.onopennamespace = handler;
    }
    get onclosenamespace() {
        return this._parser.onclosenamespace;
    }
    set onclosenamespace(handler) {
        this._parser.onclosenamespace = handler;
    }
    write(data) {
        let effectiveData;
        if (typeof data === "string") {
            effectiveData = data;
        }
        else {
            if (!this._decoder) {
                this._decoder = new StringDecoder();
            }
            effectiveData = this._decoder.write(safe_buffer_1.Buffer.from(data));
        }
        this._parser.write(effectiveData);
        // this.emit(.data, effectiveData);
        return true;
    }
    end(chunk) {
        if (chunk?.length) {
            this.write(chunk);
        }
        this._parser.end();
        return true;
    }
    on(ev, handler) {
        let eventName;
        if (ev.startsWith("on")) {
            eventName = ev;
        }
        else {
            eventName = `on${ev}`;
        }
        if (Object.values(consts_js_1.ParserEvents).indexOf(eventName) === -1) {
            throw new Error("Unknown event");
        }
        const parserEvent = eventName;
        if (!this._parser[parserEvent]
            && Object.values(consts_js_1.StreamEvents).indexOf(parserEvent) !== -1) {
            this._parser[parserEvent] = (...rest) => {
                this.emit(parserEvent, ...rest);
            };
        }
        this.events[parserEvent].push(handler);
    }
    emit(ev, data) {
        if (ev === consts_js_1.ParserEvents.error) {
            if (this.onerror)
                this.onerror(data);
        }
        else if (ev === consts_js_1.ParserEvents.end) {
            if (this.onend)
                this.onend(data);
        }
        for (const handler of this.events[ev]) {
            handler(data);
        }
    }
}
exports.default = SAXStream;
//# sourceMappingURL=saxstream.js.map