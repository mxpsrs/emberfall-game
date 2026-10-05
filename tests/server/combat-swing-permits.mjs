import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncSharedWorld,publicAction} from '../../worker/shared-world.js';
import catalog from '../../worker/shared-catalog.json' with {type:'json'};
const sqlite=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const db={prepare(sql){return {bind(...args){return {sql,args,async first(){return sqlite.prepare(sql).get(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}}}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(({sql,args})=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};

let now=Date.now(),sequence=0;Date.now=()=>now;Math.random=()=>.9999;
const e=Object.values(catalog.entities).find(e=>e.mainStoryStage===4),state={tutorialReward:true,mainStoryQuest:{stage:4},equipment:{weapon:'bronzeSword'},xp:{}};
async function send(event,actor='fighter'){
 const world=await syncSharedWorld({DB:db},actor,state,{scene:e.scene,x:e.x+1,y:e.y,world:{protocol:1,watch:[e.id],events:[{scene:e.scene,entity:e.id,generation:1,style:'melee',...event}]}},now,'swing-test');return world.receipts.find(r=>r.id===event.id);
}
assert((await send({id:'swing1',kind:'attack',reserve:true})).reserved);
now+=300;const hit={id:'swing1-hit',kind:'hit',swing:'swing1'};const first=await send(hit);assert(first.ok);assert.deepEqual(await send(hit),first,'network retries return the same committed hit');
assert(!(await send({...hit,id:'another-impact'})).ok,'one swing cannot create a second impact');
const cooldown=await send({id:'swing2',kind:'attack',reserve:true});assert(!cooldown.ok);assert.equal(cooldown.code,'attack_cooldown');assert(cooldown.readyAt>now);
const deniedImpact=await send({id:'swing2-hit',kind:'hit',swing:'swing2'});assert(!deniedImpact.ok,'rejected swing cannot deal damage');assert.equal(deniedImpact.code,'attack_cooldown','in-flight impact preserves quiet cooldown recovery');
assert(!(await send({id:'swing1-hit',kind:'hit',swing:'swing1'},'thief')).ok,'another actor cannot spend a swing');
now=cooldown.readyAt;assert((await send({id:'swing3',kind:'attack',reserve:true})).ok);now+=3500;
assert((await send({id:'swing3-hit',kind:'hit',swing:'swing3'})).ok,'delayed delivery does not reject an authorized impact');
assert.equal(sqlite.prepare("SELECT count(*) AS n FROM shared_events WHERE actor='fighter' AND kind='hit' AND json_extract(result,'$.ok')=1").get().n,2);
console.log('PASS: authoritative swing cooldown, exactly one impact per swing, idempotent retries, rejected-swing and cross-player protection, and delayed impacts.');

const vm=await import('node:vm'),source=fs.readFileSync('client/shared-world.js','utf8'),foe={id:e.id};
const notices=[],noop=()=>{};const ctx=vm.createContext({s:{sharedOutbox:[],sharedReceipts:[],groundLoot:[]},worldScenes:{[e.scene]:{objects:[foe]}},currentScene:e.scene,objects:[],target:foe,activeEncounter:null,sharedApplying:false,sharedActor:null,sharedOffset:0,sharedScene:null,sharedAttackReadyAt:0,sharedCallbacks:new Map(),Date,questFightVisible:()=>true,worldIndex:()=>({byId:new Map([[e.id,foe]])}),stop:()=>{throw Error('Cooldown must not stop auto-combat');},resetEncounter:noop,applySharedEffects:noop,renderUI:noop,save:noop,toast:message=>notices.push(message),meleeImpacts:[{sharedSwing:'swing2'}],projectiles:[{sharedSwing:'swing2'}],data:{world:{protocol:1,actor:'fighter',serverTime:now,receipts:[cooldown,deniedImpact],entities:[],effects:[],objects:[]}}});
vm.runInContext(source.slice(source.indexOf('function applySharedWorld('),source.indexOf('const sharedAttackBefore=')),ctx);vm.runInContext('applySharedWorld(data)',ctx);
assert.equal(ctx.target,foe);assert.equal(notices.length,0);assert.equal(ctx.meleeImpacts.length,0);assert.equal(ctx.projectiles.length,0);assert.equal(ctx.sharedAttackReadyAt,cooldown.readyAt);
console.log('PASS: cooldown resynchronization preserves auto-attack, cancels rejected swing visuals, and emits no chat spam.');
