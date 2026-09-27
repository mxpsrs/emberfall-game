'use strict';
// IO and Filament handles only. Native material plans own shading, sampler,
// UV transforms, defaults, texture variants and resource identity.
function createVeldrenMaterialResources(engine,assets,textures,filament=Filament,loadBytes=async(path,signal)=>{
 const response=await fetch(realmAssetURL(path),{signal});
 if(!response.ok)throw Error('Material resource unavailable: '+path);
 return new Uint8Array(await response.arrayBuffer());
}){
 const entries=new Map(),shaders=new Map(),leases=new Set();let disposed=false;
 const unsubscribe=assets.onDispose(destroy);
 const aborted=()=>Object.assign(Error('Material request retired'),{name:'AbortError'});
 function shader(path){
  let entry=shaders.get(path);
  if(!entry){
   entry={users:0,controller:new AbortController(),material:null};shaders.set(path,entry);
   const current=entry;
   current.ready=Promise.resolve().then(()=>loadBytes(path,current.controller.signal)).then(bytes=>{
    if(disposed||current.controller.signal.aborted)throw aborted();
    return current.material=engine.createMaterial(bytes);
   });
  }
  entry.users++;let closed=false;
  return {ready:entry.ready,release(){
   if(closed)return;closed=true;
   if(--entry.users===0){entry.controller.abort();if(shaders.get(path)===entry)shaders.delete(path);if(entry.material)engine.destroyMaterial(entry.material);}
  }};
 }
 function cleanup(entry){
  if(entry.cleaned)return;entry.cleaned=true;
  if(entry.instance)engine.destroyMaterialInstance(entry.instance);
  for(const lease of entry.textures)lease.release();entry.textures=[];
  entry.shader?.release();
 }
 async function build(entry){
  const signal=entry.controller.signal,check=()=>{if(disposed||signal.aborted)throw aborted();};
  try{
   check();entry.shader=shader(entry.plan.shader);const material=await entry.shader.ready;check();
   for(const binding of entry.plan.textures){
    const bytes=binding.encoded?Uint8Array.from(atob(binding.encoded),c=>c.charCodeAt(0)):await loadBytes(binding.path,signal);check();
    entry.textures.push(textures.acquire(bytes,binding.processing));
   }
   check();const instance=entry.instance=material.createInstance();
   for(const [key,value] of Object.entries(entry.plan.floats))instance.setFloatParameter(key,value);
   for(const [key,value] of Object.entries(entry.plan.float3))instance.setFloat3Parameter(key,value);
   for(const [key,value] of Object.entries(entry.plan.float4))instance.setFloat4Parameter(key,value);
   for(const [key,value] of Object.entries(entry.plan.mat3))instance.setMat3Parameter(key,value);
   instance.setDoubleSided(entry.plan.doubleSided);
   instance.setCullingMode(entry.plan.doubleSided?filament.CullingMode.NONE:filament.CullingMode.BACK);
   if(entry.plan.alphaMode==='MASK')instance.setMaskThreshold(entry.plan.alphaCutoff);
   for(let i=0;i<entry.plan.textures.length;i++){
    const binding=entry.plan.textures[i],s=binding.sampler;
    if(s.wrapS!==s.wrapT)throw Error('Filament 1.77 JS binding cannot represent independent texture wrap modes');
    const sampler=new filament.TextureSampler(filament.MinFilter[s.min],filament.MagFilter[s.mag],filament.WrapMode[s.wrapS]);
    try{
     sampler.setAnisotropy(s.anisotropy);
     instance.setTextureParameter(binding.uniform,entry.textures[i].texture,sampler);
    }finally{sampler.delete();}
   }
   return instance;
  }catch(error){cleanup(entry);throw error;}
 }
 function release(lease){
  if(lease.closed)return;lease.closed=true;leases.delete(lease);
  const entry=lease.entry;
  if(--entry.users===0){
   if(entries.get(entry.plan.key)===entry)entries.delete(entry.plan.key);
   entry.controller.abort();cleanup(entry);
  }
  assets.release(lease.id);
  for(const id of [lease.id,...assets.dependencies(lease.id)])if(assets.record(id).loadState==='pending release')assets.state(id,'unloaded');
 }
 function acquire(id,profile){
  if(disposed)throw Error('Material resource owner destroyed');
  const plan=assets.materialPlan(id,profile);assets.acquire(id);
  let entry=entries.get(plan.key);
  if(!entry){
   entry={plan,users:0,textures:[],shader:null,instance:null,cleaned:false,controller:new AbortController()};entries.set(plan.key,entry);
   const signal=entry.controller.signal;let onAbort;
   const cancelled=new Promise((resolve,reject)=>{onAbort=()=>reject(aborted());signal.addEventListener('abort',onAbort,{once:true});});
   entry.ready=Promise.race([Promise.resolve().then(()=>build(entry)),cancelled]).finally(()=>signal.removeEventListener('abort',onAbort));
  }
  entry.users++;const lease={id,entry,closed:false};leases.add(lease);
  const ready=entry.ready.then(instance=>{
   if(lease.closed||disposed||assets.record(id).generation!==plan.generation)throw aborted();
   for(const key of [id,...assets.dependencies(id)])if(assets.record(key).loadState==='loading')assets.state(key,'loaded');
   return instance;
  }).catch(error=>{release(lease);throw error;});
  return Object.freeze({id,key:plan.key,ready,release:()=>release(lease)});
 }
 function destroy(){if(disposed)return;disposed=true;unsubscribe();for(const lease of [...leases])release(lease);}
 return Object.freeze({acquire,destroy,diagnostics:()=>({materials:entries.size,shaders:shaders.size,leases:leases.size})});
}
