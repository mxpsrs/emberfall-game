'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{performance}=require('node:perf_hooks');
const fixture=require('../../scripts/world/native-world-fixture.cjs');
(async()=>{
 const {ctx,run,capture}=await fixture();
 run('setupExpandedWorld();setupTutorialVillage();setupLoot();');capture();
 await ctx.VeldrenSceneOwnership.migrateWorld();
 run(`
 renderUI=renderAction=renderTutorial=save=()=>{};s.tutorial=tutorialSteps.length;s.tutorialReward=true;activateScene('overworld',64,115,false);
 // Independent reference: the original modular/legacy building predicates and
 // original eight-samples-per-tile ray, applied to the same native Scene.
 function referenceBuilding(b,x,z){
  const A=VeldrenAssembly,B=VeldrenBuildingScene,a=b.assembly&&B.assemblySnapshot(b);
  if(a){const p=A.point(A.inverse(a.parent),[x+.5,0,z+.5]),entrance=a.modules.find(m=>m.role==='entrance');
   if(entrance?.opening){const o=entrance.opening;if(Math.hypot(p[0]-(o.service[0]-o.normal[0]+.5),p[2]-(o.service[2]-o.normal[2]+.5))<.72)return b.service?.openedAt===undefined;}
   return a.modules.some(m=>{if(m.floor!==0||!['wall','window'].includes(m.role))return false;const q=A.point(A.inverse(m.local),p);return q[0]>=m.bounds[0][0]-.12&&q[0]<=m.bounds[1][0]+.12&&q[2]>=Math.min(m.bounds[0][2]-.12,b.briarDesign?-.52:0)&&q[2]<=m.bounds[1][2]+.12;});
  }
  const m=B.matrices.row(realmNative.scenes.entity(b._generatedSceneName,b._sceneEntityId).worldMatrix),p=A.point(A.inverse(m),[x+.5,m[7],z+.5]),logical=B.getView(b._generatedSceneName,b._sceneEntityId,b._sceneEntityId),tx=Math.floor(p[0]+1e-7)+m[3],tz=Math.floor(p[2]+1e-7)+m[11],tiles=logical.civilWallTiles;
  if(!tiles)return civilBuildingBefore(logical,tx,tz);if(tiles.has(tx+':'+tz))return true;const [dx,dz]=doorThreshold(logical.service);return tz===dz&&Math.abs(tx-dx)<=(logical.civilGateHalfWidth||0)&&logical.service.openedAt===undefined;
 }
 function referenceSight(ax,az,bx,bz){const steps=Math.ceil(Math.hypot(bx-ax,bz-az)*8);for(let i=1;i<steps;i++){const x=Math.round(ax+(bx-ax)*i/steps),z=Math.round(az+(bz-az)*i/steps);if(x===ax&&z===az||x===bx&&z===bz)continue;if(worldWall(x,z)||buildings.some(b=>referenceBuilding(b,x,z))||worldObjectsAt(x,z).some(o=>(o.type==='tree'||o.blocksSight&&!o.penFence&&!/fence/i.test(o.name||''))&&o.x===x&&o.y===z))return false;}return true;}
 var rays=[[64,115,70,115],[43,75,49,75],[44,69,50,71],[64.25,115.1,69.8,117.4],[43,75,43,75],[49,75,43,75]];
 for(const ray of rays)assert.equal(lineOfSight(...ray),referenceSight(...ray),'shot/corner parity '+ray);
 const B=VeldrenBuildingScene,A=VeldrenAssembly,native=realmNative.scenes;
 var modular=buildings.find(b=>b.briarDesign),legacy=buildings.find(b=>!b.assembly&&b.civilWallTiles);
 assert(modular&&legacy);
 function check(b){const n=native.entity('overworld',b._sceneEntityId),x=n.worldMatrix[12],z=n.worldMatrix[14];for(let dz=-2;dz<=b.h+2;dz+=1.3)for(let dx=-2;dx<=b.w+2;dx+=1.3){const px=x+dx,pz=z+dz,expected=referenceBuilding(b,px,pz);assert.equal(inBuilding(b,px,pz),expected,'exact building predicate');if(expected)assert(B.sightBlockedAt(px,pz),'spatial query retains a colliding module');}}
 for(const b of [modular,legacy])check(b);
 const threshold=doorThreshold(modular.service);setWalkInDoor(modular.service,false,true);assert(B.sightBlockedAt(...threshold));setWalkInDoor(modular.service,true,true);assert.equal(inBuilding(modular,...threshold),referenceBuilding(modular,...threshold));assert.equal(B.sightBlockedAt(...threshold),buildings.some(b=>referenceBuilding(b,...threshold)),'opening the door invalidates the spatial index');setWalkInDoor(modular.service,false,true);
 var originalRoot=JSON.parse(JSON.stringify(native.entity('overworld',modular._sceneEntityId)));
 for(const transform of [{position:[88,0,133],rotation:[0,Math.sin(.4),0,Math.cos(.4)],scale:[1.3,1,.8]},{position:[88,0,133],rotation:[Math.sin(.2),0,0,Math.cos(.2)],scale:[1,1.2,1]}]){assert(native.setTransform('overworld',modular._sceneEntityId,transform));check(modular);}
 delete originalRoot.worldMatrix;delete originalRoot.activeInHierarchy;assert(native.upsert('overworld',originalRoot));
 var wallId=native.componentIds('overworld','BuildingModule').find(id=>{const n=native.entity('overworld',id);return n.components.BuildingPart.building===modular._sceneEntityId&&n.components.BuildingModule.role==='wall'&&n.components.BuildingModule.floor===0;}),originalWall=JSON.parse(JSON.stringify(native.entity('overworld',wallId)));
 const moved=JSON.parse(JSON.stringify(originalWall.transform));if(moved.affine)moved.affine[12]+=40;else moved.position[0]+=40;assert(native.setTransform('overworld',wallId,moved));
 const wall=native.entity('overworld',wallId);let found=false;for(let dz=-2;dz<=2;dz+=.4)for(let dx=-2;dx<=2;dx+=.4){const x=wall.worldMatrix[12]+dx,z=wall.worldMatrix[14]+dz;if(referenceBuilding(modular,x,z)){found=true;assert(B.sightBlockedAt(x,z),'moved wall outside nominal building bounds still blocks shots');}}assert(found);
 delete originalWall.worldMatrix;delete originalWall.activeInHierarchy;assert(native.upsert('overworld',originalWall));
 // Scene/door changes above must not alter integer or fractional ray semantics.
 for(const ray of rays)assert.equal(lineOfSight(...ray),referenceSight(...ray));
 `);
 // Measure real production queries with every generated building and actor.
 // Operation counts are the regression gate; timings are CPU-only evidence.
 const ray=[64,115,70,115];ctx.ray=ray;
 run('lineOfSight(...ray);var exactQueries=0,oldIn=inBuilding;inBuilding=function(...args){exactQueries++;return oldIn(...args);};');
 const start=performance.now();run('for(let i=0;i<120;i++)lineOfSight(...ray);');const optimizedMs=performance.now()-start,checks=run('exactQueries');
 run('inBuilding=oldIn;');
 const oldStart=performance.now();run('for(let i=0;i<6;i++)referenceSight(...ray);');const referenceMs=(performance.now()-oldStart)*20;
 assert(checks<run('buildings.length')*120,'ranged checks exclude distant buildings');
 assert(optimizedMs<referenceMs*.15,'clear ranged rays cost under 15% of the original queries');
 console.log(JSON.stringify({pass:true,frames:120,ray,buildings:run('buildings.length'),exactBuildingQueries:checks,optimizedCpuMs:+optimizedMs.toFixed(2),referenceCpuMsFor120:+referenceMs.toFixed(2),reductionPercent:+((1-optimizedMs/referenceMs)*100).toFixed(2),verification:'native WASM CPU and collision checks; browser/device FPS unverified'}));
 ctx.realmNative.destroy();
})().catch(e=>{console.error(e);process.exitCode=1;});
