import { fs, path } from "../src/index.js";
await fs.mount("/idb/", "idb");
import { Buffer } from "buffer";
import { FileSystemFactory } from "@hoge1e3/sfile";
const FS = new FileSystemFactory({
    fs: fs,
    path: path,
    Buffer,
});
const root = FS.get("/");
const idbdir = root.rel("idb/");
idbdir.rel("README.txt").appendText("Hello");
//# sourceMappingURL=worker.js.map