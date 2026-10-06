'use strict';
// Presentation only. Native visibility still selects Scene entities. This pass
// removes complete GPU instances only after current-frame solid coverage proves
// their entire bounds are hidden. Missing data and exhausted budgets stay visible.
(function(root){
 const point=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const n=Math.hypot(...a);return n>1e-8?a.map(v=>v/n):null;};
 const determinant=m=>dot([m[0],m[1],m[2]],cross([m[4],m[5],m[6]],[m[8],m[9],m[10]]));
 function corners(bounds,m){const out=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])out.push(point(m,bounds.center.map((v,a)=>v+bounds.halfExtent[a]*[x,y,z][a])));return out;}
 function compile(plan,materialPlan,limit=128){
  // Compile in the preparation worker, not in the frame loop. Exact shared
  // edges may merge two triangles; projected convexity is checked at raster time.
  const polygons=[],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],packets=new Map(plan.geometry.map(p=>[p.key,p]));
  for(const draw of plan.draws){const p=packets.get(draw.geometry),m=draw.matrix;if(!p?.bounds||draw.skin||p.joints||!m||m.some(v=>!Number.isFinite(v)))return null;
   for(const v of corners(p.bounds,m))for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],v[a]);hi[a]=Math.max(hi[a],v[a]);}
   const material=materialPlan(draw.material);
   if(material.alphaMode!=='OPAQUE'||material.shader!=='materials/veldren-pbr-lit-opaque.filamat'||determinant(m)<=0)continue;
   const vertices=p.vertices,indices=p.indices;if(!ArrayBuffer.isView(vertices)||!ArrayBuffer.isView(indices))continue;
   const stride=p.stride/4,triangles=[],edges=new Map(),keys=new Map();
   const vertex=i=>{let v=keys.get(i);if(!v){const offset=i*stride;v=point(m,[vertices[offset],vertices[offset+1],vertices[offset+2]]);keys.set(i,v);}return v;};
   // Bound preparation too: selecting a subset never adds false coverage.
   const end=Math.min(indices.length,Math.max(96,Math.floor(limit*24/plan.draws.length/3)*3));
   for(let i=0;i+2<end;i+=3){const points=[vertex(indices[i]),vertex(indices[i+1]),vertex(indices[i+2])];if(points.flat().some(v=>!Number.isFinite(v)))continue;
    const t={points,used:false},id=triangles.length;triangles.push(t);
    for(let e=0;e<3;e++){const a=points[e].join(','),b=points[(e+1)%3].join(','),reverse=edges.get(b+'|'+a);
     if(reverse&&!triangles[reverse.id].used&&!t.used){const other=triangles[reverse.id];other.used=t.used=true;const q=[other.points[(reverse.e+2)%3],points[(e+1)%3],points[(e+2)%3],points[e]];polygons.push({points:q,doubleSided:!!material.doubleSided});}
     else edges.set(a+'|'+b,{id,e});
    }

   }
   for(const t of triangles)if(!t.used)polygons.push({points:t.points,doubleSided:!!material.doubleSided});
  }
  if(lo.concat(hi).some(v=>!Number.isFinite(v)))return null;
  // Double precision retains canonical transformed vertex locations. This small
  // cache is released with its existing plan owner and transferred without copies.
  const area=p=>{let sum=0;for(let i=1;i+1<p.points.length;i++)sum+=Math.hypot(...cross(p.points[i].map((v,a)=>v-p.points[0][a]),p.points[i+1].map((v,a)=>v-p.points[0][a])));return sum;};
  polygons.sort((a,b)=>area(b)-area(a));polygons.length=Math.min(polygons.length,limit);
  const data=new Float64Array(polygons.length*14);polygons.forEach((p,i)=>{const at=i*14;data[at]=p.points.length;data[at+1]=p.doubleSided?1:0;data.set(p.points.flat(),at+2);});
  return {bounds:{center:lo.map((v,a)=>(v+hi[a])/2),halfExtent:lo.map((v,a)=>(hi[a]-v)/2)},polygons:data,bytes:data.byteLength+48};
 }
 function projection(camera,width,height,sun=false){
  const forward=unit(sun?[.55,-1,-.38]:camera.center.map((v,a)=>v-camera.eye[a]));if(!forward)return null;
  const right=unit(cross(forward,[0,1,0]));if(!right)return null;const up=cross(right,forward),origin=sun?camera.center:camera.eye;
  const near=camera.near,left=camera.left,rightEdge=camera.right,bottom=camera.bottom,top=camera.top;
  if(!sun&&![near,left,rightEdge,bottom,top,...origin].every(Number.isFinite)||!sun&&(near<=0||rightEdge<=left||top<=bottom))return null;
  return {width,height,sun,project(p){const v=p.map((x,a)=>x-origin[a]),depth=dot(v,forward),x=dot(v,right),y=dot(v,up);if(![depth,x,y].every(Number.isFinite)||!sun&&depth<=near+.02)return null;
   return sun?[(x/256+.5)*width,(y/256+.5)*height,depth+512]:[(near*x/depth-left)/(rightEdge-left)*width,(near*y/depth-bottom)/(top-bottom)*height,depth];
  }};
 }
 function create(profile,options={}){
  const width=160,height=90,shadowSize=128,depth=new Float64Array(width*height),shadow=new Float64Array(shadowSize*shadowSize),now=options.now||(()=>root.performance?.now?.()??Date.now()),budgetMs=options.budgetMs??(profile==='browser-mobile'?1.5:2.5),maxChecks=options.maxChecks??90000,maxPolygons=options.maxPolygons??512;
  let stats={},checks=0,started=0,exhausted=false,rasterLimited=false,previous=null;
  function tick(){if(++checks>maxChecks||!(checks%256)&&now()-started>=budgetMs){exhausted=true;return false;}return true;}
  function raster(points,doubleSided,projection,buffer){
   const p=points.map(v=>projection.project(v));if(p.some(v=>!v))return;
   let sign=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],c=p[(i+2)%p.length],area=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(area)<1e-9)return;const s=Math.sign(area);if(sign&&s!==sign)return;sign=s;}
   if(!doubleSided&&sign<0)return;
   const x0=Math.max(0,Math.ceil(Math.min(...p.map(v=>v[0])))),x1=Math.min(projection.width-1,Math.floor(Math.max(...p.map(v=>v[0])))-1),y0=Math.max(0,Math.ceil(Math.min(...p.map(v=>v[1])))),y1=Math.min(projection.height-1,Math.floor(Math.max(...p.map(v=>v[1])))-1),far=Math.max(...p.map(v=>v[2]))+.05;
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(checks>=maxChecks*.6||!(checks%256)&&now()-started>=budgetMs*.55){rasterLimited=true;return;}if(!tick())return;let inside=true;
    for(let i=0;i<p.length&&inside;i++){const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1],margin=1e-4*Math.hypot(dx,dy);
     // The minimum edge function over all four cell corners is sufficient.
     const min=sign*(dx*(y-a[1])-dy*(x-a[0]))+Math.min(0,sign*dx)+Math.min(0,-sign*dy);if(min<=margin)inside=false;
    }
    if(inside){const at=y*projection.width+x;buffer[at]=Math.min(buffer[at],far);}
   }
  }
  function covered(points,projection,buffer){
   const p=points.map(v=>projection.project(v));if(p.some(v=>!v))return false;
   // Camera: expand by a full cell. Sun: also guard normal bias, filtering
   // and the sun's angular radius across the renderer's 95m shadow range.
   const margin=projection.sun?5:1,x0=Math.floor(Math.min(...p.map(v=>v[0])))-margin,x1=Math.ceil(Math.max(...p.map(v=>v[0])))+margin,y0=Math.floor(Math.min(...p.map(v=>v[1])))-margin,y1=Math.ceil(Math.max(...p.map(v=>v[1])))+margin,near=Math.min(...p.map(v=>v[2]))-(projection.sun?2:.05);
   if(x0<0||y0<0||x1>=projection.width||y1>=projection.height)return false;
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!tick()||buffer[y*projection.width+x]>=near)return false;
   return true;
  }
  function evaluate(camera,records,disabled=false){
   started=now();checks=0;exhausted=false;rasterLimited=false;
   const cameraKey=[...camera.eye,...camera.center,camera.near,camera.left,camera.right,camera.bottom,camera.top];
   if(!disabled&&previous&&records.length===previous.records.length&&cameraKey.every((v,i)=>v===previous.camera[i])&&records.every((r,i)=>{const p=previous.records[i];return r.data?.bounds===p.bounds&&r.data?.polygons===p.polygons&&r.castShadows===p.castShadows&&r.matrix?.every((v,a)=>v===p.matrix[a]);})){
    stats={...previous.stats,reused:true,ms:Math.max(0,now()-started)};return previous.hidden.map(i=>records[i]);
   }
   previous=null;stats={candidates:records.length,tested:0,hiddenObjects:0,hiddenRenderables:0,shadowGuarded:0,polygons:0,checks:0,ms:0,budgetExhausted:false,rasterLimited:false,reused:false,disabled:!!disabled};
   const result=[];if(disabled||!records.length)return result;const main=projection(camera,width,height),sun=projection(camera,shadowSize,shadowSize,true);if(!main||!sun)return result;depth.fill(Infinity);shadow.fill(Infinity);
   // Reuse only an exactly identical camera, complete instance inventory, source
   // geometry and transforms. A changed input never inherits temporal coverage.
   const valid=[];
   for(const r of records){if(valid.length>=4096||!(valid.length%64)&&now()-started>=budgetMs*.4){exhausted=true;break;}if(!r.data?.bounds||!r.matrix||r.matrix.some(v=>!Number.isFinite(v))||determinant(r.matrix)<=0)continue;
    const bounds=corners(r.data.bounds,r.matrix);valid.push({record:r,bounds,distance:Math.hypot(...r.matrix.slice(12,15).map((v,a)=>v-camera.eye[a]))});
   }
   valid.sort((a,b)=>a.distance-b.distance);
   for(const {record:r} of valid){const data=r.data.polygons;if(!data)continue;for(let at=0;at<data.length;at+=14){if(!(stats.polygons%16)&&now()-started>=budgetMs*.55)rasterLimited=true;if(exhausted||rasterLimited||stats.polygons>=maxPolygons)break;const points=[];for(let n=0;n<data[at];n++)points.push(point(r.matrix,data.subarray(at+2+n*3,at+5+n*3)));stats.polygons++;raster(points,!!data[at+1],main,depth);if(r.castShadows&&!exhausted&&!rasterLimited)raster(points,!!data[at+1],sun,shadow);}if(exhausted||rasterLimited)break;}
   for(const {record:r,bounds} of valid){if(exhausted)break;stats.tested++;if(!covered(bounds,main,depth))continue;
    if(r.castShadows&&!covered(bounds,sun,shadow)){stats.shadowGuarded++;continue;}result.push(r);stats.hiddenObjects++;stats.hiddenRenderables+=r.renderables||1;
   }
   stats.checks=checks;stats.ms=Math.max(0,now()-started);stats.budgetExhausted=exhausted;stats.rasterLimited=rasterLimited;
   if(records.length<=4096&&!exhausted&&(result.length||!rasterLimited))previous={camera:cameraKey,records:records.map(r=>({bounds:r.data?.bounds,polygons:r.data?.polygons,castShadows:r.castShadows,matrix:Array.from(r.matrix||[])})),hidden:result.map(r=>records.indexOf(r)),stats:{...stats}};
   return result;
  }
  return {evaluate,diagnostics:()=>({...stats})};
 }
 root.VeldrenOcclusion={compile,create};
})(globalThis);
