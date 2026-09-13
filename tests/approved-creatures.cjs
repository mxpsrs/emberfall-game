const vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`
const giant=creatureAssets.forestgiant;
assert(giant,'approved Forest Giant imported');
assert.equal(giant.rig.deforms.length,33,'original skin joints retained');
assert.equal(giant.source.nativeActions.length,10,'all native source actions retained');
assert.equal(giant.mesh.i.length/3,7340,'original triangle count retained');
const ork=creatureAssets.ork;assert(ork,'approved Ork imported');
assert.equal(ork.mesh.i.length/3,4655,'all four original body meshes retained');
assert.equal(new Set(ork.mesh.t).size,2,'body and clothing keep separate original materials');
assert.equal(ork.source.animationFiles.length,5,'separate native FBX actions have source provenance');
const colossus=creatureAssets.boss_colossus;assert(colossus);
assert.equal(colossus.mesh.i.length/3,10344,'Colossus keeps the complete original geometry');
assert.equal(colossus.rig.deforms.length,45,'unused DCC controllers are pruned without losing deforming bones');
assert.equal(colossus.source.nativeActions.length,2,'only two native takes are claimed');
assert.equal(colossus.clips.death.frames,1,'held death pose is explicitly paired with game-authored shatter effects');
for(const kind of ['forestgiant','ork','boss_colossus'])for(const clip of Object.keys(creatureAssets[kind].clips)){
 const asset=creatureAssets[kind];
 let moved=false,first=null;
 for(const phase of [0,.25,.5,.75,1]){
  const pose=creaturePose(kind,clip,phase);
  assert(pose.p.every(Number.isFinite)&&pose.n.every(Number.isFinite),'finite skinned pose: '+clip);
  assert(Number.isFinite(pose.floorY),'finite contact height: '+clip);
  const bound=Math.max(...pose.p.map(Math.abs))*asset.scale;
  assert(bound<asset.height*4,'native rig remains inside a plausible pose envelope: '+kind+' '+clip);
  if(first&&pose.p.some((v,i)=>Math.abs(v-first[i])>.001))moved=true;
  if(!first)first=pose.p;
 }
 if(kind==='boss_colossus'&&clip==='death')assert(!moved,'held pose remains still for the crystal shatter');else assert(moved,'source action produces real skeletal motion: '+clip);
}
console.log('PASS: Forest Giant, Ork and Colossus preserve original geometry and materials; native actions remain finite; Colossus held-pose death is explicitly documented.');
`,ctx);
