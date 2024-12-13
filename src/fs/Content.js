//define(["assert","Util","FileSaver"],function (assert,Util,saveAs) {
import Util from "./Util.js";
import assert from "./assert.js";
//import saveAs from "file-saver";
var Content=function () {};
var extend=Util.extend;
// ------ constructor
Content.plainText=function (s,contentType){
    var b=new Content();
    b.contentType=contentType||"text/plain";
    b.plain=s;
    return b;
};
Content.url=function (s) {
    var b=new Content();
    b.url=s;
    return b;
};
Content.buffer2ArrayBuffer = function (a) {
    if (Content.isBuffer(a)) {
        var u=new Uint8Array(a);
        var r=u.buffer;
        if (r instanceof ArrayBuffer) return r;
        var ary=Array.prototype.slice.call(u);
        return assert(new Uint8Array(ary).buffer,"n2a: buf is not set");
    }
    return assert(a,"n2a: a is not set");
};
Content.arrayBuffer2Buffer= function (a) {
    if (a instanceof ArrayBuffer) {
        var b=Buffer.from(new Uint8Array(a));
        return b;
    }
    return assert(a,"a2n: a is not set");
};

Content.bin=function (bin, contentType) {
    assert(contentType, "contentType should be set");
    var b=new Content();
    if (Content.isNodeBuffer(bin)) {
        b.bufType="node";
        b.nodeBuffer=bin;
    } else if (bin instanceof ArrayBuffer) {
        b.bufType="array2";
        b.arrayBuffer=bin;
    } else if (bin && Content.isBuffer(bin.buffer)) {
        // in node.js v8.9.1 ,
        ///  bin is Buffer, bin.buffer is ArrayBuffer
        //   and bin.buffer is content of different file(memory leak?) 
        // ^　Not a memory leak.　https://nodejs.org/docs/v20.11.1/api/buffer.html#buffer
        //   bin.buffer points shared memory and the data can be got 
        //   using bin.byteOffset, bin.length
        b.bufType="array1";
        b.arrayBuffer=bin.buffer;
    } else {
        throw new Error(bin+" is not a bin");
    }
    b.contentType=contentType;
    return b;
};
Content.looksLikeDataURL=function (text) {
    return text.match(/^data:/);
};
//Content.download=saveAs;
// why blob is not here... because blob content requires FileReader (cannot read instantly!)
//------- methods
var p=Content.prototype;
p.toBin = function (binType) {
    binType=binType || (Content.hasNodeBuffer() ? Buffer: ArrayBuffer);
    if (this.nodeBuffer) {
        if (binType===Buffer) {
            return this.nodeBuffer;
        } else {
            this.arrayBuffer=( Content.buffer2ArrayBuffer(this.nodeBuffer) );
            return this.arrayBuffer;
        }
    } else if (this.arrayBuffer) {
        if (binType===ArrayBuffer) {
            return this.arrayBuffer;
        } else {
            this.nodeBuffer=( Content.arrayBuffer2Buffer(this.arrayBuffer) );
            return this.nodeBuffer;
        }
    } else if (this.url) {
        var d=new DataURL(this.url, binType);
        return this.setBuffer(d.buffer);
    } else if (this.plain!=null) {
        return this.setBuffer( Content.str2utf8bytes(this.plain, binType) );
    }
    throw new Error("No data");
};
p.setBuffer=function (b) {
    assert(b,"b is not set");
    if (Content.isNodeBuffer(b)) {
        this.nodeBuffer=b;
        return b;
    } else {
        this.arrayBuffer=b;
        return b;
    }
};
p.toArrayBuffer=function () {
    return this.toBin(ArrayBuffer);
};
p.toNodeBuffer=function () {
    return this.toBin(Buffer);
};
p.toURL=function () {
    if (this.url) {
        return this.url;
    } else {
        if (!this.arrayBuffer && this.plain!=null) {
            this.arrayBuffer=Content.str2utf8bytes(this.plain,ArrayBuffer);
        }
        if (this.arrayBuffer || this.nodeBuffer) {
            var d=new DataURL(this.arrayBuffer || this.nodeBuffer,this.contentType);
            this.url=d.url;
            return this.url;
        }
    }
    throw new Error("No data");
};
p.toPlainText=function () {
    if (this.hasPlainText()) {
        return this.plain;
    } else {
        if (this.url && !this.hasBin() ) {
            var d=new DataURL(this.url,ArrayBuffer);
            this.arrayBuffer=d.buffer;
        }
        if (this.hasBin()) {
            this.plain=Content.utf8bytes2str(
                    this.nodeBuffer || new Uint8Array(this.arrayBuffer)
            );
            return this.plain;
        }
    }
    throw new Error("No data");
};
p.hasURL=function (){return this.url;};
p.hasPlainText=function (){return this.plain!=null;};
p.hasBin=function (){return this.nodeBuffer || this.arrayBuffer;};
p.hasNodeBuffer= function () {return this.nodeBuffer;};
p.hasArrayBuffer= function () {return this.arrayBuffer;};
p.toBlob=function () {
    return new Blob([this.toBin(ArrayBuffer)],{type:this.contentType});
};
p.download=function (name) {
    Content.download(this.toBlob(),name);
};
//--------Util funcs
// From http://hakuhin.jp/js/base64.html#BASE64_DECODE_ARRAY_BUFFER
Content.Base64_To_ArrayBuffer=function (base64,binType){
    var A=binType||ArrayBuffer;
    base64=base64.replace(/[\n=]/g,"");
    var dic = {};
    dic[0x41]= 0; dic[0x42]= 1; dic[0x43]= 2; dic[0x44]= 3; dic[0x45]= 4; dic[0x46]= 5; dic[0x47]= 6; dic[0x48]= 7; dic[0x49]= 8; dic[0x4a]= 9; dic[0x4b]=10; dic[0x4c]=11; dic[0x4d]=12; dic[0x4e]=13; dic[0x4f]=14; dic[0x50]=15;
    dic[0x51]=16; dic[0x52]=17; dic[0x53]=18; dic[0x54]=19; dic[0x55]=20; dic[0x56]=21; dic[0x57]=22; dic[0x58]=23; dic[0x59]=24; dic[0x5a]=25; dic[0x61]=26; dic[0x62]=27; dic[0x63]=28; dic[0x64]=29; dic[0x65]=30; dic[0x66]=31;
    dic[0x67]=32; dic[0x68]=33; dic[0x69]=34; dic[0x6a]=35; dic[0x6b]=36; dic[0x6c]=37; dic[0x6d]=38; dic[0x6e]=39; dic[0x6f]=40; dic[0x70]=41; dic[0x71]=42; dic[0x72]=43; dic[0x73]=44; dic[0x74]=45; dic[0x75]=46; dic[0x76]=47;
    dic[0x77]=48; dic[0x78]=49; dic[0x79]=50; dic[0x7a]=51; dic[0x30]=52; dic[0x31]=53; dic[0x32]=54; dic[0x33]=55; dic[0x34]=56; dic[0x35]=57; dic[0x36]=58; dic[0x37]=59; dic[0x38]=60; dic[0x39]=61; dic[0x2b]=62; dic[0x2f]=63;
    var num = base64.length;
    var n = 0;
    var b = 0;
    var e;
    const genBuf=(len)=>{
        if (typeof Buffer!=="undefined" && A===Buffer) {
            return Buffer.alloc(len);
        } 
        return new A(len);
    };
    if(!num) return genBuf(0);
    //if(num < 4) return null;
    //if(num % 4) return null;

    // AA     12    1
    // AAA    18    2
    // AAAA   24    3
    // AAAAA  30    3
    // AAAAAA 36    4
    // num*6/8
    e = Math.floor(num / 4 * 3);
    if(base64.charAt(num - 1) == '=') e -= 1;
    if(base64.charAt(num - 2) == '=') e -= 1;

    var ary_buffer = genBuf(e);
    var ary_u8 = (Content.isNodeBuffer(ary_buffer) ? ary_buffer : new Uint8Array( ary_buffer ));//new Uint8Array( ary_buffer );
    var i = 0;
    var p = 0;
    while(p < e){
        b = dic[base64.charCodeAt(i)];
        if(b === undefined) fail("Invalid letter: "+base64.charCodeAt(i));//return null;
        n = (b << 2);
        i ++;

        b = dic[base64.charCodeAt(i)];
        if(b === undefined) fail("Invalid letter: "+base64.charCodeAt(i));
        ary_u8[p] = n | ((b >> 4) & 0x3);
        n = (b & 0x0f) << 4;
        i ++;
        p ++;
        if(p >= e) break;

        b = dic[base64.charCodeAt(i)];
        if(b === undefined) fail("Invalid letter: "+base64.charCodeAt(i));
        ary_u8[p] = n | ((b >> 2) & 0xf);
        n = (b & 0x03) << 6;
        i ++;
        p ++;
        if(p >= e) break;

        b = dic[base64.charCodeAt(i)];
        if(b === undefined) fail("Invalid letter: "+base64.charCodeAt(i));
        ary_u8[p] = n | b;
        i ++;
        p ++;
    }
    function fail(m) {
        console.log(m);
        console.log(base64,i);
        throw new Error(m);
    }
    return ary_buffer;
};

Content.Base64_From_ArrayBuffer=function (ary_buffer){
    var dic = [
        'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P',
        'Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f',
        'g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v',
        'w','x','y','z','0','1','2','3','4','5','6','7','8','9','+','/'
    ];
    var base64 = "";
    var ary_u8 = new Uint8Array( ary_buffer );
    var num = ary_u8.length;
    var n = 0;
    var b = 0;

    var i = 0;
    while(i < num){
        b = ary_u8[i];
        base64 += dic[(b >> 2)];
        n = (b & 0x03) << 4;
        i ++;
        if(i >= num) break;

        b = ary_u8[i];
        base64 += dic[n | (b >> 4)];
        n = (b & 0x0f) << 2;
        i ++;
        if(i >= num) break;

        b = ary_u8[i];
        base64 += dic[n | (b >> 6)];
        base64 += dic[(b & 0x3f)];
        i ++;
    }

    var m = num % 3;
    if(m){
        base64 += dic[n];
    }
    if(m == 1){
        base64 += "==";
    }else if(m == 2){
        base64 += "=";
    }
    return base64;
};

Content.hasNodeBuffer=function () {
    return typeof Buffer!="undefined";
};
Content.isNodeBuffer=function (data) {
    return (Content.hasNodeBuffer() && data instanceof Buffer);
};
Content.isBuffer=function (data) {
    return data instanceof ArrayBuffer || Content.isNodeBuffer(data);
};
Content.utf8bytes2str=function (bytes) {
    var e=[];
    for (var i=0 ; i<bytes.length ; i++) {
            e.push("%"+("0"+bytes[i].toString(16)).slice(-2));
    }
    //try {
        return decodeURIComponent(e.join(""));
    /*} catch (er) {
        console.log(e.join(""));
        throw er;
    }*/
};
Content.str2utf8bytes=function (str, binType) {
    var e=encodeURIComponent(str);
    var r=/^%(..)/;
    var a=[];
    var ad=0;
    for (var i=0 ; i<e.length; i++) {
        var m=r.exec( e.substring(i));
        if (m) {
            a.push(parseInt("0x"+m[1]));
            i+=m[0].length-1;
        } else a.push(e.charCodeAt(i));
    }
    return (typeof Buffer!="undefined" && binType===Buffer ? Buffer.from(a) : new Uint8Array(a).buffer);
};
//-------- DataURL
var A = Content.hasNodeBuffer() ? Buffer : ArrayBuffer;
//var isBuffer=Util.isBuffer;
var DataURL = function (data, contentType) {
    // data: String/Array/ArrayBuffer
    if (typeof data == "string") {
        this.url = data;
        this.binType = contentType || A;
        this.dataURL2bin(data);
    } else if (Content.isNodeBuffer(data)) {
        this.buffer = data;
        assert.is(contentType, String);
        this.contentType = contentType;
        this.bin2dataURL(this.buffer, this.contentType);
    } else if (data && Content.isBuffer(data.buffer)) {
        this.buffer = data.buffer;
        assert.is(contentType, String);
        this.contentType = contentType;
        this.bin2dataURL(this.buffer, this.contentType);
    } else if (Content.isBuffer(data)) {
        this.buffer = data;
        assert.is(contentType, String);
        this.contentType = contentType;
        this.bin2dataURL(this.buffer, this.contentType);
    } else {
        console.log(arguments);
        assert.fail("Invalid args: ", arguments);
    }
};
Content.DataURL = DataURL;
extend(DataURL.prototype, {
    bin2dataURL: function (b, contentType) {
        assert(Content.isBuffer(b));
        assert.is(contentType, String);
        var head = this.dataHeader(contentType);
        var base64 = Content.Base64_From_ArrayBuffer(b);
        assert.is(base64, String);
        this.url = head + base64;
        return this.url;
    },
    dataURL2bin: function (dataURL) {
        assert.is(arguments, [String]);
        var reg = /^data:([^;]+);base64,/i;
        var r = reg.exec(dataURL);
        assert(r, ["malformed dataURL:", dataURL]);
        this.contentType = r[1];
        this.buffer = Content.Base64_To_ArrayBuffer(dataURL.substring(r[0].length), this.binType);
        return assert.is(this.buffer, this.binType);
    },
    dataHeader: function (ctype) {
        assert.is(arguments, [String]);
        return "data:" + ctype + ";base64,";
    },
    toString: function () { return assert.is(this.url, String); }
});
export default Content;