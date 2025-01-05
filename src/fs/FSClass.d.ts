import { default as RootFS, FSTypeName } from "./RootFS";
import Content from "./Content";
import { Dir } from "fs";
export type Dirent={
    name: string;
    parentPath?: string;
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    extra?: any;
}

export default class FileSystem {
    fstype():FSTypeName;
    isReadOnly(path:string):boolean;
    resolveFS(path:string):FileSystem;
    mountPoint?: string;
    mounted(rootFS:RootFS, mountPoint:string):void;
    inMYFS(path:string):boolean;
    getRootFS():RootFS;
    getContent(path:string):Content;
    size(path:string):number;
    setContent(path:string, content:Content):void;
    appendContent(path:string, content:Content):void;
    getMetaInfo(path:string):MetaInfo;
    setMetaInfo(path:string, info:MetaInfo):void;
    getContentType(path:string):string;
    mkdir(path:string):void;
    touch(path:string):void;
    exists(path:string):boolean;
    opendir(path:string):string[];
    opendirent(path:string):Dirent[];
    cp(path:string, dst:string):void;
    mv(path:string, dst:string):void;
    rm(path:string):void;
    link(path:string, to:string):void;
    isLink(path:string):string|undefined;
    getURL(path:string):string;
    onAddObserver(path:string):void;
    isDir(path:string):boolean;
    //resolveLink(path:string):string;
}
export type MetaInfo={
    lastUpdate:number,
    link: string,
};
