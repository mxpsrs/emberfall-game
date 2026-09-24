'use strict';
(function(){
 const A=globalThis.VeldrenAssembly,cache=new WeakMap();let originalRender,installed=false;
 function registries(){return {rebuilt:typeof rebuiltModels==='undefined'?{}:rebuiltModels,briar:typeof briarModels==='undefined'?{}:briarModels};}
 function catalog(){return Object.entries(registries()).flatMap(([source,models])=>Object.entries(models).filter(([,m])=>m?.bounds).map(([key,m])=>({id:source+':'+key,key,source,name:key.replaceAll('_',' '),category:A.category(key),bounds:A.clone(m.bounds),size:m.bounds[1].map((v,i)=>v-m.bounds[0][i])})));}
 function identify(mesh){for(const [source,models]of Object.entries(registries()))for(const [key,m]of Object.entries(models))if(m===mesh||m.p===mesh.p&&m.i===mesh.i)return source+':'+key;return null;}
 function model(key){const [source,...name]=key.split(':');return registries()[source]?.[name.join(':')];}
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
 function ensure(b,scene){install();if(b.assembly)return b.assembly;const a=capture(b),runtime=cache.get(b);
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
 function attach(b,assembly,scene){A.validate(assembly);ensure(b,scene);const runtime=cache.get(b);
  // Validate all assets before replacing a usable assembly.
  for(const m of assembly.modules)if(!m.model.startsWith('captured:')&&!m.model.startsWith('linked:')&&!model(m.model))throw Error('Missing local module '+m.model);
  b.assembly=A.serialize(assembly);for(const o of scene.objects||[])runtime.linked.set(String(o.id),o);sync(b);invalidate(b);return b.assembly;
 }
 function sync(b){const a=b.assembly,runtime=cache.get(b);if(!a||!runtime)return;b.x=a.parent[3];b.y=a.parent[11];
  for(const entry of a.layout||[]){let node=b;for(const key of entry.path)node=node?.[key];if(!node)continue;const p=A.point(a.parent,entry.position);node.x=p[0];node.y=p[2];if(entry.door){const d=A.point(a.parent,entry.door);node.door=[d[0],d[2]];}}
  for(const m of a.modules){if(m.stairs?.rampPath){let ramp=b;for(const key of m.stairs.rampPath)ramp=ramp?.[key];const base=(a.layout||[]).find(e=>JSON.stringify(e.path)===JSON.stringify(m.stairs.rampPath));if(ramp&&base){const v=base.position.map((v,i)=>v+[m.local[3],m.local[7],m.local[11]][i]-m.stairs.origin[i]),q=A.point(a.parent,v);ramp.x=q[0];ramp.y=q[2];}}}
  for(const m of a.modules){if(!m.objectId)continue;const o=runtime.linked.get(m.objectId);if(!o)continue;const p=A.point(a.parent,m.opening?m.opening.service:[m.local[3],m.local[7],m.local[11]]);for(const [key,value]of [['x',p[0]],['y',p[2]],['homeX',p[0]],['homeY',p[2]],['drawX',p[0]],['drawY',p[2]]])if(key==='x'||key==='y'||Number.isFinite(o[key]))o[key]=value;
   o.heading=Math.atan2(a.parent[2],a.parent[0])+Math.atan2(m.local[2],m.local[0]);if(o.placement)o.placement={...o.placement,yaw:o.heading};
   if(m.role==='entrance'){o.building=b;o._assemblyDoor=m;const n=A.point({...a.parent,3:0,7:0,11:0},m.opening.normal);o._assemblyNormal=[n[0],n[2]];b.doorFacing=Math.abs(n[0])>Math.abs(n[2])?(n[0]>0?'east':'west'):(n[2]>0?'south':'north');}
  }
 }
 function invalidate(b){const r=cache.get(b);if(r)r.render=null;try{staticMeshes3.delete(b);staticMeshQueues3.building.delete(b)}catch{} }
 function worldBounds(b){const pts=[[0,0,0],[b.w,0,0],[b.w,0,b.h],[0,0,b.h]].map(p=>A.point(b.assembly.parent,p));const x=Math.min(...pts.map(p=>p[0])),y=Math.min(...pts.map(p=>p[2]));return {x,y,w:Math.max(...pts.map(p=>p[0]))-x,h:Math.max(...pts.map(p=>p[2]))-y};}
 function commit(b){sync(b);invalidate(b);try{worldObjectRevision++;miniTerrain=null;const nav=realmNavigation.get(currentScene);if(nav){const r=cache.get(b),areas=[r.navBounds||r.original,worldBounds(b)];for(const area of areas)for(let y=Math.max(0,Math.floor(area.y)-2);y<Math.min(nav.h,Math.ceil(area.y+area.h)+2);y++)for(let x=Math.max(0,Math.floor(area.x)-2);x<Math.min(nav.w,Math.ceil(area.x+area.w)+2);x++)nav.cells[y*nav.w+x]=blocked(x,y)?1:0;r.navBounds=worldBounds(b);}}catch{} }
 function rendered(b){const r=cache.get(b),a=b.assembly;const instances=[],faces=[];
  for(const m of a.modules){if(['interior','entrance'].includes(m.role))continue;if(b._cutaway&&(m.role==='roof'||m.floor>0))continue;const filter=window.VeldrenBuildings.floorFilter;if(filter?.building===b&&filter.isolate&&(filter.floor==='roof'?m.role!=='roof':m.floor!==filter.floor&&!(filter.below&&m.floor<filter.floor)))continue;
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
 function contains(m,p){const q=A.point(A.inverse(m.local),p),lo=m.bounds[0],hi=m.bounds[1];return q[0]>=lo[0]-.12&&q[0]<=hi[0]+.12&&q[2]>=lo[2]-.12&&q[2]<=hi[2]+.12;}
 function install(){if(installed)return;installed=true;originalRender=building3;
  const oldCached=cachedMesh3;cachedMesh3=function(key,kind,build){if(kind==='building'&&key.assembly&&cache.has(key)){return rendered(key)}return oldCached(key,kind,build)};
  const oldIn=inBuilding;inBuilding=function(b,x,y){if(!b.assembly)return oldIn(b,x,y);const a=b.assembly,p=A.point(A.inverse(a.parent),[x+.5,0,y+.5]);
   const entrance=a.modules.find(m=>m.role==='entrance');if(entrance?.opening){const center=entrance.opening.service,n=entrance.opening.normal,dx=p[0]-(center[0]-n[0]+.5),dz=p[2]-(center[2]-n[2]+.5);if(Math.hypot(dx,dz)<.72)return b.service?.openedAt===undefined;}
   return a.modules.some(m=>m.floor===0&&['wall','window'].includes(m.role)&&contains(m,p));};
  const oldWithin=withinWalkIn;withinWalkIn=function(b,x,y){if(!b.assembly)return oldWithin(b,x,y);const p=A.point(A.inverse(b.assembly.parent),[x,0,y]);return p[0]>=0&&p[0]<b.w&&p[2]>=0&&p[2]<b.h;};
  const oldNormal=doorNormal;doorNormal=o=>o?._assemblyNormal||oldNormal(o);
  const oldDoor=buildingDoorTransform;buildingDoorTransform=function(b){const m=b.service?._assemblyDoor;if(!m||!b.assembly)return oldDoor(b);return A.multiply(b.assembly.parent,A.multiply(m.local,A.transform(0,0,0,-doorOpenFraction(b.service)*Math.PI*.52)));};
 }
 window.VeldrenBuildings={ensure,attach,sync,commit,worldBounds,invalidate,catalog,model,install,validate:A.validate,serialize:A.serialize,cache,opening,rendered,floorFilter:null};
})();
