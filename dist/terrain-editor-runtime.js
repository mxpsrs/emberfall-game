'use strict';
// Sparse, revisioned edits to the world heightfield and terrain materials.
// Nodes affect the same landHeight used by geometry, picking and pathfinding.
(function(){
 const MATERIALS=new Set(['grass','dirt','stone','paving']);
 const heights=new Map(),paints=new Map(),undoStack=[],redoStack=[];
 let active=null,revision=0,lastDocument='',error=null,historyOwner=null,historyState={undo:0,redo:0},strokeBefore=null;
 const coord=(x,z)=>x+':'+z;
 const number=(n,min,max,label)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Invalid terrain '+label);return n;};
 const validPosition=(item,label)=>{
  if(!item||!Number.isInteger(item.x)||!Number.isInteger(item.z)||item.x< -128||item.z< -128||item.x>2048||item.z>2048)throw Error('Invalid terrain '+label+' coordinate');
  return coord(item.x,item.z);
 };
 function parse(raw){
  if(raw===undefined||raw===null)return {version:1,scenes:{}};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||!raw.scenes||typeof raw.scenes!=='object'||Array.isArray(raw.scenes))throw Error('Invalid terrain layer');
  const scenes={},seenHeight=new Set(),seenPaint=new Set();let total=0;
  for(const [scene,data] of Object.entries(raw.scenes)){
   if(scene!=='overworld'||!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.heightNodes)||!Array.isArray(data.paintCells))throw Error('Invalid terrain scene');
   if(data.heightNodes.length>25000||data.paintCells.length>25000||(total+=data.heightNodes.length+data.paintCells.length)>50000)throw Error('Too many terrain edits');
   scenes[scene]={heightNodes:data.heightNodes.map(item=>{
    const key=validPosition(item,'height');if(seenHeight.has(key))throw Error('Duplicate terrain height coordinate');seenHeight.add(key);
    number(item.delta,-16,16,'height offset');return {x:item.x,z:item.z,delta:Math.round(item.delta*1000)/1000};
   }).sort((a,b)=>a.z-b.z||a.x-b.x),paintCells:data.paintCells.map(item=>{
    const key=validPosition(item,'paint');if(seenPaint.has(key))throw Error('Duplicate terrain paint coordinate');seenPaint.add(key);
    if(!MATERIALS.has(item.material))throw Error('Invalid terrain paint material');return {x:item.x,z:item.z,material:item.material};
   }).sort((a,b)=>a.z-b.z||a.x-b.x)};
  }
  return {version:1,scenes};
 }
 function serialize(){
  return {version:1,scenes:{overworld:{
   heightNodes:[...heights].map(([key,delta])=>{const [x,z]=key.split(':').map(Number);return {x,z,delta};}).sort((a,b)=>a.z-b.z||a.x-b.x),
   paintCells:[...paints].map(([key,material])=>{const [x,z]=key.split(':').map(Number);return {x,z,material};}).sort((a,b)=>a.z-b.z||a.x-b.x)
  }}};
 }
 function invalidate(bounds=null,scene='overworld'){
  if(scene!=='overworld')return;
  revision++;
  try{
   if(typeof landHeights!=='undefined'){
    if(!bounds||Math.abs((bounds.maxX-bounds.minX)*(bounds.maxZ-bounds.minZ))>30000)landHeights.clear();
    else for(let z=Math.floor(bounds.minZ)-2;z<=Math.ceil(bounds.maxZ)+2;z++)for(let x=Math.floor(bounds.minX)-2;x<=Math.ceil(bounds.maxX)+2;x++)landHeights.delete(x+z*8192);
   }
  }catch{}
  try{realmNavigation?.delete?.(scene)}catch{}
  try{miniTerrain=null}catch{}
  try{worldAtlasTerrain=null}catch{}
  // Keep the current surface visible while only the touched chunks rebuild.
  // Geometry, normals and paint are atomically replaced by the frame scheduler.
  try{
   const gpu=typeof realmGPU==='undefined'?null:realmGPU,chunks=gpu?.terrain?.get(scene);
   if(chunks)for(const [key,chunk] of chunks){
    const cell=Number(key.split(':',1)[0])||8,left=chunk.x-cell/2,top=chunk.z-cell/2;
    if(bounds&&!(left<=bounds.maxX+2&&left+cell>=bounds.minX-2&&top<=bounds.maxZ+2&&top+cell>=bounds.minZ-2))continue;
    chunk.complete=false;chunk.noGeometry=false;chunk.build=null;chunk.fallbackBuild=null;chunk.fallbackAttempted=false;chunk.queued=false;
   }
   if(gpu)gpu.terrainQueueKey=null;
  }catch(e){console.warn('Terrain GPU refresh failed',e)}
 }
 function applyDocument(raw){
  let next;try{next=parse(raw)}catch(cause){error=cause.message;console.warn('Ignored invalid saved terrain:',cause);return {applied:false,error,revision};}
  const canonical=JSON.stringify(next);if(canonical===lastDocument)return {applied:false,unchanged:true,revision};
  heights.clear();paints.clear();for(const node of next.scenes.overworld?.heightNodes||[])if(node.delta)heights.set(coord(node.x,node.z),node.delta);
  for(const cell of next.scenes.overworld?.paintCells||[])paints.set(coord(cell.x,cell.z),cell.material);
  undoStack.length=0;redoStack.length=0;active=null;lastDocument=canonical;error=null;
  invalidate();return {applied:true,revision,heightNodes:heights.size,paintCells:paints.size};
 }
 function heightDelta(x,z){return heights.get(coord(x,z))||0;}
 function paint(x,z,scene){if((scene??(typeof currentScene==='undefined'?'overworld':currentScene))!=='overworld')return null;return paints.get(coord(Math.floor(x),Math.floor(z)))||null;}
 function remember(kind,key){
  if(!active)active=new Map();const id=kind+':'+key;
  if(!active.has(id))active.set(id,{kind,key,before:(kind==='height'?heights:paints).get(key)??null});
 }
 function set(kind,x,z,value){
  const key=coord(x,z),map=kind==='height'?heights:paints,old=map.get(key)??null;
  if(kind==='height')value=Math.max(-16,Math.min(16,Math.round(value*1000)/1000))||null;
  if(value===old)return false;remember(kind,key);if(value==null)map.delete(key);else map.set(key,value);return true;
 }
 function beginStroke(){if(active)endStroke();strokeBefore=historyOwner?serialize():null;active=new Map();return true;}
 function endStroke(){
  if(!active)return {changed:false,revision};
  const entries=[...active.values()].map(item=>({...item,after:(item.kind==='height'?heights:paints).get(item.key)??null})).filter(item=>item.before!==item.after);
  active=null;if(entries.length){
   if(historyOwner){lastDocument=JSON.stringify(serialize());try{historyOwner.execute(serialize());}catch(cause){lastDocument='';applyDocument(strokeBefore);throw cause;}}
   else {undoStack.push(entries);if(undoStack.length>40)undoStack.shift();redoStack.length=0;}
   lastDocument=JSON.stringify(serialize());
  }
  strokeBefore=null;return {changed:!!entries.length,...state()};
 }
 function eligible(x,z){
  if(x< -128||z< -128||x>2048||z>2048)return false;
  try{return !worldWaterSurface(x,z)}catch{return true;}
 }
 function stroke(input){
  const scene=input?.scene??'overworld';if(scene!=='overworld')throw Error('Sculpt and paint are available in the overworld');
  if(typeof currentScene!=='undefined'&&currentScene!==scene)throw Error('Switch to the overworld before editing terrain');
  const x=number(input.x,-128,2048,'brush x'),z=number(input.z,-128,2048,'brush z'),radius=number(input.radius??3,.5,24,'brush radius');
  const mode=input.mode;if(!['raise','lower','flatten','smooth','paint','erase'].includes(mode))throw Error('Unknown terrain brush');
  const strength=number(input.strength??.25,0,4,'brush strength');
  if(mode==='paint'&&!MATERIALS.has(input.material))throw Error('Invalid terrain paint material');
  if(!active)beginStroke();
  const target=mode==='flatten'?number(input.target??(typeof landHeight==='function'?landHeight(x,z):0),-64,64,'flatten height'):0;
  const nodeUpdates=[],paintUpdates=[],landHeightAt=(a,b)=>typeof landHeight==='function'?landHeight(a,b):heightDelta(a,b);
  const radiusSquared=radius*radius,bounds={minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity};let changed=0;
  // Compute the whole smooth stroke before mutation, so it is independent of
  // iteration order and stays stable around the pathfinding slope threshold.
  for(let j=Math.floor(z-radius-1);j<=Math.ceil(z+radius+1);j++)for(let i=Math.floor(x-radius-1);i<=Math.ceil(x+radius+1);i++){
   if(mode==='paint'||mode==='erase'){
    const dCell=(i+.5-x)**2+(j+.5-z)**2;if(dCell<=radiusSquared&&eligible(i+.5,j+.5))paintUpdates.push([i,j,mode==='erase'?null:input.material]);
   }
   if(mode==='paint')continue;
   const d2=(i-x)**2+(j-z)**2;if(d2>radiusSquared||!eligible(i,j))continue;
   const falloff=1-Math.sqrt(d2)/radius;
   const delta=heightDelta(i,j),at=landHeightAt(i,j);let next=delta;
   if(mode==='erase')next=null;
   if(mode==='raise'||mode==='lower')next=delta+(mode==='raise'?1:-1)*strength*falloff;
   if(mode==='flatten')next=delta+(target-at)*Math.min(1,strength)*falloff;
   if(mode==='smooth'){
    const nearby=(landHeightAt(i-1,j)+landHeightAt(i+1,j)+landHeightAt(i,j-1)+landHeightAt(i,j+1))*.25;
    next=delta+(nearby-at)*Math.min(1,strength)*falloff;
   }
   nodeUpdates.push([i,j,next]);
  }
  const newHeights=heights.size+nodeUpdates.reduce((count,[i,j,value])=>count+(Math.round((value||0)*1000)!==0&&!heights.has(coord(i,j))?1:0)-(Math.round((value||0)*1000)===0&&heights.has(coord(i,j))?1:0),0);
  const newPaints=paints.size+paintUpdates.reduce((count,[i,j,value])=>count+(value!==null&&!paints.has(coord(i,j))?1:0)-(value===null&&paints.has(coord(i,j))?1:0),0);
  if(newHeights>25000||newPaints>25000||newHeights+newPaints>50000)throw Error('Terrain layer is full; erase unused brushes before saving');
  const change=(kind,i,j,value)=>{if(!set(kind,i,j,value))return;changed++;bounds.minX=Math.min(bounds.minX,i);bounds.minZ=Math.min(bounds.minZ,j);bounds.maxX=Math.max(bounds.maxX,i+1);bounds.maxZ=Math.max(bounds.maxZ,j+1);};
  for(const [i,j,value]of nodeUpdates)change('height',i,j,value);
  for(const [i,j,value]of paintUpdates)change('paint',i,j,value);
  if(changed)invalidate(bounds,scene);
  return {changed,bounds:changed?bounds:null,revision,undo:undoStack.length,redo:redoStack.length};
 }
 function replay(stack,opposite,side){
  endStroke();const entries=stack.pop();if(!entries)return {changed:false,revision};
  const bounds={minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity};
  for(const item of entries){const map=item.kind==='height'?heights:paints,value=item[side],key=item.key,[x,z]=key.split(':').map(Number);
   if(value==null)map.delete(key);else map.set(key,value);
   bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x+1);bounds.minZ=Math.min(bounds.minZ,z);bounds.maxZ=Math.max(bounds.maxZ,z+1);
  }
  opposite.push(entries);invalidate(bounds);lastDocument=JSON.stringify(serialize());return {changed:true,bounds,revision,undo:undoStack.length,redo:redoStack.length};
 }
 function undo(){endStroke();return historyOwner?historyOwner.undo():replay(undoStack,redoStack,'before');}
 function redo(){endStroke();return historyOwner?historyOwner.redo():replay(redoStack,undoStack,'after');}
 function reset(scene='overworld'){
  if(scene!=='overworld')throw Error('Sculpt and paint are available in the overworld');
  beginStroke();const bounds={minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity};let changed=0;
  for(const [kind,map] of [['height',heights],['paint',paints]])for(const key of [...map.keys()]){const [x,z]=key.split(':').map(Number);if(set(kind,x,z,null)){changed++;bounds.minX=Math.min(x,bounds.minX);bounds.minZ=Math.min(z,bounds.minZ);bounds.maxX=Math.max(x+1,bounds.maxX);bounds.maxZ=Math.max(z+1,bounds.maxZ);}}
  endStroke();if(changed)invalidate();return {changed,bounds:changed?bounds:null,revision};
 }
 function state(){return {revision,undo:historyOwner?historyState.undo:undoStack.length,redo:historyOwner?historyState.redo:redoStack.length,heightNodes:heights.size,paintCells:paints.size,error};}
 function setHistoryOwner(owner){if(active)throw Error('Finish the terrain stroke first');historyOwner=owner;undoStack.length=redoStack.length=0;}
 function setHistoryState(value){historyState={undo:value.undo,redo:value.redo};}
 window.VeldrenTerrainEdits={applyDocument,serialize,stroke,beginStroke,endStroke,undo,redo,reset,invalidate,heightDelta,paint,state,setHistoryOwner,setHistoryState,
  get revision(){return revision},get error(){return error},get history(){const {undo,redo}=state();return {undo,redo}},get count(){return {heightNodes:heights.size,paintCells:paints.size}}};
})();
