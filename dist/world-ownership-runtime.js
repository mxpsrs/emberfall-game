'use strict';
// Procedural static props are authored as construction records, then moved to
// the canonical native Scene once every world-generation pass has completed.
// The old object API is a one-way projection: transform and persistent-field
// writes are immediately committed to the owning Scene entity.
(function(root){
 const FORMAT='veldren.world',VERSION=2;
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const scenesByName=new Map(),legacyAliases=new Map();
 let generationCaptured=false,authoritative=false,generatedCount=0,unsubscribe=null;
 const omitted=new Set(['id','type','name','x','y','z','height','homeX','homeY','drawX','drawY','heading','roomYaw','editorTransform','placement','dead','hitAt','attackAt','drawZ','matrix','worldMatrix','localMatrix']);
 function worldRegistry(){return typeof worldScenes!=='undefined'?worldScenes:(root.worldScenes||{});}
 function activeScene(){return typeof currentScene!=='undefined'?String(currentScene):String(root.currentScene||'');}
 function activeObjects(){return typeof objects!=='undefined'?objects:root.objects||null;}
 function invalidateWorld(){if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof worldObjectIndex!=='undefined')worldObjectIndex=null;if(typeof realmNavigation!=='undefined')realmNavigation?.clear?.();if(typeof resetLandSurface==='function')resetLandSurface();}

 function safe(value,depth=0,seen=new Set()){
  if(value==null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return Number.isFinite(value)||typeof value!=='number'?value:undefined;
  if(depth>5||typeof value!=='object'||seen.has(value)||value instanceof Map||value instanceof Set)return undefined;
  seen.add(value);
  if(Array.isArray(value)){const out=value.map(item=>safe(item,depth+1,seen));seen.delete(value);return out.some(item=>item===undefined)?undefined:out;}
  const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null){seen.delete(value);return undefined;}
  const out={};for(const key of Object.keys(value).sort()){if(key.startsWith('_'))continue;const item=safe(value[key],depth+1,seen);if(item!==undefined)out[key]=item;}
  seen.delete(value);return out;
 }
 function stableText(value){return JSON.stringify(value);}
 function hash(text){let a=2166136261,b=2246822519;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
 function transformSignature(o){
  const p=o.placement||{};
  return {name:String(o.name||''),sprite:Number(o.sprite)||0,kind:String(o.propKind||''),model:String(o.habitatModel||o.campModel||''),
   district:String(o.civilDistrict||o.settlement||o.workplace||o.interiorBuilding||''),role:String(o.civilDecor||o.questScenery||o.briarhavenDetail||''),
   key:String(o.mainStoryKey||o.mountainKey||o.relicKey||''),placement:[p.anchor||'',p.room||'',p.zone||'',p.reason||''],
   x:Number(o.x)||0,y:Number(o.y)||0};
 }
 function defineHidden(object,key,value){try{Object.defineProperty(object,key,{value,writable:true,configurable:true})}catch{object[key]=value}}
 function eachGeneratedProp(fn){
  for(const [sceneName,scene] of Object.entries(worldRegistry()))for(const object of scene.objects||[])
   if(object?.type==='prop'&&(!object._sceneEntityId||object._generatedSceneKey)&&!object._generatedSceneEntity&&!object._editorPreview)fn(String(sceneName),object);
 }
 function captureGenerationIdentity(){
  if(generationCaptured)return {captured:true,count:generatedCount};
  const records=[];eachGeneratedProp((scene,object)=>records.push({scene,object,signature:stableText(transformSignature(object))}));
  records.sort((a,b)=>a.scene.localeCompare(b.scene)||a.signature.localeCompare(b.signature));
  const repeated=new Map();
  for(const record of records){
   const seed=record.scene+'|static-prop-v1|'+record.signature,index=repeated.get(seed)||0;repeated.set(seed,index+1);
   const generationKey=seed+'|same-source-copy:'+index,id='generated:'+record.scene+':prop:'+hash(generationKey);
   defineHidden(record.object,'_generatedSceneKey',generationKey);
   defineHidden(record.object,'_generatedEntityId',id);
   defineHidden(record.object,'_generatedLegacyId',String(record.object.id??''));
   let aliases=legacyAliases.get(record.scene);if(!aliases){aliases=new Map();legacyAliases.set(record.scene,aliases)}
   aliases.set(String(record.object.id??''),id);
  }
  generationCaptured=true;generatedCount=records.length;return {captured:true,count:generatedCount};
 }
 function encodeRotation(degrees){const a=(Number(degrees)||0)*Math.PI/360;return [0,Math.sin(a),0,Math.cos(a)];}
 function rotationDegrees(transform){const q=transform?.rotation||[0,0,0,1];return Math.atan2(2*(q[3]*q[1]+q[0]*q[2]),1-2*(q[1]*q[1]+q[2]*q[2]))*180/Math.PI;}
 function locationGroup(o){return o.interiorBuilding?'Interior '+String(o.interiorBuilding):o.civilDistrict?'Settlement '+String(o.civilDistrict):o.settlement?'Settlement '+String(o.settlement):'Outdoor props';}
 function groupId(scene,name){return 'generated:'+scene+':props:'+hash(name);}
 function rootId(scene){return 'generated:'+scene+':root';}
 function descriptor(scene,object){
  const generationKey=object._generatedSceneKey;if(!generationKey)throw Error('Static prop has no captured generation key');
  const x=Number(object.x)||0,z=Number(object.y)||0,rotation=Number(object.editorTransform?.rotation)||Number((object.heading??object.placement?.yaw??0)*180/Math.PI)||0;
  const scale=Math.max(.05,Number(object.editorTransform?.scale)||1),props=object.placement&&typeof object.placement==='object'?safe(object.placement)||{}:{};
  if(Object.hasOwn(props,'yaw'))delete props.yaw;
  const metadata={};for(const key of Object.keys(object).sort()){
   if(omitted.has(key)||key.startsWith('_'))continue;
   if(['sprite','walkThrough','collisionRadius','propKind','habitatModel','habitatHeight','campModel','tint','civilDecor','briarhavenDetail','editorAsset','mainStoryKey','mountainKey','questScenery','relicKey','placement'].includes(key))continue;
   const value=safe(object[key]);if(value!==undefined)metadata[key]=value;
  }
  if(object.editorAsset){const asset=safe(object.editorAsset);if(asset)metadata.editorAsset=asset;}
  const decoration={kind:String(object.propKind||'prop'),sprite:Number(object.sprite)||0};
  for(const key of ['habitatModel','habitatHeight','campModel','tint','civilDecor','briarhavenDetail'])if(object[key]!==undefined){const value=safe(object[key]);if(value!==undefined)decoration[key]=value;}
  const meshKey=object.editorAsset?.source&&object.editorAsset?.key?String(object.editorAsset.source)+':'+String(object.editorAsset.key):
   object.habitatModel?'procedural:'+String(object.habitatModel):'procedural:prop/'+encodeURIComponent(String(object.propKind||object.sprite||object.name||'12'));
  const components={
   MeshRenderer:{asset:meshKey,visible:true,sprite:Number(object.sprite)||0},
   Interactable:{action:'examine',label:String(object.name||'World object')},
   WorldDecoration:decoration,
   GeneratedProp:{generationKey,sourceVersion:1,legacyCatalogId:object._generatedLegacyId}
  };
  if(object.walkThrough!==true)components.Collider={shape:String(object.propKind||'tile'),solid:true,radius:Math.max(0,Number(object.collisionRadius)||0),source:'WorldDecoration'};
  if(Object.keys(props).length)components.Placement=props;
  if(object.mainStoryKey||object.mountainKey||object.questScenery||object.relicKey){const quest={};for(const key of ['mainStoryKey','mountainKey','questScenery','relicKey'])if(object[key])quest[key]=safe(object[key]);components.QuestMarker=quest;}
  return {id:object._generatedEntityId,name:String(object.name||'World prop'),parent:groupId(scene,locationGroup(object)),active:true,
   transform:{position:[x,Number(object.height)||0,z],rotation:encodeRotation(rotation),scale:[scale,scale,scale]},components,metadata};
 }
 function rootEntity(scene){return {id:rootId(scene),name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{staticPropsVersion:1,staticPropsComplete:true}},metadata:{source:'procedural',scene}};}
 function groupEntity(scene,name){return {id:groupId(scene,name),name,parent:rootId(scene),active:true,transform:identity(),components:{SceneGroup:{category:'StaticProps'}},metadata:{generationGroup:name}};}
 function ensureScene(document,name){let scene=document.scenes.find(item=>item.scene===name);if(!scene){scene={format:'veldren.scene',version:2,scene:name,entities:[]};document.scenes.push(scene);}return scene;}
 function hasCompleteCatalog(scene){return !!scene?.entities?.some(entity=>entity.components?.WorldGeneration?.staticPropsComplete===true);}
 function savedEntityByKey(scene){return new Map((scene?.entities||[]).filter(entity=>entity.components?.GeneratedProp?.generationKey).map(entity=>[entity.components.GeneratedProp.generationKey,entity]));}
 function capturedByScene(){const result=new Map();eachGeneratedProp((scene,object)=>{if(!result.has(scene))result.set(scene,[]);result.get(scene).push(object)});return result;}
 function convertAll(){
  captureGenerationIdentity();
  const source=root.VeldrenWorldEdits?.state?.world;
  const document=source?.format===FORMAT&&source.version===VERSION?JSON.parse(JSON.stringify(source)):{format:FORMAT,version:VERSION,revision:0,updatedAt:null,scenes:[]};
  // RuntimeBinding is the old editor-only mirror. Never save it as permanent
  // generated content or let it compete with the new generated identities.
  for(const scene of document.scenes)scene.entities=scene.entities.filter(entity=>!entity.components?.RuntimeBinding||entity.components?.LegacyWorldEdit);
  const captured=capturedByScene();authoritative=false;
  for(const [name,objects] of captured){
   const scene=ensureScene(document,name),complete=hasCompleteCatalog(scene),saved=savedEntityByKey(scene);authoritative=authoritative||complete;
   const replaced=new Map(objects.filter(object=>object._sceneEntityId&&object._sceneEntityId!==object._generatedEntityId).map(object=>[object._sceneEntityId,object._generatedEntityId]));
   scene.entities=scene.entities.filter(entity=>!replaced.has(entity.id));
   for(const entity of scene.entities)if(replaced.has(entity.parent))entity.parent=replaced.get(entity.parent);
   if(!scene.entities.some(entity=>entity.id===rootId(name)))scene.entities.push(rootEntity(name));
   const groups=new Set();for(const object of objects)groups.add(locationGroup(object));
   for(const label of [...groups].sort())if(!scene.entities.some(entity=>entity.id===groupId(name,label)))scene.entities.push(groupEntity(name,label));
   if(complete)continue;
   for(const object of objects){
    const existing=saved.get(object._generatedSceneKey);
    if(existing){object._generatedEntityId=existing.id;continue;}
    scene.entities.push(descriptor(name,object));
   }
   // The marker makes a saved Scene authoritative after this initial migration.
   scene.entities.find(entity=>entity.id===rootId(name)).components.WorldGeneration.staticPropsComplete=true;
  }
  return document;
 }
 function localJson(entity){return JSON.parse(JSON.stringify(entity));}
 function writeEntity(sceneName,entity){
  if(!root.realmNative?.scenes?.upsert(sceneName,entity))throw Error('Native Scene rejected generated prop '+entity.id);
 }
 function makeProjection(sceneName,initial,legacyId='',options={}){
  const id=initial.id,generationKey=initial.components.GeneratedProp?.generationKey||initial.components.GeneratedBuilding?.generationKey||id,target={};
  const current=()=>{const entity=root.realmNative.scenes.entity(sceneName,id);if(!entity)throw Error('Scene entity was deleted: '+id);return entity;};
  const mutate=fn=>{const next=localJson(current());delete next.worldMatrix;delete next.activeInHierarchy;fn(next);writeEntity(sceneName,next);};
  const pathGet=path=>path.reduce((value,key)=>value?.[key],current());
  const pathSet=(path,value,remove=false)=>{if((remove&&pathGet(path)===undefined)||!remove&&Object.is(pathGet(path),value))return;mutate(entity=>{let valueAt=entity;for(let i=0;i<path.length-1;i++)valueAt=valueAt[path[i]]??=(typeof path[i+1]==='number'?[]:{});if(remove)delete valueAt[path.at(-1)];else valueAt[path.at(-1)]=safe(value);});};
  // Nested component views resolve by path on every access. Mutations commit a
  // new record to C++ before any subsequent getter can observe it.
  const view=path=>{
   const value=pathGet(path);if(!value||typeof value!=='object')return value;
   return new Proxy(Array.isArray(value)?[]:{},{
    get(_target,key){if(key===Symbol.iterator&&Array.isArray(pathGet(path)))return function*(){for(let i=0;i<pathGet(path).length;i++)yield view(path.concat(i));};const next=pathGet(path)?.[key];return next&&typeof next==='object'?view(path.concat(key)):next;},
    set(_target,key,next){pathSet(path.concat(key),next);return true;},deleteProperty(_target,key){pathSet(path.concat(key),undefined,true);return true;},
    ownKeys(){return Reflect.ownKeys(pathGet(path)||{});},
    has(_target,key){return key in (pathGet(path)||{});},
    getOwnPropertyDescriptor(_target,key){if(Array.isArray(pathGet(path))&&key==='length')return {value:pathGet(path).length,writable:true,enumerable:false,configurable:false};return Object.hasOwn(pathGet(path)||{},key)?{enumerable:true,configurable:true}:undefined;}
   });
  };
  const pose=()=>{const m=current().worldMatrix;return {x:m[12],height:m[13],y:m[14],rotation:Math.atan2(m[8],m[0])*180/Math.PI,scale:Math.hypot(m[0],m[1],m[2])};};
  const setPose=patch=>{
   const before=pose(),next={...before};for(const [key,value] of Object.entries(patch))if(value!==undefined)next[key]=Number(value);
   if(!Object.values(next).every(Number.isFinite)||next.scale<=0)throw Error('Invalid generated prop transform');
   if(Object.keys(next).every(key=>Math.abs(next[key]-before[key])<1e-12))return;
   const transform={position:[next.x,next.height,next.y],rotation:encodeRotation(next.rotation),scale:[next.scale,next.scale,next.scale]};
   if(patch.rotation===undefined&&patch.scale===undefined){transform.affine=Array.from(current().worldMatrix);transform.affine[12]=next.x;transform.affine[13]=next.height;transform.affine[14]=next.y;}
   if(!root.realmNative.scenes.setWorldTransform(sceneName,id,transform))throw Error('Native Scene rejected world transform: '+id);
  };
  const fields={
   sprite:['components','MeshRenderer','sprite'],propKind:['components','WorldDecoration','kind'],
   collisionRadius:['components','Collider','radius'],
   placement:['components','Placement']
  };
  for(const key of ['habitatModel','habitatHeight','campModel','tint','civilDecor','briarhavenDetail'])fields[key]=['components','WorldDecoration',key];
  for(const key of ['mainStoryKey','mountainKey','questScenery','relicKey'])fields[key]=['components','QuestMarker',key];
  Object.assign(fields,options.fields||{});
  const transforms={x:'x',y:'y',height:'height',homeX:'x',homeY:'y',drawX:'x',drawY:'y'};
  const access={current,mutate,view,pathGet,pathSet,pose,setPose};
  const editorTransform=new Proxy({},{get(_target,key){return ['rotation','scale'].includes(key)?pose()[key]:undefined;},set(_target,key,value){if(!['rotation','scale'].includes(key))throw Error('Unknown transform field');setPose({[key]:value});return true;},ownKeys:()=>['rotation','scale'],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})});
  const read=key=>{
   if(options.properties?.[key]?.get)return options.properties[key].get(access);
   if(key==='id'||key==='_sceneEntityId')return id;
   if(key==='type')return options.type||'prop';if(key==='name')return current().name;
   if(key==='_generatedSceneEntity')return true;if(key==='_generatedSceneName')return sceneName;
   if(key==='_generatedSceneKey')return generationKey;if(key==='_generatedLegacyId')return legacyId;
   if(key==='_generatedEntity')return current();
   if(key in transforms)return pose()[transforms[key]];
   if(key==='heading')return pose().rotation*Math.PI/180;
   if(key==='editorTransform')return editorTransform;
   if(key==='walkThrough')return !current().components.Collider?.solid;
   if(key==='dead')return current().activeInHierarchy===false?Infinity:Number(current().metadata.dead)||0;
   if(key==='placement'){
    if(!current().components.Placement)return undefined;
    const data=view(fields.placement);
    return new Proxy(data,{get(value,field){return field==='yaw'?pose().rotation*Math.PI/180:Reflect.get(value,field);},set(value,field,next){if(field==='yaw'){setPose({rotation:Number(next)*180/Math.PI});return true;}return Reflect.set(value,field,next);}});
   }
   if(current().components.SpatialLinks?.[key])return root.VeldrenBuildingScene?.getView(sceneName,current().components.SpatialLinks[key]);
   return view(fields[key]||['metadata',key]);
  };
  const write=(key,value)=>{
   if(options.properties?.[key]){if(!options.properties[key].set)throw Error('Read-only Scene relationship: '+key);options.properties[key].set(access,value);return;}
   if(key in transforms){setPose({[transforms[key]]:value});return;}
   if(key==='editorTransform'){setPose({rotation:value?.rotation,scale:value?.scale});return;}
   if(key==='heading'){setPose({rotation:Number(value)*180/Math.PI});return;}
   if(key==='name'){mutate(entity=>{entity.name=String(value);});return;}
   if(key==='walkThrough'){mutate(entity=>{if(value)delete entity.components.Collider;else entity.components.Collider={shape:entity.components.WorldDecoration?.kind||'tile',solid:true,source:'WorldDecoration'};});return;}
   if(key==='placement'){
    const copy=safe(value);if(copy?.yaw!==undefined){setPose({rotation:Number(copy.yaw)*180/Math.PI});delete copy.yaw;}
    pathSet(fields.placement,copy,value==null);return;
   }
   pathSet(fields[key]||['metadata',key],value,value===undefined);
  };
  const keys=new Set(['id','type','name',...Object.keys(transforms),'heading','editorTransform','walkThrough','dead',...Object.keys(fields),...Object.keys(options.properties||{}).filter(key=>!key.startsWith('_'))]);
  return new Proxy(target,{
   get(object,key){if(typeof key!=='string'||key.startsWith('_')&&!key.startsWith('_generated')&&key!=='_sceneEntityId'&&!options.properties?.[key])return Reflect.get(object,key);return read(key);},
   set(object,key,value){if(['id','type','_sceneEntityId','_generatedEntity','_generatedSceneEntity','_generatedSceneKey'].includes(key))throw Error('Scene identity is immutable');if(typeof key!=='string'||key.startsWith('_'))return Reflect.set(object,key,value);write(key,value);return true;},
   deleteProperty(object,key){if(options.properties?.[key]?.delete){options.properties[key].delete(access);return true;}if(String(key).startsWith('_'))return Reflect.deleteProperty(object,key);if(keys.has(key))throw Error('Cannot delete structural field: '+key);pathSet(['metadata',key],undefined,true);return true;},
   ownKeys(){return [...new Set([...keys,...Object.keys(current().metadata),...Reflect.ownKeys(target)])];},
   getOwnPropertyDescriptor(object,key){return Object.getOwnPropertyDescriptor(object,key)||(keys.has(key)||Object.hasOwn(current().metadata,key)?{enumerable:true,configurable:true}:undefined);}
  });
 }
 function arrayReplace(array,values){Array.prototype.splice.call(array,0,array.length,...values);}
 function projectNativeScene(sceneName,sceneDocument,rawObjects){
  const records=(sceneDocument.entities||[]).filter(entity=>entity.components?.GeneratedProp);
  const aliasByKey=new Map((rawObjects||[]).filter(object=>object._generatedSceneKey).map(object=>[object._generatedSceneKey,object._generatedLegacyId]));
  const previous=scenesByName.get(sceneName)?.byId;
  const proxies=records.map(entity=>previous?.get(entity.id)||makeProjection(sceneName,entity,aliasByKey.get(entity.components.GeneratedProp.generationKey)||'')),byId=new Map(proxies.map(proxy=>[String(proxy.id),proxy])),byGeneration=new Map(proxies.map(proxy=>[proxy._generatedSceneKey,proxy]));
  const scene=worldRegistry()[sceneName];if(!scene)return {count:proxies.length,proxies};
  const original=scene.objects||[],seen=new Set(),next=[];
  for(const object of original){
   if(object?.type==='prop'&&object._generatedSceneKey){const proxy=byGeneration.get(object._generatedSceneKey);if(proxy){next.push(proxy);seen.add(proxy.id);}continue;}
   if(object?.type==='prop'&&object._sceneEntityId&&byId.has(String(object._sceneEntityId))){const proxy=byId.get(String(object._sceneEntityId));next.push(proxy);seen.add(proxy.id);continue;}
   next.push(object);
  }
  for(const proxy of proxies)if(!seen.has(proxy.id))next.push(proxy);
  scene.objects=next;
  const children=new Map(),parents=new Map();
  for(const entity of sceneDocument.entities||[]){parents.set(entity.id,entity.parent);if(entity.parent){if(!children.has(entity.parent))children.set(entity.parent,new Set());children.get(entity.parent).add(entity.id);}}
  scenesByName.set(sceneName,{scene,byId,proxies,children,parents});
  const active=activeObjects();if(activeScene()===sceneName&&Array.isArray(active))arrayReplace(active,next);
  return {count:proxies.length,proxies};
 }
 async function migrateStaticProps(){
  captureGenerationIdentity();await (root.realmNativeReady||Promise.reject(Error('Native Scene core is unavailable')));
  const document=convertAll();if(!root.realmNative.scenes.load(document))throw Error('Native Scene rejected the generated world document');
  const captured=capturedByScene(),output=[];for(const [sceneName] of Object.entries(worldRegistry())){const scene=root.realmNative.scenes.read(sceneName);if(scene)output.push(projectNativeScene(sceneName,scene,captured.get(sceneName)||[]));}
  const changed=output.reduce((sum,item)=>sum+item.count,0);generatedCount=changed;
  if(!unsubscribe)unsubscribe=root.realmNative.scenes.subscribe(onSceneChange);
  try{invalidateWorld();}catch{}
  return {migrated:changed,scenes:output.length,authoritative};
 }
 function onSceneChange(event){
  const names=event.kind==='load'?Object.keys(worldRegistry()):[event.scene];
  for(const name of names){
   const table=scenesByName.get(name);if(!table)continue;
   if(event.kind==='batch'&&event.changes?.every(change=>!table.parents.has(change.id)&&!root.realmNative.scenes.entity(name,change.id)?.components.GeneratedProp))continue;
   if(event.kind==='transform'||event.kind==='upsert'&&table.parents.has(event.id)){
    const entity=root.realmNative.scenes.entity(name,event.id);
    // Parent edits invalidate only renderer entries in the affected branch.
    if(entity&&table.parents.get(event.id)!==entity.parent){table.children.get(table.parents.get(event.id))?.delete(event.id);if(entity.parent){if(!table.children.has(entity.parent))table.children.set(entity.parent,new Set());table.children.get(entity.parent).add(event.id);}table.parents.set(event.id,entity.parent);}
    const pending=[event.id],affected=new Set(pending);
    for(let i=0;i<pending.length;i++)for(const id of table.children.get(pending[i])||[])if(!affected.has(id)){pending.push(id);affected.add(id);}
    for(const id of affected){const proxy=table.byId.get(id);if(proxy){if(typeof staticMeshes3!=='undefined')staticMeshes3.delete(proxy);if(typeof staticMeshQueues3!=='undefined')staticMeshQueues3.prop.delete(proxy);}}
    if(event.kind==='transform'||entity){invalidateWorld();continue;}
   }
   if(event.kind==='upsert'&&!root.realmNative.scenes.entity(name,event.id)?.components.GeneratedProp)continue;
   const scene=root.realmNative.scenes.read(name)||{entities:[]};projectNativeScene(name,scene,worldRegistry()[name]?.objects||[]);
  }
  invalidateWorld();
 }
 function setWorldTransform(sceneName,id,input){
  const record=scenesByName.get(String(sceneName))?.byId.get(String(id));if(!record)return false;
  if(input.x!=null)record.x=input.x;if(input.y!=null)record.y=input.y;
  record.editorTransform={rotation:input.rotation,scale:input.scale};
  return {x:record.x,y:record.y,rotation:record.editorTransform.rotation,scale:record.editorTransform.scale};
 }
 function setTransform(sceneName,id,transform){
  return root.realmNative?.scenes?.setTransform?.(String(sceneName),String(id),transform)===true;
 }
 function remove(sceneName,id){
  const record=scenesByName.get(String(sceneName))?.byId.get(String(id));if(!record)return false;
  if(!root.realmNative.scenes.remove(String(sceneName),String(id)))return false;
  const scene=record._generatedSceneName===sceneName?worldRegistry()[sceneName]:null;
  if(scene){const at=scene.objects.indexOf(record);if(at>=0)Array.prototype.splice.call(scene.objects,at,1);const active=activeObjects();if(activeScene()===sceneName&&Array.isArray(active)){const index=active.indexOf(record);if(index>=0)Array.prototype.splice.call(active,index,1);}}
  const table=scenesByName.get(String(sceneName));table.byId.delete(String(id));table.proxies=table.proxies.filter(item=>item!==record);return true;
 }
 function document(){return root.realmNative?.scenes?.serialize?.()||null;}
 function replaceDocument(value){
  if(!value||value.format!==FORMAT||value.version!==VERSION)throw Error('Invalid canonical world document');
  value=root.VeldrenSceneFormat?.withoutRuntimeBindings?root.VeldrenSceneFormat.withoutRuntimeBindings(value):value;
  if(!root.realmNative?.scenes?.load?.(value))throw Error('Native Scene rejected the edited world document');
  const registry=worldRegistry();for(const sceneName of Object.keys(registry)){const scene=root.realmNative.scenes.read(sceneName);if(scene)projectNativeScene(sceneName,scene,registry[sceneName]?.objects||[]);}
  root.VeldrenWorldEdits?.refreshSceneRenderables?.(value);
  return document();
 }
 function status(){return {captured:generationCaptured,migrated:generatedCount,scenes:scenesByName.size,savedCatalogAuthoritative:authoritative};}
 root.VeldrenSceneOwnership={ownsLegacy(scene,kind,id){if(kind==='object')return legacyAliases.get(String(scene))?.has(String(id))||root.VeldrenLightScene?.ownsLegacy(String(scene),id)||false;return (root.realmNative?.scenes?.componentIds(String(scene),'GeneratedBuilding')||[]).some(entityId=>root.realmNative.scenes.entity(String(scene),entityId).components.GeneratedBuilding.legacyKey===String(id));},captureGenerationIdentity,migrateStaticProps,setWorldTransform,setTransform,remove,replaceDocument,document,status,createView:makeProjection,copyData:safe,stableHash:hash,find(sceneName,id){return scenesByName.get(String(sceneName))?.byId.get(String(id))||null;},resolveLegacy(sceneName,id){return legacyAliases.get(String(sceneName))?.get(String(id))||null;}};
})(globalThis);
