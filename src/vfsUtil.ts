//import * as collections from "./collectionsImpl";
//import * as documents from "./documentsUtil";
//import * as Harness from "./_namespaces/Harness.js";
//import * as ts from "./_namespaces/ts.js";
//import * as vpath from "./vpathUtil";
//import * as core from "./core";
import {Buffer} from "buffer";
import { getRootFS } from "./fs/index.js";
import Content from "./fs/Content.js";
import FSClass, { Dirent } from "./fs/FSClass.js";
import PathUtil from "./fs/PathUtil.js";
import RootFS, { FSTypeName, ObserverEvent, ObserverHandler } from "./fs/RootFS.js";

export const path={
    isAbsolute(path:string) {
        return PathUtil.isAbsolutePath(path);
    },
    toAbsolute(path:string) {
        if (PathUtil.isAbsolutePath(path)) return path;
        return PathUtil.rel(process.cwd(),path);
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
            res=PathUtil.rel(base, res);
        }
        while(true) {
            const p=paths.shift();
            if (!p) break;
            res=PathUtil.directorify(res);
            res=PathUtil.rel(res, p);
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
};
const pathlib=path;
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
        process.__fs=fs;
    },
    cwd():string {
        return process._cwd;
    },
    chdir(path:string) {
        if (!PathUtil.isAbsolutePath(path)) {
            path=PathUtil.rel(process._cwd,path);
        }
        path=PathUtil.directorify(path);
        const fs=this.__fs;
        if (!fs) throw new Error("fs is not set");
        if (!fs.existsSync(path)) {
            throw new Error(`No such file or directory: ${path}`);
        }
        if (!fs.statSync(path).isDirectory()) {
            throw new Error(`Not a directory: ${path}`);
        }
        process._cwd=path;
    },
    nextTick() {
    },
    versions:{},
};

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
    linkCache=new Map<string, [FSClass, string]>();
    clearLinkCache(){
        this.linkCache=new Map<string, [FSClass, string]>();
    }
    getRootFS():RootFS{
        return getRootFS();
    }
    constructor() {
    }
    toAbsolutePath(path:string) {
        if (PathUtil.isAbsolutePath(path)) return path;
        return PathUtil.rel(process.cwd(), path);
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
    public mountSync(mountPoint: string, resolver: FSClass|FSTypeName, options:any={}): void {
        const rfs=getRootFS();
        mountPoint=PathUtil.directorify(mountPoint);
        rfs.mount(mountPoint, resolver,options);
        this.clearLinkCache();
    }
    public async mount(mountPoint: string, resolver: FSTypeName, options:any={}) {
        const rfs=getRootFS();
        mountPoint=PathUtil.directorify(mountPoint);
        await rfs.mountAsync(mountPoint, resolver);
        this.clearLinkCache();
    }

    /**
     * Recursively remove all files and directories underneath the provided path.
     */
    public rimrafSync(path: string): void {
        path=this.toAbsolutePath(path);
        try {
            const stats = this.lstatSync(path);
            if (stats.isFile() || stats.isSymbolicLink()) {
                this.unlinkSync(path);
            }
            else if (stats.isDirectory()) {
                for (const file of this.readdirSync(path)) {
                    this.rimrafSync(pathlib.join(path, file));
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
    /*private resolveFS(path: string):[FSClass, string] {
        path=this.toAbsolutePath(path);
        const rfs=this.getRootFS();
        const mp=this.isMountPoint(path);
        if (mp) {
            // The only chance that path changes /tmp -> /tmp/ (If /tmp/ is mounted as RAM disk).
            return [mp, mp.mountPoint||"/"]; 
        }
        return [ rfs.resolveFS(path), path];
    }*/
    public resolveLink(path: string):[FSClass,string] {
        const cached=this.linkCache.get(path);
        if (cached) return cached;
        const n=this.resolveLinkNoCache(path);
        this.linkCache.set(path,n);
        return n;
    }
    public resolveLinkNoCache(path: string):[FSClass,string] {
        // This always return fs,path even if it is not exists.
        path=this.toAbsolutePath(path);
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
            // Mount point is never link.
            return [mp, mp.mountPoint||"/"]; 
        }
        const parent=PathUtil.up(path);
        if (!parent) {
            const rfs=this.getRootFS();
            // "/" is never link.
            return [rfs.resolveFS(path),path];
        }
        // path=/a/b/  parent=/a/
        const [rpfs, rppath]=this.resolveLink(parent);
        // rpfs=(fs of /a/)    rppath=/a/ 
        // rp=Resolved Parent. rpfs, rppath have NO link components.
        const rpath=PathUtil.rel(rppath, PathUtil.name(path));
        // rpath = /a/b/ 
        let to=(rpfs.exists(rpath) && rpfs.isLink(rpath));
        // to = /c/d/   (or, to = ../c/d/)
        if (to) {
            if (!PathUtil.isAbsolutePath(to)) {
                to=PathUtil.rel(rppath,to); // rppath=/a/  to= ../c/d/ -> /c/d/
            }
            return this.resolveLink(to);  //  to=/c/d/
        }
        return [rpfs, rpath];  // [pfs=(fs of /a/),  rpath=/a/b/]

        /*while(true) {
            let p,fs;
            // path=/ram/files/sub/test2.txt
            for (p=path; p; p=PathUtil.up(p)) {
                [fs, p]=this.resolveFS(p);
                // p=/ram/files/ l=/testdir/
                const ex=fs.exists(p);//false if path is existent only by follwing symlink
                let to=ex && fs.isLink(p);
                if (to) {
                    // to=/testdir/
                    if (!PathUtil.isAbsolutePath(to)) {
                        to=PathUtil.rel(PathUtil.up(p)!,to);
                    }
                    // p=/ram/files/  rel=sub/test2.txt
                    const rel=PathUtil.relPath(path, p);
                    // path=/testdir/sub/test2.txt
                    path=PathUtil.rel(to, rel);
                    break;
                }
            }
            if (!p) return this.resolveFS(path);
        }*/
    }
    /* Used when refers to link itself, (on unlink etc) */
    public resolveParentLink(path: string):[FSClass,string] {
        /*
        if path is mount point, it should return [FS_at_mount point, path itself]
        if path is symbolic link that points mount point, it should return [FS_of_up(path), path]
        */
        const mfs=this.isMountPoint(path);
        if (mfs){
            return [mfs, path];
        }
        const dir=PathUtil.up(path);
        if (!dir) {
            return this.resolveLink(path);
        }
        const [fs, _dir]=this.resolveLink(dir);
        return [fs, PathUtil.rel(_dir, PathUtil.name(path))];
    }
    /**
     * Make a directory and all of its parent paths (if they don't exist).
     */
    public mkdirpSync(path: string): void {
        path=this.toAbsolutePath(path);
        const p=PathUtil.up(path);
        if (!p) throw new Error("Invalid path state");
        if (!this.existsSync(p)) {
            this.mkdirpSync(p);
        }
        return this.mkdirSync(path);

    }


    // POSIX API (aligns with NodeJS "fs" module API)

    /**
     * Determines whether a path exists.
     */
    public existsSync(path: string): boolean {
        path=this.toAbsolutePath(path);
        let fs;
        [fs,path]=this.resolveParentLink(path);
        // fs.exists returns false if it exists by following symlink.
        return fs.exists(path);
    }
    isMountPoint(path:string):FSClass|undefined{
        path=PathUtil.directorify(path);
        return this.getRootFS().fstab().find((f)=>f.mountPoint===path);
    }
    childrenOfMountPoint(path:string):FSClass[] {
        // this=/mnt/  ,  returns  ["/mnt/fd", "/mnt/cdrom"] ... etc. just a example.
        path=PathUtil.directorify(path);
        return this.getRootFS().fstab().filter(
            (f)=>f.mountPoint && PathUtil.up(f.mountPoint)===path);
    }
    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/stat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public statSync(path: string): Stats {
        return this.lstatSync(this.resolveLink(path)[1]);
    }


    /**
     * Change file access times
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public utimesSync(path: string, atime: Date, mtime: Date): void {
        const [fs, fpath]=this.resolveLink(path);
        fs.setMtime(fpath, mtime.getTime());
    }

    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/lstat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public lstatSync(path: string): Stats {
        path=this.toAbsolutePath(path);
        const [fs,_path]=this.resolveParentLink(path);
        const m=fs.lstat(_path);
        return m;
    }
    public readlinkSync(path: string): string {
        const [fs, fpath]=this.resolveParentLink(path);
        const m=fs.isLink(fpath);
        if (!m) throw new Error(path+": Not a symbolic link");
        return m;
    }
    /**
     * Read a directory. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/readdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public readdirSync(path: string): string[];
    public readdirSync(path: string, opt:{withFileTypes:true}): Dirent[];
    public readdirSync(path: string, opt:{withFileTypes:boolean}={withFileTypes:false}): string[]|Dirent[] {
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
            const res=fs.opendir(fpath).map(n=>PathUtil.truncSEP(n));
            if (mps.length===0) return res;
            for (let f of mps) {
                const n=PathUtil.truncSEP(PathUtil.name(f.mountPoint));
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
    public mkdirSync(path: string, {recursive}:{recursive:boolean}={recursive:false}): void {
        if (this.isReadonly) throw createIOError("EROFS");
        path=PathUtil.directorify(path);
        const [fs, fpath]=this.resolveLink(path);
        if (recursive) {
            const parent=PathUtil.up(fpath)!;
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
    public rmdirSync(path: string, options?:{recursive?:boolean}): void {
        // TODO: if path is symbolic link...??
        if (this.isReadonly) throw createIOError("EROFS");
        if (!this.statSync(path).isDirectory()) {
            throw new Error(`${path} is not a directory`);
        }
        if (options?.recursive) {
            return this.rimrafSync(path);
        }
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
        const [fs, fpath]=this.resolveParentLink(path);
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
        src=this.toAbsolutePath(src);
        dst=this.toAbsolutePath(dst);
        if (this.isReadonly) throw createIOError("EROFS");
        if (!this.existsSync(src)) {
            throw new Error(`${src} is not exist`);
        }
        if (this.existsSync(dst)) {
            throw new Error(`${dst} already exists`);
        }
        this.cpSync(src, dst, {recursive:true});
        this.rimrafSync(src);
        this.clearLinkCache();
    }
    // NOTE: {cp|rename}Sync(src, dst) is equivalent to {cp|mv} [-r] src/* dst/ in UNIX. not {cp|mv} [-r] src dst
    //        src/a.txt is always {copied|moved} to dst/a.txt, never dst/src/a.txt even dst is already a directory.
    public cpSync(_src: string, _dst: string, {recursive}:{recursive:boolean}={recursive:false}): void { 
        _src=this.toAbsolutePath(_src);
        _dst=this.toAbsolutePath(_dst);
        if (this.isReadonly) throw createIOError("EROFS");
        if (!this.existsSync(_src)) {
            throw new Error(`${_src} is not exist`);
        }
        const [dfs,dst]=this.resolveLink(_dst);
        const [sfs,src]=this.resolveLink(_src);
        const sstat=this.lstatSync(src);
        if (sstat.isDirectory()) {
            // skip if src is a symbolic link to a directory
            const slstat=this.lstatSync(_src);
            if (slstat.isSymbolicLink()) return;

            if (!recursive) throw new Error(`${src} is a directory`);
            dfs.mkdir(dst);
            for (const f of this.readdirSync(src, {withFileTypes:true})) {
                const srcp=pathlib.join(src,f.name);
                const dstp=pathlib.join(dst,f.name);
                if (f.isSymbolicLink()||f.isDirectory()) {
                    this.cpSync(srcp, dstp, {recursive});
                } else {
                    dfs.setContent(dstp, sfs.getContent(srcp));
                }
            }
        } else {
            if (this.existsSync(dst) && this.statSync(dst).isDirectory()) {
                throw new Error(`${dst} is a directory`);
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
        if (this.isReadonly) throw createIOError("EROFS");
        const [fs, fpath]=this.resolveLink(linkpath);
        if (!PathUtil.isAbsolutePath(target)) {
            target=PathUtil.rel(fpath, target)
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
    public realpathSync(path: string): string {
        path=this.toAbsolutePath(path);
        path=PathUtil.normalize(path);
        return this.resolveLink(path)[1];
    }

    /**
     * Read from a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public readFileSync(path: string, encoding?: null): Buffer; // eslint-disable-line no-restricted-syntax
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
    public readFileSync(path: string, encoding?: BufferEncoding | null): string | Buffer; // eslint-disable-line no-restricted-syntax
    public readFileSync(path: string, encoding: BufferEncoding | null = null) { // eslint-disable-line no-restricted-syntax
        const [fs, fpath]=this.resolveLink(path);
        if (fs.lstat(fpath).isDirectory()) throw new Error(`Cannot read from directory: ${fpath}`);
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
    public writeFileSync(path: string, data: string | Buffer, encoding: string | null = null): void {
        if (this.isReadonly) throw createIOError("EROFS");
        const [fs, fpath]=this.resolveLink(path);
        if (fs.exists(fpath) && fs.lstat(fpath).isDirectory()) throw new Error(`Cannot write to directory: ${fpath}`);
        if (typeof data==="string") {
            fs.setContent(fpath, Content.plainText(data));
        } else {
            fs.setContent(fpath, Content.bin(data, fs.getContentType(path)));
        }
    }
    public writeSync(fd:number, data: string | Buffer, encoding: string | null = null):void {
        const e=this.fdEntries.get(fd);
        if (!e) throw new Error("Invalid fd");
        const adata=(typeof data==="string"?
            Content.plainText(data).toBin(Buffer) as Buffer:data);
        e.buffer=Buffer.concat([e.buffer, adata]);

    }

    public appendFileSync(path: string, data: string | Buffer, encoding: string | null = null): void {
        if (this.isReadonly) throw createIOError("EROFS");
        const [fs, fpath]=this.resolveLink(path);
        if (fs.exists(fpath) && fs.lstat(fpath).isDirectory()) throw new Error(`Cannot write to directory: ${fpath}`);
        if (typeof data==="string") {
            fs.appendContent(fpath, Content.plainText(data));
        } else {
            fs.appendContent(fpath, Content.bin(data, fs.getContentType(path)));
        }
    }

    public watch(path:string,...opts:any[]){
        path=this.toAbsolutePath(path);
        let sec=opts.shift();
        let options:object, listener:Function;
        if(typeof sec==="function"){
            listener=sec;
            options={};
        }else {
            options=sec||{};
            listener=opts.shift();
        }
        const ob=getRootFS().addObserver(path,function (_path:string, meta:ObserverEvent) {
            listener(meta.eventType, PathUtil.relPath(_path,path), meta );
        });
        return {
            close:()=>ob.remove()
        };
    }
    public watchFile(path: string, ...opts:any[]){
        path=this.toAbsolutePath(path);
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
        path=this.toAbsolutePath(path);
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
        const [fs, fpath]=this.resolveLink(path);
        if (type==="W_OK") {
            if (fs.isReadOnly(fpath)) {
                throw new Error(`${path} is read only.`);
            }
        }
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
                throw new Error("ENOENT: path does not exist");
            }
        },
        readFileSync(path: string): FileDataBuffer {
            return { encoding: "utf8", data: host.readFile(path)! };
        },
    };
}

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

// IOErrorMessages is defined like this to reduce duplication for --isolatedDeclarations
const TemplateIOErrorMessages = {
    EACCES: "access denied",
    EIO: "an I/O error occurred",
    ENOENT: "no such file or directory",
    EEXIST: "file already exists",
    ELOOP: "too many symbolic links encountered",
    ENOTDIR: "no such directory",
    EISDIR: "path is a directory",
    EBADF: "invalid file descriptor",
    EINVAL: "invalid value",
    ENOTEMPTY: "directory not empty",
    EPERM: "operation not permitted",
    EROFS: "file system is read-only",
} as const;
export const IOErrorMessages: typeof TemplateIOErrorMessages = Object.freeze(TemplateIOErrorMessages);

export function createIOError(code: keyof typeof IOErrorMessages, details = ""): NodeJS.ErrnoException {
    const err: NodeJS.ErrnoException = new Error(`${code}: ${IOErrorMessages[code]} ${details}`);
    err.code = code;
    if (Error.captureStackTrace) Error.captureStackTrace(err, createIOError);
    return err;
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


