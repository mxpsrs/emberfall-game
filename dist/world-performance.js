'use strict';
// Browser marshalling only: membership and bounds decisions live in the native
// partition over the canonical Scene. These maps resolve IDs to existing views.
(function(root){
 let sceneName=null,objectList=null,buildingList=null,objectMap=new Map(),buildingMap=new Map(),legacyVisibility=new Map(),dynamic=[],dynamicPositions=new Map(),session=[],lastStats=null,currentFrame=null,owner=null,unsubscribe=null,viewRevision=0,listRevision=0,lastPreparedKey=null,lastPreparedViewRevision=-1,lastPreparedListRevision=-1,lastPrepared=null;
 function index(scene,objects,buildings){
  if(sceneName===scene&&objectList===objects&&buildingList===buildings)return false;
  sceneName=scene;objectList=objects;buildingList=buildings;objectMap=new Map();buildingMap=new Map();legacyVisibility.clear();dynamic=[];dynamicPositions.clear();session=[];listRevision++;lastPrepared=null;
  for(const object of objects){const id=object._sceneEntityId;if(!id||object._generatedSceneName&&object._generatedSceneName!==scene){session.push(object);continue;}objectMap.set(id,object);if(object._generatedSpawn)dynamic.push(object);}
  for(const building of buildings){const id=building._sceneEntityId;if(id)buildingMap.set(id,building);}
  return true;
 }
 function prepare(scene,objects,buildings,minx,maxx,minz,maxz){
  const native=root.realmNative?.scenes;if(!native?.performance)return null;
  if(owner!==native){unsubscribe?.();owner=native;sceneName=null;currentFrame=null;legacyVisibility.clear();lastPrepared=null;viewRevision++;unsubscribe=native.subscribe(event=>{if(native.isUnderstoryBatch?.(event))return;if(event.kind==='load'){sceneName=null;currentFrame=null;legacyVisibility.clear();lastPrepared=null;viewRevision++;return;}if(event.scene!==sceneName)return;currentFrame=null;lastPrepared=null;viewRevision++;if(event.kind!=='transform'&&(event.kind!=='batch'||event.changes.some(c=>c.kind!=='transform'))){legacyVisibility.clear();sceneName=null;}});}
  index(scene,objects,buildings);
  if(dynamic.length){const changes=[];for(const o of dynamic){const id=o._sceneEntityId,x=o.drawX??o.x,z=o.drawY??o.y,previous=dynamicPositions.get(id);if(!previous||previous.x!==x||previous.z!==z){changes.push([id,x,0,z]);dynamicPositions.set(id,{x,z});}}if(changes.length){native.performance(scene,{op:'dynamic',changes});currentFrame=null;lastPrepared=null;viewRevision++;}}
  const camera=typeof realmFilamentCameraState==='function'?realmFilamentCameraState():null;
  const profile=typeof realmMobileFilament==='function'&&realmMobileFilament()?'browser-mobile':'browser',cameraKey=camera?[camera.eye?.join(','),camera.center?.join(','),camera.near,camera.far,camera.left,camera.right,camera.bottom,camera.top,camera.width,camera.height].join('|'):'',queryKey=camera?'':`${minx-128},${maxx+128},${minz-128},${maxz+128}`,key=`${scene}|${profile}|${cameraKey}|${queryKey}`;
  const editor=String(root.VELDREN_CONTEXT||root.window?.VELDREN_CONTEXT||'').toLowerCase()==='editor',cacheable=!editor;
  const appendSession=prepared=>{if(!session.length)return prepared;const visibleObjects=prepared.objects.slice();for(const o of session)if(o.x>=minx-16&&o.x<=maxx+16&&o.y>=minz-16&&o.y<=maxz+16)visibleObjects.push(o);lastStats={...lastStats,objects:visibleObjects.length};return {...prepared,objects:visibleObjects};};
  if(cacheable&&lastPrepared&&lastPreparedKey===key&&lastPreparedViewRevision===viewRevision&&lastPreparedListRevision===listRevision){if(camera&&native.pagePayloads)lastStats.paging=native.pagePayloads(scene,camera.center);return appendSession(lastPrepared);}
  const result=camera&&native.frame?native.frame(scene,camera,profile):native.performance(scene,camera?{op:'visible',camera,profile}:{op:'query',min:[minx-128,-100000,minz-128],max:[maxx+128,100000,maxz+128]}),visibleObjects=[],visibleBuildings=[];
  const paging=camera&&native.pagePayloads?native.pagePayloads(scene,camera.center):null;
  currentFrame={scene,...result,paging,visibleIds:new Set(result.ids)};
  for(const id of result.ids){const object=objectMap.get(id);if(object)visibleObjects.push(object);const building=buildingMap.get(id);if(building)visibleBuildings.push(building);}
  // Session fires/previews and relocated live actors have explicit lifetime
  // owners, independent of permanent Scene definitions. Never serialize them.
  lastStats={...result.stats,paging,objects:visibleObjects.length,buildings:visibleBuildings.length};
  const prepared={objects:visibleObjects,buildings:visibleBuildings,ids:result.ids};
  lastPreparedKey=key;lastPreparedViewRevision=viewRevision;lastPreparedListRevision=listRevision;lastPrepared=cacheable?prepared:null;
  return appendSession(prepared);
 }
 function legacyVisible(scene,id){
  const key=scene+'\0'+id;if(legacyVisibility.has(key))return legacyVisibility.get(key);
  const node=root.realmNative?.scenes?.entity?.(String(scene),id),mesh=node?.components?.MeshRenderer;
  const visible=!!node?.activeInHierarchy&&!!mesh&&mesh.visible!==false&&mesh.renderPath!=='canonical';
  legacyVisibility.set(key,visible);return visible;
 }
 root.VeldrenWorldPerformance={prepare,visible:(name,id)=>currentFrame?.scene!==name||currentFrame.visibleIds.has(id),legacyVisible,frame:name=>currentFrame?.scene===name?currentFrame:null,diagnostics:()=>lastStats,reset(){currentFrame=null;sceneName=objectList=buildingList=null;objectMap.clear();buildingMap.clear();legacyVisibility.clear();dynamic=[];dynamicPositions.clear();session=[];lastPrepared=null;lastPreparedKey=null;viewRevision++;listRevision++;}};
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
 return Object.freeze({begin,want,end,destroy,retains:(id,material='')=>byAsset.has(pair(id,material)),pending:()=>status?(status.stats.queued+status.stats.loading):0,stats:()=>status?.stats||null,diagnostics:()=>status?{...status.stats,cells:status.cells,leases:entries.size}:null});
}
