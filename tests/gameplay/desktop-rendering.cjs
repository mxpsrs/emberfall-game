// Exercise the full world, with instrumented WebGL calls instead of elapsed-time gates.
const vm=require('vm'),assert=require('assert');
const {ctx,counters,els,gl}=require('../../scripts/qa/benchmark-desktop.cjs');
const siblings=[els.world];
els.world.parentElement={insertBefore(child,before){siblings.splice(siblings.indexOf(before),0,child);}};
els.world.getBoundingClientRect=()=>({width:3840,height:2160,left:0,top:0});
ctx.devicePixelRatio=2;
gl.uniformMatrix3fv=(name,transpose,values)=>assert([...values].every(Number.isFinite));
vm.runInContext(`{
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
s.character={name:'Render check',look:0,frame:'male',hair:0};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.worldClock=120;
resize();assert(canvas.width*canvas.height<=8294400,'the transparent HUD does not allocate an oversized 8K canvas');
screen={w:1920,h:1080};activateScene('overworld',42,51);draw3d();
assert(realmGPU.presented,'the GPU canvas is displayed directly');
// Finish scheduled construction before measuring stable-world reuse.
for(let i=0;i<24;i++)draw3d();
const firstUploads=counters.static;
for(let i=0;i<4;i++)draw3d();
assert(counters.static-firstUploads<=4,'completed world reuses cached meshes while queued terrain finishes');
const idleMesh=avatarPose('male','idle',0,s.equipment,0);draw3d();assert.strictEqual(avatarPose('male','idle',0,s.equipment,0),idleMesh,'rendering the same pose reuses its mesh');
assert.equal(counters.images,0,'displaying a frame does not copy the GPU canvas into the HUD');
const terrainCamera=cameraPose3();assert([...realmGPU.terrain.get(currentScene).values()].every(c=>Math.hypot(c.x-terrainCamera.eye[0],c.z-terrainCamera.eye[2])<terrainCamera.far*2+32),'terrain stays within the current camera reach and chunk margin');
	for(const [w,h]of [[1920,1080],[3840,2160]]){
	 screen={w,h};window.devicePixelRatio=2;draw3d();
	 const d=Math.min(2,Math.sqrt(8294400/(w*h)));assert.equal(realmGPU.surface.width,Math.floor(w*d),'GPU width stays within the shared backing budget');assert.equal(realmGPU.surface.height,Math.floor(h*d),'GPU height stays within the shared backing budget');
 for(const [x,z]of [[42,51],[40,53],[48,49]]){const p=project3(x,civilPickSurfaceHeight(x,z)-landHeight(x,z),z),back=unproject3(p.x,p.y);assert(Math.hypot(back.x-x,back.z-z)<.03,'desktop clicks map back onto their terrain positions');}
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
draw3d();assert(!inn._cutaway,'leaving restores the roof even while the door remains open');setWalkInDoor(inn.service,false,true);draw3d();assert(!inn._cutaway,'closing the door outside keeps the roof');
activateScene('overworld',inn.service.x,inn.service.y+7);draw3d();assert(!inn._cutaway,'roof is restored beyond five tiles');
// A nonuniformly scaled model must keep its normal perpendicular to its surface.
const m=briarTransform(0,0,0,2,.7,.5),n=realmNormalMatrix(m),edge=[m[0]-m[1],m[4]-m[5],m[8]-m[9]],normal=[n[0]+n[3],n[1]+n[4],n[2]+n[5]];
assert(Math.abs(edge.reduce((sum,x,i)=>sum+x*normal[i],0))<1e-6,'cached models retain correct surface lighting');
}`,ctx);
assert.equal(siblings.length,2);
assert.equal(siblings[0].className,'realm-surface');
assert.equal(siblings[1],els.world);
console.log('PASS: desktop and 4K rendering budgets, mesh reuse, direct presentation, terrain picking, occupied-only cutaways, persistent doors, and model lighting.');
