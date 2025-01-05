import { FileSystem } from "./vfsUtil.js";
export declare const fs: FileSystem;
export { process, os, path } from "./vfsUtil.js";
export { Buffer } from "buffer";
export { default as PathUtil } from "./fs/PathUtil.js";
export { default as Content } from "./fs/Content.js";
export { getRootFS } from "./fs/index.js";
export declare const require: (module: string) => any;
export declare function fakeNodeEnvironment(): void;
