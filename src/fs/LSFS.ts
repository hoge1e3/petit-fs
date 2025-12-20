//define(["FSClass","PathUtil","extend","assert","Util","Content"],
//        function(FS,P,extend,assert,Util,Content) {
//import P from "./PathUtil.js";
import {Content} from "@hoge1e3/content";
import {ok} from "@hoge1e3/assert";
import RootFS from "./RootFS.js";
import { LocalStorageWrapper, MemoryStorage} from "./StorageWrapper.js";
import { IStorage, SyncIDBStorage } from "sync-idb-kvs";
import { MultiSyncIDBStorage } from "sync-idb-kvs-multi";
import MutablePromise from "mutable-promise";
import { createEEXIST, createEISDIR, createENOENT, createIOError } from "../errors.js";
import { BaseName, Canonical } from "../types.js";
import { basename, toCanonicalPath, up} from "../pathUtil2.js";
import { Dirent, IFileSystem, IRootFS, ObserverEvent, Stats } from "./types.js";
//const isDir = P.isDir.bind(P);
const assert:(value:any, message?:string)=>asserts value=ok;
//const up = P.up.bind(P);
//const endsWith = P.endsWith.bind(P);
const P_name = (p:string)=>basename(p)+(p.endsWith(SEP)? SEP:"") as SlasyBase;
function P_rel(p:SlasyDir, c:SlasyBase):Slasy {
    return (p+c) as Slasy;
}
function P_up(p:Slasy|Canonical):SlasyDir|null {
    const u=up(p);
    if (!u) return null;
    if (u==SEP) return u as SlasyDir;
    return (u+SEP) as SlasyDir;
}
function P_directorify(p:Canonical|Slasy):SlasyDir;
function P_directorify(p:string):string {
    return p.endsWith(SEP)? p: p+SEP;
}
// SlasyReg!=Canonical because "/" is Canonical but NOT SlasyReg
function isSlasyReg(p:SlasyReg|Canonical): p is SlasyReg {
    return p!=="/";
}
function P_truncSep(p:SlasyBase):BaseName;
function P_truncSep(p:Slasy):Canonical;
function P_truncSep(p:string):string;
function P_truncSep(p:string):string {
    if (p!=="/" && p.endsWith(SEP)) return p.substring(0,p.length-1);
    return p;
}
function P_isDir(p:Slasy|Canonical):p is SlasyDir {
    return p.endsWith(SEP);
}
function P_isDirSlasyBase(p:SlasyBase) {
    return p.endsWith(SEP);
}
const SEP = "/";
type StatsEx= Stats & {linkPath:string|undefined};
function now() {
    return new Date().getTime();
}
const dummyCTime=new Date();
const dummyCTimeMs=dummyCTime.getTime();
const dummyATime=new Date();
const dummyATimeMs=dummyATime.getTime();

let devCount = 0; // A monotonically increasing count of device ids
let inoCount = 0; // A monotonically increasing count of inodes

function meta2stat(m:MetaInfo, isDir: boolean, sizeF: ()=>number):StatsEx {
    const timeMs=m.lastUpdate;
    const time=new Date(timeMs);
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
        // just one of either A,B or C must be true
        isDirectory: ()=>!m.link&&isDir,//A
        isSymbolicLink: ()=>!!m.link,//B
        isCharacterDevice: ()=>false,
        isFile:()=>!m.link&&!isDir,//C
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
export type LSFSOptions={
    readOnly?:boolean,
    // For IDB
    dbName?: string, 
    lazy?:0|1|2,
    //storeName?: string,
};
const symsl=Symbol("Slasy");//  SHOULD contain trailing slash for directory
const symsl_dir=Symbol("Slasy_dir");
const symsl_regular=Symbol("Slasy_regular");
const symsl_base=Symbol("Slasy_base");
export type Slasy=SlasyDir|SlasyReg;
// SlasyDir and SlasyReg are always Absolute
export type SlasyDir=string&{[symsl_dir]:1};// /path/to/dir/    
export type SlasyReg=string&{[symsl_regular]:1}; // /path/to/file  
export type SlasyBase=string&{[symsl_base]:1}; //  file  dir/
//export type LSFSConstructorOptions={mountPoint?: string}&LSFSOptions;
export type DirInfo={[key:SlasyBase]:MetaInfo};
RootFS.addFSType("localStorage", function (rootFS:IRootFS, mountPoint:Canonical, options:LSFSOptions) {
    if (!localStorage[mountPoint]) localStorage[P_directorify(mountPoint)]="{}";
    return new LSFS(rootFS, mountPoint, new LocalStorageWrapper(localStorage), options);
});
RootFS.addFSType("ram", function (rootFS:IRootFS, mountPoint:Canonical, options:LSFSOptions) {
    return LSFS.ramDisk(rootFS, mountPoint, options);
});
RootFS.addFSType("idb", async function (rootFS:IRootFS, mountPoint:Canonical, options:LSFSOptions={}) {
    const {dbName="petit-fs", lazy}=options;
    const storage=await MultiSyncIDBStorage.create(
      dbName, 
      {[P_directorify(mountPoint)]:"{}"},
      {lazy});
    //if (!storage.itemExists(mountPoint)) storage.setItem(mountPoint, "{}");  
    return new LSFS(rootFS, mountPoint, storage, options);
},{asyncOnMount:true});
/*function assertAbsolute(path:string):asserts path is Absolute {
    assert(P.isAbsolutePath(path), path + " is not absolute path");
}*/
/*function assertAbsoluteDir(path:string): asserts path is SlasyDir {
    assertAbsolute(path);
    assert(P.isDir(path), path + " is not directory path");
}
function assertAbsoluteRegular(path:string): asserts path is SlasyReg {
    assertAbsolute(path);
    assert(!P.isDir(path), path + " is directory path");
}*/
function assertSlasyDir(path:Slasy): asserts path is SlasyDir {
    assert(path.endsWith(SEP), path + " should be a directory path");
}
function assertSlasyReg(path:Slasy): asserts path is SlasyReg {
    assert(!path.endsWith(SEP), path + " should NOT be a directory path");
}
function fixSep(dinfo:DirInfo, name:SlasyBase):SlasyBase {
    if (P_isDirSlasyBase(name)) return name;
    // name does not ends with "/"
    if (dinfo[name]) return name;
    const dname=(name+SEP) as SlasyBase;
    if(dinfo[dname]) {
        return dname;
    }
    return name;
}

interface CacheableStorage {
    getContentItem(regPath:SlasyReg):Content;
    hasContentItem(regPath:SlasyReg):boolean;
    setContentItem(regPath:SlasyReg, c:Content):void;
    removeContentItem(regPath:SlasyReg):void;

    getDirInfoItem(dirPath:SlasyDir):DirInfo;
    hasDirInfoItem(dirPath:SlasyDir):boolean;
    setDirInfoItem(dirPath:SlasyDir, d:DirInfo):void;
    removeDirInfoItem(dirPath:SlasyDir):void;
}
class NoCacheStorage implements CacheableStorage {
    constructor(public storage:IStorage, public mountPoint:string){}
    private getItem(fixedPath:Slasy) {
        //assertAbsolute(fixedPath);
        const key = fixedPath;
        assert(this.itemExists(fixedPath), `file(item) ${key} is not found.`);
        return this.storage.getItem(key)!;
    }
    private itemExists(fixedPath:Slasy) {
        //assertAbsolute(fixedPath);
        const key = fixedPath;
        return this.storage.itemExists(key);
    }
    private setItem(fixedPath:Slasy, value:string) {
        //assertAbsolute(fixedPath);
        const key = fixedPath;
        //assert(key.indexOf("..") < 0);
        //assert(P.startsWith(key, P.SEP));
        this.storage.setItem(key, value);
    }
    private removeItem(fixedPath:Slasy) {
        //assertAbsolute(fixedPath);
        const key = fixedPath;
        // Cannot assure this when write->remove very quickly(=before commit).
        //assert(key in this.storage, `removeItem: ${key} is not in storage`);
        this.storage.removeItem(key);
    }
    getContentItem(regPath: SlasyReg): Content {
        //assertAbsoluteRegular(regPath);
        const cs = this.getItem(regPath);
        if (Content.looksLikeDataURL(cs)) {
            return Content.url(cs);
        } else {
            return Content.plainText(cs);
        }
    }
    hasContentItem(regPath: SlasyReg): boolean {
        //assertAbsoluteRegular(regPath);
        return this.itemExists(regPath);
    }
    setContentItem(regPath: SlasyReg, content: Content): void {
        //assertAbsoluteRegular(regPath);
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
    removeContentItem(regPath: SlasyReg): void {
        //assertAbsoluteRegular(regPath);
        this.removeItem(regPath);
    }
    getDirInfoItem(dpath: SlasyDir): DirInfo {
        //assertAbsoluteDir(dpath);
        const dinfos = this.getItem(dpath);
        try {
            return JSON.parse(dinfos);
        } catch(e) {
            throw new Error(`Malformed JSON found in ${dpath}`);
        }
    }
    hasDirInfoItem(dpath: SlasyDir): boolean {
        //assertAbsoluteDir(dpath);
        return this.itemExists(dpath);
    }
    setDirInfoItem(dpath: SlasyDir, d: DirInfo): void {
        //assertAbsoluteDir(dpath);
        this.setItem(dpath, JSON.stringify(d));
    }
    removeDirInfoItem(dpath: SlasyDir): void {
        //assertAbsoluteDir(dpath);
        return this.removeItem(dpath);
    }
    keys() {
        return this.storage.keys();
    }
    async reload(key:string) {
        return await this.storage.reload(key);
    }
    export(path:string|undefined) {
        if (!path) return this.storage;
        const res={} as Record<string,string>;
        for (let k of this.storage.keys()) {
            if (k.startsWith(path)) res[k]=this.storage.getItem(k)!;
        }
        return res;
    }
    import(obj:Record<string,string>) {
        for (let k in obj) {
            this.storage.setItem(k,obj[k]);
        }
    }
}
type CacheStatus<T>={value:T}|"deleted";
(globalThis as any).wakeTimercount=0;
class CachedStorage implements CacheableStorage {
    raw: NoCacheStorage;
    dirInfoCache=new Map<string, CacheStatus<DirInfo>>();
    contentCache=new Map<string, CacheStatus<Content>>();
    htimer:any=undefined;
    _commitPromise=new MutablePromise<void>();
    hasUncommited() {
        return this.htimer!==undefined;
    }
    commitPromise(){
        if (!this.hasUncommited()) return Promise.resolve();
        return this._commitPromise;
    }
    private wakeTimer() {
        if (this.htimer!==undefined)return;
        (globalThis as any).wakeTimercount++;
        this.htimer=setTimeout(()=>this.commit(), 1000);
    }
    clearCache() {
        this.commit();
        this.dirInfoCache=new Map<string, CacheStatus<DirInfo>>();
        this.contentCache=new Map<string, CacheStatus<Content>>();
    }
    commit() {
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
        this.reservedDirInfos=new Set<SlasyDir>();
        this.reservedContents=new Set<SlasyReg>();
        this.htimer=undefined;
        this.raw.storage.waitForCommit().then(()=>{
            if (!this.htimer) {
                this._commitPromise.resolve();
                this._commitPromise=new MutablePromise();
            }
        });
    }
    private reservedDirInfos=new Set<SlasyDir>();
    private reservedContents=new Set<SlasyReg>();
    constructor(public storage:IStorage, public mountPoint:Canonical){
        this.raw=new NoCacheStorage(storage, mountPoint);
        if (storage instanceof MultiSyncIDBStorage) {
            /* storage.addEventListener may occurs in arbitrary order, See also constructor of LSFS  */
            storage.addEventListener("change", ({key})=>{
                if (key.endsWith("/")) {
                    this.reservedDirInfos.delete(key as SlasyDir);
                    this.dirInfoCache.delete(key as SlasyDir);
                } else {    
                    this.reservedContents.delete(key as SlasyReg);
                    this.contentCache.delete(key as SlasyReg);
                }
            });
        }
    }
    getContentItem(regPath: SlasyReg): Content {
        const c=this.contentCache.get(regPath);
        assert(c!=="deleted",`getContentItem: ${regPath} is deleted.`); 
        if (c) return c.value;
        const rawc=this.raw.getContentItem(regPath);
        this.contentCache.set(regPath, {value:rawc});
        return rawc;
    }
    hasContentItem(regPath: SlasyReg): boolean {
        //assertAbsoluteRegular(regPath);
        const c=this.contentCache.get(regPath);
        if (c==="deleted") return false;
        if (c) return true;
        return this.raw.hasContentItem(regPath);
    }
    setContentItem(regPath: SlasyReg, c: Content): void {
        //assertAbsoluteRegular(regPath);
        assert(!this.hasDirInfoItem(P_directorify(regPath)), `${regPath} exists as a directroy.`);
        this.contentCache.set(regPath, {value:c});
        this.reservedContents.add(regPath);
        this.wakeTimer();
    }
    removeContentItem(regPath:  SlasyReg): void {
        //assertAbsoluteRegular(regPath);
        assert(this.hasContentItem(regPath), `Cannot remove: ${regPath} does not exist.`);
        
        this.contentCache.set(regPath,"deleted");
        this.reservedContents.add(regPath);
        this.wakeTimer();
    }

    getDirInfoItem(dpath: SlasyDir): DirInfo {
        //assertAbsoluteDir(dpath);
        const d=this.dirInfoCache.get(dpath);
        assert(d!=="deleted",`getContentItem: ${dpath} is deleted.`); 
        if (d) return d.value;
        const rawd=this.raw.getDirInfoItem(dpath);
        this.dirInfoCache.set(dpath,{value: rawd});
        return rawd;
    }
    hasDirInfoItem(dpath: SlasyDir): boolean {
        //assertAbsoluteDir(dpath);
        const d=this.dirInfoCache.get(dpath);
        if (d==="deleted") return false;
        if (d) return true;
        return this.raw.hasDirInfoItem(dpath);
    }
    setDirInfoItem(dpath: SlasyDir, d: DirInfo): void {
        //assertAbsoluteDir(dpath);
        const tsep:Canonical=P_truncSep(dpath);
        // Canonical can be converted into SlasyReg if it is NOT "/".
        assert( !isSlasyReg(tsep) || !this.hasContentItem(tsep), 
        `${P_truncSep(dpath)} exists as a regular file.`);
        this.dirInfoCache.set(dpath,{value:d});
        this.reservedDirInfos.add(dpath);
        this.wakeTimer();
    }
    removeDirInfoItem(dpath: SlasyDir): void {
        //assertAbsoluteDir(dpath);
        assert(this.hasDirInfoItem(dpath), `Cannot remove: ${dpath} does not exist.`);

        this.dirInfoCache.set(dpath,"deleted");
        this.reservedDirInfos.add(dpath);
        this.wakeTimer();
    }    
    export(path:string|undefined) {
        this.commit();
        return this.raw.export(path);
    }
    import(obj:Record<string,string>) {
        this.commit();
        return this.raw.import(obj);  
    }
    async reload(key:string) {
        return await this.raw.reload(key);
    }
}
export class LSFS implements IFileSystem {
    //dirCache:{[key:string]:DirInfo}={};
    baseTimestamp=now();
    cachedStorage: CachedStorage;
    readOnly: boolean;
    hasUncommited() {
        return this.cachedStorage.hasUncommited();
    }
    commitPromise(){
        return this.cachedStorage.commitPromise();
    }
    getRootFS(){return this.rootFS;}
    onAddObserver(path: string):undefined {
    }
    get storage(){return this.cachedStorage.storage;}
    constructor(public rootFS:IRootFS, public mountPoint: Canonical, /*public*/ storage:IStorage, {readOnly}:LSFSOptions={}) {
        assert(storage, " new LSFS fail: no storage");
        if (mountPoint!=="/" && mountPoint.endsWith(SEP)){
            throw new Error("Invalid mount point "+mountPoint);
        }
        //super(rootFS, mountPoint);
        //if (!storage.itemExists(mountPoint)) storage.setItem(mountPoint,"{}");
        this.readOnly=!!readOnly;
        this.cachedStorage=new CachedStorage(storage, mountPoint);
        if (storage instanceof MultiSyncIDBStorage) {
            /* storage.addEventListener may occurs in arbitrary order, See also constructor of CachedStorage  */
            storage.addEventListener("change",({key,value})=>setTimeout(()=>{
                // so setTimeout is used, it ensures occur after handler in constructor of CachedStorage
                const c_key=toCanonicalPath(key);
                //console.log("Storage change",key,c_key);
                if (!this.exists(c_key)) {
                    this.rootFS.notifyChanged(c_key, {eventType:"delete"});   
                } else {
                    const stat=this.lstat(c_key); // do not use ...spread, it also spreads size, that may be non-existent(* current implementation gets size from content)
                    // Why may be non-existent? -> metaInfo and content may not match when many change events were sent via BroadcastChannel. 
                    const statany=stat as any;
                    statany.eventType="change";
                    this.rootFS.notifyChanged(c_key, statany); 
                }
            },100));
        }
    }
    static meta2dirent(parentPath:SlasyDir, fixedName:SlasyBase, lstat:Stats):Dirent {
        // fixedName: if the name refers to directory, it MUST end with /
        const dir=fixedName.endsWith("/");
        const lnk=lstat.isSymbolicLink();
        return {
            name: P_truncSep(fixedName),
            parentPath: P_truncSep(parentPath),
            // just one of either A,B or C must be true
            isFile: ()=>!lnk&&!dir,
            isDirectory: ()=>!lnk&&dir,
            isBlockDevice: ()=>false,
            isCharacterDevice: ()=>false,
            isSymbolicLink: ()=>lnk,
            isFIFO: ()=>false,
            isSocket: ()=>false,
            extra: {lstat},
        };
    }
    static ramDisk(rootFS:IRootFS, mountPoint:Canonical, options:LSFSOptions={readOnly:false}) {
        const s:IStorage = new MemoryStorage({});
        s.setItem(P_directorify(mountPoint), "{}");
        options = options || {};
        return new LSFS(rootFS, toCanonicalPath(mountPoint), s , options);
    }
    static now = now;
    inMyFS(path: string): boolean {
        return toCanonicalPath(path).startsWith(this.mountPoint);
    }
    private size(fixedPath: Slasy):number {
        if (P_isDir(fixedPath)) return 1;//TODO
        return this.cachedStorage.getContentItem(fixedPath).roughSize();
    }
    private getDirInfo(dpath:SlasyDir):DirInfo {
        //assertAbsoluteDir(dpath);
        return this.cachedStorage.getDirInfoItem(dpath);
    }
    private putDirInfo(dpath:SlasyDir, dinfo:DirInfo, removed:boolean) {
        //assertAbsoluteDir(dpath);
        const ppath = P_up(dpath);
        if (!ppath || /*!this.inMyFS(ppath)*/ dpath===this.mountPoint+SEP) {
            this.cachedStorage.setDirInfoItem(dpath, dinfo);
            return; 
        }
        if (!this.cachedStorage.hasDirInfoItem(ppath)) {
            // TODO throw retriable Error? or hasDirInfoItem itself throw it?
            throw createIOError("ENOENT",`File(item) ${ppath} not exists.`);
        }
        const pdinfo = this.cachedStorage.getDirInfoItem(ppath);
        this.cachedStorage.setDirInfoItem(dpath, dinfo);
        this._touch(pdinfo, ppath, P_name(dpath), removed);
    }
    // _touch may create directory 
    // `dinfo` should be DirInfo of `dpath`
    private _touch(dinfo:DirInfo, dpath:SlasyDir, fixedName:SlasyBase, removed:boolean) {
        //assertAbsoluteDir(dpath);
        // removed: this touch is caused by removing the file/dir.
        let evt:ObserverEvent;
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
            evt={ eventType,  ...meta2stat(dinfo[fixedName], P_isDirSlasyBase(fixedName), ()=>1/*TODO*/)};
        }
        this.getRootFS().notifyChanged( toCanonicalPath(P_rel(dpath, fixedName)), evt);
        this.putDirInfo(dpath, dinfo, removed);
    }
    private removeEntry(dinfo:DirInfo, dpath:SlasyDir, fixedName:SlasyBase) {
        //assertAbsoluteDir(dpath);
        if (dinfo[fixedName]) {
            delete dinfo[fixedName];
            this.getRootFS().notifyChanged( toCanonicalPath(P_rel(dpath, fixedName)), { eventType: "delete" });
            this.putDirInfo(dpath, dinfo, true);
        }
    }
    private isRAM() {
        return this.storage instanceof MemoryStorage;
    }
    /* `parent` should be parent of `path`     */
    private fixPath(path:string, parent:SlasyDir):[DirInfo, Slasy, SlasyBase] {
        const name=P_name(path);
        const pinfo=this.getDirInfo(parent);
        const fixedName=fixSep(pinfo, name);
        const fixedPath=P_rel(parent, fixedName);
        return [pinfo, fixedPath, fixedName];
    }
    //-----------------------------------
    public fstype() {
        if (this.storage instanceof MultiSyncIDBStorage) return "idb";
        return (this.isRAM() ? "ram" : "localStorage");
    }
    public isReadOnly() { return this.readOnly; }
    public assertWriteable(path:Canonical){
        if(this.isReadOnly()) throw new Error(`Cannot write to ${path} which is read-only.`);
    }
    public assertExist(path:Canonical) {
        if(!this.exists(path)) throw createENOENT(path);
    }
    public assertDirInfoItemExist(path:SlasyDir) {
        if (!this.cachedStorage.hasDirInfoItem(path)) throw createENOENT(path);
    }
    public getContent(path:Canonical) {
        //assertAbsoluteRegular(path);
        const stat=this.lstat(path);
        if (stat.isDirectory()) throw createEISDIR(path);
        if (!isSlasyReg(path)) throw createEISDIR(path);
        const regPath=path;
        return this.cachedStorage.getContentItem(regPath);
        /*if (Content.looksLikeDataURL(cs)) {
            c = Content.url(cs);
        } else {
            c = Content.plainText(cs);
        }
        return c;*/
    }
    public setContent(path:Canonical, content: Content):void {
        //assertAbsoluteRegular(path);
        this.assertWriteable(path);
        if (this.exists(path)) {
            const stat=this.lstat(path);
            if (stat.isDirectory()) throw createEISDIR(path); 
            if (stat.isSymbolicLink()) throw createIOError("EINVAL",`${path}: Cannot write content to symlink itself.`);   
        }
        const regPath=path;
        const parent=P_up(regPath);
        if (!parent || !this.cachedStorage.hasDirInfoItem(parent)) throw createENOENT(regPath); 
        /*let t:null|string = null;
        if (content.hasPlainText()) {
            t = content.toPlainText();
            if (Content.looksLikeDataURL(t)) t = null;
        }*/
        this.touch(regPath);// moved *1 from here since *1 overwrites the item to "" since it is not yet 'exists'
        if (!isSlasyReg(regPath)) throw createEISDIR(path); 
        this.cachedStorage.setContentItem(regPath, content);
        /*if (t != null) {
            this.setItem(fixedPath, t);
        } else {
            this.setItem(fixedPath, content.toURL());
        }*/
        // *1
    }
    public appendContent(path:Canonical, content: Content) {
        let c = "";
        if (this.exists(path)) c = this.getContent(path).toPlainText();
        return this.setContent(path, Content.plainText(c + content.toPlainText()));
    }
    // throws exception if not exists
    public lstat(path: Canonical): StatsEx {
        this.assertExist(path);
        const parent = P_up(path);
        if (!parent || path===this.mountPoint) {
            return meta2stat({lastUpdate: this.baseTimestamp},true, ()=>0);
        }
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        assert(pinfo[fixedName],`${path} does not exist.`);
        return meta2stat(pinfo[fixedName], (P_isDirSlasyBase(fixedName))&&!pinfo[fixedName].link, ()=>{
            try{
                return this.size(fixedPath);
            }catch(e) {
                console.warn(fixedPath," is no longer existent. treated as size=0");
                return 0;
            }
        });
    }
    public setMtime(path: Canonical, time: number): void {
        this.assertExist(path);
        return this.setMetaInfo(path,{lastUpdate:time});
    }
    private setMetaInfo(path:Canonical, info:MetaInfo) {
        this.assertWriteable(path);
        const parent = P_up(path);
        if (!parent || path===this.mountPoint) {
            return;
        }
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        pinfo[fixedName] = info;
        this.putDirInfo(parent, pinfo, false);
        // fails on symlink
        // assert(this.itemExists(fixedPath), `setMetaInfo: item ${fixedPath} not found`);
    }
    public mkdir(path:Canonical) {
        //assertAbsolute(path);
        //const dpath=P.directorify(path);
        this.assertWriteable(path);
        if (this.exists(path)) throw createEEXIST(path, "mkdir");
        const fixedPath=P_directorify(path);
        this.cachedStorage.setDirInfoItem(fixedPath,{});
        // path is not existsent -> 
        //   parent is inMyFS, 
        //   because if parent is not inMyFS, path is mountPoint.
        //   a mountPoint always exists. so path is existent. Paradox! 
        const parent=P_up(path);
        if (!parent) throw new Error(`mkdir:Invalid path state ${path}`);
        const pinfo=this.getDirInfo(parent);
        //assert(this.inMyFS(parent));        
        this._touch(pinfo, parent, P_name(fixedPath), false);
    }
    public opendir(path:Canonical):BaseName[] {
        //succ: iterator<string> // next()
        const dpath=P_directorify(path);
        const inf = this.getDirInfo(dpath);
        const res = [] as BaseName[];
        for (let i in inf) {
            assert(inf[i as SlasyBase]);
            if (inf[i as SlasyBase].trashed) continue;
            res.push(P_truncSep(i as SlasyBase));
        }
        return res;
    }
    public opendirent(path:Canonical):Dirent[] {
        //succ: iterator<string> // next()
        const dpath=P_directorify(path);
        const inf = this.getDirInfo(dpath);
        const res = [] as Dirent[];
        for (let sb in inf) {
            //assert(inf[sb as SlasyBase]);
            if (inf[sb as SlasyBase].trashed) continue;
            res.push(LSFS.meta2dirent(dpath, sb as SlasyBase, 
                meta2stat(inf[sb as SlasyBase], P_isDirSlasyBase(sb as SlasyBase), 
                ()=>this.size(P_rel(dpath, sb as SlasyBase))   )  ));
        }
        return res;
    }
    public direntOfMountPoint():Dirent {
        const lstat=this.lstat(this.mountPoint);
        return {
            name: basename(this.mountPoint), 
            parentPath: up(this.mountPoint), 
            ...lstat,
            extra:{
                lstat
            },
        };
    }
    public rm(path:Canonical) {
        //assertAbsolute(path);
        /*if (path===this.mountPoint) {
            throw createIOError("EROFS" ,path + ": Cannot remove. It is root of this FS.");
        }*/
        this.assertWriteable(path);
        const parent = P_up(path);
        if (parent == null || path===this.mountPoint) {
            throw createIOError("EROFS" ,path + ": Cannot remove. It is root of this FS.");
        }
        this.assertExist(path);
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        const lstat=this.lstat(path);
        const issym=lstat.isSymbolicLink();
        if (lstat.isDirectory() && !issym){
            const lis = this.opendir(path);
            if (lis.length > 0) {
                throw createIOError("ENOTEMPTY",`${fixedPath}: Directory not empty`);
            }
            assertSlasyDir(fixedPath);
            this.cachedStorage.removeDirInfoItem(fixedPath);
        } else if (!issym) {
            assertSlasyReg(fixedPath);
            this.cachedStorage.removeContentItem(fixedPath);
        }
        this.removeEntry(pinfo, parent, fixedName);
    }
    // It does not follow links.
    public exists(path: Canonical) {
        //assertAbsolute(path);
        if (path===this.mountPoint) return true;
        const parent = P_up(path);
        // parent is inMyFS (path is not mountPoint, so parent is inMyFS)
        if (parent == null /*|| !this.inMyFS(parent)*/) return true;
        if (!this.cachedStorage.hasDirInfoItem(parent)) return false;
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        const res = pinfo[fixedName];
        return (res && !res.trashed);
    }
    public link(path:Canonical, to:string) {
        //assertAbsolute(path);
        //assertAbsolute(to);
        this.assertWriteable(path);
        if (this.exists(path)) throw createIOError("EEXIST", `${path}: file exists`);
        /*if (P.isDir(path) && !P.isDir(to)) {
            throw createIOError("EINVAL",`${path} can not link to file ${to}`);
        }
        if (!P.isDir(path) && P.isDir(to)) {
            throw createIOError("EINVAL",`${path} can not link to directory ${to}`);
        }*/
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
    public isLink(path:Canonical):string|undefined {
        //if (!this.exists(path)) return undefined;
        const m = this.lstat(path);
        return m.linkPath;
    }
    // touch never creates directory!
    // TODO: Canonical path does not contain trailing slash(truncated), the path treated as a file.
    //      The real `touch foo/` throws error if foo is a regular file or non-existent
    //      But current implementation creates a regular file foo.
    public touch(path:Canonical) {
        this.assertWriteable(path);
        if (path===this.mountPoint) return;
        const parent = P_up(path);
        if (!parent) throw new Error("touch: Invalid path state: "+path);
        // parent is inMyFS
        this.assertExist(P_truncSep(parent));
        const [pinfo, fixedPath, fixedName]=this.fixPath(path, parent);
        if (!P_isDir(fixedPath)) {            
            if (!this.cachedStorage.hasContentItem(fixedPath)) {
                this.cachedStorage.setContentItem(fixedPath, Content.plainText(""));
            }
        }
        this._touch(pinfo, parent, fixedName, false);
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
    export(path:string|undefined) {
        return this.cachedStorage.export(path);
    }
    import(obj:Record<string,string>) {
        return this.cachedStorage.import(obj);  
    }
}
export default LSFS;

