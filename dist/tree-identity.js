'use strict';
const TREE_APPEARANCE={
 normal:{model:'ResourceTree_normal',height:4.2,tint:[.62,.74,.57]},
 oak:{model:'ResourceTree_oak',height:6.1,tint:[.47,.64,.47]},
 willow:{model:'ResourceTree_willow',height:4.8,tint:[.52,.68,.53]},
 maple:{model:'ResourceTree_maple',height:7.2,tint:[.82,.74,.59]},
 yew:{model:'ResourceTree_yew',height:6.8,tint:[.57,.71,.58]},
 magic:{model:'ResourceTree_magic',height:6.1,tint:[.58,.76,.77]}
};
function treeAppearance(o){return TREE_APPEARANCE[o.resourceId]||TREE_APPEARANCE.normal;}
function drawSpeciesTree(r,o,x,z){
 const look=treeAppearance(o),mesh=rebuiltModels[look.model],height=look.height*(.96+(Math.abs(o.id||0)%3)*.04),k=height/(mesh.bounds[1][1]-mesh.bounds[0][1]);
 rebuiltPlace(r,look.model,x,-mesh.bounds[0][1]*k,z,k,(o.id||0)*2.399,k,look.tint);return height;
}
let sharedTreeView=null;
function treeLifecycle(o){
 if(o.type!=='tree')return null;
 if(typeof sharedLive==='function'&&sharedLive()){
  if(!sharedTreeView||sharedTreeView.scene!==currentScene||Math.abs(o.x-sharedTreeView.x)>sharedTreeView.radius||Math.abs(o.y-sharedTreeView.y)>sharedTreeView.radius)return 'syncing';
  if(o._sharedDeadUntil)return sharedNow()>=(o._treeRegrowAt||o._sharedDeadUntil)?'regrowing':'stump';
 }else if(o.dead>time)return o.dead-time<=2?'regrowing':'stump';
 if(typeof onlinePeers!=='undefined')for(const peer of onlinePeers.values()){const a=peer.action;if(a?.kind==='gather'&&a.target?.entity===String(o.id)&&typeof sharedNow==='function'&&sharedNow()<a.started+a.duration)return 'chopping';}
 return typeof target!=='undefined'&&target===o&&gatheringActivity()?'chopping':o._treeRegrown?'regrown':'alive';
}
function drawTreeStump(r,o,x,z,regrowing=false){
 const p=groundedPainter(r,x,z),look=treeAppearance(o),size=Math.max(.3,Math.min(.64,look.height*.073)),height=.28+size*.18;
 const bark=materialRealm(p,5);profile3(bark,x,height/2,z,size*2,height,size*2,[[-.5,1.14],[.2,.92],[.5,.88]],'#715039',v=>v,10);
 const face=Array.from({length:10},(_,i)=>[x+Math.cos(i*Math.PI/5)*size*.88,height+.004,z+Math.sin(i*Math.PI/5)*size*.88]);p.face(face,'#c5a779');
 for(const k of [.38,.67])for(let i=0;i<10;i++){const a=i*Math.PI/5,b=(i+1)*Math.PI/5,rr=size*k;p.face([[x+Math.cos(a)*rr,height+.009,z+Math.sin(a)*rr],[x+Math.cos(b)*rr,height+.009,z+Math.sin(b)*rr],[x+Math.cos(b)*(rr+.018),height+.009,z+Math.sin(b)*(rr+.018)],[x+Math.cos(a)*(rr+.018),height+.009,z+Math.sin(a)*(rr+.018)]],'#92744c');}
 if(regrowing){beamArt(bark,[x+.15,height,z],[x+.2,height+.32,z],.022,'#809760',5);for(const side of [-1,1])p.face([[x+.2,height+.17,z],[x+.2+side*.18,height+.28,z+.03],[x+.2,height+.29,z+.035]],o.resourceId==='magic'?'#88cfc3':'#80a05d');}
 return height+.4;
}
function applyTreeView(view){
 if(!view||view.scene!==currentScene||sharedTreeView?.scene===view.scene&&view.at<sharedTreeView.at)return;
 sharedTreeView=view;const changes=new Map(view.states.map(row=>[row[0],row]));
 for(const o of worldScenes[currentScene].objects){if(o.type!=='tree'||Math.abs(o.x-view.x)>view.radius||Math.abs(o.y-view.y)>view.radius)continue;
  const row=changes.get(String(o.id)),dead=row?.[2]||0,old=o._sharedDeadUntil;
  o._sharedReady=true;o._sharedGeneration=row?.[1]||1;o._sharedDeadUntil=dead;o._treeRegrowAt=row?.[3]||0;o._sharedRevision=row?.[4]??0;o._treeRegrown=!dead&&(!!old||!!o._treeRegrown);
  o.dead=dead?Infinity:0;o.respawnAt=dead||null;
  if(dead&&target===o)stop();
 }
}
