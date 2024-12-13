//import * as collections from "./collectionsImpl";
//import * as documents from "./documentsUtil";
//import * as Harness from "./_namespaces/Harness.js";
//import * as ts from "./_namespaces/ts.js";
//import * as vpath from "./vpathUtil";
//import * as core from "./core";
//import {Buffer} from "buffer";
//import {getRootFS, RootFS, FileSystem as FSClass, PathUtil, MetaInfo} from "@hoge1e3/fs";
import { getRootFS } from "./fs";
import Content from "./fs/Content";
import FSClass, { MetaInfo } from "./fs/FSClass";
import PathUtil from "./fs/PathUtil";
import RootFS from "./fs/RootFS";

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
function meta2stat(m:MetaInfo, isDir: boolean, size: number):Stats {
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
        
        blksize: size,
        blocks: 1,
        dev: ++devCount,
        ino: ++inoCount,
        gid: 0,
        uid: 0,
        mode: 0o777,
        rdev: 0,
        isBlockDevice: ()=>true,
        isDirectory: ()=>isDir,
        isSymbolicLink: ()=>!!m.link,
        isCharacterDevice: ()=>false,
        isFile:()=>true,
        isFIFO:()=>false,
        isSocket:()=>false,
        nlink: 1,
        size,

    }
}
/**
 * Represents a virtual POSIX-like file system.
 */
export class FileSystem {
    
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
    public mountSync(mountPoint: string, resolver: FSClass|string): void {
        const rfs=getRootFS();
        rfs.mount(mountPoint, resolver);
    }

    /**
     * Recursively remove all files and directories underneath the provided path.
     */
    public rimrafSync(path: string): void {
        try {
            const stats = this.lstatSync(path);
            if (stats.isFile() || stats.isSymbolicLink()) {
                this.unlinkSync(path);
            }
            else if (stats.isDirectory()) {
                for (const file of this.readdirSync(path)) {
                    this.rimrafSync(PathUtil.rel(path, file));
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
    public resolveFS(path: string):FSClass{
        const rfs=this.getRootFS();
        return rfs.resolveFS(path)
    }
    public resolveLink(path: string):string {
        const fs=this.resolveFS(path);
        return fs.resolveLink(path);
    }
    public followLink(path: string):[FSClass, string] {
        const lpath=this.resolveLink(path);
        return [this.resolveFS(lpath), lpath];
    }
    /**
     * Make a directory and all of its parent paths (if they don't exist).
     */
    public mkdirpSync(path: string): void {
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
        const fs=this.resolveFS(path);
        // fs.exists returns false if it exists by following symlink.
        while (!fs.exists(path)) {
            const ppath=path;
            // try to follow symlink
            path=fs.resolveLink(path);
            // if it is NOT symlink, it is actually non-existent.
            if (path===ppath) return false;
        }
        return true;
    }

    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/stat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public statSync(path: string): Stats {
        return this.lstatSync(this.resolveLink(path));
    }


    /**
     * Change file access times
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public utimesSync(path: string, atime: Date, mtime: Date): void {
        const [fs, fpath]=this.followLink(path);
        const info=fs.getMetaInfo(fpath);
        info.lastUpdate=mtime.getTime();
        fs.setMetaInfo(fpath, info);
    }

    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/lstat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public lstatSync(path: string): Stats {
        const fs=this.resolveFS(path);
        const m=fs.getMetaInfo(path);
        return meta2stat(m, fs.isDir(path), fs.size(path));
    }

    

    /**
     * Read a directory. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/readdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public readdirSync(path: string): string[] {
        const [fs, fpath]=this.followLink(path);
        return fs.opendir(fpath);
    }

    /**
     * Make a directory.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/mkdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public mkdirSync(path: string): void {
        if (this.isReadonly) throw createIOError("EROFS");
        const [fs, fpath]=this.followLink(path);
        return fs.mkdir(fpath);
    }


    /**
     * Remove a directory.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rmdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public rmdirSync(path: string): void {
        if (this.isReadonly) throw createIOError("EROFS");
        if (!this.statSync(path).isDirectory()) {
            throw new Error(`${path} is not a directory`);
        }
        const [fs, fpath]=this.followLink(path);
        return fs.rm(fpath);        
        
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
        const [fs, fpath]=this.followLink(path);
        return fs.rm(fpath);
    }

    /**
     * Rename a file.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rename.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public renameSync(src: string, dst: string): void {
        if (this.isReadonly) throw createIOError("EROFS");
        if (!this.existsSync(src)) {
            throw new Error(`${src} is not exist`);
        }
        const fs=this.resolveFS(src);
        fs.mv(src, dst);  
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
        const [fs, fpath]=this.followLink(linkpath);
        if (!PathUtil.isAbsolutePath(target)) {
            target=PathUtil.rel(fpath, target)
        }
        fs.link(fpath, target);
    }

    /**
     * Resolve a pathname.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/realpath.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    public realpathSync(path: string): string {
        path=PathUtil.normalize(path);
        return this.resolveLink(path);
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
        const [fs, fpath]=this.followLink(path);
        const c=fs.getContent(fpath);
        if (encoding) {
            return c.toPlainText();
        } else {
            return c.toBin();
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
        const [fs, fpath]=this.followLink(path);
        if (typeof data==="string") {
            fs.setContent(fpath, Content.plainText(data));
        } else {
            fs.setContent(fpath, Content.bin(data));
        }
    }

    public appendFileSync(path: string, data: string | Buffer, encoding: string | null = null): void {
        if (this.isReadonly) throw createIOError("EROFS");
        const [fs, fpath]=this.followLink(path);
        if (typeof data==="string") {
            fs.appendContent(fpath, Content.plainText(data));
        } else {
            fs.appendContent(fpath, Content.bin(data));
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


