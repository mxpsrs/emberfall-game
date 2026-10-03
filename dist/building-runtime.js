'use strict';
(function(){
 const A=globalThis.VeldrenAssembly,cache=new WeakMap();let originalRender,installed=false;
 function registries(){return {rebuilt:typeof rebuiltModels==='undefined'?{}:rebuiltModels,briar:typeof briarModels==='undefined'?{}:briarModels};}
 function catalog(){return Object.entries(registries()).flatMap(([source,models])=>Object.entries(models).filter(([,m])=>m?.bounds).map(([key,m])=>({id:source+':'+key,key,source,name:key.replaceAll('_',' '),category:A.category(key),bounds:A.clone(m.bounds),size:m.bounds[1].map((v,i)=>v-m.bounds[0][i])})));}
 function identify(mesh){for(const [source,models]of Object.entries(registries()))for(const [key,m]of Object.entries(models))if(m===mesh||m.p===mesh.p&&m.i===mesh.i)return source+':'+key;return null;}
 function model(key){if(globalThis.VeldrenAssets?.ready)return globalThis.VeldrenAssets.mesh(key);const [source,...name]=key.split(':');return registries()[source]?.[name.join(':')];}
 function capture(b){
  const full=[],faces=[],oldCut=b._cutaway,oldTransform=b.editorTransform,scene=currentScene;
  // Capture the actual renderer output, including variant materials. Geometry
  // stays in the runtime cache; only registry names and local transforms save.
  const origin=A.transform(b.x,0,b.y),inv=A.inverse(origin);
  let height=0;
  try{b._cutaway=false;b.editorTransform={rotation:0,scale:1};height=originalRender({indexed(mesh,matrix){full.push({mesh,matrix:A.multiply(inv,matrix)});},face(points,color,normals,material,colors,uvs){faces.push({points:points.map(p=>A.point(inv,p)),color,normals,material,colors,uvs});}},b)||b.visualHeight||4;}
  finally{b._cutaway=oldCut;b.editorTransform=oldTransform;currentScene=scene;}
  const modules=full.map((item,i)=>{const key=identify(item.mesh);return {id:'part-'+String(i).padStart(5,'0'),model:key||'captured:'+i,role:A.role(key||''),floor:Math.max(0,Math.floor((item.matrix[7]+.05)/3)),local:item.matrix,bounds:A.clone(item.mesh.bounds||[[0,0,0],[1,1,1]]),baseline:i};});
  if(faces.length){const pts=faces.flatMap(f=>f.points),bounds=[0,1].map(k=>[0,1,2].map(i=>pts.reduce((a,p)=>Math[k?'max':'min'](a,p[i]),k?-Infinity:Infinity)));modules.push({id:'existing-detail',model:'captured:faces',role:'detail',floor:0,local:A.identity(),bounds});}
  const layout=[];
  const collect=(path,node)=>{if(!node||typeof node!=='object')return;if(Number.isFinite(node.x)&&Number.isFinite(node.y))layout.push({path,position:[node.x-b.x,0,node.y-b.y],door:Array.isArray(node.door)?[node.door[0]-b.x,0,node.door[1]-b.y]:null});for(const [key,value]of Object.entries(node)){if(['service','building','_editorBase'].includes(key)||key.startsWith('_'))continue;if(value&&typeof value==='object'&&!(value instanceof Map))collect(path.concat(key),value);}};
  for(const key of ['civilRooms','civilUpperRooms','civilUpper','civilUpperLevels','civilRampart'])collect([key],b[key]);
  const result={version:1,buildingId:b._editorId||b.name,parent:origin,modules,layout};
  cache.set(b,{full,faces,height,origin,original:{x:b.x,y:b.y,w:b.w,h:b.h},linked:new Map(),render:null});return result;
 }
 function ensure(b,scene){install();if(b._generatedBuildingEntity)return globalThis.VeldrenBuildingScene.ensureAssembly(b,scene);if(b.assembly)return b.assembly;const a=capture(b),runtime=cache.get(b);
  for(const o of scene.objects||[]){if(o===b.service||b.service?.destination&&(o.interiorBuilding===b.service.destination||o.civilCourtyard===b.service.destination)){
   const id='object:'+o.id,door=o===b.service;runtime.linked.set(String(o.id),o);
   const normal=door&&typeof doorNormal==='function'?doorNormal(o):[0,1],matrix=door&&typeof buildingDoorTransform==='function'?A.multiply(A.inverse(a.parent),buildingDoorTransform(b)):A.transform(o.x-b.x,0,o.y-b.y,o.heading||0);
   const m={id,model:door?'rebuilt:Door_1_Round':'linked:'+o.id,role:door?'entrance':'interior',floor:o.civilUpper?1:0,local:matrix,bounds:door?A.clone(model('rebuilt:Door_1_Round')?.bounds||[[0,0,0],[1,2,0.1]]):[[-.5,0,-.5],[.5,1,.5]],objectId:String(o.id),destination:o.destination||null};
   if(door){m.opening={service:[o.x-b.x,0,o.y-b.y],normal:[normal[0],0,normal[1]],width:b.civilGateHalfWidth?b.civilGateHalfWidth*2+1:1};const candidates=a.modules.filter(p=>/Wall.*Door/.test(p.model));m.host=candidates.sort((x,y)=>Math.hypot(x.local[3]-matrix[3],x.local[11]-matrix[11])-Math.hypot(y.local[3]-matrix[3],y.local[11]-matrix[11]))[0]?.id;}
   a.modules.push(m);
  }}
  for(const m of a.modules.filter(m=>m.role==='stairs')){const ramp=(a.layout||[]).filter(e=>e.path.at(-1)==='ramp').sort((x,y)=>Math.hypot(x.position[0]-m.local[3],x.position[2]-m.local[11])-Math.hypot(y.position[0]-m.local[3],y.position[2]-m.local[11]))[0];m.stairs={fromFloor:m.floor,toFloor:m.floor+1,origin:[m.local[3],m.local[7],m.local[11]],rampPath:ramp?.path||null};}
  b.assembly=a;b.editorTransform={rotation:0,scale:1};invalidate(b);return a;
 }
 function create(b,assembly,scene){A.validate(assembly);const origin=A.transform(Number(b.x)||0,0,Number(b.y)||0);cache.set(b,{full:[],faces:[],height:0,origin,original:{x:b.x,y:b.y,w:b.w,h:b.h},linked:new Map(),render:null});b.assembly=A.serialize(assembly);b.editorTransform={rotation:0,scale:1};sync(b);invalidate(b);return b.assembly;}
 function attach(b,assembly,scene){assembly=repairLegacyAssembly(b,assembly);A.validate(assembly);if(b._generatedBuildingEntity)return globalThis.VeldrenBuildingScene.setAssembly(b._generatedSceneName,b._sceneEntityId,assembly);if(!cache.has(b)){if(b.editorCreated){const origin=A.transform(Number(b.x)||0,0,Number(b.y)||0);cache.set(b,{full:[],faces:[],height:0,origin,original:{x:b.x,y:b.y,w:b.w,h:b.h},linked:new Map(),render:null});b.assembly??={version:1,buildingId:b._editorId||b.id||b.name||'editor-building',parent:origin,modules:[],layout:[]};}else ensure(b,scene);}const runtime=cache.get(b),before=runtime.navBounds||worldBounds(b);
  // Validate all assets before replacing a usable assembly.
  for(const m of assembly.modules)if(!m.model.startsWith('captured:')&&!m.model.startsWith('linked:')&&!model(m.model))throw Error('Missing local module '+m.model);
  b.assembly=A.serialize(assembly);for(const o of scene.objects||[])runtime.linked.set(String(o.id),o);sync(b);invalidate(b);invalidateAttachedNavigation(b,scene,before);return b.assembly;
 }
 function sync(b){if(b._generatedBuildingEntity)return;const a=b.assembly,runtime=cache.get(b);if(!a||!runtime)return;b.x=a.parent[3];b.y=a.parent[11];
  for(const entry of a.layout||[]){let node=b;for(const key of entry.path)node=node?.[key];if(!node)continue;const p=A.point(a.parent,entry.position);node.x=p[0];node.y=p[2];if(entry.door){const d=A.point(a.parent,entry.door);node.door=[d[0],d[2]];}}
  for(const m of a.modules){if(m.stairs?.rampPath){let ramp=b;for(const key of m.stairs.rampPath)ramp=ramp?.[key];const base=(a.layout||[]).find(e=>JSON.stringify(e.path)===JSON.stringify(m.stairs.rampPath));if(ramp&&base){const v=base.position.map((v,i)=>v+[m.local[3],m.local[7],m.local[11]][i]-m.stairs.origin[i]),q=A.point(a.parent,v);ramp.x=q[0];ramp.y=q[2];}}}
  // The original continuous upper deck owns the movement surface. Additional
  // authored stairs must use that same structure for route and height queries.
  for(const structure of stairStructures(b))structure.editorRamps=[];
  for(const m of a.modules){if(m.role!=='stairs'||!m.stairs||m.stairs.rampPath)continue;const connection=stairConnection(b,m);if(connection)connection.structure.editorRamps.push(connection.line);}
  for(const m of a.modules){if(!m.objectId)continue;const o=runtime.linked.get(m.objectId);if(!o)continue;const p=A.point(a.parent,m.opening?m.opening.service:[m.local[3],m.local[7],m.local[11]]);for(const [key,value]of [['x',p[0]],['y',p[2]],['homeX',p[0]],['homeY',p[2]],['drawX',p[0]],['drawY',p[2]]])if(key==='x'||key==='y'||Number.isFinite(o[key]))o[key]=value;
   o.heading=Math.atan2(a.parent[2],a.parent[0])+Math.atan2(m.local[2],m.local[0]);if(o.placement)o.placement={...o.placement,yaw:o.heading};
   if(m.role==='entrance'){o.building=b;o._assemblyDoor=m;const n=A.point({...a.parent,3:0,7:0,11:0},m.opening.normal);o._assemblyNormal=[n[0],n[2]];b.doorFacing=Math.abs(n[0])>Math.abs(n[2])?(n[0]>0?'east':'west'):(n[2]>0?'south':'north');}
  }
 }
 function stairStructures(b){const options=[...(b.civilUpperLevels||[]),b.civilUpper,b.civilRampart];return [...new Set(options.filter(s=>s&&typeof s==='object'&&typeof civilWalkableStructures!=='undefined'&&civilWalkableStructures.includes(s)))];}
 function stairConnection(b,m){
  if(!b.assembly||m.role!=='stairs'||!m.stairs||m.stairs.rampPath||m.floor!==0||m.stairs.fromFloor!==0||m.stairs.toFloor!==1)return null;
  const mesh=model(m.model),bounds=mesh?.bounds;if(!bounds)return null;
  const [lo,hi]=bounds,centerX=(lo[0]+hi[0])/2,world=A.multiply(b.assembly.parent,m.local);
  // Authored interior stairs rise towards their negative local Z end.
  const low=A.point(world,[centerX,lo[1],hi[2]]),high=A.point(world,[centerX,hi[1],lo[2]]);
  const left=A.point(world,[lo[0],0,0]),right=A.point(world,[hi[0],0,0]);
  const span=Math.hypot(high[0]-low[0],high[2]-low[2]),width=Math.hypot(right[0]-left[0],right[2]-left[2]);
  if(span<2.5||!Number.isFinite(width)||width<.8||width>4)return null;
  const localLow=A.point(A.inverse(b.assembly.parent),low);
  if(localLow[0]<1||localLow[0]>b.w-1||localLow[2]<1||localLow[2]>b.h-1)return null;
  for(const structure of stairStructures(b)){
   const base=structure.base||0,top=base+structure.rise;
   if(Math.abs(low[1]-base)>.35||Math.abs(high[1]-top)>.45||!structure.decks?.some(d=>high[0]>=d.x+.2&&high[0]<d.x+d.w-.2&&high[2]>=d.y+.2&&high[2]<d.y+d.h-.2))continue;
   if(structure.decks.some(d=>low[0]>=d.x&&low[0]<d.x+d.w&&low[2]>=d.y&&low[2]<d.y+d.h))continue;
   return {structure,line:{id:m.id,ax:low[0],az:low[2],bx:high[0],bz:high[2],width}};
  }
  return null;
 }
 function invalidate(b){const r=cache.get(b);if(r)r.render=null;try{staticMeshes3.delete(b);staticMeshQueues3.building.delete(b)}catch{} }
 function localBounds(b){const modules=b.assembly?.modules||[];let minX=0,minZ=0,maxX=Number(b.w)||1,maxZ=Number(b.h)||1,found=false;for(const m of modules){if(!m.bounds)continue;const [lo,hi]=A.bounds(m);if(!found){minX=lo[0];minZ=lo[2];maxX=hi[0];maxZ=hi[2];found=true;}else{minX=Math.min(minX,lo[0]);minZ=Math.min(minZ,lo[2]);maxX=Math.max(maxX,hi[0]);maxZ=Math.max(maxZ,hi[2]);}}return {minX,minZ,maxX,maxZ};}
 function worldBounds(b){if(!b.assembly)return {x:Number(b.x)||0,y:Number(b.y)||0,w:Number(b.w)||1,h:Number(b.h)||1};const points=b.editorCreated?(()=>{const box=localBounds(b);return [[box.minX,0,box.minZ],[box.maxX,0,box.minZ],[box.maxX,0,box.maxZ],[box.minX,0,box.maxZ]].map(p=>A.point(b.assembly.parent,p));})():[[0,0,0],[b.w,0,0],[b.w,0,b.h],[0,0,b.h]].map(p=>A.point(b.assembly.parent,p));const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[2]));return {x,y,w:Math.max(...points.map(p=>p[0]))-x,h:Math.max(...points.map(p=>p[2]))-y};}
 function navAffectedCells(nav,areas){const cells=new Set();for(const area of areas)for(let y=Math.max(0,Math.floor(area.y)-2);y<Math.min(nav.h,Math.ceil(area.y+area.h)+2);y++)for(let x=Math.max(0,Math.floor(area.x)-2);x<Math.min(nav.w,Math.ceil(area.x+area.w)+2);x++)cells.add(y*nav.w+x);return cells;}
 function localStaticBlocks(scene,nav){const cells=new Set();for(const o of scene.objects||[]){if(o._generatedService||fighter(o)||o.collected||o.walkThrough||o.type==='villager'||o.type==='spirit')continue;
   if(!o.propKind)cells.add(o.y*nav.w+o.x);
   else if(typeof propCollisionTiles==='function')for(const [x,y]of propCollisionTiles(o))cells.add(y*nav.w+x);
   if(o.collisionRadius)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.hypot(dx,dy)<o.collisionRadius+.3)cells.add((o.y+dy)*nav.w+o.x+dx);
  }return cells;
 }
 function invalidateAttachedNavigation(b,scene,before){
  const id=Object.keys(worldScenes).find(k=>worldScenes[k]===scene),nav=realmNavigation.get(id);if(!nav)return;
  const r=cache.get(b),next=worldBounds(b),staticBlocks=localStaticBlocks(scene,nav);
  for(const cell of navAffectedCells(nav,[before,next])){const x=cell%nav.w,y=Math.floor(cell/nav.w);
   // Keep object and authored wall collisions, and lazily recalculate terrain
   // and stair height after this scene becomes active on a later route.
   nav.cells[cell]=staticBlocks.has(cell)||(scene.buildings||[]).some(other=>inBuilding(other,x,y))?1:2;
  }
  r.navBounds=next;
 }
 function commit(b){sync(b);invalidate(b);if(b._generatedBuildingEntity){realmNavigation.clear();worldObjectRevision++;return;}try{
   worldObjectRevision++;miniTerrain=null;const nav=realmNavigation.get(currentScene);if(!nav)return;
   const r=cache.get(b),next=worldBounds(b),touched=navAffectedCells(nav,[r.navBounds||r.original,next]),staticBlocks=localStaticBlocks(worldScenes[currentScene],nav);
   // A cached zero can outlive a removed stair. Re-evaluate affected cells
   // from the underlying terrain and the current local collision objects.
   for(const id of touched){const x=id%nav.w,y=Math.floor(id/nav.w);nav.cells[id]=2;const terrain=realmCellBlocked(nav,id);
    const ramp=typeof civilWalkableArchitectureAt==='function'&&civilWalkableArchitectureAt(x+.5,y+.5)?.kind==='ramp';
    nav.cells[id]=Number(!!(terrain||!ramp&&(staticBlocks.has(id)||buildings.some(other=>inBuilding(other,x,y)))));
   }
   r.navBounds=next;
  }catch{} }
 function rendered(b){if(b._generatedBuildingEntity)return globalThis.VeldrenBuildingScene.renderAssembly(b);const r=cache.get(b),a=b.assembly;const instances=[],faces=[];
  for(const m of a.modules){if(m.role==='interior'||m.role==='entrance'&&m.objectId)continue;if(b._cutaway&&(m.role==='roof'||m.floor>0))continue;const filter=window.VeldrenBuildings.floorFilter;if(filter?.building===b&&filter.isolate&&(filter.floor==='roof'?m.role!=='roof':m.floor!==filter.floor&&!(filter.below&&m.floor<filter.floor)))continue;
   if(m.model==='captured:faces'){for(const f of r.faces)faces.push({...f,points:f.points.map(p=>A.point(m.local,p))});continue;}
   const source=r.full[m.baseline];const mesh=source&&identify(source.mesh)===m.model?source.mesh:model(m.model)||source?.mesh;if(mesh)instances.push({mesh,matrix:m.local,ghost:!!(filter?.building===b&&filter.isolate&&filter.below&&m.floor<filter.floor)});
  }
  return {faces,instances,height:r.height,kind:'assembly',model:a.parent};
 }
 function opening(b,m,hostId){const a=b.assembly,host=a.modules.find(p=>p.id===hostId);if(!host||!['wall','window'].includes(host.role))throw Error('Choose a wall module');
  const isWindow=m.role==='window',key=host.model.replace(/_(Straight|Window_Wide_Flat|Door_Round)$/,isWindow?'_Window_Wide_Flat':'_Door_Round');if(!model(key))throw Error('This wall has no compatible opening module');
  const old=a.modules.find(p=>p.id===m.host);if(old&&old!==host){const solid=old.originalModel||old.model.replace(/_(Door_Round|Window_Wide_Flat)$/,'_Straight');if(!model(solid))throw Error('Previous wall cannot be closed');old.model=solid;old.role='wall';delete old.originalModel;}
  host.originalModel=host.originalModel||host.model;host.model=key;host.role=isWindow?'window':'wall';m.host=host.id;
  if(isWindow){m.model=key;m.local=[...host.local];return;}
  // The existing leaf's dimensions remain authored. Align it with the wall.
  const oldCenter=A.bounds(m),hc=A.bounds(host),c=hc[0].map((v,i)=>(v+hc[1][i])/2),mc=oldCenter[0].map((v,i)=>(v+oldCenter[1][i])/2);
  const angle=Math.atan2(host.local[2],host.local[0]),scale=Math.hypot(m.local[0],m.local[8])||1;
  m.local=A.transform(c[0],hc[0][1],c[2],angle,scale);m.local[3]-=.53*scale*Math.cos(angle);m.local[11]+=.53*scale*Math.sin(angle);
  const normal=[Math.sin(angle),0,Math.cos(angle)];m.opening={service:[c[0]-.5+normal[0]*.5,0,c[2]-.5+normal[2]*.5],normal,width:1};sync(b);
 }
 // Repair the pre-module-floor generated shell format while retaining authored
 // walls, furniture, parent placement and stable object links.
 function repairLegacyAssembly(b,input){
  const modules=input?.modules||[],oldRoofs=modules.filter(m=>/^rebuilt:Roof_RoundTiles_/.test(m.model)&&Number.isInteger(m.baseline));
  if(oldRoofs.length<2||modules.some(m=>m.role==='floor'&&m.floor===0))return input;
  const walls=modules.filter(m=>/^rebuilt:Wall_/.test(m.model));if(!walls.length)return input;
  const a=A.clone(input),points=walls.filter(m=>m.floor===0).flatMap(m=>[-1,1].map(x=>A.point(m.local,[x,0,0])));
  if(!points.length)return input;
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minZ=Math.min(...points.map(p=>p[2])),maxZ=Math.max(...points.map(p=>p[2]));
  const w=maxX-minX,d=maxZ-minZ,y=Math.max(...walls.map(m=>m.local[7]+3.02))-.04;
  a.modules=a.modules.filter(m=>!oldRoofs.some(old=>old.id===m.id));
  const add=(mesh,matrix,role,id)=>{const name=Object.keys(rebuiltModels).find(key=>rebuiltModels[key]===mesh||rebuiltModels[key].p===mesh.p);if(!name)throw Error('Missing repaired building asset');a.modules.push({id,model:'rebuilt:'+name,role,floor:role==='floor'?0:Math.floor(y/3.02),local:matrix,bounds:A.clone(mesh.bounds)});};
  let index=0;environmentRoofBays3({indexed(mesh,matrix){add(mesh,matrix,'roof','repair-roof-'+index++);},face(){}},b.race||'human',(minX+maxX)/2,y,(minZ+maxZ)/2,w+.45,d+.45,b.variant||0);
  const floor=model('rebuilt:Floor_UnevenBrick');
  for(let z=minZ;z<maxZ;z+=2)for(let x=minX;x<maxX;x+=2){const fw=Math.min(2,maxX-x),fd=Math.min(2,maxZ-z);add(floor,[fw/2,0,0,x+fw/2,0,1,0,.045,0,0,fd/2,z+fd/2],'floor','repair-floor-'+index++);}
  for(const leaf of a.modules.filter(m=>m.role==='entrance')){
   const host=a.modules.find(m=>m.id===leaf.host);if(!host)continue;
   leaf.local=A.multiply(host.local,A.transform(-.514,0,.04));
   const normal=[host.local[2],0,host.local[10]],length=Math.hypot(normal[0],normal[2]);normal[0]/=length;normal[2]/=length;
   leaf.opening={...leaf.opening,service:[host.local[3]-.5+normal[0]*.5,0,host.local[11]-.5+normal[2]*.5],normal,width:1};
  }
  return a;
 }
 function contains(m,p){const q=A.point(A.inverse(m.local),p),lo=m.bounds[0],hi=m.bounds[1];return q[0]>=lo[0]-.12&&q[0]<=hi[0]+.12&&q[2]>=lo[2]-.12&&q[2]<=hi[2]+.12;}
 function install(){if(installed)return;installed=true;originalRender=building3;
  const oldCached=cachedMesh3;cachedMesh3=function(key,kind,build){if(kind==='building'&&key.assembly&&(key._generatedBuildingEntity||cache.has(key))){return rendered(key)}return oldCached(key,kind,build)};
  const oldIn=inBuilding;inBuilding=function(b,x,y){if(!b.assembly)return oldIn(b,x,y);const a=b.assembly,p=A.point(A.inverse(a.parent),[x+.5,0,y+.5]);
   const entrance=a.modules.find(m=>m.role==='entrance');if(entrance?.opening){const center=entrance.opening.service,n=entrance.opening.normal,dx=p[0]-(center[0]-n[0]+.5),dz=p[2]-(center[2]-n[2]+.5);if(Math.hypot(dx,dz)<.72)return b.service?.openedAt===undefined;}
   return a.modules.some(m=>m.floor===0&&['wall','window'].includes(m.role)&&contains(m,p));};
  const oldWithin=withinWalkIn;withinWalkIn=function(b,x,y){if(!b.assembly)return oldWithin(b,x,y);const p=A.point(A.inverse(b.assembly.parent),[x,0,y]);if(!b.editorCreated)return p[0]>=0&&p[0]<b.w&&p[2]>=0&&p[2]<b.h;const box=localBounds(b);return p[0]>=box.minX&&p[0]<box.maxX&&p[2]>=box.minZ&&p[2]<box.maxZ;};
  const oldNormal=doorNormal;doorNormal=o=>o?._assemblyNormal||oldNormal(o);
  const oldDoor=buildingDoorTransform;buildingDoorTransform=function(b){const m=b.service?._assemblyDoor;if(!m||!b.assembly)return oldDoor(b);return A.multiply(b.assembly.parent,A.multiply(m.local,A.transform(0,0,0,-doorOpenFraction(b.service)*Math.PI*.52)));};
 }
 window.VeldrenBuildings={ensure,create,attach,repairLegacyAssembly,sync,commit,worldBounds,invalidate,catalog,model,install,validate:A.validate,serialize:A.serialize,cache,opening,rendered,stairConnection,floorFilter:null};
})();

