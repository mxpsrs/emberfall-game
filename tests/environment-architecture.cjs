const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
renderUI=renderAction=renderTutorial=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
s.tutorial=tutorialSteps.length;s.tutorialReward=true;activateScene('overworld',55,61,false);
const sample=buildings.filter(b=>b.walkIn&&!b.civilCastle).slice(0,20);
assert(sample.length>=20);
for(const b of sample){
 const outside=doorApproach(b.service),inside=doorApproach(b.service,true);
 for(let cycle=0;cycle<10;cycle++){
  setWalkInDoor(b.service,false,true);assert(!buildingRoofHidden(b,...outside),b.name+' closed exterior roof');
  setWalkInDoor(b.service,true,true);assert(!buildingRoofHidden(b,...outside),b.name+' open exterior door keeps its roof');
  assert(buildingRoofHidden(b,...inside),b.name+' interior roof');
  setWalkInDoor(b.service,false,true);assert(buildingRoofHidden(b,...inside),b.name+' closing from inside preserves visibility');
 }
 const original=JSON.stringify({doors:s.openDoors,scene:s.sceneId,x:s.x,y:s.y});
 for(let i=0;i<24;i++){view3d.yaw=i*Math.PI/12;buildingRoofHidden(b,...inside);}
 assert.equal(JSON.stringify({doors:s.openDoors,scene:s.sceneId,x:s.x,y:s.y}),original,'visibility cannot mutate shared/save state');
}
const record=b=>{const instances=[],faces=[];building3({indexed:(mesh,matrix)=>instances.push({mesh,matrix}),face:(points)=>faces.push(points)},b);return {instances,faces};};
const originalFortressTower3=civilFortressTower3;let fortressTowerCalls=0;civilFortressTower3=(...args)=>{fortressTowerCalls++;return originalFortressTower3(...args);};
let castles=0;
for(const b of buildings.filter(b=>b.civilCastle)){
 castles++;setWalkInDoor(b.service,true,true);activateScene('overworld',b.x+24,b.y+28,false);b._cutaway=false;
 fortressTowerCalls=0;const first=record(b);assert.equal(fortressTowerCalls,6,'four structural corner towers and two structural gate towers');
 for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  view3d.yaw=yaw;const next=record(b);assert.equal(next.instances.length,first.instances.length);assert.deepEqual(next.instances.map(o=>o.matrix),first.instances.map(o=>o.matrix),'castle geometry remains invariant on orbit');
 }
 const runs=civilWallRuns(b.civilWallTiles),covered=new Set();
 for(const run of runs)for(let i=0;i<run.length;i++){const key=(run.x+(run.axis==='x'?i:0))+':'+(run.y+(run.axis==='y'?i:0));assert(!covered.has(key),'no duplicate masonry');covered.add(key);}
 assert.deepEqual([...covered].sort(),[...b.civilWallTiles.keys()].sort(),'every wall tile represented, openings unchanged');
 const towerKeys=['tower','watchTower','towerBase'].map(key=>realmArtMesh(key,b.race));
 assert.equal(first.instances.filter(o=>towerKeys.includes(o.mesh)).length,0,'castle towers never stretch a complete decorative tower model into architecture');
 const library=b.civilRooms.find(r=>r.usage==='library');activateScene('overworld',library.x+4,library.y+4,false);b._cutaway=buildingRoofHidden(b);assert(b._cutaway);
 fortressTowerCalls=0;const interior=record(b);assert.equal(fortressTowerCalls,6,'interior entry preserves every structural tower');
 assert.equal(interior.instances.filter(o=>towerKeys.includes(o.mesh)).length,0,'interior view cannot reintroduce decorative tower models');
 assert.equal(interior.instances.filter(o=>o.mesh===realmArtMesh('curtainWall',b.race)).length,first.instances.filter(o=>o.mesh===realmArtMesh('curtainWall',b.race)).length,'interior entry preserves curtain wall');
}
civilFortressTower3=originalFortressTower3;
assert.equal(castles,3);
view3d.zoom=118;const desktopVisibility=realmVisibilityBudget3();assert(desktopVisibility.tiles>=20&&desktopVisibility.pixels>=400,'desktop keeps complete towns and landmarks resident beyond the viewport');
const originalMatchMedia=window.matchMedia;window.matchMedia=()=>({matches:true});const mobileVisibility=realmVisibilityBudget3();window.matchMedia=originalMatchMedia;assert(mobileVisibility.tiles>=6&&mobileVisibility.tiles<=8&&mobileVisibility.pixels<=180,'mobile keeps nearby architecture visible without retaining the whole settlement');
view3d.zoom=view3d.min;window.matchMedia=()=>({matches:true});assert(realmGeometryDetail3()<=.6,'mobile wide view uses the low geometry tier');window.matchMedia=originalMatchMedia;
view3d.zoom=118;assert.equal(realmGeometryDetail3(),1,'near desktop view retains full geometry detail');
view3d.zoom=14;screen={w:1280,h:720};assert(realmWideWorldLimit3()<90,'wide overview omits remote settlements whose terrain is outside the view');
assert(/p\.y<40\|\|p\.y>screen\.h\+90/.test(crossingsBeforeRebuild.toString()),'distant crossing meshes cannot appear before their terrain horizon');
assert(crossingsBeforeRebuild.toString().includes('bounds?.valid&&(b.x+b.w/2<bounds.minx'),'offscreen realm crossings are rejected before projection');
// Movement and door actions must never alter the chosen camera angle.
activateScene('overworld',55,61,false);screen={w:844,h:390};view3d.tilt=.6;
for(const [x,z]of [[55,61],[57,64],[54,62]]){const p=project3(x,0,z),back=unproject3(p.x,p.y);assert(Math.hypot(back.x-x,back.z-z)<.03,'manual-pitch terrain picking');}
for(const b of sample){for(const inside of [false,true]){activateScene('overworld',...doorApproach(b.service,inside),false);setWalkInDoor(b.service,true,true);time+=1;assert.equal(cameraPitch3(),.6,'building entry must not move camera');}}
activateScene('fairy_between',20,49,false);realmViewCorners=null;
assert.equal(roadInfluence(25,47).length,3,'Fairy Lands road data includes every vertex color channel');
let uploaded=0;const terrainGPU={terrain:new Map(),upload(data){assert.equal(data.length%12,0,'terrain vertex stride');assert(data.every(Number.isFinite),'finite terrain data');uploaded++;return {buffer:{},count:data.length/12};},gl:{deleteBuffer(){}}};
for(let frame=0;frame<32&&uploaded===0;frame++)realmTerrainEntries(terrainGPU);assert(uploaded>0,'terrain streams across bounded frames until a complete visible chunk is ready');
const chunkSizes=sceneSize(),sliceProbe={x:60,z:64,key:'slice-probe',scene:currentScene},sliceProbeGPU={terrain:new Map(),upload(){throw Error('partial terrain slice must not upload geometry');},gl:{deleteBuffer(){}}};
assert.equal(realmTerrainChunkRow(sliceProbeGPU,sliceProbe,8,1,chunkSizes[0],chunkSizes[1],2),false,'one terrain step leaves a full chunk unfinished');assert.equal(sliceProbe.build.row,0);assert.equal(sliceProbe.build.column,2,'terrain generation yields after its bounded tile slice');
let mobileSlices=0;const buildTerrainRow=realmTerrainChunkRow;realmTerrainChunkRow=(...args)=>{mobileSlices++;return buildTerrainRow(...args);};
activateScene('overworld',55,61,false);px=52;py=58;view3d.zoom=118;realmViewCorners=[{x:48,z:54},{x:66,z:54},{x:66,z:72},{x:48,z:72}];
window.matchMedia=()=>({matches:true});const mobileTerrainGPU={frameId:0,terrain:new Map(),upload(data){assert.equal(data.length%12,0);return {buffer:{},count:data.length/12};},gl:{deleteBuffer(){}}};
realmTerrainEntries(mobileTerrainGPU);realmTerrainChunkRow=buildTerrainRow;window.matchMedia=originalMatchMedia;
assert(mobileSlices>1&&mobileSlices<=16,'mobile terrain generation uses multiple bounded slices per frame');
const mobileChunks=mobileTerrainGPU.terrain.get(currentScene);assert(mobileChunks.size>0&&[...mobileChunks.keys()].every(key=>/^8:1:/.test(key)),'mobile uses one exact heightfield quad per terrain tile');
const mobileFallbacks=[...mobileChunks.values()].filter(c=>c.buffer&&!c.complete),fallbackBuffers=new Map(mobileFallbacks.map(c=>[c,c.buffer]));assert(mobileFallbacks.length>0,'mobile renders coarse terrain while precise chunk rows are still streaming');
window.matchMedia=()=>({matches:true});for(let frame=0;frame<40&&!mobileFallbacks.some(c=>c.complete);frame++)realmTerrainEntries(mobileTerrainGPU);window.matchMedia=originalMatchMedia;
assert(mobileFallbacks.some(c=>c.complete&&c.buffer&&c.buffer!==fallbackBuffers.get(c)),'completed terrain replaces its coarse fallback with the precise chunk mesh');
const viewCorners=realmViewCorners,originalChunkRow=realmTerrainChunkRow,originalLandHeight=landHeight;let visibilityHeightSamples=0;
realmViewCorners=[{x:48,z:54},{x:66,z:54},{x:66,z:72},{x:48,z:72}];landHeight=(...args)=>{visibilityHeightSamples++;return originalLandHeight(...args);};realmTerrainChunkRow=()=>true;
const visibilityGPU={terrain:new Map(),upload(){throw Error('visibility-only terrain setup must not upload geometry');},gl:{deleteBuffer(){}}};realmTerrainEntries(visibilityGPU);
realmViewCorners=viewCorners;realmTerrainChunkRow=originalChunkRow;landHeight=originalLandHeight;
assert(visibilityGPU.terrainQueue.length>0,'terrain visibility finds candidates in the conservative camera bounds');
assert.equal(visibilityHeightSamples,0,'terrain visibility never samples the heightfield once per candidate chunk');
console.log('PASS: 20 buildings × 10 roof cycles; all 3 castles keep walls and towers during orbit/entry; wall coverage matches collision; occupied-only roof/upper-floor removal, fixed manual camera and mobile picking.');
`,ctx);
