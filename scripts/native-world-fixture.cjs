'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../dist');
module.exports=async function(options={}){
 const fixture=require.resolve('./game-fixture.cjs');delete require.cache[fixture];const {ctx}=require(fixture),run=s=>vm.runInContext(s,ctx),load=name=>run(fs.readFileSync(path.join(root,name+'.js'),'utf8'));
 Object.assign(ctx,ctx.window);ctx.window=ctx;ctx.document.readyState='complete';if(options.editor)ctx.VELDREN_CONTEXT='editor';
 const editorWorld=options.world||JSON.parse(fs.readFileSync(path.join(root,'world-scene.json'),'utf8'));
 Object.assign(ctx,{WebAssembly,DataView,TextEncoder,TextDecoder,URL,AbortController,realmAssetURL:p=>p,fetch:async input=>{
  const name=String(input).replace(/^\//,'').split('?')[0];
  if(name==='api/editor/edits')return {ok:true,status:200,json:async()=>({world:JSON.parse(JSON.stringify(editorWorld))})};
  const file=path.join(root,name);if(!fs.existsSync(file))return {ok:false,status:404};const b=fs.readFileSync(file);
  return {ok:true,status:200,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
 }});
 load('asset-runtime');load('native-runtime');await ctx.realmNativeReady;
 run("VeldrenAssets.bindLegacy('briar',briarModels);VeldrenAssets.bindLegacy('rebuilt',rebuiltModels);");
 for(const name of ['building-assembly','building-runtime','world-scene-format','world-ownership-runtime','world-building-scene','world-scenery-scene','world-road-scene','world-light-scene','world-metadata-scene','world-structure-scene','world-spawn-scene','world-gatherable-scene','world-bridge-scene','world-quarry-scene','world-service-scene','world-objects-scene','terrain-editor-runtime','ore-identity','prebuilt-world','world-edits-runtime'])load(name);
 await ctx.VELDREN_WORLD_EDITS_READY;
 const capture=()=>run('VeldrenSceneOwnership.captureGenerationIdentity();VeldrenBuildingScene.capture(worldScenes);VeldrenLightScene.capture();VeldrenMetadataScene.capture();VeldrenStructureScene.capture();VeldrenSpawnScene.capture();VeldrenGatherableScene.capture();VeldrenBridgeScene.capture();VeldrenQuarryScene.capture();VeldrenServiceScene.capture();');
 return {ctx,run,load,capture,editorWorld};
};
