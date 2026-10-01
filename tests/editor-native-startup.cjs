const assert=require('node:assert/strict');
(async()=>{
 let completed=false;
 const f=await require('../scripts/native-world-fixture.cjs')({editor:true});const {ctx,run,load}=f;
 ctx.performance=require('node:perf_hooks').performance;
 ctx.realmStartup={failed:false};ctx.filamentReady=Promise.resolve();
 ctx.realmStartupStep=async(message,p,s,fn)=>{return fn()};
 ctx.realmLoadStatus=()=>{};ctx.realmLoadImage=async()=>({});ctx.loadRebuiltTextures=async()=>{};
 ctx.resize=()=>{};ctx.document.head={appendChild(){}};ctx.setInterval=()=>0;ctx.clearInterval=()=>{};const fetch=ctx.fetch;ctx.fetch=async input=>String(input)==='/api/editor/edits'?{ok:true,json:async()=>({revision:0,world:f.editorWorld,edits:ctx.VeldrenSceneFormat.toLegacy(f.editorWorld)})}:fetch(input);load('editor/commands');load('editor/editor-runtime');ctx.realmLoadComplete=()=>{assert(ctx.VeldrenEditorBridge.isReady());completed=true};ctx.realmLoadFailure=(message,error)=>{throw error};
 ctx.setInterval=()=>0;ctx.clearInterval=()=>{};ctx.requestAnimationFrame=()=>{};
 load('editor/editor-startup');await ctx.bootEditor();assert(completed);assert.equal(run('currentScene'),'overworld');assert.equal(ctx.realmNative.scenes.serialize().scenes.length,259);assert.equal(ctx.VeldrenEditorBridge.cameraState().x,55);assert.equal(ctx.VeldrenEditorBridge.cameraState().y,50);ctx.realmNative.destroy();console.log('PASS: complete native editor world starts with controls ready, overworld camera and 259 canonical scenes (DOM fixture, no GPU).');
})().catch(e=>{console.error(e);process.exitCode=1});
