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
  BuildingFootprint:['w','h'],BuildingAppearance:['race','archetype','variant','visualHeight'],
  SettlementMember:['settlement','kingdom','district','planned','quarry'],
  BuildingAccess:['walkIn','usableUpper','doorFacing','planFacing','civilGateHalfWidth'],
  QuestMarker:['questBeacon']
 };
 function capture(registry){
  const hash=root.VeldrenSceneOwnership.stableHash,repeats=new Map();let count=0;
  for(const [scene,world]of Object.entries(registry))for(const building of world.buildings||[]){
   if(building._generatedBuildingKey)continue;
   const signature=JSON.stringify([scene,building.name,building.settlement||'',building.archetype||'',building.x,building.y,building.w,building.h,building.service?.destination||'']);
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
    const entities=[],occurrences=new Map();
    const child=(role,source,parent=id,at=null)=>{
     const position=at||[number(source.x)-number(b.x),0,number(source.y)-number(b.y)];
     const signature=JSON.stringify([parent,role,source.name||'',position,source.w??null,source.h??null]),ordinal=occurrences.get(signature)||0;occurrences.set(signature,ordinal+1);
     const entity={id:id+':'+role+':'+hash(signature+':'+ordinal),name:source.name||role,parent,active:true,transform:{...identity(),position},components:{BuildingPart:{building:id,role}},metadata:{}};
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
 const views=new Map(),tables=new Map();let subscribed=false,installed=false,buildingRender=null;
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
  world.objects=nextObjects;world.buildings=Object.freeze(result);
  tables.set(sceneName,{buildings:result,ids:new Set(ids),doorIds:new Set(doorIds)});
  if(typeof currentScene!=='undefined'&&currentScene===sceneName){if(typeof buildings!=='undefined')buildings.splice(0,buildings.length,...result);if(typeof objects!=='undefined')objects.splice(0,objects.length,...nextObjects);}
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
  if(event.kind==='load'){for(const name of tables.keys())project(name);wallMaps.clear();return;}
  const table=tables.get(event.scene);if(!table)return;
  if(event.kind==='batch'&&event.changes?.every(change=>{const node=entity(event.scene,change.id);return !table.ids.has(change.id)&&!table.doorIds.has(change.id)&&!node?.components.BuildingPart&&!node?.components.GeneratedBuilding;}))return;
  invalidate(event.scene,event.id);
  const node=event.id&&entity(event.scene,event.id);if(event.kind==='batch'||event.kind==='remove'||event.kind==='upsert'&&(node?.components.GeneratedBuilding||node?.components.Entrance)&&!table.ids.has(event.id)&&!table.doorIds.has(event.id))project(event.scene);
 }
 function surfaceAt(surface,x,z){
  const scene=surface._generatedSceneName,id=surface._sceneEntityId,node=entity(scene,id);if(!node)return null;
  const A=root.VeldrenAssembly,shape=node.components.WalkSurface,base=node.worldMatrix[13],vertical=Math.hypot(...node.worldMatrix.slice(4,7)),rise=(shape.rise||0)*vertical;
  const inside=part=>{const child=entity(scene,part);if(!child)return null;const p=A.point(A.inverse(matrices.row(child.worldMatrix)),[x,child.worldMatrix[13],z]),size=child.components.Footprint;return p[0]>=0&&p[0]<size.w&&p[2]>=0&&p[2]<size.h?{p,size}:null;};
  const lineAt=line=>{const a=entity(scene,line.start),b=entity(scene,line.end);if(!a||!b)return null;const ax=a.worldMatrix[12],az=a.worldMatrix[14],dx=b.worldMatrix[12]-ax,dz=b.worldMatrix[14]-az,len=Math.hypot(dx,dz);if(len<.001)return null;const rx=x-ax,rz=z-az,t=(rx*dx+rz*dz)/(len*len),cross=Math.abs(rx*dz-rz*dx)/len;return t>=0&&t<=1&&cross<=(line.width||0)*vertical/2?t:null;};
  if(shape.rampLine){const t=lineAt(shape.rampLine);if(t!==null)return {height:base+rise*t,kind:'ramp',structure:surface};}
  const ramp=shape.ramp&&inside(shape.ramp);if(ramp)return {height:base+rise*Math.max(0,Math.min(1,(ramp.size.h-ramp.p[2])/(ramp.size.h-1))),kind:'ramp',structure:surface};
  if((shape.decks||[]).some(inside))return {height:base+rise,kind:'rampart',structure:surface};return null;
 }
 function installConsumers(){
  if(installed)return;installed=true;const A=root.VeldrenAssembly;
  buildingRender=building3;building3=function(r,b){if(!b._generatedBuildingEntity)return buildingRender(r,b);const world=matrices.row(entity(b._generatedSceneName,b._sceneEntityId).worldMatrix),model=A.multiply(world,A.transform(-world[3],0,-world[11])),logical=getView(b._generatedSceneName,b._sceneEntityId,b._sceneEntityId);
   logical._cutaway=b._cutaway;const q={software:r.software,face(points,color,normals,material,colors,uvs){const basis=model.slice();basis[3]=basis[7]=basis[11]=0;r.face(points.map(p=>A.point(model,p)),color,normals?.map(p=>A.point(basis,p)),material,colors,uvs);}};
   if(r.indexed)q.indexed=(mesh,matrix,style)=>r.indexed(mesh,A.multiply(model,matrix),style);
   return buildingRender(q,logical);
  };
  const previousIn=inBuilding;inBuilding=function(b,x,y){if(!b._generatedBuildingEntity)return previousIn(b,x,y);if(b.assembly)return previousIn(b,x,y);const m=matrices.row(entity(b._generatedSceneName,b._sceneEntityId).worldMatrix),p=A.point(A.inverse(m),[x+.5,m[7],y+.5]),logical=getView(b._generatedSceneName,b._sceneEntityId,b._sceneEntityId);return previousIn(logical,Math.floor(p[0]+1e-7)+m[3],Math.floor(p[2]+1e-7)+m[11]);};
  const previousWithin=withinWalkIn;withinWalkIn=function(b,x,y){if(!b._generatedBuildingEntity)return previousWithin(b,x,y);const m=matrices.row(entity(b._generatedSceneName,b._sceneEntityId).worldMatrix),p=A.point(A.inverse(m),[x,m[7],y]);return p[0]>=0&&p[0]<b.w&&p[2]>=0&&p[2]<b.h;};
  const previousNormal=doorNormal;doorNormal=function(o){if(!o?._buildingOwner)return previousNormal(o);const portal=entity(o._generatedSceneName,o._sceneEntityId),module=portal.parent&&entity(o._generatedSceneName,portal.parent);if(module?.components.DoorOpening?.normalLocal){const basis=matrices.row(module.worldMatrix);basis[3]=basis[7]=basis[11]=0;const n=A.point(basis,module.components.DoorOpening.normalLocal),length=Math.hypot(n[0],n[2]);return [n[0]/length,n[2]/length];}const b=o.building,m=matrices.row(entity(o._generatedSceneName,b._sceneEntityId).worldMatrix),n=previousNormal(getView(o._generatedSceneName,o._sceneEntityId,b._sceneEntityId)),dx=m[0]*n[0]+m[2]*n[1],dz=m[8]*n[0]+m[10]*n[1],length=Math.hypot(dx,dz);return [dx/length,dz/length];};
  const previousDoor=buildingDoorTransform;buildingDoorTransform=function(b){if(!b._generatedBuildingEntity)return previousDoor(b);const portal=b.service&&entity(b._generatedSceneName,b.service._sceneEntityId),module=portal?.parent&&entity(b._generatedSceneName,portal.parent);if(module?.components.DoorOpening)return A.multiply(matrices.row(module.worldMatrix),A.transform(0,0,0,-doorOpenFraction(b.service)*Math.PI*.52));const m=matrices.row(entity(b._generatedSceneName,b._sceneEntityId).worldMatrix);return A.multiply(A.multiply(m,A.transform(-m[3],0,-m[11])),previousDoor(getView(b._generatedSceneName,b._sceneEntityId,b._sceneEntityId)));};
 }
 async function migrate(){
  const result=populate(native().serialize(),registry());
  if(!native().load(result.document))throw Error('Native Scene rejected building hierarchy');
  for(const name of result.bindings.keys())project(name);
  for(const [name,bindings]of result.bindings)for(const binding of bindings)if(binding.source.assembly&&!entity(name,binding.id)?.components.ModularBuilding)setAssembly(name,binding.id,binding.source.assembly,binding.source);
  refreshReferences(result.sourceReferences);installConsumers();
  if(!subscribed){native().subscribe(onChange);subscribed=true;}
  return result.counts;
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
  const scene=b._generatedSceneName,id=b._sceneEntityId,definition=entity(scene,id).components.ModularBuilding,instances=[],faces=[],A=root.VeldrenAssembly,filter=root.VeldrenBuildings.floorFilter;
  for(const moduleId of present(scene,definition.modules)){
   const node=entity(scene,moduleId),m=moduleData(scene,moduleId,id);if(m.role==='interior'||m.role==='entrance'&&m.objectId)continue;
   if(b._cutaway&&(m.role==='roof'||m.floor>0))continue;
   if(filter?.building===b&&filter.isolate&&(filter.floor==='roof'?m.role!=='roof':m.floor!==filter.floor&&!(filter.below&&m.floor<filter.floor)))continue;
   if(node.components.MeshGeometry?.faces){for(const face of node.components.MeshGeometry.faces)faces.push({...face,points:face.points.map(p=>A.point(m.local,p))});continue;}
   const asset=node.components.MeshGeometry?.mesh||root.VeldrenBuildings.model(m.model),mesh=node.components.MeshVariant?{...asset,...node.components.MeshVariant}:asset;if(mesh)instances.push({mesh,matrix:m.local});
  }
  return {instances,faces,height:b.visualHeight||4,kind:'assembly',model:matrices.row(entity(scene,id).worldMatrix)};
 }


 root.VeldrenBuildingScene={capture,populate,migrate,fieldGroups,matrices,getView,surfaceAt,createBuilding,ensureAssembly,renderAssembly,setAssembly};
})(globalThis);
