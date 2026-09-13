// Exercise the full world, with instrumented WebGL calls instead of elapsed-time gates.
const vm=require('vm'),assert=require('assert');
const {ctx,counters,els,gl}=require('../scripts/benchmark-desktop.cjs');
const siblings=[els.world];
els.world.parentElement={insertBefore(child,before){siblings.splice(siblings.indexOf(before),0,child);}};
els.world.getBoundingClientRect=()=>({width:3840,height:2160,left:0,top:0});
ctx.devicePixelRatio=2;
gl.uniformMatrix3fv=(name,transpose,values)=>assert([...values].every(Number.isFinite));
vm.runInContext(`{
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
s.character={name:'Render check',look:0,frame:'male',hair:0};s.tutorial=tutorialSteps.length;s.worldClock=120;
resize();assert(canvas.width*canvas.height<=8294400,'the transparent HUD does not allocate an oversized 8K canvas');
screen={w:1920,h:1080};activateScene('overworld',42,51);draw3d();
assert(realmGPU.presented,'the GPU canvas is displayed directly');
const firstUploads=counters.static;
for(let i=0;i<4;i++){time+=1/60;draw3d();}
assert(counters.static-firstUploads<=4,'only the nearby player idle pose changes; distant NPCs and the world stay cached');
const idleUploads=counters.static;draw3d();assert.equal(counters.static,idleUploads,'rendering the same pose reuses its mesh');
assert.equal(counters.images,0,'displaying a frame does not copy the GPU canvas into the HUD');
assert(realmGPU.terrain.get(currentScene).size<200,'only nearby terrain is constructed');
for(const [w,h]of [[1920,1080],[3840,2160]]){
 screen={w,h};window.devicePixelRatio=2;draw3d();
 assert(realmGPU.surface.width*realmGPU.surface.height<=2073600,'desktop GPU pixels remain within the 1080p budget');
 for(const [x,z]of [[42,51],[40,53],[48,49]]){const p=project3(x,0,z),back=unproject3(p.x,p.y);assert(Math.hypot(back.x-x,back.z-z)<.03,'desktop clicks map back onto their terrain positions');}
}
screen={w:1920,h:1080};
const inn=buildings.find(b=>b.service?.destination==='willowInn');
activateScene('overworld',inn.service.x,inn.service.y+7);draw3d();
assert(!hitboxes.some(h=>h.o.interiorBuilding==='willowInn'),'hidden occupants cannot be selected through the building');
activateScene('overworld',inn.service.x,inn.service.y-2);setWalkInDoor(inn.service,true,true);draw3d();
assert(hitboxes.some(h=>h.o.interiorBuilding==='willowInn'),'occupants appear and are selectable when inside');
assert(hitboxes.some(h=>h.door&&h.o===inn.service),'the open door remains selectable');
walkTo(inn.service.x,inn.service.y+2);assert(path.length>0);
for(let i=0;i<120&&path.length;i++)advanceMovement(.05);
assert.equal(path.length,0,'movement can leave the building');updateDoorThreshold();
assert(inn.service.openedAt!==undefined,'the door remains open after leaving');
draw3d();assert(inn._cutaway,'the roof stays hidden while within five tiles');
activateScene('overworld',inn.service.x,inn.service.y+7);draw3d();assert(!inn._cutaway,'roof is restored beyond five tiles');
// A nonuniformly scaled model must keep its normal perpendicular to its surface.
const m=briarTransform(0,0,0,2,.7,.5),n=realmNormalMatrix(m),edge=[m[0]-m[1],m[4]-m[5],m[8]-m[9]],normal=[n[0]+n[3],n[1]+n[4],n[2]+n[5]];
assert(Math.abs(edge.reduce((sum,x,i)=>sum+x*normal[i],0))<1e-6,'cached models retain correct surface lighting');
}`,ctx);
assert.equal(siblings.length,2);
assert.equal(siblings[0].className,'realm-surface');
assert.equal(siblings[1],els.world);
console.log('PASS: desktop and 4K rendering budgets, mesh reuse, direct presentation, terrain picking, hidden interiors, persistent doors, and model lighting.');
