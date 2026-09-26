import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const wasm=fs.readFileSync('dist/native/veldren-core.wasm'),manifest=JSON.parse(fs.readFileSync('dist/assets/asset-registry.json','utf8'));
const packed=JSON.parse(fs.readFileSync('dist/assets/realms/models.js','utf8').replace(/^[^=]*=/,'').replace(/;\s*$/,''));
for(const mode of ['runtime','editor']){
 const calls=[],events={};const context={VELDREN_CONTEXT:mode,addEventListener:(event,fn)=>events[event]=fn,TextEncoder,TextDecoder,DataView,Uint8Array,Float32Array,Map,Set,atob,realmAssetURL:p=>p,
  fetch:async path=>({ok:true,status:200,json:async()=>manifest,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),
  WebAssembly:{async instantiate(...args){const r=await WebAssembly.instantiate(...args);return {instance:{exports:Object.fromEntries(Object.entries(r.instance.exports).map(([name,value])=>[name,typeof value==='function'?(...args)=>{calls.push(name);return value(...args)}:value]))}}}}};
 context.window=context;vm.createContext(context);
 for(const name of ['asset-runtime','native-runtime'])vm.runInContext(fs.readFileSync('dist/'+name+'.js','utf8'),context,{filename:name});
 const native=await context.realmNativeReady,assets=context.VeldrenAssets;assert(assets.ready);assert.equal(assets.diagnostics().records,manifest.records.length);
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
 assert(assets.dependencies(wall).includes('texture:atlas-filament'));assert(assets.dependents('texture:atlas-filament').includes(wall));
 for(let i=0;i<100;i++)assets.acquire(wall);
 assert.equal(assets.record('texture:atlas-filament').users,100);assets.state('texture:atlas-filament','loaded');
 for(let i=0;i<100;i++)assets.release(wall);
 assert.equal(assets.record('texture:atlas-filament').loadState,'pending release');assets.state('texture:atlas-filament','unloaded');
 assert.equal(assets.diagnostics().dependencyLeases,0);assert.throws(()=>assets.release(wall));
 const entity={id:'test:wall',name:'Real Quaternius wall',parent:null,active:true,transform:{position:[2,0,3],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:wall}},metadata:{}};
 assert(native.scenes.upsert('test',entity));const saved=native.scenes.serialize();assert(native.scenes.load(saved));assert.equal(native.scenes.entity('test',entity.id).components.MeshRenderer.asset,wall);
 assets.invalidate('texture:atlas-filament');assert.equal(assets.record(wall).generation,2);
 native.destroy();assert(!assets.ready);assert.equal(calls.filter(n=>n==='veldren_assets_destroy').length,1);
 console.log('PASS: '+mode+' actual-WASM registry, real modular mesh resolution, scene stable IDs, cached reads, dependencies, 100 leases, release and teardown.');
}
