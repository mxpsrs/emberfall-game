// Preserve every rendered corner, material boundary and pose while sharing vertices.
const vm=require('vm');const {ctx,counters,gl}=require('../scripts/benchmark-desktop.cjs');
vm.runInContext(`{
 const identity=[1,0,0,0,0,1,0,0,0,0,1,0];
 function compare(mesh){
  const topology=realmMeshTopology(mesh),packed=realmVertexData(mesh,topology),expected=[];
  packingLocalMesh=true;try{realmIndexedData(expected,mesh,identity);}finally{packingLocalMesh=false;}
  assert.equal(topology.indices.length*12,expected.length);
  for(let i=0;i<topology.indices.length;i++)for(let k=0;k<12;k++)assert(Math.abs(packed[topology.indices[i]*12+k]-expected[i*12+k])<1e-6,'indexed corners preserve positions, normals, UVs, colours and categorical atlas slots');
  return topology;
 }
 const quad={p:new Float32Array([0,0,0,1,0,0,1,1,0,0,1,0]),n:new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]),c:new Float32Array(12).fill(.3),f:new Float32Array(12).fill(.7),uv:new Float32Array(8),t:new Uint8Array([21,21,21,22]),i:new Uint16Array([0,1,2,0,2,3])};
 const mixed=compare(quad);assert.equal(mixed.refs.length,6,'mixed atlas triangles get separate fallback-colour vertices');
 const source={...quad,t:new Uint8Array(4).fill(21)},topology=compare(source);assert.equal(topology.refs.length,4,'ordinary adjacent triangles share all common vertices');
 let shared;
 for(const sex of ['male','female'])for(const clip of ['idle','run','ranged','magic','bury']){
  const gear={_appearance:{topStyle:5,bottomStyle:4,hair:4,topColor:2,bottomColor:7},weapon:'shortbow'},posed=avatarPose(sex,clip,.37,gear,0),t=compare(posed),material=avatarMaterial(sex,gear,0);
  assert.strictEqual(realmMeshTopology(material),t,'a pose shares topology with its original material');
  const skinned=realmVertexData(material,t,true);
  for(let i=0;i<t.refs.length;i++){const v=t.refs[i]>>>1;for(let k=0;k<4;k++){assert.equal(skinned[i*20+12+k],material.j[v*4+k]);assert.equal(skinned[i*20+16+k],material.w[v*4+k]);}}
  assert(t.refs.length<posed.i.length*.6,'full outfits upload substantially fewer vertices');shared=posed;
 }
 const gpu=createRealmGPU(),first=realmMeshEntry(gpu,shared),uploads=counters.static,posedAgain={...shared,p:Float32Array.from(shared.p,v=>v+.01)},second=realmMeshEntry(gpu,posedAgain);
 assert.strictEqual(first.index,second.index,'animated poses reuse the index buffer');assert.equal(counters.static-uploads,1,'a new CPU pose uploads only its vertex data');
 const savedHeight=landHeight;landHeight=(x,z)=>2+x*.01-z*.02;
 const entries=Array.from({length:20},(_,i)=>({...first,model:briarTransform(i+1,.1,i-2,.7,i*.3,1.3)})),original=entries.map(e=>[...e.model]);
 const special={...first,model:identity,palette:new Float32Array(12)},dying={...first,model:identity,dissolve:.4},coloured={...first,model:identity,bossColor:2};
 const prepared=realmPrepareDraws([...entries,special,dying,coloured],true);
 assert.equal(prepared.batches.length,1);assert.equal(prepared.batches[0].instances,20);assert.equal(prepared.singles.length,3,'animated palettes, deaths and boss tint remain individual draws');
 for(let i=0;i<20;i++){
  assert.deepEqual(entries[i].model,original[i],'preparing shadows and colour does not move the source object');
  const m=Array.from(prepared.transforms.subarray(i*12,i*12+12));
  for(const p of [[0,0,0],[.3,1,-.2]]){const actual=briarPoint(p,0,m),expected=briarPoint(p,0,original[i]);expected[1]+=landHeight(original[i][3],original[i][11]);for(let k=0;k<3;k++)assert(Math.abs(actual[k]-expected[k])<2e-6,'batched scenery keeps its ground height, scale and orientation');}
 }
 let draws=counters.draws;gpu.render(entries,[],ctx);assert.equal(counters.draws-draws,2,'twenty identical meshes need one indexed draw in each pass');
 const extension=gpu.gl.getExtension;gpu.gl.getExtension=()=>null;const fallback=createRealmGPU();assert(!fallback.instancing);draws=counters.draws;fallback.render(entries,[],ctx);assert.equal(counters.draws-draws,40,'WebGL without instancing retains every instance and shadow');gpu.gl.getExtension=extension;
 landHeight=savedHeight;
 realmResolution.scale=1;realmResolution.samples=0;realmResolution.total=0;for(let i=0;i<30;i++)observeRenderTime(250);assert.equal(realmResolution.scale,1,'sustained stalls never pump or reduce resolution');const lowered=realmResolution.scale;observeRenderTime(5000);assert.equal(realmResolution.scale,lowered,'a background-tab pause does not change quality');
 console.log('PASS: both bodies through idle/run/ranged/magic/burial, exact indexed material corners, bone weights, shared pose indices, grounded instance transforms, both shadow passes, no-extension fallback and stable native render resolution.');
}`,ctx);
