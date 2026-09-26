import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncSharedWorld,publicAction} from '../worker/shared-world.js';
import catalog from '../worker/shared-catalog.json' with {type:'json'};
const sqlite=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const db={prepare(sql){return {bind(...args){return {sql,args,async first(){return sqlite.prepare(sql).get(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}}}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(({sql,args})=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const env={DB:db},A='owner-a',B='owner-b',scope='test',state={xp:{},bag:{logs:10},equipment:{weapon:'bronzeSword'},mountainQuest:{stage:18}};let now=1000000,seq=0;
const def=Object.values(catalog.entities).find(e=>e.kind==='rat'&&e.scene==='overworld');assert(def);
const packet=(e=def,events=[],extra={})=>({scene:e.scene,x:e.x,y:e.y,world:{protocol:1,watch:[e.id],poses:e.hp?[{entity:e.id,x:e.x,y:e.y,fighting:true}]:[],events,...extra}});
const event=(kind,more={},e=def)=>({id:'e'+(++seq),kind,scene:e.scene,entity:e.id,generation:1,...more});
const sync=(actor,packet,stateArg=state)=>syncSharedWorld(env,actor,stateArg,packet,now,scope);

// Both clients remain connected beside the target during every assertion.
async function present(e){for(const actor of [A,B])await db.prepare('INSERT OR REPLACE INTO player_presence (player_id,scene,payload,seen_at) VALUES (?,?,?,?)').bind(actor,e.scene,JSON.stringify({id:actor,x:e.x,y:e.y}),now).run();}
for(const threshold of [26,27]){
 const e=Object.values(catalog.entities).find(e=>e.kind==='bandit'&&e.scene==='overworld');
 const old=e.level;e.level=threshold;await present(e);
 await sync(A,packet(e));const attack=event('attack',{style:'melee'},e);
 let a=await sync(A,packet(e,[attack]));assert(a.receipts.find(r=>r.id===attack.id)?.ok);
 for(const kind of ['attack','hit']){
  const claim=event(kind,{style:'melee'},e);const b=await sync(B,packet(e,[claim]));const receipt=b.receipts.find(r=>r.id===claim.id);
  assert.equal(receipt.ok,threshold>=27,JSON.stringify(receipt));
  if(threshold<27)assert.equal(receipt.error,'Someone else is fighting that.');
 }
 // The preceding level-27 hit consumes the shared attack cooldown. Wait before
 // checking another ordinary magic hit; spirits are retired and are not tested.
 now+=4000;
 const magicHit=event('hit',{style:'magic'},e);
 const b=await sync(B,packet(e,[magicHit]));
 assert.equal(b.receipts.find(r=>r.id===magicHit.id).ok,threshold>=27,'magic hit follows the same rule');
 // Owner leaves or disconnects: claim is released by NPC simulation.
 await db.prepare('DELETE FROM player_presence WHERE player_id=?').bind(A).run();
 const take=event('attack',{style:'melee'},e);const free=await sync(B,packet(e,[take]));assert(free.receipts.find(r=>r.id===take.id).ok);
 await db.prepare('DELETE FROM shared_entities WHERE entity_id=?').bind(e.id).run();e.level=old;now+=10000;
}
console.log('PASS: level 26 attack/hit/magic exclusivity, level 27 shared attacks, owner disconnect releases claim.');
