import FS, { Dirent } from "./FSClass.js";
import Content from "./Content.js";
import { Stats } from "./RootFS.js";
type StatsEx = Stats & {
    linkPath: string | undefined;
};
declare function now(): number;
export type MetaInfo = {
    lastUpdate: number;
    link?: string;
    trashed?: boolean;
};
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
    static meta2dirent(parentPath: string, fixedName: string, lstat: Stats): Dirent;
    static ramDisk(options?: {
        readOnly: boolean;
    }): LSFS;
    static now: typeof now;
    private resolveKey;
    private size;
    private getItem;
    private itemExists;
    private setItem;
    private removeItem;
    private getDirInfo;
    private setItemWithDirCache;
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
