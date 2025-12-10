import {Buffer} from "buffer";
import { getRootFS } from "./fs/index.js";
import { Content } from "@hoge1e3/content";
//import PathUtil from "./fs/PathUtil.js";
import RootFS from "./fs/RootFS.js";
import { createENOENT, createENOTDIR, createIOError } from "./errors.js";
import path2 from "./path/index.js";
const {setProcess}=path2;
export const path=path2.path;
import {basename, directorify, isAbsolute, join, joinCB, normalize, toAbsolutePath, toCanonicalPath, up } from "./pathUtil2.js";
import { Absolute, BaseName, Canonical } from "./types.js";
import { Dirent, FSTypeName, IFileSystem, IRootFS, ObserverEvent } from "./fs/types.js";
//import PathUtil from "./fs/PathUtil.js";
import MimeTypes from "./fs/MIMETypes.js";
//import pkg from "../pkg.cjs";

//import { platform } from "os";
/*import * as path from "path-module";
export * as path from "path-module";*/
/*
export const path={
    get default() {
        return path;
    },
    get posix() {
        return path; // PathUtil's SEP is fixed with '/'.
    },
    get win32(){
        return path;// TODO
    },
    normalize(path:string) {
        return PathUtil.truncSEP(path);
    },
    isAbsolute(path:string) {
        return PathUtil.isAbsolutePath(path);
    },
    toAbsolute(path:string) {
        if (PathUtil.isAbsolutePath(path)) return path;
        return pathlib.join(process.cwd(),path);
    },
    basename(path:string, ext?:string):string{
        let res=PathUtil.name(path);
        if (ext) {
            return PathUtil.truncSEP(PathUtil.truncExt(res,ext));
        }
        return PathUtil.truncSEP(res);
    },
    resolve(head:string, ...rest:string[]) {
        return this.join(this.toAbsolute(head),...rest);
    },
    join(...paths:string[]) {
        if (paths.length==0) throw new Error(`empty paths`);
        let res=paths.shift() as string;
        let base;
        if (!PathUtil.isAbsolutePath(res)) {
            base=process.cwd();
            res=pathlib.join(base, res);
        }
        while(true) {
            const p=paths.shift();
            if (!p) break;
            res=PathUtil.directorify(res);
            res=pathlib.join(res, p);
        }
        if (base) {
            res=PathUtil.relPath(res,base);
        }
        return res;
    },
    relative(from:string, to:string) {
        from=this.toAbsolute(from);
        to=this.toAbsolute(to);
        return PathUtil.relPath(to,PathUtil.directorify(from));
    },
    dirname(path:string):string {
        const r=PathUtil.up(path);
        return r || path;
    },
    extname(path:string) {
        return PathUtil.ext(path);
    }
};*/

export const os={
    platform:()=>"browser",
    EOL: "\n",
};
export const process={
    __fs: undefined as FileSystem|undefined,
    _cwd: "/", 
    env: {} as {[key:string]:string},
    argv: [] as string[],
    argv0: "",
    execPath: "",
    execArgv:[] as string[],
    pid: 0 as number,
    release: {
        name:"petit-fs"
    },
    stdout: {
        write(...a:any[]){
            console.log(...a);
        },
        columns: 80,
        fd:1,
    },
    stderr: {
        write(...a:any[]){
            console.log(...a);
        },
        columns: 80,
        fd:2,
    },
    memoryUsage(){
        return {heapUsed:0};
    },
    exit() {
        
    },
    __setfs(fs:FileSystem) {
        this.__fs=fs;
    },
    cwd():string {
        return this._cwd;
    },
    chdir(path:string) {
        if (!pathlib.isAbsolute(path)) {
            path=pathlib.join(this._cwd,path);
        }
        //path=PathUtil.directorify(path);
        const fs=this.__fs;
        if (!fs) throw new Error("fs is not set");
        if (!fs.existsSync(path)) {
            throw createENOENT(path);
        }
        if (!fs.statSync(path).isDirectory()) {
            throw createENOTDIR(path);
        }
        this._cwd=path;
    },
    nextTick<R = void>(
        fn: (...args:any[]) => R,
        ...args:any[]
    ) {
        const p = Promise.resolve();
        return p.then(fn.bind(this,...args));
    },
    hrtime(a:[number,number]=[0,0]) {
        const p=performance.now()/1000;
        const F=1000*1000*1000;
        const s2a=(s:number)=>[Math.floor(s), Math.floor((s-Math.floor(s))*F) ];
        const a2s=([s,nano]:[number,number])=>s+nano/F;
        return s2a(p-a2s(a));
    },
    versions:{},
    version: "1.0.0",
    platform: "linux",
};
setProcess(process as any);
const pathlib=path.posix;
if (pathlib!==path) throw new Error("pathlib is not posix");
// file type
const S_IFMT = 0o170000; // file type
const S_IFSOCK = 0o140000; // socket
const S_IFLNK = 0o120000; // symbolic link
const S_IFREG = 0o100000; // regular file
const S_IFBLK = 0o060000; // block device
const S_IFDIR = 0o040000; // directory
const S_IFCHR = 0o020000; // character device
const S_IFIFO = 0o010000; // FIFO

let devCount = 0; // A monotonically increasing count of device ids
let inoCount = 0; // A monotonically increasing count of inodes

export const timeIncrements = 1000;
const dummyCTime=new Date();
const dummyCTimeMs=dummyCTime.getTime();
/*function stat2dirent(parentPath:string, name:string, lstat:Stats):Dirent {
    const dir=name.endsWith("/");
    return {
        name: PathUtil.truncSEP(name),
        parentPath: PathUtil.truncSEP(parentPath),
        isFile: ()=>!dir,
        isDirectory: ()=>dir,
        isBlockDevice: ()=>false,
        isCharacterDevice: ()=>false,
        isSymbolicLink: ()=>!!m.link,
        isFIFO: ()=>false,
        isSocket: ()=>false,
        extra: {lstat},
    };
}*/
/*function meta2stat(m:MetaInfo, isDir: boolean, sizeF: ()=>number):Stats {
    const timeMs=m.lastUpdate;
    const time=new Date(timeMs);
    const dummyATime=new Date();
    const dummyATimeMs=dummyATime.getTime();
    return {
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
}*/
export type FdEntry={
    buffer: Buffer;
    offset: number;
    close: ()=>void;
}
/**
 * Represents a virtual POSIX-like file system.
 */
export class FileSystem {
    fdseq=1;
    fdEntries=new Map<number, FdEntry>();
    private linkCache=new Map<Canonical, [IFileSystem, Canonical]>();
    promises=new FileSystem_Promises(this);
    clearLinkCache(){
        this.linkCache=new Map<Canonical, [IFileSystem, Canonical]>();
    }
    getRootFS():RootFS{
        return getRootFS();
    }
    constructor() {
    }

   
    /**
     * Gets a value indicating whether the file system is read-only.
     */
    _readOnly=false;
    public get isReadonly(): boolean {
        return this._readOnly;
        //return Object.isFrozen(this);
    }

    /**
     * Makes the file system read-only.
     */
    public makeReadonly(): this {
        this._readOnly=true;
        return this;
    }

    /**
     * Mounts a physical or virtual file system at a location in this virtual file system.
     *
     * @param mountPoint The path in this virtual file system.
     * @param resolver An object used to resolve files in `source`.
     */
    public mountSync(mountPoint: string, resolver: IFileSystem|FSTypeName, options:any={}): IFileSystem {
        const rfs=getRootFS();
        mountPoint=directorify(mountPoint);
        const fs=rfs.mount(mountPoint, resolver,options);
        this.clearLinkCache();
        return fs;
    }
    public async mount(mountPoint: string, resolver: FSTypeName, options:any={}): Promise<IFileSystem> {
        const rfs=getRootFS();
        const mountPoint_d=directorify(mountPoint);
        const fs=await rfs.mountAsync(mountPoint_d, resolver,options);
        this.clearLinkCache();
        return fs;
    }
    public async unmount(mountPoint:string) {
        const rfs=getRootFS();
        const mountPoint_d=directorify(mountPoint);
        const fs=rfs.unmount(mountPoint_d);
        this.clearLinkCache();
        return fs;
    }
    public fstab() {
        const rfs=getRootFS();
        return rfs.fstab();
    }
    public commitPromise(){
        const rfs=getRootFS();
        return rfs.commitPromise();
    }

    /**
     * Recursively remove all files and directories underneath the provided path.
     */
    public rimrafSync(_path: string): void {
        const path=toCanonicalPath(_path);
        try {
            const stats = this.lstatSync(path);
            if (stats.isFile() || stats.isSymbolicLink()) {
                this.unlinkSync(path);
            }
            else if (stats.isDirectory()) {
                for (const file of this.readdirSync(path)) {
                    this.rimrafSync(joinCB(path, file));
                }
                this.rmdirSync(path);
            }
        }
        catch (_e) {
            const e:any=_e;
            if (e.code === "ENOENT") return;
            throw e;
        }
    }
    public resolveLink(path: Canonical):[IFileSystem,Canonical] {
        const cached=this.linkCache.get(path);
        if (cached) return cached;
        const n=this.resolveLinkNoCache(path);
        this.linkCache.set(path,n);
        return n;
    }
    public resolveLinkNoCache(path: Canonical):[IFileSystem,Canonical] {
        // This always return fs,path even if it is not exists.
        //path=toAbsolutePath(path);
        /* ln -s /a/b/ /c/d/
        // ln -s /a/b/ /c/d/
        // resolveLink /a/b/    ->  /a/b/
        // resolveLink /c/d/e/f -> /a/b/e/f
        // resolveLink /c/d/non_existent -> /a/b/non_existent
        // isLink      /c/d/    -> /a/b/
        // isLink      /c/d/e/f -> null
        // ln /testdir/ /ram/files
        // resolveLink /ram/files/sub/test2.txt -> /testdir/sub/test2.txt
        // path=/ram/files/test.txt
        */
        const mp=this.isMountPoint(path);
        if (mp) {
            // Mount point is never a link.
            return [mp, normalize(mp.mountPoint)||("/" as Canonical)]; 
        }
        const parent=up(path);
        if (!parent) {
            // if path=="/", it should be mount point. Never come here.
            throw new Error("Invalid path state: "+path);
            /*const rfs=this.getRootFS();
            // "/" is never link.
            return [rfs.resolveFS(path),path];*/
        }
        // path=/a/b/  parent=/a/
        const [rpfs, rppath]=this.resolveLink(parent);
        // rpfs=(fs of /a/)    rppath=/a/ 
        // rp=Resolved Parent. rpfs, rppath have NO link components.
        const rpath=joinCB(rppath, basename(path));
        // rpath = /a/b/ 
        const to=(rpfs.exists(rpath) && rpfs.isLink(rpath));
        // to = /c/d/   (or, to = ../c/d/)
        if (to) {
            const absto=isAbsolute(to)?to:join(rppath, to);
            return this.resolveLink( normalize(absto));  //  to=/c/d/
        }
        return [rpfs, rpath];  // [pfs=(fs of /a/),  rpath=/a/b/]
    }
    /* Used when refers to link itself, (on unlink etc) */
    public resolveParentLink(path: Canonical):[IFileSystem,Canonical] {
        /*
        if path is mount_point, it should return [FS_at_mount_point, path itself]
        if path is symbolic link that points mount point, it should return [FS_of_up(path), path]
        */
        const mfs=this.isMountPoint(path);
        if (mfs){
            return [mfs, path];
        }
        const dir=up(path);
        if (!dir) {
            return this.resolveLink(path);
        }
        const [fs, _dir]=this.resolveLink(dir);
        return [fs, joinCB(_dir, basename(path))];
    }
    /**
     * Make a directory and all of its parent paths (if they don't exist).
     */
    public mkdirpSync(path: string): void {
        //const path=toAbsolutePath(_path);
        const p=up(path);
        if (!p) throw new Error("mkdirpSync: Invalid path state: "+path);
        if (!this.existsSync(p)) {
            this.mkdirpSync(p);
        }
        return this.mkdirSync(path);
    }


    // POSIX API (aligns with NodeJS "fs" module API)

    /**
     * Determines whether a path exists.
     */
    public existsSync(_path: string): boolean {
        const path=toCanonicalPath(_path);
        const [fs,ppath]=this.resolveParentLink(path);
        // fs.exists returns false if it exists by following symlink.
        return fs.exists(ppath);
    }
    isMountPoint(path:Canonical):IFileSystem|undefined{
        return this.getRootFS().fstab().find((f)=>(f.mountPoint||"/")===path);
    }
    childrenOfMountPoint(path:Canonical):IFileSystem[] {
        // this=/mnt/  ,  returns  ["/mnt/fd", "/mnt/cdrom"] ... etc. just a example.
        return this.getRootFS().fstab().filter(
            (f)=>f.mountPoint && up(f.mountPoint)===path);
    }
    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/stat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public statSync(path: string): Stats {
        return this.lstatSync(
            this.resolveLink(
                toCanonicalPath(path)
            )[1]);
    }


    /**
     * Change file access times
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public utimesSync(path: string, atime: Date, mtime: Date): void {
        const [fs, fpath]=this.resolveLink(
            toCanonicalPath(path));
        fs.setMtime(fpath, mtime.getTime());
    }

    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/lstat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public lstatSync(__path: string): Stats {
        const path=toCanonicalPath(__path);
        const [fs,_path]=this.resolveParentLink(path);
        const m=fs.lstat(_path);
        return m;
    }
    public readlinkSync(__path: string): string {
        const path=toCanonicalPath(__path);
        const [fs, fpath]=this.resolveParentLink(path);
        const m=fs.isLink(fpath);
        if (!m) {
            throw createIOError("EINVAL",`Not a symbolic link: '${path}'`);
        }
        return m;
    }
    /**
     * Read a directory. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/readdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public readdirSync(path: string): BaseName[];
    public readdirSync(path: string, opt:{withFileTypes:true}): Dirent[];
    public readdirSync(_path: string, opt:{withFileTypes:boolean}={withFileTypes:false}): BaseName[]|Dirent[] {
        const path=toCanonicalPath(_path);
        const [fs, fpath]=this.resolveLink(path);
        const mps=this.childrenOfMountPoint(fpath);
        if (opt.withFileTypes) {
            const res=fs.opendirent(fpath);
            if (mps.length===0) return res;
            for (let f of mps) {
                const e=f.direntOfMountPoint();
                const idx=res.findIndex((_e)=>_e.name===e.name);
                if (idx>=0) res.splice(idx,1);
                res.push(e);
            }
            return res;
        } else {
            const res=fs.opendir(fpath);//.map(n=>PathUtil.truncSEP(n));
            if (mps.length===0) return res;
            for (let f of mps) {
                const n=basename(f.mountPoint); //PathUtil.truncSEP(PathUtil.name(f.mountPoint));
                if (!res.includes(n)) res.push(n);
            }
            return res;    
        }
    }
    /**
     * Make a directory.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/mkdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public mkdirSync(_path: string, {recursive}:{recursive:boolean}={recursive:false}): void {
        if (this.isReadonly) throw createIOError("EROFS");
        //path=PathUtil.directorify(path);
        const path=toCanonicalPath(_path);
        const [fs, fpath]=this.resolveLink(path);
        if (recursive) {
            if (this.existsSync(fpath)) {
                if (!this.statSync(fpath).isDirectory()) {
                    throw new Error(`${fpath} already exists as file`);
                }
                return;
            }
            const parent=up(fpath);
            if (!parent) throw new Error("mkdirSync: Invalid path state: "+fpath);
            if (!this.existsSync(parent)) this.mkdirSync(parent,{recursive:true});           
        }
        return fs.mkdir(fpath);
    }


    /**
     * Remove a directory.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rmdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public rmdirSync(_path: string, options?:{recursive?:boolean}): void {
        // TODO: if path is symbolic link...??
        if (this.isReadonly) throw createIOError("EROFS");
        if (!this.statSync(_path).isDirectory()) {
            throw createENOTDIR(_path);
        }
        if (options?.recursive) {
            return this.rimrafSync(_path);
        }
        const path=toCanonicalPath(_path);
        const [fs, fpath]=this.resolveParentLink(path);
        fs.rm(fpath);           
        this.clearLinkCache();
    }
    public rmSync(path: string, options?:{recursive?:boolean, force?:boolean}): void {
        if (options?.recursive) {
            return this.rimrafSync(path);
        }
        return this.unlinkSync(path);           
    }

    /**
     * Link one file to another file (also known as a "hard link").
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/link.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public linkSync(oldpath: string, newpath: string): void {
        throw new Error("Hard link not supported.");
    }

    /**
     * Remove a directory entry.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/unlink.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public unlinkSync(path: string): void {
        if (this.isReadonly) throw createIOError("EROFS");
        const [fs, fpath]=this.resolveParentLink(toCanonicalPath(path));
        fs.rm(fpath);
        this.clearLinkCache();
    }

    /**
     * Rename a file.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rename.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public renameSync(src: string, dst: string): void {
        src=toAbsolutePath(src);
        dst=toAbsolutePath(dst);
        if (this.isReadonly) throw createIOError("EROFS");
        if (!this.existsSync(src)) {
            throw createENOENT(src);
        }
        if (this.existsSync(dst)) {
            throw createIOError("EEXIST", `${dst} already exists.`);
        }
        this.cpSync(src, dst, {recursive:true});
        this.rimrafSync(src);
        this.clearLinkCache();
    }
    // NOTE: {cp|rename}Sync(src, dst) is equivalent to {cp|mv} [-r] src/* dst/ in UNIX. not {cp|mv} [-r] src dst
    //        src/a.txt is always {copied|moved} to dst/a.txt, never dst/src/a.txt even dst is already a directory.
    public cpSync(_src: string, _dst: string, {recursive}:{recursive:boolean}={recursive:false}): void { 
        const src1=toCanonicalPath(_src);
        const dst1=toCanonicalPath(_dst);
        if (this.isReadonly) throw createIOError("EROFS");
        if (!this.existsSync(src1)) {
            throw createENOENT(src1);
        }
        const [dfs,dst]=this.resolveLink(dst1);
        const [sfs,src]=this.resolveLink(src1);
        const sstat=this.lstatSync(src);
        if (sstat.isDirectory()) {
            // skip if src is a symbolic link to a directory
            const slstat=this.lstatSync(src1);
            if (slstat.isSymbolicLink()) return;

            if (!recursive) throw createIOError("EISDIR",`${src} is a directory`);
            dfs.mkdir(dst);
            for (const f of this.readdirSync(src, {withFileTypes:true})) {
                const srcp=joinCB(src,f.name);
                const dstp=joinCB(dst,f.name);
                if (f.isSymbolicLink()||f.isDirectory()) {
                    this.cpSync(srcp, dstp, {recursive});
                } else {
                    dfs.setContent(dstp, sfs.getContent(srcp));
                }
            }
        } else {
            if (this.existsSync(dst) && this.statSync(dst).isDirectory()) {
                throw createIOError("EISDIR",`${dst} is a directory`);
            }
            dfs.setContent(dst, sfs.getContent(src));
        }
    }

    /**
     * Make a symbolic link.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/symlink.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public symlinkSync(target: string, linkpath: string): void {
        if (this.isReadonly) throw createIOError("EROFS");
        const [fs, fpath]=this.resolveLink(toCanonicalPath(linkpath));
        if (!pathlib.isAbsolute(target)) {
            target=join(fpath, target)
        }
        fs.link(fpath, target);
        this.clearLinkCache();
    }

    /**
     * Resolve a pathname.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/realpath.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public realpathSync(_path: string): Canonical {
        const path=toCanonicalPath(_path);
        //path=PathUtil.normalize(path);
        return this.resolveLink(path)[1];
    }

    /**
     * Read from a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public readFileSync(path: string, encoding?: null): Buffer<ArrayBuffer>; // eslint-disable-line no-restricted-syntax
    /**
     * Read from a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public readFileSync(path: string, encoding: BufferEncoding): string;
    /**
     * Read from a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public readFileSync(path: string, encoding?: BufferEncoding | null): string | Buffer<ArrayBuffer>; // eslint-disable-line no-restricted-syntax
    public readFileSync(path: string, encoding: BufferEncoding | null = null) { // eslint-disable-line no-restricted-syntax
        const [fs, fpath]=this.resolveLink(toCanonicalPath(path));
        if (fs.lstat(fpath).isDirectory()) throw createIOError("EISDIR",`Cannot read from directory: ${fpath}`);
        const c=fs.getContent(fpath);
        if (encoding) {
            return this.toPlainTextOrURL(c);
        } else {
            return c.toBin();
        }    
    }
    private toPlainTextOrURL(c:Content) {
        try {
            return c.toPlainText();
        } catch (e) {
            return c.toURL();
        }
    }

    /**
     * Write to a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    // eslint-disable-next-line no-restricted-syntax
    public writeFileSync(path: string, data: string | Buffer<ArrayBuffer>, encoding: string | null = null): void {
        if (this.isReadonly) throw createIOError("EROFS");
        const [fs, fpath]=this.resolveLink(toCanonicalPath(path));
        if (fs.exists(fpath) && fs.lstat(fpath).isDirectory()) throw createIOError("EISDIR",`Cannot write to directory: ${fpath}`);
        if (typeof data==="string") {
            fs.setContent(fpath, Content.plainText(data));
        } else {
            fs.setContent(fpath, Content.bin(data, MimeTypes[pathlib.extname(path)]|| "application/octet-stream"));//fs.getContentType(path)));
        }
    }
    public writeSync(fd:number, data: string | Buffer, encoding: string | null = null):void {
        const e=this.fdEntries.get(fd);
        if (!e) throw new Error("Invalid fd");
        const adata=(typeof data==="string"?
            Content.plainText(data).toBin(Buffer) as Buffer:data);
        e.buffer=Buffer.concat([e.buffer, adata]);

    }

    public appendFileSync(_path: string, data: string | Buffer<ArrayBuffer>, encoding: string | null = null): void {
        if (this.isReadonly) throw createIOError("EROFS");
        const path=toCanonicalPath(_path);
        const [fs, fpath]=this.resolveLink(path);
        if (fs.exists(fpath) && fs.lstat(fpath).isDirectory()) throw createIOError("EISDIR",`Cannot write to directory: ${fpath}`);
        if (typeof data==="string") {
            fs.appendContent(fpath, Content.plainText(data));
        } else {
            fs.appendContent(fpath, Content.bin(data, MimeTypes[pathlib.extname(path)]|| "application/octet-stream"));// fs.getContentType(path)));
        }
    }

    public watch(_path:string,...opts:any[]){
        const path=toCanonicalPath(_path);
        let sec=opts.shift();
        let options:object, listener:Function;
        if(typeof sec==="function"){
            listener=sec;
            options={};
        }else {
            options=sec||{};
            listener=opts.shift();
        }
        const ob=getRootFS().addObserver(path,function (_path:Canonical, meta:ObserverEvent) {
            listener(meta.eventType, pathlib.relative(path, _path), meta );
        });
        return {
            close:()=>ob.remove()
        };
    }
    public watchFile(path: string, ...opts:any[]){
        path=toAbsolutePath(path);
        let sec=opts.shift();
        let options:any, listener:(old:Stats, current:Stats)=>void;
        if(typeof sec==="function"){
            listener=sec;
            options={};
        }else {
            options=sec||{};
            listener=opts.shift();
        }
        const inter=options.interval||5000;
        const stat=(path:string)=>this.existsSync(path) ?
            this.statSync(path): dummyStat();
        const dummyStat=()=>new Stats();
        let prev=stat(path);
        const loop=()=>{
            const cur=stat(path);
            if(cur.mtimeMs!==prev.mtimeMs){
                listener(prev,cur);
                prev=cur;
            }
        }
        setInterval(loop,inter);
    }
    openSync(path:string, mode:string) {
        path=toAbsolutePath(path);
        const fd=this.fdseq++;
        if (mode=="w"||mode=="a") {
            const buffer=mode=="a"?this.readFileSync(path):Buffer.alloc(0);
            const entry={
                offset: 0,
                buffer, close:()=>this.writeFileSync(path, entry.buffer)
            }
            this.fdEntries.set(fd,entry);    
        } else {
            throw new Error(`Unsupported mode ${mode}`);
        }
        return fd;
    }
    closeSync(fd:number) {
        const e=this.fdEntries.get(fd);
        if (!e) throw new Error("Invalild FD");
        e.close();
        this.fdEntries.delete(fd);
    }
    constants={
        R_OK:"R_OK",
        W_OK:"W_OK",
    };
    accessSync(path:string, type:string) {
        const [fs, fpath]=this.resolveLink(toCanonicalPath(path));
        if (type==="W_OK") {
            if (fs.isReadOnly(fpath)) {
                throw createIOError("EROFS",`${path} is read only.`);
            }
        }
    }
    //--- callbacks
    appendFile(...a:any[]){
        const callback=a.pop();
        return this.promises.appendFile(
            ...(a as Parameters<FileSystem["promises"]["appendFile"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    access(...a:any[]){
        const callback=a.pop();
        return this.promises.access(
            ...(a as Parameters<FileSystem["promises"]["access"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    close(...a:any[]){
        const callback=a.pop();
        return this.promises.close(
            ...(a as Parameters<FileSystem["promises"]["close"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    cp(...a:any[]){
        const callback=a.pop();
        return this.promises.cp(
            ...(a as Parameters<FileSystem["promises"]["cp"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    exists(...a:any[]){
        const callback=a.pop();
        return this.promises.exists(
            ...(a as Parameters<FileSystem["promises"]["exists"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    link(...a:any[]){
        const callback=a.pop();
        return this.promises.link(
            ...(a as Parameters<FileSystem["promises"]["link"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    lstat(...a:any[]){
        const callback=a.pop();
        return this.promises.lstat(
            ...(a as Parameters<FileSystem["promises"]["lstat"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    mkdir(...a:any[]){
        const callback=a.pop();
        return this.promises.mkdir(
            ...(a as Parameters<FileSystem["promises"]["mkdir"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    open(...a:any[]){
        const callback=a.pop();
        return this.promises.open(
            ...(a as Parameters<FileSystem["promises"]["open"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    readdir(...a:any[]){
        const callback=a.pop();
        return this.promises.readdir(
            ...(a as Parameters<FileSystem["promises"]["readdir"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    readFile(...a:any[]){
        const callback=a.pop();
        return this.promises.readFile(
            ...(a as Parameters<FileSystem["promises"]["readFile"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    readlink(...a:any[]){
        const callback=a.pop();
        return this.promises.readlink(
            ...(a as Parameters<FileSystem["promises"]["readlink"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    realpath(...a:any[]){
        const callback=a.pop();
        return this.promises.realpath(
            ...(a as Parameters<FileSystem["promises"]["realpath"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    rename(...a:any[]){
        const callback=a.pop();
        return this.promises.rename(
            ...(a as Parameters<FileSystem["promises"]["rename"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    rm(...a:any[]){
        const callback=a.pop();
        return this.promises.rm(
            ...(a as Parameters<FileSystem["promises"]["rm"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    rmdir(...a:any[]){
        const callback=a.pop();
        return this.promises.rmdir(
            ...(a as Parameters<FileSystem["promises"]["rmdir"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    stat(...a:any[]){
        const callback=a.pop();
        return this.promises.stat(
            ...(a as Parameters<FileSystem["promises"]["stat"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    symlink(...a:any[]){
        const callback=a.pop();
        return this.promises.symlink(
            ...(a as Parameters<FileSystem["promises"]["symlink"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    unlink(...a:any[]){
        const callback=a.pop();
        return this.promises.unlink(
            ...(a as Parameters<FileSystem["promises"]["unlink"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    utimes(...a:any[]){
        const callback=a.pop();
        return this.promises.utimes(
            ...(a as Parameters<FileSystem["promises"]["utimes"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    writeFile(...a:any[]){
        const callback=a.pop();
        return this.promises.writeFile(
            ...(a as Parameters<FileSystem["promises"]["writeFile"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }
    write(...a:any[]){
        const callback=a.pop();
        return this.promises.write(
            ...(a as Parameters<FileSystem["promises"]["write"]>)).then(
            (r)=>callback(null,r),(e)=>callback(e));
    }

}

export interface FileSystemOptions {
    // Sets the initial timestamp for new files and directories
    time?: number;

    // A set of file system entries to initially add to the file system.
    files?: FileSet;

    // Sets the initial working directory for the file system.
    cwd?: string;

    // Sets initial metadata attached to the file system.
    meta?: Record<string, any>;
}


export type Axis = "ancestors" | "ancestors-or-self" | "self" | "descendants-or-self" | "descendants";

export interface Traversal {
    /** A function called to choose whether to continue to traverse to either ancestors or descendants. */
    traverse?(path: string, stats: Stats): boolean;
    /** A function called to choose whether to accept a path as part of the result. */
    accept?(path: string, stats: Stats): boolean;
}

export interface FileSystemResolver {
    statSync(path: string): { mode: number; size: number; };
    readdirSync(path: string): string[];
    readFileSync(path: string): FileDataBuffer;
    writeFileSync?(path: string, data: string | Buffer, encoding: string | null): void;
}
export interface FileSystemEntries {
    readonly files: readonly string[];
    readonly directories: readonly string[];
}

export interface FileSystemResolverHost {
    useCaseSensitiveFileNames(): boolean;
    getAccessibleFileSystemEntries(path: string): FileSystemEntries;
    directoryExists(path: string): boolean;
    fileExists(path: string): boolean;
    getFileSize(path: string): number;
    readFile(path: string): string | undefined;
    getWorkspaceRoot(): string;
}
/*
export function createResolver(host: FileSystemResolverHost): FileSystemResolver {
    return {
        readdirSync(path: string): string[] {
            const { files, directories } = host.getAccessibleFileSystemEntries(path);
            return directories.concat(files);
        },
        statSync(path: string): { mode: number; size: number; } {
            if (host.directoryExists(path)) {
                return { mode: S_IFDIR | 0o777, size: 0 };
            }
            else if (host.fileExists(path)) {
                return { mode: S_IFREG | 0o666, size: host.getFileSize(path) };
            }
            else {
                throw createENOENT(path);
            }
        },
        readFileSync(path: string): FileDataBuffer {
            return { encoding: "utf8", data: host.readFile(path)! };
        },
    };
}*/

export class Stats {
    public dev: number;
    public ino: number;
    public mode: number;
    public nlink: number;
    public uid: number;
    public gid: number;
    public rdev: number;
    public size: number;
    public blksize: number;
    public blocks: number;
    public atimeMs: number;
    public mtimeMs: number;
    public ctimeMs: number;
    public birthtimeMs: number;
    public atime: Date;
    public mtime: Date;
    public ctime: Date;
    public birthtime: Date;

    constructor();
    constructor(dev: number, ino: number, mode: number, nlink: number, rdev: number, size: number, blksize: number, blocks: number, atimeMs: number, mtimeMs: number, ctimeMs: number, birthtimeMs: number);
    constructor(dev = 0, ino = 0, mode = 0, nlink = 0, rdev = 0, size = 0, blksize = 0, blocks = 0, atimeMs = 0, mtimeMs = 0, ctimeMs = 0, birthtimeMs = 0) {
        this.dev = dev;
        this.ino = ino;
        this.mode = mode;
        this.nlink = nlink;
        this.uid = 0;
        this.gid = 0;
        this.rdev = rdev;
        this.size = size;
        this.blksize = blksize;
        this.blocks = blocks;
        this.atimeMs = atimeMs;
        this.mtimeMs = mtimeMs;
        this.ctimeMs = ctimeMs;
        this.birthtimeMs = birthtimeMs;
        this.atime = new Date(this.atimeMs);
        this.mtime = new Date(this.mtimeMs);
        this.ctime = new Date(this.ctimeMs);
        this.birthtime = new Date(this.birthtimeMs);
    }

    public isFile(): boolean {
        return (this.mode & S_IFMT) === S_IFREG;
    }
    public isDirectory(): boolean {
        return (this.mode & S_IFMT) === S_IFDIR;
    }
    public isSymbolicLink(): boolean {
        return (this.mode & S_IFMT) === S_IFLNK;
    }
    public isBlockDevice(): boolean {
        return (this.mode & S_IFMT) === S_IFBLK;
    }
    public isCharacterDevice(): boolean {
        return (this.mode & S_IFMT) === S_IFCHR;
    }
    public isFIFO(): boolean {
        return (this.mode & S_IFMT) === S_IFIFO;
    }
    public isSocket(): boolean {
        return (this.mode & S_IFMT) === S_IFSOCK;
    }
}

/**
 * A template used to populate files, directories, links, etc. in a virtual file system.
 */
export interface FileSet {
    [name: string]: DirectoryLike | FileLike | Link | Symlink | Mount | Rmdir | Unlink | null | undefined; // eslint-disable-line no-restricted-syntax
}

export type DirectoryLike = FileSet | Directory;
export type FileLike = File | Buffer | string;

/** Extended options for a directory in a `FileSet` */
export class Directory {
    public readonly files: FileSet;
    public readonly meta: Record<string, any> | undefined;
    constructor(files: FileSet, { meta }: { meta?: Record<string, any>; } = {}) {
        this.files = files;
        this.meta = meta;
    }
}

/** Extended options for a file in a `FileSet` */
export class File {
    public readonly data: Buffer | string;
    public readonly encoding: string | undefined;
    public readonly meta: Record<string, any> | undefined;
    constructor(data: Buffer | string, { meta, encoding }: { encoding?: string; meta?: Record<string, any>; } = {}) {
        this.data = data;
        this.encoding = encoding;
        this.meta = meta;
    }
}

export class SameFileContentFile extends File {
    constructor(data: Buffer | string, metaAndEncoding?: { encoding?: string; meta?: Record<string, any>; }) {
        super(data, metaAndEncoding);
    }
}

export class SameFileWithModifiedTime extends File {
    constructor(data: Buffer | string, metaAndEncoding?: { encoding?: string; meta?: Record<string, any>; }) {
        super(data, metaAndEncoding);
    }
}

/** Extended options for a hard link in a `FileSet` */
export class Link {
    public readonly path: string;
    constructor(path: string) {
        this.path = path;
    }
}

/** Removes a directory in a `FileSet` */
export class Rmdir {
    public _rmdirBrand?: never; // brand necessary for proper type guards
}

/** Unlinks a file in a `FileSet` */
export class Unlink {
    public _unlinkBrand?: never; // brand necessary for proper type guards
}

/** Extended options for a symbolic link in a `FileSet` */
export class Symlink {
    public readonly symlink: string;
    public readonly meta: Record<string, any> | undefined;
    constructor(symlink: string, { meta }: { meta?: Record<string, any>; } = {}) {
        this.symlink = symlink;
        this.meta = meta;
    }
}

/** Extended options for mounting a virtual copy of an external file system via a `FileSet` */
export class Mount {
    public readonly source: string;
    public readonly resolver: FileSystemResolver;
    public readonly meta: Record<string, any> | undefined;
    constructor(source: string, resolver: FileSystemResolver, { meta }: { meta?: Record<string, any>; } = {}) {
        this.source = source;
        this.resolver = resolver;
        this.meta = meta;
    }
}


type FileDataBuffer = { encoding?: undefined; data: Buffer; } | { encoding: BufferEncoding; data: string; };

async function retry<T>(f:()=>T){
  try{
    return f();
  }catch(_e){
    const e=_e as any;
    if(e.retryPromise){
      await e.retryPromise;
      return f();
    }else{
      throw e;
    }
  }
}
export class FileSystem_Promises {
    constructor(public fs:FileSystem){}
  
  async appendFile(...args:Parameters<FileSystem["appendFileSync"]>) {
      return await retry(()=>this.fs.appendFileSync(...args));
  }
  async access(...args:Parameters<FileSystem["accessSync"]>) {
      return await retry(()=>this.fs.accessSync(...args));
  }
  async close(...args:Parameters<FileSystem["closeSync"]>) {
      return await retry(()=>this.fs.closeSync(...args));
  }
  async cp(...args:Parameters<FileSystem["cpSync"]>) {
      return await retry(()=>this.fs.cpSync(...args));
  }
  async exists(...args:Parameters<FileSystem["existsSync"]>) {
      return await retry(()=>this.fs.existsSync(...args));
  }
  async link(...args:Parameters<FileSystem["linkSync"]>) {
      return await retry(()=>this.fs.linkSync(...args));
  }
  async lstat(...args:Parameters<FileSystem["lstatSync"]>) {
      return await retry(()=>this.fs.lstatSync(...args));
  }
  async mkdir(...args:Parameters<FileSystem["mkdirSync"]>) {
      return await retry(()=>this.fs.mkdirSync(...args));
  }
  async open(...args:Parameters<FileSystem["openSync"]>) {
      return await retry(()=>this.fs.openSync(...args));
  }
  async readdir(...args:Parameters<FileSystem["readdirSync"]>) {
      return await retry(()=>this.fs.readdirSync(...args));
  }
  async readFile(...args:Parameters<FileSystem["readFileSync"]>) {
      return await retry(()=>this.fs.readFileSync(...args));
  }
  async readlink(...args:Parameters<FileSystem["readlinkSync"]>) {
      return await retry(()=>this.fs.readlinkSync(...args));
  }
  async realpath(...args:Parameters<FileSystem["realpathSync"]>) {
      return await retry(()=>this.fs.realpathSync(...args));
  }
  async rename(...args:Parameters<FileSystem["renameSync"]>) {
      return await retry(()=>this.fs.renameSync(...args));
  }
  async rm(...args:Parameters<FileSystem["rmSync"]>) {
      return await retry(()=>this.fs.rmSync(...args));
  }
  async rmdir(...args:Parameters<FileSystem["rmdirSync"]>) {
      return await retry(()=>this.fs.rmdirSync(...args));
  }
  async stat(...args:Parameters<FileSystem["statSync"]>) {
      return await retry(()=>this.fs.statSync(...args));
  }
  async symlink(...args:Parameters<FileSystem["symlinkSync"]>) {
      return await retry(()=>this.fs.symlinkSync(...args));
  }
  async unlink(...args:Parameters<FileSystem["unlinkSync"]>) {
      return await retry(()=>this.fs.unlinkSync(...args));
  }
  async utimes(...args:Parameters<FileSystem["utimesSync"]>) {
      return await retry(()=>this.fs.utimesSync(...args));
  }
  async writeFile(...args:Parameters<FileSystem["writeFileSync"]>) {
      return await retry(()=>this.fs.writeFileSync(...args));
  }
  async write(...args:Parameters<FileSystem["writeSync"]>) {
      return await retry(()=>this.fs.writeSync(...args));
  }
}
    /*
const cmt=[
  "chown",
  "chmod",
  "copyFile",
  "fchown",
  "fchmod",
  "fdatasync",
  "fstat",
  "fsync",
  "ftruncate",
  "futimes",
  "lchown",
  "lchmod",
  "lutimes",
  "mkdtemp",
  "read",
  "readv",
  "statfs",
  "truncate",
  "writev",
  "opendir"
];
return Object.keys(fs)
[
  'appendFileSync', 'accessSync',    'chownSync',
  'chmodSync',      'closeSync',     'copyFileSync',
  'cpSync',         'existsSync',    'fchownSync',
  'fchmodSync',     'fdatasyncSync', 'fstatSync',
  'fsyncSync',      'ftruncateSync', 'futimesSync',
  'lchownSync',     'lchmodSync',    'linkSync',
  'lstatSync',      'lutimesSync',   'mkdirSync',
  'mkdtempSync',    'openSync',      'readdirSync',
  'readSync',       'readvSync',     'readFileSync',
  'readlinkSync',   'realpathSync',  'renameSync',
  'rmSync',         'rmdirSync',     'statSync',
  'statfsSync',     'symlinkSync',   'truncateSync',
  'unlinkSync',     'utimesSync',    'writeFileSync',
  'writeSync',      'writevSync',    'opendirSync'
].filter(s=>s.endsWith("Sync")).
map(s=>s.substring(0,s.length-4)).
filter(s=>!cmt.includes(s)).
map(s=>`
${s}(...a:any[]){
    const callback=a.pop();
    return this.promises.${s}(
        ...(a as Parameters<FileSystem["promises"]["${s}"]>)).then(
        (r)=>callback(null,r),(e)=>callback(e));
}`).join("");*/
/*
async ${s}(...args:Parameters<FileSystem["${s}Sync"]>) {
    return await retry(()=>this.fs.${s}Sync(...args));
}`).join("")
*/
