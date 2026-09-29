// Full production-world first-frame allocation probe with the real Filament NOOP backend.
// Creates real native renderer resources; excludes GPU driver allocation and execution.
// No network, GPU, accounts or saved player data. Optional PROFILE_BASELINE=<git>
// loads that revision's changed client files for an otherwise identical probe.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'../dist'),readFile=fs.readFileSync;
const compared=new Set(['renderer-filament.js','world-building-scene.js','civilization-world.js','organic-world.js','world-objects-scene.js','world-light-scene.js','world-depth.js','main-story.js']);
if(process.env.PROFILE_BASELINE){
 const originals=new Map([...compared].map(file=>[path.join(root,file),execFileSync('git',['show',process.env.PROFILE_BASELINE+':dist/'+file],{cwd:path.join(__dirname,'..')})]));
 fs.readFileSync=function(file,options){const value=originals.get(String(file));return value?(options==='utf8'||options?.encoding==='utf8'?value.toString():value):readFile.call(this,file,options);};
}
const {ctx,vm}=require('./game-fixture.cjs');
const run=s=>vm.runInContext(s,ctx),load=f=>run(fs.readFileSync(path.join(root,f+'.js'),'utf8'));
(async()=>{
 const os=require('node:os'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-first-render-'));
 const source=fs.readFileSync(path.join(root,'vendor/filament/filament.js'),'utf8').replace('Filament = Object.assign(module, Filament);','Filament = Object.assign(module, Filament);globalThis.__FIRST_RENDER_FILAMENT__=Filament;');
 fs.writeFileSync(path.join(tmp,'filament.cjs'),source);fs.copyFileSync(path.join(root,'vendor/filament/filament.wasm'),path.join(tmp,'filament.wasm'));global.window={};
 const Factory=require(path.join(tmp,'filament.cjs'));await new Promise(resolve=>Factory.init([],resolve));const F=global.__FIRST_RENDER_FILAMENT__;
 F.Engine.create=()=>F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig());F.Texture.prototype.generateMipmaps=function(){};
 F.assets={material:new Uint8Array(fs.readFileSync(path.join(root,'materials/veldren-world.filamat'))),terrainMaterial:new Uint8Array(fs.readFileSync(path.join(root,'materials/veldren-terrain.filamat')))};
 const samples=[];ctx.memoryProbe=label=>{const sample={label,...Object.fromEntries(Object.entries(process.memoryUsage()).map(([k,v])=>[k,Math.round(v/1048576)])),filamentHeapMiB:F.HEAPU8?.buffer.byteLength/1048576};samples.push(sample);console.log('MEMORY',JSON.stringify(sample));};
 ctx.memoryProbe('Filament initialized');

 Object.assign(ctx,{Float32Array,Float64Array,Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,ArrayBuffer,performance,WebAssembly,DataView,TextEncoder,TextDecoder,realmAssetURL:p=>p,URL,AbortController,addEventListener(){},fetch:async p=>{const b=fs.readFileSync(path.join(root,p));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json:async()=>JSON.parse(b.toString())};}});
 ctx.window.matchMedia=()=>({matches:true});ctx.matchMedia=ctx.window.matchMedia;ctx.navigator={userAgent:'iPhone'};ctx.Filament=F;ctx.window.VELDREN_PERFORMANCE=true;ctx.window.VELDREN_FILAMENT_ASSETS={material:'material',terrainMaterial:'terrainMaterial',atlasBytes:new Uint8Array(fs.readFileSync(path.join(root,'assets/realms/atlas-filament-mobile.png'))),groundSurfacesBytes:new Uint8Array(fs.readFileSync(path.join(root,'assets/realms/ground-surfaces-mobile.png')))};ctx.document.getElementById('world').parentElement={insertBefore(surface){surface.parentElement=this;}};
 load('asset-runtime');load('native-runtime');ctx.realmNative=await ctx.window.realmNativeReady;ctx.realmNativeReady=ctx.window.realmNativeReady;
 run("VeldrenAssets.bindLegacy('briar',briarModels);VeldrenAssets.bindLegacy('rebuilt',rebuiltModels);");
 for(const file of ['building-assembly','building-runtime','world-scene-format','world-ownership-runtime','world-building-scene','world-scenery-scene','world-road-scene','world-light-scene','world-metadata-scene','world-structure-scene','world-spawn-scene','world-gatherable-scene','world-bridge-scene','world-quarry-scene','world-service-scene','world-objects-scene','world-performance'])load(file);
 ctx.VeldrenBuildings=ctx.window.VeldrenBuildings;load('ore-identity');
 for(const file of ['asset-textures','asset-materials','asset-meshes','asset-draws','scene-renderer','renderer-filament'])load(file);
 let start=performance.now();run('setupExpandedWorld();setupTutorialVillage();setupLoot();VeldrenSceneOwnership.captureGenerationIdentity();VeldrenBuildingScene.capture(worldScenes);VeldrenLightScene.capture();VeldrenMetadataScene.capture();VeldrenStructureScene.capture();VeldrenSpawnScene.capture();VeldrenGatherableScene.capture();VeldrenBridgeScene.capture();VeldrenQuarryScene.capture();VeldrenServiceScene.capture();');const generationMs=performance.now()-start;console.log('generationMs',generationMs);
 start=performance.now();await ctx.VeldrenSceneOwnership.migrateWorld((_message,_progress,_stage,task)=>task());const migrationMs=performance.now()-start;console.log('migrationMs',migrationMs);ctx.memoryProbe('world ready');
 run(`const home=worldScenes.overworld.buildings.find(b=>/Willowcross.*residence/i.test(b.name));if(!home)throw Error('Recording residence not found');s.tutorial=38;s.tutorialReward=true;activateScene('overworld',home.x+home.w/2,home.y+home.h/2,false);if(currentScene!=='overworld')throw Error('Scene entry failed');px=home.x+home.w/2;py=home.y+home.h/2;assetsReady=true;s.character={name:'Profile',look:0,race:'human',frame:'male',hair:0};screen.w=1112;screen.h=512;view3d.zoom=118;realmGPU=null;drawGameIcon=()=>{};`);
 const frames=[],renderers=[];
 // Probe the actual packet upload and native render-resource construction.
 const originalTerrain=ctx.realmTerrainEntries;ctx.realmTerrainEntries=(...args)=>{const result=originalTerrain(...args);console.log('TERRAIN',result.length);ctx.memoryProbe('terrain prepared');return result;};
 for(let i=0;i<8;i++){start=performance.now();run('time+=1/30;draw3d();');frames.push(performance.now()-start);ctx.memoryProbe('draw '+i);const stats=run('realmGPU.diagnostics()');renderers.push(stats);console.log('RENDERER',JSON.stringify({frame:i,legacy:stats.legacy,draws:stats.draws,residency:stats.residency,streaming:{...stats.streaming,cells:stats.streaming.cells.length}}));await new Promise(resolve=>setTimeout(resolve,10));}
 const result={revision:process.env.PROFILE_BASELINE||'working-tree',backend:'real Filament NOOP; no GPU driver or rasterization',generationMs,migrationMs,frames,samples,renderers};console.log(JSON.stringify({revision:result.revision,backend:result.backend,generationMs,migrationMs,frames,samples},null,2));if(process.env.PROFILE_OUTPUT)fs.writeFileSync(process.env.PROFILE_OUTPUT,JSON.stringify(result,null,2)+'\n');
 fs.rmSync(tmp,{recursive:true,force:true});
})().catch(error=>{console.error(error);process.exitCode=1;});
