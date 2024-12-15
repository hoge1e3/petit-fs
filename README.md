# petit-fs
FileSystem on browser using localStorage. Provides node [fs](https://nodejs.org/api/fs.html) compatible interface(Still in progress).

`src/vfsUtil.ts` is based on [typescript](https://github.com/microsoft/typescript) harness.

## Representation of files in localStorage

- The key represents the full path of a file. 
- The value represents the file content in string
    - If the file is a binary file, it is stored in data url.
    - Whether the file is binary or text is determined by extension of the file
    - `src/MIMETypes.js` maps extension to content types. If content type is "text/....", it is regarded as text file
- The key of a directory entry always ends with /
    - The value is a JSON with file list and attributes(lastUpdate).
