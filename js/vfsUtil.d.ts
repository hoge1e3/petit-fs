import { Buffer } from "buffer";
import FSClass from "./fs/FSClass";
import RootFS from "./fs/RootFS";
export declare const path: {
    toAbsolute(path: string): string;
    basename(path: string, ext?: string): string;
    resolve(head: string, ...rest: string[]): string;
    join(...paths: string[]): string;
    relative(from: string, to: string): string;
    dirname(path: string): string;
    extname(path: string): string;
};
export declare const os: {
    platform: () => string;
    EOL: string;
};
export declare const process: {
    __fs: FileSystem | undefined;
    _cwd: string;
    env: {};
    argv: never[];
    execArgv: never[];
    pid: number;
    stdout: {
        write(...a: any[]): void;
        columns: number;
    };
    memoryUsage(): {
        heapUsed: number;
    };
    exit(): void;
    __setfs(fs: FileSystem): void;
    cwd(): string;
    chdir(path: string): void;
    nextTick(): void;
};
export declare const timeIncrements = 1000;
export type FdEntry = {
    buffer: Buffer;
    offset: number;
    close: () => void;
};
/**
 * Represents a virtual POSIX-like file system.
 */
export declare class FileSystem {
    fdseq: number;
    fdEntries: Map<number, FdEntry>;
    getRootFS(): RootFS;
    constructor();
    toAbsolutePath(path: string): string;
    /**
     * Gets a value indicating whether the file system is read-only.
     */
    _readOnly: boolean;
    get isReadonly(): boolean;
    /**
     * Makes the file system read-only.
     */
    makeReadonly(): this;
    /**
     * Mounts a physical or virtual file system at a location in this virtual file system.
     *
     * @param mountPoint The path in this virtual file system.
     * @param resolver An object used to resolve files in `source`.
     */
    mountSync(mountPoint: string, resolver: FSClass | string): void;
    /**
     * Recursively remove all files and directories underneath the provided path.
     */
    rimrafSync(path: string): void;
    resolveFS(path: string): [FSClass, string];
    resolveLink(path: string): [FSClass, string];
    /**
     * Make a directory and all of its parent paths (if they don't exist).
     */
    mkdirpSync(path: string): void;
    /**
     * Determines whether a path exists.
     */
    existsSync(path: string): boolean;
    isMountPoint(path: string): FSClass | undefined;
    hasMountPoints(path: string): FSClass[];
    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/stat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    statSync(path: string): Stats;
    /**
     * Change file access times
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    utimesSync(path: string, atime: Date, mtime: Date): void;
    /**
     * Get file status. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/lstat.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    lstatSync(path: string): Stats;
    /**
     * Read a directory. If `path` is a symbolic link, it is dereferenced.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/readdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    readdirSync(path: string): string[];
    /**
     * Make a directory.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/mkdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    mkdirSync(path: string): void;
    /**
     * Remove a directory.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rmdir.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    rmdirSync(path: string): void;
    /**
     * Link one file to another file (also known as a "hard link").
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/link.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    linkSync(oldpath: string, newpath: string): void;
    /**
     * Remove a directory entry.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/unlink.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    unlinkSync(path: string): void;
    /**
     * Rename a file.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/rename.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    renameSync(src: string, dst: string): void;
    /**
     * Make a symbolic link.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/symlink.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    symlinkSync(target: string, linkpath: string): void;
    /**
     * Resolve a pathname.
     *
     * @link http://pubs.opengroup.org/onlinepubs/9699919799/functions/realpath.html
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    realpathSync(path: string): string;
    /**
     * Read from a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    readFileSync(path: string, encoding?: null): Buffer;
    /**
     * Read from a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    readFileSync(path: string, encoding: BufferEncoding): string;
    /**
     * Read from a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    readFileSync(path: string, encoding?: BufferEncoding | null): string | Buffer;
    /**
     * Write to a file.
     *
     * NOTE: do not rename this method as it is intended to align with the same named export of the "fs" module.
     */
    writeFileSync(path: string, data: string | Buffer, encoding?: string | null): void;
    writeSync(fd: number, data: string | Buffer, encoding?: string | null): void;
    appendFileSync(path: string, data: string | Buffer, encoding?: string | null): void;
    watch(path: string, ...opts: any[]): void;
    watchFile(path: string, ...opts: any[]): void;
    openSync(path: string, mode: string): number;
    closeSync(fd: number): void;
}
export interface FileSystemOptions {
    time?: number;
    files?: FileSet;
    cwd?: string;
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
    statSync(path: string): {
        mode: number;
        size: number;
    };
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
export declare function createResolver(host: FileSystemResolverHost): FileSystemResolver;
export declare class Stats {
    dev: number;
    ino: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    rdev: number;
    size: number;
    blksize: number;
    blocks: number;
    atimeMs: number;
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
    constructor();
    constructor(dev: number, ino: number, mode: number, nlink: number, rdev: number, size: number, blksize: number, blocks: number, atimeMs: number, mtimeMs: number, ctimeMs: number, birthtimeMs: number);
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
declare const TemplateIOErrorMessages: {
    readonly EACCES: "access denied";
    readonly EIO: "an I/O error occurred";
    readonly ENOENT: "no such file or directory";
    readonly EEXIST: "file already exists";
    readonly ELOOP: "too many symbolic links encountered";
    readonly ENOTDIR: "no such directory";
    readonly EISDIR: "path is a directory";
    readonly EBADF: "invalid file descriptor";
    readonly EINVAL: "invalid value";
    readonly ENOTEMPTY: "directory not empty";
    readonly EPERM: "operation not permitted";
    readonly EROFS: "file system is read-only";
};
export declare const IOErrorMessages: typeof TemplateIOErrorMessages;
export declare function createIOError(code: keyof typeof IOErrorMessages, details?: string): NodeJS.ErrnoException;
/**
 * A template used to populate files, directories, links, etc. in a virtual file system.
 */
export interface FileSet {
    [name: string]: DirectoryLike | FileLike | Link | Symlink | Mount | Rmdir | Unlink | null | undefined;
}
export type DirectoryLike = FileSet | Directory;
export type FileLike = File | Buffer | string;
/** Extended options for a directory in a `FileSet` */
export declare class Directory {
    readonly files: FileSet;
    readonly meta: Record<string, any> | undefined;
    constructor(files: FileSet, { meta }?: {
        meta?: Record<string, any>;
    });
}
/** Extended options for a file in a `FileSet` */
export declare class File {
    readonly data: Buffer | string;
    readonly encoding: string | undefined;
    readonly meta: Record<string, any> | undefined;
    constructor(data: Buffer | string, { meta, encoding }?: {
        encoding?: string;
        meta?: Record<string, any>;
    });
}
export declare class SameFileContentFile extends File {
    constructor(data: Buffer | string, metaAndEncoding?: {
        encoding?: string;
        meta?: Record<string, any>;
    });
}
export declare class SameFileWithModifiedTime extends File {
    constructor(data: Buffer | string, metaAndEncoding?: {
        encoding?: string;
        meta?: Record<string, any>;
    });
}
/** Extended options for a hard link in a `FileSet` */
export declare class Link {
    readonly path: string;
    constructor(path: string);
}
/** Removes a directory in a `FileSet` */
export declare class Rmdir {
    _rmdirBrand?: never;
}
/** Unlinks a file in a `FileSet` */
export declare class Unlink {
    _unlinkBrand?: never;
}
/** Extended options for a symbolic link in a `FileSet` */
export declare class Symlink {
    readonly symlink: string;
    readonly meta: Record<string, any> | undefined;
    constructor(symlink: string, { meta }?: {
        meta?: Record<string, any>;
    });
}
/** Extended options for mounting a virtual copy of an external file system via a `FileSet` */
export declare class Mount {
    readonly source: string;
    readonly resolver: FileSystemResolver;
    readonly meta: Record<string, any> | undefined;
    constructor(source: string, resolver: FileSystemResolver, { meta }?: {
        meta?: Record<string, any>;
    });
}
type FileDataBuffer = {
    encoding?: undefined;
    data: Buffer;
} | {
    encoding: BufferEncoding;
    data: string;
};
export {};
