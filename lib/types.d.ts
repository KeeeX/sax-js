export declare type EntitiesBaseList = Record<string, string | number>;
export declare type EntitiesList = Record<string, string>;
export declare type Namespace = Record<string, string>;
export declare type EventHandler = (data?: unknown) => void;
export interface DetailedAttribute {
    name: string;
    value: string;
    prefix: string;
    local: string;
    uri: string;
}
export interface TagElem {
    name: string;
    attributes: Record<string, string | DetailedAttribute>;
    ns?: Namespace;
    prefix?: string;
    local?: string;
    uri?: string;
    isSelfClosing?: boolean;
}
//# sourceMappingURL=types.d.ts.map