import assert from 'node:assert/strict';
import {advanceNpc,npcLineOfSight} from '../../worker/npc-simulation.js';
import catalog from '../../worker/shared-catalog.json' with {type:'json'};
const state=(e,now)=>({entity:e.id,hp:e.hp,maxhp:e.hp,x:e.x,y:e.y,generation:1,owner:'server',target:'player',nextAttack:now,defender:{xp:{},equipment:{}},assisted:true});
let now=100000;
for(const kind of ['veyr','varkesh','colossus','xalith']){
 const e=Object.values(catalog.entities).find(e=>e.encounter===kind),v=state(e,now),p={x:e.x,y:e.y+1},players=new Map([['player',p]]);
 const started=advanceNpc(e,v,players,now,catalog,()=>4);assert(started.some(e=>e.kind==='enemyAction'),kind+' attack starts on server');
 assert(v.hazard&&v.pose.attackAt===now,kind+' shared warning and animation');
 const first=v.hazard,receipt=advanceNpc(e,v,players,first.due,catalog,()=>4).find(e=>e.kind==='enemyHit');
 assert(receipt,kind+' resolves on server');assert.equal(receipt.result.damage,kind==='veyr'?2:4,'approved companion assistance');
 assert(!advanceNpc(e,v,players,first.due,catalog,()=>4).some(e=>e.kind==='enemyHit'),'same tick cannot deal damage twice');
 if(catalog.hunts[kind].mechanics){v.hp=Math.floor(v.maxhp*.4);advanceNpc(e,v,players,first.due+1,catalog,()=>4);assert.equal(v.phase,1);assert.equal(v.hazard,null,'phase transition clears old warning');}
 const escaped=advanceNpc(e,v,new Map(),now+10000,catalog,()=>4);assert.equal(v.target,null,'disconnect releases fight');assert.equal(v.hazard,null);
 assert(!escaped.length);
}
const rat=Object.values(catalog.entities).find(e=>e.kind==='rat'&&e.scene==='tutorial'),v=state(rat,now);v.target=null;
for(let i=0;i<200;i++){
 advanceNpc(rat,v,new Map(),now+i*1000,catalog,()=>1);
 const n=rat.nav,index=(v.y-n.top)*n.width+v.x-n.left;assert.equal(Number(n.cells[index])&1,0,'server rat stays within walkable pen');
}
// A ranged player outside the fence remains attackable only along clear sight.
assert.equal(npcLineOfSight(rat,v,{x:v.x,y:v.y}),true);
console.log('PASS: four server-controlled bosses, attack deadlines, phase transitions, assisted first Veyr fight, exactly-once hits, disconnect recovery, and rat pen collision.');
