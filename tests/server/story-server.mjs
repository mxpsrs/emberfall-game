import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncSharedWorld} from '../../worker/shared-world.js';
import catalog from '../../worker/shared-catalog.json' with {type:'json'};
const sqlite=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const db={prepare(sql){return {bind(...args){return {sql,args,async first(){return sqlite.prepare(sql).get(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}}}}}}},async batch(statements){sqlite.exec('BEGIN');try{const r=statements.map(({sql,args})=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}}));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
let n=0;for(const e of Object.values(catalog.entities).filter(e=>e.mainStoryStage!=null)){
 for(const stage of [0,e.mainStoryStage-1,e.mainStoryStage,e.mainStoryStage+1]){
  const id='story-'+(++n),s={xp:{Attack:1000},bag:{},equipment:{weapon:'bronzeSword'},mainStoryQuest:{stage}},input={scene:e.scene,x:e.x+1,y:e.y,world:{protocol:1,watch:[e.id],events:[{id,kind:'attack',style:'melee',scene:e.scene,entity:e.id,generation:1}]}};
  const r=await syncSharedWorld({DB:db},'actor-'+n,s,input,1000000,'gate-'+n),receipt=r.receipts.find(r=>r.id===id);assert.equal(receipt.ok,stage===e.mainStoryStage,JSON.stringify(receipt));
 }
}
assert.equal(n,8);assert.equal(catalog.items.airRunes.name,'Air relic');assert.equal(catalog.items.runes.name,'Mind relic');assert.equal(catalog.items.rune_body.name,'Eldrite chestplate');
// Regression from the owner's 2026-09-14 recording: the current final lesson
// is index 37, so a permit requiring index 38 can never finish the tutorial.
assert.equal(catalog.tutorial.version,7);assert.equal(catalog.tutorial.finishStage,37);
for(const [version,finish]of Object.entries(catalog.tutorial.finishStages)){
 for(const stage of [finish-1,finish,finish+1]){
  const id='rowan-'+(++n),state={tutorialVersion:Number(version),tutorial:stage,tutorialReward:false};
  const input={scene:'tutorial',x:42,y:51,world:{protocol:1,watch:[],events:[{id,kind:'teleport',mode:'rowan',destination:'overworld',scene:'tutorial'}]}};
  const result=await syncSharedWorld({DB:db},id,state,input,1000000,id),receipt=result.receipts.find(r=>r.id===id);
  assert.equal(receipt.ok,stage>=finish,JSON.stringify({version,stage,receipt}));
  if(receipt.ok){assert.equal(receipt.destination,'overworld');assert.equal(receipt.arriveAt,1002600);}
 }
}
// The permit still cannot be used for an arbitrary destination or off-island.
for(const [scene,destination]of [['tutorial','lair_veyr'],['overworld','overworld']]){
 const id='rowan-denied-'+(++n),input={scene,x:42,y:51,world:{protocol:1,watch:[],events:[{id,kind:'teleport',mode:'rowan',destination,scene}]}};
 const result=await syncSharedWorld({DB:db},id,{tutorialVersion:7,tutorial:37},input,1000000,id);
 assert.equal(result.receipts.find(r=>r.id===id).ok,false);
}
console.log('PASS: both story enemies enforce the exact quest stage on the server; relic and Eldrite catalog names match.');
console.log('PASS: Rowan permits the real final lesson for v2–v7, blocks earlier lessons and invalid crossings.');
