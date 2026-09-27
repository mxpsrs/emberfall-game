'use strict';
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
function realmFilamentMatrix(model){return realmFilamentMatrixInto(model,new Float32Array(16));}
function realmFilamentCameraCenter(x,y,z,yaw,pitch,zoom,dpr){
 const c=Math.cos(yaw),s=Math.sin(yaw),st=Math.sin(pitch),ct=Math.cos(pitch),depth=x*s*ct+y*st+z*c*ct;
 const step=1/(Math.max(1,zoom)*Math.max(1,dpr)),right=Math.round((x*c-z*s)/step)*step,up=Math.round(((x*s+z*c)*st-y*ct)/step)*step;
 return [right*c+up*s*st+depth*s*ct,-up*ct+depth*st,-right*s+up*c*st+depth*c*ct];
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
  ?{mapSize:1024,shadowCascades:1,stable:true,normalBias:.8,constantBias:.001,maxShadowDistance:80}
  :{mapSize:1024,shadowCascades:2,stable:true,normalBias:.8,constantBias:.001,maxShadowDistance:95};
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
 for(let i=0;i<count;i++){
  const source=i*stride,p=i*3,u=i*2,c=i*4;
  positions.set(raw.subarray(source,source+3),p);normals.set(raw.subarray(source+3,source+6),p);
  colors[c]=Number.isFinite(raw[source+6])?Math.max(0,raw[source+6]):0;colors[c+1]=Number.isFinite(raw[source+7])?Math.max(0,raw[source+7]):0;colors[c+2]=Number.isFinite(raw[source+8])?Math.max(0,raw[source+8]):0;colors[c+3]=Number.isFinite(raw[source+9])?raw[source+9]:0;
  uvs[u]=raw[source+10]||0;uvs[u+1]=raw[source+11]||0;
 }
 return {count,positions,normals,colors,uvs};
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
 engine.setAutomaticInstancingEnabled(true);
 const scene=engine.createScene(),swapChain=engine.createSwapChain(),renderer=engine.createRenderer(),view=engine.createView();
 const cameraEntity=Filament.EntityManager.get().create(),camera3d=engine.createCamera(cameraEntity);
 const quality=realmFilamentQualityProfile();
 view.setCamera(camera3d);view.setScene(scene);view.setViewport([0,0,initialWidth,initialHeight]);view.setPostProcessingEnabled(true);view.setShadowingEnabled(true);view.setAntiAliasing(Filament.View$AntiAliasing.FXAA);view.setAmbientOcclusion(Filament.View$AmbientOcclusion.NONE);view.setDithering(Filament.View$Dithering.NONE);
 const colorGrading=Filament.ColorGrading.Builder().quality(Filament.ColorGrading$QualityLevel.MEDIUM).toneMapping(Filament.ColorGrading$ToneMapping.ACES).exposure(.2).contrast(1.04).saturation(1.03).vibrance(1.08).gamutMapping(true).build(engine);view.setColorGrading(colorGrading);
 const skySh=new Float32Array([.52,.60,.72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
 const indirectLight=Filament.IndirectLight.Builder().irradianceSh(3,skySh).intensity(18000).build(engine);scene.setIndirectLight(indirectLight);
 const assets=window.VELDREN_FILAMENT_ASSETS,material=engine.createMaterial(assets.material),terrainMaterial=engine.createMaterial(assets.terrainMaterial);
 const textureResources=createVeldrenTextureResources(engine,VeldrenAssets),textureSettings={colorSpace:'srgb',maxDimension:realmMobileFilament()?1024:2048};
 let atlas,groundSurfaces;
 try{atlas=textureResources.acquire(assets.atlasBytes,textureSettings).texture;groundSurfaces=textureResources.acquire(assets.groundSurfacesBytes,textureSettings).texture;}
 catch(error){textureResources.destroy();throw error;}
 assets.atlasBytes=null;assets.groundSurfacesBytes=null;
 const minFilter=Filament.MinFilter.LINEAR_MIPMAP_LINEAR;
 const sampler=new Filament.TextureSampler(minFilter,Filament.MagFilter.LINEAR,Filament.WrapMode.CLAMP_TO_EDGE);sampler.setAnisotropy(quality.anisotropy);
 const groundSampler=new Filament.TextureSampler(minFilter,Filament.MagFilter.LINEAR,Filament.WrapMode.CLAMP_TO_EDGE);groundSampler.setAnisotropy(quality.anisotropy);
 const materialInstances=new Map(),terrainMaterialInstances=new Set(),worldMaterialInstances=new Set(),resources=new Set(),resourceByBuffer=new WeakMap(),activeEntities=new Set(),nextEntities=new Set(),activePools=new Set();
 const sharedMeshes=new WeakMap(),cache=new WeakMap(),terrain=new Map();
 const transformManager=engine.getTransformManager(),lightManager=engine.getLightManager(),matrixScratch=new Float32Array(16);
 const dynamicResources=[null,null,null];let dynamicResourceIndex=-1,backend=null,previousSkyBackground='';
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
  const orientationBuilder=new Filament.SurfaceOrientation$Builder().vertexCount(arrays.count);orientationBuilder.normals(arrays.normals,12);
  const orientation=orientationBuilder.build(),tangents=orientation.getQuats(arrays.count);orientation.delete();
  const vb=Filament.VertexBuffer.Builder().vertexCount(arrays.count).bufferCount(4)
   .attribute(A.POSITION,0,T.FLOAT3,0,12).attribute(A.TANGENTS,1,T.SHORT4,0,8).normalized(A.TANGENTS)
   .attribute(A.COLOR,2,T.FLOAT4,0,16).attribute(A.UV0,3,T.FLOAT2,0,8).build(engine);
  vb.setBufferAt(engine,0,arrays.positions);vb.setBufferAt(engine,1,tangents);vb.setBufferAt(engine,2,arrays.colors);vb.setBufferAt(engine,3,arrays.uvs);
  let ib=null;const indices=entry.index?.buffer?.data;
  if(indices){ib=Filament.IndexBuffer.Builder().indexCount(indices.length).bufferType(Filament.IndexBuffer$IndexType.USHORT).build(engine);ib.setBuffer(engine,indices);}
  const resource={buffer:entry.buffer,vb,ib,bounds:entry.bounds||realmFilamentBounds(arrays.positions),count:indices?.length||arrays.count,terrain:!!entry.terrain,pools:new Map(),ephemeral};
  resources.add(resource);if(!ephemeral)resourceByBuffer.set(entry.buffer,resource);return resource;
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
  const arrays=ensureDynamicArrays(resource),count=Math.floor(data.length/12),fallback=count?0:-1;
  for(let i=0;i<resource.capacity;i++){
   const src=(i<count?i:fallback)*12,p=i*3,c=i*4,u=i*2;
   if(src<0){arrays.positions[p]=arrays.positions[p+1]=arrays.positions[p+2]=0;arrays.normals[p]=0;arrays.normals[p+1]=1;arrays.normals[p+2]=0;arrays.colors[c]=arrays.colors[c+1]=arrays.colors[c+2]=arrays.colors[c+3]=0;arrays.uvs[u]=arrays.uvs[u+1]=0;continue;}
   arrays.positions[p]=data[src]||0;arrays.positions[p+1]=data[src+1]||0;arrays.positions[p+2]=data[src+2]||0;
   arrays.normals[p]=data[src+3]||0;arrays.normals[p+1]=Number.isFinite(data[src+4])?data[src+4]:1;arrays.normals[p+2]=data[src+5]||0;
   arrays.colors[c]=Number.isFinite(data[src+6])?Math.max(0,data[src+6]):0;arrays.colors[c+1]=Number.isFinite(data[src+7])?Math.max(0,data[src+7]):0;arrays.colors[c+2]=Number.isFinite(data[src+8])?Math.max(0,data[src+8]):0;arrays.colors[c+3]=Number.isFinite(data[src+9])?data[src+9]:0;
   arrays.uvs[u]=data[src+10]||0;arrays.uvs[u+1]=data[src+11]||0;
  }
  const orientationBuilder=new Filament.SurfaceOrientation$Builder().vertexCount(resource.capacity);orientationBuilder.normals(arrays.normals,12);
  const orientation=orientationBuilder.build(),tangents=orientation.getQuats(resource.capacity);orientation.delete();
  resource.vb.setBufferAt(engine,0,arrays.positions);resource.vb.setBufferAt(engine,1,tangents);resource.vb.setBufferAt(engine,2,arrays.colors);resource.vb.setBufferAt(engine,3,arrays.uvs);
 }
 function poolFor(resource,style){let pool=resource.pools.get(style.key);if(pool)return pool;pool={entities:[],transforms:[],used:0,material:styleInstance(style)};resource.pools.set(style.key,pool);return pool;}
 function createRenderable(resource,pool){
  const entity=Filament.EntityManager.get().create(),builder=Filament.RenderableManager.Builder(1).boundingBox(resource.bounds).material(0,pool.material).castShadows(!resource.terrain).receiveShadows(!resource.terrain);
  if(resource.ib)builder.geometry(0,Filament.RenderableManager$PrimitiveType.TRIANGLES,resource.vb,resource.ib);else builder.geometryNoIndices(0,Filament.RenderableManager$PrimitiveType.TRIANGLES,resource.vb);
  builder.build(engine,entity);pool.entities.push(entity);return entity;
 }
 function destroyResource(resource){
  if(!resource)return;for(const pool of resource.pools.values())for(const entity of pool.entities){if(activeEntities.has(entity)){scene.remove(entity);activeEntities.delete(entity);}engine.destroyEntity(entity);entity.delete();}
  engine.destroyVertexBuffer(resource.vb);if(resource.ib)engine.destroyIndexBuffer(resource.ib);resources.delete(resource);if(resource.buffer)resourceByBuffer.delete(resource.buffer);
 }
 function updateRenderableTransform(pool,slot,entity,model){
  // Camera motion leaves world transforms unchanged. Avoid repeating three
  // Filament/WASM calls per stationary entity while still checking live ground
  // height and any model edits every frame.
  const matrix=realmFilamentMatrixInto(model,matrixScratch),previous=pool.transforms[slot];
  let changed=!previous;
  for(let i=0;!changed&&i<16;i++)if(previous[i]!==matrix[i])changed=true;
  if(!changed)return;
  const instance=transformManager.getInstance(entity);transformManager.setTransform(instance,matrix);instance.delete();
  if(previous)previous.set(matrix);else pool.transforms[slot]=new Float32Array(matrix);
 }
 function acquire(entry,next){
  let resource=resourceByBuffer.get(entry.buffer);if(!resource)resource=makeResource(entry);
  const pool=poolFor(resource,realmFilamentStyle(entry));activePools.add(pool);
  const slot=pool.used++,entity=pool.entities[slot]||createRenderable(resource,pool);
  updateRenderableTransform(pool,slot,entity,entry.model);next.add(entity);
 }
 const sun=Filament.EntityManager.get().create();
 Filament.LightManager.Builder(Filament.LightManager$Type.SUN).color([1,.94,.83]).intensity(65000).direction([.55,-1,-.38]).castShadows(true).shadowOptions(realmFilamentShadowOptions()).sunAngularRadius(1.4).build(engine,sun);scene.addEntity(sun);
 const pointLights=[];
 function updateLights(lighting){
  const manager=lightManager,sunInstance=manager.getInstance(sun),day=1-lighting.night;
  manager.setIntensity(sunInstance,5500+day*52000);manager.setColor(sunInstance,[.72+.28*day,.76+.18*day,.92-.10*day]);sunInstance.delete();
  indirectLight.setIntensity(6500+day*12500);camera3d.setExposure(5.6+day*7.2,1/(60+day*65),100+lighting.night*100);
  const limit=quality.lightLimit,lights=lighting.lights.slice(0,limit);
  for(let i=0;i<limit;i++){
   let record=pointLights[i];const source=lights[i];
   if(source&&!record){const entity=Filament.EntityManager.get().create();Filament.LightManager.Builder(Filament.LightManager$Type.POINT).falloff(source.radius).intensity(900).build(engine,entity);record=pointLights[i]={entity,active:false};}
   if(!record)continue;
   if(source){const instance=manager.getInstance(record.entity);manager.setPosition(instance,[source.x,source.y,source.z]);manager.setColor(instance,source.color);manager.setFalloff(instance,source.radius);manager.setIntensity(instance,Math.max(120,source.intensity*950));instance.delete();if(!record.active){scene.addEntity(record.entity);record.active=true;}}
   else if(record.active){scene.remove(record.entity);record.active=false;}
  }
 }
 function updateMaterials(lighting,lair){const mood=lair?.ambient||[1,1,1];for(const instance of worldMaterialInstances){instance.setFloatParameter('time',time);instance.setFloatParameter('night',lighting.night);instance.setFloatParameter('interior',Math.max(lighting.cave,lighting.house));instance.setFloat3Parameter('mood',mood);}for(const instance of terrainMaterialInstances)instance.setFloatParameter('night',lighting.night*.72);}
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
 backend={kind:'filament',textureResources,surface,presented:true,engine,scene,view,camera:camera3d,renderer,swapChain,gl:fakeGl,cache,sharedMeshes,skinnedMeshes:new WeakMap(),terrain,upload(data){const buffer=fakeGl.createBuffer();buffer.data=new data.constructor(data);return {buffer,count:data.length/12};},frameId:0,width:initialWidth,height:initialHeight,releaseBuffer(buffer){const resource=resourceByBuffer.get(buffer);if(resource)destroyResource(resource);buffer.data=null;},loadGlb,
  render(entries,dynamic,g){
   if(engine.hasUnrecoverableFailure())throw new Error('Filament reported an unrecoverable renderer failure');
   const dpr=realmPixelScale(),width=Math.max(1,Math.floor(screen.w*dpr)),height=Math.max(1,Math.floor(screen.h*dpr));this.width=width;this.height=height;if(surface.width!==width||surface.height!==height){surface.width=width;surface.height=height;view.setViewport([0,0,width,height]);}
   for(const pool of activePools)pool.used=0;activePools.clear();nextEntities.clear();
   const next=nextEntities;for(const entry of entries)acquire(entry,next);
   if(dynamic.length){
    const count=Math.floor(dynamic.length/12),capacity=dynamicCapacity(count);dynamicResourceIndex=(dynamicResourceIndex+1)%dynamicResources.length;let resource=dynamicResources[dynamicResourceIndex];
    if(!resource||resource.capacity<capacity){
     if(resource)destroyResource(resource);
     const packet=dynamicPacket(dynamic,capacity),buffer={data:packet},entry={buffer,count:capacity,bounds:{center:[0,0,0],halfExtent:[2048,512,2048]}};
     resource=makeResource(entry,true);resource.capacity=capacity;dynamicResources[dynamicResourceIndex]=resource;
    }else updateDynamicResource(resource,dynamic);
    const entry={buffer:resource.buffer,count:resource.count},pool=poolFor(resource,realmFilamentStyle(entry));activePools.add(pool);
    const slot=pool.used++,entity=pool.entities[slot]||createRenderable(resource,pool);
    updateRenderableTransform(pool,slot,entity);next.add(entity);
   }
   const remove=[],add=[];for(const entity of activeEntities)if(!next.has(entity))remove.push(entity);for(const entity of next)if(!activeEntities.has(entity))add.push(entity);
   if(remove.length)scene.removeEntities(remove);if(add.length)scene.addEntities(add);activeEntities.clear();for(const entity of next)activeEntities.add(entity);
   const dprNow=dpr,landCamera=typeof walkSurfaceHeight==='function'?walkSurfaceHeight(px+.5,py+.5):0,pitch=cameraPitch3(),yaw=view3d.yaw,zoom=cameraZoom3(),anchor=typeof cameraAnchor3==='number'?cameraAnchor3:.82,fov=typeof cameraFov3==='number'?cameraFov3:54,distance=typeof cameraDistance3==='function'?cameraDistance3():screen.h/(2*Math.tan(fov*Math.PI/360))/zoom,center=realmFilamentCameraCenter(px+.5,landCamera,py+.5,yaw,pitch,zoom,dprNow),eye=[center[0]+Math.sin(yaw)*Math.cos(pitch)*distance,center[1]+Math.sin(pitch)*distance,center[2]+Math.cos(yaw)*Math.cos(pitch)*distance],near=.25,half=near*Math.tan(fov*Math.PI/360),aspect=screen.w/screen.h;
   camera3d.lookAt(eye,center,[0,1,0]);camera3d.setProjection(Filament.Camera$Projection.PERSPECTIVE,-half*aspect,half*aspect,-2*(1-anchor)*half,2*anchor*half,near,320);
   const lair=typeof CREATURE_LAIRS!=='undefined'?CREATURE_LAIRS[currentScene]:null,lighting=typeof realmLightingState==='function'?realmLightingState():{lights:[],cave:0,house:0,night:0},day=1-lighting.night,sky=lair?.fog||[.055+.35*day,.075+.58*day,.14+.69*day];if(surface.style&&!lair){const top=`rgb(${Math.round(13+70*day)},${Math.round(25+145*day)},${Math.round(55+178*day)})`,haze=`rgb(${Math.round(30+150*day)},${Math.round(43+181*day)},${Math.round(67+176*day)})`,background=`radial-gradient(ellipse at 22% 15%,rgba(255,255,255,${(.28*day).toFixed(2)}) 0,rgba(255,255,255,0) 20%),radial-gradient(ellipse at 68% 22%,rgba(244,251,255,${(.22*day).toFixed(2)}) 0,rgba(244,251,255,0) 25%),linear-gradient(${top},${haze} 70%,rgb(166,205,190))`;if(background!==previousSkyBackground){surface.style.background=background;previousSkyBackground=background;}}
   updateLights(lighting);updateMaterials(lighting,lair);renderer.setClearOptions({clearColor:[...sky,lair?1:0],clear:true,discard:true});renderer.render(swapChain,view);
  }};
 window.VeldrenFilament={version:'1.77.0-pc-stable',backend,loadGlb};return backend;
}

painter3=function(g,project){
 if(project!==project3){const painter=canvasPainterRealm(g,project);painter.software=true;return painter;}
 if(!realmGPU||realmGPU.kind!=='filament')realmGPU=createRealmFilamentGPU();
 const gpu=realmGPU,entries=[],dynamic=[];
 const painter={face(points,color,normals,materialId,colors,uvs){realmFaceData(dynamic,points,color,normals,materialId,colors,uvs);},indexed(mesh,m,style={}){entries.push({...realmMeshEntry(gpu,mesh),model:m,...style});},cached(cached){
  if(cached.kind==='assembly'){for(const i of cached.instances||[]){const model=affineMultiply(cached.model,i.matrix);model[7]-=typeof landHeight==='function'?landHeight(model[3],model[11]):0;entries.push({...realmMeshEntry(gpu,i.mesh),model,...(i.ghost?{dissolve:.45}:{})});}for(const f of cached.faces)realmFaceData(dynamic,f.points.map(p=>briarPoint(p,0,cached.model)),f.color,f.normals,f.material,f.colors,f.uvs);return cached.height;}
  if(cached.kind!=='building')for(const instance of cached.instances||[])entries.push({...realmMeshEntry(gpu,instance.mesh),model:instance.matrix});
  if(!cached.faces.length&&cached.kind!=='building')return cached.height;
  let entry=gpu.cache.get(cached);if(!entry){const data=[];if(cached.kind==='building')for(const instance of cached.instances||[])realmIndexedData(data,instance.mesh,instance.matrix);for(const face of cached.faces){let materialId=face.material||0;if(!materialId&&cached.kind==='building'){const value=parseInt(face.color.slice(1),16),red=value>>16,green=(value>>8)&255,blue=value&255,top=face.points.reduce((sum,p)=>sum+p[1],0)/face.points.length;if(top>2.05&&Math.max(red,green,blue)-Math.min(red,green,blue)>23)materialId=6;else if(red>green*1.15&&green>blue*1.1)materialId=5;}realmFaceData(data,face.points,face.color,face.normals,materialId,face.colors,face.uvs);}entry=gpu.upload(new Float32Array(data));gpu.cache.set(cached,entry);}entries.push(cached.model?{...entry,model:cached.model}:entry);return cached.height;
 },flush(){gpu.render([...realmTerrainEntries(gpu),...entries],dynamic,g);trimRealmMeshes(gpu);gpu.frameId++;}};
 return painter;
};
