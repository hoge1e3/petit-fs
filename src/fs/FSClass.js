import Util from "./Util.js";
import assert from "./assert.js";
import P from "./PathUtil.js";
import M from "./MIMETypes.js";
const extend=Util.extend;
var FS = function (rootFS, mountPoint) {
    this.rootFS = rootFS;
    this.mountPoint = mountPoint;
};
var fstypes = {};
FS.addFSType = function (name, factory, asyncOptions={}) {
    fstypes[name] = {factory,asyncOptions};
};
FS.availFSTypes = function () {
    return fstypes;
};
function stub(n) {
    throw new Error(n + " is STUB!");
}


extend(FS.prototype, {
    err: function (path, mesg) {
        throw new Error(path + ": " + mesg);
    },
    fstype: function () {
        return "Unknown";
    },
    isReadOnly: function (path, options) {// mainly for check ENTIRELY read only
        stub("isReadOnly");
    },
    supportsSync: function () {
        return true;
    },
    resolveFS: function (path, options) {
        assert(this.getRootFS() !== this);
        return this.getRootFS().resolveFS(path);
    },
    hasUncommited() {
        return false;
    },
    /*mounted: function (rootFS, mountPoint) {
        //assert.is(arguments,[FS,P.AbsDir]);
        this.rootFS = rootFS;
        this.mountPoint = mountPoint;
    },*/
    inMyFS: function (path) {
        return P.startsWith(P.truncSEP(path), P.truncSEP(this.mountPoint));
    },
    /*dirFromFstab: function (path, options) {
        assert.is(path, P.AbsDir);
        var res=(options||{}).res || [];
        this.fstab().forEach(function (tb) {
            if (P.up( tb.path )==path) res.push(P.name(tb.path));
        });
        return res;
    },*/
    getRootFS: function () {
        return assert(this.rootFS, "rootFS is not set");
    },
    //-------- end of mouting
    //-------- spec
    getReturnTypes: function (path, options) {
        //{getContent:String|DataURL|ArrayBuffer|OutputStream|Writer
        //   ,opendir:Array|...}
        stub("");
    },
    //-------  for file
    getContent: function (path, options) {
        // options:{type:String|DataURL|ArrayBuffer|OutputStream|Writer}
        // succ : [type],
        stub("getContent");
    },
    size: function (path) {
        var c = this.getContent(path, { type: ArrayBuffer });
        var l = c.toBin().byteLength;
        return l;
    },
    setContent: function (path, content, options) {
        // content: String|ArrayBuffer|InputStream|Reader
        stub("");
    },
    appendContent: function (/*path,content*/) {
        stub("appendContent");
    },
    getMetaInfo: function (path, options) {
        stub("");
    },
    setMetaInfo: function (path, info, options) {
        stub("");
    },
    mkdir: function (path, options) {
        stub("mkdir");
    },
    touch: function (path) {
        stub("touch");
    },
    exists: function (path, options) {
        // exists return false if path is existent by follwing symlink
        stub("exists");
    },
    opendir: function (path, options) {
        //ret: [String] || Stream<string> // https://nodejs.org/api/stream.html#stream_class_stream_readable
        stub("opendir");
    },
    copyFile: function (path, dst, options) {
        assert.is(arguments, [P.Absolute, P.Absolute]);
        this.assertExist(path);
        options = options || {};
        const srcIsDir = this.isDir(path);
        const dstfs = this.getRootFS().resolveFS(dst);
        const dstIsDir = dstfs.isDir(dst);
        if (!srcIsDir && !dstIsDir) {
            const cont = this.getContent(path);
            const res = dstfs.setContent(dst, cont);
            if (options.a) {
                dstfs.setMetaInfo(dst, this.getMetaInfo(path));
            }
            return res;
        } else {
            throw new Error("only file to file supports");
        }
    },
    /*mv: function (path, to, options) {
        this.cp(path, to, options);
        return this.rm(path, { r: true });
    },*/
    rm: function (path, options) {
        stub("");
    },
    link: function (path, to, options) {
        throw new Error("ln " + to + " " + path + " : This FS not support link.");
    },
    isLink(path) {
        stub("isLink");
    },
    getURL: function (path) {
        stub("");
    },
    onAddObserver: function (path) {
    }
});
//res=[]; for (var k in a) { res.push(k); } res;
/*
FS.delegateMethods = function (prototype, methods) {
    function w(n) {
        assert.ne(n, "inMyFS");
        prototype[n] = function () {
            var path = arguments[0];
            assert.is(path, P.Absolute);
            var fs = this.resolveFS(path);
            //console.log(n, f.fs===this  ,f.fs, this);
            if (fs !== this) {
                console.log("Invoked for other fs", this.mountPoint, fs.mountPoint);
                //arguments[0]=f.path;
                return fs[n].apply(fs, arguments);
            } else {
                return methods[n].apply(this, arguments);
            }
        };
    }
    for (var n in methods) w(n);
};*/
/*FS.delegateMethods*/Object.assign(FS.prototype, {
    assertWriteable: function (path) {
        if (this.isReadOnly(path)) this.err(path, "read only.");
    },
    getContentType: function (path, options) {
        var e = (P.ext(path) + "").toLowerCase();
        return M[e] || (options || {}).def || "application/octet-stream";
    },
    getBlob: function (path, options) {
        var c = this.getContent(path);
        options = options || {};
        options.blobType = options.blobType || Blob;
        options.binType = options.binType || ArrayBuffer;
        if (c.hasPlainText()) {
            return new options.blobType([c.toPlainText()], this.getContentType(path));
        } else {
            return new options.blobType([c.toBin(options.binType)], this.getContentType(path));
        }
    },
    isText: function (path) {
        var m = this.getContentType(path);
        return P.startsWith(m, "text");
    },
    assertExist: function (path, options) {
        if (!this.exists(path, options)) {
            this.err(path, "No such file or directory");
        }
    },
    isDir: function (path, options) {
        return P.isDir(path);
    },
    find: function (path, options) {
        assert.is(arguments, [P.Absolute]);
        var ls = this.opendir(path, options);
        var t = this;
        var res = [path];
        ls.forEach(function (e) {
            var ep = P.rel(path, e);
            if (P.isDir(ep)) {
                var fs = t.resolveFS(ep);
                res = res.concat(
                    fs.find(ep, options)
                );
            } else {
                res.push(ep);//getPathFromRootFS
            }
        });
        return res;
    },
    resolveLink: function (path) {
        assert.is(path, P.Absolute);
        // returns non-link path
        // ln -s /a/b/ /c/d/
        // resolveLink /a/b/    ->  /a/b/
        // resolveLink /c/d/e/f -> /a/b/e/f
        // resolveLink /c/d/non_existent -> /a/b/non_existent
        // isLink      /c/d/    -> /a/b/
        // isLink      /c/d/e/f -> null
        // ln /testdir/ /ram/files/
        // resolveLink /ram/files/sub/test2.txt -> /testdir/sub/test2.txt
        // path=/ram/files/test.txt
        for (var p = path; p; p = P.up(p)) {
            assert(!this.mountPoint || P.startsWith(p, this.mountPoint), p + " is out of mountPoint. path=" + path);
            var l = this.isLink(p);  // p=/ram/files/ l=/testdir/
            if (l) {
                assert(l != p, "l==p==" + l);
                //        /testdir/    test.txt
                var np = P.rel(l, P.relPath(path, p));  //   /testdir/test.txt
                assert(np != path, "np==path==" + np);
                return assert.is(this.getRootFS().resolveFS(np).resolveLink(np), P.Absolute);
            }
            if (this.exists(p)) return path;
        }
        return path;
    },
    isLink: function (path) {
        return null;
    },
    opendirEx: function (path, options) {
        assert.is(path, P.AbsDir);
        var ls = this.opendir(path);
        var t = this;
        var dest = {};
        ls.forEach(function (f) {
            var p = P.rel(path, f);
            dest[f] = t.getMetaInfo(p);
        });
        return dest;
    },
    getDirTree: function (path, options) {
        options = options || {};
        var dest = options.dest = options.dest || {};
        options.style = options.style || "flat-absolute";
        let excludesFunc=options.excludes;
        if (typeof options.excludes==="function") {
            excludesFunc=options.excludes;
        } else {
            const excludesAry = options.excludes || [];
            assert.is(excludesAry, Array);
            const defaultExcludes=({fullPath, relPath, ...options})=>{
                switch (options.style) {
                    case "flat-relative":
                    case "hierarchical":
                        if (excludesAry.indexOf(relPath) >= 0) {
                            return true;
                        }
                        break;
                    case "flat-absolute":
                        if (excludesAry.indexOf(fullPath) >= 0) {
                            return true;
                        }
                        break;
                }
                return false;
            };
            excludesFunc=defaultExcludes;
        }
        if (!options.base) {
            options.base = path;
        }
        assert.is(path, P.AbsDir);
        var tr = this.opendirEx(path, options);
        if (options.style == "no-recursive") return tr;
        var t = this;
        for (let fname in tr) {
            var meta = tr[fname];
            const fullPath = P.rel(path, fname);
            const relPath = P.relPath(fullPath, options.base);
            if (excludesFunc({fullPath, relPath,  ...options})) continue;
            if (t.isDir(fullPath)) {
                switch (options.style) {
                    case "flat-absolute":
                    case "flat-relative":
                        t.getDirTree(fullPath, options);
                        break;
                    case "hierarchical":
                        options.dest = {};
                        dest[fname] = t.getDirTree(fullPath, options);
                        break;
                }
            } else {
                switch (options.style) {
                    case "flat-absolute":
                        dest[fullPath] = meta;
                        break;
                    case "flat-relative":
                        dest[relPath] = meta;
                        break;
                    case "hierarchical":
                        dest[fname] = meta;
                        break;
                }
            }
        }
        return dest;
    }

});
export default FS;
//});
