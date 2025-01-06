import FS, { Dirent, MetaInfo } from "./FSClass.js";
import Content from "./Content.js";
declare function now(): number;
export type DirInfo = {
    [key: string]: MetaInfo;
};
export type Storage = {
    [key: string]: string;
};
export declare class LSFS extends FS {
    storage: Storage;
    options: {
        readOnly: boolean;
    };
    dirCache: {
        [key: string]: DirInfo;
    };
    baseTimestamp: number;
    constructor(storage: Storage, options?: {
        readOnly: boolean;
    });
    static meta2dirent(parentPath: string, name: string, m: MetaInfo): Dirent;
    static ramDisk(options?: {
        readOnly: boolean;
    }): LSFS;
    static now: typeof now;
    private resolveKey;
    getItem(path: string): string;
    setItem(path: string, value: string): void;
    removeItem(path: string): void;
    itemExists(path: string): boolean;
    getDirInfo(path: string): DirInfo;
    putDirInfo(path: string, dinfo: DirInfo, removed: boolean): void;
    private _touch;
    removeEntry(dinfo: DirInfo, path: string, name: string): void;
    isRAM(): boolean;
    fstype(): "localStorage" | "ramDisk";
    static getUsage(): number;
    static getCapacity(): {
        using: number;
        max: number;
    };
    isReadOnly(): boolean;
    getContent(path: string): Content;
    setContent(path: string, content: Content): void;
    appendContent(path: string, content: Content): void;
    getMetaInfo(path: string): MetaInfo;
    setMetaInfo(path: string, info: MetaInfo): void;
    mkdir(path: string): void;
    opendir(path: string): string[];
    opendirent(path: string): Dirent[];
    rm(path: string): void;
    exists(path: string): boolean;
    isDir(path: string): boolean;
    link(path: string, to: string): void;
    isLink(path: string): string | undefined;
    touch(path: string): void;
    getURL(path: string): string;
}
export default LSFS;
