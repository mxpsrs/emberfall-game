'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'../dist/'),wasm=fs.readFileSync(base+'native/veldren-core.wasm');let invalidations=0;
const roads=[{a:[1,2],b:[5,2],width:1,paved:true,na:[0,1],nb:[0,1]},{a:[5,2],b:[5,6],width:.75}];
const ctx={console,addEventListener(){},WebAssembly,DataView,TextEncoder,TextDecoder,fetch:async()=>({ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),realmAssetURL:p=>p,worldScenes:{overworld:{objects:[],buildings:[]},tutorial:{objects:[],buildings:[],roads:[{a:[10,10],b:[12,10],width:1}]}},organicRoads:roads,currentScene:'overworld',objects:[],buildings:[],physicalWorldReady:true,SETTLEMENTS:[],inWorld:()=>ctx.currentScene==='overworld',landBase:(x,z)=>x*.1+z*.05,resetLandSurface(){invalidations++;},realmNavigation:{clear(){}},worldUnderstory:new Map()};ctx.window=ctx;vm.createContext(ctx);
const load=f=>vm.runInContext(fs.readFileSync(base+f+'.js','utf8'),ctx);
async function main(){
 const organic=fs.readFileSync(base+'organic-world.js','utf8');vm.runInContext(organic.slice(organic.indexOf('function roadSegmentDistance('),organic.indexOf('\n',organic.indexOf('function roadSegmentDistance('))),ctx);const squaredStart=organic.indexOf('function roadSegmentDistanceSquared(');vm.runInContext(organic.slice(squaredStart,organic.indexOf('\n',squaredStart)),ctx);
 vm.runInContext(organic.slice(organic.indexOf('let roadBuckets=null'),organic.indexOf('const organicGradeBefore=')),ctx);
 const before=JSON.stringify(ctx.roadInfluence(3,2)),height=ctx.gradeRoadLand(3,2,5);assert.equal(vm.runInContext('roadBuckets.size',ctx),1,'only the queried terrain cell receives a road bucket');assert(vm.runInContext('roadCoarseBuckets.size',ctx)>0,'nearby road candidates come from a sparse coarse spatial index');
 load('native-runtime');await ctx.realmNativeReady;load('world-ownership-runtime');load('world-road-scene');
 const native=ctx.realmNative.scenes,api=ctx.VeldrenRoadScene,result=await api.migrate();assert.equal(result.roads,3);assert.equal(JSON.stringify(ctx.roadInfluence(3,2)),before,'terrain road shading parity');assert.equal(ctx.gradeRoadLand(3,2,5),height,'road grading parity');
 assert(Object.isFrozen(ctx.organicRoads));assert.throws(()=>ctx.organicRoads.push({}),{name:'TypeError'});assert.throws(()=>{ctx.worldScenes.tutorial.roads=[]},{name:'TypeError'});assert.throws(()=>{ctx.organicRoads[0].a[0]=9},{name:'TypeError'});
 const first=ctx.organicRoads[0],id=first._sceneEntityId,group=native.entity('overworld',id).parent;
 const cachedA=first.a,cachedB=first.b,cachedNormal=first.na;assert.strictEqual(first.a,cachedA);assert.strictEqual(first.b,cachedB);assert.strictEqual(first.na,cachedNormal);
 const tick=invalidations;assert(native.setTransform('overworld',group,{position:[20,0,20],rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2],scale:[2,2,2]}));assert(invalidations>tick);
 assert(Math.abs(first.a[0]-24)<1e-9&&Math.abs(first.a[1]-18)<1e-9);assert(Math.abs(first.b[0]-24)<1e-9&&Math.abs(first.b[1]-10)<1e-9);assert(Math.abs(first.width-2)<1e-9);assert.equal(ctx.roadInfluence(3,2)[0],0,'old road buckets discarded after parent edit');assert(ctx.roadInfluence(24,14)[0]>.9);
 const edit=JSON.parse(JSON.stringify(native.entity('overworld',id)));edit.components.RoadSegment.width=2;native.batch(()=>{assert(native.upsert('overworld',edit));assert(Math.abs(first.width-4)<1e-9,'projection sees native writes before batch notifications');});assert(Math.abs(first.width-4)<1e-9,'component changes drive width');
 const duplicate=JSON.parse(JSON.stringify(edit));duplicate.id+=':copy';assert(native.upsert('overworld',duplicate));assert.equal(ctx.organicRoads.length,3);assert(native.remove('overworld',duplicate.id));
 const tutorial=ctx.worldScenes.tutorial.roads[0];assert(native.setTransform('tutorial',tutorial._sceneEntityId,{position:[50,0,50],rotation:[0,0,0,1],scale:[1,1,1]}));assert(ctx.worldScenes.tutorial.roadBuckets.get('6:6').includes(tutorial),'Firstlight buckets rebuilt');assert(!ctx.worldScenes.tutorial.roadBuckets.has('1:1'));
 const saved=native.serialize();assert(native.load({format:'veldren.world',version:2,scenes:[]}));assert.equal(ctx.organicRoads.length,0);assert(native.load(saved));assert.equal(JSON.stringify(native.serialize()),JSON.stringify(saved));
 assert(native.remove('overworld',id));const remaining=ctx.organicRoads.length;await api.migrate();assert.equal(ctx.organicRoads.length,remaining,'deleted roads never regenerate');assert(!ctx.organicRoads.some(o=>o._sceneEntityId===id));
 // IDs describe road content, never a position within an array.
 const ids=saved.scenes.find(s=>s.scene==='overworld').entities.filter(e=>e.components.RoadSegment).map(e=>e.id).sort();assert.equal(new Set(ids).size,ids.length);
 assert(native.load({format:'veldren.world',version:2,scenes:[]}));ctx.organicRoads=[...roads].reverse();await api.migrate();assert.equal(JSON.stringify(native.componentIds('overworld','RoadSegment').sort()),JSON.stringify(ids),'road IDs survive source-array reordering');
 console.log('PASS: native road ownership, terrain shading/grade parity, parent transforms, component edits, derived spatial buckets, duplicate/delete and save/unload/load.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
