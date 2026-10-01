'use strict';
// Permanent actor definitions belong to the native Scene. Live actor state is
// a session projection and is deliberately absent from WorldDocument.
(function(root){
 const native=()=>root.realmNative.scenes,registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const groups={
  ActorDefinition:['type','kind','repeatable'],
  ActorAppearance:['sprite','characterSprite','appearanceRole','race','look','civilianModel','tint','creatureLook','size','briarhavenDetail'],
  CombatStats:['maxhp','atk','spread','xp','coins','level','maxHit','interval','accuracy','defenseLevel','attackLevel','attackStyle','loot','weak','combatRadius','rareDrops','lockAttackHeading','attackLabel'],
  EncounterDefinition:['released','anchored','mechanics','rank','marks','scene','at','area','phases','drops','encounter','style'],
  Dialogue:['talk','tutor','mapService'],
  QuestMarker:['relicKey','briarhavenGoblin','mountainKey','mainStoryKey','storyScene','mainStoryStage','questScenery','arcCivilian','tutorialRole','dungeonGuard'],
  ActorPlacement:['interiorBuilding','workstationId','habitat','placementContext','civilRoom','raiderCamp','civilization','civilCourtyard','civilUpper','quarry','penId','placement','walkThrough']
 };
 const fields=Object.fromEntries(Object.entries(groups).flatMap(([type,keys])=>keys.map(key=>[key,['components',type,key]])));
 const transient=new Set(['hp','dead','hitAt','attackAt','deathAt','respawnAt','slowUntil','enraged','attackRecovery','attackWindup','attackMove','attackHeading','attackClip','attackVisualStyle','roamAt','roamClock','collected']);
 const positional=new Set(['x','y','height','homeX','homeY','drawX','drawY','heading','roomYaw','editorTransform']);
 const views=new Map(),sources=new Map(),aliases=new Map();let enabled=false,renderInstalled=false;
 const actor=o=>o&&o.type!=='spirit'&&(['enemy','boss','man','dummy','elder','shop','questgiver','villager','inn','tutor'].includes(o.type)||o.characterSprite||o.penId);
 const editor=()=>root.VELDREN_CONTEXT==='editor'||root.window?.VELDREN_CONTEXT==='editor';
 const copy=value=>root.VeldrenSceneOwnership.copyData(value);
 const hash=value=>root.VeldrenSceneOwnership.stableHash(JSON.stringify(value));
 function capture(){
  if(enabled)return;
  for(const [scene,w]of Object.entries(registry())){const repeats=new Map();for(const o of w.objects||[]){
   if(!actor(o)||o._generatedSpawn)continue;
   const source=[o.type,o.kind||'',o.name||'',o.x,o.y,o.mainStoryKey||o.mountainKey||o.tutorialRole||''],key=JSON.stringify(source),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);
   if(!o._generatedSpawnId)Object.defineProperty(o,'_generatedSpawnId',{value:'generated:'+scene+':spawn:'+hash([source,ordinal]),configurable:true});
   sources.set(scene+'|'+o._generatedSpawnId,{scene,id:o._generatedSpawnId,object:o});
  }}
 }
 function node(scene,id){return native().entity(scene,id);}
 function invalidate(){if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof worldObjectIndex!=='undefined')worldObjectIndex=null;if(typeof realmNavigation!=='undefined')realmNavigation.clear();}
 function getView(scene,id){
  const key=scene+'|'+id;if(views.has(key))return views.get(key).view;const initial=node(scene,id);if(!initial?.components.SpawnPoint)return;
  let live=Object.create(null),deleted=new Set(),matrix=JSON.stringify(initial.worldMatrix);
  const current=()=>node(scene,id),active=()=>!!current()?.activeInHierarchy;
  const properties={
   id:{get:()=>current()?.components.CatalogIdentity.id??initial.components.CatalogIdentity.id},
   type:{get:()=>current()?.components.ActorDefinition.type??initial.components.ActorDefinition.type},
   _generatedSpawn:{get:()=>true},_spawnDefinitionId:{get:()=>id},
   heading:{get:()=>{const m=current()?.worldMatrix;return m?Math.atan2(m[8],m[10]):0;},set:(a,value)=>a.setPose({rotation:Number(value)*180/Math.PI})},
   _stationary:{get:()=>current()?.components.SpawnPoint.stationary||false},
   walkThrough:{get:()=>current()?.components.ActorPlacement?.walkThrough,set:(a,value)=>a.pathSet(fields.walkThrough,value)},
   hp:{get:()=>current()?.components.CombatStats?.maxhp},
   dead:{get:()=>active()?0:Infinity},collected:{get:()=>!active()},
   hitAt:{get:()=>-100},attackAt:{get:()=>-100},deathAt:{get:()=>-100},roamAt:{get:()=>0},roamClock:{get:()=>0},
   roomYaw:{get:a=>a.pose().rotation*Math.PI/180,set:(a,value)=>a.setPose({rotation:Number(value)*180/Math.PI})}
  };
  // Home coordinates use the spawn's hierarchy, not the moving actor position.
  for(const [field,index]of [['homeX',0],['homeY',2]])properties[field]={get:()=>{const n=current(),p=n?.components.SpawnPoint.homeOffset||[0,0,0];return n?root.VeldrenAssembly.point(root.VeldrenBuildingScene.matrices.row(n.worldMatrix),p)[index]:undefined;}};
  const base=root.VeldrenSceneOwnership.createView(scene,initial,'',{fields,properties});
  const read=field=>{
   if(field==='dead'&&!active())return Infinity;if(field==='collected'&&!active())return true;
   if(deleted.has(field))return undefined;if(Object.hasOwn(live,field))return live[field];
   if(!current()&&!['_sceneEntityId','_generatedSceneEntity','_generatedSceneName','_generatedSpawn','_spawnDefinitionId','id','type'].includes(field))return undefined;
   return base[field];
  };
  // Nested runtime mutations copy their definition field on first write. A
  // combat/renderer consumer can never mutate a saved component accidentally.
  function valueAt(field,path=[]){
   const at=()=>path.reduce((v,k)=>v?.[k],read(field)),value=at();if(!value||typeof value!=='object')return value;
   const write=fn=>{if(!Object.hasOwn(live,field)){live[field]=copy(read(field));deleted.delete(field);}let target=live[field];for(const k of path)target=target[k];fn(target);};
   return new Proxy(Array.isArray(value)?[]:{},{
    get(_target,k){const v=at();if(k===Symbol.iterator&&Array.isArray(v))return function*(){for(let i=0;i<at().length;i++)yield valueAt(field,path.concat(i));};const child=v?.[k];return child&&typeof child==='object'?valueAt(field,path.concat(k)):child;},
    set(_target,k,v){write(target=>{target[k]=v;});return true;},deleteProperty(_target,k){write(target=>{delete target[k];});return true;},
    ownKeys:()=>Reflect.ownKeys(at()||{}),has:(_target,k)=>k in (at()||{}),
    getOwnPropertyDescriptor(_target,k){if(Array.isArray(at())&&k==='length')return {value:at().length,writable:true,enumerable:false,configurable:false};return Object.hasOwn(at()||{},k)?{enumerable:true,configurable:true}:undefined;}
   });
  }
  const immutable=new Set(['id','type','_sceneEntityId','_generatedSceneEntity','_generatedSceneName','_generatedSpawn','_spawnDefinitionId']);
  const view=new Proxy({}, {
   get(_target,field){if(typeof field!=='string')return undefined;const value=read(field);return !editor()&&value&&typeof value==='object'?valueAt(field):value;},
   set(_target,field,value){if(immutable.has(field))throw Error('Spawn identity is immutable');if(editor()&&!transient.has(field)&&!String(field).startsWith('_')){base[field]=value;return true;}live[field]=value;deleted.delete(field);return true;},
   deleteProperty(_target,field){if(immutable.has(field))throw Error('Spawn identity is immutable');if(editor()&&!transient.has(field)&&!String(field).startsWith('_')){delete base[field];return true;}delete live[field];deleted.add(field);return true;},
   defineProperty(_target,field,descriptor){if(!descriptor.configurable||!Object.hasOwn(descriptor,'value'))throw Error('Actor view properties require configurable data descriptors');view[field]=descriptor.value;return true;},
   ownKeys:()=>[...new Set([...(current()?Reflect.ownKeys(base):['id','type']),...Reflect.ownKeys(live)])].filter(k=>!deleted.has(k)),
   has:(_target,k)=>read(k)!==undefined,
   getOwnPropertyDescriptor:(_target,k)=>read(k)!==undefined?{enumerable:!String(k).startsWith('_'),configurable:true}:undefined
  });
  views.set(key,{scene,id,view,reset(){live=Object.create(null);deleted.clear();matrix=JSON.stringify(current()?.worldMatrix);},sync(){const next=JSON.stringify(current()?.worldMatrix);if(next!==matrix){for(const field of positional){delete live[field];deleted.delete(field);}for(const field of ['_creatureMotion','_returnPath','_returning','_recovering']){delete live[field];deleted.delete(field);}matrix=next;}}});return view;
 }
 function project(scene){
  const w=registry()[scene];if(!w)return;const ids=native().componentIds(scene,'SpawnPoint'),seen=new Set(),next=[],byCatalog=new Map();
  for(const id of ids){const n=node(scene,id);if(n.components.GeneratedSpawn)byCatalog.set(String(n.components.CatalogIdentity.id),id);}
  aliases.set(scene,byCatalog);
  for(const o of w.objects||[]){
   if(o._generatedSceneEntity&&!node(scene,o._sceneEntityId))continue;
   const id=o._generatedSpawn?o._sceneEntityId:o._generatedSpawnId;
   if(id){if(node(scene,id)?.components.SpawnPoint&&!seen.has(id)){next.push(getView(scene,id));seen.add(id);}continue;}
   next.push(o);
  }
  for(const id of ids)if(!seen.has(id))next.push(getView(scene,id));
  if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.project(scene,next);else w.objects=next;if(typeof currentScene!=='undefined'&&currentScene===scene&&typeof objects!=='undefined'){if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.activate();else objects.splice(0,objects.length,...next);}
 }
 async function migrate(){
  capture();const document=native().serialize();let count=0;
  for(const [scene,w]of Object.entries(registry())){
   let s=document.scenes.find(s=>s.scene===scene);if(!s){s={format:'veldren.scene',version:2,scene,entities:[]};document.scenes.push(s);}
   const rootId='generated:'+scene+':root';let world=s.entities.find(e=>e.id===rootId);
   if(!world){world={id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{}};s.entities.push(world);}
   if(world.components.WorldGeneration.spawnsComplete)continue;
   const group=rootId+':spawns';s.entities.push({id:group,name:'Permanent spawns',parent:rootId,active:true,transform:identity(),components:{SceneGroup:{category:'Spawns'}},metadata:{}});
   for(const o of w.objects||[]){if(!o._generatedSpawnId||o._generatedSpawn)continue;
    for(const field of Object.keys(o))if(!field.startsWith('_')&&!fields[field]&&!transient.has(field)&&!positional.has(field)&&!['id','name'].includes(field))throw Error('Unmapped generated actor field: '+field);
    const A=root.VeldrenAssembly,M=root.VeldrenBuildingScene.matrices,angle=o.editorTransform?.rotation!==undefined?o.editorTransform.rotation*Math.PI/180:o.heading??o.roomYaw??0,scale=o.editorTransform?.scale||1;
    const worldMatrix=A.transform(o.x,o.height||0,o.y,angle,scale),home=A.point(A.inverse(worldMatrix),[o.homeX??o.x,o.height||0,o.homeY??o.y]);
    const building=(w.buildings||[]).find(b=>b.service?.destination&&[o.interiorBuilding,o.civilCourtyard].includes(b.service.destination)),parent=building?._sceneEntityId||group,local=building?A.multiply(A.inverse(M.row(node(scene,parent).worldMatrix)),worldMatrix):worldMatrix;
    const components={GeneratedSpawn:{version:1},CatalogIdentity:{id:o.id,scene},SpawnPoint:{version:1,stationary:!!o._stationary,homeOffset:home,renderOrigin:A.point(A.inverse(worldMatrix),[o.x+.5,o.height||0,o.y+.5])}};
    for(const [type,keys]of Object.entries(groups)){const data={};for(const field of keys)if(o[field]!==undefined){const value=copy(o[field]);if(value===undefined)throw Error('Invalid actor definition field: '+field);data[field]=value;}if(Object.keys(data).length)components[type]=data;}
    components.MeshRenderer={asset:'procedural:actor/'+String(o.kind||o.type),visible:true};components.Interactable={action:['enemy','boss','man','dummy'].includes(o.type)?'attack':'talk',label:o.name||o.type};
    const id=o._generatedSpawnId;if(o._sceneEntityId){s.entities=s.entities.filter(e=>e.id!==o._sceneEntityId);for(const e of s.entities)if(e.parent===o._sceneEntityId)e.parent=id;}
    s.entities.push({id,name:o.name||o.kind||o.type,parent,active:!o.collected,transform:{...identity(),position:[local[3],local[7],local[11]],affine:M.column(local)},components,metadata:{}});count++;
   }
   world.components.WorldGeneration.spawnsComplete=true;
  }
  if(!native().load(document))throw Error('Native Scene rejected permanent spawn definitions');
  hydrate();return {spawns:count};
 }
 function hydrate(){
  for(const scene of Object.keys(registry()))project(scene);
  // Legacy lexical references now forward to the same live view. They no
  // longer retain a second set of health, movement or definition fields.
  for(const {scene,id,object}of sources.values()){
   const view=getView(scene,id);if(!view)continue;
   for(const field of new Set([...Object.keys(object),...Reflect.ownKeys(view),'_sceneEntityId','_generatedSpawn','_generatedSceneEntity','_generatedSceneName','_stationary'])){
    if(String(field).startsWith('_')&&!['_sceneEntityId','_generatedSpawn','_generatedSceneEntity','_generatedSceneName','_stationary'].includes(field))continue;
    root.VeldrenSceneOwnership.bindLegacyField(object,view,field);
   }
  }
  // Construction sources are no longer owners; held legacy references still forward.
  sources.clear();
  if(!enabled)native().subscribe(event=>{
   if(native().isUnderstoryBatch?.(event))return;
   for(const record of views.values())if(event.kind==='load')record.reset();else if(record.scene===event.scene)record.sync();
   if(event.kind==='load')for(const scene of Object.keys(registry()))project(scene);
   else if(['remove','upsert','batch'].includes(event.kind))project(event.scene);
   invalidate();
  });
  enabled=true;installRendering();invalidate();return {loaded:true};
 }
 function installRendering(){
  if(renderInstalled||typeof creature3!=='function')return;renderInstalled=true;const before=creature3;
  creature3=function(r,o,x,z){
   if(!o._generatedSpawn)return before(r,o,x,z);
   const n=node(o._generatedSceneName,o._sceneEntityId);if(!n?.activeInHierarchy||!n.components.SpawnPoint||n.components.MeshRenderer?.visible===false)return 0;
   const A=root.VeldrenAssembly,M=root.VeldrenBuildingScene.matrices,world=M.row(n.worldMatrix),inverse=A.inverse(world);
   // Runtime motion is in world space; authored scale, tilt and shear remain
   // native. Convert only the facing direction into that local basis.
   const motion=typeof creatureMotion==='function'?creatureMotion(o,x,z):o._creatureMotion||{heading:o.heading};
   const direction=[Math.sin(motion.heading),0,Math.cos(motion.heading)];
   const heading=Math.atan2(inverse[0]*direction[0]+inverse[2]*direction[2],inverse[8]*direction[0]+inverse[10]*direction[2]);
   const origin=n.components.SpawnPoint.renderOrigin||A.point(inverse,[world[3]+.5,world[7],world[11]+.5]);
   const matrix=A.multiply(world,A.transform(...origin));matrix[3]+=x-.5-world[3];matrix[11]+=z-.5-world[11];
   const painter=root.VeldrenLightScene.painter(r,matrix,[x,z]),localMotion={...motion,heading};
   const logical=new Proxy(o,{get(target,k){if(k==='_creatureMotion')return localMotion;if(k==='heading'||k==='roomYaw'||k==='attackHeading')return heading;return Reflect.get(target,k);}});
   const height=before(painter,logical,x,z);
   const ground=typeof walkSurfaceHeight==='function'?walkSurfaceHeight(x,z):typeof landHeight==='function'?landHeight(x,z):0;
   if(o._creatureSockets)for(const socket of Object.values(o._creatureSockets)){const terrain=typeof landHeight==='function'?landHeight(socket.x,socket.z):0,p=painter.transformPoint([socket.x,socket.y+ground-terrain,socket.z]);socket.x=p[0];socket.y=p[1];socket.z=p[2];}
   return (height||0)*Math.hypot(matrix[1],matrix[5],matrix[9])+matrix[7];
  };
 }
 root.VeldrenSpawnScene={installRendering,capture,migrate,hydrate,getView,ownsLegacy:(scene,id)=>aliases.get(scene)?.has(String(id))||false,definitions:scene=>Object.freeze(native().componentIds(scene,'SpawnPoint').map(id=>node(scene,id))),get enabled(){return enabled;}};
})(globalThis);
