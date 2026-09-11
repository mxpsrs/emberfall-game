const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
for(const f of ['kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','world-depth','organic-world','walk-in-world','world-style'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});


vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();s.tutorial=tutorialSteps.length;s.character={name:'Traveller'};
activateScene('overworld',103,52);s.runEnabled=true;s.runEnergy=100;assert(worldWaterSurface(111,52),'river continues underneath bridge');assert(!water(111,52),'bridge is walkable');assert(landHeight(111,52)<0,'riverbed is underwater');assert(walkSurfaceHeight(111,52)>1,'walking surface is above the river');
walkTo(121,52);assert(path.length>0);let crossed=false;
for(let i=0;i<600;i++){advanceMovement(.05);if(Math.abs(px-111.5)<1){crossed=true;assert(walkSurfaceHeight(px+.5,py+.5)>1);}if(!path.length&&Math.hypot(px-s.x,py-s.y)<.001)break;}
assert(crossed);assert.equal(px,121);assert.equal(py,52);
for(let z=59;z<72;z++)for(let x=98;x<123;x++){assert(Math.abs(landHeight(x,z)-landHeight(x+1,z))<.8,'riverbanks have no lookup-boundary cliff');assert(landNormal(x,z).every(Number.isFinite));}
for(const [x,z]of [[111,52],[110,53],[113,52]]){const q=project3(x,walkSurfaceHeight(x,z)-landHeight(x,z),z),p=unproject3(q.x,q.y);assert(Math.hypot(x-p.x,z-p.z)<.03,'bridge picking matches deck');}
const innRoom=buildings.find(b=>b.service?.destination==='inn');const heights=[];for(let z=innRoom.y+1;z<innRoom.y+innRoom.h-1;z++)for(let x=innRoom.x+1;x<innRoom.x+innRoom.w-1;x++)heights.push(landHeight(x,z));assert(Math.max(...heights)-Math.min(...heights)<.001,'room floor is level');
assert(worldWaterSurface(-50,20));assert(landHeight(-50,20)<0,'off-map ocean replaces empty background');
assert(organicRoads.every(seg=>roadInfluence((seg.a[0]+seg.b[0])/2,(seg.a[1]+seg.b[1])/2)[0]>.95),'roads have continuous terrain coverage');
let inherited;const anchored=groundedPainter({indexed(mesh,m){inherited=m[7]+landHeight(m[3],m[11]);}},119,61);anchored.indexed({},briarTransform(120,1.2,62,1));assert(Math.abs(inherited-1.2-walkSurfaceHeight(119,61))<1e-6,'attachments inherit character root height on slopes');
console.log('PASS: run across bridge, matching deck picking, continuous banks, level room floors, coastline and terrain road coverage.');
`,ctx);
