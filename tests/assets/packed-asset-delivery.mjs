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
for(const path of new Set(targets)){
 let original=fs.readFileSync('client/'+path);if(identityScripts.has(path))original=Buffer.from((await transform(original.toString(),{minifyWhitespace:true,minifySyntax:true,legalComments:'none',target:'es2022'})).code);let etag;
 for(const encoding of ['identity','br','br;q=0']){
  const response=await worker.fetch(new Request('http://fixture/'+path,{headers:{'Accept-Encoding':encoding}}),{});assert.equal(response.status,200);
  if(identityScripts.has(path))assert.equal(response.headers.get('content-encoding'),null,'runtime scripts retain identity HTTP delivery');
  const stored=Buffer.from(await response.arrayBuffer()),bytes=response.headers.get('content-encoding')==='br'?brotliDecompressSync(stored):stored;assert(bytes.equals(original),'exact '+encoding+' '+path);etag=response.headers.get('etag');
 }
 const head=await worker.fetch(new Request('http://fixture/'+path,{method:'HEAD'}),{});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('etag'),etag);
 const cached=await worker.fetch(new Request('http://fixture/'+path,{headers:{'If-None-Match':etag}}),{});assert.equal(cached.status,304);
 const obsolete=await worker.fetch(new Request('http://fixture/'+path+'?v=obsolete'),{});assert.equal(obsolete.status,report.inlineScripts.includes(path)?200:409);
}
assert(report.moduleBytes<64*1024*1024);assert(report.packedStreams.parts>0);
const release=await worker.fetch(new Request('http://fixture/api/release'),{});assert.equal(release.status,200);assert.match((await release.json()).release,/^realm-[a-f0-9]{16}$/);
const play=await worker.fetch(new Request('http://fixture/play'),{}),html=await play.text();assert.equal(play.status,200);assert(html.includes('sourceURL=building-lod.js?'),'the published play document loads the building planner');
assert(html.includes('sourceURL=renderer-occlusion.js?'),'the published play document loads the occlusion pass');
console.log('PASS: built Worker serves unchanged packed catalogs/PBR models, Brotli and identity, HEAD, ETags, stale-version rejection and the 64 MiB limit');
