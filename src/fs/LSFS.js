//define(["FSClass","PathUtil","extend","assert","Util","Content"],
//        function(FS,P,extend,assert,Util,Content) {
import FS from "./FSClass.js";
import P from "./PathUtil.js";
import Util from "./Util.js";
import Content from "./Content.js";
import assert from "./assert.js";
const extend = Util.extend;
var LSFS = function (storage, options) {
    assert(storage, " new LSFS fail: no storage");
    this.storage = storage;
    this.options = options || {};
    if (this.options.useDirCache) this.dirCache = {};
};
var isDir = P.isDir.bind(P);
var up = P.up.bind(P);
var endsWith = P.endsWith.bind(P);
//var getName = P.name.bind(P);
//var Path=P.Path;
var Absolute = P.Absolute;
var SEP = P.SEP;
function now() {
    return new Date().getTime();
}
LSFS.ramDisk = function (options) {
    var s = {};
    s[P.SEP] = "{}";
    options = options || {};
    if (!("useDirCache" in options)) options.useDirCache = true;
    return new LSFS(s, options);
};
FS.addFSType("localStorage", function (path, options) {
    return new LSFS(localStorage, options);
});
FS.addFSType("ram", function (path, options) {
    return LSFS.ramDisk(options);
});
LSFS.now = now;
LSFS.prototype = new FS();
//private methods
LSFS.prototype.resolveKey = function (path) {
    assert.is(path, P.Absolute);
    if (this.mountPoint) {
        return P.SEP + P.relPath(path, this.mountPoint);//FromMountPoint(path);
    } else {
        return path;
    }
};
LSFS.prototype.getItem = function (path) {
    assert.is(path, P.Absolute);
    var key = this.resolveKey(path);
    return this.storage[key];
};
LSFS.prototype.setItem = function (path, value) {
    assert.is(path, P.Absolute);
    var key = this.resolveKey(path);
    /*if (key.indexOf("..")>=0) {
        console.log(path,key,value);
    }*/
    assert(key.indexOf("..") < 0);
    assert(P.startsWith(key, P.SEP));
    this.storage[key] = value;
};
LSFS.prototype.removeItem = function (path) {
    assert.is(path, P.Absolute);
    var key = this.resolveKey(path);
    delete this.storage[key];
};
LSFS.prototype.itemExists = function (path) {
    assert.is(path, P.Absolute);
    var key = this.resolveKey(path);
    assert(this.storage, "No storage");
    return key in this.storage;
};
/*LSFS.prototype.inMyFS=function (path){
    return !this.mountPoint || P.startsWith(path, this.mountPoint);
};*/
LSFS.prototype.getDirInfo = function getDirInfo(path) {
    assert.is(arguments, [P.AbsDir]);
    if (path == null) throw new Error("getDir: Null path");
    if (!endsWith(path, SEP)) path += SEP;
    assert(this.inMyFS(path));
    if (this.dirCache && this.dirCache[path]) return this.dirCache[path];
    var dinfo = {}, dinfos;
    try {
        dinfos = this.getItem(path);
        if (dinfos) {
            dinfo = JSON.parse(dinfos);
        }
    } catch (e) {
        console.log("dinfo err : ", path, dinfos);
    }
    if (this.dirCache) this.dirCache[path] = dinfo;
    return dinfo;
};
LSFS.prototype.putDirInfo = function putDirInfo(path, dinfo, trashed) {
    assert.is(arguments, [P.AbsDir, Object]);
    if (!isDir(path)) throw new Error("Not a directory : " + path);
    assert(this.inMyFS(path));
    if (this.dirCache) this.dirCache[path] = dinfo;
    this.setItem(path, JSON.stringify(dinfo));
    var ppath = up(path);
    if (ppath == null) return;
    if (!this.inMyFS(ppath)) {
        //assert(this.getRootFS()!==this);
        //this.getRootFS().resolveFS(ppath).touch(ppath);
        return;
    }
    var pdinfo = this.getDirInfo(ppath);
    this._touch(pdinfo, ppath, P.name(path), trashed);
};
LSFS.prototype._touch = function _touch(dinfo, path, name, trashed) {
    // path:path of dinfo
    // trashed: this touch is caused by trashing the file/dir.
    assert.is(arguments, [Object, String, String]);
    assert(this.inMyFS(path));
    var eventType = "change";
    if (!dinfo[name]) {
        eventType = "create";
        dinfo[name] = {};
        if (trashed) dinfo[name].trashed = true;
    }
    if (!trashed) delete dinfo[name].trashed;
    dinfo[name].lastUpdate = now();
    var meta = extend({ eventType: eventType }, dinfo[name]);
    this.getRootFS().notifyChanged(P.rel(path, name), meta);
    this.putDirInfo(path, dinfo, trashed);
};
LSFS.prototype.removeEntry = function removeEntry(dinfo, path, name) { // path:path of dinfo
    assert.is(arguments, [Object, String, String]);
    if (dinfo[name]) {
        dinfo[name] = {
            lastUpdate: now(),
            trashed: true
        };
        this.getRootFS().notifyChanged(P.rel(path, name), { eventType: "trash" });
        this.putDirInfo(path, dinfo, true);
    }
};
LSFS.prototype.removeEntryWithoutTrash = function (dinfo, path, name) { // path:path of dinfo
    assert.is(arguments, [Object, String, String]);
    if (dinfo[name]) {
        delete dinfo[name];
        this.getRootFS().notifyChanged(P.rel(path, name), { eventType: "delete" });
        this.putDirInfo(path, dinfo, true);
    }
};
LSFS.prototype.isRAM = function () {
    return this.storage !== localStorage;
};
LSFS.prototype.fstype = function () {
    return (this.isRAM() ? "ramDisk" : "localStorage");
};
LSFS.getUsage = function () {
    var using = 0;
    for (var i in localStorage) {
        if (typeof localStorage[i] == "string") {
            using += localStorage[i].length;
        }
    }
    return using;
};
LSFS.getCapacity = function () {
    var seq = 0;
    var str = "a";
    var KEY = "___checkls___";
    var using = 0;
    var lim = Math.pow(2, 25);//32MB?
    try {
        // make 1KB str
        for (let i = 0; i < 10; i++) {
            str += str;
        }
        for (let i in localStorage) {
            if (i.substring(0, KEY.length) == KEY) delete localStorage[i];
            else if (typeof localStorage[i] == "string") {
                using += localStorage[i].length;
            }
        }
        var ru = using;
        while (add()) {
            if (str.length < lim) {
                str += str;
            } else break;
        }
        while (str.length > 1024) {
            str = str.substring(str.length / 2);
            add();
        }
        return { using: ru, max: using };
    } finally {
        for (var i = 0; i < seq; i++) {
            delete localStorage[KEY + i];
        }
    }
    function add() {
        try {
            localStorage[KEY + seq] = str;
            seq++;
            using += str.length;
            //console.log("Added "+str.length, str.length, using);
            return true;
        } catch (e) {
            delete localStorage[KEY + seq];
            //console.log("Add Fail "+str.length);
            return false;
        }
    }
};

// public methods (with resolve fs)
FS.delegateMethods(LSFS.prototype, {
    isReadOnly: function () { return this.options.readOnly; },
    getReturnTypes: function (path, options) {
        assert.is(arguments, [String]);
        return {
            getContent: String, opendir: [String]
        };
    },
    getContent: function (path, options) {
        assert.is(arguments, [Absolute]);
        this.assertExist(path); // Do not use this??( because it does not follow symlinks)
        var c;
        var cs = this.getItem(path);
        if (Content.looksLikeDataURL(cs)) {
            c = Content.url(cs);
        } else {
            c = Content.plainText(cs);
        }
        return c;
    },
    setContent: function (path, content, options) {
        assert.is(arguments, [Absolute, Content]);
        this.assertWriteable(path);
        var t = null;
        if (content.hasPlainText()) {
            t = content.toPlainText();
            if (Content.looksLikeDataURL(t)) t = null;
        }
        if (t != null) {
            this.setItem(path, t);
        } else {
            this.setItem(path, content.toURL());
        }
        this.touch(path);
    },
    appendContent: function (path, content) {
        var c = "";
        if (this.exists(path)) c = this.getContent(path).toPlainText();
        return this.setContent(path, Content.plainText(c + content.toPlainText()));
    },
    getMetaInfo: function (path, options) {
        this.assertExist(path, { includeTrashed: true });
        assert.is(arguments, [Absolute]);
        if (path == P.SEP) {
            return {};
        }
        var parent = assert(P.up(path));
        if (!this.inMyFS(parent)) {
            return {};
        }
        var name = P.name(path);
        assert.is(parent, P.AbsDir);
        var pinfo = this.getDirInfo(parent);
        return assert(pinfo[name]);
    },
    setMetaInfo: function (path, info, options) {
        assert.is(arguments, [String, Object]);
        this.assertWriteable(path);
        var parent = assert(P.up(path));
        if (!this.inMyFS(parent)) {
            return;
        }
        var pinfo = this.getDirInfo(parent);
        var name = P.name(path);
        pinfo[name] = info;
        this.putDirInfo(parent, pinfo, pinfo[name].trashed);
    },
    mkdir: function (path, options) {
        assert.is(arguments, [Absolute]);
        this.assertWriteable(path);
        this.touch(path);
    },
    opendir: function (path, options) {
        assert.is(arguments, [String]);
        //succ: iterator<string> // next()
        // options: {includeTrashed:Boolean}
        options = options || {};
        var inf = this.getDirInfo(path);
        var res = []; //this.dirFromFstab(path);
        for (var i in inf) {
            assert(inf[i]);
            if (!inf[i].trashed || options.includeTrashed) res.push(i);
        }
        return assert.is(res, Array);
    },
    rm: function (path, options) {
        assert.is(arguments, [Absolute]);
        options = options || {};
        this.assertWriteable(path);
        var parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) {
            throw new Error(path + ": cannot remove. It is root of this FS.");
        }
        this.assertExist(path, { includeTrashed: options.noTrash });
        if (P.isDir(path)) {
            var lis = this.opendir(path);
            if (lis.length > 0) {
                this.err(path, "Directory not empty");
            }
            if (options.noTrash) {
                this.removeItem(path);
            }
        } else {
            this.removeItem(path);
        }
        var pinfo = this.getDirInfo(parent);
        if (options.noTrash) {
            this.removeEntryWithoutTrash(pinfo, parent, P.name(path));
        } else {
            this.removeEntry(pinfo, parent, P.name(path));
        }
    },
    exists: function (path, options) {
        assert.is(arguments, [Absolute]);
        options = options || {};
        var name = P.name(path);
        var parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) return true;
        var pinfo = this.getDirInfo(parent);
        var res = pinfo[name];
        if (res && res.trashed && this.itemExists(path)) {
            if (this.isDir(path)) {

            } else {
                //assert.fail("Inconsistent "+path+": trashed, but remains in storage");
            }
        }
        if (!res && this.itemExists(path)) {
            //assert.fail("Inconsistent "+path+": not exists in metadata, but remains in storage");
        }
        if (res && !res.trashed && !res.link && !this.itemExists(path)) {
            //assert.fail("Inconsistent "+path+": exists in metadata, but not in storage");
        }
        if (res && !options.includeTrashed) {
            res = !res.trashed;
        }
        return !!res;
    },
    link: function (path, to, options) {
        assert.is(arguments, [P.Absolute, P.Absolute]);
        this.assertWriteable(path);
        if (this.exists(path)) this.err(path, "file exists");
        if (P.isDir(path) && !P.isDir(to)) {
            this.err(path, " can not link to file " + to);
        }
        if (!P.isDir(path) && P.isDir(to)) {
            this.err(path, " can not link to directory " + to);
        }
        var m = {};//assert(this.getMetaInfo(path));
        m.link = to;
        m.lastUpdate = now();
        this.setMetaInfo(path, m);
        //console.log(this.getMetaInfo(path));
        //console.log(this.storage);
        //console.log(this.getMetaInfo(P.up(path)));
        assert(this.exists(path));
        assert(this.isLink(path));
    },
    isLink: function (path) {
        assert.is(arguments, [P.Absolute]);
        if (!this.exists(path)) return null;
        var m = assert(this.getMetaInfo(path));
        return m.link;
    },
    touch: function (path) {
        assert.is(arguments, [Absolute]);
        this.assertWriteable(path);
        if (!this.itemExists(path)) {
            if (P.isDir(path)) {
                if (this.dirCache) this.dirCache[path] = {};
                this.setItem(path, "{}");
            } else {
                this.setItem(path, "");
            }
        }
        var parent = up(path);
        if (parent != null) {
            if (this.inMyFS(parent)) {
                var pinfo = this.getDirInfo(parent);
                this._touch(pinfo, parent, P.name(path), false);
            } else {
                assert(this.getRootFS() !== this);
                this.getRootFS().resolveFS(parent).touch(parent);
            }
        }
    },
    getURL: function (path) {
        return this.getContent(path).toURL();
    },
    opendirEx: function (path, options) {
        assert.is(path, P.AbsDir);
        options = options || {};
        var res = {};
        var d = this.getDirInfo(path);
        if (options.includeTrashed) {
            //console.log("INCLTR",d);
            return d;
        }
        for (var k in d) {
            if (d[k].trashed) continue;
            res[k] = d[k];
        }
        return res;
    }
});
export default LSFS;

