// Geometry and navigation contracts for the shared world art pass.
const {ctx}=require('../scripts/benchmark-desktop.cjs');
const vm=require('vm');
vm.runInContext(`
const normalsMatch=build=>{
 let checked=0;
 build({face(p,c,n){
  if(!n)return;
  const u=p[1].map((v,i)=>v-p[0][i]),v=p[2].map((v,i)=>v-p[0][i]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(Math.hypot(...cross)<1e-8)return;
  const normal=[0,1,2].map(i=>n.reduce((a,v)=>a+v[i],0));
  assert(cross.reduce((a,v,i)=>a+v*normal[i],0)>0,'surface winding and lighting normals agree');checked++;
 }});
 assert(checked>20);
};
normalsMatch(r=>worldOrganic(r,0,0,0,.7,1.3,.5,'#ffffff'));
normalsMatch(r=>{worldLimb(r,[0,0,0],[.3,1,.4],.2,.08,'#ffffff');worldLimb(r,[0,0,0],[1,.1,-.3],.1,.15,'#ffffff');worldLimb(r,[0,0,0],[0,1,0],.15,.15,'#ffffff');});
for(const [name,m]of Object.entries(rebuiltModels).filter(([n])=>n.startsWith('World_'))){assert(m.i.every(i=>i<m.p.length/3));assert(m.p.every(Number.isFinite));assert(m.n.every(Number.isFinite));assert(m.t.every(t=>t>=20&&t<84));}
for(const name of ['Kenney_GrassLarge','Kenney_GrassLeafsLarge','Kenney_MushroomRed','Kenney_MushroomTan','Kenney_LogStack','Kenney_BushDetailed','Kenney_RockLarge','Kenney_FlowerPurple','Kenney_FlowerRed','Kenney_FlowerYellow']){const m=rebuiltModels[name];assert(m&&m.i.length&&m.i.every(i=>i<m.p.length/3),name+' has valid local geometry');assert(m.t.every(t=>t===0),name+' keeps its color-matched vertex materials');}
const roofBase=environmentRoofMesh3('human','Roof_RoundTiles_4x6',0),roofSlate=environmentRoofMesh3('human','Roof_RoundTiles_4x6',1),roofUmber=environmentRoofMesh3('human','Roof_RoundTiles_4x6',2);
assert.equal(roofBase,rebuiltModels.Roof_RoundTiles_4x6,'one human roof variant preserves the authored tile material');
assert.notDeepEqual(Array.from(roofSlate.c.slice(0,24)),Array.from(roofUmber.c.slice(0,24)),'human settlements no longer repeat one orange roof across every building');
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
assert(worldScenes.overworld.objects.filter(o=>o.id>=2800000&&o.id<2900000).length>20,'elven streets receive woodland, not only roof tint');
activateScene('overworld',320,280);const nature=[];for(let bz=2;bz<90;bz+=3)for(let bx=2;bx<138;bx+=3)nature.push(...worldUnderstoryPlacements(bx,bz));
assert(nature.length>1800,'the continent receives dense streamed ground cover');
for(const name of ['Grass_Wispy_Short','Bush_Common','Fern_1','Flower_3_Group'])assert(nature.some(p=>p.name===name),name+' is represented in biome-aware ground cover');
for(const name of ['Grass_Common_Short','Grass_Wispy_Short','Kenney_MushroomRed','Kenney_BushDetailed','Kenney_RockLarge','Kenney_FlowerPurple'])assert(nature.some(p=>p.name===name),name+' is integrated into Briarhaven ground cover');
const villagePlants=nature.filter(p=>Math.hypot(p.x-55,p.z-61)<55);assert(villagePlants.filter(p=>/Grass/.test(p.name)).every(p=>(rebuiltModels[p.name].bounds[1][1]-rebuiltModels[p.name].bounds[0][1])*p.scale<.65),'village grass stays below knees');
assert(nature.every(p=>worldWaterDistance(p.x,p.z)>=.55&&roadInfluence(p.x,p.z)[0]<=.23),'ground cover stays out of water and travelled road centers');
let splitVerified=false;
for(let bz=4;bz<16&&!splitVerified;bz++)for(let bx=4;bx<16&&!splitVerified;bx++){
 const whole=worldUnderstoryPlacements(bx,bz);if(!whole.length)continue;
 const split=[0,1,2,3].flatMap(part=>worldUnderstoryPlacements(bx,bz,part));
 assert.deepEqual(split.map(JSON.stringify).sort(),whole.map(JSON.stringify).sort(),'incremental vegetation parts reproduce the complete stable chunk, including companions across a part edge');splitVerified=true;
}
assert(splitVerified,'a populated chunk is available to verify incremental vegetation generation');
for(const b of worldScenes.overworld.buildings.filter(b=>b.archetype==='castle')){
 activateScene('overworld',b.service.x,b.service.y);setWalkInDoor(b.service,false,true);
 assert(inBuilding(b,b.service.x,b.service.y-1));setWalkInDoor(b.service,true,true);
 assert(!inBuilding(b,b.service.x,b.service.y-1));
 const p=route(b.service.x,b.service.y-2);assert(p&&p.length,'castle doorway still leads inside');
 activateScene('overworld',b.service.x,b.service.y-2);assert(route(b.service.x,b.service.y+1)?.length,'castle doorway still leads outside');
}
`,ctx);
console.log('PASS: organic surface normals, imported mesh bounds/materials, biome ground cover, elven woodland and all three castle entrances and exits.');
vm.runInContext(`
activateScene('overworld',320,280);screen.w=900;screen.h=520;view3d.zoom=32;view3d.yaw=0;
const preparedParts=[],knownChunks=new Set(),knownParts=new Set(),initialUnderstory=visibleWorldUnderstoryChunks();assert.strictEqual(visibleWorldUnderstoryChunks(),initialUnderstory,'visible understory candidates are cached for an unchanged camera');knownChunks.add(initialUnderstory[0].join(':'));
VeldrenSceneryScene={enabled:true,hasChunk:(bx,bz)=>knownChunks.has(bx+':'+bz),hasChunkPart:(bx,bz,part)=>knownParts.has(bx+':'+bz+':'+part),prepareChunkPart(bx,bz,part,plants){preparedParts.push({bx,bz,part,count:plants.length});knownParts.add(bx+':'+bz+':'+part);if([0,1,2,3].every(i=>knownParts.has(bx+':'+bz+':'+i)))knownChunks.add(bx+':'+bz);}};
prepareWorldUnderstory();assert.equal(preparedParts.length,1,'at most one vegetation subchunk is materialized per frame');const first=preparedParts[0];assert.notEqual(first.bx+':'+first.bz,initialUnderstory[0].join(':'),'already materialized chunks are skipped');assert.equal(first.part,0);
prepareWorldUnderstory();assert.equal(preparedParts.length,2);assert.equal(preparedParts[1].bx+':'+preparedParts[1].bz,first.bx+':'+first.bz,'the current logical chunk is spread across frames');assert.equal(preparedParts[1].part,1);
prepareWorldUnderstory();assert.equal(preparedParts.length,3);assert.equal(preparedParts[2].part,2);
prepareWorldUnderstory();assert.equal(preparedParts.length,4);assert.equal(preparedParts[3].part,3,'all four stable parts eventually complete the chunk');assert(knownChunks.has(first.bx+':'+first.bz));
prepareWorldUnderstory();assert.equal(preparedParts.length,5,'after completion, the next frame advances to the next chunk');
px+=8;assert.notStrictEqual(visibleWorldUnderstoryChunks(),initialUnderstory,'crossing into another terrain cell refreshes cached visibility');const beforeMove=preparedParts.length;prepareWorldUnderstory();assert.equal(preparedParts.length,beforeMove+1,'moving to a new terrain cell refreshes the prioritized queue');
`,ctx);
console.log('PASS: understory builds one stable subchunk per frame, skips existing chunks, and refreshes priority after camera movement.');
