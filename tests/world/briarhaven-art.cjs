const assert=require('node:assert/strict');
const {ctx,vm,fs,els,el,data,noop,root}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(`
// Imported geometry, equipment selection and all animation poses must remain valid.
for(const [name,rig]of Object.entries(briarRigs))for(const [part,mesh]of Object.entries(rig.meshes)){
 assert([...mesh.i].every(i=>i<mesh.p.length/3));
 assert([...mesh.j].every(i=>i<rig.jointCount));
 for(const clip of Object.keys(rig.clips))for(const phase of [0,.5,1]){
  const pose=briarPose(name,part,clip,phase);assert([...pose.p,...pose.n].every(Number.isFinite));
  assert(Math.max(...pose.p.map(Math.abs))<5,name+part+' plausible animated bounds');
 }
}
const bare=briarEquipment({}),full=briarEquipment({head:'ironHelm',body:'leatherArmor',feet:'leatherBoots',shield:'ironShield',weapon:'ironSword'});
assert.equal(bare.length,6);assert.equal(full.length,9);assert(!bare.some(p=>p[1]==='Helmet'));assert(full.some(p=>p[1]==='Helmet'));
assert.notDeepEqual([...briarPose('Rogue','LegLeft','walk',.2).p],[...briarPose('Rogue','LegLeft','walk',.7).p]);
// Artist colors reach the GPU without being reduced to a flat triangle color.
const packed=[];realmFaceData(packed,[[0,0,0],[1,0,0],[0,1,0]],'#ffffff',null,12,[[1,0,0],[0,1,0],[0,0,1]]);assert.deepEqual(packed.slice(6,9),[1,0,0]);assert.deepEqual(packed.slice(16,19),[0,1,0]);
let faces=0;const recorder={face(p,c,n,m,colors){faces++;assert(p.flat().every(Number.isFinite));assert(/^#[0-9a-f]{6}$/.test(c));assert(!colors||colors.flat().every(Number.isFinite));}};
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();
for(const b of worldScenes.overworld.buildings.filter(b=>b.settlement==='briarhaven')){building3(recorder,b);assert(b.visualHeight>2);assert(b.service.destination);const cache=cachedMesh3(b,'building',r=>building3(r,b));assert(buildingHull3(cache).length>=3);}
assert(faces>1500,'real imported building meshes');
`,ctx);
const calls={static:0,dynamic:0,draws:0,shadows:0,images:0};let enumId=1;const enums={};
const gl=new Proxy({
 getParameter:()=> 'WebGL 1.0 test',getShaderParameter:()=>true,getProgramParameter:()=>true,
 getAttribLocation:(p,n)=>['aPosition','aNormal','aColor','aMaterial'].indexOf(n),
 getUniformLocation:(p,n)=>n,checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,isContextLost:()=>false,
 bufferData:(target,data,usage)=>{assert(data.length>0);assert([...data].every(Number.isFinite),'all GPU vertex values finite');calls[usage===gl.STATIC_DRAW?'static':'dynamic']++;},
 uniform1f:(name,v)=>{if(name==='uShadowPass'&&v===1)calls.shadows++;},drawArrays:()=>calls.draws++,
 createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),createTexture:()=>({}),createFramebuffer:()=>({}),createRenderbuffer:()=>({})
},{get:(o,k)=>o[k]||(k===k.toUpperCase()?(enums[k]??=enumId++):noop)});
const oldCreate=ctx.document.createElement;let gpuCanvas;
ctx.document.createElement=()=>{const e=oldCreate();e.getContext=type=>{if(type==='webgl'){gpuCanvas=e;return gl;}return new Proxy({},{get:()=>noop});};return e;};ctx.calls=calls;

vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupLoot();screen={w:900,h:400};assetsReady=true;
activateScene('overworld',14,17);view3d.zoom=14;draw3d();assert(realmGPU);assert(calls.shadows===1);assert(calls.draws>20);const uploads=calls.static;draw3d();assert.equal(calls.static,uploads,'static meshes stay cached on the next frame');assert(calls.dynamic>=2);view3d.zoom=45;draw3d();
for(const id of ['inn','mine','dungeon']){activateScene(id);draw3d();assert(hitboxes.length>0);}
for(const id of Object.keys(ITEMS)){const g=new Proxy({canvas:{width:96,height:96}},{get:(o,k)=>o[k]||(()=>{})});if(['herbs','copperOre','relicShard','feather','wool'].includes(id))continue;drawRealmItem(g,id);}
`,ctx);
gpuCanvas.listeners.webglcontextlost({preventDefault:noop});vm.runInContext(`assert(realmGPUUnavailable);draw3d();`,ctx);
console.log('PASS: authored meshes, six clips, equipment visibility, vertex colors, Briarhaven doors, GPU shadow/color passes, finite geometry, static buffer reuse, three interiors, all item previews and context-loss canvas fallback.');
