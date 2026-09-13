import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleSave,handleAuth,handlePlayers,handleGlobalReset,SAVE_RESET_VERSION} from '../worker/api.js';
import {currentResetVersion} from '../worker/reset-policy.js';

const db=new DatabaseSync(':memory:');
for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+name,'utf8'));
let failStatement=null,beforeSaveWrite=null;
const env={ACCOUNT_RESET_TOKEN:'test-only-administrator-key-0123456789',DB:{
  prepare(sql){return {args:[],bind(...args){this.args=args;return this;},
    async first(){return db.prepare(sql).get(...this.args)},
    async all(){return {results:db.prepare(sql).all(...this.args)}},
    async run(){
      if(failStatement&&sql.includes(failStatement))throw new Error('Injected transaction failure');
      if(beforeSaveWrite&&/^(INSERT INTO|UPDATE) character_saves/.test(sql)){const hook=beforeSaveWrite;beforeSaveWrite=null;await hook();}
      return {meta:{changes:db.prepare(sql).run(...this.args).changes}};
    }};},
  async batch(statements){db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}
}};
const request=(route,method='GET',cookie='',body)=>new Request('https://game.test'+route,{method,headers:{cookie,origin:'https://game.test'},...(body?{body:JSON.stringify(body)}:{})});
const resetRequest=(id,token=env.ACCOUNT_RESET_TOKEN,reason='Fresh tutorial playthrough')=>new Request('https://game.test/api/admin/global-reset',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({requestId:id,reason})});
const resetId='11111111-1111-4111-8111-111111111111',nextId='22222222-2222-4222-8222-222222222222',thirdId='33333333-3333-4333-8333-333333333333';
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
const limitsBefore=db.prepare('SELECT * FROM auth_limits ORDER BY key').all();
const oldState={character:{name:'Veteran'},xp:{Attack:100000},bag:{runeBar:50},bank:{fish:200},equipment:{weapon:'bronze_dagger'},gold:9999,spirits:{cinder:true},combatProgress:{firstClears:{colossus:true}},quest:5,tutorial:36,tutorialVersion:4,tutorialReward:true,tutorialIslandVersion:2,sceneId:'overworld',x:40,y:50,hp:40};
for(const [id,revision]of [['account:'+account.id,1],['account:second-player',12],['player-b',1],['guest:abc',4]])db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run(id,JSON.stringify(oldState),revision,'before-reset');
db.prepare('INSERT INTO player_presence VALUES (?,?,?,?)').run('old-presence','overworld','{}',Date.now());
const snapshot=()=>Object.fromEntries(['character_saves','game_sessions','player_presence','global_resets'].map(table=>[table,db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()]));
const before=snapshot();

assert.equal((await handleGlobalReset(resetRequest(resetId,'wrong-key'),env)).status,401);
assert.equal((await handleGlobalReset(resetRequest(resetId),{...env,ACCOUNT_RESET_TOKEN:undefined})).status,401);
assert.equal((await handleGlobalReset(resetRequest(resetId,env.ACCOUNT_RESET_TOKEN,''),env)).status,400);
assert.deepEqual(snapshot(),before,'unauthorized and invalid requests change nothing');
failStatement='DELETE FROM game_sessions';
assert.equal((await handleGlobalReset(resetRequest(resetId),env)).status,503);
failStatement=null;
assert.deepEqual(snapshot(),before,'a failed batch rolls back deletions and its audit record');

const response=await handleGlobalReset(resetRequest(resetId),env);assert.equal(response.status,200);
const result=await response.json(),audit=result.reset;
assert.equal(result.replayed,false);assert.equal(audit.id,resetId);
assert.equal(audit.character_count,4);assert.equal(audit.session_count,3);assert.equal(audit.presence_count,1);
assert.equal(audit.completed,1);assert.equal(audit.reason,'Fresh tutorial playthrough');
assert(Number.isFinite(Date.parse(audit.reset_at)));
for(const table of ['character_saves','game_sessions','player_presence'])assert.equal(db.prepare('SELECT count(*) n FROM '+table).get().n,0,table+' is actually empty');
assert.equal(await currentResetVersion(env),resetId);
assert.deepEqual(db.prepare('SELECT * FROM game_accounts ORDER BY id').all(),accountsBefore);
assert.deepEqual(db.prepare('SELECT * FROM auth_limits ORDER BY key').all(),limitsBefore);
assert.equal((await (await handleAuth(request('/api/auth/session','GET',oldCookie),env)).json()).account,null);
assert.equal((await handleSave(request('/api/character','PUT',oldCookie,{revision:1,state:oldState,resetVersion:SAVE_RESET_VERSION}),env)).status,401);
assert.equal((await handlePlayers(request('/api/players','POST',oldCookie,{scene:'overworld',x:40,y:50}),env)).status,401);

const login=await handleAuth(request('/api/auth/login','POST','',credentials),env);
assert.equal(login.status,200,'the same password still works');
let cookie=login.headers.get('set-cookie').split(';')[0];
const loaded=await (await handleSave(request('/api/character','GET',cookie),env)).json();
assert.equal(loaded.state,null);assert.equal(loaded.revision,0);assert.equal(loaded.resetVersion,resetId);
const fresh={character:{name:'Fresh adventurer'},xp:{Hitpoints:1154,Attack:0},bag:{},bank:{},equipment:{},gold:0,x:42,y:51,hp:10,tutorial:0,tutorialVersion:4,tutorialReward:false,tutorialIslandVersion:2,sceneId:'tutorial'};
assert.equal((await handleSave(request('/api/character','PUT',cookie,{revision:0,state:fresh,resetVersion:resetId}),env)).status,200);
assert.equal((await handlePlayers(request('/api/players','POST',cookie,{scene:'tutorial',x:42,y:51}),env)).status,200);
const stale=await handleSave(request('/api/character','PUT',cookie,{revision:1,state:oldState,resetVersion:SAVE_RESET_VERSION}),env);
assert.equal(stale.status,409);assert.equal((await stale.json()).code,'ACCOUNTS_RESET','a matching reused revision and fresh shared cookie cannot restore the old character');

const afterRestart=snapshot();
const replay=await handleGlobalReset(resetRequest(resetId),env);
assert.equal(replay.status,200);assert.equal((await replay.json()).replayed,true);
assert.deepEqual(snapshot(),afterRestart,'retrying a completed command leaves new progress and sessions intact');
assert.deepEqual((await (await handleSave(request('/api/character','GET',cookie),env)).json()).state,fresh);

// Reset after validation but immediately before an UPDATE reaches the database.
beforeSaveWrite=async()=>assert.equal((await handleGlobalReset(resetRequest(nextId),env)).status,200);
const racingUpdate=await handleSave(request('/api/character','PUT',cookie,{revision:1,state:fresh,resetVersion:resetId}),env);
assert.equal(racingUpdate.status,409);assert.equal((await racingUpdate.json()).code,'ACCOUNTS_RESET');
assert.equal(db.prepare('SELECT count(*) n FROM character_saves').get().n,0);

// The same race on a first INSERT must not recreate a deleted character.
const relogin=await handleAuth(request('/api/auth/login','POST','',credentials),env);
cookie=relogin.headers.get('set-cookie').split(';')[0];
beforeSaveWrite=async()=>assert.equal((await handleGlobalReset(resetRequest(thirdId),env)).status,200);
const racingInsert=await handleSave(request('/api/character','PUT',cookie,{revision:0,state:fresh,resetVersion:nextId}),env);
assert.equal(racingInsert.status,409);assert.equal((await racingInsert.json()).code,'ACCOUNTS_RESET');
assert.equal(db.prepare('SELECT count(*) n FROM character_saves').get().n,0);
assert.equal(db.prepare('SELECT character_count FROM global_resets WHERE id=?').get(thirdId).character_count,0,'resetting an empty realm also works');
const status=await handleGlobalReset(new Request('https://game.test/api/admin/global-reset?requestId='+resetId,{headers:{Authorization:'Bearer '+env.ACCOUNT_RESET_TOKEN}}),env);
assert.deepEqual((await status.json()).reset,audit);
assert.equal((await (await handleGlobalReset(resetRequest(resetId),env)).json()).replayed,true);
assert.equal(await currentResetVersion(env),thirdId,'retrying an older request cannot roll back the current reset version');
db.close();
console.log('PASS: direct deletion, administrator authorization, atomic rollback, preserved credentials, fresh tutorial creation, safe retry, and concurrent stale-save rejection.');
