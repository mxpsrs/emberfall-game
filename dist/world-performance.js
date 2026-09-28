'use strict';
// Browser marshalling only: membership and bounds decisions live in the native
// partition over the canonical Scene. These maps resolve IDs to existing views.
(function(root){
 let sceneName=null,objectList=null,buildingList=null,objectMap=new Map(),buildingMap=new Map(),dynamic=[],session=[],lastStats=null,owner=null,unsubscribe=null;
 function index(scene,objects,buildings){
  if(sceneName===scene&&objectList===objects&&buildingList===buildings)return;
  sceneName=scene;objectList=objects;buildingList=buildings;objectMap=new Map();buildingMap=new Map();dynamic=[];session=[];
  for(const object of objects){const id=object._sceneEntityId;if(!id||object._generatedSceneName&&object._generatedSceneName!==scene){session.push(object);continue;}objectMap.set(id,object);if(object._generatedSpawn)dynamic.push(object);}
  for(const building of buildings){const id=building._sceneEntityId;if(id)buildingMap.set(id,building);}
 }
 function prepare(scene,objects,buildings,minx,maxx,minz,maxz){
  const native=root.realmNative?.scenes;if(!native?.performance)return null;
  if(owner!==native){unsubscribe?.();owner=native;sceneName=null;unsubscribe=native.subscribe(event=>{if(event.kind==='load'||(event.scene===sceneName&&(event.kind!=='transform'&&(event.kind!=='batch'||event.changes.some(c=>c.kind!=='transform')))))sceneName=null;});}
  index(scene,objects,buildings);
  if(dynamic.length)native.performance(scene,{op:'dynamic',changes:dynamic.map(o=>[o._sceneEntityId,o.drawX??o.x,0,o.drawY??o.y])});
  // Conservative broad phase also includes tall silhouettes projected beyond
  // their ground footprint; exact frustum testing is a subsequent native gate.
  const result=native.performance(scene,{op:'query',min:[minx-128,-100000,minz-128],max:[maxx+128,100000,maxz+128]}),visibleObjects=[],visibleBuildings=[];
  for(const id of result.ids){const object=objectMap.get(id);if(object)visibleObjects.push(object);const building=buildingMap.get(id);if(building)visibleBuildings.push(building);}
  // Session fires/previews and relocated live actors have explicit lifetime
  // owners, independent of permanent Scene definitions. Never serialize them.
  for(const o of session)if(o.x>=minx-16&&o.x<=maxx+16&&o.y>=minz-16&&o.y<=maxz+16)visibleObjects.push(o);
  lastStats={...result.stats,objects:visibleObjects.length,buildings:visibleBuildings.length};
  return {objects:visibleObjects,buildings:visibleBuildings,ids:result.ids};
 }
 root.VeldrenWorldPerformance={prepare,diagnostics:()=>lastStats,reset(){sceneName=objectList=buildingList=null;objectMap.clear();buildingMap.clear();dynamic=[];session=[];}};
})(globalThis);
