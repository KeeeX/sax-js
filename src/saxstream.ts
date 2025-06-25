import {
  ParserEvents,
  ParserEventsInterface,
  StreamEvents,
  StreamEventsInterface,
} from "./consts.js";
import SAXParser, {SAXParserOpts} from "./saxparser.js";
import {StringDecoder} from "./string_decoder.js";
import {EventHandler} from "./types.js";

export default class SAXStream implements ParserEventsInterface {
  public onerror: EventHandler | undefined;
  public onend: EventHandler | undefined;
  private _parser: SAXParser;
  private _decoder: StringDecoder | undefined;
  private readonly events: StreamEventsInterface = {
    onattribute: [],
    oncdata: [],
    onclosecdata: [],
    onclosenamespace: [],
    onclosetag: [],
    oncomment: [],
    ondoctype: [],
    onend: [],
    onerror: [],
    onopencdata: [],
    onopennamespace: [],
    onopentag: [],
    onopentagstart: [],
    onprocessinginstruction: [],
    onready: [],
    onscript: [],
    onsgmldeclaration: [],
    ontext: [],
  };

  public constructor(strict = false, opt: SAXParserOpts = {}) {
    this._parser = new SAXParser(strict, opt);
    this._parser.onend = (): void => {
      this.emit(ParserEvents.end);
    };
    this._parser.onerror = (err): void => {
      this.emit(ParserEvents.error, err);
      this._parser.resume();
    };
  }

  public get ontext(): EventHandler | undefined {
    return this._parser.ontext;
  }

  public set ontext(handler: EventHandler | undefined) {
    this._parser.ontext = handler;
  }

  public get onprocessinginstruction(): EventHandler | undefined {
    return this._parser.onprocessinginstruction;
  }

  public set onprocessinginstruction(handler: EventHandler | undefined) {
    this._parser.onprocessinginstruction = handler;
  }

  public get onsgmldeclaration(): EventHandler | undefined {
    return this._parser.onsgmldeclaration;
  }

  public set onsgmldeclaration(handler: EventHandler | undefined) {
    this._parser.onsgmldeclaration = handler;
  }

  public get ondoctype(): EventHandler | undefined {
    return this._parser.ondoctype;
  }

  public set ondoctype(handler: EventHandler | undefined) {
    this._parser.ondoctype = handler;
  }

  public get oncomment(): EventHandler | undefined {
    return this._parser.oncomment;
  }

  public set oncomment(handler: EventHandler | undefined) {
    this._parser.oncomment = handler;
  }

  public get onopentagstart(): EventHandler | undefined {
    return this._parser.onopentagstart;
  }

  public set onopentagstart(handler: EventHandler | undefined) {
    this._parser.onopentagstart = handler;
  }

  public get onattribute(): EventHandler | undefined {
    return this._parser.onattribute;
  }

  public set onattribute(handler: EventHandler | undefined) {
    this._parser.onattribute = handler;
  }

  public get onopentag(): EventHandler | undefined {
    return this._parser.onopentag;
  }

  public set onopentag(handler: EventHandler | undefined) {
    this._parser.onopentag = handler;
  }

  public get onclosetag(): EventHandler | undefined {
    return this._parser.onclosetag;
  }

  public set onclosetag(handler: EventHandler | undefined) {
    this._parser.onclosetag = handler;
  }

  public get onopencdata(): EventHandler | undefined {
    return this._parser.onopencdata;
  }

  public set onopencdata(handler: EventHandler | undefined) {
    this._parser.onopencdata = handler;
  }

  public get oncdata(): EventHandler | undefined {
    return this._parser.oncdata;
  }

  public set oncdata(handler: EventHandler | undefined) {
    this._parser.oncdata = handler;
  }

  public get onclosecdata(): EventHandler | undefined {
    return this._parser.onclosecdata;
  }

  public set onclosecdata(handler: EventHandler | undefined) {
    this._parser.onclosecdata = handler;
  }

  public get onready(): EventHandler | undefined {
    return this._parser.onready;
  }

  public set onready(handler: EventHandler | undefined) {
    this._parser.onready = handler;
  }

  public get onscript(): EventHandler | undefined {
    return this._parser.onscript;
  }

  public set onscript(handler: EventHandler | undefined) {
    this._parser.onscript = handler;
  }

  public get onopennamespace(): EventHandler | undefined {
    return this._parser.onopennamespace;
  }

  public set onopennamespace(handler: EventHandler | undefined) {
    this._parser.onopennamespace = handler;
  }

  public get onclosenamespace(): EventHandler | undefined {
    return this._parser.onclosenamespace;
  }

  public set onclosenamespace(handler: EventHandler | undefined) {
    this._parser.onclosenamespace = handler;
  }

  public write(data: string | Uint8Array): boolean {
    /* eslint-disable-next-line @typescript-eslint/init-declarations */
    let effectiveData;
    if (typeof data === "string") {
      effectiveData = data;
    } else {
      this._decoder ??= new StringDecoder();
      effectiveData = this._decoder.write(data);
    }
    this._parser.write(effectiveData);
    return true;
  }

  public end(chunk?: string | Uint8Array): boolean {
    if (chunk?.length) {
      this.write(chunk);
    }
    this._parser.end();
    return true;
  }

  public on(ev: string, handler: EventHandler): void {
    /* eslint-disable-next-line @typescript-eslint/init-declarations */
    let eventName;
    if (ev.startsWith("on")) {
      eventName = ev;
    } else {
      eventName = `on${ev}`;
    }
    if (!Object.values(ParserEvents).includes(eventName as ParserEvents)) {
      throw new Error("Unknown event");
    }
    const parserEvent = eventName as ParserEvents;
    if (
      !this._parser[parserEvent] &&
      Object.values(StreamEvents).includes(parserEvent as unknown as StreamEvents)
    ) {
      this._parser[parserEvent] = (...rest): void => {
        this.emit(parserEvent, ...rest);
      };
    }
    this.events[parserEvent].push(handler);
  }

  public emit(ev: ParserEvents, data?: unknown): void {
    if (ev === ParserEvents.error) {
      if (this.onerror) this.onerror(data);
    } else if (ev === ParserEvents.end) {
      if (this.onend) this.onend(data);
    }
    for (const handler of this.events[ev]) {
      handler(data);
    }
  }
}
