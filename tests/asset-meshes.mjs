import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-meshes-'));
const source=fs.readFileSync('dist/vendor/filament/filament.js','utf8').replace('Filament = Object.assign(module, Filament);','Filament = Object.assign(module, Filament);globalThis.__VELDREN_TEST_FILAMENT__=Filament;');
fs.writeFileSync(path.join(temporary,'filament.cjs'),source);fs.copyFileSync('dist/vendor/filament/filament.wasm',path.join(temporary,'filament.wasm'));global.window={};
try{
 const factory=createRequire(import.meta.url)(path.join(temporary,'filament.cjs'));await new Promise(resolve=>factory.init([],resolve));const F=global.__VELDREN_TEST_FILAMENT__;
 for(const mode of ['runtime','editor']){
  let api;const {instance}=await WebAssembly.instantiate(fs.readFileSync('dist/native/veldren-core.wasm'),{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit:code=>{throw Error('exit '+code);},environ_get:()=>0,environ_sizes_get:(a,b)=>{const m=new DataView(api.memory.buffer);m.setUint32(a,0,true);m.setUint32(b,0,true);return 0;}}});api=instance.exports;api._initialize();
  const context={TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,Float32Array,AbortController,atob,Filament:F,realmAssetURL:p=>p,fetch:async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('dist/'+p,'utf8'))})};vm.createContext(context);
  for(const file of ['asset-runtime','asset-textures','asset-materials','asset-meshes','asset-draws'])vm.runInContext(fs.readFileSync('dist/'+file+'.js','utf8'),context);
  const assets=context.VeldrenAssets;await assets.initialize(api);const engine=F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig()),scene=engine.createScene();
  const textures=context.createVeldrenTextureResources(engine,assets,F),materials=context.createVeldrenMaterialResources(engine,assets,textures,F,async p=>new Uint8Array(fs.readFileSync('dist/'+p))),models=context.createVeldrenModelResources(engine,assets,materials,F);
  const id='rebuilt:Wall_Plaster_Straight';const batch=Array.from({length:100},()=>models.acquire(id,'browser-mobile'));const values=await Promise.all(batch.map(l=>l.ready));assert(values.every(v=>v===values[0]));assert.equal(models.diagnostics().models,1);assert(models.diagnostics().geometry>0);
  const retained=models.diagnostics().gpuBytes;for(const lease of batch.slice(1))lease.release();assert.equal(models.diagnostics().gpuBytes,retained);batch[0].release();assert.equal(models.diagnostics().gpuBytes,0);assert.equal(textures.diagnostics().gpuBytes,0);assert.equal(assets.diagnostics().dependencyLeases,0);
  const draws=context.createVeldrenAssetDraws(engine,scene,assets,models,'browser-mobile',F),matrix=[1,0,0,0,0,1,0,0,0,0,1,0,3,2,4,1];
  draws.begin('one');assert.equal(draws.submit(id,matrix),false);draws.end();
  for(let n=0;n<100&&draws.diagnostics().loading;n++)await new Promise(resolve=>setTimeout(resolve,10));
  draws.begin('one');for(let i=0;i<100;i++)assert(draws.submit(id,matrix));draws.end();assert.equal(draws.diagnostics().instances,100);assert(scene.getRenderableCount()>=100);assert.equal(models.diagnostics().models,1);
  draws.begin('one');draws.submit(id,[...matrix.slice(0,12),5,2,4,1]);draws.end();assert.equal(draws.diagnostics().instances,9);assert(scene.getRenderableCount()<10);
  assets.invalidate(id);draws.begin('one');assert.equal(draws.submit(id,matrix),false);draws.end();
  draws.begin('two');draws.end();assert.equal(scene.getRenderableCount(),0);assert.equal(models.diagnostics().geometry,0);
  for(const name of [id,'rebuilt:Roof_RoundTiles_4x6','rebuilt:WindowShutters_Thin_Flat_Open','avatar:male','avatar:female','kenney:tree-oak']){
   if(!assets.has(name))continue;const lease=models.acquire(name,'browser-mobile');const model=await lease.ready;assert(model.plan.geometry.length>0);lease.release();assert.equal(models.diagnostics().gpuBytes,0);
  }
  draws.begin('rig');assert.equal(draws.submit('avatar:male',matrix),false);draws.end();
  for(let n=0;n<100&&draws.diagnostics().loading;n++)await new Promise(resolve=>setTimeout(resolve,10));
  draws.begin('rig');assert(draws.submit('avatar:male',matrix));draws.end();assert(scene.getRenderableCount()>0);
  draws.begin('empty');draws.end();assert.equal(scene.getRenderableCount(),0);assert.equal(models.diagnostics().gpuBytes,0);
  const original=F.VertexBuffer.Builder;F.VertexBuffer.Builder=()=>{throw Error('injected vertex allocation failure');};const bad=models.acquire(id,'browser');await assert.rejects(bad.ready,/injected/);F.VertexBuffer.Builder=original;assert.equal(models.diagnostics().gpuBytes,0);assert.equal(assets.diagnostics().dependencyLeases,0);
  for(let n=0;n<20;n++){const lease=models.acquire(id,'browser-mobile');await lease.ready;lease.release();}
  const cancelled=models.acquire(id,'browser');cancelled.release();await assert.rejects(cancelled.ready,{name:'AbortError'});
  const pending=models.acquire(id,'browser');assets.destroy();await assert.rejects(pending.ready,{name:'AbortError'});
  assert.equal(draws.diagnostics().instances,0);assert.equal(models.diagnostics().gpuBytes,0);assert.equal(materials.diagnostics().materials,0);assert.equal(textures.diagnostics().gpuBytes,0);engine.destroyScene(scene);F.Engine.destroy(engine);
  console.log('PASS: '+mode+' actual WASM / Filament geometry, native PBR, 100 shared models/instances, transform/deletion/Scene switch, invalidation, allocation failure, cancellation, 20 unload cycles and teardown.');
 }
}finally{fs.rmSync(temporary,{recursive:true,force:true});delete global.window;delete global.__VELDREN_TEST_FILAMENT__;}
