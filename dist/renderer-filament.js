'use strict';
// Primary live world renderer. Existing authored mesh packets feed Filament
// vertex/index buffers, preserving material IDs, transforms and camera math.
function realmFilamentMatrix(model){
 if(!model)return realmIdentityModel;
 const m=realmGroundedMatrix(model);
 return new Float32Array([m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1]);
}
function realmFilamentCameraCenter(x,y,z,yaw,pitch,zoom,dpr){
 // Lock the camera to its screen-space backing-pixel grid. Static world
 // detail then translates between pixels instead of changing phase inside
 // them, without accumulating old frames or changing the camera's depth.
 const c=Math.cos(yaw),s=Math.sin(yaw),st=Math.sin(pitch),ct=Math.cos(pitch),depth=x*s*ct+y*st+z*c*ct;
 const step=1/(Math.max(1,zoom)*Math.max(1,dpr)),right=Math.round((x*c-z*s)/step)*step,up=Math.round(((x*s+z*c)*st-y*ct)/step)*step;
 return [right*c+up*s*st+depth*s*ct,-up*ct+depth*st,-right*s+up*c*st+depth*c*ct];
}
function realmFilamentStyle(entry){
 const dissolve=Math.max(0,Math.min(1,Number(entry.dissolve)||0)),boss=Number(entry.bossColor)||0,terrain=entry.terrain?1:0;
 return {key:'t'+terrain+':b'+Math.round(boss*10)+':d'+Math.round(dissolve*20),boss,dissolve:Math.round(dissolve*20)/20,terrain};
}
function realmMobileFilament(){return window.matchMedia?.('(pointer: coarse)')?.matches===true||typeof navigator!=='undefined'&&/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'');}
function realmFilamentShadowOptions(){return realmMobileFilament()?{mapSize:1024,shadowCascades:1,stable:true,normalBias:.8,constantBias:.001,maxShadowDistance:80}:{mapSize:2048,shadowCascades:3,stable:true,normalBias:.8,constantBias:.001,maxShadowDistance:110};}
function realmFilamentQualityProfile(){return realmMobileFilament()?{anisotropy:8,glbBytes:32*1024*1024,ao:false,dithering:false}:{anisotropy:16,glbBytes:96*1024*1024,ao:true,dithering:true};}
function realmFilamentBounds(positions){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<positions.length;i+=3)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],positions[i+a]);hi[a]=Math.max(hi[a],positions[i+a]);}
 if(!Number.isFinite(lo[0]))return {center:[0,0,0],halfExtent:[1,1,1]};
 return {center:lo.map((v,i)=>(v+hi[i])*.5),halfExtent:lo.map((v,i)=>Math.max(.001,(hi[i]-v)*.5))};
}
function realmFilamentNative(stage,task){
 try{return task();}catch(error){const wrapped=new Error('Filament '+stage+' failed: '+String(error));wrapped.cause=error;throw wrapped;}
}
function realmFilamentMipLevels(image,srgb=true){
 const levels=[image];let source=image;
 while(source.width>1||source.height>1){
  const width=Math.max(1,source.width>>1),height=Math.max(1,source.height>>1),pixels=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let channel=0;channel<4;channel++){
   let total=0,count=0;
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const sx=Math.min(source.width-1,x*2+dx),sy=Math.min(source.height-1,y*2+dy),value=source.pixels[(sy*source.width+sx)*4+channel]/255;total+=srgb&&channel<3?(value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4)):value;count++;}
   let value=total/count;if(srgb&&channel<3)value=value<=.0031308?value*12.92:1.055*Math.pow(value,1/2.4)-.055;
   pixels[(y*width+x)*4+channel]=Math.round(Math.max(0,Math.min(1,value))*255);
  }
  source={width,height,pixels};levels.push(source);
 }
 return levels;
}
function realmFilamentTextureFromPixels(engine,image,stage){
 if(!image?.pixels||!image.width||!image.height)throw new Error('Decoded texture pixels are unavailable');
 const levels=realmFilamentMipLevels(image),texture=realmFilamentNative(stage+'-allocate',()=>Filament.Texture.Builder().width(image.width).height(image.height).levels(levels.length).sampler(Filament.Texture$Sampler.SAMPLER_2D).format(Filament.Texture$InternalFormat.SRGB8_A8).build(engine));
 for(let level=0;level<levels.length;level++){
  const buffer=realmFilamentNative(stage+'-buffer-'+level,()=>Filament.PixelBuffer(levels[level].pixels,Filament.PixelDataFormat.RGBA,Filament.PixelDataType.UBYTE));
  realmFilamentNative(stage+'-upload-'+level,()=>texture.setImage(engine,level,buffer));
 }
 return texture;
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
 // WebKit binds Filament's WebGL swap chain to the canvas backing store that
 // exists when the engine is created. Resizing the default 300x150 canvas only
 // after createSwapChain() leaves that first swap chain invalid on iOS.
 surface.width=initialWidth;surface.height=initialHeight;
 canvas.parentElement.insertBefore(surface,canvas);
 const engine=Filament.Engine.create(surface,{backend:Filament.Backend.OPENGL});
 engine.setAutomaticInstancingEnabled(true);
 const scene=engine.createScene(),swapChain=engine.createSwapChain(),renderer=engine.createRenderer(),view=engine.createView();
 const cameraEntity=Filament.EntityManager.get().create(),camera3d=engine.createCamera(cameraEntity);
 const quality=realmFilamentQualityProfile();
 view.setCamera(camera3d);view.setScene(scene);view.setViewport([0,0,initialWidth,initialHeight]);view.setPostProcessingEnabled(true);view.setShadowingEnabled(true);view.setAntiAliasing(Filament.View$AntiAliasing.FXAA);view.setAmbientOcclusion(quality.ao?Filament.View$AmbientOcclusion.SSAO:Filament.View$AmbientOcclusion.NONE);view.setDithering(quality.dithering?Filament.View$Dithering.TEMPORAL:Filament.View$Dithering.NONE);
 if(quality.ao)view.setAmbientOcclusionOptions({enabled:true,radius:.55,power:1.15,resolution:.5,quality:Filament.View$QualityLevel.MEDIUM,lowPassFilter:Filament.View$QualityLevel.MEDIUM});
 const colorGrading=Filament.ColorGrading.Builder().quality(realmMobileFilament()?Filament.ColorGrading$QualityLevel.MEDIUM:Filament.ColorGrading$QualityLevel.HIGH).toneMapping(Filament.ColorGrading$ToneMapping.ACES).exposure(.2).contrast(1.04).saturation(1.03).vibrance(1.08).gamutMapping(true).build(engine);view.setColorGrading(colorGrading);
 // Compact spherical-harmonic sky lighting restores broad ambient response
 // without the download and GPU residency of an environment cubemap.
 const skySh=new Float32Array([.52,.60,.72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
 const indirectLight=Filament.IndirectLight.Builder().irradianceSh(3,skySh).intensity(18000).build(engine);scene.setIndirectLight(indirectLight);
 const assets=window.VELDREN_FILAMENT_ASSETS,material=engine.createMaterial(assets.material),terrainMaterial=engine.createMaterial(assets.terrainMaterial),atlas=assets.atlasPixels?realmFilamentTextureFromPixels(engine,assets.atlasPixels,'atlas-mobile'):realmFilamentNative('atlas-png',()=>engine.createTextureFromPng(assets.atlas,{srgb:true})),groundSurfaces=realmFilamentTextureFromPixels(engine,assets.groundSurfacesPixels,'terrain-browser');
 assets.atlasPixels=null;assets.groundSurfacesPixels=null;
 const minFilter=Filament.MinFilter.LINEAR_MIPMAP_LINEAR;
 const sampler=new Filament.TextureSampler(minFilter,Filament.MagFilter.LINEAR,Filament.WrapMode.CLAMP_TO_EDGE);sampler.setAnisotropy(quality.anisotropy);
 const groundSampler=new Filament.TextureSampler(minFilter,Filament.MagFilter.LINEAR,Filament.WrapMode.CLAMP_TO_EDGE);groundSampler.setAnisotropy(quality.anisotropy);
 const materialInstances=new Map(),terrainMaterialInstances=new Set(),worldMaterialInstances=new Set(),resources=new Set(),resourceByBuffer=new WeakMap(),activeEntities=new Set();
 const sharedMeshes=new WeakMap(),cache=new WeakMap(),terrain=new Map();
 // Dynamic faces used to destroy their Filament buffers, renderable and entity
 // every frame. Keep a small ring of persistent streaming buffers instead so
 // the driver can consume one while JavaScript refreshes the next.
 const dynamicResources=[null,null,null];let dynamicResourceIndex=-1,backend=null;
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
  const packet=new Float32Array(capacity*12);packet.set(data);const count=data.length/12;
  if(count){const x=data[0],y=data[1],z=data[2];for(let i=count;i<capacity;i++){const o=i*12;packet[o]=x;packet[o+1]=y;packet[o+2]=z;packet[o+4]=1;}}
  return packet;
 }
 function updateDynamicResource(resource,data){
  const arrays=realmFilamentArrays(dynamicPacket(data,resource.capacity)),orientationBuilder=new Filament.SurfaceOrientation$Builder().vertexCount(arrays.count);
  orientationBuilder.normals(arrays.normals,12);const orientation=orientationBuilder.build(),tangents=orientation.getQuats(arrays.count);orientation.delete();
  resource.vb.setBufferAt(engine,0,arrays.positions);resource.vb.setBufferAt(engine,1,tangents);resource.vb.setBufferAt(engine,2,arrays.colors);resource.vb.setBufferAt(engine,3,arrays.uvs);
 }
 function poolFor(resource,style){let pool=resource.pools.get(style.key);if(pool)return pool;pool={entities:[],used:0,material:styleInstance(style)};resource.pools.set(style.key,pool);return pool;}
 function createRenderable(resource,pool){
  // Moving cascaded shadows are useful on architecture, but they crawl across
  // the continuously scrolling terrain on mobile. Terrain keeps authored
  // lighting and normals without sampling the moving shadow map.
  const entity=Filament.EntityManager.get().create(),builder=Filament.RenderableManager.Builder(1).boundingBox(resource.bounds).material(0,pool.material).castShadows(!resource.terrain).receiveShadows(!resource.terrain);
  if(resource.ib)builder.geometry(0,Filament.RenderableManager$PrimitiveType.TRIANGLES,resource.vb,resource.ib);else builder.geometryNoIndices(0,Filament.RenderableManager$PrimitiveType.TRIANGLES,resource.vb);
  builder.build(engine,entity);pool.entities.push(entity);return entity;
 }
 function destroyResource(resource){
  if(!resource)return;for(const pool of resource.pools.values())for(const entity of pool.entities){if(activeEntities.has(entity)){scene.remove(entity);activeEntities.delete(entity);}engine.destroyEntity(entity);entity.delete();}
  engine.destroyVertexBuffer(resource.vb);if(resource.ib)engine.destroyIndexBuffer(resource.ib);resources.delete(resource);if(resource.buffer)resourceByBuffer.delete(resource.buffer);
 }
 function acquire(entry,next){
  let resource=resourceByBuffer.get(entry.buffer);if(!resource)resource=makeResource(entry);
  const pool=poolFor(resource,realmFilamentStyle(entry)),entity=pool.entities[pool.used++]||createRenderable(resource,pool),transforms=engine.getTransformManager(),instance=transforms.getInstance(entity);
  transforms.setTransform(instance,realmFilamentMatrix(entry.model));instance.delete();next.add(entity);
 }
 const sun=Filament.EntityManager.get().create();
 Filament.LightManager.Builder(Filament.LightManager$Type.SUN).color([1,.94,.83]).intensity(65000).direction([.55,-1,-.38]).castShadows(true).shadowOptions(realmFilamentShadowOptions()).sunAngularRadius(1.4).build(engine,sun);scene.addEntity(sun);
 const pointLights=[];
 function updateLights(lighting){
  const manager=engine.getLightManager(),sunInstance=manager.getInstance(sun),day=1-lighting.night;
  manager.setIntensity(sunInstance,5500+day*52000);manager.setColor(sunInstance,[.72+.28*day,.76+.18*day,.92-.10*day]);sunInstance.delete();
  indirectLight.setIntensity(6500+day*12500);camera3d.setExposure(5.6+day*7.2,1/(60+day*65),100+lighting.night*100);
  const lights=lighting.lights.slice(0,16);
  for(let i=0;i<16;i++){
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
 backend={kind:'filament',surface,presented:true,engine,scene,view,camera:camera3d,renderer,swapChain,gl:fakeGl,cache,sharedMeshes,skinnedMeshes:new WeakMap(),terrain,upload(data){const buffer=fakeGl.createBuffer();buffer.data=new data.constructor(data);return {buffer,count:data.length/12};},frameId:0,width:initialWidth,height:initialHeight,releaseBuffer(buffer){const resource=resourceByBuffer.get(buffer);if(resource)destroyResource(resource);buffer.data=null;},loadGlb,
  render(entries,dynamic,g){
   if(engine.hasUnrecoverableFailure())throw new Error('Filament reported an unrecoverable renderer failure');
   const dpr=realmPixelScale(),width=Math.max(1,Math.floor(screen.w*dpr)),height=Math.max(1,Math.floor(screen.h*dpr));this.width=width;this.height=height;if(surface.width!==width||surface.height!==height){surface.width=width;surface.height=height;view.setViewport([0,0,width,height]);}
   for(const resource of resources)for(const pool of resource.pools.values())pool.used=0;
   const next=new Set();for(const entry of entries)acquire(entry,next);
   if(dynamic.length){const data=new Float32Array(dynamic),count=data.length/12,capacity=dynamicCapacity(count);dynamicResourceIndex=(dynamicResourceIndex+1)%dynamicResources.length;let resource=dynamicResources[dynamicResourceIndex];
    if(!resource||resource.capacity<capacity){if(resource)destroyResource(resource);const packet=dynamicPacket(data,capacity),buffer={data:packet},entry={buffer,count:capacity,bounds:{center:[0,0,0],halfExtent:[2048,512,2048]}};resource=makeResource(entry,true);resource.capacity=capacity;dynamicResources[dynamicResourceIndex]=resource;}
    else updateDynamicResource(resource,data);
    const entry={buffer:resource.buffer,count:resource.count},pool=poolFor(resource,realmFilamentStyle(entry)),entity=pool.entities[pool.used++]||createRenderable(resource,pool),transforms=engine.getTransformManager(),instance=transforms.getInstance(entity);transforms.setTransform(instance,realmIdentityModel);instance.delete();next.add(entity);
   }
   const remove=[...activeEntities].filter(entity=>!next.has(entity)),add=[...next].filter(entity=>!activeEntities.has(entity));if(remove.length)scene.removeEntities(remove);if(add.length)scene.addEntities(add);activeEntities.clear();for(const entity of next)activeEntities.add(entity);
   const landCamera=typeof walkSurfaceHeight==='function'?walkSurfaceHeight(px+.5,py+.5):0,pitch=cameraPitch3(),yaw=view3d.yaw,zoom=cameraZoom3(),anchor=typeof cameraAnchor3==='number'?cameraAnchor3:.82,fov=typeof cameraFov3==='number'?cameraFov3:54,distance=typeof cameraDistance3==='function'?cameraDistance3():screen.h/(2*Math.tan(fov*Math.PI/360))/zoom,center=realmFilamentCameraCenter(px+.5,landCamera,py+.5,yaw,pitch,zoom,dpr),eye=[center[0]+Math.sin(yaw)*Math.cos(pitch)*distance,center[1]+Math.sin(pitch)*distance,center[2]+Math.cos(yaw)*Math.cos(pitch)*distance],near=.25,half=near*Math.tan(fov*Math.PI/360),aspect=screen.w/screen.h;
   camera3d.lookAt(eye,center,[0,1,0]);camera3d.setProjection(Filament.Camera$Projection.PERSPECTIVE,-half*aspect,half*aspect,-2*(1-anchor)*half,2*anchor*half,near,320);
   const lair=typeof CREATURE_LAIRS!=='undefined'?CREATURE_LAIRS[currentScene]:null,lighting=typeof realmLightingState==='function'?realmLightingState():{lights:[],cave:0,house:0,night:0},day=1-lighting.night,sky=lair?.fog||[.055+.35*day,.075+.58*day,.14+.69*day];if(surface.style&&!lair){const top=`rgb(${Math.round(13+70*day)},${Math.round(25+145*day)},${Math.round(55+178*day)})`,haze=`rgb(${Math.round(30+150*day)},${Math.round(43+181*day)},${Math.round(67+176*day)})`;surface.style.background=`radial-gradient(ellipse at 22% 15%,rgba(255,255,255,${(.28*day).toFixed(2)}) 0,rgba(255,255,255,0) 20%),radial-gradient(ellipse at 68% 22%,rgba(244,251,255,${(.22*day).toFixed(2)}) 0,rgba(244,251,255,0) 25%),linear-gradient(${top},${haze} 70%,rgb(166,205,190))`;}
   updateLights(lighting);updateMaterials(lighting,lair);renderer.setClearOptions({clearColor:[...sky,lair?1:0],clear:true,discard:true});renderer.render(swapChain,view);
  }};
 window.VeldrenFilament={version:'1.77.0',backend,loadGlb};return backend;
}

// renderer-gl.js remains loaded for mesh-packing utilities and small offscreen
// UI previews only. The live world path is exclusively Filament.
painter3=function(g,project){
 if(project!==project3){const painter=canvasPainterRealm(g,project);painter.software=true;return painter;}
 if(!realmGPU||realmGPU.kind!=='filament')realmGPU=createRealmFilamentGPU();
 const gpu=realmGPU,entries=[],dynamic=[];
 const painter={face(points,color,normals,materialId,colors,uvs){realmFaceData(dynamic,points,color,normals,materialId,colors,uvs);},indexed(mesh,m,style={}){entries.push({...realmMeshEntry(gpu,mesh),model:m,...style});},cached(cached){
  if(cached.kind!=='building')for(const instance of cached.instances||[])entries.push({...realmMeshEntry(gpu,instance.mesh),model:instance.matrix});
  if(!cached.faces.length&&cached.kind!=='building')return cached.height;
  let entry=gpu.cache.get(cached);if(!entry){const data=[];if(cached.kind==='building')for(const instance of cached.instances||[])realmIndexedData(data,instance.mesh,instance.matrix);for(const face of cached.faces){let materialId=face.material||0;if(!materialId&&cached.kind==='building'){const value=parseInt(face.color.slice(1),16),red=value>>16,green=(value>>8)&255,blue=value&255,top=face.points.reduce((sum,p)=>sum+p[1],0)/face.points.length;if(top>2.05&&Math.max(red,green,blue)-Math.min(red,green,blue)>23)materialId=6;else if(red>green*1.15&&green>blue*1.1)materialId=5;}realmFaceData(data,face.points,face.color,face.normals,materialId,face.colors,face.uvs);}entry=gpu.upload(new Float32Array(data));gpu.cache.set(cached,entry);}entries.push(entry);return cached.height;
 },flush(){gpu.render([...realmTerrainEntries(gpu),...entries],dynamic,g);trimRealmMeshes(gpu);gpu.frameId++;}};
 return painter;
};
