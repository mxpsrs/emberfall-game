'use strict';
// Bridge placement and deck parameters are canonical Scene data. Meshes,
// terrain samples, map outlines and navigation queries are derived from it.
(function(root){
 const native=()=>root.realmNative.scenes,A=()=>root.VeldrenAssembly,M=()=>root.VeldrenBuildingScene.matrices;
 const views=new Map(),lists=new Map(),meshes=new Map(),sources=[];let enabled=false,captured=false;
 const entity=(scene,id)=>native().entity(scene,id),identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 function capture(){if(captured)return;captured=true;const repeats=new Map();for(const b of typeof physicalBridges==='undefined'?[]:physicalBridges||[]){
  const source=[b.x,b.z,b.span,b.width,!!b.eastWest],key=JSON.stringify(source),ordinal=repeats.get(key)||0;repeats.set(key,ordinal+1);
  sources.push({id:'generated:overworld:bridge:'+root.VeldrenSceneOwnership.stableHash(JSON.stringify([source,ordinal])),source:{x:b.x,z:b.z,span:b.span,width:b.width,eastWest:!!b.eastWest}});
 }}
 function getView(scene,id){const key=scene+'|'+id;if(views.has(key))return views.get(key);const n=entity(scene,id);if(!n?.components.Bridge)return;
  const fields=Object.fromEntries(['span','width','arch','lift'].map(k=>[k,['components','Bridge',k]])),properties={_generatedBridge:{get:()=>true},z:{get:a=>a.pose().y,set:(a,v)=>a.setPose({y:v})},eastWest:{get:()=>{const m=entity(scene,id).worldMatrix;return Math.abs(m[0])>=Math.abs(m[2]);}}};
  const view=root.VeldrenSceneOwnership.createView(scene,n,'',{type:'bridge',fields,properties});views.set(key,view);return view;
 }
 function project(scene=null){
  if(scene===null){lists.clear();for(const name of native().names())project(name);}
  else lists.set(scene,Object.freeze(native().componentIds(scene,'Bridge').map(id=>getView(scene,id))));
  if(typeof physicalBridges!=='undefined')physicalBridges=list('overworld',true);
 }
 function list(scene,active=false){const values=lists.get(scene)||Object.freeze([]);return active?Object.freeze(values.filter(b=>entity(scene,b._sceneEntityId)?.activeInHierarchy)):values;}
 function resolve(b){const n=entity(b._generatedSceneName,b._sceneEntityId),c=n?.components.Bridge;if(!c||!Number.isFinite(c.span)||c.span<=0||!Number.isFinite(c.width)||c.width<=1.3||!Number.isFinite(c.arch??.65)||!Number.isFinite(c.lift??.06))return null;return {n,c,m:M().row(n.worldMatrix)};}
 function local(b,x,z){const r=resolve(b);if(!r)return null;const {m}=r,dx=x-m[3],dz=z-m[11],det=m[0]*m[10]-m[2]*m[8];if(Math.abs(det)<1e-12)return null;return [(dx*m[10]-dz*m[2])/det,(dz*m[0]-dx*m[8])/det];}
 function point(b,along,lateral,offset=0){
  const r=resolve(b);if(!r)return null;const {c,m}=r,u=Math.max(0,Math.min(1,(along+c.span/2)/c.span)),a=A().point(m,[-c.span/2,0,0]),z=A().point(m,[c.span/2,0,0]);
  const p=A().point(m,[along,(c.lift??.06)+(c.arch??.65)*Math.sin(u*Math.PI)+offset,lateral]);p[1]+=landHeight(a[0],a[2])*(1-u)+landHeight(z[0],z[2])*u;return p;
 }
 function at(scene,x,z,barrier=false){
  for(const id of native().footprintsAt(scene,'Bridge',x,z)){const b=getView(scene,id),r=resolve(b),p=local(b,x,z);if(!r||!p||r.n.components.Collider?.solid===false&&barrier)continue;
   const along=Math.abs(p[0]),across=Math.abs(p[1]),edge=r.c.width/2-.65;
   if(barrier?along<r.c.span/2+.35&&across>edge&&across<r.c.width/2+.55:along<=r.c.span/2&&across<=edge)return b;
  }return null;
 }
 function approach(b,x,z,radius=0){const r=resolve(b),p=local(b,x,z);if(!r?.n.activeInHierarchy||!p)return false;const sx=Math.hypot(r.m[0],r.m[8])||1,sz=Math.hypot(r.m[2],r.m[10])||1;return Math.abs(p[0])<r.c.span/2+(2+radius)/sx&&Math.abs(p[1])<r.c.width/2+(1+radius)/sz;}
 function height(b,x,z){const p=local(b,x,z);return p?point(b,p[0],p[1])[1]:landHeight(x,z);}
 function outline(b,pad=0){const r=resolve(b);if(!r)return [];return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>A().point(r.m,[x*(r.c.span/2+pad),0,z*r.c.width/2])).map(p=>[p[0],p[2]]);}
 function bounds(b,pad=0){const p=outline(b,pad);return {left:Math.min(...p.map(p=>p[0])),right:Math.max(...p.map(p=>p[0])),top:Math.min(...p.map(p=>p[1])),bottom:Math.max(...p.map(p=>p[1]))};}
 function mesh(b){
  const key=b._generatedSceneName+'|'+b._sceneEntityId;if(meshes.has(key))return meshes.get(key);const r=resolve(b);if(!r)return null;
  const source=briarModels.bridge,p=new Float32Array(source.p.length),n=new Float32Array(source.n.length),base=point(b,0,0)[1];
  const deck=[[-1,-.05],[-.9066,-.0066],[-.8086,.0725],[-.6878,.1395],[-.5625,.1843],[-.4517,.2],[.4517,.2],[.5625,.1843],[.6878,.1395],[.8086,.0725],[.9066,-.0066],[1,-.05]];
  const nativeHeight=u=>{for(let i=1;i<deck.length;i++)if(u<=deck[i][0]){const [a,h]=deck[i-1],[c,k]=deck[i],t=Math.max(0,(u-a)/(c-a));return h+(k-h)*t;}return -.05;};
  const lateral=v=>{const a=Math.abs(v),edge=r.c.width/2-.65;return Math.sign(v)*(a<=.11548?a/.11548*edge:a<=.1355?edge+(a-.11548)/.02002*.10:edge+.10+(a-.1355)/(.19246-.1355)*.75);};
  for(let i=0;i<p.length;i+=3){const u=Math.max(-1,Math.min(1,source.p[i]*.5+source.p[i+2]*.8660254)),v=lateral(source.p[i]*.8660254-source.p[i+2]*.5),offset=source.p[i+1]-nativeHeight(u),q=point(b,u*r.c.span/2,v,offset*(offset>0?8:2.2));p[i]=q[0]-r.m[3];p[i+1]=q[1]-base;p[i+2]=q[2]-r.m[11];}
  for(let j=0;j<source.i.length;j+=3){const ids=[source.i[j]*3,source.i[j+1]*3,source.i[j+2]*3],a=ids[0],c=ids[1],d=ids[2],ux=p[c]-p[a],uy=p[c+1]-p[a+1],uz=p[c+2]-p[a+2],vx=p[d]-p[a],vy=p[d+1]-p[a+1],vz=p[d+2]-p[a+2],normal=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];for(const id of ids)for(let k=0;k<3;k++)n[id+k]+=normal[k];}
  for(let i=0;i<n.length;i+=3){const length=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let k=0;k<3;k++)n[i+k]/=length;}
  const result={mesh:{...source,p,n,t:new Uint8Array(p.length/3).fill(18)},base};meshes.set(key,result);return result;
 }
 function render(r,b){const resolved=resolve(b);if(!resolved?.n.activeInHierarchy||resolved.n.components.MeshRenderer?.visible===false)return 0;const cached=mesh(b),x=resolved.m[3],z=resolved.m[11];
  const painter={software:r.software,face(points,...args){r.face(points.map(p=>[p[0],p[1]+cached.base-landHeight(p[0],p[2]),p[2]]),...args);}};
  if(r.indexed)painter.indexed=(mesh,m,style)=>{const matrix=Array.from(m);matrix[7]+=cached.base-landHeight(matrix[3],matrix[11]);r.indexed(mesh,matrix,style);};
  briarEmit(painter,cached.mesh,A().transform(x,0,z));return 2;
 }
 function draw(r,scene){for(const b of list(scene)){if(root.VeldrenWorldPerformance?.visible(scene,b._sceneEntityId)===false)continue;const data=resolve(b);if(!data?.n.activeInHierarchy||root.VeldrenEditorSelection?.hidden(data.n.id))continue;const pad=Math.max(data.c.span,data.c.width)*Math.max(Math.hypot(data.m[0],data.m[8]),Math.hypot(data.m[2],data.m[10]));if(typeof realmWideWorldLimit3==='function'&&Math.hypot(b.x-px,b.z-py)>realmWideWorldLimit3()+pad)continue;render(r,b);}}
 function invalidate(){meshes.clear();if(typeof realmNavigation!=='undefined')realmNavigation.clear();if(typeof resetLandSurface==='function')resetLandSurface();if(typeof miniTerrain!=='undefined')miniTerrain=null;if(typeof worldAtlasTerrain!=='undefined')worldAtlasTerrain=null;if(typeof mapServicesCache!=='undefined')mapServicesCache=null;}
 async function migrate(){
  capture();const doc=native().serialize();let count=0,scene=doc.scenes.find(s=>s.scene==='overworld');
  if(!scene){scene={format:'veldren.scene',version:2,scene:'overworld',entities:[]};doc.scenes.push(scene);}
  const rootId='generated:overworld:root';let world=scene.entities.find(e=>e.id===rootId);if(!world){world={id:rootId,name:'World',parent:null,active:true,transform:identity(),components:{WorldGeneration:{}},metadata:{}};scene.entities.push(world);}
  if(!world.components.WorldGeneration.bridgesComplete){const group=rootId+':bridges';scene.entities.push({id:group,name:'Bridges',parent:rootId,active:true,transform:identity(),components:{SceneGroup:{category:'Bridges'}},metadata:{}});
   for(const {id,source:b}of sources){const m=b.eastWest?A().transform(b.x,0,b.z):[0,0,1,b.x,0,1,0,0,1,0,0,b.z];scene.entities.push({id,name:'Stone bridge',parent:group,active:true,transform:{...identity(),position:[b.x,0,b.z],affine:M().column(m)},components:{GeneratedBridge:{version:1},Bridge:{span:b.span,width:b.width,arch:.65,lift:.06},Footprint:{shape:'bridge'},Collider:{solid:true,shape:'bridge-parapets'},MeshRenderer:{asset:'procedural:bridge',visible:true}},metadata:{}});count++;}
   world.components.WorldGeneration.bridgesComplete=true;
  }
  if(!native().load(doc))throw Error('Native Scene rejected bridges');
  if(!enabled){
   const before=bridgesInRealm;bridgesInRealm=function(){return enabled?list(currentScene,true):before();};
   const beforeAt=bridgeAt;bridgeAt=function(x,z){return enabled?at(currentScene,x,z):beforeAt(x,z);};
   const beforeBarrier=bridgeBarrier;bridgeBarrier=function(x,z){return enabled?!!at(currentScene,x,z,true):beforeBarrier(x,z);};
   const beforeHeight=bridgeDeckHeight;bridgeDeckHeight=function(b,x,z){return b._generatedBridge?height(b,x,z):beforeHeight(b,x,z);};
   const reset=resetLandSurface;resetLandSurface=function(){meshes.clear();return reset();};
   native().subscribe(event=>{project(event.scene);invalidate();});
  }
  enabled=true;project();invalidate();return {bridges:count};
 }
 root.VeldrenBridgeScene={capture,migrate,getView,list,at,approach,height,point,outline,bounds,render,draw,mesh,selectables:list,get enabled(){return enabled;}};
})(globalThis);
