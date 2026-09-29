// CPU-only production-world reproduction of the recorded Willowcross residence.
// No network, GPU, accounts or saved player data. Optional PROFILE_BASELINE=<git>
// loads that revision's changed client files for an otherwise identical probe.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'../dist'),readFile=fs.readFileSync;
const compared=new Set(['native-runtime.js','world-ownership-runtime.js','world-spawn-scene.js','world-gatherable-scene.js','world-service-scene.js','world-bridge-scene.js','world-building-scene.js','civilization-world.js','organic-world.js','world-objects-scene.js','world-light-scene.js','world-depth.js','main-story.js']);
if(process.env.PROFILE_BASELINE){
 const originals=new Map([...compared].map(file=>[path.join(root,file),execFileSync('git',['show',process.env.PROFILE_BASELINE+':dist/'+file],{cwd:path.join(__dirname,'..')})]));
 fs.readFileSync=function(file,options){const value=originals.get(String(file));return value?(options==='utf8'||options?.encoding==='utf8'?value.toString():value):readFile.call(this,file,options);};
}
const {ctx,vm}=require('./game-fixture.cjs');
const wasmMemories=[];const instantiate=WebAssembly.instantiate;WebAssembly.instantiate=async(...args)=>{const result=await instantiate(...args);wasmMemories.push(result.instance.exports.memory);return result;};
const memory=label=>console.log('MEMORY',label,JSON.stringify({...Object.fromEntries(Object.entries(process.memoryUsage()).map(([k,v])=>[k,Math.round(v/1048576)])),wasmMiB:wasmMemories.map(m=>m.buffer.byteLength/1048576)}));
const run=s=>vm.runInContext(s,ctx),load=f=>run(fs.readFileSync(path.join(root,f+'.js'),'utf8'));
(async()=>{
 Object.assign(ctx,{performance,WebAssembly,DataView,TextEncoder,TextDecoder,realmAssetURL:p=>p,URL,AbortController,addEventListener(){},fetch:async p=>{const b=fs.readFileSync(path.join(root,p));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json:async()=>JSON.parse(b.toString())};}});
 ctx.window.matchMedia=()=>({matches:true});
 load('asset-runtime');load('native-runtime');ctx.realmNative=await ctx.window.realmNativeReady;ctx.realmNativeReady=ctx.window.realmNativeReady;
 for(const file of ['building-assembly','building-runtime','world-scene-format','world-ownership-runtime','world-building-scene','world-scenery-scene','world-road-scene','world-light-scene','world-metadata-scene','world-structure-scene','world-spawn-scene','world-gatherable-scene','world-bridge-scene','world-quarry-scene','world-service-scene','world-objects-scene','world-performance'])load(file);
 ctx.VeldrenBuildings=ctx.window.VeldrenBuildings;load('ore-identity');
 // Use the production camera/frustum, without creating a GPU engine.
 const filament=fs.readFileSync(path.join(root,'renderer-filament.js'),'utf8');run(filament.slice(filament.indexOf('function realmFilamentCameraCenter'),filament.indexOf('const realmFilamentWorldStyle')));ctx.realmMobileFilament=()=>true;
 let start=performance.now();run('setupExpandedWorld();setupTutorialVillage();setupLoot();VeldrenSceneOwnership.captureGenerationIdentity();VeldrenBuildingScene.capture(worldScenes);VeldrenLightScene.capture();VeldrenMetadataScene.capture();VeldrenStructureScene.capture();VeldrenSpawnScene.capture();VeldrenGatherableScene.capture();VeldrenBridgeScene.capture();VeldrenQuarryScene.capture();VeldrenServiceScene.capture();');const generationMs=performance.now()-start;memory('generated');console.log('generationMs',generationMs);
 start=performance.now();await ctx.VeldrenSceneOwnership.migrateWorld(async(message,_progress,_stage,task)=>{const t=performance.now();const result=await task();memory(message+' '+Math.round(performance.now()-t)+'ms');return result;});const migrationMs=performance.now()-start;const digest=require('node:crypto').createHash('sha256');for(const name of run('Object.keys(worldScenes).sort()'))digest.update(JSON.stringify(ctx.realmNative.scenes.read(name)));console.log('CANONICAL_SCENES_SHA256',digest.digest('hex'));memory('migrated-digest');console.log('migrationMs',migrationMs);
 run(`const home=worldScenes.overworld.buildings.find(b=>/Willowcross.*residence/i.test(b.name));if(!home)throw Error('Recording residence not found');s.tutorial=38;s.tutorialReward=true;activateScene('overworld',home.x+home.w/2,home.y+home.h/2,false);if(currentScene!=='overworld')throw Error('Scene entry failed');px=home.x+home.w/2;py=home.y+home.h/2;assetsReady=true;s.character={name:'Profile',look:0,race:'human',frame:'male',hair:0};screen.w=1112;screen.h=512;view3d.zoom=118;realmGPU={presented:true};drawGameIcon=()=>{};const packetPainter={face(){},indexed(){},skinned(){},entity(){},cached(c){return c.height;},flush(){}};painter3=()=>packetPainter;`);
 const frames=[];for(let i=0;i<13;i++){start=performance.now();run('time+=1/30;draw3d();realmLightingState();');frames.push(performance.now()-start);if(i===0)memory('first-draw');}
 const sorted=frames.slice(3).sort((a,b)=>a-b);const result={revision:process.env.PROFILE_BASELINE||'working-tree',mode:'CPU draw preparation only; no GPU or network',scene:run('({scene:currentScene,name:home.name,x:px,y:py,width:screen.w,height:screen.h,zoom:view3d.zoom})'),generationMs,migrationMs,coldFrameMs:frames[0],warmFramesMs:frames.slice(3),warmMedianMs:(sorted[4]+sorted[5])/2};
 console.log(JSON.stringify(result,null,2));
 memory('finished');if(process.env.PROFILE_OUTPUT)fs.writeFileSync(process.env.PROFILE_OUTPUT,JSON.stringify(result,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
