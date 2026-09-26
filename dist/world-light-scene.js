'use strict';
// Permanent emitters and their fixtures are Scene entities. Runtime fire expiry
// stays in the transient gameplay layer and never enters the saved light catalog.
(function(root){
 const native=()=>root.realmNative.scenes,registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const views=new Map(),torchLists=new Map(),fixtureIds=new Map(),aliases=new Map();let enabled=false,renderInstalled=false;
 const hash=value=>root.VeldrenSceneOwnership.stableHash(JSON.stringify(value));
 const fixture=o=>['camp','range','furnace'].includes(o.type)&&!Number.isFinite(o.expiresAt);
 function capture(){
  for(const [name,w]of Object.entries(registry())){const repeats=new Map();for(const o of w.objects||[]){if(!fixture(o)||o._generatedFixture)continue;
   const key=JSON.stringify([o.type,o.name,o.x,o.y]),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);
   if(!o._generatedFixtureId)Object.defineProperty(o,'_generatedFixtureId',{value:'generated:'+name+':fixture:'+hash([key,ordinal]),configurable:true});
  }}
 }
 function getView(name,id){
  const key=name+'|'+id;if(views.has(key))return views.get(key);const initial=native().entity(name,id);if(!initial)return;
  const wall=!!initial.components.WallTorch,properties={_generatedFixture:{get:()=>!!initial.components.GeneratedFixture},_generatedWallTorch:{get:()=>wall}};
  if(wall){properties.z={get:a=>a.pose().y,set:(a,v)=>a.setPose({y:v})};properties.dx={get:()=>native().entity(name,id).worldMatrix[0]};properties.dz={get:()=>native().entity(name,id).worldMatrix[2]};}
  else properties.id={get:()=>initial.components.CatalogIdentity.id};
  const view=root.VeldrenSceneOwnership.createView(name,initial,'',{type:wall?'light-fixture':initial.components.Fixture.type,properties});views.set(key,view);return view;
 }
 function project(name){
  const w=registry()[name];if(!w)return;
  torchLists.set(name,Object.freeze(native().componentIds(name,'WallTorch').map(id=>getView(name,id))));
  if(!Object.getOwnPropertyDescriptor(w,'wallTorches')?.get)Object.defineProperty(w,'wallTorches',{enumerable:true,configurable:false,get:()=>torchLists.get(name)});
  const ids=native().componentIds(name,'GeneratedFixture'),byCatalog=new Map(ids.map(id=>[String(native().entity(name,id).components.CatalogIdentity.id),id])),seen=new Set(),next=[];
  for(const o of w.objects||[]){
   const id=o._generatedFixture?o._sceneEntityId:fixture(o)?byCatalog.get(String(o.id)):null;
   if(o._generatedFixture||fixture(o)){if(id&&native().entity(name,id)){next.push(getView(name,id));seen.add(id);}continue;}
   next.push(o);
  }
  for(const id of ids)if(!seen.has(id))next.push(getView(name,id));
  w.objects=next;fixtureIds.set(name,new Set(ids));aliases.set(name,byCatalog);
  if(typeof currentScene!=='undefined'&&currentScene===name&&typeof objects!=='undefined')objects.splice(0,objects.length,...next);
  if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof worldObjectIndex!=='undefined')worldObjectIndex=null;
 }
 function light(offset,radius,color=[1,.74,.45],intensity=1.25,scope='always',nightOnly=false){return {type:'point',offset,radius,color,intensity,scope,nightOnly,terrainRelative:true};}
 function attachLight(entity,o,kind){
  let point,radius,color,intensity,night=false,scope='object';
  if(kind==='hearth'){point=[o.x,.55,o.z];radius=13;color=[1,.65,.32];intensity=1.8;scope='outdoor';}
  else if(kind==='crystal'){point=[o.x,1.4,o.z];radius=8;color=[.35,.65,1];intensity=.9;scope='always';}
  else if(o.type==='camp'){point=[o.x+.5,.65,o.y+.5];radius=13;color=[1,.65,.32];intensity=1.8;}
  else if(o.streetLantern){point=[o.x+.5,2.75,o.y+.5];radius=19;color=[1,.8,.51];intensity=1.7;night=true;}
  else if(o.name==='Square lantern'){const yaw=o.placement?.yaw||0;point=[o.x+.5+Math.cos(yaw)*.4,1.95,o.y+.5-Math.sin(yaw)*.4];radius=12;color=[1,.75,.43];intensity=1.5;night=true;}
  else if(['range','furnace'].includes(o.type)){point=[o.x+.5,1,o.y+.5];radius=9;color=[1,.61,.28];intensity=1.5;}
  else return false;
  const A=root.VeldrenAssembly,M=root.VeldrenBuildingScene.matrices;
  const snapshot=native().entity(entity._sceneName,entity.id),matrix=snapshot?M.row(snapshot.worldMatrix):entity._initialWorld;
  entity.components.Light={...light(A.point(A.inverse(matrix),point),radius,color,intensity,scope,night),sourceKind:scope==='object'?'object':'decoration'};return true;
 }
 async function migrate(){
  capture();const document=native().serialize(),bindings=[];let count=0,fixtures=0,torches=0;
  for(const [name,w]of Object.entries(registry())){
   let scene=document.scenes.find(s=>s.scene===name);if(!scene){scene={format:'veldren.scene',version:2,scene:name,entities:[]};document.scenes.push(scene);}
   const rootId='generated:'+name+':root';let world=scene.entities.find(e=>e.id===rootId);
   if(!world){world={id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{}};scene.entities.push(world);}
   if(world.components.WorldGeneration.lightsComplete){
    for(const o of w.objects||[])if(fixture(o)&&!o._generatedFixture){const entity=scene.entities.find(e=>e.components.GeneratedFixture&&String(e.components.CatalogIdentity.id)===String(o.id));if(entity)bindings.push({name,id:entity.id,source:o});}
    continue;
   }
   const group=rootId+':lights';scene.entities.push({id:group,name:'Light fixtures',parent:rootId,active:true,transform:identity(),components:{SceneGroup:{category:'Lights'}},metadata:{}});
   const repeat=new Map();for(const o of w.wallTorches||[]){
    const key=JSON.stringify([o.x,o.z,o.dx,o.dz]),ordinal=repeat.get(key)||0;repeat.set(key,ordinal+1);const angle=Math.atan2(-o.dz,o.dx)/2;
    scene.entities.push({id:'generated:'+name+':torch:'+hash([key,ordinal]),name:'Wall torch',parent:group,active:true,transform:{position:[o.x,0,o.z],rotation:[0,Math.sin(angle),0,Math.cos(angle)],scale:[1,1,1]},components:{WallTorch:{version:1},MeshRenderer:{asset:'procedural:wall-torch',visible:true},Interactable:{action:'examine',label:'Wall torch'},Light:light([0,1.75,0],18)},metadata:{}});count++;torches++;
   }
   const A=root.VeldrenAssembly,M=root.VeldrenBuildingScene.matrices;
   for(const o of w.objects||[]){
    let entity=o._sceneEntityId&&scene.entities.find(e=>e.id===o._sceneEntityId);
    if(fixture(o)&&!entity?.components.GeneratedFixture){
     const id=o._generatedFixtureId,angle=(o.editorTransform?.rotation??((o.heading??o.placement?.yaw??0)*180/Math.PI))*Math.PI/180,scale=o.editorTransform?.scale||1,worldMatrix=A.transform(o.x,o.height||0,o.y,angle,scale);
     const building=(w.buildings||[]).find(b=>b.service?.destination&&[o.interiorBuilding,o.civilCourtyard].includes(b.service.destination));
     const parent=building?._sceneEntityId||group,local=building?A.multiply(A.inverse(M.row(native().entity(name,parent).worldMatrix)),worldMatrix):worldMatrix;
     const metadata={},skip=new Set(['id','type','name','x','y','z','height','homeX','homeY','drawX','drawY','heading','editorTransform','placement','building','sprite','walkThrough']);
     for(const key of Object.keys(o))if(!skip.has(key)&&!key.startsWith('_')){const value=root.VeldrenSceneOwnership.copyData(o[key]);if(value!==undefined)metadata[key]=value;}
     const components={WorldDecoration:{kind:o.propKind||o.type,...Object.fromEntries(['habitatModel','habitatHeight','campModel','tint','civilDecor','briarhavenDetail'].filter(k=>o[k]!==undefined).map(k=>[k,root.VeldrenSceneOwnership.copyData(o[k])]))},GeneratedFixture:{version:1},CatalogIdentity:{id:o.id,scene:name},Fixture:{type:o.type},MeshRenderer:{asset:'procedural:'+o.type,sprite:o.sprite||0,visible:true},Interactable:{action:o.type==='furnace'?'smelt':'cook',label:o.name}};
     if(!o.walkThrough)components.Collider={shape:'tile',solid:true};
     if(o.placement){components.Placement=root.VeldrenSceneOwnership.copyData(o.placement);delete components.Placement.yaw;}
     entity={id,name:o.name||o.type,parent,active:true,transform:{...identity(),position:[local[3],local[7],local[11]],affine:M.column(local)},components,metadata,_initialWorld:worldMatrix};
     if(o._sceneEntityId){scene.entities=scene.entities.filter(e=>e.id!==o._sceneEntityId);for(const e of scene.entities)if(e.parent===o._sceneEntityId)e.parent=id;}
     scene.entities.push(entity);bindings.push({name,id,source:o});fixtures++;
    }
    if(entity){entity._sceneName=name;if(attachLight(entity,o))count++;delete entity._sceneName;delete entity._initialWorld;}
   }
   for(const o of w.decor||[]){const e=scene.entities.find(e=>e.id===o._sceneEntityId);if(e){e._sceneName=name;if(attachLight(e,o,o.kind))count++;delete e._sceneName;}}
   world.components.WorldGeneration.lightsComplete=true;
  }
  if(!native().load(document))throw Error('Native Scene rejected permanent lights');
  for(const name of Object.keys(registry()))project(name);
  // Existing gameplay references retain their identity, but their data reads
  // and persistent writes now forward to the canonical entity.
  for(const {name,id,source}of bindings){const view=getView(name,id);for(const key of new Set([...Object.keys(source),...Reflect.ownKeys(view),'_sceneEntityId','_generatedFixture','_generatedSceneEntity','_generatedSceneName'])){
   if(String(key).startsWith('_')&&!['_sceneEntityId','_generatedFixture','_generatedSceneEntity','_generatedSceneName'].includes(key))continue;
   Object.defineProperty(source,key,{configurable:true,enumerable:!String(key).startsWith('_'),get:()=>view[key],set:value=>{view[key]=value;}});
  }}
  if(!enabled)native().subscribe(event=>{
   if(event.kind==='load'){for(const name of Object.keys(registry()))project(name);}
   else if(event.kind==='remove'||event.kind==='upsert'||event.kind==='batch')project(event.scene);
   for(const view of views.values()){if(typeof staticMeshes3!=='undefined')staticMeshes3.delete(view);if(typeof staticMeshQueues3!=='undefined')staticMeshQueues3.prop.delete(view);}
   if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof worldObjectIndex!=='undefined')worldObjectIndex=null;if(typeof realmNavigation!=='undefined')realmNavigation.clear();
  });
  enabled=true;installRendering();return {lights:count,fixtures,torches};
 }
 function sources(scene,night){
  const w=registry()[scene],inside=(x,z)=>w?.buildings.some(b=>b.walkIn&&(typeof withinWalkIn==='function'?withinWalkIn(b,x,z):x>b.x&&x<b.x+b.w&&z>b.y&&z<b.y+b.h)),result=[];
  for(const light of native().lights(scene,night)){
   const node=native().entity(scene,light.id),meta=node.metadata;
   if(light.scope==='object'){
    if(meta.interiorBuilding||meta.collected||meta.dead>(typeof time==='undefined'?0:time))continue;
    if(typeof currentScene!=='undefined'&&scene===currentScene&&(Math.abs(node.worldMatrix[12]-px)>70||Math.abs(node.worldMatrix[14]-py)>70))continue;
   }
   if(['object','outdoor'].includes(light.scope)&&inside(light.x,light.z))continue;
   if(light.terrainRelative&&typeof landHeight==='function')light.y+=landHeight(light.x,light.z);
   result.push(light);
  }
  // Player-created fires have a transient gameplay lifetime, never a saved
  // procedural fixture. Keep their established expiry and location semantics.
  const candidates=typeof currentScene!=='undefined'&&scene===currentScene&&typeof worldObjectsInBounds==='function'?worldObjectsInBounds(px-70,px+70,py-70,py+70):w?.objects||[];
  for(const o of candidates)if(o.type==='camp'&&Number.isFinite(o.expiresAt)&&o.expiresAt>Date.now()&&!o.collected&&!(o.dead>(typeof time==='undefined'?0:time))&&!o.interiorBuilding&&!inside(o.x+.5,o.y+.5))result.push({x:o.x+.5,y:.65+(typeof landHeight==='function'?landHeight(o.x+.5,o.y+.5):0),z:o.y+.5,radius:13,color:[1,.65,.32],intensity:1.8});
  return result;
 }
 function painter(r,m,origin){
  const A=root.VeldrenAssembly,terrain=(x,z)=>typeof landHeight==='function'?landHeight(x,z):0,base=typeof walkSurfaceHeight==='function'?walkSurfaceHeight(origin[0],origin[1]):terrain(...origin),inverse=A.inverse(m);
  const normal=n=>{const p=[inverse[0]*n[0]+inverse[4]*n[1]+inverse[8]*n[2],inverse[1]*n[0]+inverse[5]*n[1]+inverse[9]*n[2],inverse[2]*n[0]+inverse[6]*n[1]+inverse[10]*n[2]],length=Math.hypot(...p)||1;return p.map(v=>v/length);};
  const point=p=>{const q=A.point(m,[p[0]-origin[0],p[1]+terrain(p[0],p[2])-base,p[2]-origin[1]]);q[1]+=base-terrain(q[0],q[2]);return q;};
  const out={software:r.software,face(points,color,normals,material,colors,uvs){r.face(points.map(point),color,normals?.map(normal),material,colors,uvs);}};
  if(r.indexed)out.indexed=(mesh,t,style)=>{const local=[...t];local[7]+=terrain(local[3],local[11]);const next=A.multiply(m,A.multiply(A.transform(-origin[0],-base,-origin[1]),local));next[7]+=base-terrain(next[3],next[11]);r.indexed(mesh,next,style);};return out;
 }
 let torchRenderer;
 function renderTorch(r,o){const node=native().entity(o._generatedSceneName,o._sceneEntityId);if(!node?.activeInHierarchy)return;const m=root.VeldrenBuildingScene.matrices.row(node.worldMatrix);return torchRenderer(painter(r,m,[m[3],m[11]]),{x:m[3],z:m[11],dx:1,dz:0});}
 function installRendering(){
  if(renderInstalled)return;renderInstalled=true;
  if(typeof drawWallTorch3==='function'){torchRenderer=drawWallTorch3;drawWallTorch3=function(r,o){return o._generatedWallTorch?renderTorch(r,o):torchRenderer(r,o);};}
  if(typeof prop3==='function'){const before=prop3;prop3=function(r,o,x,z){
   if(!o._generatedFixture)return before(r,o,x,z);
   const node=native().entity(o._generatedSceneName,o._sceneEntityId);if(!node?.activeInHierarchy)return 0;
   const m=root.VeldrenBuildingScene.matrices.row(node.worldMatrix),logical={...o,heading:0,editorTransform:{rotation:0,scale:1}};
   if(o.placement)logical.placement={...o.placement,yaw:0};
   return before(painter(r,m,[m[3],m[11]]),logical,x,z);
  };}
 }
 root.VeldrenLightScene={capture,migrate,sources,renderTorch,painter,selectables:name=>torchLists.get(name)||[],ownsLegacy:(name,id)=>aliases.get(name)?.has(String(id))||false,get enabled(){return enabled;}};
})(globalThis);
