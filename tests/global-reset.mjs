import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleSave,handleAuth,handlePlayers,SAVE_RESET_VERSION} from '../worker/api.js';
import {GLOBAL_ACCOUNT_RESET} from '../worker/reset-policy.js';

const {migration}=GLOBAL_ACCOUNT_RESET;
const journal=JSON.parse(fs.readFileSync('drizzle/meta/_journal.json','utf8'));
const resetIndex=journal.entries.findIndex(entry=>entry.tag+'.sql'===migration);
assert(resetIndex>=0,'the current reset is registered for publication');
const resetSQL=fs.readFileSync('drizzle/'+migration,'utf8');
function databaseBeforeReset(){
  const db=new DatabaseSync(':memory:');
  for(const entry of journal.entries.slice(0,resetIndex))db.exec(fs.readFileSync('drizzle/'+entry.tag+'.sql','utf8'));
  return db;
}
const db=databaseBeforeReset();
const env={DB:{prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)},async all(){return{results:db.prepare(sql).all(...args)}},async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}}}}}}}}};
const request=(route,method='GET',cookie='',body)=>new Request('https://game.test'+route,{method,headers:{cookie,origin:'https://game.test'},...(body?{body:JSON.stringify(body)}:{})});
const credentials={username:'reset_tester',password:'abcde'};
const registered=await handleAuth(request('/api/auth/register','POST','',credentials),env);
assert.equal(registered.status,200);
const oldCookie=registered.headers.get('set-cookie').split(';')[0];
const account=db.prepare('SELECT * FROM game_accounts').get();
for(const id of ['second-player','no-character']){
  db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(id,id,id,account.password_hash,1);
  db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run('fixture-'+id,id,Date.now()+100000);
}
const accountsBefore=db.prepare('SELECT * FROM game_accounts ORDER BY id').all();
const old={character:{name:'Veteran'},xp:{Attack:100000},bag:{runeBar:50},bank:{fish:200},gear:{bronze_dagger:1},equipment:{weapon:'bronze_dagger'},gold:9999,spirits:{cinder:true},combatProgress:{firstClears:{colossus:true}},quest:5,tutorial:36,tutorialVersion:4,tutorialReward:true,tutorialIslandVersion:2,sceneId:'overworld',x:40,y:50,hp:40};
const fixtures=[['account:'+account.id,9],['account:second-player',12],['player-b',1],['guest:abc',4]];
for(const [id,revision]of fixtures)db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run(id,JSON.stringify(old),revision,'before-reset');
db.prepare('INSERT INTO player_presence VALUES (?,?,?,?)').run('old-presence','overworld','{}',Date.now());
const limitsBefore=db.prepare('SELECT * FROM auth_limits ORDER BY key').all();

db.exec(resetSQL);
const audit=db.prepare('SELECT * FROM game_resets WHERE reset_id=?').get(SAVE_RESET_VERSION);
assert.equal(audit.account_count,fixtures.length);
assert(Number.isFinite(Date.parse(audit.reset_at)));
for(const [id,revision]of fixtures){
  const row=db.prepare('SELECT * FROM character_saves WHERE user_id=?').get(id);
  assert.deepEqual(JSON.parse(row.state),{freshStart:SAVE_RESET_VERSION},'all progress is erased, including legacy saves');
  assert.equal(row.revision,revision+1,'a reset cannot reuse an old revision');
}
assert.deepEqual(db.prepare('SELECT * FROM game_accounts ORDER BY id').all(),accountsBefore,'all usernames and password hashes survive');
assert.deepEqual(db.prepare('SELECT * FROM auth_limits ORDER BY key').all(),limitsBefore,'login protections remain intact');
assert.equal(db.prepare('SELECT count(*) n FROM game_sessions').get().n,0,'every existing session is revoked');
assert.equal(db.prepare('SELECT count(*) n FROM player_presence').get().n,0);
assert.equal((await (await handleAuth(request('/api/auth/session','GET',oldCookie),env)).json()).account,null);
assert.equal((await handleSave(request('/api/character','GET',oldCookie),env)).status,401);
assert.equal((await handleSave(request('/api/character','PUT',oldCookie,{revision:9,state:old,resetVersion:SAVE_RESET_VERSION}),env)).status,401);
assert.equal((await handlePlayers(request('/api/players','POST',oldCookie,{scene:'overworld',x:40,y:50}),env)).status,401);

const login=await handleAuth(request('/api/auth/login','POST','',credentials),env);
assert.equal(login.status,200,'the same password still works');
const cookie=login.headers.get('set-cookie').split(';')[0];
const loaded=await (await handleSave(request('/api/character','GET',cookie),env)).json();
assert.equal(loaded.state.freshStart,SAVE_RESET_VERSION);
assert.equal(loaded.resetVersion,SAVE_RESET_VERSION);
assert.equal(loaded.revision,10);
const oldVersion=await handleSave(request('/api/character','PUT',cookie,{revision:10,state:old,resetVersion:'2026-09-12-character-creator-2'}),env);
assert.equal(oldVersion.status,409);
assert.equal((await oldVersion.json()).code,'ACCOUNTS_RESET','a second tab logging in cannot revive old in-memory progress');
assert.equal((await handleSave(request('/api/character','PUT',cookie,{revision:9,state:old,resetVersion:SAVE_RESET_VERSION}),env)).status,409);

const fresh={character:{name:'Fresh adventurer'},xp:{Hitpoints:1154,Attack:0},bag:{},bank:{},equipment:{},gold:0,x:42,y:51,hp:10,tutorial:0,tutorialVersion:4,tutorialReward:false,tutorialIslandVersion:2,sceneId:'tutorial'};
assert.equal((await handleSave(request('/api/character','PUT',cookie,{revision:10,state:fresh,resetVersion:SAVE_RESET_VERSION}),env)).status,200,'the reset character can start Firstlight Isle');
assert.equal((await handlePlayers(request('/api/players','POST',cookie,{scene:'tutorial',x:42,y:51}),env)).status,200);
const afterRestart={saves:db.prepare('SELECT * FROM character_saves ORDER BY user_id').all(),sessions:db.prepare('SELECT * FROM game_sessions').all(),presence:db.prepare('SELECT * FROM player_presence').all()};
db.exec(resetSQL);
assert.deepEqual(db.prepare('SELECT * FROM character_saves ORDER BY user_id').all(),afterRestart.saves,'replaying the same reset never wipes new progress');
assert.deepEqual(db.prepare('SELECT * FROM game_sessions').all(),afterRestart.sessions,'new sessions survive replay');
assert.deepEqual(db.prepare('SELECT * FROM player_presence').all(),afterRestart.presence);
assert.deepEqual(db.prepare('SELECT * FROM game_resets WHERE reset_id=?').get(SAVE_RESET_VERSION),audit,'the reset is audited exactly once');
assert.deepEqual((await (await handleSave(request('/api/character','GET',cookie),env)).json()).state,fresh);

const empty=databaseBeforeReset();
empty.exec(resetSQL);empty.exec(resetSQL);
assert.equal(empty.prepare('SELECT account_count FROM game_resets WHERE reset_id=?').get(SAVE_RESET_VERSION).account_count,0,'an empty realm is also a valid one-time reset');
db.close();empty.close();
console.log('PASS: global reset clears all progress/sessions/presence, preserves credentials, blocks stale saves, allows a fresh tutorial character, and safely ignores replay.');
