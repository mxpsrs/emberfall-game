'use strict';
// Scene transforms arrive from the native Scene; Filament owns the corresponding
// render-only hierarchy. No draw handle or load status is serialized.
function createVeldrenRenderableBudget(profile){
 const limit=profile==='browser-mobile'?8:16,budgetMs=profile==='browser-mobile'?3:5,owners=[];let remaining=limit,used=0,started=null,maxUsed=0,frame=0,nextOwner=0;
 const now=()=>globalThis.performance?.now?.()??Date.now();
 function consume(){if(remaining<=0||(used&&now()-started>=budgetMs))return false;if(started===null)started=now();remaining--;used++;maxUsed=Math.max(maxUsed,used);return true;}
 return Object.freeze({registerOwner(){const owner={items:[],cursor:0};owners.push(owner);return owner;},beginFrame(){frame++;for(const owner of owners){owner.items.length=0;owner.cursor=0;}remaining=limit;used=0;started=null;},consume,enqueue(owner,instance){if(!owner||instance.queuedFrame===frame)return;instance.queuedFrame=frame;owner.items.push(instance);},drain(){for(const owner of owners)owner.items.sort((a,b)=>(a.priority||0)-(b.priority||0));let ownerIndex=nextOwner;
   while(remaining>0&&(!used||now()-started<budgetMs)){let chosen=-1,best=Infinity;for(let offset=0;offset<owners.length;offset++){const index=(ownerIndex+offset)%owners.length,owner=owners[index],instance=owner?.items[owner.cursor];if(!instance)continue;const priority=Number.isFinite(instance.priority)?instance.priority:0;if(priority<best){best=priority;chosen=index;}}
    if(chosen<0)break;const owner=owners[chosen],instance=owner.items[owner.cursor++];ownerIndex=(chosen+1)%owners.length;instance.queuedFrame=0;if(!instance.pending||typeof instance.advance!=='function')continue;if(!consume())break;instance.advance();}
   nextOwner=ownerIndex;return used;
  },diagnostics:()=>({limit,budgetMs,remaining,used,maxUsed,queued:owners.reduce((n,owner)=>n+owner.items.length-owner.cursor,0)})});
}
function createVeldrenAssetDraws(engine,scene,assets,resources,profile,filament=Filament,streaming=null,constructionBudget=null){
 const pools=new Map(),manager=engine.getTransformManager(),constructionOwner=constructionBudget?.registerOwner?.();let disposed=false,frame=0,sceneKey=null;
 const unsubscribe=assets.onDispose(destroy);
 function removeInstance(instance){
  instance.pending=false;instance.advance=null;
  if(instance.active)scene.removeEntities(instance.entities);
  instance.parent?.delete();instance.parent=null;
  for(const entity of instance.root?[...instance.entities,instance.root]:instance.entities){engine.destroyEntity(entity);filament.EntityManager.get().destroy(entity);entity.delete();}
 }
 function removePool(pool){for(const instance of pool.instances)removeInstance(instance);pool.instances=[];pool.identities.clear();pool.lease.release();}
 function beginInstance(model,options={}){
  return {root:null,entities:[],active:false,matrix:null,parent:null,model,options,nextDraw:0,pending:true,pendingMatrix:null,priority:Infinity};
 }
 function createInstanceRoot(instance){
  instance.root=filament.EntityManager.get().create();
  try{manager.create(instance.root);}catch(error){removeInstance(instance);throw error;}
 }
 function appendInstanceDraw(instance,draw,options){
  const entity=filament.EntityManager.get().create();instance.entities.push(entity);
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
  const parent=manager.getInstance(instance.root),child=manager.getInstance(entity);try{manager.setParent(child,parent);manager.setTransform(child,draw.matrix);}finally{child.delete();parent.delete();}
 }
 function finishInstance(instance){instance.pending=false;}
 function activateInstance(instance){
  finishInstance(instance);const transform=manager.getInstance(instance.root);
  try{manager.setTransform(transform,instance.pendingMatrix);}finally{transform.delete();}
  instance.matrix=Array.from(instance.pendingMatrix);instance.pendingMatrix=null;scene.addEntities(instance.entities);instance.active=true;
 }
 function makeInstance(model,options={}){
  const instance=beginInstance(model,options);
  try{createInstanceRoot(instance);for(const draw of model.draws)appendInstanceDraw(instance,draw,options);finishInstance(instance);return instance;}
  catch(error){removeInstance(instance);throw error;}
 }
 function begin(key){
  if(disposed)throw Error('Asset draw owner destroyed');frame++;
  if(key!==sceneKey){for(const pool of pools.values())removePool(pool);pools.clear();sceneKey=key;}
  for(const pool of pools.values())pool.used=0;
 }
 function submit(id,matrix,distance=0,options=null,identity=null,lodSelected=false){
  if(!lodSelected&&assets.record(id).lods?.length>1)id=assets.lod(id,distance).asset;
  if(streaming&&!streaming.want(id,matrix,options,identity))return false;
  const generation=assets.record(id).generation,key=options?id+JSON.stringify(options)+(options.material?'@'+assets.record(options.material).generation:''):id;let pool=pools.get(key);
  if(pool&&pool.lease.generation!==generation){removePool(pool);pools.delete(key);pool=null;}
  if(!pool){
   const lease=resources.acquire(id,profile,options||{});pool={asset:id,material:options?.material||'',lease,model:null,error:null,instances:[],identities:new Map(),used:0,lastUsed:frame};pools.set(key,pool);
   const current=pool;lease.ready.then(model=>{current.model=model;},error=>{current.error=error;});
  }
  pool.lastUsed=frame;if(pool.error)throw pool.error;if(!pool.model)return false;
  const slot=pool.used++,keyIdentity=identity==null?'slot:'+slot:'entity:'+identity;
  let instance=pool.identities.get(keyIdentity);
  if(!instance){instance=constructionBudget?beginInstance(pool.model,options||{}):makeInstance(pool.model,options||{});instance.identity=keyIdentity;pool.identities.set(keyIdentity,instance);pool.instances.push(instance);
   if(constructionBudget)instance.advance=()=>{try{if(!instance.root){createInstanceRoot(instance);return true;}if(instance.nextDraw>=instance.model.draws.length){activateInstance(instance);return false;}appendInstanceDraw(instance,instance.model.draws[instance.nextDraw++],instance.options);if(instance.nextDraw>=instance.model.draws.length){activateInstance(instance);return false;}return true;}catch(error){removeInstance(instance);pool.identities.delete(instance.identity);const at=pool.instances.indexOf(instance);if(at>=0)pool.instances.splice(at,1);throw error;}};
  }
  instance.seen=frame;
  if(instance.pending){if(!instance.pendingMatrix)instance.pendingMatrix=new Float32Array(matrix.length);instance.pendingMatrix.set(matrix);instance.priority=Number.isFinite(distance)?distance:0;return true;}
  if(!instance.matrix||matrix.some((v,i)=>v!==instance.matrix[i])){
   const transform=manager.getInstance(instance.root);try{manager.setTransform(transform,matrix);}finally{transform.delete();}instance.matrix=Array.from(matrix);
  }
  if(!instance.active){scene.addEntities(instance.entities);instance.active=true;}return true;
 }
 function end(){
  if(constructionBudget){
   for(const pool of pools.values())for(const instance of pool.instances)if(instance.pending&&instance.seen===frame)constructionBudget.enqueue(constructionOwner,instance);
  }
  for(const [id,pool] of pools){
   if(!pool.used&&streaming?.retains&&!streaming.retains(pool.asset,pool.material)){removePool(pool);pools.delete(id);continue;}
   for(const instance of pool.instances)if(instance.seen!==frame&&instance.active){scene.removeEntities(instance.entities);instance.active=false;}
   // The small grace interval avoids allocating again on a culling boundary;
   // changing Scene clears immediately, and excess instance slots are removed.
   // Keep recently culled identities through a short boundary crossing. The
   // previous eight-slot rule destroyed large buildings after a single miss.
   const idleLimit=profile==='browser-mobile'?32:64;let idle=0,kept=0;
   for(const instance of pool.instances){if(instance.seen===frame||(frame-instance.seen<=120&&++idle<=idleLimit))pool.instances[kept++]=instance;else{removeInstance(instance);pool.identities.delete(instance.identity);}}pool.instances.length=kept;
   if(frame-pool.lastUsed>120){removePool(pool);pools.delete(id);}
  }
 }
 function destroy(){if(disposed)return;disposed=true;unsubscribe();for(const pool of pools.values())removePool(pool);pools.clear();}
 return Object.freeze({begin,submit,end,destroy,diagnostics:()=>({models:pools.size,activeRenderables:[...pools.values()].reduce((n,p)=>n+p.instances.filter(i=>i.active).reduce((m,i)=>m+i.entities.length,0),0),submissions:[...pools.values()].reduce((n,p)=>n+p.used*(p.model?.draws.length||0),0),instances:[...pools.values()].reduce((n,p)=>n+p.instances.length,0),pendingInstances:[...pools.values()].reduce((n,p)=>n+p.instances.filter(i=>i.pending).length,0),construction:constructionBudget?.diagnostics?.()||null,loading:[...pools.values()].filter(p=>!p.model&&!p.error).length+(streaming?.pending()||0),failures:[...pools.values()].filter(p=>p.error).map(p=>String(p.error))})});
}
