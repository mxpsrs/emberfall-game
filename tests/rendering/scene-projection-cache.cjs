'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const wasm=fs.readFileSync('client/native/veldren-core.wasm'),ctx={console,WebAssembly,DataView,TextEncoder,TextDecoder,addEventListener(){},realmAssetURL:p=>p,fetch:async()=>({ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)})};ctx.window=ctx;vm.createContext(ctx);
(async()=>{
 for(const name of ['native-runtime','world-ownership-runtime'])vm.runInContext(fs.readFileSync('client/'+name+'.js','utf8'),ctx);await ctx.realmNativeReady;
 const n=ctx.realmNative.scenes,I=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 assert(n.load({format:'veldren.world',version:2,scenes:[{format:'veldren.scene',version:2,scene:'test',entities:[{id:'parent',name:'Parent',parent:null,active:true,transform:I(),components:{},metadata:{}},{id:'child',name:'Child',parent:'parent',active:true,transform:{...I(),position:[1,2,3]},components:{Placement:{tags:['a'],yaw:0}},metadata:{settings:{colors:[1,2,3]}}}]}]}));
 const view=ctx.VeldrenSceneOwnership.createView('test',n.entity('test','child'),'',{properties:{derived:{get:a=>a.pose()}}});
 const pose=view.derived,settings=view.settings,colors=settings.colors;
 assert(Object.isFrozen(pose));assert.strictEqual(view.derived,pose);assert.strictEqual(view.settings,settings);assert.strictEqual(view.settings.colors,colors);
 n.withReadScope(()=>n.batch(()=>{assert(n.setTransform('test','parent',{...I(),position:[10,0,0]}));assert.equal(view.x,11);assert.notStrictEqual(view.derived,pose);settings.colors[1]=9;assert.equal(view.settings.colors[1],9);}));
 assert.strictEqual(view.settings,settings);assert.strictEqual(view.settings.colors,colors);assert.equal(colors[1],9);
 view.settings=vm.runInContext("({colors:{red:4}})",ctx);assert.equal(view.settings.colors.red,4);assert(!Array.isArray(view.settings.colors));assert.strictEqual(view.settings,settings);
 assert.throws(()=>n.withReadScope(()=>{throw Error('draw interrupted')}),/draw interrupted/);
 const saved=n.serialize();assert(n.load(saved));assert.equal(view.x,11);assert.equal(settings.colors.red,4);
 assert(n.remove('test','child'));assert.throws(()=>view.x,/deleted/);assert(n.load(saved));assert.equal(view.x,11);
 console.log('PASS: cached pose/nested views, parent and in-batch edits, array/object replacement, delete/reload.');
})().catch(e=>{console.error(e);process.exitCode=1;});
