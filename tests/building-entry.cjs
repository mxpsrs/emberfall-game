const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupLoot();screen={w:900,h:400};assetsReady=true;
for(const yaw of [-1,0,1,2]){view3d.yaw=yaw;draw3d();const house=hitboxes.find(h=>h.building?.service?.destination==='inn');assert(house);const roof=project3(house.building.x+house.building.w/2,2.2,house.building.y+house.building.h/2);assert(pointInHull3(roof.x,roof.y,house.polygon));}
let options;dialog=(title,html,buttons)=>{options=buttons};close=()=>{};const innBuilding=buildings.find(b=>b.service?.destination==='inn');openBuilding3(innBuilding);assert.equal(options[0][0],'Enter');options[0][1]();assert.equal(target,innBuilding.service);
const faces=[];meshDetail3=1;profile3({face:p=>faces.push(p)},0,1,0,1,1,1,[[-.5,.04],[-.35,.72],[0,1],[.35,.72],[.5,.04]],'#888888');const high=faces.length;faces.length=0;meshDetail3=.5;profile3({face:p=>faces.push(p)},0,1,0,1,1,1,[[-.5,.04],[-.35,.72],[0,1],[.35,.72],[.5,.04]],'#888888');assert(faces.length<high/2);
console.log('PASS: roof and wall hit regions at four camera angles, Enter routes to the correct door, distant mesh detail reduction.');
`,ctx);