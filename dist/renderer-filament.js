'use strict';
function createVeldrenGpuTimer(surface){
 const gl=surface.getContext?.('webgl2'),ext=gl?.getExtension?.('EXT_disjoint_timer_query_webgl2'),pending=[];let active=null,lastMs=null;
 if(!ext||typeof gl.createQuery!=='function')return {begin(){},end(){},sample:()=>null,supported:false};
 return {supported:true,begin(){
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){for(const query of pending)gl.deleteQuery(query);pending.length=0;lastMs=null;}
  while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const query=pending.shift();lastMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(query);}
  if(pending.length>=4||gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))return;
  active=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,active);
 },end(){if(!active)return;gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active);active=null;},sample:()=>lastMs};
}
// Primary live world renderer. Existing authored mesh packets feed Filament
// vertex/index buffers, preserving material IDs, transforms and camera math.
function realmFilamentMatrixInto(model,out){
 if(!model){out.set(realmIdentityModel);return out;}
 const ground=typeof landHeight==='function'?landHeight(model[3],model[11]):0;
 out[0]=model[0];out[1]=model[4];out[2]=model[8];out[3]=0;
 out[4]=model[1];out[5]=model[5];out[6]=model[9];out[7]=0;
 out[8]=model[2];out[9]=model[6];out[10]=model[10];out[11]=0;
 out[12]=model[3];out[13]=model[7]+ground;out[14]=model[11];out[15]=1;
 return out;
}
function realmFilamentGroundRevision(){return (typeof currentScene==='string'?currentScene:'')+':'+(typeof landSurfaceRevision==='number'?landSurfaceRevision:0)+':'+(window.VeldrenTerrainEdits?.revision??0);}
function realmFilamentSourceMatches(source,model){if(!source)return false;const values=model||realmIdentityModel;for(let i=0;i<12;i++)if(source[i]!==values[i])return false;return true;}
function realmFilamentRememberSource(source,model){const values=model||realmIdentityModel;for(let i=0;i<12;i++)source[i]=values[i];}
function realmFilamentMatrix(model){return realmFilamentMatrixInto(model,new Float32Array(16));}
function realmFilamentCameraCenter(x,y,z,yaw,pitch,zoom,dpr){
 const c=Math.cos(yaw),s=Math.sin(yaw),st=Math.sin(pitch),ct=Math.cos(pitch),depth=x*s*ct+y*st+z*c*ct;
 const step=1/(Math.max(1,zoom)*Math.max(1,dpr)),right=Math.round((x*c-z*s)/step)*step,up=Math.round(((x*s+z*c)*st-y*ct)/step)*step;
 return [right*c+up*s*st+depth*s*ct,-up*ct+depth*st,-right*s+up*c*st+depth*c*ct];
}
function realmFilamentCameraState(){
 return cameraPose3();
}
const realmFilamentWorldStyle={key:'t0:b0:d0',boss:0,dissolve:0,terrain:0};
const realmFilamentTerrainStyle={key:'t1:b0:d0',boss:0,dissolve:0,terrain:1};
const realmFilamentStyleCache=new Map();
function realmFilamentStyle(entry){
 const dissolve=Math.max(0,Math.min(1,Number(entry.dissolve)||0)),boss=Number(entry.bossColor)||0,terrain=entry.terrain?1:0;
 if(!boss&&!dissolve)return terrain?realmFilamentTerrainStyle:realmFilamentWorldStyle;
 const key='t'+terrain+':b'+Math.round(boss*10)+':d'+Math.round(dissolve*20);
 let style=realmFilamentStyleCache.get(key);if(!style){style={key,boss,dissolve:Math.round(dissolve*20)/20,terrain};realmFilamentStyleCache.set(key,style);}return style;
}
function realmMobileFilament(){return window.matchMedia?.('(pointer: coarse)')?.matches===true||typeof navigator!=='undefined'&&/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'');}
function realmFilamentShadowOptions(){
 return realmMobileFilament()
  ?{mapSize:1024,shadowCascades:1,stable:true,normalBias:.6,constantBias:.001,maxShadowDistance:80}
  :{mapSize:2048,shadowCascades:2,stable:true,normalBias:.6,constantBias:.001,maxShadowDistance:95};
}
function realmFilamentFogOptions(lighting,color){
 const interior=Math.max(lighting.cave||0,lighting.house||0);
 return {enabled:interior<.5,distance:80,density:.003,maximumOpacity:.28,
  height:0,heightFalloff:.002,color,fogColorFromIbl:false,inScatteringSize:-1};
}
function realmFilamentQualityProfile(){
 return realmMobileFilament()
  ?{anisotropy:8,glbBytes:32*1024*1024,ao:false,dithering:false,lightLimit:8}
  :{anisotropy:16,glbBytes:96*1024*1024,ao:false,dithering:false,lightLimit:12};
}
function realmFilamentBounds(positions){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<positions.length;i+=3)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],positions[i+a]);hi[a]=Math.max(hi[a],positions[i+a]);}
 if(!Number.isFinite(lo[0]))return {center:[0,0,0],halfExtent:[1,1,1]};
 return {center:lo.map((v,i)=>(v+hi[i])*.5),halfExtent:lo.map((v,i)=>Math.max(.001,(hi[i]-v)*.5))};
}
function realmFilamentNative(stage,task){
 try{return task();}catch(error){const wrapped=new Error('Filament '+stage+' failed: '+String(error));wrapped.cause=error;throw wrapped;}
}
function realmFilamentArrays(raw,stride=12){
 const count=Math.floor(raw.length/stride),positions=new Float32Array(count*3),normals=new Float32Array(count*3),colors=new Float32Array(count*4),uvs=new Float32Array(count*2);
 let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
 for(let i=0;i<count;i++){
  const source=i*stride,p=i*3,u=i*2,c=i*4;
  // Avoid two short-lived typed-array views per vertex and a second bounds pass.
  positions[p]=raw[source];positions[p+1]=raw[source+1];positions[p+2]=raw[source+2];
  normals[p]=raw[source+3];normals[p+1]=raw[source+4];normals[p+2]=raw[source+5];
  const x=positions[p],y=positions[p+1],z=positions[p+2];
  minX=Math.min(minX,x);minY=Math.min(minY,y);minZ=Math.min(minZ,z);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxZ=Math.max(maxZ,z);
  colors[c]=Number.isFinite(raw[source+6])?Math.max(0,raw[source+6]):0;colors[c+1]=Number.isFinite(raw[source+7])?Math.max(0,raw[source+7]):0;colors[c+2]=Number.isFinite(raw[source+8])?Math.max(0,raw[source+8]):0;colors[c+3]=Number.isFinite(raw[source+9])?raw[source+9]:0;
  uvs[u]=raw[source+10]||0;uvs[u+1]=raw[source+11]||0;
 }
 const bounds=Number.isFinite(minX)?{center:[(minX+maxX)*.5,(minY+maxY)*.5,(minZ+maxZ)*.5],halfExtent:[Math.max(.001,(maxX-minX)*.5),Math.max(.001,(maxY-minY)*.5),Math.max(.001,(maxZ-minZ)*.5)]}:{center:[0,0,0],halfExtent:[1,1,1]};
 return {count,positions,normals,colors,uvs,bounds};
}
function createRealmFilamentGPU(){
 if(typeof Filament==='undefined'||!window.VELDREN_FILAMENT_ASSETS)throw new Error('Filament assets are not ready');
 const surface=document.createElement('canvas'),canvas=document.getElementById('world');
 surface.className='realm-surface';surface.setAttribute('aria-hidden','true');surface.dataset.renderer='filament';
 if(!canvas?.parentElement)throw new Error('World surface is unavailable');
 const initialDpr=realmPixelScale(),initialWidth=Math.max(1,Math.floor(screen.w*initialDpr)),initialHeight=Math.max(1,Math.floor(screen.h*initialDpr));
 surface.width=initialWidth;surface.height=initialHeight;
 canvas.parentElement.insertBefore(surface,canvas);
 const engine=Filament.Engine.create(surface,{backend:Filament.Backend.OPENGL});
 const gpuTimer=createVeldrenGpuTimer(surface);
 engine.setAutomaticInstancingEnabled(true);
 const scene=engine.createScene(),swapChain=engine.createSwapChain(),renderer=engine.createRenderer(),view=engine.createView();
 const cameraEntity=Filament.EntityManager.get().create(),camera3d=engine.createCamera(cameraEntity);
 const quality=realmFilamentQualityProfile();
 view.setCamera(camera3d);view.setScene(scene);view.setViewport([0,0,initialWidth,initialHeight]);view.setPostProcessingEnabled(true);view.setShadowingEnabled(true);view.setAntiAliasing(Filament.View$AntiAliasing.FXAA);view.setAmbientOcclusion(Filament.View$AmbientOcclusion.NONE);view.setDithering(Filament.View$Dithering.NONE);
 const colorGrading=Filament.ColorGrading.Builder().quality(Filament.ColorGrading$QualityLevel.MEDIUM).toneMapping(Filament.ColorGrading$ToneMapping.ACES).exposure(.2).contrast(1.04).saturation(1.03).vibrance(1.08).gamutMapping(true).build(engine);view.setColorGrading(colorGrading);
 // Low-order sky irradiance gives upward faces a cool fill and downward faces
 // a softer ground response without adding a texture or another render pass.
 const skySh=new Float32Array([.62,.68,.76,-.045,-.06,-.08,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
 const indirectLight=Filament.IndirectLight.Builder().irradianceSh(3,skySh).intensity(18000).build(engine);scene.setIndirectLight(indirectLight);
 const assets=window.VELDREN_FILAMENT_ASSETS,material=engine.createMaterial(assets.material),terrainMaterial=engine.createMaterial(assets.terrainMaterial);
 const textureResources=createVeldrenTextureResources(engine,VeldrenAssets),textureSettings={colorSpace:'srgb',maxDimension:realmMobileFilament()?1024:2048};
 let atlas,groundSurfaces;
 try{atlas=textureResources.acquire(assets.atlasBytes,textureSettings).texture;groundSurfaces=textureResources.acquire(assets.groundSurfacesBytes,textureSettings).texture;}
 catch(error){textureResources.destroy();throw error;}
 assets.atlasBytes=null;assets.groundSurfacesBytes=null;
 const materialResources=createVeldrenMaterialResources(engine,VeldrenAssets,textureResources),modelResources=createVeldrenModelResources(engine,VeldrenAssets,materialResources);
 const resourceProfile=realmMobileFilament()?'browser-mobile':'browser',streaming=typeof createVeldrenWorldStreaming==='function'?createVeldrenWorldStreaming(realmNative.scenes,VeldrenAssets,modelResources,resourceProfile):null,constructionBudget=createVeldrenRenderableBudget(resourceProfile);
 const assetDraws=createVeldrenAssetDraws(engine,scene,VeldrenAssets,modelResources,resourceProfile,Filament,streaming,constructionBudget);
 const authoredDraws=typeof createVeldrenSceneRenderer==='function'?createVeldrenSceneRenderer(realmNative.scenes,VeldrenAssets,createVeldrenAssetDraws(engine,scene,VeldrenAssets,modelResources,resourceProfile,Filament,streaming,constructionBudget)):null;
 const canonicalEligibility=new Map();
 function canonicalEntry(mesh,model,style={}){
  if(mesh.poseSource)return {...poseEntry(mesh),model,...style};
  const id=mesh.canonicalAsset;if(!id||style.dissolve||style.boss)return {...realmMeshEntry(backend,mesh),model,...style};
  if(!canonicalEligibility.has(id))canonicalEligibility.set(id,VeldrenAssets.has(id)&&VeldrenAssets.record(id).importSettings?.importer==='veldren-gltf-1');
  if(canonicalEligibility.get(id))return {canonicalAsset:id,mesh,model,...style};
  if(VeldrenAssets.has(id)&&VeldrenAssets.record(id).lods?.length>1)return {lodAsset:id,mesh,model,...style};
  return {...realmMeshEntry(backend,mesh),model,...style};
 }
 const minFilter=Filament.MinFilter.LINEAR_MIPMAP_LINEAR;
 const sampler=new Filament.TextureSampler(minFilter,Filament.MagFilter.LINEAR,Filament.WrapMode.CLAMP_TO_EDGE);sampler.setAnisotropy(quality.anisotropy);
 const groundSampler=new Filament.TextureSampler(minFilter,Filament.MagFilter.LINEAR,Filament.WrapMode.CLAMP_TO_EDGE);groundSampler.setAnisotropy(quality.anisotropy);
 const materialInstances=new Map(),terrainMaterialInstances=new Set(),worldMaterialInstances=new Set(),resources=new Set(),resourceByBuffer=new WeakMap(),activeEntities=new Set(),nextEntities=new Set(),activePools=new Set();
 const sharedMeshes=new WeakMap(),poseMeshes=new WeakMap(),cache=new WeakMap(),assemblyTransforms=new WeakMap(),terrain=new Map();let legacyGpuBytes=0;
 const transformManager=engine.getTransformManager(),lightManager=engine.getLightManager(),matrixScratch=new Float32Array(16);
 const dynamicResources=[null,null,null];let dynamicResourceIndex=-1,backend=null,previousSkyBackground='',frameMetrics=null,firstRenderMs=null,renderFrame=0,resourceSerial=0,residencyStats=null,framePrepared=false;
 const styleInstance=style=>{
  let instance=materialInstances.get(style.key);if(instance)return instance;
  if(style.terrain){instance=terrainMaterial.createInstance();instance.setTextureParameter('groundSurfaces',groundSurfaces,groundSampler);terrainMaterialInstances.add(instance);}
  else{instance=material.createInstance();instance.setTextureParameter('atlas',atlas,sampler);instance.setFloatParameter('bossColor',style.boss);instance.setFloatParameter('dissolve',style.dissolve);instance.setFloatParameter('terrainSurface',0);worldMaterialInstances.add(instance);}
  materialInstances.set(style.key,instance);return instance;
 };
 const fakeBindings=new Map(),fakeGl={ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,STATIC_DRAW:35044,
  createBuffer(){return {data:null};},bindBuffer(target,buffer){fakeBindings.set(target,buffer);},bufferData(target,data){const buffer=fakeBindings.get(target);if(!buffer)throw new Error('Filament staging buffer is not bound');buffer.data=new data.constructor(data);},deleteBuffer(buffer){backend?.releaseBuffer(buffer);}
 };
 function makeResource(entry,ephemeral=false){
  const raw=entry.buffer?.data;if(!raw)throw new Error('World mesh has no vertex data');
  const arrays=realmFilamentArrays(raw,(entry.stride||48)/4),A=Filament.VertexAttribute,T=Filament.VertexBuffer$AttributeType;
  if(!arrays.count)throw new Error('World mesh has no vertices');
  const indices=entry.index?.buffer?.data,parts=entry.characterMesh?.materialParts;
  if(parts){for(const part of parts)if(part.material)for(let i=part.indexOffset;i<part.indexOffset+part.indexCount;i++){const color=indices[i]*4;arrays.colors[color]=arrays.colors[color+1]=arrays.colors[color+2]=arrays.colors[color+3]=1;}}
  const orientationBuilder=new Filament.SurfaceOrientation$Builder().vertexCount(arrays.count);
  // Filament's UV-derived basis requires tightly packed streams with stride 0.
  // Normalize the compact imported normals before deriving the normal-map frame.
  if(parts&&indices){for(let i=0;i<arrays.normals.length;i+=3){const length=Math.hypot(arrays.normals[i],arrays.normals[i+1],arrays.normals[i+2])||1;for(let k=0;k<3;k++)arrays.normals[i+k]/=length;}}
  orientationBuilder.normals(arrays.normals,parts&&indices?0:12);
  if(parts&&indices)realmFilamentNative('character tangent-frame inputs',()=>{orientationBuilder.positions(arrays.positions);orientationBuilder.uvs(arrays.uvs);orientationBuilder.triangleCount(indices.length/3);orientationBuilder.triangles16(indices);});
  const orientation=realmFilamentNative('mesh tangent-frame construction',()=>orientationBuilder.build()),tangents=realmFilamentNative('mesh tangent-frame extraction',()=>orientation.getQuats(arrays.count));orientation.delete();
  const skinned=!!entry.palette,vbBuilder=Filament.VertexBuffer.Builder().vertexCount(arrays.count).bufferCount(skinned?6:4)
   .attribute(A.POSITION,0,T.FLOAT3,0,12).attribute(A.TANGENTS,1,T.SHORT4,0,8).normalized(A.TANGENTS)
   .attribute(A.COLOR,2,T.FLOAT4,0,16).attribute(A.UV0,3,T.FLOAT2,0,8);
  if(skinned)vbBuilder.attribute(A.BONE_INDICES,4,T.USHORT4,0,8).attribute(A.BONE_WEIGHTS,5,T.FLOAT4,0,16);
  const vb=vbBuilder.build(engine);
  vb.setBufferAt(engine,0,arrays.positions);vb.setBufferAt(engine,1,tangents);vb.setBufferAt(engine,2,arrays.colors);vb.setBufferAt(engine,3,arrays.uvs);
  if(skinned){const joints=new Uint16Array(arrays.count*4),weights=new Float32Array(arrays.count*4);for(let v=0;v<arrays.count;v++)for(let k=0;k<4;k++){joints[v*4+k]=raw[v*20+12+k];weights[v*4+k]=raw[v*20+16+k];}vb.setBufferAt(engine,4,joints);vb.setBufferAt(engine,5,weights);}
  let ib=null;
  if(indices){ib=Filament.IndexBuffer.Builder().indexCount(indices.length).bufferType(Filament.IndexBuffer$IndexType.USHORT).build(engine);ib.setBuffer(engine,indices);}
  const resource={buffer:entry.buffer,indexStaging:entry.index,vb,ib,bounds:skinned?{center:[0,1.25,0],halfExtent:[1.5,1.55,1.5]}:entry.bounds||arrays.bounds,boneCount:skinned?entry.palette.length/12:0,gpuBytes:arrays.count*(skinned?68:44)+(indices?.byteLength||0),count:indices?.length||arrays.count,terrain:!!entry.terrain,pools:new Map(),ephemeral,residencyId:"legacy:"+(++resourceSerial),lastFrame:renderFrame};
  if(parts){
   resource.parts=parts.map(part=>({...part,lease:part.material?materialResources.acquire(part.material,resourceProfile,part.tint):null}));resource.materialsReady=false;
   Promise.all(resource.parts.map(async part=>{part.instance=part.lease?await part.lease.ready:null;})).then(()=>{resource.materialsReady=true;},error=>{if(error.name!=='AbortError')resource.materialError=error;});
  }
  resources.add(resource);legacyGpuBytes+=resource.gpuBytes;if(!ephemeral)resourceByBuffer.set(entry.buffer,resource);if(entry.poseBuffer){resource.capacity=arrays.count;resource.dynamicArrays=arrays;resource.dynamicTangents=tangents;}return resource;
 }
 // Keep one mutable geometry allocation per simultaneously visible pose. The
 // CPU animation result is unchanged; only its presentation buffers are reused.
 function poseEntry(mesh){
  const topology=realmMeshTopology(mesh);if(!topology)return realmMeshEntry(backend,mesh);
  let variants=poseMeshes.get(mesh.poseSource);if(!variants){variants=new WeakMap();poseMeshes.set(mesh.poseSource,variants);}
  let pool=variants.get(topology);if(!pool){pool={frame:-1,used:0,entries:[],seen:new WeakMap()};variants.set(topology,pool);}
  if(pool.frame!==backend.frameId){pool.frame=backend.frameId;pool.used=0;pool.seen=new WeakMap();}
  if(pool.seen.has(mesh))return pool.seen.get(mesh);
  const slot=pool.used++;let entry=pool.entries[slot];
  if(!entry){
   entry=realmUploadIndexed(backend,mesh);entry.poseBuffer=true;pool.entries[slot]=entry;
   entry.resource=makeResource(entry);entry.resource.capacity=topology.refs.length;entry.resource.pose=true;
   entry.buffer.retire=()=>{if(pool.entries[slot]===entry)pool.entries[slot]=null;pool.seen.delete(entry.pose);entry.pose=null;entry.resource.dynamicArrays=null;entry.resource.dynamicTangents=null;if(--entry.index.refs===0){backend.gl.deleteBuffer(entry.index.buffer);backend.indexMeshes.delete(entry.index.topology);backend.meshBytes-=entry.index.bytes;}};
  }else if(entry.pose!==mesh){
   // Positions/normals change with the pose; appearance and UVs normally do not.
   // Update those two streams directly instead of repacking every attribute.
   const resource=entry.resource,arrays=resource.dynamicArrays,raw=entry.buffer.data;
   const appearanceChanged=entry.pose.c!==mesh.c||entry.pose.f!==mesh.f||entry.pose.t!==mesh.t||entry.pose.uv!==mesh.uv;
   if(appearanceChanged){realmVertexData(mesh,topology,false,raw);updateDynamicResource(resource,raw);}
   else{
    let changedNormals=false;
    for(let v=0;v<topology.refs.length;v++){const p=(topology.refs[v]>>>1)*3,q=v*3,o=v*12;for(let k=0;k<3;k++){const normal=mesh.n[p+k];if(arrays.normals[q+k]!==normal)changedNormals=true;arrays.positions[q+k]=raw[o+k]=mesh.p[p+k];arrays.normals[q+k]=raw[o+3+k]=normal;}}
    resource.vb.setBufferAt(engine,0,arrays.positions);
    if(changedNormals){const builder=new Filament.SurfaceOrientation$Builder().vertexCount(resource.capacity);builder.normals(arrays.normals,12);const orientation=builder.build();try{resource.dynamicTangents=orientation.getQuats(resource.capacity);}finally{orientation.delete();}resource.vb.setBufferAt(engine,1,resource.dynamicTangents);}
   }
   entry.resource.bounds=realmFilamentBounds(arrays.positions);
   const manager=engine.getRenderableManager();for(const stylePool of entry.resource.pools.values())for(const entity of stylePool.entities){const instance=manager.getInstance(entity);try{manager.setAxisAlignedBoundingBox(instance,entry.resource.bounds);}finally{instance.delete();}}
  }
  entry.pose=mesh;pool.seen.set(mesh,entry);return entry;
 }
 function dynamicCapacity(count){return Math.max(768,Math.ceil(count/768)*768);}
 function dynamicPacket(data,capacity){
  const packet=new Float32Array(capacity*12);packet.set(data);const count=Math.floor(data.length/12);
  if(count){const x=data[0],y=data[1],z=data[2],nx=data[3]||0,ny=data[4]||1,nz=data[5]||0,c0=data[6]||0,c1=data[7]||0,c2=data[8]||0,c3=data[9]||0,u0=data[10]||0,u1=data[11]||0;
   for(let i=count;i<capacity;i++){const o=i*12;packet[o]=x;packet[o+1]=y;packet[o+2]=z;packet[o+3]=nx;packet[o+4]=ny;packet[o+5]=nz;packet[o+6]=c0;packet[o+7]=c1;packet[o+8]=c2;packet[o+9]=c3;packet[o+10]=u0;packet[o+11]=u1;}}
  return packet;
 }
 function ensureDynamicArrays(resource){
  if(resource.dynamicArrays?.count===resource.capacity)return resource.dynamicArrays;
  return resource.dynamicArrays={
   count:resource.capacity,
   positions:new Float32Array(resource.capacity*3),
   normals:new Float32Array(resource.capacity*3),
   colors:new Float32Array(resource.capacity*4),
   uvs:new Float32Array(resource.capacity*2)
  };
 }
 function updateDynamicResource(resource,data){
  const arrays=ensureDynamicArrays(resource),count=Math.floor(data.length/12),fallback=count?0:-1;let normalsChanged=!resource.dynamicTangents;
  for(let i=0;i<resource.capacity;i++){
   const src=(i<count?i:fallback)*12,p=i*3,c=i*4,u=i*2;
   if(src<0){if(arrays.normals[p]!==0||arrays.normals[p+1]!==1||arrays.normals[p+2]!==0)normalsChanged=true;arrays.positions[p]=arrays.positions[p+1]=arrays.positions[p+2]=0;arrays.normals[p]=0;arrays.normals[p+1]=1;arrays.normals[p+2]=0;arrays.colors[c]=arrays.colors[c+1]=arrays.colors[c+2]=arrays.colors[c+3]=0;arrays.uvs[u]=arrays.uvs[u+1]=0;continue;}
   arrays.positions[p]=data[src]||0;arrays.positions[p+1]=data[src+1]||0;arrays.positions[p+2]=data[src+2]||0;
   const nx=data[src+3]||0,ny=Number.isFinite(data[src+4])?data[src+4]:1,nz=data[src+5]||0;if(arrays.normals[p]!==nx||arrays.normals[p+1]!==ny||arrays.normals[p+2]!==nz)normalsChanged=true;arrays.normals[p]=nx;arrays.normals[p+1]=ny;arrays.normals[p+2]=nz;
   arrays.colors[c]=Number.isFinite(data[src+6])?Math.max(0,data[src+6]):0;arrays.colors[c+1]=Number.isFinite(data[src+7])?Math.max(0,data[src+7]):0;arrays.colors[c+2]=Number.isFinite(data[src+8])?Math.max(0,data[src+8]):0;arrays.colors[c+3]=Number.isFinite(data[src+9])?data[src+9]:0;
   arrays.uvs[u]=data[src+10]||0;arrays.uvs[u+1]=data[src+11]||0;
  }
  if(normalsChanged){const orientationBuilder=new Filament.SurfaceOrientation$Builder().vertexCount(resource.capacity);orientationBuilder.normals(arrays.normals,12);const orientation=orientationBuilder.build();resource.dynamicTangents=orientation.getQuats(resource.capacity);orientation.delete();}
  const tangents=resource.dynamicTangents;
  resource.vb.setBufferAt(engine,0,arrays.positions);resource.vb.setBufferAt(engine,1,tangents);resource.vb.setBufferAt(engine,2,arrays.colors);resource.vb.setBufferAt(engine,3,arrays.uvs);
 }
 function poolFor(resource,style){let pool=resource.pools.get(style.key);if(pool)return pool;pool={entities:[],transforms:[],sources:[],revisions:[],palettes:[],bones:[],used:0,material:styleInstance(style)};resource.pools.set(style.key,pool);return pool;}
 function createRenderable(resource,pool){
  const entity=Filament.EntityManager.get().create(),builder=Filament.RenderableManager.Builder(resource.parts?.length||1).boundingBox(resource.bounds).castShadows(!resource.terrain).receiveShadows(!resource.terrain);
  if(resource.parts)for(let i=0;i<resource.parts.length;i++){const part=resource.parts[i];builder.material(i,part.instance||pool.material).geometryOffset(i,Filament.RenderableManager$PrimitiveType.TRIANGLES,resource.vb,resource.ib,part.indexOffset,part.indexCount);}
  else{builder.material(0,pool.material);if(resource.ib)builder.geometry(0,Filament.RenderableManager$PrimitiveType.TRIANGLES,resource.vb,resource.ib);else builder.geometryNoIndices(0,Filament.RenderableManager$PrimitiveType.TRIANGLES,resource.vb);}
  if(resource.boneCount)builder.skinning(resource.boneCount);
  realmFilamentNative('renderable construction',()=>builder.build(engine,entity));pool.entities.push(entity);return entity;
 }
 function destroyResource(resource){
  if(!resource||!resources.has(resource))return;for(const pool of resource.pools.values()){activePools.delete(pool);for(const entity of pool.entities){if(activeEntities.has(entity)){scene.remove(entity);activeEntities.delete(entity);}nextEntities.delete(entity);engine.destroyEntity(entity);Filament.EntityManager.get().destroy(entity);entity.delete();}}
  engine.destroyVertexBuffer(resource.vb);if(resource.ib)engine.destroyIndexBuffer(resource.ib);resources.delete(resource);legacyGpuBytes-=resource.gpuBytes;if(resource.buffer)resourceByBuffer.delete(resource.buffer);
  for(const part of resource.parts||[])part.lease?.release();
 }
 function updateRenderableTransform(pool,slot,entity,model,groundRevision){
  // Static geometry keeps the same source transform and ground until the
  // terrain revision changes. Skip both heightfield sampling and the WASM
  // transform comparison on that common path.
  let source=pool.sources[slot];if(pool.revisions[slot]===groundRevision&&realmFilamentSourceMatches(source,model))return;
  const matrix=realmFilamentMatrixInto(model,matrixScratch),previous=pool.transforms[slot];
  let changed=!previous;
  for(let i=0;!changed&&i<16;i++)if(previous[i]!==matrix[i])changed=true;
  if(!source)source=pool.sources[slot]=new Float64Array(12);realmFilamentRememberSource(source,model);pool.revisions[slot]=groundRevision;
  if(!changed)return;
  if(frameMetrics)frameMetrics.transformSubmissions++;
  const instance=transformManager.getInstance(entity);transformManager.setTransform(instance,matrix);instance.delete();
  if(previous)previous.set(matrix);else pool.transforms[slot]=new Float32Array(matrix);
 }
 function acquire(entry,next,groundRevision){
  const essential=!!(entry.palette||entry.characterMesh);let resource=resourceByBuffer.get(entry.buffer);
  if(!resource){if(!essential&&!constructionBudget.consume()){if(frameMetrics)frameMetrics.deferredResources++;return;}resource=makeResource(entry);}
  if(resource.materialError)throw resource.materialError;
  if(resource.parts&&!resource.materialsReady){resource.lastFrame=renderFrame;return;}
  resource.lastFrame=renderFrame;const pool=poolFor(resource,realmFilamentStyle(entry));activePools.add(pool);
  const slot=pool.used;let entity=pool.entities[slot];
  if(!entity){if(!essential&&!constructionBudget.consume()){if(frameMetrics)frameMetrics.deferredRenderables++;return;}entity=createRenderable(resource,pool);}pool.used++;
  if(entry.palette&&pool.palettes[slot]!==entry.palette){
   const palette=entry.palette,bones=pool.bones[slot]||(pool.bones[slot]=Array.from({length:palette.length/12},()=>new Array(16).fill(0)));
   for(let b=0;b<bones.length;b++){const matrix=bones[b],o=b*12;for(let row=0;row<3;row++)for(let col=0;col<4;col++)matrix[col*4+row]=palette[o+row*4+col];matrix[15]=1;}
   const manager=engine.getRenderableManager(),instance=manager.getInstance(entity);try{manager.setBonesFromMatrices(instance,bones,0);}finally{instance.delete();}pool.palettes[slot]=palette;if(frameMetrics)frameMetrics.boneUploads++;
  }
  updateRenderableTransform(pool,slot,entity,entry.model,groundRevision);next.add(entity);
 }
 const sun=Filament.EntityManager.get().create();
 Filament.LightManager.Builder(Filament.LightManager$Type.SUN).color([1,.94,.83]).intensity(65000).direction([.55,-1,-.38]).castShadows(true).shadowOptions(realmFilamentShadowOptions()).sunAngularRadius(1.4).build(engine,sun);scene.addEntity(sun);
 const pointLights=[],canonicalMatrices=[],canonicalSources=[],canonicalRevisions=[],canonicalFallback=[],lodRowPool=[],lodRows=[];
 function updateLights(lighting){
  const manager=lightManager,sunInstance=manager.getInstance(sun),day=1-lighting.night;
  const outdoor=1-Math.max(lighting.cave||0,(lighting.house||0)*.65);
  manager.setIntensity(sunInstance,(5500+day*52000)*Math.max(.12,outdoor));manager.setColor(sunInstance,[.70+.30*day,.75+.20*day,.91-.07*day]);sunInstance.delete();
  indirectLight.setIntensity((6500+day*12500)*(1-(lighting.cave||0)*.6));camera3d.setExposure(5.6+day*7.2,1/(60+day*65),100+lighting.night*100);
  const limit=quality.lightLimit,lights=lighting.lights;
  for(let i=0;i<limit;i++){
   let record=pointLights[i];const source=lights[i];
   if(source&&!record){const entity=Filament.EntityManager.get().create();Filament.LightManager.Builder(Filament.LightManager$Type.POINT).falloff(source.radius).intensity(900).build(engine,entity);record=pointLights[i]={entity,active:false};}
   if(!record)continue;
   if(source){const instance=manager.getInstance(record.entity);manager.setPosition(instance,[source.x,source.y,source.z]);manager.setColor(instance,source.color);manager.setFalloff(instance,source.radius);manager.setIntensity(instance,Math.max(120,source.intensity*950));instance.delete();if(!record.active){scene.addEntity(record.entity);record.active=true;}}
   else if(record.active){scene.remove(record.entity);record.active=false;}
  }
 }
 function updateMaterials(lighting,lair){const mood=lair?.ambient||[1,1,1];for(const instance of worldMaterialInstances){instance.setFloatParameter('time',time);instance.setFloatParameter('night',lighting.night);instance.setFloatParameter('interior',Math.max(lighting.cave,lighting.house));instance.setFloat3Parameter('mood',mood);}for(const instance of terrainMaterialInstances){instance.setFloatParameter('night',lighting.night*.72);instance.setFloatParameter('time',time);}}
 const glbSources=new Map();let glbSourceBytes=0,glbClock=0;
 async function glbSource(path){
  let source=glbSources.get(path);if(source){source.used=++glbClock;return source.bytes;}
  const url=typeof realmAssetURL==='function'?realmAssetURL(path):path,response=await fetch(url);if(!response.ok)throw new Error('GLB unavailable: '+path);
  const bytes=new Uint8Array(await response.arrayBuffer());source={bytes,used:++glbClock};glbSources.set(path,source);glbSourceBytes+=bytes.byteLength;
  for(const [key,candidate]of [...glbSources].sort((a,b)=>a[1].used-b[1].used)){if(glbSourceBytes<=quality.glbBytes)break;if(key===path)continue;glbSources.delete(key);glbSourceBytes-=candidate.bytes.byteLength;}
  return bytes;
 }
 async function loadGlb(path){
  const url=typeof realmAssetURL==='function'?realmAssetURL(path):path,loader=engine.createAssetLoader(),asset=loader.createAsset(await glbSource(path));if(!asset){loader.delete();throw new Error('GLB could not be parsed: '+path);}
  await new Promise((resolve,reject)=>{try{asset.loadResources(resolve,()=>{},url.slice(0,url.lastIndexOf('/')+1),null,{normalizeSkinningWeights:true});}catch(error){reject(error);}});asset.releaseSourceData();return {asset,loader,add(){scene.addEntities(asset.getEntities());},remove(){scene.removeEntities(asset.getEntities());},destroy(){scene.removeEntities(asset.getEntities());loader.destroyAsset(asset);loader.delete();}};
 }
 backend={kind:'filament',skinning:true,textureResources,materialResources,modelResources,assetDraws,canonicalEntry,surface,presented:true,engine,scene,view,camera:camera3d,renderer,swapChain,gl:fakeGl,cache,assemblyTransforms,sharedMeshes,skinnedMeshes:new WeakMap(),terrain,upload(data){const buffer=fakeGl.createBuffer();buffer.data=new data.constructor(data);return {buffer,count:data.length/12};},frameId:0,width:initialWidth,height:initialHeight,releaseBuffer(buffer){const resource=resourceByBuffer.get(buffer);if(resource)destroyResource(resource);buffer.data=null;buffer.retire=null;for(const [target,bound] of fakeBindings)if(bound===buffer)fakeBindings.delete(target);},loadGlb,
  // Snapshot only on an explicit development request; never enumerate resources
  // in the normal frame loop. GPU bytes are allocation estimates, not driver VRAM.
  diagnostics(){return {firstRenderMs,paging:globalThis.VeldrenWorldPerformance?.diagnostics()?.paging||null,streaming:streaming?.diagnostics()||null,residency:residencyStats,lod:{compatibility:this.lodDiagnostics||null,canonical:globalThis.VeldrenWorldPerformance?.frame(String(currentScene))?.lod||null},frame:frameMetrics?{...frameMetrics}:null,legacy:{meshes:resources.size,materials:materialInstances.size,renderables:activeEntities.size,gpuBytes:[...resources].reduce((n,r)=>n+r.gpuBytes,0),stagingBytes:[...resources].reduce((n,r)=>n+(r.buffer?.data?.byteLength||0),0),cachedGlbBytes:glbSourceBytes},models:modelResources.diagnostics(),materials:materialResources.diagnostics(),textures:textureResources.diagnostics(),draws:assetDraws.diagnostics()};},
  performanceSnapshot(){return {frame:frameMetrics,gpuTimerSupported:gpuTimer.supported,activeRenderables:activeEntities.size,construction:constructionBudget.diagnostics(),streaming:streaming?.stats?.()||null,preparation:VeldrenAssets.ioDiagnostics().preparation,residency:residencyStats};},
  beginFrameWork(){constructionBudget.beginFrame();framePrepared=true;},
  render(entries,dynamic,g){
   if(!framePrepared)constructionBudget.beginFrame();framePrepared=false;
   renderFrame++;const measured=window.VELDREN_PERFORMANCE===true,start=measured?performance.now():0;
   frameMetrics=measured?{submittedPackets:entries.length,dynamicVertices:dynamic.length/12,transformSubmissions:0,boneUploads:0,deferredResources:0,deferredRenderables:0,synchronizationMs:0,renderMs:0}:null;
   if(engine.hasUnrecoverableFailure())throw new Error('Filament reported an unrecoverable renderer failure');
   const groundRevision=realmFilamentGroundRevision(),dpr=realmPixelScale(),width=Math.max(1,Math.floor(screen.w*dpr)),height=Math.max(1,Math.floor(screen.h*dpr));this.width=width;this.height=height;if(surface.width!==width||surface.height!==height){surface.width=width;surface.height=height;view.setViewport([0,0,width,height]);}
   for(const pool of activePools)pool.used=0;activePools.clear();nextEntities.clear();
   const next=nextEntities;streaming?.begin(String(currentScene));assetDraws.begin(currentScene);
   const cameraForLod=realmFilamentCameraState(dpr);let canonicalCount=0;lodRows.length=0;
   for(const entry of entries)if(entry.canonicalAsset||entry.lodAsset){
    const i=canonicalCount++,matrix=canonicalMatrices[i]||(canonicalMatrices[i]=new Float32Array(16));let source=canonicalSources[i];if(canonicalRevisions[i]!==groundRevision||!realmFilamentSourceMatches(source,entry.model)){realmFilamentMatrixInto(entry.model,matrix);if(!source)source=canonicalSources[i]=new Float64Array(12);realmFilamentRememberSource(source,entry.model);canonicalRevisions[i]=groundRevision;}
    const asset=entry.canonicalAsset||entry.lodAsset,row=lodRowPool[i]||(lodRowPool[i]=['','',0]);row[0]=entry.instanceId||'unbound:'+asset+':'+(entry.model||[]).join(',')+':'+i;row[1]=asset;row[2]=Math.hypot(matrix[12]-cameraForLod.eye[0],matrix[13]-cameraForLod.eye[1],matrix[14]-cameraForLod.eye[2]);lodRows.push(row);
   }
   let lodResult=null;if(canonicalCount&&realmNative.scenes.performance)lodResult=realmNative.scenes.lodFrame?realmNative.scenes.lodFrame(currentScene,lodRows):realmNative.scenes.performance(currentScene,{op:'lod-batch',entries:lodRows});
   this.lodDiagnostics=lodResult?.stats||null;let canonicalIndex=0;
   // Collect authored demand before allocating compatibility fallbacks. Busy
   // fallback frames otherwise exhaust the shared quota and starve wall parts.
   try{for(const entry of entries)if(entry.canonicalAsset||entry.lodAsset){const index=canonicalIndex++,selected=lodResult?.selections[index];canonicalFallback[index]=!entry.lodAsset&&!assetDraws.submit(selected?.[0]||entry.canonicalAsset,canonicalMatrices[index],lodRows[index]?.[2]||0,null,entry.instanceId,!!selected);}}finally{assetDraws.end();}
   authoredDraws?.render(String(currentScene),cameraForLod.eye);constructionBudget.drain();
   canonicalIndex=0;
   for(const entry of entries){if(entry.canonicalAsset||entry.lodAsset){const index=canonicalIndex++,selected=lodResult?.selections[index];if(entry.lodAsset){const mesh=VeldrenAssets.mesh(selected?.[0]||entry.lodAsset)||entry.mesh;acquire({...realmMeshEntry(backend,mesh),model:entry.model},next,groundRevision);}else if(canonicalFallback[index])acquire({...realmMeshEntry(backend,entry.mesh),model:entry.model},next,groundRevision);}else acquire(entry,next,groundRevision);}
   if(dynamic.length){
    const count=Math.floor(dynamic.length/12),capacity=dynamicCapacity(count);dynamicResourceIndex=(dynamicResourceIndex+1)%dynamicResources.length;let resource=dynamicResources[dynamicResourceIndex];
    if(!resource||resource.capacity<capacity){
     if(resource)destroyResource(resource);
     const packet=dynamicPacket(dynamic,capacity),buffer={data:packet},entry={buffer,count:capacity,bounds:{center:[0,0,0],halfExtent:[2048,512,2048]}};
     resource=makeResource(entry,true);resource.capacity=capacity;dynamicResources[dynamicResourceIndex]=resource;
    }else updateDynamicResource(resource,dynamic);
    resource.lastFrame=renderFrame;const entry={buffer:resource.buffer,count:resource.count},pool=poolFor(resource,realmFilamentStyle(entry));activePools.add(pool);
    const slot=pool.used++,entity=pool.entities[slot]||createRenderable(resource,pool);
    updateRenderableTransform(pool,slot,entity,null,groundRevision);next.add(entity);
   }
   const remove=[],add=[];for(const entity of activeEntities)if(!next.has(entity))remove.push(entity);for(const entity of next)if(!activeEntities.has(entity))add.push(entity);
   if(remove.length)scene.removeEntities(remove);if(add.length)scene.addEntities(add);activeEntities.clear();for(const entity of next)activeEntities.add(entity);
   const cameraState=cameraForLod,{eye,center,near,far,left,right,bottom,top}=cameraState;
   camera3d.lookAt(eye,center,[0,1,0]);camera3d.setProjection(Filament.Camera$Projection.PERSPECTIVE,left,right,bottom,top,near,far);
   streaming?.end(cameraState.center,legacyGpuBytes+modelResources.diagnostics().gpuBytes+textureResources.diagnostics().gpuBytes);
   // Native policy owns the budget/LRU decision; this layer only inventories
   // existing handles and releases the returned IDs through their owners.
   if(globalThis.realmNative?.scenes?.performance){
    const inventory=[...resources],reservedGpu=modelResources.diagnostics().gpuBytes+textureResources.diagnostics().gpuBytes;
    const result=realmNative.scenes.performance(String(currentScene),{op:'residency',profile:realmMobileFilament()?'browser-mobile':'browser',reservedGpu,resources:inventory.map(r=>[r.residencyId,r.gpuBytes,(r.buffer?.data?.byteLength||0)+(r.indexStaging?.buffer?.data?.byteLength||0)+(r.dynamicArrays?Object.values(r.dynamicArrays).reduce((n,v)=>n+(v?.byteLength||0),0):0)+(r.dynamicTangents?.byteLength||0),r.lastFrame===renderFrame,r.buffer?.retire&&!r.ephemeral&&!r.pose?(r.buffer.data?.byteLength||0):0])});
    residencyStats=result.stats;const retire=new Set(result.evict),discard=new Set(result.discardStaging);
    for(const resource of inventory)if(discard.has(resource.residencyId))resource.buffer.data=null;
    for(const resource of inventory)if(retire.has(resource.residencyId)){
     resource.buffer?.retire?.();destroyResource(resource);backend.releaseBuffer(resource.buffer);
     if(resource.ephemeral){const slot=dynamicResources.indexOf(resource);if(slot>=0)dynamicResources[slot]=null;}
    }
   }
   window.VeldrenEditorTools?.frame(this,{...cameraState,up:[0,1,0]});
   const lair=typeof CREATURE_LAIRS!=='undefined'?CREATURE_LAIRS[currentScene]:null,lighting=typeof realmLightingState==='function'?realmLightingState():{lights:[],cave:0,house:0,night:0},day=1-lighting.night,sky=lair?.fog||[.055+.35*day,.075+.58*day,.14+.69*day];if(surface.style&&!lair){const top=`rgb(${Math.round(13+70*day)},${Math.round(25+145*day)},${Math.round(55+178*day)})`,haze=`rgb(${Math.round(30+150*day)},${Math.round(43+181*day)},${Math.round(67+176*day)})`,background=`radial-gradient(ellipse at 22% 15%,rgba(255,255,255,${(.28*day).toFixed(2)}) 0,rgba(255,255,255,0) 20%),radial-gradient(ellipse at 68% 22%,rgba(244,251,255,${(.22*day).toFixed(2)}) 0,rgba(244,251,255,0) 25%),linear-gradient(${top},${haze} 70%,rgb(166,205,190))`;if(background!==previousSkyBackground){surface.style.background=background;previousSkyBackground=background;}}
   updateLights(lighting);updateMaterials(lighting,lair);view.setFogOptions(realmFilamentFogOptions(lighting,sky));renderer.setClearOptions({clearColor:[...sky,lair?1:0],clear:true,discard:true});
   // Select this engine's GL context before beginFrame (which can flush) and
   // again for submission. The convenience binding bypasses the JS selector.
   if(frameMetrics)frameMetrics.synchronizationMs=performance.now()-start;
   engine.execute();if(measured)gpuTimer.begin();try{if(renderer.beginFrame(swapChain)){renderer.renderView(view);window.VeldrenEditorTools?.render(renderer);renderer.endFrame();}engine.execute();}finally{if(measured)gpuTimer.end();}
   if(frameMetrics){frameMetrics.renderMs=performance.now()-start;frameMetrics.gpuMs=gpuTimer.sample();if(firstRenderMs===null)firstRenderMs=performance.now();}
  }};
 window.VeldrenFilament={version:'1.77.0-pc-stable',backend,loadGlb};return backend;
}

painter3=function(g,project){
 if(project!==project3){const painter=canvasPainterRealm(g,project);painter.software=true;return painter;}
 if(!realmGPU||realmGPU.kind!=='filament')realmGPU=createRealmFilamentGPU();
 const gpu=realmGPU,entries=[],dynamic=[];let ownerId=null,part=0;
 const emit=(mesh,m,style={},entityId=null)=>{const frame=globalThis.VeldrenWorldPerformance?.frame(String(currentScene));if(entityId&&frame?.visibleIds&&!frame.visibleIds.has(entityId))return;const entry=gpu.canonicalEntry(mesh,m,style);entry.entityId=entityId||ownerId;entry.instanceId=entityId?entityId+":draw:0":ownerId?ownerId+":draw:"+(part++):null;entries.push(entry);};
 const painter={entity(id){ownerId=id||null;part=0;},face(points,color,normals,materialId,colors,uvs){realmFaceData(dynamic,points,color,normals,materialId,colors,uvs);},indexed(mesh,m,style={}){emit(mesh,m,style);},skinned(mesh,model,palette){entries.push({...realmSkinnedEntry(gpu,mesh),model,palette,characterMesh:mesh.materialParts?mesh:null});},cached(cached){
  if(cached.kind==='assembly'){
   const revision=realmFilamentGroundRevision();let state=gpu.assemblyTransforms.get(cached);
   const instances=cached.instances||[],reset=!state||state.revision!==revision||!realmFilamentSourceMatches(state.source,cached.model);
   if(!state){state={matrices:[],children:[],source:new Float64Array(12)};gpu.assemblyTransforms.set(cached,state);}
   for(let j=0;j<instances.length;j++)if(reset||!realmFilamentSourceMatches(state.children[j],instances[j].matrix)){const model=affineMultiply(cached.model,instances[j].matrix);model[7]-=typeof landHeight==='function'?landHeight(model[3],model[11]):0;state.matrices[j]=model;state.children[j]=new Float64Array(instances[j].matrix);}
   state.matrices.length=state.children.length=instances.length;state.instances=instances;state.revision=revision;realmFilamentRememberSource(state.source,cached.model);
   for(let j=0;j<state.matrices.length;j++){const i=state.instances[j];emit(i.mesh,state.matrices[j],i.ghost?{dissolve:.45}:{},i.entityId);}
   if(cached.faces.length){
    let entry=gpu.cache.get(cached);
    if(!entry||entry.groundRevision!==revision||entry.faces!==cached.faces||!realmFilamentSourceMatches(entry.source,cached.model)){
     const previous=entry,data=[];for(const f of cached.faces)realmFaceData(data,f.points.map(p=>briarPoint(p,0,cached.model)),f.color,f.normals,f.material,f.colors,f.uvs);
     entry={...gpu.upload(new Float32Array(data)),groundRevision:revision,faces:cached.faces,source:new Float64Array(12)};realmFilamentRememberSource(entry.source,cached.model);gpu.cache.set(cached,entry);
     entry.buffer.retire=()=>{if(gpu.cache.get(cached)===entry)gpu.cache.delete(cached);};if(previous)gpu.gl.deleteBuffer(previous.buffer);
    }entries.push(entry);
   }return cached.height;
  }
  // Buildings use the same shared indexed meshes as other world objects.
  // Baking every repeated wall/roof/prop into a private triangle buffer made
  // the first visible settlement allocate the same geometry many times.
  for(const instance of cached.instances||[])emit(instance.mesh,instance.matrix,{},instance.entityId);
  if(!cached.faces.length)return cached.height;
  let entry=gpu.cache.get(cached);if(!entry){const data=[];for(const face of cached.faces){let materialId=face.material||0;if(!materialId&&cached.kind==='building'){const value=parseInt(face.color.slice(1),16),red=value>>16,green=(value>>8)&255,blue=value&255,top=face.points.reduce((sum,p)=>sum+p[1],0)/face.points.length;if(top>2.05&&Math.max(red,green,blue)-Math.min(red,green,blue)>23)materialId=6;else if(red>green*1.15&&green>blue*1.1)materialId=5;}realmFaceData(data,face.points,face.color,face.normals,materialId,face.colors,face.uvs);}entry=gpu.upload(new Float32Array(data));gpu.cache.set(cached,entry);entry.buffer.retire=()=>gpu.cache.delete(cached);}entries.push(cached.model?{...entry,model:cached.model}:entry);return cached.height;
 },flush(){gpu.beginFrameWork();const submitted=realmTerrainEntries(gpu).slice();for(const entry of entries)submitted.push(entry);gpu.render(submitted,dynamic,g);trimRealmMeshes(gpu);gpu.frameId++;}};
 return painter;
};
