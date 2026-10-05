import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {handleSave,SAVE_RESET_VERSION} from '../../worker/api.js';

const accountId='2db1d2ba-75e2-4c27-bcdf-94e742f95c86';
const owner='account:'+accountId;
const similar='account:944e3e01-6fbe-4fb7-be5f-717603815bd1';
const marker='2026-09-30-owner-mxpsrs-character-reset';
const migration=fs.readFileSync('drizzle/0020_owner_mxpsrs_character_reset.sql','utf8');
const publicId=id=>createHash('sha256').update('public-player:'+id).digest('hex');
const session=createHash('sha256').update('owner-reset-fixture-session').digest('hex');
const saved=JSON.stringify({character:{name:'mxpsrs'},xp:{Attack:1000},bag:{fish:10},bank:{ore:20},x:4,y:5,hp:10,gold:2});

function fixture(username='owner'){
 const db=new DatabaseSync(':memory:');
 for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')&&n<'0020').sort())db.exec(fs.readFileSync('drizzle/'+name,'utf8'));
 db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(accountId,username,username,'unchanged-owner-password-hash',1);
 db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(similar.slice(8),'Mxpsrs','mxpsrs','unchanged-other-password-hash',2);
 for(const [id,state,revision]of [[owner,saved,3801],[similar,JSON.stringify({character:{name:'Mxpsrs'},bag:{ore:9}}),10],['account:another-player','even an invalid save stays untouched',75]]){
  db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run(id,state,revision,'before');
  db.prepare('INSERT INTO player_presence VALUES (?,?,?,?)').run(publicId(id),'overworld','{}',1);
 }
 db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(session).digest('hex'),accountId,Date.now()+86400000);
 return db;
}
const snapshot=db=>Object.fromEntries(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('character_saves','player_presence','game_resets') ORDER BY name").all().map(({name})=>[name,db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
const db=fixture(),before=snapshot(db);
const othersBefore=db.prepare('SELECT * FROM character_saves WHERE user_id<>? ORDER BY user_id').all(owner);
const presenceBefore=db.prepare('SELECT * FROM player_presence WHERE player_id<>? ORDER BY player_id').all(publicId(owner));
db.exec(migration);
const reset=db.prepare('SELECT * FROM character_saves WHERE user_id=?').get(owner);
assert.deepEqual(JSON.parse(reset.state),{freshStart:marker});
assert.equal(reset.revision,3802);
assert.notEqual(reset.updated_at,'before');
assert.deepEqual(db.prepare('SELECT * FROM character_saves WHERE user_id<>? ORDER BY user_id').all(owner),othersBefore);
assert.deepEqual(db.prepare('SELECT * FROM player_presence ORDER BY player_id').all(),presenceBefore);
assert.deepEqual(snapshot(db),before,'accounts, passwords, sessions, shared world and social tables stay intact');
assert.equal(db.prepare('SELECT account_count FROM game_resets WHERE reset_id=?').get(marker).account_count,1);

// Exercise the real save API: an authenticated old tab must lose its revision
// race, and a fresh character must be allowed after loading the new revision.
const env={DB:{prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)},async all(){return{results:db.prepare(sql).all(...args)}},async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}}}}}}}}};
const request=(method,body)=>new Request('https://game.test/api/character',{method,headers:{origin:'https://game.test',cookie:'ember_session='+session,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
assert.equal((await handleSave(request('PUT',{state:JSON.parse(saved),revision:3801,resetVersion:SAVE_RESET_VERSION}),env)).status,409,'stale tabs cannot restore the corrupted character');
const current=await(await handleSave(request('GET'),env)).json();
assert.deepEqual(current.state,{freshStart:marker});assert.equal(current.revision,3802);
db.exec(migration);
assert.deepEqual(db.prepare('SELECT * FROM character_saves WHERE user_id=?').get(owner),reset,'replaying the migration does not increase the revision again');
const fresh={character:{name:'mxpsrs',frame:'male'},xp:{Attack:0},bag:{},x:4,y:5,hp:10,gold:0};
assert.equal((await handleSave(request('PUT',{state:fresh,revision:3802,resetVersion:SAVE_RESET_VERSION}),env)).status,200,'a new character can save with the reset revision');
db.prepare('INSERT INTO player_presence VALUES (?,?,?,?)').run(publicId(owner),'tutorial','{}',2);
const renewed=db.prepare('SELECT * FROM character_saves WHERE user_id=?').get(owner);
db.exec(migration);
assert.deepEqual(db.prepare('SELECT * FROM character_saves WHERE user_id=?').get(owner),renewed,'a replay cannot reset a subsequently created character');
assert(db.prepare('SELECT * FROM player_presence WHERE player_id=?').get(publicId(owner)));
assert.deepEqual(db.prepare('SELECT * FROM character_saves WHERE user_id<>? ORDER BY user_id').all(owner),othersBefore);

const mismatched=fixture('different-login'),mismatchBefore=mismatched.prepare('SELECT * FROM character_saves ORDER BY user_id').all();
mismatched.exec(migration);
assert.deepEqual(mismatched.prepare('SELECT * FROM character_saves ORDER BY user_id').all(),mismatchBefore,'the account identity guard must match owner');
assert.equal(mismatched.prepare('SELECT count(*) n FROM game_resets WHERE reset_id=?').get(marker).n,0);
console.log('PASS: only owner/mxpsrs resets; the separate Mxpsrs login and other saves stay identical; real stale saves are rejected; fresh saves and safe migration replay work.');
