import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {handlePlayers,handleSave,handleAuth,handleActivity,SAVE_RESET_VERSION} from '../worker/api.js';
const require=createRequire(import.meta.url),sql=new DatabaseSync(':memory:');
for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(query){return {bind(...args){assert(args.length<=100,'D1 bind limit');return {query,args,async first(){return sql.prepare(query).get(...args)},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}}}}}}},async batch(statements){sql.exec('BEGIN');try{const rows=statements.map(({query,args})=>({meta:{changes:sql.prepare(query).run(...args).changes}}));sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
let clock=Date.now();const realNow=Date.now;Date.now=()=>Math.floor(clock);
const req=(url,cookie,body,method='POST')=>new Request('https://game.test'+url,{method,headers:{cookie,origin:'https://game.test'},body:JSON.stringify({...body,resetVersion:SAVE_RESET_VERSION})});
async function client(name){
 delete require.cache[require.resolve('../scripts/game-fixture.cjs')];const {ctx,vm}=require('../scripts/game-fixture.cjs');
 ctx.clock=()=>Math.floor(clock);ctx.AbortSignal=AbortSignal;ctx.performance={now:()=>clock};
 const run=code=>vm.runInContext(code,ctx),json=code=>JSON.parse(run('JSON.stringify('+code+')'));
 for(const f of ['multiplayer','shared-world'])run(fs.readFileSync('dist/'+f+'.js','utf8'));
 ctx.NAME=name;
 run(`Date.now=()=>clock();draw=()=>{};drawPortrait=()=>{};s.character={name:NAME,look:0};s.worldScale=3;s.tutorialIslandVersion=2;s.tutorialVersion=6;s.tutorial=25;s.sceneId='tutorial';s.x=51;s.y=78;setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();renderUI=renderAction=renderEncounterHud=renderTutorial=save=playGameSound=()=>{};assetsReady=cloudReady=true;cloudDirty=cloudBusy=false;s.spirits=Object.fromEntries(Object.keys(SPIRITS).map(id=>[id,{state:'set',bondXP:0}]));s.attunedSpirit='cinder';s.equipment.weapon='woodenSword';s.equipment.shield='woodenShield';s.xp.Hitpoints=200000;s.hp=maxhp();const rat=objects.find(o=>o.kind==='rat');`);
 const registration=await handleAuth(req('/api/auth/register','',{username:name,password:'test-only-9862!'}),env);assert.equal(registration.status,200);const cookie=registration.headers.get('set-cookie').split(';')[0];
 const saved=await handleSave(req('/api/character',cookie,{state:json('s'),revision:0},'PUT'),env);assert.equal(saved.status,200,await saved.text());
 const c={run,json,ctx,cookie,packets:[]};ctx.fetch=async(url,options)=>{const input=JSON.parse(options.body);const response=await handlePlayers(req(url,cookie,input),env);const body=await response.clone().json();assert.equal(response.status,200,JSON.stringify(body));c.packets.push({input,body});return response;};
 c.poll=async()=>{await run('syncOnlineWorld()');assert.equal(run('cloudDisconnected'),false);return c.packets.at(-1).body;};return c;
}
const a=await client('SharedAlpha'),b=await client('SharedBravo');
await a.poll();await b.poll();await a.poll();
for(const c of [a,b])c.run('px=s.x=rat.x+1;py=s.y=rat.y;playerMotion.moving=false;lineOfSight=()=>true;');
await a.poll();await b.poll();await a.poll();
// Remove the target from the observer's local world entirely.
a.run(`const missingId=String(rat.id);objects.splice(objects.indexOf(rat),1);worldIndex().byId.delete(missingId);assert(!worldIndex().byId.has(missingId));var mesh={face:()=>{},indexed:()=>{},skinned:()=>{}};var clips=[];const beforePose=avatarGpuPose;avatarGpuPose=(...args)=>{clips.push(args[1]);return beforePose(...args);};var elementPaints=0;const beforeElement=drawElementalCast;drawElementalCast=(...args)=>{elementPaints++;return beforeElement(...args);};`);
const writes=[],worldFetch=b.ctx.fetch;b.ctx.EventSource=function(){};b.ctx.fetch=async(url,opts)=>{if(url!=='/api/activity')return worldFetch(url,opts);const task=handleActivity(new Request('https://game.test/api/activity',{method:'POST',headers:{cookie:b.cookie,origin:'https://game.test'},body:opts.body}),env);writes.push(task);return task;};
for(const id of ['cinder','brook','zephyr','cairn','pyre','rill','gale','flint']){
 clock+=3000;for(const c of [a,b])c.run('time+=3;');await a.poll();await b.poll();b.ctx.SPIRIT=id;
 b.run(`target=rat;s.hp=maxhp()-8;s.runEnergy=10;assert(unleashSpirit(SPIRIT));`);
 const response=await writes.at(-1);assert.equal(response.status,200,'urgent cast '+id);
 const controller=new AbortController(),stream=await handleActivity(new Request('https://game.test/api/activity?scene=tutorial',{headers:{cookie:a.cookie},signal:controller.signal}),env),reader=stream.body.getReader();
 const chunk=await reader.read();const packet=JSON.parse(new TextDecoder().decode(chunk.value).split('data: ')[1].split('\n\n')[0]);controller.abort();await reader.cancel();
 assert(packet.effects.some(e=>e.action?.kind==='spirit'&&e.action.spirits.includes(id)),'observer receives '+id+' independently of world polling');
 a.ctx.PACKET=packet;a.run(`applySharedEffects(PACKET.effects,PACKET.serverTime);clips=[];elementPaints=0;drawOnlinePlayers(mesh,[]);assert(clips.includes('magic'),'cast pose survives absent target');assert(elementPaints>0,'element effect survives absent target');`);
 const before=a.json('[...sharedSpiritActions.values()].map(a=>a.action.started)');a.run('applySharedEffects(PACKET.effects,PACKET.serverTime);');assert.deepEqual(a.json('[...sharedSpiritActions.values()].map(a=>a.action.started)'),before,'duplicate delivery never restarts cast');
}
// A concurrent normal swing must not erase the independent Spirit effect.
a.run(`const peer=[...onlinePeers.values()][0];rememberSharedAction(peer.id,{kind:'combat',style:'ranged',weapon:'shortbow',started:sharedNow(),duration:1600,target:{x:rat.x,y:rat.y}},sharedNow());assert(sharedSpiritActions.has(peer.id));assert(sharedVisualActions.has(peer.id));`);
// Taking damage is observer-visible even if the attacker NPC is absent.
a.ctx.STAMP=clock;a.run(`const actor=[...onlinePeers.keys()][0];const before=floaters.length;applySharedEffects([{id:'missing-npc-hit',actor,kind:'enemyHit',entity:missingId,generation:1,damage:2,at:STAMP}],STAMP);assert(floaters.length>before);`);
// Passive feedback belongs to the actor even when the foe is unavailable.
a.run(`{const actor=[...onlinePeers.keys()][0];const before=floaters.length;applySharedEffects([{id:'missing-npc-passive',actor,kind:'hit',entity:missingId,generation:1,damage:2,spirit:{id:'cinder',proc:'Kindle'},at:STAMP}],STAMP);assert(floaters.length>before);assert.equal(onlinePeers.get(actor).spiritProc.id,'cinder');elementPaints=0;drawOnlinePlayers(mesh,[]);assert(elementPaints>0);}`);
clock+=10000;a.run(`assert.equal(Object.keys(sharedPeerGear([...onlinePeers.values()][0])).length,0,'casting expires');`);
Date.now=realNow;
console.log('PASS: two authenticated clients, all eight immediate Unleash actions, distinct elemental rendering, missing local target, concurrent attack channel, duplicate suppression, expiry and independent player damage feedback.');
