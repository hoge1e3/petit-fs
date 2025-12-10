/**
 * @typedef FileSystem {import("./FSClass").FileSystem}
 */
import { LSFSOptions } from "./LSFS";
import { Canonical } from "../types.js";
import { FSFactory, FSType, FSTypeName, FSTypeOptions, IFileSystem, IRootFS, Observer, ObserverEvent, ObserverHandler } from "./types.js";
export default class RootFS implements IRootFS {
    static fstypes: Record<FSTypeName, FSType>;
    static addFSType(name: FSTypeName, factory: FSFactory, asyncOptions?: FSTypeOptions): void;
    static availFSTypes(): Record<string, FSType>;
    _fstab: IFileSystem[];
    observers: Observer[];
    fstab(): IFileSystem[];
    hasUncommited(): boolean;
    commitPromise(): Promise<void[]>;
    unmount(_path: string): boolean;
    mount(mountPoint: string, _fs: IFileSystem | FSTypeName, options?: LSFSOptions): IFileSystem;
    mountAsync(mountPoint: string, _fs: FSTypeName, options?: LSFSOptions): Promise<IFileSystem>;
    resolveFS(path: string): IFileSystem;
    addObserver(path: Canonical, f: ObserverHandler): {
        path: Canonical;
        handler: ObserverHandler;
        remove: () => void;
    };
    notifyChanged(path: Canonical, metaInfo: ObserverEvent): void;
    getRootFS(): this;
}
