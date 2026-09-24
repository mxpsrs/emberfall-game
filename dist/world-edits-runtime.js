'use strict';
(function(){
 const state={version:1,revision:0,updatedAt:null,changes:[],loaded:false,error:null,source:null};

 async function load(){
  // Local editor API is authoritative during development because it also
  // verifies/synchronizes dist/world-edits.json. Production falls back to the
  // static deployable mirror.
  try{
   const response=await fetch('/api/editor/edits',{cache:'no-store'});
   if(response.ok){
    const payload=await response.json();
    if(payload?.edits?.version!==1||!Array.isArray(payload.edits.changes))throw Error('Invalid editor API world layer');
    Object.assign(state,payload.edits,{loaded:true,source:'editor-api'});
    state.meta={path:payload.path,runtimePath:payload.runtimePath,sha256:payload.sha256,runtimeSha256:payload.runtimeSha256};
    return state;
   }
  }catch(error){console.warn('Veldren editor API unavailable; using static world layer.',error)}

  try{
   const response=await fetch('/world-edits.json?cache='+Date.now(),{cache:'no-store'});
   if(response.ok){
    const data=await response.json();
    if(data?.version!==1||!Array.isArray(data.changes))throw Error('Invalid static Veldren world layer');
    Object.assign(state,data,{loaded:true,source:'static'});
    return state;
   }
   throw Error('Static world layer HTTP '+response.status);
  }catch(error){
   state.error=error;state.loaded=true;state.source='none';
   console.error('Veldren editor world layer could not load',error);
   return state;
  }
 }

 const ready=load();
 window.VELDREN_WORLD_EDITS_READY=ready;

 const normalize=c=>({
  ...c,
  kind:c.kind==='building'?'building':'object',
  rotation:Number.isFinite(Number(c.rotation))?Number(c.rotation):(Number(c.yaw)||0)*180/Math.PI,
  scale:Number(c.scale)||1
 });

 function buildingId(b,index){
  if(b._editorId)return b._editorId;
  const service=b.service?.id!=null?String(b.service.id):'none';
  return b._editorId=`building:${service}:${String(b.name||'building').replace(/\|/g,'_')}:${index}`;
 }
 function fallbackDistance(e,c){return Math.hypot((e.x??0)-(c.baseX??e.x),(e.y??0)-(c.baseY??e.y))}
 function resolve(scene,c){
  if(c.kind==='building'){
   const list=scene.buildings||[];
   for(let i=0;i<list.length;i++)if(buildingId(list[i],i)===String(c.id))return list[i];
   return list.find(b=>(!c.name||b.name===c.name)&&fallbackDistance(b,c)<2.5)||null;
  }
  const list=scene.objects||[];
  return list.find(o=>String(o.id)===String(c.id))||
    list.find(o=>(!c.name||o.name===c.name)&&(!c.type||o.type===c.type)&&fallbackDistance(o,c)<2.5)||null;
 }
 function moveObject(o,x,y){
  o.x=x;o.y=y;
  if(Number.isFinite(o.homeX))o.homeX=x;if(Number.isFinite(o.homeY))o.homeY=y;
  if(Number.isFinite(o.drawX))o.drawX=x;if(Number.isFinite(o.drawY))o.drawY=y;
 }
 function applyObject(o,c){
  moveObject(o,Number(c.x),Number(c.y));
  o.editorTransform={...(o.editorTransform||{}),rotation:c.rotation,scale:c.scale};
  if(o.placement)o.placement={...o.placement,yaw:c.rotation*Math.PI/180,offset:[...(o.placement.offset||[0,0])]};
  o.heading=c.rotation*Math.PI/180;
 }
 function translateRoom(room,dx,dy){
  if(!room)return;if(Number.isFinite(room.x))room.x+=dx;if(Number.isFinite(room.y))room.y+=dy;
  if(Array.isArray(room.door)&&Number.isFinite(room.door[0])&&Number.isFinite(room.door[1])){room.door[0]+=dx;room.door[1]+=dy;}
 }
 function translateStructure(structure,dx,dy){
  if(!structure)return;
  if(structure.ramp){if(Number.isFinite(structure.ramp.x))structure.ramp.x+=dx;if(Number.isFinite(structure.ramp.y))structure.ramp.y+=dy;}
  if(Array.isArray(structure.decks))for(const deck of structure.decks){if(Number.isFinite(deck.x))deck.x+=dx;if(Number.isFinite(deck.y))deck.y+=dy;}
 }
 function translateWallMap(map,dx,dy){
  if(!(map instanceof Map)||(!dx&&!dy))return map;const shifted=new Map();
  for(const tile of map.values()){const copy={...tile};if(Number.isFinite(copy.x))copy.x+=dx;if(Number.isFinite(copy.y))copy.y+=dy;shifted.set(copy.x+':'+copy.y,copy);}
  return shifted;
 }
 function applyBuilding(scene,b,c){
  const oldX=Number(b.x)||0,oldY=Number(b.y)||0,dx=Number(c.x)-oldX,dy=Number(c.y)-oldY,destination=b.service?.destination;
  b.x=Number(c.x);b.y=Number(c.y);
  b.editorTransform={...(b.editorTransform||{}),rotation:c.rotation,scale:c.scale};

  if(b.service)moveObject(b.service,Number(b.service.x||0)+dx,Number(b.service.y||0)+dy);
  for(const o of scene.objects||[]){
   if(o===b.service)continue;
   if(destination&&(o.interiorBuilding===destination||o.civilCourtyard===destination))moveObject(o,Number(o.x||0)+dx,Number(o.y||0)+dy);
  }
  for(const key of ['civilRooms','civilUpperRooms'])if(Array.isArray(b[key]))for(const room of b[key])translateRoom(room,dx,dy);

  const structures=new Set();
  if(b.civilUpper)structures.add(b.civilUpper);if(b.civilRampart)structures.add(b.civilRampart);
  if(Array.isArray(b.civilUpperLevels))for(const structure of b.civilUpperLevels)if(structure)structures.add(structure);
  for(const structure of structures)translateStructure(structure,dx,dy);

  if(b.civilWallTiles instanceof Map)b.civilWallTiles=translateWallMap(b.civilWallTiles,dx,dy);

  if(b.southPlan){
   if(Number.isFinite(b.southPlan.x))b.southPlan.x+=dx;if(Number.isFinite(b.southPlan.y))b.southPlan.y+=dy;
   if(b.southPlan.service&&b.southPlan.service!==b.service)moveObject(b.southPlan.service,Number(b.southPlan.service.x||0)+dx,Number(b.southPlan.service.y||0)+dy);
  }
 }

 function applyScene(sceneId){
  const scene=worldScenes?.[sceneId];
  if(!scene)return {matched:0,unmatched:0};
  let matched=0,unmatched=0;

  for(const raw of state.changes.filter(c=>c.scene===sceneId)){
   const c=normalize(raw);
   let entity=resolve(scene,c);

   if(c.deleted){
    if(!entity){unmatched++;continue}
    const list=c.kind==='building'?scene.buildings:scene.objects,index=list.indexOf(entity);
    if(index>=0)list.splice(index,1);
    matched++;continue;
   }

   if(c.created&&!entity&&c.data){
    entity=JSON.parse(JSON.stringify(c.data));
    entity.id=c.id;
    (c.kind==='building'?scene.buildings:scene.objects).push(entity);
   }

   if(!entity){unmatched++;continue}
   c.kind==='building'?applyBuilding(scene,entity,c):applyObject(entity,c);
   matched++;
  }

  return {matched,unmatched};
 }

 function syncCurrentScene(){
  if(!worldScenes?.[currentScene])return;
  objects.splice(0,objects.length,...worldScenes[currentScene].objects);
  buildings.splice(0,buildings.length,...worldScenes[currentScene].buildings);
  try{worldObjectRevision++}catch{}
  try{realmNavigation?.clear?.()}catch{}
  try{resetLandSurface?.()}catch{}
  try{miniTerrain=null}catch{}
 }


 function renderSavedEditorAsset(r,o,x,z){
  const asset=o?.editorAsset;if(!asset)return null;
  const rotation=(Number(o.editorTransform?.rotation)||0)*Math.PI/180,scale=Math.max(.05,Number(o.editorTransform?.scale)||1);
  if(asset.source==='briar'&&typeof briarModels!=='undefined'){
   const mesh=briarModels[asset.key];if(!mesh)return null;const [lo,hi]=mesh.bounds,cx=(lo[0]+hi[0])/2,cz=(lo[2]+hi[2])/2;
   briarEmit(r,mesh,briarTransform(x-cx*scale,-lo[1]*scale,z-cz*scale,scale,rotation,scale));return (hi[1]-lo[1])*scale;
  }
  if(asset.source==='creature'&&typeof creatureAssets!=='undefined'&&creatureAssets[asset.key]){
   let proxy=o._editorCreatureProxy;if(!proxy){proxy={id:o.id,type:'enemy',kind:asset.key,creatureLook:asset.key,name:o.name,x:o.x,y:o.y,drawX:o.x,drawY:o.y,homeX:o.x,homeY:o.y,dead:0,hp:1,maxhp:1,level:1,atk:0,attackAt:-100,hitAt:-100};try{Object.defineProperty(o,'_editorCreatureProxy',{value:proxy,writable:true,configurable:true})}catch{o._editorCreatureProxy=proxy}}
   Object.assign(proxy,{x:o.x,y:o.y,drawX:o.x,drawY:o.y,homeX:o.x,homeY:o.y,size:scale,attackHeading:rotation,lockAttackHeading:true});
   proxy._creatureMotion??={time,x,z,phase:0,blend:0,speed:0,heading:rotation};proxy._creatureMotion.heading=rotation;proxy._creatureMotion.x=x;proxy._creatureMotion.z=z;
   return creature3(r,proxy,x,z);
  }
  return null;
 }

 function installRenderTransforms(){
  if(typeof prop3==='function'&&!prop3.__worldEditTransform){
   const before=prop3;
   prop3=function(r,o,x,z){
    const direct=renderSavedEditorAsset(r,o,x,z);if(direct!==null)return direct;
    const scale=Number(o?.editorTransform?.scale)||1,rotation=Number(o?.editorTransform?.rotation)||0;
    if(Math.abs(scale-1)<.0001&&Math.abs(rotation)<.0001)return before(r,o,x,z);
    const offset=o?.placement?.offset||[0,0],cx=x+Number(offset[0]||0),cz=z+Number(offset[1]||0);
    const m=affineMultiply(briarTransform(cx,0,cz,scale,rotation*Math.PI/180),briarTransform(-cx,0,-cz,1));
    const q={software:r.software,face(points,color,normals,material,colors,uvs){r.face(points.map(p=>briarPoint(p,0,m)),color,normals,material,colors,uvs)}};
    if(r.indexed)q.indexed=(mesh,t,style)=>r.indexed(mesh,affineMultiply(m,t),style);
    if(r.skinned)q.skinned=(mesh,t,palette,style)=>r.skinned(mesh,affineMultiply(m,t),palette,style);
    return before(q,o,x,z);
   };
   prop3.__worldEditTransform=true;
  }

  if(typeof building3==='function'&&!building3.__worldEditTransform){
   const before=building3;
   building3=function(r,b){
    const scale=Number(b?.editorTransform?.scale)||1,rotation=Number(b?.editorTransform?.rotation)||0;
    if(Math.abs(scale-1)<.0001&&Math.abs(rotation)<.0001)return before(r,b);
    const cx=b.x+b.w/2,cz=b.y+b.h/2;
    const m=affineMultiply(briarTransform(cx,0,cz,scale,rotation*Math.PI/180),briarTransform(-cx,0,-cz,1));
    const q={software:r.software,face(points,color,normals,material,colors,uvs){r.face(points.map(p=>briarPoint(p,0,m)),color,normals,material,colors,uvs)}};
    if(r.indexed)q.indexed=(mesh,t,style)=>r.indexed(mesh,affineMultiply(m,t),style);
    return before(q,b);
   };
   building3.__worldEditTransform=true;
  }
 }

 async function domReady(){
  if(document.readyState!=='loading')return;
  await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
 }

 // This is the critical fix. character-creation.js calls startRebuiltRealm(),
 // which calls boot(). We replace boot before that happens. The replacement
 // waits until every later world-extension script has loaded, then wraps the
 // FINAL setupExpandedWorld / setupTutorialVillage implementations.
 const originalBoot=boot;
 boot=async function(...args){
  await Promise.all([ready,domReady()]);
  installRenderTransforms();

  const finalSetupWorld=setupExpandedWorld;
  const finalSetupTutorial=typeof setupTutorialVillage==='function'?setupTutorialVillage:null;
  const finalActivateScene=activateScene;
  let totals={matched:0,unmatched:0};

  setupExpandedWorld=function(...setupArgs){
   const result=finalSetupWorld.apply(this,setupArgs);
   for(const id of Object.keys(worldScenes||{})){
    if(id==='tutorial')continue;
    const applied=applyScene(id);totals.matched+=applied.matched;totals.unmatched+=applied.unmatched;
   }
   syncCurrentScene();
   return result;
  };

  if(finalSetupTutorial){
   setupTutorialVillage=function(...tutorialArgs){
    const result=finalSetupTutorial.apply(this,tutorialArgs);
    const applied=applyScene('tutorial');totals.matched+=applied.matched;totals.unmatched+=applied.unmatched;
    syncCurrentScene();
    return result;
   };
  }

  activateScene=function(id,...sceneArgs){
   const result=finalActivateScene.call(this,id,...sceneArgs);
   // Reapply this scene because some activation/setup paths clone or replace
   // scene arrays after initial construction.
   const applied=applyScene(id);totals.matched+=applied.matched;totals.unmatched+=applied.unmatched;
   syncCurrentScene();
   return result;
  };

  try{
   const result=await originalBoot.apply(this,args);
   window.VELDREN_WORLD_EDITS_STATUS={
    revision:state.revision,count:state.changes.length,matched:totals.matched,unmatched:totals.unmatched,
    source:state.source,updatedAt:state.updatedAt,error:state.error?String(state.error.message||state.error):null
   };
   console.info('Veldren saved editor layer applied',window.VELDREN_WORLD_EDITS_STATUS);
   return result;
  }finally{
   setupExpandedWorld=finalSetupWorld;
   if(finalSetupTutorial)setupTutorialVillage=finalSetupTutorial;
   activateScene=finalActivateScene;
  }
 };
})();
