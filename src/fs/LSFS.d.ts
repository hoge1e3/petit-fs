import FS, { Dirent } from "./FSClass.js";
import Content from "./Content.js";
import RootFS, { Stats } from "./RootFS.js";
type StatsEx = Stats & {
    linkPath: string | undefined;
};
declare function now(): number;
export type MetaInfo = {
    lastUpdate: number;
    link?: string;
    trashed?: boolean;
};
export type LSFSOptions = {
    readOnly?: boolean;
};
export type DirInfo = {
    [key: string]: MetaInfo;
};
export type Storage = {
    [key: string]: string;
};
interface CacheableStorage {
    getContentItem(regPath: string): Content;
    hasContentItem(regPath: string): boolean;
    setContentItem(regPath: string, c: Content): void;
    removeContentItem(regPath: string): void;
    getDirInfoItem(dirPath: string): DirInfo;
    hasDirInfoItem(dirPath: string): boolean;
    setDirInfoItem(dirPath: string, d: DirInfo): void;
    removeDirInfoItem(dirPath: string): void;
}
declare class NoCacheStorage implements CacheableStorage {
    storage: Storage;
    mountPoint: string;
    constructor(storage: Storage, mountPoint: string);
    private getItem;
    private itemExists;
    private setItem;
    private removeItem;
    getContentItem(regPath: string): Content;
    hasContentItem(regPath: string): boolean;
    setContentItem(regPath: string, content: Content): void;
    removeContentItem(regPath: string): void;
    getDirInfoItem(dpath: string): DirInfo;
    hasDirInfoItem(dpath: string): boolean;
    setDirInfoItem(dpath: string, d: DirInfo): void;
    removeDirInfoItem(dpath: string): void;
}
type CacheStatus<T> = {
    value: T;
} | "deleted";
declare class CachedStorage implements CacheableStorage {
    storage: Storage;
    mountPoint: string;
    raw: NoCacheStorage;
    dirInfoCache: Map<string, CacheStatus<DirInfo>>;
    contentCache: Map<string, CacheStatus<Content>>;
    htimer: any;
    hasUncommited(): boolean;
    private wakeTimer;
    private commit;
    reservedDirInfos: Set<string>;
    reservedContents: Set<string>;
    constructor(storage: Storage, mountPoint: string);
    getContentItem(regPath: string): Content;
    hasContentItem(regPath: string): boolean;
    setContentItem(regPath: string, c: Content): void;
    removeContentItem(regPath: string): void;
    getDirInfoItem(dpath: string): DirInfo;
    hasDirInfoItem(dpath: string): boolean;
    setDirInfoItem(dpath: string, d: DirInfo): void;
    removeDirInfoItem(dpath: string): void;
}
export declare class LSFS extends FS {
    storage: Storage;
    baseTimestamp: number;
    cachedStorage: CachedStorage;
    readOnly: boolean;
    hasUncommited(): boolean;
    constructor(rootFS: RootFS, mountPoint: string, storage: Storage, { readOnly }?: LSFSOptions);
    static meta2dirent(parentPath: string, fixedName: string, lstat: Stats): Dirent;
    static ramDisk(rootFS: RootFS, mountPoint: string, options?: LSFSOptions): LSFS;
    static now: typeof now;
    private size;
    private getDirInfo;
    private putDirInfo;
    private _touch;
    private removeEntry;
    private isRAM;
    private fixPath;
    fstype(): "localStorage" | "ramDisk";
    isReadOnly(): boolean;
    getContent(path: string): Content;
    setContent(path: string, content: Content): void;
    appendContent(path: string, content: Content): void;
    lstat(path: string): StatsEx;
    setMtime(path: string, time: number): void;
    private setMetaInfo;
    mkdir(path: string): void;
    opendir(path: string): string[];
    opendirent(path: string): Dirent[];
    direntOfMountPoint(): Dirent;
    rm(path: string): void;
    exists(path: string): boolean;
    link(path: string, to: string): void;
    isLink(path: string): string | undefined;
    touch(path: string): void;
    static getUsage(): number;
    static getCapacity(): {
        using: number;
        max: number;
    };
}
export default LSFS;
