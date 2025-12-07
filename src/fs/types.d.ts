import { Content } from "@hoge1e3/content";
import { BaseName, Canonical } from "../types";
import { LSFSOptions } from "./LSFS";
export type Stats=import("node:fs").Stats;
//export type ObserverEvent={eventType:"change"|"rename"} & Stats;
//export type FSTab={fs:FileSystem, mountPoint:string};
//type FSDescriptor={factory:(path:string)=>FileSystem, asyncOptions?:AsyncOptions};
export type FSTypeName=string;
export type ObserverHandler=(path:Canonical, event:ObserverEvent)=>void;
export type Observer={
    path:Canonical,
    handler: ObserverHandler,
    remove():void, 
};
export type ObserverEvent=(
    {eventType:"create"|"change"|"rename"} & Stats|
    {eventType:"delete"} );

export class IRootFS {
    fstab(): IFileSystem[];
    hasUncommited():boolean;
    commitPromise():Promise<void[]>;
    unmount(mountedPoint:string):void;
    mount(mountPoint:string, fs:IFileSystem|FSTypeName, options?:LSFSOptions):IFileSystem;
    mountAsync(mountPoint:string, fs:FSTypeName, options?:LSFSOptions):Promise<IFileSystem>;
    resolveFS(path:string):IFileSystem;
    addObserver(path:string, handler: ObserverHandler):Observer;
    notifyChanged(path:string, event:ObserverEvent):void;
    //availFSTypes():{[key:FSTypeName]: FSType};
}
export type AsyncOptions={
    asyncOnMount?: boolean,
    asyncOnAccess?: boolean,// Not Implemented
};
export type Dirent={
    name: BaseName;
    parentPath: Canonical|null;
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    extra?: any;
}
export type FSFactory=SyncFSFactory|AsyncFSFactory;
export type SyncFSFactory=(rootFS:IRootFS, mountPoint:Canonical, options:object)=>IFileSystem;
export type AsyncFSFactory=(rootFS:IRootFS, mountPoint:Canonical, options:object)=>Promise<IFileSystem>;
export type FSTypeOptions=SyncFSTypeOptions|AsyncFSTypeOptions;
export type SyncFSTypeOptions={};
export type AsyncFSTypeOptions={
    asyncOnMount: true,
};
export type FSType=SyncFSType|AsyncFSType;
export type SyncFSType={
    factory:SyncFSFactory,
    asyncOptions:SyncFSTypeOptions
}
export type AsyncFSType={
    factory:AsyncFSFactory,
    asyncOptions:AsyncFSTypeOptions
}
export interface Walker{
    fileSystem: IFileSystem;
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
export type StatsEx= Stats & {linkPath:string|undefined};

export interface IFileSystem {
    //static availFSTypes():Record<string, FSType>;
    //constructor(rootFS:RootFS, mountPoint:string);
    fstype():FSTypeName;
    hasUncommited():boolean;
    commitPromise():Promise<void>;
    isReadOnly(path:Canonical):boolean;
    //resolveFS(path:string):FileSystem;
    mountPoint: Canonical;
    //mounted(rootFS:RootFS, mountPoint:string):void;
    //inMYFS(path:string):boolean;
    getRootFS():IRootFS;
    getContent(path:Canonical):Content;
    //size(path:string):number;
    setContent(path:Canonical, content:Content):void;
    appendContent(path:Canonical, content:Content):void;
    lstat(path: Canonical):Stats;
    setMtime(path: Canonical, time: number):void;
    //getMetaInfo(path:string):MetaInfo;
    //setMetaInfo(path:string, info:MetaInfo):void;
    //getContentType(path:string):string;
    mkdir(path:Canonical):void;
    touch(path:Canonical):void;
    exists(path:Canonical):boolean;
    //assertExist(path:string):void;
    //assertWriteable(path:string):void;
    opendir(path:Canonical):BaseName[];
    opendirent(path:Canonical):Dirent[];
    direntOfMountPoint():Dirent;
    //copyFile(path:string, dst:string):void;
    //mv(path:string, dst:string):void;
    rm(path:Canonical):void;
    link(path:Canonical, to:string):void;
    isLink(path:Canonical):string|undefined;
    //getURL(path:string):string;
    onAddObserver(path:Canonical):{remove:()=>void}|undefined;
    //isDir(path:string):boolean;
    //static addFSType(name:string, factory:FSFactory|AsyncFSFactory, asyncOptions?:AsyncOptions):void;
    inMyFS(path:Canonical):boolean;
    //resolveLink(path:string):string;

    //createWalker(path:string):Walker;
}
export interface Walker{
    fileSystem: IFileSystem;
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

