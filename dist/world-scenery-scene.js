'use strict';
// Persistent decorations belong to the Scene. Placement lists and mesh chunks
// below are disposable indexes; lazily streamed understory is generated once
// per canonical chunk, then saved with the edited scene.
(function(root){
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const copy=value=>JSON.parse(JSON.stringify(value));
 const views=new Map(),byScene=new Map();let enabled=false;
 const native=()=>root.realmNative.scenes,registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const hash=value=>root.VeldrenSceneOwnership.stableHash(JSON.stringify(value));
 const idFor=(scene,kind,signature)=>'generated:'+scene+':'+kind+':'+hash(signature);
 function createEntity(scene,source,parent,category,ordinal=0){
  const isPlant=category==='understory',signature=isPlant?[source.name,source.x,source.z,source.scale,source.heading]:[source.kind,source.model||'',source.x,source.z,source.height||null,source.size||null,source.heading||0];
  const id=idFor(scene,category,[signature,ordinal]),angle=(source.heading||0)/2,scale=isPlant?source.scale:1;
  const components={GeneratedDecoration:{category,generationKey:JSON.stringify([signature,ordinal]),version:1},MeshRenderer:{asset:isPlant?'rebuilt:'+source.name:source.kind==='model'?'rebuilt:'+source.model:'procedural:lair/'+source.kind,visible:true},WorldDecoration:{kind:isPlant?'plant':source.kind},DecorationShape:{}};
  if(source.size!==undefined)components.DecorationShape.size=source.size;if(source.height!==undefined)components.DecorationShape.height=source.height;
  if(source.tint)components.Material={tint:copy(source.tint)};
  if(!isPlant){components.Interactable={action:'examine',label:source.model||source.kind};components.Collider={shape:'lair-decoration',solid:true};}
  return {id,name:source.name||source.model||source.kind,parent,active:true,transform:{position:[source.x,0,source.z],rotation:[0,Math.sin(angle),0,Math.cos(angle)],scale:[scale,scale,scale]},components,metadata:{}};
 }
 function getView(scene,id){
  const key=scene+'|'+id,node=native().entity(scene,id);if(!node?.components.GeneratedDecoration)return undefined;if(views.has(key))return views.get(key);
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
  const w=registry()[scene];if(!w)return;const ids=native().componentIds(scene,'GeneratedDecoration'),all=ids.map(id=>getView(scene,id));
  byScene.set(scene,all);w.decor=Object.freeze(all.filter(view=>native().entity(scene,view._sceneEntityId).components.GeneratedDecoration.category==='lair'));
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
  for(const name of Object.keys(registry()))project(name);
  if(!enabled)native().subscribe(event=>{if(event.kind==='load'){for(const scene of byScene.keys())project(scene);if(typeof worldUnderstory!=='undefined')worldUnderstory.clear();}else if(event.kind==='batch'){
   const relevant=(event.changes||[]).filter(change=>native().entity(event.scene,change.id)?.components.GeneratedDecoration);
   if(relevant.length){const current=byScene.get(event.scene)||[],ids=new Set(current.map(view=>view._sceneEntityId));for(const change of relevant)if(!ids.has(change.id))current.push(getView(event.scene,change.id));byScene.set(event.scene,current);}
   if(event.changes?.some(change=>change.kind==='remove'))project(event.scene);
  }else if(event.kind==='remove'||event.kind==='upsert'&&native().entity(event.scene,event.id)?.components.GeneratedDecoration)project(event.scene);if(event.kind==='transform'||event.kind==='remove'||event.kind==='upsert'){if(typeof worldUnderstory!=='undefined')worldUnderstory.clear();if(typeof realmNavigation!=='undefined')realmNavigation.clear();}});
  enabled=true;return {decorations:count};
 }
 function chunk(bx,bz){
  const scene='overworld',parent='generated:'+scene+':root:understory',id=idFor(scene,'understory-chunk',[bx,bz]);
  let group=native().entity(scene,id);
  if(!group){
   const generated=worldUnderstoryPlacements(bx,bz),children=generated.map(source=>createEntity(scene,source,id,'understory'));
   // The generator output is construction-only. Coordinates are moved into
   // native Transform fields, and the temporary records are discarded.
   native().batch(()=>{if(!native().upsert(scene,{id,name:'Understory '+bx+', '+bz,parent,active:true,transform:identity(),components:{GeneratedChunk:{x:bx,z:bz,complete:true,children:children.map(e=>e.id)}},metadata:{}}))throw Error('Cannot create understory chunk');for(const node of children)if(!native().upsert(scene,node))throw Error('Cannot create understory decoration');});group=native().entity(scene,id);
  }
  return group.components.GeneratedChunk.children.filter(id=>native().entity(scene,id)).map(id=>getView(scene,id));
 }
 function painter(r,m){const A=root.VeldrenAssembly,q={software:r.software,face(points,color,normals,material,colors,uvs){const basis=m.slice();basis[3]=basis[7]=basis[11]=0;r.face(points.map(p=>A.point(m,p)),color,normals?.map(n=>A.point(basis,n)),material,colors,uvs);}};if(r.indexed)q.indexed=(mesh,matrix,style)=>r.indexed(mesh,A.multiply(m,matrix),style);return q;}
 function render(r,view,lair){
  const node=native().entity(view._generatedSceneName,view._sceneEntityId);if(!node?.activeInHierarchy)return;
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
 root.VeldrenSceneryScene={migrate,chunk,render,blocked,getView,selectables(scene){return byScene.get(scene)||[];},get enabled(){return enabled;}};
})(globalThis);
