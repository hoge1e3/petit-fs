import _p from "./path/index.js";
export const path = _p.path.posix;
export function isAbsolute(p) {
    return path.isAbsolute(p);
}
export function asAbsolute(p) {
    if (!isAbsolute(p))
        throw new Error(`${p} is not absolute`);
    return p;
}
export function normalize(p) {
    return filify(p);
}
export function filify(p) {
    p = path.normalize(p);
    /* only "/" is canonical and ends with "/" */
    if (p.length > 1 && p.endsWith(path.sep))
        return p.substring(0, p.length - 1);
    return p;
}
export function directorify(p) {
    return filify(p) + path.sep;
}
export function up(p) {
    const r = path.dirname(p);
    if (r === p)
        return null;
    return r;
}
export function join(a, ...sub) {
    return path.join(a, ...sub);
}
export function joinCB(c, b) {
    return (c + (c === "/" ? "" : path.sep) + b);
}
export function basename(s) {
    return path.basename(s);
}
export function toAbsolutePath(_path) {
    //if (isAbsolute(_path)) return _path;
    return path.resolve(_path);
}
export function toCanonicalPath(_path) {
    return path.resolve(_path);
}
//# sourceMappingURL=pathUtil2.js.map