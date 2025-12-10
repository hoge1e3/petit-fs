const path=require("./path.js");
exports.path=path.posix;
exports.path.posix=path.posix;
exports.path.win32=path.win32;
exports.setProcess=require("./process.js").setProcess;
