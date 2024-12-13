import A from "./assert.js";
import _Content from "./Content.js";
import FSClass from "./FSClass.js";
import _Env from "./Env.js";
import _RootFS from "./RootFS.js";
import _LSFS from "./LSFS.js";
import P from "./PathUtil.js";
//import _WebFS from "./WebFS.js";
//import _zip from "./zip.js";
export let assert = A;
export let Content = _Content;
export let Class = FSClass;
export let Env = _Env;
export let LSFS = _LSFS;
export let NativeFS = {available:false};
export let PathUtil = P;
export let RootFS = _RootFS;
//export let WebFS = _WebFS;
//export let zip = _zip;
var rootFS;
var env = new Env({});
export let addFSType = FSClass.addFSType;
export let availFSTypes = FSClass.availFSTypes;

export let setEnvProvider = function (e) {
    env = e;
};
export let getEnvProvider = function () {
    return env;
};
export let setEnv = function (key, value) {
    if (typeof key == "object") {
        for (var k in key) {
            env.set(k, key[k]);
        }
    } else {
        env.set(key, value);
    }
};
export let getEnv = function (key) {
    if (typeof key == "string") {
        return env.get(key);
    } else {
        return env.value;
    }
};
export let localStorageAvailable = function () {
    try {
        // Fails when Secret mode + iframe in other domain
        return (typeof localStorage === "object");
    } catch (e) {
        return false;
    }
};
export let init = function (fs) {
    if (rootFS) return;
    if (!fs) {
        if (FS.NativeFS.available) {
            fs = new FS.NativeFS();
        } else if (FS.localStorageAvailable()) {
            fs = new FS.LSFS(localStorage);
        } else if (typeof importScripts === "function") {
            // Worker
            /* global self*/
            self.addEventListener("message", function (e) {
                var data = e.data;
                if (typeof data === "string") {
                    data = JSON.parse(data);
                }
                switch (data.type) {
                    case "upload":
                        FS.get(data.base).importFromObject(data.data);
                        break;
                    case "observe":
                        rootFS.observe(data.path, function (path, meta) {
                            self.postMessage(JSON.stringify({
                                type: "changed",
                                path: path,
                                content: FS.get(path).text(),
                                meta: meta
                            }));
                        });
                        break;
                }
            });
            fs = FS.LSFS.ramDisk();
        } else {
            fs = FS.LSFS.ramDisk();
        }
    }
    rootFS = (fs instanceof FS.RootFS? fs : new FS.RootFS(fs));
};
export let getRootFS = function () {
    FS.init();
    return rootFS;
};
export let get = function () {
    FS.init();
    return rootFS.get.apply(rootFS, arguments);
};
export let expandPath = function () {
    return env.expandPath.apply(env, arguments);
};
export let resolve = function (path, base) {
    FS.init();
    path = env.expandPath(path);
    if (base && !P.isAbsolutePath(path)) {
        base = env.expandPath(base);
        return FS.get(base).rel(path);
    }
    return FS.get(path);
};
export let mount = function () {
    FS.init();
    return rootFS.mount.apply(rootFS, arguments);
};
export let unmount = function () {
    FS.init();
    return rootFS.unmount.apply(rootFS, arguments);
};
let FS={assert,Content,Class,Env,LSFS,NativeFS,
    PathUtil,RootFS,addFSType,availFSTypes,setEnvProvider,getEnvProvider,
    setEnv,getEnv,localStorageAvailable,init,getRootFS,get,expandPath,resolve,
    mount,unmount};
FS.default=FS;
export {FS as default};