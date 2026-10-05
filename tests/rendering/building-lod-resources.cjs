'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),os=require('node:os'),path=require('node:path'),{Worker}=require('node:worker_threads');
const root=path.resolve(__dirname,'../..');
class BrowserWorker{
 constructor(url){
  this.worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
   global.self=global;global.realmAssetURL=p=>new URL(p,'http://fixture/').href;
   const file=url=>path.join(workerData.root,'client',new URL(url,'http://fixture/').pathname);
   global.importScripts=(...urls)=>{for(const url of urls)vm.runInThisContext(fs.readFileSync(file(url),'utf8'),{filename:file(url)});};
   global.fetch=async(url,options={})=>{if(options.signal?.aborted)throw Error('aborted');const bytes=fs.readFileSync(file(url));return {ok:true,json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
   global.postMessage=(data,transfer)=>parentPort.postMessage(data,transfer);importScripts(workerData.url);parentPort.on('message',data=>self.onmessage({data}));`,{eval:true,workerData:{root,url}});
  this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',error=>this.onerror?.(error));
 }
 postMessage(data){this.worker.postMessage(data);}terminate(){this.worker.terminate();}
}
async function main(){
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-building-lod-'));
 let assets,engine,textures,materials,models,draws,scene;
 try{
  const source=fs.readFileSync(path.join(root,'client/vendor/filament/filament.js'),'utf8').replace('Filament = Object.assign(module, Filament);','Filament = Object.assign(module, Filament);globalThis.__VELDREN_TEST_FILAMENT__=Filament;');
  fs.writeFileSync(path.join(temporary,'filament.cjs'),source);fs.copyFileSync(path.join(root,'client/vendor/filament/filament.wasm'),path.join(temporary,'filament.wasm'));global.window={};
  const factory=require(path.join(temporary,'filament.cjs'));await new Promise(resolve=>factory.init([],resolve));const F=global.__VELDREN_TEST_FILAMENT__;
  const context={URL,TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,Float32Array,AbortController,atob,setTimeout,clearTimeout,performance,Filament:F,document:{baseURI:'http://fixture/'}};vm.createContext(context);
  assets=await require('../helpers/native-assets.cjs')(context,root);context.Worker=BrowserWorker;
  const matrix=[1,0,0,0,0,1,0,0,0,0,1,0],modules=Array.from({length:30},(_,i)=>({id:'rebuilt:Wall_Plaster_Straight',matrix:[...matrix.slice(0,3),i*2,...matrix.slice(4)]}));
  const lease=assets.leaseBuildingPlan('qa:whole-building',modules,4*1024*1024),plan=await lease.ready;
  assert(plan.geometry.every(p=>ArrayBuffer.isView(p.vertices)&&ArrayBuffer.isView(p.indices)),'worker transfers typed buffers');assert(plan.stats.draws<plan.stats.sourceDraws);lease.release();assert.equal(assets.diagnostics().dependencyLeases,0);
  const cancelled=assets.leaseBuildingPlan('qa:cancelled',modules,4*1024*1024);cancelled.release();await assert.rejects(cancelled.ready,{name:'AbortError'});assert.equal(assets.diagnostics().dependencyLeases,0);
  engine=F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig());scene=engine.createScene();textures=context.createVeldrenTextureResources(engine,assets,F);materials=context.createVeldrenMaterialResources(engine,assets,textures,F,async p=>new Uint8Array(fs.readFileSync(path.join(root,'client',p))));models=context.createVeldrenModelResources(engine,assets,materials,F);
  const budget=context.createVeldrenRenderableBudget('browser-mobile');draws=context.createVeldrenAssetDraws(engine,scene,assets,models,'browser-mobile',F,null,budget);
  const descriptor={id:plan.id,generation:1,plan},world=[1,0,0,0,0,1,0,0,0,0,1,0,10,2,20,1];
  draws.begin('town');assert.equal(draws.submitPrepared(descriptor,world,100,'building'),false);draws.end();
  for(let n=0;n<200&&draws.diagnostics().loading;n++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(draws.diagnostics().loading,0);assert.equal(draws.diagnostics().failures.length,0);
  let frames=0;while(!draws.readyPrepared(plan.id,'building')&&frames<50){budget.beginFrame();draws.begin('town');assert.equal(draws.submitPrepared(descriptor,world,100,'building'),false);draws.end();budget.drain();assert.equal(scene.getRenderableCount(),0,'completed proxy waits for the next atomic painter handoff');assert(budget.diagnostics().used<=budget.diagnostics().limit);frames++;}
  assert(draws.readyPrepared(plan.id,'building'));assert.equal(draws.diagnostics().activeRenderables,0);
  budget.beginFrame();draws.begin('town');assert(draws.submitPrepared(descriptor,world,100,'building'));draws.end();budget.drain();assert.equal(scene.getRenderableCount(),plan.draws.length,'entire proxy activates together');
  draws.begin('town');draws.end();assert.equal(scene.getRenderableCount(),0,'near view removes distant proxy in that frame');
  draws.retirePrepared(plan.id);assert.equal(models.diagnostics().gpuBytes,0);assert.equal(materials.diagnostics().materials,0);assert.equal(textures.diagnostics().gpuBytes,0);assert.equal(assets.diagnostics().dependencyLeases,0);
  // A source hot reload invalidates jobs and balances all dependency leases.
  const stale=assets.leaseBuildingPlan('qa:stale',modules,4*1024*1024);assets.invalidate(modules[0].id);await assert.rejects(stale.ready,{name:'AbortError'});stale.release();assert.equal(assets.diagnostics().dependencyLeases,0);
  console.log(JSON.stringify({workerSourceDraws:plan.stats.sourceDraws,proxyRenderables:plan.draws.length,constructionFrames:frames,dependencyLeases:0,gpuBytesAfterRetirement:0}));
  console.log('PASS: real native worker transfers, cancellation/reload, Filament NOOP buffers/materials, atomic construction handoff and full resource retirement.');
 }finally{draws?.destroy();models?.destroy();materials?.destroy();textures?.destroy();assets?.destroy();if(engine){engine.destroyScene(scene);engine.delete();}fs.rmSync(temporary,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
