'use strict';
// Static presentation derived from canonical C++ render plans. Authored Scene
// entities, collision, editor history and the registry keep their existing owners.
(function(root){
 const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 function multiply(a,b){const out=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
 const column=m=>[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1];
 const decode=(v,T)=>ArrayBuffer.isView(v)?v:new T(Uint8Array.from(atob(v),c=>c.charCodeAt(0)).buffer);
 function basis(m){
  const a=m[0],b=m[4],c=m[8],d=m[1],e=m[5],f=m[9],g=m[2],h=m[6],i=m[10],det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
  if(!Number.isFinite(det)||Math.abs(det)<1e-10)throw Error('Singular building LOD transform');
  return {det,normal:[(e*i-f*h)/det,(f*g-d*i)/det,(d*h-e*g)/det,(c*h-b*i)/det,(a*i-c*g)/det,(b*g-a*h)/det,(b*f-c*e)/det,(c*d-a*f)/det,(a*e-b*d)/det]};
 }
 function merge(key,modules,maxBytes=16*1024*1024){
  const groups=new Map();let originalDraws=0,totalBytes=0;
  for(const module of modules){const geometry=new Map(module.plan.geometry.map(p=>[p.key,p]));
   for(const draw of module.plan.draws){const packet=geometry.get(draw.geometry);
    if(!packet||draw.skin||packet.joints||!draw.instancingEligible||packet.stride!==92)throw Error('Building LOD requires static canonical geometry');
    originalDraws++;totalBytes+=packet.count*120+packet.indexCount*4;if(totalBytes>maxBytes)throw Error('Building LOD exceeds its geometry budget');
    let group=groups.get(draw.material);if(!group)groups.set(draw.material,group={material:draw.material,parts:[],count:0,indexCount:0});
    group.parts.push({packet,matrix:multiply(column(module.matrix),draw.matrix)});group.count+=packet.count;group.indexCount+=packet.indexCount;
   }
  }
  if(!groups.size||groups.size>=originalDraws)throw Error('Building LOD has no batching benefit');
  const geometry=[],draws=[];let triangles=0;
  for(const group of groups.values()){
   const vertices=new Float32Array(group.count*23),normals=new Float32Array(group.count*3),tangents=new Float32Array(group.count*4),indices=new Uint32Array(group.indexCount),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];let offset=0,indexOffset=0;
   for(const {packet,matrix:m} of group.parts){const source=decode(packet.vertices,Float32Array),n=decode(packet.normals,Float32Array),t=decode(packet.tangents,Float32Array),ix=decode(packet.indices,Uint32Array),{det,normal}=basis(m);
    for(let v=0;v<packet.count;v++){const p=v*23,q=(v+offset)*23,x=source[p],y=source[p+1],z=source[p+2];vertices.set(source.subarray(p,p+23),q);
     for(let a=0;a<3;a++){const value=m[a]*x+m[4+a]*y+m[8+a]*z+m[12+a];if(!Number.isFinite(value))throw Error('Nonfinite building LOD vertex');vertices[q+a]=value;lo[a]=Math.min(lo[a],value);hi[a]=Math.max(hi[a],value);}
     const nx=n[v*3],ny=n[v*3+1],nz=n[v*3+2],normalOut=[normal[0]*nx+normal[1]*ny+normal[2]*nz,normal[3]*nx+normal[4]*ny+normal[5]*nz,normal[6]*nx+normal[7]*ny+normal[8]*nz],length=Math.hypot(...normalOut)||1;
     for(let a=0;a<3;a++)normalOut[a]/=length;normals.set(normalOut,(v+offset)*3);
     const tx=t[v*4],ty=t[v*4+1],tz=t[v*4+2],tangent=[m[0]*tx+m[4]*ty+m[8]*tz,m[1]*tx+m[5]*ty+m[9]*tz,m[2]*tx+m[6]*ty+m[10]*tz],dot=tangent.reduce((sum,value,a)=>sum+value*normalOut[a],0);
     for(let a=0;a<3;a++)tangent[a]-=dot*normalOut[a];const tl=Math.hypot(...tangent)||1;
     for(let a=0;a<3;a++)tangents[(v+offset)*4+a]=tangent[a]/tl;tangents[(v+offset)*4+3]=t[v*4+3]*(det<0?-1:1);
    }
    for(let j=0;j<ix.length;j+=3){indices[indexOffset+j]=ix[j]+offset;indices[indexOffset+j+1]=ix[j+(det<0?2:1)]+offset;indices[indexOffset+j+2]=ix[j+(det<0?1:2)]+offset;}
    offset+=packet.count;indexOffset+=packet.indexCount;
   }
   const id=key+':material:'+geometry.length;geometry.push({key:id,id,count:group.count,indexCount:group.indexCount,stride:92,vertices,normals,tangents,indices,bounds:{center:lo.map((v,a)=>(v+hi[a])*.5),halfExtent:lo.map((v,a)=>Math.max(.001,(hi[a]-v)*.5))}});
   draws.push({geometry:id,material:group.material,matrix:identity(),instancingEligible:true});triangles+=group.indexCount/3;
  }
  return {id:key,geometry,draws,stats:{sourceDraws:originalDraws,draws:draws.length,triangles,bytes:totalBytes}};
 }
 function create(assets,retire,profile){
  const records=new Map(),budget=profile==='browser-mobile'?16*1024*1024:32*1024*1024,maxBytes=profile==='browser-mobile'?8*1024*1024:12*1024*1024;let scene=null,frame=0,serial=0,pending=0,bytes=0,disposed=false,stats={};
  function remove(key,r){if(records.get(key)!==r)return;records.delete(key);r.cancelled=true;r.lease?.release();if(r.descriptor){bytes-=r.descriptor.plan.stats.bytes;retire(r.descriptor.id);}}
  function clear(){for(const [key,r]of records)remove(key,r);}
  const unsubReload=assets.onReload(clear),unsubDispose=assets.onDispose(destroy);
  function begin(next){frame++;if(scene!==next){clear();scene=next;}stats={eligible:0,active:0,sourceDraws:0,draws:0,nearTriangles:0,farTriangles:0};for(const [key,r]of records)if(frame-r.seen>120)remove(key,r);}
  function request(cached,id,pose,groundRevision){
   if(disposed||root.VELDREN_BUILDING_LOD===false||String(root.VELDREN_CONTEXT||'').toLowerCase()==='editor'||!id||cached.kind!=='assembly'||cached.instances.length<8||root.VeldrenBuildings?.floorFilter||cached.instances.some(i=>i.ghost))return null;
   const key=scene+':'+id;let r=records.get(key);
   if(r&&(r.source!==cached||r.groundRevision!==groundRevision||r.model.some((v,i)=>v!==cached.model[i]))){remove(key,r);r=null;}
   if(!r){
    const A=root.VeldrenAssembly,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(const i of cached.instances){if(!i.mesh.canonicalAsset||!assets.has(i.mesh.canonicalAsset)||assets.record(i.mesh.canonicalAsset).importSettings?.importer!=='veldren-gltf-1'||!i.mesh.bounds)return null;
     const m=A.multiply(cached.model,i.matrix),ground=typeof landHeight==='function'?landHeight(m[3],m[11]):0;for(const x of [i.mesh.bounds[0][0],i.mesh.bounds[1][0]])for(const y of [i.mesh.bounds[0][1],i.mesh.bounds[1][1]])for(const z of [i.mesh.bounds[0][2],i.mesh.bounds[1][2]]){const p=A.point(m,[x,y,z]);p[1]+=ground;for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}}}
    r={source:cached,model:Array.from(cached.model),groundRevision,lo,hi,far:false,seen:frame,cancelled:false};records.set(key,r);
   }
   r.seen=frame;const distance=Math.hypot(...pose.eye.map((v,a)=>Math.max(r.lo[a]-v,0,v-r.hi[a]))),playerDistance=typeof px==='number'?Math.hypot(Math.max(r.lo[0]-px,0,px-r.hi[0]),Math.max(r.lo[2]-py,0,py-r.hi[2])):Infinity;
   const height=r.hi[1]-r.lo[1],focal=typeof cameraFocalLength3==='function'?cameraFocalLength3(screen.h):500,pixels=height*focal/Math.max(.1,distance);
   r.far=playerDistance>24&&distance>(r.far?62:74)&&pixels<(r.far?200:160);if(!r.far)return null;stats.eligible++;
   if(r.descriptor)return r.descriptor;if(r.lease||r.failed||pending>=(profile==='browser-mobile'?1:2))return null;
   const A=root.VeldrenAssembly,inverse=A.inverse(cached.model),ground=typeof landHeight==='function'?landHeight(cached.model[3],cached.model[11]):0;
   const modules=cached.instances.map(i=>{const definition=assets.record(i.mesh.canonicalAsset),levels=definition.lods||[],id=levels.at(-1)?.asset||definition.id,m=A.multiply(cached.model,i.matrix),delta=(typeof landHeight==='function'?landHeight(m[3],m[11]):0)-ground,matrix=Array.from(i.matrix);matrix[3]+=inverse[1]*delta;matrix[7]+=inverse[5]*delta;matrix[11]+=inverse[9]*delta;return {id,matrix};});
   const resourceId='building-lod:'+scene+':'+id+':'+(++serial);pending++;
   try{r.lease=assets.leaseBuildingPlan(resourceId,modules,maxBytes);}catch(error){pending--;r.failed=String(error);return null;}
   r.lease.ready.then(plan=>{
    if(r.cancelled||disposed||records.get(key)!==r)return;
    for(const [otherKey,other]of [...records].sort((a,b)=>a[1].seen-b[1].seen)){if(bytes+plan.stats.bytes<=budget)break;if(other!==r&&other.seen!==frame)remove(otherKey,other);}
    if(bytes+plan.stats.bytes>budget){r.failed='Building LOD cache budget';return;}
    bytes+=plan.stats.bytes;r.descriptor={id:resourceId,generation:serial,plan,nearTriangles:cached.instances.reduce((sum,i)=>sum+(i.mesh.i?.length||0)/3,0)};
   },error=>{r.failed=String(error);}).finally(()=>{r.lease.release();r.lease=null;pending--;});return null;
  }
  function active(d){stats.active++;stats.sourceDraws+=d.plan.stats.sourceDraws;stats.draws+=d.plan.stats.draws;stats.nearTriangles+=d.nearTriangles;stats.farTriangles+=d.plan.stats.triangles;}
  function destroy(){if(disposed)return;disposed=true;clear();unsubReload();unsubDispose();}
  return {begin,request,active,destroy,diagnostics:()=>({...stats,pending,retainedBytes:bytes,budgetBytes:budget,cached:records.size,skipped:[...records.values()].filter(r=>r.failed).map(r=>r.failed)})};
 }
 root.VeldrenBuildingLOD={merge,create};
})(globalThis);
