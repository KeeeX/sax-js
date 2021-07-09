import { EntitiesBaseList, EntitiesList, EventHandler, Namespace } from "./types";
export declare const MAX_BUFFER_LENGTH: number;
export declare enum BufferType {
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
    script = "script"
}
export declare enum StreamEvents {
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
    closenamespace = "onclosenamespace"
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
export declare enum ParserEvents {
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
    closenamespace = "onclosenamespace"
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
export declare const STATE: Record<string, number | string>;
export declare const XML_ENTITIES: EntitiesList;
export declare const entitiesBase: EntitiesBaseList;
export declare const ENTITIES: EntitiesList;
export declare const CDATA = "[CDATA[";
export declare const DOCTYPE = "DOCTYPE";
export declare const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
export declare const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
export declare const rootNS: Namespace;
export declare const nameStart: RegExp;
export declare const nameBody: RegExp;
export declare const entityStart: RegExp;
export declare const entityBody: RegExp;
//# sourceMappingURL=consts.d.ts.map