import {FileSystem} from "../dist/index.js";

const fs=new FileSystem();/*false, {
    files: {
        "/test.ts": `let x:number=123;`
    }
});*/
fs.writeFileSync("/test.ts",`let x:number=123;`);
const r=fs.readFileSync("/test.ts","utf-8");
console.log(r);
fs.appendFileSync("/test.ts","\n//HOGEFUGA");
console.log(fs.readFileSync("/test.ts","utf-8"));

fs.mountSync("/tmp/","ram");
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
fs.writeFileSync("/tmp/test.txt","hogefugaaacdef");
console.log(fs.readFileSync("/tmp/test.txt","utf-8"));
console.log(fs.readdirSync("/"));
//console.log(fs.readFileSync("/tmp/test.txt","utf-8"));
window.fs=fs;
/*function traverse(link,prefix="") {
    for (let [k,v] of link) {
        console.log(prefix+"/"+k,v);
        if (v.links) {
            traverse(v.links,prefix+"/"+k);
        }
    }
}
traverse(fs._getRootLinks());*/