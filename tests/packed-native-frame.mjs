import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';

const context={console,TextEncoder,TextDecoder,DataView,WebAssembly,AbortController,URL,performance,VELDREN_CONTEXT:'editor',addEventListener(){},realmAssetURL:p=>p,
 fetch:async path=>{const bytes=fs.readFileSync(new URL('../dist/'+path,import.meta.url));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes)};}};
context.window=context;vm.createContext(context);
for(const file of ['asset-runtime.js','native-runtime.js','world-performance.js','scene-renderer.js'])vm.runInContext(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),context);
const native=await context.realmNativeReady,n=native.scenes;context.realmNative=native;
const model='rebuilt:Wall_Plaster_Straight';
const entity=(id,x,z,parent=null)=>({id,name:id,parent,active:true,transform:{position:[x,0,z],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:model,renderPath:'canonical',castShadows:false},Collider:{bounds:[[-1,-1,-1],[1,1,1]]}},metadata:{}});
n.upsert('frame',entity('parent',0,0));
for(let i=0;i<600;i++)n.upsert('frame',entity('draw:'+i,(i%25-12)*2,-Math.floor(i/25)*2,'parent'));
const camera={eye:[0,12,25],center:[0,0,-20],near:.25,far:140,left:-.18,right:.18,bottom:-.12,top:.12,height:900};
const saved=JSON.stringify(n.serialize());
function compare(){
 const reference=n.performance('frame',{op:'visible',camera}),packed=n.frame('frame',camera);
 assert.deepEqual(Array.from(packed.ids),Array.from(reference.ids));assert.deepEqual(Array.from(packed.lights),Array.from(reference.lights));assert.equal(packed.drawCount,reference.packets.length);
 for(let i=0;i<packed.drawCount;i++){
  const row=reference.packets[i],o=packed.drawOffset+i*21,w=packed.words,s=packed.strings;
  assert.equal(s[w[o]],row[0]);assert.equal(s[w[o+1]],row[1]);assert.equal(s[w[o+2]],row[3]);assert.equal(!!(w[o+3]&1),row[4]);assert.equal(!!(w[o+3]&2),row[5]);
  assert.deepEqual(Array.from(packed.matrixAt(i)),Array.from(row[2],Math.fround));assert.equal(packed.floats[o+20],Math.fround(row[6]));
 }
 for(const key of Object.keys(packed.stats))if(key!=='updated'&&key in reference.stats)assert.equal(packed.stats[key],reference.stats[key],key);
 assert.equal(packed.lod.lod0,reference.lod.lod0);return packed;
}
let frame=compare();assert(frame.drawCount>250);
const buffer=frame.words.buffer,firstMatrix=frame.matrixAt(0);n.frame('frame',camera);assert.equal(n.frame('frame',camera).words.buffer,buffer);assert.equal(n.frame('frame',camera).matrixAt(0),firstMatrix);
assert.equal(JSON.stringify(n.serialize()),saved,'presentation does not mutate canonical world data');
const retained=Array.from(firstMatrix);n.upsert('other',{...entity('huge',0,0),metadata:{heapGrowth:'x'.repeat(4*1024*1024)}});assert.deepEqual(Array.from(firstMatrix),retained,'native memory growth cannot detach presentation matrices');
n.setTransform('frame','parent',{position:[1.125,2.25,3.5],rotation:[0,.382683432365,0,.923879532511],scale:[1.5,2,.75]});compare();
n.command('frame',{operations:[{op:'transform',id:'draw:3',transform:{position:[2,0,0],rotation:[0,0,0,1],scale:[1,1,1]}}]});compare();n.command('frame',{action:'undo'});compare();
assert.throws(()=>n.frame('frame',{...camera,near:NaN}),/camera/);assert.throws(()=>n.frame('missing',camera),/owner/);compare();
const submissions=[];context.VeldrenWorldPerformance={frame:()=>n.frame('frame',camera)};
const renderer=context.createVeldrenSceneRenderer(n,context.VeldrenAssets,{begin(){},end(){},submit(...args){submissions.push(args);},destroy(){}});
renderer.render('frame',camera.eye);assert.equal(submissions.length,n.frame('frame',camera).drawCount);assert(submissions.every(s=>s[3].castShadows===false));renderer.destroy();
const times=fn=>{for(let i=0;i<10;i++)fn();const values=[];for(let i=0;i<60;i++){const start=performance.now();fn();values.push(performance.now()-start);}return values.sort((a,b)=>a-b)[30];};
const jsonMs=times(()=>n.performance('frame',{op:'visible',camera})),packedMs=times(()=>n.frame('frame',camera));
for(const distance of [0,36,34,40,35,90,79,0]){
 const a=n.performance('frame',{op:'lod-batch',entries:[['json-tree','rebuilt:CommonTree_1',distance]]}).selections[0];
 const b=n.lodFrame('frame',[['packed-tree','rebuilt:CommonTree_1',distance]]).selections[0];assert.deepEqual(Array.from(b),Array.from(a),'packed LOD retains native hysteresis');
}
assert.throws(()=>n.lodFrame('frame',[['bad',model,NaN]]),/distance/);
assert.equal(n.lodFrame('frame',[]).selections.length,0);
for(let i=0;i<100;i++)n.upsert('frame',{...entity('far:'+i,1000+i*32,1000),metadata:{quest:'Keep this quest',detail:'x'.repeat(200)}});
compare();const pageSave=JSON.stringify(n.serialize()),pageRevision=n.revision();
const paging=n.pagePayloads('frame',[0,0,0],32,4096);assert(paging.paged>=100);assert(paging.scanned<=701);assert(paging.bytes>10000);
assert.equal(n.revision(),pageRevision);assert.equal(JSON.stringify(n.serialize()),pageSave,'WASM saves include unloaded pages');compare();assert.equal(n.entity('frame','far:7').metadata.quest,'Keep this quest');
assert.throws(()=>n.pagePayloads('frame',[0,0,0],32,65536),/budget/);
compare();n.lodFrame('frame',[['packed-tree','rebuilt:CommonTree_1',0]]);
let parses=0;const originalParse=vm.runInContext('JSON.parse',context);context.countParse=(...args)=>{parses++;return originalParse(...args)};vm.runInContext('JSON.parse=countParse',context);
for(let i=0;i<20;i++){n.frame('frame',camera);n.lodFrame('frame',[['packed-tree','rebuilt:CommonTree_1',0]]);}assert.equal(parses,0,'warm frame and LOD transfers perform no JSON parsing');context.countParse=originalParse;vm.runInContext('JSON.parse=countParse',context);
console.log(JSON.stringify({pass:true,draws:frame.drawCount,jsonMedianMs:jsonMs,packedMedianMs:packedMs,checks:['exact visibility, identity, materials and shadow flags','float32-equivalent affine transforms','stable transfer buffers','heap growth','edit/undo and errors','actual scene renderer consumes packed draws','unchanged WorldDocument']}));
native.destroy();assert.throws(()=>n.frame('frame',camera),/destroyed/);
