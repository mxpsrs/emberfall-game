import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {cleanupSharedHistory} from '../../worker/shared-cleanup.js';
const sql=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
let operations=0;
function connection(){return {prepare(query){return {bind(...args){return {query,args,async first(){operations++;return sql.prepare(query).get(...args);}};}};},async batch(statements){operations+=statements.length;sql.exec('BEGIN');try{for(const s of statements)sql.prepare(s.query).run(...s.args);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};}
const db=connection(),now=Date.now(),expired=now-2*86400000;
sql.exec('BEGIN');
const event=sql.prepare("INSERT INTO shared_events VALUES (?,'scope','overworld','actor','activity','{}',?,?)"),object=sql.prepare("INSERT INTO shared_objects VALUES (?,'scope','overworld','loot','{}',?,0)");
for(let i=0;i<100000;i++)event.run('recent-'+i,now,1);
for(let i=0;i<400;i++){event.run('old-'+i,expired,1);event.run('unacked-'+i,expired,0);object.run('expired-'+i,expired);}
object.run('active',now+60000);sql.exec('COMMIT');
const eventPlan=sql.prepare('EXPLAIN QUERY PLAN SELECT id FROM shared_events WHERE acked=1 AND created_at<? ORDER BY created_at LIMIT 128').all(expired+1);
const objectPlan=sql.prepare('EXPLAIN QUERY PLAN SELECT id FROM shared_objects WHERE expires_at<? ORDER BY expires_at LIMIT 128').all(now);
assert(eventPlan.some(r=>r.detail.includes('idx_shared_event_cleanup')));
assert(objectPlan.some(r=>r.detail.includes('idx_shared_object_cleanup')));
await cleanupSharedHistory(db,now);assert.equal(operations,4);
assert.equal(sql.prepare("SELECT count(*) n FROM shared_events WHERE id LIKE 'old-%'").get().n,0,'transient and day-old batches both retire expired history');
assert.equal(sql.prepare("SELECT count(*) n FROM shared_events WHERE acked=0").get().n,400,'unacknowledged rewards and hits never discarded');
assert.equal(sql.prepare("SELECT count(*) n FROM shared_events WHERE id LIKE 'recent-%'").get().n,100000);
assert(sql.prepare("SELECT id FROM shared_objects WHERE id='active'").get());
await cleanupSharedHistory(connection(),now+500);assert.equal(operations,5,'another isolate cannot duplicate the sweep');
await Promise.all([cleanupSharedHistory(connection(),now+1001),cleanupSharedHistory(connection(),now+1001)]);
assert.equal(operations,10,'only one lease winner performs three deletes');
const effectPlan=sql.prepare("EXPLAIN QUERY PLAN SELECT id FROM shared_events WHERE kind IN ('activity','enemyAction') AND acked=1 AND created_at<? LIMIT 256").all(now);
assert(effectPlan.some(r=>r.detail.includes('idx_shared_effect_cleanup')));assert(!effectPlan.some(r=>r.detail.includes('TEMP B-TREE')),'expiration must not sort the entire old history');
// 39 players producing four public effects a second: run ten simulated minutes.
// This deliberately exceeds ordinary action-start traffic and covers many TTLs.
sql.exec("DELETE FROM shared_events WHERE acked=1");
for(let second=2;second<=602;second++){
 sql.exec('BEGIN');for(let i=0;i<156;i++)event.run('load-'+second+'-'+i,now+second*1000,1);sql.exec('COMMIT');
 await cleanupSharedHistory(db,now+second*1000);
 if(second>70)assert(sql.prepare('SELECT count(*) n FROM shared_events WHERE acked=1').get().n<=156*61,'cleanup keeps up rather than accumulating a permanent backlog');
}
assert.equal(sql.prepare('SELECT count(*) n FROM shared_events WHERE acked=0').get().n,400);
sql.close();console.log('PASS: indexed bounded expiration, cross-isolate lease exclusion, 100,000-event fixture and ten simulated minutes at 156 public effects/second without history growth; unacknowledged receipts retained.');
