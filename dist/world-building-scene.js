'use strict';
// Building generation records are temporary input. This mapper produces the
// persistent entities used by the native Scene; all geometry is parent-local.
(function(root){
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
 const pick=(source,keys)=>Object.fromEntries(keys.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
 const copy=value=>JSON.parse(JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?Array.from(item):item));
 const matrices={
  column:m=>[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1],
  row:m=>[m[0],m[4],m[8],m[12],m[1],m[5],m[9],m[13],m[2],m[6],m[10],m[14]]
 };
 const fieldGroups={
  BuildingFootprint:['w','h'],BuildingAppearance:['race','archetype','variant','visualHeight','briarDesign'],
  SettlementMember:['settlement','kingdom','district','planned','quarry'],
  BuildingAccess:['walkIn','usableUpper','doorFacing','planFacing','civilGateHalfWidth'],
  QuestMarker:['questBeacon']
 };
 function capture(registry){
  const hash=root.VeldrenSceneOwnership.stableHash,repeats=new Map();let count=0;
  for(const [scene,world]of Object.entries(registry))for(const building of world.buildings||[]){
   if(building._generatedBuildingKey)continue;
   const signature=building._briarGenerationSignature||JSON.stringify([scene,building.name,building.settlement||'',building.archetype||'',building.x,building.y,building.w,building.h,building.service?.destination||'']);
   const ordinal=repeats.get(signature)||0;repeats.set(signature,ordinal+1);
   const key='building-v1:'+signature+':identical-copy:'+ordinal;
   Object.defineProperties(building,{_generatedBuildingKey:{value:key,configurable:true},_generatedBuildingId:{value:'generated:'+scene+':building:'+hash(key),configurable:true}});count++;
  }
  return count;
 }
 function populate(input,registry){
  const A=root.VeldrenAssembly;if(!A)throw Error('Building scene migration requires affine transform utilities');
  capture(registry);
  const document=copy(input),bindings=new Map(),sourceReferences=new WeakMap(),hash=root.VeldrenSceneOwnership.stableHash;
  let buildings=0,parts=0,doors=0;
  for(const [name,world]of Object.entries(registry)){
   if(!world.buildings?.length)continue;
   let scene=document.scenes.find(scene=>scene.scene===name);if(!scene){scene={format:'veldren.scene',version:2,scene:name,entities:[]};document.scenes.push(scene);}
   const rootId='generated:'+name+':root';let worldRoot=scene.entities.find(entity=>entity.id===rootId);
   if(!worldRoot){worldRoot={id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{scene:name,source:'procedural'}};scene.entities.push(worldRoot);}
   const generation=worldRoot.components.WorldGeneration??={};
   const complete=generation.buildingsComplete===true;
   const sceneBindings=[];bindings.set(name,sceneBindings);
   for(const b of world.buildings){
    const id=b._generatedBuildingId,known=new Set(['x','y','name','sprite','service','southPlan','civilUpper','civilUpperLevels','civilRampart','civilRooms','civilUpperRooms','civilWallTiles','civilCastle','assembly','editorTransform']);
    for(const keys of Object.values(fieldGroups))for(const key of keys)known.add(key);
    for(const key of Object.keys(b))if(!known.has(key)&&!key.startsWith('_'))throw Error('Unmapped generated building field: '+key);
    sourceReferences.set(b,{scene:name,id});sceneBindings.push({source:b,id});
    if(complete)continue;
    const entities=[],occurrences=new Map(),roleOccurrences=new Map();
    const child=(role,source,parent=id,at=null)=>{
     const position=at||[number(source.x)-number(b.x),0,number(source.y)-number(b.y)];
     const signature=JSON.stringify([parent,role,source.name||'',position,source.w??null,source.h??null]),ordinal=occurrences.get(signature)||0;occurrences.set(signature,ordinal+1);
     const roleOrdinal=roleOccurrences.get(role)||0;roleOccurrences.set(role,roleOrdinal+1);
     const preserved=typeof briarGenerationIdentity==='function'&&briarGenerationIdentity(name,'parts',id+':'+role)?.[roleOrdinal];
     const entity={id:preserved||id+':'+role+':'+hash(signature+':'+ordinal),name:source.name||role,parent,active:true,transform:{...identity(),position},components:{BuildingPart:{building:id,role}},metadata:{}};
     entities.push(entity);parts++;if(source&&typeof source==='object')sourceReferences.set(source,{scene:name,id:entity.id});return entity;
    };
    const rect=(role,source,parent=id)=>{const entity=child(role,source,parent);entity.components.Footprint=pick(source,['w','h']);return entity;};
    const point=(role,x,y,parent=id)=>child(role,{},parent,[number(x)-number(b.x),0,number(y)-number(b.y)]);
    const rooms=list=>(list||[]).map(source=>{
     const entity=rect('room',source);entity.components.Room=pick(source,['usage']);
     if(source.door){const doorway=point('room-entrance',source.door[0],source.door[1]);doorway.components.RoomEntrance={parameters:source.door.slice(2)};entity.components.Room.entrance=doorway.id;}
     return entity.id;
    });
    const surfaceCache=new WeakMap();
    const surface=source=>{
     if(!source)return null;if(surfaceCache.has(source))return surfaceCache.get(source);
     const entity=child('walk-surface',source,id,[0,number(source.base),0]);surfaceCache.set(source,entity.id);
     entity.components.WalkSurface=pick(source,['kind','rise']);const shape=entity.components.WalkSurface;
     if(source.ramp)shape.ramp=rect('ramp',source.ramp,entity.id).id;
     shape.decks=(source.decks||[]).map(deck=>rect('deck',deck,entity.id).id);
     if(source.rampLine){const {ax,az,bx,bz,width}=source.rampLine;shape.rampLine={start:point('ramp-start',ax,az,entity.id).id,end:point('ramp-end',bx,bz,entity.id).id,width};}
     if(source.editorRamps?.length)throw Error('Authored ramp surfaces require module migration before building conversion');
     return entity.id;
    };
    const layout={civilCastle:!!b.civilCastle,rooms:rooms(b.civilRooms),upperRooms:rooms(b.civilUpperRooms),walls:[]};
    layout.upper=surface(b.civilUpper);layout.upperLevels=(b.civilUpperLevels||[]).map(surface);layout.rampart=surface(b.civilRampart);
    if(b.civilWallTiles)for(const wall of b.civilWallTiles.values()){
     const entity=child('wall',wall);entity.components.Collider={shape:'tile-wall',solid:true,...pick(wall,['height','axis'])};layout.walls.push(entity.id);
    }
    const components={GeneratedBuilding:{generationKey:b._generatedBuildingKey,version:1,legacyKey:b._editorId||b._sceneEntityId||null},MeshRenderer:{asset:'procedural:building',sprite:number(b.sprite),visible:true},BuildingLayout:layout};
    for(const [type,keys]of Object.entries(fieldGroups)){const fields=pick(b,keys);if(Object.keys(fields).length)components[type]=fields;}
    if(b.southPlan){
     const blueprint=rect('blueprint',b.southPlan);layout.blueprint=blueprint.id;
     if(b.southPlan.service){const entry=point('blueprint-entrance',b.southPlan.service.x,b.southPlan.service.y);blueprint.components.Blueprint={entrance:entry.id};}
    }
    if(b.service){
     const source=b.service,door=child('entrance',source);doors++;
     door.components.MeshRenderer={asset:'procedural:building-door',sprite:number(source.sprite),visible:true};
     door.components.CatalogIdentity={id:source.id,scene:name};
     door.components.Entrance={...pick(source,['type','destination','entry']),building:id};
     door.components.Interactable={action:'enter',label:source.name||b.name};
     door.components.DoorState={open:source.openedAt!==undefined};door.components.Collider={shape:'door',solid:source.walkThrough!==true};
     const excluded=new Set(['id','type','name','sprite','x','y','z','height','homeX','homeY','drawX','drawY','heading','roomYaw','editorTransform','building','doorMotion','openedAt','destination','entry','walkThrough','dead','hitAt','attackAt']);
     for(const [key,value]of Object.entries(source))if(!key.startsWith('_')&&!excluded.has(key)&&typeof value!=='function')door.metadata[key]=copy(value);
     (components.BuildingAccess??={}).entrance=door.id;
    }
    // Saved modular content is imported after its building hierarchy exists.
    const angle=number(b.editorTransform?.rotation)*Math.PI/360,scale=number(b.editorTransform?.scale,1);
    const groupId=rootId+':settlement:'+hash(b.settlement||'standalone-buildings');
    if(!scene.entities.some(e=>e.id===groupId))scene.entities.push({id:groupId,name:b.settlement||'Buildings',parent:rootId,active:true,transform:identity(),components:{SceneGroup:{category:'Buildings'},SettlementMember:{settlement:b.settlement||''}},metadata:{}});
    const entity={id,name:b.name||'Building',parent:groupId,active:true,transform:{position:[number(b.x),0,number(b.y)],rotation:[0,Math.sin(angle),0,Math.cos(angle)],scale:[scale,scale,scale]},components,metadata:{}};
    // Migrated props become children of their building. Native affine local
    // transforms preserve their existing world pose through this ownership move.
    const buildingInverse=A.inverse(A.transform(number(b.x),0,number(b.y),angle*2,scale));
    for(const prop of scene.entities){
     if(!prop.components?.GeneratedProp||!b.service?.destination||![prop.metadata?.interiorBuilding,prop.metadata?.civilCourtyard].includes(b.service.destination))continue;
     const snapshot=root.realmNative.scenes.entity(name,prop.id),local=A.multiply(buildingInverse,matrices.row(snapshot.worldMatrix));
     prop.parent=id;prop.transform={...identity(),position:[local[3],local[7],local[11]],affine:matrices.column(local)};
     const links={};if(prop.metadata.civilContinuousStair&&layout.upper)links.civilContinuousStair=layout.upper;
     if(prop.metadata.civilRampartStair&&layout.rampart)links.civilRampartStair=layout.rampart;
     if(Object.keys(links).length){prop.components.SpatialLinks=links;for(const key of Object.keys(links))delete prop.metadata[key];}
    }
    if(b._sceneEntityId&&b._sceneEntityId!==id)scene.entities=scene.entities.filter(entity=>entity.id!==b._sceneEntityId);
    scene.entities.push(entity,...entities);buildings++;
   }
   generation.buildingsVersion=1;generation.buildingsComplete=true;
  }
  return {document,bindings,sourceReferences,counts:{buildings,parts,doors}};
 }
 // Compatibility views contain IDs only. The native Scene owns every field;
 // renderer/collision projections are computed from the same transform graph.
 const views=new Map(),tables=new Map(),assemblyRenders=new Map(),assemblyProjections=new Map(),collisionQueries=new Map(),collisionBuckets=new Map();let subscribed=false,installed=false,buildingRender=null;
 const native=()=>root.realmNative.scenes;
 const registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const entity=(scene,id)=>native().entity(scene,id);
 const present=(scene,ids)=>(ids||[]).filter(id=>entity(scene,id));
 function getView(scene,id,localBuilding=null){
  if(!id||!entity(scene,id))return undefined;
  const key=JSON.stringify([scene,id,localBuilding]);if(views.has(key))return views.get(key);
  const initial=entity(scene,id),C=initial.components,group=C.GeneratedBuilding?'building':C.Entrance?'door':C.WalkSurface?'walk-surface':C.Room?'room':'building-part';
  const fields={w:['components',C.GeneratedBuilding?'BuildingFootprint':'Footprint','w'],h:['components',C.GeneratedBuilding?'BuildingFootprint':'Footprint','h'],usage:['components','Room','usage'],rise:['components','WalkSurface','rise'],kind:['components','WalkSurface','kind'],axis:['components','Collider','axis']};
  if(C.GeneratedBuilding)for(const [type,keys]of Object.entries(fieldGroups))for(const field of keys)fields[field]=['components',type,field];
  let openedAt,doorMotion;const A=root.VeldrenAssembly;
  const resolve=target=>getView(scene,target,localBuilding);
  const readComponent=type=>entity(scene,id)?.components[type];
  const relation=(type,field)=>({get:()=>resolve(readComponent(type)?.[field])});
  const list=(type,field)=>({get:()=>{const ids=readComponent(type)?.[field];return ids?.length||type==='WalkSurface'?present(scene,ids).map(resolve):undefined;}});
  const properties={
   _generatedBuildingEntity:{get:()=>!!C.GeneratedBuilding},
   _buildingOwner:{get:()=>C.GeneratedBuilding?id:(readComponent('BuildingPart')||C.BuildingPart)?.building},
   service:relation(C.GeneratedBuilding?'BuildingAccess':'Blueprint','entrance'),
   building:{get:()=>resolve(readComponent('Entrance')?.building||readComponent('BuildingPart')?.building)},
   civilRooms:list('BuildingLayout','rooms'),civilUpperRooms:list('BuildingLayout','upperRooms'),
   civilUpper:relation('BuildingLayout','upper'),civilUpperLevels:list('BuildingLayout','upperLevels'),civilRampart:relation('BuildingLayout','rampart'),
   civilCastle:{get:()=>readComponent('BuildingLayout')?.civilCastle},southPlan:relation('BuildingLayout','blueprint'),
   ramp:relation('WalkSurface','ramp'),decks:list('WalkSurface','decks'),
   door:{get:()=>{const target=resolve(readComponent('Room')?.entrance);return target?[target.x,target.y,...(entity(scene,target._sceneEntityId).components.RoomEntrance?.parameters||[])]:undefined;}},
   rampLine:{get:()=>{const line=readComponent('WalkSurface')?.rampLine;if(!line)return undefined;const a=resolve(line.start),b=resolve(line.end);return a&&b?{ax:a.x,az:a.y,bx:b.x,bz:b.y,width:line.width}:undefined;}},
   base:{get:access=>access.pose().height},
   civilWallTiles:{get:()=>{const ids=readComponent('BuildingLayout')?.walls;if(!ids?.length)return undefined;return wallMap(scene,ids,localBuilding);}},
   assembly:{get:()=>readComponent('ModularBuilding')?assemblyView(scene,id):undefined,set:(_access,value)=>setAssembly(scene,id,value)}
  };
  if(C.Entrance){
   properties.id={get:()=>(readComponent('CatalogIdentity')||C.CatalogIdentity).id};
   properties.type={get:()=>(readComponent('Entrance')||C.Entrance).type||'door'};
   for(const field of ['destination','entry'])fields[field]=['components','Entrance',field];
   properties.openedAt={get:()=>readComponent('DoorState').open?(openedAt??0):undefined,set:(access,value)=>{openedAt=value;access.pathSet(['components','DoorState','open'],value!==undefined);},delete:access=>{openedAt=undefined;access.pathSet(['components','DoorState','open'],false);}};
   properties.doorMotion={get:()=>doorMotion,set:(_access,value)=>{doorMotion=value;},delete:()=>{doorMotion=undefined;}};
  }
  if(C.Collider?.shape==='tile-wall')properties.height={get:()=>readComponent('Collider').height,set:(access,value)=>access.pathSet(['components','Collider','height'],value)};
  if(localBuilding){
   const localPose=()=>A.multiply(A.inverse(matrices.row(entity(scene,localBuilding).worldMatrix)),matrices.row(entity(scene,id).worldMatrix));
   for(const [field,index]of [['x',3],['y',11],['homeX',3],['homeY',11],['drawX',3],['drawY',11]])properties[field]={get:()=>localPose()[index]+entity(scene,localBuilding).worldMatrix[index===3?12:14]};
   properties.base={get:()=>localPose()[7]};properties.editorTransform={get:()=>({rotation:0,scale:1})};
  }
  const view=root.VeldrenSceneOwnership.createView(scene,initial,'',{type:group,fields,properties});views.set(key,view);return view;
 }
 const wallMaps=new Map();
 function wallMap(scene,ids,localBuilding){
  // Maps are derived spatial indexes; values still read native components.
  const key=JSON.stringify([scene,ids[0]||'',localBuilding]),revision=native().revision(),cached=wallMaps.get(key);if(cached?.revision===revision)return cached.map;
  const map=new Map();for(const id of present(scene,ids)){const wall=getView(scene,id,localBuilding);map.set(wall.x+':'+wall.y,wall);}
  // Map mutation never changes persistent collision data.
  for(const method of ['set','delete','clear'])Object.defineProperty(map,method,{value(){throw Error('Edit wall entities through the Scene');}});
  wallMaps.set(key,{revision,map});return map;
 }
 function project(sceneName){
  const world=registry()[sceneName];if(!world)return;
  const ids=native().componentIds(sceneName,'GeneratedBuilding'),before=tables.get(sceneName),oldBuildings=world.buildings||[];
  const result=ids.map(id=>getView(sceneName,id)),doorIds=native().componentIds(sceneName,'Entrance'),doors=doorIds.map(id=>getView(sceneName,id)),byCatalog=new Map(doors.map(door=>[String(door.id),door]));
  const nextObjects=[],seen=new Set();for(const object of world.objects||[]){
   const canonical=object._generatedSceneEntity&&entity(sceneName,object._sceneEntityId);
   if(object._generatedSceneEntity&&!canonical)continue;
   if(object._generatedBuildingEntity)continue;
   if(object._buildingOwner||object.type==='door'&&(object.building?._generatedBuildingKey||byCatalog.has(String(object.id)))){
    const replacement=byCatalog.get(String(object.id));if(replacement){nextObjects.push(replacement);seen.add(replacement._sceneEntityId);}continue;
   }
   if(canonical?.components.Entrance){seen.add(canonical.id);nextObjects.push(getView(sceneName,canonical.id));continue;}
   nextObjects.push(object);
  }
  for(const door of doors)if(!seen.has(door._sceneEntityId))nextObjects.push(door);
  if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.project(sceneName,nextObjects);else world.objects=nextObjects;world.buildings=Object.freeze(result);
  tables.set(sceneName,{buildings:result,ids:new Set(ids),doorIds:new Set(doorIds)});
  if(typeof currentScene!=='undefined'&&currentScene===sceneName){if(typeof buildings!=='undefined')buildings.splice(0,buildings.length,...result);if(typeof objects!=='undefined'){if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.activate();else objects.splice(0,objects.length,...nextObjects);}}
  if(root.VeldrenStructureScene?.enabled)root.VeldrenStructureScene.refreshSurfaces();
  else if(typeof civilWalkableStructures!=='undefined'){
   const other=civilWalkableStructures.filter(surface=>!surface._buildingOwner&&!oldBuildings.includes(surface.building)&&!before?.buildings.includes(surface.building));
   const added=native().componentIds(sceneName,'WalkSurface').map(id=>getView(sceneName,id));civilWalkableStructures.splice(0,civilWalkableStructures.length,...other,...added);
  }
 }
 function refreshReferences(mapping){
  const replacement=value=>{const ref=mapping.get(value);return ref?getView(ref.scene,ref.id):value;};
  if(typeof civilFloors!=='undefined')for(const floor of civilFloors.values())floor.building=replacement(floor.building);
  if(typeof realmSceneInfo!=='undefined')for(const info of realmSceneInfo.values())if(info.building)info.building=replacement(info.building);
 }
 function invalidate(scene,id){
  const node=entity(scene,id),rootId=node?.components.BuildingPart?.building||node?.components.GeneratedBuilding&&id;
  if(rootId){for(const local of [null,rootId]){const view=views.get(JSON.stringify([scene,rootId,local]));if(view){if(typeof staticMeshes3!=='undefined')staticMeshes3.delete(view);if(typeof staticMeshQueues3!=='undefined')staticMeshQueues3.building.delete(view);root.VeldrenBuildings?.invalidate(view);}}}
  if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof realmNavigation!=='undefined')realmNavigation.clear();
 }
 function onChange(event){
  if(native().isUnderstoryBatch?.(event))return;
  if(event.kind==='load'){assemblyRenders.clear();assemblyProjections.clear();collisionQueries.clear();collisionBuckets.clear();for(const name of tables.keys())project(name);wallMaps.clear();return;}
  for(const store of [assemblyRenders,assemblyProjections,collisionQueries]){const renders=store.get(event.scene);
  if(renders?.size)for(const change of event.kind==='batch'?event.changes:[event]){
   const node=change.id&&entity(event.scene,change.id);
   // Root, module and ancestor writes change the projection. Actor motion and
   // independent scenery writes retain it; the native Scene remains authoritative.
   if(!node){renders.clear();collisionBuckets.delete(event.scene);break;}
   const owner=node.components.BuildingPart?.building||node.components.Entrance?.building;
   for(const [id,cached] of renders)if(id===owner||cached.dependencies.has(change.id)){renders.delete(id);collisionBuckets.delete(event.scene);}
  }
  }
  const table=tables.get(event.scene);if(!table)return;
  for(const change of event.kind==='batch'?event.changes:[event])if(entity(event.scene,change.id)?.components.GeneratedBuilding)collisionBuckets.delete(event.scene);
  if(event.kind==='batch'&&event.changes?.every(change=>{const node=entity(event.scene,change.id);return !table.ids.has(change.id)&&!table.doorIds.has(change.id)&&!node?.components.BuildingPart&&!node?.components.GeneratedBuilding;}))return;
  invalidate(event.scene,event.id);
  const node=event.id&&entity(event.scene,event.id);if(event.kind==='batch'||event.kind==='remove'||event.kind==='upsert'&&(node?.components.GeneratedBuilding||node?.components.Entrance)&&!table.ids.has(event.id)&&!table.doorIds.has(event.id))project(event.scene);
 }
 // Read-only collision projection. A native revision invalidates parent/child
 // transforms, footprint edits, removal and world reload together. Picking must
 // not invert every distant deck's matrix at every step of every camera ray.
 let surfaceRevision=-1,surfaceOwner=null,surfaceQueries=new WeakMap();
 function surfaceQuery(surface){
  const owner=native(),revision=owner.revision();
  if(owner!==surfaceOwner||revision!==surfaceRevision){surfaceOwner=owner;surfaceRevision=revision;surfaceQueries=new WeakMap();}
  if(surfaceQueries.has(surface))return surfaceQueries.get(surface);
  const scene=surface._generatedSceneName,node=entity(scene,surface._sceneEntityId);
  if(!node?.components.WalkSurface){surfaceQueries.set(surface,null);return null;}
  const A=root.VeldrenAssembly,shape=node.components.WalkSurface,m=node.worldMatrix,vertical=Math.hypot(m[4],m[5],m[6]);
  const query={base:m[13],rise:(shape.rise||0)*vertical,minx:Infinity,minz:Infinity,maxx:-Infinity,maxz:-Infinity,ramp:null,decks:[],line:null};
  const include=(x,z)=>{query.minx=Math.min(query.minx,x);query.maxx=Math.max(query.maxx,x);query.minz=Math.min(query.minz,z);query.maxz=Math.max(query.maxz,z);};
  const rect=id=>{
   const child=entity(scene,id),size=child?.components.Footprint;if(!size)return null;
   const inverse=A.inverse(matrices.row(child.worldMatrix)),y=child.worldMatrix[13],u=inverse[1]*y+inverse[3],v=inverse[9]*y+inverse[11],det=inverse[0]*inverse[10]-inverse[2]*inverse[8];
   // Match surfaceAt's horizontal world-plane test even under pitched/scaled
   // ancestors. A degenerate projection remains on the exact-query fallback.
   if(Math.abs(det)<1e-10){query.minx=query.minz=-Infinity;query.maxx=query.maxz=Infinity;}
   else for(const x of [0,size.w])for(const z of [0,size.h])include((inverse[10]*(x-u)-inverse[2]*(z-v))/det,(inverse[0]*(z-v)-inverse[8]*(x-u))/det);
   return {inverse,y,w:size.w,h:size.h};
  };
  if(shape.rampLine){
   const line=shape.rampLine,a=entity(scene,line.start),b=entity(scene,line.end);
   if(a&&b){const ax=a.worldMatrix[12],az=a.worldMatrix[14],dx=b.worldMatrix[12]-ax,dz=b.worldMatrix[14]-az,len=Math.hypot(dx,dz),radius=(line.width||0)*vertical/2;
    if(len>=.001){query.line={ax,az,dx,dz,len,radius};include(Math.min(ax,ax+dx)-radius,Math.min(az,az+dz)-radius);include(Math.max(ax,ax+dx)+radius,Math.max(az,az+dz)+radius);}
   }
  }
  if(shape.ramp)query.ramp=rect(shape.ramp);
  for(const id of shape.decks||[]){const deck=rect(id);if(deck)query.decks.push(deck);}
  surfaceQueries.set(surface,query);return query;
 }
 // Buckets contain references to canonical surfaces, in original priority
 // order. No alternate geometry or scene ownership is introduced.
 let surfaceIndex=null;const noSurfaces=Object.freeze([]);
 function surfaceCandidates(surfaces,x,z){
  const owner=native(),revision=owner.revision();
  if(surfaceIndex?.owner!==owner||surfaceIndex.revision!==revision||surfaceIndex.surfaces!==surfaces||surfaceIndex.length!==surfaces.length){
   const buckets=new Map();let fallback=false;
   for(const surface of surfaces){
    if(!surface._sceneEntityId){fallback=true;break;}
    const q=surfaceQuery(surface);if(!q)continue;
    const x0=Math.floor((q.minx-1e-7)/16),x1=Math.floor((q.maxx+1e-7)/16),z0=Math.floor((q.minz-1e-7)/16),z1=Math.floor((q.maxz+1e-7)/16);
    if(!Number.isFinite(x0+x1+z0+z1)||(x1-x0+1)*(z1-z0+1)>256){fallback=true;break;}
    for(let bz=z0;bz<=z1;bz++)for(let bx=x0;bx<=x1;bx++){const key=bx+':'+bz;let values=buckets.get(key);if(!values)buckets.set(key,values=[]);values.push(surface);}
   }
   surfaceIndex={owner,revision,surfaces,length:surfaces.length,buckets,fallback};
  }
  return surfaceIndex.fallback?surfaces:surfaceIndex.buckets.get(Math.floor(x/16)+':'+Math.floor(z/16))||noSurfaces;
 }
 function surfaceRectZ(rect,x,z){
  const m=rect.inverse,u=m[0]*x+m[1]*rect.y+m[2]*z+m[3],v=m[8]*x+m[9]*rect.y+m[10]*z+m[11];
  return u>=0&&u<rect.w&&v>=0&&v<rect.h?v:null;
 }
 function surfaceAt(surface,x,z){
  const q=surfaceQuery(surface);
  if(!q||x<q.minx-1e-7||x>q.maxx+1e-7||z<q.minz-1e-7||z>q.maxz+1e-7)return null;
  if(q.line){const l=q.line,rx=x-l.ax,rz=z-l.az,t=(rx*l.dx+rz*l.dz)/(l.len*l.len),cross=Math.abs(rx*l.dz-rz*l.dx)/l.len;if(t>=0&&t<=1&&cross<=l.radius)return {height:q.base+q.rise*t,kind:'ramp',structure:surface};}
  const ramp=q.ramp?surfaceRectZ(q.ramp,x,z):null;
  if(ramp!==null)return {height:q.base+q.rise*Math.max(0,Math.min(1,(q.ramp.h-ramp)/(q.ramp.h-1))),kind:'ramp',structure:surface};
  for(const deck of q.decks)if(surfaceRectZ(deck,x,z)!==null)return {height:q.base+q.rise,kind:'rampart',structure:surface};
  return null;
 }
 function collisionQuery(b){
  const scene=b._generatedSceneName,id=b._sceneEntityId;let values=collisionQueries.get(scene);
  if(!values)collisionQueries.set(scene,values=new Map());const cached=values.get(id);if(cached)return cached.value;
  const node=entity(scene,id),A=root.VeldrenAssembly,matrix=matrices.row(node.worldMatrix),inverse=A.inverse(matrix),dependencies=new Set([id]);
  const track=node=>{while(node&&!dependencies.has(node.id)){dependencies.add(node.id);node=entity(scene,node.parent);}};track(entity(scene,node.parent));
  const footprint=node.components.BuildingFootprint,pad=2+(node.components.BuildingAccess?.civilGateHalfWidth||0);
  let minX=-pad,minZ=-pad,maxX=number(footprint?.w,1)+pad,maxZ=number(footprint?.h,1)+pad;
  // Legacy wall tiles and entrances can extend past a building's nominal
  // rectangle. Include their actual native positions before rejecting a ray.
  for(const partId of [...(node.components.BuildingLayout?.walls||[]),node.components.BuildingAccess?.entrance].filter(Boolean)){
   const part=entity(scene,partId);if(!part)continue;track(part);
   const p=A.point(inverse,[part.worldMatrix[12],part.worldMatrix[13],part.worldMatrix[14]]);
   minX=Math.min(minX,p[0]-pad);maxX=Math.max(maxX,p[0]+pad);minZ=Math.min(minZ,p[2]-pad);maxZ=Math.max(maxZ,p[2]+pad);
  }
  const value={matrix,inverse,minX,minZ,maxX,maxZ,logical:getView(scene,id,id)};values.set(id,{value,dependencies});return value;
 }
 function sightBlockedAt(x,z){
  const scene=String(currentScene),members=registry()[scene]?.buildings;
  if(!tables.has(scene))return buildings.some(b=>inBuilding(b,x,z));
  let index=collisionBuckets.get(scene);
  if(index?.members!==members){
   const buckets=new Map(),fallback=[];
   for(const b of members||[]){
    if(!b._generatedBuildingEntity){fallback.push(b);continue;}
    let bounds=b.assembly&&root.VeldrenBuildings.collisionBounds(b);
    if(!bounds){
     const q=collisionQuery(b),m=q.inverse,det=m[0]*m[10]-m[2]*m[8];
     if(Math.abs(det)<1e-8){fallback.push(b);continue;}
     const ox=m[3]+m[1]*q.matrix[7],oz=m[11]+m[9]*q.matrix[7];bounds={minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity};
     for(const px of [q.minX,q.maxX+1])for(const pz of [q.minZ,q.maxZ+1]){
      const dx=px-ox,dz=pz-oz,wx=(m[10]*dx-m[2]*dz)/det-.5,wz=(m[0]*dz-m[8]*dx)/det-.5;
      bounds.minX=Math.min(bounds.minX,wx);bounds.maxX=Math.max(bounds.maxX,wx);bounds.minZ=Math.min(bounds.minZ,wz);bounds.maxZ=Math.max(bounds.maxZ,wz);
     }
    }
    if(bounds.minX>bounds.maxX||bounds.minZ>bounds.maxZ)continue;
    const minX=Math.floor((bounds.minX-1e-7)/16),maxX=Math.floor((bounds.maxX+1e-7)/16),minZ=Math.floor((bounds.minZ-1e-7)/16),maxZ=Math.floor((bounds.maxZ+1e-7)/16);
    if(![minX,maxX,minZ,maxZ].every(Number.isFinite)||(maxX-minX+1)*(maxZ-minZ+1)>4096){fallback.push(b);continue;}
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){const key=x+':'+z;let bucket=buckets.get(key);if(!bucket)buckets.set(key,bucket=[]);bucket.push(b);}
   }
   index={members,buckets,fallback};collisionBuckets.set(scene,index);
  }
  for(const b of index.buckets.get(Math.floor(x/16)+':'+Math.floor(z/16))||[])if(inBuilding(b,x,z))return true;
  for(const b of index.fallback)if(inBuilding(b,x,z))return true;return false;
 }
 function installConsumers(){
  if(installed)return;installed=true;const A=root.VeldrenAssembly;
  buildingRender=building3;building3=function(r,b){if(!b._generatedBuildingEntity)return buildingRender(r,b);const world=matrices.row(entity(b._generatedSceneName,b._sceneEntityId).worldMatrix),model=A.multiply(world,A.transform(-world[3],0,-world[11])),logical=getView(b._generatedSceneName,b._sceneEntityId,b._sceneEntityId);
   logical._cutaway=b._cutaway;const q={software:r.software,face(points,color,normals,material,colors,uvs){const basis=model.slice();basis[3]=basis[7]=basis[11]=0;r.face(points.map(p=>A.point(model,p)),color,normals?.map(p=>A.point(basis,p)),material,colors,uvs);}};
   if(r.indexed)q.indexed=(mesh,matrix,style)=>r.indexed(mesh,A.multiply(model,matrix),style);
   return buildingRender(q,logical);
  };
  const previousIn=inBuilding;inBuilding=function(b,x,y){if(!b._generatedBuildingEntity)return previousIn(b,x,y);if(b.assembly)return previousIn(b,x,y);
   const q=collisionQuery(b),m=q.matrix,p=A.point(q.inverse,[x+.5,m[7],y+.5]),tx=Math.floor(p[0]+1e-7),ty=Math.floor(p[2]+1e-7);
   if(tx<q.minX||tx>q.maxX||ty<q.minZ||ty>q.maxZ)return false;
   return previousIn(q.logical,tx+m[3],ty+m[11]);};
  const previousWithin=withinWalkIn;withinWalkIn=function(b,x,y){if(!b._generatedBuildingEntity||b.assembly)return previousWithin(b,x,y);const m=matrices.row(entity(b._generatedSceneName,b._sceneEntityId).worldMatrix),p=A.point(A.inverse(m),[x,m[7],y]);return p[0]>=0&&p[0]<b.w&&p[2]>=0&&p[2]<b.h;};
  const previousNormal=doorNormal;doorNormal=function(o){if(!o?._buildingOwner)return previousNormal(o);const portal=entity(o._generatedSceneName,o._sceneEntityId),module=portal.parent&&entity(o._generatedSceneName,portal.parent);if(module?.components.DoorOpening?.normalLocal){const basis=matrices.row(module.worldMatrix);basis[3]=basis[7]=basis[11]=0;const n=A.point(basis,module.components.DoorOpening.normalLocal),length=Math.hypot(n[0],n[2]);return [n[0]/length,n[2]/length];}const b=o.building,m=matrices.row(entity(o._generatedSceneName,b._sceneEntityId).worldMatrix),n=previousNormal(getView(o._generatedSceneName,o._sceneEntityId,b._sceneEntityId)),dx=m[0]*n[0]+m[2]*n[1],dz=m[8]*n[0]+m[10]*n[1],length=Math.hypot(dx,dz);return [dx/length,dz/length];};
  const previousDoor=buildingDoorTransform;buildingDoorTransform=function(b){if(!b._generatedBuildingEntity)return previousDoor(b);const portal=b.service&&entity(b._generatedSceneName,b.service._sceneEntityId),module=portal?.parent&&entity(b._generatedSceneName,portal.parent);if(module?.components.DoorOpening)return A.multiply(matrices.row(module.worldMatrix),A.transform(0,0,0,-doorOpenFraction(b.service)*Math.PI*.52));const m=matrices.row(entity(b._generatedSceneName,b._sceneEntityId).worldMatrix);return A.multiply(A.multiply(m,A.transform(-m[3],0,-m[11])),previousDoor(getView(b._generatedSceneName,b._sceneEntityId,b._sceneEntityId)));};
 }
 async function migrate(){
  const result=populate(native().serialize(),registry());
  if(!native().load(result.document))throw Error('Native Scene rejected building hierarchy');
  hydrate(result);return result.counts;
 }
 function hydrate(result=null){
  if(!result){
   const bindings=new Map(),sourceReferences=new WeakMap();
   for(const [scene,w]of Object.entries(registry())){
    const rows=[];for(const b of w.buildings||[]){const id=b._generatedBuildingId;if(!id||!entity(scene,id))continue;rows.push({source:b,id});sourceReferences.set(b,{scene,id});}bindings.set(scene,rows);
   }
   result={bindings,sourceReferences};
  }
  for(const name of result.bindings.keys())project(name);
  for(const [name,bindings]of result.bindings)for(const binding of bindings)if(binding.source.assembly&&!entity(name,binding.id)?.components.ModularBuilding)setAssembly(name,binding.id,binding.source.assembly,binding.source);
  refreshReferences(result.sourceReferences);installConsumers();
  if(!subscribed){native().subscribe(onChange);subscribed=true;}
  // Cook the rebuilt settlement through the existing native modular assembly
  // path. Its individual bounds, doors and geometry then participate in native
  // visibility and camera obstruction before the first rendered frame.
  for(const b of [...(registry().overworld?.buildings||[])])if(b.briarDesign&&!b.assembly&&!b.editorCreated)ensureAssembly(b);
  return {loaded:true};
 }
 function createBuilding(scene,input){
  const id=String(input.id);if(!id||entity(scene,id))throw Error('Duplicate authored building ID');
  const rootId='generated:'+scene+':root';
  if(!entity(scene,rootId))native().upsert(scene,{id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{buildingsComplete:true}},metadata:{}});
  const node={id,name:input.name||'Modular building',parent:rootId,active:true,transform:{...identity(),position:[number(input.x),0,number(input.y)]},components:{GeneratedBuilding:{generationKey:'authored:'+id,version:1},BuildingFootprint:{w:1,h:1},BuildingAppearance:{archetype:'modular',race:input.race||'human'},BuildingLayout:{rooms:[],upperRooms:[],walls:[]},ModularBuilding:{version:1,modules:[]},MeshRenderer:{asset:'procedural:building',visible:true}},metadata:{editorCreated:true}};
  if(!native().upsert(scene,node))throw Error('Native Scene rejected new building');project(scene);return getView(scene,id);
 }
 // Modular authoring is wired below; assemblies are Scene projections too.
  const moduleViews=new Map(),assemblyViews=new Map();
 const affineTransform=m=>({...identity(),position:[m[3],m[7],m[11]],affine:matrices.column(m)});
 function mutableValue(read,write,path=[]){
  const at=()=>path.reduce((value,key)=>value?.[key],read()),value=at();if(!value||typeof value!=='object')return value;
  const update=(fn)=>{const draft=copy(read());let node=draft;for(const key of path)node=node[key];fn(node);write(draft);};
  return new Proxy(Array.isArray(value)?[]:{},{
   get(_target,key){const item=at();if(Array.isArray(item)&&['push','pop','shift','unshift','splice','sort','reverse','fill','copyWithin'].includes(key))return (...args)=>{let result;update(node=>{result=Array.prototype[key].apply(node,args);});return result;};if(key===Symbol.iterator&&Array.isArray(item))return function*(){for(let i=0;i<at().length;i++)yield mutableValue(read,write,path.concat(i));};const next=item?.[key];return next&&typeof next==='object'?mutableValue(read,write,path.concat(key)):next;},
   set(_target,key,value){update(node=>{node[key]=value;});return true;},deleteProperty(_target,key){update(node=>{delete node[key];});return true;},
   ownKeys(){return Reflect.ownKeys(at());},has(_target,key){return key in at();},getOwnPropertyDescriptor(_target,key){if(Array.isArray(at())&&key==='length')return {value:at().length,writable:true,enumerable:false,configurable:false};return Object.hasOwn(at(),key)?{enumerable:true,configurable:true}:undefined;}
  });
 }
 function moduleData(scene,id,building){
  const node=entity(scene,id),module=node.components.BuildingModule,A=root.VeldrenAssembly,relative=A.multiply(A.inverse(matrices.row(entity(scene,building).worldMatrix)),matrices.row(node.worldMatrix));
  const result={...copy(module),id:module.key,local:relative,model:node.components.MeshRenderer.asset,bounds:copy(node.components.MeshBounds.bounds)};delete result.key;
  if(node.components.DoorOpening){const opening=node.components.DoorOpening,portal=entity(scene,opening.portal),m=portal&&A.multiply(A.inverse(matrices.row(entity(scene,building).worldMatrix)),matrices.row(portal.worldMatrix));const basis=relative.slice();basis[3]=basis[7]=basis[11]=0;result.opening={service:m?[m[3],m[7],m[11]]:opening.offset,normal:opening.normalLocal?A.point(basis,opening.normalLocal):copy(opening.normal),width:opening.width};}
  if(node.components.StairConnection)result.stairs={...copy(node.components.StairConnection),origin:[relative[3],relative[7],relative[11]]};
  return result;
 }
 function writeModule(scene,id,building,data){
  const before=moduleData(scene,id,building),node=copy(entity(scene,id)),A=root.VeldrenAssembly;delete node.worldMatrix;delete node.activeInHierarchy;
  node.components.BuildingModule={key:data.id,...pick(data,['role','floor','host','objectId','destination','originalModel','cutaway','name'])};
  if(node.components.MeshRenderer.asset!==data.model){delete node.components.MeshGeometry;delete node.components.MeshVariant;}
  node.components.MeshRenderer={...node.components.MeshRenderer,asset:data.model};node.components.MeshBounds={bounds:copy(data.bounds)};
  if(data.stairs){node.components.StairConnection=copy(data.stairs);delete node.components.StairConnection.origin;}else delete node.components.StairConnection;
  if(data.host){const host=present(scene,entity(scene,building).components.ModularBuilding?.modules).find(key=>entity(scene,key)?.components.BuildingModule?.key===data.host);if(host&&host!==id)node.parent=host;}
  if(node.parent===building)node.transform=affineTransform(data.local);
  else{const world=A.multiply(matrices.row(entity(scene,building).worldMatrix),data.local),local=A.multiply(A.inverse(matrices.row(entity(scene,node.parent).worldMatrix)),world);node.transform=affineTransform(local);}
  if(!native().upsert(scene,node))throw Error('Invalid Scene building module '+id);
  const opening=node.components.DoorOpening;
  if(data.opening&&opening){const portal=copy(entity(scene,opening.portal));if(portal&&JSON.stringify(data.opening.service)!==JSON.stringify(before.opening?.service)){const m=A.multiply(A.inverse(data.local),A.transform(...data.opening.service));portal.transform=affineTransform(m);if(!native().upsert(scene,portal))throw Error('Invalid module portal');}node.components.DoorOpening={...opening,width:data.opening.width};if(JSON.stringify(data.opening.normal)!==JSON.stringify(before.opening?.normal)){const basis=data.local.slice();basis[3]=basis[7]=basis[11]=0;node.components.DoorOpening.normalLocal=A.point(A.inverse(basis),data.opening.normal);}native().upsert(scene,node);}
 }
 function moduleView(scene,id,building){
  const key=JSON.stringify([scene,id]);if(moduleViews.has(key))return moduleViews.get(key);
  const view=mutableValue(()=>moduleData(scene,id,building),value=>native().batch(()=>writeModule(scene,id,building,value)));moduleViews.set(key,view);return view;
 }
 function assemblySnapshot(b){
  const scene=b._generatedSceneName,id=b._sceneEntityId,node=entity(scene,id),definition=node?.components.ModularBuilding;
  if(!definition)return undefined;
  const cacheable=String(root.VELDREN_CONTEXT||'').toLowerCase()!=='editor';let values=assemblyProjections.get(scene);
  if(cacheable){if(!values)assemblyProjections.set(scene,values=new Map());const cached=values.get(id);if(cached)return cached.value;}
  const dependencies=new Set([id]),modules=[];
  const track=node=>{while(node&&!dependencies.has(node.id)){dependencies.add(node.id);node=entity(scene,node.parent);}};
  track(entity(scene,node.parent));
  for(const moduleId of present(scene,definition.modules)){const part=entity(scene,moduleId);track(part);if(part.components.DoorOpening?.portal)track(entity(scene,part.components.DoorOpening.portal));modules.push(moduleData(scene,moduleId,id));}
  const value={version:1,buildingId:id,parent:matrices.row(node.worldMatrix),layout:[],modules};
  // This is an immutable read projection, never another owner of Scene data.
  const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};freeze(value);
  if(cacheable)values.set(id,{value,dependencies});return value;
 }
 function assemblyView(scene,building){
  const key=JSON.stringify([scene,building]);if(assemblyViews.has(key))return assemblyViews.get(key);
  const read=()=>{const node=entity(scene,building),definition=node.components.ModularBuilding;return {version:1,buildingId:building,parent:matrices.row(node.worldMatrix),layout:[],modules:present(scene,definition.modules).map(id=>moduleData(scene,id,building))};};
  const view=new Proxy({}, {
   get(_target,field){if(field==='modules')return new Proxy([],{
     get(_target,key){const ids=present(scene,entity(scene,building).components.ModularBuilding.modules);if(key==='length')return ids.length;if(key===Symbol.iterator)return function*(){for(const id of ids)yield moduleView(scene,id,building);};if(typeof key==='string'&&/^\d+$/.test(key))return ids[key]?moduleView(scene,ids[key],building):undefined;if(['push','pop','shift','unshift','splice','sort','reverse'].includes(key))return (...args)=>{const draft=read(),result=Array.prototype[key].apply(draft.modules,args);setAssembly(scene,building,draft);return result;};return Array.prototype[key];},
     set(_target,key,value){const draft=read();draft.modules[key]=value;setAssembly(scene,building,draft);return true;},
     ownKeys(){return [...entity(scene,building).components.ModularBuilding.modules.keys()].map(String).concat('length');},
     has(_target,key){return key==='length'||/^\d+$/.test(String(key))&&Number(key)<entity(scene,building).components.ModularBuilding.modules.length;},
     getOwnPropertyDescriptor(_target,key){return key==='length'?{value:entity(scene,building).components.ModularBuilding.modules.length,writable:true,enumerable:false,configurable:false}:{enumerable:true,configurable:true};}
    });
    if(field==='parent')return mutableValue(()=>matrices.row(entity(scene,building).worldMatrix),value=>{if(!native().setWorldTransform(scene,building,affineTransform(value)))throw Error('Invalid building transform');});return read()[field];},
   set(_target,field,value){if(field==='parent'){if(!native().setWorldTransform(scene,building,affineTransform(value)))throw Error('Invalid building transform');}else setAssembly(scene,building,{...read(),[field]:value});return true;},ownKeys:()=>['version','buildingId','parent','modules','layout'],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})
  });assemblyViews.set(key,view);return view;
 }
 function setAssembly(scene,building,input,source=null){
  input=globalThis.VeldrenBuildings?.repairLegacyAssembly?.(getView(scene,building),input)||input;
  const A=root.VeldrenAssembly,a=A.serialize(input),b=getView(scene,building),previous=entity(scene,building).components.ModularBuilding,byKey=new Map(present(scene,previous?.modules).map(id=>[entity(scene,id).components.BuildingModule.key,id])),cache=source&&root.VeldrenBuildings.cache.get(source);
  // A temporary edit transaction is validated before it changes native nodes.
  const repeats=new Map(),modules=a.modules.map(m=>{const signature=JSON.stringify([m.id.startsWith('part-editor-')?m.id:null,m.model,m.role,m.local,m.objectId||null]),ordinal=repeats.get(signature)||0;repeats.set(signature,ordinal+1);return {data:m,id:byKey.get(m.id)||building+':module:'+root.VeldrenSceneOwnership.stableHash(signature+':identical-copy:'+ordinal)};});
  const nodes=modules.map(({data:m,id})=>{
   const existing=entity(scene,id);if(existing)return null;
   const node={id,parent:building,name:m.name||m.model,active:true,transform:affineTransform(m.local),components:{BuildingPart:{building,role:'module'},BuildingModule:{key:m.id},MeshRenderer:{asset:m.model,visible:true},MeshBounds:{bounds:copy(m.bounds)}},metadata:{}};
   if(['wall','window'].includes(m.role))node.components.Collider={shape:'mesh-bounds',solid:true};
   const captured=cache?.full[m.baseline]?.mesh;
   if(m.model==='captured:faces'){if(!cache?.faces.length)throw Error('Missing captured building faces');node.components.MeshGeometry={faces:copy(cache.faces)};}
   else if(m.model.startsWith('captured:')){if(!captured)throw Error('Missing generated module geometry');node.components.MeshGeometry={mesh:copy(captured)};}
   else if(!m.model.startsWith('linked:')){const model=root.VeldrenBuildings.model(m.model);if(!model)throw Error('Missing building asset '+m.model);if(captured){const variant={};for(const key of Object.keys(captured))if(captured[key]!==model[key]&&JSON.stringify(captured[key])!==JSON.stringify(model[key]))variant[key]=copy(captured[key]);if(Object.keys(variant).length)node.components.MeshVariant=variant;}}
   return node;
  });
  native().batch(()=>{
   if(!native().setWorldTransform(scene,building,affineTransform(a.parent)))throw Error('Invalid building parent transform');
   for(const node of nodes)if(node&&!native().upsert(scene,node))throw Error('Cannot create building module');
   for(const {id,data}of modules){
    const node=copy(entity(scene,id));
    const linked=data.objectId&&(registry()[scene].objects||[]).find(o=>String(o.id)===data.objectId||String(o._generatedLegacyId)===data.objectId);
    const target=linked?._sceneEntityId;
    if(target&&target!==id){
     const child=copy(entity(scene,target));if(child&&child.parent!==id){const relative=A.multiply(A.inverse(matrices.row(entity(scene,id).worldMatrix)),matrices.row(child.worldMatrix));child.parent=id;child.transform=affineTransform(relative);native().upsert(scene,child);}
     node.components.ObjectLink={entity:target};
     if(data.opening&&!node.components.DoorOpening){const basis=data.local.slice();basis[3]=basis[7]=basis[11]=0;node.components.DoorOpening={portal:target,normalLocal:A.point(A.inverse(basis),data.opening.normal),width:data.opening.width};}
    }
    if(data.stairs?.rampPath){let ramp=b;for(const key of data.stairs.rampPath)ramp=ramp?.[key];if(ramp?._sceneEntityId){const child=copy(entity(scene,ramp._sceneEntityId));if(child.parent!==id){child.transform=affineTransform(A.multiply(A.inverse(matrices.row(entity(scene,id).worldMatrix)),matrices.row(child.worldMatrix)));child.parent=id;native().upsert(scene,child);}}}
    native().upsert(scene,node);writeModule(scene,id,building,data);
   }
   const rootNode=copy(entity(scene,building));rootNode.components.ModularBuilding={version:1,modules:modules.map(m=>m.id)};
   if(!native().upsert(scene,rootNode))throw Error('Cannot save modular building');
   for(const id of previous?.modules||[])if(!modules.some(m=>m.id===id))native().remove(scene,id);
  });
  return assemblyView(scene,building);
 }
 function ensureAssembly(b){
  const scene=b._generatedSceneName,id=b._sceneEntityId;if(entity(scene,id).components.ModularBuilding)return assemblyView(scene,id);
  const logical=getView(scene,id,id),draft={...logical,_generatedBuildingEntity:false,editorTransform:{rotation:0,scale:1},assembly:undefined};
  const linked=(registry()[scene].objects||[]).filter(o=>o===b.service||b.service?.destination&&[o.interiorBuilding,o.civilCourtyard].includes(b.service.destination)).map(o=>o._sceneEntityId?(getView(scene,o._sceneEntityId,id)||o):o);
  const a=root.VeldrenBuildings.ensure(draft,{objects:linked});a.parent=matrices.row(entity(scene,id).worldMatrix);
  setAssembly(scene,id,a,draft);root.VeldrenBuildings.cache.delete(draft);return assemblyView(scene,id);
 }
 function renderAssembly(b){
  const scene=b._generatedSceneName,id=b._sceneEntityId,filter=root.VeldrenBuildings.floorFilter;
  // The editor reads fresh projections for its visibility and floor tools.
  // Runtime projections survive unrelated actor revisions and allocate only
  // when their native hierarchy or occupied cutaway changes.
  const cacheable=String(root.VELDREN_CONTEXT||'').toLowerCase()!=='editor'&&!filter,cutaway=!!b._cutaway,cutawayLevel=typeof buildingCutawayLevel3==='function'?buildingCutawayLevel3(b):0;
  let renders=assemblyRenders.get(scene);
  if(cacheable){if(!renders)assemblyRenders.set(scene,renders=new Map());const cached=renders.get(id);if(cached?.cutaway===cutaway&&cached.cutawayLevel===cutawayLevel)return cached.value;}
  const rootNode=entity(scene,id),definition=rootNode.components.ModularBuilding,instances=[],faces=[],A=root.VeldrenAssembly,dependencies=new Set([id,...definition.modules]);
  const ancestors=node=>{let parent=node.parent;while(parent&&!dependencies.has(parent)){dependencies.add(parent);parent=entity(scene,parent)?.parent;}};
  ancestors(rootNode);
  for(const moduleId of present(scene,definition.modules)){
   const node=entity(scene,moduleId);ancestors(node);if(!node.activeInHierarchy||node.components.MeshRenderer?.visible===false||root.VeldrenEditorSelection?.hidden(moduleId))continue;const m=moduleData(scene,moduleId,id);if(m.role==='interior'||m.role==='entrance'&&m.objectId)continue;
   if(b._cutaway&&(m.role==='roof'||m.floor>cutawayLevel))continue;
   if(filter?.building===b&&filter.isolate&&(filter.floor==='roof'?m.role!=='roof':m.floor!==filter.floor&&!(filter.below&&m.floor<filter.floor)))continue;
   if(node.components.MeshGeometry?.faces){for(const face of node.components.MeshGeometry.faces)faces.push({...face,points:face.points.map(p=>A.point(m.local,p))});continue;}
   const asset=node.components.MeshGeometry?.mesh||root.VeldrenBuildings.model(m.model),mesh=node.components.MeshVariant?{...asset,...node.components.MeshVariant}:asset;if(mesh)instances.push({mesh,matrix:m.local,entityId:moduleId});
  }
  const value={instances,faces,height:b.visualHeight||4,kind:'assembly',model:matrices.row(entity(scene,id).worldMatrix)};
  if(cacheable)renders.set(id,{cutaway,cutawayLevel,value,dependencies});return value;
 }
 root.VeldrenAssets?.onReload(()=>assemblyRenders.clear());
 root.VeldrenAssets?.onDispose(()=>assemblyRenders.clear());


 root.VeldrenBuildingScene={capture,populate,migrate,hydrate,fieldGroups,matrices,getView,surfaceAt,surfaceCandidates,sightBlockedAt,createBuilding,ensureAssembly,assemblySnapshot,renderAssembly,setAssembly};
})(globalThis);
