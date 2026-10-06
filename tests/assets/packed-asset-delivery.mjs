import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {transform} from 'esbuild';
import worker from '../../dist/server/index.js';
const models=JSON.parse(fs.readFileSync('client/assets/canonical/lods.json')).models;
const records=JSON.parse(fs.readFileSync('client/assets/canonical/registry.json')).records;
const identityScripts=new Set(['building-lod.js','renderer-occlusion.js','asset-runtime.js','asset-prepare-worker.js','asset-materials.js','asset-meshes.js','asset-draws.js','renderer-filament.js']);
const targets=[...identityScripts,'assets/realms/models.js','assets/realms/monsters.js','assets/realms/approved-creatures.js','assets/briarhaven/models.js',...models.slice(0,3).flatMap(row=>row.lods.map(l=>records.find(r=>r.id===l.asset).derivedPath))];
const report=JSON.parse(fs.readFileSync('.qa/asset-delivery.json'));
const storedManifest=JSON.parse(fs.readFileSync('.asset-cache/public-assets/manifest.json'));
const storedRecords=new Map(storedManifest.records.map(r=>[r.storageKey,r]));
const env={GAME_ASSETS:{
 async head(key){const r=storedRecords.get(key);return r?{size:fs.statSync('.asset-cache/public-assets/'+r.file).size,customMetadata:{sha256:r.storageSha256}}:null;},
 async get(key,options){const r=storedRecords.get(key);if(!r)return null;let bytes=fs.readFileSync('.asset-cache/public-assets/'+r.file),size=bytes.length;if(options?.range)bytes=bytes.subarray(options.range.offset,options.range.offset+options.range.length);return {size,customMetadata:{sha256:r.storageSha256},body:new Blob([bytes]).stream()};}
}};
for(const path of new Set(targets)){
 let original=fs.readFileSync('client/'+path);if(identityScripts.has(path))original=Buffer.from((await transform(original.toString(),{minifyWhitespace:true,minifySyntax:true,legalComments:'none',target:'es2022'})).code);let etag;
 for(const encoding of ['identity','br','br;q=0']){
  const response=await worker.fetch(new Request('http://fixture/'+path,{headers:{'Accept-Encoding':encoding}}),env);assert.equal(response.status,200);
  if(identityScripts.has(path))assert.equal(response.headers.get('content-encoding'),null,'runtime scripts retain identity HTTP delivery');
  const stored=Buffer.from(await response.arrayBuffer()),bytes=response.headers.get('content-encoding')==='br'?brotliDecompressSync(stored):stored;assert(bytes.equals(original),'exact '+encoding+' '+path);etag=response.headers.get('etag');
 }
 const head=await worker.fetch(new Request('http://fixture/'+path,{method:'HEAD'}),env);assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('etag'),etag);
 const cached=await worker.fetch(new Request('http://fixture/'+path,{headers:{'If-None-Match':etag}}),env);assert.equal(cached.status,304);
 const obsolete=await worker.fetch(new Request('http://fixture/'+path+'?v=obsolete'),env);assert.equal(obsolete.status,report.inlineScripts.includes(path)?200:409);
}
assert(report.moduleBytes<64*1024*1024);
if(report.assetBootstrap)assert(report.packedStreams.parts>0);
else {assert.equal(report.packedStreams.parts,0,'model streams are no longer embedded');assert(report.moduleBytes<8*1024*1024,'bulk assets leave a small Worker');assert(report.storedAssets>500);}
for(const r of storedManifest.records){const bytes=fs.readFileSync('.asset-cache/public-assets/'+r.file);assert.equal(bytes.length,r.storageLength);}
const audio=storedManifest.records.find(r=>r.mime==='audio/mpeg');const range=await worker.fetch(new Request('http://fixture'+audio.path,{headers:{Range:'bytes=10-29'}}),env);assert.equal(range.status,206);assert(Buffer.from(await range.arrayBuffer()).equals(fs.readFileSync('.asset-cache/public-assets/'+audio.file).subarray(10,30)));
const release=await worker.fetch(new Request('http://fixture/api/release'),env);assert.equal(release.status,200);assert.match((await release.json()).release,/^realm-[a-f0-9]{16}$/);
const play=await worker.fetch(new Request('http://fixture/play'),{}),html=await play.text();assert.equal(play.status,200);assert(html.includes('sourceURL=building-lod.js?'),'the published play document loads the building planner');
assert(html.includes('sourceURL=renderer-occlusion.js?'),'the published play document loads the occlusion pass');
console.log('PASS: built Worker serves unchanged packed catalogs/PBR models, Brotli and identity, HEAD, ETags, stale-version rejection audio ranges and separate asset storage');
