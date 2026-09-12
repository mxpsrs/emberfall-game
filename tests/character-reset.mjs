import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const db=new DatabaseSync(':memory:');
for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')&&n<'0006').sort())db.exec(fs.readFileSync('drizzle/'+name,'utf8'));
const owner='account:2db1d2ba-75e2-4c27-bcdf-94e742f95c86',other='account:another-player',old=JSON.stringify({character:{name:'Veteran'},xp:{Attack:1000},bag:{fish:10},bank:{ore:20}});
for(const [id,revision]of [[owner,140],[other,71]]){
 db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run(id,old,revision,'before');
 db.prepare('INSERT INTO player_presence VALUES (?,?,?,?)').run(createHash('sha256').update('public-player:'+id).digest('hex'),'overworld','{}',Date.now());
}
const accountsBefore=db.prepare('SELECT * FROM game_accounts').all(),sessionsBefore=db.prepare('SELECT * FROM game_sessions').all();
db.exec(fs.readFileSync('drizzle/0006_mxpsrs_character_reset.sql','utf8'));
const row=db.prepare('SELECT * FROM character_saves WHERE user_id=?').get(owner);
assert.deepEqual(JSON.parse(row.state),{freshStart:'2026-09-12-mxpsrs-character-3'});assert.equal(row.revision,141);
assert.equal(db.prepare('UPDATE character_saves SET state=? WHERE user_id=? AND revision=?').run(old,owner,140).changes,0,'old tabs cannot restore the erased progress');
assert.deepEqual({...db.prepare('SELECT * FROM character_saves WHERE user_id=?').get(other)},{user_id:other,state:old,revision:71,updated_at:'before'});
assert.equal(db.prepare('SELECT count(*) n FROM player_presence').get().n,1);assert.equal(db.prepare('SELECT account_count FROM game_resets WHERE reset_id=?').get('2026-09-12-mxpsrs-character-3').account_count,1);
assert.deepEqual(db.prepare('SELECT * FROM game_accounts').all(),accountsBefore);assert.deepEqual(db.prepare('SELECT * FROM game_sessions').all(),sessionsBefore);
console.log('PASS: only the requested character resets, other progress remains untouched, stale saves are rejected and the reset is recorded once.');
