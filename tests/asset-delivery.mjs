import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {encodeAsset,decodeAsset,compressAsset} from '../scripts/asset-delivery.mjs';
for(let size=0;size<4096;size++){
 const bytes=Buffer.alloc(size);for(let i=0;i<size;i++)bytes[i]=(i*47+(i>>3)*11+size)%256;
 const encoded=encodeAsset(bytes);assert(!/["\\`]/.test(encoded));assert.deepEqual(Buffer.from(decodeAsset(encoded,size)),bytes);
}
assert.throws(()=>decodeAsset(' ',1));assert.throws(()=>decodeAsset('',1));assert.throws(()=>decodeAsset('!!',0));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-delivery-'));
try{
 const bytes=fs.readFileSync('dist/assets/asset-registry.json'),first=compressAsset(bytes,temporary);
 assert.deepEqual(brotliDecompressSync(first),bytes);assert.deepEqual(compressAsset(bytes,temporary),first);
 fs.writeFileSync(path.join(temporary,createHash('sha256').update(bytes).digest('hex')+'.br'),'corrupt');
 assert.deepEqual(compressAsset(bytes,temporary),first,'A corrupt derived cache is rebuilt, never published');
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
console.log('PASS: lossless asset embedding, malformed payload rejection, deterministic Brotli cache and corruption recovery.');
