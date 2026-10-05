'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {ctx}=require('../../scripts/qa/game-fixture.cjs');
const run=source=>vm.runInContext(source,ctx),load=file=>run(fs.readFileSync(path.join(__dirname,'../../client',file+'.js'),'utf8'));
async function main(){
 const wasm=fs.readFileSync(path.join(__dirname,'../../client/native/veldren-core.wasm'));
 Object.assign(ctx,{WebAssembly,DataView,TextEncoder,TextDecoder,fetch:async()=>({ok:true,status:200,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),realmAssetURL:p=>'/'+p});
 if(process.env.VELDREN_SCENE_CONTEXT==='editor')ctx.window.VELDREN_CONTEXT='editor';
 load('native-runtime');await ctx.window.realmNativeReady;ctx.realmNative=ctx.window.realmNative;ctx.realmNativeReady=ctx.window.realmNativeReady;
 for(const file of ['building-assembly','building-runtime','world-scene-format','world-ownership-runtime','world-building-scene','world-scenery-scene','world-road-scene','world-light-scene','world-metadata-scene','world-structure-scene','world-spawn-scene','world-gatherable-scene','world-bridge-scene','world-quarry-scene','world-service-scene','world-objects-scene'])load(file);
 ctx.VeldrenBuildings=ctx.window.VeldrenBuildings;load('ore-identity');
 run('setupExpandedWorld();setupTutorialVillage();setupLoot();VeldrenSceneOwnership.captureGenerationIdentity();VeldrenBuildingScene.capture(worldScenes);VeldrenLightScene.capture();VeldrenMetadataScene.capture();VeldrenStructureScene.capture();VeldrenSpawnScene.capture();VeldrenGatherableScene.capture();VeldrenBridgeScene.capture();VeldrenQuarryScene.capture();VeldrenServiceScene.capture();');

 const payload=process.env.VELDREN_STARTUP_WORLD?JSON.parse(fs.readFileSync(process.env.VELDREN_STARTUP_WORLD,'utf8')):{version:1,revision:0,changes:[]};
 ctx.fetch=async()=>({ok:true,json:async()=>payload});
 for(const name of ['VeldrenSceneFormat','VeldrenBuildings'])ctx.window[name]=ctx[name]||ctx.window[name];
 load('world-edits-runtime');ctx.VeldrenWorldEdits=ctx.window.VeldrenWorldEdits;
 await ctx.VeldrenWorldEdits.applyFinishedWorld();
 const before=run('Object.values(worldScenes).flatMap(w=>w.objects).filter(o=>o._generatedGatherableId).map(o=>({entity:o._generatedGatherableId,id:o.id,x:o.x,y:o.y,resourceId:o.resourceId}))');
 const began=Date.now();
 console.log(JSON.stringify(await ctx.VeldrenSceneOwnership.migrateWorld((message,progress,stage,task)=>{console.log(message,Date.now()-began);return task();})));
 console.log('Migration milliseconds',Date.now()-began);
 const after=run('new Map(Object.values(worldScenes).flatMap(w=>w.objects).filter(o=>o._generatedGatherable).map(o=>[o._sceneEntityId,o]))');
 for(const old of before){const object=after.get(old.entity);assert(object,'resource retained: '+old.entity);assert.equal(object.id,old.id);assert.equal(object.resourceId,old.resourceId);assert(Math.abs(object.x-old.x)<1e-7&&Math.abs(object.y-old.y)<1e-7);}
 assert(ctx.VeldrenWorldObjects.enabled);
 const saved=ctx.realmNative.scenes.serialize();assert(ctx.realmNative.scenes.load(saved));assert.equal(JSON.stringify(ctx.realmNative.scenes.serialize()),JSON.stringify(saved));
 console.log('PASS: world revision '+payload.revision+' completes batched startup, resource identity/position parity and exact save/reload');
 ctx.realmNative.destroy();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
