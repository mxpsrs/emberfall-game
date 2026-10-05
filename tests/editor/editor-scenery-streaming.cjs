'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../../client/'),wasm=fs.readFileSync(root+'native/veldren-core.wasm');
const ctx={console,addEventListener(){},WebAssembly,DataView,TextEncoder,TextDecoder,fetch:async()=>({ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),realmAssetURL:p=>p,VELDREN_CONTEXT:'editor'};ctx.window=ctx;vm.createContext(ctx);
const load=file=>vm.runInContext(fs.readFileSync(root+file+'.js','utf8'),ctx);
const pose=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
const entity=(id,parent,components={})=>({id,name:id,parent,active:true,transform:pose(),components,metadata:{}});
(async()=>{
 load('native-runtime');await ctx.realmNativeReady;load('editor/commands');const n=ctx.realmNative.scenes,scene='overworld',generator='generated:overworld:root:understory';
 assert(n.load({format:'veldren.world',version:2,scenes:[{format:'veldren.scene',version:2,scene,entities:[entity(generator,null,{UnderstoryGenerator:{version:1}}),entity('authored',null)]}]}));
 const commands=ctx.createVeldrenEditorCommands(n,()=>scene);n.setCommandWriter((_scene,op)=>commands.execute('Edit',[op]));commands.saved();
 const group=entity('generated:overworld:understory-chunk:test',generator,{GeneratedChunk:{x:0,z:0,complete:true}}),plant=entity('generated:overworld:understory:test',group.id,{GeneratedDecoration:{category:'understory'},MeshRenderer:{asset:'rebuilt:Grass'}});
 commands.execute('Rename',[{op:'rename',id:'authored',name:'Changed'}]);
 assert(n.materializeUnderstory(scene,group,[plant]));assert.equal(commands.status().undo,1,'streaming creates no history entry');
 commands.undo();assert.equal(n.entity(scene,'authored').name,'authored');assert(n.entity(scene,plant.id),'undo retains independently streamed entities');assert.equal(commands.status().dirty,false);
 commands.redo();assert.equal(n.entity(scene,'authored').name,'Changed');assert(n.entity(scene,plant.id));
 const saved=n.serialize();assert.equal(n.materializeUnderstory(scene,{...group,name:'Overwrite'},[{...plant,name:'Overwrite'}]),false);assert.equal(JSON.stringify(n.serialize()),JSON.stringify(saved),'existing canonical chunks and edits are never replaced');
 commands.begin('Gesture');assert.throws(()=>n.materializeUnderstory(scene,{...group,id:group.id+'2'},[]),/gesture/);commands.cancel();
 assert.throws(()=>n.materializeUnderstory(scene,entity('arbitrary',null),[]),/Invalid understory/);
 const broken={...group,id:group.id+'broken'},bad={...plant,id:plant.id+'bad',parent:broken.id,transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[0,0,0]}};
 // Invalid component payload exercises rollback after the new group was inserted.
 bad.components.MeshRenderer={asset:3};assert.throws(()=>n.materializeUnderstory(scene,broken,[bad]),/construct/);assert.equal(n.entity(scene,broken.id),null);assert.equal(n.entity(scene,bad.id),null);
 assert(n.load(saved));assert.equal(JSON.stringify(n.serialize()),JSON.stringify(saved));
 console.log('PASS: canonical scenery streaming preserves history, existing edits and persistence; active gestures and failed construction are isolated.');
})().catch(error=>{console.error(error);process.exitCode=1});
