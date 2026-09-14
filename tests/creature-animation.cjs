const {ctx}=require('../scripts/benchmark-desktop.cjs');
const vm=require('vm');
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
const bounds=mesh=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<mesh.p.length;i++){const a=i%3;lo[a]=Math.min(lo[a],mesh.p[i]);hi[a]=Math.max(hi[a],mesh.p[i]);}return [lo,hi];};
for(const [kind,a]of Object.entries(creatureAssets)){
 assert(a.mesh.p.length>6000,kind+' is an imported replacement mesh');
 assert(a.mesh.i.every(i=>i<a.mesh.p.length/3));
 assert(a.mesh.j.every(i=>i<a.rig.deforms.length));
 assert(a.rig.parents.every((p,i)=>p<i));
 for(const [clip,motion]of Object.entries(a.clips)){
  assert.equal(motion.trs.length,motion.frames*a.joints*10);
  assert(motion.trs.every(Number.isFinite));
  const start=creaturePose(kind,clip,0),middle=creaturePose(kind,clip,.5),end=creaturePose(kind,clip,1);
  assert(middle.p.every(Number.isFinite)&&middle.n.every(Number.isFinite));
  assert(kind==='boss_colossus'&&clip==='death'||start.p.some((p,i)=>Math.abs(p-middle.p[i])*a.scale>(clip==='idle'?.00001:.015)),kind+' '+clip+' moves the actual mesh');
  for(const mesh of [start,middle,end]){const [lo,hi]=bounds(mesh);assert(Math.max(...hi.map((v,i)=>(v-lo[i])*a.scale))<Math.max(9,Math.max(...a.mesh.bounds[1].map((v,i)=>(v-a.mesh.bounds[0][i])*a.scale))*1.8),kind+' '+clip+' has no exploded joints');}
 }
 const [idleLo,idleHi]=bounds(creaturePose(kind,'idle',0)),[deathLo,deathHi]=bounds(creaturePose(kind,'death',1));
 assert(kind==='boss_colossus'||deathHi[1]-deathLo[1]<(idleHi[1]-idleLo[1])*.8,kind+' falls/collapses when defeated');
}
assert(creatureAssets.goblin.clips.attack.source.includes('Sword_Regular_A_Rec'),'full swing includes its recovery');
assert.notEqual(creatureAssets.goblin.source.sha256,creatureAssets.king.source.sha256,'Bestiary enemies have distinct source meshes');
activateScene('overworld',90,66);time=10;
const o={type:'enemy',kind:'goblin',name:'Goblin',x:91,y:66,drawX:91,drawY:66,hp:1,maxhp:1,dead:0,coins:0,level:1};
objects.push(o);target=o;const before=s.groundLoot.length;resolveHit(o,1,'melee');
assert(creatureDying(o));const expires=o.dead;
resolveHit(o,9,'melee');assert.equal(o.dead,expires,'a corpse cannot be killed twice');assert.equal(s.groundLoot.length,before+1,'one loot pile');
time+=creatureAssets.goblin.clips.death.duration+.61;assert(!creatureDying(o),'corpse exits after its death animation');
assert(o.dead>time,'visual death does not shorten the respawn cooldown');
// Movement faces travel, and advances the gait with actual distance.
time=100;target=null;const walker={kind:'wolf',id:7};creatureMotion(walker,10,10);
for(let i=1;i<=20;i++){time+=.05;creatureMotion(walker,10+i*.05,10);}
assert(Math.abs(walker._creatureMotion.heading-Math.PI/2)<.1);
assert(walker._creatureMotion.phase>.5&&walker._creatureMotion.phase<.8);
const held=walker._creatureMotion.phase;for(let i=0;i<30;i++){time+=.05;creatureMotion(walker,11,10);}
assert.equal(walker._creatureMotion.phase,held);assert(walker._creatureMotion.blend<.001,'rest stops the gait');
// Falling limbs are above the surface; the renderer must not hide a shin
// beneath the ground and leave its foot looking like a detached fragment.
activateScene('mine',10,12);time=200;
for(const kind of ['goblin','king','wolf','skeleton']){
 const a=creatureAssets[kind],corpse={type:'enemy',kind,x:10,y:12,dead:time+25,deathAt:time-a.clips.death.duration};
 let mesh,matrix;creature3({indexed(m,t){mesh=m;matrix=t;}},corpse,10.5,12.5);
 assert(mesh);let minimum=Infinity;for(let i=0;i<mesh.p.length;i+=3)minimum=Math.min(minimum,briarPoint(mesh.p.subarray(i,i+3),0,matrix)[1]);
 assert(Math.abs(minimum)<.002,kind+' corpse contacts the floor');
}
assert(creaturePoses.size<=80,'skin cache stays bounded');
console.log('PASS: distinct imported creatures, weighted animation, complete attacks, death/loot/respawn, movement heading and bounded pose cache.');
`,ctx);
