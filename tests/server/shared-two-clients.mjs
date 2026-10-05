import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {handlePlayers,handleSave,handleAuth,handleActivity,SAVE_RESET_VERSION} from '../../worker/api.js';
const require=createRequire(import.meta.url),sql=new DatabaseSync(':memory:');
for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(query){return {bind(...args){assert(args.length<=100,'D1 bind limit');return {query,args,async first(){return sql.prepare(query).get(...args)},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}}}}}}},async batch(statements){sql.exec('BEGIN');try{const rows=statements.map(({query,args})=>({meta:{changes:sql.prepare(query).run(...args).changes}}));sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
// Reproducible damage and roaming keep animation checks independent of lucky kills.
let simulationSeed=91583;const realRandom=Math.random;const testRandom=()=>{simulationSeed=(Math.imul(simulationSeed,1664525)+1013904223)>>>0;return simulationSeed/4294967296;};Math.random=testRandom;
let clock=Date.now();const realNow=Date.now;Date.now=()=>Math.floor(clock);
const req=(url,cookie,body,method='POST')=>new Request('https://game.test'+url,{method,headers:{cookie,origin:'https://game.test'},body:JSON.stringify({...body,resetVersion:SAVE_RESET_VERSION})});
async function client(name){
 delete require.cache[require.resolve('../../scripts/qa/game-fixture.cjs')];const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
 ctx.clock=()=>Math.floor(clock);ctx.AbortSignal=AbortSignal;ctx.performance={now:()=>clock};
 const run=code=>vm.runInContext(code,ctx),json=code=>JSON.parse(run('JSON.stringify('+code+')'));
 for(const f of ['multiplayer','shared-world'])run(fs.readFileSync('client/'+f+'.js','utf8'));
 ctx.NAME=name;ctx.testRandom=testRandom;run('Math.random=()=>testRandom();');
 run(`Date.now=()=>clock();draw=()=>{};drawPortrait=()=>{};s.character={name:NAME,look:0};s.worldScale=3;s.tutorialIslandVersion=2;s.tutorialVersion=6;s.tutorial=25;s.sceneId='tutorial';s.x=51;s.y=78;setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();renderUI=renderAction=renderEncounterHud=renderTutorial=save=playGameSound=()=>{};assetsReady=cloudReady=true;cloudDirty=cloudBusy=false;s.equipment.weapon='woodenSword';s.equipment.shield='woodenShield';s.xp.Hitpoints=200000;s.hp=maxhp();const rat=objects.find(o=>o.kind==='rat');`);
 const registration=await handleAuth(req('/api/auth/register','',{username:name,password:'test-only-9862!'}),env);assert.equal(registration.status,200);const cookie=registration.headers.get('set-cookie').split(';')[0];
 const saved=await handleSave(req('/api/character',cookie,{state:json('s'),revision:0},'PUT'),env);assert.equal(saved.status,200,await saved.text());
 const c={run,json,ctx,cookie,packets:[]};ctx.fetch=async(url,options)=>{const input=JSON.parse(options.body);const response=await handlePlayers(req(url,cookie,input),env);const body=await response.clone().json();assert.equal(response.status,200,JSON.stringify(body));c.packets.push({input,body});return response;};
 c.poll=async()=>{await run('syncOnlineWorld()');assert.equal(run('cloudDisconnected'),false);return c.packets.at(-1).body;};return c;
}
const a=await client('SharedAlpha'),b=await client('SharedBravo');
// Deliberately different subscription lists: scenery must never crowd out NPCs.
a.run(`const fullPacket=outgoingSharedWorld;outgoingSharedWorld=()=>{const w=fullPacket();w.watch=w.watch.filter(id=>!fighter(worldIndex().byId.get(id)));return w;};`);
await a.poll();await b.poll();await a.poll();
for(const c of [a,b]){assert(c.run('rat._sharedReady'));assert.equal(c.run('rat._sharedOwner'),'server');}

// Owner roams; two independently running simulations must converge.
for(let frame=0;frame<360;frame++){
 clock+=1000/60;for(const c of [a,b])c.run('time+=1/60;livingWorld(1/60);advanceWorldActors(1/60);');
 if(frame%15===0){await a.poll();await b.poll();}
}
assert.deepEqual(a.json('[rat.x,rat.y]'),b.json('[rat.x,rat.y]'),'same rat position after independent roaming');
// Both browsers render the server-owned NPC; neither may publish its position.
for(const c of [a,b])c.run('px=s.x=rat.x+1;py=s.y=rat.y;playerMotion.moving=false;');
assert(b.run('target=rat;performAttack(rat)')); 
a.run(`screen={w:1112,h:512};var renderedClips=[];const poseBeforeTest=avatarGpuPose;avatarGpuPose=function(...args){renderedClips.push(args[1]);return poseBeforeTest(...args);};var creatureClips=[];const creaturePoseBeforeTest=creatureRigPose;creatureRigPose=function(...args){creatureClips.push(args[1]);return creaturePoseBeforeTest(...args);};var testMesh={face:()=>{},indexed:()=>{},skinned:()=>{}};`);
let damage=false,peerAttack=false,enemyAttack=false,renderedAttack=false,renderedEnemy=false;
for(let frame=0;frame<12000;frame++){
 clock+=1000/60;for(const c of [a,b])c.run('time+=1/60;livingWorld(1/60);advanceWorldActors(1/60);updateCombat(1/60);');
 if(frame%15===0){await a.poll();await b.poll();const result=await a.poll();damage ||= b.packets.at(-1).body.world.receipts.some(r=>r.kind==='hit'&&r.ok&&r.damage>0);peerAttack ||= !!result.players.find(p=>p.name==='SharedBravo')?.action;enemyAttack ||= a.run('rat.attackAt>0');assert.deepEqual(a.json('[rat.x,rat.y,rat.hp,rat.dead]'),b.json('[rat.x,rat.y,rat.hp,rat.dead]'),'combat shares position, damage and death');}
 if(!renderedAttack&&a.run(`!![...onlinePeers.values()].find(p=>p.action?.kind==='combat'&&sharedNow()-p.action.started>100&&sharedNow()-p.action.started<p.action.duration-100)`)){
  a.run(`var peer=[...onlinePeers.values()].find(p=>p.action?.kind==='combat');peer.drawX=peer.x-.2;peer.drawAt=performance.now()-16;renderedClips=[];drawOnlinePlayers(testMesh,[]);assert(renderedClips.includes('melee'),'remote melee renders during final movement interpolation');assert.equal(peer.action.target.entity,String(rat.id),'attack identifies the same shared monster');`);renderedAttack=true;
 }
 if(!renderedEnemy&&a.run('rat.attackAt>0&&time-rat.attackAt>.15&&time-rat.attackAt<.7')){a.run(`creatureClips=[];creature3(testMesh,rat,rat.drawX+.5,rat.drawY+.5);assert(creatureClips.some(c=>c.startsWith('attack')),'observer renders monster attack geometry');`);renderedEnemy=true;}
 if(frame%160===159&&b.run('rat.hp>0'))b.run('performAttack(rat)');
 if(b.run('rat.hp===0'))break;
}
assert(renderedAttack,'rendered player attack');assert(renderedEnemy,'rendered monster attack '+JSON.stringify({enemyAttack,damage,rat:a.json('rat'),time:a.run('time')}));assert(damage,'second client damages shared rat');assert(peerAttack,'observer receives attack');assert(enemyAttack,'observer receives enemy attack');assert.equal(a.run('rat.hp'),0,'observer sees defeated NPC');assert(!a.run('s.groundLoot.some(o=>o._sharedObject)'),'observer cannot see private drops');
console.log('PASS: authenticated two-client server-owned roaming, combat, melee damage, player/enemy actions and private death loot.');
// Exercise public action packets through both clients and the actual avatar renderer.
for(const [kind,detail,clip] of [['combat','ranged','ranged'],['combat','magic','magic'],['gather','tree','melee'],['gather','ore','melee'],['gather','fish','fishing'],['work','cook','bury'],['work','firemaking','firemaking'],['teleport','red','magic'],['teleport','green','magic'],['teleport','red-arrival','magic'],['teleport','green-arrival','magic']]){
 clock+=3000;for(const c of [a,b])c.run('time+=3;');
 b.ctx.KIND=kind;b.ctx.DETAIL=detail;
 b.run(`stop();resetEncounter(false);playerAction=null;tutorialCrossing=null;sharedActionCache=null;
  if(KIND==='combat')sharedActionCache={kind:'combat',started:sharedNow()-200,duration:1500,style:DETAIL,target:{entity:String(rat.id),x:rat.x,y:rat.y}};
  if(KIND==='gather'){var resource=objects.find(o=>o.type===DETAIL);target=resource;px=s.x=resource.x+1;py=s.y=resource.y;elapsed=.4;}
  if(KIND==='work')playerAction={kind:DETAIL,started:time-.4,duration:2};
  if(KIND==='teleport')tutorialCrossing={kind:DETAIL.startsWith('red')?'hunt':undefined,phase:DETAIL.includes('arrival')?'arrival':'casting',age:.4};`);
 const p=b.json('[px,py]');a.ctx.POS=p;a.run('px=s.x=POS[0];py=s.y=POS[1];');
 await b.poll();await a.poll();a.ctx.CLIP=clip;a.ctx.CASE=kind+':'+detail;
 a.run(`for(var p of onlinePeers.values()){p.drawX=p.x;p.drawY=p.y;p.samples=[{x:p.x,y:p.y,at:performance.now()-500}];}renderedClips=[];drawOnlinePlayers(testMesh,[]);assert(renderedClips.includes(CLIP),'observer renders '+CASE+': '+renderedClips+' '+JSON.stringify([...onlinePeers.values()].map(p=>p.action)));`);
 if(kind==='teleport'){
  const observer=a.json('[...onlinePeers.values()].find(p=>p.name==="SharedBravo").action');
  assert.equal(observer.color,detail.startsWith('red')?'red':'green');
  assert.equal(observer.duration,detail.includes('arrival')?1100:2600);
  a.ctx.EXPECTED_COLOR=detail.startsWith('red')?'#ff6464':'#a7e6e0';
  a.run(`var castPeer=[...onlinePeers.values()].find(p=>p.name==='SharedBravo');assert.equal(sharedPeerGear(castPeer)._castColor,EXPECTED_COLOR);`);
  clock+=5000;for(const c of [a,b])c.run('time+=5;');
  a.run(`assert.deepEqual(sharedPeerGear(castPeer),{},'expired teleport leaves no stuck casting pose');`);
 }
}
b.run('tutorialCrossing=null;playerAction=null;sharedActionCache=null;stop();');
console.log('PASS: observer renders ranged, magic, chopping, mining, fishing, cooking, firemaking and red/green teleport departure/arrival poses, correct colors and expiry from authenticated action packets.');

// Open the school at its real outside approach before receiving its snapshot,
// then walk through the actual navigation threshold and close from inside.
for(const id of ['shop','forge','inn','realm_briarhaven_3','realm_briarhaven_4','village_kitchen']){
 for(const c of [a,b]){c.ctx.DOOR=id;c.run(`stop();var door=objects.find(o=>o.building?.walkIn&&o.destination===DOOR);px=s.x=doorApproach(door)[0];py=s.y=doorApproach(door)[1];delete door._sharedReady;`);}
 a.run('engage(door);updateDoorThreshold();');
 const ar=await a.poll();await b.poll();
 for(const c of [a,b])assert(c.run('door.openedAt!==undefined'),'both clients see opened '+id+': '+JSON.stringify(ar.world.receipts));
 a.run(`assert(walkTo(...doorApproach(door,true)),'route through open door');for(var i=0;i<180;i++){time+=1/60;advanceMovement(1/60);updateDoorThreshold();}assert(withinWalkIn(door.building,px,py),'walk inside');engage(door);updateDoorThreshold();`);
 await a.poll();await b.poll();for(const c of [a,b])assert(c.run('door.openedAt===undefined'),'both clients see closed '+id);
}
console.log('PASS: moved doors open on first click, allow real entry, and close from inside for both clients.');
// A stale attack object must not permanently lock trading; a real encounter must.
b.ctx.setInterval=()=>{};b.ctx.accountUsername='SharedBravo';b.ctx.document.querySelector=()=>null;
b.run(fs.readFileSync('client/social.js','utf8'));
b.run(`stop();resetEncounter(false);projectiles=[];meleeImpacts=[];time+=10;assert(playerAttackMotion,'retain the completed attack to reproduce the regression');assert.equal(tradeCombatActive(),false);queueCloudSave=()=>{};flushCloudSave=async()=>{};$('modal').open=false;$('creator').open=false;$('spiritsDialog').open=false;`);
await b.run('preparePlayerTrade()');assert(b.run('window.playerTrade'));b.run(`window.playerTrade=false;rat.hp=rat.maxhp;rat.dead=0;beginEncounter(rat);assert(tradeCombatActive(),'active combat still blocks trade');`);
await assert.rejects(b.run('preparePlayerTrade()'),/Finish combat/);
// Escape must clear a non-owner's local encounter instead of returning early forever.
b.run(`rat._sharedOwner='another-client';px=s.x=rat.homeX+24;py=s.y=rat.homeY;updateEncounterAI(.1);assert.equal(activeEncounter,null);assert.equal(tradeCombatActive(),false);`);
console.log('PASS: trading after a completed attack and escape; active combat remains protected.');
// Stop the attacker's simulation and ordinary polling. The observer still sees
// server-generated attacks and committed damage, with no client pose authority.
clock+=65000;for(const c of [a,b])c.run('time+=65;stop();resetEncounter(false);px=s.x=rat.homeX+1;py=s.y=rat.homeY;');
await a.poll();await b.poll();
for(const c of [a,b])c.run('px=s.x=rat.x+1;py=s.y=rat.y;');
b.run('performAttack(rat)');await b.poll();await a.poll();
const beforeEvents=sql.prepare("SELECT count(*) n FROM shared_events WHERE kind='enemyHit'").get().n;
for(let i=0;i<48;i++){clock+=100;a.run('time+=.1;updateCombat(.1);');await a.poll();}
assert(sql.prepare("SELECT count(*) n FROM shared_events WHERE kind='enemyHit'").get().n>beforeEvents,'server attacks continue without attacker browser updates');
const beforeRat=a.json('[rat.x,rat.y,rat.hp]');
const forged=a.json('({scene:currentScene,x:px,y:py,world:{protocol:1,watch:[String(rat.id)],poses:[{entity:String(rat.id),generation:rat._sharedGeneration,x:rat.homeX+10,y:rat.homeY,attackAt:sharedNow(),fighting:false}]}})');
const forgedResponse=await handlePlayers(req('/api/players',a.cookie,forged),env);assert.equal(forgedResponse.status,200);await a.poll();assert.deepEqual(a.json('[rat.x,rat.y,rat.hp]'),beforeRat,'forged browser NPC pose is ignored');
console.log('PASS: server keeps fighting while attacker simulation is stalled; browser NPC pose injection is ignored.');

// Hold a full world request open, then send the actual attack-start notification
// over the independent route and consume the live stream before it closes.
await b.poll();await a.poll();
let unblock;const held=new Promise(resolve=>{unblock=resolve}),pending=[];const originalFetch=b.ctx.fetch;
b.ctx.EventSource=function(){};
b.ctx.fetch=async(url,options)=>{
 if(url==='/api/activity'){const task=handleActivity(req(url,b.cookie,JSON.parse(options.body)),env);pending.push(task);return task;}
 await held;return originalFetch(url,options);
};
const streamResponse=await handleActivity(new Request('https://game.test/api/activity?scene=tutorial',{headers:{cookie:a.cookie}}),env);assert.equal(streamResponse.status,200);
const reader=streamResponse.body.getReader(),decode=new TextDecoder();await reader.read();
const blockedPoll=b.run('syncOnlineWorld()');clock+=3000;b.run('time+=3;target=rat;performAttack(rat)');
await Promise.all(pending);assert(pending.length>0,'attack sends immediately despite blocked world request');
let packet;for(let i=0;i<6;i++){const part=await reader.read();if(part.done)break;packet=JSON.parse(decode.decode(part.value).split('data: ')[1].trim());if(packet.effects.some(e=>e.kind==='activity'&&e.action.started===b.run('sharedActionCache.started')))break;}
assert(packet.effects.some(e=>e.kind==='activity'&&e.action.started===b.run('sharedActionCache.started')),'observer receives attack on stream while world poll is blocked');
await reader.cancel();b.ctx.fetch=originalFetch;delete b.ctx.EventSource;unblock();await blockedPoll;
// Simulate a 2.5 second delivery delay: do not lose or replay the attack twice.
clock+=2500;a.ctx.LIVE=packet;a.run('time+=2.5;applySharedEffects(LIVE.effects,LIVE.serverTime+2500);var remote=[...onlinePeers.values()].find(p=>p.name==="SharedBravo");var startedOnce=sharedVisibleAction(remote).started;assert(sharedPeerGear(remote)._attackAt>time-.2);applySharedEffects(LIVE.effects,LIVE.serverTime+2500);assert.equal(sharedVisibleAction(remote).started,startedOnce);');
clock+=2000;a.run('time+=2;assert.equal(sharedPeerGear(remote)._attackAt,undefined,"completed action does not restart");');
assert.equal((await handleActivity(new Request('https://game.test/api/activity?scene=tutorial'),env)).status,401);
assert.equal((await handleActivity(new Request('https://game.test/api/activity',{method:'POST',headers:{cookie:b.cookie,origin:'https://other.test'},body:'{}'}),env)).status,403);
console.log('PASS: urgent combat reaches an open observer stream independently of stalled world polling; delayed animation plays once; unauthenticated/cross-origin writes rejected.');
Date.now=realNow;Math.random=realRandom;
