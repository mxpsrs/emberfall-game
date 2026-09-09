import {DatabaseSync} from 'node:sqlite';import assert from 'node:assert/strict';import fs from 'node:fs';import {handleSave} from '../worker/api.js';
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('../drizzle/0000_amazing_black_bolt.sql',import.meta.url),'utf8'));
const env={DB:{prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)},async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}}}}}}}}};
const state={x:14,y:17,hp:30,gold:1,xp:{Combat:2},bag:{fish:3},gear:{},equipment:{}};
const req=(user,method='GET',body)=>new Request('https://game.test/api/character',{method,headers:user?{'oai-authenticated-user-id':user}:{},...(body?{body:JSON.stringify(body)}:{})});
assert.equal((await handleSave(req(null),env)).status,401);assert.equal((await handleSave(req('a','PUT',{revision:0,state}),env)).status,200);assert.equal((await handleSave(req('a','PUT',{revision:0,state}),env)).status,409);assert.equal((await handleSave(req('a','PUT',{revision:1,state:{...state,gold:5}}),env)).status,200);assert.equal((await handleSave(req('a','PUT',{revision:1,state}),env)).status,409);assert.equal((await(await handleSave(req('a'),env)).json()).state.gold,5);assert.equal((await(await handleSave(req('b'),env)).json()).state,null);assert.equal((await handleSave(req('a','PUT',{revision:2,state:{}}),env)).status,400);console.log('PASS: save migration, account isolation, reload, invalid saves, concurrent save protection.');

// Reproduce the live Sites request: email is forwarded but user ID is absent.
const emailReq=(email,method='GET',body,id)=>new Request('https://game.test/api/character',{method,headers:{'oai-authenticated-user-email':email,...(id?{'oai-authenticated-user-id':id}:{})},...(body?{body:JSON.stringify(body)}:{})});
let response=await handleSave(emailReq('player@example.test'),env);assert.equal(response.status,200);let record=await response.json();assert.equal(record.state,null);assert.equal(record.revision,0);assert(!record.account.includes('player@'));
const created={...state,character:{name:'Ember',look:2}};
assert.equal((await handleSave(emailReq('player@example.test','PUT',{state:created,revision:0}),env)).status,200);
record=await (await handleSave(emailReq(' PLAYER@example.test '),env)).json();assert.equal(record.state.character.name,'Ember');assert.equal(record.revision,1);
assert.equal((await (await handleSave(emailReq('other@example.test'),env)).json()).state,null);
record=await (await handleSave(emailReq('player@example.test','GET',null,'new-platform-id'),env)).json();assert.equal(record.state.character.name,'Ember');
assert.equal((await handleSave(req(null,'PUT',{account:record.account,state:created,revision:1}),env)).status,401);
console.log('PASS: production email-only identity, new character, reload, normalization, account isolation, ID transition, unauthenticated write rejection.');
