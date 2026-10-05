import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {syncSharedWorld,readSharedEffects} from '../../worker/shared-world.js';
import catalog from '../../worker/shared-catalog.json' with {type:'json'};
const sql=new DatabaseSync(':memory:');
for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(query){return {bind(...args){return {query,args,async first(){return sql.prepare(query).get(...args)},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}}}}}}},async batch(statements){sql.exec('BEGIN');try{const rows=statements.map(({query,args})=>({meta:{changes:sql.prepare(query).run(...args).changes}}));sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const foe=Object.values(catalog.entities).find(e=>e.kind==='rat'&&e.scene==='overworld');foe.hp=10000;
const oldRandom=Math.random,oldNow=Date.now;let now=Date.now(),sequence=0;Date.now=()=>now;Math.random=()=>.5;
const state=id=>({xp:{Attack:1000000,Magic:1000000},equipment:{weapon:'woodenSword'},attunedSpirit:id,spirits:Object.fromEntries(Object.keys(catalog.spirits).map(id=>[id,{state:'set',bondXP:0}]))});
async function hit(id,s,event={}){
 const input={scene:foe.scene,x:foe.x,y:foe.y,world:{protocol:1,watch:[foe.id],events:[{id:'hit'+(++sequence),kind:'hit',scene:foe.scene,entity:foe.id,generation:1,style:'melee',...event}]}};
 const result=await syncSharedWorld(env,'fighter-'+id,s,input,now,'identity-'+id);
 return {receipt:result.receipts.find(r=>r.id===input.world.events[0].id),input};
}
let healing;
for(const [id,count,proc]of [['cinder',4,'Kindle'],['brook',5,'Undertow'],['rill',4,'Quiet current'],['gale',4,'Slipstream'],['flint',5,'Fault'],['pyre',2,'Crossfire']]){
 const s=state(id);let result;
 for(let n=0;n<count;n++){
  now+=3100;result=await hit(id,s,{style:id==='pyre'&&n===1?'magic':'melee'});assert(result.receipt.ok,JSON.stringify(result.receipt));
  if(n<count-1)assert.equal(result.receipt.spirit.proc,null,'no premature '+id+' trigger');
 }
 const r=result.receipt;assert.equal(r.spirit.proc,proc);assert.equal(r.spirit.memory,undefined,'private chain is not a receipt field');
 const row=()=>JSON.parse(sql.prepare('SELECT state FROM shared_entities WHERE scope=? AND entity_id=?').get('identity-'+id,foe.id).state);
 const before=row();const replay=await syncSharedWorld(env,'fighter-'+id,s,result.input,now,'identity-'+id);
 assert.deepEqual(replay.receipts.find(x=>x.id===r.id),r,'retry returns identical committed '+id+' result');assert.equal(row().hp,before.hp,'retry cannot damage again');assert.deepEqual(row().resonance,before.resonance,'retry cannot advance a chain');
 if(id==='brook'){assert.equal(r.spirit.heal,1);healing=r;}
 if(id==='gale')assert.equal(r.spirit.energy,4);
 if(id==='flint')assert.equal(row().slowUntil,now+1000);
 if(id==='cinder'){assert.equal(r.damage,2);now+=3100;Math.random=()=>.99999;const miss=(await hit(id,s)).receipt;assert(miss.ok);assert.equal(miss.damage,0);assert.equal(miss.spirit,undefined);Math.random=()=>.5;}
}
now+=3100;
assert(!(await hit('overflow',state('cinder'),{style:'worship',spirits:['cinder','pyre','flint'],cast:'oversized'})).receipt.ok,'server enforces two-Spirit Convergence maximum');
const phased=Object.values(catalog.entities).find(e=>e.mainStoryStage===4);
sql.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,0)').run('phased-passive','identity-phase',phased.scene,'fighter','hit',JSON.stringify({ok:true,entity:phased.id,x:phased.x,y:phased.y,hp:10,damage:2,spirit:{spirit:'cinder',proc:'Kindle'}}),now);
const effects=await readSharedEffects(env.DB,'identity-phase',phased.scene,'observer',phased,now-1,{mainStoryQuest:{stage:30}});
assert.equal(effects.length,1);assert.equal(effects[0].spirit.proc,'Kindle');assert.equal(effects[0].entity,undefined);assert.equal(effects[0].hp,undefined,'phased NPC information remains private');
Math.random=oldRandom;Date.now=oldNow;
// Feed the actual durable receipt to the production client, then retry after save/reload.
const require=createRequire(import.meta.url),{ctx,vm}=require('../../scripts/qa/game-fixture.cjs');ctx.HEALING=healing;ctx.FOE=foe;ctx.assert=assert;
for(const file of ['multiplayer','shared-world'])vm.runInContext(fs.readFileSync('client/'+file+'.js','utf8'),ctx);
vm.runInContext(`
renderUI=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;
s.spirits={brook:{state:'recovery',bondXP:0}};s.attunedSpirit='brook';s.hp=5;s.sharedReceipts=[];s.sharedOutbox=[];s.xp.Worship=0;
const packet={world:{protocol:1,actor:'fighter-brook',serverTime:Date.now(),receipts:[HEALING],entities:[],effects:[],objects:[],acked:[]}};
assert(worldScenes[FOE.scene].objects.some(o=>String(o.id)===FOE.id),'receipt resolves original world entity');
applySharedWorld(packet);assert.equal(s.hp,6);assert.equal(s.spirits.brook.bondXP,1);assert.equal(s.xp.Worship,1);
s=JSON.parse(JSON.stringify(s));applySharedWorld(packet);assert.equal(s.hp,6);assert.equal(s.spirits.brook.bondXP,1);assert.equal(s.xp.Worship,1,'saved receipt dedupe protects bond XP');
s.spirits.cinder={state:'set',bondXP:0};s.attunedSpirit='cinder';packet.world.receipts=[{...HEALING,id:'late-brook-hit'}];applySharedWorld(packet);assert.equal(s.spirits.brook.bondXP,2);assert.equal(s.spirits.cinder.bondXP,0,'delayed receipt progresses the Spirit that earned it');
`,ctx);
console.log('PASS: authoritative passive triggers, zero damage, slowing, two-Spirit limit, durable receipt retries, client healing and bond XP exactly once across save/reload.');
