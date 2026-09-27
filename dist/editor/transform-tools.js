'use strict';
(function(root){
 function createVeldrenTransformTools({native,commands,scene,selection,mode,report,bounds=()=>null,displayMatrix=node=>node.worldMatrix}){
  const G=root.VeldrenEditorGeometry,settings={orientation:'world',pivot:'object',translation:.25,rotation:15,scale:.1,snapping:true};let owner=null,loading=null,camera=null,handles=[],size=1,hover=null,gesture=null,key='';
  function configuration(value){if(gesture)cancel();Object.assign(settings,value);key='';return {...settings};}
  function nodes(){return selection().map(id=>native.entity(scene(),id)).filter(Boolean).map(node=>({...node,canonicalMatrix:node.worldMatrix,worldMatrix:displayMatrix(node)}));}
  function frame(backend,viewCamera){
   camera=viewCamera;
   if(!owner&&!loading)loading=root.createVeldrenGizmoRenderer(backend).then(value=>{owner=value;key='';},error=>report(error.message));
   const selected=nodes(),tool=mode();if(!selected.length){handles=[];if(key!=='empty'){owner?.update([],1,tool);key='empty';}return;}
   const pivot=settings.pivot==='center'?selected.reduce((p,n)=>G.add(p,G.mul(n.worldMatrix.slice(12,15),1/selected.length)),[0,0,0]):selected[0].worldMatrix.slice(12,15),axes=settings.orientation==='local'?G.orientation(selected[0].worldMatrix):[[1,0,0],[0,1,0],[0,0,1]];
   size=G.length(G.sub(camera.eye,pivot))*(camera.top-camera.bottom)/camera.near*90/camera.height;
   handles=['move','rotate','scale'].includes(tool)?G.handles(tool,pivot,axes,size):[];
   const outlines=[];for(const node of selected){const box=bounds(node);if(!box)continue;const corners=[];for(const x of [box[0][0],box[1][0]])for(const y of [box[0][1],box[1][1]])for(const z of [box[0][2],box[1][2]])corners.push(G.point(node.worldMatrix,[x,y,z]));for(const [a,b]of [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]])outlines.push({id:'outline:'+node.id+':'+a+':'+b,kind:'outline',index:4,points:[corners[a],corners[b]]});}
   const drawing=[...outlines,...handles],next=JSON.stringify([drawing,hover,gesture?.handle.id]);if(next!==key&&owner){owner.update(drawing,size,tool,hover,gesture?.handle.id);key=next;}
  }
  function ray(event,surface){if(!camera)return null;const rect=surface.getBoundingClientRect();return G.cameraRay(camera,(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height);}
  function down(event,surface){if(event.button!==0||!camera)return false;const r=ray(event,surface),handle=G.hitHandle(r,handles,size);if(!handle)return false;
   const selected=nodes(),first=selected[0],pivot=settings.pivot==='center'?selected.reduce((p,n)=>G.add(p,G.mul(n.worldMatrix.slice(12,15),1/selected.length)),[0,0,0]):first.worldMatrix.slice(12,15),axes=settings.orientation==='local'?G.orientation(first.worldMatrix):[[1,0,0],[0,1,0],[0,0,1]],start=G.beginDrag(mode(),handle,r,pivot,axes,size);if(!start)return true;
   // Selected descendants follow a selected ancestor, never receive delta twice.
   const ids=new Set(selected.map(n=>n.id)),roots=selected.filter(n=>{let p=n.parent;while(p){if(ids.has(p))return false;p=native.entity(scene(),p)?.parent;}return true;});
   commands.begin('3D '+mode());gesture={...start,pointer:event.pointerId,handle,initial:roots.map(n=>({id:n.id,matrix:[...n.worldMatrix],offset:G.sub(n.worldMatrix.slice(12,15),n.canonicalMatrix.slice(12,15))}))};surface.setPointerCapture?.(event.pointerId);return true;
  }
  function move(event,surface){const r=ray(event,surface);if(!r)return false;if(!gesture){hover=G.hitHandle(r,handles,size)?.id||null;return false;}if(event.pointerId!==gesture.pointer)return true;
   const snapping=settings.snapping?{translation:settings.translation,rotation:settings.rotation*Math.PI/180,scale:settings.scale}:{},delta=G.dragDelta(gesture,r,snapping);if(delta)try{commands.execute('3D '+gesture.mode,gesture.initial.map(n=>({op:'transform',id:n.id,space:'world',transform:{affine:G.multiply(G.translation(G.mul(n.offset,-1)),G.multiply(delta,n.matrix))}})));}catch(error){cancel();report(error.message);}return true;
  }
  function up(event){if(!gesture||event.pointerId!==gesture.pointer)return false;try{if(event.type==='pointercancel')commands.cancel();else commands.commit();}finally{gesture=null;key='';}return true;}
  function cancel(){if(gesture){try{commands.cancel();}finally{gesture=null;key='';}}}
  return {configuration,frame,down,move,up,cancel,render:renderer=>owner?.render(renderer),get camera(){return camera},get dragging(){return !!gesture}};
 }
 root.createVeldrenTransformTools=createVeldrenTransformTools;
})(globalThis);
