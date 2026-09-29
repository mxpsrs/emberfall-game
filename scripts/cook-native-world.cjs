'use strict';
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
(async()=>{
 const {ctx,run,capture,editorWorld}=await require('./native-world-fixture.cjs')();
 const construction=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/world-construction.json'),'utf8'));
 ctx.construction=construction;run('VeldrenPrebuiltWorld.decode(construction);VeldrenPrebuiltWorld.resume();setupLoot();');capture();
 const sourceKey=ctx.VeldrenPrebuiltWorld.fingerprint(editorWorld),constructionKey=ctx.VeldrenPrebuiltWorld.fingerprint(construction);
 await ctx.VeldrenWorldEdits.applyFinishedWorld();
 const started=performance.now();await ctx.VeldrenSceneOwnership.migrateWorld();const document=ctx.realmNative.scenes.serialize();
 const required=Object.fromEntries(document.scenes.map(scene=>[scene.scene,scene.entities.find(n=>n.components?.WorldGeneration)?.components.WorldGeneration||{}]));
 const cooked={format:'veldren.cooked-world',version:1,sourceKey,constructionKey,required,document};
 fs.writeFileSync(path.join(__dirname,'../dist/world-native.json'),JSON.stringify(cooked)+'\n');
 console.log(JSON.stringify({cookedScenes:document.scenes.length,entities:document.scenes.reduce((n,s)=>n+s.entities.length,0),cookMs:performance.now()-started,editorLayer:sourceKey,editorWarnings:ctx.VELDREN_WORLD_EDITS_STATUS.errors}));
})().catch(error=>{console.error(error);process.exitCode=1;});
