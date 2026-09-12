const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx,els}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
const getElement=ctx.document.getElementById;ctx.document.getElementById=id=>{const e=getElement(id);e.remove=()=>{};e.replaceChildren=()=>{};return e;};
for(const f of ['game-icons','trading','world-options','map-icons','item-use','tutorial-island','npc-dialogue','realm-story','encounters'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
s.character={name:'Combat test'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.sceneId='overworld';setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
assert.equal(Object.values(HUNT_ENCOUNTERS).filter(e=>e.mechanics).length,3,'only three encounters use phases');
assert.equal(worldScenes.overworld.objects.filter(o=>ENEMY_TIERS[o.kind]?.look).length,42,'fourteen ordinary monster types have three spawns each');
assert(!worldScenes.tutorial.objects.some(o=>o.encounter||ENEMY_TIERS[o.kind]?.look),'new fights stay off the tutorial island');
for(const [kind,e]of Object.entries(HUNT_ENCOUNTERS))assert(worldScenes[e.scene].objects.some(o=>o.kind===kind&&o.encounter===kind),'spawn exists: '+kind);
activateScene('overworld',42,51);
// A cardinal flood confirms mainland spawns are in the main walkable landmass.
const nav=realmNav(),seen=new Uint8Array(nav.cells.length),queue=new Int32Array(nav.cells.length);let head=0,tail=0;
const start=51*nav.w+42;queue[tail++]=start;seen[start]=1;
while(head<tail){const id=queue[head++],x=id%nav.w,y=Math.floor(id/nav.w);for(const [dx,dy]of [[0,-1],[0,1],[-1,0],[1,0]]){const nx=x+dx,ny=y+dy,next=ny*nav.w+nx;if(nx<1||ny<1||nx>=nav.w-1||ny>=nav.h-1||nav.cells[next]||seen[next])continue;seen[next]=1;queue[tail++]=next;}}
for(const o of objects.filter(o=>o.encounter||ENEMY_TIERS[o.kind]?.look)){
 assert(!blocked(o.x,o.y),'clear spawn: '+o.kind+' '+o.x+','+o.y);assert(seen[o.y*nav.w+o.x],'reachable mainland spawn: '+o.kind+' '+o.x+','+o.y);
 const a=creatureAsset(o);assert(a,'renderable creature '+o.kind);const variant=creatureTint(o,a.mesh);assert(variant.c.every(Number.isFinite));assert.equal(variant.p,a.mesh.p,'variants reuse geometry');
}
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
killTimes.sort((a,b)=>a-b);assert(killTimes[500]<=8,'median starter rat is quick');assert(killTimes[950]<20,'unlucky starter fights stay bounded statistically');assert.equal(deaths,0,'starter rats do not overwhelm fresh players in the seeded sample');
console.log('Starter rat / 1,000 real simulated fights: median '+killTimes[500].toFixed(2)+'s; p95 '+killTimes[950].toFixed(2)+'s; mean HP lost '+(totalDamage/1000).toFixed(2)+'; deaths '+deaths+'. Zero hits are preserved.');
for(const kind of ['slinger','brambleslime','warden','sentinel','nightbloom']){o=fresh(kind);target=o;beginEncounter(o);time=activeEncounter.nextAttack;updateEncounterAI(.05);assert(['strike','projectile'].includes(activeEncounter.hazards[0].shape),'ordinary fight has no ground pattern: '+kind);assert.equal(activeEncounter.phase,0);}
for(const kind of ['mossfang','king','colossus']){
 o=fresh(kind);target=o;beginEncounter(o);const e=HUNT_ENCOUNTERS[kind];
 for(let i=0;i<e.phases.length;i++){
  o.hp=Math.max(1,Math.floor(o.maxhp*e.phases[i].at));updateEncounterAI(.05);assert.equal(activeEncounter.phase,i);
  for(const key of e.phases[i].moves){const fight=activeEncounter;fight.hazards=[];scheduleEnemyMove(fight,key);const h=fight.hazards[0],hp=s.hp;assert(h.due>time,'attacks have advance warning');updateEncounterAI(.01);assert.equal(s.hp,hp,'warning cannot instantly damage');if(!['strike','projectile'].includes(h.shape)){assert(hazardContains(h,h.x,h.y)===(h.shape!=='ring'));px=s.x=61+8;py=s.y=90+7;time=h.due+.01;updateEncounterAI(.05);assert.equal(s.hp,hp,'moving clear avoids special attacks');px=s.x=60;py=s.y=90;}}
 }
 const low=o.hp;px=s.x=o.homeX+20;updateEncounterAI(.05);assert.equal(activeEncounter,null);assert.equal(o.hp,o.maxhp);assert(!o._inCombat);assert($('encounterHud').hidden);
}
o=fresh('king');target=o;beginEncounter(o);const gold=s.gold;resolveHit(o,o.hp,'melee');assert(s.boss);assert.equal(huntProgress().kills.king,1);assert.equal(s.gold-gold,HUNT_ENCOUNTERS.king.level*4);assert(s.groundLoot.some(p=>p.items.huntersMark===3));assert.equal(activeEncounter,null);assert.equal(o.dead,time+60);
const firstGold=s.gold;o.dead=0;o.hp=o.maxhp;resolveHit(o,o.hp,'melee');assert.equal(huntProgress().kills.king,2);assert.equal(s.gold,firstGold,'first-clear bonus is not repeated');
s=JSON.parse(JSON.stringify(s));normalizeJourney(s);assert.equal(huntProgress().kills.king,2,'progress survives a saved character');
o=fresh('colossus');beginEncounter(o);activateScene('mine',10,12);assert.equal(activeEncounter,null,'scene change clears fight');assert.equal(o.hp,o.maxhp);
lineOfSight=originalSight;console.log('PASS: fixed level tiers, 42 reachable new monsters, nine named encounters, exactly three phased fights, warning and dodge rules, simple ordinary attacks, retreat, scene cleanup, repeat kills and first-clear rewards.');
`,ctx);
