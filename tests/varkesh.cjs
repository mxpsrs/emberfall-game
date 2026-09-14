const {ctx}=require('../scripts/benchmark-desktop.cjs');
const vm=require('node:vm'),fs=require('node:fs');
for(const name of ['lairs','encounters'])vm.runInContext(fs.readFileSync('dist/'+name+'.js','utf8'),ctx,{filename:name});
vm.runInContext(`
let wallTime=Date.now();Date.now=()=>wallTime;
const a=creatureAssets.boss_varkesh;
assert(a,'the uploaded original dragon is imported');
assert.equal(a.mesh.i.length/3,19436,'the complete source dragon topology survives');
assert.equal(a.rig.deforms.length,234,'curved wing, neck and tail segments are retained');
assert.equal(a.source.nativeActions.join(','),'Action.001,Action.002,PoseLib,Walk Loop,Walk Loop.001');
assert.equal(a.source.authoredActions.length,5,'new combat motions are identified separately');
assert.equal(a.clips.walk.source,'Native/Walk Loop');
assert.equal(a.clips.walk.duration,117/24,'the complete native three-step loop is retained');
assert.equal(a.gaitDistance,6.3,'three native steps are paced by distance travelled');
const batches=creatureSkinBatches(a);assert(batches.length>1);
assert.equal(batches.reduce((n,b)=>n+b.mesh.i.length,0),a.mesh.i.length,'palette partitions retain all triangles');
for(const b of batches)assert(b.joints.length<=80,'every draw fits the WebGL 1 bone limit');
for(const [name,c]of Object.entries(a.clips)){
 let moved=false,first=null;
 for(const phase of [0,.15,.28,.53,.75,1]){
  const p=creaturePose('boss_varkesh',name,phase);
  assert(p.p.every(Number.isFinite)&&p.n.every(Number.isFinite),'finite geometry in '+name);
  assert(Number.isFinite(p.floorY));
  assert(p.p.every(v=>Math.abs(v*a.scale)<15),'no exploding geometry in '+name);
  if(first&&p.p.some((v,i)=>Math.abs(v-first[i])*a.scale>.005))moved=true;
  first??=p.p;
 }
 assert(moved,'real rig movement in '+name);
 if(['idle','walk','run'].includes(name)){
  const last=creaturePose('boss_varkesh',name,1).p;
  assert(last.every((v,i)=>Math.abs(v-first[i])*a.scale<.003),'smooth loop boundary: '+name);
 }
}
const pelvis=a.rig.names.indexOf('Pelvis'),joint=a.rig.deforms.indexOf(pelvis),bodyVertices=[];
for(let i=0;i<a.mesh.p.length/3;i++)for(let k=0;k<4;k++)if(a.mesh.j[i*4+k]===joint&&a.mesh.w[i*4+k]>.8){bodyVertices.push(i);break;}
assert(bodyVertices.length>20,'body-collapse check uses the actual pelvis-weighted torso');
const bodyHeight=clip=>{const p=creaturePose('boss_varkesh',clip,1);return bodyVertices.reduce((n,i)=>n+(p.p[i*3+1]-p.floorY)*a.scale,0)/bodyVertices.length;};
assert(bodyHeight('death')<bodyHeight('idle')-.45,'death lowers the torso against the ground');
const mouth=a.sockets.mouth;assert.equal(a.rig.names[a.rig.deforms[mouth.joint]],'Head','breath is attached to the original head bone');
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
s.character={name:'Dragon check'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
const lair=CREATURE_LAIRS.lair_varkesh;activateScene('overworld',42,51);
const door=objects.find(o=>o.destination==='lair_varkesh');assert(door,'the roost has a mainland entrance');
assert(!blocked(...lair.returnPoint),'return point is on walkable ground');
assert(route(door.x,door.y,true,1.45,...lair.returnPoint),'entrance is reachable from its return point');
activateScene('lair_varkesh',...lair.entry);const dragon=objects.find(o=>o.encounter==='varkesh');assert(dragon);
assert.equal(dragon.level,30);assert.equal(dragon.maxhp,108);assert.equal(dragon.maxHit,6);
assert(!dragon.mechanics,'the dragon does not add another phase system');
assert(route(dragon.x,dragon.y,true,4),'dragon is reachable from the entrance');
assert(route(worldScenes.lair_varkesh.exit.x,worldScenes.lair_varkesh.exit.y,true),'exit is reachable');
activateScene('lair_varkesh',dragon.homeX,dragon.homeY+6);beginEncounter(dragon);scheduleEnemyMove(activeEncounter,'blight');
let h=activeEncounter.hazards[0],heading=h.heading;
assert(hazardContains(h,h.fromX,h.fromY+5),'breath covers its aimed ground sector');
assert(!hazardContains(h,h.fromX+5,h.fromY),'sidestepping clears the breath');
assert(!hazardContains(h,h.fromX,h.fromY-1),'behind the dragon is safe from its breath');
assert(!hazardContains(h,h.fromX,h.fromY+10),'breath has a bounded reach');
const attack=creatureAttackAnimation(dragon,a,h.due-dragon.attackAt);
assert.equal(attack.clip,'cast');assert(Math.abs(attack.phase-a.clips.cast.release)<.0001,'breath impact matches the jaw action');
px=dragon.homeX+5;py=dragon.homeY;time+=.1;creatureMotion(dragon,dragon.x+.5,dragon.y+.5);time+=.1;const state=creatureMotion(dragon,dragon.x+.5,dragon.y+.5);
assert.equal(dragon.attackHeading,heading,'aim stays locked after a sidestep');
assert(Math.abs(Math.atan2(Math.sin(state.heading-heading),Math.cos(state.heading-heading)))<.001,'the model faces the warned direction');
resetEncounter();assert(!activeEncounter);assert.equal(dragon.hp,dragon.maxhp);assert.equal(dragon.attackHeading,undefined);
activateScene('lair_varkesh',dragon.homeX,dragon.homeY+3);beginEncounter(dragon);scheduleEnemyMove(activeEncounter,'bite');h=activeEncounter.hazards[0];
assert.equal(h.style,'melee');assert.equal(dragon.attackClip,'attack');assert(hazardContains(h,dragon.x,dragon.y+3));assert(!hazardContains(h,dragon.x,dragon.y-2));
const bite=creatureAttackAnimation(dragon,a,h.due-dragon.attackAt);assert(Math.abs(bite.phase-a.clips.attack.release)<.0001);
const gold=carriedCoins();resolveHit(dragon,dragon.hp,'melee');assert.equal(carriedCoins(),gold+120,'first-clear reward is preserved');
const loot=s.groundLoot.find(p=>p.scene==='lair_varkesh'&&p.items.huntersMark);assert(loot);assert.equal(loot.items.huntersMark,3);assert.equal(loot.items.coins,105);assert(!blocked(loot.x,loot.y));
assert(route(loot.x,loot.y),'loot is reachable');assert.equal(dragon.dead,time+60);assert(creatureDying(dragon));
time+=60;wallTime=dragon.respawnAt+1;updateWorldTimers();assert.equal(dragon.dead,0);assert.equal(dragon.hp,dragon.maxhp);assert.equal(dragon.x,dragon.homeX);assert.equal(dragon.y,dragon.homeY);
beginEncounter(dragon);dragon.hp=15;leaveInterior();assert.equal(activeEncounter,null);assert.equal(dragon.hp,15);assert(dragon._recovering,'retreat starts gradual recovery');assert(!blocked(px,py),'retreat returns to clear mainland ground');
console.log('PASS: original dragon, native loop, authored combat, curved skin batches, corpse, locked breath aim, safe dodges, bite, connected roost, ground loot and respawn timer.');
`,ctx);
