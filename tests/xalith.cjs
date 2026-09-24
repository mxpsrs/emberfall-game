const {ctx}=require('../scripts/benchmark-desktop.cjs');
const vm=require('node:vm');
vm.runInContext(`
const asset=creatureAssets.boss_xalith;
assert(asset,'the uploaded insect is imported');
assert.equal(asset.mesh.i.length/3,13156,'every original creature triangle is retained');
assert.equal(asset.rig.deforms.length,157,'weighted curved segments survive export');
assert.equal(asset.source.nativeActions.join(','),'PoseLib,PoseLib.001','the two source actions are identified honestly');
assert.equal(asset.source.authoredActions.length,7,'gameplay motions are distinguished from supplied actions');
assert.equal(new Set(asset.mesh.t).size,2,'original body and wing color maps remain separate');
const batches=creatureSkinBatches(asset);
assert(batches.length>1);assert.equal(batches.reduce((sum,b)=>sum+b.mesh.i.length,0),asset.mesh.i.length,'palette partition retains every triangle');
assert.equal(creatureSkinBatches(asset),batches,'geometry partitions are reused');
for(const batch of batches){
 assert(batch.joints.length<=80,'each draw fits the existing WebGL 1 shader');
 for(let i=0;i<batch.mesh.j.length;i++)if(batch.mesh.w[i]>0)assert(batch.mesh.j[i]<batch.joints.length,'all positive weights reference this draw palette');
}
const extents=m=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];m.p.forEach((v,i)=>{lo[i%3]=Math.min(lo[i%3],v);hi[i%3]=Math.max(hi[i%3],v);});return hi.map((v,i)=>v-lo[i]);};
const vertexKey=(m,i,joints)=>JSON.stringify([Array.from(m.p.subarray(i*3,i*3+3)),Array.from({length:4},(_,k)=>m.w[i*4+k]>0?[joints?joints[m.j[i*4+k]]:m.j[i*4+k],m.w[i*4+k]]:null)]);
const sourceVertices=new Map();for(let i=0;i<asset.mesh.p.length/3;i++)sourceVertices.set(vertexKey(asset.mesh,i),i);
for(const [name,motion]of Object.entries(asset.clips)){
 let previous=null,moving=false;
 for(const phase of [0,.15,.3,.53,.75,1]){
  const full=creaturePose('boss_xalith',name,phase),rig=creatureRigPose('boss_xalith',name,phase);
  assert(full.p.every(Number.isFinite)&&full.n.every(Number.isFinite),'finite geometry through '+name);
  assert(Math.max(...extents(full))*asset.scale<8,'no exploding bones during '+name);
  if(previous&&full.p.some((v,i)=>Math.abs(v-previous[i])*asset.scale>.01))moving=true;
  previous=full.p;
  // The smaller draw palettes must produce the same positions as the full
  // original rig. Match the corresponding vertices by their bind attributes.
  for(const b of batches)for(let i=0;i<b.mesh.p.length/3;i+=53){
   const m=b.mesh,original=sourceVertices.get(vertexKey(m,i,b.joints));
   assert(original!==undefined,'bind position and all nonzero weights survive partition');
   for(let axis=0;axis<3;axis++){
    let partial=0,reference=0;
    for(let k=0;k<4;k++){
     const w=m.w[i*4+k];if(!w)continue;
     const index=b.joints[m.j[i*4+k]]*12+axis*4;
     partial+=w*(rig.palette[index]*m.p[i*3]+rig.palette[index+1]*m.p[i*3+1]+rig.palette[index+2]*m.p[i*3+2]+rig.palette[index+3]);
    }
    reference=full.p[original*3+axis];
    assert(Math.abs(partial-reference)<.00003,'split palette agrees with full CPU skinning');
   }
  }
 }
 assert(moving,'skeletal movement is present in '+name);
 if(['idle','walk','run'].includes(name)){
  const first=creaturePose('boss_xalith',name,0),last=creaturePose('boss_xalith',name,1);
  assert(first.p.every((v,i)=>Math.abs(v-last.p[i])<.0001),'loop has no pose pop: '+name);
 }
}
const standing=extents(creaturePose('boss_xalith','idle',0))[1],fallen=extents(creaturePose('boss_xalith','death',1))[1];
assert(fallen<standing*.8,'death collapses the whole body');
console.log('PASS: Xalith preserves 13,156 triangles, curved wing segments and original materials; seven authored motions move, loops close, death collapses, and split GPU palettes agree with CPU deformation.');
`,ctx);
