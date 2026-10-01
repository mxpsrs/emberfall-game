'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{Worker}=require('node:worker_threads'),{performance}=require('node:perf_hooks');
const root=path.resolve('dist'),context={atob,console,Float32Array,Uint8Array};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/terrain-mesher.js','utf8'),context);const M=context.VeldrenTerrainMesher;
const simple=(x,z)=>{const n=16,side=n+3,heights=new Float32Array(side*side),colors=new Uint8Array((n*2+1)**2*3);for(let j=-1;j<=n+1;j++)for(let i=-1;i<=n+1;i++)heights[i+1+(j+1)*side]=Math.sin((x+i)*.3)+Math.cos((z+j)*.1);for(let i=2;i<colors.length;i+=3)colors[i]=255;return {x,z,size:n,heights,colors,flags:new Uint8Array(n*n).fill(1),materials:new Uint8Array(n*n*4).fill(1)};};
const edges=(mesh,axis,value)=>{const out=new Map();for(let i=0;i<mesh.data.length;i+=12)if(mesh.data[i+axis]===value){const p=Array.from(mesh.data.slice(i,i+6)),key=p[0]+':'+p[2];out.set(key,p);}return out;};
for(const a of [.5,1,2,4])for(const b of [.5,1,2,4])for(const axis of [0,2]){const A=M.mesh(simple(0,0),a),B=M.mesh(simple(axis===0?16:0,axis===2?16:0),b),left=edges(A,axis,16),right=edges(B,axis,16);assert.equal(left.size,33);assert.deepEqual([...left.keys()].sort(),[...right.keys()].sort());for(const [key,p]of left)assert.deepEqual(p,right.get(key),'LOD edges share both position and normal');}
const fine=M.mesh(simple(0,0),.5),far=M.mesh(simple(0,0),4);assert(far.data.length<fine.data.length/6,'far terrain reduces triangle count');
const painted=simple(0,0);painted.materials.fill(131);const paintMesh=M.mesh(painted,4);assert(paintMesh.step<=1);for(let i=0;i<paintMesh.data.length;i+=12)assert.deepEqual(Array.from(paintMesh.data.slice(i+6,i+10)),[0,0,1,3]);
const holes=simple(0,0);holes.flags.fill(4);assert.equal(M.mesh(holes,4).data.length,0);
const sea=simple(0,0);sea.flags.fill(2);const ocean=M.mesh(sea,4);for(let i=0;i<ocean.data.length;i+=12){assert(Math.abs(ocean.data[i+1]-.01)<1e-8);assert.equal(ocean.data[i+9],4);}

(async()=>{
 const cooked=JSON.parse(fs.readFileSync('dist/world-native.json')),source=JSON.parse(fs.readFileSync('dist/world-scene.json')),workers=[],requests=[];
 const fingerprint=value=>{let a=2166136261,b=2246822519;for(const c of JSON.stringify(value??null)){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');};assert.equal(fingerprint(source),cooked.sourceKey);
 class BrowserWorker{
  constructor(url){assert.equal(new URL(url).pathname,'/terrain-worker.js','editor uses the document base URL');this.w=new Worker(path.resolve('tests/helpers/terrain-worker.cjs'),{workerData:{root,url:String(url)}});workers.push(this.w);this.w.on('message',data=>{if(data.type==='fetch')requests.push(data.file);else this.onmessage?.({data});});this.w.on('error',error=>this.onerror?.(error));}
  postMessage(...args){this.w.postMessage(...args);}terminate(){return this.w.terminate();}
 }
 const c={console,Worker:BrowserWorker,performance,URL,Uint8Array,Float32Array,setTimeout,clearTimeout,location:{href:'https://terrain.test/editor/viewport.html'},document:{baseURI:'https://terrain.test/'},addEventListener(){},realmAssetURL:p=>p,VeldrenWorldEdits:{state:{world:source}},VeldrenPrebuiltWorld:{fingerprint},px:200,py:80,currentScene:'overworld',inWorld:()=>c.currentScene==='overworld',requestIdleCallback:cb=>setTimeout(()=>cb({timeRemaining:()=>2}),0),fetch:async url=>{const file=path.join(root,new URL(url,'https://terrain.test/').pathname);return {ok:true,json:async()=>JSON.parse(await fs.promises.readFile(file,'utf8'))};},landNode(){throw Error('Baked terrain must not sample on the main thread');}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('dist/terrain-streaming.js','utf8'),c);
 const uploads=[],retired=[],gpu={terrain:new Map(),gl:{deleteBuffer:b=>retired.push(b)},upload(data){uploads.push(data);return {buffer:{data},count:data.length/12};}};
 c.realmTerrainUpload=(gpu,chunk,data)=>{const old=chunk.buffer,entry=gpu.upload(data);chunk.buffer=entry.buffer;chunk.count=entry.count;if(old)gpu.gl.deleteBuffer(old);};
 const manager=c.VeldrenTerrainStreaming.create(gpu,true),chunk=(x,z,step)=>({x:x+8,z:z+8,key:'16:stream:'+x+':'+z,targetStep:step,complete:false}),pause=()=>new Promise(r=>setTimeout(r,4));
 const settle=async visible=>{for(let i=0;i<1500;i++){manager.frame(visible,1);if(visible.every(x=>x.complete)&&manager.stats.working===0&&manager.stats.pending===0)return;await pause();}throw Error('Terrain did not settle: '+JSON.stringify(manager.stats));};
 try{
  const near=chunk(192,64,.5),start=performance.now();await settle([near]);const firstMeshMs=performance.now()-start;assert(near.buffer);assert(uploads.length>=2,'coarse first, then fine');assert(requests.length===1,'two LODs share one fetched world page');const stable=near.buffer;await settle([near]);assert.equal(near.buffer,stable);
  near.targetStep=4;await settle([near]);assert.notEqual(near.buffer,stable);assert(retired.includes(stable));assert.equal(requests.length,1,'LOD changes reuse the page');
  const abandoned=chunk(400,400,.5);manager.frame([abandoned],1);manager.frame([],1);for(let i=0;i<30;i++){manager.frame([],1);await pause();}assert(!abandoned.buffer,'a stale result cannot upload after travel');
  for(let lap=0;lap<40;lap++){const cell=chunk((lap%36)*32,Math.floor(lap/36)*32+160,4);c.px=cell.x;c.py=cell.z;await settle([cell]);assert(manager.stats.pages<=12);assert(manager.stats.pageBytes<2*1024*1024);manager.frame([],1);}
  // Live edits take exact current samples in idle tasks, keeping mesh assembly
  // and transfer in the real worker. They never reuse stale baked heights.
  c.landNode=(x,z)=>x*.03+z*.01+2;c.roadInfluence=()=>[0,0,0];c.shoreDistance=()=>20;c.worldWaterDistance=()=>20;c.terrainType=()=>0;c.civilStairWellAt=()=>false;c.realmTerrainMaterial=()=>1;
  manager.frame([],1);manager.invalidate({minX:192,minZ:64,maxX:208,maxZ:80});
  const edited=chunk(192,64,.5);c.px=edited.x;c.py=edited.z;await settle([edited]);
  for(let i=0;i<edited.buffer.data.length;i+=12){const d=edited.buffer.data;assert(Math.abs(d[i+1]-(d[i]*.03+d[i+2]*.01+2))<.00001);}
  const beforeEdit=edited.buffer;c.landNode=(x,z)=>x*.03+z*.01+3;manager.invalidateBase();manager.frame([edited],1);assert.equal(edited.buffer,beforeEdit,'edits keep the old surface until replacement');await settle([edited]);assert.notEqual(edited.buffer,beforeEdit);
  c.currentScene='mine';manager.frame([],2);assert.equal(manager.stats.pending,0);c.currentScene='overworld';await settle([edited]);
  const manifest=JSON.parse(fs.readFileSync('dist/terrain-cells/manifest.json'));assert.equal(Object.keys(manifest.pages).length,1408);
  console.log(JSON.stringify({pass:true,firstMeshMs,terrainPages:Object.keys(manifest.pages).length,workerCacheLimit:12,workerCacheBytes:manager.stats.pageBytes,checks:['32 combinations of horizontal/vertical LOD seams','fine roads/paint','stair holes','water plane','real background worker and transferable meshes','coarse then fine','no main-thread baked sampling','nearby page IO only','LOD page reuse','stale travel results','40 travel cells and bounded memory','offscreen dirty-region snapshots','native edit snapshot fallback','atomic dirty replacement','scene switch','editor base URL']}));
 }finally{manager.destroy();await Promise.all(workers.map(w=>w.terminate()));}
})().catch(error=>{console.error(error);process.exitCode=1;});
