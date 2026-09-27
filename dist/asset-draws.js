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
 function makeInstance(model){
  const root=filament.EntityManager.get().create(),entities=[];let parent;
  try{
   manager.create(root);parent=manager.getInstance(root);
   for(const draw of model.draws){
    if(draw.skin)throw Error('Animated canonical draw requires a native pose');
    const entity=filament.EntityManager.get().create();entities.push(entity);
    filament.RenderableManager.Builder(1).boundingBox(draw.resource.bounds).material(0,draw.materialInstance)
     .geometry(0,filament.RenderableManager$PrimitiveType.TRIANGLES,draw.resource.vb,draw.resource.ib).castShadows(true).receiveShadows(true).build(engine,entity);
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
 function submit(id,matrix){
  const generation=assets.record(id).generation;let pool=pools.get(id);
  if(pool&&pool.lease.generation!==generation){removePool(pool);pools.delete(id);pool=null;}
  if(!pool){
   const lease=resources.acquire(id,profile);pool={lease,model:null,error:null,instances:[],used:0,lastUsed:frame};pools.set(id,pool);
   const current=pool;lease.ready.then(model=>{current.model=model;},error=>{current.error=error;});
  }
  pool.lastUsed=frame;if(pool.error)throw pool.error;if(!pool.model)return false;
  const slot=pool.used++,instance=pool.instances[slot]||(pool.instances[slot]=makeInstance(pool.model));
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
 return Object.freeze({begin,submit,end,destroy,diagnostics:()=>({models:pools.size,instances:[...pools.values()].reduce((n,p)=>n+p.instances.length,0),loading:[...pools.values()].filter(p=>!p.model&&!p.error).length,failures:[...pools.values()].filter(p=>p.error).map(p=>String(p.error))})});
}
