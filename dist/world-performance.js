'use strict';
// Browser marshalling only: membership and bounds decisions live in the native
// partition over the canonical Scene. These maps resolve IDs to existing views.
(function(root){
 let sceneName=null,objectList=null,buildingList=null,objectMap=new Map(),buildingMap=new Map(),dynamic=[],session=[],lastStats=null,currentFrame=null,owner=null,unsubscribe=null;
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
  const camera=typeof realmFilamentCameraState==='function'?realmFilamentCameraState():null;
  const result=native.performance(scene,camera?{op:'visible',camera,profile:typeof realmMobileFilament==='function'&&realmMobileFilament()?'browser-mobile':'browser'}:{op:'query',min:[minx-128,-100000,minz-128],max:[maxx+128,100000,maxz+128]}),visibleObjects=[],visibleBuildings=[];
  currentFrame={scene,...result,visibleIds:new Set(result.ids)};
  for(const id of result.ids){const object=objectMap.get(id);if(object)visibleObjects.push(object);const building=buildingMap.get(id);if(building)visibleBuildings.push(building);}
  // Session fires/previews and relocated live actors have explicit lifetime
  // owners, independent of permanent Scene definitions. Never serialize them.
  for(const o of session)if(o.x>=minx-16&&o.x<=maxx+16&&o.y>=minz-16&&o.y<=maxz+16)visibleObjects.push(o);
  lastStats={...result.stats,objects:visibleObjects.length,buildings:visibleBuildings.length};
  return {objects:visibleObjects,buildings:visibleBuildings,ids:result.ids};
 }
 root.VeldrenWorldPerformance={prepare,visible:(name,id)=>currentFrame?.scene!==name||currentFrame.visibleIds.has(id),frame:name=>currentFrame?.scene===name?currentFrame:null,diagnostics:()=>lastStats,reset(){currentFrame=null;sceneName=objectList=buildingList=null;objectMap.clear();buildingMap.clear();dynamic=[];session=[];}};
})(globalThis);

// IO and handle marshalling for the native cell scheduler. The existing Phase 2
// owner shares dependencies and allocations with draw leases and cancels IO.
function createVeldrenWorldStreaming(native,assets,models,profile){
 const entries=new Map(),byAsset=new Map();let scene=null,demands=[],receipts=[],status=null,disposed=false,epoch=0;
 const pair=(id,material)=>JSON.stringify([id,material||'']);
 function reset(){++epoch;for(const entry of entries.values())entry.lease?.release();entries.clear();byAsset.clear();receipts=[];demands=[];status=null;scene=null;}
 const unsubscribeScene=native.subscribe(event=>{if(event.kind==='load')reset();}),unsubscribeReload=assets.onReload(reset),unsubscribeDispose=assets.onDispose(destroy);
 function destroy(){if(disposed)return;disposed=true;unsubscribeScene();unsubscribeReload();unsubscribeDispose();reset();}
 function begin(name){if(disposed)throw Error('World streaming owner destroyed');if(scene!==name){reset();scene=name;}demands=[];}
 function want(id,matrix,options,identity){
  const material=options?.material||'';demands.push([id,material,identity||'',matrix[12],matrix[13],matrix[14]]);
  const entry=byAsset.get(pair(id,material));if(!entry||entry.generation!==assets.record(id).generation||material&&entry.materialGeneration!==assets.record(material).generation)return false;
  if(entry.error)throw entry.error;return entry.state==='ready';
 }
 function end(center,gpuBytes){
  const consumed=receipts.length,result=native.performance(scene,{op:'streaming',profile,epoch,center,demands,receipts:receipts.slice(0,consumed),pins:globalThis.VeldrenEditorSelection?.ids||[],gpuBytes});receipts.splice(0,consumed);status=result;
  for(const key of result.release){const entry=entries.get(key);if(entry){entries.delete(key);if(byAsset.get(pair(entry.asset,entry.material))===entry)byAsset.delete(pair(entry.asset,entry.material));entry.lease?.release();}receipts.push([key,'released']);}
  for(const request of result.load){
   const existing=entries.get(request.key);if(existing){if(existing.state!=='loading')receipts.push([request.key,existing.state]);continue;}
   const entry={...request,state:'loading',lease:null,error:null};entries.set(request.key,entry);byAsset.set(pair(request.asset,request.material),entry);
   const failed=error=>{if(entries.get(request.key)!==entry)return;entry.error=error;entry.state='failed';receipts.push([request.key,'failed']);};
   try{entry.lease=models.acquire(request.asset,profile,request.material?{material:request.material}:{});entry.lease.ready.then(()=>{if(disposed||entries.get(request.key)!==entry)return;entry.state='ready';receipts.push([request.key,'ready']);},failed);}catch(error){failed(error);}
  }
 }
 return Object.freeze({begin,want,end,destroy,pending:()=>status?(status.stats.queued+status.stats.loading):0,diagnostics:()=>status?{...status.stats,cells:status.cells,leases:entries.size}:null});
}
