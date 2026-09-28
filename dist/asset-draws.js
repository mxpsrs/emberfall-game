'use strict';
// Scene transforms arrive from the native Scene; Filament owns the corresponding
// render-only hierarchy. No draw handle or load status is serialized.
function createVeldrenAssetDraws(engine,scene,assets,resources,profile,filament=Filament){
 const pools=new Map(),manager=engine.getTransformManager();let disposed=false,frame=0,sceneKey=null;
 const unsubscribe=assets.onDispose(destroy);
 function removeInstance(instance){
  if(instance.active)scene.removeEntities(instance.entities);
  for(const entity of [...instance.entities,instance.root]){engine.destroyEntity(entity);filament.EntityManager.get().destroy(entity);entity.delete();}
 }
 function removePool(pool){for(const instance of pool.instances)removeInstance(instance);pool.instances=[];pool.lease.release();}
 function makeInstance(model,options={}){
  const root=filament.EntityManager.get().create(),entities=[];let parent;
  try{
   manager.create(root);parent=manager.getInstance(root);
   for(const draw of model.draws){
    const entity=filament.EntityManager.get().create();entities.push(entity);
    const builder=filament.RenderableManager.Builder(1).boundingBox(draw.resource.bounds).material(0,draw.materialInstance)
     .geometry(0,filament.RenderableManager$PrimitiveType.TRIANGLES,draw.resource.vb,draw.resource.ib).castShadows(options.castShadows!==false).receiveShadows(options.receiveShadows!==false);
    if(draw.skin)builder.skinning(draw.boneCount);
    builder.build(engine,entity);
    if(draw.skin){
     // The 1.77 builder binding stores a pointer to a temporary vector. Upload
     // after build through the manager, which consumes the matrices immediately.
     const bytes=Uint8Array.from(atob(draw.bones),c=>c.charCodeAt(0)),matrices=new Float32Array(bytes.buffer),renderables=engine.getRenderableManager(),renderable=renderables.getInstance(entity);
     try{renderables.setBonesFromMatrices(renderable,Array.from({length:draw.boneCount},(_,i)=>Array.from(matrices.subarray(i*16,i*16+16))),0);}finally{renderable.delete();}
    }
    const instance=manager.getInstance(entity);try{manager.setParent(instance,parent);manager.setTransform(instance,draw.matrix);}finally{instance.delete();}
   }
   return {root,entities,active:false,matrix:null};
  }catch(error){removeInstance({root,entities,active:false});throw error;}finally{parent?.delete();}
 }
 function begin(key){
  if(disposed)throw Error('Asset draw owner destroyed');frame++;
  if(key!==sceneKey){for(const pool of pools.values())removePool(pool);pools.clear();sceneKey=key;}
  for(const pool of pools.values())pool.used=0;
 }
 function submit(id,matrix,distance=0,options=null,identity=null,lodSelected=false){
  if(!lodSelected&&assets.record(id).lods?.length>1)id=assets.lod(id,distance).asset;
  const generation=assets.record(id).generation,key=options?id+JSON.stringify(options)+(options.material?'@'+assets.record(options.material).generation:''):id;let pool=pools.get(key);
  if(pool&&pool.lease.generation!==generation){removePool(pool);pools.delete(key);pool=null;}
  if(!pool){
   const lease=resources.acquire(id,profile,options||{});pool={lease,model:null,error:null,instances:[],used:0,lastUsed:frame};pools.set(key,pool);
   const current=pool;lease.ready.then(model=>{current.model=model;},error=>{current.error=error;});
  }
  pool.lastUsed=frame;if(pool.error)throw pool.error;if(!pool.model)return false;
  const slot=pool.used++,instance=pool.instances[slot]||(pool.instances[slot]=makeInstance(pool.model,options||{}));
  if(!instance.matrix||matrix.some((v,i)=>v!==instance.matrix[i])){
   const transform=manager.getInstance(instance.root);try{manager.setTransform(transform,matrix);}finally{transform.delete();}instance.matrix=Array.from(matrix);
  }
  if(!instance.active){scene.addEntities(instance.entities);instance.active=true;}return true;
 }
 function end(){
  for(const [id,pool] of pools){
   for(let i=pool.used;i<pool.instances.length;i++)if(pool.instances[i].active){scene.removeEntities(pool.instances[i].entities);pool.instances[i].active=false;}
   // The small grace interval avoids allocating again on a culling boundary;
   // changing Scene clears immediately, and excess instance slots are removed.
   while(pool.instances.length>pool.used+8)removeInstance(pool.instances.pop());
   if(frame-pool.lastUsed>30){removePool(pool);pools.delete(id);}
  }
 }
 function destroy(){if(disposed)return;disposed=true;unsubscribe();for(const pool of pools.values())removePool(pool);pools.clear();}
 return Object.freeze({begin,submit,end,destroy,diagnostics:()=>({models:pools.size,activeRenderables:[...pools.values()].reduce((n,p)=>n+p.instances.filter(i=>i.active).reduce((m,i)=>m+i.entities.length,0),0),submissions:[...pools.values()].reduce((n,p)=>n+p.used*(p.model?.draws.length||0),0),instances:[...pools.values()].reduce((n,p)=>n+p.instances.length,0),loading:[...pools.values()].filter(p=>!p.model&&!p.error).length,failures:[...pools.values()].filter(p=>p.error).map(p=>String(p.error))})});
}
