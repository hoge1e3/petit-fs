//@ts-check
import PathUtil from "./PathUtil.js";
//import P from "./PathUtil.js";
/**
 * @typedef FileSystem {import("./FSClass").FileSystem}
 */
import { LSFSOptions } from "./LSFS";
import { basename, toCanonicalPath,up } from "../pathUtil2.js";
import { Canonical } from "../types.js";
import { AsyncFSType, FSFactory, FSType, FSTypeName, FSTypeOptions, IFileSystem, IRootFS, Observer, ObserverEvent, ObserverHandler } from "./types.js";
//export type Stats=import("node:fs").Stats;
//export type ObserverEvent={eventType:"change"|"rename"} & Stats;
//export type FSTab={fs:FileSystem, mountPoint:string};
//type FSDescriptor={factory:(path:string)=>FileSystem, asyncOptions?:AsyncOptions};
/*export type FSTypeName=string;
export type ObserverHandler=(path:Canonical, event:ObserverEvent)=>void;
export type Observer={
    path:string,
    handler: ObserverHandler,
    remove():void, 
};
export type ObserverEvent=(
    {eventType:"create"|"change"|"rename"} & Stats|
    {eventType:"delete"} );*/
function isAsyncFSType(s:FSType):s is AsyncFSType {
    return (s.asyncOptions as any).asyncOnMount;
}
export default class RootFS implements IRootFS{
    static fstypes = {} as Record<FSTypeName, FSType>;
    static addFSType(name:FSTypeName, factory:FSFactory, asyncOptions:FSTypeOptions={}) {
        RootFS.fstypes[name] = {factory,asyncOptions} as FSType;
    }
    static availFSTypes() {
        return RootFS.fstypes;
    }
    _fstab:IFileSystem[]=[];
    observers: Observer[]=[];
    /*err(path:string, mesg:string) {
        throw new Error(path + ": " + mesg);
    },*/
    // mounting
    fstab() {
        this._fstab = this._fstab || [];//[{fs:this, path:P.SEP}];
        return this._fstab;
    }
    hasUncommited() {
        for (let fs of this.fstab()) {
            if (fs.hasUncommited()) return true;
        }
        return false;
    }
    commitPromise() {
        return Promise.all(this.fstab().map(fs=>fs.commitPromise()));
    }
    unmount(_path:string) {
        const path=toCanonicalPath(_path);
        var t = this.fstab();
        console.log(t);
        for (var i = 0; i < t.length; i++) {
            if (t[i].mountPoint == path) {
                t.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    mount(mountPoint:string, _fs:IFileSystem|FSTypeName, options?:LSFSOptions) {
        let fs: IFileSystem;
        if (typeof _fs == "string") {
            const fst = RootFS.availFSTypes()[_fs];
            if (!fst) throw new Error(`FS type ${_fs} not found`);
            if (isAsyncFSType(fst)) {
                throw new Error(`The FS type '${_fs}' requires async mount. Use mountAsync instead.`);
            }
            fs = fst.factory(this, toCanonicalPath(mountPoint), options || {});
        } else {
            fs = _fs;
        }
        this.fstab().unshift(fs);
        return fs;
    }
    async mountAsync(mountPoint:string, _fs:FSTypeName, options?:LSFSOptions) {
        const fst = RootFS.availFSTypes()[_fs];
        if (!fst) throw new Error(`FS type ${_fs} not found`);
        const fs = await fst.factory(this, toCanonicalPath(mountPoint), options || {});
        this.fstab().unshift(fs);
        return fs;
    }
    resolveFS(path:string):IFileSystem {
        const f=this.fstab();
        for (let p:Canonical|null=toCanonicalPath(path); p; p=up(p)) {
            const found=f.find(e=>
                e.mountPoint===p);
            if (found) return found;
        }
        throw new Error("Cannot resolve "+path);
    }
    addObserver(path:Canonical, f:ObserverHandler) {
        var options = {};
        var fs = this.resolveFS(path);
        var remover = fs.onAddObserver(path);
        var observers = this.observers;
        var observer = {
            path: path,
            handler: f,
            remove: function () {
                var i = observers.indexOf(this);
                observers.splice(i, 1);
                if (remover) remover.remove();
            }
        };
        this.observers.push(observer);
        return observer;
    }
    notifyChanged(path:Canonical, metaInfo:ObserverEvent) {
        this.observers.forEach(function (ob) {
            //if (P.isChildOf(path, ob.path)) {
            if (path.startsWith(ob.path)) {
                ob.handler(path, metaInfo);
            }
        });
    }
    getRootFS () {
        return this;
    }
}
