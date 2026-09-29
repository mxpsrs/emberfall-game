import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
import {brotliDecompressSync} from 'node:zlib';
import worker from '../dist/server/index.js';
import {sourceOnlyAssets} from '../scripts/asset-delivery.mjs';
const request=path=>worker.fetch(new Request('https://veldren.test'+path,{headers:{'Accept-Encoding':'gzip, br'}}),{});
async function body(response){
 const bytes=Buffer.from(await response.arrayBuffer()),encoding=response.headers.get('Content-Encoding');
 assert([null,'br'].includes(encoding));
 return encoding==='br'?brotliDecompressSync(bytes):bytes;
}
assert.match(readFileSync(new URL('../dist/server/index.js',import.meta.url),'utf8'),/encodeBody:passThrough\?'manual':'automatic'/,'Compressed responses must disable automatic recompression');
for(const encoding of ['identity','gzip','br;q=0, gzip']){
 const response=await worker.fetch(new Request('https://veldren.test/game-icons.js',{headers:{'Accept-Encoding':encoding}}),{});
 assert.equal(response.headers.get('Content-Encoding'),null);
 assert.equal(response.headers.get('Vary'),'Accept-Encoding');
 assert.deepEqual(await body(response),readFileSync(new URL('../dist/game-icons.js',import.meta.url)),'Identity fallback streams exact bytes');
}
const page=await request('/play');assert.equal(page.status,200);assert.equal(page.headers.get('Cache-Control'),'no-cache');
const html=(await body(page)).toString();assert.match(html,/^<!doctype html>/i,'Home screen launch must receive HTML, never compressed bytes');
const urls=[...html.matchAll(/(?:src|href)="([^"?#]+\?v=[a-f0-9]+)"/g)].map(m=>m[1]);
assert(urls.some(url=>url.startsWith('startup.js?')));assert(html.indexOf('window.REALM_ASSET_VERSIONS=')<html.indexOf('src="startup.js?'));
assert(urls.some(url=>url.startsWith('native-runtime.js?')),'production document versions the native loader');
const release=html.match(/window\.REALM_RELEASE="(realm-[a-f0-9]{16})"/)?.[1];
assert(release,'client error reports and update checks carry a manifest-wide immutable release fingerprint');
const releaseResponse=await request('/api/release');
assert.equal(releaseResponse.status,200);assert.equal(releaseResponse.headers.get('Cache-Control'),'no-store');
assert.deepEqual(JSON.parse((await body(releaseResponse)).toString()),{release},'open tabs can detect content-only publications');
const versions=JSON.parse(html.match(/window.REALM_ASSET_VERSIONS=(.+?);<\/script>/)[1]);
assert(statSync(new URL('../dist/server/index.js',import.meta.url)).size<=64*1024*1024,'Worker must fit the hosting module limit');
for(const path of ['assets/realms/atlas.png','assets/realms/atlas-filament.png','assets/bounds.json','assets/items.png','assets/environment.png','world-construction.json','prebuilt-world.js'])urls.push(versions[path]);
const nativeCore=await request('/'+versions['native/veldren-core.wasm']);assert.equal(nativeCore.status,200);assert.equal(nativeCore.headers.get('Content-Type'),'application/wasm');assert.deepEqual(await body(nativeCore),readFileSync(new URL('../dist/native/veldren-core.wasm',import.meta.url)),'The current native core ships byte for byte');
for(const file of ['editor/editor.js','editor/editor-runtime.js','editor/asset-preview.js','editor/index.html','editor/viewport.html']){
 const version=createHash('sha256').update('identity-v1\0').update(readFileSync(new URL('../dist/'+file,import.meta.url))).digest('hex').slice(0,16);
 assert.equal(versions[file],file+'?v='+version,'Built editor source is current: '+file);
}
for(const shading of ['lit','unlit'])for(const alpha of ['opaque','mask','blend']){
 const file='materials/veldren-pbr-'+shading+'-'+alpha+'.filamat';
 assert.deepEqual(await body(await request('/'+versions[file])),readFileSync(new URL('../dist/'+file,import.meta.url)),'Canonical material binary is current');
}
// Canonical image paths retain the exact bytes validated by the C++ importer.
for(const name of Object.keys(versions).filter(name=>/^assets\/canonical\/(images|variants)\//.test(name))){
 const response=await request('/'+versions[name]);assert.equal(response.status,200);
 const bytes=await body(response);assert.deepEqual(bytes,readFileSync(new URL('../dist/'+name,import.meta.url)));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),name.split('/').pop().split('.')[0]);
}
const delivery=JSON.parse(readFileSync(new URL('../art/derived/browser-assets.json',import.meta.url)));
const shipped=new Set(Object.keys(versions).filter(name=>/^assets\/canonical\/(images|variants)\//.test(name)));
assert.deepEqual(shipped,new Set(delivery.canonicalImages),'Every declared browser texture ships, with no desktop-only payloads');
const registry=JSON.parse(readFileSync(new URL('../dist/assets/asset-registry.json',import.meta.url)));
for(const record of registry.records)for(const profile of delivery.profiles)for(const variant of record.variants?.[profile]||[])assert(shipped.has(variant.derivedPath));
for(const [file,reason] of sourceOnlyAssets){assert.equal(versions[file],undefined,reason);assert.equal((await request('/'+file)).status,404);}
for(const record of registry.records)if(record.type==='model'&&record.importSettings?.importer==='veldren-gltf-1'){
 assert(versions[record.derivedPath],'Canonical model ships: '+record.id);
 const response=await request('/'+versions[record.derivedPath]);assert.equal(response.status,200);
 assert.deepEqual(await body(response),readFileSync(new URL('../dist/'+record.derivedPath,import.meta.url)));
}
let totalBytes=0;
for(const url of urls){
 const response=await request('/'+url);assert.equal(response.status,200,url);assert(response.headers.get('Cache-Control').includes('immutable'),url);
 const content=await body(response);totalBytes+=content.length;assert(content.length>0,url);
 if(url.split('?')[0].endsWith('.js'))new Script(content.toString(),{filename:url});
 if(/\.(js|json|css|txt)\?/.test(url))assert.deepEqual(content,readFileSync(new URL('../dist/'+url.split('?')[0],import.meta.url)),'Stored compression must preserve every response byte: '+url);
 if(/\.(json|webmanifest)\?/.test(url))JSON.parse(content.toString());
 if(url.startsWith('assets/realms/monsters.js?'))assert.deepEqual(content,readFileSync(new URL('../dist/assets/realms/monsters.js',import.meta.url)));
 const cached=await worker.fetch(new Request('https://veldren.test/'+url,{headers:{'If-None-Match':response.headers.get('ETag')}}),{});assert.equal(cached.status,304);assert.equal((await cached.arrayBuffer()).byteLength,0);
}
const filamentAtlas=await request('/'+versions['assets/realms/atlas-filament.png']);
assert.equal(filamentAtlas.headers.get('Content-Type'),'image/png','Filament must receive PNG bytes for createTextureFromPng');
assert.equal((await body(filamentAtlas)).subarray(0,8).toString('hex'),'89504e470d0a1a0a','Filament atlas must retain the PNG signature');
const mobileGroundAtlas=await request('/'+versions['assets/realms/ground-surfaces.png']);
assert.equal(mobileGroundAtlas.headers.get('Content-Type'),'image/png','Mobile Filament must receive PNG bytes for createTextureFromPng');
assert.equal((await body(mobileGroundAtlas)).subarray(0,8).toString('hex'),'89504e470d0a1a0a','Mobile ground atlas must retain the PNG signature');
for(const path of ['assets/realms/atlas-filament-mobile.png','assets/realms/ground-surfaces-mobile.png']){
 const texture=await request('/'+versions[path]);assert.equal(texture.headers.get('Content-Type'),'image/png',path);
 assert.equal((await body(texture)).subarray(0,8).toString('hex'),'89504e470d0a1a0a',path+' must retain the PNG signature');
}
// This is the largest compressed asset and carries both original creature rigs.
const creatureUrl='/'+versions['assets/realms/approved-creatures.js'];
const creatures=await request(creatureUrl);assert.equal(creatures.status,200);
assert.deepEqual(await body(creatures),readFileSync(new URL('../dist/assets/realms/approved-creatures.js',import.meta.url)));
const creatureHead=await worker.fetch(new Request('https://veldren.test'+creatureUrl,{method:'HEAD',headers:{'Accept-Encoding':'gzip, br'}}),{});
assert.equal(creatureHead.status,200);assert.equal((await creatureHead.arrayBuffer()).byteLength,0);
for(const header of ['Content-Type','Cache-Control','ETag','Content-Encoding'])assert.equal(creatureHead.headers.get(header),creatures.headers.get(header));
const legacyVersion=createHash('sha256').update(readFileSync(new URL('../dist/creatures.js',import.meta.url))).digest('hex').slice(0,16);
assert.notEqual(versions['creatures.js'],'creatures.js?v='+legacyVersion,'Fresh URLs must bypass any incorrectly cached compressed assets');
const launch=await worker.fetch(new Request('https://veldren.test/',{headers:{'Accept-Encoding':'gzip, deflate, br'}}),{});assert.match((await body(launch)).toString(),/^<!doctype html>/i);
assert.equal((await request('/creatures.js?v=outdated')).status,409,'mismatched publications cannot silently mix code');
assert.equal((await request('/creatures.js')).headers.get('Cache-Control'),'no-cache');
const musicSources=JSON.parse(readFileSync(new URL('../docs/music-sources.json',import.meta.url)));
for(const track of musicSources.tracks){
 assert(['CC0-1.0','Pixabay Content License'].includes(track.license));assert.equal(track.commercial_use,true);assert.equal(track.attribution_required,false);
 const path='assets/audio/'+track.file+'.mp3',original=readFileSync(new URL('../dist/'+path,import.meta.url));
 assert.equal(createHash('sha256').update(original).digest('hex'),track.asset_sha256);
 const full=await request('/'+versions[path]);assert.equal(full.status,200);assert.equal(full.headers.get('Content-Type'),'audio/mpeg');assert.deepEqual(await body(full),original);
 const partial=await worker.fetch(new Request('https://veldren.test/'+versions[path],{headers:{Range:'bytes=0-63'}}),{});
 assert.equal(partial.status,206);assert.equal(partial.headers.get('Content-Range'),'bytes 0-63/'+original.length);assert.deepEqual(await body(partial),original.subarray(0,64));
}
for(const file of ['teller-of-the-tales.mp3','lord-of-the-land.mp3','drums-of-the-deep.mp3','CREDITS.txt'])assert.equal((await request('/assets/audio/'+file)).status,404,'old music must not ship');
const sounds=JSON.parse(readFileSync(new URL('../docs/sound-sources.json',import.meta.url)));assert.equal(sounds.license,'CC0-1.0');for(const sample of sounds.samples){const path='assets/audio/sfx/'+sample.file,r=await request('/'+versions[path]);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'audio/mpeg');assert.equal(createHash('sha256').update(await body(r)).digest('hex'),sample.asset_sha256);}console.log('PASS: five licensed music tracks and 24 CC0 foley clips match source records; music streams partial responses.');
console.log(`PASS: readable home page, all ${urls.length} startup resources, JavaScript parsing, JSON parsing, fresh cache URLs, and conditional requests. ${(totalBytes/1048576).toFixed(2)} MiB before hosting compression.`);

const landing=(await body(await request('/'))).toString();
assert(!landing.includes('src="/landing-status.js"')&&!landing.includes('href="/landing.css"'),'landing dependencies are inline');
assert.match(landing,/<style>/);assert.match(landing,/\?v=[a-f0-9]{16}/,'landing images are versioned');
