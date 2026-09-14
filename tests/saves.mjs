import {DatabaseSync} from 'node:sqlite';import assert from 'node:assert/strict';import fs from 'node:fs';import {handleAuth,handleSave,handlePlayers,SAVE_RESET_VERSION} from '../worker/api.js';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)},async all(){return{results:db.prepare(sql).all(...args)}},async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}}}}}}}}};
const req=(route,method='GET',body,cookie='',origin='https://game.test')=>new Request('https://game.test'+route,{method,headers:{origin,cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const auth=(action,body,cookie)=>handleAuth(req('/api/auth/'+action,action==='session'?'GET':'POST',body,cookie),env);
assert.equal((await handleSave(req('/api/character'),env)).status,401);
const credentials={username:'Test_Player',password:'test-only-password-489!'};let response=await auth('register',credentials);assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];assert.match(response.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Lax/);
assert.equal((await auth('register',{...credentials,username:'test_player'})).status,409);
assert.equal((await auth('login',{...credentials,password:'wrong-password-983!'})).status,401);
const login=await auth('login',{...credentials,username:'TEST_PLAYER'});assert.equal(login.status,200);const secondCookie=login.headers.get('set-cookie').split(';')[0];
assert.equal((await(await auth('session',null,secondCookie)).json()).account.username,'Test_Player');
const record=await(await handleSave(req('/api/character','GET',null,cookie),env)).json();assert.equal(record.state,null);
const state={mountainQuest:{version:1,stage:17,clues:['ledger','tools','summons'],bindings:['child','miner','keeper'],inscription:true,lairKey:true,ward:true,reward1:true,choice:'warn'},sceneId:'overworld',combatProgress:{kills:{forestgiant:2},firstClears:{}},boss:true,wardenClear:true,x:42,y:51,hp:10,gold:0,xp:{Attack:0},bag:{},equipment:{},character:{name:'Test_Player',frame:'female',hair:3,skin:4,topStyle:1,topColor:2,bottomColor:5,hairColor:2,beard:0}};
assert.equal((await handleSave(req('/api/character','PUT',{state,revision:0,resetVersion:SAVE_RESET_VERSION},cookie),env)).status,200);
assert.deepEqual((await(await handleSave(req('/api/character','GET',null,secondCookie),env)).json()).state.character,state.character);
const savedCharacter=(await(await handleSave(req('/api/character','GET',null,secondCookie),env)).json()).state;assert.deepEqual(savedCharacter.combatProgress,state.combatProgress);assert.deepEqual(savedCharacter.mountainQuest,state.mountainQuest,'quest evidence, key, choices and assistance stage survive cross-device saves');assert(savedCharacter.boss&&savedCharacter.wardenClear,'legacy quest completion survives the creature release');
// Names are fixed after the first successful save; appearances remain editable.
for(const character of [{...state.character,name:'Renamed'},null,{},undefined]){
 const rejected=await handleSave(req('/api/character','PUT',{state:{...state,character},revision:1,resetVersion:SAVE_RESET_VERSION},cookie),env);
 assert.equal(rejected.status,400);assert.match((await rejected.json()).error,/name is permanent/);
}
let current=await (await handleSave(req('/api/character','GET',null,secondCookie),env)).json();assert.equal(current.revision,1);assert.deepEqual(current.state,state,'rejected renames cannot alter the save');
const restyled={...state,character:{...state.character,frame:'male',hair:1,topColor:6}};
assert.equal((await handleSave(req('/api/character','PUT',{state:restyled,revision:1,resetVersion:SAVE_RESET_VERSION},cookie),env)).status,200);
current=await (await handleSave(req('/api/character','GET',null,secondCookie),env)).json();assert.equal(current.state.character.name,'Test_Player');assert.equal(current.state.character.hair,1);assert.equal(current.state.character.topColor,6);
assert.equal((await handleSave(req('/api/character','PUT',{state,revision:1,resetVersion:SAVE_RESET_VERSION},cookie),env)).status,409,'stale saves still cannot overwrite the latest appearance');
const peer=await handlePlayers(req('/api/players','POST',{scene:'overworld',x:42,y:51},cookie),env);assert.equal(peer.status,200);
const stored=db.prepare('SELECT password_hash FROM game_accounts').get().password_hash;assert.match(stored,/^\$2[ab]\$12\$/);assert.notEqual(stored,credentials.password);assert.equal(db.prepare('SELECT count(*) n FROM game_sessions WHERE token_hash=?').get(cookie.split('=')[1]).n,0);
assert.equal((await handleAuth(req('/api/auth/register','POST',credentials,'','https://evil.test'),env)).status,403);
await auth('logout',null,cookie);assert.equal((await handleSave(req('/api/character','GET',null,cookie),env)).status,401);
assert.equal((await handleSave(req('/api/character','GET',null,secondCookie),env)).status,200);
for(let i=0;i<13;i++)response=await auth('login',{username:'Missing_Player',password:'wrong-password-983!'});assert.equal(response.status,429);
console.log('PASS: required login, registration, unique usernames, password verification/hashing, cross-device save and appearance, logout, CSRF checks, session hashes, and rate limits.');
