const symabs=Symbol("Absolute");
const symnorm=Symbol("Normalized");
const symdir=Symbol("Directorified");
const symname=Symbol("BaseName");
export type Absolute=string&{[symabs]:1};
// Normalized: path separator is single '/', no trailing slash. Relative path allowed.
export type Normalized=string&{[symnorm]:1};
// Directorified: Normalized+"/".
export type Directorified=string&{[symdir]:1};
export type Canonical=Absolute&Normalized;
export type BaseName=string&{[symname]:1};