'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('client/view3d.js','utf8'),camera=source.slice(0,source.indexOf('function boundedViewPoint3'));
function fixture(editor=false){let clock=0;const ctx={assert,Math,performance:{now:()=>clock},window:{VELDREN_CONTEXT:editor?'editor':'game'},localStorage:{getItem:()=>null},screen:{w:1920,h:1080},px:50,py:60,currentScene:'overworld',meshFrame3:0,walkSurfaceHeight:()=>1,buildings:[],inBuilding:(b,x,z)=>x>=b.x&&x<b.x+b.w&&z>=b.y&&z<b.y+b.h&&(x===b.x||z===b.y||x===b.x+b.w-1||z===b.y+b.h-1),buildingRoofHidden:()=>false};vm.createContext(ctx);vm.runInContext(camera,ctx);return {ctx,run:s=>vm.runInContext(s,ctx),tick:ms=>{clock+=ms;ctx.meshFrame3++;}};}
const f=fixture();
f.run(`for(const yaw of [-2.6,0,1.2,3.0])for(const tilt of [.22,.45,.70])for(const zoom of [58,102,132]){
 Object.assign(view3d,{yaw,tilt,zoom});const pose=cameraPose3();
 assert.equal(pose.fov,54);assert.equal(pose.anchor,.64);assert.equal(pose.near,.12);
 for(const [x,z]of [[50.5,60.5],[51,61],[49,62]]){const projected=project3(x,0,z),picked=unproject3(projected.x,projected.y);assert(Math.hypot(picked.x-x,picked.z-z)<1e-8,'projection and screen picking share orbit, pitch, zoom and player anchor');}
}`);
const initial=f.run('cameraPose3().yaw');f.tick(16);f.run('view3d.yaw+=.5');const first=f.run('cameraPose3().yaw');assert(first>initial&&first<initial+.5,'manual orbit eases monotonically');
for(let i=0;i<40;i++){f.tick(16);f.run('cameraPose3()');}assert(Math.abs(f.run('cameraPose3().yaw')-initial-.5)<.001);
const obstruct=fixture();obstruct.run('view3d.yaw=0;view3d.tilt=.25');const clear=obstruct.run('cameraPose3().distance');obstruct.ctx.buildings=[{x:48,y:63,w:6,h:7}];obstruct.tick(16);const close=obstruct.run('cameraPose3().distance');assert(close<clear&&close>1,'wall obstruction pulls camera forward before clipping');
obstruct.ctx.buildings=[];obstruct.tick(16);const eased=obstruct.run('cameraPose3().distance');assert(eased>close&&eased<clear,'obstruction release eases outward');
const terrain=fixture();terrain.ctx.walkSurfaceHeight=(x,z)=>z>63?8:1;terrain.run('view3d.yaw=0;view3d.tilt=.22');assert(terrain.run('cameraPose3().distance')<clear,'terrain obstruction prevents underground camera');
const porch=fixture();porch.ctx.buildings=[{x:48,y:65,w:6,h:2,_generatedBuildingEntity:true,_sceneEntityId:'inn'}];
porch.ctx.realmNative={scenes:{entity(_scene,id){return id==='inn'?{components:{ModularBuilding:{modules:['awning']}}}:{activeInHierarchy:true,worldMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],components:{BuildingModule:{role:'detail',floor:0},MeshGeometry:{faces:[{points:[[48,2,62],[53,2,62],[53,5,62],[48,5,62]]}]}}};}}};
porch.run('view3d.yaw=0;view3d.tilt=.25');assert(porch.run('cameraPose3().distance')<clear/2,'canonical porch geometry outside the wall footprint stops the camera');
porch.ctx.landHeight=()=>10;porch.ctx.landSurfaceRevision=1;
assert.equal(porch.run('cameraStructureDistance3(buildings[0],[50,4,60],[0,0,1],10)'),10,'terrain edits invalidate cached porch triangles and keep camera obstruction aligned with rendered ground');
const moduleWall=fixture();vm.runInContext(fs.readFileSync('client/building-assembly.js','utf8'),moduleWall.ctx);
moduleWall.ctx.buildings=[{x:48,y:65,w:6,h:2,_generatedBuildingEntity:true,_sceneEntityId:'native-wall'}];
moduleWall.ctx.realmNative={scenes:{entity(_scene,id){return id==='native-wall'?{components:{ModularBuilding:{modules:['panel']}}}:{activeInHierarchy:true,worldMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,50.5,0,62,1],components:{BuildingModule:{role:'wall',floor:0},MeshRenderer:{asset:'rebuilt:Wall_Plaster_Straight'},MeshBounds:{bounds:[[-1,0,-.03],[1,3.12,.03]]}}};}}};
moduleWall.run('view3d.yaw=0;view3d.tilt=.25');assert(moduleWall.run('cameraPose3().distance')<clear/2,'native thin wall bounds stop the camera without navigation samples or procedural faces');
const doorway=moduleWall.ctx.VeldrenAssembly.identity(),vertices=[],indices=[];
for(const [x1,x2,y1,y2]of [[-1,-.5,0,3],[.5,1,0,3],[-.5,.5,2.1,3]]){const start=vertices.length/3;vertices.push(x1,y1,2,x2,y1,2,x2,y2,2,x1,y2,2);indices.push(start,start+1,start+2,start,start+2,start+3);}
moduleWall.ctx.doorCollider={inverse:doorway,bounds:[[-1,0,2],[1,3,2.03]],mesh:{p:Float32Array.from(vertices),i:Uint16Array.from(indices)}};
assert.equal(moduleWall.run('cameraModuleRay3(doorCollider,[0,1,0],[0,0,1],10)'),null,'an open authored doorway retains its opening');
assert.equal(moduleWall.run('cameraModuleRay3(doorCollider,[0,2.5,0],[0,0,1],10)'),2,'the lintel above an open door still stops a high camera');
const editor=fixture(true);editor.ctx.buildings=[{x:48,y:61,w:6,h:7}];const ep=editor.run('cameraPose3()');assert.equal(ep.target,0);assert.equal(ep.anchor,.82);assert(ep.distance>3,'detached editor can inspect a building without player collision');editor.tick(16);editor.run('view3d.yaw+=1');assert.equal(editor.run('cameraPose3().yaw'),ep.yaw+1,'editor movement remains immediate');
console.log('PASS: shared camera projection/picking over 36 poses, smooth manual orbit, wall/terrain obstruction, recovery, and independent editor camera.');
