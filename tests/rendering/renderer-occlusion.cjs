'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={performance};vm.createContext(c);vm.runInContext(fs.readFileSync('client/renderer-occlusion.js','utf8'),c);
const O=c.VeldrenOcclusion,I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],camera={eye:[0,0,0],center:[0,0,-1],near:.1,left:-.1,right:.1,bottom:-.1,top:.1};
const material={alphaMode:'OPAQUE',doubleSided:true,shader:'materials/veldren-pbr-lit-opaque.filamat'};
function plan(rects){const vertices=[],indices=[];for(const [x0,x1,y0,y1,z] of rects){const at=vertices.length/23;for(const p of [[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]])vertices.push(...p,...Array(20).fill(0));indices.push(at,at+1,at+2,at,at+2,at+3);}return {geometry:[{key:'wall',stride:92,vertices:new Float32Array(vertices),indices:new Uint32Array(indices),bounds:{center:[0,0,-5],halfExtent:[20,20,.01]}}],draws:[{geometry:'wall',material:'opaque',matrix:I}]};}
function source(rects,mat=material){return {data:O.compile(plan(rects),()=>mat),matrix:I,castShadows:true,renderables:1};}
function box(x=0,y=0,z=-10,castShadows=false){return {data:{bounds:{center:[x,y,z],halfExtent:[.2,.2,.2]}},matrix:I,castShadows,renderables:2};}
function run(records,cam=camera,opts={}){const controller=O.create('browser',{budgetMs:1000,maxChecks:1000000,...opts}),hidden=controller.evaluate(cam,records);return {hidden,stats:controller.diagnostics()};}
const wall=source([[-6,6,-6,6,-5]]),target=box();
assert.equal(wall.data.polygons.length,14,'shared triangles merge to one quad');
assert(run([wall,target]).hidden.includes(target));assert(!run([wall,box(0,0,-3)]).hidden.length,'nearer object stays');
const singleSided=source([[-6,6,-6,6,-5]],{...material,doubleSided:false});assert(run([singleSided,target]).hidden.includes(target),'paired faces preserve the original front winding');
const backwards=plan([[-6,6,-6,6,-5]]);backwards.geometry[0].indices=new Uint32Array([0,2,1,0,3,2]);
assert(!run([{data:O.compile(backwards,()=>({...material,doubleSided:false})),matrix:I,castShadows:true},target]).hidden.includes(target),'GPU-culled backfaces cannot supply coverage');
const opening=source([[-6,-.5,-6,6,-5],[.5,6,-6,6,-5],[-.5,.5,1,6,-5],[-.5,.5,-6,-1,-5]]);
assert(!run([opening,target]).hidden.includes(target),'opening never becomes solid');assert(!run([wall,box(12)]).hidden.length,'partial silhouette stays');
for(const alphaMode of ['MASK','BLEND'])assert(!run([source([[-6,6,-6,6,-5]],{...material,alphaMode}),target]).hidden.length);
assert(!run([wall,box(0,0,-.1)]).hidden.length,'near plane crossing stays');
const bad={...target,matrix:[...I]};bad.matrix[0]=NaN;assert(!run([wall,bad]).hidden.length);
const mirrored={...wall,matrix:[...I]};mirrored.matrix[0]=-1;assert(!run([mirrored,target]).hidden.length);
const moved={...camera,eye:[20,0,0],center:[20,0,-1]};assert(!run([wall,target],moved).hidden.includes(target),'camera movement reveals in same frame');
const controller=O.create('browser',{budgetMs:1000,maxChecks:1000000});assert(controller.evaluate(camera,[wall,target]).includes(target));assert(!controller.evaluate(camera,[target]).length,'source removal reveals immediately');assert(!controller.evaluate(camera,[wall,target],true).length,'editor/kill switch fail open');
assert(!run([wall,target],camera,{maxChecks:0}).hidden.length,'budget exhaustion keeps object visible');
const shadowTarget=box(0,0,-10,true);assert(!run([wall,shadowTarget]).hidden.includes(shadowTarget),'main-hidden object still casting visible sun shadow stays');
const roof=source([[-100,100,-100,100,-5]]);assert(run([roof,shadowTarget]).stats.shadowGuarded>0);
const f=[.55,-1,-.38],fl=Math.hypot(...f);for(let a=0;a<3;a++)f[a]/=fl;
const right=[-f[2],0,f[0]],rl=Math.hypot(...right);for(let a=0;a<3;a++)right[a]/=rl;
const up=[f[1]*right[2]-f[2]*right[1],f[2]*right[0]-f[0]*right[2],f[0]*right[1]-f[1]*right[0]],center=[0,0,-10].map((v,a)=>v-f[a]*30),sunPoints=[[-30,-30],[30,-30],[30,30],[-30,30]].map(([x,y])=>center.map((v,a)=>v+right[a]*x+up[a]*y));
const sunBlocker={data:{bounds:{center,halfExtent:[50,50,50]},polygons:new Float64Array([4,1,...sunPoints.flat()])},matrix:I,castShadows:true,renderables:1};
assert(run([wall,sunBlocker,shadowTarget]).hidden.includes(shadowTarget),'caster may be skipped only with both camera and expanded sun coverage');
assert(!run([wall,{...sunBlocker,castShadows:false},shadowTarget]).hidden.includes(shadowTarget),'a noncaster cannot supply shadow coverage');
const cached=O.create('browser',{budgetMs:1000,maxChecks:1000000}),mutable={...target,matrix:[...I]};
assert(cached.evaluate(camera,[wall,mutable]).includes(mutable));assert(cached.evaluate(camera,[wall,mutable]).includes(mutable));assert(cached.diagnostics().reused);
mutable.matrix[12]=20;assert(!cached.evaluate(camera,[wall,mutable]).includes(mutable),'in-place transform mutation invalidates exact reuse');assert(!cached.diagnostics().reused);
assert(!run([wall,target],camera,{budgetMs:0}).hidden.length,'zero time allowance fails open');
// Independent ray/triangle oracle: every random point on a culled bound must
// intersect original solid triangles before reaching the point, including doors.
function rayHit(p,rects){return rects.some(([x0,x1,y0,y1,z])=>{const t=z/p[2];return t>0&&t<1&&p[0]*t>x0&&p[0]*t<x1&&p[1]*t>y0&&p[1]*t<y1;});}
let seed=9123;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let culled=0,oracleRays=0;
for(let n=0;n<300;n++){const rects=n%2?[[-6,-.5,-6,6,-5],[.5,6,-6,6,-5]]:[[-6,6,-6,6,-5]],b=box((random()-.5)*24,(random()-.5)*24,-6-random()*12),r=run([source(rects),b]);if(!r.hidden.includes(b))continue;culled++;for(let k=0;k<80;k++){const p=b.data.bounds.center.map(v=>v+(random()-.5)*.4);assert(rayHit(p,rects),'false cull in independent ray oracle');oracleRays++;}}
assert(culled>30);assert(wall.data.bytes<=128*14*8+48);
console.log(JSON.stringify({occludedObjects:culled,independentVisibilityRays:oracleRays,coverageCells:160*90,sunCells:128*128}));
console.log('PASS: solid coverage, door/window gaps, alpha exclusion, near plane, camera/source reveals, budget, reflection and shadow guard.');
