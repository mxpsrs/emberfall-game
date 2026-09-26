'use strict';
(() => {
 if(window.VeldrenEditorBridge)return;
 if(window.VELDREN_CONTEXT!=='editor')throw Error('World editor requires its dedicated editor viewport');
 const STORAGE_KEY='veldren-world-edits-backup-v2';
 const FREE_ZOOM_MIN=2,FREE_ZOOM_MAX=1600;
 const CAMERA_KEYS=new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','q','e','shift']);
 const cameraKeys=new Set();
 const free={x:null,y:null,vx:0,vy:0,yawTarget:0,tiltTarget:.4,zoomTarget:100};
 let ready=false,initializing=null,tool='select',selected=null,selectedScene=null,placementAsset=null,placementPreview=null,placementRotation=0,gameUiVisible=false;
 let pointer=null,drag=null,lastTick=performance.now(),snap={position:.25,rotation:15};
 let quarantined=[];
 let project={version:1,revision:0,updatedAt:null,changes:[]},projectWorld=null,sceneDocumentDirty=false,changes=new Map(),projectMeta={revision:0,count:0,path:'editor-data/world-edits.json',bytes:0,sha256:''};
 const T=window.VeldrenTerrainEdits;
 let terrainBrush={mode:'raise',radius:3,strength:.25,material:'grass'},terrainHover=null,terrainDrag=null;
 const touchPoints=new Map();let touchGesture=null;
 let editorSequence=0,editorRendering=false;
 let lastAppliedScene=null;

 const post=(type,payload={})=>{try{parent.postMessage({type:'veldren-editor-'+type,...payload},location.origin);}catch{}};
 const log=(message,level='info')=>post('log',{message,level});
 const ckey=(scene,kind,id)=>`${scene}|${kind}|${id}`;
 const deepClone=value=>JSON.parse(JSON.stringify(value,(key,item)=>{
  if(key==='building'||key==='doorMotion'||key==='route'||key==='path'||key.startsWith('_'))return undefined;
  if(typeof item==='function')return undefined;return item;
 }));

 const humanize=key=>String(key||'').replace(/[_\-.]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,m=>m.toUpperCase()).trim();
 function meshCategory(key){
  if(/castle|home|house|inn|shop|forge|hall|temple|tower|gate|wall|bridge|mine|windmill|building/i.test(key))return 'Buildings & Architecture';
  if(/tree|rock|mountain|bush|grass|plant|flower|stump|log|pine|oak/i.test(key))return 'Nature & Terrain';
  if(/bed|table|chair|shelf|book|barrel|crate|sack|rack|throne|altar|well|chest|lumber|candle/i.test(key))return 'Furniture & Interior';
  return 'World Props';
 }
 const presetTemplates={
  lamp:{type:'prop',name:'Square lantern',streetLantern:true},counter:{type:'prop',name:'Bank counter'},
  bookcase:{type:'prop',name:'Bookcase'},shelf:{type:'prop',name:'Storage shelf'},range:{type:'range',name:'Kitchen range'},
  hearth:{type:'camp',name:'Stone hearth'},fire:{type:'camp',name:'Campfire'},anvil:{type:'forge',name:'Anvil'},
  furnace:{type:'furnace',name:'Furnace'},tent:{type:'prop',name:'Canvas tent',campModel:'tent'},bedroll:{type:'prop',name:'Bedroll',campModel:'bedroll'},
  barrier:{type:'prop',name:'Palisade',campModel:'palisade'},bed:{type:'prop',name:'Bed'},rack:{type:'prop',name:'Weapon rack'},
  throne:{type:'prop',name:'Throne'},altar:{type:'prop',name:'Altar'},workbench:{type:'prop',name:'Tool table'},
  table:{type:'prop',name:'Table'},chair:{type:'prop',name:'Chair'},bench:{type:'prop',name:'Bench'},well:{type:'prop',name:'Village well'},
  monument:{type:'prop',name:'Civic market monument'},stall:{type:'prop',name:'Market stall'},cart:{type:'prop',name:'Supply cart'},
  barrel:{type:'prop',name:'Barrel'},logs:{type:'prop',name:'Log pile'},sign:{type:'prop',name:'Road sign'},planter:{type:'prop',name:'Planter'},
  watchpost:{type:'prop',name:'Goblin watch platform',civilDecor:'goblinWatch'},crane:{type:'prop',name:'Quarry crane',civilDecor:'crane'},
  stoneStock:{type:'prop',name:'Stone stock',civilDecor:'stoneStock'},storage:{type:'prop',name:'Supplies crate'}
 };
 function assetCatalog(){
  const out=[];
  if(typeof briarModels!=='undefined')for(const key of Object.keys(briarModels).sort()){
   const mesh=briarModels[key],bounds=mesh?.bounds||[[0,0,0],[0,0,0]],size=bounds[1].map((v,i)=>Number(v)-Number(bounds[0][i]));
   out.push({id:'mesh:'+key,source:'briar',key,name:humanize(key),category:meshCategory(key),size});
  }
  if(typeof VeldrenBuildings!=='undefined'&&typeof VeldrenBuildings.catalog==='function')for(const asset of VeldrenBuildings.catalog()){
   if(asset.source==='briar'&&out.some(item=>item.id==='mesh:'+asset.key))continue;
   out.push({...asset,buildingPart:true});
  }
  if(typeof creatureAssets!=='undefined')for(const key of Object.keys(creatureAssets).sort()){
   const a=creatureAssets[key];out.push({id:'creature:'+key,source:'creature',key,name:humanize(key),category:'Creature Models',size:a?.mesh?.bounds?[a.mesh.bounds[1][0]-a.mesh.bounds[0][0],a.mesh.bounds[1][1]-a.mesh.bounds[0][1],a.mesh.bounds[1][2]-a.mesh.bounds[0][2]]:null});
  }
  if(typeof PROP_RULES!=='undefined')for(const key of Object.keys(PROP_RULES).sort())out.push({id:'preset:'+key,source:'preset',key,name:humanize(key),category:'Veldren Prop Presets',size:PROP_RULES[key]?.size||null});
  return out;
 }
 function assetById(id){return assetCatalog().find(a=>a.id===id)||null;}

 const snapValue=(value,step)=>step?Math.round(value/step)*step:value;

 function protectedObject(o){
  return !!(o?.tutor||o?.mainStoryKey||o?.mountainKey||o?.questModel||o?.serviceOwner||o?.characterSprite||o?.civilStair||o?.destination||['door','exit','questgiver','elder','shop','inn','forge','enemy','boss','man','dummy'].includes(o?.type));
 }
 function buildingId(b,index){
  if(b._editorId)return b._editorId;
  const service=b.service?.id!=null?String(b.service.id):'none';
  return b._editorId=`building:${service}:${String(b.name||'building').replace(/\|/g,'_')}:${index}`;
 }
 function sceneBuildings(scene){return worldScenes?.[scene]?.buildings||[]}
 function sceneObjects(scene){return worldScenes?.[scene]?.objects||[]}
 function authoredEntity(ref){
  const id=ref?.entity?._sceneEntityId;if(!id||!projectWorld)return null;
  const scene=projectWorld.scenes.find(item=>item.scene===String(currentScene));const entity=scene?.entities.find(item=>item.id===String(id));
  return entity?{scene,entity}:null;
 }
 function refForObject(o){return {kind:'object',entity:o,id:String(o.id)}}
 function refForBuilding(b,scene=String(currentScene)){
  const list=sceneBuildings(scene),index=Math.max(0,list.indexOf(b));return {kind:'building',entity:b,id:buildingId(b,index)};
 }
 function resolveRef(kind,id,scene=String(currentScene)){
  if(kind==='building'){
   const list=sceneBuildings(scene);for(let i=0;i<list.length;i++)if(buildingId(list[i],i)===String(id))return {kind:'building',entity:list[i],id:String(id)};
   return null;
  }
  const o=sceneObjects(scene).find(o=>String(o.id)===String(id));return o?{kind:'object',entity:o,id:String(id)}:null;
 }
 function ensureBase(ref){
  const e=ref.entity;if(e._editorBase)return e._editorBase;
  const base={x:Number(e.x)||0,y:Number(e.y)||0,rotation:entityRotation(ref),scale:entityScale(ref),name:e.name||e.propKind||e.type||'Entity',type:ref.kind==='building'?'building':e.type||'object',subtype:ref.kind==='building'?e.archetype||e.race||'building':e.propKind||e.kind||e.type||'object'};
  const authored=authoredEntity(ref);if(authored)base.sceneTransform=JSON.parse(JSON.stringify(authored.entity.transform));
  try{Object.defineProperty(e,'_editorBase',{value:base,writable:true,configurable:true});}catch{e._editorBase=base}
  return base;
 }
 function entityRotation(ref){
  const e=ref.entity;if(e.assembly)return Math.atan2(e.assembly.parent[2],e.assembly.parent[0])*180/Math.PI;if(ref.kind==='building')return Number(e.editorTransform?.rotation)||0;
  if(Number.isFinite(e.editorTransform?.rotation))return Number(e.editorTransform.rotation);
  if(Number.isFinite(e.placement?.yaw))return Number(e.placement.yaw)*180/Math.PI;
  if(Number.isFinite(e.heading))return Number(e.heading)*180/Math.PI;return 0;
 }
 function entityScale(ref){if(ref.entity.assembly)return Math.hypot(ref.entity.assembly.parent[0],ref.entity.assembly.parent[8]);return Math.max(.1,Math.min(10,Number(ref.entity.editorTransform?.scale)||1))}
 function entityInfo(ref){
  if(!ref)return null;const e=ref.entity,base=ensureBase(ref);
  return {scene:String(currentScene),kind:ref.kind,id:String(ref.id),name:e.name||e.propKind||e.type||'Entity',
   type:ref.kind==='building'?'building':e.type||'object',subtype:ref.kind==='building'?e.archetype||e.race||'building':e.editorAsset?`${e.editorAsset.source}:${e.editorAsset.key}`:e.propKind||e.kind||e.type||'object',
   x:Number(e.x)||0,y:Number(e.y)||0,rotation:entityRotation(ref),scale:entityScale(ref),
   protected:ref.kind==='building'?!!(e.service||e.civilCastle||e.walkIn):protectedObject(e),baseX:base.x,baseY:base.y};
 }
 function allEntities(){
  if(!ready)return [];
  if(buildingContext)return [entityInfo(buildingContext)];
  const out=[];for(const o of objects)if(!o._editorPreview)out.push(entityInfo(refForObject(o)));
  const list=buildings;for(let i=0;i<list.length;i++)out.push(entityInfo({kind:'building',entity:list[i],id:buildingId(list[i],i)}));
  return out;
 }
 function selectRef(ref){
  selected=ref;selectedScene=ref?String(currentScene):null;post('selection',{selection:entityInfo(selected)});return entityInfo(selected);
 }

 function updatePreviewIndex(e,oldX,oldY){
  // The world index buckets static props by 16 tiles. Move only this entry
  // during a drag; rebuilding every bucket on every pointer event is costly.
  try{
   const index=worldObjectIndex;
   if(!index||index.scene!==currentScene||index.revision!==worldObjectRevision||index.length!==objects.length||index.actors.includes(e))return;
   const oldKey=Math.floor(oldX/16)+':'+Math.floor(oldY/16),nextKey=Math.floor(e.x/16)+':'+Math.floor(e.y/16);
   if(oldKey===nextKey)return;
   const old=index.buckets.get(oldKey),at=old?.indexOf(e)??-1;if(at<0)return;
   old.splice(at,1);if(!old.length)index.buckets.delete(oldKey);
   if(!index.buckets.has(nextKey))index.buckets.set(nextKey,[]);
   index.buckets.get(nextKey).push(e);
  }catch{}
 }
 function invalidate(e,kind='object',preview=false){
  if(kind==='building'&&e.assembly)return;
  // Buildings are intentionally NOT evicted from the static geometry cache
  // while the editor drags them. Their existing cached mesh is translated by
  // a Filament model matrix instead. Rebuilding world-space roof geometry at
  // every pointer event created stale roof/renderable trails.
  if(kind!=='building'){
   try{staticMeshes3?.delete?.(e)}catch{}
   try{staticMeshQueues3?.prop?.delete?.(e)}catch{}
  }
  if(preview)return;
  try{worldObjectRevision++}catch{}
  try{realmNavigation?.clear?.()}catch{}
  try{resetLandSurface?.()}catch{}
  try{miniTerrain=null}catch{}
 }
 function moveLinkedObject(o,x,y){
  o.x=x;o.y=y;if(Number.isFinite(o.homeX))o.homeX=x;if(Number.isFinite(o.homeY))o.homeY=y;if(Number.isFinite(o.drawX))o.drawX=x;if(Number.isFinite(o.drawY))o.drawY=y;
 }
 function translateRoom(room,dx,dy){
  if(!room)return;
  if(Number.isFinite(room.x))room.x+=dx;if(Number.isFinite(room.y))room.y+=dy;
  if(Array.isArray(room.door)&&Number.isFinite(room.door[0])&&Number.isFinite(room.door[1])){room.door[0]+=dx;room.door[1]+=dy;}
 }
 function translateStructure(structure,dx,dy){
  if(!structure)return;
  if(structure.ramp){if(Number.isFinite(structure.ramp.x))structure.ramp.x+=dx;if(Number.isFinite(structure.ramp.y))structure.ramp.y+=dy;}
  if(Array.isArray(structure.decks))for(const deck of structure.decks){if(Number.isFinite(deck.x))deck.x+=dx;if(Number.isFinite(deck.y))deck.y+=dy;}
 }
 function translateWallMap(map,dx,dy){
  if(!(map instanceof Map)||(!dx&&!dy))return map;
  const shifted=new Map();
  for(const tile of map.values()){
   const copy={...tile};
   if(Number.isFinite(copy.x))copy.x+=dx;if(Number.isFinite(copy.y))copy.y+=dy;
   shifted.set(copy.x+':'+copy.y,copy);
  }
  return shifted;
 }
 function translateBuildingLinks(b,dx,dy){
  const destination=b.service?.destination;
  if(b.service)moveLinkedObject(b.service,Number(b.service.x||0)+dx,Number(b.service.y||0)+dy);

  // Interior/courtyard content is separate world-object data and must follow
  // the shell. This keeps furniture, stairs, NPCs and doors with the house.
  for(const o of objects){
   if(o===b.service)continue;
   if(destination&&(o.interiorBuilding===destination||o.civilCourtyard===destination)){
    moveLinkedObject(o,Number(o.x||0)+dx,Number(o.y||0)+dy);
   }
  }

  for(const key of ['civilRooms','civilUpperRooms'])if(Array.isArray(b[key]))for(const room of b[key])translateRoom(room,dx,dy);

  const structures=new Set();
  if(b.civilUpper)structures.add(b.civilUpper);
  if(b.civilRampart)structures.add(b.civilRampart);
  if(Array.isArray(b.civilUpperLevels))for(const structure of b.civilUpperLevels)if(structure)structures.add(structure);
  for(const structure of structures)translateStructure(structure,dx,dy);

  if(b.civilWallTiles instanceof Map)b.civilWallTiles=translateWallMap(b.civilWallTiles,dx,dy);

  if(b.southPlan){
   if(Number.isFinite(b.southPlan.x))b.southPlan.x+=dx;if(Number.isFinite(b.southPlan.y))b.southPlan.y+=dy;
   if(b.southPlan.service&&b.southPlan.service!==b.service)moveLinkedObject(b.southPlan.service,Number(b.southPlan.service.x||0)+dx,Number(b.southPlan.service.y||0)+dy);
  }
 }
 function setEntityTransform(ref,input,record=true,preview=false){
  if(!ref)return null;const e=ref.entity,base=ensureBase(ref),oldX=Number(e.x)||0,oldY=Number(e.y)||0;
  let x=Number.isFinite(Number(input.x))?Number(input.x):oldX,y=Number.isFinite(Number(input.y))?Number(input.y):oldY;
  x=snapValue(x,snap.position);y=snapValue(y,snap.position);
  let rotation=Number.isFinite(Number(input.rotation))?Number(input.rotation):entityRotation(ref);rotation=snapValue(rotation,snap.rotation);
  const scale=Math.max(.1,Math.min(10,Number.isFinite(Number(input.scale))?Number(input.scale):entityScale(ref)));
  if(e._sceneEntityId){
   if(!projectWorld)throw Error('The canonical scene document is unavailable');
   const result=window.VeldrenSceneFormat.setWorldTransform(projectWorld,String(currentScene),e._sceneEntityId,{x,y,rotation,scale});
   moveLinkedObject(e,result.x,result.y);e.editorTransform={...(e.editorTransform||{}),rotation:result.rotation,scale:result.scale};
   e.heading=result.rotation*Math.PI/180;if(e._creatureMotion)e._creatureMotion.heading=e.heading;sceneDocumentDirty=true;
  }else if(ref.kind==='building'&&e.assembly){
   const angle=rotation*Math.PI/180;e.assembly.parent=A.transform(x,0,y,angle,scale);B.sync(e);
  }else if(ref.kind==='building'){
   const dx=x-oldX,dy=y-oldY;e.x=x;e.y=y;e.editorTransform={...(e.editorTransform||{}),rotation,scale};
   translateBuildingLinks(e,dx,dy);
  }else{
   moveLinkedObject(e,x,y);e.editorTransform={...(e.editorTransform||{}),rotation,scale};
   if(e.placement)e.placement={...e.placement,yaw:rotation*Math.PI/180,offset:[...(e.placement.offset||[0,0])]};
   else if(!protectedObject(e))e.placement={anchor:'editor',reason:'Veldren editor placement',offset:[0,0],yaw:rotation*Math.PI/180};
   e.heading=rotation*Math.PI/180;if(e._creatureMotion)e._creatureMotion.heading=e.heading;
  }
  if(preview&&ref.kind==='object')updatePreviewIndex(e,oldX,oldY);
  invalidate(e,ref.kind,preview);
  if(record)recordChange(ref,base);
  return entityInfo(ref);
 }
 function recordChange(ref,base=ensureBase(ref)){
  if(ref.entity._sceneEntityId){
   const authored=authoredEntity(ref),runtime=authored?.entity.components?.RuntimeBinding;
   if(!runtime){sceneDocumentDirty=true;return;}
   const info=entityInfo(ref),key=ckey(String(currentScene),ref.kind,ref.id),before=changes.get(key)||null;
   const unchanged=Math.abs(info.x-base.x)<1e-8&&Math.abs(info.y-base.y)<1e-8&&Math.abs(info.rotation-base.rotation)<1e-8&&Math.abs(info.scale-base.scale)<1e-8;
   const assembly=ref.kind==='building'&&ref.entity.assembly?B.serialize(ref.entity.assembly):null;
   if(unchanged&&!before?.created&&!assembly)changes.delete(key);
   else{
    const change={...(before||{}),scene:String(currentScene),kind:ref.kind,id:String(ref.id),name:info.name,type:info.type,subtype:info.subtype,
     baseX:Number(before?.baseX??base.x),baseY:Number(before?.baseY??base.y),x:info.x,y:info.y,rotation:info.rotation,scale:info.scale};
    if(before?.created||ref.entity._editorCreated){change.created=true;change.data=deepClone(ref.entity)}
    if(assembly)change.assembly=assembly;
    changes.set(key,change);
   }
   project.changes=[...changes.values()];return;
  }
  const info=entityInfo(ref),key=ckey(String(currentScene),ref.kind,ref.id),before=changes.get(key)||{};
  const change={...before,scene:String(currentScene),kind:ref.kind,id:String(ref.id),name:info.name,type:info.type,subtype:info.subtype,
   baseX:Number(before.baseX??base.x),baseY:Number(before.baseY??base.y),x:info.x,y:info.y,rotation:info.rotation,scale:info.scale};
  if(before.created){change.created=true;change.data=before.data}
  if(ref.entity.assembly)change.assembly=B.serialize(ref.entity.assembly);
  changes.set(key,change);project.changes=[...changes.values()];
 }

 function normalizeChange(c){
  return {...c,kind:c.kind==='building'?'building':'object',rotation:Number.isFinite(Number(c.rotation))?Number(c.rotation):(Number(c.yaw)||0)*180/Math.PI,scale:Number(c.scale)||1};
 }
 async function loadProject(){
  const response=await fetch('/api/editor/edits',{cache:'no-store'});if(!response.ok)throw new Error('Project edit file read failed: HTTP '+response.status);
  const payload=await response.json(),disk=payload.edits;
  projectWorld=payload.world?.format==='veldren.world'?JSON.parse(JSON.stringify(payload.world)):window.VeldrenSceneFormat.fromLegacy(disk);
  sceneDocumentDirty=false;
  if(Array.isArray(disk?.changes)){const valid=[];quarantined=[];for(const raw of disk.changes){try{window.VeldrenWorldEdits.validate(raw);valid.push(raw)}catch{quarantined.push(raw)}}disk.changes=valid;if(quarantined.length)log(quarantined.length+' incompatible edits preserved without applying.','warn');}
  if(!disk||disk.version!==1||!Array.isArray(disk.changes))throw new Error('Invalid project world edit file');
  const backup=(()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}})();
  if(!disk.changes.length&&!disk.terrain&&!payload.world?.scenes?.some(scene=>scene.entities?.length)&&backup?.version===1&&Array.isArray(backup.changes)&&(backup.changes.length||backup.terrain)){
   project={...backup,revision:payload.revision||0,changes:backup.changes.map(normalizeChange)};
   log(`Recovered browser-backup world edits. Save World will migrate them to the project file.`,'warn');
  }else project={...disk,revision:payload.revision||disk.revision||0,changes:disk.changes.map(normalizeChange)};
  changes=new Map(project.changes.map(c=>[ckey(c.scene,c.kind,c.id),c]));
  projectMeta={revision:payload.revision||0,count:disk.changes.length,path:payload.path,bytes:payload.bytes,sha256:payload.sha256};
  for(const c of project.changes)if(c.created){const n=Number(String(c.id).replace(/\D/g,''));if(Number.isFinite(n))editorSequence=Math.max(editorSequence,n)}
  return projectMeta;
 }
 function findFallback(scene,change){
  if(change.kind==='building'){
   const list=sceneBuildings(scene),candidates=list.map((b,i)=>({b,id:buildingId(b,i)})).filter(({b})=>(!change.name||b.name===change.name)&&Math.hypot((b.x??0)-(change.baseX??b.x),(b.y??0)-(change.baseY??b.y))<2.5);
   return candidates[0]?{kind:'building',entity:candidates[0].b,id:candidates[0].id}:null;
  }
  const candidates=sceneObjects(scene).filter(o=>(!change.name||o.name===change.name)&&(!change.type||o.type===change.type)&&Math.hypot((o.x??0)-(change.baseX??o.x),(o.y??0)-(change.baseY??o.y))<2.5);
  return candidates[0]?refForObject(candidates[0]):null;
 }
 function applyChange(change){
  change=normalizeChange(change);let ref=resolveRef(change.kind,change.id,change.scene);
  if(!ref)ref=findFallback(change.scene,change);
  if(change.deleted){
   if(!ref)return {matched:false,action:'delete-miss'};
   const list=ref.kind==='building'?sceneBuildings(change.scene):sceneObjects(change.scene),index=list.indexOf(ref.entity);if(index>=0)list.splice(index,1);
   return {matched:true,action:'deleted'};
  }
  if(change.created&&!ref&&change.data){
   const data=deepClone(change.data);data.id=change.id;if(change.kind==='building'){data._editorId=change.id;sceneBuildings(change.scene).push(data);ref={kind:'building',entity:data,id:String(change.id),created:true};}else{sceneObjects(change.scene).push(data);ref=refForObject(data)}
  }
  if(!ref)return {matched:false,action:'not-found'};
  ensureBase(ref);setEntityTransform(ref,{x:change.x,y:change.y,rotation:change.rotation,scale:change.scale},false);return {matched:true,action:'transformed'};
 }
 function applyAll(){
  const result=window.VeldrenWorldEdits.applyDocument({...project,source:'editor-api'});
  log(`Editor layer · ${result.applied} applied · ${result.unmatched} unmatched · ${result.rejected} rejected.`,result.rejected?'warn':'ok');
 }

 function canonical(c){
  return JSON.stringify({scene:c.scene,kind:c.kind,id:String(c.id),deleted:!!c.deleted,created:!!c.created,
   x:c.deleted?null:Number(c.x),y:c.deleted?null:Number(c.y),rotation:c.deleted?null:Number(c.rotation||0),scale:c.deleted?null:Number(c.scale||1),
   assembly:c.assembly||null,name:c.name||null,type:c.type||null,subtype:c.subtype||null,baseX:Number(c.baseX)||0,baseY:Number(c.baseY)||0});
 }
 async function saveProject(){
  const legacy={version:1,revision:projectMeta.revision+1,updatedAt:new Date().toISOString(),changes:[...changes.values()].map(normalizeChange),terrain:T.serialize()};
  const preserveIds=quarantined.filter(c=>c&&c.scene&&c.kind&&c.id!=null).map(c=>`${c.scene}:${c.kind}:${c.id}`);
  const persistentWorld=projectWorld?window.VeldrenSceneFormat.withoutRuntimeBindings(projectWorld):window.VeldrenSceneFormat.fromLegacy({version:1,revision:0,changes:[]});
  const outgoing=window.VeldrenSceneFormat.mergeLegacy(persistentWorld,legacy,{preserveIds});
  outgoing.expectedRevision=projectMeta.revision;
  const response=await fetch('/api/editor/edits',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(outgoing)});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||`Save HTTP ${response.status}`);
  const verifyResponse=await fetch(`/api/editor/edits?verify=${encodeURIComponent(result.revision)}&t=${Date.now()}`,{cache:'no-store'});
  const verify=await verifyResponse.json().catch(()=>({}));if(!verifyResponse.ok)throw new Error(verify.error||'Save verification reread failed');
  if(result.revision!==verify.revision||result.sha256!==verify.sha256||result.count!==verify.count)throw new Error('Save round-trip metadata mismatch');
  if(result.worldSha256!==verify.worldSha256||JSON.stringify(result.world)!==JSON.stringify(verify.world))throw new Error('Scene document save round-trip mismatch');
  const sent=new Map(legacy.changes.filter(c=>c&&c.id!=null).map(c=>[ckey(c.scene,c.kind,c.id),canonical(c)])),read=new Map((verify.edits?.changes||[]).filter(c=>c&&c.id!=null).map(c=>[ckey(c.scene,c.kind,c.id),canonical(normalizeChange(c))]));
  if(sent.size!==read.size)throw new Error(`Save round-trip count mismatch (${sent.size} vs ${read.size})`);
  for(const [key,value]of sent)if(read.get(key)!==value)throw new Error(`Save round-trip mismatch for ${key}`);
  if(JSON.stringify(outgoing.terrain)!==JSON.stringify(verify.edits?.terrain))throw new Error('Terrain save round-trip mismatch');
  projectWorld=JSON.parse(JSON.stringify(verify.world));window.VeldrenSceneFormat.attachRuntimeWorld(projectWorld,worldScenes);sceneDocumentDirty=false;
  project={...verify.edits,revision:verify.revision,changes:(verify.edits.changes||[]).filter(c=>{try{window.VeldrenWorldEdits.validate(c);return true}catch{return false}}).map(normalizeChange)};changes=new Map(project.changes.map(c=>[ckey(c.scene,c.kind,c.id),c]));
  projectMeta={revision:verify.revision,count:verify.count,path:verify.path,bytes:verify.bytes,sha256:verify.sha256};
  localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,revision:verify.revision,updatedAt:verify.updatedAt,changes:project.changes,terrain:verify.edits.terrain}));
  return {...result,roundTripVerified:true};
 }


 function renderEditorAsset(r,o,x,z){
  const asset=o?.editorAsset;if(!asset)return null;
  const rotation=(Number(o.editorTransform?.rotation)||0)*Math.PI/180,scale=Math.max(.05,Number(o.editorTransform?.scale)||1);
  if(asset.source==='briar'&&typeof briarModels!=='undefined'){
   const mesh=briarModels[asset.key];if(!mesh)return null;const [lo,hi]=mesh.bounds,cx=(lo[0]+hi[0])/2,cz=(lo[2]+hi[2])/2;
   briarEmit(r,mesh,briarTransform(x-cx*scale,-lo[1]*scale,z-cz*scale,scale,rotation,scale));
   return (hi[1]-lo[1])*scale;
  }
  if(asset.source==='creature'&&typeof creatureAssets!=='undefined'&&creatureAssets[asset.key]){
   let proxy=o._editorCreatureProxy;
   if(!proxy){proxy={id:o.id,type:'enemy',kind:asset.key,creatureLook:asset.key,name:o.name,x:o.x,y:o.y,drawX:o.x,drawY:o.y,homeX:o.x,homeY:o.y,dead:0,hp:1,maxhp:1,level:1,atk:0,attackAt:-100,hitAt:-100};try{Object.defineProperty(o,'_editorCreatureProxy',{value:proxy,writable:true,configurable:true})}catch{o._editorCreatureProxy=proxy}}
   Object.assign(proxy,{x:o.x,y:o.y,drawX:o.x,drawY:o.y,homeX:o.x,homeY:o.y,size:scale,attackHeading:rotation,lockAttackHeading:true});
   proxy._creatureMotion??={time,x,z,phase:0,blend:0,speed:0,heading:rotation};proxy._creatureMotion.heading=rotation;proxy._creatureMotion.x=x;proxy._creatureMotion.z=z;
   return creature3(r,proxy,x,z);
  }
  return null;
 }

 function installTransformRendering(){
  if(typeof prop3==='function'&&!prop3.__editorTransform){
   const before=prop3;
   prop3=function(r,o,x,z){
    const direct=renderEditorAsset(r,o,x,z);if(direct!==null)return direct;
    const scale=Number(o?.editorTransform?.scale)||1,rotation=Number(o?.editorTransform?.rotation)||0;
    if(Math.abs(scale-1)<.0001&&Math.abs(rotation)<.0001)return before(r,o,x,z);
    const offset=o?.placement?.offset||[0,0],cx=x+Number(offset[0]||0),cz=z+Number(offset[1]||0),angle=rotation*Math.PI/180;
    const m=affineMultiply(briarTransform(cx,0,cz,scale,angle),briarTransform(-cx,0,-cz,1));
    const q={software:r.software,face(points,color,normals,material,colors,uvs){r.face(points.map(p=>briarPoint(p,0,m)),color,normals,material,colors,uvs)}};
    if(r.indexed)q.indexed=(mesh,t,style)=>r.indexed(mesh,affineMultiply(m,t),style);if(r.skinned)q.skinned=(mesh,t,palette,style)=>r.skinned(mesh,affineMultiply(m,t),palette,style);
    return before(q,o,x,z);
   };prop3.__editorTransform=true;
  }
  if(typeof cachedMesh3==='function'&&!cachedMesh3.__editorBuildingTransform){
   const beforeCached=cachedMesh3;
   cachedMesh3=function(key,kind,build){
    const cached=beforeCached(key,kind,build);
    if(kind==='building'&&key&&!key.assembly){
     // Each cached variant remembers where its world-space vertices were first
     // generated. From then on, moving/rotating/scaling the building changes
     // only this model matrix; the roof mesh itself is not regenerated.
     if(!cached._editorBuildingOrigin)cached._editorBuildingOrigin={x:Number(key.x)||0,y:Number(key.y)||0,w:Number(key.w)||0,h:Number(key.h)||0};
     const origin=cached._editorBuildingOrigin,scale=Number(key.editorTransform?.scale)||1,rotation=(Number(key.editorTransform?.rotation)||0)*Math.PI/180;
     const fromX=origin.x+origin.w/2,fromZ=origin.y+origin.h/2,toX=(Number(key.x)||0)+(Number(key.w)||0)/2,toZ=(Number(key.y)||0)+(Number(key.h)||0)/2;
     cached.model=affineMultiply(briarTransform(toX,0,toZ,scale,rotation),briarTransform(-fromX,0,-fromZ,1));
    }
    return cached;
   };
   cachedMesh3.__editorBuildingTransform=true;
  }
  if(typeof buildingHull3==='function'&&!buildingHull3.__editorBuildingTransform){
   const beforeHull=buildingHull3;
   buildingHull3=function(cached){
    if(!cached?.model)return beforeHull(cached);
    if(!cached._editorBasePickPoints){
     const layers=new Map(),add=p=>{const k=Math.round(p[1]*20),b=layers.get(k);if(b){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.min(b[2],p[2]);b[3]=Math.max(b[3],p[0]);b[4]=Math.max(b[4],p[1]);b[5]=Math.max(b[5],p[2]);}else layers.set(k,[...p,...p]);};
     for(const f of cached.faces||[])for(const p of f.points)add(p);
     for(const {mesh,matrix}of cached.instances||[])if(mesh.bounds){const [lo,hi]=mesh.bounds;for(const x of [lo[0],hi[0]])for(const y of [lo[1],hi[1]])for(const z of [lo[2],hi[2]])add(briarPoint([x,y,z],0,matrix));}
     cached._editorBasePickPoints=[...layers.values()].flatMap(b=>[[b[0],b[1],b[2]],[b[3],b[1],b[2]],[b[3],b[4],b[5]],[b[0],b[4],b[5]]]);
    }
    const pickW=screen.w||900,pickH=screen.h||500,key=[...cached.model,view3d.yaw,cameraPitch3(),cameraZoom3(),px,py,pickW,pickH].join(':');
    if(cached._editorHullKey!==key){
     const points=cached._editorBasePickPoints.map(p=>project3(...briarPoint(p,0,cached.model),view3d,px+.5,py+.5,pickW,pickH)).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lower=[],upper=[];
     for(const p of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
     for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
     lower.pop();upper.pop();cached._editorHull=lower.concat(upper);cached._editorHullKey=key;
    }
    return cached._editorHull;
   };
   buildingHull3.__editorBuildingTransform=true;
  }
 }
 function withFreeAnchor(task){
  if(!Number.isFinite(free.x))return task();
  const x=px,y=py;px=free.x;py=free.y;try{return task()}finally{px=x;py=y;}
 }
 function editorProject(x,y,z){return withFreeAnchor(()=>project3(x,y,z))}
 function editorUnproject(x,y){return withFreeAnchor(()=>unproject3(x,y))}
 function installCameraRendering(){
   if(typeof draw3d!=='function'||draw3d.__editorCamera)return;
   const before=draw3d;
   const wrapped=function(...args){editorRendering=true;try{const result=before(...args);drawBuildingOverlay();drawTerrainOverlay();return result;}finally{editorRendering=false}};
   wrapped.__editorCamera=true;draw3d=wrapped;draw=wrapped;
 }

 function editorInputSurface(){return document.getElementById('world')||document.querySelector('.realm-surface')}
 function isViewportTarget(target,surface){return target===surface||target?.classList?.contains?.('realm-surface')===true}
 function eventPoint(event){
  const surface=editorInputSurface();if(!surface)return null;const rect=surface.getBoundingClientRect();
  if(!(rect.width>0&&rect.height>0))return null;
  return {surface,rect,sx:(event.clientX-rect.left)/rect.width*screen.w,sy:(event.clientY-rect.top)/rect.height*screen.h};
 }
 function pointInPolygon(x,y,poly){
  let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j],ax=a.x??a[0],ay=a.y??a[1],bx=b.x??b[0],by=b.y??b[1];if(((ay>y)!==(by>y))&&(x<(bx-ax)*(y-ay)/(by-ay||1e-9)+ax))inside=!inside}return inside;
 }
 function pick(event){
  const p=eventPoint(event);if(!p)return null;
  try{
   for(let i=hitboxes.length-1;i>=0;i--){const h=hitboxes[i],hit=h.polygon?pointInPolygon(p.sx,p.sy,h.polygon):Number.isFinite(h.x)&&p.sx>=h.x&&p.sx<=h.x+h.w&&p.sy>=h.y&&p.sy<=h.y+h.h;if(!hit)continue;if(h.building)return refForBuilding(h.building);if(h.o&&sceneObjects(currentScene).includes(h.o))return refForObject(h.o)}
  }catch{}
  const w=editorUnproject(p.sx,p.sy);let best=null,score=Infinity;
  for(const o of objects){const d=Math.hypot((o.drawX??o.x)+.5-w.x,(o.drawY??o.y)+.5-w.z);if(d<score){best=refForObject(o);score=d}}
  for(let i=0;i<buildings.length;i++){const b=buildings[i],cx=b.x+b.w/2,cy=b.y+b.h/2,d=Math.hypot(cx-w.x,cy-w.z)-Math.hypot(b.w,b.h)/2;if(d<score){best={kind:'building',entity:b,id:buildingId(b,i)};score=d}}
  return score<Math.max(1.5,50/Math.max(10,cameraZoom3()))?best:null;
 }

 function removePlacementPreview(){
  if(!placementPreview)return;const scene=placementPreview._editorScene,list=sceneObjects(scene),at=list.indexOf(placementPreview);if(at>=0)list.splice(at,1);const oi=objects.indexOf(placementPreview);if(oi>=0)objects.splice(oi,1);try{staticMeshes3?.delete?.(placementPreview);staticMeshQueues3?.prop?.delete?.(placementPreview)}catch{}placementPreview=null;worldObjectRevision++;worldObjectIndex=null;
 }
 function ensurePlacementPreview(asset){
  if(placementPreview&&placementPreview._editorAssetId===asset.id&&placementPreview._editorScene===String(currentScene))return placementPreview;
  removePlacementPreview();const x=Number.isFinite(free.x)?free.x:Number(px)||0,y=Number.isFinite(free.y)?free.y:Number(py)||0,template=asset.source==='preset'?(presetTemplates[asset.key]||{name:asset.name}):{name:asset.name};
  placementPreview={id:`editor-preview-${++editorSequence}`,type:'prop',...template,propKind:asset.source==='preset'?asset.key:undefined,x,y,homeX:x,homeY:y,drawX:x,drawY:y,dead:0,hitAt:-100,attackAt:-100,editorAsset:{source:asset.source,key:asset.key,category:asset.category},editorTransform:{rotation:placementRotation,scale:1},walkThrough:true,placement:{anchor:'editor',yaw:0,offset:[0,0],reason:'Temporary asset placement preview'},_editorPreview:true,_editorAssetId:asset.id,_editorScene:String(currentScene)};
  const list=sceneObjects(currentScene);list.push(placementPreview);if(list!==objects&&!objects.includes(placementPreview))objects.push(placementPreview);worldObjectRevision++;worldObjectIndex=null;return placementPreview;
 }
 function movePlacementPreview(x,y){
  if(!placementAsset)return;const o=ensurePlacementPreview(placementAsset),oldX=o.x,oldY=o.y;x=snapValue(x-.5,snap.position);y=snapValue(y-.5,snap.position);if(Math.abs(oldX-x)<.001&&Math.abs(oldY-y)<.001)return;
  o.x=o.drawX=o.homeX=x;o.y=o.drawY=o.homeY=y;o.editorTransform.rotation=placementRotation;updatePreviewIndex(o,oldX,oldY);invalidate(o,'object',true);
 }
 function rotatePlacement(delta=15){if(!placementAsset)return false;placementRotation=(placementRotation+Number(delta)||0)%360;if(placementPreview)placementPreview.editorTransform.rotation=placementRotation;return placementRotation;}
 function createPlacedAsset(asset,x,y){
  if(!asset)throw Error('No asset selected');
  x=snapValue(x-.5,snap.position);y=snapValue(y-.5,snap.position);
  const id=`editor-asset-${Date.now()}-${++editorSequence}`;
  let base={type:'prop',name:asset.name,walkThrough:true};
  if(asset.source==='preset')base={...(presetTemplates[asset.key]||{type:'prop',name:asset.name}),propKind:asset.key,walkThrough:false};
  const o={id,...base,x,y,homeX:x,homeY:y,drawX:x,drawY:y,dead:0,hitAt:-100,attackAt:-100,
   editorAsset:{source:asset.source,key:asset.key,category:asset.category},editorTransform:{rotation:placementRotation,scale:1},
   placement:{anchor:'editor',yaw:0,offset:[0,0],reason:'Placed from Veldren asset browser'},_editorCreated:true};
  const list=sceneObjects(currentScene);list.push(o);if(list!==objects&&!objects.includes(o))objects.push(o);
  const graphEntity=window.VeldrenSceneFormat.attachRuntimeEntity(projectWorld,currentScene,'object',o,list.length-1);if(graphEntity)o._sceneEntityId=graphEntity.id;
  const ref=refForObject(o);ensureBase(ref);const info=entityInfo(ref);
  const change={scene:String(currentScene),kind:'object',id:String(id),name:info.name,type:info.type,subtype:info.subtype,baseX:x,baseY:y,created:true,data:deepClone(o),x,y,rotation:0,scale:1};
  change.rotation=placementRotation;changes.set(ckey(currentScene,'object',id),change);project.changes=[...changes.values()];selected=ref;selectedScene=String(currentScene);invalidate(o);
  post('change',{selection:info,placed:true,asset});return info;
 }

 const A=globalThis.VeldrenAssembly,B=window.VeldrenBuildings;
 function cancelPartPlacement(){partPlacement=null;partPlacementAsset=null;partPreview=null;partPlacementPoint=null;partPlacementRotation=0;if(tool==='place')tool='select';}
 let buildingContext=null,partId=null,partPlacement=null,partPlacementAsset=null,partPreview=null,partDrag=null,buildingFloor=0,partPlacementRotation=0,partPlacementPoint=null;
 let buildingSnap={grid:.25,rotation:15,vertical:3,mode:'edge'},floorIsolated=false,floorsBelow=true;
 const buildingHistory=new A.History();
 function assembly(){return buildingContext?.entity.assembly;}
 function buildingState(){const a=assembly(),parent=a?.parent;return buildingContext?{id:buildingContext.id,name:buildingContext.entity.name,parts:A.serialize(a).modules,selected:partId,floor:buildingFloor,snap:{...buildingSnap},transform:parent?{x:parent[3],z:parent[11],rotation:Math.atan2(parent[2],parent[0])*180/Math.PI}:null,isolate:floorIsolated,below:floorsBelow,undo:buildingHistory.undoStack.length,redo:buildingHistory.redoStack.length,preview:partPreview?{valid:partPreview.valid,reason:partPreview.reason}:null}:null;}
 function recordBuilding(before){
  const b=buildingContext.entity;B.commit(b);const key=ckey(currentScene,'building',buildingContext.id),previous=changes.get(key);
  if(buildingContext.created||previous?.created){const data=deepClone(b);delete data.assembly;data.id=buildingContext.id;changes.set(key,{...(previous||{}),scene:String(currentScene),kind:'building',id:buildingContext.id,name:b.name,type:'building',subtype:'modular',baseX:Number(data.x)||0,baseY:Number(data.y)||0,created:true,data});}
  recordChange(buildingContext);changes.get(key).assembly=A.serialize(b.assembly);
  if(before)buildingHistory.push(before,b.assembly);post('building',{state:buildingState()});post('change',{selection:entityInfo(buildingContext)});
 }
 function startNewBuilding(){
  if(!worldScenes?.[currentScene])throw Error('The active scene is not ready');
  const x=snapValue(Number(free.x)||0,buildingSnap.grid),y=snapValue(Number(free.y)||0,buildingSnap.grid),id='editor-building-'+(++editorSequence);
  const b={id,name:'New Modular Building',type:'building',archetype:'modular',race:'human',x,y,w:1,h:1,editorCreated:true,editorTransform:{rotation:0,scale:1}};b._editorId=id;
  const list=sceneBuildings(currentScene);list.push(b);if(list!==buildings&&!buildings.includes(b))buildings.push(b);const ref={kind:'building',entity:b,id,created:true,uncommittedEmpty:true};
  B.create(b,{version:1,buildingId:id,parent:A.transform(x,0,y),modules:[],layout:[]},worldScenes[currentScene]);
  const graphEntity=window.VeldrenSceneFormat.attachRuntimeEntity(projectWorld,currentScene,'building',b,list.length-1);if(graphEntity)b._sceneEntityId=graphEntity.id;
  selected=ref;selectedScene=String(currentScene);buildingContext=ref;partId=null;cancelPartPlacement();buildingFloor=0;tool='select';
  log('Empty modular assembly started at '+x.toFixed(2)+', '+y.toFixed(2)+'. It is not saved until a part is placed.','ok');post('selection',{selection:entityInfo(ref)});return buildingState();
 }
 function enterBuilding(){
  if(selected?.kind==='building'){buildingContext=selected;B.ensure(selected.entity,worldScenes[currentScene]);buildingContext.created=!!changes.get(ckey(currentScene,'building',buildingContext.id))?.created;buildingContext.uncommittedEmpty=false;}
  else return startNewBuilding();
  partId=null;cancelPartPlacement();buildingFloor=0;tool='select';return buildingState();
 }
 function exitBuilding(){
  if(buildingContext?.uncommittedEmpty&&!assembly()?.modules.length){const b=buildingContext.entity,list=sceneBuildings(currentScene),i=list.indexOf(b);if(i>=0)list.splice(i,1);if(buildings!==list){const active=buildings.indexOf(b);if(active>=0)buildings.splice(active,1);}B.cache.delete(b);if(selected?.entity===b)selected=null;}
  cancelPartPlacement();partDrag=null;B.floorFilter=null;buildingContext=null;partId=null;post('building',{state:null});return true;
 }
 function selectPart(id){if(!assembly()?.modules.some(m=>m.id===id))throw Error('Part not found');partId=id;partPlacement=null;partPreview=null;post('building',{state:buildingState()});return buildingState();}
 function setPart(input,history=true){
  const a=assembly(),m=a?.modules.find(p=>p.id===partId);if(!m)throw Error('Select a part');const before=A.serialize(a);
  try{
  if(m.role==='entrance'&&input.host){B.opening(buildingContext.entity,m,input.host);}
  else{
   const local=[...m.local];for(const [key,i]of [['x',3],['height',7],['z',11]])if(input[key]!=null){if(!Number.isFinite(Number(input[key])))throw Error('Invalid coordinate');local[i]=Number(input[key]);}
   if(input.rotation!=null||input.scale!=null){const angle=(input.rotation==null?Math.atan2(local[2],local[0])*180/Math.PI:Number(input.rotation))*Math.PI/180,oldAngle=Math.atan2(local[2],local[0]),scale=input.scale==null?1:Number(input.scale)/Math.hypot(local[0],local[8]);const basis=A.multiply(A.transform(0,0,0,angle-oldAngle,scale),[...local.slice(0,3),0,...local.slice(4,7),0,...local.slice(8,11),0]);for(const i of [0,1,2,4,5,6,8,9,10])local[i]=basis[i];}
   if(input.floor!=null&&Number(input.floor)!==m.floor){m.floor=Math.max(0,Math.min(32,Math.floor(Number(input.floor))));local[7]=m.floor*buildingSnap.vertical;if(m.stairs&&!m.stairs.rampPath){m.stairs.fromFloor=m.floor;m.stairs.toFloor=m.floor+1;}}
   if(input.model){const asset=B.catalog().find(item=>item.id===input.model),mesh=B.model(input.model);if(!mesh||!asset)throw Error('Local model unavailable');const expected=m.role==='entrance'?'door':m.role,nextRole=A.role(asset.key);if(nextRole!==expected)throw Error('Choose a replacement model with the same part function');if(m.objectId)throw Error('Gameplay-linked parts cannot change models');m.model=input.model;m.bounds=A.clone(mesh.bounds);}
   if(m.role==='entrance'&&(input.x!=null||input.z!=null)){const result=A.snap(a,{...m,role:'door',local},buildingSnap);if(!result.valid)throw Error(result.reason);B.opening(buildingContext.entity,m,result.host);}
   else{m.local=local;if(m.role==='window'&&input.host)B.opening(buildingContext.entity,m,input.host);}
  }
  // A wall opening is a component of its host, so moving the wall carries
  // its door/service coordinates using the same local delta.
  const old=before.modules.find(p=>p.id===m.id);
  if(old&&['wall','window'].includes(m.role)){const delta=A.multiply(m.local,A.inverse(old.local));for(const linked of a.modules.filter(p=>p.host===m.id)){linked.local=A.multiply(delta,linked.local);if(linked.opening){linked.opening.service=A.point(delta,linked.opening.service);const basis=[...delta];basis[3]=basis[7]=basis[11]=0;linked.opening.normal=A.point(basis,linked.opening.normal);}}}
  if(m.role==='stairs'&&!m.stairs?.rampPath&&!B.stairConnection(buildingContext.entity,m))throw Error('The stairs must rise from ground to an existing upper floor landing');
  B.sync(buildingContext.entity);if(history)recordBuilding(before);return buildingState();
  }catch(error){B.attach(buildingContext.entity,before,worldScenes[currentScene]);throw error;}
 }
 function deletePart(){const a=assembly(),m=a?.modules.find(p=>p.id===partId);if(!m)return;if(m.objectId)throw Error('Gameplay-linked parts must be moved, not deleted');const before=A.serialize(a);if(m.role==='entrance'&&m.host){const host=a.modules.find(p=>p.id===m.host);if(host?.originalModel){host.model=host.originalModel;host.role='wall';delete host.originalModel;}}a.modules=a.modules.filter(p=>p.id!==partId&&p.host!==partId);partId=null;recordBuilding(before);return buildingState();}
 function duplicatePart(){const a=assembly(),m=a?.modules.find(p=>p.id===partId);if(!m)return;if(m.role==='entrance'||m.objectId)throw Error('Gameplay-linked components cannot be duplicated');const before=A.serialize(a),copy=A.clone(m);copy.id='part-editor-'+Date.now()+'-'+(++editorSequence);copy.local[3]+=buildingSnap.grid||.25;delete copy.host;if(copy.role==='stairs'){copy.stairs={fromFloor:copy.floor,toFloor:copy.floor+1,origin:[copy.local[3],copy.local[7],copy.local[11]],rampPath:null};if(!B.stairConnection(buildingContext.entity,copy))throw Error('The stairs must reach an existing upper floor landing');}a.modules.push(copy);partId=copy.id;recordBuilding(before);return buildingState();}
 function buildingUndo(redo=false){const a=assembly();if(!a)return;const next=redo?buildingHistory.redo(a):buildingHistory.undo(a);if(next){B.attach(buildingContext.entity,next,worldScenes[currentScene]);recordBuilding();}return buildingState();}
 function setBuildingTransform(input,history=true){const a=assembly();if(!a)throw Error('Start Building Edit first');const before=A.serialize(a),parent=[...a.parent],angle=Math.atan2(parent[2],parent[0]),scale=Math.hypot(parent[0],parent[8])||1,x=input.x==null?parent[3]:Number(input.x),z=input.z==null?parent[11]:Number(input.z),rotation=input.rotation==null?angle*180/Math.PI:Number(input.rotation);if(![x,z,rotation].every(Number.isFinite))throw Error('Enter valid building position and rotation');a.parent=A.transform(x,0,z,snapValue(rotation,buildingSnap.rotation)*Math.PI/180,scale);B.sync(buildingContext.entity);recordBuilding(history?before:null);return buildingState();}
 function setFloor(floor,isolate=floorIsolated,below=floorsBelow){buildingFloor=floor==='roof'?'roof':Number(floor);floorIsolated=!!isolate;floorsBelow=!!below;B.floorFilter={building:buildingContext?.entity,floor:buildingFloor,isolate:floorIsolated,below:floorsBelow};return buildingState();}
 function visiblePart(m){return !floorIsolated||(buildingFloor==='roof'?m.role==='roof':m.floor===buildingFloor||floorsBelow&&m.floor<buildingFloor);}
 function pickPart(p){let best=null,depth=-Infinity;for(const m of assembly().modules){if(m.role==='detail'||!visiblePart(m))continue;const matrix=A.multiply(assembly().parent,m.local),lo=m.bounds[0],hi=m.bounds[1],pts=[];for(const x of [lo[0],hi[0]])for(const y of [lo[1],hi[1]])for(const z of [lo[2],hi[2]])pts.push(editorProject(...A.point(matrix,[x,y,z])));const minX=Math.min(...pts.map(q=>q.x)),maxX=Math.max(...pts.map(q=>q.x)),minY=Math.min(...pts.map(q=>q.y)),maxY=Math.max(...pts.map(q=>q.y)),d=Math.max(...pts.map(q=>q.depth));if(p.sx>=minX&&p.sx<=maxX&&p.sy>=minY&&p.sy<=maxY&&d>depth){best=m;depth=d;}}return best;}
 function previewPart(p){if(!partPlacement)return;const asset=partPlacementAsset;if(!asset)return;partPlacementPoint=p;const w=editorUnproject(p.sx,p.sy),q=A.point(A.inverse(assembly().parent),[w.x,0,w.z]),floor=buildingFloor==='roof'?1:buildingFloor,local=A.transform(q[0],floor*buildingSnap.vertical,q[2],partPlacementRotation*Math.PI/180);
  const candidate={id:'preview',model:asset.id,role:A.role(asset.key),floor,local,bounds:A.clone(asset.bounds)};partPreview=A.snap(assembly(),candidate,{...buildingSnap,mode:candidate.role==='door'?'door-to-wall':candidate.role==='window'?'window-to-wall':buildingSnap.mode});
  if(candidate.role==='stairs'){partPreview.module.stairs={fromFloor:floor,toFloor:floor+1,origin:[partPreview.module.local[3],partPreview.module.local[7],partPreview.module.local[11]],rampPath:null};if(!B.stairConnection(buildingContext.entity,partPreview.module)){partPreview.valid=false;partPreview.reason='The stairs must reach an existing upper floor landing';}}
  if(['door','window'].includes(candidate.role)){const host=assembly().modules.find(m=>m.id===partPreview.host);const opening=host?.model.replace(/_(Straight|Window_Wide_Flat|Door_Round)$/,candidate.role==='door'?'_Door_Round':'_Window_Wide_Flat');if(!opening||!B.model(opening)){partPreview.valid=false;partPreview.reason='No compatible opening in this wall';}}
 }
 function placePart(){if(!partPreview?.valid)throw Error(partPreview?.reason||'Move the pointer to preview placement');const a=assembly(),before=A.serialize(a),m=A.clone(partPreview.module);m.id='part-editor-'+Date.now()+'-'+(++editorSequence);
  if(m.role==='door'){const existing=a.modules.find(p=>p.role==='entrance');if(existing?.objectId){existing.model=m.model;B.opening(buildingContext.entity,existing,partPreview.host);partId=existing.id;}else{B.opening(buildingContext.entity,m,partPreview.host);m.role='entrance';a.modules.push(m);partId=m.id;}}
  else if(m.role==='window'){const host=a.modules.find(p=>p.id===partPreview.host);B.opening(buildingContext.entity,m,host.id);host.model=m.model;host.role='window';partId=host.id;}
  else{if(m.role==='stairs'){m.stairs={fromFloor:m.floor,toFloor:m.floor+1,origin:[m.local[3],m.local[7],m.local[11]],rampPath:null};if(!B.stairConnection(buildingContext.entity,m))throw Error('The stairs must reach an existing upper floor landing');}a.modules.push(m);partId=m.id;}
  recordBuilding(before);return buildingState();
 }
 function buildingPointerDown(e,p){if(!buildingContext||tool==='camera')return false;if(e.button!==0)return true;if(partPlacement){previewPart(p);try{placePart()}catch(error){log(error.message,'warn')}return true;}
  const m=pickPart(p);partId=m?.id||null;post('building',{state:buildingState()});if(!m)return true;
  const w=editorUnproject(p.sx,p.sy);partDrag={id:e.pointerId,before:A.serialize(assembly()),start:A.point(A.inverse(assembly().parent),[w.x,0,w.z]),local:[...m.local],clientX:e.clientX,clientY:e.clientY};try{p.surface.setPointerCapture?.(e.pointerId)}catch{}return true;}
 function buildingPointerMove(e,p){if(!buildingContext)return false;if(partPlacement){previewPart(p);return true;}if(!partDrag||partDrag.id!==e.pointerId)return false;const m=assembly().modules.find(p=>p.id===partId);if(!m)return true;const w=editorUnproject(p.sx,p.sy),q=A.point(A.inverse(assembly().parent),[w.x,0,w.z]);
  try{if(tool==='rotate')setPart({rotation:snapValue(Math.atan2(partDrag.local[2],partDrag.local[0])*180/Math.PI+(e.clientX-partDrag.clientX)*.5,buildingSnap.rotation)},false);else if(tool==='scale')setPart({scale:Math.max(.1,Math.hypot(partDrag.local[0],partDrag.local[8])*Math.exp((partDrag.clientY-e.clientY)*.008))},false);else{
   const candidate={...m,role:m.role==='entrance'?'door':m.role,local:[...partDrag.local]};candidate.local[3]+=q[0]-partDrag.start[0];candidate.local[11]+=q[2]-partDrag.start[2];const result=A.snap(assembly(),candidate,buildingSnap);partPreview=result;if(m.role!=='entrance')setPart({x:result.module.local[3],height:result.module.local[7],z:result.module.local[11]},false);
  }}catch(error){log(error.message,'warn')}return true;}
 function buildingPointerUp(e){if(!partDrag||partDrag.id!==e.pointerId)return false;const before=partDrag.before,m=assembly().modules.find(p=>p.id===partId);try{if(m.role==='entrance'){if(!partPreview?.valid)throw Error('Choose a compatible wall');B.opening(buildingContext.entity,m,partPreview.host);}recordBuilding(before);}catch(error){B.attach(buildingContext.entity,before,worldScenes[currentScene]);log(error.message,'warn')}partDrag=null;partPreview=null;try{editorInputSurface()?.releasePointerCapture?.(e.pointerId)}catch{}return true;}
 function drawBuildingGhost(m,valid){const mesh=B.model(m.model),p=mesh?.p,indices=mesh?.i;if(!p?.length||!indices?.length)return;const matrix=A.multiply(assembly().parent,m.local),colors=mesh.f||mesh.c,normals=mesh.n,total=Math.floor(indices.length/3),step=Math.max(1,Math.ceil(total/360)),faces=[],light=[.35,.82,.45],ll=Math.hypot(...light);for(let face=0;face<total;face+=step){const ia=Number(indices[face*3]),ib=Number(indices[face*3+1]),ic=Number(indices[face*3+2]),pts=[];for(const i of [ia,ib,ic]){const at=i*3,world=A.point(matrix,[Number(p[at])||0,Number(p[at+1])||0,Number(p[at+2])||0]),screen=editorProject(...world);pts.push({x:screen.x,y:screen.y,d:screen.depth});}if(pts.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y)))continue;const n=[0,1,2].map(ch=>[ia,ib,ic].reduce((sum,i)=>sum+(Number(normals?.[i*3+ch])||0),0)),dot=(n[0]*light[0]+n[1]*light[1]+n[2]*light[2])/(Math.hypot(...n)*ll||1),shade=.38+.62*Math.max(0,dot),rgb=[0,1,2].map(ch=>Math.round(255*Math.max(0,Math.min(1,[ia,ib,ic].reduce((sum,i)=>sum+(Number(colors?.[i*3+ch])||.48),0)/3*shade))));faces.push({pts,d:pts.reduce((a,v)=>a+v.d,0)/3,color:'rgb('+rgb.join(',')+')'});}faces.sort((a,b)=>a.d-b.d);ctx.save();ctx.globalAlpha=.82;ctx.strokeStyle=valid?'rgba(150,255,220,.28)':'rgba(255,145,155,.42)';ctx.lineWidth=.55;for(const face of faces){ctx.beginPath();face.pts.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x,p.y));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();ctx.stroke();}ctx.restore();}
 function drawBuildingOverlay(){if(!buildingContext)return;if(partPreview?.module)drawBuildingGhost(partPreview.module,partPreview.valid);const m=partPreview?.module||assembly().modules.find(m=>m.id===partId);if(!m)return;const matrix=A.multiply(assembly().parent,m.local),lo=m.bounds[0],hi=m.bounds[1],points=[];for(const x of [lo[0],hi[0]])for(const y of [lo[1],hi[1]])for(const z of [lo[2],hi[2]])points.push(editorProject(...A.point(matrix,[x,y,z])));ctx.save();ctx.strokeStyle=partPreview?(partPreview.valid?'#64e5bb':'#ff6c80'):'#80c7ff';ctx.fillStyle=partPreview?(partPreview.valid?'#64e5bb33':'#ff6c8033'):'#80c7ff22';ctx.lineWidth=2;for(const face of [[0,1,3,2],[4,5,7,6],[0,4,6,2],[1,5,7,3]]){ctx.beginPath();face.forEach((i,j)=>ctx[j?'lineTo':'moveTo'](points[i].x,points[i].y));ctx.closePath();ctx.fill();ctx.stroke();}ctx.restore();}
 function drawTerrainOverlay(){
  if(tool!=='terrain'||!terrainHover||currentScene!=='overworld'||typeof ring3!=='function')return;
  ctx.save();ring3(ctx,terrainHover.x,terrainHover.z,terrainDrag?'#f8de89':'#72e2b8',terrainBrush.radius);ctx.restore();
 }
 function terrainPoint(p){const w=editorUnproject(p.sx,p.sy);return Number.isFinite(w.x)&&Number.isFinite(w.z)?{x:w.x,z:w.z}:null;}
 function terrainStamp(w,final=false){
  const previous=terrainDrag?.last;
  const spacing=Math.max(.5,terrainBrush.radius*.5),distance=previous?Math.hypot(w.x-previous.x,w.z-previous.z):0;
  // Pointer events can repeat the same world point many times. Raise/lower
  // would otherwise apply another full brush and rebuild GPU chunks on each.
  const minTravel=Math.max(.15,Math.min(.75,terrainBrush.radius*.12));
  if(previous&&(distance<.001||!final&&distance<minTravel))return;
  const steps=previous?Math.max(1,Math.min(16,Math.ceil(distance/spacing))):1;
  for(let i=1;i<=steps;i++){
   const at=previous?{x:previous.x+(w.x-previous.x)*i/steps,z:previous.z+(w.z-previous.z)*i/steps}:w;
   const result=T.stroke({...terrainBrush,...at,scene:'overworld',target:terrainDrag.target});
   if(result.changed)terrainDrag.any=true;
  }
  terrainDrag.last=w;
 }
 function finishTerrain(){
  if(!terrainDrag)return;
  const changed=terrainDrag.any;
  T.endStroke();terrainDrag=null;
  post('terrain',{state:T.state(),changed});
 }

 function touchGeometry(){
  const surface=editorInputSurface(),rect=surface?.getBoundingClientRect();if(!rect?.width||!rect?.height||touchPoints.size<2)return null;
  const [a,b]=[...touchPoints.values()],x=(a.x+b.x)/2,y=(a.y+b.y)/2;
  return {sx:(x-rect.left)/rect.width*screen.w,sy:(y-rect.top)/rect.height*screen.h,span:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
 }
 function interruptForTouchGesture(){
  finishTerrain();
  if(partDrag&&buildingContext){B.attach(buildingContext.entity,partDrag.before,worldScenes[currentScene]);partDrag=null;partPreview=null;post('building',{state:buildingState()});}
  if(drag&&selected){const original=drag.kind==='move'?{x:drag.x,y:drag.y}:drag.kind==='rotate'?{rotation:drag.rotation}:{scale:drag.scale};setEntityTransform(selected,original,false,true);}
  drag=null;pointer=null;
 }
 function clearTouchInput(){
  if(touchPoints.size)interruptForTouchGesture();
  touchPoints.clear();touchGesture=null;
 }
 function moveTouchGesture(){
  const next=touchGeometry();if(!next||!touchGesture)return;
  {
   const from=editorUnproject(touchGesture.sx,touchGesture.sy),to=editorUnproject(next.sx,next.sy);
   if(Number.isFinite(from.x)&&Number.isFinite(from.z)&&Number.isFinite(to.x)&&Number.isFinite(to.z)){
    free.x+=from.x-to.x;free.y+=from.z-to.z;
   }
   free.zoomTarget=Math.max(FREE_ZOOM_MIN,Math.min(FREE_ZOOM_MAX,free.zoomTarget*next.span/touchGesture.span));
  }
  touchGesture=next;
 }

 function onPointerDown(e){
  const p=eventPoint(e);if(!ready||!p||!isViewportTarget(e.target,p.surface))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.pointerType==='touch'){
   touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touchPoints.size>=2){
    if(!touchGesture){interruptForTouchGesture();touchGesture=touchGeometry();}
    try{p.surface.setPointerCapture?.(e.pointerId)}catch{}return;
   }
   if(touchGesture)return;
  }
  if(e.button===1||e.button===2){pointer={id:e.pointerId,kind:'pan',x:e.clientX,y:e.clientY};try{p.surface.setPointerCapture?.(e.pointerId)}catch{}return;}
  if(e.button===0&&tool==='camera'){pointer={id:e.pointerId,kind:'orbit',x:e.clientX,y:e.clientY};try{p.surface.setPointerCapture?.(e.pointerId)}catch{}return;}
  if(e.button===0&&tool==='terrain'){
   if(currentScene!=='overworld'){log('Terrain editing is available in the overworld.','warn');return;}
   const w=terrainPoint(p);if(!w)return;
   try{
   T.beginStroke();terrainHover=w;
    terrainDrag={id:e.pointerId,last:null,any:false,target:terrainBrush.mode==='flatten'?landHeight(w.x,w.z):undefined,
     touchStart:e.pointerType==='touch'?{x:e.clientX,y:e.clientY,world:w}:null};
    if(!terrainDrag.touchStart)terrainStamp(w);
    try{p.surface.setPointerCapture?.(e.pointerId)}catch{}
   }catch(error){finishTerrain();log('Terrain brush failed: '+error.message,'error')}
   return;
  }
  if(buildingPointerDown(e,p))return;
  if(e.button!==0)return;
  if(tool==='place'){
   if(!placementAsset){log('Choose an asset from the Assets browser first.','warn');return;}
   const w=editorUnproject(p.sx,p.sy);movePlacementPreview(w.x,w.z);createPlacedAsset(placementAsset,w.x,w.z);return;
  }
  const ref=pick(e);selectRef(ref);
  if(!ref)return;
  ensureBase(ref);

  // Select mode keeps the original editor behavior: click an entity and drag
  // immediately to reposition it. The dedicated Move tool remains available
  // for explicit transform-mode workflows, but is not required.
  if(tool==='select'||tool==='move'){
   const w=editorUnproject(p.sx,p.sy);
   drag={id:e.pointerId,kind:'move',start:w,x:ref.entity.x,y:ref.entity.y};
  }
  if(tool==='rotate')drag={id:e.pointerId,kind:'rotate',clientX:e.clientX,rotation:entityRotation(ref)};
  if(tool==='scale')drag={id:e.pointerId,kind:'scale',clientY:e.clientY,scale:entityScale(ref)};
  if(drag)try{p.surface.setPointerCapture?.(e.pointerId)}catch{}
 }
 function onPointerMove(e){
  if(e.pointerType==='touch'&&touchPoints.has(e.pointerId)){
   touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touchGesture){if(touchPoints.size>=2)moveTouchGesture();e.preventDefault();e.stopImmediatePropagation();return;}
  }
  const bp=eventPoint(e);
  if(tool==='place'&&placementAsset&&bp&&isViewportTarget(e.target,bp.surface)){const w=editorUnproject(bp.sx,bp.sy);movePlacementPreview(w.x,w.z);}
  if(pointer&&e.pointerId===pointer.id){
   const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;
   if(pointer.kind==='pan'){
    const rect=bp?.rect;if(rect){
     const before=editorUnproject((e.clientX-dx-rect.left)/rect.width*screen.w,(e.clientY-dy-rect.top)/rect.height*screen.h);
     const after=editorUnproject(bp.sx,bp.sy);
     if(Number.isFinite(before.x)&&Number.isFinite(after.x)&&Number.isFinite(before.z)&&Number.isFinite(after.z)){
      free.x+=before.x-after.x;free.y+=before.z-after.z;
     }
    }
   }else if(pointer.kind==='orbit'){
    free.yawTarget+=dx*.008;free.tiltTarget=Math.max(.08,Math.min(1.35,free.tiltTarget+dy*.004));
   }
   e.preventDefault();e.stopImmediatePropagation();return;
  }
  if(tool==='terrain'&&bp&&isViewportTarget(e.target,bp.surface)){
   const w=terrainPoint(bp);if(w)terrainHover=w;
  }
  if(terrainDrag&&e.pointerId===terrainDrag.id){
   if(bp){try{const w=terrainPoint(bp);if(w){
    if(terrainDrag.touchStart){
     if(Math.hypot(e.clientX-terrainDrag.touchStart.x,e.clientY-terrainDrag.touchStart.y)<8){e.preventDefault();e.stopImmediatePropagation();return;}
     terrainStamp(terrainDrag.touchStart.world);terrainDrag.touchStart=null;
    }
    terrainStamp(w);
   }}catch(error){log('Terrain brush failed: '+error.message,'error');finishTerrain();}}
   e.preventDefault();e.stopImmediatePropagation();return;
  }
  if(bp&&buildingPointerMove(e,bp)){e.preventDefault();e.stopImmediatePropagation();return;}
  if(!drag||e.pointerId!==drag.id||!selected)return;
  if(drag.kind==='move'){const p=eventPoint(e);if(!p)return;const w=editorUnproject(p.sx,p.sy);setEntityTransform(selected,{x:drag.x+(w.x-drag.start.x),y:drag.y+(w.z-drag.start.z)},false,true)}
  if(drag.kind==='rotate')setEntityTransform(selected,{rotation:drag.rotation+(e.clientX-drag.clientX)*.55},false,true);
  if(drag.kind==='scale')setEntityTransform(selected,{scale:drag.scale*Math.exp((drag.clientY-e.clientY)*.008)},false,true);
  e.preventDefault();e.stopImmediatePropagation();
 }
 function onPointerUp(e){
  if(e.pointerType==='touch'&&touchPoints.delete(e.pointerId)&&touchGesture){
   if(touchPoints.size>=2)touchGesture=touchGeometry();
   else if(!touchPoints.size)touchGesture=null;
   try{editorInputSurface()?.releasePointerCapture?.(e.pointerId)}catch{}
   e.preventDefault();e.stopImmediatePropagation();return;
  }
  if(terrainDrag&&e.pointerId===terrainDrag.id){
   if(terrainDrag.touchStart&&e.type!=='pointercancel'){try{terrainStamp(terrainDrag.touchStart.world)}catch(error){log('Terrain brush failed: '+error.message,'error');}}
   else if(e.type!=='pointercancel'){try{const p=eventPoint(e),w=p&&terrainPoint(p);if(w)terrainStamp(w,true)}catch(error){log('Terrain brush failed: '+error.message,'error');}}
   finishTerrain();try{editorInputSurface()?.releasePointerCapture?.(e.pointerId)}catch{}e.preventDefault();e.stopImmediatePropagation();return;
  }
  if(buildingPointerUp(e)){e.preventDefault();e.stopImmediatePropagation();return;}
  const surface=editorInputSurface();
  if(pointer&&e.pointerId===pointer.id){pointer=null;try{surface?.releasePointerCapture?.(e.pointerId)}catch{}e.preventDefault();e.stopImmediatePropagation();return}
  if(drag&&e.pointerId===drag.id){
   if(selected?.entity.assembly)B.commit(selected.entity);
   else invalidate(selected.entity,selected.kind);
   recordChange(selected);const info=entityInfo(selected);
   post('change',{selection:info});log(`${drag.kind.toUpperCase()} · ${info.name} · ${info.x.toFixed(2)}, ${info.y.toFixed(2)} · ${info.rotation.toFixed(1)}° · ${info.scale.toFixed(2)}.`,'info');
   drag=null;try{surface?.releasePointerCapture?.(e.pointerId)}catch{}e.preventDefault();e.stopImmediatePropagation();
  }
 }
 function onWheel(e){
  const p=eventPoint(e);if(!ready||!p||!isViewportTarget(e.target,p.surface))return;
  free.zoomTarget=Math.max(FREE_ZOOM_MIN,Math.min(FREE_ZOOM_MAX,free.zoomTarget*Math.exp(-e.deltaY*.0015)));e.preventDefault();e.stopImmediatePropagation();
 }
 function setCameraKey(key,pressed){
  const k=String(key||'').toLowerCase();if(!CAMERA_KEYS.has(k))return false;
  if(pressed&&ready)cameraKeys.add(k);else cameraKeys.delete(k);
  return ready;
 }
 function clearCameraKeys(){cameraKeys.clear();free.vx=0;free.vy=0;}
 function onKeyDown(e){
  if(e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
  if(partPlacement&&e.key==='Escape'){cancelPartPlacement();post('building',{state:buildingState()});e.preventDefault();e.stopImmediatePropagation();return;}
  if(partPlacement&&e.key.toLowerCase()==='r'){const step=buildingSnap.rotation||15;partPlacementRotation=snapValue(partPlacementRotation+step,step);if(partPlacementPoint)previewPart(partPlacementPoint);e.preventDefault();e.stopImmediatePropagation();return;}
  if(tool==='place'&&placementAsset&&e.key.toLowerCase()==='r'){rotatePlacement(15);e.preventDefault();e.stopImmediatePropagation();return;}
  if(setCameraKey(e.key,true)){e.preventDefault();e.stopImmediatePropagation();}
 }
 function onKeyUp(e){if(setCameraKey(e.key,false)){e.preventDefault();e.stopImmediatePropagation()}}
 function cameraTick(now){
  const dt=Math.min(.05,Math.max(0,(now-lastTick)/1000));lastTick=now;
  // Renderer/bootstrap code can replace draw3d after editor startup.
  if(ready&&typeof draw3d==='function'&&!draw3d.__editorCamera)installCameraRendering();
  if(ready){
   const forward=Number(cameraKeys.has('w'))-Number(cameraKeys.has('s'));
   const right=Number(cameraKeys.has('d'))-Number(cameraKeys.has('a'));
   const fast=cameraKeys.has('shift'),speed=fast?85:28;
   const len=Math.hypot(forward,right)||1,c=Math.cos(view3d.yaw),sn=Math.sin(view3d.yaw);

   // WASD moves the detached camera through the world relative to its heading.
   const tx=(-sn*(forward/len)+c*(right/len))*speed;
   const ty=(-c*(forward/len)-sn*(right/len))*speed;
   const k=1-Math.exp(-dt*10);
   free.vx+=(tx-free.vx)*k;free.vy+=(ty-free.vy)*k;
   if(!forward&&!right){const damp=Math.exp(-dt*7);free.vx*=damp;free.vy*=damp}
   free.x+=free.vx*dt;free.y+=free.vy*dt;
   px=free.x;py=free.y;

   // Arrow keys rotate / tilt only. They never translate the camera.
   const yawInput=Number(cameraKeys.has('arrowright'))-Number(cameraKeys.has('arrowleft'));
   const tiltInput=Number(cameraKeys.has('arrowdown'))-Number(cameraKeys.has('arrowup'));
   free.yawTarget+=yawInput*dt*1.9;
   free.tiltTarget=Math.max(.08,Math.min(1.35,free.tiltTarget+tiltInput*dt*.75));

   if(cameraKeys.has('q'))free.zoomTarget=Math.max(FREE_ZOOM_MIN,free.zoomTarget*Math.exp(-dt*1.8));
   if(cameraKeys.has('e'))free.zoomTarget=Math.min(FREE_ZOOM_MAX,free.zoomTarget*Math.exp(dt*1.8));

   view3d.yaw+=(free.yawTarget-view3d.yaw)*(1-Math.exp(-dt*14));
   view3d.tilt+=(free.tiltTarget-view3d.tilt)*(1-Math.exp(-dt*14));
   view3d.zoom+=(free.zoomTarget-view3d.zoom)*(1-Math.exp(-dt*11));
  }
  requestAnimationFrame(cameraTick);
 }

 function selectionProjection(){
  if(!selected)return null;const e=selected.entity,x=selected.kind==='building'?e.x+e.w/2:e.x+.5,z=selected.kind==='building'?e.y+e.h/2:e.y+.5,q=editorProject(x,.4,z),surface=editorInputSurface();if(!surface)return null;const rect=surface.getBoundingClientRect();
  return {x:rect.left+q.x/screen.w*rect.width,y:rect.top+q.y/screen.h*rect.height};
 }
 function focusSelection(){
  if(!selected)return;const e=selected.entity;free.x=selected.kind==='building'?e.x+e.w/2:e.x+.5;free.y=selected.kind==='building'?e.y+e.h/2:e.y+.5;free.zoomTarget=Math.max(free.zoomTarget,120);px=free.x;py=free.y;return cameraInfo();
 }
 function duplicateSelection(){
  if(!selected)return null;if(entityInfo(selected).protected)throw Error('Gameplay-linked entities cannot be duplicated');const e=selected.entity;
  if(e._sceneEntityId&&!authoredEntity(selected)?.entity.components?.RuntimeBinding){
   if(!projectWorld)throw Error('The canonical scene document is unavailable');
   const result=window.VeldrenSceneFormat.duplicateSubtree(projectWorld,String(currentScene),e._sceneEntityId,()=>`editor-scene-${Date.now()}-${++editorSequence}`);
   sceneDocumentDirty=true;window.VeldrenWorldEdits.refreshSceneRenderables(projectWorld,currentScene);
   selected=resolveRef('object',result.id,currentScene);if(!selected)throw Error('The duplicated scene entity could not be resolved');selectedScene=String(currentScene);
   invalidate(selected.entity,'object');post('change',{selection:entityInfo(selected)});return entityInfo(selected);
  }
  const id=`editor-${Date.now()}-${++editorSequence}`,copy=deepClone(e);copy.id=id;copy.x=Number(e.x)+1;copy.y=Number(e.y);delete copy._editorBase;delete copy._creatureMotion;copy._editorCreated=true;
  if(selected.kind==='building'){copy.service=null;sceneBuildings(currentScene).push(copy);const graphEntity=window.VeldrenSceneFormat.attachRuntimeEntity(projectWorld,currentScene,'building',copy,buildings.length);if(graphEntity)copy._sceneEntityId=graphEntity.id;selected=refForBuilding(copy)}else{sceneObjects(currentScene).push(copy);const graphEntity=window.VeldrenSceneFormat.attachRuntimeEntity(projectWorld,currentScene,'object',copy,objects.length);if(graphEntity)copy._sceneEntityId=graphEntity.id;selected=refForObject(copy)}
  const info=entityInfo(selected),change={scene:String(currentScene),kind:selected.kind,id:String(selected.id),name:info.name,type:info.type,subtype:info.subtype,baseX:info.x,baseY:info.y,created:true,data:deepClone(copy),x:info.x,y:info.y,rotation:info.rotation,scale:info.scale};
  changes.set(ckey(currentScene,selected.kind,selected.id),change);project.changes=[...changes.values()];if(selected.kind==='object')objects.push(copy);else buildings.push(copy);post('change',{selection:info});return info;
 }
 function deleteSelection(){
  if(!selected)return false;if(entityInfo(selected).protected)throw Error('Gameplay-linked entities cannot be deleted');
  if(selected.entity._sceneEntityId){
   if(!projectWorld)throw Error('The canonical scene document is unavailable');
   const runtime=authoredEntity(selected)?.entity.components?.RuntimeBinding;
   if(runtime){
    const ref=selected,info=entityInfo(ref),base=ensureBase(ref),key=ckey(currentScene,ref.kind,ref.id);
    changes.set(key,{...(changes.get(key)||{}),scene:String(currentScene),kind:ref.kind,id:String(ref.id),name:info.name,type:info.type,subtype:info.subtype,baseX:base.x,baseY:base.y,deleted:true});
    project.changes=[...changes.values()];const list=ref.kind==='building'?sceneBuildings(currentScene):sceneObjects(currentScene),at=list.indexOf(ref.entity);if(at>=0)list.splice(at,1);
    if(ref.kind==='building'){const active=buildings.indexOf(ref.entity);if(active>=0)buildings.splice(active,1)}else{const active=objects.indexOf(ref.entity);if(active>=0)objects.splice(active,1)}
   }
   const removed=window.VeldrenSceneFormat.deleteSubtree(projectWorld,String(currentScene),selected.entity._sceneEntityId);if(!removed.length)return false;
   if(!runtime)sceneDocumentDirty=true;window.VeldrenWorldEdits.refreshSceneRenderables(projectWorld,currentScene);selected=null;selectedScene=null;
   post('change',{selection:null});return true;
  }
  const info=entityInfo(selected),key=ckey(currentScene,selected.kind,selected.id),existing=changes.get(key),list=selected.kind==='building'?sceneBuildings(currentScene):sceneObjects(currentScene),index=list.indexOf(selected.entity);
  if(index>=0)list.splice(index,1);if(existing?.created)changes.delete(key);else changes.set(key,{...(existing||{}),scene:String(currentScene),kind:selected.kind,id:String(selected.id),name:info.name,type:info.type,subtype:info.subtype,baseX:info.baseX,baseY:info.baseY,deleted:true});
  if(selected.kind==='object'){const i=objects.indexOf(selected.entity);if(i>=0)objects.splice(i,1)}else{const i=buildings.indexOf(selected.entity);if(i>=0)buildings.splice(i,1)}
  selected=null;project.changes=[...changes.values()];post('change',{selection:null});return true;
 }
 function revertSelection(){
  if(!selected)return null;const base=ensureBase(selected),key=ckey(currentScene,selected.kind,selected.id),change=changes.get(key);
  if(selected.entity._sceneEntityId){
   if(!base.sceneTransform||!projectWorld)throw Error('The original scene transform is unavailable');
   const result=window.VeldrenSceneFormat.setLocalTransform(projectWorld,String(currentScene),selected.entity._sceneEntityId,base.sceneTransform);
   moveLinkedObject(selected.entity,result.x,result.y);selected.entity.editorTransform={...(selected.entity.editorTransform||{}),rotation:result.rotation,scale:result.scale};
   selected.entity.heading=result.rotation*Math.PI/180;sceneDocumentDirty=true;invalidate(selected.entity,'object');
   post('change',{selection:entityInfo(selected)});return entityInfo(selected);
  }
  if(change?.created){deleteSelection();return null}
  changes.delete(key);setEntityTransform(selected,{x:base.x,y:base.y,rotation:0,scale:1},false);project.changes=[...changes.values()];post('change',{selection:entityInfo(selected)});return entityInfo(selected);
 }
 function cameraInfo(){return {x:free.x,y:free.y,yaw:view3d.yaw,tilt:view3d.tilt,zoom:view3d.zoom,playerView:false}}
 function togglePlayerView(){
  return cameraInfo();
 }


 function installEditorUiIsolation(){
  if(document.getElementById('veldrenEditorUiIsolation'))return;
  const style=document.createElement('style');style.id='veldrenEditorUiIsolation';
  style.textContent=`
   body.veldren-editor-clean-ui{--dock:0px!important}
   body.veldren-editor-clean-ui #game{
    position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
    max-width:none!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;
   }
   body.veldren-editor-clean-ui #viewport{
    position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
    min-width:0!important;min-height:0!important;border:0!important;margin:0!important;
   }
   body.veldren-editor-clean-ui .realm-surface,
   body.veldren-editor-clean-ui #world{
    position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
    margin:0!important;padding:0!important;border:0!important
   }
   body.veldren-editor-clean-ui .realm-surface{z-index:0!important;pointer-events:none!important}
   body.veldren-editor-clean-ui #world{z-index:1!important;pointer-events:auto!important;touch-action:none!important}

   body.veldren-editor-clean-ui #game>header,
   body.veldren-editor-clean-ui #game>footer,
   body.veldren-editor-clean-ui #tutorial,
   body.veldren-editor-clean-ui .action,
   body.veldren-editor-clean-ui #combatbar,
   body.veldren-editor-clean-ui #mapHud,
   body.veldren-editor-clean-ui #worldClock,
   body.veldren-editor-clean-ui #onlineStatus,
   body.veldren-editor-clean-ui #runButton,
   body.veldren-editor-clean-ui #waveButton,
   body.veldren-editor-clean-ui #cloudStatus,
   body.veldren-editor-clean-ui #fullscreenButton,
   body.veldren-editor-clean-ui #ambientButton,
   body.veldren-editor-clean-ui #leaveInterior,
   body.veldren-editor-clean-ui #gameTabs,
   body.veldren-editor-clean-ui #gameDock,
   body.veldren-editor-clean-ui #displayNotice,
   body.veldren-editor-clean-ui #maintenanceNotice,
   body.veldren-editor-clean-ui #spiritBuildHud,
   body.veldren-editor-clean-ui #socialPanel,
   body.veldren-editor-clean-ui #socialQuickPanel,
   body.veldren-editor-clean-ui #spiritQuickPanel,
   body.veldren-editor-clean-ui #quickChat,
   body.veldren-editor-clean-ui #chatPanel,
   body.veldren-editor-clean-ui #viewport>.region,
   body.veldren-editor-clean-ui #viewport>#toast,
   body.veldren-editor-clean-ui #viewport>.legend,
   body.veldren-editor-clean-ui #viewport>#cameraControls,
   body.veldren-editor-clean-ui #viewport>#encounterHud{
    display:none!important
   }

   /* Gameplay dialogs are hidden in normal world-edit mode. Auth stays usable
      if a session expires because #loginScreen is deliberately excluded. */
   body.veldren-editor-clean-ui #modal,
   body.veldren-editor-clean-ui #creator,
   body.veldren-editor-clean-ui #spiritsDialog{
    display:none!important
   }
  `;
  document.head.appendChild(style);
 }
 function setGameUiVisible(visible){
  gameUiVisible=false;installEditorUiIsolation();document.body.classList.add('veldren-editor-clean-ui');
  document.body.classList.remove('panels-open','trade-open');try{resize()}catch{}return false;
 }

 function becomeReady(){
  if(ready)return;
  if(initializing)return initializing;
  if(typeof assetsReady==='undefined'||!assetsReady)return;
  if(typeof worldScenes==='undefined'||!worldScenes?.overworld||typeof objects==='undefined'||typeof buildings==='undefined'||typeof draw3d!=='function'||typeof unproject3!=='function')return;
  initializing=(async()=>{
  await loadProject();installTransformRendering();
  free.x=55;free.y=50;px=free.x;py=free.y;
  free.yawTarget=view3d.yaw;free.tiltTarget=view3d.tilt;free.zoomTarget=view3d.zoom;view3d.min=FREE_ZOOM_MIN;view3d.max=FREE_ZOOM_MAX;
  applyAll();window.VeldrenSceneFormat.attachRuntimeWorld(projectWorld,worldScenes);installCameraRendering();installEditorUiIsolation();setGameUiVisible(false);
  ready=true;
  document.addEventListener('pointerdown',onPointerDown,true);document.addEventListener('pointermove',onPointerMove,true);document.addEventListener('pointerup',onPointerUp,true);document.addEventListener('pointercancel',onPointerUp,true);document.addEventListener('wheel',onWheel,{capture:true,passive:false});document.addEventListener('keydown',onKeyDown,true);document.addEventListener('keyup',onKeyUp,true);
  document.addEventListener('contextmenu',e=>{if(ready&&isViewportTarget(e.target,editorInputSurface())){e.preventDefault();e.stopImmediatePropagation()}},true);
  window.addEventListener('blur',()=>{clearCameraKeys();clearTouchInput()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearCameraKeys();clearTouchInput();}});
  requestAnimationFrame(cameraTick);log(`Editor ready · project revision ${projectMeta.revision} · free camera detached at ${free.x.toFixed(1)}, ${free.y.toFixed(1)}.`,'ok');post('ready',{camera:cameraInfo()});
  })().finally(()=>{initializing=null});
  return initializing;
 }
 const timer=setInterval(()=>{Promise.resolve(becomeReady()).then(()=>{if(ready)clearInterval(timer)}).catch(error=>log('Editor startup failed: '+error.message,'error'))},100);

 window.VeldrenEditorBridge={
  isReady:()=>ready,initialize:becomeReady,
  enterBuilding,startNewBuilding,exitBuilding,buildingState,selectPart,setPart,deletePart,duplicatePart,buildingUndo,setFloor,setBuildingTransform,
  buildingAssets:()=>B.catalog(),
  setBuildingSnap(config){Object.assign(buildingSnap,config);return buildingState();},
  beginPartPlacement(id){if(!buildingContext)throw Error('Start Building Edit first');if(!B.model(id))throw Error('Missing local asset');partPlacementAsset=B.catalog().find(asset=>asset.id===id);if(!partPlacementAsset)throw Error('Missing local asset');partPlacement=id;partPlacementRotation=0;partPlacementPoint=null;partPreview=null;tool='place';return buildingState();},
  cancelPartPlacement(){cancelPartPlacement();return buildingState();},
  moveEntrance(host){const m=assembly()?.modules.find(m=>m.role==='entrance');if(!m)throw Error('No linked entrance');partId=m.id;return setPart({host});},currentSceneName:()=>worldScenes?.[currentScene]?.title||String(currentScene),
  getSelection:()=>entityInfo(selected),selectionProjection,cameraState:cameraInfo,listEntities:allEntities,
  setCameraKey,clearCameraKeys,
  selectByRef(kind,id){return selectRef(resolveRef(kind,id,currentScene))},
  setTool(next){
   if(next==='terrain'&&currentScene!=='overworld')throw Error('Terrain is available in the overworld');
   clearTouchInput();finishTerrain();terrainHover=null;if(next==='terrain'&&buildingContext)exitBuilding();
   tool=['select','move','rotate','scale','place','camera','terrain'].includes(next)?next:'select';drag=null;pointer=null;
   if(tool!=='place'){placementAsset=null;placementRotation=0;removePlacementPreview();cancelPartPlacement();}
   return tool;
  },
  terrainState:()=>T.state(),
  setTerrainBrush(input){
   const mode=['raise','lower','flatten','smooth','paint','erase'].includes(input?.mode)?input.mode:terrainBrush.mode;
   terrainBrush={mode,radius:Math.max(1,Math.min(12,Number(input?.radius)||terrainBrush.radius)),strength:Math.max(.05,Math.min(1,Number(input?.strength)||terrainBrush.strength)),material:['grass','dirt','stone','paving'].includes(input?.material)?input.material:terrainBrush.material};
   return {...terrainBrush};
  },
  terrainUndo(redo=false){finishTerrain();const result=redo?T.redo():T.undo();post('terrain',{state:T.state(),changed:result.changed});return T.state();},
  setSnap(config){snap={position:Math.max(0,Number(config?.position)||0),rotation:Math.max(0,Number(config?.rotation)||0)};return {...snap}},
  setTransform(input){if(!selected)return null;const info=setEntityTransform(selected,input,true);if(selected.entity.assembly)B.commit(selected.entity);post('change',{selection:info});return info},
  focusSelection,duplicateSelection,deleteSelection,revertSelection,togglePlayerView,
  listAssets:assetCatalog,
  assetGeometry(id){const text=String(id||''),split=text.indexOf(':');if(split<0)return null;const source=text.slice(0,split),key=text.slice(split+1),mesh=source==='mesh'?briarModels?.[key]:source==='creature'?creatureAssets?.[key]?.mesh:source==='preset'?null:B.model(text);return mesh?.p&&mesh?.i?{p:mesh.p,n:mesh.n,c:mesh.c,f:mesh.f,i:mesh.i,uv:mesh.uv,t:mesh.t,bounds:mesh.bounds,atlas:typeof REALM_ATLAS_IMAGE!=='undefined'?REALM_ATLAS_IMAGE:null}:null;},
  gameUiVisible:()=>gameUiVisible,
  setGameUiVisible,
  beginPlacement(id){const asset=assetById(id);if(!asset)throw Error('Unknown Veldren asset '+id);placementAsset=asset;placementRotation=0;tool='place';ensurePlacementPreview(asset);return {...asset}},
  rotatePlacement,
  cancelPlacement(){placementAsset=null;placementRotation=0;removePlacementPreview();if(tool==='place')tool='select';return true},
  placementState(){return placementAsset?{...placementAsset}:null},
  savedState:async()=>({...projectMeta,sceneDirty:sceneDocumentDirty}),
  save:saveProject,
  exportWorld:()=>JSON.parse(JSON.stringify(projectWorld)),
  exportEdits:()=>({version:1,revision:projectMeta.revision,updatedAt:new Date().toISOString(),changes:[...changes.values()],terrain:T.serialize()})
 };
})();
