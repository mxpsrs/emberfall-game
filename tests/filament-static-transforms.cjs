'use strict';
// The real Filament NOOP backend checks renderer behavior without a GPU.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

const root=path.join(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-static-render-'));
const source=fs.readFileSync(path.join(root,'dist/vendor/filament/filament.js'),'utf8')
 .replace('Filament = Object.assign(module, Filament);','Filament = Object.assign(module, Filament);globalThis.__VELDREN_TEST_FILAMENT__=Filament;');
fs.writeFileSync(path.join(temporary,'filament.cjs'),source);
fs.copyFileSync(path.join(root,'dist/vendor/filament/filament.wasm'),path.join(temporary,'filament.wasm'));
global.window={};
const Factory=require(path.join(temporary,'filament.cjs'));
new Promise((resolve,reject)=>Factory.init([],async()=>{
 try{
  const F=global.__VELDREN_TEST_FILAMENT__;
  F.Engine.create=()=>F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig());
  const textures=new Uint8Array(fs.readFileSync(path.join(root,'dist/assets/realms/ground-surfaces-mobile.png')));
  const parent={insertBefore(node){node.parentElement=this;}},world={parentElement:parent};
  let groundHeight=0,transforms=0,heightReads=0;
  const original=F.TransformManager.prototype.setTransform;
  F.TransformManager.prototype.setTransform=function(...args){transforms++;return original.apply(this,args);};
  const context={TextEncoder,TextDecoder,AbortController,atob,realmAssetURL:p=>p,Filament:F,console,performance,Math,Float32Array,Uint8Array,Uint16Array,Map,Set,WeakMap,Promise,Error,Number,Array,
   document:{createElement(){return {className:'',dataset:{},style:{},setAttribute(){},width:0,height:0};},getElementById(id){return id==='world'?world:null;}},
   VELDREN_FILAMENT_ASSETS:{material:new Uint8Array(fs.readFileSync(path.join(root,'dist/materials/veldren-world.filamat'))),terrainMaterial:new Uint8Array(fs.readFileSync(path.join(root,'dist/materials/veldren-terrain.filamat'))),atlasBytes:textures,groundSurfacesBytes:textures},
   realmIdentityModel:new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),realmPixelScale:()=>1,landHeight:()=>{heightReads++;return groundHeight;},landSurfaceRevision:0,
   screen:{w:900,h:500},px:10,py:20,view3d:{yaw:0},cameraPitch3:()=>.8,cameraZoom3:()=>32,cameraPose3:()=>({eye:[10.5,6,24],center:[10.5,1.12,20.5],near:.12,far:320,left:-.11,right:.11,bottom:-.05,top:.08}),currentScene:'overworld',time:1,realmGPU:null,painter3(){},project3(){},profile3(){},navigator:{userAgent:'Mozilla/5.0'},realmLightingState:()=>({night:0,cave:0,house:0,lights:[]})};
  context.setTimeout=setTimeout;context.requestAnimationFrame=callback=>setTimeout(callback,0);context.window=context;context.matchMedia=()=>({matches:false});vm.createContext(context);for(const file of ['asset-runtime','asset-textures','asset-materials','asset-meshes','asset-draws'])vm.runInContext(fs.readFileSync(path.join(root,'dist/'+file+'.js'),'utf8'),context);
  // Real native residency decisions via the production world bridge.
  Object.assign(context,{WebAssembly,DataView,URL,addEventListener(){},fetch:async p=>{const bytes=fs.readFileSync(path.join(root,'dist',String(p)));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes.toString())};}});
  vm.runInContext(fs.readFileSync(path.join(root,'dist/native-runtime.js'),'utf8'),context);
  context.realmNative=await context.realmNativeReady;
  vm.runInContext(fs.readFileSync(path.join(root,'dist/renderer-gl.js'),'utf8'),context,{filename:'renderer-gl.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'dist/renderer-filament.js'),'utf8'),context,{filename:'renderer-filament.js'});
  const gpu=context.createRealmFilamentGPU(),raw=new Float32Array([
   0,0,0,0,1,0,1,0,0,1,0,0,
   1,0,0,0,1,0,0,1,0,1,1,0,
   0,0,1,0,1,0,0,0,1,1,0,1
  ]),buffer={data:raw};
  const models=Array.from({length:256},(_,i)=>[1,0,0,(i%16)*3,0,1,0,0,0,0,1,Math.floor(i/16)*3]);
  const entries=models.map(model=>({buffer,stride:48,model}));
  const render=()=>gpu.render(entries,[],null);
  render();assert(gpu.scene.getRenderableCount()<256,'first-frame static construction is bounded');
  for(let i=0;i<80&&gpu.scene.getRenderableCount()<256;i++)render();
  assert.equal(gpu.scene.getRenderableCount(),256,'all deferred static entities eventually become resident');
  assert(gpu.performanceSnapshot().construction.maxUsed<=64,'legacy and canonical construction share the desktop quota');
  const initialTransforms=transforms,initialHeightReads=heightReads;
  const nativePerformance=context.realmNative.scenes.performance;let residencyCalls=0;
  context.realmNative.scenes.performance=function(scene,request){if(request.op==='residency')residencyCalls++;return nativePerformance.call(this,scene,request);};
  const start=performance.now();for(let i=0;i<30;i++)render();
  assert.equal(residencyCalls,0,'an unchanged fully active scene skips repeated native residency marshalling');const steadyMs=performance.now()-start;
  const steadyTransforms=transforms-initialTransforms,steadyHeightReads=heightReads-initialHeightReads;
  const beforeMoveHeightReads=heightReads;models[7][3]+=1;render();const movementTransforms=transforms-initialTransforms-steadyTransforms,movementHeightReads=heightReads-beforeMoveHeightReads;
  const beforeHeight=transforms,beforeGroundingReads=heightReads;groundHeight=2;context.landSurfaceRevision++;render();const groundingTransforms=transforms-beforeHeight,groundingHeightReads=heightReads-beforeGroundingReads;
  if(!process.env.BENCHMARK_BASELINE){
   assert.equal(initialTransforms,256,'each new entity receives its world transform');
   assert.equal(steadyTransforms,0,'stationary entities do not resend transforms to Filament');
   assert.equal(initialHeightReads,256,'new transforms sample the terrain once');
   assert.equal(steadyHeightReads,0,'stationary transforms skip repeated terrain sampling');
   assert.equal(movementTransforms,1,'mutated model matrix moves only its own entity');
   assert.equal(movementHeightReads,1,'a moved transform resamples terrain only for that entity');
   assert.equal(groundingTransforms,256,'terrain sculpting immediately regrounds all visible entities');
   assert.equal(groundingHeightReads,256,'a terrain revision regrounds all active transforms');
  }
  assert.equal(gpu.diagnostics().frame,null,'production frame instrumentation is disabled by default');
  context.VELDREN_PERFORMANCE=true;render();
  const measured=gpu.diagnostics();assert.equal(measured.frame.submittedPackets,256);assert.equal(measured.frame.transformSubmissions,0);
  assert.equal(measured.legacy.meshes,1);assert.equal(measured.legacy.renderables,256);assert.equal(measured.legacy.gpuBytes,3*44);
  assert(measured.frame.renderMs>=measured.frame.synchronizationMs);assert(measured.firstRenderMs>0);
  context.VELDREN_PERFORMANCE=false;render();assert.equal(gpu.diagnostics().frame,null);
  const beforeRetirement=buffer.data.slice();let retired=0;buffer.retire=()=>retired++;
  for(let i=0;i<122;i++)gpu.render([],[],null);
  assert.equal(retired,1);assert.equal(gpu.diagnostics().legacy.meshes,0);assert.equal(buffer.data,null);
  assert.equal(gpu.scene.getRenderableCount(),0);assert(gpu.diagnostics().residency.evictions>=1);
  const replacement=gpu.upload(beforeRetirement);gpu.render([{...replacement,model:models[0]}],[],null);
  assert.equal(gpu.diagnostics().legacy.meshes,1);assert.equal(gpu.scene.getRenderableCount(),1);
  assert.deepEqual(Array.from(replacement.buffer.data),Array.from(beforeRetirement));
  const mesh={packed:beforeRetirement},firstEntry=context.realmMeshEntry(gpu,mesh);gpu.render([{...firstEntry,model:models[0]}],[],null);
  assert(gpu.sharedMeshes.has(mesh));assert(gpu.meshBytes>0);
  assert.equal(firstEntry.buffer.data,null,'reconstructible CPU upload staging is freed while the GPU mesh remains active');
  gpu.render([{...firstEntry,model:models[0]}],[],null);assert.equal(gpu.scene.getRenderableCount(),1);
  for(let i=0;i<122;i++)gpu.render([],[],null);
  assert.equal(gpu.sharedMeshes.has(mesh),false);assert.equal(gpu.meshUse.size,0);assert.equal(gpu.meshBytes,0);
  const secondEntry=context.realmMeshEntry(gpu,mesh);assert.notEqual(secondEntry,firstEntry);
  assert.deepEqual(Array.from(secondEntry.buffer.data),Array.from(beforeRetirement));gpu.render([{...secondEntry,model:models[0]}],[],null);
  assert.equal(gpu.scene.getRenderableCount(),1);
  // A loaded model can still need several construction frames. Every instance
  // retains its complete compatibility draw until all replacement parts exist.
  const canonicalId='rebuilt:Door_1_Flat',canonicalMesh={packed:beforeRetirement},compatibility=context.realmMeshEntry(gpu,canonicalMesh);
  const coverage=Array.from({length:96},(_,i)=>({...compatibility,model:models[i],instanceId:'coverage:'+i}));
  for(let i=0;i<96;i++)context.realmNative.scenes.upsert('overworld',{id:'coverage:'+i,name:'Coverage '+i,parent:null,active:true,transform:{position:[models[i][3],0,models[i][11]],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:canonicalId}},metadata:{}});
  for(let i=0;i<96&&gpu.scene.getRenderableCount()<96;i++)gpu.render(coverage,[],null);
  assert.equal(gpu.scene.getRenderableCount(),96);
  const modelLease=gpu.modelResources.acquire(canonicalId,'browser'),canonicalModel=await modelLease.ready,partCount=canonicalModel.draws.length;
  assert(partCount>1,'exercise a genuinely multipart replacement');
  const imported=coverage.map(entry=>({...entry,canonicalAsset:canonicalId,mesh:canonicalMesh}));
  let pendingObserved=false;
  for(let i=0;i<160;i++){
   gpu.render(imported,[],null);const stats=gpu.diagnostics();
   pendingObserved||=stats.draws.pendingVisibleInstances>0;
   assert.equal(stats.legacy.renderables+stats.draws.activeRenderables/partCount,96,'every submitted instance has exactly one complete representation during the handoff');
   if(stats.draws.activeRenderables===96*partCount)break;
   await new Promise(resolve=>setTimeout(resolve,2));
  }
  assert(pendingObserved);assert.equal(gpu.diagnostics().draws.activeRenderables,96*partCount,'construction eventually finishes every visible replacement');
  assert.equal(gpu.diagnostics().legacy.renderables,0,'compatibility draws leave in the same frame replacements activate');modelLease.release();
  const nativeLod=context.realmNative.scenes.lodFrame;let lodCalls=0;context.realmNative.scenes.lodFrame=function(...args){lodCalls++;return nativeLod.apply(this,args);};for(let i=0;i<8;i++)gpu.render(imported,[],null);assert.equal(lodCalls,0,'stationary model identity and distance reuse the native LOD decision');coverage[0].model[3]+=1;imported[0].model=coverage[0].model;gpu.render(imported,[],null);assert.equal(lodCalls,1,'movement immediately refreshes LOD selection');nativeLod.call(context.realmNative.scenes,'overworld',[['other-renderer',canonicalId,180]]);gpu.render(imported,[],null);assert.equal(lodCalls,2,'another renderer cannot overwrite a cached LOD transfer');
  const nextId='rebuilt:Door_2_Flat',nextLease=gpu.modelResources.acquire(nextId,'browser'),nextModel=await nextLease.ready;assert.equal(nextModel.draws.length,partCount);
  const switched=imported.map(entry=>({...entry,canonicalAsset:nextId}));let oldWhilePending=false;
  for(let frame=0;frame<160;frame++){gpu.render(switched,[],null);const stats=gpu.diagnostics();assert.equal(stats.legacy.renderables+stats.draws.activeRenderables/partCount,96,'changing LOD/model keeps each complete old model until its replacement activates');oldWhilePending||=stats.draws.pendingVisibleInstances>0&&stats.legacy.renderables===0;if(switched.every(entry=>gpu.assetDraws.ready(nextId,entry.instanceId)))break;await new Promise(resolve=>setTimeout(resolve,2));}
  assert(oldWhilePending);assert(switched.every(entry=>gpu.assetDraws.ready(nextId,entry.instanceId)));nextLease.release();
  // A terrain LOD/edited upload keeps its current GPU surface under pressure.
  const oldTerrain=gpu.upload(beforeRetirement),cell={...oldTerrain,scene:'overworld',key:'replacement',terrain:true};gpu.terrain.set('overworld',new Map([['replacement',cell]]));
  gpu.render([cell],[],null);const oldBuffer=cell.buffer;
  context.realmTerrainUpload(gpu,cell,beforeRetirement);const abandoned=cell.buffer;
  context.realmTerrainUpload(gpu,cell,beforeRetirement);assert.equal(abandoned.data,null,'superseded staging packets are released');assert.equal(cell.buffer.previous,oldBuffer);
  const pressure=gpu.upload(beforeRetirement),busy=Array.from({length:128},(_,i)=>({...pressure,model:models[i%256]}));
  gpu.render([...busy,cell],[],null);assert.equal(cell.buffer.previous,oldBuffer,'deferred new resources retain the old terrain');assert(oldBuffer.data,'the active old surface remains allocated');
  gpu.render([cell],[],null);assert.equal(cell.buffer.previous,null);assert.equal(oldBuffer.data,null,'the old surface releases after its replacement is drawable');assert.equal(gpu.scene.getRenderableCount(),1);
  // The production cached-building painter must keep repeated parts indexed
  // and shared, including their authored terrain-relative transforms.
  context.VELDREN_FILAMENT_ASSETS.atlasBytes=textures;context.VELDREN_FILAMENT_ASSETS.groundSurfacesBytes=textures;
  const buildingGpu=context.createRealmFilamentGPU();context.buildingGpu=buildingGpu;vm.runInContext('realmGPU=buildingGpu;',context);
  context.realmTerrainEntries=()=>[];context.trimRealmMeshes=()=>{};
  context.realmIndexedData=()=>{throw Error('Building unexpectedly expanded its indexed geometry');};
  const partMesh={p:new Float32Array([0,0,0,1,0,0,1,0,1,0,0,1]),n:new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0]),c:new Float32Array(12).fill(.5),i:new Uint16Array([0,1,2,0,2,3]),t:new Uint8Array([12,12,12,12])};
  const parts=Array.from({length:100},(_,i)=>({mesh:partMesh,matrix:[2,0,.25,i*3,0,3,0,1,0,0,4,i%7]}));
  const building={kind:'building',instances:parts,faces:[],height:4};
  const submitted=[];const setTransform=F.TransformManager.prototype.setTransform;
  F.TransformManager.prototype.setTransform=function(instance,matrix){submitted.push(Array.from(matrix));return setTransform.call(this,instance,matrix);};
  const drawBuilding=()=>{const painter=context.painter3(null,context.project3);assert.equal(painter.cached(building),4);painter.flush();};
  drawBuilding();for(let i=0;i<80&&buildingGpu.scene.getRenderableCount()<100;i++)drawBuilding();
  assert.equal(buildingGpu.scene.getRenderableCount(),100);
  assert.equal(buildingGpu.diagnostics().legacy.meshes,1,'all building parts share one vertex/index allocation');
  assert.equal(buildingGpu.diagnostics().legacy.renderables,100,'every authored part remains present');
  assert.equal(buildingGpu.diagnostics().legacy.gpuBytes,4*44+6*2,'index topology is preserved instead of expanding triangles per building');
  assert.equal(submitted.length,100);parts.forEach((part,i)=>assert.deepEqual(submitted[i],Array.from(context.realmFilamentMatrix(part.matrix)),'scale, shear, position and ground height reach Filament unchanged'));
  submitted.length=0;drawBuilding();assert.equal(submitted.length,0,'repeated building draws reuse native transforms');
  parts[7].matrix[3]+=3;drawBuilding();assert.equal(submitted.length,1,'moving a part updates only that part');
  parts.pop();drawBuilding();assert.equal(buildingGpu.scene.getRenderableCount(),99,'removed/cutaway parts leave the rendered scene');
  F.TransformManager.prototype.setTransform=setTransform;
  // Assembly faces used to rebuild into the dynamic stream on every frame.
  context.briarPoint=(p,_unused,m)=>[m[0]*p[0]+m[1]*p[1]+m[2]*p[2]+m[3],m[4]*p[0]+m[5]*p[1]+m[6]*p[2]+m[7],m[8]*p[0]+m[9]*p[1]+m[10]*p[2]+m[11]];
  const assembly={kind:'assembly',height:2,model:[1,0,0,0,0,1,0,0,0,0,1,0],instances:[],faces:[{points:[[0,0,0],[1,0,0],[0,0,1]],color:'#808080'}]};
  context.VELDREN_PERFORMANCE=true;
  const drawAssembly=()=>{const painter=context.painter3(null,context.project3);painter.cached(assembly);painter.flush();};
  drawAssembly();const assemblyEntry=buildingGpu.cache.get(assembly);drawAssembly();
  assert.equal(buildingGpu.cache.get(assembly),assemblyEntry,'unchanged assembly faces retain their GPU packet');assert.equal(buildingGpu.diagnostics().frame.dynamicVertices,0);
  assembly.model[3]=7;drawAssembly();assert.notEqual(buildingGpu.cache.get(assembly),assemblyEntry,'moving the native assembly rebuilds its baked surface once');
  const movedAssembly=buildingGpu.cache.get(assembly);context.landSurfaceRevision++;drawAssembly();assert.notEqual(buildingGpu.cache.get(assembly),movedAssembly,'terrain edits refresh assembly grounding');
  // The native building projection returns fresh wrappers every frame. Those
  // wrappers must not continuously recreate unchanged procedural geometry.
  const projected=()=>({...assembly,model:[...assembly.model],faces:assembly.faces.map(f=>({...f,points:f.points.map(p=>[...p])}))});
  const drawProjection=view=>{const painter=context.painter3(null,context.project3);painter.entity('native-assembly-fixture');painter.cached(view);painter.flush();};
  drawProjection(projected());const nativeFaces=buildingGpu.assemblyFaces.get('overworld:native-assembly-fixture'),nativeMeshCount=buildingGpu.diagnostics().legacy.meshes;
  for(let i=0;i<40;i++)drawProjection(projected());
  assert.equal(buildingGpu.diagnostics().legacy.meshes,nativeMeshCount,'fresh native wrappers reuse their real Filament geometry allocation');
  assert.equal(buildingGpu.assemblyFaces.get('overworld:native-assembly-fixture').buffer,nativeFaces.buffer);
  assert.equal(buildingGpu.diagnostics().frame.deferredResources,0,'settled procedural geometry produces no continuing allocation demand');
  const changedProjection=projected();changedProjection.faces[0].points[0][1]+=.25;drawProjection(changedProjection);
  assert.notEqual(buildingGpu.assemblyFaces.get('overworld:native-assembly-fixture').buffer,nativeFaces.buffer,'an actual geometry edit refreshes the native surface');
  assert.equal(buildingGpu.diagnostics().legacy.meshes,nativeMeshCount,'replaced native surfaces retire their old GPU allocation');
  context.VELDREN_PERFORMANCE=false;
  // Animated CPU poses retain separate simultaneous shapes, but recycle their
  // native geometry allocation across frames rather than retaining every pose.
  const poseA={...partMesh,poseSource:partMesh,p:new Float32Array(partMesh.p)},poseB={...partMesh,poseSource:partMesh,p:new Float32Array(partMesh.p)};
  poseB.p[0]=-3;poseB.p[7]=4;
  const model=[1,0,0,0,0,1,0,0,0,0,1,0];buildingGpu.frameId++;
  const a=buildingGpu.canonicalEntry(poseA,model),b=buildingGpu.canonicalEntry(poseB,model);
  assert.notEqual(a.buffer,b.buffer,'two different simultaneous poses have separate geometry');
  assert.equal(buildingGpu.canonicalEntry(poseA,model).buffer,a.buffer,'identical poses share geometry within a frame');
  buildingGpu.render([a,b],[],null);const vertexBuffer=a.resource.vb,indexBuffer=a.resource.ib,staging=a.buffer.data;
  assert(staging,'mutable pose staging stays resident for updates');
  const resourceCount=buildingGpu.diagnostics().legacy.meshes;
  let updated;
  for(let frame=0;frame<40;frame++){
   buildingGpu.frameId++;
   const pose={...partMesh,poseSource:partMesh,p:new Float32Array(partMesh.p),n:new Float32Array(partMesh.n)};
   pose.p[0]=-(frame+1);pose.p[7]=frame+2;pose.n[0]=.2;pose.n[1]=.8;
   updated=buildingGpu.canonicalEntry(pose,model);buildingGpu.render([updated],[],null);
   assert.equal(updated.resource.vb,vertexBuffer);assert.equal(updated.resource.ib,indexBuffer);assert.equal(updated.buffer.data,staging);
   const expected=context.realmFilamentArrays(context.realmVertexData(pose,context.realmMeshTopology(pose)));
   for(const name of ['positions','normals','colors','uvs'])assert.deepEqual(Array.from(updated.resource.dynamicArrays[name]),Array.from(expected[name]),'pooled '+name+' matches a fresh pose upload');
   assert.deepEqual(JSON.parse(JSON.stringify(updated.resource.bounds)),JSON.parse(JSON.stringify(expected.bounds)),'animated bounds follow the deformed geometry');
   assert.equal(buildingGpu.diagnostics().legacy.meshes,resourceCount,'advancing animation does not allocate another mesh');
  }
  buildingGpu.frameId++;
  const recolored={...poseA,c:new Float32Array(poseA.c).fill(.25),f:new Float32Array(poseA.c).fill(.25)};
  const recoloredEntry=buildingGpu.canonicalEntry(recolored,model);buildingGpu.render([recoloredEntry],[],null);
  assert.equal(recoloredEntry.resource.dynamicArrays.colors[0],.25,'an appearance change updates the retained color stream');
  buildingGpu.frameId++;
  const body=buildingGpu.canonicalEntry(poseA,model),subset=buildingGpu.canonicalEntry({...poseA,i:new Uint16Array([0,1,2])},model);
  assert.notEqual(body.buffer,subset.buffer,'equipment subsets sharing a pose source retain their own topology');
  buildingGpu.render([body,subset],[],null);assert.equal(buildingGpu.scene.getRenderableCount(),2);
  buildingGpu.render([updated],[],null);assert.equal(buildingGpu.scene.getRenderableCount(),1);
  const renderables=F.Engine.prototype.getRenderableManager.call(buildingGpu.engine);
  for(const pool of updated.resource.pools.values())for(const entity of pool.entities){const instance=renderables.getInstance(entity);try{const box=renderables.getAxisAlignedBoundingBox(instance);for(const field of ['center','halfExtent'])for(let i=0;i<3;i++)assert(Math.abs(box[field][i]-updated.resource.bounds[field][i])<1e-5,'native Filament bounds follow the animated pose');}finally{instance.delete();}}
  for(let i=0;i<122;i++)buildingGpu.render([],[],null);
  assert.equal(buildingGpu.diagnostics().legacy.meshes,0,'idle pose buffers retire through native residency');assert.equal(a.resource.dynamicArrays,null,'retired pose staging is released');assert.equal(buildingGpu.meshBytes,0,'retirement balances shared index accounting');
  buildingGpu.frameId++;const rebuilt=buildingGpu.canonicalEntry(poseA,model);assert.notEqual(rebuilt.buffer,a.buffer);buildingGpu.render([rebuilt],[],null);
  assert.equal(buildingGpu.scene.getRenderableCount(),1,'a retired pose reconstructs correctly');
  // Reproduce a crowded streaming frame: new fallback requests arrive every
  // frame while an authored wall is ready. Neither may starve the wall queue.
  assert(context.realmNative.scenes.upsert('overworld',{id:'starvation-fixture',name:'Construction acceptance',parent:null,active:true,transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:'rebuilt:Wall_Plaster_Straight',renderPath:'canonical'}},metadata:{}}));
  context.VELDREN_FILAMENT_ASSETS.atlasBytes=textures;context.VELDREN_FILAMENT_ASSETS.groundSurfacesBytes=textures;
  const mixedGpu=context.createRealmFilamentGPU(),wallId='rebuilt:Wall_Plaster_Straight';
  const wallLease=mixedGpu.modelResources.acquire(wallId,'browser'),wallModel=await wallLease.ready;
  const walls=Array.from({length:12},(_,i)=>({canonicalAsset:wallId,instanceId:'starvation-wall:'+i,mesh:{packed:beforeRetirement},model:models[i]}));
  const expectedWalls=walls.length*wallModel.draws.length;
  let mixedFrames=0;
  while(mixedGpu.assetDraws.diagnostics().activeRenderables<expectedWalls&&mixedFrames<80){
   const busy=Array.from({length:256},(_,i)=>({buffer:{data:new Float32Array(beforeRetirement)},stride:48,model:models[i]}));
   mixedGpu.render([...busy,...walls],[],null);
   assert(mixedGpu.performanceSnapshot().construction.used<=64,'mixed construction retains the desktop quota');
   await new Promise(resolve=>setTimeout(resolve,0));mixedFrames++;
  }
  assert.equal(mixedGpu.assetDraws.diagnostics().activeRenderables,expectedWalls,'authored walls complete despite continuous compatibility demand');
  wallLease.release();
  // A visible parent must not submit its culled native modules. This exercises
  // the actual painter with the native visibility result, before resource work.
  const captured=[];context.__cullGpu={kind:'filament',assemblyTransforms:new WeakMap(),canonicalEntry(mesh,model){captured.push(model);return {model};}};vm.runInContext('realmGPU=__cullGpu',context);
  context.VeldrenWorldPerformance={frame:()=>({visibleIds:new Set(['visible-module'])})};
  context.affineMultiply=(_parent,local)=>Array.from(local);
  const cullingPainter=context.painter3(null,context.project3);
  cullingPainter.cached({kind:'prop',instances:[{mesh:{},matrix:models[0],entityId:'visible-module'},{mesh:{},matrix:models[1],entityId:'culled-module'}],faces:[]});
  assert.equal(captured.length,1,'culled building modules create no compatibility or canonical demand');
  assert.equal(captured[0],models[0]);
  const groundedPart=[1,0,0,42,0,1,0,.035,0,0,1,51];
  context.landHeight=()=>7;
  cullingPainter.cached({kind:'assembly',model:groundedPart,instances:[{mesh:{},matrix:groundedPart,entityId:'visible-module'}],faces:[]});
  assert.equal(captured[1][7],.035,'native module height remains terrain-relative until the shared Filament transform adds ground');
  assert(Math.abs(context.realmFilamentMatrix(captured[1])[13]-7.035)<1e-6,'assembly floors, walls and procedural parts receive terrain height exactly once');
  // Actual Filament teardown with live canonical walls and legacy material
  // parts must release renderables before releasing their material instances.
  context.VeldrenWorldPerformance.diagnostics=()=>null;
  const materialFixture={...partMesh,materialParts:[{material:'avatar:male/material/0',indexOffset:0,indexCount:6}]};
  const materialEntry={...context.realmUploadIndexed(buildingGpu,materialFixture),model,characterMesh:materialFixture};
  buildingGpu.render([materialEntry],[],null);
  for(let i=0;i<150&&buildingGpu.scene.getRenderableCount()!==1;i++){
   await new Promise(resolve=>setTimeout(resolve,10));buildingGpu.render([materialEntry],[],null);
  }
  assert.equal(buildingGpu.scene.getRenderableCount(),1,'a real native avatar material remains bound at teardown');
  context.VeldrenAssets.destroy();
  delete context.VeldrenWorldPerformance;
  assert.equal(buildingGpu.scene.getRenderableCount(),0);
  assert.equal(mixedGpu.scene.getRenderableCount(),0);
  assert.equal(buildingGpu.diagnostics().legacy.meshes,0);
  assert.equal(mixedGpu.materialResources.diagnostics().materials,0);
  buildingGpu.destroy();mixedGpu.destroy();
  context.realmNative.destroy();
  console.log(JSON.stringify({initialTransforms,steadyTransforms,movementTransforms,groundingTransforms,steadyMs:Number(steadyMs.toFixed(2)),frames:30,entities:256}));resolve();
 }catch(error){reject(error);}
})).finally(()=>fs.rmSync(temporary,{recursive:true,force:true})).catch(error=>{console.error(error);process.exitCode=1;});
