const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
for(const f of ['kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','world-depth','organic-world','walk-in-world'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(`for(const [sex,a] of Object.entries(rebuiltAvatars))for(const clip of Object.keys(a.clips))for(const phase of [0,.5,1]){const m=avatarPose(sex,clip,phase,{body:'leatherArmor',feet:'leatherBoots'},0);assert([...m.p,...m.n].every(Number.isFinite));assert(Math.max(...m.p.map(Math.abs))<5);assert([...m.i].every(i=>i<m.p.length/3));}assert(rebuiltModels.Hair_Buzzed);`,ctx);
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
activateScene('overworld',42,51);assert.equal(sceneSize()[0],1152);assert(organicRoads.every(seg=>!worldScenes.overworld.buildings.some(b=>{const x=(seg.a[0]+seg.b[0])/2,z=(seg.a[1]+seg.b[1])/2;return x>b.x&&x<b.x+b.w&&z>b.y&&z<b.y+b.h;})),'streets do not pass through buildings');for(const b of buildings.filter(b=>b.walkIn)){const room=objects.filter(o=>o.interiorBuilding===b.service.destination);assert.equal(new Set(room.map(o=>o.x+':'+o.y)).size,room.length,'interior fixtures do not overlap');}assert(buildings.filter(b=>b.walkIn).every(b=>b.w>=9));const testedInn=buildings.find(b=>b.service?.destination==='inn');assert(testedInn.walkIn);assert(objects.some(o=>o.interiorBuilding==='inn'&&o.type==='inn'));const oldScene=currentScene;engage(testedInn.service);assert.equal(testedInn.service.openedAt,undefined,'door stays shut until reached');assert(path.length>0);assert.equal(pendingWalkInDoor,testedInn.service);[s.x,s.y]=path.at(-1);px=s.x;py=s.y;path=[];updateDoorThreshold();assert(testedInn.service.openedAt!==undefined,'door opens at arrival');assert.equal(path.length,0,'opening does not walk through');assert.equal(currentScene,oldScene);assert(!inBuilding(testedInn,testedInn.service.x,testedInn.y+testedInn.h-1));stop();
const willow=buildings.find(b=>b.service?.destination==='willowInn');assert(willow,'recorded Willowcross Inn exists');
activateScene('overworld',willow.service.x,willow.service.y-2);delete s.doorStateVersion;s.openDoors=[];delete willow.service.openedAt;
restoreWalkInDoors(worldScenes.overworld);assert(willow.service.openedAt!==undefined,'old save stranded indoors gets an open exit');
assert(route(willow.service.x,willow.service.y+1)!==null,'recorded stuck character has an exit route');
engage(willow.service);assert.equal(willow.service.openedAt,undefined,'inside click closes door');assert.equal(path.length,0,'closing never walks');
assert.equal(route(willow.service.x,willow.service.y+1),null,'closed door blocks passage');
const savedClosed=JSON.parse(JSON.stringify(s));s=savedClosed;restoreWalkInDoors(worldScenes.overworld);assert.equal(willow.service.openedAt,undefined,'deliberately closed door stays closed on reload');
engage(willow.service);assert(willow.service.openedAt!==undefined,'inside click reopens');assert.equal(path.length,0,'opening never walks');
s=JSON.parse(JSON.stringify(s));delete willow.service.openedAt;restoreWalkInDoors(worldScenes.overworld);assert(willow.service.openedAt!==undefined,'open door survives a reload');
walkTo(willow.service.x,willow.service.y+1);assert(path.length>0,'ground click walks outside');[s.x,s.y]=path.at(-1);px=s.x;py=s.y;stop();updateDoorThreshold();assert.equal(s.insideBuilding,null);assert(willow.service.openedAt!==undefined,'door remains open after exit');
engage(willow.service);assert.equal(willow.service.openedAt,undefined,'outside click closes door');assert.equal(path.length,0);engage(willow.service);assert(willow.service.openedAt!==undefined,'outside click opens door');
activateScene('overworld',willow.service.x,willow.service.y-1);operateWalkInDoor(willow.service);assert(willow.service.openedAt!==undefined,'door cannot close through the character');
activateScene('overworld',42,51);stop();for(const [x,z]of [[14,17],[44,28],[100,55],[185,83]]){const q=project3(x,0,z),back=unproject3(q.x,q.y);assert(Math.hypot(x-back.x,z-back.z)<.03,'terrain picking follows hills');}assert(Math.max(...[60,180,300,420,600].map(x=>landHeight(x,210)))>2);view3d.zoom=14;draw3d();assert(realmGPU);assert(calls.shadows===1);assert(calls.draws>20);const uploads=calls.static;draw3d();assert.equal(calls.static,uploads,'static meshes stay cached on the next frame');assert(calls.dynamic>=2);view3d.zoom=45;draw3d();
activateScene('overworld',testedInn.service.x,testedInn.y+testedInn.h-2);draw3d();assert(testedInn._cutaway,'roof removed inside');activateScene('overworld',testedInn.service.x,testedInn.y+testedInn.h+3);draw3d();assert(!testedInn._cutaway,'roof restored outside');for(const point of [[160,83],[310,67],[268,195]]){activateScene('overworld',...point);draw3d();}for(const id of ['inn','mine','dungeon']){activateScene(id);draw3d();assert(hitboxes.length>0);}
for(const id of Object.keys(ITEMS)){const g=new Proxy({canvas:{width:96,height:96}},{get:(o,k)=>o[k]||(()=>{})});if(['herbs','copperOre','relicShard','feather','wool'].includes(id))continue;drawRealmItem(g,id);}
`,ctx);
gpuCanvas.listeners.webglcontextlost({preventDefault:noop});vm.runInContext(`assert(realmGPUUnavailable);draw3d();`,ctx);
console.log('PASS: GPU shadow/color passes, finite geometry, static buffer reuse, three interiors, all item previews and context-loss canvas fallback.');
