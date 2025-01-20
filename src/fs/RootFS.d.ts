import {default as FileSystem} from "./FSClass";
export type Stats=import("node:fs").Stats;
export type ObserverEvent={eventType:"change"|"rename"} & Stats;
//export type FSTab={fs:FileSystem, mountPoint:string};
type FSGenerator=(path:string)=>FileSystem;
export type FSTypeName=string;
export type ObserverHandler=(path:string, event:ObserverEvent)=>void;
export type Observer={
    path:string,
    handler: ObserverHandler,
    remove():void, 
};
export type WatchEvent=(
    {eventType:"create"|"change"|"rename"} & Stats|
    {eventType:"delete"} );

export default class RootFS {
    constructor(/*defaultFS: FileSystem*/);
    fstab(): FileSystem[];
    hasUncommited():boolean;
    umount(mountedPoint:string):void;
    mount(mountPoint:string, fs:FileSystem|FSTypeName):void;
    resolveFS(path:string):FileSystem;
    addObserver(path:string, handler: ObserverHandler):Observer;
    notifyChanged(path:string, watchEvent:WatchEvent):void;
    availFSTypes():{[key:FSTypeName]: FSGenerator};
}
