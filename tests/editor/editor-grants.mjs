import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {editorAccess,handleEditorEdits} from '../../worker/editor.js';
import worker from '../../dist/server/index.js';

const db=new DatabaseSync(':memory:');
db.exec('CREATE TABLE game_accounts(id TEXT PRIMARY KEY,username TEXT); CREATE TABLE game_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT,expires_at INTEGER); CREATE TABLE character_saves(user_id TEXT PRIMARY KEY,state TEXT);');
db.exec(readFileSync(new URL('../../drizzle/0018_nappy_violations.sql',import.meta.url),'utf8'));
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',editor='c8d72496-db94-4efc-b612-8de163d37b3a';
const ownerToken='a'.repeat(64),editorToken='b'.repeat(64),visitorToken='c'.repeat(64);
for(const [id,username,token] of [[owner,'owner',ownerToken],[editor,'Larock420',editorToken],['other-account','Larock420',visitorToken]]){
 db.prepare('INSERT INTO game_accounts VALUES (?,?)').run(id,username);
 db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,Date.now()+60000);
 db.prepare('INSERT INTO character_saves VALUES (?,?)').run('account:'+id,'preserved character');
}
const env={VELDREN_EDITOR_ACCOUNT_IDS:editor,DB:{prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}}};
const req=(path,token,method='GET',body,origin='https://veldren.test')=>new Request('https://veldren.test'+path,{method,headers:{origin,...(token?{cookie:'ember_session='+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
for(const handler of [editorAccess,(request,env)=>worker.fetch(request,env)]){
 assert.equal((await handler(req('/api/editor/access',editorToken),env)).status,200);
 assert.equal((await handler(req('/api/editor/access',ownerToken),env)).status,200);
 assert.equal((await handler(req('/api/editor/access',visitorToken),env)).status,403,'matching username cannot inherit a grant');
 assert.equal((await handler(req('/api/editor/access'),env)).status,403,'an unauthenticated visitor cannot use the grant');
}
for(const path of ['/editor','/editor/','/editor/index.html','/editor/viewport.html','/editor/editor-runtime.js']){
 const response=await worker.fetch(req(path,editorToken),env);assert.equal(response.status,200,path);
 if(path!=='/editor/editor-runtime.js')assert(!/id="editorLogin"/.test(await response.text()),'granted account opens the editor');
}
const initial=await (await handleEditorEdits(req('/api/editor/edits'),env)).json();
const body={version:1,expectedRevision:initial.revision,changes:[...initial.edits.changes,{scene:'overworld',kind:'object',id:'editor-grant-test',x:10,y:11,rotation:0,scale:1}]};
assert.equal((await worker.fetch(req('/api/editor/edits',editorToken,'PUT',body,'https://elsewhere.test'),env)).status,403,'grants retain origin checks');
const saved=await worker.fetch(req('/api/editor/edits',editorToken,'PUT',body),env);assert.equal(saved.status,200,await saved.clone().text());
assert.equal(db.prepare('SELECT updated_by FROM editor_world WHERE id=1').get().updated_by,editor,'save audit records the actual editor');
assert.equal((await worker.fetch(req('/api/editor/edits',editorToken,'PUT',body),env)).status,409,'grant retains save conflict protection');
env.VELDREN_EDITOR_ACCOUNT_IDS='Larock420';
assert.equal((await editorAccess(req('/api/editor/access',editorToken),env)).status,403,'usernames are not account ID grants');
assert.equal((await worker.fetch(req('/api/editor/access',editorToken),env)).status,403,'revoking a grant removes access');
assert.equal((await worker.fetch(req('/api/editor/access',ownerToken),env)).status,200,'owner access remains');
assert.equal((await worker.fetch(req('/api/editor/edits',editorToken,'PUT',{...body,expectedRevision:initial.revision+1}),env)).status,403,'revoked editor cannot save');
assert.equal(db.prepare('SELECT count(*) AS n FROM character_saves WHERE state=?').get('preserved character').n,3,'editor grants preserve all characters');
assert.equal(db.prepare('SELECT count(*) AS n FROM game_accounts').get().n,3,'editor grants preserve all accounts');
db.close();
console.log('PASS: granted account opens and saves in the production editor; owner access, identity checks, revocation, origin checks, save conflicts and character preservation.');
