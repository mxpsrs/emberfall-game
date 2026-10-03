'use strict';
// Canonical authored draws use the same Phase 2 resource owners as imported
// world geometry. Scene is authoritative in both editor and /play.
function createVeldrenSceneRenderer(native,assets,draws){
 let scene=null,ids=new Set(),dirty=true,frame=0;const records=new Map();
 const unsubscribe=native.subscribe(event=>{if(native.isUnderstoryBatch?.(event))return;if(event.kind==='load')records.clear();for(const change of event.kind==='batch'?event.changes:[event])if(!change.scene||change.scene===scene){if(change.kind!=='transform')dirty=true;if(change.kind==='remove'||change.kind==='delete')records.delete(change.id);}});
 function submit(id,asset,matrix,material,flags,distance,lodSelected){
  let record=records.get(id);if(!record){record={matrix:new Float32Array(16),flags:-1,material:null};records.set(id,record);}
  if(record.flags!==flags||record.material!==material){record.flags=flags;record.material=material;record.options={material,castShadows:!!(flags&1),receiveShadows:!!(flags&2)};}
  let changed=!record.seen;for(let i=0;!changed&&i<16;i++)changed=record.matrix[i]!==Math.fround(matrix[i]);
  if(changed)record.matrix.set(matrix);record.seen=frame;
  draws.submit(asset,record.matrix,distance,record.options,id,lodSelected);
 }
 function render(name,camera){
  if(name!==scene){scene=name;dirty=true;records.clear();}frame++;
  const prepared=globalThis.VeldrenWorldPerformance?.frame(name);
  if(dirty&&!prepared?.packets&&!prepared?.drawBuffer){ids=new Set(native.componentIds(name,'MeshRenderer').filter(id=>native.entity(name,id)?.components.MeshRenderer.renderPath==='canonical'));dirty=false;}
  draws.begin(name);try{if(prepared?.drawBuffer){const words=prepared.words,floats=prepared.floats,strings=prepared.strings;for(let i=0;i<prepared.drawCount;i++){const offset=prepared.drawOffset+i*21,id=strings[words[offset]];if(globalThis.VeldrenEditorSelection?.hidden(id))continue;submit(id,strings[words[offset+1]],prepared.matrixAt(i),strings[words[offset+2]],words[offset+3],floats[offset+20],true);}}else if(prepared?.packets){for(const [id,asset,matrix,material,castShadows,receiveShadows,distance] of prepared.packets){if(globalThis.VeldrenEditorSelection?.hidden(id))continue;submit(id,asset,matrix,material,(castShadows?1:0)|(receiveShadows?2:0),distance,true);}}else for(const id of ids){const node=native.entity(name,id),mesh=node?.components.MeshRenderer;if(!node?.activeInHierarchy||mesh.visible===false||globalThis.VeldrenEditorSelection?.hidden(id))continue;
   const matrix=node.worldMatrix,distance=Math.hypot(matrix[12]-camera[0],matrix[13]-camera[1],matrix[14]-camera[2]);submit(id,mesh.asset,matrix,mesh.material||'',(mesh.castShadows!==false?1:0)|(mesh.receiveShadows!==false?2:0),distance,false);
  }for(const preview of globalThis.VeldrenEditorPlacement?.()||[])draws.submit(preview.asset,preview.matrix,0,preview.options);
  }finally{draws.end();}for(const [id,record]of records)if(frame-record.seen>120)records.delete(id);
 }
 return {render,destroy(){unsubscribe();records.clear();draws.destroy();}};
}

function veldrenLegacySceneVisible(entity,sceneName){
 const id=entity?._sceneEntityId;if(!id)return true;if(globalThis.VeldrenEditorSelection?.hidden(id))return false;
 if(globalThis.VeldrenWorldPerformance?.legacyVisible)return globalThis.VeldrenWorldPerformance.legacyVisible(String(sceneName),id);
 const node=globalThis.realmNative?.scenes.entity(String(sceneName),id);if(!node)return false;const mesh=node.components.MeshRenderer;return node.activeInHierarchy&&!!mesh&&mesh.visible!==false&&mesh.renderPath!=='canonical';
}
