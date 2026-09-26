'use strict';
// Browser IO and marshalling only. Registry/dependency/lifecycle decisions are C++.
(()=>{
 let command=null,destroyNative=null,records=new Map(),catalogs=new Map(),ids=null,ready=false;
 const payloads=new Map(),models=new Map();
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 function request(value){if(!command)throw Error('Native asset registry is not ready');return command(value);}
 function record(id){if(!records.has(id))records.set(id,freeze(request({op:'record',id})));return records.get(id);}
 const assets={
  get ready(){return ready;},
  async initialize(api){
   if(command)throw Error('Native asset registry already initialized');
   const handle=api.veldren_assets_create();if(!handle)throw Error('Asset registry allocation failed');
   destroyNative=()=>api.veldren_assets_destroy(handle);
   command=value=>{const bytes=new TextEncoder().encode(JSON.stringify(value)),pointer=api.malloc(bytes.length+1);if(!pointer)throw Error('Asset command allocation failed');
    try{const target=new Uint8Array(api.memory.buffer,pointer,bytes.length+1);target.set(bytes);target[bytes.length]=0;api.veldren_assets_command(handle,pointer);}finally{api.free(pointer);}
    const length=api.veldren_assets_response(handle,0,0),out=api.malloc(length+1);if(!out)throw Error('Asset response allocation failed');
    try{api.veldren_assets_response(handle,out,length+1);const result=JSON.parse(new TextDecoder().decode(new Uint8Array(api.memory.buffer,out,length)));if(!result.ok)throw Error(result.error);return result.value;}finally{api.free(out);}
   };
   try{const response=await fetch(realmAssetURL('assets/asset-registry.json'));if(!response.ok)throw Error('Asset manifest unavailable ('+response.status+')');request({op:'load',manifest:await response.json()});ready=true;return assets;}catch(error){assets.destroy();throw error;}
  },
  record,
  has(id){if(!ids)ids=new Set(request({op:'list'}));return ids.has(id);},
  list(type=''){if(!catalogs.has(type))catalogs.set(type,Object.freeze(request({op:'list',type})));return catalogs.get(type);},
  dependencies:id=>request({op:'dependencies',id}),dependents:id=>request({op:'dependents',id}),
  acquire(id){const result=request({op:'acquire',id});records.clear();return result;},
  release(id){const result=request({op:'release',id});records.clear();return result;},
  state(id,state){const result=request({op:'state',id,state});records.delete(id);return result;},
  invalidate(id){const affected=request({op:'invalidate',id});for(const key of affected)records.delete(key);return affected;},
  diagnostics:()=>request({op:'diagnostics'}),
  async loadModel(id){
   const definition=record(id);if(definition.type!=='model'||definition.importSettings?.importer!=='veldren-gltf-1')throw Error('Canonical model unavailable: '+id);
   assets.acquire(id);let entry=models.get(id);
   if(!entry){
    entry={users:0,promise:null};models.set(id,entry);
    entry.promise=(async()=>{const response=await fetch(realmAssetURL(definition.derivedPath));if(!response.ok)throw Error('Derived model unavailable: '+id);const model=await response.json();
     if(model.format!=='veldren.model'||model.version!==1||model.id!==id||model.sourceHash!==definition.sourceHash)throw Error('Stale or invalid derived model: '+id);
     for(const key of [id,...assets.dependencies(id)]){const child=record(key);if(child.type!=='texture'&&child.loadState==='loading')assets.state(key,'loaded');}
     return freeze(model);
    })();
   }
   entry.users++;
   try{return await entry.promise;}catch(error){assets.releaseModel(id);throw error;}
  },
  releaseModel(id){
   const entry=models.get(id);if(!entry||!entry.users)throw Error('Model has no lease: '+id);
   assets.release(id);if(--entry.users===0){models.delete(id);for(const key of [id,...assets.dependencies(id)]){const child=record(key);if(child.loadState==='pending release')assets.state(key,'unloaded');}}
  },
  bindLegacy(source,models){for(const [key,mesh]of Object.entries(models))payloads.set(source+':'+key,mesh);},
  mesh(id){if(!assets.has(id))return null;const definition=record(id);if(definition.type!=='model'&&definition.type!=='mesh')throw Error('Asset is not geometry: '+id);return payloads.get(id)||null;},
  destroy(){destroyNative?.();destroyNative=null;command=null;ready=false;ids=null;records.clear();catalogs.clear();payloads.clear();models.clear();}
 };
 globalThis.VeldrenAssets=Object.freeze(assets);
})();
