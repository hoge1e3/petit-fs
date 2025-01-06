import {default as FileSystem, MetaInfo} from "./FSClass";
export type ObserverEvent={eventType:"change"|"rename"} & MetaInfo;
//export type FSTab={fs:FileSystem, mountPoint:string};
type FSGenerator=(path:string)=>FileSystem;
export type FSTypeName=string;
export type ObserverHandler=(path:string, metaInfo:ObserverEvent)=>void;
export type Observer={
    path:string,
    handler: ObserverHandler,
    remove():void, 
};
export type WatchEvent=(
    {eventType:"create"|"change"|"rename"} & MetaInfo|
    {eventType:"delete"} );

export default class RootFS {
    constructor(defaultFS: FileSystem);
    fstab(): FileSystem[];
    umount(path:string):void;
    mount(path:string, fs:FileSystem|FSTypeName):void;
    resolveFS(path:string):FileSystem;
    addObserver(path:string, handler: ObserverHandler):Observer;
    notifyChanged(path:string, watchEvent:WatchEvent):void;
    availFSTypes():{[key:FSTypeName]: FSGenerator};
}
