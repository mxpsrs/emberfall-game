const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../..'),world=JSON.parse(fs.readFileSync(path.join(root,'native/tests/fixtures/world-scene-v2.json'),'utf8'));
world.scenes[0].entities.push({id:'tutorial:group:lamps',name:'Lamps',parent:null,active:true,
 transform:{position:[5,0,10],rotation:[0,0,0,1],scale:[1,1,1]},components:{},metadata:{}});
world.scenes[0].entities.push({id:'tutorial:lamp:1',name:'Author light',parent:'tutorial:group:lamps',active:true,
 transform:{position:[2,0,3],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:'briar:lantern',visible:true}},metadata:{}});
const first=world.scenes[0].entities[0],change=first.components.LegacyWorldEdit.change;
const object={id:change.id,name:change.name,type:change.type||'prop',x:0,y:0,homeX:0,homeY:0,drawX:0,drawY:0};
const second={id:'tutorial:oak:1',name:'Oak',type:'prop',x:20,y:30,homeX:20,homeY:30,drawX:20,drawY:30},building={id:'tutorial:hall:1',_editorId:'tutorial:hall:1',name:'Hall',type:'building',x:40,y:50,w:8,h:8};
const scene={objects:[object,second],buildings:[building]};
const context={window:{},worldScenes:{tutorial:scene},currentScene:'tutorial',objects:[object,second],buildings:[building],worldObjectRevision:0,realmNavigation:{clear(){}},resetLandSurface(){},boot(){},console,Date,
 fetch:async()=>({ok:true,json:async()=>({world})})};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'client/world-scene-format.js'),'utf8'),context);
context.window.VeldrenSceneFormat=context.VeldrenSceneFormat;
vm.runInContext(fs.readFileSync(path.join(root,'client/world-edits-runtime.js'),'utf8'),context);
(async()=>{
 await context.window.VELDREN_WORLD_EDITS_READY;
 const result=await context.window.VeldrenWorldEdits.applyFinishedWorld();
 assert(result.applied>=1);
 assert.equal(object.x,change.x);assert.equal(object.y,change.y);
 assert.equal(context.window.VELDREN_WORLD_EDITS_STATUS.source,'editor-api');
 assert.equal(context.objects[0],object);
 assert(second._sceneEntityId&&building._sceneEntityId,'all live static objects and buildings receive scene entity IDs');
 const bindings=context.window.VeldrenRuntimeWorld.scenes[0].entities.filter(entity=>entity.components.RuntimeBinding);
 assert(bindings.some(entity=>entity.components.RuntimeBinding.key===second.id));
 assert(bindings.some(entity=>entity.components.RuntimeBinding.key===building._editorId));
 const authored=context.objects.find(o=>o._sceneEntityId==='tutorial:lamp:1');
 assert(authored);assert.equal(authored.x,7);assert.equal(authored.y,13);
 assert.equal(authored.editorAsset.source,'briar');assert.equal(authored.editorAsset.key,'lantern');
 console.log('PASS: runtime loads version 2 world, synchronizes legacy objects and scene-authored MeshRenderer children through the renderer bridge.');
})().catch(error=>{console.error(error);process.exitCode=1});
