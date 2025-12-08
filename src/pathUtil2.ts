import _p from "./path/index.js";
import { Absolute, BaseName, Canonical, Directorified, Normalized } from "./types";
export const path=_p.path.posix;
export function isAbsolute(p:string):p is Absolute {
    return path.isAbsolute(p);
}
export function asAbsolute(p:string):Absolute {
    if (!isAbsolute(p)) throw new Error(`${p} is not absolute`);
    return p;
}
// Normalized: path separator is single '/', no trailing slash. Relative path allowed.
export function normalize(p:Absolute):Canonical;
export function normalize(p:string):Normalized {
    return filify(p);
}
export function filify(p:string):Normalized{
    p=path.normalize(p);
    /* only "/" is canonical and ends with "/" */
    if (p.length>1 && p.endsWith(path.sep)) return p.substring(0,p.length-1) as Normalized;
    return p as Normalized;
}
export function directorify(p:Absolute&Normalized):Absolute&Directorified;
export function directorify(p:Normalized):Directorified;
export function directorify(p:Absolute):Absolute;
export function directorify(p:string):Directorified;
export function directorify(p:string){
    return filify(p)+path.sep;
}
export function up(p:Canonical):Canonical|null 
export function up(p:string):string|null 
export function up(p:string):string|null {
    const r=path.dirname(p);
    if (r===p) return null;
    return r;
}
export function join(a:Canonical,...sub:BaseName[]):Canonical;
export function join(a:Absolute,...sub:string[]):Absolute;
export function join(a:Absolute,...sub:string[]):Absolute {
    return path.join(a,...sub) as Absolute;
}
export function basename(s:string) {
    return path.basename(s) as BaseName;
}
export function toAbsolutePath(_path:string):Absolute {
    //if (isAbsolute(_path)) return _path;
    return path.resolve(_path) as Absolute;
}
export function  toCanonicalPath(_path:string):Canonical {
    return path.resolve(_path) as Canonical;
}