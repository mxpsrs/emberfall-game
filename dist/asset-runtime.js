'use strict';
// Browser IO and marshalling only. Registry/dependency/lifecycle decisions are C++.
(()=>{
 let registryHandle=0,command=null,destroyNative=null,records=new Map(),catalogs=new Map(),ids=null,ready=false,epoch=0,initializing=null,textureApi=null;
 const payloads=new Map(),models=new Map(),leases=new Set(),legacyLeases=new Map();
 const textureLeases=new Set(),disposeListeners=new Set(),reloadListeners=new Set();
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 function request(value){if(!command)throw Error('Native asset registry is not ready');return command(value);}
 function record(id){if(!records.has(id))records.set(id,freeze(request({op:'record',id})));return records.get(id);}
 function cancelled(message){const error=Error(message);error.name='AbortError';return error;}
 function retire(entry){
  if(models.get(entry.id)===entry)models.delete(entry.id);
  entry.controller.abort();
 }
 function unloadUnused(id){
  for(const key of [id,...assets.dependencies(id)])if(record(key).loadState==='pending release')assets.state(key,'unloaded');
 }
 function releaseLease(lease){
  if(lease.closed)return;
  lease.closed=true;leases.delete(lease);
  const queue=legacyLeases.get(lease.id);
  if(queue){const index=queue.indexOf(lease);if(index>=0)queue.splice(index,1);if(!queue.length)legacyLeases.delete(lease.id);}
  const entry=lease.entry;
  if(--entry.users===0)retire(entry);
  if(lease.epoch===epoch&&command){assets.release(lease.id);unloadUnused(lease.id);}
 }
 function leaseModel(id){
  const definition=record(id);
  if(definition.type!=='model'||definition.importSettings?.importer!=='veldren-gltf-1')throw Error('Canonical model unavailable: '+id);
  assets.acquire(id);
  let entry=models.get(id);
  if(entry&&entry.generation!==definition.generation){retire(entry);entry=null;}
  if(!entry){
   entry={id,users:0,generation:definition.generation,epoch,controller:new AbortController(),promise:null};models.set(id,entry);
   const current=entry,signal=current.controller.signal;
   const check=()=>{if(signal.aborted||current.epoch!==epoch||!command||record(id).generation!==current.generation)throw cancelled('Model load retired: '+id);};
   // A cancellation also settles consumers when a host fetch ignores its signal.
   let rejectCancelled;
   const aborted=new Promise((resolve,reject)=>{rejectCancelled=()=>reject(cancelled('Model load cancelled: '+id));signal.addEventListener('abort',rejectCancelled,{once:true});});
   const loading=Promise.resolve().then(async()=>{
    check();const response=await fetch(realmAssetURL(definition.derivedPath),{signal});check();
    if(!response.ok)throw Error('Derived model unavailable: '+id);
    const model=await response.json();check();
    if(model.format!=='veldren.model'||model.version!==1||model.id!==id||model.sourceHash!==definition.sourceHash)throw Error('Stale or invalid derived model: '+id);
    for(const key of [id,...assets.dependencies(id)]){const child=record(key);if(child.type!=='texture'&&child.loadState==='loading')assets.state(key,'loaded');}
    return freeze(model);
   });
   current.promise=Promise.race([loading,aborted]).finally(()=>signal.removeEventListener('abort',rejectCancelled));
  }
  entry.users++;
  const lease={id,entry,epoch,closed:false,ready:null};leases.add(lease);
  lease.ready=entry.promise.then(model=>{
   if(lease.closed||lease.epoch!==epoch)throw cancelled('Model lease released: '+id);
   return model;
  }).catch(error=>{releaseLease(lease);throw error;});
  return lease;
 }
 const assets={
  get ready(){return ready;},
  get nativeHandle(){return registryHandle;},
  async initialize(api){
   if(command)throw Error('Native asset registry already initialized');
   const handle=api.veldren_assets_create();registryHandle=handle;if(!handle)throw Error('Asset registry allocation failed');
   const session=++epoch,controller=new AbortController();initializing=controller;
   textureApi=api;
   destroyNative=()=>api.veldren_assets_destroy(handle);
   command=value=>{const bytes=new TextEncoder().encode(JSON.stringify(value)),pointer=api.malloc(bytes.length+1);if(!pointer)throw Error('Asset command allocation failed');
    try{const target=new Uint8Array(api.memory.buffer,pointer,bytes.length+1);target.set(bytes);target[bytes.length]=0;api.veldren_assets_command(handle,pointer);}finally{api.free(pointer);}
    const length=api.veldren_assets_response(handle,0,0),out=api.malloc(length+1);if(!out)throw Error('Asset response allocation failed');
    try{api.veldren_assets_response(handle,out,length+1);const result=JSON.parse(new TextDecoder().decode(new Uint8Array(api.memory.buffer,out,length)));if(!result.ok)throw Error(result.error);return result.value;}finally{api.free(out);}
   };
   try{
    const response=await fetch(realmAssetURL('assets/asset-registry.json'),{signal:controller.signal});
    if(!response.ok)throw Error('Asset manifest unavailable ('+response.status+')');
    const manifest=await response.json();
    if(session!==epoch||controller.signal.aborted)throw cancelled('Asset initialization cancelled');
    request({op:'load',manifest});ready=true;initializing=null;return assets;
   }catch(error){if(session===epoch)assets.destroy();throw error;}
  },
  record,
  materialPlan(id,profile){return freeze(request({op:'material-plan',id,profile}));},
  renderPlan(model){return freeze(request({op:'render-plan',model}));},
  lod(id,distance){return freeze(request({op:'lod',id,distance}));},
  validate(manifest){return request({op:'validate',manifest});},
  reload(manifest){
   // Native load is transactional and preserves stable root leases. A rejected
   // import leaves every live definition and cached generation intact.
   const result=request({op:'load',manifest});records.clear();catalogs.clear();ids=null;
   for(const entry of [...models.values()])if(!assets.has(entry.id)||record(entry.id).generation!==entry.generation)retire(entry);
   for(const listener of [...reloadListeners])listener();return result;
  },
  async refresh(){const response=await fetch(realmAssetURL('assets/asset-registry.json').split('?')[0],{cache:'no-store'});if(!response.ok)throw Error('Updated asset manifest unavailable');return assets.reload(await response.json());},
  textureVariant(id,profile,usage){return freeze(request({op:'texture-variant',id,profile,usage}));},
  has(id){if(!ids)ids=new Set(request({op:'list'}));return ids.has(id);},
  list(type=''){if(!catalogs.has(type))catalogs.set(type,Object.freeze(request({op:'list',type})));return catalogs.get(type);},
  dependencies:id=>request({op:'dependencies',id}),dependents:id=>request({op:'dependents',id}),
  acquire(id){const result=request({op:'acquire',id});records.clear();return result;},
  release(id){const result=request({op:'release',id});records.clear();return result;},
  state(id,state){const result=request({op:'state',id,state});records.delete(id);return result;},
  invalidate(id){const affected=request({op:'invalidate',id});for(const key of affected){records.delete(key);const entry=models.get(key);if(entry)retire(entry);}return affected;},
  diagnostics:()=>request({op:'diagnostics'}),
  // Explicit handles let renderer/editor consumers release the exact generation.
  leaseModel(id){const lease=leaseModel(id);return Object.freeze({id,ready:lease.ready,release:()=>releaseLease(lease)});},
  async loadModel(id){const lease=leaseModel(id);let queue=legacyLeases.get(id);if(!queue)legacyLeases.set(id,queue=[]);queue.push(lease);return lease.ready;},
  releaseModel(id){
   const lease=legacyLeases.get(id)?.[0];if(!lease)throw Error('Model has no lease: '+id);releaseLease(lease);
  },
  ioDiagnostics:()=>({models:models.size,leases:leases.size}),
  onDispose(listener){disposeListeners.add(listener);return ()=>disposeListeners.delete(listener);},
  onReload(listener){reloadListeners.add(listener);return ()=>reloadListeners.delete(listener);},
  processTexture(bytes,options={}){
   if(!ready||!textureApi?.veldren_texture_create)throw Error('Native texture processing unavailable');
   const api=textureApi,session=epoch;
   const settings=new TextEncoder().encode(JSON.stringify(options)),data=api.malloc(bytes.byteLength),config=api.malloc(settings.length+1);
   if(!data||!config){if(data)api.free(data);if(config)api.free(config);throw Error('Native texture allocation failed');}
   const readText=call=>{const length=call(0,0);if(!length)return null;const pointer=api.malloc(length+1);if(!pointer)throw Error('Native texture metadata allocation failed');try{call(pointer,length+1);return new TextDecoder().decode(new Uint8Array(api.memory.buffer,pointer,length));}finally{api.free(pointer);}};
   let handle=0;
   try{
    new Uint8Array(api.memory.buffer,data,bytes.byteLength).set(bytes);
    const text=new Uint8Array(api.memory.buffer,config,settings.length+1);text.set(settings);text[settings.length]=0;
    handle=api.veldren_texture_create(data,bytes.byteLength,config);
   }finally{api.free(data);api.free(config);}
   if(!handle)throw Error(readText((out,size)=>api.veldren_texture_error(out,size))||'Native texture processing failed');
   let closed=false;
   const release=()=>{if(closed)return;closed=true;textureLeases.delete(release);api.veldren_texture_destroy(handle);};
   textureLeases.add(release);
   try{
    const info=freeze(JSON.parse(readText((out,size)=>api.veldren_texture_info(handle,out,size))));
    return Object.freeze({handle,info,release,level(index){
     if(closed||session!==epoch)throw Error('Texture lease released');
     const pointer=api.veldren_texture_data(handle,index),size=api.veldren_texture_size(handle,index);
     if(!pointer||!size)throw Error('Invalid texture mip level');
     // Filament owns a separate heap. Copy before any further native allocation.
     return new Uint8Array(api.memory.buffer,pointer,size).slice();
    }});
   }catch(error){release();throw error;}
  },
  bindLegacy(source,models){for(const [key,mesh]of Object.entries(models)){const id=source+':'+key;payloads.set(id,mesh);Object.defineProperty(mesh,'canonicalAsset',{value:id,configurable:true});}},
  mesh(id){if(!assets.has(id))return null;const definition=record(id);if(definition.type!=='model'&&definition.type!=='mesh')throw Error('Asset is not geometry: '+id);return payloads.get(id)||null;},
  destroy(){
   ++epoch;initializing?.abort();initializing=null;
   for(const listener of [...disposeListeners].reverse())listener();disposeListeners.clear();reloadListeners.clear();
   for(const release of [...textureLeases])release();textureApi=null;
   for(const lease of leases){lease.closed=true;retire(lease.entry);}leases.clear();legacyLeases.clear();
   destroyNative?.();destroyNative=null;registryHandle=0;command=null;ready=false;ids=null;records.clear();catalogs.clear();payloads.clear();models.clear();
  }
 };
 globalThis.VeldrenAssets=Object.freeze(assets);
})();
