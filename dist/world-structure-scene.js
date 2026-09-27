'use strict';
// Standalone architecture is Scene-owned. Maps and lists below are disposable
// query/render projections for the migrated walls, rooms, gates and stair wells.
(function(root){
 const native=()=>root.realmNative.scenes,A=()=>root.VeldrenAssembly,M=()=>root.VeldrenBuildingScene.matrices;
 const registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const I=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const clone=v=>JSON.parse(JSON.stringify(v)),hash=v=>root.VeldrenSceneOwnership.stableHash(JSON.stringify(v));
 const views=new Map(),gateSources=new Map(),holeSources=new Map(),wallMaps=new Map();let enabled=false;
 const entity=(scene,id)=>native().entity(scene,id),ids=(scene,type)=>native().componentIds(scene,type);
 const matrix=(scene,id)=>M().row(entity(scene,id).worldMatrix);
 const transform=m=>({...I(),position:[m[3],m[7],m[11]],affine:M().column(m)});
 const readonly=map=>{for(const key of ['set','delete','clear'])Object.defineProperty(map,key,{value(){throw Error('Edit structure entities through the Scene');}});return map;};
 function capture(){
  if(typeof civilGatehouses!=='undefined')for(const gate of civilGatehouses){if(gate._sceneEntityId)continue;const o=registry().overworld?.objects.find(o=>o.civilGatehouse===gate);if(o)gateSources.set(gate,{id:o._generatedEntityId,x:o.x,y:o.y});}
  if(typeof civilStairWells!=='undefined')for(const [scene,holes]of civilStairWells)for(const hole of holes){if(hole._sceneEntityId)continue;const stair=registry()[scene]?.objects.find(o=>o.civilStair&&o.x===hole.tx&&o.y===hole.ty);if(stair)holeSources.set(hole,{scene,id:stair._generatedEntityId,x:stair.x,y:stair.y});}
 }
 function children(scene,id,type){return ids(scene,type).filter(child=>entity(scene,child).parent===id);}
 function bounds(scene,id){const n=entity(scene,id),f=n.components.Footprint,m=M().row(n.worldMatrix),points=[[f.x||0,f.z||0],[ (f.x||0)+f.w,f.z||0],[f.x||0,(f.z||0)+f.h],[(f.x||0)+f.w,(f.z||0)+f.h]].map(p=>A().point(m,[p[0],0,p[1]]));const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);return {x:Math.min(...xs),y:Math.min(...zs),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...zs)-Math.min(...zs)};}
 function getView(scene,id){
  if(!id||!entity(scene,id))return;const key=scene+'|'+id;if(views.has(key))return views.get(key);const n=entity(scene,id),C=n.components;
  const fields={w:['components','Footprint','w'],h:['components','Footprint','h'],height:['components','Collider','height'],axis:['components','Collider','axis'],usage:['components','Room','usage'],race:['components',C.Gatehouse?'Gatehouse':'StructureFloor','race'],town:['components','Gatehouse','town']};
  const properties={_generatedStructure:{get:()=>true},_structureKind:{get:()=>C.Gatehouse?'gate':C.GateTower?'tower':C.StructureFloor?'floor':C.StructureRoom?'room':C.StructureWall?'wall':'hole'}};
  if(C.Gatehouse){const arch=()=>children(scene,id,'GateArch')[0];properties.x={get:()=>entity(scene,arch())?.worldMatrix[12]};properties.y={get:()=>entity(scene,arch())?.worldMatrix[14]};properties.turn={get:()=>{const m=entity(scene,arch())?.worldMatrix;return m?Math.atan2(m[8],m[0]):0;}};properties.towers={get:()=>Object.freeze(children(scene,id,'GateTower').map(child=>getView(scene,child)))};}
  if(C.GateTower){properties.z={get:a=>a.pose().y};properties.side={get:()=>entity(scene,id).components.GateTower.side};properties.structure={get:()=>root.VeldrenBuildingScene.getView(scene,children(scene,id,'WalkSurface')[0])};for(const [key,field]of [['left','x'],['top','y'],['width','w'],['depth','h']])properties[key]={get:()=>bounds(scene,id)[field]};for(const key of ['low','high'])properties[key]={get:()=>{const surface=root.VeldrenBuildingScene.getView(scene,children(scene,id,'WalkSurface')[0]),line=surface?.rampLine;return line?(key==='low'?[line.ax,line.az]:[line.bx,line.bz]):undefined;}};}
  if(C.StructureFloor){properties.rooms={get:()=>Object.freeze(children(scene,id,'StructureRoom').map(child=>getView(scene,child)))};properties.walls={get:()=>wallMap(scene)};properties.building={get:()=>{const ref=entity(scene,id).components.StructureFloor.exterior;return ref&&root.VeldrenBuildingScene.getView(ref.scene,ref.id);}};}
  if(C.StairWell){for(const key of ['x','y','w','h'])properties[key]={get:()=>bounds(scene,id)[key]};properties.tx={get:()=>entity(scene,id).worldMatrix[12]};properties.ty={get:()=>entity(scene,id).worldMatrix[14]};}
  const view=root.VeldrenSceneOwnership.createView(scene,n,'',{type:'structure',fields,properties});views.set(key,view);return view;
 }
 function wallMap(scene){
  const cached=wallMaps.get(scene),revision=native().revision();if(cached?.revision===revision)return cached.map;
  const map=new Map();for(const id of ids(scene,'StructureWall')){const n=entity(scene,id);if(!n.activeInHierarchy)continue;const f=n.components.Footprint;for(let x=0;x<f.w;x++)for(let z=0;z<f.h;z++){const p=A().point(M().row(n.worldMatrix),[x,0,z]);map.set(p[0]+':'+p[2],Object.freeze({x:p[0],y:p[2],height:n.components.Collider.height,axis:n.components.Collider.axis,_sceneEntityId:id}));}}
  Object.defineProperty(map,'has',{value:key=>{const [x,z]=String(key).split(':').map(Number);return blocked(scene,x+.5,z+.5);}});Object.defineProperty(map,'_sceneName',{value:scene});readonly(map);wallMaps.set(scene,{revision,map});return map;
 }
 function blocked(scene,x,z){return native().footprintsAt(scene,'StructureWall',x,z).some(id=>entity(scene,id).components.Collider?.solid!==false);}
 function holeAt(scene,x,z){return native().footprintsAt(scene,'StairWell',x,z).length>0;}
 function borderAt(scene,x,z){return native().footprintsAt(scene,'StairWellBorder',x,z).length>0;}
 function roomAt(scene,x,z){const id=native().footprintsAt(scene,'StructureRoom',x,z)[0];return id&&getView(scene,id);}
 function refreshSurfaces(){if(typeof civilWalkableStructures!=='undefined')civilWalkableStructures=Object.freeze(ids('overworld','WalkSurface').map(id=>root.VeldrenBuildingScene.getView('overworld',id)));}
 function project(){
  if(typeof civilWalls!=='undefined'){Map.prototype.clear.call(civilWalls);for(const scene of Object.keys(registry()))if(ids(scene,'StructureWall').length)Map.prototype.set.call(civilWalls,scene,wallMap(scene));}
  if(typeof civilFloors!=='undefined'){Map.prototype.clear.call(civilFloors);for(const scene of Object.keys(registry()))for(const id of ids(scene,'StructureFloor'))Map.prototype.set.call(civilFloors,scene,getView(scene,id));}
  if(typeof civilStairWells!=='undefined'){Map.prototype.clear.call(civilStairWells);for(const scene of Object.keys(registry())){const list=ids(scene,'StairWell');if(list.length)Map.prototype.set.call(civilStairWells,scene,Object.freeze(list.map(id=>getView(scene,id))));}}
  if(typeof civilGatehouses!=='undefined')civilGatehouses=Object.freeze(ids('overworld','Gatehouse').map(id=>getView('overworld',id)));refreshSurfaces();
 }
 function invalidate(){wallMaps.clear();if(typeof realmNavigation!=='undefined')realmNavigation.clear();if(typeof resetLandSurface==='function')resetLandSurface();if(typeof miniTerrain!=='undefined')miniTerrain=null;
  for(const w of Object.values(registry()))for(const o of w.objects||[])if(o._sceneEntityId&&entity(o._generatedSceneName,o._sceneEntityId)?.components.Gatehouse){if(typeof staticMeshes3!=='undefined')staticMeshes3.delete(o);if(typeof staticMeshQueues3!=='undefined')staticMeshQueues3.prop.delete(o);}
 }
 async function migrate(){
  capture();const doc=native().serialize(),report={walls:0,rooms:0,floors:0,gates:0,surfaces:0,holes:0};
  for(const [name,w]of Object.entries(registry())){
   const scene=doc.scenes.find(s=>s.scene===name);if(!scene)continue;const world=scene.entities.find(e=>e.id==='generated:'+name+':root');if(!world||world.components.WorldGeneration.structuresComplete)continue;
   const group=world.id+':structures';scene.entities.push({id:group,name:'Standalone structures',parent:world.id,active:true,transform:I(),components:{SceneGroup:{category:'Structures'}},metadata:{}});
   const add=(id,label,parent,m,components,metadata={})=>{const n={id,name:label,parent,active:true,transform:transform(m),components,metadata};scene.entities.push(n);return n;};
   const floor=typeof civilFloors!=='undefined'&&civilFloors.get(name);let floorId;
   if(floor){floorId=group+':floor';const b=floor.building;add(floorId,w.title||'Interior floor',group,A().transform(0,0,0),{StructureFloor:{race:floor.race,exterior:b?._sceneEntityId?{scene:b._generatedSceneName,id:b._sceneEntityId}:null}});report.floors++;
    for(const r of floor.rooms){const id=floorId+':room:'+hash([r.name,r.x,r.y,r.w,r.h]);add(id,r.name,floorId,A().transform(r.x,0,r.y),{StructureRoom:{},Room:{usage:r.usage},Footprint:{w:r.w,h:r.h},MeshRenderer:{asset:'procedural:floor',visible:true}});report.rooms++;}
   }
   const gates=[];
   if(name==='overworld'&&typeof civilGatehouses!=='undefined')for(const gate of civilGatehouses){const source=gateSources.get(gate);if(!source)throw Error('Gatehouse identity was not captured');const prop=scene.entities.find(e=>e.id===source.id);gates.push({gate,source,prop});if(!prop)continue;
    prop.components.Gatehouse={race:gate.race,town:gate.town};(prop.components.StructuralLinks??={}).civilGatehouse=prop.id;delete prop.metadata.civilGatehouse;
    add(prop.id+':arch','Gate arch',prop.id,A().transform(gate.x-source.x,0,gate.y-source.y,gate.turn),{GateArch:{}});
    for(const t of gate.towers){const towerId=prop.id+':tower:'+t.side,worldTower=A().transform(t.x,0,t.z,gate.turn),inverse=A().inverse(worldTower),width=Math.abs(Math.cos(gate.turn))>.5?t.width:t.depth,depth=Math.abs(Math.cos(gate.turn))>.5?t.depth:t.width;
     add(towerId,'Gate tower',prop.id,A().transform(t.x-source.x,0,t.z-source.y,gate.turn),{GateTower:{side:t.side},Footprint:{x:-width/2,z:-depth/2,w:width,h:depth},MeshRenderer:{asset:'procedural:gate-tower',visible:true}});
     const surfaceId=towerId+':surface',surface=add(surfaceId,'Guard walk and stairs',towerId,A().transform(0,0,0),{WalkSurface:{rise:t.structure.rise,kind:'gatehouse',decks:[]},StandaloneSurface:{}});report.surfaces++;
     const line=t.structure.rampLine,points=[];for(const [key,p]of [['low',[line.ax,0,line.az]],['high',[line.bx,0,line.bz]]]){const id=surfaceId+':'+key;add(id,key,surfaceId,A().transform(...A().point(inverse,p)),{RampPoint:{}});points.push(id);}surface.components.WalkSurface.rampLine={start:points[0],end:points[1],width:line.width};
     for(const [i,d]of t.structure.decks.entries()){const id=surfaceId+':deck:'+i,local=A().multiply(inverse,A().transform(d.x,0,d.y));add(id,'Guard deck',surfaceId,local,{Footprint:{w:d.w,h:d.h},WalkDeck:{}});surface.components.WalkSurface.decks.push(id);}
    }report.gates++;
   }
   const walls=typeof civilWalls!=='undefined'&&civilWalls.get(name),groups=new Map();
   for(const tile of walls?.values()||[]){const gate=gates.find(({gate})=>gate.towers.some(t=>tile.x>=t.left&&tile.x<t.left+t.width&&tile.y>=t.top&&tile.y<t.top+t.depth));if(gate&&!gate.prop)continue;const tower=gate?.gate.towers.find(t=>tile.x>=t.left&&tile.x<t.left+t.width&&tile.y>=t.top&&tile.y<t.top+t.depth),parent=tower?gate.prop.id+':tower:'+tower.side:floorId||group,inverse=tower?A().inverse(A().transform(tower.x,0,tower.z,gate.gate.turn)):A().transform(0,0,0);if(!groups.has(parent))groups.set(parent,{inverse,map:new Map()});groups.get(parent).map.set(tile.x+':'+tile.y,tile);}
   for(const [parent,{inverse,map}]of groups)for(const run of civilWallRuns(map)){const id=parent+':wall:'+hash([run.x,run.y,run.axis,run.length]),horizontal=run.axis==='x';add(id,'Wall segment',parent,A().multiply(inverse,A().transform(run.x,0,run.y)),{StructureWall:{},Footprint:{w:horizontal?run.length:1,h:horizontal?1:run.length},Collider:{shape:'tile-wall',solid:true,height:run.height,axis:run.axis},MeshRenderer:{asset:'procedural:wall',visible:true}});report.walls++;}
   const holes=typeof civilStairWells!=='undefined'&&civilStairWells.get(name);for(const hole of holes||[]){const source=holeSources.get(hole),stair=source&&scene.entities.find(e=>e.id===source.id);if(!source)throw Error('Stair opening identity was not captured');if(!stair)continue;
    const id=stair.id+':well';add(id,'Stair opening',stair.id,A().transform(0,0,0),{StairWell:{},Footprint:{x:hole.x-source.x,z:hole.y-source.y,w:hole.w,h:hole.h}});for(const side of [-1,1])add(id+':border:'+side,'Stair opening edge',id,A().transform(0,0,side),{StairWellBorder:{},Footprint:{w:1,h:1}});report.holes++;
   }
   world.components.WorldGeneration.structuresComplete=true;
  }
  if(!native().load(doc))throw Error('Native Scene rejected standalone architecture');
  if(!enabled){for(const map of [typeof civilWalls!=='undefined'&&civilWalls,typeof civilFloors!=='undefined'&&civilFloors,typeof civilStairWells!=='undefined'&&civilStairWells])if(map)readonly(map);native().subscribe(()=>{invalidate();project();});installRendering();}
  enabled=true;invalidate();project();return report;
 }
 function paint(r,scene,id){const m=matrix(scene,id);return root.VeldrenLightScene.painter(r,m,[m[3],m[11]]);}
 function drawWalls(r,scene,cull=false,only=null){
  const limit=cull&&typeof realmWideWorldLimit3==='function'?Math.max(0,realmWideWorldLimit3()-12):Infinity;
  for(const id of only?[only]:ids(scene,'StructureWall')){const n=entity(scene,id);if(!n.activeInHierarchy||n.components.MeshRenderer?.visible===false||root.VeldrenEditorSelection?.hidden(id))continue;const m=M().row(n.worldMatrix),f=n.components.Footprint,c=n.components.Collider;
   if(Math.abs(m[3]-px)>limit+Math.max(f.w,f.h)||Math.abs(m[11]-py)>limit+Math.max(f.w,f.h))continue;
   const axis=c.axis==='y',mesh=c.height>=4.5?realmArtMesh('curtainWall','human'):rebuiltModels.Wall_UnevenBrick_Straight;
   environmentModule3(paint(r,scene,id),mesh,m[3]+f.w/2,0,m[11]+f.h/2,axis?f.h:f.w,c.height,axis?f.w:f.h,axis?Math.PI/2:0);
  }
 }
 function drawRooms(r,scene,only=null){for(const id of only?[only]:ids(scene,'StructureRoom')){const n=entity(scene,id);if(!n.activeInHierarchy||root.VeldrenEditorSelection?.hidden(id))continue;const m=M().row(n.worldMatrix),f=n.components.Footprint,usage=n.components.Room.usage;civilPaintFloor(paint(r,scene,id),m[3]+.5,m[11]+.5,f.w-1,f.h-1,['library','study','bedroom','guest'].includes(usage)?'#a38a68':'#95988b',5);}}
 function draw(r,scene){drawWalls(r,scene,scene==='overworld');drawRooms(r,scene);}
 function renderEntity(r,o){const n=entity(o._generatedSceneName,o._sceneEntityId);if(n?.components.StructureWall)return drawWalls(r,o._generatedSceneName,false,n.id);if(n?.components.StructureRoom)return drawRooms(r,o._generatedSceneName,n.id);}
 function towerContains(tower,x,z){const n=entity(tower._generatedSceneName,tower._sceneEntityId);if(!n?.activeInHierarchy)return false;const f=n.components.Footprint,p=A().point(A().inverse(M().row(n.worldMatrix)),[x,n.worldMatrix[13],z]);return p[0]>f.x+1&&p[0]<f.x+f.w-1&&p[2]>f.z+1&&p[2]<f.z+f.h-1;}
 function installRendering(){
  if(typeof prop3!=='function')return;const before=prop3;prop3=function(r,o,x,z){const n=o._sceneEntityId&&entity(o._generatedSceneName,o._sceneEntityId);if(!n?.components.Gatehouse)return before(r,o,x,z);if(!n.activeInHierarchy)return 0;
   const scene=o._generatedSceneName,arch=children(scene,n.id,'GateArch')[0],a=arch&&matrix(scene,arch);
   const logical={...o,editorTransform:{rotation:0,scale:1},heading:0,civilGatehouse:{x:a?.[3],y:a?.[11],turn:0,towers:[]},roomYaw:0};
   for(const id of children(scene,n.id,'GateTower')){const node=entity(scene,id);if(!node.activeInHierarchy)continue;const t=M().row(node.worldMatrix),surface=children(scene,id,'WalkSurface')[0],tower={x:t[3],z:t[11],side:node.components.GateTower.side,structure:root.VeldrenBuildingScene.getView(scene,surface,id),_sceneEntityId:id,_generatedSceneName:scene};civilGateTower3(groundedPainter(paint(r,scene,id),x,z),{turn:0,race:n.components.Gatehouse.race},tower);}
   return arch&&entity(scene,arch).activeInHierarchy?before(paint(r,scene,arch),logical,a[3],a[11]):0;
  };
 }
 root.VeldrenStructureScene={capture,migrate,getView,blocked,holeAt,borderAt,roomAt,draw,drawWalls,renderEntity,towerContains,refreshSurfaces,selectables:scene=>ids(scene,'StructureWall').concat(ids(scene,'StructureRoom'),ids(scene,'StairWell')).map(id=>getView(scene,id)),get enabled(){return enabled;}};
})(globalThis);
