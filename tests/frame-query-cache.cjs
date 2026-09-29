'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bytes=fs.readFileSync('dist/native/veldren-core.wasm');
const ctx={console,WebAssembly,DataView,TextEncoder,TextDecoder,addEventListener(){},realmAssetURL:p=>p,fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})};ctx.window=ctx;vm.createContext(ctx);
const load=f=>vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx),I=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
(async()=>{
 load('native-runtime');await ctx.realmNativeReady;for(const f of ['building-assembly','world-ownership-runtime','world-building-scene'])load(f);
 const native=ctx.realmNative.scenes,api=ctx.VeldrenBuildingScene,root=ctx,entity=(scene,id)=>native.entity(scene,id),matrices=api.matrices;
 function reference(surface,x,z){
  const scene=surface._generatedSceneName,id=surface._sceneEntityId,node=entity(scene,id);if(!node)return null;
  const A=root.VeldrenAssembly,shape=node.components.WalkSurface,base=node.worldMatrix[13],vertical=Math.hypot(...node.worldMatrix.slice(4,7)),rise=(shape.rise||0)*vertical;
  const inside=part=>{const child=entity(scene,part);if(!child)return null;const p=A.point(A.inverse(matrices.row(child.worldMatrix)),[x,child.worldMatrix[13],z]),size=child.components.Footprint;return p[0]>=0&&p[0]<size.w&&p[2]>=0&&p[2]<size.h?{p,size}:null;};
  const lineAt=line=>{const a=entity(scene,line.start),b=entity(scene,line.end);if(!a||!b)return null;const ax=a.worldMatrix[12],az=a.worldMatrix[14],dx=b.worldMatrix[12]-ax,dz=b.worldMatrix[14]-az,len=Math.hypot(dx,dz);if(len<.001)return null;const rx=x-ax,rz=z-az,t=(rx*dx+rz*dz)/(len*len),cross=Math.abs(rx*dz-rz*dx)/len;return t>=0&&t<=1&&cross<=(line.width||0)*vertical/2?t:null;};
  if(shape.rampLine){const t=lineAt(shape.rampLine);if(t!==null)return {height:base+rise*t,kind:'ramp',structure:surface};}
  const ramp=shape.ramp&&inside(shape.ramp);if(ramp)return {height:base+rise*Math.max(0,Math.min(1,(ramp.size.h-ramp.p[2])/(ramp.size.h-1))),kind:'ramp',structure:surface};
  if((shape.decks||[]).some(inside))return {height:base+rise,kind:'rampart',structure:surface};return null;
 }

 const entities=[{id:'parent',name:'Parent',parent:null,active:true,transform:I(),components:{},metadata:{}}];
 const add=(id,parent,position,components)=>entities.push({id,name:id,parent,active:true,transform:{...I(),position},components,metadata:{}});
 for(let i=0;i<100;i++){add('s'+i,'parent',[i*50,2,i*40],{WalkSurface:{rise:3,ramp:'r'+i,decks:['d'+i]}});add('r'+i,'s'+i,[0,0,0],{Footprint:{w:2,h:4}});add('d'+i,'s'+i,[2,3,0],{Footprint:{w:5,h:5}});}
 add('line','parent',[8,0,8],{WalkSurface:{rise:4,rampLine:{start:'start',end:'end',width:2},decks:[]}});add('start','line',[0,0,0],{});add('end','line',[5,0,3],{});
 assert(native.load({format:'veldren.world',version:2,scenes:[{format:'veldren.scene',version:2,scene:'test',entities}]}));
 const surfaces=entities.filter(e=>e.components.WalkSurface).map(e=>api.getView('test',e.id));
 const check=()=>{
  for(const surface of [surfaces[0],surfaces[1],surfaces.at(-1)]){
   const m=entity('test',surface._sceneEntityId).worldMatrix;
   for(let x=-8;x<=16;x+=.8)for(let z=-8;z<=16;z+=.8){const px=m[12]+x,pz=m[14]+z,a=reference(surface,px,pz),b=api.surfaceAt(surface,px,pz);assert.equal(b?.kind,a?.kind);if(a){assert(Math.abs(a.height-b.height)<1e-9);assert(api.surfaceCandidates(surfaces,px,pz).includes(surface),'broad phase never drops a valid surface');}}
  }
 };
 check();
 for(const transform of [{position:[13,1,-8],rotation:[0,Math.sin(.4),0,Math.cos(.4)],scale:[2,1.4,.7]},{position:[1,2,3],rotation:[Math.sin(.2),0,0,Math.cos(.2)],scale:[1.3,2,.8]}]){assert(native.setTransform('test','parent',transform));check();}
 const deck=JSON.parse(JSON.stringify(entity('test','d0')));deck.components.Footprint.w=12;assert(native.upsert('test',deck));check();
 assert(native.setTransform('test','d0',{...I(),position:[-7,4,8]}));check();
 const saved=native.serialize();assert(native.remove('test','d0'));check();assert(native.load(saved));check();
 api.surfaceCandidates(surfaces,-999,-999);const realEntity=native.entity;let reads=0;native.entity=function(...args){reads++;return realEntity.apply(this,args);};
 for(let i=0;i<1000;i++){assert.equal(api.surfaceCandidates(surfaces,-999,-999).length,0);assert.equal(api.surfaceAt(surfaces[0],-999,-999),null);}native.entity=realEntity;assert.equal(reads,0,'warm misses perform no native entity reads');
 const near=api.surfaceCandidates(surfaces,0,0);assert(near.length<surfaces.length/10,'local candidates exclude distant stairs');
 const mixed=[...surfaces,{ramp:null,decks:[]}];assert.equal(api.surfaceCandidates(mixed,0,0),mixed,'unmigrated geometry keeps the legacy fallback');
 // Quest cache invalidates after Scene edits, membership moves and missing keys.
 const story=fs.readFileSync('dist/main-story.js','utf8');ctx.worldScenes={test:{objects:[{mainStoryKey:'guide'}]}};ctx.worldObjectRevision=0;ctx.VeldrenWorldObjects={enabled:true};vm.runInContext(story.slice(story.indexOf('let mainStoryLookup'),story.indexOf('function mainStoryState')),ctx);
 const first=ctx.mainStoryFound('guide');assert.equal(ctx.mainStoryFound('guide'),first);assert.equal(ctx.mainStoryFound('new'),null);ctx.worldScenes.test.objects.push({mainStoryKey:'new'});ctx.worldObjectRevision++;assert(ctx.mainStoryFound('new'));ctx.worldScenes.test.objects[0].mainStoryKey='renamed';native.setTransform('test','parent',I());assert.equal(ctx.mainStoryFound('guide'),null);assert(ctx.mainStoryFound('renamed'));
 console.log('PASS: cached walk surfaces match the previous exact query across translation, rotation, pitch, scale, child/footprint edits, deletion and reload; warm misses read zero native entities; quest cache invalidation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
