'use strict';
// Generation is construction input. Quarry profiles and worksite pads become
// canonical native entities; C++ evaluates their transformed terrain surfaces.
(function(root){
 const scene='overworld',native=()=>root.realmNative.scenes,A=()=>root.VeldrenAssembly,M=()=>root.VeldrenBuildingScene.matrices;
 const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 const sources=[],pads=[],roadOwners=new Map(),views=new Map();let captured=false,enabled=false,quarries=Object.freeze([]),workPads=Object.freeze([]);
 function capture(){if(captured)return;captured=true;
  for(const q of typeof surfaceQuarries==='undefined'?[]:surfaceQuarries)sources.push(JSON.parse(JSON.stringify(q)));
  for(const p of typeof propWorkPads==='undefined'?[]:propWorkPads)pads.push(JSON.parse(JSON.stringify(p)));
  const repeats=new Map();for(const road of typeof organicRoads==='undefined'?[]:organicRoads){const signature=[road.a,road.b,road.width,!!road.paved,road.settlement||''],key=JSON.stringify(signature),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);if(road.quarry)roadOwners.set('generated:overworld:road:'+root.VeldrenSceneOwnership.stableHash(JSON.stringify([...signature,ordinal])),road.quarry);}
 }
 function getView(id){if(views.has(id))return views.get(id);const n=native().entity(scene,id);if(!n)return;
  const quarry=!!n.components.Quarry,type=quarry?'Quarry':'TerrainPad',fields=Object.fromEntries((quarry?['rx','ry','level','levels','town','ores']:['rx','ry','supportOnly','reason','objectId']).map(k=>[k,['components',type,k]]));
  const properties={_generatedTerrain:{get:()=>true},_generatedQuarry:{get:()=>quarry}};
  if(quarry){properties.id={get:a=>a.current().components.Quarry.key};properties.type={get:a=>a.current().components.Quarry.kind};}
  else properties.height={get:a=>{const c=a.current();return A().point(M().row(c.worldMatrix),[0,c.components.TerrainPad.height,0])[1];},set:(a,v)=>{const n=a.current(),m=n.worldMatrix;if(Math.abs(m[5])<1e-12)throw Error('Terrain pad has no vertical axis');a.pathSet(['components','TerrainPad','height'],(Number(v)-m[13])/m[5]);}};
  const v=root.VeldrenSceneOwnership.createView(scene,n,'',{type:quarry?'quarry':'terrainPad',fields,properties});views.set(id,v);return v;
 }
 function project(){
  quarries=Object.freeze(native().componentIds(scene,'Quarry').map(getView));workPads=Object.freeze(native().componentIds(scene,'TerrainPad').map(getView));
  if(typeof surfaceQuarries!=='undefined')surfaceQuarries=Object.freeze(quarries.filter(q=>native().entity(scene,q._sceneEntityId).activeInHierarchy));
  if(typeof propWorkPads!=='undefined')propWorkPads=Object.freeze(workPads.filter(p=>native().entity(scene,p._sceneEntityId).activeInHierarchy));
  if(typeof propSupportPads!=='undefined')propSupportPads=Object.freeze(propWorkPads.filter(p=>p.supportOnly));
  // The old bucket index belongs only to the construction phase.
  if(typeof propPadBuckets!=='undefined')propPadBuckets.clear();
 }
 function sample(x,z,pad=0,q=null){return native().quarrySample(scene,x,z,pad,q?._sceneEntityId||'');}
 function at(x,z,pad=0){const result=sample(x,z,pad);return result?getView(result.id):undefined;}
 function point(q,x,z){return A().point(M().row(native().entity(scene,q._sceneEntityId).worldMatrix),[x,0,z]);}
 function outline(q,inset=0){return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>point(q,x*(q.rx-inset),z*(q.ry-inset))).map(p=>[p[0],p[2]]);}
 function invalidate(){
  if(typeof resetLandSurface==='function')resetLandSurface();if(typeof realmNavigation!=='undefined')realmNavigation.clear();
  root.VeldrenTerrainEdits?.invalidate(null,scene);
  if(typeof miniTerrain!=='undefined')miniTerrain=null;if(typeof worldAtlasTerrain!=='undefined')worldAtlasTerrain=null;if(typeof mapServicesCache!=='undefined')mapServicesCache=null;
 }
 async function migrate(){
  capture();const doc=native().serialize();let s=doc.scenes.find(s=>s.scene===scene),count=0,padCount=0,attached=0;
  if(!s){s={format:'veldren.scene',version:2,scene,entities:[]};doc.scenes.push(s);}
  const rootId='generated:overworld:root';let world=s.entities.find(e=>e.id===rootId);
  if(!world){world={id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{}};s.entities.push(world);}
  if(!world.components.WorldGeneration.quarriesComplete){
   const group=rootId+':quarries',padGroup=rootId+':terrain-pads',I=A().transform(0,0,0),worlds=new Map(s.entities.map(e=>[e.id,M().row(native().entity(scene,e.id)?.worldMatrix||M().column(I))])),byId=new Map(s.entities.map(e=>[e.id,e]));
   const rootMatrix=worlds.get(rootId)||I;worlds.set(group,rootMatrix);worlds.set(padGroup,rootMatrix);
   for(const [id,name]of [[group,'Quarries'],[padGroup,'Worksite terrain pads']])s.entities.push({id,name,parent:rootId,active:true,transform:identity(),components:{SceneGroup:{category:name}},metadata:{}});
   const local=(parent,world)=>({...identity(),affine:M().column(A().multiply(A().inverse(worlds.get(parent)||I),world))});
   const ids=new Map();for(const [order,q]of sources.entries()){
    const id='generated:overworld:quarry:'+q.id,wm=A().transform(q.x,0,q.y);ids.set(q.id,id);worlds.set(id,wm);
    s.entities.push({id,name:q.name,parent:group,active:true,transform:local(group,wm),components:{GeneratedQuarry:{version:1},Quarry:{key:q.id,kind:q.type,rx:q.rx,ry:q.ry,level:q.level,levels:q.levels,town:q.town,ores:q.ores,order},TerrainSurface:{kind:'quarry'},Collider:{shape:'quarry-cliffs',solid:true}},metadata:{}});count++;
   }
   const owners=new Map(),catalog=new Map();for(const n of s.entities){
    const c=n.components,key=c.ResourcePlacement?.quarry||c.ActorPlacement?.quarry||c.SettlementMember?.quarry||c.RoadSegment?.quarry||n.metadata.quarry||roadOwners.get(n.id);
    if(ids.has(key))owners.set(n.id,ids.get(key));
    const alias=c.CatalogIdentity?.id??c.GeneratedProp?.legacyCatalogId;if(alias!==undefined)catalog.set(String(alias),n.id);
   }
   for(const [id,parent]of owners){const n=byId.get(id);let ancestor=n.parent,covered=false;while(ancestor){if(owners.get(ancestor)===parent){covered=true;break;}ancestor=byId.get(ancestor)?.parent;}
    if(covered)continue;n.parent=parent;n.transform=local(parent,worlds.get(id));attached++;
   }
   const repeats=new Map();for(const [order,p]of pads.entries()){
    const signature=JSON.stringify([p.x,p.y,p.rx,p.ry,p.reason,p.objectId??null]),ordinal=repeats.get(signature)||0;repeats.set(signature,ordinal+1);
    const id='generated:overworld:terrain-pad:'+root.VeldrenSceneOwnership.stableHash(JSON.stringify([signature,ordinal])),parent=catalog.get(String(p.objectId))||ids.get(p.quarry)||padGroup,wm=A().transform(p.x,0,p.y);
    s.entities.push({id,name:p.reason,parent,active:true,transform:local(parent,wm),components:{GeneratedTerrainPad:{version:1},TerrainPad:{rx:p.rx,ry:p.ry,height:p.height,supportOnly:!!p.supportOnly,reason:p.reason,objectId:p.objectId??null,order},TerrainSurface:{kind:'work-pad'}},metadata:{}});padCount++;
   }
   world.components.WorldGeneration.quarriesComplete=true;
  }
  if(!native().load(doc))throw Error('Native Scene rejected quarry terrain');
  if(!enabled){
   quarryAt=at;quarryShapeEdge=(q,x,z)=>sample(x,z,0,q)?.edge??0;quarryDepth=(q,x,z)=>sample(x,z,0,q)?.depth??0;quarryCliff=(q,x,z)=>sample(x+.5,z+.5,0,q)?.cliff??false;
   native().subscribe(event=>{if(event.scene!==null&&event.scene!==scene)return;project();invalidate();});
  }
  enabled=true;project();invalidate();return {quarries:count,pads:padCount,attached};
 }
 root.VeldrenQuarryScene={capture,migrate,getView,at,sample,point,outline,rampAt:(x,z)=>native().quarryRampAt(scene,x,z),padHeight:(x,z,height,footing=false)=>native().terrainPadHeight(scene,x,z,height,footing),selectables:name=>name===scene?Object.freeze([...quarries,...workPads]):Object.freeze([]),get enabled(){return enabled;}};
})(globalThis);
