'use strict';
// A bounded, explicitly disposed Filament resource owner. Tools never enter the
// canonical Scene or asset catalog. The viewport submits this separate overlay
// view after the world using the exact same camera.
(function(root){
 async function createVeldrenGizmoRenderer(backend){
  const response=await fetch('materials/veldren-editor.filamat');if(!response.ok)throw Error('Editor tool material unavailable');
  const bytes=new Uint8Array(await response.arrayBuffer()),F=root.Filament,e=backend.engine,G=root.VeldrenEditorGeometry,capacity=65536;
  let disposed=false,count=0;const scene=e.createScene(),view=e.createView(),material=e.createMaterial(bytes),instance=material.createInstance(),entity=F.EntityManager.get().create();
  view.setCamera(backend.camera);view.setScene(scene);view.setPostProcessingEnabled(false);view.setShadowingEnabled(false);
  const A=F.VertexAttribute,T=F.VertexBuffer$AttributeType,vb=F.VertexBuffer.Builder().vertexCount(capacity).bufferCount(2).attribute(A.POSITION,0,T.FLOAT3,0,12).attribute(A.COLOR,1,T.FLOAT4,0,16).build(e);
  const positions=new Float32Array(capacity*3),colors=new Float32Array(capacity*4);
  F.RenderableManager.Builder(1).boundingBox({center:[0,0,0],halfExtent:[100000,100000,100000]}).material(0,instance).geometryNoIndices(0,F.RenderableManager$PrimitiveType.TRIANGLES,vb).castShadows(false).receiveShadows(false).culling(false).build(e,entity);
  const palette=[[1,.12,.09,1],[.2,1,.25,1],[.15,.45,1,1],[1,1,1,1],[.2,.85,1,1]];
  function triangle(a,b,c,color){if(count+3>capacity)throw Error('Editor geometry exceeds bounded buffer');for(const p of [a,b,c]){positions.set(p,count*3);colors.set(color,count*4);count++;}}
  function tube(a,b,r,color,endRadius=r){const axis=G.unit(G.sub(b,a)),u=G.unit(G.cross(axis,Math.abs(axis[1])<.9?[0,1,0]:[1,0,0])),v=G.cross(axis,u);for(let i=0;i<6;i++){const radial=t=>G.add(G.mul(u,Math.cos(t)),G.mul(v,Math.sin(t))),p=radial(i*Math.PI/3),q=radial((i+1)*Math.PI/3),a0=G.add(a,G.mul(p,r)),a1=G.add(a,G.mul(q,r)),b0=G.add(b,G.mul(p,endRadius)),b1=G.add(b,G.mul(q,endRadius));triangle(a0,b0,b1,color);triangle(a0,b1,a1,color);}}
  function cube(p,r,color){const pts=[];for(const x of [-r,r])for(const y of [-r,r])for(const z of [-r,r])pts.push(G.add(p,[x,y,z]));for(const [a,b,c,d]of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]){triangle(pts[a],pts[b],pts[c],color);triangle(pts[a],pts[c],pts[d],color);}}
  function update(handles,size,mode,hover,active){
   if(disposed)return;count=0;
   for(const h of handles){const color=h.id===active?[1,.75,.1,1]:h.id===hover?[1,1,.5,1]:palette[h.index];
    if(h.kind==='plane'){triangle(h.points[0],h.points[1],h.points[2],color);triangle(h.points[0],h.points[2],h.points[3],color);}
    else if(h.kind==='uniform')cube(h.points[0],size*.065,color);
    else {for(let i=1;i<h.points.length;i++)tube(h.points[i-1],h.points[i],size*(h.kind==='outline'?.006:h.kind==='ring'?.013:.018),color);if(h.kind==='axis'){const end=h.points[1];if(mode==='scale')cube(end,size*.065,color);else tube(G.sub(end,G.mul(h.axis,size*.16)),G.add(end,G.mul(h.axis,size*.05)),size*.065,color,0);}}
   }
   if(count){positions.fill(0,count*3);colors.fill(0,count*4);vb.setBufferAt(e,0,positions);vb.setBufferAt(e,1,colors);scene.addEntity(entity);}else scene.remove(entity);
  }
  function render(renderer){if(disposed||!count)return;view.setViewport([0,0,backend.width,backend.height]);renderer.renderView(view);}
  function destroy(){if(disposed)return;disposed=true;scene.remove(entity);e.destroyEntity(entity);F.EntityManager.get().destroy(entity);entity.delete();e.destroyVertexBuffer(vb);e.destroyMaterialInstance(instance);e.destroyMaterial(material);e.destroyView(view);e.destroyScene(scene);}
  root.addEventListener('pagehide',destroy,{once:true});return {update,render,destroy};
 }
 root.createVeldrenGizmoRenderer=createVeldrenGizmoRenderer;
})(globalThis);
