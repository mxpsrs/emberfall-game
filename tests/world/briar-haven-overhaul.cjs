'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fixture=require('../../scripts/world/native-world-fixture.cjs');
(async()=>{
 const {ctx,run,capture}=await fixture();
 run('setupExpandedWorld();setupTutorialVillage();setupLoot();');capture();
 const accepted=JSON.parse(fs.readFileSync('tests/fixtures/briar-haven-accepted-identities.json','utf8'));
 assert.equal(accepted.buildings.length,12);
 await ctx.VeldrenSceneOwnership.migrateWorld();
 const native=ctx.realmNative.scenes,scene=run('worldScenes.overworld');
 const buildings=scene.buildings.filter(b=>b.settlement==='briarhaven');
 assert.deepEqual(Array.from(buildings,b=>b._sceneEntityId).sort(),accepted.buildings,'replanning preserves the twelve existing building IDs');
 // Existing actor/resource/prop identities come from the accepted checkpoint,
 // independently of changed names, coordinates and room placement.
 const saved=native.serialize(),overworld=saved.scenes.find(s=>s.scene==='overworld'),ids=new Set(overworld.entities.map(e=>e.id));
 ctx.acceptedIds=Object.fromEntries(['props','actors','services','parts'].map(kind=>[kind,run('BRIARHAVEN_GENERATION_IDENTITIES['+JSON.stringify(kind)+']')]));
 for(const kind of ['actors','services'])for(const id of Object.values(ctx.acceptedIds[kind]))assert(ids.has(id),'preserved '+kind+' ID '+id);
 for(const values of Object.values(ctx.acceptedIds.parts))for(const id of values)assert(ids.has(id),'preserved structural child '+id);
 const layouts=new Set(buildings.map(b=>JSON.stringify(b.briarDesign.volumes)));assert(layouts.size>=10,'houses have different structural plans, including extensions and open work bays');
 assert(buildings.every(b=>b.assembly),'Briar buildings enter the runtime as canonical native modules, without editor activation');
 const B=ctx.VeldrenBuildingScene,b=buildings[0],first=B.renderAssembly(b);
 const snapshot=B.assemblySnapshot(b);
 assert.strictEqual(B.assemblySnapshot(b),snapshot,'collision reads reuse one immutable native assembly projection');
 assert(Object.isFrozen(snapshot)&&Object.isFrozen(snapshot.modules)&&Object.isFrozen(snapshot.modules[0].local),'read projections cannot mutate canonical Scene data');
 assert.throws(()=>{snapshot.modules[0].local[3]+=1;},TypeError);
 assert.equal(B.renderAssembly(b),first,'unchanged native building projections are reused');
 const restore=node=>{const value=JSON.parse(JSON.stringify(node));delete value.worldMatrix;delete value.activeInHierarchy;return value;};
 const move=node=>{const transform=restore(node).transform;if(transform.affine){transform.affine[12]+=.25;return transform;}return {...transform,position:transform.position.map((v,i)=>v+(i===0?.25:0))};};
 const actorId=native.componentIds('overworld','GeneratedSpawn').find(id=>!native.entity('overworld',id).children?.length),actor=native.entity('overworld',actorId);
 assert(actor,'the cache regression uses an actual independent native actor');
 assert(native.setTransform('overworld',actorId,move(actor)));assert.equal(B.renderAssembly(b),first,'unrelated actor motion retains the building projection');assert.strictEqual(B.assemblySnapshot(b),snapshot,'actor motion retains the immutable collision projection');assert(native.upsert('overworld',restore(actor)));
 const moduleId=native.componentIds('overworld','BuildingModule').find(id=>{const n=native.entity('overworld',id);return n.components.BuildingPart.building===b._sceneEntityId&&n.components.BuildingModule.role==='wall';}),module=native.entity('overworld',moduleId);
 assert(native.setTransform('overworld',moduleId,move(module)));const edited=B.renderAssembly(b);assert.notEqual(edited,first,'a real native wall edit refreshes geometry');assert.notDeepEqual(edited.instances.find(i=>i.entityId===moduleId).matrix,first.instances.find(i=>i.entityId===moduleId).matrix);assert(native.upsert('overworld',restore(module)));
 const restoredSnapshot=B.assemblySnapshot(b);assert.notStrictEqual(restoredSnapshot,snapshot,'module edits invalidate the collision projection');assert.deepEqual(restoredSnapshot.modules,snapshot.modules,'restored native modules project their original collision data');
 const group=native.entity('overworld',native.entity('overworld',b._sceneEntityId).parent),beforeGroup=B.renderAssembly(b);
 native.batch(()=>assert(native.setTransform('overworld',group.id,move(group))));const movedGroup=B.renderAssembly(b);assert.notEqual(movedGroup,beforeGroup,'batched parent movement refreshes descendant projections');assert.equal(movedGroup.model[3],beforeGroup.model[3]+.25);assert(native.upsert('overworld',restore(group)));
 const beforePortal=B.assemblySnapshot(b),portal=native.entity('overworld',b.service._sceneEntityId);assert(native.setTransform('overworld',portal.id,move(portal)));const movedPortal=B.assemblySnapshot(b);assert.notStrictEqual(movedPortal,beforePortal,'native entrance movement invalidates the collision projection');assert.notDeepEqual(movedPortal.modules.find(m=>m.role==='entrance').opening,beforePortal.modules.find(m=>m.role==='entrance').opening,'collision opening follows the actual native portal');assert(native.upsert('overworld',restore(portal)));
 b._cutaway=true;const cutaway=B.renderAssembly(b);assert(cutaway.instances.length<first.instances.length,'occupied cutaways refresh the cached projection');b._cutaway=false;
 ctx.VELDREN_CONTEXT='editor';assert.notEqual(B.renderAssembly(b),B.renderAssembly(b),'editor visibility and floor tools always receive fresh projections');delete ctx.VELDREN_CONTEXT;
 ctx.VELDREN_CONTEXT='editor';assert.notStrictEqual(B.assemblySnapshot(b),B.assemblySnapshot(b),'editor read projections always reflect current authoring');delete ctx.VELDREN_CONTEXT;
 const projectionStart=performance.now();for(let frame=0;frame<120;frame++)for(const building of buildings)B.renderAssembly(building);console.log('Native building projection benchmark:',JSON.stringify({frames:120,buildings:buildings.length,totalMs:Math.round((performance.now()-projectionStart)*100)/100}));
 const beforeReload=B.renderAssembly(b);assert(native.load(saved));assert.notEqual(B.renderAssembly(b),beforeReload,'loading the authoritative scene refreshes render projections');
 ctx.testBuildings=buildings;
 run(`
 s.tutorialReward=true;s.tutorial=tutorialSteps.length;activateScene('overworld',42,51,false);
 for(const b of testBuildings){
  const a=VeldrenBuildingScene.ensureAssembly(b),A=VeldrenAssembly;
  assert(a.modules.every(m=>m.local.every(Number.isFinite)),b.name+' finite authored transforms');
  const leaves=a.modules.filter(m=>m.role==='entrance');assert.equal(leaves.length,1,b.name+' has one usable door');
  assert(a.modules.some(m=>m.id===leaves[0].host&&/Wall.*Door/.test(m.model)),b.name+' door is linked to its actual wall opening');
  const [tx,tz]=doorThreshold(b.service);setWalkInDoor(b.service,false,true);assert(inBuilding(b,tx,tz),b.name+' closed door blocks');
  const outsideClosed=doorApproach(b.service,false),insideClosed=doorApproach(b.service,true);
  activateScene('overworld',...outsideClosed,false);
  if(!b.briarDesign.volumes.some(v=>v.open))assert(!route(...insideClosed),b.name+' closed door cannot be bypassed through an adjacent wall');
  setWalkInDoor(b.service,true,true);assert(!inBuilding(b,tx,tz),b.name+' opened door clears the opening');
  const outside=doorApproach(b.service,false),inside=doorApproach(b.service,true);
  activateScene('overworld',...outside,false);assert(route(...inside),b.name+' entrance approach reaches its interior');
  activateScene('overworld',...inside,false);assert(route(...outside),b.name+' interior reaches the exterior approach');
  for(const v of b.briarDesign.volumes){
   const r=briarVolumeWorldRect(b,v);
   for(let z=r.y+.75;z<r.y+r.h;z+=1.5)for(let x=r.x+.75;x<r.x+r.w;x+=1.5){
    const p=A.point(A.inverse(a.parent),[x,0,z]);
    assert(a.modules.some(m=>m.role==='floor'&&m.floor===0&&(()=>{const q=A.point(A.inverse(m.local),p),lo=m.bounds[0],hi=m.bounds[1];return q[0]>=lo[0]-.03&&q[0]<=hi[0]+.03&&q[2]>=lo[2]-.03&&q[2]<=hi[2]+.03;})()),b.name+' has a real floor under '+x+','+z);
   }
  }
  const full=VeldrenBuildingScene.renderAssembly(b);b._cutaway=true;const cut=VeldrenBuildingScene.renderAssembly(b);b._cutaway=false;
  assert.strictEqual(VeldrenBuildingScene.renderAssembly(b),VeldrenBuildingScene.renderAssembly(b),b.name+' unchanged runtime projection is reused');
  assert(cut.instances.length>0&&cut.instances.length<full.instances.length,b.name+' cutaway keeps structure');
  assert(a.modules.some(m=>m.role==='wall'&&m.floor===0)&&a.modules.some(m=>m.role==='floor'&&m.floor===0),b.name+' retains ground walls and floors');
  if(b.civilUpper){const {ramp,decks}=b.civilUpper,lo=[Math.floor(ramp.x+ramp.w/2+1e-6),Math.floor(ramp.y+ramp.h-1+1e-6)],hi=[Math.floor(ramp.x+ramp.w/2+1e-6),Math.floor(ramp.y+1e-6)];
   activateScene('overworld',...lo,false);const ascent=route(...hi);if(!ascent)console.log('STAIR DEBUG',b.name,JSON.stringify({lo,hi,ramp:[ramp.x,ramp.y,ramp.w,ramp.h],samples:Array.from({length:Math.ceil(ramp.h)},(_,i)=>{const x=lo[0],z=Math.floor(ramp.y)+i;return {x,z,height:walkSurfaceHeight(x+.5,z+.5),wall:worldWall(x,z),terrain:terrainCellBlocked(x,z),resource:VeldrenGatherableScene.blocked(currentScene,x,z),service:VeldrenServiceScene.blocked(currentScene,x,z),building:inBuilding(b,x,z),blocked:blocked(x,z),objects:objects.filter(o=>Math.hypot(o.x-x,o.y-z)<1.6).map(o=>[o.name,o.x,o.y,o.civilUpper,o.walkThrough])};})}));assert(ascent,b.name+' stairs ascend continuously');activateScene('overworld',...hi,false);assert(route(...lo),b.name+' stairs descend continuously');
   for(const d of decks)assert(briarFootprintContains(b,d.x+d.w/2,d.y+d.h/2),b.name+' loft has supported footprint');
   for(const o of objects.filter(o=>o.interiorBuilding===b.service.destination&&o.civilUpper)){assert(decks.some(d=>o.x+.5>=d.x&&o.x+.5<=d.x+d.w&&o.y+.5>=d.y&&o.y+.5<=d.y+d.h),b.name+' upper furniture stays on its loft: '+o.name);}
   activateScene('overworld',...hi,false);b._cutaway=true;
   const upstairs=VeldrenBuildingScene.renderAssembly(b);
   assert(upstairs.instances.some(i=>{const m=realmNative.scenes.entity('overworld',i.entityId).components.BuildingModule;return m.role==='floor'&&m.floor===1;}),b.name+' keeps its actual upstairs floor visible under the player during cutaway');
   const previous=upstairs;activateScene('overworld',...lo,false);
   assert.notEqual(VeldrenBuildingScene.renderAssembly(b),previous,b.name+' changing occupied floors refreshes the derived visibility');b._cutaway=false;
  }
 }
 const school=testBuildings.find(b=>b.service.destination==='realm_briarhaven_3');assert(school.civilUpper,'Magic School has a supported library loft');
 const schoolGeometry=VeldrenBuildingScene.renderAssembly(school);for(const color of ['#86c6d6','#779fc6','#be9cde','#8eb9a3'])assert(schoolGeometry.faces.some(f=>f.color===color),'the School entrance visibly carries its four-facet Relic identity');
 const courtyardInn=testBuildings.find(b=>b.service.destination==='inn');
 assert(!withinWalkIn(courtyardInn,36,49),'the inn courtyard outside its L-shaped floor is outdoors');
 assert(!buildingRoofHidden(courtyardInn,36,49),'standing in that courtyard retains the complete inn roof');
 const altar=worldScenes.overworld.objects.find(o=>o.relicKey==='altar');assert(altar,'Relic shaping service is retained');
 activateScene('overworld',75,76,false);assert(route(altar.x,altar.y,true), 'Relic shaping remains accessible from the school door');
 activateScene('overworld',64,115,false);screen.w=1920;screen.h=1080;Object.assign(view3d,{yaw:-2.05,tilt:.29,zoom:102});
 const copper=testBuildings.find(b=>b.service.destination==='civil_briarhaven_4'),pose=cameraPose3();
 assert(!withinWalkIn(copper,pose.eye[0],pose.eye[2]),'the actual town-edge follow camera stays outside Copper House native wall modules');
 `);
 const roundtrip=native.serialize();assert(native.load({format:'veldren.world',version:2,scenes:[]}));assert(native.load(roundtrip));
 assert.equal(JSON.stringify(native.serialize()),JSON.stringify(roundtrip),'building plans, IDs, modular pieces, stairs and doors serialize unchanged');
 assert.equal(run("worldScenes.overworld.buildings.filter(b=>b.briarDesign).length"),12);
 ctx.realmNative.destroy();
 console.log('PASS: twelve distinct Briar Haven plans, accepted entity IDs, complete real floor coverage, linked door/collision, structural cutaways, supported loft furniture, stair travel, Relic access and native serialization.');
})().catch(error=>{console.error(error);process.exitCode=1;});
