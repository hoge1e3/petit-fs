declare const symabs: unique symbol;
declare const symnorm: unique symbol;
declare const symdir: unique symbol;
declare const symname: unique symbol;
export type Absolute = string & {
    [symabs]: 1;
};
export type Normalized = string & {
    [symnorm]: 1;
};
export type Directorified = string & {
    [symdir]: 1;
};
export type Canonical = Absolute & Normalized;
export type BaseName = string & {
    [symname]: 1;
};
export {};
