import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
import worker from '../dist/server/index.js';
const request=path=>worker.fetch(new Request('https://emberfall.test'+path),{});
async function body(response){
 assert.equal(response.headers.get('Content-Encoding'),null,'Worker must return ordinary bodies; the hosting runtime owns transport compression');
 return Buffer.from(await response.arrayBuffer());
}
const page=await request('/');assert.equal(page.status,200);assert.equal(page.headers.get('Cache-Control'),'no-cache');
const html=(await body(page)).toString();assert.match(html,/^<!doctype html>/i,'Home screen launch must receive HTML, never compressed bytes');
const urls=[...html.matchAll(/(?:src|href)="([^"?#]+\?v=[a-f0-9]+)"/g)].map(m=>m[1]);
assert(urls.some(url=>url.startsWith('startup.js?')));assert(html.indexOf('window.REALM_ASSET_VERSIONS=')<html.indexOf('src="startup.js?'));
const versions=JSON.parse(html.match(/window.REALM_ASSET_VERSIONS=(.+?);<\/script>/)[1]);
for(const path of ['assets/realms/atlas.png','assets/bounds.json','assets/items.png','assets/environment.png','assets/spirits.png'])urls.push(versions[path]);
let totalBytes=0;
for(const url of urls){
 const response=await request('/'+url);assert.equal(response.status,200,url);assert(response.headers.get('Cache-Control').includes('immutable'),url);
 const content=await body(response);totalBytes+=content.length;assert(content.length>0,url);
 if(url.split('?')[0].endsWith('.js'))new Script(content.toString(),{filename:url});
 if(/\.(json|webmanifest)\?/.test(url))JSON.parse(content.toString());
 if(url.startsWith('assets/realms/monsters.js?'))assert.deepEqual(content,readFileSync(new URL('../dist/assets/realms/monsters.js',import.meta.url)));
 const cached=await worker.fetch(new Request('https://emberfall.test/'+url,{headers:{'If-None-Match':response.headers.get('ETag')}}),{});assert.equal(cached.status,304);assert.equal((await cached.arrayBuffer()).byteLength,0);
}
const legacyVersion=createHash('sha256').update(readFileSync(new URL('../dist/creatures.js',import.meta.url))).digest('hex').slice(0,16);
assert.notEqual(versions['creatures.js'],'creatures.js?v='+legacyVersion,'Fresh URLs must bypass any incorrectly cached compressed assets');
const launch=await worker.fetch(new Request('https://emberfall.test/',{headers:{'Accept-Encoding':'gzip, deflate, br'}}),{});assert.match((await body(launch)).toString(),/^<!doctype html>/i);
assert.equal((await request('/creatures.js?v=outdated')).status,409,'mismatched publications cannot silently mix code');
assert.equal((await request('/creatures.js')).headers.get('Cache-Control'),'no-cache');
console.log(`PASS: readable home page, all ${urls.length} startup resources, JavaScript parsing, JSON parsing, fresh cache URLs, and conditional requests. ${(totalBytes/1048576).toFixed(2)} MiB before hosting compression.`);
