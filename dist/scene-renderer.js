'use strict';
// Canonical authored draws use the same Phase 2 resource owners as imported
// world geometry. Scene is authoritative in both editor and /play.
function createVeldrenSceneRenderer(native,assets,draws){
 let scene=null,ids=new Set(),dirty=true;
 const unsubscribe=native.subscribe(event=>{for(const change of event.kind==='batch'?event.changes:[event])if(!change.scene||change.scene===scene){if(change.kind!=='transform')dirty=true;}});
 function render(name,camera){
  if(name!==scene){scene=name;dirty=true;}
  if(dirty){ids=new Set(native.componentIds(name,'MeshRenderer').filter(id=>native.entity(name,id)?.components.MeshRenderer.renderPath==='canonical'));dirty=false;}
  draws.begin(name);try{for(const id of ids){const node=native.entity(name,id),mesh=node?.components.MeshRenderer;if(!node?.activeInHierarchy||mesh.visible===false||globalThis.VeldrenEditorSelection?.hidden(id))continue;
   const matrix=node.worldMatrix,distance=Math.hypot(matrix[12]-camera[0],matrix[13]-camera[1],matrix[14]-camera[2]);draws.submit(mesh.asset,matrix,distance,{material:mesh.material||'',castShadows:mesh.castShadows!==false,receiveShadows:mesh.receiveShadows!==false});
  }}finally{draws.end();}
 }
 return {render,destroy(){unsubscribe();draws.destroy();}};
}

function veldrenLegacySceneVisible(entity,sceneName){
 const id=entity?._sceneEntityId;if(!id)return true;if(globalThis.VeldrenEditorSelection?.hidden(id))return false;
 const node=globalThis.realmNative?.scenes.entity(String(sceneName),id);if(!node)return false;const mesh=node.components.MeshRenderer;return node.activeInHierarchy&&!!mesh&&mesh.visible!==false&&mesh.renderPath!=='canonical';
}
