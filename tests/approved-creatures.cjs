const vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`
const giant=creatureAssets.forestgiant;
assert(giant,'approved Forest Giant imported');
assert.equal(giant.rig.deforms.length,33,'original skin joints retained');
assert.equal(giant.source.nativeActions.length,10,'all native source actions retained');
assert.equal(giant.mesh.i.length/3,7340,'original triangle count retained');
for(const clip of Object.keys(giant.clips)){
 let moved=false,first=null;
 for(const phase of [0,.25,.5,.75,1]){
  const pose=creaturePose('forestgiant',clip,phase);
  assert(pose.p.every(Number.isFinite)&&pose.n.every(Number.isFinite),'finite skinned pose: '+clip);
  assert(Number.isFinite(pose.floorY),'finite contact height: '+clip);
  const bound=Math.max(...pose.p.map(Math.abs))*giant.scale;
  assert(bound<giant.height*4,'native rig remains inside a plausible pose envelope: '+clip);
  if(first&&pose.p.some((v,i)=>Math.abs(v-first[i])>.001))moved=true;
  if(!first)first=pose.p;
 }
 assert(moved,'source action produces real skeletal motion: '+clip);
}
console.log('PASS: approved Forest Giant retains 7,340 triangles, 33 skin joints, and all ten native actions; all imported poses deform and remain finite.');
`,ctx);
