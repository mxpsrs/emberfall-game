import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleEditorEdits,editorAccess} from '../../worker/editor.js';
import worker from '../../dist/server/index.js';
const db=new DatabaseSync(':memory:');
db.exec('CREATE TABLE game_accounts(id TEXT PRIMARY KEY,username TEXT); CREATE TABLE game_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT,expires_at INTEGER); CREATE TABLE character_saves(user_id TEXT PRIMARY KEY,state TEXT);');
db.exec(readFileSync(new URL('../../drizzle/0018_nappy_violations.sql',import.meta.url),'utf8'));
db.prepare('INSERT INTO character_saves VALUES (?,?)').run('untouched','existing character');
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token='a'.repeat(64),visitor='b'.repeat(64);
for(const [id,name,t] of [[owner,'owner',token],['visitor','Visitor',visitor]]){
 db.prepare('INSERT INTO game_accounts VALUES (?,?)').run(id,name);
 db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(t).digest('hex'),id,Date.now()+60000);
}
const env={DB:{prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}}};
const req=(path,method='GET',body,t,origin='https://veldren.test')=>new Request('https://veldren.test'+path,{method,headers:{origin,...(t?{cookie:'ember_session='+t}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const api=(method,body,t,origin)=>handleEditorEdits(req('/api/editor/edits',method,body,t,origin),env);
assert.equal((await editorAccess(req('/api/editor/access','GET',null,visitor),env)).status,403);
assert.equal((await editorAccess(req('/api/editor/access','GET',null,token),env)).status,200);
const initial=await (await api('GET')).json();assert(initial.count>0,'seeded source world retained');
const assembly={version:1,buildingId:'house-test',parent:[1,0,0,10,0,1,0,0,0,0,1,11],modules:[{id:'wall',model:'rebuilt:Wall_UnevenBrick_Straight',role:'wall',floor:0,local:[1,0,0,0,0,1,0,0,0,0,1,0],bounds:[[0,0,0],[2,3,.2]]}],layout:[]};
const terrain={version:1,scenes:{overworld:{heightNodes:[{x:205,z:203,delta:.75}],paintCells:[{x:205,z:203,material:'paving'}]}}};
const body={version:1,expectedRevision:initial.revision,changes:[...initial.edits.changes,{scene:'overworld',kind:'object',id:'test-placement',x:10,y:11,rotation:20,scale:1},{scene:'overworld',kind:'building',id:'house-test',x:10,y:11,rotation:0,scale:1,assembly}],terrain};
assert.equal((await api('PUT',body)).status,403);
assert.equal((await api('PUT',body,visitor)).status,403);
assert.equal((await api('PUT',body,token,'https://elsewhere.test')).status,403);
assert.equal((await api('PUT',{...body,expectedRevision:undefined},token)).status,400);
const attempts=await Promise.all([api('PUT',body,token),api('PUT',body,token)]);
assert.deepEqual(attempts.map(x=>x.status).sort(),[200,409]);
const saved=await attempts.find(x=>x.status===200).json();
const verified=await (await api('GET')).json();assert.deepEqual(verified.edits.changes.find(c=>c.id==='house-test').assembly,assembly,'building hierarchy survives production save/reload');assert.deepEqual(verified.edits.terrain,terrain,'sculpted nodes and painted cells survive owner save/production reload');assert.equal(saved.sha256,verified.sha256);assert.equal(saved.revision,initial.revision+1);
assert.equal(JSON.parse(db.prepare('SELECT previous_document FROM editor_world').get().previous_document).revision,initial.revision);
const previousClient=await api('PUT',{version:1,expectedRevision:verified.revision,changes:body.changes},token);assert.equal(previousClient.status,200);
const preserved=await (await api('GET')).json();assert.deepEqual(preserved.edits.terrain,terrain,'older editor saves preserve the existing terrain layer');
assert.equal((await api('PUT',{version:1,expectedRevision:preserved.revision,changes:body.changes,terrain:{version:1,scenes:{overworld:{heightNodes:[{x:205,z:203,delta:Infinity}],paintCells:[]}}}},token)).status,400);
assert.equal((await api('PUT',{...body,expectedRevision:preserved.revision,changes:[{id:'bad'}]},token)).status,400);
assert.equal((await api('DELETE',null,token)).status,405);
assert.equal(db.prepare('SELECT state FROM character_saves').get().state,'existing character');
assert.equal(db.prepare('SELECT count(*) n FROM game_accounts').get().n,2);
for(const path of ['/editor','/editor/','/editor/index.html']){
 let response=await worker.fetch(req(path),env);assert.equal(response.status,200);const login=await response.text();assert.match(login,/id="editorLogin"/);assert.match(login,/name="username"[^>]*value="owner"/);assert.match(response.headers.get('Cache-Control'),/no-store/);
 response=await worker.fetch(req(path,'GET',null,token),env);assert.equal(response.status,200);const shell=await response.text();assert.match(shell,/id="gameFrame"/);
 assert.match(shell,/id="assetDock"/);assert.match(shell,/aria-label="Editor menus"/);
 for(const match of shell.matchAll(/<script[^>]+src="([^"]+)"/g))assert.equal((await worker.fetch(req(match[1],'GET',null,token),env)).status,200,'authenticated editor shell script '+match[1]);
}
assert.equal((await worker.fetch(req('/editor/editor-runtime.js'),env)).status,403);
assert.equal((await worker.fetch(req('/editor/editor-runtime.js','GET',null,token),env)).status,200);
const viewport=await worker.fetch(req('/editor/viewport.html','GET',null,token),env);
assert.equal(viewport.status,200);const editorHtml=await viewport.text();
assert.match(editorHtml,/window.REALM_ASSET_VERSIONS=/);
assert.match(editorHtml,/sourceURL=editor\/editor-runtime.js\?v=/,'controls are delivered with the viewport');
for(const file of ['asset-runtime','asset-textures','asset-materials','asset-meshes','asset-draws','scene-renderer','world-performance']){
 assert(editorHtml.includes('sourceURL='+file+'.js?v='),file+' is delivered in the viewport');
 assert(!editorHtml.includes('<script src="'+file+'.js'),file+' requires no separate script download');
}
assert(editorHtml.indexOf('sourceURL=editor/editor-runtime.js')<editorHtml.indexOf('sourceURL=editor/editor-entry.js'));
for(const match of editorHtml.matchAll(/<script[^>]+src="([^"]+)"/g)){
 const path='/'+match[1].replace(/^\//,'');assert.equal((await worker.fetch(req(path,'GET',null,token),env)).status,200,path);
}
const play=await worker.fetch(req('/play'),env);assert.equal(play.status,200);const html=await play.text();assert.match(html,/world-edits-runtime.js\?v=/);
for(const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)){
 const path='/'+match[1].replace(/^\//,'');assert.equal((await worker.fetch(req(path),env)).status,200,path);
}
assert.equal((await worker.fetch(req('/api/editor/edits'),env)).status,200);
console.log('PASS: production play/editor routes, script loading, owner access, building/terrain save-readback, concurrent-save conflict, old-client terrain preservation, validation and account/save preservation.');
db.close();
