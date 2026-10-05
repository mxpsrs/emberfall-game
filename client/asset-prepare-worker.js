'use strict';
// Background IO and native render planning. Filament handles stay on the main
// thread; the same canonical C++ planner validates these packets.
let initialized=null,api=null;const jobs=new Map();
async function initialize(message){
 globalThis.realmAssetURL=path=>new URL(message.versions?.[path]||path,message.base).href;
 importScripts(realmAssetURL('asset-runtime.js'));
 const imports={env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{fd_close(){return 8;},
  proc_exit(code){throw Error('Asset worker exited '+code);},
  environ_sizes_get(a,b){if(!api)return 21;const memory=new DataView(api.memory.buffer);memory.setUint32(a,0,true);memory.setUint32(b,0,true);return 0;},environ_get(){return 0;}
 }};
 const response=await fetch(realmAssetURL('native/veldren-core.wasm'));
 if(!response.ok)throw Error('Asset worker core unavailable');
 api=(await WebAssembly.instantiate(await response.arrayBuffer(),imports)).instance.exports;api._initialize();
 await VeldrenAssets.initialize(api);
}
self.onmessage=async({data})=>{
 if(data.op==='cancel'){jobs.get(data.request)?.abort();return;}
 if(data.op!=='prepare'&&data.op!=='building')return;
 const controller=new AbortController();jobs.set(data.request,controller);
 try{
  if(!initialized)initialized=initialize(data);await initialized;
  if(controller.signal.aborted)return;
  if(data.op==='building'){
   if(!globalThis.VeldrenBuildingLOD)importScripts(realmAssetURL('building-lod.js'));
   const plans=new Map();
   for(const d of data.building.definitions){const response=await fetch(realmAssetURL(d.derivedPath),{signal:controller.signal});if(!response.ok)throw Error('Building source unavailable: '+d.id);const model=await response.json();if(controller.signal.aborted)return;if(model.id!==d.id||model.sourceHash!==d.sourceHash)throw Error('Stale building source: '+d.id);plans.set(d.id,VeldrenAssets.renderPlan(model));}
   const started=performance.now(),plan=VeldrenBuildingLOD.merge(data.id,data.building.modules.map(m=>({...m,plan:plans.get(m.id)})),data.building.maxBytes),buffers=plan.geometry.flatMap(p=>[p.vertices.buffer,p.normals.buffer,p.tangents.buffer,p.indices.buffer]);
   if(!controller.signal.aborted)self.postMessage({request:data.request,plan,prepareMs:performance.now()-started},buffers);return;
  }
  const response=await fetch(data.url,{signal:controller.signal});if(!response.ok)throw Error('Derived model unavailable: '+data.id);
  const model=await response.json();if(controller.signal.aborted)return;
  if(model.id!==data.id||model.sourceHash!==data.sourceHash)throw Error('Stale model in asset worker');
  const started=performance.now(),source=VeldrenAssets.renderPlan(model),plan={...source,geometry:source.geometry.map(packet=>({...packet}))},buffers=[];
  for(const packet of plan.geometry)for(const [key,Type] of [['vertices',Float32Array],['normals',Float32Array],['tangents',Float32Array],['indices',Uint32Array],['joints',Float32Array],['weights',Float32Array]]){
   if(!packet[key])continue;const bytes=Uint8Array.from(atob(packet[key]),c=>c.charCodeAt(0));packet[key]=new Type(bytes.buffer);buffers.push(bytes.buffer);
  }
  if(!controller.signal.aborted)self.postMessage({request:data.request,plan,prepareMs:performance.now()-started},buffers);
 }catch(error){if(!controller.signal.aborted)self.postMessage({request:data.request,error:String(error.message||error)});}
 finally{jobs.delete(data.request);}
};
