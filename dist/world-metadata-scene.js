'use strict';
// Scene descriptions, bounds and navigation are persistent native components.
// Procedural records are construction input; legacy APIs project the saved graph.
(function(root){
 const native=()=>root.realmNative.scenes,registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const sizes=()=>typeof sceneSizes!=='undefined'?sceneSizes:root.sceneSizes;
 const realm=()=>typeof realmSceneInfo!=='undefined'?realmSceneInfo:root.realmSceneInfo;
 const lairs=()=>typeof CREATURE_LAIRS!=='undefined'?CREATURE_LAIRS:root.CREATURE_LAIRS||{};
 const rootId=name=>'generated:'+name+':root',identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const copy=value=>root.VeldrenSceneOwnership.copyData(value),clone=value=>JSON.parse(JSON.stringify(value));
 const infoFields=['title','subtitle','race','kingdom','layoutVersion','lair','openAir','civilFloor','kind','settlement'];
 const environmentFields=['theme','floor','trim','glow','fog','ambient','light'];
 const layoutFields=['rooms','arena','arenaEntry','approach','entrance','returnPoint'];
 const views=new Map(),bound=new Set(),aliases=new Map();let enabled=false,renderInstalled=false;
 const node=name=>native().entity(name,rootId(name));
 function capture(){
  for(const [name,w]of Object.entries(registry())){const repeats=new Map();for(const o of w.objects||[]){if(o.type!=='exit'||o._generatedExit)continue;
   const key=JSON.stringify([o.name,o.x,o.y]),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);
   if(!o._generatedExitId)Object.defineProperty(o,'_generatedExitId',{value:'generated:'+name+':exit:'+root.VeldrenSceneOwnership.stableHash(key+'|'+ordinal),configurable:true});
  }}
 }
 function rootView(name){
  const key=name+'|root';if(views.has(key))return views.get(key);const initial=node(name);if(!initial)return;
  const fields={};for(const field of infoFields)fields[field]=['components','SceneInfo',field];
  for(const field of environmentFields)fields[field]=['components','SceneEnvironment',field];
  for(const field of layoutFields)fields[field]=['components','LairLayout',field];
  for(const field of ['exterior','returnAt'])fields[field]=['components','SceneNavigation',field];
  fields.size=['components','SceneBounds','size'];fields.buildingRef=['components','SceneAssociation','building'];
  const view=root.VeldrenSceneOwnership.createView(name,initial,'',{fields});views.set(key,view);return view;
 }
 function exitView(name,id){
  const key=name+'|'+id;if(views.has(key))return views.get(key);const initial=native().entity(name,id);if(!initial)return;
  const view=root.VeldrenSceneOwnership.createView(name,initial,'',{type:'exit',properties:{id:{get:()=>initial.components.CatalogIdentity.id},_generatedExit:{get:()=>true}}});views.set(key,view);return view;
 }
 function resolve(name,id){
  if(!id||!native().entity(name,id))return undefined;
  return (registry()[name]?.objects||[]).find(o=>o._sceneEntityId===id)||root.VeldrenSceneOwnership.find(name,id)||undefined;
 }
 function entryNode(name){const id=node(name)?.components.SceneNavigation?.entry;return id&&native().entity(name,id);}
 function setEntry(name,value){
  if(!Array.isArray(value)||value.length!==2||!value.every(Number.isFinite))throw Error('Scene entry requires two finite coordinates');
  const entry=entryNode(name);if(!entry)throw Error('Scene entry was deleted');
  const affine=Array.from(entry.worldMatrix);affine[12]=value[0];affine[14]=value[1];
  if(!native().setWorldTransform(name,entry.id,{...identity(),affine}))throw Error('Native Scene rejected the entry transform');
 }
 function entryView(name){
  if(!entryNode(name))return undefined;
  const out=[];for(let i=0;i<2;i++)Object.defineProperty(out,i,{enumerable:true,configurable:false,get:()=>entryNode(name)?.worldMatrix[i?14:12],set:value=>{const next=Array.from(out);next[i]=value;setEntry(name,next);}});
  Object.defineProperty(out,'length',{writable:false});return Object.preventExtensions(out);
 }
 function bindField(target,field,name,source=field){
  Object.defineProperty(target,field,{enumerable:true,configurable:false,get:()=>node(name)?rootView(name)[source]:undefined,set:value=>{rootView(name)[source]=value;}});
 }
 function project(name){
  const w=registry()[name];if(!w)return;
  const ids=native().componentIds(name,'GeneratedExit'),catalog=new Map(ids.map(id=>[String(native().entity(name,id).components.CatalogIdentity.id),id])),seen=new Set(),next=[];
  for(const o of w.objects||[]){if(o._generatedSceneEntity&&!native().entity(name,o._sceneEntityId))continue;if(o.type==='exit'||o._generatedExit){const id=o._generatedExit?o._sceneEntityId:catalog.get(String(o.id));if(id&&native().entity(name,id)){next.push(exitView(name,id));seen.add(id);}continue;}next.push(o);}
  for(const id of ids)if(!seen.has(id))next.push(exitView(name,id));if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.project(name,next);else w.objects=next;aliases.set(name,catalog);
  if(typeof currentScene!=='undefined'&&currentScene===name&&typeof objects!=='undefined'){if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.activate();else (globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(next):objects.splice(0,objects.length,...next));}
  if(!bound.has(name)){
   for(const field of [...infoFields,'exterior','returnAt'])bindField(w,field,name);
   Object.defineProperty(w,'entry',{enumerable:true,configurable:false,get:()=>entryView(name),set:value=>setEntry(name,value)});
   Object.defineProperty(w,'exit',{enumerable:true,configurable:false,get:()=>resolve(name,node(name)?.components.SceneNavigation?.exit),set:value=>{
    const id=value?._sceneEntityId;if(value&&(!id||!native().entity(name,id)))throw Error('Scene exit must reference an entity in this Scene');
    const next=clone(node(name));next.components.SceneNavigation.exit=id||null;if(!native().upsert(name,next))throw Error('Native Scene rejected exit reference');
   }});
   bindField(sizes(),name,name,'size');
   const lair=lairs()[name];if(lair){for(const field of ['title','subtitle','openAir',...environmentFields,...layoutFields])bindField(lair,field,name);bindField(lair,'size',name,'size');Object.defineProperty(lair,'entry',{enumerable:true,configurable:false,get:()=>entryView(name),set:value=>setEntry(name,value)});}
   bound.add(name);
  }
  const map=realm();if(map){
   if(node(name)?.components.SceneAssociation?.realm){
    if(!map.has(name)){
     const info={};Object.defineProperty(info,'id',{value:name,enumerable:true});for(const field of ['title','kind','race','kingdom','settlement'])bindField(info,field,name);
     Object.defineProperty(info,'building',{enumerable:true,get:()=>{const ref=node(name)?.components.SceneAssociation?.building;return ref&&native().entity(ref.scene,ref.id)?root.VeldrenBuildingScene.getView(ref.scene,ref.id):undefined;},set:value=>{if(!value?._generatedBuildingEntity)throw Error('Scene association requires a native building');rootView(name).buildingRef={scene:value._generatedSceneName,id:value._sceneEntityId};}});
     Map.prototype.set.call(map,name,info);
    }
   }else Map.prototype.delete.call(map,name);
  }
 }
 function invalidate(){
  if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof worldObjectIndex!=='undefined')worldObjectIndex=null;
  if(typeof realmNavigation!=='undefined')realmNavigation.clear();if(typeof lairRockMasks!=='undefined')lairRockMasks.clear();
  if(typeof resetLandSurface==='function')resetLandSurface();
  if(typeof miniTerrain!=='undefined')miniTerrain=null;if(typeof worldAtlasTerrain!=='undefined')worldAtlasTerrain=null;
  for(const w of Object.values(registry()))w.floorChunks?.clear();
  for(const view of views.values()){if(typeof staticMeshes3!=='undefined')staticMeshes3.delete(view);if(typeof staticMeshQueues3!=='undefined')staticMeshQueues3.prop.delete(view);}
 }
 async function migrate(){
  capture();const document=native().serialize();let scenes=0,exits=0,entries=0;
  for(const [name,w]of Object.entries(registry())){
   let scene=document.scenes.find(s=>s.scene===name);if(!scene){scene={format:'veldren.scene',version:2,scene:name,entities:[]};document.scenes.push(scene);}
   let world=scene.entities.find(e=>e.id===rootId(name));if(!world){world={id:rootId(name),name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{}};scene.entities.push(world);}
   if(world.components.WorldGeneration.metadataComplete)continue;
   const info=realm()?.get(name),lair=lairs()[name],fields={};for(const field of infoFields){const value=w[field]??info?.[field]??lair?.[field]??(field==='kingdom'?info?.building?.kingdom:undefined);if(value!==undefined)fields[field]=copy(value);}
   world.components.SceneInfo=fields;world.components.SceneBounds={size:copy(sizes()[name]||sizes().overworld)};
   const navigation={};for(const field of ['exterior','returnAt'])if(w[field]!==undefined)navigation[field]=copy(w[field]);
   const entryId=rootId(name)+':entry';scene.entities.push({id:entryId,name:'Scene entry',parent:rootId(name),active:true,transform:{...identity(),position:[w.entry?.[0]||0,0,w.entry?.[1]||0]},components:{SceneEntry:{version:1}},metadata:{}});navigation.entry=entryId;entries++;
   for(const o of w.objects||[])if(o.type==='exit'){
    const id=o._generatedExitId,oldId=o._sceneEntityId,metadata={},skip=new Set(['id','type','name','x','y','z','height','homeX','homeY','drawX','drawY','editorTransform','heading','sprite','walkThrough']);
    for(const key of Object.keys(o))if(!key.startsWith('_')&&!skip.has(key)){const value=copy(o[key]);if(value!==undefined)metadata[key]=value;}
    const angle=(o.editorTransform?.rotation??(o.heading||0)*180/Math.PI)*Math.PI/360,scale=o.editorTransform?.scale||1;
    const components={GeneratedExit:{version:1},CatalogIdentity:{id:o.id,scene:name},SceneExit:{returnToSavedPoint:true},MeshRenderer:{asset:'procedural:exit',sprite:o.sprite||13,visible:true},Interactable:{action:'leave-scene',label:o.name||'Exit'}};
    if(!o.walkThrough)components.Collider={shape:'tile',solid:true};
    scene.entities.push({id,name:o.name||'Exit',parent:rootId(name),active:true,transform:{position:[o.x,o.height||0,o.y],rotation:[0,Math.sin(angle),0,Math.cos(angle)],scale:[scale,scale,scale]},components,metadata});
    if(oldId&&oldId!==id){scene.entities=scene.entities.filter(e=>e.id!==oldId);for(const e of scene.entities)if(e.parent===oldId)e.parent=id;}
    if(o===w.exit||String(o.id)===String(w.exit?.id))navigation.exit=id;exits++;
   }
   if(!navigation.exit&&w.exit){const id=[w.exit._sceneEntityId,w.exit._generatedEntityId,root.VeldrenSceneOwnership.resolveLegacy(name,w.exit.id)].find(id=>id&&scene.entities.some(e=>e.id===id));if(id)navigation.exit=id;else throw Error('Unresolved scene exit: '+name);}
   world.components.SceneNavigation=navigation;
   if(info){const b=info.building;world.components.SceneAssociation={realm:true,...(b?._generatedBuildingEntity?{building:{scene:b._generatedSceneName,id:b._sceneEntityId}}:{})};}
   if(lair){world.components.SceneEnvironment={};world.components.LairLayout={};for(const field of environmentFields)if(lair[field]!==undefined)world.components.SceneEnvironment[field]=copy(lair[field]);for(const field of layoutFields)if(lair[field]!==undefined)world.components.LairLayout[field]=copy(lair[field]);}
   world.components.WorldGeneration.metadataComplete=true;scenes++;
  }
  if(!native().load(document))throw Error('Native Scene rejected metadata');
  const map=realm();if(!enabled&&map){Map.prototype.clear.call(map);for(const method of ['set','delete','clear'])Object.defineProperty(map,method,{value(){throw Error('Edit scene association entities through the Scene');}});}
  for(const name of Object.keys(registry()))project(name);
  if(!enabled)native().subscribe(event=>{if(event.kind==='load')for(const name of Object.keys(registry()))project(name);else if(['remove','upsert','batch'].includes(event.kind))project(event.scene);invalidate();});
  enabled=true;installRendering();invalidate();return {scenes,entries,exits};
 }
 function installRendering(){
  if(renderInstalled||typeof prop3!=='function')return;renderInstalled=true;const before=prop3;
  prop3=function(r,o,x,z){if(!o._generatedExit)return before(r,o,x,z);const entity=native().entity(o._generatedSceneName,o._sceneEntityId);if(!entity?.activeInHierarchy)return 0;
   const m=root.VeldrenBuildingScene.matrices.row(entity.worldMatrix),logical={...o,heading:0,editorTransform:{rotation:0,scale:1}};
   return before(root.VeldrenLightScene.painter(r,m,[m[3],m[11]]),logical,x,z);
  };
 }
 root.VeldrenMetadataScene={capture,migrate,ownsLegacy:(name,id)=>aliases.get(name)?.has(String(id))||false,get enabled(){return enabled;}};
})(globalThis);
