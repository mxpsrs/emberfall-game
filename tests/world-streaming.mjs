import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';

// Exercise the actual native scheduler, Phase 2 leases and Filament allocations.
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-streaming-'));
const source=fs.readFileSync('dist/vendor/filament/filament.js','utf8').replace('Filament = Object.assign(module, Filament);','Filament = Object.assign(module, Filament);globalThis.__VELDREN_TEST_FILAMENT__=Filament;');
fs.writeFileSync(path.join(temporary,'filament.cjs'),source);fs.copyFileSync('dist/vendor/filament/filament.wasm',path.join(temporary,'filament.wasm'));global.window={};
try{
 const factory=createRequire(import.meta.url)(path.join(temporary,'filament.cjs'));await new Promise(resolve=>factory.init([],resolve));const F=global.__VELDREN_TEST_FILAMENT__;
 const context={console,TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,Float32Array,DataView,WebAssembly,AbortController,URL,atob,Filament:F,realmAssetURL:p=>p,VELDREN_CONTEXT:'editor',addEventListener(){},fetch:async p=>{const bytes=fs.readFileSync('dist/'+String(p).replace(/^\//,''));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes.toString())};}};
 context.window=context;vm.createContext(context);
 for(const file of ['asset-runtime','native-runtime','world-performance','asset-textures','asset-materials','asset-meshes','asset-draws','editor/selection'])vm.runInContext(fs.readFileSync('dist/'+file+'.js','utf8'),context);
 const native=await context.realmNativeReady,n=native.scenes,assets=context.VeldrenAssets;context.realmNative=native;await assets.ready;
 const engine=F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig()),scene=engine.createScene();
 const textures=context.createVeldrenTextureResources(engine,assets,F),materials=context.createVeldrenMaterialResources(engine,assets,textures,F,async p=>new Uint8Array(fs.readFileSync('dist/'+p))),models=context.createVeldrenModelResources(engine,assets,materials,F);
 const ids=assets.list('model').filter(id=>id.startsWith('rebuilt:Wall_')&&assets.record(id).importSettings?.importer==='veldren-gltf-1').slice(0,6);assert.equal(ids.length,6);
 const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 for(let i=0;i<ids.length;i++)n.upsert('stream',{id:'entity:'+i,name:'Stream '+i,parent:null,active:true,transform:{position:[i*32,0,0],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:ids[i],renderPath:'canonical'}},metadata:{}});
 const original=n.serialize();let inFlight=0,maximum=0,acquisitions=0;
 const tracked={acquire(...args){const lease=models.acquire(...args);++acquisitions;maximum=Math.max(maximum,++inFlight);return {ready:lease.ready.finally(()=>--inFlight),release:()=>lease.release()};}};
 const streaming=context.createVeldrenWorldStreaming(n,assets,tracked,'browser-mobile'),draws=context.createVeldrenAssetDraws(engine,scene,assets,models,'browser-mobile',F,streaming);
 context.VeldrenEditorSelection=context.createVeldrenSelection({native:n,scene:()=> 'stream',assets});
 const frame=(wanted=ids)=>{streaming.begin('stream');draws.begin('stream');let shown=0;for(const id of wanted)if(draws.submit(id,matrix,0,null,'instance:'+id))shown++;draws.end();streaming.end([5000,0,5000],0);return shown;};
 const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
 const settle=async(wanted=ids)=>{for(let i=0;i<200;i++){const shown=frame(wanted);if(shown===wanted.length&&streaming.pending()===0)return;await tick();}throw Error('Stream did not settle: '+JSON.stringify(streaming.diagnostics()));};
 frame();assert.equal(streaming.diagnostics().loading,2);assert.equal(acquisitions,2);assert.equal(streaming.diagnostics().queued,4);
 frame([]);assert.equal(models.diagnostics().leases,0);await tick();frame([]);assert.equal(streaming.diagnostics().resident,0);assert.equal(streaming.diagnostics().tracked,0);
 await settle();assert(maximum<=2);assert.equal(streaming.diagnostics().resident,6);assert.equal(models.diagnostics().models,6);assert(scene.getRenderableCount()>0);
 const nativePerformance=n.performance;let scheduled=0;n.performance=function(scene,request){if(request.op==='streaming')scheduled++;return nativePerformance.call(this,scene,request);};
 for(let i=0;i<8;i++)frame();assert.equal(scheduled,0,'settled unchanged demand skips repeated native scheduler marshalling');
 const acquired=acquisitions;for(let i=0;i<5;i++)frame([...ids].reverse());assert.equal(acquisitions,acquired);assert.equal(models.diagnostics().models,6);
 // Selection pins retain their existing resource even outside camera cells.
 context.VeldrenEditorSelection.select('entity:5');for(let i=0;i<40;i++)frame([]);assert.equal(streaming.diagnostics().resident,1);assert.equal(models.diagnostics().models,1);assert.deepEqual(Array.from(context.VeldrenEditorSelection.ids),['entity:5']);
 n.command('stream',{operations:[{op:'transform',id:'entity:5',transform:{position:[900,0,0]}}]});frame([]);n.command('stream',{action:'undo'});frame([]);assert.deepEqual(n.serialize(),original);
 context.VeldrenEditorSelection.select(null);for(let i=0;i<40;i++)frame([]);assert.equal(streaming.diagnostics().tracked,0);assert.equal(models.diagnostics().gpuBytes,0);assert.equal(assets.diagnostics().dependencyLeases,0);
 await settle([ids[0]]);assets.invalidate(ids[0]);await settle([ids[0]]);assert.equal(streaming.diagnostics().failed,0);
 // Same-definition reload still releases IO handles, so an epoch must regrant.
 const manifest=JSON.parse(fs.readFileSync('dist/assets/asset-registry.json','utf8'));assets.reload(manifest);await settle([ids[0]]);assert.equal(streaming.diagnostics().resident,1);
 n.load(original);await settle([ids[0]]);assert.equal(streaming.diagnostics().resident,1);assert.deepEqual(n.serialize(),original);
 // Cell unload/reload never acquires a new canonical entity or history entry.
 for(let lap=0;lap<12;lap++){await settle([ids[lap%ids.length]]);for(let i=0;i<35;i++)frame([]);assert.equal(streaming.diagnostics().tracked,0);assert.equal(models.diagnostics().gpuBytes,0);}
 assert.deepEqual(n.serialize(),original);streaming.destroy();draws.destroy();
 let retryNow=0,attempts=0,permanent=false;const reports=[];context.performance={now:()=>retryNow};context.realmReportRuntimeFailure=(error,stage)=>reports.push({message:error.message,stage});
 const flaky={acquire(...args){attempts++;const lease=models.acquire(...args),fail=permanent||attempts===1;return {ready:lease.ready.then(value=>{if(fail){lease.release();throw Error('injected transient model failure');}return value;}),release:()=>lease.release()};}};
 const recovery=context.createVeldrenWorldStreaming(n,assets,flaky,'browser-mobile'),recoveryDraws=context.createVeldrenAssetDraws(engine,scene,assets,models,'browser-mobile',F,recovery);
 const recoveryFrame=()=>{recovery.begin('stream');recoveryDraws.begin('stream');const visible=recoveryDraws.submit(ids[0],matrix,0,null,'recovering-instance');recoveryDraws.end();recovery.end([5000,0,5000],0);return visible;};
 recoveryFrame();for(let i=0;i<100&&!recovery.diagnostics().retrying;i++){await tick();assert.doesNotThrow(recoveryFrame);}
 assert.equal(recovery.diagnostics().retrying,1);assert.equal(attempts,1);assert.equal(reports.length,1);assert.equal(reports[0].stage,'asset-stream');assert.equal(models.diagnostics().gpuBytes,0,'failed preparation releases its allocation');
 for(let i=0;i<5;i++)assert.doesNotThrow(recoveryFrame);assert.equal(attempts,1,'the retry delay prevents per-frame fetch churn');
 retryNow=500;for(let i=0;i<150;i++){if(recoveryFrame()&&!recovery.pending())break;await tick();}
 assert(recoveryFrame(),'the complete canonical instance replaces the fallback after retry');assert.equal(attempts,2);assert.equal(recovery.diagnostics().failed,0);assert.equal(recovery.diagnostics().resident,1);
 recovery.destroy();recoveryDraws.destroy();assert.equal(models.diagnostics().gpuBytes,0);
 permanent=true;attempts=0;const blocked=context.createVeldrenWorldStreaming(n,assets,flaky,'browser-mobile');
 const blockedFrame=()=>{blocked.begin('stream');blocked.want(ids[0],matrix,null,'blocked-instance');blocked.end([5000,0,5000],0);};
 for(let i=0;i<150&&!blocked.diagnostics()?.failed;i++){retryNow+=500;assert.doesNotThrow(blockedFrame);await tick();}
 assert.equal(blocked.diagnostics().failed,1);assert.equal(attempts,3,'a permanently failed asset has a bounded retry count');for(let i=0;i<10;i++){retryNow+=1000;assert.doesNotThrow(blockedFrame);}assert.equal(attempts,3);
 blocked.destroy();assert.deepEqual(n.serialize(),original);context.VeldrenEditorSelection.destroy();native.destroy();assert.equal(models.diagnostics().gpuBytes,0);assert.equal(materials.diagnostics().materials,0);assert.equal(textures.diagnostics().gpuBytes,0);engine.destroyScene(scene);F.Engine.destroy(engine);
 console.log('PASS: actual WASM/Filament scheduling, bounded mobile loading, cancellation, editor pins/undo, invalidation/reload, travel, transient retry, bounded permanent failure and complete release.');
}finally{fs.rmSync(temporary,{recursive:true,force:true});delete global.window;delete global.__VELDREN_TEST_FILAMENT__;}
