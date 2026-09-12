const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx,els}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
const getElement=ctx.document.getElementById;ctx.document.getElementById=id=>{const e=getElement(id);e.remove=()=>{};e.replaceChildren=()=>{};return e;};
for(const f of ['game-icons','trading','world-options','map-icons','item-use','tutorial-island','npc-dialogue','realm-story','lairs','encounters'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
s.character={name:'Combat test'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.sceneId='overworld';setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
assert.equal(Object.keys(HUNT_ENCOUNTERS).length,4,'only the four approved boss designs remain');
assert.equal(Object.keys(HUNT_ENCOUNTERS).filter(encounterReleased).length,0,'unverified boss assets stay out of this staged release');
assert.equal(Object.values(HUNT_ENCOUNTERS).filter(e=>e.mechanics).length,2,'only selected future bosses have phases');
assert.equal(worldScenes.overworld.objects.filter(o=>ENEMY_TIERS[o.kind]?.look).length,45,'42 ordinary monsters and three Forest Giants');
assert(!worldScenes.tutorial.objects.some(o=>o.encounter||ENEMY_TIERS[o.kind]?.look),'new fights stay off tutorial island');
assert(!Object.values(worldScenes).some(w=>w.objects.some(o=>o.encounter)),'no rejected or unverified boss encounters ship');
assert(!Object.keys(worldScenes).some(id=>id.startsWith('lair_')),'unreleased boss lairs stay closed');
assert.equal(worldScenes.ork_warrens.objects.filter(o=>o.kind==='ork').length,4,'four ordinary Orks populate their dungeon');
const sharedRatStats=o=>JSON.stringify([o.maxhp,o.maxHit,o.accuracy,o.interval,o.defenseLevel]);const tutorialRat=worldScenes.tutorial.objects.find(o=>o.kind==='rat');for(const world of Object.values(worldScenes))for(const o of world.objects.filter(o=>o.kind==='rat'))assert.equal(sharedRatStats(o),sharedRatStats(tutorialRat),'all rats share one baseline across scenes');
activateScene('overworld',42,51);
// A cardinal flood confirms mainland spawns are in the main walkable landmass.
const nav=realmNav(),seen=new Uint8Array(nav.cells.length),queue=new Int32Array(nav.cells.length);let head=0,tail=0;
const start=51*nav.w+42;queue[tail++]=start;seen[start]=1;
while(head<tail){const id=queue[head++],x=id%nav.w,y=Math.floor(id/nav.w);for(const [dx,dy]of [[0,-1],[0,1],[-1,0],[1,0]]){const nx=x+dx,ny=y+dy,next=ny*nav.w+nx;if(nx<1||ny<1||nx>=nav.w-1||ny>=nav.h-1||nav.cells[next]||seen[next])continue;seen[next]=1;queue[tail++]=next;}}
for(const o of objects.filter(o=>ENEMY_TIERS[o.kind]?.look)){
 assert(!blocked(o.x,o.y),'clear spawn: '+o.kind+' '+o.x+','+o.y);assert(seen[o.y*nav.w+o.x],'reachable mainland spawn: '+o.kind+' '+o.x+','+o.y);
 const a=creatureAsset(o);assert(a,'renderable creature '+o.kind);const variant=creatureTint(o,a.mesh);assert(variant.c.every(Number.isFinite));assert.equal(variant.p,a.mesh.p,'variants reuse geometry');
}
const warrens=CREATURE_LAIRS.ork_warrens,door=objects.find(o=>o.destination==='ork_warrens');
assert(door,'warrens entrance is visible on the mainland');
assert(seen[warrens.returnPoint[1]*nav.w+warrens.returnPoint[0]],'warrens return point connects to the mainland');
assert(route(door.x,door.y,true,1.45,...warrens.returnPoint),'entrance is accessible from its return point');
activateScene('ork_warrens',...warrens.entry);
assert(!blocked(px,py),'dungeon entry is clear');
assert(route(worldScenes.ork_warrens.exit.x,worldScenes.ork_warrens.exit.y,true),'exit is reachable');
for(const ork of objects.filter(o=>o.kind==='ork')){
 assert(!blocked(ork.x,ork.y),'Ork is clear of scenery');
 assert(route(ork.x,ork.y,true,attackRange(ork)),'each Ork is reachable from the entry');
 assert(!ork.encounter&&ork.type==='enemy','Ork is an ordinary monster');
}
assert(blocked(6,9),'weapon stand footprint is solid');
assert(!blocked(19,22),'central fighting corridor stays open');
s.sceneId='ork_warrens';s.x=12;s.y=13;setupExpandedWorld();setupTutorialVillage();
assert.equal(currentScene,'ork_warrens','saved characters restore to the dungeon');
leaveInterior();assert.equal(currentScene,'overworld');assert(!blocked(px,py),'leaving the dungeon lands on a clear tile');
activateScene('overworld',42,51);
const rat=objects.find(o=>o.kind==='rat'),ratStats=JSON.stringify([rat.maxhp,rat.maxHit,rat.level]);for(const skill of COMBAT_SKILLS)s.xp[skill]=skillThreshold(skill,70);setupEncounters();assert.equal(JSON.stringify([rat.maxhp,rat.maxHit,rat.level]),ratStats,'enemies never grow to match the player');
const originalSight=lineOfSight;lineOfSight=()=>true;
function fresh(kind='rat'){
 resetEncounter(false);s=defaults();s.character={name:'Combat test'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.equipment.weapon='bronze_dagger';s.gear.bronze_dagger=1;s.x=px=60;s.y=py=90;currentScene='overworld';target=null;path=[];meleeImpacts=[];projectiles=[];playerAttackReadyAt=0;time+=100;
 const row=HUNT_ENCOUNTERS[kind]||ENEMY_TIERS[kind],o={id:9000,type:'enemy',kind,name:row.name||kind,x:61,y:90,drawX:61,drawY:90,homeX:61,homeY:90,hp:row.hp,maxhp:row.hp,dead:0,attackAt:-100,hitAt:-100};applyEnemyTier(o,row);if(row.rank)o.encounter=kind;return o;
}
// Exercise the real zero-inclusive damage roll, both an accurate zero and a miss.
let o=fresh();Math.random=()=>0;assert(performAttack(o));assert.equal(meleeImpacts[0].damage,0);const beforeXP=JSON.stringify(s.xp);time+=.31;updateCombat(.31);assert.equal(o.hp,o.maxhp);assert.equal(JSON.stringify(s.xp),beforeXP);
o=fresh();Math.random=()=>.999;assert(performAttack(o));assert.equal(meleeImpacts[0].damage,0);time+=.31;updateCombat(.31);assert.equal(o.hp,o.maxhp);
let seed=20260912;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const killTimes=[];let deaths=0,totalDamage=0;
for(let run=0;run<1000;run++){
 const r=fresh(),started=time;target=r;let loss=0;
 for(let frame=0;frame<2400&&r.hp>0;frame++){if(time>=playerAttackReadyAt)performAttack(r);const hp=s.hp;time+=.05;updateCombat(.05);loss+=Math.max(0,hp-s.hp);if($('modal').open){deaths++;$('modal').close();break;}}
 assert(r.hp<=0||deaths,'starter rat resolves');killTimes.push(time-started);totalDamage+=loss;
}
killTimes.sort((a,b)=>a-b);assert(killTimes[500]>=12&&killTimes[500]<=18,'median starter rat stays near the requested 15 seconds');assert(killTimes[950]<36,'unlucky starter fights stay reasonable while preserving misses');assert.equal(deaths,0,'starter rats do not overwhelm fresh players in the seeded sample');
console.log('Starter rat / 1,000 real simulated fights: median '+killTimes[500].toFixed(2)+'s; p95 '+killTimes[950].toFixed(2)+'s; mean HP lost '+(totalDamage/1000).toFixed(2)+'; deaths '+deaths+'. Zero hits are preserved.');
for(const kind of ['slinger','brambleslime','warden','sentinel','king','forestgiant','ork']){o=fresh(kind);target=o;beginEncounter(o);time=activeEncounter.nextAttack;updateEncounterAI(.05);assert(['strike','projectile'].includes(activeEncounter.hazards[0].shape),'ordinary fight has no ground pattern: '+kind);assert.equal(activeEncounter.phase,0);}
// Ordinary Forest Giants cycle native melee motions without phase mechanics.
o=fresh('forestgiant');target=o;beginEncounter(o);for(let i=0;i<3;i++){activeEncounter.move=i;scheduleEnemyMove(activeEncounter,'bite');assert.equal(o.attackClip,['attack','attack2','attack3'][i]);assert.equal(creatureAttackAnimation(o,creatureAssets.forestgiant,.3).clip,o.attackClip);}
// Large imported bodies can be hit at the visible edge with the same damage rules.
o=fresh('forestgiant');px=s.x=o.x-2;let edgeRoll=0;Math.random=()=>edgeRoll++?.5:0;assert(inAttackRange(o));assert(performAttack(o));time+=.31;updateCombat(.31);assert(o.hp<o.maxhp,'melee impact reaches the same expanded body as targeting');
const giantGold=s.gold;resolveHit(o,o.hp,'melee');assert.equal(huntProgress().kills.forestgiant,1);assert(!huntProgress().firstClears.forestgiant);assert.equal(s.gold,giantGold,'ordinary giant has no first-clear boss bonus');assert(s.groundLoot.some(p=>p.items.logs===3&&p.items.bones===2));assert(!s.groundLoot.some(p=>p.items.huntersMark),'ordinary giants have no boss marks');assert.equal(activeEncounter,null);assert.equal(o.dead,time+25);const savedGiantProgress=JSON.parse(JSON.stringify(s));normalizeJourney(savedGiantProgress);assert.equal(savedGiantProgress.combatProgress.kills.forestgiant,1,'giant kill progress survives save normalization');
o=fresh('king');target=o;beginEncounter(o);resolveHit(o,o.hp,'melee');assert(s.boss,'existing ruins quest flag still advances');
o=fresh('warden');resolveHit(o,o.hp,'melee');assert(s.wardenClear,'crypt cache flag still advances');
o=fresh('forestgiant');beginEncounter(o);o.hp=5;px=s.x=o.homeX+20;updateEncounterAI(.05);assert.equal(activeEncounter,null);assert.equal(o.hp,o.maxhp);assert(!o._inCombat);
o=fresh('forestgiant');beginEncounter(o);activateScene('mine',10,12);assert.equal(activeEncounter,null,'scene change clears fight');assert.equal(o.hp,o.maxhp);

lineOfSight=originalSight;console.log('PASS: 45 reachable ordinary monsters, native giant attacks, melee body reach, ordinary rewards, legacy quest flags, retreat, and zero-inclusive combat. Unverified bosses and empty lairs are not released.');
`,ctx);
