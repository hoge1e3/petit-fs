//import * as collections from "./collectionsImpl";
//import * as documents from "./documentsUtil";
//import * as Harness from "./_namespaces/Harness.js";
//import * as ts from "./_namespaces/ts.js";
//import * as vpath from "./vpathUtil";
//import * as core from "./core";
import { Buffer } from "buffer";
//import {getRootFS, RootFS, FileSystem as FSClass, PathUtil, MetaInfo} from "@hoge1e3/fs";
import { getRootFS } from "./fs/index.js";
import Content from "./fs/Content.js";
import PathUtil from "./fs/PathUtil.js";
export const path = {
    isAbsolute(path) {
        return PathUtil.isAbsolutePath(path);
    },
    toAbsolute(path) {
        if (PathUtil.isAbsolutePath(path))
            return path;
        return PathUtil.rel(process.cwd(), path);
    },
    basename(path, ext) {
        let res = PathUtil.name(path);
        if (ext) {
            return PathUtil.truncSEP(PathUtil.truncExt(res, ext));
        }
        return PathUtil.truncSEP(res);
    },
    resolve(head, ...rest) {
        return this.join(this.toAbsolute(head), ...rest);
    },
    join(...paths) {
        if (paths.length == 0)
            throw new Error(`empty paths`);
        let res = paths.shift();
        let base;
        if (!PathUtil.isAbsolutePath(res)) {
            base = process.cwd();
            res = PathUtil.rel(base, res);
        }
        while (true) {
            const p = paths.shift();
            if (!p)
                break;
            res = PathUtil.directorify(res);
            res = PathUtil.rel(res, p);
        }
        if (base) {
            res = PathUtil.relPath(res, base);
        }
        return res;
    },
    relative(from, to) {
        from = this.toAbsolute(from);
        to = this.toAbsolute(to);
        return PathUtil.relPath(to, PathUtil.directorify(from));
    },
    dirname(path) {
        return PathUtil.up(path);
    },
    extname(path) {
        return PathUtil.ext(path);
    }
};
const pathlib = path;
export const os = {
    platform: () => "browser",
    EOL: "\n",
};
export const process = {
    __fs: undefined,
    _cwd: "/",
    env: {},
    argv: [],
    execArgv: [],
    pid: 0,
    stdout: {
        write(...a) {
            console.log(...a);
        },
        columns: 80,
    },
    memoryUsage() {
        return { heapUsed: 0 };
    },
    exit() {
    },
    __setfs(fs) {
        process.__fs = fs;
    },
    cwd() {
        return process._cwd;
    },
    chdir(path) {
        if (!PathUtil.isAbsolutePath(path)) {
            path = PathUtil.rel(process._cwd, path);
        }
        path = PathUtil.directorify(path);
        const fs = this.__fs;
        if (!fs)
            throw new Error("fs is not set");
        if (!fs.existsSync(path)) {
            throw new Error(`No such file or directory: ${path}`);
        }
        if (!fs.statSync(path).isDirectory()) {
            throw new Error(`Not a directory: ${path}`);
        }
        process._cwd = path;
    },
    nextTick() {
    },
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
const dummyCTime = new Date();
const dummyCTimeMs = dummyCTime.getTime();
function meta2dirent(parentPath, name, m) {
    const dir = name.endsWith("/");
    return {
        name: PathUtil.truncSEP(name),
        parentPath: PathUtil.truncSEP(parentPath),
        isFile: () => !dir,
        isDirectory: () => dir,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => !!m.link,
        isFIFO: () => false,
        isSocket: () => false,
        extra: m,
    };
}
function meta2stat(m, isDir, sizeF) {
    const timeMs = m.lastUpdate;
    const time = new Date(timeMs);
    const dummyATime = new Date();
    const dummyATimeMs = dummyATime.getTime();
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
        isBlockDevice: () => false,
        isDirectory: () => isDir,
        isSymbolicLink: () => !!m.link,
        isCharacterDevice: () => false,
        isFile: () => !isDir,
        isFIFO: () => false,
        isSocket: () => false,
        nlink: 1,
        get size() {
            return sizeF();
        },
    };
}
/**
 * Represents a virtual POSIX-like file system.
 */
export class FileSystem {
    getRootFS() {
        return getRootFS();
    }
    constructor() {
        this.fdseq = 1;
        this.fdEntries = new Map();
        /**
         * Gets a value indicating whether the file system is read-only.
         */
        this._readOnly = false;
    }
    toAbsolutePath(path) {
        if (PathUtil.isAbsolutePath(path))
            return path;
        return PathUtil.rel(process.cwd(), path);
    }
    get isReadonly() {
        return this._readOnly;
        //return Object.isFrozen(this);
    }
    /**
     * Makes the file system read-only.
     */
    makeReadonly() {
        this._readOnly = true;
        return this;
    }
    /**
     * Mounts a physical or virtual file system at a location in this virtual file system.
     *
     * @param mountPoint The path in this virtual file system.
     * @param resolver An object used to resolve files in `source`.
     */
    mountSync(mountPoint, resolver) {
        const rfs = getRootFS();
        mountPoint = PathUtil.directorify(mountPoint);
        rfs.mount(mountPoint, resolver);
    }
    /**
     * Recursively remove all files and directories underneath the provided path.
     */
    rimrafSync(path) {
        path = this.toAbsolutePath(path);
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
            const e = _e;
            if (e.code === "ENOENT")
                return;
            throw e;
        }
    }
    resolveFS(path) {
        path = this.toAbsolutePath(path);
        const rfs = this.getRootFS();
        const mp = this.isMountPoint(path);
        if (mp) {
            // The only chance that path changes /tmp -> /tmp/ (If /tmp/ is mounted as RAM disk).
            return [mp, mp.mountPoint || "/"];
        }
        return [rfs.resolveFS(path), path];
    }
    resolveLink(path) {
        // This always return fs,path even if it is not exists.
        path = this.toAbsolutePath(path);
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
        while (true) {
            let p, fs;
            // path=/ram/files/sub/test2.txt
            for (p = path; p; p = PathUtil.up(p)) {
                [fs, p] = this.resolveFS(p);
                // p=/ram/files/ l=/testdir/
                const ex = fs.exists(p);
                let to = ex && fs.isLink(p);
                if (to) {
                    // to=/testdir/
                    if (!PathUtil.isAbsolutePath(to)) {
                        to = PathUtil.rel(PathUtil.up(p), to);
                    }
                    // p=/ram/files/  rel=sub/test2.txt
                    const rel = PathUtil.relPath(path, p);
                    // path=/testdir/sub/test2.txt
                    path = PathUtil.rel(to, rel);
                    break;
                }
            }
            if (!p)
                return this.resolveFS(path);
        }
    }
    /* Used when refers to link itself, (on unlink etc) */
    resolveParentLink(path) {
        const dir = PathUtil.up(path);
        const [fs, _dir] = this.resolveLink(dir);
        return [fs, PathUtil.rel(_dir, PathUtil.name(path))];
    }
    /*public followLink(path: string):[FSClass, string] {
        const lpath=this.resolveLink(path);
        return [this.resolveFS(lpath)[0], lpath];
    }*/
    /**
     * Make a directory and all of its parent paths (if they don't exist).
     */
    mkdirpSync(path) {
        path = this.toAbsolutePath(path);
        const p = PathUtil.up(path);
        if (!p)
            throw new Error("Invalid path state");
        if (!this.existsSync(p)) {
            this.mkdirpSync(p);
        }
        return this.mkdirSync(path);
    }
    // POSIX API (aligns with NodeJS "fs" module API)
    /**
     * Determines whether a path exists.
     */
    existsSync(path) {
        path = this.toAbsolutePath(path);
        let fs;
        [fs, path] = this.resolveLink(path);
        // fs.exists returns false if it exists by following symlink.
        return fs.exists(path);
    }
    isMountPoint(path) {
        path = PathUtil.directorify(path);
        return this.getRootFS().fstab().find((f) => f.mountPoint === path);
    }
    hasMountPoints(path) {
        path = PathUtil.directorify(path);
        return this.getRootFS().fstab().filter((f) => f.mountPoint && PathUtil.up(f.mountPoint) === path);
    }
    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/stat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    statSync(path) {
        return this.lstatSync(this.resolveLink(path)[1]);
    }
    /**
     * Change file access times
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    utimesSync(path, atime, mtime) {
        const [fs, fpath] = this.resolveLink(path);
        const info = fs.getMetaInfo(fpath);
        info.lastUpdate = mtime.getTime();
        fs.setMetaInfo(fpath, info);
    }
    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/lstat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    lstatSync(path) {
        path = this.toAbsolutePath(path);
        const [fs, _path] = this.resolveFS(path);
        const m = fs.getMetaInfo(_path);
        const isd = fs.isDir(_path);
        const size = () => (isd ? 1 : fs.size(_path));
        return meta2stat(m, isd, size);
    }
    readlinkSync(path) {
        const [fs, fpath] = this.resolveLink(path);
        const m = fs.getMetaInfo(fpath);
        if (!m.link)
            throw new Error(path + ": Not a symbolic link");
        return m.link;
    }
    readdirSync(path, opt = { withFileTypes: false }) {
        const [fs, fpath] = this.resolveLink(path);
        if (opt.withFileTypes) {
            return fs.opendirent(fpath);
        }
        const res = [
            ...fs.opendir(fpath),
            ...this.hasMountPoints(fpath).
                map((f) => f.mountPoint).
                filter((p) => p).map((p) => PathUtil.name(p))
        ];
        return res.map((p) => PathUtil.truncSEP(p));
    }
    /**
     * Make a directory.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/mkdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    mkdirSync(path) {
        if (this.isReadonly)
            throw createIOError("EROFS");
        path = PathUtil.directorify(path);
        const [fs, fpath] = this.resolveLink(path);
        return fs.mkdir(fpath);
    }
    /**
     * Remove a directory.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rmdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    rmdirSync(path, options) {
        if (this.isReadonly)
            throw createIOError("EROFS");
        if (!this.statSync(path).isDirectory()) {
            throw new Error(`${path} is not a directory`);
        }
        if (options === null || options === void 0 ? void 0 : options.recursive) {
            return this.rimrafSync(path);
        }
        const [fs, fpath] = this.resolveParentLink(path);
        return fs.rm(fpath);
    }
    rmSync(path, options) {
        if (options === null || options === void 0 ? void 0 : options.recursive) {
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
    linkSync(oldpath, newpath) {
        throw new Error("Hard link not supported.");
    }
    /**
     * Remove a directory entry.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/unlink.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    unlinkSync(path) {
        if (this.isReadonly)
            throw createIOError("EROFS");
        const [fs, fpath] = this.resolveParentLink(path);
        return fs.rm(fpath);
    }
    /**
     * Rename a file.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rename.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    renameSync(src, dst) {
        src = this.toAbsolutePath(src);
        dst = this.toAbsolutePath(dst);
        if (this.isReadonly)
            throw createIOError("EROFS");
        if (!this.existsSync(src)) {
            throw new Error(`${src} is not exist`);
        }
        const [fs, _src] = this.resolveParentLink(src);
        fs.mv(_src, dst);
    }
    /**
     * Make a symbolic link.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/symlink.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    symlinkSync(target, linkpath) {
        if (this.isReadonly)
            throw createIOError("EROFS");
        if (this.isReadonly)
            throw createIOError("EROFS");
        const [fs, fpath] = this.resolveLink(linkpath);
        if (!PathUtil.isAbsolutePath(target)) {
            target = PathUtil.rel(fpath, target);
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
    realpathSync(path) {
        path = this.toAbsolutePath(path);
        path = PathUtil.normalize(path);
        return this.resolveLink(path)[1];
    }
    readFileSync(path, encoding = null) {
        const [fs, fpath] = this.resolveLink(path);
        if (fs.isDir(fpath))
            throw new Error(`Cannot read from directory: ${fpath}`);
        const c = fs.getContent(fpath);
        if (encoding) {
            return c.toPlainText();
        }
        else {
            return c.toBin();
        }
    }
    /**
     * Write to a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    // eslint-disable-next-line no-restricted-syntax
    writeFileSync(path, data, encoding = null) {
        if (this.isReadonly)
            throw createIOError("EROFS");
        const [fs, fpath] = this.resolveLink(path);
        if (fs.isDir(fpath))
            throw new Error(`Cannot write to directory: ${fpath}`);
        if (typeof data === "string") {
            fs.setContent(fpath, Content.plainText(data));
        }
        else {
            fs.setContent(fpath, Content.bin(data, fs.getContentType(path)));
        }
    }
    writeSync(fd, data, encoding = null) {
        const e = this.fdEntries.get(fd);
        if (!e)
            throw new Error("Invalid fd");
        const adata = (typeof data === "string" ?
            Content.plainText(data).toBin(Buffer) : data);
        e.buffer = Buffer.concat([e.buffer, adata]);
    }
    appendFileSync(path, data, encoding = null) {
        if (this.isReadonly)
            throw createIOError("EROFS");
        const [fs, fpath] = this.resolveLink(path);
        if (fs.isDir(fpath))
            throw new Error(`Cannot write to directory: ${fpath}`);
        if (typeof data === "string") {
            fs.appendContent(fpath, Content.plainText(data));
        }
        else {
            fs.appendContent(fpath, Content.bin(data, fs.getContentType(path)));
        }
    }
    watch(path, ...opts) {
        path = this.toAbsolutePath(path);
        let sec = opts.shift();
        let options, listener;
        if (typeof sec === "function") {
            listener = sec;
            options = {};
        }
        else {
            options = sec || {};
            listener = opts.shift();
        }
        const ob = getRootFS().addObserver(path, function (_path, meta) {
            listener(meta.eventType, PathUtil.relPath(_path, path), meta);
        });
        return {
            close: () => ob.remove()
        };
    }
    watchFile(path, ...opts) {
        path = this.toAbsolutePath(path);
        let sec = opts.shift();
        let options, listener;
        if (typeof sec === "function") {
            listener = sec;
            options = {};
        }
        else {
            options = sec || {};
            listener = opts.shift();
        }
        const inter = options.interval || 5000;
        let prev = this.statSync(path);
        const loop = () => {
            const cur = this.statSync(path);
            if (cur.mtimeMs !== prev.mtimeMs) {
                listener(prev, cur);
                prev = cur;
            }
        };
        setInterval(loop, inter);
    }
    openSync(path, mode) {
        path = this.toAbsolutePath(path);
        const fd = this.fdseq++;
        if (mode == "w" || mode == "a") {
            const buffer = mode == "a" ? this.readFileSync(path) : Buffer.alloc(0);
            const entry = {
                offset: 0,
                buffer, close: () => this.writeFileSync(path, entry.buffer)
            };
            this.fdEntries.set(fd, entry);
        }
        else {
            throw new Error(`Unsupported mode ${mode}`);
        }
        return fd;
    }
    closeSync(fd) {
        const e = this.fdEntries.get(fd);
        if (!e)
            throw new Error("Invalild FD");
        e.close();
        this.fdEntries.delete(fd);
    }
}
export function createResolver(host) {
    return {
        readdirSync(path) {
            const { files, directories } = host.getAccessibleFileSystemEntries(path);
            return directories.concat(files);
        },
        statSync(path) {
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
        readFileSync(path) {
            return { encoding: "utf8", data: host.readFile(path) };
        },
    };
}
export class Stats {
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
    isFile() {
        return (this.mode & S_IFMT) === S_IFREG;
    }
    isDirectory() {
        return (this.mode & S_IFMT) === S_IFDIR;
    }
    isSymbolicLink() {
        return (this.mode & S_IFMT) === S_IFLNK;
    }
    isBlockDevice() {
        return (this.mode & S_IFMT) === S_IFBLK;
    }
    isCharacterDevice() {
        return (this.mode & S_IFMT) === S_IFCHR;
    }
    isFIFO() {
        return (this.mode & S_IFMT) === S_IFIFO;
    }
    isSocket() {
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
};
export const IOErrorMessages = Object.freeze(TemplateIOErrorMessages);
export function createIOError(code, details = "") {
    const err = new Error(`${code}: ${IOErrorMessages[code]} ${details}`);
    err.code = code;
    if (Error.captureStackTrace)
        Error.captureStackTrace(err, createIOError);
    return err;
}
/** Extended options for a directory in a `FileSet` */
export class Directory {
    constructor(files, { meta } = {}) {
        this.files = files;
        this.meta = meta;
    }
}
/** Extended options for a file in a `FileSet` */
export class File {
    constructor(data, { meta, encoding } = {}) {
        this.data = data;
        this.encoding = encoding;
        this.meta = meta;
    }
}
export class SameFileContentFile extends File {
    constructor(data, metaAndEncoding) {
        super(data, metaAndEncoding);
    }
}
export class SameFileWithModifiedTime extends File {
    constructor(data, metaAndEncoding) {
        super(data, metaAndEncoding);
    }
}
/** Extended options for a hard link in a `FileSet` */
export class Link {
    constructor(path) {
        this.path = path;
    }
}
/** Removes a directory in a `FileSet` */
export class Rmdir {
}
/** Unlinks a file in a `FileSet` */
export class Unlink {
}
/** Extended options for a symbolic link in a `FileSet` */
export class Symlink {
    constructor(symlink, { meta } = {}) {
        this.symlink = symlink;
        this.meta = meta;
    }
}
/** Extended options for mounting a virtual copy of an external file system via a `FileSet` */
export class Mount {
    constructor(source, resolver, { meta } = {}) {
        this.source = source;
        this.resolver = resolver;
        this.meta = meta;
    }
}
//# sourceMappingURL=vfsUtil.js.map