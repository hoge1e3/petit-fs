import { FileSystem } from "./vfsUtil";
export declare const fs: FileSystem;
export { process, os, path } from "./vfsUtil";
export { Buffer } from "buffer";
export { default as PathUtil } from "./fs/PathUtil";
export { default as Content } from "./fs/Content";
export { getRootFS } from "./fs";
export declare const require: (module: string) => any;
export declare function fakeNodeEnvironment(): void;
