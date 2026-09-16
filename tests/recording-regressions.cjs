const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),show(){this.open=true},showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
for(const f of ['kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','world-depth','organic-world','walk-in-world','world-style','assets/realms/monsters','creatures'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});


// Load production dependencies added since this regression was introduced.
for(const f of ["tree-identity", "building-orientation", "assets/realms/approved-creatures", "game-icons", "map-icons"])vm.runInContext(fs.readFileSync(root+f+'.js','utf8'),ctx,{filename:f});

vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();s.tutorial=tutorialSteps.length;assetsReady=true;
activateScene('overworld',42,51);
// Every walk-in doorway must connect the room to clear ground outside, including scenery footprints.
for(const b of buildings.filter(b=>b.walkIn))setWalkInDoor(b.service,true,true);
const exits=buildings.filter(b=>b.walkIn).filter(b=>route(b.service.x,b.service.y+1,false,1.45,b.service.x,b.service.y-2)===null).map(b=>b.name+' @ '+b.service.x+','+b.service.y);
assert.deepEqual(exits,[],'all building exits remain clear');
assert(objects.filter(o=>o.type==='tree').every(o=>worldWaterDistance(o.x+.5,o.y+.5)>=1.5),'tree trunks are on dry ground');
// The walkable bridge span stays inside the parapets even when approached diagonally.
for(const [sx,sy,tx,ty]of [[102,48,122,55],[102,56,122,49],[122,55,102,50]]){
 activateScene('overworld',sx,sy);const way=route(tx,ty);assert(way,'bridge approach');
 for(const [x,z]of way){assert(!bridgeBarrier(x+.5,z+.5),'no route through a parapet');if(worldWaterSurface(x+.5,z+.5)){assert(bridgeAt(x+.5,z+.5));assert(walkSurfaceHeight(x+.5,z+.5)>0);}}
}
// Picking follows the visible bank and deck at different camera rotations and zoom levels.
activateScene('overworld',111,52);screen={w:1112,h:512};
for(const yaw of [-1.4,-.55,.5])for(const tilt of [.55,.85,1.1])for(const zoom of [14,36,65]){
 view3d.yaw=yaw;view3d.tilt=tilt;view3d.zoom=zoom;
 for(const [x,z]of [[111.5,52.5],[108.5,51.5],[118,61]]){const p=project3(x,walkSurfaceHeight(x,z)-landHeight(x,z),z),q=unproject3(p.x,p.y);assert(Math.hypot(q.x-x,q.z-z)<.035,'visible surface picking');}
}
// A melee hit lands during the swing, once, and is cancelled by retreat or changing scenes.
activateScene('overworld',90,66);s.equipment={weapon:'bronzeSword'};s.hp=maxhp();s.meleeTraining='accurate';const enemy={type:'enemy',kind:'goblin',name:'Practice opponent',x:91,y:66,hp:100,maxhp:100,dead:0,level:1,atk:2,spread:0};
const random=Math.random;Math.random=()=>.01;time=10;assert(performAttack(enemy));const queued=meleeImpacts[0].damage;assert.equal(enemy.hp,100);time=10.29;updateCombat(.29);assert.equal(enemy.hp,100);time=10.31;updateCombat(.02);assert.equal(enemy.hp,100-queued);const xp=JSON.stringify(s.xp);updateCombat(.01);assert.equal(JSON.stringify(s.xp),xp);
time=12;performAttack(enemy);s.x=80;px=80;time=12.4;updateCombat(.4);assert.equal(enemy.hp,100-queued,'retreat cancels pending contact');
s.x=90;px=90;time=13;performAttack(enemy);activateScene('overworld',90,66);assert.equal(meleeImpacts.length,0,'scene change clears pending impacts');Math.random=random;
// Rescue returns to a visible, dry village square while retaining equipment and skill progress.
s.hp=1;s.gold=30;s.bag.logs=4;s.xp.Mining=123;const belongings=JSON.stringify({bag:s.bag,gear:s.gear,equipment:s.equipment,xp:s.xp});applyEnemyHit(enemy,5);
assert.equal(currentScene,'overworld');assert(Math.hypot(px-42,py-51)<8);assert(land(s.x,s.y));assert(worldWaterDistance(px+.5,py+.5)>=4);assert(!objects.some(o=>o.type==='tree'&&Math.hypot(o.x-px,o.y-py)<4));assert.equal(s.hp,maxhp());assert.equal(s.gold,25);assert.equal(JSON.stringify({bag:s.bag,gear:s.gear,equipment:s.equipment,xp:s.xp}),belongings);close();
// Local minimap drawing and tapping share a center and the same visible world bounds.
activateScene('overworld',600,400);let destination;const travel=walkTo;walkTo=(x,y)=>destination=[x,y];$('minimap').getBoundingClientRect=()=>({left:20,top:30,width:240,height:180});
walkFromMinimap({clientX:140,clientY:120});assert.deepEqual(destination,[600,400]);const projected=minimapTile(.75,.25);walkFromMinimap({clientX:200,clientY:75});assert.deepEqual(destination,projected);walkTo=travel;
console.log('PASS: every building exit, dry tree placement, diagonal bridge travel, camera picking, timed melee, cancelled strikes, safe rescue with retained progress, and local minimap taps.');
`,ctx);
