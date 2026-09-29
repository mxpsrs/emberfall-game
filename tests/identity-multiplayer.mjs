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
 run(`Date.now=()=>clock();draw=()=>{};drawPortrait=()=>{};s.character={name:NAME,look:0};s.worldScale=3;s.tutorialIslandVersion=2;s.tutorialVersion=6;s.tutorial=25;s.sceneId='tutorial';s.x=51;s.y=78;setupExpandedWorld();setupTutorialVillage();setupLoot();renderUI=renderAction=renderEncounterHud=renderTutorial=save=playGameSound=()=>{};assetsReady=cloudReady=true;cloudDirty=cloudBusy=false;s.equipment.weapon='woodenSword';s.equipment.shield='woodenShield';s.xp.Hitpoints=200000;s.hp=maxhp();const rat=objects.find(o=>o.kind==='rat');`);
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
a.run(`const missingId=String(rat.id);objects.splice(objects.indexOf(rat),1);worldIndex().byId.delete(missingId);assert(!worldIndex().byId.has(missingId));`);
const writes=[],worldFetch=b.ctx.fetch;b.ctx.EventSource=function(){};b.ctx.fetch=async(url,opts)=>{if(url!=='/api/activity')return worldFetch(url,opts);const task=handleActivity(new Request('https://game.test/api/activity',{method:'POST',headers:{cookie:b.cookie,origin:'https://game.test'},body:opts.body}),env);writes.push(task);return task;};
// Publish a normal combat animation while the observer has no local copy of the
// target. Stable target identity and the combat action must still arrive intact.
b.run(`publishSharedAction({kind:'combat',style:'magic',started:sharedNow(),duration:1600,target:{entity:String(rat.id),x:rat.x,y:rat.y}});`);
const actionResponse=await writes.at(-1);assert.equal(actionResponse.status,200,'normal combat activity');
const controller=new AbortController(),stream=await handleActivity(new Request('https://game.test/api/activity?scene=tutorial',{headers:{cookie:a.cookie},signal:controller.signal}),env),reader=stream.body.getReader();
const chunk=await reader.read();const packet=JSON.parse(new TextDecoder().decode(chunk.value).split('data: ')[1].split('\n\n')[0]);controller.abort();await reader.cancel();
const activity=packet.effects.find(e=>e.action?.kind==='combat');assert(activity,'observer receives normal combat activity independently of world polling');
a.ctx.PACKET=packet;a.run(`applySharedEffects(PACKET.effects,PACKET.serverTime);const actor=[...onlinePeers.keys()][0],action=sharedVisibleAction(onlinePeers.get(actor));assert.equal(action.kind,'combat');assert.equal(action.style,'magic');assert.equal(action.target.entity,missingId);drawOnlinePlayers({face:()=>{},indexed:()=>{},skinned:()=>{}},[]);`);
const before=a.json('sharedVisualActions.get([...onlinePeers.keys()][0]).action.started');a.run('applySharedEffects(PACKET.effects,PACKET.serverTime);');assert.equal(a.json('sharedVisualActions.get([...onlinePeers.keys()][0]).action.started'),before,'duplicate delivery never restarts the combat action');
// A concurrent swing remains a separate visual action from the cached activity.
a.run(`const peer=[...onlinePeers.values()][0];rememberSharedAction(peer.id,{kind:'combat',style:'ranged',weapon:'shortbow',started:sharedNow(),duration:1600,target:{x:rat.x,y:rat.y}},sharedNow());assert.equal(sharedVisibleAction(peer).style,'ranged');`);
// Taking damage remains observer-visible even when the attacker NPC is absent.
a.ctx.STAMP=clock;a.run(`{const actor=[...onlinePeers.keys()][0];const before=floaters.length;applySharedEffects([{id:'missing-npc-hit',actor,kind:'enemyHit',entity:missingId,generation:1,damage:2,at:STAMP}],STAMP);assert(floaters.length>before);}`);
clock+=10000;a.run(`const expirationPeer=[...onlinePeers.values()][0],expiredAction=sharedVisibleAction(expirationPeer);assert(!expiredAction||sharedNow()-expiredAction.started>expiredAction.duration,'expired combat activity is no longer visible');`);
Date.now=realNow;
console.log('PASS: two authenticated clients, normal combat action synchronization with a missing local target, duplicate suppression, expiry and independent player damage feedback.');
