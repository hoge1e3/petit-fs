import assert from "./assert.js";
import FS from "./FSClass.js";
import P from "./PathUtil.js";
var RootFS = function (/*defaultFS*/) {
    /*assert.is(defaultFS, FS);
    this.mount(null, defaultFS);*/
};
var dst = RootFS.prototype;
var p = {
    err: function (path, mesg) {
        throw new Error(path + ": " + mesg);
    },
    // mounting
    fstab: function () {
        this._fstab = this._fstab || [];//[{fs:this, path:P.SEP}];
        return this._fstab;
    },
    hasUncommited() {
        for (let fs of this.fstab()) {
            if (fs.hasUncommited()) return true;
        }
        return false;
    },
    unmount: function (path, options) {
        assert.is(arguments, [P.AbsDir]);
        var t = this.fstab();
        console.log(t);
        for (var i = 0; i < t.length; i++) {
            if (t[i].mountPoint == path) {
                t.splice(i, 1);
                return true;
            }
        }
        return false;
    },
    availFSTypes: function () {
        return FS.availFSTypes();
    },
    mount: function (mountPoint, fs, options) {
        assert.is(mountPoint, String);
        if (typeof fs == "string") {
            var fact = assert(FS.availFSTypes()[fs], "fstype " + fs + " is undefined.");
            fs = fact(this, mountPoint, options || {});
        }
        assert.is(fs, FS);
        //fs.mounted(this, path);
        this.fstab().unshift(fs);
    },
    resolveFS: function (path, options) {
        assert.is(path, P.Absolute);
        var res;
        this.fstab().forEach(function (fs) {
            if (res) return;
            if (fs.inMyFS(path)) {
                res = fs;
            }
        });
        if (!res) this.err(path, "Cannot resolve");
        return assert.is(res, FS);
    },
    addObserver: function (_1, _2, _3) {
        this.observers = this.observers || [];
        var options = {}, path, f;
        if (typeof _1 === "string") path = _1;
        if (typeof _2 === "string") path = _2;
        if (typeof _3 === "string") path = _3;
        if (typeof _1 === "object") options = _1;
        if (typeof _2 === "object") options = _2;
        if (typeof _3 === "object") options = _3;
        if (typeof _1 === "function") f = _1;
        if (typeof _2 === "function") f = _2;
        if (typeof _3 === "function") f = _3;
        assert.is(path, String);
        assert.is(f, Function);
        var fs = this.resolveFS(path);
        var remover = fs.onAddObserver(path, options);
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
    },
    notifyChanged: function (path, metaInfo) {
        if (!this.observers) return;
        this.observers.forEach(function (ob) {
            if (P.isChildOf(path, ob.path)) {
                ob.handler(path, metaInfo);
            }
        });
    },
    getRootFS: function () {
        return this;
    }
};
for (var i in p) {
    dst[i] = p[i];
}
export default RootFS;
