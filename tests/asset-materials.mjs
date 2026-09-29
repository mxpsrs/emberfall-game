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
  const testRegistry=JSON.parse(fs.readFileSync('dist/assets/asset-registry.json','utf8'));
  const seed=testRegistry.records.find(r=>r.id==='rebuilt:Wall_Plaster_Straight/material/default');
  for(const unlit of [false,true])for(const alphaMode of ['OPAQUE','MASK','BLEND']){
   const record=structuredClone(seed);record.id='test:material/'+unlit+'/'+alphaMode;record.name='Material test';record.material.id=record.id;
   record.material.unlit=unlit;record.material.alphaMode=alphaMode;record.material.alphaCutoff=.3;testRegistry.records.push(record);
  }
  const context={VELDREN_CONTEXT:mode,TextEncoder,TextDecoder,Uint8Array,AbortController,atob,Filament:F,realmAssetURL:p=>p,
   fetch:async()=>({ok:true,json:async()=>testRegistry})};
  vm.createContext(context);
  for(const file of ['asset-runtime','asset-textures','asset-materials'])vm.runInContext(fs.readFileSync('dist/'+file+'.js','utf8'),context);
  const assets=context.VeldrenAssets;await assets.initialize(api);
  const engine=F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig());
  const pool=context.createVeldrenTextureResources(engine,assets,F);
  const registry=JSON.parse(fs.readFileSync('dist/assets/asset-registry.json','utf8'));
  const definitions=registry.records.filter(r=>r.material);assert.equal(definitions.length,516);
  const keys=new Set();let plans=0;
  for(const record of definitions)for(const profile of ['browser-mobile','browser','desktop']){
   const plan=assets.materialPlan(record.id,profile);plans++;keys.add(plan.key);
   assert.equal(plan.textures.length,5);assert.equal(plan.asset,record.id);assert.equal(plan.generation,1);
   assert(plan.shader.endsWith('-'+record.material.alphaMode.toLowerCase()+'.filamat'));
   assert.equal(plan.doubleSided,record.material.doubleSided);
   assert.deepEqual(Array.from(plan.float4.baseFactor),record.material.baseColorFactor);
   assert.equal(plan.floats.normalScale,record.material.normalTexture?.scale??0);
  }
  const loadCounts=new Map();
  const loader=async path=>{loadCounts.set(path,(loadCounts.get(path)||0)+1);return new Uint8Array(fs.readFileSync('dist/'+path));};
  const materials=context.createVeldrenMaterialResources(engine,assets,pool,F,loader);
  for(const record of testRegistry.records.filter(r=>r.id.startsWith('test:material/'))){
   const lease=materials.acquire(record.id,'browser');await lease.ready;lease.release();
   assert.equal(materials.diagnostics().materials,0);assert.equal(pool.diagnostics().textures,0);
  }
  const plain=definitions.filter(r=>!Object.values(r.material).some(v=>v?.image));
  const id=plain.find(r=>r.material.alphaMode==='OPAQUE').id;
  const batch=Array.from({length:100},()=>materials.acquire(id,'browser'));
  const instances=await Promise.all(batch.map(x=>x.ready));assert(instances.every(x=>x===instances[0]));
  assert.equal(materials.diagnostics().materials,1);assert.equal(materials.diagnostics().shaders,1);
  assert.equal(assets.record(id).users,100);
  for(const lease of batch){lease.release();lease.release();}
  assert.equal(materials.diagnostics().materials,0);assert.equal(pool.diagnostics().textures,0);assert.equal(assets.diagnostics().dependencyLeases,0);
  const checked=new Set();
  for(const record of definitions){
   const plan=assets.materialPlan(record.id,'browser-mobile');
   if(checked.has(plan.key)||plan.textures.some(t=>t.path&&!fs.existsSync('dist/'+t.path)))continue;
   checked.add(plan.key);const lease=materials.acquire(record.id,'browser-mobile');await lease.ready;lease.release();
   assert.equal(materials.diagnostics().materials,0);assert.equal(materials.diagnostics().shaders,0);assert.equal(pool.diagnostics().gpuBytes,0);
  }
  assert(checked.size>20,'real distinct textured and transparent materials tested');
  const original=F.Material.prototype.createInstance;F.Material.prototype.createInstance=function(){throw Error('injected material allocation failure');};
  const failed=materials.acquire(id,'browser');await assert.rejects(failed.ready,/injected/);assert.equal(pool.diagnostics().textures,0);assert.equal(assets.diagnostics().dependencyLeases,0);F.Material.prototype.createInstance=original;
  const pending=materials.acquire(id,'browser');pending.release();await assert.rejects(pending.ready,{name:'AbortError'});
  for(let i=0;i<30;i++){const lease=materials.acquire(id,'browser');await lease.ready;lease.release();}
  materials.destroy();assert.throws(()=>materials.acquire(id,'browser'),/destroyed/);
  let resume;const blocked=context.createVeldrenMaterialResources(engine,assets,pool,F,()=>new Promise(resolve=>{resume=resolve;}));
  const late=blocked.acquire(id,'browser');await new Promise(resolve=>setTimeout(resolve,0));assets.destroy();await assert.rejects(late.ready,{name:'AbortError'});
  resume(new Uint8Array(fs.readFileSync('dist/'+assetsPlanShader(registry,id))));await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(blocked.diagnostics().materials,0);assert.equal(blocked.diagnostics().shaders,0);assert.equal(pool.diagnostics().textures,0);F.Engine.destroy(engine);
  console.log('PASS: '+mode+' '+plans+' native material plans, '+checked.size+' distinct real GPU materials, 100 shared leases, failure/cancellation/late completion, repeated unload and teardown.');
 }
 function assetsPlanShader(registry,id){const m=registry.records.find(r=>r.id===id).material;return 'materials/veldren-pbr-'+(m.unlit?'unlit':'lit')+'-'+m.alphaMode.toLowerCase()+'.filamat';}
}finally{fs.rmSync(temporary,{recursive:true,force:true});delete global.window;delete global.__VELDREN_TEXTURE_FILAMENT__;}
