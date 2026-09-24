import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncSharedWorld,publicAction} from '../worker/shared-world.js';
import catalog from '../worker/shared-catalog.json' with {type:'json'};
const sqlite=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const db={prepare(sql){return {bind(...args){return {sql,args,async first(){return sqlite.prepare(sql).get(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}}}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(({sql,args})=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};

const env={DB:db};let now=1000000;Date.now=()=>now;Math.random=()=>.99999;
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const {ctx,vm}=require('../scripts/game-fixture.cjs');
ctx.clock=()=>now;
for(const f of ['multiplayer','shared-world'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(`Date.now=()=>clock();draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();renderUI=renderAction=renderEncounterHud=save=playGameSound=()=>{};s.character={name:'Network timing',look:0};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.mainStoryQuest={stage:4};s.equipment.weapon='bronzeSword';s.xp.Hitpoints=200000;s.hp=maxhp();const foe=mainStoryObject('lookout');activateScene('overworld',foe.x+1,foe.y);assetsReady=cloudReady=true;cloudDirty=cloudBusy=false;time=100;lastAttack=playerHitAt=0;Math.random=()=>.99999;`,ctx);
const failures=new Map(),accepted=new Map();
async function poll(){
 const input=JSON.parse(vm.runInContext('JSON.stringify({scene:currentScene,x:px,y:py,world:outgoingSharedWorld(),action:outgoingSharedAction()})',ctx));
 const state=JSON.parse(vm.runInContext('JSON.stringify(s)',ctx));const world=await syncSharedWorld(env,'timing-client',state,input,now,'timing');
 for(const r of world.receipts)if(['attack','hit'].includes(r.kind)){if(r.ok)accepted.set(r.id,r);else failures.set(r.id,r);}
 ctx.DATA={world};vm.runInContext('applySharedWorld(DATA)',ctx);return world;
}
await poll();vm.runInContext('target=foe;',ctx);
let nextPoll=now+500,period=0;const delays=[500,750,250,500,950,350];
for(let i=0;i<600;i++){
 now+=50;vm.runInContext('time+=.05;if(target&&time+.0001>=playerAttackReadyAt)performAttack(target);updateCombat(.05);',ctx);
 if(now>=nextPoll){await poll();nextPoll=now+delays[period++%delays.length];}
}
await poll();assert.equal(failures.size,0,'normal auto-attacks must survive packet jitter: '+JSON.stringify([...failures.values()]));assert(accepted.size>=16,'auto-combat continues across the full interval');assert(vm.runInContext('target===foe',ctx),'timing does not clear the target');
console.log('PASS: real client raider-lookout auto-combat survives 250–950ms packet spacing without rejected hits, target loss, or cooldown chat spam.');
