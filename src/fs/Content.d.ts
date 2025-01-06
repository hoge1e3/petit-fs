export type ContentBuffer=Buffer|ArrayBuffer;

export default class Content {
    static plainText(text:string, contentType?:string):Content;
    static url(url:string):Content;
    static bin(bin:ContentBuffer, contentType: string):Content;
    static isArrayBuffer(buf:ArrayBuffer|Buffer): buf is ArrayBuffer;
    static looksLikeDataURL(url:string):boolean;
    toURL():string;
    toBin(binType?:typeof Buffer|typeof ArrayBuffer):ContentBuffer;
    toArrayBuffer():ArrayBuffer;
    toNodeBuffer():Buffer;
    toPlainText():string;
    setBuffer(buffer:ContentBuffer):void;
    hasURL():boolean;
    hasBin():boolean;
    hasArrayBuffer():boolean;
    hasNodeBuffer():boolean;
    hasPlainText():boolean;
    toBlob():Blob;
    download(name:string):void;
}
