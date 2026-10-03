'use strict';
// Format adapter at the edge of the procedural world. Scene hierarchy and
// transforms are owned by the C++ scene core; this preserves legacy editor
// edits while old world generation and rendering are migrated in stages.
(function(root){
 const FORMAT='veldren.world',SCENE='veldren.scene';
 const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
 const text=value=>String(value??'');
 const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 function multiply(a,b){const m=new Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)m[col*4+row]+=a[k*4+row]*b[col*4+k];return m;}
 function matrix(t={}){
  if(t.affine)return t.affine;
  const [x,y,z,w]=t.rotation||[0,0,0,1],[sx,sy,sz]=t.scale||[1,1,1],[px,py,pz]=t.position||[0,0,0];
  return [(1-2*(y*y+z*z))*sx,2*(x*y+z*w)*sx,2*(x*z-y*w)*sx,0,
   2*(x*y-z*w)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+x*w)*sy,0,
   2*(x*z+y*w)*sz,2*(y*z-x*w)*sz,(1-2*(x*x+y*y))*sz,0,px,py,pz,1];
 }
 function inverse(m){
  const c00=m[5]*m[10]-m[9]*m[6],c01=m[8]*m[6]-m[4]*m[10],c02=m[4]*m[9]-m[8]*m[5];
  const det=m[0]*c00+m[1]*c01+m[2]*c02;
  if(!Number.isFinite(det)||Math.abs(det)<1e-12)throw Error('Singular scene transform');
  const d=1/det,r=[c00*d,(m[9]*m[2]-m[1]*m[10])*d,(m[1]*m[6]-m[5]*m[2])*d,0,
   c01*d,(m[0]*m[10]-m[8]*m[2])*d,(m[4]*m[2]-m[0]*m[6])*d,0,
   c02*d,(m[8]*m[1]-m[0]*m[9])*d,(m[0]*m[5]-m[4]*m[1])*d,0,0,0,0,1];
  r[12]=-(r[0]*m[12]+r[4]*m[13]+r[8]*m[14]);r[13]=-(r[1]*m[12]+r[5]*m[13]+r[9]*m[14]);r[14]=-(r[2]*m[12]+r[6]*m[13]+r[10]*m[14]);return r;
 }
 function worldMatrices(scene){
  const entities=new Map(scene.entities.map(entity=>[entity.id,entity])),world=new Map();
  for(const entity of scene.entities){
   if(world.has(entity.id))continue;
   const chain=[];let current=entity;
   while(current&&!world.has(current.id)){chain.push(current);current=current.parent?entities.get(current.parent):null;}
   while(chain.length){const node=chain.pop();world.set(node.id,multiply(node.parent?world.get(node.parent):identity(),matrix(node.transform)));}
  }
  return world;
 }
 const sceneCache=new WeakMap();
 function sceneIndex(scene){
  let cached=sceneCache.get(scene);
  if(cached&&cached.entities===scene.entities)return cached;
  const byId=new Map(),children=new Map();
  for(const entity of scene.entities){byId.set(entity.id,entity);if(entity.parent){if(!children.has(entity.parent))children.set(entity.parent,[]);children.get(entity.parent).push(entity.id)}}
  cached={entities:scene.entities,byId,children,world:new Map()};sceneCache.set(scene,cached);return cached;
 }
 function entityWorldMatrix(scene,id){
  const cache=sceneIndex(scene);let current=cache.byId.get(String(id));if(!current)throw Error('Scene entity not found: '+id);
  const chain=[];while(current&&!cache.world.has(current.id)){chain.push(current);current=current.parent?cache.byId.get(current.parent):null;}
  while(chain.length){const entity=chain.pop(),parent=entity.parent?cache.world.get(entity.parent):identity();if(entity.parent&&!parent)throw Error('Missing scene parent: '+entity.parent);cache.world.set(entity.id,multiply(parent,matrix(entity.transform)))}
  return cache.world.get(String(id)).slice();
 }
 function invalidateScene(scene,id){
  const cache=sceneCache.get(scene);if(!cache){sceneCache.delete(scene);return;}
  if(id==null){sceneCache.delete(scene);return;}
  const pending=[String(id)];while(pending.length){const current=pending.pop();cache.world.delete(current);for(const child of cache.children.get(current)||[])pending.push(child)}
 }
 function findEntity(world,sceneName,id){
  const scene=world?.scenes?.find(item=>item.scene===String(sceneName));if(!scene)return null;
  const entity=sceneIndex(scene).byId.get(String(id));return entity?{scene,entity}:null;
 }
 function decompose(m){
  const scale=[Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10])];
  if(scale.some(value=>!Number.isFinite(value)||value<1e-12))throw Error('Singular scene transform');
  const a=m[0]/scale[0],d=m[1]/scale[0],g=m[2]/scale[0],b=m[4]/scale[1],e=m[5]/scale[1],h=m[6]/scale[1],c=m[8]/scale[2],f=m[9]/scale[2],i=m[10]/scale[2],trace=a+e+i;
  let rotation;
  if(trace>0){const s=2*Math.sqrt(trace+1);rotation=[(h-f)/s,(c-g)/s,(d-b)/s,s/4]}
  else if(a>e&&a>i){const s=2*Math.sqrt(1+a-e-i);rotation=[s/4,(b+d)/s,(c+g)/s,(h-f)/s]}
  else if(e>i){const s=2*Math.sqrt(1+e-a-i);rotation=[(b+d)/s,s/4,(f+h)/s,(c-g)/s]}
  else{const s=2*Math.sqrt(1+i-a-e);rotation=[(c+g)/s,(f+h)/s,s/4,(d-b)/s]}
  const length=Math.hypot(...rotation);rotation=rotation.map(value=>value/length);
  return {position:[m[12],m[13],m[14]],rotation,scale};
 }
 function readWorldTransform(world,sceneName,id){
  const found=findEntity(world,sceneName,id);if(!found)throw Error('Scene entity not found: '+id);
  const m=entityWorldMatrix(found.scene,id),scale=Math.hypot(m[0],m[1],m[2]);
  return {x:m[12],y:m[14],height:m[13],rotation:Math.atan2(m[8],m[0])*180/Math.PI,scale,matrix:m};
 }
 function setWorldTransform(world,sceneName,id,input={}){
  const found=findEntity(world,sceneName,id);if(!found)throw Error('Scene entity not found: '+id);
  const {scene,entity}=found,current=entityWorldMatrix(scene,id),target=current.slice();
  const nextX=input.x==null?current[12]:Number(input.x),nextZ=input.y==null?current[14]:Number(input.y);
  if(!Number.isFinite(nextX)||!Number.isFinite(nextZ))throw Error('Invalid scene position');
  target[12]=nextX;target[14]=nextZ;
  const currentScale=Math.hypot(current[0],current[1],current[2]);
  if(input.scale!=null){const nextScale=Number(input.scale);if(!Number.isFinite(nextScale)||nextScale<=0)throw Error('Invalid scene scale');const factor=nextScale/currentScale;for(let col=0;col<3;col++)for(let row=0;row<3;row++)target[col*4+row]*=factor;}
  if(input.rotation!=null){const angle=Number(input.rotation)*Math.PI/180;if(!Number.isFinite(angle))throw Error('Invalid scene rotation');const delta=angle-Math.atan2(current[8],current[0]),c=Math.cos(delta),s=Math.sin(delta);for(let col=0;col<3;col++){const x=current[col*4],y=current[col*4+1],z=current[col*4+2],factor=input.scale==null?1:Number(input.scale)/currentScale;target[col*4]= (c*x+s*z)*factor;target[col*4+1]=y*factor;target[col*4+2]=(-s*x+c*z)*factor;}}
  sceneIndex(scene);const parent=entity.parent?entityWorldMatrix(scene,entity.parent):identity(),local=multiply(inverse(parent),target),parts=decompose(local);
  entity.transform={...(entity.transform||{}),...parts,affine:local};
  invalidateScene(scene,id);
  return readWorldTransform(world,sceneName,id);
 }
 function setLocalTransform(world,sceneName,id,transform){
  const found=findEntity(world,sceneName,id);if(!found)throw Error('Scene entity not found: '+id);
  const next=JSON.parse(JSON.stringify(transform));
  if(!plain(next)||!Array.isArray(next.position)||next.position.length!==3||!Array.isArray(next.rotation)||next.rotation.length!==4||!Array.isArray(next.scale)||next.scale.length!==3||![...next.position,...next.rotation,...next.scale].every(Number.isFinite))throw Error('Invalid local scene transform');
  if(next.scale.some(value=>Math.abs(value)<1e-12)||Math.hypot(...next.rotation)<1e-12)throw Error('Invalid local scene transform');
  if(next.affine&&(!Array.isArray(next.affine)||next.affine.length!==16||!next.affine.every(Number.isFinite)||next.affine[3]!==0||next.affine[7]!==0||next.affine[11]!==0||next.affine[15]!==1))throw Error('Invalid affine transform');
  inverse(matrix(next));found.entity.transform=next;invalidateScene(found.scene,id);return readWorldTransform(world,sceneName,id);
 }
 function duplicateSubtree(world,sceneName,id,idFactory){
  const found=findEntity(world,sceneName,id);if(!found)throw Error('Scene entity not found: '+id);
  if(typeof idFactory!=='function')throw Error('A stable ID factory is required');
  const {scene}=found,cache=sceneIndex(scene),ordered=[],pending=[String(id)];
  while(pending.length){const current=pending.shift(),entity=cache.byId.get(current);if(!entity)continue;ordered.push(entity);pending.unshift(...(cache.children.get(current)||[]));}
  const allIds=new Set(world.scenes.flatMap(item=>item.entities.map(entity=>entity.id))),generated=new Set(),remap=new Map();
  for(let i=0;i<ordered.length;i++){const next=String(idFactory(ordered[i],i));if(!next||allIds.has(next)||generated.has(next))throw Error('Duplicate generated scene entity ID');generated.add(next);remap.set(ordered[i].id,next)}
  const referenceFields={BuildingPart:['building'],BuildingAccess:['entrance'],Entrance:['building'],Room:['entrance'],Blueprint:['entrance'],BuildingLayout:['rooms','upperRooms','walls','upper','upperLevels','rampart','blueprint'],WalkSurface:['ramp','decks','rampLine'],SpatialLinks:null,StructuralLinks:null,ModularBuilding:['modules'],DoorOpening:['portal'],ObjectLink:['entity']};
  const rewrite=value=>typeof value==='string'?(remap.get(value)||value):Array.isArray(value)?value.map(rewrite):plain(value)?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,rewrite(item)])):value;
  const copies=ordered.map(entity=>{const copy=JSON.parse(JSON.stringify(entity));copy.id=remap.get(entity.id);if(entity.parent&&remap.has(entity.parent))copy.parent=remap.get(entity.parent);
   for(const [type,fields]of Object.entries(referenceFields)){const component=copy.components?.[type];if(!component)continue;if(fields===null)copy.components[type]=rewrite(component);else for(const key of fields)if(Object.hasOwn(component,key))component[key]=rewrite(component[key]);}
   for(const type of ['GeneratedProp','GeneratedBuilding','GeneratedDecoration'])if(copy.components?.[type])copy.components[type].generationKey='editor-copy:'+sceneName+':'+copy.id;
   return copy});
  scene.entities.push(...copies);invalidateScene(scene);
  const root=remap.get(String(id)),base=readWorldTransform(world,sceneName,root);
  setWorldTransform(world,sceneName,root,{x:base.x+1,y:base.y});
  return {id:root,ids:[...remap.values()]};
 }
 function deleteSubtree(world,sceneName,id){
  const found=findEntity(world,sceneName,id);if(!found)return [];
  const {scene}=found,cache=sceneIndex(scene),removed=new Set(),pending=[String(id)];
  while(pending.length){const current=pending.pop();if(removed.has(current))continue;removed.add(current);for(const child of cache.children.get(current)||[])pending.push(child)}
  scene.entities=scene.entities.filter(entity=>!removed.has(entity.id));invalidateScene(scene);return [...removed];
 }
 function validateWorld(world){
  if(!plain(world)||world.format!==FORMAT||world.version!==2||!Array.isArray(world.scenes))throw Error('Unsupported world scene document');
  const ids=new Set(),names=new Set();let count=0;
  for(const scene of world.scenes){
   if(!plain(scene)||scene.format!==SCENE||scene.version!==2||!text(scene.scene)||!Array.isArray(scene.entities)||names.has(scene.scene))throw Error('Invalid or duplicate world scene');
   names.add(scene.scene);const local=new Map();
   for(const entity of scene.entities){
    if(!plain(entity)||!text(entity.id)||ids.has(entity.id)||++count>30000||typeof entity.name!=='string'||!plain(entity.transform)||!plain(entity.components||{})||!plain(entity.metadata||{}))throw Error('Invalid or duplicate world entity ID');
    ids.add(entity.id);local.set(entity.id,entity);
    if(entity.active!=null&&typeof entity.active!=='boolean')throw Error('Invalid scene active state');
    const t=entity.transform,p=t.position||[0,0,0],q=t.rotation||[0,0,0,1],s=t.scale||[1,1,1];
    if(!Array.isArray(p)||p.length!==3||!Array.isArray(q)||q.length!==4||!Array.isArray(s)||s.length!==3||![...p,...q,...s].every(v=>typeof v==='number'&&Number.isFinite(v))||Math.hypot(...q)<1e-12||s.some(v=>Math.abs(v)<1e-12))throw Error('Invalid scene transform');
    if(t.affine&&(!Array.isArray(t.affine)||t.affine.length!==16||!t.affine.every(v=>typeof v==='number'&&Number.isFinite(v))||t.affine[3]!==0||t.affine[7]!==0||t.affine[11]!==0||t.affine[15]!==1))throw Error('Invalid affine transform');
    inverse(matrix(t));
    for(const [type,fields]of Object.entries(entity.components||{}))if(!type||!plain(fields))throw Error('Invalid scene component');
    const legacy=entity.components?.LegacyWorldEdit?.change;
    if(legacy&&(!plain(legacy)||!['object','building'].includes(legacy.kind)||legacy.scene!==scene.scene||entity.id!==`${scene.scene}:${legacy.kind}:${legacy.id}`))throw Error('Legacy world edit identity mismatch');
   }
   const visited=new Set();
   for(const entity of scene.entities){
    if(visited.has(entity.id))continue;
    const chain=new Set();let current=entity;
    while(current&&!visited.has(current.id)){
     if(chain.has(current.id))throw Error('Scene hierarchy cycle');chain.add(current.id);
     if(current.parent!=null&&!local.has(current.parent))throw Error('Missing scene parent');
     current=current.parent==null?null:local.get(current.parent);
    }
    for(const id of chain)visited.add(id);
   }
   worldMatrices(scene);
  }
  return world;
 }
 function fromLegacy(doc){
  if(!plain(doc)||doc.version!==1||!Array.isArray(doc.changes))throw Error('Expected version 1 world edits');
  const grouped=new Map(),seen=new Set();
  for(const raw of doc.changes){
   if(!plain(raw)||!['object','building'].includes(raw.kind)||!text(raw.scene)||!text(raw.id))throw Error('Invalid legacy edit identity');
   const id=`${raw.scene}:${raw.kind}:${raw.id}`;if(seen.has(id))throw Error('Duplicate world entity ID: '+id);seen.add(id);
   const angle=(Number(raw.rotation)||0)*Math.PI/180,scale=Number(raw.scale)||1;
   if(!Number.isFinite(angle)||!Number.isFinite(scale)||scale<=0)throw Error('Invalid legacy transform');
   const x=Number(raw.x)||0,z=Number(raw.y)||0;
   const components={LegacyWorldEdit:{change:raw}};
   const asset=raw.data?.editorAsset;
   if(asset?.source&&asset?.key)components.MeshRenderer={asset:`${asset.source}:${asset.key}`,visible:true};
   const entity={id,name:text(raw.name||raw.id),parent:null,active:true,
    transform:{position:[x,0,z],rotation:[0,Math.sin(angle/2),0,Math.cos(angle/2)],scale:[scale,scale,scale]},
    components,metadata:{legacyId:text(raw.id),legacyKind:raw.kind}};
   if(!grouped.has(raw.scene))grouped.set(raw.scene,[]);grouped.get(raw.scene).push(entity);
  }
  const scenes=[...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([scene,entities])=>({format:SCENE,version:2,scene,entities}));
  return {format:FORMAT,version:2,revision:Number(doc.revision)||0,updatedAt:doc.updatedAt||null,scenes,...(doc.terrain?{terrain:doc.terrain}:{})};
 }
 function toLegacy(world,{forRender=false}={}){
  validateWorld(world);
  const changes=[];
  for(const scene of world.scenes){
   const matrices=worldMatrices(scene);
   const nodes=new Map(scene.entities.map(entity=>[entity.id,entity]));
   for(const entity of scene.entities){
    const legacy=entity.components?.LegacyWorldEdit?.change;if(!legacy)continue;
    if(legacy.scene!==scene.scene)throw Error('Legacy scene identity mismatch');
    const m=matrices.get(entity.id),scale=Math.hypot(m[0],m[1],m[2]);
    if(scale<1e-12)throw Error('Invalid legacy scene scale');
    const yaw=Math.atan2(m[8]/Math.hypot(m[8],m[9],m[10]),m[0]/scale)*180/Math.PI;
    let active=true;
    if(forRender)for(let node=entity;node;node=node.parent?nodes.get(node.parent):null)if(node.active===false){active=false;break;}
    changes.push({...legacy,...(!legacy.deleted?{x:m[12],y:m[14],rotation:Number(yaw.toPrecision(14)),scale:Number(scale.toPrecision(14))}:{}),...(forRender&&!active?{deleted:true}:{})});
   }
  }
  return {version:1,revision:Number(world.revision)||0,updatedAt:world.updatedAt||null,changes,...(world.terrain?{terrain:world.terrain}:{})};
 }
 function mergeLegacy(world,edits,{preserveIds=[]}={}){
  validateWorld(world);
  const result=JSON.parse(JSON.stringify(world)),prior=toLegacy(world),priorChanges=new Map(prior.changes.map(change=>[`${change.scene}:${change.kind}:${change.id}`,change]));
  const incoming=fromLegacy(edits),changed=new Set();
  for(const scene of incoming.scenes){
   let target=result.scenes.find(item=>item.scene===scene.scene);
   if(!target){target={format:SCENE,version:2,scene:scene.scene,entities:[]};result.scenes.push(target);}
   const old=new Map(target.entities.map(item=>[item.id,item]));
   for(const entity of scene.entities){
    changed.add(entity.id);const existing=old.get(entity.id);
    if(!existing){target.entities.push(entity);continue;}
    const current=priorChanges.get(entity.id),next=entity.components.LegacyWorldEdit.change;
    if(next.name!==current?.name)existing.name=entity.name;
    existing.components={...existing.components,...entity.components};
    existing.metadata={...existing.metadata,...entity.metadata};
    const moved=!current||current.deleted!==next.deleted||['x','y','rotation','scale'].some(key=>!Number.isFinite(Number(current[key])-Number(next[key]))||Math.abs(Number(current[key])-Number(next[key]))>1e-8);
    if(moved&&!next.deleted){
     if(existing.parent){
      const parent=worldMatrices(target).get(existing.parent);
      existing.transform={...entity.transform,affine:multiply(inverse(parent),matrix(entity.transform))};
     }else existing.transform=entity.transform;
    }
   }
  }
  const preserve=new Set(preserveIds.map(String));
  for(const scene of result.scenes)scene.entities=scene.entities.filter(entity=>!entity.components?.LegacyWorldEdit||changed.has(entity.id)||preserve.has(entity.id));
  result.revision=edits.revision;result.updatedAt=edits.updatedAt;
  if(edits.terrain!==undefined)result.terrain=edits.terrain;else delete result.terrain;
  return validateWorld(result);
 }
 function renderables(world){
  validateWorld(world);const output=[];
  for(const scene of world.scenes){
   const matrices=worldMatrices(scene),entities=new Map(scene.entities.map(entity=>[entity.id,entity]));
   for(const entity of scene.entities){
    const renderer=entity.components?.MeshRenderer;
    if(!renderer||renderer.visible===false||entity.components?.LegacyWorldEdit||entity.components?.GeneratedProp||entity.components?.GeneratedBuilding||entity.components?.GeneratedSpawn||entity.components?.GeneratedGatherable||entity.components?.GeneratedBridge||entity.components?.BuildingPart||entity.components?.GeneratedDecoration)continue;
    let ancestor=entity,enabled=true;
    while(ancestor){if(ancestor.active===false){enabled=false;break;}ancestor=ancestor.parent?entities.get(ancestor.parent):null;}
    if(!enabled||typeof renderer.asset!=='string')continue;
    const separator=renderer.asset.indexOf(':'),source=renderer.asset.slice(0,separator),key=renderer.asset.slice(separator+1);
    if(separator<1||!key||!['briar','creature'].includes(source))continue;
    const m=matrices.get(entity.id),scale=Math.hypot(m[0],m[1],m[2]);
    output.push({scene:scene.scene,id:entity.id,name:entity.name,asset:{source,key},x:m[12],y:m[14],rotation:Math.atan2(m[8]/Math.hypot(m[8],m[9],m[10]),m[0]/scale)*180/Math.PI,scale});
   }
  }
  return output;
 }
 function stableHash(value){let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(36)}
 function runtimeIdentity(scene,kind,item,index,occurrences){
  let key;
  if(kind==='object'&&item.id!=null&&String(item.id))key=String(item.id);
  else if(kind==='building'){
   const service=item.service?.id!=null?String(item.service.id):'none';
   key=String(item._editorId||`building:${service}:${String(item._briarOriginalName||item.name||'building').replace(/\\|/g,'_')}:${index}`);
  }else{
   const signature=[item.name||item.propKind||item.type||'object',item.type||'',item.propKind||'',Number(item.x)||0,Number(item.y)||0].join('|');
   const occurrence=occurrences.get(signature)||0;occurrences.set(signature,occurrence+1);
   key=`runtime-${stableHash(signature)}-${occurrence}`;
  }
  const id=`${scene}:${kind}:${key}`;
  return {id,key};
 }
 function entityTransformFromRuntime(item){
  const x=Number(item.x)||0,z=Number(item.y)||0,rotation=Number(item.editorTransform?.rotation??(Number(item.placement?.yaw||item.heading||0)*180/Math.PI))||0;
  const angle=rotation*Math.PI/360,scale=Math.max(.0001,Number(item.editorTransform?.scale)||1);
  return {position:[x,Number(item.height)||0,z],rotation:[0,Math.sin(angle),0,Math.cos(angle)],scale:[scale,scale,scale]};
 }
 function ensureRuntimeScene(world,name){
  let scene=world.scenes.find(item=>item.scene===String(name));
  if(!scene){scene={format:SCENE,version:2,scene:String(name),entities:[]};world.scenes.push(scene)}
  return scene;
 }
 function attachRuntimeEntity(world,sceneName,kind,item,index=0,occurrences=new Map(),entityById=null){
  if(!world||!item||item._editorPreview)return null;
  const name=String(sceneName),scene=ensureRuntimeScene(world,name),identityInfo=runtimeIdentity(name,kind,item,index,occurrences);
  let entity=entityById?.get(identityInfo.id)||scene.entities.find(candidate=>candidate.id===identityInfo.id);
  if(entity?.components?.LegacyWorldEdit?.change?.deleted)return null;
  if(entity&&entity.components?.RuntimeBinding&&(entity.components.RuntimeBinding.kind!==kind||entity.components.RuntimeBinding.key!==identityInfo.key))throw Error('Runtime scene binding identity collision');
  if(!entity){
   entity={id:identityInfo.id,name:String(item.name||item.propKind||item.type||kind),parent:null,active:true,
    transform:entityTransformFromRuntime(item),components:{},metadata:{runtimeGenerated:true}};
   scene.entities.push(entity);entityById?.set(entity.id,entity);
  }
  entity.components||={};entity.components.RuntimeBinding={kind,key:identityInfo.key};
  entity.metadata||={};entity.metadata.runtimeType=String(item.type||item.kind||kind);
  if(kind==='object'&&item.id==null)item.id=identityInfo.key;
  item._sceneEntityId=entity.id;
  return entity;
 }
 function attachRuntimeWorld(world,worldScenes){
  if(!world||!worldScenes||typeof worldScenes!=='object')return {entities:0,scenes:0};
  if(world.format!==FORMAT||world.version!==2)throw Error('Unsupported runtime world scene document');
  let count=0,sceneCount=0;
  for(const [sceneName,source]of Object.entries(worldScenes)){
   if(!source||!Array.isArray(source.objects)&&!Array.isArray(source.buildings))continue;
   sceneCount++;const occurrences=new Map(),sceneDocument=ensureRuntimeScene(world,sceneName),entityById=new Map(sceneDocument.entities.map(entity=>[entity.id,entity]));
   for(const [kind,list]of [['object',source.objects||[]],['building',source.buildings||[]]])for(let i=0;i<list.length;i++){
    const item=list[i];if(item?._sceneEntityId){const existing=findEntity(world,sceneName,item._sceneEntityId);if(existing){
     const legacy=existing.entity.components?.LegacyWorldEdit?.change;
     if(existing.entity.components?.RuntimeBinding){}
     else if(legacy&&legacy.kind===kind){existing.entity.components.RuntimeBinding={kind,key:String(legacy.id)}}
     else{count++;continue;}
     count++;continue;
    }}
    if(attachRuntimeEntity(world,sceneName,kind,item,i,occurrences,entityById))count++;
   }
  }
  for(const scene of world.scenes)invalidateScene(scene);
  validateWorld(world);return {entities:count,scenes:sceneCount};
 }
 function withoutRuntimeBindings(world){
  const output=JSON.parse(JSON.stringify(world));
  for(const scene of output.scenes){
   scene.entities=scene.entities.filter(entity=>{
    if(!entity.components?.RuntimeBinding)return true;
    delete entity.components.RuntimeBinding;
    const persistent=Object.keys(entity.components).length>0;
    if(!persistent)delete entity.components;
    return persistent;
   });
  }
  return validateWorld(output);
 }
 root.VeldrenSceneFormat={fromLegacy,toLegacy,mergeLegacy,validateWorld,renderables,readWorldTransform,setWorldTransform,setLocalTransform,duplicateSubtree,deleteSubtree,attachRuntimeEntity,attachRuntimeWorld,withoutRuntimeBindings};
})(globalThis);
