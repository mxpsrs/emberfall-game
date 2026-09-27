'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=async function initializeNativeAssets(context,root){
 let api;
 const {instance}=await WebAssembly.instantiate(fs.readFileSync(path.join(root,'dist/native/veldren-core.wasm')),{
  env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit:code=>{throw Error('exit '+code);},environ_get:()=>0,
   environ_sizes_get:(a,b)=>{const memory=new DataView(api.memory.buffer);memory.setUint32(a,0,true);memory.setUint32(b,0,true);return 0;}}
 });api=instance.exports;api._initialize();
 Object.assign(context,{TextEncoder,TextDecoder,Uint8Array,AbortController,realmAssetURL:p=>p,
  fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'dist/assets/asset-registry.json'),'utf8'))})});
 for(const name of ['asset-runtime','asset-textures'])vm.runInContext(fs.readFileSync(path.join(root,'dist/'+name+'.js'),'utf8'),context);
 await context.VeldrenAssets.initialize(api);return context.VeldrenAssets;
};
