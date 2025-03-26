import {assert as _assert} from "chai";
import {fs,path} from "../src/index.js";
await fs.mount("/idb/","idb");
import { Buffer } from "buffer";
import {FileSystemFactory,SFile,Content, DirectoryOptions, DirTree, MetaInfo, ExcludeOption, ExcludeHash, getNodeFS} from "@hoge1e3/sfile";
const FS=new FileSystemFactory({
    fs:   fs as unknown as typeof import("fs"),
    path: path as unknown as typeof import("path"),
    Buffer,
});
const root=FS.get("/");
const idbdir=root.rel("idb/");
idbdir.rel("README.txt").appendText("Hello");


