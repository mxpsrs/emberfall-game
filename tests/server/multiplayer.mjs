import catalog from '../../worker/shared-catalog.json' with {type:'json'};
import {DatabaseSync} from 'node:sqlite';import assert from 'node:assert/strict';import fs from 'node:fs';import {handleSave,handlePlayers,handleAuth,SAVE_RESET_VERSION} from '../../worker/api.js';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}}}}}}}}};
const req=(path,method='GET',cookie='',body)=>new Request('https://game.test'+path,{method,headers:{cookie,origin:'https://game.test'},...(body?{body:JSON.stringify({...body,resetVersion:SAVE_RESET_VERSION})}:{})});
async function guest(name){const r=await handleAuth(req('/api/auth/register','POST','',{username:name.replaceAll(' ','_'),password:'test-only-password-572!'}),env);assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly/);const state={x:14,y:17,hp:30,gold:0,xp:{Combat:0},bag:{fish:1},character:{name,look:0},equipment:{weapon:'bronzeSword'}};assert.equal((await handleSave(req('/api/character','PUT',cookie,{state,revision:0}),env)).status,200);return cookie;}
const a=await guest('Player A'),b=await guest('Player B');assert.notEqual(a,b);
const presence=(cookie,scene='overworld',x=14)=>handlePlayers(req('/api/players','POST',cookie,{scene,x,y:17,heading:0,emote:'Hello!'}),env);
let r=await presence(a);assert.equal(r.status,200);assert.equal((await r.json()).players.length,0);r=await presence(b);let peers=(await r.json()).players;assert.equal(peers.length,1);assert.equal(peers[0].name,'Player A');assert.equal(peers[0].emote,'Hello!');assert(!JSON.stringify(peers).includes(a.split('=')[1]));
await presence(a,'overworld',16);peers=(await (await presence(b)).json()).players;assert.equal(peers[0].x,16);
assert.equal((await handlePlayers(req('/api/players','POST','',{scene:'overworld',x:14,y:17}),env)).status,401);
assert.equal((await presence(a,'overworld',1152)).status,400);
assert.equal((await presence(a,'overworld',1100)).status,200);
for(const [scene,x,y]of [['realm_aelindor_25',12,10],['realm_ironhollow_5',22,18],['realm_deepforge_0',8,10],['realm_crownreach_25',12,18]])assert.equal((await handlePlayers(req('/api/players','POST',a,{scene,x,y}),env)).status,200,scene);
for(const scene of ['realm_aelindor_26','realm_unknown_0','realm_crownreach_999','__proto__'])assert.equal((await handlePlayers(req('/api/players','POST',a,{scene,x:5,y:5}),env)).status,400,scene);
const saved=await (await handleSave(req('/api/character','GET',b),env)).json();assert.equal(saved.state.character.name,'Player B');
const kit={head:'rangerHood',body:'bronze_body',shoulders:'gold_shoulders',hands:'mithril_hands',legs:'iron_legs',feet:'bronze_feet',weapon:'woodenSword',shield:'woodenShield',crest:'helmet_crest_1',neck:'copperNecklace'};
saved.state.character={...saved.state.character,frame:'female',hair:1,topStyle:5,bottomStyle:4,topColor:2,bottomColor:7};saved.state.equipment=kit;saved.state.toolBelt={axe:true,pickaxe:true,tinderbox:true};
assert.equal((await handleSave(req('/api/character','PUT',b,{state:saved.state,revision:saved.revision}),env)).status,200);
const visibleKit={...Object.fromEntries(Object.entries(kit).filter(([slot])=>!['shoulders','crest'].includes(slot))),ring:null,belt:null,cape:null};
await presence(b);peers=(await (await presence(a)).json()).players;assert.deepEqual(peers.find(p=>p.name==='Player B').equipment,visibleKit,'second player sees all supported equipment slots; matching shoulders come from the chest piece');
const appearance=peers.find(p=>p.name==='Player B');assert.equal(appearance.frame,'female');assert.equal(appearance.appearance.topStyle,5);assert.equal(appearance.appearance.bottomStyle,4);assert.equal(appearance.equipment.head,'rangerHood');
const persisted=await (await handleSave(req('/api/character','GET',b),env)).json();assert.deepEqual(persisted.state.toolBelt,saved.state.toolBelt);
const spoof=await handlePlayers(req('/api/players','POST',b,{scene:'overworld',x:14,y:17,equipment:{body:'malicious-model'}}),env);assert.equal(spoof.status,200);peers=(await (await presence(a)).json()).players;assert.deepEqual(peers.find(p=>p.name==='Player B').equipment,visibleKit,'presence body cannot override saved equipment');
// Tutorial presence and saves stay separate, including forged attempts to return.
for(const [layoutVersion,tutorialVersion] of [[1,4],[2,4],[2,6]]){
const apprentice=await guest('Apprentice '+layoutVersion+' '+tutorialVersion);
let lesson=await (await handleSave(req('/api/character','GET',apprentice),env)).json();
lesson.state={...lesson.state,sceneId:'tutorial',x:42,y:51,tutorial:4,tutorialVersion,tutorialIslandVersion:layoutVersion};
let savedLesson=await handleSave(req('/api/character','PUT',apprentice,{state:lesson.state,revision:lesson.revision}),env);assert.equal(savedLesson.status,200);lesson.revision=(await savedLesson.json()).revision;
let island=await presence(apprentice,'tutorial',42);assert.equal(island.status,200);assert.deepEqual((await island.json()).players,[],'mainland players never appear in the tutorial');
assert.equal((await presence(apprentice,'overworld',42)).status,403);
assert.equal((await handlePlayers(req('/api/players','POST',apprentice,{scene:'tutorial',x:105,y:80}),env)).status,200,'expanded headland accepts presence');
for(const [x,y]of [[128,80],[105,136]])assert.equal((await handlePlayers(req('/api/players','POST',apprentice,{scene:'tutorial',x,y}),env)).status,400,'expanded island limits are enforced');
assert.equal((await handleSave(req('/api/character','PUT',apprentice,{state:{...lesson.state,sceneId:'overworld'},revision:lesson.revision}),env)).status,400);
const complete={...lesson.state,tutorial:tutorialVersion===6?39:36,tutorialReward:tutorialVersion!==6,sceneId:'overworld'};
savedLesson=await handleSave(req('/api/character','PUT',apprentice,{state:complete,revision:lesson.revision}),env);assert.equal(savedLesson.status,200);lesson.revision=(await savedLesson.json()).revision;
assert.equal((await presence(apprentice,'overworld',42)).status,200);
assert.equal((await presence(apprentice,'tutorial',42)).status,403,'completed players cannot publish tutorial presence');
assert.equal((await handleSave(req('/api/character','PUT',apprentice,{state:{...complete,sceneId:'tutorial'},revision:lesson.revision}),env)).status,400);
assert.equal((await handleSave(req('/api/character','PUT',apprentice,{state:lesson.state,revision:lesson.revision}),env)).status,400,'completion cannot be rolled back to reopen the island');
}
db.exec('UPDATE player_presence SET seen_at=0');assert.equal((await (await presence(b)).json()).players.length,0);
console.log('PASS: two separate username accounts, durable saves, real player discovery, movement/emote synchronization, session secrecy, stale-player expiry, tutorial/mainland separation, one-way completion and rejected invalid writes.');

assert.equal((await presence(a,'ork_warrens',19)).status,200,'released Ork dungeon accepts player presence');
assert.equal((await presence(a,'ork_warrens',38)).status,400,'dungeon presence remains inside its actual map');
assert.equal((await presence(a,'lair_colossus',19)).status,200,'released Colossus lair accepts player presence');
assert.equal((await presence(a,'lair_colossus',46)).status,400,'Colossus presence respects the actual map bounds');
for(const scene of ['quest_underiron','lair_veyr','lair_varkesh','lair_xalith']){
 const width=catalog.scenes[scene][0];
 assert.equal((await presence(a,scene,19)).status,200,'released lair accepts presence: '+scene);
 assert.equal((await presence(a,scene,width)).status,400,'lair bounds are enforced: '+scene);
 await presence(a,scene,19);const other=await presence(b,scene,20);const peers=(await other.json()).players;assert(peers.some(p=>p.name==='Player A'),'players can see one another in '+scene);
}
assert.equal((await presence(a,'lair_unreleased',19)).status,400,'unknown lairs remain unavailable');
const move={scene:'overworld',x:16.3,y:17,heading:Math.PI/2,running:true,moving:true,trailEpoch:123,trail:[[1,14,17,500],[2,15,17,250],[3,16,17,0]],route:[[17,17],[17,18]]};
assert.equal((await handlePlayers(req('/api/players','POST',a,move),env)).status,200);
let motionPeer=(await (await presence(b)).json()).players.find(p=>p.name==='Player A');
assert.deepEqual(motionPeer.trail,move.trail);assert.equal(motionPeer.trailEpoch,123);assert.deepEqual(motionPeer.route,move.route);
for(const trail of [[[1,14,17,0],[2,30,17,0]],[[1,14.2,17,0]],[[1,14,17,0],[3,15,17,0]],[[1,14,17,-1]],[[1,1,1,0]]]){
 await handlePlayers(req('/api/players','POST',a,{...move,trail}),env);
 motionPeer=(await (await presence(b)).json()).players.find(p=>p.name==='Player A');assert.deepEqual(motionPeer.trail,[],'invalid movement trails cannot become follow waypoints');
}
console.log('PASS: complete ordered movement trails survive the server; invalid, distant, fractional and discontinuous trails are excluded.');
