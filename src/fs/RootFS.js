//@ts-check
//import P from "./PathUtil.js";
/**
 * @typedef FileSystem {import("./FSClass").FileSystem}
 */
import { toCanonicalPath, up } from "../pathUtil2.js";
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
function isAsyncFSType(s) {
    return s.asyncOptions.asyncOnMount;
}
class RootFS {
    constructor() {
        this.fstabMap = new WeakMap();
        this._fstab = [];
        this.observers = [];
    }
    static addFSType(name, factory, asyncOptions = {}) {
        RootFS.fstypes[name] = { factory, asyncOptions };
    }
    static availFSTypes() {
        return RootFS.fstypes;
    }
    /*err(path:string, mesg:string) {
        throw new Error(path + ": " + mesg);
    },*/
    // mounting
    /**
     @deprecated use df() instead
    */
    fstab() {
        this._fstab = this._fstab || []; //[{fs:this, path:P.SEP}];
        return this._fstab;
    }
    df() {
        this._fstab = this._fstab || []; //[{fs:this, path:P.SEP}];
        return this._fstab;
    }
    currentFstab() {
        const res = [];
        for (let d of this.df()) {
            const t = this.fstabMap.get(d);
            if (t)
                res.push(t);
        }
        return res;
    }
    hasUncommited() {
        for (let fs of this.df()) {
            if (fs.hasUncommited())
                return true;
        }
        return false;
    }
    commitPromise() {
        return Promise.all(this.df().map(fs => fs.commitPromise()));
    }
    unmount(_path) {
        const path = toCanonicalPath(_path);
        var t = this.df();
        console.log(t);
        for (var i = 0; i < t.length; i++) {
            if (t[i].mountPoint == path) {
                t.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    mount(mountPoint, _fs, options) {
        const fst = RootFS.availFSTypes()[_fs];
        if (!fst)
            throw new Error(`FS type ${_fs} not found`);
        if (isAsyncFSType(fst)) {
            throw new Error(`The FS type '${_fs}' requires async mount. Use mountAsync instead.`);
        }
        const fs = fst.factory(this, toCanonicalPath(mountPoint), options || {});
        const fstab = { mountPoint, fsType: _fs, options };
        this.bindFstab(fs, fstab);
        this.df().unshift(fs);
        return fs;
    }
    async mountAsync(mountPoint, _fs, options) {
        const fst = RootFS.availFSTypes()[_fs];
        if (!fst)
            throw new Error(`FS type ${_fs} not found`);
        const fs = await fst.factory(this, toCanonicalPath(mountPoint), options || {});
        const fstab = { mountPoint, fsType: _fs, options };
        this.bindFstab(fs, fstab);
        this.df().unshift(fs);
        return fs;
    }
    bindFstab(fs, arg) {
        this.fstabMap.set(fs, arg);
    }
    resolveFS(path) {
        const f = this.df();
        for (let p = toCanonicalPath(path); p; p = up(p)) {
            const found = f.find(e => e.mountPoint === p);
            if (found)
                return found;
        }
        throw new Error("Cannot resolve " + path);
    }
    addObserver(path, f) {
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
                if (remover)
                    remover.remove();
            }
        };
        this.observers.push(observer);
        return observer;
    }
    notifyChanged(path, metaInfo) {
        this.observers.forEach(function (ob) {
            //if (P.isChildOf(path, ob.path)) {
            if (path.startsWith(ob.path)) {
                ob.handler(path, metaInfo);
            }
        });
    }
    getRootFS() {
        return this;
    }
}
RootFS.fstypes = {};
export default RootFS;
//# sourceMappingURL=RootFS.js.map