'use strict';
// Filament handle marshalling. C++ validates and assembles all geometry packets.
const veldrenFrameBuildQueues=new WeakMap();
function getVeldrenFrameBuildQueue(engine){
 let queue=veldrenFrameBuildQueues.get(engine);if(queue)return queue;
 const tasks=[];let scheduled=false,frames=0,lastCount=0,maxCount=0,total=0,mobileTasks=0;
 const now=()=>globalThis.performance?.now?.()??Date.now();
 function schedulePump(){if(scheduled||!tasks.length)return;scheduled=true;const run=()=>{scheduled=false;const start=now(),mobile=mobileTasks>0,max=mobile?3:6,budget=mobile?4:6;let count=0;
   while(tasks.length&&count<max){const task=tasks.shift();if(task.profile==='browser-mobile')mobileTasks--;if(task.cancelled)continue;try{task.resolve(task.work());}catch(error){task.reject(error);}count++;if(count&&now()-start>=budget)break;}
   frames++;lastCount=count;maxCount=Math.max(maxCount,count);total+=count;if(tasks.length)schedulePump();
  };
   if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else if(typeof setTimeout==='function')setTimeout(run,0);else Promise.resolve().then(run);
 }
 queue=Object.freeze({schedule(work,profile='browser'){return new Promise((resolve,reject)=>{tasks.push({work,profile,resolve,reject,cancelled:false});if(profile==='browser-mobile')mobileTasks++;schedulePump();});},diagnostics:()=>({queued:tasks.length,frames,lastCount,maxCount,total})});
 veldrenFrameBuildQueues.set(engine,queue);return queue;
}
function createVeldrenModelResources(engine,assets,materials,filament=Filament){
 const geometry=new Map(),models=new Map(),leases=new Set(),buildQueue=getVeldrenFrameBuildQueue(engine);let disposed=false;
 const unsubscribe=assets.onDispose(destroy),abort=()=>Object.assign(Error('Model resource retired'),{name:'AbortError'});
 const decode=(value,Type)=>{if(ArrayBuffer.isView(value))return value instanceof Type?value:new Type(value.buffer,value.byteOffset,value.byteLength/Type.BYTES_PER_ELEMENT);const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return new Type(bytes.buffer);};
 function geometryLease(packet){
  let entry=geometry.get(packet.key);
  if(!entry){
   let vb=null,ib=null;const A=filament.VertexAttribute,T=filament.VertexBuffer$AttributeType;
   try{
    const builder=new filament.SurfaceOrientation$Builder().vertexCount(packet.count);
    builder.normals(decode(packet.normals,Float32Array),12);builder.tangents(decode(packet.tangents,Float32Array),16);
    const orientation=builder.build();let tangents;try{tangents=orientation.getQuats(packet.count);}finally{orientation.delete();}
    const vertex=filament.VertexBuffer.Builder().vertexCount(packet.count).bufferCount(packet.joints?4:2)
     .attribute(A.POSITION,0,T.FLOAT3,0,packet.stride).attribute(A.COLOR,0,T.FLOAT4,12,packet.stride)
     .attribute(A.TANGENTS,1,T.SHORT4,0,8).normalized(A.TANGENTS);
    for(let channel=0;channel<8;channel++)vertex.attribute(A[channel<2?'UV'+channel:'CUSTOM'+(channel-2)],0,T.FLOAT2,28+channel*8,packet.stride);
    if(packet.joints){vertex.attribute(A.BONE_INDICES,2,T.USHORT4,0,8);vertex.attribute(A.BONE_WEIGHTS,3,T.FLOAT4,0,16);}
    vb=vertex.build(engine);const vertices=decode(packet.vertices,Float32Array);vb.setBufferAt(engine,0,vertices);vb.setBufferAt(engine,1,tangents);
    if(packet.joints){vb.setBufferAt(engine,2,Uint16Array.from(decode(packet.joints,Float32Array)));vb.setBufferAt(engine,3,decode(packet.weights,Float32Array));}
    const indices=decode(packet.indices,Uint32Array);ib=filament.IndexBuffer.Builder().indexCount(packet.indexCount).bufferType(filament.IndexBuffer$IndexType.UINT).build(engine);ib.setBuffer(engine,indices);
    entry={vb,ib,bounds:packet.bounds,users:0,bytes:vertices.byteLength+tangents.byteLength+indices.byteLength+(packet.joints?packet.count*24:0)};
    geometry.set(packet.key,entry);
   }catch(error){if(vb)engine.destroyVertexBuffer(vb);if(ib)engine.destroyIndexBuffer(ib);throw error;}
  }
  entry.users++;let closed=false;return {resource:entry,release(){if(closed)return;closed=true;if(--entry.users===0){engine.destroyVertexBuffer(entry.vb);engine.destroyIndexBuffer(entry.ib);geometry.delete(packet.key);}}};
 }
 function clean(entry){
  if(entry.cleaned)return;entry.cleaned=true;
  for(const lease of entry.geometry)lease.release();entry.geometry=[];
  for(const lease of entry.materials)lease.release();entry.materials=[];
  entry.model.release();
 }
 async function build(entry){
  const check=()=>{if(disposed||entry.retired)throw abort();};
  try{
   const prepared=await entry.model.ready;check();const plan=entry.prepared?prepared:assets.renderPlan(prepared);entry.plan=plan;
   const meshes=new Map();for(const packet of plan.geometry){check();const lease=await buildQueue.schedule(()=>{check();const lease=geometryLease(packet);entry.geometry.push(lease);return lease;},entry.profile);check();meshes.set(packet.key,lease.resource);}
   const bound=new Map();
   for(const draw of plan.draws){const material=entry.materialOverride||draw.material;if(bound.has(material))continue;check();const lease=await buildQueue.schedule(()=>{check();const lease=materials.acquire(material,entry.profile);entry.materials.push(lease);return lease;},entry.profile);check();bound.set(material,await lease.ready);}
   check();return Object.freeze({plan,draws:plan.draws.map(draw=>Object.freeze({...draw,resource:meshes.get(draw.geometry),materialInstance:bound.get(entry.materialOverride||draw.material)}))});
  }catch(error){clean(entry);throw error;}
 }
 function release(lease){
  if(lease.closed)return;lease.closed=true;leases.delete(lease);const entry=lease.entry;
  if(--entry.users===0){entry.retired=true;if(models.get(entry.key)===entry)models.delete(entry.key);clean(entry);}
 }
 function acquire(id,profile,options={}){
  if(disposed)throw Error('Model resource owner destroyed');const generation=assets.record(id).generation,key=id+'@'+generation+':'+profile+(options.material?':'+options.material+'@'+assets.record(options.material).generation:'');
  let entry=models.get(key);
  if(!entry){entry={key,profile,materialOverride:options.material||null,users:0,retired:false,cleaned:false,geometry:[],materials:[],prepared:!!assets.leaseRenderPlan,model:assets.leaseRenderPlan?assets.leaseRenderPlan(id):assets.leaseModel(id)};models.set(key,entry);entry.ready=Promise.resolve().then(()=>build(entry));}
  entry.users++;const lease={entry,closed:false};leases.add(lease);
  return Object.freeze({id,generation,ready:entry.ready.then(value=>{if(lease.closed||disposed)throw abort();return value;}).catch(error=>{release(lease);throw error;}),release:()=>release(lease)});
 }
 function destroy(){if(disposed)return;disposed=true;unsubscribe();for(const lease of [...leases])release(lease);}
 function acquirePlan(descriptor,profile){
  if(disposed)throw Error('Model resource owner destroyed');const key=descriptor.id+'@'+descriptor.generation+':'+profile;let entry=models.get(key);
  if(!entry){entry={key,profile,materialOverride:null,users:0,retired:false,cleaned:false,geometry:[],materials:[],prepared:true,model:{ready:Promise.resolve(descriptor.plan),release(){}}};models.set(key,entry);entry.ready=Promise.resolve().then(()=>build(entry));}
  entry.users++;const lease={entry,closed:false};leases.add(lease);return {id:descriptor.id,generation:descriptor.generation,ready:entry.ready.then(value=>{if(lease.closed||disposed)throw abort();return value;}).catch(error=>{release(lease);throw error;}),release:()=>release(lease)};
 }
 return Object.freeze({acquire,acquirePlan,destroy,scheduleBuild:(work,profile='browser')=>buildQueue.schedule(work,profile),diagnostics:()=>({models:models.size,geometry:geometry.size,leases:leases.size,gpuBytes:[...geometry.values()].reduce((n,e)=>n+e.bytes,0),buildQueue:buildQueue.diagnostics()})});
}
