'use strict';
// Persistent decorations belong to the Scene. Placement lists and mesh chunks
// below are disposable indexes; lazily streamed understory is generated once
// per canonical chunk, then saved with the edited scene.
(function(root){
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const copy=value=>JSON.parse(JSON.stringify(value));
 const views=new Map(),byScene=new Map(),streamedViews=new Map(),plantChunks=new Map(),decorLists=new Map();let enabled=false,materializing=false;
 const native=()=>root.realmNative.scenes,registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const hash=value=>root.VeldrenSceneOwnership.stableHash(JSON.stringify(value));
 const idFor=(scene,kind,signature)=>'generated:'+scene+':'+kind+':'+hash(signature);
 function createEntity(scene,source,parent,category,ordinal=0){
  const isPlant=category==='understory',signature=isPlant?[source.name,source.x,source.z,source.scale,source.heading]:[source.kind,source.model||'',source.x,source.z,source.height||null,source.size||null,source.heading||0];
  const id=idFor(scene,category,[...(isPlant?[parent]:[]),signature,ordinal]),angle=(source.heading||0)/2,scale=isPlant?source.scale:1;
  const components={GeneratedDecoration:{category,generationKey:JSON.stringify([signature,ordinal]),version:1},MeshRenderer:{asset:isPlant?'rebuilt:'+source.name:source.kind==='model'?'rebuilt:'+source.model:'procedural:lair/'+source.kind,visible:true},WorldDecoration:{kind:isPlant?'plant':source.kind},DecorationShape:{}};
  if(source.size!==undefined)components.DecorationShape.size=source.size;if(source.height!==undefined)components.DecorationShape.height=source.height;
  if(source.tint)components.Material={tint:copy(source.tint)};
  if(!isPlant){components.Interactable={action:'examine',label:source.model||source.kind};components.Collider={shape:'lair-decoration',solid:true};}
  return {id,name:source.name||source.model||source.kind,parent,active:true,transform:{position:[source.x,0,source.z],rotation:[0,Math.sin(angle),0,Math.cos(angle)],scale:[scale,scale,scale]},components,metadata:{}};
 }
 function getView(scene,id,knownNode=null){
  const key=scene+'|'+id,node=knownNode||native().entity(scene,id);if(!node?.components.GeneratedDecoration)return undefined;if(views.has(key))return views.get(key);
  const view=root.VeldrenSceneOwnership.createView(scene,node,'',{type:'decoration',fields:{kind:['components','WorldDecoration','kind'],tint:['components','Material','tint']},properties:{
   _generatedDecoration:{get:()=>true},
   z:{get:access=>access.pose().y,set:(access,value)=>access.setPose({y:value})},
   size:{get:access=>(access.pathGet(['components','DecorationShape','size'])||1)*access.pose().scale,set:(access,value)=>access.pathSet(['components','DecorationShape','size'],Number(value)/access.pose().scale)},
   height:{get:access=>(access.pathGet(['components','DecorationShape','height'])||1)*access.pose().scale,set:(access,value)=>access.pathSet(['components','DecorationShape','height'],Number(value)/access.pose().scale)},
   model:{get:access=>access.pathGet(['components','MeshRenderer','asset']).replace(/^rebuilt:/,''),set:(access,value)=>access.pathSet(['components','MeshRenderer','asset'],'rebuilt:'+value)},
   scale:{get:access=>access.pose().scale,set:(access,value)=>access.setPose({scale:value})}
  }});views.set(key,view);return view;
 }
 function project(scene){
  const w=registry()[scene];if(!w)return;
  const ids=native().componentIds(scene,'GeneratedDecoration'),all=ids.map(id=>getView(scene,id));
  byScene.set(scene,Object.freeze(all));streamedViews.delete(scene);
  decorLists.set(scene,Object.freeze(all.filter(view=>native().entity(scene,view._sceneEntityId).components.GeneratedDecoration.category==='lair')));
  // Legacy consumers can read the native catalog, but cannot replace its membership.
  if(!Object.getOwnPropertyDescriptor(w,'decor')?.get)Object.defineProperty(w,'decor',{enumerable:true,configurable:false,get:()=>decorLists.get(scene)});
  if(scene==='overworld'){
   plantChunks.clear();
   for(const view of all){const node=native().entity(scene,view._sceneEntityId);if(node.components.GeneratedDecoration.category!=='understory'||!node.activeInHierarchy)continue;
    const key=Math.floor(node.worldMatrix[12]/8)+':'+Math.floor(node.worldMatrix[14]/8);
    if(!plantChunks.has(key))plantChunks.set(key,[]);plantChunks.get(key).push(view);
   }
  }
 }
 function indexUnderstoryBatch(event){
  const scene=event.scene,added=[],dirty=[];
  for(const change of event.changes||[]){if(change.kind!=='upsert')continue;const node=native().entity(scene,change.id);if(!node)continue;
   const chunk=node.components.GeneratedChunk;if(chunk){dirty.push(chunk.x+':'+chunk.z);continue;}
   if(node.components.GeneratedDecoration?.category!=='understory')continue;const view=getView(scene,change.id,node);if(!view)continue;const key=Math.floor(node.worldMatrix[12]/8)+':'+Math.floor(node.worldMatrix[14]/8);if(!plantChunks.has(key))plantChunks.set(key,[]);plantChunks.get(key).push(view);added.push(view);
  }
  if(added.length){let extra=streamedViews.get(scene);if(!extra){extra=[];streamedViews.set(scene,extra);}extra.push(...added);}
  if(typeof worldUnderstory!=='undefined')for(const key of dirty)worldUnderstory.delete(key);
 }
 function changed(event){
  if(event.kind==='load'){for(const scene of Object.keys(registry()))project(scene);}
  else if(native().isUnderstoryBatch?.(event)){indexUnderstoryBatch(event);return;}
  else project(event.scene);
  // Parent transforms, reparenting and component edits also invalidate derived meshes.
  // First materialization has no previous mesh to discard.
  if(!materializing){if(typeof worldUnderstory!=='undefined')worldUnderstory.clear();if(typeof realmNavigation!=='undefined')realmNavigation.clear();}
 }
 async function migrate(){
  const document=native().serialize();let count=0;
  for(const [name,w]of Object.entries(registry())){
   if(!w.decor?.length&&name!=='overworld')continue;
   let scene=document.scenes.find(s=>s.scene===name);if(!scene){scene={format:'veldren.scene',version:2,scene:name,entities:[]};document.scenes.push(scene);}
   const rootId='generated:'+name+':root';let world=scene.entities.find(e=>e.id===rootId);if(!world){world={id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{}};scene.entities.push(world);}
   if(!world.components.WorldGeneration.decorationsComplete){
    const group=rootId+':decorations';scene.entities.push({id:group,name:'World decorations',parent:rootId,active:true,transform:identity(),components:{SceneGroup:{category:'Decorations'}},metadata:{}});
    const repeats=new Map();for(const source of w.decor||[]){const key=JSON.stringify(source),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);scene.entities.push(createEntity(name,source,group,'lair',ordinal));count++;}
    world.components.WorldGeneration.decorationsComplete=true;
   }
   if(name==='overworld'&&!scene.entities.some(e=>e.components.UnderstoryGenerator))scene.entities.push({id:rootId+':understory',name:'Understory',parent:rootId,active:true,transform:identity(),components:{UnderstoryGenerator:{version:1,cellSize:8,algorithm:'worldUnderstoryPlacements-v1',persistence:'materialized-chunks-authoritative'}},metadata:{}});
  }
  if(!native().load(document))throw Error('Scene rejected world decorations');
  hydrate();return {decorations:count};
 }
 function hydrate(){
  for(const name of Object.keys(registry()))project(name);
  if(!enabled)native().subscribe(changed);
  enabled=true;return {loaded:true};
 }
 const understoryChunkId=(bx,bz)=>idFor('overworld','understory-chunk',[bx,bz]),understoryChunkPartId=(bx,bz,part)=>idFor('overworld','understory-chunk',[bx,bz,part]);
 function hasChunkPart(bx,bz,part){const group=native().entity('overworld',understoryChunkPartId(bx,bz,part));return !!group&&group.components.GeneratedChunk?.complete!==false;}
 function hasChunk(bx,bz){if(native().entity('overworld',understoryChunkId(bx,bz)))return true;for(let part=0;part<4;part++)if(!hasChunkPart(bx,bz,part))return false;return true;}
 function prepareChunkPart(bx,bz,part,generated){
  if(!Number.isInteger(part)||part<0||part>3)throw Error('Invalid understory part');
  const scene='overworld',parent='generated:'+scene+':root:understory',id=understoryChunkPartId(bx,bz,part);if(native().entity(scene,id))return false;
  const repeats=new Map(),children=generated.map(source=>{const key=JSON.stringify(source),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);return createEntity(scene,source,id,'understory',ordinal);});
  materializing=true;try{native().materializeUnderstory(scene,{id,name:'Understory '+bx+', '+bz+' part '+part,parent,active:true,transform:identity(),components:{GeneratedChunk:{x:bx,z:bz,part,complete:true}},metadata:{}},children);}finally{materializing=false;}
  return true;
 }
 function chunk(bx,bz){
  const scene='overworld',parent='generated:'+scene+':root:understory',id=understoryChunkId(bx,bz);
  if(!native().entity(scene,parent)?.components.UnderstoryGenerator)return readChunk(bx,bz);
  if(!hasChunk(bx,bz)){const generated=worldUnderstoryPlacements(bx,bz),parts=[[],[],[],[]];for(const plant of generated){const part=(plant.x>=bx*8+4?1:0)|(plant.z>=bz*8+4?2:0);parts[part].push(plant);}for(let part=0;part<parts.length;part++)if(!hasChunkPart(bx,bz,part))prepareChunkPart(bx,bz,part,parts[part]);}
  // Rendering is spatially indexed from native world transforms, not the original
  // generator's child list. Moved and duplicated plants follow their edited position.
  return readChunk(bx,bz);

 }
 function readChunk(bx,bz){return Object.freeze([...(plantChunks.get(bx+':'+bz)||[])]);}
 function prepareChunks(chunks){if(!chunks.length)return;native().batch(()=>{for(const [bx,bz]of chunks)chunk(bx,bz);});}
 function painter(r,m){
  const A=root.VeldrenAssembly,inverse=A.inverse(m),normal=n=>{const v=[inverse[0]*n[0]+inverse[4]*n[1]+inverse[8]*n[2],inverse[1]*n[0]+inverse[5]*n[1]+inverse[9]*n[2],inverse[2]*n[0]+inverse[6]*n[1]+inverse[10]*n[2]],length=Math.hypot(...v)||1;return v.map(x=>x/length);};
  const q={software:r.software,face(points,color,normals,material,colors,uvs){r.face(points.map(p=>A.point(m,p)),color,normals?.map(normal),material,colors,uvs);}};
  if(r.indexed)q.indexed=(mesh,matrix,style)=>r.indexed(mesh,A.multiply(m,matrix),style);return q;
 }
 function render(r,view,lair){
  const node=native().entity(view._generatedSceneName,view._sceneEntityId);if(!node?.activeInHierarchy||root.VeldrenEditorSelection?.hidden(node.id))return;
  const m=root.VeldrenBuildingScene.matrices.row(node.worldMatrix),q=painter(r,m),kind=node.components.WorldDecoration.kind,shape=node.components.DecorationShape;
  if(kind==='plant')rebuiltPlace(q,view.model,0,0,0,1,0,1,node.components.Material?.tint);
  else if(kind==='model')lairModel(q,view.model,0,0,0,shape.height,0,node.components.Material?.tint);
  else drawLairFeature(q,{kind,x:0,z:0,size:shape.size||1},lair);
 }
 function blocked(view,x,z,allowPlinth){
  const node=native().entity(view._generatedSceneName,view._sceneEntityId);if(!node?.activeInHierarchy||!node.components.Collider?.solid)return false;
  const A=root.VeldrenAssembly,p=A.point(A.inverse(root.VeldrenBuildingScene.matrices.row(node.worldMatrix)),[x+.5,node.worldMatrix[13],z+.5]),kind=node.components.WorldDecoration.kind,shape=node.components.DecorationShape,k=shape.size||1;
  if(kind==='model'){const mesh=rebuiltModels[view.model];if(!mesh)return false;const [lo,hi]=mesh.bounds,s=shape.height/(hi[1]-lo[1]);return Math.abs(p[0])<(hi[0]-lo[0])*s/2+.18&&Math.abs(p[2])<(hi[2]-lo[2])*s/2+.18;}
  if(kind==='arch')return [-1,1].some(side=>Math.abs(p[0]-side*2.6*k)<.55*k&&Math.abs(p[2])<.6*k);
  const radius=kind==='plinth'&&!allowPlinth?k:kind==='pillar'?.8*k:kind==='crystal'?.85*k:kind==='egg'?1.35*k:kind==='hearth'?k+.2:kind==='orrery'?1.3*k:kind==='runeBasin'?.8*k:0;
  return radius>0&&Math.hypot(p[0],p[2])<radius;
 }
 root.VeldrenSceneryScene={migrate,hydrate,chunk,hasChunk,hasChunkPart,prepareChunkPart,readChunk,prepareChunks,render,blocked,getView,selectables(scene){const base=byScene.get(scene)||[],extra=streamedViews.get(scene);if(!extra?.length)return base;const all=Object.freeze([...base,...extra]);byScene.set(scene,all);streamedViews.delete(scene);return all;},get enabled(){return enabled;}};
})(globalThis);
