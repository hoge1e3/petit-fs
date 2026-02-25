import { Canonical, Fstab } from "../types.js";
import { LSFSOptions, FSFactory, FSType, FSTypeName, FSTypeOptions, IFileSystem, IRootFS, Observer, ObserverEvent, ObserverHandler } from "./types.js";
export default class RootFS implements IRootFS {
    static fstypes: Record<FSTypeName, FSType>;
    static addFSType(name: FSTypeName, factory: FSFactory, asyncOptions?: FSTypeOptions): void;
    static availFSTypes(): Record<string, FSType>;
    fstabMap: WeakMap<IFileSystem, Fstab>;
    _fstab: IFileSystem[];
    observers: Observer[];
    /**
     @deprecated use df() instead
    */
    fstab(): IFileSystem[];
    df(): IFileSystem[];
    currentFstab(): Fstab[];
    hasUncommited(): boolean;
    commitPromise(): Promise<void[]>;
    unmount(_path: string): boolean;
    mount(mountPoint: string, _fs: FSTypeName, options?: LSFSOptions): IFileSystem;
    mountAsync(mountPoint: string, _fs: FSTypeName, options?: LSFSOptions): Promise<IFileSystem>;
    bindFstab(fs: IFileSystem, arg: Fstab): void;
    resolveFS(path: string): IFileSystem;
    addObserver(path: Canonical, f: ObserverHandler): {
        path: Canonical;
        handler: ObserverHandler;
        remove: () => void;
    };
    notifyChanged(path: Canonical, metaInfo: ObserverEvent): void;
    getRootFS(): this;
}
