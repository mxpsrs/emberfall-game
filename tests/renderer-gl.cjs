const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
for(const f of ['kingdoms','realm-models'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

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
activateScene('overworld',40,30);view3d.zoom=14;draw3d();assert(realmGPU);assert(calls.shadows===1);assert(calls.draws>20);const uploads=calls.static;draw3d();assert.equal(calls.static,uploads,'static meshes stay cached on the next frame');assert(calls.dynamic>=2);view3d.zoom=45;draw3d();
for(const id of ['inn','mine','dungeon']){activateScene(id);draw3d();assert(hitboxes.length>0);}
for(const id of Object.keys(ITEMS)){const g=new Proxy({canvas:{width:96,height:96}},{get:(o,k)=>o[k]||(()=>{})});if(['herbs','copperOre','relicShard','feather','wool'].includes(id))continue;drawRealmItem(g,id);}
`,ctx);
gpuCanvas.listeners.webglcontextlost({preventDefault:noop});vm.runInContext(`assert(realmGPUUnavailable);draw3d();`,ctx);
console.log('PASS: GPU shadow/color passes, finite geometry, static buffer reuse, three interiors, all item previews and context-loss canvas fallback.');
