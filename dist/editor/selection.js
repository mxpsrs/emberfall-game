'use strict';
(function(root){
 // Canonical read cache and a ray-query BVH. Only IDs and editor visibility,
 // locking and selection live here; permanent data is always read from Scene.
 function createVeldrenSelection({native,scene,assets,onChange=()=>{},displayMatrix=node=>node.worldMatrix}){
  const G=root.VeldrenEditorGeometry,hidden=new Set(),locked=new Set();let selected=[],sceneKey=null,nodes=new Map(),children=new Map(),tree=null,structureDirty=true,boundsDirty=true,allBounds=true,cycle=null;
  const boundItems=new Map(),dirtyBounds=new Set();
  const key=id=>scene()+'|'+id;
  function refresh(){const name=scene();if(name!==sceneKey){sceneKey=name;structureDirty=true;selected=[];cycle=null;}if(!structureDirty)return;nodes=new Map((native.read(name)?.entities||[]).map(n=>[n.id,n]));children=new Map();for(const n of nodes.values()){const p=n.parent||'';if(!children.has(p))children.set(p,[]);children.get(p).push(n.id);}structureDirty=false;boundsDirty=allBounds=true;selected=selected.filter(id=>nodes.has(id));}
  function inherited(set,id){refresh();while(id){if(set.has(key(id)))return true;id=nodes.get(id)?.parent;}return false;}
  function canSelect(id){refresh();return nodes.has(id)&&!inherited(hidden,id)&&!inherited(locked,id);}
  function select(id,additive=false){refresh();if(id&&!canSelect(id))return [...selected];if(!id)selected=[];else if(additive){if(!selected.includes(id)&&selected.length>=128)throw Error('Select at most 128 entities per operation');selected=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id];}else selected=[id];onChange([...selected]);return [...selected];}
  function bounds(node){const c=node.components||{},mesh=c.MeshRenderer,id=mesh?.asset;if(mesh?.visible===false)return null;if(id&&assets.has(id)){const b=assets.record(id).bounds;if(b)return b;}
   const collider=c.Collider;if(collider?.bounds)return collider.bounds;
   if(collider?.size){const s=collider.size;return [s.map(v=>-v/2),s.map(v=>v/2)];}
   if(collider?.radius){const r=collider.radius,h=collider.height||r*2;return [[-r,0,-r],[r,h,r]];}
   const footprint=c.BuildingFootprint||c.Footprint;if(footprint)return [[0,0,0],[Number(footprint.w)||1,Number(c.BuildingAppearance?.visualHeight)||3,Number(footprint.h)||1]];
   if(c.Light)return [[-.25,-.25,-.25],[.25,.25,.25]];return null;
  }
  function worldBox(matrix,b){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const x of [b[0][0],b[1][0]])for(const y of [b[0][1],b[1][1]])for(const z of [b[0][2],b[1][2]]){const p=G.point(matrix,[x,y,z]);for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i]);}}return [lo,hi];}
  function boxOf(boxes){const box=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];for(const b of boxes)for(let i=0;i<3;i++){box[0][i]=Math.min(box[0][i],b[0][i]);box[1][i]=Math.max(box[1][i],b[1][i]);}return box;}
  function build(items,parent=null){if(!items.length)return null;const box=boxOf(items.map(item=>item.box)),node={box,parent};if(items.length<=8){node.items=items;for(const item of items)item.branch=node;return node;}const spans=G.sub(box[1],box[0]),axis=spans.indexOf(Math.max(...spans));items.sort((a,b)=>a.box[0][axis]+a.box[1][axis]-b.box[0][axis]-b.box[1][axis]);const half=Math.floor(items.length/2);node.left=build(items.slice(0,half),node);node.right=build(items.slice(half),node);return node;}
  function refit(node){while(node){node.box=boxOf(node.items?node.items.map(item=>item.box):[node.left.box,node.right.box]);node=node.parent;}}
  function dirtyBranch(id){const ids=[id];for(let i=0;i<ids.length;i++){if(dirtyBounds.has(ids[i]))continue;dirtyBounds.add(ids[i]);ids.push(...children.get(ids[i])||[]);}boundsDirty=true;}
  function ensureBounds(){
   refresh();if(!boundsDirty)return;
   const ids=allBounds?new Set(['MeshRenderer','Collider','BuildingFootprint','Light'].flatMap(type=>native.componentIds(sceneKey,type))):dirtyBounds;
   let rebuild=allBounds;const branches=new Set();if(allBounds)boundItems.clear();
   for(const id of ids){const n=native.entity(sceneKey,id),b=n?.activeInHierarchy?bounds(n):null,old=boundItems.get(id);if(n)nodes.set(id,n);
    if(!b){if(old){boundItems.delete(id);rebuild=true;}continue;}
    const matrix=displayMatrix(n),next={id,matrix,bounds:b,box:worldBox(matrix,b)};
    if(old){Object.assign(old,next);branches.add(old.branch);}else{boundItems.set(id,next);rebuild=true;}
   }
   if(rebuild)tree=build([...boundItems.values()]);else for(const branch of branches)refit(branch);
   dirtyBounds.clear();boundsDirty=allBounds=false;
  }
  function candidates(ray){ensureBounds();const hits=[],stack=tree?[tree]:[],identity=G.identity();while(stack.length){const branch=stack.pop();if(G.boundsHit(ray,identity,branch.box)===null)continue;if(branch.items){for(const item of branch.items){if(!canSelect(item.id))continue;const distance=G.boundsHit(ray,item.matrix,item.bounds);if(distance!==null)hits.push({id:item.id,distance});}}else stack.push(branch.left,branch.right);}return hits.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));}
  function pick(ray,point,additive=false){const hits=candidates(ray),signature=hits.map(h=>h.id).join('|'),same=cycle&&cycle.signature===signature&&Math.hypot(cycle.point[0]-point[0],cycle.point[1]-point[1])<5,index=same?(cycle.index+1)%Math.max(1,hits.length):0;cycle={signature,point,index};select(hits[index]?.id||null,additive);return hits;}
  function setFlag(set,id,value){refresh();if(!nodes.has(id))throw Error('Entity no longer exists');if(value)set.add(key(id));else set.delete(key(id));selected=selected.filter(canSelect);onChange([...selected]);}
  function hierarchy(filter=''){refresh();const query=filter.toLowerCase().trim(),visible=new Set();for(const n of nodes.values())if(!query||n.name.toLowerCase().includes(query)||n.id.toLowerCase().includes(query)){let id=n.id;while(id&&!visible.has(id)){visible.add(id);id=nodes.get(id)?.parent;}}return {roots:children.get('')||[],children,nodes,visible};}
  const unsubscribe=native.subscribe(event=>{
   if(event.scene&&event.scene!==scene())return;
   if(event.kind==='load'||structureDirty||sceneKey!==scene()){structureDirty=boundsDirty=allBounds=true;return;}
   for(const change of event.kind==='batch'?event.changes:[event]){
    if(!change.id){structureDirty=boundsDirty=allBounds=true;return;}
    if(change.kind==='transform'){dirtyBranch(change.id);continue;}
    const old=nodes.get(change.id),next=native.entity(sceneKey,change.id),previous=old?.parent||'',parent=next?.parent||'';
    if(!old||!next||previous!==parent||old.active!==next.active||JSON.stringify(old.transform)!==JSON.stringify(next.transform))dirtyBranch(change.id);else {dirtyBounds.add(change.id);boundsDirty=true;}
    if(old&&(!next||previous!==parent))children.set(previous,(children.get(previous)||[]).filter(id=>id!==change.id));
    if(next){nodes.set(change.id,next);if(!old||previous!==parent){if(!children.has(parent))children.set(parent,[]);if(!children.get(parent).includes(change.id))children.get(parent).push(change.id);}}
    else {const removed=[change.id];for(let i=0;i<removed.length;i++){removed.push(...children.get(removed[i])||[]);nodes.delete(removed[i]);children.delete(removed[i]);}}
   }
   selected=selected.filter(id=>nodes.has(id));
  });
  const unsubscribeAssets=assets.onReload?.(()=>{boundsDirty=allBounds=true;});
  return {roots(){refresh();const ids=new Set(selected);return selected.filter(id=>{let p=nodes.get(id)?.parent;while(p){if(ids.has(p))return false;p=nodes.get(p)?.parent;}return true;});},select,pick,candidates,hierarchy,bounds,canSelect,hidden:id=>inherited(hidden,id),locked:id=>inherited(locked,id),hide:(id,value)=>setFlag(hidden,id,value),lock:(id,value)=>setFlag(locked,id,value),get ids(){refresh();return [...selected]},invalidate(){structureDirty=boundsDirty=allBounds=true;},destroy(){unsubscribe();unsubscribeAssets?.();}};
 }
 root.createVeldrenSelection=createVeldrenSelection;
})(globalThis);
