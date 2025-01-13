//define(["FSClass","PathUtil","extend","assert","Util","Content"],
//        function(FS,P,extend,assert,Util,Content) {
import FS, { Dirent } from "./FSClass.js";
import P from "./PathUtil.js";
import Content from "./Content.js";
import {assert} from "chai";
import { Stats, WatchEvent } from "./RootFS.js";
//const isDir = P.isDir.bind(P);
const up = P.up.bind(P);
//const endsWith = P.endsWith.bind(P);
const P_name = P.name.bind(P);
const SEP = P.SEP;
type StatsEx= Stats & {linkPath:string|undefined};
function now() {
    return new Date().getTime();
}
const dummyCTime=new Date();
const dummyCTimeMs=dummyCTime.getTime();
let devCount = 0; // A monotonically increasing count of device ids
let inoCount = 0; // A monotonically increasing count of inodes

function meta2stat(m:MetaInfo, isDir: boolean, sizeF: ()=>number):StatsEx {
    const timeMs=m.lastUpdate;
    const time=new Date(timeMs);
    const dummyATime=new Date();
    const dummyATimeMs=dummyATime.getTime();
    return {
        linkPath: m.link,
        atime: dummyATime,
        atimeMs: dummyATimeMs,
        birthtime: dummyCTime,
        birthtimeMs: dummyCTimeMs,
        ctime: dummyCTime,
        ctimeMs: dummyCTimeMs,
        mtime: time,
        mtimeMs: timeMs,
        get blksize() {
            return sizeF();
        },
        blocks: 1,
        dev: ++devCount,
        ino: ++inoCount,
        gid: 0,
        uid: 0,
        mode: 0o777,
        rdev: 0,
        isBlockDevice: ()=>false,
        isDirectory: ()=>isDir,
        isSymbolicLink: ()=>!!m.link,
        isCharacterDevice: ()=>false,
        isFile:()=>!isDir,
        isFIFO:()=>false,
        isSocket:()=>false,
        nlink: 1,
        get size(){
            return sizeF();
        },
    }
}

export type MetaInfo={
    lastUpdate:number,
    link?: string,
    trashed?: boolean,
};
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
function assertAbsoluteDir(path:string) {
    assertAbsolute(path);
    assert(P.isDir(path), path + " is not directory path");
}
function assertAbsoluteRegular(path:string) {
    assertAbsolute(path);
    assert(!P.isDir(path), path + " is directory path");
}
function fixSep(dinfo:DirInfo, name:string) {
    if (P.isDir(name)) return name;
    if (dinfo[name]) return name;
    const dname=P.directorify(name);
    if(dinfo[dname]) {
        return dname;
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
    static meta2dirent(parentPath:string, fixedName:string, lstat:Stats):Dirent {
        // fixedName: if the name refers to directory, it MUST end with /
        const dir=fixedName.endsWith("/");
        return {
            name: P.truncSEP(fixedName),
            parentPath: P.truncSEP(parentPath),
            isFile: ()=>!dir,
            isDirectory: ()=>dir,
            isBlockDevice: ()=>false,
            isCharacterDevice: ()=>false,
            isSymbolicLink: ()=>lstat.isSymbolicLink(),
            isFIFO: ()=>false,
            isSocket: ()=>false,
            extra: {lstat},
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
    private resolveKey(fixedPath:string):string {
        assertAbsolute(fixedPath);
        if (this.mountPoint) {
            return P.SEP + P.relPath(fixedPath, this.mountPoint);
        } else {
            return fixedPath;
        }
    };
    private size(fixedPath: string){
        return this.getItem(fixedPath).length;
    }
    private getItem(fixedPath:string) {
        assertAbsolute(fixedPath);
        const key = this.resolveKey(fixedPath);
        assert(this.itemExists(fixedPath), `file(item) ${key} is not found.`);
        return this.storage[key];
    }
    private itemExists(fixedPath:string) {
        assertAbsolute(fixedPath);
        const key = this.resolveKey(fixedPath);
        return key in this.storage;
    }

    private setItem(fixedPath:string, value:string) {
        assertAbsolute(fixedPath);
        const key = this.resolveKey(fixedPath);
        assert(key.indexOf("..") < 0);
        assert(P.startsWith(key, P.SEP));
        this.storage[key] = value;
    }
    private removeItem(fixedPath:string) {
        assertAbsolute(fixedPath);
        const key = this.resolveKey(fixedPath);
        assert(key in this.storage, `removeItem: ${key} is not in storage`);
        delete this.storage[key];
    }
    private getDirInfo(dpath:string):DirInfo {
        assertAbsoluteDir(dpath);
        assert(this.inMyFS(dpath));
        if (this.dirCache[dpath]) return this.dirCache[dpath];
        let dinfo: DirInfo;
        const dinfos = this.getItem(dpath);
        try {
            dinfo = JSON.parse(dinfos);
        } catch(e) {
            throw new Error(`Malformed JSON found in ${dpath}`);
        }
        this.dirCache[dpath] = dinfo;
        return dinfo;
    }
    private setItemWithDirCache(dpath:string, dinfo:DirInfo) {
        this.dirCache[dpath] = dinfo;
        this.setItem(dpath, JSON.stringify(dinfo));  
    }
    private putDirInfo(dpath:string, dinfo:DirInfo, removed:boolean) {
        assertAbsoluteDir(dpath);
        assert(this.inMyFS(dpath));
        const ppath = up(dpath);
        if (!ppath || !this.inMyFS(ppath)) {
            this.setItemWithDirCache(dpath, dinfo);
            return; 
        }
        if (!this.itemExists(ppath)) {
            throw new Error(`File(item) ${ppath} not exists.`);
        }
        const pdinfo = this.getDirInfo(ppath);
        this.setItemWithDirCache(dpath, dinfo);
        this._touch(pdinfo, ppath, P_name(dpath), removed);
        if (!removed) assert(this.itemExists(dpath),  `putDirInfo: item ${dpath} not found`);
    }
    private _touch(dinfo:DirInfo, dpath:string, fixedName:string, removed:boolean) {
        assertAbsoluteDir(dpath);
        // removed: this touch is caused by removing the file/dir.
        assert(this.inMyFS(dpath));
        let evt:WatchEvent;
        if (removed) {
            evt={eventType:"delete"};
        } else {
            let eventType:"change"|"create"|"rename"|"delete" = "change";            
            if (!dinfo[fixedName]) {
                dinfo[fixedName] = {lastUpdate: now()};
                eventType="create";
            } else {
                dinfo[fixedName].lastUpdate = now();
            }
            evt={ eventType,  ...meta2stat(dinfo[fixedName], P.isDir(fixedName), ()=>1/*TODO*/)};
        }
        this.getRootFS().notifyChanged(P.rel(dpath, fixedName), evt);
        this.putDirInfo(dpath, dinfo, removed);
    }
    private removeEntry(dinfo:DirInfo, dpath:string, fixedName:string) {
        assertAbsoluteDir(dpath);
        if (dinfo[fixedName]) {
            delete dinfo[fixedName];
            this.getRootFS().notifyChanged(P.rel(dpath, fixedName), { eventType: "delete" });
            this.putDirInfo(dpath, dinfo, true);
        }
    }
    private isRAM() {
        return this.storage !== localStorage;
    }
    private fixPath(path:string, parent:string):[DirInfo, string, string] {
        const name=P_name(path);
        const pinfo=this.getDirInfo(parent);
        const fixedName=fixSep(pinfo, name);
        const fixedPath=P.rel(parent, fixedName);
        return [pinfo, fixedPath, fixedName];
    }
    //-----------------------------------
    public fstype() {
        return (this.isRAM() ? "ramDisk" : "localStorage");
    }
    public isReadOnly() { return this.options.readOnly; }
    public getContent(path:string) {
        assertAbsoluteRegular(path);
        const stat=this.lstat(path);
        if (stat.isDirectory()) throw new Error(`${path} is a directory.`);
        const fixedPath=path;
        let c:Content;
        let cs = this.getItem(fixedPath);
        if (Content.looksLikeDataURL(cs)) {
            c = Content.url(cs);
        } else {
            c = Content.plainText(cs);
        }
        return c;
    }
    public setContent(path:string, content: Content):void {
        assertAbsoluteRegular(path);
        this.assertWriteable(path);
        if (this.exists(path)) {
            const stat=this.lstat(path);
            if (stat.isDirectory()) throw new Error(`${path} is a directory.`);    
        }
        const fixedPath=path;
        let t:null|string = null;
        if (content.hasPlainText()) {
            t = content.toPlainText();
            if (Content.looksLikeDataURL(t)) t = null;
        }
        this.touch(fixedPath);// moved *1 from here since *1 overwrites the item to "" since it is not yet 'exists'
        if (t != null) {
            this.setItem(fixedPath, t);
        } else {
            this.setItem(fixedPath, content.toURL());
        }
        // *1
    }
    public appendContent(path:string, content: Content) {
        let c = "";
        if (this.exists(path)) c = this.getContent(path).toPlainText();
        return this.setContent(path, Content.plainText(c + content.toPlainText()));
    }
    public lstat(path: string): StatsEx {
        this.assertExist(path);
        assertAbsolute(path);
        const parent = P.up(path);
        if (!parent) {
            return meta2stat({lastUpdate: this.baseTimestamp},true, ()=>0);
        }
        if (!this.inMyFS(parent)) {
            return meta2stat({lastUpdate: this.baseTimestamp},true, ()=>0);
        }
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        assert(pinfo[fixedName],`${path} does not exist.`);
        return meta2stat(pinfo[fixedName], P.isDir(fixedName)&&!pinfo[fixedName].link, ()=>this.size(fixedPath) );
    }
    public setMtime(path: string, time: number): void {
        this.assertExist(path);
        return this.setMetaInfo(path,{lastUpdate:time});
    }
    private setMetaInfo(path:string, info:MetaInfo) {
        this.assertWriteable(path);
        const parent = P.up(path);
        if (!parent || !this.inMyFS(parent)) {
            return;
        }
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        pinfo[fixedName] = info;
        this.putDirInfo(parent, pinfo, false);
        // fails on symlink
        // assert(this.itemExists(fixedPath), `setMetaInfo: item ${fixedPath} not found`);
    }
    public mkdir(path:string) {
        assertAbsolute(path);
        const dpath=P.directorify(path);
        this.assertWriteable(dpath);
        this.touch(dpath);
    }
    public opendir(path:string) {
        //succ: iterator<string> // next()
        const dpath=P.directorify(path);
        const inf = this.getDirInfo(dpath);
        const res = [] as string[];
        for (let i in inf) {
            assert(inf[i]);
            if (inf[i].trashed) continue;
            res.push(i);
        }
        return res;
    }
    public opendirent(path:string) {
        //succ: iterator<string> // next()
        const dpath=P.directorify(path);
        const inf = this.getDirInfo(dpath);
        const res = [] as Dirent[];
        for (let fixedName in inf) {
            assert(inf[fixedName]);
            if (inf[fixedName].trashed) continue;
            res.push(LSFS.meta2dirent(dpath, fixedName, meta2stat(inf[fixedName], P.isDir(fixedName), ()=>this.size(P.rel(dpath, fixedName))   )  ));
        }
        return res;
    }
    public rm(path:string) {
        assertAbsolute(path);
        this.assertWriteable(path);
        const parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) {
            throw new Error(path + ": cannot remove. It is root of this FS.");
        }
        this.assertExist(path);
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        const lstat=this.lstat(fixedPath);
        if (lstat.isDirectory() && !lstat.isSymbolicLink()){
            const lis = this.opendir(fixedPath);
            if (lis.length > 0) {
                throw new Error(`${fixedPath}: Directory not empty`);
            }
        }
        if (!lstat.isSymbolicLink()) this.removeItem(fixedPath);
        this.removeEntry(pinfo, parent, fixedName);
    }
    public exists(path: string) {
        assertAbsolute(path);
        const parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) return true;
        if (!this.itemExists(parent)) return false;
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        const res = pinfo[fixedName];
        return (res && !res.trashed);
    }
    public link(path:string, to:string) {
        assertAbsolute(path);
        assertAbsolute(to);
        this.assertWriteable(path);
        if (this.exists(path)) throw new Error(`${path}: file exists`);
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
    public isLink(path:string):string|undefined {
        assertAbsolute(path);
        if (!this.exists(path)) return undefined;
        const m = this.lstat(path);
        return m.linkPath;
    }
    public touch(path:string) {
        assertAbsolute(path);
        this.assertWriteable(path);
        const parent = up(path);
        let _fixedPath;
        if (!this.exists(path)) {
            if (P.isDir(path)) {
                const fixedPath=path;
                _fixedPath=fixedPath;
                this.setItemWithDirCache(fixedPath,{});
            } else {
                const fixedPath=path;
                _fixedPath=fixedPath;
                this.setItem(fixedPath, "");
            }
        }
        if (parent != null) {
            this.assertExist(parent);
            if (this.inMyFS(parent)) {
                const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
                _fixedPath=fixedPath;
                this._touch(pinfo, parent, fixedName, false);
            } else {
                this.getRootFS().resolveFS(parent).touch(parent);
            }
        }
        if (_fixedPath) assert(this.itemExists(_fixedPath), `touch: item ${_fixedPath} (original path=${path}) not found`);
    }
    /*getURL(path:string) {
        return this.getContent(path).toURL();
    }*/
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
    
}
export default LSFS;

