import {fs, process} from "../dist/index.js";
window.fs=fs;

/*const fs=new FileSystem()false, {
    files: {
        "/test.ts": `let x:number=123;`
    }
});
function checkModuleExports(FS) {
    const keys=new Set();
    for (let k in FS) {
        if (k==="default") continue;
        keys.add(k);
    }
    for (let k in FS.default) {
        if (k==="default") continue;
        keys.add(k);
    }
    console.log("exported names:",keys);
    const undefs=[];
    for (let k of keys) {
        if (FS[k]!==FS.default[k]) undefs.push(k);
    }
    if (undefs.length) {
        console.log("Add props:", undefs.join(","));
        throw new Error("Missing exported name");
    }
}

fs.genExports();
checkModuleExports(fs);*/

process.chdir("/");
fs.writeFileSync("test.ts",`let x:number=123;`);
const r=fs.readFileSync("/test.ts","utf-8");
console.log(r);
fs.appendFileSync("test.ts","\n//HOGEFUGA");
console.log(fs.readFileSync("/test.ts","utf-8"));
const fd=fs.openSync("test.ts","w");
fs.writeSync(fd,"aaaa");
fs.writeSync(fd,"bbbb");
fs.closeSync(fd);
console.log(fs.readFileSync("/test.ts","utf-8"));


fs.mountSync("/tmp/","ram");
process.chdir("tmp");
/*
fs.mountSync("/","/tmp/", {   
    // statSync(path: string): { mode: number; size: number; };
    statSync(path) {
        console.log("statsync",path);
        return {
            mode: 0o100000 | 0o777,
            size: 10,
        };
    },
    // readdirSync(path: string): string[];
    readdirSync(path) {
        console.log("readdirsync",path);
        try {
            throw new Error("");
        } catch(e){
            console.log(e.stack);
        }
        return ["test.txt"];
    },
    // readFileSync(path: string): FileDataBuffer; 
    readFileSync(path) {
        console.log("readFileSync",path);
        return {
            encoding:"utf-8",
            data: "0123456789",
        };
    }
});*/
fs.writeFileSync("test.txt","hogefugaaacdef");
console.log(fs.readFileSync("test.txt","utf-8"));
console.log(fs.readdirSync("../"));
//console.log(fs.readFileSync("/tmp/test.txt","utf-8"));
/*function traverse(link,prefix="") {
    for (let [k,v] of link) {
        console.log(prefix+"/"+k,v);
        if (v.links) {
            traverse(v.links,prefix+"/"+k);
        }
    }
}
traverse(fs._getRootLinks());*/