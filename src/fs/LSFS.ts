//define(["FSClass","PathUtil","extend","assert","Util","Content"],
//        function(FS,P,extend,assert,Util,Content) {
import FS, { Dirent } from "./FSClass.js";
import P from "./PathUtil.js";
import Content from "./Content.js";
import {assert} from "chai";
import RootFS, { Stats, WatchEvent } from "./RootFS.js";
import { dir } from "console";
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
export type LSFSOptions={readOnly?:boolean};
//export type LSFSConstructorOptions={mountPoint?: string}&LSFSOptions;
export type DirInfo={[key:string]:MetaInfo};
FS.addFSType("localStorage", function (rootFS:RootFS, mountPoint:string, options:LSFSOptions) {
    return new LSFS(rootFS, mountPoint, localStorage, options);
});
FS.addFSType("ram", function (rootFS:RootFS, mountPoint:string, options:LSFSOptions) {
    return LSFS.ramDisk(rootFS, mountPoint, options);
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

interface CacheableStorage {
    getContentItem(regPath:string):Content;
    hasContentItem(regPath:string):boolean;
    setContentItem(regPath:string, c:Content):void;
    removeContentItem(regPath:string):void;

    getDirInfoItem(dirPath:string):DirInfo;
    hasDirInfoItem(dirPath:string):boolean;
    setDirInfoItem(dirPath:string, d:DirInfo):void;
    removeDirInfoItem(dirPath:string):void;


}
class NoCacheStorage implements CacheableStorage {
    constructor(public storage:Storage, public mountPoint:string){}
    /*private resolveKey(fixedPath:string):string {
        assertAbsolute(fixedPath);
        if (this.mountPoint) {
            return P.SEP + P.relPath(fixedPath, this.mountPoint);
        } else {
            return fixedPath;
        }
    };*/
    private getItem(fixedPath:string) {
        assertAbsolute(fixedPath);
        const key = fixedPath;// this.resolveKey(fixedPath);
        assert(this.itemExists(fixedPath), `file(item) ${key} is not found.`);
        return this.storage[key];
    }
    private itemExists(fixedPath:string) {
        assertAbsolute(fixedPath);
        const key = fixedPath;// this.resolveKey(fixedPath);
        return key in this.storage;
    }
    private setItem(fixedPath:string, value:string) {
        assertAbsolute(fixedPath);
        const key = fixedPath;// this.resolveKey(fixedPath);
        assert(key.indexOf("..") < 0);
        assert(P.startsWith(key, P.SEP));
        this.storage[key] = value;
    }
    private removeItem(fixedPath:string) {
        assertAbsolute(fixedPath);
        const key = fixedPath;// this.resolveKey(fixedPath);
        // Cannot assure this when write->remove very quickly(=before commit).
        //assert(key in this.storage, `removeItem: ${key} is not in storage`);
        delete this.storage[key];
    }
    getContentItem(regPath: string): Content {
        assertAbsoluteRegular(regPath);
        const cs = this.getItem(regPath);
        if (Content.looksLikeDataURL(cs)) {
            return Content.url(cs);
        } else {
            return Content.plainText(cs);
        }
    }
    hasContentItem(regPath: string): boolean {
        assertAbsoluteRegular(regPath);
        return this.itemExists(regPath);
    }
    setContentItem(regPath: string, content: Content): void {
        assertAbsoluteRegular(regPath);
        let t:null|string = null;
        if (content.hasPlainText()) {
            t = content.toPlainText();
            if (Content.looksLikeDataURL(t)) t = null;
        }
        if (t != null) {
            this.setItem(regPath, t);
        } else {
            this.setItem(regPath, content.toURL());
        }
    }
    removeContentItem(regPath: string): void {
        assertAbsoluteRegular(regPath);
        this.removeItem(regPath);
    }

    getDirInfoItem(dpath: string): DirInfo {
        assertAbsoluteDir(dpath);
        const dinfos = this.getItem(dpath);
        try {
            return JSON.parse(dinfos);
        } catch(e) {
            throw new Error(`Malformed JSON found in ${dpath}`);
        }
    }
    hasDirInfoItem(dpath: string): boolean {
        assertAbsoluteDir(dpath);
        return this.itemExists(dpath);
    }
    setDirInfoItem(dpath: string, d: DirInfo): void {
        assertAbsoluteDir(dpath);
        this.setItem(dpath, JSON.stringify(d));
    }
    removeDirInfoItem(dpath: string): void {
        assertAbsoluteDir(dpath);
        return this.removeItem(dpath);
    }
}
type CacheStatus<T>={value:T}|"deleted";
class CachedStorage implements CacheableStorage {
    raw: NoCacheStorage;
    dirInfoCache=new Map<string, CacheStatus<DirInfo>>();
    contentCache=new Map<string, CacheStatus<Content>>();
    htimer:any=undefined;
    hasUncommited() {
        return this.htimer!==undefined;
    }
    private wakeTimer() {
        if (this.htimer!==undefined)return;
        this.htimer=setTimeout(()=>this.commit(), 1000);
    }
    private commit() {
        for (let cp of this.reservedContents) {
            const c=this.contentCache.get(cp);
            assert(c!==undefined,`commit content: ${cp} not exists`); 
            if (c==="deleted") this.raw.removeContentItem(cp);
            else this.raw.setContentItem(cp, c.value);
        }
        for (let dp of this.reservedDirInfos) {
            const d=this.dirInfoCache.get(dp);
            assert(d!==undefined,`commit dirinfo: ${dp} not exists`); 
            if (d==="deleted") this.raw.removeDirInfoItem(dp);
            else this.raw.setDirInfoItem(dp, d.value);
        }
        this.htimer=undefined;
    }
    reservedDirInfos=new Set<string>();
    reservedContents=new Set<string>();
    constructor(public storage:Storage, public mountPoint:string){
        this.raw=new NoCacheStorage(storage, mountPoint);
    }
    getContentItem(regPath: string): Content {
        assertAbsoluteRegular(regPath);
        const c=this.contentCache.get(regPath);
        assert(c!=="deleted",`getContentItem: ${regPath} is deleted.`); 
        if (c) return c.value;
        const rawc=this.raw.getContentItem(regPath);
        this.contentCache.set(regPath, {value:rawc});
        return rawc;
    }
    hasContentItem(regPath: string): boolean {
        assertAbsoluteRegular(regPath);
        const c=this.contentCache.get(regPath);
        if (c==="deleted") return false;
        if (c) return true;
        return this.raw.hasContentItem(regPath);
    }
    setContentItem(regPath: string, c: Content): void {
        assertAbsoluteRegular(regPath);
        assert(!this.hasDirInfoItem(P.directorify(regPath)), `${regPath} exists as a directroy.`);
        this.contentCache.set(regPath, {value:c});
        this.reservedContents.add(regPath);
        this.wakeTimer();
    }
    removeContentItem(regPath: string): void {
        assertAbsoluteRegular(regPath);
        assert(this.hasContentItem(regPath), `Cannot remove: ${regPath} does not exist.`);
        
        this.contentCache.set(regPath,"deleted");
        this.reservedContents.add(regPath);
        this.wakeTimer();
    }

    getDirInfoItem(dpath: string): DirInfo {
        assertAbsoluteDir(dpath);
        const d=this.dirInfoCache.get(dpath);
        assert(d!=="deleted",`getContentItem: ${dpath} is deleted.`); 
        if (d) return d.value;
        const rawd=this.raw.getDirInfoItem(dpath);
        this.dirInfoCache.set(dpath,{value: rawd});
        return rawd;
    }
    hasDirInfoItem(dpath: string): boolean {
        assertAbsoluteDir(dpath);
        const d=this.dirInfoCache.get(dpath);
        if (d==="deleted") return false;
        if (d) return true;
        return this.raw.hasDirInfoItem(dpath);
    }
    setDirInfoItem(dpath: string, d: DirInfo): void {
        assertAbsoluteDir(dpath);
        const tsep=P.truncSEP(dpath);// Check for For '/'
        assert(tsep==="" || !this.hasContentItem(tsep), `${P.truncSEP(dpath)} exists as a regular file.`);
        this.dirInfoCache.set(dpath,{value:d});
        this.reservedDirInfos.add(dpath);
        this.wakeTimer();
    }
    removeDirInfoItem(dpath: string): void {
        assertAbsoluteDir(dpath);
        assert(this.hasDirInfoItem(dpath), `Cannot remove: ${dpath} does not exist.`);

        this.dirInfoCache.set(dpath,"deleted");
        this.reservedDirInfos.add(dpath);
        this.wakeTimer();
    }    
}
export class LSFS extends FS {
    //dirCache:{[key:string]:DirInfo}={};
    baseTimestamp=now();
    cachedStorage: CachedStorage;
    readOnly: boolean;
    hasUncommited() {
        return this.cachedStorage.hasUncommited();
    }
    constructor(rootFS:RootFS, mountPoint: string, public storage:Storage, {readOnly}:LSFSOptions={}) {
        assert(storage, " new LSFS fail: no storage");
        super(rootFS, mountPoint);
        this.readOnly=!!readOnly;
        this.cachedStorage=new CachedStorage(storage, mountPoint);
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
    static ramDisk(rootFS:RootFS, mountPoint:string, options:LSFSOptions={readOnly:false}) {
        const s:Storage = {};
        s[mountPoint] = "{}";
        options = options || {};
        return new LSFS(rootFS, mountPoint, s , options);
    }
    static now = now;
    //private methods
    /*private resolveKey(fixedPath:string):string {
        assertAbsolute(fixedPath);
        if (this.mountPoint) {
            return P.SEP + P.relPath(fixedPath, this.mountPoint);
        } else {
            return fixedPath;
        }
    };*/
    private size(fixedPath: string):number {
        return this.cachedStorage.getContentItem(fixedPath).roughSize();
    }
    /*private getItem(fixedPath:string) {
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
    private itemOrDirCacheExists(dpath:string) {
        return this.dirCache[dpath] || this.itemExists(dpath);
    }
    private setItem(fixedPath:string, value:string) {
        assertAbsolute(fixedPath);
        const key = this.resolveKey(fixedPath);
        assert(key.indexOf("..") < 0);
        assert(P.startsWith(key, P.SEP));
        this.storage[key] = value;
    }
    private removeItem(fixedPath:string, nocheck=false) {
        assertAbsolute(fixedPath);
        const key = this.resolveKey(fixedPath);
        assert(nocheck || (key in this.storage), `removeItem: ${key} is not in storage`);
        delete this.storage[key];
    }
    private removeItemAndCache(fixedPath:string) {
        assertAbsolute(fixedPath);
        if (this.dirCache[fixedPath]) {
            delete this.dirCache[fixedPath];
            // item creation may delayed, nocheck
            return this.removeItem(fixedPath, true);
        }
        return this.removeItem(fixedPath);
    }*/
    private getDirInfo(dpath:string):DirInfo {
        assertAbsoluteDir(dpath);
        assert(this.inMyFS(dpath));
        return this.cachedStorage.getDirInfoItem(dpath);
        /*if (this.dirCache[dpath]) return this.dirCache[dpath];
        let dinfo: DirInfo;
        const dinfos = this.getItem(dpath);
        try {
            dinfo = JSON.parse(dinfos);
        } catch(e) {
            throw new Error(`Malformed JSON found in ${dpath}`);
        }
        this.dirCache[dpath] = dinfo;
        return dinfo;*/
    }
    /*private setItemWithDirCache(dpath:string, dinfo:DirInfo) {
        this.dirCache[dpath] = dinfo;
        this.setMetaTimer.add(dpath);
        //this.setItem(dpath, JSON.stringify(dinfo));  
    }*/
    private putDirInfo(dpath:string, dinfo:DirInfo, removed:boolean) {
        assertAbsoluteDir(dpath);
        assert(this.inMyFS(dpath));
        const ppath = up(dpath);
        if (!ppath || !this.inMyFS(ppath)) {
            this.cachedStorage.setDirInfoItem(dpath, dinfo);
            return; 
        }
        if (!this.cachedStorage.hasDirInfoItem(ppath)) {
            throw new Error(`File(item) ${ppath} not exists.`);
        }
        const pdinfo = this.cachedStorage.getDirInfoItem(ppath);
        this.cachedStorage.setDirInfoItem(dpath, dinfo);
        this._touch(pdinfo, ppath, P_name(dpath), removed);
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
                delete dinfo[fixedName].trashed;
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
    public isReadOnly() { return this.readOnly; }
    public getContent(path:string) {
        assertAbsoluteRegular(path);
        const stat=this.lstat(path);
        if (stat.isDirectory()) throw new Error(`${path} is a directory.`);
        const regPath=path;
        return this.cachedStorage.getContentItem(regPath);
        /*if (Content.looksLikeDataURL(cs)) {
            c = Content.url(cs);
        } else {
            c = Content.plainText(cs);
        }
        return c;*/
    }
    public setContent(path:string, content: Content):void {
        assertAbsoluteRegular(path);
        this.assertWriteable(path);
        if (this.exists(path)) {
            const stat=this.lstat(path);
            if (stat.isDirectory()) throw new Error(`${path} is a directory.`); 
            if (stat.isSymbolicLink()) throw new Error(`${path}: Cannot write content to symlink itself.`);   
        }
        const regPath=path;
        /*let t:null|string = null;
        if (content.hasPlainText()) {
            t = content.toPlainText();
            if (Content.looksLikeDataURL(t)) t = null;
        }*/
        this.touch(regPath);// moved *1 from here since *1 overwrites the item to "" since it is not yet 'exists'
        this.cachedStorage.setContentItem(regPath, content);
        /*if (t != null) {
            this.setItem(fixedPath, t);
        } else {
            this.setItem(fixedPath, content.toURL());
        }*/
        // *1
    }
    public appendContent(path:string, content: Content) {
        let c = "";
        if (this.exists(path)) c = this.getContent(path).toPlainText();
        return this.setContent(path, Content.plainText(c + content.toPlainText()));
    }
    // throws exception if not exists
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
    public direntOfMountPoint():Dirent {
        const lstat=this.lstat(this.mountPoint);
        return {
            name: P.truncSEP(P.name(this.mountPoint)), 
            parentPath: P.up(this.mountPoint), 
            ...lstat,
            extra:{
                lstat
            },
        };
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
        const issym=lstat.isSymbolicLink();
        if (lstat.isDirectory() && !issym){
            const lis = this.opendir(fixedPath);
            if (lis.length > 0) {
                throw new Error(`${fixedPath}: Directory not empty`);
            }
            this.cachedStorage.removeDirInfoItem(fixedPath);
        } else if (!issym) this.cachedStorage.removeContentItem(fixedPath);
        this.removeEntry(pinfo, parent, fixedName);
    }
    // It does not follow links.
    public exists(path: string) {
        assertAbsolute(path);
        const parent = P.up(path);
        if (parent == null || !this.inMyFS(parent)) return true;
        if (!this.cachedStorage.hasDirInfoItem(parent)) return false;
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
        //assert(this.exists(path));
        assert(this.isLink(path));
    }
    // throws Exception if not exists
    public isLink(path:string):string|undefined {
        assertAbsolute(path);
        //if (!this.exists(path)) return undefined;
        const m = this.lstat(path);
        return m.linkPath;
    }
    public  touch(path:string) {
        assertAbsolute(path);
        this.assertWriteable(path);
        const parent = up(path);
        if (!this.exists(path)) {
            if (P.isDir(path)) {
                const fixedPath=path;
                this.cachedStorage.setDirInfoItem(fixedPath,{});
            } else {
                const fixedPath=path;
                this.cachedStorage.setContentItem(fixedPath, Content.plainText(""));
            }
        }
        if (parent != null) {
            this.assertExist(parent);
            if (this.inMyFS(parent)) {
                const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
                this._touch(pinfo, parent, fixedName, false);
            } else {
                this.getRootFS().resolveFS(parent).touch(parent);
            }
        }
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

