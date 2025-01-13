import { default as RootFS, FSTypeName, Stats } from "./RootFS";
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

export default abstract class FileSystem {
    fstype():FSTypeName;
    abstract isReadOnly(path:string):boolean;
    resolveFS(path:string):FileSystem;
    mountPoint?: string;
    mounted(rootFS:RootFS, mountPoint:string):void;
    inMYFS(path:string):boolean;
    getRootFS():RootFS;
    abstract getContent(path:string):Content;
    //size(path:string):number;
    abstract setContent(path:string, content:Content):void;
    abstract appendContent(path:string, content:Content):void;
    abstract lstat(path: string):Stats;
    abstract setMtime(path: string, time: number):void;
    //abstract getMetaInfo(path:string):MetaInfo;
    //abstract setMetaInfo(path:string, info:MetaInfo):void;
    getContentType(path:string):string;
    abstract mkdir(path:string):void;
    abstract touch(path:string):void;
    abstract exists(path:string):boolean;
    assertExist(path:string):void;
    assertWriteable(path:string):void;
    abstract opendir(path:string):string[];
    abstract opendirent(path:string):Dirent[];
    copyFile(path:string, dst:string):void;
    //mv(path:string, dst:string):void;
    abstract rm(path:string):void;
    link(path:string, to:string):void;
    abstract isLink(path:string):string|undefined;
    //getURL(path:string):string;
    onAddObserver(path:string):void;
    //abstract isDir(path:string):boolean;
    static addFSType(name:string, fsgen:(mountPoint:string, options:object)=>FileSystem):void;
    inMyFS(path:string):boolean;
    //resolveLink(path:string):string;

    //abstract createWalker(path:string):Walker;
}
export interface Walker{
    fileSystem: FileSystem;
    parentPath: string;
    name: string;
    next():Walker|undefined;
    enter():Walker;
    exit():Walker;
}
/*export type MetaInfo={
    lastUpdate:number,
    link?: string,
    trashed?: boolean,
};*/
