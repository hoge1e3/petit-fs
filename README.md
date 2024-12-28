# petit-fs
FileSystem on browser using localStorage. Provides node [fs](https://nodejs.org/api/fs.html) compatible interface(Still in progress).

`src/vfsUtil.ts` is based on [typescript](https://github.com/microsoft/typescript) harness.

## Supporting methods

```ts
existsSync(path: string): boolean;
statSync(path: string): Stats; // Stats only supportes mtime, mtimeMs, isDirectory(), isSymbolicLink(). Time stamps other than mtime may be inaccurate. 
utimesSync(path: string, atime: Date, mtime: Date): void;
lstatSync(path: string): Stats;
readdirSync(path: string): string[];
mkdirSync(path: string): void;
rmdirSync(path: string): void;
unlinkSync(path: string): void;
renameSync(src: string, dst: string): void;
symlinkSync(target: string, linkpath: string): void;
realpathSync(path: string): string;
readFileSync(path: string, encoding?: null): Buffer;
readFileSync(path: string, encoding: BufferEncoding): string;
readFileSync(path: string, encoding?: BufferEncoding | null): string | Buffer;
writeFileSync(path: string, data: string | Buffer, encoding?: string | null): void;
writeSync(fd: number, data: string | Buffer, encoding?: string | null): void;
appendFileSync(path: string, data: string | Buffer, encoding?: string | null): void;
watch(path: string, ...opts: any[]): void;
watchFile(path: string, ...opts: any[]): void;
openSync(path: string, mode: string): number; // mode "w" only
closeSync(fd: number): void;
```

## Use of RAM disk

`fs.mountSync("/mnt/to/","ram")` mounts RAM disk instead of localStorage, that have unlimited(Within browser memory) capacity but cleard on unload page.

## Representation of files in localStorage

- The key represents the full path of a file. 
- The value represents the file content in string
    - If the file is a binary file, it is stored in data url.
    - Whether the file is binary or text is determined by extension of the file
    - `src/MIMETypes.js` maps extension to content types. If content type is "text/....", it is regarded as text file
- The key of a directory entry always ends with /
    - The value is a JSON with file list and attributes(lastUpdate).
