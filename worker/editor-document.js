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
  return out;
 });
 return {version:1,revision:Number(current.revision||0)+1,updatedAt:new Date().toISOString(),changes};
}
export function confirmation(c){
 return {scene:c.scene,kind:c.kind,id:c.id,name:c.name,action:c.deleted?'deleted':c.created?'created':'transformed'};
}
