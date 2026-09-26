'use strict';
// Permanent resource definitions are native entities. Depletion and replica
// receipts belong to the separate native resource session, never WorldDocument.
(function(root){
 const native=()=>root.realmNative.scenes,registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const groups={Gatherable:['type','resourceId'],ResourceAppearance:['treeArt','race','briarhavenDetail'],ResourcePlacement:['interiorBuilding','roomYaw','civilization','quarry','ecology','realmScenery','forest','settlementTree','firstlightDetail','firstlightGrove','fishingHabitat'],QuestMarker:['tutorialRole','relicKey','questScenery']};
 const fields=Object.fromEntries(Object.entries(groups).flatMap(([type,keys])=>keys.map(key=>[key,['components',type,key]])));
 const stateFields={respawnAt:'respawnAt',hitAt:'hitAt',harvestedUntil:'harvestedUntil',collected:'collected',_sharedReady:'sharedReady',_sharedDeadUntil:'sharedDeadUntil',_treeRegrowAt:'treeRegrowAt',_treeRegrown:'treeRegrown',_sharedRevision:'sharedRevision',_sharedGeneration:'sharedGeneration',_sharedOwner:'sharedOwner',_sharedTarget:'sharedTarget',_sharedHazard:'sharedHazard',_sharedPhase:'sharedPhase'};
 const transient=new Set(['dead','attackAt','deathAt','hp','maxhp','slowUntil','enraged','attackRecovery','attackWindup','attackMove',...Object.keys(stateFields)]),positional=new Set(['x','y','height','homeX','homeY','drawX','drawY','heading','editorTransform']);
 const views=new Map(),sources=new Map(),aliases=new Map(),previews=new Map();let enabled=false,renderInstalled=false;
 const resource=o=>o&&['tree','ore','fish','crop'].includes(o.type),copy=value=>root.VeldrenSceneOwnership.copyData(value),hash=value=>root.VeldrenSceneOwnership.stableHash(JSON.stringify(value));
 const editor=()=>root.VELDREN_CONTEXT==='editor'||root.window?.VELDREN_CONTEXT==='editor';
 const defaults=()=>({depleted:false,gameDeadline:null,respawnAt:null,hitAt:-100,harvestedUntil:0,collected:false,sharedReady:false,sharedDeadUntil:0,treeRegrowAt:0,treeRegrown:false});
 const node=(scene,id)=>native().entity(scene,id),key=(scene,id)=>JSON.stringify([scene,id]);
 function invalidate(){if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof worldObjectIndex!=='undefined')worldObjectIndex=null;if(typeof realmNavigation!=='undefined')realmNavigation.clear();}
 function capture(){
  if(enabled)return;
  for(const [scene,w]of Object.entries(registry())){const repeats=new Map();for(const o of w.objects||[]){if(!resource(o)||o._generatedGatherable)continue;
   const source=[o.type,o.name||'',o.x,o.y,o.resourceId||'',o.tutorialRole||o.relicKey||''],k=JSON.stringify(source),ordinal=repeats.get(k)||0;repeats.set(k,ordinal+1);
   if(!o._generatedGatherableId)Object.defineProperty(o,'_generatedGatherableId',{value:'generated:'+scene+':resource:'+hash([source,ordinal]),configurable:true});
   sources.set(key(scene,o._generatedGatherableId),{scene,id:o._generatedGatherableId,object:o});
  }}
 }
 function state(scene,id){return editor()?(previews.get(key(scene,id))||defaults()):root.realmNative.resources.read(scene,id);}
 function patch(scene,id,values){
  if(editor()){if(!node(scene,id))return false;previews.set(key(scene,id),{...state(scene,id),...values});return true;}
  return root.realmNative.resources.patch(scene,id,values);
 }
 function getView(scene,id){
  const k=key(scene,id);if(views.has(k))return views.get(k).view;const initial=node(scene,id);if(!initial?.components.Gatherable)return;
  let extra=Object.create(null);const current=()=>node(scene,id),active=()=>!!current()?.components.Gatherable&&!!current()?.activeInHierarchy;
  const properties={id:{get:()=>current()?.components.CatalogIdentity.id??initial.components.CatalogIdentity.id},type:{get:()=>current()?.components.Gatherable.type??initial.components.Gatherable.type},_generatedGatherable:{get:()=>true},
   walkThrough:{get:()=>current()?.components.Collider?.solid===false?true:undefined,set:(a,v)=>a.pathSet(['components','Collider','solid'],!v)},
   resourceId:{get:()=>current()?.components.Gatherable.resourceId,set:(a,v)=>{a.mutate(e=>{if(v===undefined)delete e.components.Gatherable.resourceId;else e.components.Gatherable.resourceId=v;e.components.Gatherable.harvest=copy(legacyDefinition({type:e.components.Gatherable.type,resourceId:v}))??null;});}}
  };
  const base=root.VeldrenSceneOwnership.createView(scene,initial,'',{fields,properties});
  const read=field=>{
   if(field==='dead'){if(!active())return Infinity;const s=state(scene,id);return s?.depleted?s.gameDeadline??Infinity:0;}
   if(field==='collected')return !active()||!!state(scene,id)?.collected;
   if(stateFields[field])return state(scene,id)?.[stateFields[field]];
   if(Object.hasOwn(extra,field))return extra[field];
   if(transient.has(field))return field==='attackAt'||field==='deathAt'?-100:undefined;
   if(!current()&&!['_sceneEntityId','_generatedSceneEntity','_generatedSceneName','_generatedGatherable','id','type'].includes(field))return undefined;
   return base[field];
  };
  const immutable=new Set(['id','type','_sceneEntityId','_generatedSceneEntity','_generatedSceneName','_generatedGatherable']);
  const view=new Proxy({}, {
   get(_target,field){return typeof field==='string'?read(field):undefined;},
   set(_target,field,value){
    if(immutable.has(field))throw Error('Resource identity is immutable');
    if(field==='dead'||stateFields[field]){const values=field==='dead'?{depleted:!!value,gameDeadline:Number.isFinite(value)&&value!==0?value:null}:{[stateFields[field]]:value===undefined?null:value};if(!patch(scene,id,values))throw Error('Invalid native resource state: '+String(field));if(field==='collected')invalidate();return true;}
    if(transient.has(field)||String(field).startsWith('_')){extra[field]=value;return true;}
    base[field]=value;return true;
   },
   deleteProperty(_target,field){if(immutable.has(field))throw Error('Resource identity is immutable');if(stateFields[field]||field==='dead'){view[field]=field==='dead'?0:defaults()[stateFields[field]]??null;return true;}if(transient.has(field)||String(field).startsWith('_')){delete extra[field];return true;}delete base[field];return true;},
   defineProperty(_target,field,d){if(!d.configurable||!Object.hasOwn(d,'value'))throw Error('Resource view properties require configurable data descriptors');view[field]=d.value;return true;},
   ownKeys:()=>[...new Set([...(current()?Reflect.ownKeys(base):['id','type']),...Object.keys(stateFields),...Reflect.ownKeys(extra)])],
   has:(_target,k)=>read(k)!==undefined,getOwnPropertyDescriptor:(_target,k)=>read(k)!==undefined?{enumerable:!String(k).startsWith('_'),configurable:true}:undefined
  });
  views.set(k,{scene,id,view,reset(){extra=Object.create(null);}});return view;
 }
 function project(scene){
  const w=registry()[scene];if(!w)return;const ids=native().componentIds(scene,'Gatherable'),seen=new Set(),next=[],byCatalog=new Map();
  for(const id of ids){const n=node(scene,id);if(n.components.CatalogIdentity)byCatalog.set(String(n.components.CatalogIdentity.id),id);}aliases.set(scene,byCatalog);
  for(const o of w.objects||[]){if(o._generatedSceneEntity&&!node(scene,o._sceneEntityId))continue;const id=o._generatedGatherable?o._sceneEntityId:o._generatedGatherableId;
   if(id){if(node(scene,id)?.components.Gatherable&&!seen.has(id)){next.push(getView(scene,id));seen.add(id);}continue;}next.push(o);
  }
  for(const id of ids)if(!seen.has(id))next.push(getView(scene,id));if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.project(scene,next);else w.objects=next;
  if(typeof currentScene!=='undefined'&&currentScene===scene&&typeof objects!=='undefined'){if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.activate();else objects.splice(0,objects.length,...next);}
 }
 const legacyDefinition=typeof resourceDefinition==='function'?resourceDefinition:()=>null;
 async function migrate(){
  capture();const document=native().serialize();let count=0;
  for(const [scene,w]of Object.entries(registry())){
   let s=document.scenes.find(s=>s.scene===scene);if(!s){s={format:'veldren.scene',version:2,scene,entities:[]};document.scenes.push(s);}
   const rootId='generated:'+scene+':root';let world=s.entities.find(e=>e.id===rootId);
   if(!world){world={id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{}};s.entities.push(world);}
   if(world.components.WorldGeneration.gatherablesComplete)continue;
   const group=rootId+':resources';s.entities.push({id:group,name:'Gatherable resources',parent:rootId,active:true,transform:identity(),components:{SceneGroup:{category:'Resources'}},metadata:{}});
   for(const o of w.objects||[]){if(!o._generatedGatherableId||o._generatedGatherable)continue;
    for(const field of Object.keys(o))if(!field.startsWith('_')&&!fields[field]&&!transient.has(field)&&!positional.has(field)&&!['id','name','sprite','collisionRadius','walkThrough'].includes(field))throw Error('Unmapped generated resource field: '+field);
    const A=root.VeldrenAssembly,M=root.VeldrenBuildingScene.matrices,worldMatrix=A.transform(o.x,o.height||0,o.y,(o.editorTransform?.rotation||0)*Math.PI/180,o.editorTransform?.scale||1);
    const building=(w.buildings||[]).find(b=>b.service?.destination===o.interiorBuilding&&o.interiorBuilding),parent=building?._sceneEntityId||group,local=building?A.multiply(A.inverse(M.row(node(scene,parent).worldMatrix)),worldMatrix):worldMatrix;
    const components={GeneratedGatherable:{version:1},CatalogIdentity:{id:o.id,scene}};
    for(const [type,keys]of Object.entries(groups)){const data={};for(const field of keys)if(o[field]!==undefined){const value=copy(o[field]);if(value===undefined)throw Error('Invalid resource definition field: '+field);data[field]=value;}if(Object.keys(data).length)components[type]=data;}
    components.Gatherable.harvest=copy(legacyDefinition(o))??null;
    components.MeshRenderer={asset:'procedural:resource/'+o.type,sprite:o.sprite||0,visible:true};components.Interactable={action:o.type==='crop'?'farm':'gather',label:o.name||o.type};
    components.Collider={shape:'resource-tiles',solid:!o.walkThrough,...o.collisionRadius!==undefined?{radius:o.collisionRadius}:{}};components.Footprint={x:-2,z:-2,w:5,h:5};
    const id=o._generatedGatherableId;if(o._sceneEntityId){s.entities=s.entities.filter(e=>e.id!==o._sceneEntityId);for(const e of s.entities)if(e.parent===o._sceneEntityId)e.parent=id;}
    s.entities.push({id,name:o.name||o.type,parent,active:!o.collected,transform:{...identity(),position:[local[3],local[7],local[11]],affine:M.column(local)},components,metadata:{}});count++;
   }
   world.components.WorldGeneration.gatherablesComplete=true;
  }
  if(!native().load(document))throw Error('Native Scene rejected gatherable definitions');
  for(const scene of Object.keys(registry()))project(scene);
  for(const {scene,id,object}of sources.values()){
   const view=getView(scene,id);if(!view)continue;
   for(const field of new Set([...Object.keys(object),...Reflect.ownKeys(view),'_sceneEntityId','_generatedGatherable','_generatedSceneEntity','_generatedSceneName'])){
    if(String(field).startsWith('_')&&!stateFields[field]&&!['_sceneEntityId','_generatedGatherable','_generatedSceneEntity','_generatedSceneName'].includes(field))continue;
    Object.defineProperty(object,field,{configurable:true,enumerable:!String(field).startsWith('_'),get:()=>view[field],set:value=>{view[field]=value;}});
   }
  }
  if(!enabled)native().subscribe(event=>{
   if(event.kind==='load'){previews.clear();for(const record of views.values())record.reset();for(const scene of Object.keys(registry()))project(scene);}
   else if(['remove','upsert','batch'].includes(event.kind))project(event.scene);
   for(const {view}of views.values()){if(typeof staticMeshes3!=='undefined')staticMeshes3.delete(view);if(typeof staticMeshQueues3!=='undefined')staticMeshQueues3.prop.delete(view);}
   invalidate();
  });
  enabled=true;installRendering();invalidate();return {gatherables:count};
 }
 function blocked(scene,x,z){return enabled&&native().footprintsAt(scene,'Gatherable',x+.5,z+.5).some(id=>node(scene,id)?.components.Collider?.solid&&!getView(scene,id).collected);}
 function installRendering(){
  if(renderInstalled)return;renderInstalled=true;
  for(const kind of ['prop','stump']){
   const before=kind==='prop'?(typeof prop3==='function'?prop3:null):(typeof drawTreeStump==='function'?drawTreeStump:null);if(!before)continue;
   const draw=function(r,o,x,z,...args){
    if(!o._generatedGatherable)return before(r,o,x,z,...args);
    const n=node(o._generatedSceneName,o._sceneEntityId);if(!n?.activeInHierarchy||n.components.MeshRenderer?.visible===false||o.collected)return 0;
    const A=root.VeldrenAssembly,m=A.multiply(root.VeldrenBuildingScene.matrices.row(n.worldMatrix),A.transform(.5,0,.5)),logical={...o,heading:0,editorTransform:{rotation:0,scale:1}};
    const height=before(root.VeldrenLightScene.painter(r,m,[x,z]),logical,x,z,...args);return (height||0)*Math.hypot(m[1],m[5],m[9])+m[7];
   };
   if(kind==='prop')prop3=draw;else drawTreeStump=draw;
  }
 }
 function definition(o){return node(o._generatedSceneName,o._sceneEntityId)?.components.Gatherable.harvest??null;}
 if(typeof resourceDefinition==='function')resourceDefinition=o=>o._generatedGatherable?definition(o):legacyDefinition(o);
 root.VeldrenGatherableScene={capture,migrate,getView,definition,blocked,tick:(now,time)=>enabled&&!editor()?root.realmNative.resources.tick(now,time):0,phase:(o,now,time,flags)=>['inactive','alive','stump','regrowing','syncing','regrown','chopping'][editor()?1:root.realmNative.resources.phase(o._generatedSceneName,o._sceneEntityId,now,time,flags)],ownsLegacy:(scene,id)=>aliases.get(scene)?.has(String(id))||false,get enabled(){return enabled;}};
})(globalThis);
