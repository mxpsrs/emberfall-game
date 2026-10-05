'use strict';
// One bounded preview engine shares the production native model/material path.
// UI thumbnails retain pixels only; every model lease is released after capture.
function createVeldrenAssetPreview(assets,filament=Filament){
 const surface=document.createElement('canvas');surface.width=384;surface.height=256;
 const engine=filament.Engine.create(surface,{backend:filament.Backend.OPENGL,preserveDrawingBuffer:true});
 engine.setAutomaticInstancingEnabled(true);
 const scene=engine.createScene(),swap=engine.createSwapChain(),renderer=engine.createRenderer(),view=engine.createView();
 const cameraEntity=filament.EntityManager.get().create(),camera=engine.createCamera(cameraEntity),sun=filament.EntityManager.get().create();
 view.setScene(scene);view.setCamera(camera);view.setViewport([0,0,surface.width,surface.height]);view.setPostProcessingEnabled(true);
 view.setAntiAliasing(filament.View$AntiAliasing.FXAA);view.setAmbientOcclusion(filament.View$AmbientOcclusion.NONE);
 filament.LightManager.Builder(filament.LightManager$Type.DIRECTIONAL).color([1,.95,.88]).intensity(65000).direction([-.6,-1,-.7]).castShadows(false).build(engine,sun);scene.addEntity(sun);
 const sh=new Float32Array(27);sh.set([.6,.65,.75]);const indirect=filament.IndirectLight.Builder().irradianceSh(3,sh).intensity(18000).build(engine);scene.setIndirectLight(indirect);
 camera.setExposure(12,1/125,100);renderer.setClearOptions({clearColor:[.035,.055,.07,1],clear:true,discard:true});
 const textures=createVeldrenTextureResources(engine,assets,filament),materials=createVeldrenMaterialResources(engine,assets,textures,filament),models=createVeldrenModelResources(engine,assets,materials,filament);
 const draws=createVeldrenAssetDraws(engine,scene,assets,models,'browser',filament),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 let disposed=false,queue=Promise.resolve(),sequence=0;const latest=new Map();const unsubscribe=assets.onDispose(destroy);
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 async function capture(id,options,token){
  if(disposed||latest.get(options.key)!==token)return null;
  const generation=assets.record(id).generation,stale=()=>disposed||latest.get(options.key)!==token||assets.record(id).generation!==generation;
  const lease=models.acquire(id,'browser');
  try{
   await lease.ready;if(stale())return null;
   const bounds=assets.record(id).bounds;if(!bounds)throw Error('Model bounds unavailable');
   const center=bounds[0].map((v,i)=>(v+bounds[1][i])/2),radius=Math.max(.01,Math.hypot(...bounds[1].map((v,i)=>(v-bounds[0][i])/2)));
   const yaw=options.yaw??.68,tilt=options.tilt??.35,distance=radius*3.25/(options.zoom||1);
   camera.lookAt([center[0]+Math.sin(yaw)*Math.cos(tilt)*distance,center[1]+Math.sin(tilt)*distance,center[2]+Math.cos(yaw)*Math.cos(tilt)*distance],center,[0,1,0]);
   const near=Math.max(.001,radius*.01),half=near*Math.tan(Math.PI/8),aspect=surface.width/surface.height;
   camera.setProjection(filament.Camera$Projection.PERSPECTIVE,-half*aspect,half*aspect,-half,half,near,radius*20);
   draws.begin(id);draws.submit(id,identity);draws.end();await frame();
   if(stale())return null;
   draws.begin(id);if(!draws.submit(id,identity))throw Error('Preview model did not finish loading');draws.end();
   let rendered=0;
   for(let attempt=0;attempt<30&&rendered<2;attempt++){
    await frame();if(stale())return null;
    engine.execute();
    if(renderer.beginFrame(swap)){renderer.renderView(view);renderer.endFrame();rendered++;}
    engine.execute();
   }
   if(rendered<2)throw Error('Preview renderer did not produce a frame');
   const result=document.createElement('canvas');result.width=surface.width;result.height=surface.height;result.getContext('2d').drawImage(surface,0,0);
   return result;
  }finally{lease.release();if(!disposed){draws.begin(null);draws.end();engine.execute();}}
 }
 function render(id,options={}){
  const config={key:'inspector',...options},token=++sequence;latest.set(config.key,token);
  const task=queue.then(()=>capture(id,config,token));queue=task.catch(()=>{});return task;
 }
 function destroy(){
  if(disposed)return;engine.execute();disposed=true;unsubscribe();draws.destroy();models.destroy();materials.destroy();textures.destroy();
  scene.remove(sun);engine.destroyEntity(sun);filament.EntityManager.get().destroy(sun);sun.delete();
  engine.destroyView(view);engine.destroyRenderer(renderer);engine.destroyScene(scene);engine.destroyIndirectLight(indirect);engine.destroySwapChain(swap);
  engine.destroyCameraComponent(cameraEntity);filament.EntityManager.get().destroy(cameraEntity);cameraEntity.delete();filament.Engine.destroy(engine);
 }
 return Object.freeze({render,destroy,diagnostics:()=>({models:models.diagnostics(),textures:textures.diagnostics(),draws:draws.diagnostics()})});
}
