const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx,els}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
const getElement=ctx.document.getElementById;ctx.document.getElementById=id=>{const e=getElement(id);e.remove=()=>{};e.replaceChildren=()=>{};return e;};
for(const f of ['trading','world-options','item-use','tutorial-island','npc-dialogue','realm-story','lairs','encounters'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
let testWallTime=Date.now();Date.now=()=>testWallTime;
s.character={name:'Combat test'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.sceneId='overworld';setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
assert.equal(Object.keys(HUNT_ENCOUNTERS).length,4,'only the four approved boss designs remain');
assert.equal(Object.keys(HUNT_ENCOUNTERS).filter(encounterReleased).join(','),'veyr,varkesh,colossus,xalith','all four integrated bosses are released');
assert.equal(Object.values(HUNT_ENCOUNTERS).filter(e=>e.mechanics).length,2,'only selected future bosses have phases');
assert.equal(worldScenes.overworld.objects.filter(o=>ENEMY_TIERS[o.kind]?.look).length,45,'42 ordinary monsters and three Forest Giants');
assert(!worldScenes.tutorial.objects.some(o=>o.encounter||ENEMY_TIERS[o.kind]?.look),'new fights stay off tutorial island');
assert(Object.values(worldScenes).every(w=>w.objects.every(o=>!o.encounter||encounterReleased(o.encounter))),'no rejected or unfinished bosses ship');
assert.equal(Object.keys(worldScenes).filter(id=>id.startsWith('lair_')).join(','),'lair_colossus,lair_veyr,lair_varkesh,lair_xalith','all four reviewed lairs are open');
assert.equal(worldScenes.ork_warrens.objects.filter(o=>o.kind==='ork').length,4,'four ordinary Orks populate their dungeon');
const sharedRatStats=o=>JSON.stringify([o.maxhp,o.maxHit,o.accuracy,o.interval,o.defenseLevel]);const tutorialRat=worldScenes.tutorial.objects.find(o=>o.kind==='rat');for(const world of Object.values(worldScenes))for(const o of world.objects.filter(o=>o.kind==='rat'))assert.equal(sharedRatStats(o),sharedRatStats(tutorialRat),'all rats share one baseline across scenes');
activateScene('overworld',42,51);
// A cardinal flood confirms mainland spawns are in the main walkable landmass.
const nav=realmNav(),seen=new Uint8Array(nav.cells.length),queue=new Int32Array(nav.cells.length);let head=0,tail=0;
const start=51*nav.w+42;queue[tail++]=start;seen[start]=1;
while(head<tail){const id=queue[head++],x=id%nav.w,y=Math.floor(id/nav.w);for(const [dx,dy]of [[0,-1],[0,1],[-1,0],[1,0]]){const nx=x+dx,ny=y+dy,next=ny*nav.w+nx;if(nx<1||ny<1||nx>=nav.w-1||ny>=nav.h-1||realmCellBlocked(nav,next)||seen[next])continue;seen[next]=1;queue[tail++]=next;}}
const dragonDoor=objects.find(o=>o.destination==='lair_varkesh');assert(dragonDoor&&seen[CREATURE_LAIRS.lair_varkesh.returnPoint[1]*nav.w+CREATURE_LAIRS.lair_varkesh.returnPoint[0]],'dragon entrance joins the mainland landmass');
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
const crucible=CREATURE_LAIRS.lair_colossus,crucibleDoor=objects.find(o=>o.destination==='lair_colossus');
assert(crucibleDoor);assert(seen[crucible.returnPoint[1]*nav.w+crucible.returnPoint[0]],'crucible return point connects to the mainland');
assert(route(crucibleDoor.x,crucibleDoor.y,true,1.45,...crucible.returnPoint),'crucible entrance is reachable');
activateScene('lair_colossus',...crucible.entry);const colossus=objects.find(o=>o.encounter==='colossus');
assert.equal(JSON.stringify([colossus.x,colossus.y]),JSON.stringify(crucible.spawn),'anchored Colossus stands on its original pedestal');
assert(blocked(colossus.x,colossus.y),'players cannot walk through the pedestal or boss');
assert(!blocked(px,py));assert(route(worldScenes.lair_colossus.exit.x,worldScenes.lair_colossus.exit.y,true),'crucible exit is reachable');
for(const [x,y]of [[23,23],[18,18],[28,18],[23,13]])assert(route(x,y),'arena permits dodging around each side');
s.equipment.weapon='bronze_dagger';const meleeApproach=route(colossus.x,colossus.y,true,attackRange(colossus));assert(meleeApproach?.length,'melee can reach the boss edge');[s.x,s.y]=meleeApproach.at(-1);px=s.x;py=s.y;assert(inAttackRange(colossus));assert(!blocked(s.x,s.y));
beginEncounter(colossus);const home=[colossus.x,colossus.y];
for(const phase of [0,1]){
 colossus.hp=phase?Math.floor(colossus.maxhp*.49):colossus.maxhp;updateEncounterAI(0);assert.equal(activeEncounter.phase,phase);assert.equal(!!colossus.enraged,phase===1);
 const f=activeEncounter;f.hazards=[];f.move=0;
 for(const [i,key]of ['sweep','shot','hex'].entries()){
  px=s.x=home[0]+(i===1?5:-5);py=s.y=home[1]+i;time=f.nextAttack;updateEncounterAI(.05);
  const h=f.hazards[0];assert.equal(h.key,key);assert.equal(h.style,['melee','ranged','magic'][i]);
  const speed=phase?.75:1;assert(Math.abs(h.windup-ENCOUNTER_MOVES[key].windup*speed)<.00001,'phase two shortens the warning by 25 percent');
  assert(Math.abs(f.nextAttack-time-(ENCOUNTER_MOVES[key].windup+2.3)*speed)<.00001,'complete attack cycle is 25 percent shorter');
  if(key==='sweep')assert(h.radius>colossus.combatRadius+1.5,'melee ground attack covers the weapon engagement distance');
  if(key!=='sweep'){px=s.x=h.x+3;py=s.y=h.y;}
  assert(!hazardContains(h,px,py),'each Colossus style can be dodged');
  time=h.due+.01;updateEncounterAI(.01);assert.equal(JSON.stringify([colossus.x,colossus.y,colossus.drawX,colossus.drawY]),JSON.stringify([...home,...home]),'Colossus never chases in either phase');
 }
}
resetEncounter();assert(colossus._recovering);assert(!colossus.enraged);assert(!colossus.attackRecovery);
beginEncounter(colossus);colossus.hp=Math.floor(colossus.maxhp*.45);updateEncounterAI(0);const firstGold=carriedCoins();resolveHit(colossus,colossus.hp,'melee');assert.equal(activeEncounter,null);assert.equal(colossus.dead,time+60);assert.equal(carriedCoins()-firstGold,235);
const bossLoot=s.groundLoot.find(p=>p.scene==='lair_colossus'&&p.items.huntersMark);assert(bossLoot);assert.equal(bossLoot.items.huntersMark,4);assert(!blocked(bossLoot.x,bossLoot.y));assert(route(bossLoot.x,bossLoot.y),'boss loot is on an accessible tile outside the solid pedestal');
time+=60;testWallTime=colossus.respawnAt+1;updateWorldTimers();assert.equal(colossus.hp,colossus.maxhp);assert.equal(colossus.dead,0);assert(!colossus.enraged,'respawn is blue again');assert.equal(JSON.stringify([colossus.x,colossus.y]),JSON.stringify(home));
beginEncounter(colossus);colossus.hp=40;updateEncounterAI(0);leaveInterior();assert.equal(currentScene,'overworld');assert(!blocked(px,py));assert.equal(activeEncounter,null);assert.equal(colossus.hp,40);assert(colossus._recovering);assert(!colossus.enraged);
activateScene('overworld',42,51);
const sanctum=CREATURE_LAIRS.lair_veyr,sanctumDoor=objects.find(o=>o.destination==='lair_veyr');
assert(sanctumDoor);assert(seen[sanctum.returnPoint[1]*nav.w+sanctum.returnPoint[0]],'sanctum connects to the mainland');
assert(route(sanctumDoor.x,sanctumDoor.y,true,1.45,...sanctum.returnPoint),'sanctum entrance is reachable');
activateScene('lair_veyr',...sanctum.entry);const veyr=objects.find(o=>o.encounter==='veyr');
assert(veyr);assert(!blocked(veyr.x,veyr.y),'Veyr spawns clear of scenery');
assert(route(veyr.x,veyr.y,true,attackRange(veyr)),'Veyr is reachable from the entrance');
assert(route(worldScenes.lair_veyr.exit.x,worldScenes.lair_veyr.exit.y,true),'sanctum exit is reachable');
for(const [x,y]of [[22,24],[16,18],[28,18],[22,13]])assert(route(x,y),'sanctum leaves room to dodge');
assert(blocked(22,9),'orrery has a solid base');
px=s.x=veyr.x+4;py=s.y=veyr.y;beginEncounter(veyr);
for(const phase of [0,1]){
 veyr.hp=phase?Math.floor(veyr.maxhp*.49):veyr.maxhp;updateEncounterAI(0);assert.equal(activeEncounter.phase,phase);
 const f=activeEncounter;f.hazards=[];f.move=0;
 for(const key of HUNT_ENCOUNTERS.veyr.phases[phase].moves){
  scheduleEnemyMove(f,key);const h=f.hazards.at(-1),a=creatureAssets.boss_veyr;
  assert.equal(creatureAttackAnimation(veyr,a,veyr.attackWindup).phase,a.clips[veyr.attackClip].release,'native impact matches the end of its warning');
  if(key==='ring'||key==='falseRefuge'){
   assert.equal(veyr.attackClip,key==='falseRefuge'?'cast':'cast2');assert(!hazardContains(h,h.x,h.y),'ring has a safe center');
   assert(hazardContains(h,h.x+3,h.y),'ring threatens its marked band');assert(!hazardContains(h,h.x+5,h.y),'outside the ring is safe');
  }else if(['hex','memoryCall','stolenSelf'].includes(key)){assert.equal(veyr.attackClip,'cast');assert.equal(h.style,'magic');}
  else {assert.equal(h.style,'melee');assert.equal(veyr.attackClip,phase?'attack3':'attack');}
  f.hazards=[];
 }
}
const veyrHome=[veyr.homeX,veyr.homeY];resetEncounter();assert(veyr._recovering);assert(!veyr.attackMove);
beginEncounter(veyr);veyr.hp=35;updateEncounterAI(0);leaveInterior();assert.equal(activeEncounter,null);assert.equal(veyr.hp,35);assert(veyr._recovering);
activateScene('lair_veyr',veyr.homeX+3,veyr.homeY);beginEncounter(veyr);const beforeVeyrGold=carriedCoins();resolveHit(veyr,veyr.hp,'melee');
assert.equal(carriedCoins()-beforeVeyrGold,0);assert.equal(veyr.dead,time+60);assert(creatureDying(veyr),'Veyr uses its native death action');
const veyrLoot=s.groundLoot.find(p=>p.scene==='lair_veyr'&&p.items.huntersMark);assert.equal(veyrLoot.items.huntersMark,3);assert(!blocked(veyrLoot.x,veyrLoot.y));assert(route(veyrLoot.x,veyrLoot.y),'Veyr loot is reachable');
time+=60;testWallTime=veyr.respawnAt+1;updateWorldTimers();assert.equal(veyr.hp,veyr.maxhp);assert.equal(veyr.dead,0);assert.equal(JSON.stringify([veyr.x,veyr.y]),JSON.stringify(veyrHome));
leaveInterior();assert(!blocked(px,py));activateScene('overworld',42,51);
const hollow=CREATURE_LAIRS.lair_xalith,hiveDoor=objects.find(o=>o.destination==='lair_xalith');
assert(hiveDoor,'the hive entrance is visible');
assert(seen[hollow.returnPoint[1]*nav.w+hollow.returnPoint[0]],'the hive return point connects to the mainland');
assert(route(hiveDoor.x,hiveDoor.y,true,1.45,...hollow.returnPoint),'the hive entrance is reachable');
activateScene('lair_xalith',...hollow.entry);const xalith=objects.find(o=>o.encounter==='xalith');
assert(xalith);assert(!blocked(px,py));assert(!blocked(xalith.x,xalith.y),'Xalith spawns clear of the nest scenery');
assert(route(xalith.x,xalith.y,true,attackRange(xalith)),'melee can approach Xalith');
assert(route(worldScenes.lair_xalith.exit.x,worldScenes.lair_xalith.exit.y,true),'the visible hive exit is reachable');
for(const point of [[27,25],[22,20],[32,20],[27,15]])assert(route(...point),'the arena has space around the boss');
const approach=route(xalith.x,xalith.y,true,attackRange(xalith));[s.x,s.y]=approach.at(-1);px=s.x;py=s.y;assert(inAttackRange(xalith));
s.hp=maxhp();beginEncounter(xalith);
for(const health of [1,.4]){
 xalith.hp=Math.max(1,Math.floor(xalith.maxhp*health));updateEncounterAI(0);assert.equal(activeEncounter.phase,0,'Xalith stays a single-phase boss');
 for(let i=0;i<2;i++){
  activeEncounter.move=i;scheduleEnemyMove(activeEncounter,'bite');const h=activeEncounter.hazards.at(-1);
  assert.equal(xalith.attackClip,i?'attack2':'attack');assert.equal(h.style,'melee');assert.equal(h.shape,'circle');
  assert.equal(creatureAttackAnimation(xalith,creatureAssets.boss_xalith,h.windup).phase,.53,'the blade impact matches the warning end');
  assert(hazardContains(h,xalith.x+2,xalith.y));assert(!hazardContains(h,xalith.x+4,xalith.y),'the cleave has a clear safe area');
  activeEncounter.hazards=[];
 }
}
resetEncounter();assert(xalith._recovering);assert(!xalith.attackMove);
beginEncounter(xalith);xalith.hp=35;leaveInterior();assert.equal(activeEncounter,null);assert.equal(xalith.hp,35);assert(xalith._recovering);
activateScene('lair_xalith',xalith.homeX+2,xalith.homeY);beginEncounter(xalith);const beforeXalithGold=carriedCoins();resolveHit(xalith,xalith.hp,'melee');
assert.equal(carriedCoins()-beforeXalithGold,347);assert(creatureDying(xalith));assert.equal(xalith.dead,time+60);
const hiveLoot=s.groundLoot.find(p=>p.scene==='lair_xalith'&&p.items.huntersMark);assert(hiveLoot);assert.equal(hiveLoot.items.huntersMark,5);assert.equal(hiveLoot.items.coins,240);assert(!blocked(hiveLoot.x,hiveLoot.y));assert(route(hiveLoot.x,hiveLoot.y),'hive loot remains reachable');
time+=60;testWallTime=xalith.respawnAt+1;updateWorldTimers();assert.equal(xalith.hp,xalith.maxhp);assert.equal(xalith.dead,0);assert.equal(xalith.x,xalith.homeX);assert.equal(xalith.y,xalith.homeY);
leaveInterior();assert(!blocked(px,py));activateScene('overworld',42,51);
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
 for(let frame=0;frame<24000&&r.hp>0;frame++){if(time+.0001>=playerAttackReadyAt)performAttack(r);const hp=s.hp;time+=.05;updateCombat(.05);loss+=Math.max(0,hp-s.hp);if($('modal').open){deaths++;$('modal').close();break;}}
 assert(r.hp<=0||deaths,'starter rat resolves '+JSON.stringify({hp:r.hp,maxhp:r.maxhp,x:r.x,y:r.y,drawX:r.drawX,px,py,time,playerAttackReadyAt,damage:playerMaxHit('melee'),range:inAttackRange(r)}));killTimes.push(time-started);totalDamage+=loss;
}
killTimes.sort((a,b)=>a-b);
console.log('Starter rat / 1,000 real simulated fights: median '+killTimes[500].toFixed(2)+'s; p95 '+killTimes[950].toFixed(2)+'s; mean HP lost '+(totalDamage/1000).toFixed(2)+'; deaths '+deaths+'. Zero hits are preserved.');
for(const kind of ['slinger','brambleslime','warden','sentinel','king','forestgiant','ork']){o=fresh(kind);target=o;beginEncounter(o);time=activeEncounter.nextAttack;updateEncounterAI(.05);assert(['strike','projectile'].includes(activeEncounter.hazards[0].shape),'ordinary fight has no ground pattern: '+kind);assert.equal(activeEncounter.phase,0);}
// Ordinary Forest Giants cycle native melee motions without phase mechanics.
o=fresh('forestgiant');target=o;beginEncounter(o);for(let i=0;i<3;i++){activeEncounter.move=i;scheduleEnemyMove(activeEncounter,'bite');assert.equal(o.attackClip,['attack','attack2','attack3'][i]);assert.equal(creatureAttackAnimation(o,creatureAssets.forestgiant,.3).clip,o.attackClip);}
// Large imported bodies can be hit at the visible edge with the same damage rules.
o=fresh('forestgiant');px=s.x=o.x-2;let edgeRoll=0;Math.random=()=>edgeRoll++?.5:0;assert(inAttackRange(o));assert(performAttack(o));time+=.31;updateCombat(.31);assert(o.hp<o.maxhp,'melee impact reaches the same expanded body as targeting');
const giantGold=s.gold;resolveHit(o,o.hp,'melee');assert.equal(huntProgress().kills.forestgiant,1);assert(!huntProgress().firstClears.forestgiant);assert.equal(s.gold,giantGold,'ordinary giant has no first-clear boss bonus');assert(s.groundLoot.some(p=>p.items.logs===3&&p.items.bones===2));assert(!s.groundLoot.some(p=>p.items.huntersMark),'ordinary giants have no boss marks');assert.equal(activeEncounter,null);assert.equal(o.dead,time+25);const savedGiantProgress=JSON.parse(JSON.stringify(s));normalizeJourney(savedGiantProgress);assert.equal(savedGiantProgress.combatProgress.kills.forestgiant,1,'giant kill progress survives save normalization');
o=fresh('king');target=o;beginEncounter(o);resolveHit(o,o.hp,'melee');assert(s.boss,'existing ruins quest flag still advances');
o=fresh('warden');resolveHit(o,o.hp,'melee');assert(s.wardenClear,'crypt cache flag still advances');
o=fresh('forestgiant');beginEncounter(o);o.hp=5;px=s.x=o.homeX+20;updateEncounterAI(.05);assert.equal(activeEncounter,null);assert.equal(o.hp,5);assert(o._recovering,'retreated enemies recover gradually');assert(!o._inCombat);
o=fresh('forestgiant');beginEncounter(o);activateScene('mine',10,12);assert.equal(activeEncounter,null,'scene change clears fight');assert.equal(o.hp,o.maxhp);

lineOfSight=originalSight;
assert(killTimes[500]>=12&&killTimes[500]<=18,'median starter rat stays near the requested 15 seconds; measured '+killTimes[500].toFixed(2)+'s');assert(killTimes[950]<36.5,'unlucky starter fights stay within 36 seconds plus the melee impact delay, preserving misses');assert.equal(deaths,0,'starter rats do not overwhelm fresh players in the seeded sample');
console.log('PASS: reachable ordinary monsters and Ork Warrens; stationary Colossus with exactly two phases, three styles, faster red phase, accessible loot, reset and respawn; original quest flags and zero-inclusive combat preserved.');
`,ctx);
