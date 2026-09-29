import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const wasm=fs.readFileSync('dist/native/veldren-core.wasm'),manifest=JSON.parse(fs.readFileSync('dist/assets/asset-registry.json','utf8'));
const packed=JSON.parse(fs.readFileSync('dist/assets/realms/models.js','utf8').replace(/^[^=]*=/,'').replace(/;\s*$/,''));
for(const mode of ['runtime','editor']){
 const calls=[],events={};const context={VELDREN_CONTEXT:mode,addEventListener:(event,fn)=>events[event]=fn,TextEncoder,TextDecoder,DataView,Uint8Array,Float32Array,Map,Set,atob,AbortController,realmAssetURL:p=>p,
  fetch:async path=>({ok:true,status:200,json:async()=>path==='assets/asset-registry.json'?manifest:JSON.parse(fs.readFileSync('dist/'+path,'utf8')),arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),
  WebAssembly:{async instantiate(...args){const r=await WebAssembly.instantiate(...args);return {instance:{exports:Object.fromEntries(Object.entries(r.instance.exports).map(([name,value])=>[name,typeof value==='function'?(...args)=>{calls.push(name);return value(...args)}:value]))}}}}};
 context.window=context;vm.createContext(context);
 for(const name of ['asset-runtime','native-runtime'])vm.runInContext(fs.readFileSync('dist/'+name+'.js','utf8'),context,{filename:name});
 const native=await context.realmNativeReady,assets=context.VeldrenAssets;assert(assets.ready);assert.equal(assets.diagnostics().records,manifest.records.length);
 // Every registered profile must resolve through the actual native command.
 let variants=0;
 for(const record of manifest.records)for(const [profile,entries] of Object.entries(record.variants||{}))for(const entry of entries){
  const variant=assets.textureVariant(record.id,profile,entry.settings);
  assert.equal(variant.derivedPath,entry.derivedPath);
  assert.equal(variant.processing.sourceHash,entry.derivedHash);
  assert.equal(variant.processing.maxDimension,profile==='desktop'?8192:profile==='browser'?512:256);
  assert(Object.isFrozen(variant.processing));variants++;
 }
 assert.equal(variants,845*3);
 const canonical=manifest.records.find(r=>r.variants);
 assert.throws(()=>assets.textureVariant(canonical.id,'unknown',{role:'baseColor',colorSpace:'srgb'}));
 assert.throws(()=>assets.textureVariant(canonical.id,'browser',{role:'missing',colorSpace:'srgb'}));
 assert(assets.list('texture').length>=10);assert(assets.list('animation').length>100);
 const wall='rebuilt:Wall_Plaster_Straight',mesh=packed.models.Wall_Plaster_Straight;
 const realMesh={bounds:mesh.bounds,p:Buffer.from(mesh.p,'base64'),i:Buffer.from(mesh.i,'base64')};
 assets.bindLegacy('rebuilt',{Wall_Plaster_Straight:realMesh});context.VeldrenAssembly={};
 vm.runInContext(fs.readFileSync('dist/building-runtime.js','utf8'),context);
 assert.equal(context.VeldrenBuildings.model(wall),realMesh);assert.equal(context.VeldrenBuildings.model('captured:faces'),null);
 const before=calls.filter(n=>n==='veldren_assets_command').length;
 for(let i=0;i<1000;i++)assert.equal(context.VeldrenBuildings.model(wall),realMesh);
 assert.equal(calls.filter(n=>n==='veldren_assets_command').length,before,'render resolution does not scan or cross WASM every frame');
 assert(Object.isFrozen(assets.record(wall).bounds[0]));assert.throws(()=>assets.record('missing:id'));
 const texture=assets.dependencies(wall).find(id=>assets.record(id).type==='texture');assert(texture);assert(assets.dependents(texture).includes(wall));
 for(let i=0;i<100;i++)assets.acquire(wall);
 assert.equal(assets.record(texture).users,100);assets.state(texture,'loaded');
 for(let i=0;i<100;i++)assets.release(wall);
 assert.equal(assets.record(texture).loadState,'pending release');assets.state(texture,'unloaded');
 assert.equal(assets.diagnostics().dependencyLeases,0);assert.throws(()=>assets.release(wall));
 const entity={id:'test:wall',name:'Real Quaternius wall',parent:null,active:true,transform:{position:[2,0,3],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:wall}},metadata:{}};
 assert(native.scenes.upsert('test',entity));const saved=native.scenes.serialize();assert(native.scenes.load(saved));assert.equal(native.scenes.entity('test',entity.id).components.MeshRenderer.asset,wall);
 if(assets.record(wall).importSettings.importer==='veldren-gltf-1'){
  const loaded=await Promise.all(Array.from({length:100},()=>assets.loadModel(wall)));
  assert(loaded.every(m=>m===loaded[0]));assert.equal(loaded[0].format,'veldren.model');assert(loaded[0].meshes[0].primitives.length>0);
  assert.equal(assets.record(wall).users,100);assert.equal(assets.record(wall).loadState,'loaded');
  for(let i=0;i<100;i++)assets.releaseModel(wall);
  assert.equal(assets.record(wall).loadState,'unloaded');assert.equal(assets.diagnostics().dependencyLeases,0);
 }
 assets.invalidate(texture);assert.equal(assets.record(wall).generation,2);
 // Reimport invalidates the changed dependency's model without editing Scene IDs.
 const generation=assets.record(wall).generation,live=assets.leaseModel(wall);await live.ready;
 const broken=structuredClone(manifest);broken.records.push(broken.records[0]);
 assert.throws(()=>assets.reload(broken));assert.equal(assets.record(wall).generation,generation);assert.equal(assets.record(wall).users,1);
 const updated=structuredClone(manifest);updated.records.find(r=>r.id===texture).name+=' reimported';
 let notices=0;const unsubscribe=assets.onReload(()=>notices++);assets.reload(updated);assert.equal(notices,1);unsubscribe();
 assert.equal(assets.record(wall).generation,generation+1);assert.equal(assets.record(wall).users,1);live.release();
 assert.deepEqual(native.scenes.serialize(),saved,'asset reload leaves persisted Scene content unchanged');
 const next=assets.leaseModel(wall);await next.ready;next.release();assert.equal(assets.diagnostics().dependencyLeases,0);
 const lower=updated.records.find(r=>r.type==='model'&&r.id!==wall&&!r.dependencies?.includes(wall)).id;
 updated.records.find(r=>r.id===wall).lods=[{level:0,asset:wall,threshold:0},{level:1,asset:lower,threshold:25}];
 assets.reload(updated);assert.equal(assets.lod(wall,24.99).asset,wall);assert.equal(assets.lod(wall,25).asset,lower);assert(assets.dependencies(wall).includes(lower));
 assert.throws(()=>assets.lod(wall,-1));const invalidLOD=structuredClone(updated);invalidLOD.records.find(r=>r.id===wall).lods[1].threshold=0;
 assert.throws(()=>assets.reload(invalidLOD));assert.equal(assets.lod(wall,100).asset,lower);
 native.destroy();assert(!assets.ready);assert.equal(calls.filter(n=>n==='veldren_assets_destroy').length,1);
 console.log('PASS: '+mode+' actual-WASM registry, real modular mesh resolution, scene stable IDs, cached reads, dependencies, 100 leases, release and teardown.');
}
