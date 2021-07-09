import { ParserEvents, ParserEventsInterface } from "./consts.js";
import { SAXParserOpts } from "./saxparser.js";
import { EventHandler } from "./types.js";
export default class SAXStream implements ParserEventsInterface {
    onerror: EventHandler | undefined;
    onend: EventHandler | undefined;
    private _parser;
    private _decoder;
    private events;
    constructor(strict?: boolean, opt?: SAXParserOpts);
    get ontext(): EventHandler | undefined;
    set ontext(handler: EventHandler | undefined);
    get onprocessinginstruction(): EventHandler | undefined;
    set onprocessinginstruction(handler: EventHandler | undefined);
    get onsgmldeclaration(): EventHandler | undefined;
    set onsgmldeclaration(handler: EventHandler | undefined);
    get ondoctype(): EventHandler | undefined;
    set ondoctype(handler: EventHandler | undefined);
    get oncomment(): EventHandler | undefined;
    set oncomment(handler: EventHandler | undefined);
    get onopentagstart(): EventHandler | undefined;
    set onopentagstart(handler: EventHandler | undefined);
    get onattribute(): EventHandler | undefined;
    set onattribute(handler: EventHandler | undefined);
    get onopentag(): EventHandler | undefined;
    set onopentag(handler: EventHandler | undefined);
    get onclosetag(): EventHandler | undefined;
    set onclosetag(handler: EventHandler | undefined);
    get onopencdata(): EventHandler | undefined;
    set onopencdata(handler: EventHandler | undefined);
    get oncdata(): EventHandler | undefined;
    set oncdata(handler: EventHandler | undefined);
    get onclosecdata(): EventHandler | undefined;
    set onclosecdata(handler: EventHandler | undefined);
    get onready(): EventHandler | undefined;
    set onready(handler: EventHandler | undefined);
    get onscript(): EventHandler | undefined;
    set onscript(handler: EventHandler | undefined);
    get onopennamespace(): EventHandler | undefined;
    set onopennamespace(handler: EventHandler | undefined);
    get onclosenamespace(): EventHandler | undefined;
    set onclosenamespace(handler: EventHandler | undefined);
    write(data: string | Uint8Array): boolean;
    end(chunk?: string | Uint8Array): boolean;
    on(ev: string, handler: EventHandler): void;
    emit(ev: ParserEvents, data?: unknown): void;
}
//# sourceMappingURL=saxstream.d.ts.map