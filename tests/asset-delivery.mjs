import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {build} from 'esbuild';
import {encodeAsset,decodeAsset,compressAsset,acceptsBrotli,compressedCatalogPlugin} from '../scripts/asset-delivery.mjs';
for(const [header,expected] of [['br',true],['gzip, br',true],['br;q=0, *;q=1',false],['*;q=1',true],['br;q=0.5',true],['gzip',false],['',false]]){
 assert.equal(acceptsBrotli(new Request('https://veldren.test',{headers:{'Accept-Encoding':header}})),expected);
}
assert.equal(acceptsBrotli({cf:{clientAcceptEncoding:'gzip'},headers:new Headers({'Accept-Encoding':'gzip, br'})}),false);
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
const seedEntry={contents:"import world from './editor-data/world-scene.json' with {type:'json'};export default world;",resolveDir:process.cwd(),loader:'js'},options={stdin:seedEntry,bundle:true,write:false,format:'esm',platform:'node',minify:true,external:['node:zlib']};
const [packed,plain]=await Promise.all([build({...options,plugins:[compressedCatalogPlugin()]}),build(options)]);
const source=packed.outputFiles[0].text,restored=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.deepEqual(restored.default,JSON.parse(fs.readFileSync('editor-data/world-scene.json','utf8')),'every authored Scene, entity, field and terrain sample survives seed compression');
assert(Buffer.byteLength(source)<Buffer.byteLength(plain.outputFiles[0].text)/4,'the API seed uses compressed storage rather than duplicate raw JSON');
console.log('PASS: bundled authored Scene seed retains every saved field with lossless compression.');
console.log('PASS: lossless asset embedding, malformed payload rejection, deterministic Brotli cache and corruption recovery.');
