'use strict';
// Original editor geometry. Matrices use the canonical Scene's column-major
// convention. This module contains no Scene copies or renderer resources.
(function(root){
 const EPS=1e-9,add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=a=>Math.hypot(...a),unit=a=>{const n=length(a);if(n<EPS)throw Error('Degenerate direction');return mul(a,1/n);};
 const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 function multiply(a,b){const out=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
 function inverse(m){const a=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?m[c*4+r]:Number(c-4===r)));for(let i=0;i<4;i++){let p=i;for(let j=i+1;j<4;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;if(Math.abs(a[p][i])<EPS)throw Error('Singular transform');[a[p],a[i]]=[a[i],a[p]];const q=a[i][i];for(let c=0;c<8;c++)a[i][c]/=q;for(let j=0;j<4;j++)if(j!==i){const s=a[j][i];for(let c=0;c<8;c++)a[j][c]-=a[i][c]*s;}}return Array.from({length:16},(_,i)=>a[i%4][4+Math.floor(i/4)]);}
 const point=(m,p)=>[0,1,2].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);
 const vector=(m,p)=>[0,1,2].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]);
 function translation(p){const m=identity();m.splice(12,3,...p);return m;}
 function rotation(axis,angle){const [x,y,z]=unit(axis),c=Math.cos(angle),s=Math.sin(angle),t=1-c;return [t*x*x+c,t*x*y+s*z,t*x*z-s*y,0,t*x*y-s*z,t*y*y+c,t*y*z+s*x,0,t*x*z+s*y,t*y*z-s*x,t*z*z+c,0,0,0,0,1];}
 function orientation(m){
  // Gram-Schmidt removes inherited stretch/shear without introducing skewed
  // handles. Every manipulation retains the complete original affine matrix.
  const x=unit(m.slice(0,3)),rawY=m.slice(4,7),y=unit(sub(rawY,mul(x,dot(rawY,x)))),z=unit(cross(x,y));
  return [x,y,z];
 }
 function cameraRay(camera,x,y){
  const forward=unit(sub(camera.center,camera.eye)),right=unit(cross(forward,camera.up||[0,1,0])),up=cross(right,forward);
  const nx=camera.left+(camera.right-camera.left)*x,ny=camera.top+(camera.bottom-camera.top)*y;
  return {origin:[...camera.eye],direction:unit(add(mul(forward,camera.near),add(mul(right,nx),mul(up,ny))))};
 }
 function project(camera,p){const f=unit(sub(camera.center,camera.eye)),r=unit(cross(f,camera.up||[0,1,0])),u=cross(r,f),d=sub(p,camera.eye),z=dot(d,f);if(z<=EPS)return null;const x=dot(d,r)*camera.near/z,y=dot(d,u)*camera.near/z;return [(x-camera.left)/(camera.right-camera.left),(camera.top-y)/(camera.top-camera.bottom),z];}
 function plane(ray,origin,normal){const d=dot(ray.direction,normal);if(Math.abs(d)<EPS)return null;const t=dot(sub(origin,ray.origin),normal)/d;return t<0?null:add(ray.origin,mul(ray.direction,t));}
 function axisParameter(ray,origin,axis){const b=dot(ray.direction,axis),w=sub(ray.origin,origin),den=1-b*b;if(den<1e-5)return null;return (dot(axis,w)-b*dot(ray.direction,w))/den;}
 function boundsHit(ray,matrix,bounds){
  const inv=inverse(matrix),o=point(inv,ray.origin),d=vector(inv,ray.direction);let lo=0,hi=Infinity;
  for(let i=0;i<3;i++){if(Math.abs(d[i])<EPS){if(o[i]<bounds[0][i]||o[i]>bounds[1][i])return null;continue;}let a=(bounds[0][i]-o[i])/d[i],b=(bounds[1][i]-o[i])/d[i];if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(hi<lo)return null;}return lo;
 }
 function closestSegment(ray,a,b){const axis=unit(sub(b,a)),span=length(sub(b,a));let t=axisParameter(ray,a,axis);if(t===null)return null;t=Math.max(0,Math.min(span,t));const p=add(a,mul(axis,t)),depth=dot(sub(p,ray.origin),ray.direction);if(depth<0)return null;return {distance:length(sub(p,add(ray.origin,mul(ray.direction,depth)))),depth};}
 function handles(mode,pivot,axes,size){
  const out=[];for(let i=0;i<3;i++){
   if(mode==='rotate'){const a=axes[(i+1)%3],b=axes[(i+2)%3];out.push({id:'axis'+i,kind:'ring',axis:axes[i],index:i,points:Array.from({length:65},(_,j)=>add(pivot,mul(add(mul(a,Math.cos(j*Math.PI/32)),mul(b,Math.sin(j*Math.PI/32))),size)))});}
   else out.push({id:'axis'+i,kind:'axis',axis:axes[i],index:i,points:[add(pivot,mul(axes[i],size*.16)),add(pivot,mul(axes[i],size))]});
  }
  if(mode==='move')for(let i=0;i<3;i++){const a=axes[(i+1)%3],b=axes[(i+2)%3];out.push({id:'plane'+i,kind:'plane',normal:axes[i],index:i,points:[[.2,.2],[.42,.2],[.42,.42],[.2,.42]].map(([x,y])=>add(pivot,mul(add(mul(a,x),mul(b,y)),size)))});}
  if(mode==='scale')out.push({id:'uniform',kind:'uniform',points:[pivot],index:3});return out;
 }
 function hitHandle(ray,list,size){let best=null;for(const h of list){let hit=null;if(h.kind==='plane'){const p=plane(ray,h.points[0],h.normal);if(p){const a=sub(h.points[1],h.points[0]),b=sub(h.points[3],h.points[0]),q=sub(p,h.points[0]),x=dot(q,a)/dot(a,a),y=dot(q,b)/dot(b,b);if(x>=0&&x<=1&&y>=0&&y<=1)hit={distance:0,depth:dot(sub(p,ray.origin),ray.direction)};}}
   else if(h.kind==='uniform'){const depth=dot(sub(h.points[0],ray.origin),ray.direction);if(depth>=0)hit={distance:length(sub(h.points[0],add(ray.origin,mul(ray.direction,depth)))),depth};}
   else for(let i=1;i<h.points.length;i++){const q=closestSegment(ray,h.points[i-1],h.points[i]);if(q&&(!hit||q.distance<hit.distance))hit=q;}
   if(hit&&hit.distance<size*.075&&(!best||hit.depth<best.depth))best={...hit,handle:h};}return best?.handle||null;
 }
 const snap=(v,step)=>step>0?Math.round(v/step)*step:v;
 function beginDrag(mode,handle,ray,pivot,axes,size){
  const normal=handle.normal||handle.axis||ray.direction,hit=plane(ray,pivot,normal),parameter=handle.axis?axisParameter(ray,pivot,handle.axis):null;
  if(mode==='rotate'&&(!hit||length(sub(hit,pivot))<EPS))return null;
  if(mode!=='rotate'&&handle.axis&&parameter===null)return null;
  return {mode,handle,pivot:[...pivot],axes,size,normal,hit,parameter,angle:0,lastAngle:0};
 }
 function dragDelta(start,ray,snapping={}){
  const {mode,handle,pivot,axes,size}=start;let delta=identity();
  if(mode==='move'){
   let v;if(handle.axis){const p=axisParameter(ray,pivot,handle.axis);if(p===null)return null;v=mul(handle.axis,snap(p-start.parameter,snapping.translation));}
   else {const p=plane(ray,pivot,start.normal);if(!p||!start.hit)return null;const raw=sub(p,start.hit);v=axes.reduce((s,a)=>add(s,mul(a,snap(dot(raw,a),snapping.translation))),[0,0,0]);}return translation(v);
  }
  if(mode==='rotate'){
   const p=plane(ray,pivot,handle.axis);if(!p||length(sub(p,pivot))<EPS)return null;const a=unit(sub(start.hit,pivot)),b=unit(sub(p,pivot)),angle=Math.atan2(dot(handle.axis,cross(a,b)),dot(a,b));let step=angle-start.lastAngle;if(step>Math.PI)step-=2*Math.PI;if(step< -Math.PI)step+=2*Math.PI;start.angle+=step;start.lastAngle=angle;delta=rotation(handle.axis,snap(start.angle,snapping.rotation));
  }else{
   let amount;if(handle.axis){const p=axisParameter(ray,pivot,handle.axis);if(p===null)return null;amount=(p-start.parameter)/size;}
   else {const p=plane(ray,pivot,start.normal);if(!p||!start.hit)return null;amount=dot(sub(p,start.hit),axes[0])/size;}
   const scale=Math.max(.01,1+snap(amount,snapping.scale));
   if(handle.kind==='uniform'){delta[0]=delta[5]=delta[10]=scale;}
   else for(let c=0;c<3;c++)for(let r=0;r<3;r++)delta[c*4+r]+=(scale-1)*handle.axis[c]*handle.axis[r];
  }
  return multiply(translation(pivot),multiply(delta,translation(mul(pivot,-1))));
 }
 root.VeldrenEditorGeometry=Object.freeze({add,sub,mul,dot,cross,length,unit,identity,multiply,inverse,point,vector,translation,rotation,orientation,cameraRay,project,plane,axisParameter,boundsHit,handles,hitHandle,beginDrag,dragDelta});
})(globalThis);
