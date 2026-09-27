import assert from 'node:assert/strict';
import '../dist/editor/geometry.js';
const G=globalThis.VeldrenEditorGeometry,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),vec=(a,b)=>a.forEach((x,i)=>near(x,b[i]));
const camera={eye:[8,6,11],center:[1,2,0],near:.25,left:-.2,right:.2,top:.32,bottom:-.08};
for(const xy of [[.5,.5],[.1,.2],[.9,.8]]){const ray=G.cameraRay(camera,...xy),p=G.add(ray.origin,G.mul(ray.direction,20));vec(G.project(camera,p).slice(0,2),xy);}
const axes=[[1,0,0],[0,1,0],[0,0,1]],pivot=[0,0,0],aim=p=>({origin:[7,5,9],direction:G.unit(G.sub(p,[7,5,9]))});
for(let i=0;i<3;i++){
 const h=G.handles('move',pivot,axes,2)[i],start=G.beginDrag('move',h,aim(G.mul(axes[i],1)),pivot,axes,2),delta=G.dragDelta(start,aim(G.mul(axes[i],2.26)),{translation:.5});
 vec(G.point(delta,pivot),G.mul(axes[i],1.5));
}
for(const h of G.handles('move',pivot,axes,2).filter(h=>h.kind==='plane')){
 const a=axes[(h.index+1)%3],b=axes[(h.index+2)%3],p=G.add(G.mul(a,.6),G.mul(b,.6)),q=G.add(p,G.add(G.mul(a,1.12),G.mul(b,-.62))),start=G.beginDrag('move',h,aim(p),pivot,axes,2);
 vec(G.point(G.dragDelta(start,aim(q),{translation:.5}),pivot),G.add(G.mul(a,1),G.mul(b,-.5)));
}
const rotationHandle=G.handles('rotate',pivot,axes,2)[2],start=G.beginDrag('rotate',rotationHandle,aim([2,0,0]),pivot,axes,2);
vec(G.point(G.dragDelta(start,aim([0,2,0]),{rotation:Math.PI/4}),[1,0,0]),[0,1,0]);
// Affine parent stretch, rotation and shear must round-trip after world deltas.
const stretch=G.identity();stretch[0]=2;stretch[5]=.5;stretch[10]=3;stretch[4]=.3;
const parent=G.multiply(G.translation([3,8,-2]),G.multiply(G.rotation([0,1,0],.7),stretch));
const child=G.multiply(G.translation([2,1,4]),G.rotation([1,0,0],.4)),world=G.multiply(parent,child);
for(const delta of [G.translation([2,-1,5]),G.rotation([0,1,0],.3)]){const expected=G.multiply(delta,world),local=G.multiply(G.inverse(parent),expected);vec(G.multiply(parent,local),expected);}
const localAxes=G.orientation(world);for(let i=0;i<3;i++){near(G.length(localAxes[i]),1);near(G.dot(localAxes[i],localAxes[(i+1)%3]),0);}
const target=G.point(world,[0,0,0]),ray=aim(target),hit=G.boundsHit(ray,world,[[-1,-1,-1],[1,1,1]]);assert.ok(hit>0);
assert.equal(G.boundsHit({origin:[100,100,100],direction:[1,0,0]},world,[[-1,-1,-1],[1,1,1]]),null);
assert.equal(G.plane({origin:[0,1,0],direction:[1,0,0]},pivot,[0,1,0]),null);
assert.equal(G.axisParameter({origin:[0,1,0],direction:[1,0,0]},pivot,[1,0,0]),null);
for(const mode of ['move','rotate','scale'])assert.ok(G.handles(mode,pivot,axes,2).length>=3);
console.log('Editor geometry: camera rays, axis/plane snapping, rotation, affine parents and transformed bounds pass');
