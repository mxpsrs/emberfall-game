'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ctx}=require('../../scripts/qa/game-fixture.cjs');ctx.assert=assert;
vm.runInContext(fs.readFileSync('client/building-assembly.js','utf8'),ctx);
vm.runInContext(`
currentScene='overworld';px=10;py=20;screen.w=1112;screen.h=512;
walkSurfaceHeight=()=>0;landHeight=()=>0;buildings.length=0;
Object.assign(view3d,{yaw:0,tilt:.25,zoom:102});
const A=VeldrenAssembly,wall={bounds:[[-1,0,-.05],[1,3.1,.05]],p:new Float32Array([-1,0,0,1,0,0,1,3.1,0,-1,3.1,0]),i:new Uint16Array([0,1,2,0,2,3])};
const front=A.transform(10.5,0,22),back=A.transform(10.5,0,18),side=A.transform(16,0,22),initial=JSON.stringify({wall,front,back,side});
assert(cameraMeshHidden3(wall,front),'foreground wall is cut away');
assert(!cameraMeshHidden3(wall,back),'the far wall remains visible');
assert(!cameraMeshHidden3(wall,side),'unrelated walls remain visible');
const eye=cameraPose3().eye,inside=A.transform(eye[0],eye[1]-1,eye[2]);
assert(cameraMeshHidden3(wall,inside),'geometry containing the eye is cut away');
const tree={bounds:[[-1,0,-1],[1,6,1]]};
assert(cameraMeshHidden3(tree,front),'a tree between eye and character cannot fill the view');
const face={points:[[9.5,0,22],[11.5,0,22],[11.5,3.1,22],[9.5,3.1,22]],color:'#705443'},farFace={points:[[9.5,0,18],[11.5,0,18],[11.5,3.1,18],[9.5,3.1,18]],color:'#705443'};
const faces=[face,farFace];assert.deepEqual(cameraVisibleFaces3(faces),[farFace]);assert.strictEqual(cameraVisibleFaces3(faces),cameraVisibleFaces3(faces),'unchanged visibility reuses its face list');
const floor={points:[[8,0,18],[14,0,18],[14,0,26],[8,0,26]],color:'#808080'};assert.deepEqual(cameraVisibleFaces3([floor]),[floor],'the walkable floor remains visible');
assert(cachedMesh3({},'prop',r=>r.face(face.points,face.color)).cameraOcclusion,'cave and city wall chunks participate in cutaways');
assert(!cachedMesh3({type:'villager'},'prop',()=>0).cameraOcclusion,'cached residents remain visible');
assert(!cachedMesh3({type:'enemy'},'prop',()=>0).cameraOcclusion,'cached creatures remain visible');
const shape={kind:'assembly',height:3.1,model:A.identity(),faces:[],instances:[{mesh:wall,matrix:front},{mesh:wall,matrix:back},{mesh:wall,matrix:side}]};
const emitted=[];emitMesh3({cameraCutaways:true,indexed:(mesh,m)=>emitted.push(m),face(){}},shape);
assert.equal(emitted.length,2,'software rendering keeps only the far and unrelated walls');
const authored=[];emitMesh3({indexed:(mesh,m)=>authored.push(m),face(){}},shape);assert.equal(authored.length,3,'asset capture retains all authored geometry regardless of camera position');
const screenPoint=project3(10.5,1.12,20.5);
assert.equal(buildingPick3({...shape,instances:[shape.instances[0]]},screenPoint.x,screenPoint.y),null,'a cutaway wall cannot intercept ground clicks');
assert.equal(pickGeometry3([{cached:{...shape,instances:[shape.instances[0]],cameraOcclusion:true}}],screenPoint.x,screenPoint.y),null,'cached pick geometry follows the same cutaway');
const before=cameraPose3();view3d.yaw=Math.PI;meshFrame3++;
assert(!cameraMeshHidden3(wall,front),'the wall returns after rotating away');
assert(cameraMeshHidden3(wall,back),'the opposite wall now blocks the view');
assert.equal(cameraPose3().distance,before.distance,'rotating around a room preserves the selected zoom');
assert.equal(JSON.stringify({wall,front,back,side}),initial,'cutaways never mutate authored geometry');
view3d.yaw=0;meshFrame3++;front[3]=16;
assert(!cameraMeshHidden3(wall,front),'in-place matrix edits invalidate the obstruction cache');
front[3]=10.5;assert(cameraMeshHidden3(wall,front));
landHeight=()=>10;landSurfaceRevision++;meshFrame3++;
assert(!cameraMeshHidden3(wall,front),'terrain edits reground the cached obstruction');
landHeight=()=>0;landSurfaceRevision++;meshFrame3++;
assert(cameraMeshHidden3(wall,front));
`,ctx);
// Exercise submission through both production painters with a bounded GPU fixture.
for(const backend of ['gl','filament']){
 if(backend==='filament')vm.runInContext(fs.readFileSync('client/renderer-filament.js','utf8'),ctx);
 ctx.backend=backend;
 vm.runInContext(`{
 var submitted=null;realmGPU={kind:backend,cache:new WeakMap(),assemblyTransforms:new WeakMap(),assemblyFaces:new Map(),frameId:0,gl:{deleteBuffer(){}},beginFrameWork(){},canonicalEntry(mesh,model){return {mesh,model};},upload(data){return {buffer:{data},count:data.length/12};},render(entries){submitted=entries;}};
 realmTerrainEntries=()=>[];trimRealmMeshes=()=>{};trimStaticMeshes3=()=>{};realmMeshEntry=(gpu,mesh)=>({mesh});
 const painter=painter3(null,project3);painter.cached(shape);painter.flush();
 assert.equal(submitted.length,2,backend+' submits only visible wall modules');
 assert(submitted.every(entry=>!cameraMeshHidden3(entry.mesh,entry.model)));
 }`,ctx);
}
console.log('PASS: indoor and outdoor wall/tree cutaways, eye containment, restored geometry, terrain/matrix invalidation, software/GL/Filament submission and matching picking.');
