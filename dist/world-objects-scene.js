'use strict';
// Scene publishers own permanent membership. Session placement is explicit and
// never serialized: fires, editor previews, and travelling quest actors.
(function(root){
 const registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const native=()=>root.realmNative.scenes,base=new Map(),lists=new Map(),sessions=new Map(),placements=new Map();
 let enabled=false,renderInstalled=false;
 const key=o=>o._sceneEntityId;
 function invalidate(){if(typeof worldObjectRevision!=='undefined')worldObjectRevision++;if(typeof worldObjectIndex!=='undefined')worldObjectIndex=null;}
 function activate(){if(!enabled)return;objects=lists.get(String(currentScene))||Object.freeze([]);invalidate();}
 function select(values){const canonical=lists.get(String(currentScene))||[];if(values.length!==canonical.length||values.some((o,i)=>o!==canonical[i]))throw Error('Active world membership is a Scene projection');activate();}
 function refresh(name){
  const next=(base.get(name)||[]).filter(o=>!placements.has(o)||placements.get(o)===name);
  for(const [o,destination]of placements)if(destination===name&&o._generatedSceneName!==name)next.push(o);
  for(const [o,entry]of sessions)if(entry.scene===name)next.push(o);
  lists.set(name,Object.freeze(next));if(typeof currentScene!=='undefined'&&String(currentScene)===name)activate();invalidate();
 }
 function project(name,values){
  name=String(name);if(!enabled){registry()[name].objects=values;return;}
  if(!base.has(name))throw Error('Unknown scene: '+name);
  const seen=new Set(),next=[];
  const append=o=>{if(sessions.has(o))return;const id=key(o),source=o._generatedSceneName||name;
   if(source!==name)return;const node=id&&native().entity(name,id);if(!node)return;
   if(!seen.has(id)){seen.add(id);next.push(o);}
  };
  for(const o of values){if(!key(o)&&!sessions.has(o))throw Error('Permanent world members require a native entity');append(o);}
  // Relocated actors are hidden from their definition scene's live list; keep
  // their native definitions in that scene's projection when another category refreshes.
  for(const o of base.get(name))if(placements.has(o))append(o);
  base.set(name,next);refresh(name);
 }
 function addSession(scene,o,kind){
  if(!enabled)throw Error('World membership is not installed');scene=String(scene);
  if(!base.has(scene)||key(o)||o._generatedSceneEntity)throw Error('Invalid session object');
  if(kind==='fire'){if(o.type!=='camp'||!(o._sharedObject||Number.isFinite(o.expiresAt)))throw Error('Session fires require an expiry or shared identity');}
  else if(kind==='preview'){if(!o._editorPreview||root.VELDREN_CONTEXT!=='editor'&&root.window?.VELDREN_CONTEXT!=='editor')throw Error('Preview requires editor context');}
  else throw Error('Unsupported session category');
  const previous=sessions.get(o);sessions.set(o,{scene,kind});if(previous&&previous.scene!==scene)refresh(previous.scene);refresh(scene);return o;
 }
 function removeSession(o){const entry=sessions.get(o);if(!entry)return false;sessions.delete(o);refresh(entry.scene);return true;}
 function moveActor(o,scene){
  scene=String(scene);if(!enabled||!base.has(scene)||!o._generatedSpawn||!native().entity(o._generatedSceneName,key(o))?.components.SpawnPoint)throw Error('Only live native actors can change session scene');
  const previous=placements.get(o)||o._generatedSceneName;if(scene===o._generatedSceneName)placements.delete(o);else placements.set(o,scene);
  refresh(previous);refresh(scene);return o;
 }
 function installRendering(){
  if(renderInstalled||typeof prop3!=='function'||!root.VeldrenLightScene)return;renderInstalled=true;const before=prop3;
  prop3=function(r,o,x,z){
   const n=o._generatedSceneEntity&&native().entity(o._generatedSceneName,o._sceneEntityId);
   if(!n||!n.components.GeneratedProp&&!/^(briar|creature):/.test(n.components.MeshRenderer?.asset||'')||n.components.StructuralLinks?.civilGatehouse)return before(r,o,x,z);
   if(!n.activeInHierarchy||n.components.MeshRenderer?.visible===false)return 0;
   const matrix=root.VeldrenBuildingScene.matrices.row(n.worldMatrix);
   // Object positions retain the established tile-anchor convention. Geometry
   // is centered on that tile; the native basis owns its scale and orientation.
   matrix[3]=x;matrix[11]=z;
   const logical={...o,heading:0,roomYaw:0,editorTransform:{rotation:0,scale:1}};
   if(o.placement)logical.placement={...o.placement,yaw:0};
   const height=before(root.VeldrenLightScene.painter(r,matrix,[x,z]),logical,x,z);
   return (height||0)*Math.hypot(matrix[1],matrix[5],matrix[9])+matrix[7];
  };
 }
 function install(){
  if(enabled)return;for(const [name,w]of Object.entries(registry())){
   for(const o of w.objects||[])if(!key(o)||!native().entity(o._generatedSceneName||name,key(o)))throw Error('Unowned world object at membership transfer: '+name+' '+o.id);
   base.set(name,[...w.objects]);lists.set(name,Object.freeze([...w.objects]));
   Object.defineProperty(w,'objects',{enumerable:true,configurable:false,get:()=>lists.get(name),set(){throw Error('Scene membership is read-only');}});
  }
  enabled=true;installRendering();if(typeof worldObjectArrayObserved!=='undefined')worldObjectArrayObserved=true;activate();
  native().subscribe(event=>{
   if(event.kind==='load'){sessions.clear();placements.clear();for(const name of base.keys())refresh(name);}
   else if(event.kind==='remove'||event.kind==='batch'){
    const affected=new Set();for(const [o,destination]of placements)if(!native().entity(o._generatedSceneName,key(o))){placements.delete(o);affected.add(destination);}
    for(const name of affected)refresh(name);
   }
  });
 }
 root.VeldrenWorldObjects={install,project,activate,addSession,removeSession,moveActor,select,get enabled(){return enabled;}};
})(globalThis);
