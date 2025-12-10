// IOErrorMessages is defined like this to reduce duplication for --isolatedDeclarations
const TemplateIOErrorMessages = {
    EACCES: "access denied",
    EIO: "an I/O error occurred",
    ENOENT: "no such file or directory",
    EEXIST: "file already exists",
    ELOOP: "too many symbolic links encountered",
    ENOTDIR: "no such directory",
    EISDIR: "path is a directory",
    EBADF: "invalid file descriptor",
    EINVAL: "invalid value",
    ENOTEMPTY: "directory not empty",
    EPERM: "operation not permitted",
    EROFS: "file system is read-only",
};
export const IOErrorMessages = Object.freeze(TemplateIOErrorMessages);
export function createIOError(code, details = "") {
    const err = new Error(`${code}: ${IOErrorMessages[code]} ${details}`);
    err.code = code;
    if (Error.captureStackTrace)
        Error.captureStackTrace(err, createIOError);
    return err;
}
export function createEEXIST(path, syscall = "mkdir") {
    return createIOError("EEXIST", `file already exists, ${syscall} '${path}'`);
}
export function createENOENT(path, syscall = "open") {
    return createIOError("ENOENT", `no such file or directory, ${syscall} '${path}'`);
}
export function createENOTDIR(path, syscall = "scandir") {
    return createIOError("ENOTDIR", `not a directory, ${syscall} '${path}'`);
}
export function createEISDIR(path, syscall = "scandir") {
    return createIOError("EISDIR", `is a directory, ${syscall} '${path}'`);
}
//# sourceMappingURL=errors.js.map