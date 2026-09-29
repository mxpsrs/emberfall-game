import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const manifest=JSON.parse(fs.readFileSync('dist/assets/asset-registry.json','utf8'));
const wall='rebuilt:Wall_Plaster_Straight';
const definition=manifest.records.find(record=>record.id===wall);
const model=JSON.parse(fs.readFileSync('dist/'+definition.derivedPath,'utf8'));
const wasm=fs.readFileSync('dist/native/veldren-core.wasm');
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const response=value=>({ok:true,json:async()=>value});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

for(const mode of ['runtime','editor']){
 let api,handler=async()=>response(structuredClone(model)),manifestHandler=async()=>response(manifest),fetches=0,commands=0,destroys=0;
 const {instance}=await WebAssembly.instantiate(wasm,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{
  proc_exit:code=>{throw Error('exit '+code);},environ_get:()=>0,
  environ_sizes_get:(a,b)=>{const memory=new DataView(api.memory.buffer);memory.setUint32(a,0,true);memory.setUint32(b,0,true);return 0;}
 }});
 api=instance.exports;api._initialize();
 const bridge={...api,veldren_assets_command:(...args)=>{commands++;return api.veldren_assets_command(...args);},veldren_assets_destroy:(...args)=>{destroys++;return api.veldren_assets_destroy(...args);}};
 const context={VELDREN_CONTEXT:mode,TextEncoder,TextDecoder,Uint8Array,AbortController,realmAssetURL:p=>p,
  fetch:(path,options)=>path==='assets/asset-registry.json'?manifestHandler(options):(fetches++,handler(options))};
 vm.createContext(context);vm.runInContext(fs.readFileSync('dist/asset-runtime.js','utf8'),context);
 const assets=context.VeldrenAssets;await assets.initialize(bridge);
 const empty=()=>{assert.equal(assets.diagnostics().dependencyLeases,0);assert.equal(assets.ioDiagnostics().leases,0);assert.equal(assets.ioDiagnostics().models,0);};
 const leases=Array.from({length:100},()=>assets.leaseModel(wall));
 const loaded=await Promise.all(leases.map(lease=>lease.ready));
 assert.equal(fetches,1);assert(loaded.every(value=>value===loaded[0]));
 leases[0].release();leases[0].release();assert.equal(assets.record(wall).users,99);
 for(const lease of leases)lease.release();empty();

 // A reverse dependency invalidation must replace the cached document while
 // callers holding an older immutable document may finish with their own lease.
 const old=assets.leaseModel(wall),oldDocument=await old.ready;
 const texture=assets.dependencies(wall).find(id=>assets.record(id).type==='texture');
 assets.invalidate(texture);
 const newer=assets.leaseModel(wall),newDocument=await newer.ready;
 assert.notEqual(oldDocument,newDocument);assert.equal(assets.record(wall).generation,2);
 old.release();assert.equal(assets.record(wall).users,1);assert.equal(assets.ioDiagnostics().models,1);
 newer.release();empty();

 // Cancel the last in-flight user, immediately reacquire, then allow the old
 // host request to finish despite its aborted signal. It cannot touch the new lease.
 let pending=defer(),signal;
 handler=options=>{signal=options.signal;return pending.promise;};
 const abandoned=assets.leaseModel(wall),abandonedResult=assert.rejects(abandoned.ready,{name:'AbortError'});
 await tick();abandoned.release();assert(signal.aborted);await abandonedResult;
 handler=async()=>response(structuredClone(model));
 const replacement=assets.leaseModel(wall);await replacement.ready;
 const callsBeforeLate=commands;pending.resolve(response(structuredClone(model)));await tick();
 assert.equal(commands,callsBeforeLate,'late IO performs no native writes');assert.equal(assets.record(wall).users,1);
 replacement.release();empty();

 // Shared failure unwinds the exact leases; retry is not poisoned by a failed cache.
 handler=async()=>({ok:false});
 const failures=await Promise.allSettled(Array.from({length:100},()=>assets.loadModel(wall)));
 assert(failures.every(value=>value.status==='rejected'));empty();
 handler=async()=>response(structuredClone(model));await assets.loadModel(wall);assets.releaseModel(wall);empty();

 pending=defer();handler=()=>pending.promise;
 const invalidated=assets.leaseModel(wall),invalidatedResult=assert.rejects(invalidated.ready,{name:'AbortError'});
 await tick();assets.invalidate(texture);await invalidatedResult;empty();
 pending.resolve(response(structuredClone(model)));await tick();empty();

 // Teardown during JSON decoding cannot mutate a newly initialized registry.
 const body=defer();handler=async()=>({ok:true,json:()=>body.promise});
 const ending=assets.leaseModel(wall),endingResult=assert.rejects(ending.ready,{name:'AbortError'});
 await tick();assets.destroy();assets.destroy();await endingResult;assert.equal(destroys,1);
 handler=async()=>response(structuredClone(model));await assets.initialize(bridge);
 const fresh=assets.leaseModel(wall);await fresh.ready;
 const callsBeforeBody=commands;body.resolve(structuredClone(model));await tick();assert.equal(commands,callsBeforeBody);
 ending.release();assert.equal(assets.record(wall).users,1);fresh.release();empty();

 // An old initialization must never load into, or destroy, a newer session.
 assets.destroy();const initial=defer();manifestHandler=()=>initial.promise;
 const obsolete=assert.rejects(assets.initialize(bridge),{name:'AbortError'});assets.destroy();
 manifestHandler=async()=>response(manifest);await assets.initialize(bridge);
 initial.resolve(response(manifest));await obsolete;assert(assets.ready);empty();

 for(let cycle=0;cycle<100;cycle++){
  const handles=Array.from({length:10},()=>assets.leaseModel(wall));
  await Promise.all(handles.map(handle=>handle.ready));
  for(const handle of handles)handle.release();empty();
 }
 assets.destroy();
 console.log('PASS: '+mode+' actual-WASM lifecycle: shared loads, exact leases, invalidation, cancel/reacquire, failures, late IO, teardown/reinitialize and 1,000 balanced stress leases.');
}
