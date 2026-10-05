'use strict';
const assert=require('node:assert/strict');
const fixture=require('../../scripts/world/native-world-fixture.cjs');
(async()=>{
 const {ctx,run,capture}=await fixture();
 assert(await ctx.VeldrenPrebuiltWorld.load());capture();assert(await ctx.VeldrenPrebuiltWorld.activateNative());
 ctx.assert=assert;
 run(`
 s.tutorialReward=true;s.tutorial=tutorialSteps.length;activateScene('overworld',55,61,false);
 const tour=buildings.filter(b=>b.walkIn&&b.service),samples=[];
 for(const b of tour){setWalkInDoor(b.service,true,true);for(const p of [doorApproach(b.service,false),doorApproach(b.service,true)])samples.push({b,p});}
 const briar=tour.filter(b=>b.briarDesign);
 for(const b of briar){
  for(let z=b.y+1;z<b.y+b.h-1;z+=2)for(let x=b.x+1;x<b.x+b.w-1;x+=2)if(withinWalkIn(b,x,z)&&!inBuilding(b,x,z))samples.push({b,p:[x,z]});
  if(b.civilUpper){const r=b.civilUpper.ramp;samples.push({b,p:[r.x+1,r.y+r.h-1]},{b,p:[r.x+1,r.y+1]});}
 }
 const canonical=JSON.stringify(realmNative.scenes.serialize()),progress=JSON.stringify({bag:s.bag,bank:s.bank,xp:s.xp,character:s.character});
 let poses=0,terrainStops=0,hiddenModules=0,visibleModules=0;
 for(const {b,p}of samples){
  px=p[0];py=p[1];b._cutaway=buildingRoofHidden(b);
  for(const [w,h]of [[1112,512],[1920,1080]])for(const yaw of [-Math.PI,-Math.PI/2,0,Math.PI/2])for(const tilt of [.22,.7]){
   screen.w=w;screen.h=h;Object.assign(view3d,{yaw,tilt,zoom:poses%2?58:132});meshFrame3++;
   const manual=JSON.stringify(view3d),pose=cameraPose3();assert(pose.eye.every(Number.isFinite));assert.equal(JSON.stringify(view3d),manual,'building traversal preserves manual camera settings');
   if(cameraFollow3.terrainBlocked)terrainStops++;else assert(pose.distance>=Math.min(3.2,cameraFocalLength3()/cameraZoom3())-1e-8,b.name+' retains a usable follow distance');
   poses++;
   if(b.briarDesign){const rendered=VeldrenBuildingScene.renderAssembly(b);for(const i of rendered.instances){const m=VeldrenAssembly.multiply(rendered.model,i.matrix);if(cameraMeshHidden3(i.mesh,m))hiddenModules++;else visibleModules++;}}
  }
 }
 assert(hiddenModules>0,'the building tour exercises actual blocking native modules');assert(visibleModules>hiddenModules,'local cutaways retain the surrounding architecture');
 assert.equal(JSON.stringify(realmNative.scenes.serialize()),canonical,'camera movement and cutaways never rewrite the canonical world');
 assert.equal(JSON.stringify({bag:s.bag,bank:s.bank,xp:s.xp,character:s.character}),progress,'camera traversal preserves player progress');
 console.log(JSON.stringify({pass:true,buildings:tour.length,briarBuildings:briar.length,samples:samples.length,poses,terrainStops,hiddenModules,visibleModules}));
 `);
 ctx.realmNative.destroy();
})().catch(error=>{console.error(error);process.exitCode=1;});
