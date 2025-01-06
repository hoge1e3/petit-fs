//define(["FSClass","PathUtil","extend","assert","Util","Content"],
//        function(FS,P,extend,assert,Util,Content) {
import FS, { Dirent, MetaInfo } from "./FSClass.js";
import P from "./PathUtil.js";
import Content from "./Content.js";
import {assert} from "chai";
const isDir = P.isDir.bind(P);
const up = P.up.bind(P);
const endsWith = P.endsWith.bind(P);
const SEP = P.SEP;
function now() {
    return new Date().getTime();
}
export type DirInfo={[key:string]:MetaInfo};
FS.addFSType("localStorage", function (path, options:any) {
    return new LSFS(localStorage, options);
});
FS.addFSType("ram", function (path, options:any) {
    return LSFS.ramDisk(options);
});
function assertAbsolute(path:string) {
    assert(P.isAbsolutePath(path), path + " is not absolute path");
}
;
function assertAbsoluteDir(path:string) {
    assertAbsolute(path);
    assert(P.isDir(path), path + " is not directory path");
}
function fixSep(dinfo:DirInfo, name:string) {
    if(!dinfo[name] && !P.isDir(name)) {
        name=P.directorify(name);
    }
    return name;
}
export type Storage = {[key:string]:string};
export class LSFS extends FS {
    dirCache:{[key:string]:DirInfo}={};
    baseTimestamp=now();
    constructor(public storage:Storage, public options:{readOnly:boolean}={readOnly:false}) {
        assert(storage, " new LSFS fail: no storage");
        super()
    }
    static meta2dirent(parentPath:string, name:string, m:MetaInfo):Dirent {
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
    }
    static ramDisk(options={readOnly:false}) {
        const s:Storage = {};
        s[P.SEP] = "{}";
        options = options || {};
        return new LSFS(s, options);
    }
    static now = now;
    //private methods
    private resolveKey(path:string):string {
        assertAbsolute(path);
        if (this.mountPoint) {
            return P.SEP + P.relPath(path, this.mountPoint);//FromMountPoint(path);
        } else {
            return path;
        }
    };
    getItem(path:string) {
        assertAbsolute(path);
        const key = this.resolveKey(path);
        return this.storage[key];
    }
    setItem(path:string, value:string) {
        assertAbsolute(path);
        const key = this.resolveKey(path);
        assert(key.indexOf("..") < 0);
        assert(P.startsWith(key, P.SEP));
        this.storage[key] = value;
    }
    removeItem(path:string) {
        assertAbsolute(path);
        const key = this.resolveKey(path);
        delete this.storage[key];
    }
    itemExists(path:string) {
        assertAbsolute(path);
        const key = this.resolveKey(path);
        return key in this.storage;
    }
    getDirInfo(path:string):DirInfo {
        assertAbsolute(path);
        path=P.directorify(path);
        if (path == null) throw new Error("getDir: Null path");
        if (!endsWith(path, SEP)) path += SEP;
        assert(this.inMyFS(path));
        if (this.dirCache && this.dirCache[path]) return this.dirCache[path];
        let dinfo = {} as DirInfo, dinfos;
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
    }
    putDirInfo(path:string, dinfo:DirInfo, removed:boolean) {
        assertAbsolute(path);
        path=P.directorify(path);
        if (!isDir(path)) throw new Error("Not a directory : " + path);
        assert(this.inMyFS(path));
        if (this.dirCache) this.dirCache[path] = dinfo;
        this.setItem(path, JSON.stringify(dinfo));
        const ppath = up(path);
        if (ppath == null) return;
        if (!this.inMyFS(ppath)) {
            return;
        }
        const pdinfo = this.getDirInfo(ppath);
        this._touch(pdinfo, ppath, P.name(path), removed);
    }
    private _touch(dinfo:DirInfo, path:string, name:string, removed:boolean) {
        // path:path of dinfo
        // removed: this touch is caused by removing the file/dir.
        assert(this.inMyFS(path));
        let eventType:"change"|"create"|"rename"|"remove" = "change";
        if (!removed && !dinfo[name]) {
            eventType = "create";
            dinfo[name] = {lastUpdate: now()};
        } else if (dinfo[name]) dinfo[name].lastUpdate = now();
        const evt = { eventType, ...(dinfo[name]||{})};
        this.getRootFS().notifyChanged(P.rel(path, name), evt);
        this.putDirInfo(path, dinfo, removed);
    }
    removeEntry(dinfo:DirInfo, path:string, name:string) { // path:path of dinfo
        name=fixSep(dinfo, name);
        if (dinfo[name]) {
            delete dinfo[name];
            this.getRootFS().notifyChanged(P.rel(path, name), { eventType: "delete" });
            this.putDirInfo(path, dinfo, true);
        }
    }
    isRAM() {
        return this.storage !== localStorage;
    }
    fstype() {
        return (this.isRAM() ? "ramDisk" : "localStorage");
    }
    static getUsage() {
        let using = 0;
        for (let i in localStorage) {
            if (typeof localStorage[i] == "string") {
                using += localStorage[i].length;
            }
        }
        return using;
    }
    static getCapacity () {
        let seq = 0;
        let str = "a";
        const KEY = "___checkls___";
        let using = 0;
        const lim = Math.pow(2, 25);//32MB?
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
            let ru = using;
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
            for (let i = 0; i < seq; i++) {
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
    }
    isReadOnly() { return this.options.readOnly; }
    getContent(path:string) {
        assertAbsolute(path);
        this.assertExist(path); // Do not use this??( because it does not follow symlinks)
        let c:Content;
        let cs = this.getItem(path);
        if (Content.looksLikeDataURL(cs)) {
            c = Content.url(cs);
        } else {
            c = Content.plainText(cs);
        }
        return c;
    }
    setContent(path:string, content: Content):void {
        assertAbsolute(path);
        this.assertWriteable(path);
        let t:null|string = null;
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
    }
    appendContent(path:string, content: Content) {
        let c = "";
        if (this.exists(path)) c = this.getContent(path).toPlainText();
        return this.setContent(path, Content.plainText(c + content.toPlainText()));
    }
    getMetaInfo(path:string):MetaInfo {
        this.assertExist(path);
        assertAbsolute(path);
        const parent = P.up(path);
        if (!parent) {
            return {lastUpdate: this.baseTimestamp};
        }
        if (!this.inMyFS(parent)) {
            return {lastUpdate: this.baseTimestamp};
        }
        let name = P.name(path);
        const pinfo = this.getDirInfo(parent);
        name=fixSep(pinfo, name);
        assert(pinfo[name],`${path} does not exist.`);
        return pinfo[name];
    }
    setMetaInfo(path:string, info:MetaInfo) {
        this.assertWriteable(path);
        const parent = P.up(path);
        if (!parent || !this.inMyFS(parent)) {
            return;
        }
        const pinfo = this.getDirInfo(parent);
        let name = P.name(path);
        if (!P.isDir(path) && !pinfo[name] && pinfo[name+"/"]) {
            name=name+"/";
        }
        pinfo[name] = info;
        this.putDirInfo(parent, pinfo, false);
    }
    mkdir(path:string) {
        assertAbsoluteDir(path);
        this.assertWriteable(path);
        this.touch(path);
    }
    opendir(path:string) {
        //succ: iterator<string> // next()
        const inf = this.getDirInfo(path);
        const res = [] as string[]; //this.dirFromFstab(path);
        for (let i in inf) {
            assert(inf[i]);
            if (inf[i].trashed) continue;
            res.push(i);
        }
        return res;
    }
    opendirent(path:string) {
        //succ: iterator<string> // next()
        const inf = this.getDirInfo(path);
        const res = [] as Dirent[];
        for (let i in inf) {
            assert(inf[i]);
            if (inf[i].trashed) continue;
            res.push(LSFS.meta2dirent(path, i, inf[i]));
        }
        return res;
    }
    rm(path:string) {
        assertAbsolute(path);
        this.assertWriteable(path);
        const parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) {
            throw new Error(path + ": cannot remove. It is root of this FS.");
        }
        this.assertExist(path);
        if (P.isDir(path)) {
            const lis = this.opendir(path);
            if (lis.length > 0) {
                throw new Error(`${path}: Directory not empty`);
            }
            this.removeItem(path);
        } else {
            this.removeItem(path);
        }
        const pinfo = this.getDirInfo(parent);
        this.removeEntry(pinfo, parent, P.name(path));
    }
    exists(path: string) {
        assertAbsolute(path);
        let name = P.name(path);
        const parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) return true;
        const pinfo = this.getDirInfo(parent);
        name=fixSep(pinfo, name);
        const res = pinfo[name];
        return (res && !res.trashed);
    }
    isDir(path:string){
        assertAbsolute(path);
        if(P.isDir(path))return true;
        let name = P.name(path);
        const parent = P.up(path);
        if (parent == null) return true;
        const pinfo = this.getDirInfo(parent);
        const res = pinfo[name];
        if (res) return false;
        return !!pinfo[name+"/"];
    }
    link(path:string, to:string) {
        assertAbsolute(path);
        assertAbsolute(to);
        this.assertWriteable(path);
        if (this.exists(path)) throw new Error(`${path} file exists`);
        if (P.isDir(path) && !P.isDir(to)) {
            throw new Error(`${path} can not link to file ${to}`);
        }
        if (!P.isDir(path) && P.isDir(to)) {
            throw new Error(`${path} can not link to directory ${to}`);
        }
        const m = {
            link: to,
            lastUpdate: now()
        };
        this.setMetaInfo(path, m);
        //console.log(this.getMetaInfo(path));
        //console.log(this.storage);
        //console.log(this.getMetaInfo(P.up(path)));
        assert(this.exists(path));
        assert(this.isLink(path));
    }
    isLink(path:string):string|undefined {
        assertAbsolute(path);
        if (!this.exists(path)) return undefined;
        const m = this.getMetaInfo(path);
        return m.link;
    }
    touch(path:string) {
        assertAbsolute(path);
        this.assertWriteable(path);
        if (!this.itemExists(path)) {
            if (P.isDir(path)) {
                if (this.dirCache) this.dirCache[path] = {};
                this.setItem(path, "{}");
            } else {
                this.setItem(path, "");
            }
        }
        const parent = up(path);
        if (parent != null) {
            if (this.inMyFS(parent)) {
                var pinfo = this.getDirInfo(parent);
                this._touch(pinfo, parent, P.name(path), false);
            } else {
                this.getRootFS().resolveFS(parent).touch(parent);
            }
        }
    }
    getURL(path:string) {
        return this.getContent(path).toURL();
    }
}
export default LSFS;

