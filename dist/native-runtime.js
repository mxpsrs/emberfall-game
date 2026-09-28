'use strict';
// The browser owns loading and object marshalling. Actor simulation stays in C++.
(()=>{
 const ready=(async()=>{
  const response=await fetch(realmAssetURL('native/veldren-core.wasm'),{credentials:'same-origin'});
  if(!response.ok)throw new Error('Native world core unavailable ('+response.status+')');
  let api;
  const wasiMemory=()=>api?.memory?new DataView(api.memory.buffer):null;
  const imports={env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{
   proc_exit(code){throw new Error('Native world core exited ('+code+')');},
   environ_sizes_get(countPointer,sizePointer){const memory=wasiMemory();if(!memory)return 21;memory.setUint32(countPointer,0,true);memory.setUint32(sizePointer,0,true);return 0;},
   environ_get(){return 0;}
  }};
  const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),imports);api=instance.exports;
  api._initialize();
  if(globalThis.VeldrenAssets)await globalThis.VeldrenAssets.initialize(api);
  if(api.veldren_core_abi_version()!==19)throw new Error('Native world core ABI mismatch');
  const editor=window.VELDREN_CONTEXT==='editor',world=api.veldren_world_create(editor?0:512);let capacity=editor?0:512,scratch=editor?0:api.malloc(capacity*32),dataView=null;
  if(!world||!editor&&!scratch)throw new Error('Native world core could not allocate its state');
  if(!editor){const seed=new Uint32Array(2);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(seed);else{const clock=Date.now();seed[0]=clock>>>0;seed[1]=Math.floor(clock/0x100000000)>>>0;}api.veldren_world_seed(world,seed[0],seed[1]);}
  const handles=new WeakMap(),liveHandles=new Set();let nextHandle=1,destroyed=false,routeCells=0,routeIds=0,routeCapacity=0,animationScratch=0,animationCapacity=0;
  function withCString(value,fn){const bytes=new TextEncoder().encode(String(value)),pointer=api.malloc(bytes.length+1);if(!pointer)throw new Error('Native scene string allocation failed');const target=new Uint8Array(api.memory.buffer,pointer,bytes.length+1);target.set(bytes);target[bytes.length]=0;try{return fn(pointer)}finally{api.free(pointer)}}
  const textSizes=new Map(),textDecoder=new TextDecoder();
  function readNativeText(call,kind='record'){
   // The native copy API returns the required size even when the supplied
   // buffer is too small. Usually one call can both serialize and copy.
   let capacity=textSizes.get(kind)||4096,pointer=api.malloc(capacity);
   if(!pointer)throw new Error('Native scene read allocation failed');
   try{
    let length=call(pointer,capacity);if(!length)return null;
    if(length>=capacity){api.free(pointer);pointer=0;capacity=length+1;pointer=api.malloc(capacity);if(!pointer)throw new Error('Native scene read allocation failed');if(call(pointer,capacity)!==length)throw new Error('Native scene read changed while copying');}
    textSizes.set(kind,Math.max(4096,Math.ceil((length+1)*1.25)));
    return textDecoder.decode(new Uint8Array(api.memory.buffer,pointer,length));
   }finally{if(pointer)api.free(pointer);}
  }
  const sceneListeners=new Set(),entityCache=new Map(),batchedScenes=new Map();let cacheRevision=-1,batchDepth=0;
  function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  function changed(ok,kind,scene=null,id=null){if(ok){if(batchDepth){if(!batchedScenes.has(scene))batchedScenes.set(scene,new Map());batchedScenes.get(scene).set(id,kind);}else for(const listener of sceneListeners)listener({kind,scene,id});}return ok;}
  function finishBatch(){if(--batchDepth!==0)return;const names=[...batchedScenes];batchedScenes.clear();if(names.some(([scene])=>scene===null)){for(const listener of sceneListeners)listener({kind:'load',scene:null,id:null});return;}for(const [scene,entries]of names)for(const listener of sceneListeners)listener({kind:'batch',scene,changes:[...entries].map(([id,kind])=>({id,kind}))});}
  let commandWriter=null,performanceHandle=0;
  const scenes={
   performance(scene,request){
    if(destroyed)throw Error('Native world destroyed');
    if(!performanceHandle){performanceHandle=api.veldren_performance_create(world,globalThis.VeldrenAssets?.nativeHandle||0);if(!performanceHandle)throw Error('World performance owner unavailable');}
    withCString(JSON.stringify({...request,scene}),p=>api.veldren_performance_command(performanceHandle,p));
    const result=JSON.parse(readNativeText((out,size)=>api.veldren_performance_response(performanceHandle,out,size)));
    if(!result.ok)throw Error(result.error);return result.value;
   },
   setCommandWriter(writer){if(!editor)throw Error('Command writer requires editor context');commandWriter=writer;},
   command(scene,request){
    if(!editor)throw Error('Editor commands require the editor context');
    // References are resolved by the accepted native registry, never a second
    // editor catalog. Existing procedural bindings remain readable unchanged.
    const validate=(key,id)=>{const type=key==='asset'?'model':key==='material'?'material':key==='texture'?'texture':null;if(!type||!id)return;if(typeof id!=='string'||!globalThis.VeldrenAssets?.has(id)||VeldrenAssets.record(id).type!==type)throw Error('Unknown or incompatible '+type+' reference: '+id);};
    if(request.operations)request={...request,operations:request.operations.flatMap(op=>{
     const asset=op.op==='asset'?op.value:op.component==='MeshRenderer'?(op.field==='asset'?op.value:op.fields?.asset):op.op==='create'?op.entity?.components?.MeshRenderer?.asset:null;
     if(!asset||!globalThis.VeldrenAssets?.has(asset)||VeldrenAssets.record(asset).importSettings?.importer!=='veldren-gltf-1')return [op];
     if(op.op==='create'&&op.entity?.components?.BuildingPart)return [op];
     if(op.op==='create')return [{...op,entity:{...op.entity,components:{...op.entity.components,MeshRenderer:{...op.entity.components.MeshRenderer,renderPath:'canonical'}}}}];
     return [op,{op:'field',id:op.id,component:'MeshRenderer',field:'renderPath',value:'canonical'}];
    })};
    for(const op of request.operations||[]){
     if(op.op==='asset'||op.op==='material')validate(op.op,op.value);
     if(op.op==='field')validate(op.field,op.value);
     if(op.op==='setComponent'||op.op==='addComponent')for(const [key,id]of Object.entries(op.fields||{}))validate(key,id);
     if(op.op==='create'||op.op==='replace'){
      const previous=op.op==='replace'?scenes.entity(scene,op.entity.id):null;
      for(const [type,fields]of Object.entries(op.entity?.components||{}))for(const [key,id]of Object.entries(fields)){
       if(previous?.components?.[type]?.[key]===id)continue;
       if(type==='MeshRenderer'&&key==='asset'&&typeof id==='string'&&(id.startsWith('captured:')&&op.entity.components.MeshGeometry||id.startsWith('linked:')&&op.entity.components.BuildingPart&&scenes.entity(scene,id.slice(7))))continue;
       validate(key,id);
      }
     }
    }
    withCString(scene,s=>withCString(JSON.stringify(request),r=>api.veldren_editor_command(world,s,r)));
    const result=JSON.parse(readNativeText((out,size)=>api.veldren_editor_response(world,out,size)));
    if(!result.ok){changed(true,'load');throw Error(result.error);}
    const value=result.value;
    if(value.changed){const transforms=request.action!=='undo'&&request.action!=='redo'&&(request.operations||[]).length&&(request.operations||[]).every(op=>['transform','translate','rotate','scale'].includes(op.op));scenes.batch(()=>{for(const id of new Set(value.affected))changed(true,transforms?'transform':scenes.entity(scene,id)?'upsert':'remove',scene,id);});}
    return freeze(value);
   },
   batch(callback){batchDepth++;try{return callback();}finally{finishBatch();}},
   async batchAsync(callback){batchDepth++;try{return await callback();}finally{finishBatch();}},
   subscribe(listener){sceneListeners.add(listener);return ()=>sceneListeners.delete(listener);},
   entity(scene,id){
    const revision=api.veldren_world_scene_revision(world);if(cacheRevision!==revision){entityCache.clear();cacheRevision=revision;}
    let entries=entityCache.get(scene);if(!entries){entries=new Map();entityCache.set(scene,entries);}if(entries.has(id))return entries.get(id);
    const json=withCString(scene,scenePtr=>withCString(id,idPtr=>readNativeText((out,capacity)=>api.veldren_world_scene_entity_read(world,scenePtr,idPtr,out,capacity))));
    const result=json?freeze(JSON.parse(json)):null;entries.set(id,result);return result;
   },
   upsert(scene,entity){if(commandWriter){commandWriter(scene,{op:'replace',entity});return true;}return changed(withCString(scene,scenePtr=>withCString(JSON.stringify(entity),entityPtr=>api.veldren_world_scene_entity_upsert(world,scenePtr,entityPtr)===1)),'upsert',scene,entity.id);},
   materializeUnderstory(scene,group,children){
    // Construction-only streaming into the canonical Scene. Never replace an
    // existing authored entity or turn camera navigation into an editor command.
    if(scene!=='overworld'||!group?.components?.GeneratedChunk||group.parent!=='generated:overworld:root:understory'||!group.id?.startsWith('generated:overworld:understory-chunk:')||!Array.isArray(children)||children.some(node=>node.parent!==group.id||node.components?.GeneratedDecoration?.category!=='understory'||!node.id?.startsWith('generated:overworld:understory:')))throw Error('Invalid understory construction');
    if(scenes.entity(scene,group.id))return false;
    if(editor&&commandWriter&&scenes.command(scene,{action:'status'}).transaction)throw Error('Finish the editor gesture before streaming scenery');
    const inserted=[];
    return scenes.batch(()=>{try{
     for(const node of [group,...children]){
      if(scenes.entity(scene,node.id))continue;
      const ok=withCString(scene,s=>withCString(JSON.stringify(node),n=>api.veldren_world_scene_entity_upsert(world,s,n)===1));
      if(!ok)throw Error('Cannot construct understory entity');
      inserted.push(node.id);changed(true,'upsert',scene,node.id);
     }
     return true;
    }catch(error){for(const id of inserted.reverse())changed(withCString(scene,s=>withCString(id,n=>api.veldren_world_scene_entity_remove(world,s,n)===1)),'remove',scene,id);throw error;}});
   },
   remove(scene,id){if(commandWriter){commandWriter(scene,{op:'delete',id});return true;}return changed(withCString(scene,scenePtr=>withCString(id,idPtr=>api.veldren_world_scene_entity_remove(world,scenePtr,idPtr)===1)),'remove',scene,id);},
   setTransform(scene,id,transform){if(commandWriter){commandWriter(scene,{op:'transform',id,transform});return true;}return changed(withCString(scene,scenePtr=>withCString(id,idPtr=>withCString(JSON.stringify(transform),transformPtr=>api.veldren_world_scene_entity_set_transform(world,scenePtr,idPtr,transformPtr)===1))),'transform',scene,id);},
   setWorldTransform(scene,id,transform){if(commandWriter){commandWriter(scene,{op:'transform',id,transform,space:'world'});return true;}return changed(withCString(scene,scenePtr=>withCString(id,idPtr=>withCString(JSON.stringify(transform),transformPtr=>api.veldren_world_scene_entity_set_world_transform(world,scenePtr,idPtr,transformPtr)===1))),'transform',scene,id);},
   read(scene){const json=withCString(scene,scenePtr=>readNativeText((out,capacity)=>api.veldren_world_scene_read(world,scenePtr,out,capacity),'scene'));return json?JSON.parse(json):null;},
   componentIds(scene,component){const json=withCString(scene,scenePtr=>withCString(component,typePtr=>readNativeText((out,capacity)=>api.veldren_world_scene_component_ids(world,scenePtr,typePtr,out,capacity))));return json?JSON.parse(json):[];},
   footprintsAt(scene,component,x,z){const json=withCString(scene,scenePtr=>withCString(component,typePtr=>readNativeText((out,capacity)=>api.veldren_world_scene_footprints_at(world,scenePtr,typePtr,x,z,out,capacity))));return json?JSON.parse(json):[];},
   quarrySample(scene,x,z,pad=0,id=''){const json=withCString(scene,s=>withCString(id,e=>readNativeText((out,capacity)=>api.veldren_world_scene_quarry_sample(world,s,e,x,z,pad,out,capacity))));return json?JSON.parse(json):null;},
   quarryRampAt(scene,x,z){return withCString(scene,s=>api.veldren_world_scene_quarry_ramp_at(world,s,x,z)===1);},
   terrainPadHeight(scene,x,z,height,footing=false){return withCString(scene,s=>api.veldren_world_scene_terrain_pad_height(world,s,x,z,height,Number(footing)));},
   lights(scene,night=1){const json=withCString(scene,scenePtr=>readNativeText((out,capacity)=>api.veldren_world_scene_lights_read(world,scenePtr,night,out,capacity)));return json?JSON.parse(json):[];},
   serialize(){const json=readNativeText((out,capacity)=>api.veldren_world_document_serialize(world,out,capacity),'document');return json?JSON.parse(json):null;},
   load(document){return changed(withCString(JSON.stringify(document),ptr=>api.veldren_world_document_load(world,ptr)===1),'load');},
   revision(){return api.veldren_world_scene_revision(world);}
  };
  // The editor has the same canonical C++ Scene, with no actor transfer buffer,
  // simulation stepping, gameplay rules, inventory or combat capability.
  if(editor){window.addEventListener('pagehide',destroy,{once:true});return window.realmNative=Object.freeze({kind:'cpp-wasm',context:'editor',abi:19,scenes,destroy});}
  const resourceCache=new Map();scenes.subscribe(()=>resourceCache.clear());
  const resources=Object.freeze({
   read(scene,id){const key=JSON.stringify([scene,id]);if(resourceCache.has(key))return resourceCache.get(key);const json=withCString(scene,s=>withCString(id,e=>readNativeText((out,capacity)=>api.veldren_resource_state_read(world,s,e,out,capacity))));const state=json?freeze(JSON.parse(json)):null;resourceCache.set(key,state);return state;},
   patch(scene,id,patch){const ok=withCString(scene,s=>withCString(id,e=>withCString(JSON.stringify(patch),p=>api.veldren_resource_state_patch(world,s,e,p)===1)));if(ok)resourceCache.delete(JSON.stringify([scene,id]));return ok;},
   tick(now,gameTime){const count=api.veldren_resources_tick(world,now,gameTime);if(count)resourceCache.clear();return count;},
   phase(scene,id,now,gameTime,flags=0){return withCString(scene,s=>withCString(id,e=>api.veldren_resource_phase(world,s,e,now,gameTime,flags)));}
  });
  function actorFlags(actor,selected,now){
   let flags=0;
   if(actor.type==='man'||actor.type==='villager')flags|=1;
   if(actor.kind==='wolf'||actor.kind==='ridgewolf')flags|=2;
   if(actor.kind==='slime')flags|=4;
   if(actor.slowUntil>now)flags|=8;
   if(actor===selected||actor.mainStoryKey||actor.mountainKey||actor.encounter)flags|=16;
   if(actor.kind==='rat')flags|=32;
   if(actor===selected||actor._inCombat)flags|=64;
   if(!actor._creatureMotion)flags|=128;
   return flags;
  }
  function actorHandle(actor){let id=handles.get(actor);if(id)return id;id=nextHandle++;if(nextHandle===0xffffffff)nextHandle=1;handles.set(actor,id);return id;}
  function view(){const buffer=api.memory.buffer;if(!dataView||dataView.buffer!==buffer)dataView=new DataView(buffer);return dataView;}
  function ensureCapacity(count){
   if(count<=capacity)return;let next=capacity;while(next<count)next*=2;
   const replacement=api.malloc(next*32);if(!replacement)throw new Error('Native world core could not grow its actor transfer buffer');
   api.free(scratch);scratch=replacement;capacity=next;dataView=null;
  }
  function writeActor(actor,id,index,selected,now){
   const memory=view(),offset=scratch+index*32;
   memory.setUint32(offset,id,true);
   memory.setFloat32(offset+4,actor.drawX,true);memory.setFloat32(offset+8,actor.drawY,true);
   memory.setFloat32(offset+12,actor.x,true);memory.setFloat32(offset+16,actor.y,true);
   memory.setFloat32(offset+20,0,true);memory.setFloat32(offset+24,actor.kind==='rat'?.52:actor.kind==='wolf'||actor.kind==='ridgewolf'?1.6:1.15,true);memory.setUint32(offset+28,actorFlags(actor,selected,now),true);
  }
  function stepActors(actors,seconds,playerX,playerZ,selected,now){
   if(destroyed)throw new Error('Native world core has stopped');
   ensureCapacity(actors.length);const current=new Set();
   for(let index=0;index<actors.length;index++){const actor=actors[index];
    if(!Number.isFinite(actor.drawX+actor.drawY)){actor.drawX=actor.x;actor.drawY=actor.y;}
    const id=actorHandle(actor);current.add(id);writeActor(actor,id,index,selected,now);
   }
   if(api.veldren_actors_upsert(world,scratch,actors.length)!==actors.length)throw new Error('Native world core rejected actor state');
   for(const actor of actors)if(actor._generatedSpawn&&(!liveHandles.has(actorHandle(actor))||!actor._creatureMotion)){const node=scenes.entity(actor._generatedSceneName,actor._sceneEntityId);if(node)api.veldren_actor_set_heading(world,actorHandle(actor),Math.atan2(node.worldMatrix[8],node.worldMatrix[10]));}
   for(const id of liveHandles)if(!current.has(id))api.veldren_actor_remove(world,id);
   liveHandles.clear();for(const id of current)liveHandles.add(id);
   api.veldren_world_step_live(world,seconds,playerX,playerZ);
   if(api.veldren_render_states_read(world,scratch,actors.length)!==actors.length)throw new Error('Native world core lost actor render state');
   const memory=view();for(let index=0;index<actors.length;index++){const actor=actors[index],offset=scratch+index*32;
    actor.drawX=memory.getFloat32(offset+4,true);actor.drawY=memory.getFloat32(offset+8,true);
    actor._creatureMotion={time:now,x:actor.drawX+.5,z:actor.drawY+.5,heading:memory.getFloat32(offset+12,true),phase:memory.getFloat32(offset+16,true),blend:memory.getFloat32(offset+20,true),speed:memory.getFloat32(offset+24,true),nativeFlags:memory.getUint32(offset+28,true)};
   }
  }
  function ensureRouteCapacity(count){
   if(count<=routeCapacity)return;let next=Math.max(256,routeCapacity);while(next<count)next*=2;
   const cells=api.malloc(next),ids=api.malloc(next*4);if(!cells||!ids){if(cells)api.free(cells);if(ids)api.free(ids);throw new Error('Native pathfinder could not allocate its route buffers');}
   if(routeCells)api.free(routeCells);if(routeIds)api.free(routeIds);routeCells=cells;routeIds=ids;routeCapacity=next;dataView=null;
  }
  function pathfind(cells,width,height,startX,startY,goalX,goalY,adjacent=false,reach=0,maximumVisited=45000,blockedIds=[]){
   if(destroyed)throw new Error('Native world core has stopped');const count=width*height;
   if(!cells||cells.BYTES_PER_ELEMENT!==1||cells.length!==count)return null;ensureRouteCapacity(count);
   new Uint8Array(api.memory.buffer,routeCells,count).set(cells);const grid=new Uint8Array(api.memory.buffer,routeCells,count);
   for(const id of blockedIds)if(id>=0&&id<count)grid[id]=1;
   const length=api.veldren_pathfind(routeCells,width,height,startX,startY,goalX,goalY,reach,adjacent?1:0,maximumVisited,routeIds,count);
   if(length<0)return null;const memory=view(),result=[];for(let index=0;index<length;index++){const id=memory.getUint32(routeIds+index*4,true);result.push([id%width,Math.floor(id/width)]);}return result;
  }
  function ensureAnimationCapacity(count){if(count<=animationCapacity)return;let next=Math.max(64,animationCapacity);while(next<count)next*=2;const replacement=api.malloc(next*48);if(!replacement)throw new Error('Native animation batch could not allocate its transfer buffer');if(animationScratch)api.free(animationScratch);animationScratch=replacement;animationCapacity=next;dataView=null;}
  function animateActors(actors,now){
   const prepare=globalThis.veldrenAnimationInput;if(typeof prepare!=='function'||!actors.length)return;ensureAnimationCapacity(actors.length);const memory=view(),active=[];
   for(const actor of actors){const input=prepare(actor,now);if(!input)continue;const index=active.length,offset=animationScratch+index*48;active.push(actor);memory.setUint32(offset,actorHandle(actor),true);memory.setUint32(offset+4,input.clip||0,true);memory.setUint32(offset+8,input.flags||0,true);memory.setUint32(offset+12,0,true);memory.setFloat32(offset+16,input.idlePhase||0,true);memory.setFloat32(offset+20,input.phase||0,true);memory.setFloat32(offset+24,input.blend??1,true);memory.setFloat32(offset+28,input.hitPhase||0,true);memory.setFloat32(offset+32,input.hitBlend||0,true);memory.setFloat32(offset+36,input.deathPhase||0,true);memory.setFloat32(offset+40,input.deathBlend||0,true);memory.setFloat32(offset+44,0,true);}
   if(!active.length)return;if(api.veldren_animation_states_resolve(world,animationScratch,active.length)!==active.length)throw new Error('Native world core lost actor animation state');
   const clips=['idle','walk','run','death','hit','attack','attack2','attack3','cast','cast2','throw'];for(let index=0;index<active.length;index++){const offset=animationScratch+index*48;active[index]._nativeAnimation={clip:clips[memory.getUint32(offset+4,true)]||'idle',baseClip:clips[memory.getUint32(offset+12,true)]||'idle',phase:memory.getFloat32(offset+20,true),blend:memory.getFloat32(offset+24,true),basePhase:memory.getFloat32(offset+44,true)};}
  }
  function destroy(){if(destroyed)return;destroyed=true;if(performanceHandle)api.veldren_performance_destroy(performanceHandle);globalThis.VeldrenAssets?.destroy();api.free(scratch);if(routeCells)api.free(routeCells);if(routeIds)api.free(routeIds);if(animationScratch)api.free(animationScratch);api.veldren_world_destroy(world);liveHandles.clear();}
  window.addEventListener('pagehide',destroy,{once:true});
  const rules={
   chance:probability=>api.veldren_random_chance(world,probability)===1,
   bounded:exclusiveMaximum=>api.veldren_random_bounded(world,Math.max(0,exclusiveMaximum|0)),
   rollAttack:(accuracy,maximumHit,forceHit=false,minimumOne=false)=>api.veldren_roll_attack(world,accuracy,Math.max(0,maximumHit|0),(forceHit?1:0)|(minimumOne?2:0)),
   skillLevel:(skill,experience)=>api.veldren_skill_level(skill==='Worship'?1:0,Number(experience)||0),
   skillThreshold:(skill,level)=>api.veldren_skill_threshold(skill==='Worship'?1:0,level),
   combatLevel:levels=>api.veldren_combat_level(levels.Hitpoints,levels.Attack,levels.Strength,levels.Defense,levels.Worship,levels.Magic,levels.Ranged),
   attackRollChance:(attack,defense)=>api.veldren_attack_roll_chance(attack,defense),
   playerAccuracy:(level,targetLevel)=>api.veldren_player_accuracy(Math.max(1,level|0),Math.max(1,targetLevel|0)),
   enemyAccuracy:(enemyLevel,defenseLevel)=>api.veldren_enemy_accuracy(Math.max(1,enemyLevel|0),Math.max(1,defenseLevel|0)),
   playerMaxHit:(magic,level,weaponPower,spellPower=0,magicBonus=0)=>api.veldren_player_max_hit(magic?1:0,Math.max(1,level|0),weaponPower|0,spellPower|0,magicBonus|0),
   physicalMaxHit:(effectiveLevel,strengthBonus,minimumHit)=>api.veldren_physical_max_hit(effectiveLevel,strengthBonus,minimumHit),
   magicMaxHit:(power,bonusPercent)=>api.veldren_magic_max_hit(power,bonusPercent),
   combatRewards:(damage,style,focus)=>{const styles={melee:0,ranged:1,magic:2,worship:3},focuses={accurate:0,aggressive:1,defensive:2,balanced:3,focused:4};if(api.veldren_combat_rewards(damage,styles[style],focuses[focus]??4,scratch)!==1)return {};const memory=view(),names=['Hitpoints','Attack','Strength','Defense','Worship','Magic','Ranged'],rewards={};for(let i=0;i<7;i++){const xp=memory.getFloat32(scratch+i*4,true);if(xp)rewards[names[i]]=xp;}return rewards;},
   gatheringChance:(level,requiredLevel,toolRank,miningBonus=0)=>api.veldren_gathering_chance(level,requiredLevel,toolRank,miningBonus),
   firemakingChance:(level,requiredLevel)=>api.veldren_firemaking_chance(level,requiredLevel),
   cookingBurnChance:(level,cookingLevel,burnStopLevel)=>api.veldren_cooking_burn_chance(level,cookingLevel,burnStopLevel),
   ironSmeltChance:level=>api.veldren_iron_smelt_chance(level)
  };
  const transactions={
   inventoryEntrySlots:(count,stackable,worn=0)=>api.veldren_inventory_entry_slots(Math.max(0,count|0),stackable?1:0,Math.max(0,worn|0)),
   transferCount:(requested,available,room)=>api.veldren_transfer_count(requested===Infinity?0xffffffff:Math.max(0,requested|0),Math.max(0,available|0),room===Infinity?0xffffffff:Math.max(0,room|0)),
   spendCoins:(loose,pouch,amount)=>{if(api.veldren_spend_coins(loose,pouch,amount,scratch)!==1)return null;const memory=view();return {loose:memory.getUint32(scratch,true),pouch:memory.getUint32(scratch+4,true)};},
   craftFits:(occupied,freed,resultStackable,resultAlreadyHeld,resultCount,bagCapacity)=>api.veldren_craft_fits(occupied,freed,resultStackable?1:0,resultAlreadyHeld?1:0,resultCount,bagCapacity)===1
  };
  const stateMachines={
   actionEvents:(age,commitAt,duration,committed)=>api.veldren_action_events(age,commitAt,duration,committed?1:0),
   enemyCombatTick:(seconds,distance,movementDistance,dummy,lineOfSight,enemyClock,retaliationClock)=>{const memory=view();memory.setFloat32(scratch,enemyClock,true);memory.setFloat32(scratch+4,retaliationClock,true);const events=api.veldren_enemy_combat_tick(seconds,distance,movementDistance,dummy?1:0,lineOfSight?1:0,scratch);return {events,enemyClock:memory.getFloat32(scratch,true),retaliationClock:memory.getFloat32(scratch+4,true)};},
   requirementsMet:pairs=>{const memory=view(),count=pairs.length,required=scratch+count*4;for(let index=0;index<count;index++){memory.setInt32(scratch+index*4,Math.trunc(pairs[index][0]),true);memory.setInt32(required+index*4,Math.trunc(pairs[index][1]),true);}return api.veldren_requirements_met(scratch,required,count)===1;},
   worldTimerEvents:(now,expiresAt,deadUntil,respawnAt,gameTime)=>api.veldren_world_timer_events(now,expiresAt,deadUntil,respawnAt,gameTime)
  };
  return window.realmNative={kind:'cpp-wasm',abi:19,stepActors,animateActors,pathfind,rules,transactions,stateMachines,scenes,resources,destroy};
 })();
 ready.catch(()=>{});window.realmNativeReady=ready;
})();
