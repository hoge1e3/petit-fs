var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { assert as _assert } from "chai";
/*import * as fs from "fs";
import * as path from "path";*/
import { fs, path } from "../src/index.js";
import { Buffer } from "buffer";
import * as zip from "jszip";
import { FileSystemFactory, Content } from "@hoge1e3/sfile";
const assert = Object.assign((b, m) => _assert.ok(b, m), {
    eq: _assert.equal,
    ensureError: _assert.throws,
    //deepStrictEqual: _assert.deepStrictEqual,
});
const _console = console; /*{
    taglist: {
        "metaurl": true,
        "isChildOf": true,
        "Convert Content ": true,
        "Test #": true,
        "Enter": true,
        "lastUpdate": true,
        ".tonyu files in ": true,
        "directories in ": true,
        "files in ": true,
        "hier": true,
        "rel": true,
        "abs": true,
        "k-absk": true,
        "hier, k, path": true,
        "nfsls": true,
        "check same": true,
        "bin dump:": true,
        "ALERT": true,
        "f.getBytes": true,
        "tmp.getBytes": true,
        "bins": true,
        "checkMtime": true,
        "getDirTree-nw": true,
        "text.txt": true,
        "BLOB reading...": true,
        "BLOB read done!": true,
        "buildScrap": true,
        "checkWatch": true,
        getDirTree: true,
        FULLL: false,
    } as {[key:string]:boolean},
    unknownlist: {} as {[key:string]:boolean},
    error: console.error.bind(console),
    log(tag:string, ...args:any[]) {
        if (this.taglist[tag]==null) this.unknownlist[tag]=true;
        else if (!this.taglist[tag]) return;
        console.log(tag,...args);
    }
}*/
const exAttr = { atimeMs: 1, atime: 1, ctimeMs: 1, ctime: 1 };
const timeout = (t) => new Promise(s => setTimeout(s, t));
//const alert:Function=(s:string)=>_console.log("ALERT",s);
export function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let pass = 0;
        //let testf: SFile;
        const cleanups = [];
        try {
            const FS = new FileSystemFactory({
                fs: fs,
                path: path,
                Buffer,
            });
            _console.log("metaurl", import.meta.url);
            //const topDir=FS.get("/");//.sibling("fixture/");
            const root = FS.get("/"); //.setPolicy({topDir});
            const g = globalThis;
            g.root = root;
            g.fs = fs;
            g.path = path;
            g.FS = FS;
            //let cd =root;
            const r = root.rel.bind(root);
            fs.mountSync("/zip/", "ram");
            const zip = r("zip/");
            yield extractFixture(zip);
            const fixture = zip.rel("fixture/");
            const romd = fixture.rel("rom/");
            // check relpath:
            //  path= /a/b/c   base=/a/b/  res=c
            assert.eq(r("a/b/c").relPath(r("a/b/")), "c");
            assert.eq(r("a/b/c").relPath(root.rel("a/b/")), "c");
            //  path= /a/b/c/   base=/a/b/  res=c/
            assert(r("a/b/c/").path().endsWith("/"), "endsWith/ " + r("a/b/c/").path());
            assert(r("a/b/c/").isDirPath(), "dirpath");
            assert.eq(r("a/b/c/").relPath(r("a/b/")), "c/");
            //  path= /a/b/c/   base=/a/b/c/d  res= ../
            assert.eq(r("a/b/c/").relPath(r("a/b/c/d")), "../");
            //  path= /a/b/c/   base=/a/b/e/f  res= ../../c/
            assert.eq(r("a/b/c/").relPath(r("a/b/e/f")), "../../c/");
            // ext()
            assert.eq(root.rel("test.txt").ext(), ".txt");
            //assert.eq(P.normalize("c:\\hoge/fuga\\piyo//"), "c:/hoge/fuga/piyo/");
            _console.log("isChildOf", r("hoge/fuga\\"), (r("hoge\\fuga/piyo//")));
            assert(r("hoge/fuga\\").contains(r("hoge\\fuga/piyo//")), "isChildOf");
            assert(!r("hoge/fugo\\").contains(r("hoge\\fuga/piyo//")), "!isChildOf");
            testContent();
            let ABCD = "abcd\nefg";
            let CDEF = "defg\nてすと";
            //obsolate: ls does not enum mounted dirs
            //assert(r.indexOf("rom/")>=0, r);
            //let romd = root.rel("rom/");
            let ramd = root.rel("ram/");
            if (ramd.exists())
                yield retryRmdir(ramd);
            ramd.mkdir();
            const testfn = root.rel("testfn.txt");
            cleanups.push(() => testfn.exists() && testfn.rm());
            let testdir;
            if (!testfn.exists()) {
                pass = 1;
                _console.log("Test #", pass);
                testdir = root.rel(/*Math.random()*/ "testdir" + "/");
                _console.log("Enter", testdir);
                if (testdir.exists())
                    testdir.rm({ r: true });
                //assert(!testdir.exists(), testdir+" exists");
                testdir.mkdir();
                //--- check exists
                assert(testdir.exists());
                //cleanups.push(()=>testdir.exists() && testdir.rm({r:true}));
                //--- check lastUpdate
                let d = new Date().getTime();
                testfn.text(testdir.path());
                _console.log("lastUpdate", testfn.lastUpdate(), d);
                assert(Math.abs(testfn.lastUpdate() - d) <= 1000);
                testdir.rel("test.txt").text(ABCD);
                _console.log("romd", romd);
                assert(romd.rel("Actor.tonyu").text().length > 0);
                testdir.rel("sub/test2.txt").text(romd.rel("Actor.tonyu").text());
                let tncnt = [];
                const pushtn = (f) => tncnt.push(f.relPath(romd));
                romd.recursive(pushtn, {
                    // Notice: f.ext() !== ".tonyu" only does not work since it skips directories (and *.tonyu file its subdirectories).
                    excludes: (f) => (!f.isDir() && f.ext() !== ".tonyu")
                });
                _console.log(".tonyu files in ", romd, tncnt);
                assert.eq(tncnt.length, 46, "tncnt");
                tncnt = [];
                romd.recursive(pushtn, {
                    excludes: (f) => !f.isDir(),
                    includeDir: true,
                });
                _console.log("directories in ", romd, tncnt);
                assert.eq(tncnt.length, 9, "tncnt");
                tncnt = [];
                let exdirs = ["physics/", "event/", "graphics/"];
                romd.recursive(pushtn, { excludes: exdirs });
                _console.log("files in ", romd + " except", exdirs, tncnt);
                assert.eq(tncnt.length, 33, "tncnt");
                checkGetDirTree(romd);
                assert(testdir.rel("sub/").exists());
                assert(root.rel("testdir/sub/").exists());
                assert(testfn.exists());
                let sf = testdir.setPolicy({ topDir: testdir }); //SandBoxFile.create(testd._clone());
                assert(sf.rel("test.txt").text() == ABCD);
                sf.rel("test3.txt").text(CDEF);
                /*assert.ensureError(function () {
                    let rp = romd.rel("Actor.tonyu").relPath(sf);
                    _console.log(rp);
                })*/ ;
                assert.eq(sf.rel("test3.txt").text(), CDEF);
                assert.ensureError(function () {
                    sf.rel("../rom/Actor.tonyu").text();
                });
                sf.rel("test3.txt").rm();
                assert(!testdir.rel("test3.txt").exists());
                //let ramd=r("ram/");
                ramd.rel("toste.txt").text("fuga");
                /*assert.ensureError(function () {
                    ramd.rel("files").link(testd);
                });*/
                ramd.rel("files/").link(testdir);
                assert(fs.existsSync("/ram/files"), "ram/files not exists");
                assert(fs.existsSync("/ram/files/"), "ram/files/ not exists");
                testdir.rel("sub/del.txt").text("DEL");
                assert(testdir.rel("sub/del.txt").exists(), "del.txt not exists");
                assert(ramd.rel("files/").isLink());
                assert.eq(ramd.rel("files/test.txt").resolveLink().path(), testdir.rel("test.txt").path());
                assert.eq(ramd.rel("files/test.txt").text(), ABCD);
                assert.eq(ramd.rel("files/sub/test2.txt").text(), romd.rel("Actor.tonyu").text());
                assert(fs.existsSync("/ram/files"), "ram/files not exists 2");
                assert(fs.existsSync("/ram/files/"), "ram/files/ not exists 2");
                ramd.rel("files/sub/del.txt").rm();
                assert(!testdir.rel("sub/del.txt").exists());
                ramd.rel("files/").rm();
                assert(testdir.exists());
                //const nfs=topDir;
                _console.log("nfsls", fixture.ls());
                fixture.rel("sub/test2.txt").text(romd.rel("Actor.tonyu").text());
                fixture.rel("test.txt").text(ABCD);
                let pngurl = fixture.rel("Tonyu/Projects/MapTest/images/park.png").dataURL();
                document.body.appendChild(document.createElement("img")).src = pngurl;
                assert(pngurl.startsWith("data:"));
                fixture.rel("sub/test.png").dataURL(pngurl);
                fixture.rel("sub/test.png").copyTo(testdir.rel("test.png"));
                chkCpy(fixture.rel("Tonyu/Projects/MapTest/Test.tonyu"));
                chkCpy(fixture.rel("Tonyu/Projects/MapTest/images/park.png"));
                chkCpy(testdir.rel("test.png"));
                testdir.rel("test.png").rm();
                //---- test append
                let beforeAppend = fixture.rel("Tonyu/Projects/MapTest/Test.tonyu");
                let appended = fixture.rel("Tonyu/Projects/MapTest/TestApp.tonyu");
                beforeAppend.copyTo(appended);
                let apText = "\n//tuikasitayo-n\n";
                appended.appendText(apText);
                assert.eq(beforeAppend.text() + apText, appended.text());
                checkMtime(appended);
                //await checkRemoveError(nfs);
                checkGetDirTree_nw(fixture);
                _console.log("text.txt", testdir.rel("test.txt").path(), testdir.rel("test.txt").text());
                testdir.rel("test.txt").text(romd.rel("Actor.tonyu").text() + ABCD + CDEF);
                chkCpy(testdir.rel("test.txt"));
                testdir.rel("test.txt").text(ABCD);
                //testEach(testd);
                //--- the big file
                //if (typeof localStorage!=="undefined" && !nfs) await chkBigFile(testd);
                //------------------
                // blob->blob
                let f = testdir.rel("hoge.txt");
                f.text("hogefuga");
                checkMtime(f);
                let tmp = testdir.rel("fuga.txt");
                let b = f.getBlob();
                _console.log("BLOB reading...", f.name(), tmp.name());
                yield tmp.setBlob(b);
                checkSame(f, tmp);
                _console.log("BLOB read done!", f.name(), tmp.name());
                tmp.rm();
                f.rm();
                //setTimeout(function () {location.reload();},10000);
                yield asyncTest(testdir);
            }
            else {
                try {
                    pass = 2;
                    _console.log("Test #", pass);
                    //testf = root.rel("testfn.txt");
                    testdir = FS.get(testfn.text());
                    assert(testdir.exists());
                    _console.log("Enter", testdir);
                    assert(testdir.rel("test.txt").text() === ABCD);
                    assert(testdir.rel("sub/").exists());
                    assert(testdir.rel("sub/test2.txt").text() === romd.rel("Actor.tonyu").text());
                    chkRecur(testdir, {}, ["test.txt", "sub/test2.txt"]);
                    //_console.log("testd.size", testd.size());
                    //assert.eq(testd.size(), ABCD.length + testd.rel("sub/test2.txt").size(), "testd.size");
                    eqa(testdir.ls(), ["test.txt", "sub/"]);
                    chkRecur(testdir, { excludes: ["sub/"] }, ["test.txt"]);
                    testdir.rel("test.txt").rm();
                    chkRecur(testdir, {}, ["sub/test2.txt"]);
                    /*_console.log("FULLL", testdir.path());
                    _console.log("FULLL", localStorage[testdir.path()]);
                    chkRecur(testdir, {}, ["test.txt","sub/test2.txt"]);
                    testdir.rel("test.txt").rm();
                    chkRecur(testdir, {}, ["sub/test2.txt"]);*/
                    testdir.rm({ r: true });
                    assert(!testdir.exists());
                    testfn.rm({ r: true });
                    assert(!testfn.exists());
                    assert(!testdir.rel("test.txt").exists());
                    /*await ramd.rel("a/b.txt").text("c").then(function () {
                        return ramd.rel("c.txt").text("d");
                    }).then(function () {
                        return chkRecurAsync(ramd, {}, ["a/b.txt","c.txt"]);
                    });*/
                    /*assert.eq(testdir.rel("sub/test2.txt").text(), romd.rel("Actor.tonyu").text());
                    assert.eq(testdir.rel("test.txt").text(), ABCD);*/
                    let pngurl = fixture.rel("Tonyu/Projects/MapTest/images/park.png").dataURL();
                    document.body.appendChild(document.createElement("img")).src = pngurl;
                    assert.eq(fixture.rel("sub/test.png").dataURL(), pngurl);
                }
                finally {
                }
            }
            if (ramd.exists())
                yield retryRmdir(ramd);
            console.log("passed", "#" + pass);
            if (pass == 1) {
                yield timeout(1000);
                if (typeof location !== "undefined" && !location.href.match(/pass1only/))
                    location.reload();
            }
            else {
                console.log("All test passed.");
            }
        }
        catch (e) {
            console.log(e.stack);
            console.error(e);
            alert("#" + pass + " test Failed. " + e);
            try {
                for (let c of cleanups)
                    c();
            }
            catch (e) {
                _console.error(e);
            }
            //console.log("Unknown tags:", JSON.stringify(_console.unknownlist,null,2))
        }
        /*
        async function chkBigFile(testd: SFile) {
            let cap = LSFS.getCapacity();
            _console.log("usage", cap);
            if (cap.max < 100000000) {
                let len = cap.max - cap.using + 1500;
                let buf = "a";
                while (buf.length < len) buf += buf;
                let bigDir = testd.rel("bigDir/");
                let bigDir2 = bigDir.sibling("bigDir2/");
                if (bigDir2.exists()) bigDir2.rm({ r: 1 });
                let bigFile = bigDir.rel("theBigFile.txt");
                assert.ensureError(function () {
                    _console.log("Try to create the BIG ", buf.length, "bytes file");
                    return bigFile.text(buf);
                });
                assert(!bigFile.exists(), "BIG file remains...?");
                buf = buf.substring(0, cap.max - cap.using - 1500);
                buf = buf.substring(0, buf.length / 10);
                for (let i = 0; i < 6; i++) bigDir.rel("test" + i + ".txt").text(buf);
                await bigDir.moveTo(bigDir2).then(
                    function () { alert("You cannot come here(move big)"); },
                    function (e) {
                        _console.log("Failed Successfully! (move big!)", e);
                        return DU.resolve();
                    }
                ).then(function () {
                    for (let i = 0; i < 6; i++) assert(bigDir.rel("test" + i + ".txt").exists());
                    assert(!bigDir2.exists(), "Bigdir2 (" + bigDir2.path() + ") remains");
                    _console.log("Bigdir removing");
                    bigDir.removeWithoutTrash({ recursive: true });
                    bigDir2.removeWithoutTrash({ recursive: true });
                    assert(!bigDir.exists());
                    _console.log("Bigdir removed!");
                    return DU.resolve();
                });//.then(DU.NOP, DU.E);
            }
        }*/
        function chkCpy(f) {
            let tmp = f.sibling("tmp_" + f.name());
            f.copyTo(tmp);
            checkSame(f, tmp);
            tmp.text("DUMMY");
            let c = f.getContent();
            tmp.setContent(c);
            checkSame(f, tmp);
            tmp.text("DUMMY");
            let t;
            if (f.isText()) {
                // plain->plain(.txt) / url(bin->URL)->url(URL->bin) (.bin)
                t = f.text();
                tmp.text(t);
                checkSame(f, tmp);
                tmp.text("DUMMY");
            }
            // url(bin->URL)->url(URL->bin)
            t = f.dataURL();
            tmp.dataURL(t);
            checkSame(f, tmp);
            tmp.text("DUMMY");
            // bin->bin
            let b = f.getBytes();
            _console.log("f.getBytes", b);
            tmp.setBytes(b);
            _console.log("tmp.getBytes", tmp.getBytes());
            //_console.log(peekStorage(f));
            //_console.log(peekStorage(tmp));
            checkSame(f, tmp);
            // bin->Uint8Array->bin
            let c2 = Content.bin(b, f.contentType());
            let bins = c2.toArrayBuffer();
            _console.log("bins", b, c2, bins);
            tmp.setBytes(new Uint8Array(bins));
            tmp.text("DUMMY");
            if (f.isText()) {
                // plain->bin(lsfs) , bin->plain(natfs)
                b = f.getBytes();
                c = Content.bin(b, "text/plain");
                t = c.toPlainText();
                tmp.setText(t);
                checkSame(f, tmp);
                tmp.text("DUMMY");
            }
            tmp.rm({ r: true });
        }
        function checkSame(a, b) {
            _console.log("check same", a.name(), b.name(), a.size(), b.size());
            if (a.isText() && b.isText() && a.text() !== b.text()) {
                throw new Error("text is not match: " + a + "!=" + b + "\n" +
                    "content ----\n" + a.text() + "\n----\n" + b.text());
            }
            let _a1 = a.getBytes({ binType: ArrayBuffer });
            let _b1 = b.getBytes({ binType: ArrayBuffer });
            let a1 = new Uint8Array(_a1);
            let b1 = new Uint8Array(_b1);
            _console.log("bin dump:", a1[0], a1[1], a1[2], a1[3]);
            assert(a1.length > 0, "shoule be longer than 0");
            assert(a1.length == b1.length, "length is not match: " + a + "," + b);
            for (let i = 0; i < a1.length; i++)
                assert(a1[i] == b1[i], "failed at [" + i + "]");
        }
        function contEq(a, b) {
            if (typeof a !== typeof b)
                return false;
            if (typeof a === "string")
                return a === b;
            if (typeof b === "string")
                return false;
            a = new Uint8Array(a);
            b = new Uint8Array(b);
            if (a.length !== b.length)
                return false;
            for (let i = 0; i < a.length; i++)
                if (a[i] !== b[i])
                    return false;
            return true;
        }
        function eqa(a, b) {
            _assert.deepStrictEqual(a.sort().join(","), b.sort().join(","));
        }
        function chkRecur(dir, options, result) {
            const di = [];
            dir.recursive(function (f) {
                di.push(f.relPath(dir));
            }, options);
            eqa(di, result);
            let t = dir.getDirTree({ excludes: options.excludes, style: "flat-relative" });
            _console.log("getDirTree", dir, t);
            eqa(Object.keys(t), result);
        }
        function testContent() {
            let C = Content;
            const a = [0xe3, 0x81, 0xa6, 0xe3, 0x81, 0x99, 0xe3, 0x81, 0xa8, 0x61, 0x62, 0x63];
            const conts = {
                p: ["てすとabc", (s) => C.plainText(s), (c) => c.toPlainText()],
                u: ["data:text/plain;base64,44Gm44GZ44GoYWJj", (u) => C.url(u), (c) => c.toURL()],
                a: [Uint8Array.from(a).buffer, (a) => C.bin(a, "text/plain"), (c) => c.toArrayBuffer()],
                n: [Buffer.from(a), (n) => C.bin(n, "text/plain"), (c) => c.toNodeBuffer()],
            };
            /*if (typeof Buffer!=="undefined") {
                conts.n=[Buffer.from(a),(n)=>C.bin(n, "text/plain"), (c)=>c.toNodeBuffer()];
            }*/
            const SRC = 0, TOCONT = 1, FROMCONT = 2;
            let binLen = conts.a[SRC].byteLength;
            for (let tfrom of Object.keys(conts))
                for (let tto of Object.keys(conts))
                    chk(tfrom, tto);
            function chk(tfrom, tto) {
                const src = conts[tfrom][SRC];
                const c = conts[tfrom][TOCONT](src);
                if (c.hasNodeBuffer()) {
                    assert.eq(c.nodeBuffer.length, binLen, "Bin length not match");
                }
                const dst = conts[tto][FROMCONT](c);
                _console.log("Convert Content ", tfrom, "->", tto);
                if (!contEq(dst, conts[tto][SRC])) {
                    _console.log("Actual: ", dst);
                    _console.log("Expected: ", conts[tto][SRC]);
                    _console.log("Content bufType ", c.bufType);
                    throw new Error(`Fail at ${tfrom} to ${tto}`);
                }
            }
            /*let c1 = C.plainText(s);
            test(c1, [s]);
        
            function test(c, path) {
                let p = c.toPlainText();
                let u = c.toURL();
                let a = c.toArrayBuffer();
                let n = C.hasNodeBuffer() && c.toNodeBuffer();
                _console.log("TestCont", path, "->", p, u, a, n);
                let cp = C.plainText(p);
                let cu = C.url(u);
                let ca = C.bin(a, "text/plain");
                let cn = n && C.bin(n, "text/plain");
                if (path.length < 2) {
                    test(cp, path.concat([p]));
                    test(cu, path.concat([u]));
                    test(ca, path.concat([a]));
                    if (n) test(cn, path.concat([n]));
                } else {
                    //assert.eq(cp,p, "cp!=p");
                    //assert.eq(cu,u, "cu!=u");
                }
            }*/
        }
        function asyncTest(testd) {
            return __awaiter(this, void 0, void 0, function* () {
                //await checkZip(testd);
                yield checkWatch(testd);
            });
        }
        function checkWatch(testd) {
            return __awaiter(this, void 0, void 0, function* () {
                const buf = [];
                //const isN = NativeFS.available && testd.getFS() instanceof NativeFS;
                //_console.log("isN",isN);
                const isN = false;
                const w = testd.watch((type, f) => {
                    buf.push(type + ":" + f.relPath(testd));
                });
                function buildScrap(f_1) {
                    return __awaiter(this, arguments, void 0, function* (f, t = "aaa") {
                        _console.log("buildScrap", f.path());
                        yield timeout(100);
                        f.text(t);
                        yield timeout(100);
                        f.text(t + "!");
                        yield timeout(100);
                        f.rm();
                    });
                }
                yield buildScrap(testd.rel("hogefuga.txt"));
                w.remove();
                yield buildScrap(testd.rel("hogefuga.txt"));
                _console.log("checkWatch", buf);
                const uniq = (a) => {
                    const has = new Set();
                    const res = [];
                    for (let e of a) {
                        if (has.has(e))
                            continue;
                        has.add(e);
                        res.push(e);
                    }
                    return res;
                };
                _assert.deepStrictEqual(uniq(buf) /*.join("\n")*/, (isN ? uniq([
                    "rename:hogefuga.txt",
                    "change:hogefuga.txt",
                    "change:hogefuga.txt",
                    "change:hogefuga.txt",
                    //"change:hogefuga.txt",
                ]) : uniq([
                    "create:hogefuga.txt",
                    "change:",
                    "change:hogefuga.txt",
                    "change:",
                    "delete:hogefuga.txt",
                    "change:",
                    /*'rename:hogefuga.txt',
                    'change:hogefuga.txt',*/
                ])) /*.join("\n")*/); //, "checkWatch");
            });
        }
        function checkMtime(f) {
            const t = f.lastUpdate();
            const nt = t - 30 * 60 * 1000;
            f.setMetaInfo({ lastUpdate: nt });
            _console.log("checkMtime", f.path(), t, nt);
            assert(Math.abs(f.lastUpdate() - nt) < 2000);
        }
        /*
        async function checkZip(dir:SFile) {
            const cleanExt=async ()=>{
                assert.eq(ext.name(),"ext/");
                if (ext.exists()) {
                    for (let i=0;i<10;i++) {
                        try {
                            await ext.rm({ recursive: true });
                            break;
                        } catch(e) {
                            _console.log("Rm"+ext+" retry... "+i);
                            await timeout(1000);
                        }
                    }
                    assert(!ext.exists(),ext+" remains ");
                }
            };
            await timeout(3000);
            let ext = dir.rel("ext/");
            await cleanExt();
            dir.rel("ziping.txt").text("zipping");
            let tre = dir.getDirTree();
            _console.log("TRE", tre);
            const zipf = FS.get("/ram/comp.zip");
            await FS.zip.zip(dir, zipf);
            ext.mkdir();
            await FS.zip.unzip(zipf, ext);
        
            let tre2 = ext.getDirTree();
            _console.log("TRE2", tre2);
            dir.rel("ziping.txt").removeWithoutTrash();
            await cleanExt();
            assert.eq(Object.keys(tre).length, Object.keys(tre2).length);
            for (let k2 of Object.keys(tre2)) {
                let k = k2.replace(/\/ext/, "");
                _console.log("k-k2", k, k2);
                assert(k2 in tre2);
                assert(k in tre);
                assert(tre[k].lastUpdate);
                _console.log("mtime diff", tre[k].lastUpdate - tre2[k2].lastUpdate);
                //assert(Math.abs(tre[k].lastUpdate-tre2[k2].lastUpdate)<2000);
                assert(Math.abs(
                    Math.floor(tre[k].lastUpdate / 2000) -
                    Math.floor(tre2[k2].lastUpdate / 2000)) <= 2,
                    `Zip timestamp not match ${k}=${tre[k].lastUpdate}, ${k2}=${tre2[k2].lastUpdate}, Diff=${tre[k].lastUpdate - tre2[k2].lastUpdate}`
                );
            }
            await timeout(1000);
        }*/
        function getDirTree3Type(dir, excludes) {
            if (!excludes) {
                excludes = {};
            }
            else if (Array.isArray(excludes)) {
                excludes = {
                    hier: excludes, rel: excludes,
                    abs: excludes.map(e => dir.rel(e).path()),
                };
            }
            else if (typeof excludes === "function") {
                excludes = {
                    hier: excludes, rel: excludes,
                    abs: excludes
                };
            }
            const hier = dir.getDirTree({ style: "hierarchical", excludes: excludes.hier });
            _console.log("hier", hier);
            const rel = dir.getDirTree({ style: "flat-relative", excludes: excludes.rel });
            _console.log("rel", rel);
            const abs = dir.getDirTree({ style: "flat-absolute", excludes: excludes.abs });
            _console.log("abs", abs);
            eqtree3(hier, rel, abs);
            return { hier, rel, abs };
            function eqtree3(hier, rel, abs) {
                eqtree2(rel, abs);
                eqtreeH(rel, hier);
            }
            function eqtreeH(rel, hier) {
                const uncheckedRel = {};
                for (let k in rel)
                    uncheckedRel[k] = 1;
                function loop(hier, path) {
                    for (let k in hier) {
                        let np = path + k;
                        _console.log("hier, k, path", hier, k, path);
                        delete uncheckedRel[np];
                        if (k.match(/\/$/)) {
                            loop(hier[k], np);
                        }
                        else {
                            eqTree(rel[np], hier[k], np, exAttr);
                        }
                    }
                }
                loop(hier, "");
                assert(Object.keys(uncheckedRel).length == 0, "Unchecked rel: " + Object.keys(uncheckedRel).length);
            }
            function eqtree2(rel, abs) {
                const uncheckedAbs = {};
                for (let k in abs)
                    uncheckedAbs[k] = 1;
                for (let k in rel) {
                    const absk = dir.rel(k).path();
                    _console.log("k-absk", k, absk);
                    delete uncheckedAbs[absk];
                    eqTree(abs[absk], rel[k], k, exAttr);
                }
                assert(Object.keys(uncheckedAbs).length == 0, "Unchecked abs: " + Object.keys(uncheckedAbs).length);
            }
        }
        function checkGetDirTree(dir) {
            const noex = getDirTree3Type(dir);
            assert.eq(Object.keys(noex.abs).length, 50, "count of dirtree abs");
            assert.eq(Object.keys(noex.rel).length, 50, "count of dirtree rel");
            assert.eq(Object.keys(noex.hier).length, 17, "count of dirtree hier");
            const exa = getDirTree3Type(dir, ["event/"]);
            assert.eq(Object.keys(exa.abs).length, 50 - 6, "count of dirtree abs-ea");
            assert.eq(Object.keys(exa.rel).length, 50 - 6, "count of dirtree rel-ea");
            assert.eq(Object.keys(exa.hier).length, 17 - 1, "count of dirtree hier-ea");
            function exfn(f) {
                return f.isDir() && f.rel("CrashToHandler.tonyu").exists();
            }
            const exf = getDirTree3Type(dir, exfn);
            assert.eq(Object.keys(exf.abs).length, 50 - 6, "count of dirtree abs-ef");
            assert.eq(Object.keys(exf.rel).length, 50 - 6, "count of dirtree rel-ef");
            assert.eq(Object.keys(exf.hier).length, 17 - 1, "count of dirtree hier-ef");
            eqTree(exf.hier, exa.hier, "hier_efea", exAttr);
            eqTree(exf.rel, exa.rel, "rel_efea", exAttr);
            eqTree(exf.abs, exa.abs, "abs_efea", exAttr);
        }
        function checkGetDirTree_nw(dir) {
            const noex = getDirTree3Type(dir);
            _console.log("getDirTree-nw", noex);
        }
        /*
        async function checkRemoveError(dir) {
            const fs=await import("fs");
            dir=dir.rel("rmtest/");
            dir.mkdir();
            const locked=dir.rel("locked.txt");
            locked.text("test");
            const np=locked.fs.toNativePath(locked.path());
            _console.log("np",np);
            fs.chmodSync(np,0o400);
            await timeout(10000);
            fs.unlinkSync(np);
            _console.log("WHT!!!",np);
            await assert.ensureErrorAsync(()=>dir.rm({r:true}));
            fs.chmodSync(np,0o666);
            await dir.rm({r:true});
            assert(!dir.exists(), dir+" remains (checkRemove)");
        }*/
        function eqTree(a, b, path, excludes) {
            assert.eq(typeof a, typeof b, "typeof not match:" + path);
            if (a == null) {
                assert(b == null, "both should be null: " + path);
                return;
            }
            if (typeof a !== "object") {
                assert(a === b, `non-equal non-object: ${path} ${a}!==${b}`);
                return;
            }
            for (let k in a) {
                if (excludes[k])
                    continue;
                eqTree(a[k], b[k], path + "." + k, excludes);
            }
            for (let k in b) {
                if (excludes[k])
                    continue;
                eqTree(b[k], a[k], path + "." + k, excludes);
            }
        }
        function retryRmdir(dir) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < 10; i++) {
                    try {
                        dir.rm({ r: true });
                        return;
                    }
                    catch (e) {
                        _console.log("retryRmdir", e.stack);
                        yield timeout(1000);
                    }
                }
                throw new Error("retryRmdir " + dir + " failed");
            });
        }
        function extractFixture(to) {
            return __awaiter(this, void 0, void 0, function* () {
                const fixturezip = yield fetch("fixture.zip");
                const fixturezipB = yield fixturezip.arrayBuffer();
                const zipf = yield zip.loadAsync(fixturezipB);
                for (let key of Object.keys(zipf.files)) {
                    const obj = zipf.files[key];
                    const f = to.rel(obj.name);
                    if (obj.dir) {
                        f.mkdir();
                    }
                    else {
                        const buf = yield obj.async("arraybuffer");
                        f.setBytes(buf);
                    }
                }
            });
        }
    });
}
// of main()
//(globalThis as any).main=main;
main();
//# sourceMappingURL=test.js.map