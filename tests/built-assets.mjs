import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import worker from '../dist/server/index.js';
const request=path=>worker.fetch(new Request('https://emberfall.test'+path),{});
async function body(response){const data=Buffer.from(await response.arrayBuffer());return response.headers.get('Content-Encoding')==='gzip'?gunzipSync(data):data;}
const page=await request('/');assert.equal(page.status,200);assert.equal(page.headers.get('Cache-Control'),'no-cache');
const html=(await body(page)).toString();const urls=[...html.matchAll(/(?:src|href)="([^"?#]+\?v=[a-f0-9]+)"/g)].map(m=>m[1]);
assert(urls.some(url=>url.startsWith('startup.js?')));assert(html.indexOf('window.REALM_ASSET_VERSIONS=')<html.indexOf('src="startup.js?'));
const versions=JSON.parse(html.match(/window.REALM_ASSET_VERSIONS=(.+?);<\/script>/)[1]);
for(const path of ['assets/realms/atlas.png','assets/bounds.json','assets/items.png','assets/environment.png','assets/spirits.png'])urls.push(versions[path]);
let encodedBytes=0,decodedBytes=0;
for(const url of urls){
 const response=await request('/'+url);assert.equal(response.status,200,url);assert(response.headers.get('Cache-Control').includes('immutable'),url);
 const data=Buffer.from(await response.arrayBuffer());encodedBytes+=data.length;const content=response.headers.get('Content-Encoding')==='gzip'?gunzipSync(data):data;decodedBytes+=content.length;assert(content.length>0,url);
 if(url.startsWith('assets/realms/monsters.js?'))assert.deepEqual(content,readFileSync(new URL('../dist/assets/realms/monsters.js',import.meta.url)));
 const cached=await worker.fetch(new Request('https://emberfall.test/'+url,{headers:{'If-None-Match':response.headers.get('ETag')}}),{});assert.equal(cached.status,304);assert.equal((await cached.arrayBuffer()).byteLength,0);
}
assert.equal((await request('/creatures.js?v=outdated')).status,409,'mismatched publications cannot silently mix code');
assert.equal((await request('/creatures.js')).headers.get('Cache-Control'),'no-cache');
console.log(`PASS: all ${urls.length} startup resources, gzip decoding, versioned caching, conditional requests, and update mismatch recovery. First-load resources: ${(encodedBytes/1048576).toFixed(2)} MiB transferred / ${(decodedBytes/1048576).toFixed(2)} MiB decoded.`);
