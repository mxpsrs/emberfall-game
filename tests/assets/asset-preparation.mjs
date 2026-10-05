import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Worker} from 'node:worker_threads';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve('client'),records=JSON.parse(fs.readFileSync(root+'/assets/asset-registry.json')).records;
const definition=records.find(r=>r.id==='rebuilt:Wall_Plaster_Straight');
const workerSource=`
 const fs=require('node:fs'),vm=require('node:vm'),{parentPort,workerData}=require('node:worker_threads');
 global.self=global;global.postMessage=(data,transfer)=>parentPort.postMessage(data,transfer);
 global.fetch=async url=>{const path=workerData.root+new URL(url).pathname;const bytes=fs.readFileSync(path);return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes)};};
 global.importScripts=url=>vm.runInThisContext(fs.readFileSync(workerData.root+new URL(url).pathname,'utf8'));
 vm.runInThisContext(fs.readFileSync(workerData.root+'/asset-prepare-worker.js','utf8'));
 parentPort.on('message',data=>self.onmessage({data}));
`;
const worker=new Worker(workerSource,{eval:true,workerData:{root}});
try{
 const result=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage({op:'prepare',request:1,id:definition.id,sourceHash:definition.sourceHash,url:'http://fixture/'+definition.derivedPath,base:'http://fixture/',versions:{}});});
 assert.equal(result.error,undefined);assert.equal(result.plan.id,definition.id);
 assert(result.plan.geometry.length);for(const packet of result.plan.geometry){assert(packet.vertices instanceof Float32Array);assert(packet.indices instanceof Uint32Array);assert(packet.normals instanceof Float32Array);assert(packet.vertices.every(Number.isFinite));}
 const stale=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage({op:'prepare',request:2,id:definition.id,sourceHash:'invalid',url:'http://fixture/'+definition.derivedPath,base:'http://fixture/',versions:{}});});
 assert.match(stale.error,/Stale model/);
 console.log('PASS: background worker runs the canonical WASM planner, transfers typed geometry, and rejects stale source.');
}finally{await worker.terminate();}
// The browser coordinator must honor the editor viewport's base URL and keep
// exact native leases balanced across success, cancellation and invalidation.
const workers=[],urls=[];
class BrowserWorker{
 constructor(url){urls.push(url);this.worker=new Worker(workerSource,{eval:true,workerData:{root}});workers.push(this);this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',error=>this.onerror?.(error));}
 postMessage(data){this.worker.postMessage(data);}
 terminate(){return this.worker.terminate();}
}
let api;const {instance}=await WebAssembly.instantiate(fs.readFileSync(root+'/native/veldren-core.wasm'),{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{fd_close(){return 8;},proc_exit:code=>{throw Error('exit '+code);},environ_get:()=>0,environ_sizes_get:(a,b)=>{const memory=new DataView(api.memory.buffer);memory.setUint32(a,0,true);memory.setUint32(b,0,true);return 0;}}});api=instance.exports;api._initialize();
const context={Worker:BrowserWorker,URL,TextEncoder,TextDecoder,AbortController,location:{href:'http://fixture/editor/viewport.html'},document:{baseURI:'http://fixture/'},realmAssetURL:p=>p,fetch:async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(root+'/'+p))})};vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/asset-runtime.js','utf8'),context);
const assets=context.VeldrenAssets;
try{
 await assets.initialize(api);const lease=assets.leaseRenderPlan(definition.id),result=await lease.ready;assert.equal(result.id,definition.id);assert(result.geometry[0].vertices instanceof Float32Array);assert.equal(urls[0],'http://fixture/asset-prepare-worker.js');lease.release();assert.equal(assets.diagnostics().dependencyLeases,0);
 const cancelled=assets.leaseRenderPlan(definition.id);cancelled.release();await assert.rejects(cancelled.ready,{name:'AbortError'});assert.equal(assets.ioDiagnostics().preparation.pending,0);
 const stale=assets.leaseRenderPlan(definition.id);assets.invalidate(definition.id);await assert.rejects(stale.ready,{name:'AbortError'});assert.equal(assets.diagnostics().dependencyLeases,0);
 console.log('PASS: browser worker coordinator honors editor base URL, releases exact leases, cancels pending preparation and rejects invalidated generations.');
}finally{assets.destroy();await Promise.all(workers.map(w=>w.terminate()));}
