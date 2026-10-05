const assert=require('node:assert/strict');
const {ctx,vm,fs,els,el,data,noop,root}=require('../../scripts/qa/game-fixture.cjs');
const calls={static:0,dynamic:0,draws:0,shadows:0,images:0};let enumId=1;const enums={};
const gl=new Proxy({
 getParameter:()=> 'WebGL 1.0 test',getShaderParameter:()=>true,getProgramParameter:()=>true,
 getAttribLocation:(p,n)=>['aPosition','aNormal','aColor','aMaterial','aUV'].indexOf(n),
 getUniformLocation:(p,n)=>n,checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,isContextLost:()=>false,
 bufferData:(target,data,usage)=>{assert(data.length>0);assert([...data].every(Number.isFinite),'all GPU vertex values finite');calls[usage===gl.STATIC_DRAW?'static':'dynamic']++;},
 uniform1f:(name,v)=>{if(name==='uShadowPass'&&v===1)calls.shadows++;},drawArrays:()=>calls.draws++,
 createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),createTexture:()=>({}),createFramebuffer:()=>({}),createRenderbuffer:()=>({})
},{get:(o,k)=>o[k]||(k===k.toUpperCase()?(enums[k]??=enumId++):noop)});
const oldCreate=ctx.document.createElement;let gpuCanvas;
ctx.document.createElement=()=>{const e=oldCreate();e.getContext=type=>{if(type==='webgl'){gpuCanvas=e;return gl;}return new Proxy({},{get:()=>noop});};return e;};ctx.calls=calls;


vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupLoot();screen={w:900,h:400};assetsReady=true;
activateScene('overworld',40,30);view3d.zoom=14;draw3d();assert(realmGPU);assert(calls.shadows===1);assert(calls.draws>0,'the bootstrap frame draws the player scene and nearest ground chunk');const uploads=calls.static;draw3d();assert.equal(calls.static,uploads,'static meshes stay cached on the next frame');assert.equal(calls.shadows,2,'shadow and color passes continue across frames');view3d.zoom=45;draw3d();
for(const id of ['inn','mine','dungeon']){activateScene(id);draw3d();assert(hitboxes.length>0);}
for(const id of Object.keys(ITEMS)){const g=new Proxy({canvas:{width:96,height:96}},{get:(o,k)=>o[k]||(()=>{})});if(['herbs','copperOre','relicShard','feather','wool'].includes(id))continue;drawRealmItem(g,id);}
`,ctx);
gpuCanvas.listeners.webglcontextlost({preventDefault:noop});vm.runInContext(`assert(realmGPUUnavailable);draw3d();`,ctx);
console.log('PASS: GPU shadow/color passes, finite geometry, static buffer reuse, three interiors, all item previews and context-loss canvas fallback.');
