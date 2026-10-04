'use strict';
const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`{
 screen={w:900,h:500};px=55;py=61;currentScene='overworld';buildings.length=0;landHeight=walkSurfaceHeight=()=>0;view3d.yaw=0;view3d.tilt=.3;view3d.zoom=80;meshFrame3++;
 const pose=cameraPose3(),center=project3(55.5,1.12,61.5),wall=(lo,hi)=>({points:[[lo,0,61.5],[hi,0,61.5],[hi,3,61.5],[lo,3,61.5]]});
 const courtyard={kind:'building',faces:[wall(52.5,54.5),wall(56.5,58.5)],instances:[]};
 assert(pointInHull3(center.x,center.y,buildingHull3(courtyard)),'old convex hull covers empty courtyard');
 assert.equal(buildingPick3(courtyard,center.x,center.y),null,'empty space between visible walls stays clickable ground');
 const wallPoint=project3(53.5,1.12,61.5);assert(buildingPick3(courtyard,wallPoint.x,wallPoint.y),'actual wall remains selectable');
 const ray=cameraRay3(center.x,center.y),behind=ray.eye.map((v,i)=>v-ray.dir[i]*2),hidden={kind:'building',faces:[{points:[[behind[0]-2,behind[1]-2,behind[2]],[behind[0]+2,behind[1]-2,behind[2]],[behind[0],behind[1]+2,behind[2]]]}],instances:[]};
 assert.equal(buildingPick3(hidden,center.x,center.y),null,'geometry behind the camera cannot intercept a floor click');
 const identity=[1,0,0,0,0,1,0,0,0,0,1,0],assembly={kind:'assembly',model:[1,0,0,55.5,0,1,0,0,0,0,1,61.5],faces:[],instances:[{mesh:{p:[-1,0,0,1,0,0,0,3,0],i:[0,1,2]},matrix:identity}]};
 assert(buildingPick3(assembly,center.x,center.y),'module picking follows its translated native parent');
 assert(pointInHull3(center.x,center.y,buildingHull3(assembly)),'selection hull follows the same parent transform');
 hitboxes=[{o:{id:'neighbor'},building:{name:'Neighbor'},buildingMesh:courtyard,get polygon(){return buildingHull3(courtyard);},depth:999}];
 assert.equal(worldHits3(center.x,center.y).length,0,'primary and context selection leave empty floor clear');
 assert.equal(worldHits3(wallPoint.x,wallPoint.y)[0].o.id,'neighbor','visible building walls still select their service');
}`,ctx);
console.log('PASS: empty courtyards and behind-camera buildings do not steal floor clicks; visible walls, native parent transforms, primary/context selection and depth picking remain accurate.');
