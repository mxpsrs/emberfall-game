import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {handleSave,handleAuth,SAVE_RESET_VERSION} from '../../worker/api.js';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){
 return {bind(...args){
  return {first:async()=>db.prepare(sql).get(...args),run:async()=>({meta:{changes:db.prepare(sql).run(...args).changes}})};
 }};
}}};
const request=(path,body,cookie='')=>new Request('https://test.game'+path,{method:path.includes('auth')?'POST':'PUT',headers:{origin:'https://test.game',cookie},body:JSON.stringify(body)});
const login=await handleAuth(request('/api/auth/register',{username:'RetryProof',password:'Test-retry-991'}),env);assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
const body={revision:0,resetVersion:SAVE_RESET_VERSION,state:{character:{name:'Retry'},xp:{},bag:{},x:55,y:61,hp:30,gold:10,_saveRequestId:'stable-request-1'}};
const save=b=>handleSave(request('/api/character',b,cookie),env);
const replies=await Promise.all([save(body),save(body)]);assert(replies.every(r=>r.status===200),'concurrent retry acknowledges single commit');assert.equal(db.prepare('SELECT revision FROM character_saves').get().revision,1);
assert.equal((await save(body)).status,200,'lost response retry succeeds');assert.equal(db.prepare('SELECT revision FROM character_saves').get().revision,1,'no extra revision or reward');
assert.equal((await save({...body,state:{...body.state,gold:999}})).status,409,'changed stale snapshot rejected');
assert.equal((await save({...body,state:{...body.state,_saveRequestId:'other-device'}})).status,409,'other-device revision conflict preserved');
assert.equal((await save({...body,resetVersion:'stale-reset'})).status,409,'reset guard preserved');
assert.equal((await save({...body,revision:1,state:{...body.state,gold:11,_saveRequestId:'next-request'}})).status,200);assert.equal(db.prepare('SELECT revision FROM character_saves').get().revision,2);
console.log('PASS: authenticated concurrent/lost-response save retries commit once; changed payloads, other-device conflicts and reset guards remain protected.');
