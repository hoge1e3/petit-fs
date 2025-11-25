import {AsyncOptions, default as FileSystem} from "./FSClass";
import { LSFSOptions } from "./LSFS";
export type Stats=import("node:fs").Stats;
export type ObserverEvent={eventType:"change"|"rename"} & Stats;
//export type FSTab={fs:FileSystem, mountPoint:string};
type FSDescriptor={factory:(path:string)=>FileSystem, asyncOptions?:AsyncOptions};
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
    commitPromise():Promise<void>;
    unmount(mountedPoint:string):void;
    mount(mountPoint:string, fs:FileSystem|FSTypeName, options?:LSFSOptions):FileSystem;
    mountAsync(mountPoint:string, fs:FSTypeName, options?:LSFSOptions):Promise<FileSystem>;
    resolveFS(path:string):FileSystem;
    addObserver(path:string, handler: ObserverHandler):Observer;
    notifyChanged(path:string, watchEvent:WatchEvent):void;
    availFSTypes():{[key:FSTypeName]: FSDescriptor};
}
