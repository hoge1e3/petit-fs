//define(["assert","PathUtil"],function (A,P) {
import A from "./assert.js";
import P from "./PathUtil.js";
class Env {
    constructor(value) {
        this.value = value;
    }
    expand(str) {
        A.is(str, String);
        var t = this;
        return str.replace(/\$\{([a-zA-Z0-9_]+)\}/g, function (a, key) {
            return t.get(key);
        });
    }
    expandPath(path) {
        A.is(path, String);
        path = this.expand(path);
        path = path.replace(/\/+/g, "/");
        path = path.replace(/^[a-z][a-z]+:\//, function (r) { return r + "/"; });
        return A.is(path, P.Path);
    }
    get(key) {
        return this.value[key];
    }
    set(key, value) {
        this.value[key] = value;
    }
}
export default Env;
//});