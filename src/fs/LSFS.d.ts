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
    private getItem;
    private setItem;
    private removeItem;
    private getDirInfo;
    private putDirInfo;
    private _touch;
    private removeEntry;
    private isRAM;
    fstype(): "localStorage" | "ramDisk";
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
    /** returns true even if it is nonexistent when path ends with '/' */
    isDir(path: string): boolean;
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
