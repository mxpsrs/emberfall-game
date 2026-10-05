const vm=require('vm'),assert=require('assert/strict');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`
const adventureIds=['adventureCloakForest','adventureCloakCrimson','adventureCloakAzure','adventureCloakShadow','adventureCloakSand'];
assert(adventureIds.every(id=>ITEMS[id]?.slot==='cape'&&ITEMS[id].model==='Adventure_Cloak'));
assert(adventureIds.every(id=>shopStock.some(row=>row[0]===id)),'all five Adventure cloak colors are sold');
assert(!shopStock.some(row=>row[0]==='redLeatherCape'),'rare leather cape is not sold');
assert.equal(ITEMS.redLeatherCape.capeWindModel,'Red_Leather_Cape_Wind');
const colors=new Set(adventureIds.map(id=>Array.from(capeModelMesh('male',id).c.slice(0,3)).map(v=>v.toFixed(3)).join(':')));assert.equal(colors.size,5,'the five colors tint the actual authored mesh');
assert.deepEqual(REALM_MODELS.capeTextures,{adventureCloth:46,redLeather:47},'both cape materials have dedicated atlas textures');
const textureRange=mesh=>{let lo=1,hi=0;for(const value of mesh.f){lo=Math.min(lo,value);hi=Math.max(hi,value);}return hi-lo;};
const transformPoint=(matrix,p)=>[0,1,2].map(axis=>matrix[axis*4]*p[0]+matrix[axis*4+1]*p[1]+matrix[axis*4+2]*p[2]+matrix[axis*4+3]);
const collarVertices=mesh=>Array.from({length:mesh.p.length/3},(_,i)=>i).filter(i=>mesh.p[i*3+1]>=mesh.capeCollarMinY);
const axisRange=(mesh,vertices,axis)=>{let lo=Infinity,hi=-Infinity;for(const vertex of vertices){const value=mesh.p[vertex*3+axis];lo=Math.min(lo,value);hi=Math.max(hi,value);}return [lo,hi,hi-lo];};
const verifyNeckOpening=(mesh,sex)=>{let top=-Infinity;for(let vertex=1;vertex<mesh.p.length;vertex+=3)top=Math.max(top,mesh.p[vertex]);const opening=Array.from({length:mesh.p.length/3},(_,i)=>i).filter(i=>mesh.p[i*3+1]>=top-.10),x=axisRange(mesh,opening,0),z=axisRange(mesh,opening,2),centerZ=opening.reduce((sum,i)=>sum+mesh.p[i*3+2],0)/opening.length;assert(opening.length>40,'Adventure '+sex+' retains the source neck-opening band');assert(x[0]<-.12&&x[1]>.12,'Adventure '+sex+' opening surrounds both sides of the neck');assert(z[0]<-.12&&z[1]>.025,'Adventure '+sex+' opening reaches behind and in front of the neck');assert(Math.abs(centerZ+.04)<.035,'Adventure '+sex+' opening is centered on the neck rather than the back');};
const verifyCollar=(mesh,pose,spine3,label)=>{
 const posed=posedCapeMesh(mesh,pose),collar=collarVertices(mesh),x=axisRange(mesh,collar,0),z=axisRange(mesh,collar,2);assert(collar.length>20,label+' has a real collar band');assert(x[0]<-.05&&x[1]>.05&&x[2]>.2,label+' collar surrounds both sides of the neck');assert(z[2]>.28,label+' preserves the authored neck-opening depth');
 for(const vertex of collar){assert.equal(mesh.j[vertex*4],spine3,label+' collar uses upper back bone');assert(mesh.w[vertex*4]>.999,label+' collar is rigid');for(let influence=1;influence<4;influence++)assert(mesh.w[vertex*4+influence]<.001,label+' collar has no drifting secondary weight');const expected=transformPoint(pose.subarray(spine3*12,spine3*12+12),mesh.p.subarray(vertex*3,vertex*3+3));for(let axis=0;axis<3;axis++)assert(Math.abs(posed.p[vertex*3+axis]-expected[axis])<2e-5,label+' collar follows upper back exactly');}
};
for(const sex of ['male','female']){
 const plain=avatarMaterial(sex,{},0),cloaked=avatarMaterial(sex,{cape:'adventureCloakForest'},0);assert.equal(cloaked.p.length,plain.p.length,'cape is rendered as an independently animated layer');
 verifyNeckOpening(capeModelMesh(sex,'adventureCloakForest'),sex);
 for(const id of [...adventureIds,'redLeatherCape']){
  const source=capeModelMesh(sex,id,false);assert(source&&source.p.length&&source.i.length);assert(source.p.length/3<15000,'web cape remains inside its LOD budget');
  assert.equal(new Set(source.t).size,1,id+' uses one real texture tile');assert.equal(source.t[0],20+source.capeMaterialSlot,id+' uses its dedicated texture tile');assert(textureRange(source)>.08,id+' contains visible sampled material detail');
  const allVertices=Array.from({length:source.p.length/3},(_,i)=>i),depth=axisRange(source,allVertices,2);assert(depth[2]>(id==='redLeatherCape'?.55:.35),id+' keeps a three-dimensional drape instead of being flattened to the body');
  for(const clip of ['idle','walk','run','melee'])for(const phase of [0,.35,.7]){
   const a=rebuiltAvatars[sex],pose=realmSkeletonPose(a,clip,phase*(a.clips[clip].frames-1),1,'idle',0),cape=posedCapeMesh(clip==='run'&&ITEMS[id].capeWindModel?capeModelMesh(sex,id,true):source,pose);
   assert(Array.from(cape.p).every(Number.isFinite),id+' '+sex+' '+clip);
  }
 }
 const a=rebuiltAvatars[sex],spine3=a.rig.names.indexOf('spine_03');
 for(const [name,mesh] of [['Adventure',capeModelMesh(sex,'adventureCloakForest')],['Red static',capeModelMesh(sex,'redLeatherCape')],['Red wind',capeModelMesh(sex,'redLeatherCape',true)]])for(const clip of Object.keys(a.clips))for(const phase of [0,.25,.5,.75,1])verifyCollar(mesh,realmSkeletonPose(a,clip,phase*(a.clips[clip].frames-1),1,'idle',0),spine3,name+' '+sex+' '+clip+' '+phase);
 assert.notEqual(capeModelMesh(sex,'redLeatherCape',false),capeModelMesh(sex,'redLeatherCape',true),'running selects the artist-supplied wind-blown mesh');
}
s=defaults();s.xp.Defense=SKILL_XP[35];s.gear={redLeatherCape:1};s.equipment={};assert(equipItem('redLeatherCape'));assert.equal(s.equipment.cape,'redLeatherCape');
console.log('PASS: two real cape textures, five obtainable Adventure dyes, open three-dimensional collars through every animation, both body rigs, web LOD limits and authored wind-blown running state.');
`,ctx);
