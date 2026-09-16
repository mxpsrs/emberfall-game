import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import catalog from '../worker/shared-catalog.json' with {type:'json'};
import {rollRareBossLoot} from '../worker/boss-loot.js';
import {lootFor,syncSharedWorld} from '../worker/shared-world.js';
const boss=Object.values(catalog.entities).find(e=>e.encounter==='veyr');assert.deepEqual(boss.rareDrops,{veyrOrb:250});assert(!boss.drops.veyrOrb);
assert.equal(Array.from({length:250},(_,i)=>rollRareBossLoot(boss.rareDrops,()=> (i+.5)/250).veyrOrb||0).reduce((a,b)=>a+b),1);
assert.equal(rollRareBossLoot(boss.rareDrops,()=>.003999999).veyrOrb,1);assert.equal(rollRareBossLoot(boss.rareDrops,()=>.004).veyrOrb,undefined);
const realRandom=Math.random;
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const DB={prepare(query){return {query,args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(query).get(...this.args)},async all(){return {results:sql.prepare(query).all(...this.args)}},async run(){return {meta:{changes:sql.prepare(query).run(...this.args).changes}}}}},async batch(statements){sql.exec('BEGIN');try{const r=statements.map(s=>({meta:{changes:sql.prepare(s.query).run(...s.args).changes}}));sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
try{
 for(const stage of [17,20])for(const lucky of [true,false]){
  const actor='veyr-'+stage+'-'+lucky,now=1000000,scope=actor;
  const s={xp:{Magic:catalog.xp[20],Hitpoints:catalog.xp[20]},equipment:{weapon:'veyrOrb'},bag:{},mountainQuest:{version:2,stage},questRematch:stage===20?'veyr':null,spell:'windStrike'};
  const original=JSON.stringify(s),packet={scene:boss.scene,x:boss.x+1,y:boss.y,world:{protocol:1,watch:[boss.id],events:[]}};
  await syncSharedWorld({DB},actor,s,packet,now,scope);
  const key=scope+':'+boss.scene+':'+boss.id,row=sql.prepare('SELECT state FROM shared_entities WHERE id=?').get(key),v=JSON.parse(row.state);v.hp=1;sql.prepare('UPDATE shared_entities SET state=? WHERE id=?').run(JSON.stringify(v),key);
  let roll=0;Math.random=()=>[0,.99,lucky?0:.5][roll++]??.5;
  const event={id:actor+'-kill',scene:boss.scene,kind:'hit',entity:boss.id,generation:v.generation,style:'magic'};
  packet.world.events=[event];let result=await syncSharedWorld({DB},actor,s,packet,now+1,scope);
  const receipt=result.receipts.find(r=>r.id===event.id);assert(receipt?.ok&&receipt.defeat,JSON.stringify(receipt));assert.equal(receipt.memoryFrayUntil,now+4001);
  const pile=JSON.parse(sql.prepare('SELECT payload FROM shared_objects WHERE scope=?').get(scope).payload);assert.equal(pile.items.veyrOrb,lucky?1:undefined);assert.equal(pile.publicAt,now+30001);assert.equal(pile.owner,actor);assert.equal(JSON.stringify(s),original,'boss loot does not grant quest rewards or change canonical state');
  const rolls=roll;await syncSharedWorld({DB},actor,s,packet,now+2,scope);assert.equal(roll,rolls,'receipt replay never rerolls loot');assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM shared_objects WHERE scope=?').get(scope).n,1);
  const observer='observer-'+actor,pick={id:'take-orb',scene:boss.scene,kind:'pickup',object:scope+':'+boss.scene+':'+boss.id+':loot:'+v.generation,item:'veyrOrb',count:1};
  if(lucky){
   const read={scene:boss.scene,x:boss.x,y:boss.y,world:{protocol:1,watch:[],events:[pick]}};
   const denied=await syncSharedWorld({DB},observer,{},read,now+30000,scope);assert.equal(denied.receipts.find(r=>r.id===pick.id).ok,false,'owner has all 30 seconds');
   read.world.events=[{...pick,id:'take-after-owner-period'}];const publicLoot=await syncSharedWorld({DB},observer,{},read,now+30001,scope);assert(publicLoot.receipts.find(r=>r.id==='take-after-owner-period').ok);
  }
 }
 for(const id of ['rellanSignet','ironhollowBelt','whisperPendant','wardkeeperCape','veilbreakerRing']){
  const actor='bound-'+id,packet={scene:'overworld',x:42,y:51,world:{protocol:1,watch:[],events:[{id:'bound-drop',scene:'overworld',kind:'drop',x:42,y:51,items:{[id]:1}}]}};
  const result=await syncSharedWorld({DB},actor,{},packet,1000000,actor);assert.equal(result.receipts.find(r=>r.id==='bound-drop').ok,false,'cannot pass bound reward through ground');
 }
 for(const stage of [17,20]){
  const actor='ward-'+stage,now=2000000,s={xp:{},equipment:{},mountainQuest:{stage},questRematch:stage===20?'veyr':null};
  const p={scene:boss.scene,x:boss.x+1,y:boss.y,world:{protocol:1,watch:[boss.id],events:[]}};await syncSharedWorld({DB},actor,s,p,now,actor);
  const key=actor+':'+boss.scene+':'+boss.id,v=JSON.parse(sql.prepare('SELECT state FROM shared_entities WHERE id=?').get(key).state);v.target=actor;v.nextAttack=now+50000;v.pose={attackAt:now};v.hazard={...catalog.moves.memoryCall,x:boss.x+1,y:boss.y,fromX:boss.x,fromY:boss.y,due:now+10000};
  sql.prepare('UPDATE shared_entities SET state=? WHERE id=?').run(JSON.stringify(v),key);p.world.events=[{id:'interrupt',kind:'wardInterrupt',scene:boss.scene,entity:boss.id,generation:v.generation}];
  const out=await syncSharedWorld({DB},actor,s,p,now+1,actor);assert.equal(out.receipts.find(r=>r.id==='interrupt').ok,stage===17,'Alaric interrupts only the canonical assisted fight');
  if(stage===17)assert.equal(JSON.parse(sql.prepare('SELECT state FROM shared_entities WHERE id=?').get(key).state).hazard,null);
 }
 assert(catalog.items.mysticStaff.magicAccuracy>catalog.items.veyrOrb.magicAccuracy+catalog.items.veyrOrb.memoryFray,'normal level-40 weapon exceeds full Orb accuracy');
}finally{Math.random=realRandom;sql.close();}
console.log('PASS: exact 1/250 boundaries, lucky/unlucky first and repeat kills through server receipts, 30-second ownership, replay safety, no canonical reward mutation, bound-ground rejection and higher-level weapon progression.');
