import { default as RootFS, FSTypeName } from "./RootFS";
import Content from "./Content";
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
    mkdir(path:string):void;
    touch(path:string):void;
    exists(path:string):boolean;
    opendir(path:string):string[];
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
