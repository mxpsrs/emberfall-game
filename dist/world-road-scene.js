'use strict';
// Generation records are consumed once. C++ Scene components own the resulting
// road network; terrain shading and ecology retain only disposable indexes.
(function(root){
 const lists=new Map(),views=new Map(),dependencies=new Map();let enabled=false;
 const native=()=>root.realmNative.scenes,registry=()=>typeof worldScenes!=='undefined'?worldScenes:root.worldScenes;
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 function withScene(name,fn){
  if(typeof currentScene==='undefined')return fn();
  const previous=currentScene,oldObjects=typeof objects!=='undefined'?[...objects]:null,oldBuildings=typeof buildings!=='undefined'?[...buildings]:null;
  try{currentScene=name;if(oldObjects){if(root.VeldrenWorldObjects?.enabled)root.VeldrenWorldObjects.activate();else objects.splice(0,objects.length,...registry()[name].objects);}if(oldBuildings)buildings.splice(0,buildings.length,...registry()[name].buildings);if(typeof resetLandSurface==='function')resetLandSurface();if(typeof realmNavigation!=='undefined')realmNavigation.clear();return fn();}
  finally{currentScene=previous;if(oldObjects)(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(oldObjects):objects.splice(0,objects.length,...oldObjects));if(oldBuildings)buildings.splice(0,buildings.length,...oldBuildings);if(typeof resetLandSurface==='function')resetLandSurface();if(typeof realmNavigation!=='undefined')realmNavigation.clear();}
 }
 function source(name){return name==='overworld'?(typeof organicRoads!=='undefined'?organicRoads:root.organicRoads||[]):registry()[name]?.roads||[];}
 function descriptor(name,road,parent,ordinal){
  const a=road.a,b=road.b,width=Number(road.width);
  if(![...a,...b,width].every(Number.isFinite)||width<=0||Math.hypot(b[0]-a[0],b[1]-a[1])<1e-8)throw Error('Invalid generated road in '+name);
  const signature=JSON.stringify([a,b,width,!!road.paved,road.settlement||'',ordinal]),id='generated:'+name+':road:'+root.VeldrenSceneOwnership.stableHash(signature);
  const component={endpoint:[b[0]-a[0],0,b[1]-a[1]],width,paved:!!road.paved};
  for(const key of ['settlement','role','quarry'])if(road[key]!==undefined)component[key]=road[key];
  for(const key of ['na','nb'])if(road[key])component[key]=[road[key][0],0,road[key][1]];
  return {id,name:'Road segment',parent,active:true,transform:{...identity(),position:[a[0],0,a[1]]},components:{GeneratedRoad:{generationKey:signature,version:1},RoadSegment:component,TerrainSurface:{kind:'road'}},metadata:{}};
 }
 function view(name,id){
  const key=name+'|'+id;if(views.has(key))return views.get(key);
  // Road coordinates are derived from the canonical Scene. Reuse their immutable
  // projection until its revision changes instead of allocating on every terrain
  // sample. Checking the revision also observes writes inside a native batch.
  let revision=-1,owner=null,projection=null;
  const point=(m,p)=>Object.freeze([m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]]);
  const read=()=>{
   const current=native(),next=current.revision();if(owner===current&&revision===next)return projection;
   const n=current.entity(name,id),m=n.worldMatrix,road=n.components.RoadSegment,e=road.endpoint,len=Math.hypot(e[0],e[2]),x=-e[2]/len,z=e[0]/len;
   const value={a:point(m,[0,0,0]),b:point(m,e),width:road.width*Math.hypot(m[0]*x+m[8]*z,m[2]*x+m[10]*z),paved:road.paved,settlement:road.settlement,role:road.role};
   for(const key of ['na','nb']){const v=road[key];if(!v)continue;const x=m[0]*v[0]+m[8]*v[2],z=m[2]*v[0]+m[10]*v[2],length=Math.hypot(x,z)||1;value[key]=Object.freeze([x/length,z/length]);}
   owner=current;revision=next;projection=Object.freeze(value);return projection;
  };
  const result={};Object.defineProperties(result,{
   _sceneEntityId:{value:id},a:{enumerable:true,get:()=>read().a},b:{enumerable:true,get:()=>read().b},
   width:{enumerable:true,get:()=>read().width},
   paved:{enumerable:true,get:()=>read().paved},settlement:{enumerable:true,get:()=>read().settlement},role:{enumerable:true,get:()=>read().role}
  });
  for(const key of ['na','nb'])Object.defineProperty(result,key,{enumerable:true,get:()=>read()[key]});
  views.set(key,Object.freeze(result));return result;
 }
 function project(name){
  const w=registry()[name];if(!w)return;
  const ids=native().componentIds(name,'RoadSegment'),deps=new Set(),roads=[];
  for(const id of ids){let n=native().entity(name,id);if(n.activeInHierarchy)roads.push(view(name,id));while(n&&!deps.has(n.id)){deps.add(n.id);n=n.parent&&native().entity(name,n.parent);}}
  dependencies.set(name,deps);lists.set(name,Object.freeze(roads));
  if(!Object.getOwnPropertyDescriptor(w,'roads')?.get)Object.defineProperty(w,'roads',{enumerable:true,configurable:false,get:()=>lists.get(name)});
  if(name==='overworld'){if(typeof organicRoads!=='undefined')organicRoads=lists.get(name);else root.organicRoads=lists.get(name);if(typeof roadBuckets!=='undefined')roadBuckets=null;if(typeof roadCoarseBuckets!=='undefined')roadCoarseBuckets=null;if(typeof roadBucketSource!=='undefined')roadBucketSource=null;if(typeof roadBucketCount!=='undefined')roadBucketCount=-1;}
  // Firstlight uses this derived index directly when shading its streets.
  const buckets=new Map();for(const road of roads){const a=road.a,b=road.b,pad=road.width+3.2;for(let z=Math.floor((Math.min(a[1],b[1])-pad)/8);z<=Math.floor((Math.max(a[1],b[1])+pad)/8);z++)for(let x=Math.floor((Math.min(a[0],b[0])-pad)/8);x<=Math.floor((Math.max(a[0],b[0])+pad)/8);x++){const key=x+':'+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(road);}}
  w.roadBuckets=buckets;
 }
 function invalidate(names){
  for(const name of names)if(typeof ecologyRoadTerrain==='function'&&typeof ecologyPads!=='undefined'&&ecologyPads.has(name))withScene(name,()=>ecologyRoadTerrain(name,ecologyPads.get(name)));
  if(typeof resetLandSurface==='function')resetLandSurface();if(typeof realmNavigation!=='undefined')realmNavigation.clear();
  if(typeof miniTerrain!=='undefined')miniTerrain=null;if(typeof worldAtlasTerrain!=='undefined')worldAtlasTerrain=null;if(typeof mapServicesCache!=='undefined')mapServicesCache=null;
  if(typeof worldUnderstory!=='undefined')worldUnderstory.clear();
 }
 function changed(event){
  if(native().isUnderstoryBatch?.(event))return;
  const names=event.kind==='load'?[...lists.keys()]:[event.scene];
  const affected=names.filter(name=>event.kind==='load'||(event.changes||[{id:event.id}]).some(change=>dependencies.get(name)?.has(change.id)||native().entity(name,change.id)?.components.RoadSegment));
  for(const name of affected)project(name);if(affected.length)invalidate(affected);
 }
 async function migrate(){
  const document=native().serialize();let count=0;
  const names=Object.keys(registry()).filter(name=>name==='overworld'||Object.hasOwn(registry()[name],'roads'));
  for(const name of names){
   let scene=document.scenes.find(s=>s.scene===name);if(!scene){scene={format:'veldren.scene',version:2,scene:name,entities:[]};document.scenes.push(scene);}
   const rootId='generated:'+name+':root',group=rootId+':roads';let world=scene.entities.find(e=>e.id===rootId);
   if(!world){world={id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{}};scene.entities.push(world);}
   if(world.components.WorldGeneration.roadsComplete)continue;
   // Tutorial streets are otherwise generated lazily on the first visit.
   if(name==='tutorial'&&!source(name).length&&typeof buildFirstlightStreets==='function')withScene(name,buildFirstlightStreets);
   scene.entities.push({id:group,name:'Road network',parent:rootId,active:true,transform:identity(),components:{SceneGroup:{category:'Roads'}},metadata:{}});
   const repeats=new Map();for(const road of source(name)){const key=JSON.stringify([road.a,road.b,road.width,!!road.paved,road.settlement||'']),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);scene.entities.push(descriptor(name,road,group,ordinal));count++;}
   world.components.WorldGeneration.roadsComplete=true;
  }
  if(!native().load(document))throw Error('Native Scene rejected road network');
  hydrate(names);return {roads:count,scenes:names.length};
 }
 function hydrate(names=Object.keys(registry()).filter(name=>name==='overworld'||Object.hasOwn(registry()[name],'roads'))){
  for(const name of names)project(name);invalidate(names);
  if(!enabled)native().subscribe(changed);enabled=true;return {loaded:true};
 }
 root.VeldrenRoadScene={migrate,hydrate,segments:name=>lists.get(name)||Object.freeze([]),get enabled(){return enabled;}};
})(globalThis);
