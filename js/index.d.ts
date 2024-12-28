import { FileSystem } from "./vfsUtil";
export declare const fs: FileSystem;
export { process, os, path } from "./vfsUtil";
export { Buffer } from "buffer";
export declare const require: (module: string) => any;
export declare function fakeNodeEnvironment(): void;
