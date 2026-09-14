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
let a=await sync(A,packet()),b=await sync(B,packet());assert.deepEqual(a.entities,b.entities,'both accounts receive the same rat');
let kill;
for(let i=0;i<100&&!kill;i++){now+=3000;const hit=event('hit',{style:'melee'});a=await sync(A,packet(def,[hit]));const r=a.receipts.find(r=>r.id===hit.id);assert(r.ok,JSON.stringify(r));if(r.defeat)kill=r;}
assert(kill,'rat can be killed');const deathTime=now;
b=await sync(B,packet());assert.equal(b.entities.find(e=>e.entity===def.id).hp,0);assert.equal(b.objects.length,0,'other player receives no private loot payload');
const privateLoot=a.objects.find(o=>o.kind==='loot');assert(privateLoot);const denied=event('pickup',{object:privateLoot.id,item:'bones',count:1});b=await sync(B,packet(def,[denied]));assert.equal(b.receipts.find(r=>r.id===denied.id).ok,false,'direct pickup rejected before 30 seconds');
now=deathTime+29999;b=await sync(B,packet());assert.equal(b.objects.length,0,'loot still hidden at 29.999 seconds');
now=deathTime+30000;b=await sync(B,packet());assert.equal(b.objects.length,1,'loot becomes visible exactly at 30 seconds');assert.equal(b.entities.find(e=>e.entity===def.id).hp,def.hp,'both players see server respawn');assert.equal(b.entities.find(e=>e.entity===def.id).generation,2);
const pa=event('pickup',{object:privateLoot.id,item:'bones',count:1}),pb=event('pickup',{object:privateLoot.id,item:'bones',count:1});
const results=await Promise.all([sync(A,packet(def,[pa])),sync(B,packet(def,[pb]))]);assert.equal(results.flatMap(x=>x.receipts).filter(r=>[pa.id,pb.id].includes(r.id)&&r.ok).length,1,'exactly one simultaneous pickup wins');
const win=results.flatMap(x=>x.receipts).find(r=>[pa.id,pb.id].includes(r.id)&&r.ok);const repeated=await sync(win.id===pa.id?A:B,packet(def,[win.id===pa.id?pa:pb]));assert.equal(repeated.receipts.filter(r=>r.id===win.id).length,1,'retry returns the same receipt without another item');
const old=event('hit',{generation:1,style:'melee'});a=await sync(A,packet(def,[old]));assert.equal(a.receipts.find(r=>r.id===old.id).ok,false,'old projectile cannot hit a respawn');
const drop=event('drop',{items:{logs:2},x:def.x,y:def.y});a=await sync(A,packet(def,[drop]));const dropTime=now;assert(a.objects.some(o=>o.id.endsWith(drop.id)));b=await sync(B,packet());assert(!b.objects.some(o=>o.id.endsWith(drop.id)),'manual drops use the same private rule');now+=30000;b=await sync(B,packet());assert(b.objects.some(o=>o.id.endsWith(drop.id)));
const fires=[event('fire',{x:def.x,y:def.y,log:'normal'}),event('fire',{x:def.x,y:def.y,log:'normal'})];const fireResults=await Promise.all([sync(A,packet(def,[fires[0]])),sync(B,packet(def,[fires[1]]))]);assert.equal(fireResults.flatMap(x=>x.receipts).filter(r=>fires.some(e=>e.id===r.id)&&r.ok).length,1,'same tile can hold only one concurrently lit fire');b=await sync(B,packet());assert.equal(b.objects.filter(o=>o.kind==='fire').length,1,'fire visible immediately to the second account');
const door=Object.values(catalog.entities).find(e=>e.door);assert(door);await sync(A,packet(door,[event('door',{open:true},door)]));b=await sync(B,packet(door));assert.equal(b.entities.find(e=>e.entity===door.id).opened,true);
const ore=Object.values(catalog.entities).find(e=>e.type==='ore'&&e.resource.level===1);let harvested=false;
for(let i=0;i<25&&!harvested;i++){now+=2000;const h=event('harvest',{},ore);a=await sync(A,packet(ore,[h]));harvested=a.receipts.some(r=>r.id===h.id&&r.ok&&!r.missed);}assert(harvested);b=await sync(B,packet(ore));assert(b.entities.find(e=>e.entity===ore.id).deadUntil>now,'resource depletion is shared');
now+=10000;const t=event('teleport',{mode:'hunt',destination:'lair_veyr'});a=await sync(A,packet(def,[t]));const permit=a.receipts.find(r=>r.id===t.id);assert(permit.ok,JSON.stringify(permit));now+=2600;await sync(A,{scene:'lair_veyr',x:22,y:44,world:{protocol:1,watch:[],arrival:t.id}});assert(sqlite.prepare("SELECT * FROM shared_events WHERE kind='arrival'").get(),'arrival recorded beside departure');
const action={kind:'combat',style:'magic',started:now,duration:1500};assert.deepEqual(publicAction({action},now).style,'magic');assert.equal(publicAction({action:{...action,started:now-20000}},now),null);
console.log('PASS: shared rat death/respawn, 30-second privacy for enemy and manual drops, forbidden early pickups, simultaneous collection, idempotent retries, stale hits, concurrent fires, shared doors/resources, teleport departure and arrival records.');

// Exercise the actual browser combat functions against the shared server.
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const {ctx,vm}=require('../scripts/game-fixture.cjs');
for(const f of ['multiplayer','shared-world','tutorial-journal'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx,{filename:f});
ctx.CLOCK=now;
vm.runInContext(`Date.now=()=>CLOCK;draw=()=>{};drawPortrait=()=>{};$('panelBody').prepend=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();renderUI=()=>{};renderAction=()=>{};save=()=>{};playGameSound=()=>{};s.character={name:'Live test',look:0};s.tutorial=tutorialSteps.length;s.tutorialReward=true;activateScene('overworld',42,51);assetsReady=true;cloudReady=true;cloudDirty=false;cloudBusy=false;s.equipment.weapon='woodenSword';s.equipment.shield='woodenShield';const liveRat=objects.find(o=>o.kind==='rat');px=s.x=liveRat.x+1;py=s.y=liveRat.y;`,ctx);
async function clientPoll(){
 const input=JSON.parse(vm.runInContext('JSON.stringify({scene:currentScene,x:px,y:py,world:outgoingSharedWorld(),action:outgoingSharedAction()})',ctx));
 const character=JSON.parse(vm.runInContext('JSON.stringify(s)',ctx));const result=await syncSharedWorld(env,'live-client',character,input,now,'live-test');ctx.DATA={world:result};vm.runInContext('applySharedWorld(DATA)',ctx);return result;
}
await clientPoll();let defeated=false;
for(let i=0;i<120&&!defeated;i++){
 now+=3100;ctx.CLOCK=now;
 vm.runInContext("time+=3.1;performAttack(liveRat);time+=.4;updateCombat(.4);",ctx);
 const result=await clientPoll();defeated=result.receipts.some(r=>r.kind==='hit'&&r.ok&&r.defeat);
}
assert(defeated,'real browser melee can finish a server encounter');assert.equal(vm.runInContext('liveRat.hp',ctx),0);assert(vm.runInContext('s.groundLoot.some(p=>p._sharedObject&&p.items.bones)',ctx),'browser shows committed enemy loot');
vm.runInContext(`s.tutorial=tutorialSteps.findIndex(t=>t.event==='ore');s.tutorialReward=false;s.bag.copperOre=1;s.bag.tinOre=0;const next=tutorialNextAction();assert(next.instruction.includes('tin'));assert.equal(next.instruction,tutorialStep().desc);assert(questJournalRows('tutorial').some(row=>!row.done&&row.text===next.instruction));renderTutorialJournal();assert($('panel').children.some(e=>e.className==='quest-journal-back'));const before=s.tutorial;openGamePanel('bag');assert.equal(s.tutorial,before,'opening ordinary panels does not trigger tutorial policing');activeEncounter={o:liveRat,hazards:[],phase:0};renderEncounterHud();assert.equal($('encounterHud').hidden,true,'ordinary rats have no large target panel');const boss=worldScenes.lair_veyr.objects.find(o=>o.encounter==='veyr');activeEncounter={o:boss,hazards:[],phase:0};renderEncounterHud();assert.equal($('encounterHud').hidden,false,'boss retains compact panel');assert.equal($('encounterTell').hidden,true,'idle combat instructions do not take screen space');`,ctx);
console.log('PASS: real browser melee through server receipts and drops; journal gives exact remaining tutorial action without blocking panels; ordinary-enemy HUD removed and boss HUD retained.');
