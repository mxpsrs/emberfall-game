'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'../dist/'),wasm=fs.readFileSync(base+'native/veldren-core.wasm');let generations=0;
const ctx={console,addEventListener(){},WebAssembly,DataView,TextEncoder,TextDecoder,fetch:async()=>({ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),realmAssetURL:p=>p,worldScenes:{cave:{objects:[],buildings:[],decor:[{kind:'pillar',x:4,z:5,size:2},{kind:'model',model:'Rock',x:9,z:10,height:3,heading:1,tint:[.6,.7,.8]}]},overworld:{objects:[],buildings:[]}},worldUnderstory:new Map(),rebuiltModels:{Rock:{bounds:[[-1,0,-1],[1,2,1]]}},worldUnderstoryPlacements:(bx,bz)=>{generations++;return [{name:'Fern',x:bx*8+4,z:bz*8+6,heading:1,scale:.5,tint:[.5,.6,.5]}];},rebuiltPlace(r,_name,x,y,z){r.face([[x,y,z],[x+1,y,z],[x,y+1,z]],'#888');}};ctx.window=ctx;vm.createContext(ctx);
const load=f=>vm.runInContext(fs.readFileSync(base+f+'.js','utf8'),ctx);
async function main(){
 load('native-runtime');await ctx.realmNativeReady;for(const f of ['building-assembly','world-ownership-runtime','world-building-scene','world-scenery-scene'])load(f);
 const native=ctx.realmNative.scenes,scenery=ctx.VeldrenSceneryScene,result=await scenery.migrate();assert.equal(result.decorations,2);assert(Object.isFrozen(ctx.worldScenes.cave.decor),'legacy decoration membership is read-only');
 const pillar=ctx.worldScenes.cave.decor.find(o=>o.kind==='pillar'),id=pillar._sceneEntityId;assert(scenery.blocked(pillar,3.5,4.5));
 assert(native.setTransform('cave',id,{position:[20,0,30],rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2],scale:[2,2,2]}));assert.equal(pillar.x,20);assert.equal(pillar.z,30);assert(scenery.blocked(pillar,19.5,29.5));assert(!scenery.blocked(pillar,3.5,4.5));
 assert.throws(()=>{ctx.worldScenes.cave.decor=[]},/getter|read.only/i,'decoration collection cannot be replaced');
 const plants=scenery.chunk(1,1);assert.equal(plants.length,1);assert.equal(generations,1);scenery.chunk(1,1);assert.equal(generations,1,'materialized chunks never regenerate over edits');
 const plant=plants[0];ctx.worldUnderstory.set('stale',{});native.batch(()=>{plant.x=40;});assert.equal(ctx.worldUnderstory.size,0,'batched transforms invalidate cached scenery');assert.equal(scenery.chunk(1,1).length,0,'moved plant leaves its original render chunk');
 const copy=JSON.parse(JSON.stringify(native.entity('overworld',plant._sceneEntityId)));copy.id+=':copy';assert(native.upsert('overworld',copy));assert(scenery.selectables('overworld').some(o=>o._sceneEntityId===copy.id),'native duplicates enter derived membership');assert(native.remove('overworld',copy.id));
 const moved=scenery.chunk(5,1).find(o=>o._sceneEntityId===plant._sceneEntityId);assert(moved,'edited plant renders from its destination chunk');
 const faces=[];scenery.render({face(points){faces.push(points);}},plant);assert(Math.abs(faces[0][0][0]-40)<1e-9,'renderer reads native matrix');
 const saved=native.serialize();assert(native.load({format:'veldren.world',version:2,scenes:[]}));assert.equal(ctx.worldScenes.cave.decor.length,0);assert(native.load(saved));assert.equal(JSON.stringify(native.serialize()),JSON.stringify(saved));assert.equal(scenery.chunk(5,1).find(o=>o._sceneEntityId===plant._sceneEntityId).x,40);assert.equal(generations,2);
 assert(native.remove('overworld',plant._sceneEntityId));assert(!scenery.chunk(5,1).some(o=>o._sceneEntityId===plant._sceneEntityId),'deleted streamed decoration stays deleted');assert.equal(generations,2);
 assert(native.remove('cave',id));assert.equal(ctx.worldScenes.cave.decor.length,1);
 await scenery.migrate();assert.equal(ctx.worldScenes.cave.decor.length,1,'saved resulting scene remains authoritative');
 console.log('PASS: lair decoration ownership, collision transforms, streamed canonical chunks, renderer matrix, deletion and saved-edit persistence.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
