import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncSharedWorld,publicAction} from '../worker/shared-world.js';
import catalog from '../worker/shared-catalog.json' with {type:'json'};
const sqlite=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const db={prepare(sql){return {bind(...args){return {sql,args,async first(){return sqlite.prepare(sql).get(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}}}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(({sql,args})=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};

const env={DB:db},scope='home-test';let now=1000000,seq=0;Date.now=()=>now;
const state={tutorialReward:true,xp:{Magic:12},bag:{runes:5},equipment:{weapon:'bronzeSword'}};
async function cast(actor,s=state,extra={},scene='overworld',position=[55,61]){
 const id='home'+(++seq);const result=await syncSharedWorld(env,actor,s,{scene,x:position[0],y:position[1],world:{protocol:1,events:[{id,scene,kind:'teleport',mode:'home',destination:'overworld',...extra}]}},now,scope);
 return result.receipts.find(r=>r.id===id);
}
const before=JSON.stringify(state),permit=await cast('traveller');assert(permit.ok,JSON.stringify(permit));assert.equal(permit.color,'purple');assert.deepEqual(permit.entry,catalog.homeTeleport.entry);assert.equal(JSON.stringify(state),before,'server leaves inventory and XP unchanged');assert(!('xp' in permit));
assert(!(await cast('traveller')).ok,'duplicate cast is blocked');
assert(!(await cast('student',{tutorial:1,tutorialVersion:7})).ok,'apprenticeship cannot be skipped');
assert(!(await cast('bad-destination',state,{destination:'lair_veyr'})).ok);
assert(!(await cast('bad-mode',state,{mode:'invented'})).ok);
assert(!(await cast('island',state,{},'tutorial',[42,51])).ok);
const cave=Object.keys(catalog.scenes).find(k=>k.startsWith('lair_'));assert((await cast('cave',state,{},cave,catalog.entries[cave])).ok,'return from a lair');
sqlite.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,1)').run('combat-hit',scope,'overworld','combat','hit','{"ok":true}',now);assert(!(await cast('combat')).ok);
sqlite.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,1)').run('recent-hit',scope,'overworld','hurt','enemyHit','{}',now);assert(!(await cast('hurt')).ok,'recent incoming damage prevents escape');
now+=4999;assert(!(await cast('hurt')).ok,'blocked before five seconds');now+=1;assert((await cast('hurt')).ok);
await syncSharedWorld(env,'traveller',state,{scene:'overworld',x:permit.entry[0],y:permit.entry[1],world:{protocol:1,arrival:permit.id}},now,scope);
assert(sqlite.prepare("SELECT id FROM shared_events WHERE actor='traveller' AND kind='arrival'").get(),'arrival recorded');
assert.equal(publicAction({action:{kind:'teleport',color:'purple',started:now,duration:2600}},now).color,'purple','observer effect preserves purple');
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const {ctx,vm}=require('../scripts/game-fixture.cjs');
for(const f of ['multiplayer','shared-world'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx,{filename:f});
ctx.CLOCK=now;
vm.runInContext(`Date.now=()=>CLOCK;draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();renderUI=()=>{};renderAction=()=>{};save=()=>{};playGameSound=()=>{};s.character={name:'Home traveller',look:0};s.tutorial=tutorialSteps.length;s.tutorialReward=true;activateScene('overworld',42,51);assetsReady=true;cloudReady=true;cloudDirty=false;cloudBusy=false;time=100;lastAttack=playerHitAt=0;assert(land(...BRIARHAVEN_PLAZA),'home destination must be walkable');assert(!buildings.some(b=>inBuilding(b,...BRIARHAVEN_PLAZA)),'home destination is outdoors');`,ctx);
async function poll(){const input=JSON.parse(vm.runInContext('JSON.stringify({scene:currentScene,x:px,y:py,world:outgoingSharedWorld(),action:outgoingSharedAction()})',ctx)),character=JSON.parse(vm.runInContext('JSON.stringify(s)',ctx));const result=await syncSharedWorld(env,'client',character,input,now,'client-home');ctx.DATA={world:result};vm.runInContext('applySharedWorld(DATA)',ctx);return result;}
await poll();
vm.runInContext(`const possessions=JSON.stringify({bag:s.bag,xp:s.xp,gold:s.gold,equipment:s.equipment,tutorial:s.tutorial});assert(beginHomeTeleport());assert.equal(tutorialCrossing,null,'wait for server permit before animation');`,ctx);
await poll();
vm.runInContext(`assert.equal(tutorialCrossing.kind,'home');assert.equal(outgoingSharedAction().color,'purple');assert.equal(sharedPeerGear({action:{kind:'teleport',color:'purple',started:Date.now(),duration:2600}})._castColor,'#b785f5');`,ctx);
now+=2600;ctx.CLOCK=now;
vm.runInContext(`updateTutorialCrossing(2.6);assert.equal(currentScene,'overworld');assert.deepEqual([px,py],BRIARHAVEN_PLAZA);assert.equal(tutorialCrossing.phase,'arrival');assert.equal(JSON.stringify({bag:s.bag,xp:s.xp,gold:s.gold,equipment:s.equipment,tutorial:s.tutorial}),possessions,'cast gives no XP, consumes no relics, and preserves gear');updateTutorialCrossing(1.2);assert.equal(tutorialCrossing,null);assert.equal($('modal').open,false,'no tutorial reward popup');`,ctx);
await poll();
vm.runInContext(`time=100;lastAttack=95.001;assert.equal(homeTeleportReady(),false);lastAttack=95;assert.equal(homeTeleportReady(),true);sharedPermit=true;assert(beginHomeTeleport());sharedPermit=false;playerHitAt=time;updateTutorialCrossing(.1);assert.equal(tutorialCrossing,null,'incoming combat interrupts casting');assert.deepEqual([px,py],BRIARHAVEN_PLAZA);`,ctx);
assert(sqlite.prepare("SELECT id FROM shared_events WHERE actor='client' AND kind='arrival'").get(),'actual client emits accepted arrival');
console.log('PASS: free purple Home Teleport; server authorization, combat/tutorial guards, real client round trip, safe Briarhaven destination, unchanged XP/items, observer color, and recorded arrival.');
