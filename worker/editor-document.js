import '../client/building-assembly.js';
const TERRAIN_MATERIALS=new Set(['grass','dirt','stone','paving']);
export function sanitizeTerrain(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1||!input.scenes||typeof input.scenes!=='object'||Array.isArray(input.scenes))throw Error('Invalid terrain layer');
 const scenes={};let total=0;
 for(const [scene,data] of Object.entries(input.scenes)){
  if(scene!=='overworld'||!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.heightNodes)||!Array.isArray(data.paintCells))throw Error('Invalid terrain scene');
  if(data.heightNodes.length>25000||data.paintCells.length>25000||(total+=data.heightNodes.length+data.paintCells.length)>50000)throw Error('Too many terrain edits');
  const seenNodes=new Set(),seenCells=new Set();
  const position=(item,seen,kind)=>{
   if(!item||typeof item!=='object'||!Number.isInteger(item.x)||!Number.isInteger(item.z)||item.x< -128||item.z< -128||item.x>2048||item.z>2048)throw Error('Invalid terrain '+kind+' coordinate');
   const key=item.x+':'+item.z;if(seen.has(key))throw Error('Duplicate terrain '+kind+' coordinate');seen.add(key);return {x:item.x,z:item.z};
  };
  const heightNodes=data.heightNodes.map(item=>{
   const p=position(item,seenNodes,'height');if(typeof item.delta!=='number'||!Number.isFinite(item.delta)||Math.abs(item.delta)>16)throw Error('Invalid terrain height offset');
   return {...p,delta:Math.round(item.delta*1000)/1000};
  }).sort((a,b)=>a.z-b.z||a.x-b.x);
  const paintCells=data.paintCells.map(item=>{
   const p=position(item,seenCells,'paint');if(!TERRAIN_MATERIALS.has(item.material))throw Error('Invalid terrain paint material');return {...p,material:item.material};
  }).sort((a,b)=>a.z-b.z||a.x-b.x);
  scenes[scene]={heightNodes,paintCells};
 }
 return {version:1,scenes};
}
function normalize(raw){
 const rotation=Number.isFinite(Number(raw.rotation))?Number(raw.rotation):(Number(raw.yaw)||0)*180/Math.PI;
 return {
  scene:String(raw.scene||'').slice(0,120),
  kind:raw.kind==='building'?'building':'object',
  id:String(raw.id??'').slice(0,180),
  name:raw.name==null?null:String(raw.name).slice(0,220),
  type:raw.type==null?null:String(raw.type).slice(0,120),
  subtype:raw.subtype==null?null:String(raw.subtype).slice(0,140),
  baseX:Number(raw.baseX)||0,baseY:Number(raw.baseY)||0,
  deleted:raw.deleted===true,created:raw.created===true,
  x:Number(raw.x),y:Number(raw.y),rotation,
  scale:Math.max(.1,Math.min(10,Number(raw.scale)||1)),
  data:raw.data
 };
}
export function sanitize(input,current){
 if(!input||input.version!==1||!Array.isArray(input.changes))throw Error('Invalid world edit document');
 if(input.changes.length>30000)throw Error('Too many world edits');
 if(input.expectedRevision!=null&&Number(input.expectedRevision)!==Number(current.revision||0)){
  const error=Error(`Editor world changed on disk. Expected revision ${input.expectedRevision}, current revision ${current.revision||0}. Reload the editor before saving.`);
  error.status=409;throw error;
 }
 const changes=input.changes.map((raw,index)=>{
  if((current.changes||[]).some(old=>JSON.stringify(old)===JSON.stringify(raw)))return raw;
  if(!raw||typeof raw!=='object')throw Error('Invalid edit '+index);
  const c=normalize(raw);
  if(!c.scene||!c.id)throw Error('Edit missing scene/id at '+index);
  if(!c.deleted&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)))throw Error('Invalid coordinates at '+index);
  const out={
   scene:c.scene,kind:c.kind,id:c.id,name:c.name,type:c.type,subtype:c.subtype,
   baseX:c.baseX,baseY:c.baseY,deleted:c.deleted,created:c.created
  };
  if(!c.deleted)Object.assign(out,{x:c.x,y:c.y,rotation:c.rotation,scale:c.scale});
  if(c.created){
   if(!c.data||typeof c.data!=='object'||Array.isArray(c.data))throw Error('Created edit missing entity data at '+index);
   out.data=c.data;
  }
  if(raw.assembly){globalThis.VeldrenAssembly.validate(raw.assembly);out.assembly=globalThis.VeldrenAssembly.serialize(raw.assembly);}
  return out;
 });
 return {version:1,revision:Number(current.revision||0)+1,updatedAt:new Date().toISOString(),changes,
  ...(input.terrain!==undefined?{terrain:sanitizeTerrain(input.terrain)}:current.terrain!==undefined?{terrain:current.terrain}:{})};
}
export function confirmation(c){
 return {scene:c.scene,kind:c.kind,id:c.id,name:c.name,action:c.deleted?'deleted':c.created?'created':'transformed'};
}
