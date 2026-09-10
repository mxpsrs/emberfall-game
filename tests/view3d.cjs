const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupLoot();screen={w:900,h:500};
for(const yaw of [-3,-1,0,1,3])for(const zoom of [14,34,65])for(const tilt of [.5,.85,1.2]){
 Object.assign(view3d,{yaw,zoom,tilt});const projected=project3(px+3,0,py-2),back=unproject3(projected.x,projected.y);assert(Math.abs(back.x-(px+3))<1e-8);assert(Math.abs(back.z-(py-2))<1e-8);draw3d();assert(hitboxes.length>0);
}
for(const id of ['inn','mine','dungeon']){activateScene(id);draw3d();assert(hitboxes.length>0);}
for(const id of ['bronzeSword','ironSword','shortbow','oakStaff','ironHelm','ironShield','leatherBoots','leatherArmor','mageRobe']){const g=new Proxy({canvas:{width:96,height:96}},{get:(o,k)=>o[k]||(()=>{})});assert(drawRealmItem(g,id));}let taps=0;clickWorld3=()=>taps++;const listener=canvas.listeners;const event=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'touch',preventDefault:()=>{}});
listener.pointerdown(event(1,100,100));listener.pointerup(event(1,100,100));assert.equal(taps,1);
listener.pointerdown(event(1,100,100));listener.pointerdown(event(2,200,100));const oldYaw=view3d.yaw;listener.pointermove(event(2,240,150));assert.notEqual(view3d.yaw,oldYaw);listener.pointerup(event(2,240,150));listener.pointerup(event(1,100,100));assert.equal(taps,1);
const meshPoints=[];const recorder={face(points){meshPoints.push(...points)}};
for(const weapon of ['bronzeSword','shortbow','oakStaff'])for(const heading of [0,1,3])for(const walk of [0,1,2]){
 humanoid3(recorder,0,0,1,{body:'leatherArmor',head:'ironHelm',feet:'leatherBoots',shield:'ironShield',weapon},heading,walk,.8);
}assert(meshPoints.every(p=>p.every(Number.isFinite)));assert(meshPoints.length>1000);
console.log('PASS: 45 camera angle/zoom combinations, screen-to-world inversion, 3D draw, interior scenes, all weapon meshes and articulated equipment.');
`,ctx);
