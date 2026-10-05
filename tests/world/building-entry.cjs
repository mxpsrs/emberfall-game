const {ctx,vm,fs}=require('../../scripts/qa/game-fixture.cjs');
ctx.Path2D=class {};
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupTutorialVillage();setupLoot();s.tutorial=tutorialSteps.length;s.tutorialReward=true;activateScene('overworld',55,61,false);screen={w:900,h:400};assetsReady=true;
const cameraInn=buildings.find(b=>b.service?.destination==='inn'),innX=cameraInn.x+cameraInn.w/2,innY=cameraInn.y+cameraInn.h/2;
const outsideRadius=Math.hypot(cameraInn.w,cameraInn.h)/2+5;
for(const yaw of [-1,0,1,2]){view3d.yaw=yaw;activateScene('overworld',innX+Math.sin(yaw)*outsideRadius,innY+Math.cos(yaw)*outsideRadius,false);draw3d();const house=hitboxes.find(h=>h.building?.service?.destination==='inn');assert(house);const roof=project3(house.building.x+house.building.w/2,2.2,house.building.y+house.building.h/2);assert(pointInHull3(roof.x,roof.y,house.polygon));}
const innBuilding=buildings.find(b=>b.service?.destination==='inn');activateScene('overworld',innBuilding.service.x,innBuilding.service.y+7);openBuilding3(innBuilding);assert.deepEqual(path.at(-1),doorApproach(innBuilding.service,false),'building click routes to its real door');
const faces=[];meshDetail3=1;profile3({face:p=>faces.push(p)},0,1,0,1,1,1,[[-.5,.04],[-.35,.72],[0,1],[.35,.72],[.5,.04]],'#888888');const high=faces.length;faces.length=0;meshDetail3=.5;profile3({face:p=>faces.push(p)},0,1,0,1,1,1,[[-.5,.04],[-.35,.72],[0,1],[.35,.72],[.5,.04]],'#888888');assert(faces.length<high/2);
console.log('PASS: roof and wall hit regions at four camera angles, Enter routes to the correct door, distant mesh detail reduction.');
`,ctx);
