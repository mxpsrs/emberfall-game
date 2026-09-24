'use strict';
(() => {
 if(window.VeldrenEditorBridge)return;
 const STORAGE_KEY='veldren-world-edits-backup-v2';
 const FREE_ZOOM_MIN=2,FREE_ZOOM_MAX=1600;
 const cameraKeys=new Set();
 const free={x:null,y:null,vx:0,vy:0,yawTarget:0,tiltTarget:.4,zoomTarget:100};
 let ready=false,tool='select',selected=null,selectedScene=null,playerView=false,placementAsset=null,gameUiVisible=false;
 let pointer=null,drag=null,lastTick=performance.now(),snap={position:.25,rotation:15};
 let project={version:1,revision:0,updatedAt:null,changes:[]},changes=new Map(),projectMeta={revision:0,count:0,path:'editor-data/world-edits.json',bytes:0,sha256:''};
 let editorSequence=0,editorRendering=false;
 let playerCamera={min:58,max:132,yaw:-2.05,tilt:.27,zoom:118};
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
  const base={x:Number(e.x)||0,y:Number(e.y)||0,name:e.name||e.propKind||e.type||'Entity',type:ref.kind==='building'?'building':e.type||'object',subtype:ref.kind==='building'?e.archetype||e.race||'building':e.propKind||e.kind||e.type||'object'};
  try{Object.defineProperty(e,'_editorBase',{value:base,writable:true,configurable:true});}catch{e._editorBase=base}
  return base;
 }
 function entityRotation(ref){
  const e=ref.entity;if(ref.kind==='building')return Number(e.editorTransform?.rotation)||0;
  if(Number.isFinite(e.editorTransform?.rotation))return Number(e.editorTransform.rotation);
  if(Number.isFinite(e.placement?.yaw))return Number(e.placement.yaw)*180/Math.PI;
  if(Number.isFinite(e.heading))return Number(e.heading)*180/Math.PI;return 0;
 }
 function entityScale(ref){return Math.max(.1,Math.min(10,Number(ref.entity.editorTransform?.scale)||1))}
 function entityInfo(ref){
  if(!ref)return null;const e=ref.entity,base=ensureBase(ref);
  return {scene:String(currentScene),kind:ref.kind,id:String(ref.id),name:e.name||e.propKind||e.type||'Entity',
   type:ref.kind==='building'?'building':e.type||'object',subtype:ref.kind==='building'?e.archetype||e.race||'building':e.editorAsset?`${e.editorAsset.source}:${e.editorAsset.key}`:e.propKind||e.kind||e.type||'object',
   x:Number(e.x)||0,y:Number(e.y)||0,rotation:entityRotation(ref),scale:entityScale(ref),
   protected:ref.kind==='building'?!!(e.service||e.civilCastle||e.walkIn):protectedObject(e),baseX:base.x,baseY:base.y};
 }
 function allEntities(){
  if(!ready)return [];
  const out=[];for(const o of objects)out.push(entityInfo(refForObject(o)));
  const list=buildings;for(let i=0;i<list.length;i++)out.push(entityInfo({kind:'building',entity:list[i],id:buildingId(list[i],i)}));
  return out;
 }
 function selectRef(ref){
  selected=ref;selectedScene=ref?String(currentScene):null;post('selection',{selection:entityInfo(selected)});return entityInfo(selected);
 }

 function invalidate(e,kind='object'){
  // Buildings are intentionally NOT evicted from the static geometry cache
  // while the editor drags them. Their existing cached mesh is translated by
  // a Filament model matrix instead. Rebuilding world-space roof geometry at
  // every pointer event created stale roof/renderable trails.
  if(kind!=='building'){
   try{staticMeshes3?.delete?.(e)}catch{}
   try{staticMeshQueues3?.prop?.delete?.(e)}catch{}
  }
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
 function setEntityTransform(ref,input,record=true){
  if(!ref)return null;const e=ref.entity,base=ensureBase(ref),oldX=Number(e.x)||0,oldY=Number(e.y)||0;
  let x=Number.isFinite(Number(input.x))?Number(input.x):oldX,y=Number.isFinite(Number(input.y))?Number(input.y):oldY;
  x=snapValue(x,snap.position);y=snapValue(y,snap.position);
  let rotation=Number.isFinite(Number(input.rotation))?Number(input.rotation):entityRotation(ref);rotation=snapValue(rotation,snap.rotation);
  const scale=Math.max(.1,Math.min(10,Number.isFinite(Number(input.scale))?Number(input.scale):entityScale(ref)));
  if(ref.kind==='building'){
   const dx=x-oldX,dy=y-oldY;e.x=x;e.y=y;e.editorTransform={...(e.editorTransform||{}),rotation,scale};
   translateBuildingLinks(e,dx,dy);
  }else{
   moveLinkedObject(e,x,y);e.editorTransform={...(e.editorTransform||{}),rotation,scale};
   if(e.placement)e.placement={...e.placement,yaw:rotation*Math.PI/180,offset:[...(e.placement.offset||[0,0])]};
   else if(!protectedObject(e))e.placement={anchor:'editor',reason:'Veldren editor placement',offset:[0,0],yaw:rotation*Math.PI/180};
   e.heading=rotation*Math.PI/180;if(e._creatureMotion)e._creatureMotion.heading=e.heading;
  }
  invalidate(e,ref.kind);
  if(record)recordChange(ref,base);
  return entityInfo(ref);
 }
 function recordChange(ref,base=ensureBase(ref)){
  const info=entityInfo(ref),key=ckey(String(currentScene),ref.kind,ref.id),before=changes.get(key)||{};
  const change={...before,scene:String(currentScene),kind:ref.kind,id:String(ref.id),name:info.name,type:info.type,subtype:info.subtype,
   baseX:Number(before.baseX??base.x),baseY:Number(before.baseY??base.y),x:info.x,y:info.y,rotation:info.rotation,scale:info.scale};
  if(before.created){change.created=true;change.data=before.data}
  changes.set(key,change);project.changes=[...changes.values()];
 }

 function normalizeChange(c){
  return {...c,kind:c.kind==='building'?'building':'object',rotation:Number.isFinite(Number(c.rotation))?Number(c.rotation):(Number(c.yaw)||0)*180/Math.PI,scale:Number(c.scale)||1};
 }
 async function loadProject(){
  const response=await fetch('/api/editor/edits',{cache:'no-store'});if(!response.ok)throw new Error('Project edit file read failed: HTTP '+response.status);
  const payload=await response.json(),disk=payload.edits;
  if(!disk||disk.version!==1||!Array.isArray(disk.changes))throw new Error('Invalid project world edit file');
  const backup=(()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}})();
  if(!disk.changes.length&&backup?.version===1&&Array.isArray(backup.changes)&&backup.changes.length){
   project={...backup,revision:payload.revision||0,changes:backup.changes.map(normalizeChange)};
   log(`Recovered ${backup.changes.length} browser-backup edits. Save World will migrate them to the project file.`,'warn');
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
   const data=deepClone(change.data);data.id=change.id;if(change.kind==='building'){sceneBuildings(change.scene).push(data);ref=refForBuilding(data,change.scene)}else{sceneObjects(change.scene).push(data);ref=refForObject(data)}
  }
  if(!ref)return {matched:false,action:'not-found'};
  ensureBase(ref);setEntityTransform(ref,{x:change.x,y:change.y,rotation:change.rotation,scale:change.scale},false);return {matched:true,action:'transformed'};
 }
 function applyAll(){
  let matched=0,unmatched=0;
  for(const change of project.changes){const r=applyChange(change);r.matched?matched++:unmatched++}
  if(worldScenes?.[currentScene]){objects.splice(0,objects.length,...worldScenes[currentScene].objects);buildings.splice(0,buildings.length,...worldScenes[currentScene].buildings)}
  try{worldObjectRevision++}catch{}
  log(`Applied editor layer · ${matched} matched · ${unmatched} unmatched.` ,unmatched?'warn':'ok');
 }

 function canonical(c){
  return JSON.stringify({scene:c.scene,kind:c.kind,id:String(c.id),deleted:!!c.deleted,created:!!c.created,
   x:c.deleted?null:Number(c.x),y:c.deleted?null:Number(c.y),rotation:c.deleted?null:Number(c.rotation||0),scale:c.deleted?null:Number(c.scale||1),
   name:c.name||null,type:c.type||null,subtype:c.subtype||null,baseX:Number(c.baseX)||0,baseY:Number(c.baseY)||0});
 }
 async function saveProject(){
  const outgoing={version:1,expectedRevision:projectMeta.revision,changes:[...changes.values()].map(normalizeChange)};
  const response=await fetch('/api/editor/edits',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(outgoing)});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||`Save HTTP ${response.status}`);
  const verifyResponse=await fetch(`/api/editor/edits?verify=${encodeURIComponent(result.revision)}&t=${Date.now()}`,{cache:'no-store'});
  const verify=await verifyResponse.json().catch(()=>({}));if(!verifyResponse.ok)throw new Error(verify.error||'Save verification reread failed');
  if(result.revision!==verify.revision||result.sha256!==verify.sha256||result.count!==verify.count)throw new Error('Save round-trip metadata mismatch');
  const sent=new Map(outgoing.changes.map(c=>[ckey(c.scene,c.kind,c.id),canonical(c)])),read=new Map((verify.edits?.changes||[]).map(c=>[ckey(c.scene,c.kind,c.id),canonical(normalizeChange(c))]));
  if(sent.size!==read.size)throw new Error(`Save round-trip count mismatch (${sent.size} vs ${read.size})`);
  for(const [key,value]of sent)if(read.get(key)!==value)throw new Error(`Save round-trip mismatch for ${key}`);
  project={...verify.edits,revision:verify.revision,changes:(verify.edits.changes||[]).map(normalizeChange)};changes=new Map(project.changes.map(c=>[ckey(c.scene,c.kind,c.id),c]));
  projectMeta={revision:verify.revision,count:verify.count,path:verify.path,bytes:verify.bytes,sha256:verify.sha256};
  localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,revision:verify.revision,updatedAt:verify.updatedAt,changes:project.changes}));
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
    if(kind==='building'&&key){
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
  if(playerView||!Number.isFinite(free.x))return task();
  const rx=px,ry=py,sx=s.x,sy=s.y;px=free.x;py=free.y;s.x=free.x;s.y=free.y;try{return task()}finally{px=rx;py=ry;s.x=sx;s.y=sy}
 }
 function editorProject(x,y,z){return withFreeAnchor(()=>project3(x,y,z))}
 function editorUnproject(x,y){return withFreeAnchor(()=>unproject3(x,y))}
 function installCameraRendering(){
  if(draw3d.__editorCamera)return;
  const before=draw3d;
  const wrapped=function(...args){
   if(!ready||playerView)return before(...args);
   const rx=px,ry=py,sx=s.x,sy=s.y,rt=target,name=s.character?.name;editorRendering=true;px=free.x;py=free.y;s.x=free.x;s.y=free.y;target=null;if(s.character)s.character.name='';
   try{return before(...args)}finally{if(s.character)s.character.name=name;target=rt;s.x=sx;s.y=sy;px=rx;py=ry;editorRendering=false}
  };
  wrapped.__editorCamera=true;draw3d=wrapped;draw=wrapped;
  if(typeof humanoid3==='function'&&!humanoid3.__editorHidePlayer){const h=humanoid3;humanoid3=function(r,x,z,look,gear,...rest){if(editorRendering&&gear===s.equipment&&Math.hypot(x-free.x-.5,z-free.y-.5)<.05)return 0;return h(r,x,z,look,gear,...rest)};humanoid3.__editorHidePlayer=true}
  if(typeof ring3==='function'&&!ring3.__editorHidePlayer){const rr=ring3;ring3=function(g,x,z,...rest){if(editorRendering&&Math.hypot(x-free.x-.5,z-free.y-.5)<.05)return;return rr(g,x,z,...rest)};ring3.__editorHidePlayer=true}
 }

 function editorInputSurface(){return document.getElementById('world')||document.querySelector('.realm-surface')}
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

 function createPlacedAsset(asset,x,y){
  if(!asset)throw Error('No asset selected');
  x=snapValue(x-.5,snap.position);y=snapValue(y-.5,snap.position);
  const id=`editor-asset-${Date.now()}-${++editorSequence}`;
  let base={type:'prop',name:asset.name,walkThrough:true};
  if(asset.source==='preset')base={...(presetTemplates[asset.key]||{type:'prop',name:asset.name}),propKind:asset.key,walkThrough:false};
  const o={id,...base,x,y,homeX:x,homeY:y,drawX:x,drawY:y,dead:0,hitAt:-100,attackAt:-100,
   editorAsset:{source:asset.source,key:asset.key,category:asset.category},editorTransform:{rotation:0,scale:1},
   placement:{anchor:'editor',yaw:0,offset:[0,0],reason:'Placed from Veldren asset browser'},_editorCreated:true};
  const list=sceneObjects(currentScene);list.push(o);if(list!==objects&&!objects.includes(o))objects.push(o);
  const ref=refForObject(o);ensureBase(ref);const info=entityInfo(ref);
  const change={scene:String(currentScene),kind:'object',id:String(id),name:info.name,type:info.type,subtype:info.subtype,baseX:x,baseY:y,created:true,data:deepClone(o),x,y,rotation:0,scale:1};
  changes.set(ckey(currentScene,'object',id),change);project.changes=[...changes.values()];selected=ref;selectedScene=String(currentScene);invalidate(o);
  post('change',{selection:info,placed:true,asset});return info;
 }

 function onPointerDown(e){
  const p=eventPoint(e);if(!ready||!p||e.target!==p.surface)return;
  e.preventDefault();e.stopImmediatePropagation();
  // Editor camera panning is keyboard-only. Middle/right mouse do nothing.
  if(e.button===1||e.button===2)return;
  if(e.button===0&&tool==='camera'){pointer={id:e.pointerId,kind:'orbit',x:e.clientX,y:e.clientY};try{p.surface.setPointerCapture?.(e.pointerId)}catch{}return;}
  if(e.button!==0)return;
  if(tool==='place'){
   if(!placementAsset){log('Choose an asset from the Assets browser first.','warn');return;}
   const w=editorUnproject(p.sx,p.sy);createPlacedAsset(placementAsset,w.x,w.z);return;
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
  if(pointer&&e.pointerId===pointer.id){
   const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;
   free.yawTarget+=dx*.008;free.tiltTarget=Math.max(.08,Math.min(1.35,free.tiltTarget+dy*.004));
   e.preventDefault();e.stopImmediatePropagation();return;
  }
  if(!drag||e.pointerId!==drag.id||!selected)return;
  if(drag.kind==='move'){const p=eventPoint(e);if(!p)return;const w=editorUnproject(p.sx,p.sy);setEntityTransform(selected,{x:drag.x+(w.x-drag.start.x),y:drag.y+(w.z-drag.start.z)},true)}
  if(drag.kind==='rotate')setEntityTransform(selected,{rotation:drag.rotation+(e.clientX-drag.clientX)*.55},true);
  if(drag.kind==='scale')setEntityTransform(selected,{scale:drag.scale*Math.exp((drag.clientY-e.clientY)*.008)},true);
  post('change',{selection:entityInfo(selected)});e.preventDefault();e.stopImmediatePropagation();
 }
 function onPointerUp(e){
  const surface=editorInputSurface();
  if(pointer&&e.pointerId===pointer.id){pointer=null;try{surface?.releasePointerCapture?.(e.pointerId)}catch{}e.preventDefault();e.stopImmediatePropagation();return}
  if(drag&&e.pointerId===drag.id){const info=entityInfo(selected);log(`${drag.kind.toUpperCase()} · ${info.name} · ${info.x.toFixed(2)}, ${info.y.toFixed(2)} · ${info.rotation.toFixed(1)}° · ${info.scale.toFixed(2)}.`,'info');drag=null;try{surface?.releasePointerCapture?.(e.pointerId)}catch{}e.preventDefault();e.stopImmediatePropagation()}
 }
 function onWheel(e){
  const p=eventPoint(e);if(!ready||!p)return;
  if(playerView){return}
  free.zoomTarget=Math.max(FREE_ZOOM_MIN,Math.min(FREE_ZOOM_MAX,free.zoomTarget*Math.exp(-e.deltaY*.0015)));e.preventDefault();e.stopImmediatePropagation();
 }
 function onKeyDown(e){
  if(!ready||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','q','e','shift'].includes(k)){
   cameraKeys.add(k);e.preventDefault();e.stopImmediatePropagation();
  }
 }
 function onKeyUp(e){const k=e.key.toLowerCase();if(cameraKeys.delete(k)){e.preventDefault();e.stopImmediatePropagation()}}
 function cameraTick(now){
  const dt=Math.min(.05,Math.max(0,(now-lastTick)/1000));lastTick=now;
  if(ready&&!playerView){
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
  if(!selected)return;const e=selected.entity;free.x=selected.kind==='building'?e.x+e.w/2:e.x+.5;free.y=selected.kind==='building'?e.y+e.h/2:e.y+.5;free.zoomTarget=Math.max(free.zoomTarget,120);if(playerView)togglePlayerView();return cameraInfo();
 }
 function duplicateSelection(){
  if(!selected)return null;const e=selected.entity,id=`editor-${Date.now()}-${++editorSequence}`,copy=deepClone(e);copy.id=id;copy.x=Number(e.x)+1;copy.y=Number(e.y);delete copy._editorBase;delete copy._creatureMotion;copy._editorCreated=true;
  if(selected.kind==='building'){copy.service=null;sceneBuildings(currentScene).push(copy);selected=refForBuilding(copy)}else{sceneObjects(currentScene).push(copy);selected=refForObject(copy)}
  const info=entityInfo(selected),change={scene:String(currentScene),kind:selected.kind,id:String(selected.id),name:info.name,type:info.type,subtype:info.subtype,baseX:info.x,baseY:info.y,created:true,data:deepClone(copy),x:info.x,y:info.y,rotation:info.rotation,scale:info.scale};
  changes.set(ckey(currentScene,selected.kind,selected.id),change);project.changes=[...changes.values()];if(selected.kind==='object')objects.push(copy);else buildings.push(copy);post('change',{selection:info});return info;
 }
 function deleteSelection(){
  if(!selected)return false;const info=entityInfo(selected),key=ckey(currentScene,selected.kind,selected.id),existing=changes.get(key),list=selected.kind==='building'?sceneBuildings(currentScene):sceneObjects(currentScene),index=list.indexOf(selected.entity);
  if(index>=0)list.splice(index,1);if(existing?.created)changes.delete(key);else changes.set(key,{...(existing||{}),scene:String(currentScene),kind:selected.kind,id:String(selected.id),name:info.name,type:info.type,subtype:info.subtype,baseX:info.baseX,baseY:info.baseY,deleted:true});
  if(selected.kind==='object'){const i=objects.indexOf(selected.entity);if(i>=0)objects.splice(i,1)}else{const i=buildings.indexOf(selected.entity);if(i>=0)buildings.splice(i,1)}
  selected=null;project.changes=[...changes.values()];post('change',{selection:null});return true;
 }
 function revertSelection(){
  if(!selected)return null;const base=ensureBase(selected),key=ckey(currentScene,selected.kind,selected.id),change=changes.get(key);
  if(change?.created){deleteSelection();return null}
  changes.delete(key);setEntityTransform(selected,{x:base.x,y:base.y,rotation:0,scale:1},false);project.changes=[...changes.values()];post('change',{selection:entityInfo(selected)});return entityInfo(selected);
 }
 function cameraInfo(){return {x:playerView?px:free.x,y:playerView?py:free.y,yaw:view3d.yaw,tilt:view3d.tilt,zoom:view3d.zoom,playerView}}
 function togglePlayerView(){
  playerView=!playerView;
  if(playerView){playerCamera={...playerCamera,yaw:view3d.yaw,tilt:view3d.tilt,zoom:Math.max(playerCamera.min,Math.min(playerCamera.max,view3d.zoom))};Object.assign(view3d,{min:playerCamera.min,max:playerCamera.max,zoom:playerCamera.zoom})}
  else{view3d.min=FREE_ZOOM_MIN;view3d.max=FREE_ZOOM_MAX;view3d.yaw=free.yawTarget;view3d.tilt=free.tiltTarget;view3d.zoom=free.zoomTarget}
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
  installEditorUiIsolation();
  gameUiVisible=!!visible;
  document.body.classList.toggle('veldren-editor-clean-ui',!gameUiVisible);
  // Panels can change --dock and steal viewport width; clean mode must always
  // own the full frame regardless of the gameplay panel state.
  if(!gameUiVisible){document.body.classList.remove('panels-open','trade-open');}
  try{resize()}catch{}
  requestAnimationFrame(()=>{try{resize()}catch{}});
  return gameUiVisible;
 }

 async function becomeReady(){
  if(ready)return;
  if(typeof worldScenes==='undefined'||!worldScenes?.overworld||typeof objects==='undefined'||typeof buildings==='undefined'||typeof draw3d!=='function'||typeof unproject3!=='function')return;
  await loadProject();installTransformRendering();
  free.x=Number(px);free.y=Number(py);playerCamera={min:view3d.min,max:view3d.max,yaw:view3d.yaw,tilt:view3d.tilt,zoom:view3d.zoom};free.yawTarget=view3d.yaw;free.tiltTarget=view3d.tilt;free.zoomTarget=view3d.zoom;view3d.min=FREE_ZOOM_MIN;view3d.max=FREE_ZOOM_MAX;
  applyAll();installCameraRendering();installEditorUiIsolation();setGameUiVisible(false);try{stop()}catch{}
  ready=true;
  document.addEventListener('pointerdown',onPointerDown,true);document.addEventListener('pointermove',onPointerMove,true);document.addEventListener('pointerup',onPointerUp,true);document.addEventListener('pointercancel',onPointerUp,true);document.addEventListener('wheel',onWheel,{capture:true,passive:false});document.addEventListener('keydown',onKeyDown,true);document.addEventListener('keyup',onKeyUp,true);
  requestAnimationFrame(cameraTick);log(`Editor ready · project revision ${projectMeta.revision} · free camera detached at ${free.x.toFixed(1)}, ${free.y.toFixed(1)}.`,'ok');post('ready',{camera:cameraInfo()});
 }
 const timer=setInterval(()=>{Promise.resolve(becomeReady()).then(()=>{if(ready)clearInterval(timer)}).catch(error=>log('Editor startup failed: '+error.message,'error'))},100);

 window.VeldrenEditorBridge={
  isReady:()=>ready,currentSceneName:()=>worldScenes?.[currentScene]?.title||String(currentScene),
  getSelection:()=>entityInfo(selected),selectionProjection,cameraState:cameraInfo,listEntities:allEntities,
  selectByRef(kind,id){return selectRef(resolveRef(kind,id,currentScene))},
  setTool(next){tool=['select','move','rotate','scale','place','camera'].includes(next)?next:'select';drag=null;pointer=null;if(tool!=='place')placementAsset=null;return tool},
  setSnap(config){snap={position:Math.max(0,Number(config?.position)||0),rotation:Math.max(0,Number(config?.rotation)||0)};return {...snap}},
  setTransform(input){if(!selected)return null;const info=setEntityTransform(selected,input,true);post('change',{selection:info});return info},
  focusSelection,duplicateSelection,deleteSelection,revertSelection,togglePlayerView,
  listAssets:assetCatalog,
  gameUiVisible:()=>gameUiVisible,
  setGameUiVisible,
  beginPlacement(id){const asset=assetById(id);if(!asset)throw Error('Unknown Veldren asset '+id);placementAsset=asset;tool='place';return {...asset}},
  cancelPlacement(){placementAsset=null;if(tool==='place')tool='select';return true},
  placementState(){return placementAsset?{...placementAsset}:null},
  savedState:async()=>({...projectMeta}),
  save:saveProject,
  exportEdits:()=>({version:1,revision:projectMeta.revision,updatedAt:new Date().toISOString(),changes:[...changes.values()]})
 };
})();
