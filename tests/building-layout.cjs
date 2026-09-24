const vm=require('node:vm'),assert=require('node:assert/strict'),{ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`{
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
const facings=new Set(buildings.filter(b=>b.walkIn).map(b=>b.doorFacing));assert.equal(facings.size,4,'all four street-facing orientations are used');
for(const b of buildings.filter(b=>b.walkIn)){
 const o=b.service,[x,y]=doorThreshold(o),outside=doorApproach(o),inside=doorApproach(o,true);
 assert(withinWalkIn(b,x,y),b.name+' threshold lies in perimeter');assert(!withinWalkIn(b,...outside));assert(withinWalkIn(b,...inside));
 setWalkInDoor(o,false,true);assert(inBuilding(b,x,y),'closed door blocks entry');setWalkInDoor(o,true,true);assert(!inBuilding(b,x,y),'open door clears threshold');
 assert(land(...outside),b.name+' outside approach is clear');assert(land(...inside),b.name+' inside approach is clear');
 const m=buildingDoorTransform(b),point=briarPoint([.53,0,0],0,m);assert(Math.hypot(point[0]-(x+.5),point[2]-(y+.5))<2,'door leaf matches the threshold');
}
const school=buildings.find(b=>b.service?.destination==='realm_briarhaven_3'),nell=tutorialTutor('fishing');assert(school.x>65,'school moved east');assert(Math.hypot(school.x-nell.x,school.y-nell.y)>35,'Nell has a clear shoreline');
for(const role of ['magic','bank']){const o=tutorialTutor(role),b=buildings.find(b=>b.service?.destination===o.interiorBuilding);assert(withinWalkIn(b,o.x,o.y),'tutor follows rotated room');assert(!inBuilding(b,o.x,o.y),'tutor not in a wall');}
const kitchen=buildings.find(b=>b.service?.destination==='village_kitchen');assert.equal(kitchen.doorFacing,'west','kitchen faces the village square');
for(const b of buildings.filter(b=>b!==kitchen&&b.walkIn)){const gap=Math.hypot(Math.max(b.x-kitchen.x-kitchen.w,kitchen.x-b.x-b.w,0),Math.max(b.y-kitchen.y-kitchen.h,kitchen.y-b.y-b.h,0));assert(gap>=5,kitchen.name+' has space around '+b.name);}
for(const o of [tutorialTutor('cooking'),tutorialObject('range')])assert(withinWalkIn(kitchen,o.x,o.y),'cooking lesson moved with its building');
assert(!objects.some(o=>fighter(o)&&withinWalkIn(kitchen,o.x,o.y)),'the new plot does not enclose a wandering resident');
const resumed=buildingResumePosition(worldScenes.overworld,{x:37,y:48,version:1});assert(withinWalkIn(kitchen,...resumed),'saved player follows the relocated kitchen');assert(land(...resumed),'resumed player is on clear interior ground');
assert.deepEqual(buildingResumePosition(worldScenes.overworld,{x:37,y:48,version:1,kitchenVersion:1}),[37,48],'new saves in the reclaimed space stay there');
assert.deepEqual(buildingResumePosition(worldScenes.overworld,{x:34,y:66}),[77,66],'old school save follows relocated room');
assert.deepEqual(buildingResumePosition(worldScenes.overworld,{x:58,y:67}),[58,69],'old bank save follows its rotated interior');
assert.deepEqual(buildingResumePosition(worldScenes.overworld,{x:77,y:66,version:1}),[77,66],'current saves do not rotate a second time');
for(const key of Object.keys(TREE_RESOURCES)){const a=treeAppearance({resourceId:key,id:1,race:'human'}),b=treeAppearance({resourceId:key,id:27,race:'elf'});assert.equal(a.model,b.model,'species retains its silhouette across regions');const mesh=rebuiltModels[a.model];assert(mesh.p.every(Number.isFinite));assert(mesh.i.every(i=>i<mesh.p.length/3));}
const poses=JSON.stringify(buildings.map(b=>[b.x,b.y,b.w,b.h,b.service?.x,b.service?.y]));setupExpandedWorld();setupTutorialVillage();assert.equal(JSON.stringify(buildings.map(b=>[b.x,b.y,b.w,b.h,b.service?.x,b.service?.y])),poses,'setup is idempotent');
console.log('PASS: four door orientations, collision and both approaches for every walk-in building, moved school/tutors and repeat setup.');
}`,ctx);
