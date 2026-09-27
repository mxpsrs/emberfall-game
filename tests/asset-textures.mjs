import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-textures-'));
const source=fs.readFileSync('dist/vendor/filament/filament.js','utf8').replace('Filament = Object.assign(module, Filament);','Filament = Object.assign(module, Filament);globalThis.__VELDREN_TEXTURE_FILAMENT__=Filament;');
fs.writeFileSync(path.join(temporary,'filament.cjs'),source);
fs.copyFileSync('dist/vendor/filament/filament.wasm',path.join(temporary,'filament.wasm'));
global.window={};
try{
 const factory=createRequire(import.meta.url)(path.join(temporary,'filament.cjs'));
 await new Promise(resolve=>factory.init([],resolve));const F=global.__VELDREN_TEXTURE_FILAMENT__;
 for(const mode of ['runtime','editor']){
  let api;
  const {instance}=await WebAssembly.instantiate(fs.readFileSync('dist/native/veldren-core.wasm'),{
   env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit:code=>{throw Error('exit '+code);},environ_get:()=>0,
    environ_sizes_get:(a,b)=>{const memory=new DataView(api.memory.buffer);memory.setUint32(a,0,true);memory.setUint32(b,0,true);return 0;}}
  });api=instance.exports;api._initialize();assert.equal(typeof api.veldren_texture_create,'function','rebuilt WASM includes native texture exports');
  const context={VELDREN_CONTEXT:mode,TextEncoder,TextDecoder,Uint8Array,AbortController,Filament:F,realmAssetURL:p=>p,
   fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('dist/assets/asset-registry.json','utf8'))})};
  vm.createContext(context);
  for(const file of ['asset-runtime','asset-textures'])vm.runInContext(fs.readFileSync('dist/'+file+'.js','utf8'),context);
  const assets=context.VeldrenAssets;await assets.initialize(api);
  const engine=F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig());
  const pool=context.createVeldrenTextureResources(engine,assets,F);
  for(const file of fs.readdirSync('dist/materials').filter(name=>/^veldren-pbr-.*\.filamat$/.test(name))){
   const material=engine.createMaterial(new Uint8Array(fs.readFileSync('dist/materials/'+file)));assert(material);const instance=material.createInstance();engine.destroyMaterialInstance(instance);engine.destroyMaterial(material);
  }
  const files=fs.readdirSync('dist/assets/canonical/images');assert.equal(files.length,34);
  for(const file of files){
   const bytes=new Uint8Array(fs.readFileSync('dist/assets/canonical/images/'+file));
   const settings={sourceHash:path.parse(file).name,colorSpace:'srgb',maxDimension:64};
   const leases=Array.from({length:10},()=>pool.acquire(bytes,settings));
   assert(leases.every(value=>value.texture===leases[0].texture));assert.equal(pool.diagnostics().textures,1);assert.equal(pool.diagnostics().leases,10);
   assert.equal(leases[0].texture.getWidth(engine),leases[0].info.levels[0].width);
   const linear=pool.acquire(bytes,{...settings,colorSpace:'linear'});assert.notEqual(linear.texture,leases[0].texture);assert.equal(pool.diagnostics().textures,2);
   linear.release();for(const lease of leases){lease.release();lease.release();}
   assert.equal(pool.diagnostics().gpuBytes,0);assert.equal(pool.diagnostics().textures,0);assert.equal(pool.diagnostics().leases,0);
  }
  const bytes=new Uint8Array(fs.readFileSync('dist/assets/canonical/images/'+files[0]));
  const cpu=assets.processTexture(bytes,{maxDimension:64});const handle=cpu.handle;
  const same=assets.processTexture(bytes,{maxDimension:64});assert.equal(same.handle,handle);cpu.release();assert(same.level(0).length>0);same.release();
  assert.equal(api.veldren_texture_size(handle,0),0);assert.throws(()=>cpu.level(0));
  assert.throws(()=>assets.processTexture(bytes,{sourceHash:'wrong'}),/hash mismatch/);
  assert.throws(()=>assets.processTexture(bytes,{role:'normal',colorSpace:'srgb'}),/settings/);
  const original=F.Texture.prototype.setImage;F.Texture.prototype.setImage=function(){throw Error('injected upload failure');};
  assert.throws(()=>pool.acquire(bytes,{maxDimension:64}),/injected upload failure/);assert.equal(pool.diagnostics().textures,0);
  F.Texture.prototype.setImage=original;
  for(let cycle=0;cycle<100;cycle++){const a=pool.acquire(bytes,{maxDimension:32}),b=pool.acquire(bytes,{maxDimension:32});a.release();b.release();assert.equal(pool.diagnostics().gpuBytes,0);}
  pool.acquire(bytes,{maxDimension:64});assets.destroy();assert.equal(pool.diagnostics().textures,0);assert.equal(pool.diagnostics().leases,0);assert.throws(()=>pool.acquire(bytes,{}),/destroyed/);pool.destroy();
  F.Engine.destroy(engine);
  console.log('PASS: '+mode+' actual C++ WASM + Filament 1.77 NOOP: six PBR binaries, 34 textures, shared GPU handles, color variants, failure cleanup, 100 unload cycles, complete teardown.');
 }
}finally{fs.rmSync(temporary,{recursive:true,force:true});delete global.window;delete global.__VELDREN_TEXTURE_FILAMENT__;}
