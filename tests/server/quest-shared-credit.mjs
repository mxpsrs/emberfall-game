import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {handlePlayers,handleSave,handleAuth,handleActivity,SAVE_RESET_VERSION} from '../../worker/api.js';
const require=createRequire(import.meta.url),sql=new DatabaseSync(':memory:');
for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(query){return {bind(...args){assert(args.length<=100,'D1 bind limit');return {query,args,async first(){return sql.prepare(query).get(...args)},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}}}}}}},async batch(statements){sql.exec('BEGIN');try{const rows=statements.map(({query,args})=>({meta:{changes:sql.prepare(query).run(...args).changes}}));sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
let clock=Date.now();const realNow=Date.now;Date.now=()=>Math.floor(clock);
const req=(url,cookie,body,method='POST')=>new Request('https://game.test'+url,{method,headers:{cookie,origin:'https://game.test'},body:JSON.stringify({...body,resetVersion:SAVE_RESET_VERSION})});
async function client(name){
 delete require.cache[require.resolve('../../scripts/qa/game-fixture.cjs')];const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
 ctx.clock=()=>Math.floor(clock);ctx.AbortSignal=AbortSignal;ctx.performance={now:()=>clock};
 const run=code=>vm.runInContext(code,ctx),json=code=>JSON.parse(run('JSON.stringify('+code+')'));
 for(const f of ['multiplayer','shared-world'])run(fs.readFileSync('client/'+f+'.js','utf8'));
 ctx.NAME=name;
 run(`Date.now=()=>clock();draw=()=>{};drawPortrait=()=>{};s.character={name:NAME,look:0};s.worldScale=3;s.tutorialIslandVersion=2;s.tutorialVersion=7;s.tutorial=38;s.tutorialReward=true;s.mainStoryQuest={stage:4};s.sceneId='overworld';s.x=213;s.y=142;setupExpandedWorld();setupTutorialVillage();setupLoot();renderUI=renderAction=renderEncounterHud=renderTutorial=save=playGameSound=()=>{};assetsReady=cloudReady=true;cloudDirty=cloudBusy=false;s.equipment.weapon='ironSword';s.equipment.shield='woodenShield';s.xp.Attack=200000;s.xp.Strength=200000;s.xp.Hitpoints=200000;s.hp=maxhp();const rat=mainStoryObject('lookout');activateScene('overworld',rat.x+1,rat.y);`);
 const registration=await handleAuth(req('/api/auth/register','',{username:name,password:'test-only-9862!'}),env);assert.equal(registration.status,200);const cookie=registration.headers.get('set-cookie').split(';')[0];
 const saved=await handleSave(req('/api/character',cookie,{state:json('s'),revision:0},'PUT'),env);assert.equal(saved.status,200,await saved.text());
 const c={run,json,ctx,cookie,packets:[]};ctx.fetch=async(url,options)=>{const input=JSON.parse(options.body);const response=await handlePlayers(req(url,cookie,input),env);const body=await response.clone().json();assert.equal(response.status,200,JSON.stringify(body));c.packets.push({input,body});return response;};
 c.poll=async()=>{await run('syncOnlineWorld()');assert.equal(run('cloudDisconnected'),false);return c.packets.at(-1).body;};return c;
}

const a=await client('QuestAlpha'),b=await client('QuestBravo');
for(const c of [a,b]){await c.poll();c.run(`assert(rat._sharedReady);assert.equal(worldIndex().byId.get(String(rat.id)),rat);`);}
// Ordinary melee hits travel through the same authoritative receipt path.
// The observer intentionally has no ownership or kill credit.
for(let i=0;i<60&&a.run('rat.hp>0');i++){clock+=30000;a.run("time+=30;target=rat;resolveHit(rat,999,'melee');");await a.poll();await b.poll();}
assert.equal(a.run('mainStoryState().stage'),5,'killer gets story credit');assert.equal(b.run('mainStoryState().stage'),4,'observer gets no story credit');
assert(a.run('s.groundLoot.some(p=>p._sharedObject)'), 'killer receives loot');assert(!b.run('s.groundLoot.some(p=>p._sharedObject)'), 'private loot stays private');
assert(a.run("worldScenes.overworld.objects.find(o=>o.name==='Fisher Nessa').dead===0"),'Nessa stays alive');
const packet=a.packets.at(-1).body;a.ctx.REPLAY=packet;a.run('applySharedWorld(REPLAY);assert.equal(mainStoryState().stage,5);');
const saved=await handleSave(req('/api/character',a.cookie,{state:a.json('s'),revision:1},'PUT'),env);assert.equal(saved.status,200,await saved.text());
const restored=await handleSave(new Request('https://game.test/api/character',{headers:{cookie:a.cookie}}),env);assert.equal((await restored.json()).state.mainStoryQuest.stage,5,'quest credit survives storage');
// Even a stale snapshot cannot restore the enemy after local quest credit.
a.run('assert(!questFightVisible(rat,s));assert(!worldActors().includes(rat));assert(!worldObjectsInBounds(rat.x-2,rat.x+2,rat.y-2,rat.y+2).includes(rat));');
clock+=30000;
const respawn=await b.poll();assert(respawn.world.entities.some(e=>e.entity===b.run('String(rat.id)')&&e.hp>0),'unfinished player sees respawn');
const completed=await a.poll();assert(!completed.world.entities.some(e=>e.entity===a.run('String(rat.id)')),'completed player receives no quest enemy');
a.ctx.RESPAWN=respawn;a.run('applySharedWorld(RESPAWN);assert(!worldActors().includes(rat));assert(!performAttack(rat));');
console.log('PASS: two authenticated clients, ordinary melee kill through a real server receipt, correct quest credit, no observer credit, Nessa untouched, private loot, receipt replay and durable quest stage.');
Date.now=realNow;
