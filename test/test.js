import {fs, process, path, Buffer} from "../dist/index.js";
window.fs=fs;
window.pfs={fs, process, path, Buffer};

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
fs.writeFileSync("test.txt","hogefugaaacdef");
console.log(fs.readFileSync("test.txt","utf-8"));
console.log(fs.readdirSync("../"));
