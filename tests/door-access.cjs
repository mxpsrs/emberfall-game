const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
renderUI=renderAction=renderTutorial=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
s.tutorial=tutorialSteps.length;s.tutorialReward=true;assetsReady=true;
const errors=[];let checked=0,castles=0;
const settle=()=>{for(let i=0;i<600;i++){time+=.05;advanceMovement(.05);updateDoorThreshold();if(!path.length&&!pendingWalkInDoor&&Math.hypot(px-s.x,py-s.y)<.02)return;}throw Error('Door approach did not settle');};
for(const [scene,world]of Object.entries(worldScenes)){
 s.tutorialReward=scene!=='tutorial';s.tutorial=scene==='tutorial'?0:tutorialSteps.length;
 for(const b of world.buildings.filter(b=>b.walkIn)){
  const o=b.service,outside=doorApproach(o),inside=doorApproach(o,true);
  activateScene(scene,...outside,false);assert.equal(currentScene,scene,'audit must use the requested scene');setWalkInDoor(o,false,true);
  if(Math.hypot(px-outside[0],py-outside[1])>.01||!land(...outside)){errors.push(b.name+': outside approach blocked');continue;}
  const chosen=.72;view3d.tilt=chosen;
  engage(o);settle();
  if(o.openedAt===undefined){errors.push(b.name+': opening failed');continue;}
  assert(!buildingRoofHidden(b),'an open door keeps the exterior roof before entry');
  if(!walkTo(...inside)){errors.push(b.name+': open doorway route failed');continue;}
  settle();assert(withinWalkIn(b,px,py),b.name+' actual entry');assert(buildingRoofHidden(b),b.name+' entry opens the occupied-room cutaway');assert.equal(cameraPitch3(),chosen,'entry cannot adjust camera');
  if(!walkTo(...outside)){errors.push(b.name+': exit route failed');continue;}
  settle();assert(!buildingRoofHidden(b),b.name+' exit restores the roof while the door remains open');engage(o);settle();assert(o.openedAt===undefined,b.name+' close after exit');
  assert(!buildingRoofHidden(b),'closed exterior keeps the roof');checked++;
  if(b.civilCastle){
   castles++;screen={w:1112,h:512};view3d.zoom=34;view3d.yaw=-.55;
   const m=buildingDoorTransform(b),[gx,gy]=doorThreshold(o);
   assert(Math.abs(m[11]-(gy+.54))<.001,'castle leaf aligns with actual gate');
   const emitted=[];
   const painter={face(){},indexed(mesh,matrix){if(mesh===rebuiltModels.Door_1_Round)emitted.push(Array.from(matrix));},flush(){}};
   drawRealmCrossings(painter);
   assert(emitted.some(matrix=>matrix.every((v,i)=>Math.abs(v-m[i])<.001)),b.name+' closed gate is rendered from outside');
   const polygon=[[-.05,0,0],[1.08,0,0],[1.08,2.36,0],[-.05,2.36,0]].map(p=>project3(...briarPoint(p,0,m)));
   const sx=polygon.reduce((n,p)=>n+p.x,0)/4,sy=polygon.reduce((n,p)=>n+p.y,0)/4;
   hitboxes=[{polygon,o,door:true,depth:1}];assert.equal(worldHits3(sx,sy)[0]?.o,o,'visible gate target selects the actual door');
   canvas.getBoundingClientRect=()=>({left:0,top:0,width:screen.w,height:screen.h});
   clickWorld3({clientX:sx,clientY:sy});settle();assert(o.openedAt!==undefined,b.name+' gate click opens');
   assert(walkTo(...inside));settle();assert(withinWalkIn(b,px,py));
  }
 }
}
assert.deepEqual(errors,[]);assert.equal(castles,3);assert(checked>=188);
console.log('PASS: '+checked+' building doors open, enter, exit and close; all three castle gate models and click targets are present; entry never moves the camera.');
`,ctx);
