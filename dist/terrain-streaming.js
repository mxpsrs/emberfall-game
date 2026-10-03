'use strict';
(function(root){
 const managers=new Set();
 const idle=root.requestIdleCallback?cb=>root.requestIdleCallback(cb,{timeout:50}):cb=>setTimeout(()=>cb({timeRemaining:()=>2}),0);
 const asset=path=>new URL(typeof realmAssetURL==='function'?realmAssetURL(path):path,root.document?.baseURI||root.location.href).href;
 let manifestPromise=null;
 const manifest=()=>manifestPromise||(manifestPromise=fetch(asset('terrain-cells/manifest.json')).then(r=>{if(!r.ok)throw Error('Terrain cells unavailable');return r.json();}));
 function create(gpu,mobile){
  for(const previous of managers)previous.destroy();
  if(typeof Worker!=='function')return null;
  let worker;try{const url=new URL(asset('terrain-worker.js'),root.location.href);url.searchParams.set('mesher',new URL(asset('terrain-mesher.js'),root.location.href).href);worker=new Worker(url);}catch{return null;}
  let alive=true,initialized=false,baseValid=true,serial=0,epoch=0,busy=null,pending=[],done=[],wanted=new Set(),snapshots=new Map(),lastRevision=-1,dirtyRevision=0,allDirty=false,dirtyRegions=[];
  const stats={mode:'worker',queued:0,working:0,uploads:0,stale:0,failures:0,pages:0,pageBytes:0,workerMs:0,snapshotMs:0};
  const touched=(c,bounds)=>{const left=c.x-8,top=c.z-8;return !bounds||left<=bounds.maxX+2&&left+16>=bounds.minX-2&&top<=bounds.maxZ+2&&top+16>=bounds.minZ-2;};
  const invalidate=(bounds=null,changed=true)=>{
   if(changed){dirtyRevision++;if(!bounds||dirtyRegions.length>=128){allDirty=true;dirtyRegions=[];}else dirtyRegions.push({...bounds});}
   epoch++;snapshots.clear();
   for(const c of wanted){if(!touched(c,bounds))continue;c.complete=false;c.noGeometry=false;if(changed)c.streamDirty=true;c.dirtyRevision=dirtyRevision;}
   pending=[];done=[];lastRevision=-1;
  };
  manifest().then(m=>{
   if(!alive)return;
   if(m.format!=='veldren.terrain-cells'||m.version!==1)throw Error('Incompatible terrain cells');
   const source=root.VeldrenWorldEdits?.state?.world;
   baseValid=baseValid&&!!root.VeldrenPrebuiltWorld&&m.sourceKey===root.VeldrenPrebuiltWorld.fingerprint(source);
   const urls={};for(const path of Object.values(m.pages))urls[path]=new URL(asset(path),root.location.href).href;
   worker.postMessage({type:'init',manifest:m,urls,maxPages:mobile?12:24});initialized=true;pump();
  }).catch(error=>{initialized=true;baseValid=false;stats.failures++;console.warn('Terrain page fallback:',error.message);pump();});
  function sourceSnapshot(c,token){
   const x=c.x-8,z=c.z-8,n=16,side=n+3,cs=n*2+1;
   const h=new Float32Array(side*side),colors=new Uint8Array(cs*cs*3),flags=new Uint8Array(n*n),materials=new Uint8Array(n*n*4);
   const counts=[h.length,cs*cs,n*n,materials.length];let phase=0,index=0;
   return new Promise(resolve=>{
    const slice=()=>{
     if(!alive||token!==epoch||!wanted.has(c)||typeof inWorld!=='function'||!inWorld()){resolve(null);return;}
     const start=performance.now(),budget=mobile?2:4;let units=0;
     // Snapshot edits in bounded idle tasks, never inside terrain rendering.
     // These samples use the same live native foundations, pads and height edits
     // as collision. Only the worker emits triangles or allocates vertex arrays.
     while(phase<4&&units++<32&&performance.now()-start<budget){
      if(phase===0){const a=x+index%side-1,b=z+Math.floor(index/side)-1;h[index]=landNode(a,b);}
      else if(phase===1){const a=x+(index%cs)/2,b=z+Math.floor(index/cs)/2,r=roadInfluence(a,b),k=index*3;colors[k]=Math.round(Math.max(0,Math.min(1,r[0]))*255);colors[k+1]=Math.round(Math.max(0,Math.min(1,r[1]))*255);colors[k+2]=Math.round(Math.max(0,Math.min(1,shoreDistance(a,b)/4))*255);}
      else if(phase===2){const a=x+index%n,b=z+Math.floor(index/n),t=terrainType(a,b),shore=[[a,b],[a,b+1],[a+1,b+1],[a+1,b]].some(p=>Math.abs(worldWaterDistance(...p))<2);flags[index]=(t!==3||shore?1:0)|(t===3||shore?2:0)|(civilStairWellAt(a+.5,b+.5)?4:0);}
      else {const a=x+(index%(n*2))/2,b=z+Math.floor(index/(n*2))/2;materials[index]=realmTerrainMaterial(roadInfluence(a+.25,b+.25),Math.floor(a),Math.floor(b))|(root.VeldrenTerrainEdits?.paint(a,b)?128:0);}
      if(++index===counts[phase]){phase++;index=0;}
     }
     stats.snapshotMs=performance.now()-start;
     if(phase<4)idle(slice);else resolve({x,z,size:n,heights:h,colors,flags,materials});
    };idle(slice);
   });
  }
  async function pump(){
   if(!alive||!initialized||busy||done.length>=2||!pending.length)return;
   const c=pending.shift();if(!wanted.has(c)){pump();return;}
   const token=epoch,id=++serial,step=c.buffer?c.targetStep:Math.max(2,c.targetStep);busy={c,token,id,step};
   let snapshot=null;
   if(!baseValid||c.streamDirty){snapshot=snapshots.get(c.key);if(!snapshot){snapshot=await sourceSnapshot(c,token);if(snapshot)snapshots.set(c.key,snapshot);}}
   if(!alive||!busy||busy.id!==id)return;
   if(token!==epoch||!wanted.has(c)||(!baseValid||c.streamDirty)&&!snapshot){busy=null;pump();return;}
   const job={type:'mesh',id,epoch:token,x:c.x-8,z:c.z-8,size:16,step,snapshot};
   // Retain the small immutable samples for subsequent LOD changes; the large
   // result uses a transferable ArrayBuffer and is never copied through JSON.
   worker.postMessage(job);
  }
  worker.onmessage=event=>{
   if(!alive)return;
   const result=event.data,job=busy;if(!job||result.id!==job.id)return;busy=null;
   if(job.token!==epoch||!wanted.has(job.c)){stats.stale++;pump();return;}
   if(result.type==='error'){stats.failures++;job.c.streamDirty=true;baseValid=false;pending.unshift(job.c);}
   else {stats.pages=result.pages;stats.pageBytes=result.pageBytes;stats.workerMs=result.ms;done.push({...result,c:job.c});}
   // Bound pending upload memory as well as worker concurrency.
   if(done.length<2)pump();
  };
  worker.onerror=error=>{stats.failures++;alive=false;worker.terminate();console.warn('Terrain worker unavailable; using bounded terrain fallback.',error.message);};
  function frame(visible,revision){
   if(!alive)return false;
   if(lastRevision!==-1&&lastRevision!==revision)invalidate(null,false);lastRevision=revision;
   wanted=new Set(visible);
   for(const c of visible)if(c.dirtyRevision!==dirtyRevision){if(allDirty||dirtyRegions.some(b=>touched(c,b))){c.streamDirty=true;c.complete=false;c.noGeometry=false;}c.dirtyRevision=dirtyRevision;}
   pending=pending.filter(c=>wanted.has(c));done=done.filter(r=>{if(wanted.has(r.c)&&r.epoch===epoch)return true;stats.stale++;return false;});
   for(const key of snapshots.keys())if(!visible.some(c=>c.key===key))snapshots.delete(key);
   const start=performance.now(),budget=mobile?2:4;let uploads=0;
   while(done.length&&uploads<(mobile?1:2)&&performance.now()-start<budget){const result=done.shift(),c=result.c;if(result.data.length)realmTerrainUpload(gpu,c,result.data);else {if(c.buffer)gpu.gl.deleteBuffer(c.buffer);c.buffer=null;c.count=0;}c.builtStep=result.requestedStep;c.complete=result.requestedStep===c.targetStep;c.noGeometry=result.data.length===0;c.build=null;uploads++;}
   const queued=new Set(pending);if(busy)queued.add(busy.c);for(const result of done)queued.add(result.c);
   for(const c of visible)if((!c.complete||c.builtStep!==c.targetStep)&&!queued.has(c)){pending.push(c);queued.add(c);}
   pending.sort((a,b)=>((a.x-px)**2+(a.z-py)**2)-((b.x-px)**2+(b.z-py)**2));
   // Only visible cells remain in the scheduler; completed output and source
   // snapshots cannot accumulate during fast travel or repeated scene switches.
   stats.queued=pending.length;stats.working=busy?1:0;stats.uploads=uploads;stats.ms=performance.now()-start;stats.budgetMs=budget;stats.pending=pending.length+done.length+(busy?1:0);stats.slices=0;stats.fallbackSlices=0;gpu.terrainWork=stats;
   pump();return true;
  }
  const manager={frame,invalidate,invalidateBase(){baseValid=false;invalidate();},destroy(){if(alive){alive=false;worker.terminate();}pending=[];done=[];busy=null;snapshots.clear();managers.delete(manager);},stats};managers.add(manager);return manager;
 }
 root.addEventListener?.('pagehide',()=>{for(const manager of managers)manager.destroy();},{once:true});
 root.VeldrenTerrainStreaming={create,invalidate(bounds){for(const m of managers)m.invalidate(bounds);},invalidateBase(){for(const m of managers)m.invalidateBase();}};
})(globalThis);
