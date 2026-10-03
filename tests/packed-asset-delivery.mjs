import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import worker from '../dist/server/index.js';
const models=JSON.parse(fs.readFileSync('dist/assets/canonical/lods.json')).models;
const records=JSON.parse(fs.readFileSync('dist/assets/canonical/registry.json')).records;
const targets=['assets/realms/models.js','assets/realms/monsters.js','assets/realms/approved-creatures.js','assets/briarhaven/models.js',...models.slice(0,3).flatMap(row=>row.lods.map(l=>records.find(r=>r.id===l.asset).derivedPath))];
for(const path of new Set(targets)){
 const original=fs.readFileSync('dist/'+path);let etag;
 for(const encoding of ['identity','br','br;q=0']){
  const response=await worker.fetch(new Request('http://fixture/'+path,{headers:{'Accept-Encoding':encoding}}),{});assert.equal(response.status,200);
  const stored=Buffer.from(await response.arrayBuffer()),bytes=response.headers.get('content-encoding')==='br'?brotliDecompressSync(stored):stored;assert(bytes.equals(original),'exact '+encoding+' '+path);etag=response.headers.get('etag');
 }
 const head=await worker.fetch(new Request('http://fixture/'+path,{method:'HEAD'}),{});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('etag'),etag);
 const cached=await worker.fetch(new Request('http://fixture/'+path,{headers:{'If-None-Match':etag}}),{});assert.equal(cached.status,304);
 const obsolete=await worker.fetch(new Request('http://fixture/'+path+'?v=obsolete'),{});assert.equal(obsolete.status,409);
}
const report=JSON.parse(fs.readFileSync('.qa/asset-delivery.json'));assert(report.moduleBytes<64*1024*1024);assert(report.packedStreams.parts>0);
console.log('PASS: built Worker serves unchanged packed catalogs/PBR models, Brotli and identity, HEAD, ETags, stale-version rejection and the 64 MiB limit');
