'use strict';
// Permanent workstations, standalone portals and tutorial mechanisms belong
// to Scene. Player rewards and gate animation remain unsaved session state.
(function(root){
 const native=()=>root.realmNative.scenes,registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const I=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]}),A=()=>root.VeldrenAssembly,M=()=>root.VeldrenBuildingScene.matrices,copy=v=>root.VeldrenSceneOwnership.copyData(v);
 const views=new Map(),sources=new Map(),aliases=new Map();let enabled=false,renderInstalled=false,gateRef=null;
 const service=o=>['forge','practiceForge','cache','gate','door'].includes(o.type);
 const groups={ServiceDefinition:['type','workstation'],ServicePlacement:['interiorBuilding','civilCourtyard','roomYaw'],Portal:['destination','lairEntrance','passageKind','walkThrough'],QuestMarker:['tutorialRole','mainStoryKey','mountainKey','penFence']};
 const fields=Object.fromEntries(Object.entries(groups).flatMap(([type,keys])=>keys.map(k=>[k,['components',type,k]])));
 const immutable=new Set(['id','type','_sceneEntityId','_generatedSceneEntity','_generatedSceneName','_generatedService']);
 const transient=new Set(['dead','hitAt','attackAt','collected','openedAt','motion','blocksSight','respawnAt']);
 function capture(){if(enabled)return;for(const [scene,w]of Object.entries(registry())){const repeats=new Map();for(const o of w.objects||[]){if(!service(o)||o._generatedSceneEntity)continue;
  const source=[o.type,o.name,o.x,o.y,o.destination||'',o.tutorialRole||''],key=JSON.stringify(source),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);
  const id=o._generatedServiceId||'generated:'+scene+':service:'+root.VeldrenSceneOwnership.stableHash(JSON.stringify([source,ordinal]));
  if(!o._generatedServiceId)Object.defineProperty(o,'_generatedServiceId',{value:id,configurable:true});sources.set(scene+'|'+id,{scene,id,object:o});
  if(typeof trainingPenGate!=='undefined'&&o===trainingPenGate)gateRef={scene,id};
 }}}
 function node(scene,id){return native().entity(scene,id);}
 function getView(scene,id){const key=scene+'|'+id;if(views.has(key))return views.get(key).view;const initial=node(scene,id);if(!initial?.components.ServiceDefinition)return;
  let state=Object.create(null);const current=()=>node(scene,id),properties={id:{get:()=>current()?.components.CatalogIdentity.id??initial.components.CatalogIdentity.id},type:{get:()=>current()?.components.ServiceDefinition?.type??initial.components.ServiceDefinition.type},_generatedService:{get:()=>true},walkThrough:{get:()=>current()?.components.Collider?.solid===false,set:(a,v)=>a.pathSet(['components','Collider','solid'],!v)}};
  const base=root.VeldrenSceneOwnership.createView(scene,initial,'',{fields,properties}),read=k=>{
   if(k==='dead'&&(!current()?.activeInHierarchy||!current()?.components.ServiceDefinition))return Infinity;if(k==='collected'&&(!current()?.activeInHierarchy||!current()?.components.ServiceDefinition))return true;
   if(Object.hasOwn(state,k))return state[k];
   if(transient.has(k))return ({dead:0,hitAt:-100,attackAt:-100,collected:false,blocksSight:!!current()?.components.Collider?.blocksSight})[k];
   if(!current()&&!['_sceneEntityId','_generatedSceneEntity','_generatedSceneName','_generatedService','id','type'].includes(k))return undefined;
   return base[k];
  };
  const view=new Proxy({}, {
   get:(_t,k)=>typeof k==='string'?read(k):undefined,
   set(_t,k,v){if(immutable.has(k))throw Error('Service identity is immutable');if(transient.has(k)||String(k).startsWith('_')){state[k]=v;if(k==='collected')invalidate();return true;}base[k]=v;return true;},
   deleteProperty(_t,k){if(immutable.has(k))throw Error('Service identity is immutable');if(transient.has(k)||String(k).startsWith('_')){state[k]=undefined;if(k==='collected')invalidate();return true;}return delete base[k];},
   defineProperty(_t,k,d){if(!d.configurable||!Object.hasOwn(d,'value'))throw Error('Service view properties require configurable data descriptors');view[k]=d.value;return true;},
   ownKeys:()=>[...new Set([...(current()?Reflect.ownKeys(base):['id','type']),...Object.keys(state),...transient])],
   has:(_t,k)=>read(k)!==undefined,getOwnPropertyDescriptor:(_t,k)=>read(k)!==undefined?{enumerable:!String(k).startsWith('_'),configurable:true}:undefined
  });views.set(key,{scene,id,view,reset(){state=Object.create(null);}});return view;
 }
 function project(scene){const w=registry()[scene];if(!w)return;const ids=native().componentIds(scene,'ServiceDefinition'),seen=new Set(),next=[],catalog=new Map(ids.map(id=>[String(node(scene,id).components.CatalogIdentity.id),id]));aliases.set(scene,catalog);
  for(const o of w.objects||[]){if(o._generatedSceneEntity&&!node(scene,o._sceneEntityId))continue;const id=o._generatedService?o._sceneEntityId:o._generatedServiceId;
   if(id){if(node(scene,id)?.components.ServiceDefinition&&!seen.has(id)){next.push(getView(scene,id));seen.add(id);}continue;}next.push(o);
  }
  for(const id of ids)if(!seen.has(id))next.push(getView(scene,id));if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.project(scene,next);else w.objects=next;
  if(typeof currentScene!=='undefined'&&currentScene===scene&&typeof objects!=='undefined'){if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.activate();else (globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(next):objects.splice(0,objects.length,...next));}
  if(gateRef?.scene===scene&&typeof trainingPenGate!=='undefined')trainingPenGate=node(scene,gateRef.id)?.components.ServiceDefinition?getView(scene,gateRef.id):null;
 }
 function invalidate(){if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof worldObjectIndex!=='undefined')worldObjectIndex=null;if(typeof realmNavigation!=='undefined')realmNavigation.clear();if(typeof miniTerrain!=='undefined')miniTerrain=null;if(typeof mapServicesCache!=='undefined')mapServicesCache=null;
  for(const {view}of views.values()){if(typeof staticMeshes3!=='undefined')staticMeshes3.delete(view);if(typeof staticMeshQueues3!=='undefined')staticMeshQueues3.prop.delete(view);}
 }
 const local=m=>({...I(),position:[m[3],m[7],m[11]],affine:M().column(m)});
 async function migrate(){
  capture();const document=native().serialize();let count=0,colliders=0,supports=0;
  for(const [scene,w]of Object.entries(registry())){
   let s=document.scenes.find(s=>s.scene===scene);if(!s){s={format:'veldren.scene',version:2,scene,entities:[]};document.scenes.push(s);}
   const rootId='generated:'+scene+':root';let world=s.entities.find(e=>e.id===rootId);if(!world){world={id:rootId,name:'World',parent:null,active:true,transform:I(),components:{WorldGeneration:{}},metadata:{}};s.entities.push(world);}
   if(world.components.WorldGeneration.servicesComplete)continue;
   const group=rootId+':services';s.entities.push({id:group,name:'World services',parent:rootId,active:true,transform:I(),components:{SceneGroup:{category:'Services'}},metadata:{}});
   for(const o of w.objects||[]){if(!o._generatedServiceId||o._generatedSceneEntity)continue;
    const id=o._generatedServiceId,yaw=(o.editorTransform?.rotation??((o.heading??o.placement?.yaw??o.roomYaw??0)*180/Math.PI))*Math.PI/180,scale=o.editorTransform?.scale||1,wm=A().transform(o.x,o.height||0,o.y,yaw,scale),inverse=A().inverse(wm);
    const building=(w.buildings||[]).find(b=>b.service?.destination&&[o.interiorBuilding,o.civilCourtyard].includes(b.service.destination)),parent=building?._sceneEntityId||group,parentMatrix=building?M().row(node(scene,parent).worldMatrix):node(scene,rootId)?M().row(node(scene,rootId).worldMatrix):A().transform(0,0,0);
    const components={GeneratedService:{version:1},CatalogIdentity:{id:o.id,scene},ServiceDefinition:{type:o.type},MeshRenderer:{asset:'procedural:'+o.type,sprite:o.sprite||0,visible:true},ServiceGeometry:{origin:A().point(inverse,[o.x+.5,o.height||0,o.y+.5])},Interactable:{action:o.type==='door'?'enter':o.type==='cache'?'claim':o.type==='gate'?'open':'smith',label:o.name},Collider:{solid:!o.walkThrough,blocksSight:!!o.blocksSight,shape:'service-tiles'}};
    if(o.type==='gate')components.GateMechanism={kind:'training-pen'};
    const skip=new Set(['id','name','type','x','y','height','homeX','homeY','drawX','drawY','heading','editorTransform','building','sprite','walkThrough','placement',...transient]),metadata={};
    for(const [type,keys]of Object.entries(groups))for(const k of keys)if(k!=='walkThrough'&&o[k]!==undefined){components[type]??={};components[type][k]=copy(o[k]);skip.add(k);}
    for(const k of Object.keys(o))if(!skip.has(k)&&!k.startsWith('_')){const v=copy(o[k]);if(v!==undefined)metadata[k]=v;}
    for(const k of ['propKind','habitatModel','habitatHeight','campModel','tint','civilDecor','briarhavenDetail'])if(o[k]!==undefined){components.WorldDecoration??={};components.WorldDecoration[k==='propKind'?'kind':k]=copy(o[k]);delete metadata[k];}
    if(o.placement){components.Placement=copy(o.placement);delete components.Placement.yaw;}
    const tiles=typeof propCollisionTiles==='function'&&o.propKind&&!o.walkThrough?propCollisionTiles(o):[[o.x,o.y]];
    if(o._sceneEntityId){s.entities=s.entities.filter(e=>e.id!==o._sceneEntityId);for(const e of s.entities)if(e.parent===o._sceneEntityId)e.parent=id;}
    s.entities.push({id,name:o.name||o.type,parent,active:!o.collected,transform:local(A().multiply(A().inverse(parentMatrix),wm)),components,metadata});count++;
    for(const [i,[x,z]]of tiles.entries()){s.entities.push({id:id+':collider:'+i,name:'Service footprint',parent:id,active:true,transform:local(A().multiply(inverse,A().transform(x,0,z))),components:{ServiceCollider:{owner:id},Footprint:{x:0,z:0,w:1,h:1}},metadata:{}});colliders++;}
    for(const p of s.entities)if(p.components.TerrainPad?.objectId!=null&&String(p.components.TerrainPad.objectId)===String(o.id)){const snapshot=node(scene,p.id);if(snapshot){p.parent=id;p.transform=local(A().multiply(inverse,M().row(snapshot.worldMatrix)));supports++;}}
   }
   world.components.WorldGeneration.servicesComplete=true;
  }
  if(!native().load(document))throw Error('Native Scene rejected world services');
  for(const scene of Object.keys(registry()))project(scene);
  for(const {scene,id,object}of sources.values()){const view=getView(scene,id);if(!view)continue;for(const k of new Set([...Object.keys(object),...Reflect.ownKeys(view),'_sceneEntityId','_generatedService','_generatedSceneEntity','_generatedSceneName'])){
   if(String(k).startsWith('_')&&!['_sceneEntityId','_generatedService','_generatedSceneEntity','_generatedSceneName'].includes(k))continue;
   Object.defineProperty(object,k,{configurable:true,enumerable:!String(k).startsWith('_'),get:()=>view[k],set:v=>{view[k]=v;}});
  }}
  if(!enabled)native().subscribe(event=>{if(event.kind==='load'){for(const r of views.values())r.reset();for(const scene of Object.keys(registry()))project(scene);}else if(['remove','upsert','batch'].includes(event.kind))project(event.scene);invalidate();});
  enabled=true;installRendering();invalidate();return {services:count,colliders,supports};
 }
 function at(scene,x,z){return enabled?Object.freeze([...new Set(native().footprintsAt(scene,'ServiceCollider',x+.5,z+.5).map(id=>node(scene,id).components.ServiceCollider.owner))].filter(id=>node(scene,id)?.components.ServiceDefinition).map(id=>getView(scene,id))):Object.freeze([]);}
 function blocked(scene,x,z){return at(scene,x,z).some(o=>!o.walkThrough&&!o.collected);}
 function contains(o,x,z){return at(o._generatedSceneName,x,z).some(v=>v._sceneEntityId===o._sceneEntityId);}
 function installRendering(){if(renderInstalled||typeof prop3!=='function')return;renderInstalled=true;const before=prop3;
  prop3=function(r,o,x,z){if(!o._generatedService)return before(r,o,x,z);const n=node(o._generatedSceneName,o._sceneEntityId);if(!n?.activeInHierarchy||!n.components.ServiceDefinition||n.components.MeshRenderer?.visible===false||o.collected)return 0;
   const origin=n.components.ServiceGeometry.origin,m=A().multiply(M().row(n.worldMatrix),A().transform(...origin)),logical={...o,heading:0,roomYaw:0,editorTransform:{rotation:0,scale:1}};if(o.placement)logical.placement={...o.placement,yaw:0};
   const height=before(root.VeldrenLightScene.painter(r,m,[x,z]),logical,x,z);return (height||0)*Math.hypot(m[1],m[5],m[9])+m[7];
  };
 }
 root.VeldrenServiceScene={capture,migrate,getView,at,blocked,contains,ownsLegacy:(scene,id)=>aliases.get(scene)?.has(String(id))||false,definitions:scene=>Object.freeze(native().componentIds(scene,'ServiceDefinition').map(id=>node(scene,id))),get enabled(){return enabled;}};
})(globalThis);
