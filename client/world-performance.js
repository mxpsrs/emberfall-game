'use strict';
// Browser marshalling only: membership and bounds decisions live in the native
// partition over the canonical Scene. These maps resolve IDs to existing views.
(function(root){
 let sceneName=null,objectList=null,buildingList=null,objectMap=new Map(),buildingMap=new Map(),legacyVisibility=new Map(),dynamic=[],dynamicPositions=new Map(),session=[],lastStats=null,currentFrame=null,owner=null,unsubscribe=null,viewRevision=0,listRevision=0,lastPreparedKey=null,lastPreparedViewRevision=-1,lastPreparedListRevision=-1,lastPrepared=null,grounded=new Map(),groundKey='',groundPending=false,groundEpoch=0;
 function index(scene,objects,buildings){
  if(sceneName===scene&&objectList===objects&&buildingList===buildings)return false;
  sceneName=scene;objectList=objects;buildingList=buildings;objectMap=new Map();buildingMap=new Map();legacyVisibility.clear();dynamic=[];dynamicPositions.clear();session=[];listRevision++;lastPrepared=null;
  for(const object of objects){const id=object._sceneEntityId;if(!id||object._generatedSceneName&&object._generatedSceneName!==scene){session.push(object);continue;}objectMap.set(id,object);if(object._generatedSpawn)dynamic.push(object);}
  for(const building of buildings){const id=building._sceneEntityId;if(id)buildingMap.set(id,building);}
  return true;
 }
 // The native partition starts with conservative terrain-relative bounds.
 // Feed it the same terrain height used by rendering, once per changed record.
 // Work is bounded; the native culler remains the only visibility authority.
 function invalidateGround(native,event){
  if(typeof landHeight!=='function')return;
  if(event.kind==='load'){groundEpoch++;grounded.clear();return;}
  if(event.scene!==sceneName||!grounded.size)return;
  for(const change of event.kind==='batch'?event.changes:[event]){
   if(!change.id)continue;
   const pending=[change.id];
   for(let i=0;i<pending.length;i++){const id=pending[i];grounded.delete(id);if(change.kind==='transform'||change.kind==='upsert')pending.push(...(native.entity(sceneName,id)?.children||[]));}
  }
 }
 function groundVisible(native,scene,result,query){
  if(typeof landHeight!=='function')return result;
  const revision=scene+':'+(typeof landSurfaceRevision==='number'?landSurfaceRevision:0)+':'+(root.VeldrenTerrainEdits?.revision??0)+':'+groundEpoch;
  if(groundKey!==revision){grounded.clear();groundKey=revision;}
  const changes=[],started=typeof performance==='undefined'?0:performance.now(),budget=typeof realmMobileFilament==='function'&&realmMobileFilament()?2:4;
  groundPending=false;
  for(const id of result.ids){
   if(grounded.has(id))continue;
   if(changes.length>=256||changes.length&&typeof performance!=='undefined'&&performance.now()-started>=budget){groundPending=true;break;}
   const node=native.entity(scene,id);grounded.set(id,true);
   if(!node||node.components.MeshRenderer?.renderPath==='canonical')continue;
   const matrix=node.worldMatrix,position=dynamicPositions.get(id),height=landHeight(position?.x??matrix[12],position?.z??matrix[14]);
   if(Number.isFinite(height))changes.push([id,height]);
  }
  if(changes.length){native.performance(scene,{op:'ground',changes});return query();}
  return result;
 }
 function prepare(scene,objects,buildings,minx,maxx,minz,maxz){
  const native=root.realmNative?.scenes;if(!native?.performance)return null;
  if(owner!==native){unsubscribe?.();owner=native;groundEpoch++;grounded.clear();groundKey='';groundPending=false;sceneName=null;currentFrame=null;legacyVisibility.clear();lastPrepared=null;viewRevision++;unsubscribe=native.subscribe(event=>{if(native.isUnderstoryBatch?.(event))return;invalidateGround(native,event);if(event.kind==='load'){sceneName=null;currentFrame=null;legacyVisibility.clear();lastPrepared=null;viewRevision++;return;}if(event.scene!==sceneName)return;currentFrame=null;lastPrepared=null;viewRevision++;if(event.kind!=='transform'&&(event.kind!=='batch'||event.changes.some(c=>c.kind!=='transform'))){legacyVisibility.clear();sceneName=null;}});}
  index(scene,objects,buildings);
  if(dynamic.length){const changes=[];for(const o of dynamic){const id=o._sceneEntityId,x=o.drawX??o.x,z=o.drawY??o.y,previous=dynamicPositions.get(id);if(!previous||previous.x!==x||previous.z!==z){changes.push([id,x,0,z]);grounded.delete(id);dynamicPositions.set(id,{x,z});}}if(changes.length){native.performance(scene,{op:'dynamic',changes});currentFrame=null;lastPrepared=null;viewRevision++;}}
  const camera=typeof realmFilamentCameraState==='function'?realmFilamentCameraState():null;
  const profile=typeof realmMobileFilament==='function'&&realmMobileFilament()?'browser-mobile':'browser',cameraKey=camera?[camera.eye?.join(','),camera.center?.join(','),camera.near,camera.far,camera.left,camera.right,camera.bottom,camera.top,camera.width,camera.height].join('|'):'',queryKey=camera?'':`${minx-128},${maxx+128},${minz-128},${maxz+128}`,key=`${scene}|${profile}|${cameraKey}|${queryKey}|${typeof landSurfaceRevision==='number'?landSurfaceRevision:0}|${root.VeldrenTerrainEdits?.revision??0}`;
  const editor=String(root.VELDREN_CONTEXT||root.window?.VELDREN_CONTEXT||'').toLowerCase()==='editor',cacheable=!editor;
  const appendSession=prepared=>{if(!session.length)return prepared;const visibleObjects=prepared.objects.slice();for(const o of session)if(o.x>=minx-16&&o.x<=maxx+16&&o.y>=minz-16&&o.y<=maxz+16)visibleObjects.push(o);lastStats={...lastStats,objects:visibleObjects.length};return {...prepared,objects:visibleObjects};};
  if(cacheable&&!groundPending&&lastPrepared&&lastPreparedKey===key&&lastPreparedViewRevision===viewRevision&&lastPreparedListRevision===listRevision){if(camera&&native.pagePayloads)lastStats.paging=native.pagePayloads(scene,camera.center);return appendSession(lastPrepared);}
  const query=()=>camera&&native.frame?native.frame(scene,camera,profile):native.performance(scene,camera?{op:'visible',camera,profile}:{op:'query',min:[minx-128,-100000,minz-128],max:[maxx+128,100000,maxz+128]});
  const result=groundVisible(native,scene,query(),query),visibleObjects=[],visibleBuildings=[];
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
 root.VeldrenWorldPerformance={prepare,visible:(name,id)=>currentFrame?.scene!==name||currentFrame.visibleIds.has(id),legacyVisible,frame:name=>currentFrame?.scene===name?currentFrame:null,diagnostics:()=>lastStats,reset(){grounded.clear();groundKey='';groundPending=false;currentFrame=null;sceneName=objectList=buildingList=null;objectMap.clear();buildingMap.clear();legacyVisibility.clear();dynamic=[];dynamicPositions.clear();session=[];lastPrepared=null;lastPreparedKey=null;viewRevision++;listRevision++;}};
})(globalThis);

// IO and handle marshalling for the native cell scheduler. The existing Phase 2
// owner shares dependencies and allocations with draw leases and cancels IO.
function createVeldrenWorldStreaming(native,assets,models,profile){
 const nextEpoch=()=>createVeldrenWorldStreaming.epoch=(createVeldrenWorldStreaming.epoch||0)+1;
 const entries=new Map(),byAsset=new Map();let scene=null,demands=[],receipts=[],status=null,disposed=false,epoch=nextEpoch(),previousDemands=null,previousCenter=null,previousPins=null,previousGpu=-1,lastScheduleAt=-Infinity;
 const pair=(id,material)=>JSON.stringify([id,material||'']);
 const now=()=>globalThis.performance?.now?.()??Date.now();
 function load(entry){
  entry.lease?.release();entry.state='loading';entry.error=null;entry.attempts++;
  const failed=error=>{
   if(disposed||entries.get(entry.key)!==entry)return;
   entry.lease?.release();entry.error=error;
   if(entry.attempts<3){entry.state='retrying';entry.retryAt=now()+500*2**(entry.attempts-1);}else{entry.state='failed';receipts.push([entry.key,'failed']);}
   if(!entry.reported){entry.reported=true;if(typeof realmReportRuntimeFailure==='function')realmReportRuntimeFailure(error,'asset-stream');}
  };
  try{entry.lease=models.acquire(entry.asset,profile,entry.material?{material:entry.material}:{});entry.lease.ready.then(()=>{if(disposed||entries.get(entry.key)!==entry)return;entry.state='ready';entry.error=null;receipts.push([entry.key,'ready']);},failed);}catch(error){failed(error);}
 }
 function reset(){previousDemands=previousCenter=previousPins=null;previousGpu=-1;lastScheduleAt=-Infinity;epoch=nextEpoch();for(const entry of entries.values())entry.lease?.release();entries.clear();byAsset.clear();receipts=[];demands=[];status=null;scene=null;}
 const unsubscribeScene=native.subscribe(event=>{if(event.kind==='load')reset();else if(event.scene===scene||event.kind==='batch'&&event.changes.some(c=>c.scene===scene))previousDemands=null;}),unsubscribeReload=assets.onReload(reset),unsubscribeDispose=assets.onDispose(destroy);
 function destroy(){if(disposed)return;disposed=true;unsubscribeScene();unsubscribeReload();unsubscribeDispose();reset();}
 function begin(name){if(disposed)throw Error('World streaming owner destroyed');if(scene!==name){reset();scene=name;}demands=[];}
 function want(id,matrix,options,identity){
  const material=options?.material||'';demands.push([id,material,identity||'',matrix[12],matrix[13],matrix[14]]);
  const entry=byAsset.get(pair(id,material));if(!entry||entry.generation!==assets.record(id).generation||material&&entry.materialGeneration!==assets.record(material).generation){if(entry)previousDemands=null;return false;}
  // A failed download retains the current complete model or its compatibility
  // mesh. It cannot throw out of the frame loop and freeze the entire world.
  return entry.state==='ready';
 }
 function end(center,gpuBytes){
  const pins=globalThis.VeldrenEditorSelection?.ids||[],same=(a,b)=>!!a&&a.length===b.length&&a.every((v,i)=>Array.isArray(v)?same(v,b[i]):v===b[i]);
  // A settled, unchanged view cannot alter residency or the cell schedule.
  // Receipts, camera motion, demand, memory and editor pins reopen the scheduler.
  if(status&&status.stats.tracked===status.stats.required&&status.cells.every(c=>c[4])&&!status.stats.queued&&!status.stats.loading&&!receipts.length&&previousGpu===gpuBytes&&same(previousCenter,center)&&same(previousPins,pins)&&same(previousDemands,demands))return;
  // Camera motion changes priority, not the resources a visible draw needs.
  // Bound those background decisions to 10 Hz; new visible demand, completion,
  // edits, pins, allocation changes and travel still schedule immediately.
  const stamp=now(),sameMembership=previousDemands&&previousDemands.length===demands.length&&demands.every((row,i)=>row[0]===previousDemands[i][0]&&row[1]===previousDemands[i][1]&&row[2]===previousDemands[i][2]);
  let retryDue=false;for(const entry of entries.values())if(entry.state==='retrying'&&stamp>=entry.retryAt){retryDue=true;break;}
  if(status&&!receipts.length&&!retryDue&&previousGpu===gpuBytes&&same(previousPins,pins)&&sameMembership&&previousCenter&&(!same(previousCenter,center)||!same(previousDemands,demands))&&Math.hypot(...center.map((v,i)=>v-previousCenter[i]))<4&&stamp-lastScheduleAt<100)return;
  lastScheduleAt=stamp;
  previousDemands=demands;previousCenter=Array.from(center);previousPins=Array.from(pins);previousGpu=gpuBytes;
  const consumed=receipts.length,result=native.performance(scene,{op:'streaming',profile,epoch,center,demands,receipts:receipts.slice(0,consumed),pins,gpuBytes});receipts.splice(0,consumed);status=result;
  for(const key of result.release){const entry=entries.get(key);if(entry){entries.delete(key);if(byAsset.get(pair(entry.asset,entry.material))===entry)byAsset.delete(pair(entry.asset,entry.material));entry.lease?.release();}receipts.push([key,'released']);}
  for(const request of result.load){
   const existing=entries.get(request.key);if(existing){if(existing.state==='ready'||existing.state==='failed')receipts.push([request.key,existing.state]);continue;}
   const entry={...request,state:'loading',lease:null,error:null,attempts:0,retryAt:0,reported:false};entries.set(request.key,entry);byAsset.set(pair(request.asset,request.material),entry);load(entry);
  }
  // The native scheduler retains its loading slot during bounded retries.
  // Its existing concurrency limit also bounds retries and cancellation.
  for(const entry of entries.values())if(entry.state==='retrying'&&now()>=entry.retryAt)load(entry);
 }
 return Object.freeze({begin,want,end,destroy,retains:(id,material='')=>byAsset.has(pair(id,material)),pending:()=>status?(status.stats.queued+status.stats.loading):0,stats:()=>status?.stats||null,diagnostics:()=>status?{...status.stats,retrying:[...entries.values()].filter(e=>e.state==='retrying').length,cells:status.cells,leases:entries.size}:null});
}
