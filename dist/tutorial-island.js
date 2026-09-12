'use strict';
// The apprenticeship owns an outdoor scene with no mainland entrance.
const TUTORIAL_SCENE='tutorial',TUTORIAL_ENTRY=[42,51],MAINLAND_ENTRY=[42,51];
let tutorialIslandReady=false,tutorialResume=null;
const tutorialComplete=state=>state.tutorialReward===true||state.tutorial>=tutorialSteps.length;
const insideTutorialArea=(x,y)=>Number.isFinite(x+y)&&x>=10&&x<=94&&y>=30&&y<=101;
const journeyBeforeIsland=normalizeJourney;
normalizeJourney=function(state,original=state){
 const oldScene=original.sceneId,oldVersion=original.tutorialIslandVersion;
 journeyBeforeIsland(state,original);
 if(tutorialComplete(state)){
  state.tutorial=tutorialSteps.length;
  if(oldScene===TUTORIAL_SCENE){state.sceneId='overworld';[state.x,state.y]=MAINLAND_ENTRY;state.insideBuilding=null;state.openDoors=[];state.returnPoint=null;}
 }else{
  state.sceneId=TUTORIAL_SCENE;
  if(!insideTutorialArea(state.x,state.y)||oldScene&&oldScene!=='overworld'&&oldScene!==TUTORIAL_SCENE){[state.x,state.y]=TUTORIAL_ENTRY;state.insideBuilding=null;}
  if(!oldVersion)for(const pile of state.groundLoot||[])if(pile.scene==='overworld'&&insideTutorialArea(pile.x,pile.y))pile.scene=TUTORIAL_SCENE;
 }
 state.tutorialIslandVersion=1;
};
const worldBeforeIsland=setupExpandedWorld;
setupExpandedWorld=function(){
 tutorialResume??={scene:s.sceneId,x:s.x,y:s.y,doors:[...(s.openDoors||[])],inside:s.insideBuilding};
 worldBeforeIsland();
};
const inWorldBeforeIsland=inWorld;
inWorld=function(){return currentScene===TUTORIAL_SCENE||inWorldBeforeIsland();};
const waterDistanceBeforeIsland=worldWaterDistance;
worldWaterDistance=function(x,y){
 const original=waterDistanceBeforeIsland(x,y);if(currentScene!==TUTORIAL_SCENE)return original;
 // Broad, wavy coast beyond every lesson; no bridge or land joins the mainland.
 const edge=Math.min(x-8.5+.7*Math.sin(y*.17),96-x+.7*Math.sin(y*.11),y-28+.6*Math.sin(x*.14),103-y+.7*Math.sin(x*.12));
 return Math.min(original,edge);
};
const villageBeforeIsland=setupTutorialVillage;
setupTutorialVillage=function(){
 villageBeforeIsland();if(tutorialIslandReady)return;
 const mainland=worldScenes.overworld;
 // Clone building/service relationships together, preserving the authored room layouts.
 const originals=mainland.objects.filter(o=>insideTutorialArea(o.x,o.y)&&!['boss','questgiver','exit'].includes(o.type)&&(!fighter(o)||o.tutorialRole||o.penId));
 const roomOriginals=mainland.buildings.filter(b=>insideTutorialArea(b.x,b.y)&&insideTutorialArea(b.x+b.w,b.y+b.h));
 const copies=new Map(originals.map(o=>[o,{...o}])),rooms=roomOriginals.map(b=>({...b}));
 rooms.forEach((b,i)=>{const source=roomOriginals[i],service=copies.get(source.service);b.service=service;if(service)service.building=b;});
 const islandObjects=[...copies.values()].filter(o=>o.type!=='door'||o.building?.walkIn&&rooms.includes(o.building));
 for(const o of islandObjects)if(o.interiorBuilding&&!rooms.some(b=>b.service?.destination===o.interiorBuilding))delete o.interiorBuilding;
 const island={objects:islandObjects,buildings:rooms.filter(b=>b.walkIn&&b.service),title:'Firstlight Isle',entry:[...TUTORIAL_ENTRY]};
 worldScenes[TUTORIAL_SCENE]=island;sceneSizes[TUTORIAL_SCENE]=[104,112];
 trainingPenGate=islandObjects.find(o=>o.type==='gate'&&o.penFence)||null;
 // Keep normal mainland services, but remove every tutor, lesson marker and practice target.
 mainland.objects=mainland.objects.flatMap(o=>{
  if(o.tutor==='guide'){const elder={...o};delete elder.tutor;delete elder.tutorialRole;return [elder];}
  if(o.tutor==='bank'){const banker={...o,type:'banker',name:'Briarhaven banker'};delete banker.tutor;delete banker.tutorialRole;return [banker];}
  if(o.tutor||o.penId||o.penFence||o.tutorialRole==='cinder'||['dummy','magic-dummy','practice-forge'].includes(o.tutorialRole)||o.workplace)return [];
  const copy={...o};delete copy.tutorialRole;return [copy];
 });
 // Reconnect mainland doors after replacing their object records.
 for(const b of mainland.buildings){const service=mainland.objects.find(o=>o.id===b.service?.id);if(service){b.service=service;service.building=b;}}
 const guide=islandObjects.find(o=>o.tutor==='guide');if(guide)guide.name='Elder Rowan';
 for(const b of island.buildings){b.name=b.name.replace(/Briarhaven/g,'Firstlight');b.service.name=b.name;}
 if(islandObjects.some(o=>o.spiritId==='cinder')){SPIRITS.cinder.scene=TUTORIAL_SCENE;SPIRITS.cinder.hint='Beside Keeper Sera on Firstlight Isle.';}
 tutorialIslandReady=true;realmNavigation.clear();resetLandSurface();miniTerrain=null;mapServicesCache=null;
 const resume=tutorialResume||{scene:s.sceneId,x:s.x,y:s.y,doors:s.openDoors||[]};
 const completed=tutorialComplete(s),destination=completed?(resume.scene===TUTORIAL_SCENE?'overworld':resume.scene||'overworld'):TUTORIAL_SCENE;
 s.openDoors=resume.doors||[];
 const point=completed&&resume.scene===TUTORIAL_SCENE?MAINLAND_ENTRY:!completed&&!insideTutorialArea(resume.x,resume.y)?TUTORIAL_ENTRY:[resume.x,resume.y];
 activateScene(worldScenes[destination]?destination:'overworld',...point,false);
 if(currentScene===TUTORIAL_SCENE){restoreWalkInDoors(island,{scene:'overworld',x:s.x,y:s.y});s.insideBuilding=buildings.find(b=>withinWalkIn(b,s.x,s.y))?.service.destination||null;}
 normalizeJourney(s);renderTutorial();
};
const activateBeforeIsland=activateScene;
activateScene=function(id,x,y,persist=true){
 if(tutorialIslandReady){
  if(id===TUTORIAL_SCENE&&tutorialComplete(s)){toast('Your apprenticeship is complete. Firstlight Isle is closed to mainland adventurers.');return false;}
  if(id!==TUTORIAL_SCENE&&!tutorialComplete(s)){toast('Finish your apprenticeship with Rowan before travelling to the mainland.');return false;}
 }
 const changed=currentScene!==id;if(changed){closeWorldOptions();if(window.realmTrade||window.realmWorkbench||window.equipmentStatsOpen)close();s.insideBuilding=null;resetLandSurface();mapServicesCache=null;}
 activateBeforeIsland(id,x,y,persist);return currentScene===id;
};
const regionBeforeIsland=regionInfo;
regionInfo=function(){return currentScene===TUTORIAL_SCENE?['Firstlight Isle',s.insideBuilding?buildings.find(b=>b.service?.destination===s.insideBuilding)?.name||'Apprenticeship':'Apprenticeship · Depart with Elder Rowan']:regionBeforeIsland();};
const returnBeforeIsland=returnToVillage;
returnToVillage=function(){if(tutorialIslandReady&&!tutorialComplete(s))return activateScene(TUTORIAL_SCENE,...TUTORIAL_ENTRY);return returnBeforeIsland();};
function departTutorialIsland(){
 if(!tutorialComplete(s)||currentScene!==TUTORIAL_SCENE)return false;
 s.openDoors=[];s.returnPoint=null;s.insideBuilding=null;s.tutorialIslandVersion=1;
 // Recover any protected overflow before leaving the one-way scene.
 for(const pile of s.groundLoot||[])if(pile.scene===TUTORIAL_SCENE&&pile.protectedDrop){for(const [id,n]of Object.entries(pile.items)){if(id==='coins')s.gold+=n;else s.bank[id]=(s.bank[id]||0)+n;}pile.items={};}
 s.groundLoot=(s.groundLoot||[]).filter(p=>p.scene!==TUTORIAL_SCENE);
 return activateScene('overworld',...MAINLAND_ENTRY,false);
}
const atlasBeforeIsland=expandedMap;
expandedMap=function(page=0){if(currentScene===TUTORIAL_SCENE){openLocalMap();return;}return atlasBeforeIsland(page);};
const mapBeforeIsland=openLocalMap;
openLocalMap=function(selected=null){mapBeforeIsland(selected);if(currentScene===TUTORIAL_SCENE)$('mapKingdoms').hidden=true;};
worldMap=function(){openLocalMap();};$('mapBtn').onclick=worldMap;
