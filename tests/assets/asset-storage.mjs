import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {brotliCompressSync,brotliDecompressSync} from 'node:zlib';
import {handleAssetUpload,serveStoredAsset} from '../../worker/asset-storage.js';
import {acceptsBrotli} from '../../scripts/build/asset-delivery.mjs';
const objects=new Map(),token='asset-test-token-'.repeat(4),bucket={async put(key,bytes,options){objects.set(key,{bytes:new Uint8Array(bytes),...options});},async head(key){const o=objects.get(key);return o?{size:o.bytes.length,customMetadata:o.customMetadata}:null;},async get(key,options){const o=objects.get(key);if(!o)return null;const bytes=options?.range?o.bytes.slice(options.range.offset,options.range.offset+options.range.length):o.bytes;return {size:o.bytes.length,customMetadata:o.customMetadata,body:new Blob([bytes]).stream()};}},env={MAINTENANCE_TOKEN:token,GAME_ASSETS:bucket};
const raw=Buffer.from('asset delivery exact bytes '.repeat(300)),bytes=brotliCompressSync(raw),sha=createHash('sha256').update(bytes).digest('hex'),key='veldren/assets/'+sha+'.br';
const upload=(body=bytes,auth=token,k=key)=>new Request('https://fixture/api/admin/assets?key='+k,{method:'PUT',body,headers:{Authorization:'Bearer '+auth}});
assert.equal((await handleAssetUpload(upload(bytes,'bad'),env)).status,401);
assert.equal((await handleAssetUpload(upload(Buffer.from('wrong')),env)).status,422);assert.equal(objects.size,0);
assert.equal((await handleAssetUpload(upload(bytes,token,'../secret'),env)).status,400);
assert.equal((await handleAssetUpload(upload(),env)).status,200);assert.equal(objects.size,1);
assert.equal((await handleAssetUpload(upload(),env)).status,200,'same payload safely repeats');
const asset={storageKey:key,storageSha256:sha,storageLength:bytes.length,length:raw.length,storageEncoding:'brotli',mime:'application/json',version:'v1'},headers=()=>({'Content-Type':asset.mime,'Cache-Control':'public, max-age=31536000, immutable',ETag:'"v1"'});
for(const encoding of ['identity','br','br;q=0']){const r=await serveStoredAsset(new Request('https://fixture/model?v=v1',{headers:{'Accept-Encoding':encoding}}),env,asset,headers(),acceptsBrotli);assert.equal(r.status,200);const body=Buffer.from(await r.arrayBuffer());assert((r.headers.get('content-encoding')==='br'?brotliDecompressSync(body):body).equals(raw));}
const head=await serveStoredAsset(new Request('https://fixture/model?v=v1',{method:'HEAD'}),env,asset,headers(),acceptsBrotli);assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('content-length'),String(raw.length));
assert.equal((await serveStoredAsset(new Request('https://fixture/model?v=v1',{headers:{'If-None-Match':'"v1"'}}),env,asset,headers(),acceptsBrotli)).status,304);
assert.equal((await serveStoredAsset(new Request('https://fixture/model'),{},asset,headers(),acceptsBrotli)).status,503);
objects.get(key).customMetadata.sha256='bad';assert.equal((await serveStoredAsset(new Request('https://fixture/model'),env,asset,headers(),acceptsBrotli)).status,503);objects.get(key).customMetadata.sha256=sha;
const sound=Buffer.from('0123456789'),soundSha=createHash('sha256').update(sound).digest('hex'),soundKey='veldren/assets/'+soundSha+'.bin';await bucket.put(soundKey,sound,{customMetadata:{sha256:soundSha}});const audio={storageKey:soundKey,storageSha256:soundSha,storageLength:10,length:10,mime:'audio/mpeg',version:'v1'};
const entries=[{key:soundKey,length:sound.length},{key,length:bytes.length}],batchHeaders={Authorization:'Bearer '+token,'X-Asset-Batch':Buffer.from(JSON.stringify(entries)).toString('base64')};
const batchReply=await handleAssetUpload(new Request('https://fixture/api/admin/assets',{method:'PUT',body:Buffer.concat([sound,bytes]),headers:batchHeaders}),env);assert.equal(batchReply.status,200);assert.equal((await batchReply.json()).objects.length,2);
const badBatch=await handleAssetUpload(new Request('https://fixture/api/admin/assets',{method:'PUT',body:Buffer.concat([sound,Buffer.from(bytes).fill(0)]),headers:batchHeaders}),env);assert.equal(badBatch.status,422);assert.equal(objects.size,2,'every checksum is validated before any batch write');
const inventory=await handleAssetUpload(new Request('https://fixture/api/admin/assets',{method:'POST',body:JSON.stringify([key,soundKey]),headers:{Authorization:'Bearer '+token}}),env);assert.equal(inventory.status,200);assert.deepEqual((await inventory.json()).objects.map(o=>o.size),[bytes.length,sound.length]);
for(const [range,want]of [['bytes=2-5','2345'],['bytes=-3','789'],['bytes=8-','89']]){const r=await serveStoredAsset(new Request('https://fixture/sound',{headers:{Range:range}}),env,audio,headers(),acceptsBrotli);assert.equal(r.status,206);assert.equal(await r.text(),want);}
assert.equal((await serveStoredAsset(new Request('https://fixture/sound',{headers:{Range:'bytes=20-'}}),env,audio,headers(),acceptsBrotli)).status,416);
const savedCaches=globalThis.caches,cache=new Map(),pending=[];let reads=0;
globalThis.caches={default:{async match(request){return cache.get(request.url)?.clone();},async put(request,response){cache.set(request.url,response);}}};
const cachedEnv={...env,GAME_ASSETS:{...bucket,async get(...args){reads++;return bucket.get(...args);}}},context={waitUntil(p){pending.push(p);}};
for(let i=0;i<2;i++){const r=await serveStoredAsset(new Request('https://fixture/model?v=v1'),cachedEnv,asset,headers(),acceptsBrotli,context);assert(Buffer.from(await r.arrayBuffer()).equals(raw));await Promise.all(pending);}
assert.equal(reads,1,'versioned public responses reuse edge storage');
const fresh=await serveStoredAsset(new Request('https://fixture/model'),cachedEnv,asset,headers(),acceptsBrotli,context);await fresh.arrayBuffer();assert.equal(reads,2,'unversioned request does not inherit an immutable cache entry');
for(const blocked of [Object.defineProperty({},'default',{get(){throw Error('This Worker is not permitted to access the default cache.');}}),{default:{async match(){throw Error('Cache lookup unavailable');}}},{default:{async match(){return null;},put(){throw Error('Cache write unavailable');}}}]){
 globalThis.caches=blocked;const r=await serveStoredAsset(new Request('https://fixture/model?v=v1'),env,asset,headers(),acceptsBrotli,context);assert.equal(r.status,200,'cache restrictions cannot block asset reads');assert(Buffer.from(await r.arrayBuffer()).equals(raw));await Promise.all(pending);
}
globalThis.caches=savedCaches;
console.log('PASS: authenticated checksum uploads, immutable keys, repeat safety, streamed Brotli/identity, HEAD, ETag, storage failures and audio ranges.');
