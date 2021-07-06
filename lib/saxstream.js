const {STREAM_EVENTS} = require("./consts.js");
const SAXParser = require("./saxparser.js");

class SAXStream {
  constructor(strict, opt) {
    this._parser = new SAXParser(strict, opt);
    this._parser.onend = () => {
      this.emit("end");
    };
    this._parser.onerror = err => {
      this.emit("error", err);
      this._parser.resume();
    };
    this._decoder = null;
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
    } else if (
      typeof Buffer === "function"
        && typeof Buffer.isBuffer === "function"
        && Buffer.isBuffer(data)
    ) {
      if (!this._decoder) {
        const pkgName = "string_decoder";
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const SD = require(pkgName).StringDecoder;
        this._decoder = new SD();
      }
      effectiveData = this._decoder.write(data);
    } else {
      effectiveData = data.toString();
    }
    this._parser.write(effectiveData);
    this.emit("data", effectiveData);
    return true;
  }

  end(chunk) {
    if (chunk && chunk.length) {
      this.write(chunk);
    }
    this._parser.end();
    return true;
  }

  on(ev, handler) {
    if (!this._parser[`on${ev}`] && STREAM_EVENTS.indexOf(ev) !== -1) {
      this._parser[`on${ev}`] = (...rest) => {
        this.emit(ev, ...rest);
      };
    }
    if (!("_eventHandlers" in this)) {
      this._eventHandlers = {};
    }
    if (!(ev in this._eventHandlers)) {
      this._eventHandlers[ev] = [];
    }
    this._eventHandlers[ev].push(handler);
  }

  emit(ev, ...data) {
    if (!("_eventHandlers" in this)) return;
    if (!(ev in this._eventHandlers)) return;
    for (const handler of this._eventHandlers[ev]) {
      handler(...data);
    }
  }
}

module.exports = SAXStream;
