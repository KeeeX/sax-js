export interface TextOpts {
    trim?: boolean;
    normalize?: boolean;
}
export declare const textopts: (opt: TextOpts, text: string) => string;
export declare const charAt: (chunk: string, i: number) => string;
export declare const isWhitespace: (c: string) => boolean;
export declare const isMatch: (regex: RegExp, c: string) => boolean;
export declare const notMatch: (regex: RegExp, c: string) => boolean;
export declare const isQuote: (c: string) => boolean;
export declare const isAttribEnd: (c: string) => boolean;
export declare const qname: (name: string, attribute?: boolean) => {
    prefix: string;
    local: string;
};
//# sourceMappingURL=utils.d.ts.map