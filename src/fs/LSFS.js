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
    /*if (this.options.useDirCache) */this.dirCache = {};
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
LSFS.meta2dirent=function (parentPath/*:string*/, name/*:string*/, m/*:MetaInfo*/)/*:Dirent*/ {
    const dir=name.endsWith("/");
    return {
        name: P.truncSEP(name),
        parentPath: P.truncSEP(parentPath),
        isFile: ()=>!dir,
        isDirectory: ()=>dir,
        isBlockDevice: ()=>false,
        isCharacterDevice: ()=>false,
        isSymbolicLink: ()=>!!m.link,
        isFIFO: ()=>false,
        isSocket: ()=>false,
        extra: {...m, isDirPath:dir},
    };
};
LSFS.ramDisk = function (options) {
    var s = {};
    s[P.SEP] = "{}";
    options = options || {};
    /*if (!("useDirCache" in options))*/ options.useDirCache = true;
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
    assert.is(arguments, [P.Absolute]);
    path=P.directorify(path);
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
LSFS.prototype.putDirInfo = function putDirInfo(path, dinfo, removed) {
    assert.is(arguments, [P.Absolute, Object]);
    path=P.directorify(path);
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
    this._touch(pdinfo, ppath, P.name(path), removed);
};
LSFS.prototype._touch = function _touch(dinfo, path, name, removed) {
    // path:path of dinfo
    // removed: this touch is caused by removing the file/dir.
    assert.is(arguments, [Object, String, String]);
    assert(this.inMyFS(path));
    var eventType = "change";
    if (!removed && !dinfo[name]) {
        eventType = "create";
        dinfo[name] = {};
    }
    if (dinfo[name]) dinfo[name].lastUpdate = now();
    var meta = extend({ eventType: eventType }, dinfo[name]);
    this.getRootFS().notifyChanged(P.rel(path, name), meta);
    this.putDirInfo(path, dinfo, removed);
};
/*
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
};*/
function fixSep(dinfo, name) {
    if(!dinfo[name] && !P.isDir(name)) {
        name=P.directorify(name);
    }
    return name;
}
LSFS.prototype.removeEntry/*WithoutTrash*/ = function (dinfo, path, name) { // path:path of dinfo
    assert.is(arguments, [Object, String, String]);
    name=fixSep(dinfo, name);
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
    getReturnTypes: function (path) {
        assert.is(arguments, [String]);
        return {
            getContent: String, opendir: [String]
        };
    },
    getContent: function (path) {
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
    setContent: function (path, content) {
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
    getMetaInfo: function (path) {
        this.assertExist(path);
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
        name=fixSep(pinfo, name);
        return assert(pinfo[name],`${path} does not exist.`);
    },
    setMetaInfo: function (path, info) {
        assert.is(arguments, [String, Object]);
        this.assertWriteable(path);
        var parent = assert(P.up(path));
        if (!this.inMyFS(parent)) {
            return;
        }
        var pinfo = this.getDirInfo(parent);
        var name = P.name(path);
        if (!P.isDir(path) && !pinfo[name] && pinfo[name+"/"]) {
            name=name+"/";
        }
        pinfo[name] = info;
        this.putDirInfo(parent, pinfo);
    },
    mkdir: function (path) {
        assert.is(arguments, [Absolute]);
        this.assertWriteable(path);
        this.touch(path);
    },
    opendir: function (path) {
        assert.is(arguments, [String]);
        //succ: iterator<string> // next()
        var inf = this.getDirInfo(path);
        var res = []; //this.dirFromFstab(path);
        for (var i in inf) {
            assert(inf[i]);
            if (inf[i].trashed) continue;
            res.push(i);
        }
        return assert.is(res, Array);
    },
    opendirent(path) {
        assert.is(arguments, [String]);
        //succ: iterator<string> // next()
        const inf = this.getDirInfo(path);
        const res = []; 
        for (let i in inf) {
            assert(inf[i]);
            if (inf[i].trashed) continue;
            res.push(LSFS.meta2dirent(path, i, inf[i]));
        }
        return assert.is(res, Array);
    },
    rm: function (path) {
        assert.is(arguments, [Absolute]);
        this.assertWriteable(path);
        var parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) {
            throw new Error(path + ": cannot remove. It is root of this FS.");
        }
        this.assertExist(path);
        if (P.isDir(path)) {
            var lis = this.opendir(path);
            if (lis.length > 0) {
                this.err(path, "Directory not empty");
            }
            this.removeItem(path);
        } else {
            this.removeItem(path);
        }
        var pinfo = this.getDirInfo(parent);
        this.removeEntry(pinfo, parent, P.name(path));
    },
    exists: function (path) {
        assert.is(arguments, [Absolute]);
        var name = P.name(path);
        var parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) return true;
        var pinfo = this.getDirInfo(parent);
        let res = pinfo[name];
        if (res && !res.trashed) return true;
        if (P.isDir(path)) return false;
        res=pinfo[name+"/"];
        if (res && !res.trashed) return true;
        return false;
    },
    isDir(path){
        assert.is(arguments, [Absolute]);
        if(P.isDir(path))return true;
        var name = P.name(path);
        var parent = P.up(path);
        if (parent == null) return true;
        var pinfo = this.getDirInfo(parent);
        var res = pinfo[name];
        if (res) return false;
        return !!pinfo[name+"/"];
    },    
    link: function (path, to) {
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
    opendirEx: function (path) {
        assert.is(path, P.AbsDir);
        var res = {};
        var d = this.getDirInfo(path);
        for (var k in d) {
            res[k] = d[k];
        }
        return res;
    }
});
export default LSFS;

