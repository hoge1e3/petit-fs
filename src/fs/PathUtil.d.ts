
export default class PathUtil {
    static SEP: "/"|"\\";

    static isChildOf(child:string, parent:string):boolean;
    static normalize(path:string):string;
    static hasDriveLetter(path:string):boolean;
    static isURL(path:string):boolean;
    static isPath(path:string):boolean;
    static isRelativePath(path:string):boolean;
    static isAbsolutePath(path:string):boolean;
    static isDir(path:string):boolean;
    static hasBackslashSep(path:string):boolean;
    static endsWith(path:string):boolean;
    static startsWith(path:string):boolean;

    static fixSep(path:string):string;
    static directorify(path:string):string;
    static splitPath(path:string):string[];
    static name(path:string):string;
    static ext(path:string):string;
    static truncExt(path:string, ext?:string):string;
    static truncSEP(path:string):string;
    static parent(path:string):string;
    static up(path:string):string;
    static rel(path:string, relPath:string):string;
    static relPath(path:string, base:string):string;
}