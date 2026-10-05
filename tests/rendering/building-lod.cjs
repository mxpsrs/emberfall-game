'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {ctx,vm,fs}=require('../../scripts/qa/game-fixture.cjs');
const root=path.resolve(__dirname,'../..'),run=s=>vm.runInContext(s,ctx);
const load=name=>run(fs.readFileSync(path.join(root,'client',name+'.js'),'utf8'));
const decode=(v,T)=>ArrayBuffer.isView(v)?v:new T(Uint8Array.from(atob(v),c=>c.charCodeAt(0)).buffer);
async function main(){
 Object.assign(ctx,{setTimeout,clearTimeout,URL,performance,requestAnimationFrame:f=>setTimeout(f,0)});
 const assets=await require('../helpers/native-assets.cjs')(ctx,root);
 for(const name of ['building-assembly','building-runtime','building-lod'])load(name);
 run('setupExpandedWorld();setupTutorialVillage();setupLoot();VeldrenBuildings=window.VeldrenBuildings;VeldrenBuildings.install();');
 assets.bindLegacy('rebuilt',run('rebuiltModels'));assets.bindLegacy('briar',run('briarModels'));
 const houses=run('worldScenes.overworld.buildings.filter(b=>b.briarDesign)'),plans=new Map(),leases=[];
 assert.equal(houses.length,12);
 async function plan(id){if(!plans.has(id)){const lease=assets.leaseModel(id);leases.push(lease);plans.set(id,lease.ready.then(model=>assets.renderPlan(model)));}return plans.get(id);}
 const report={kind:'canonical geometry submissions; not GPU draw calls or FPS',buildings:[]};let first;
 for(const house of houses){
  ctx.house=house;run('VeldrenBuildings.ensure(house,worldScenes.overworld)');
  const before=JSON.stringify(ctx.VeldrenAssembly.serialize(house.assembly)),cached=ctx.VeldrenBuildings.rendered(house),modules=[];let nearTriangles=0;
  for(const i of cached.instances){const id=i.mesh.canonicalAsset;assert(id);const original=await plan(id);nearTriangles+=original.geometry.reduce((sum,p)=>sum+p.indexCount/3,0);const far=assets.record(id).lods?.at(-1)?.asset||id;modules.push({id:far,matrix:i.matrix,plan:await plan(far)});}
  const merged=ctx.VeldrenBuildingLOD.merge('qa:'+house.x+':'+house.y,modules);
  assert(merged.draws.length<merged.stats.sourceDraws);assert(merged.stats.triangles<=nearTriangles);
  assert.equal(JSON.stringify(ctx.VeldrenAssembly.serialize(house.assembly)),before,'render plans never edit authored modules');
  const materials=new Map();for(const m of modules)for(const d of m.plan.draws){const p=m.plan.geometry.find(p=>p.key===d.geometry);let list=materials.get(d.material);if(!list)materials.set(d.material,list=[]);list.push(p);}
  for(const d of merged.draws){const p=merged.geometry.find(p=>p.key===d.geometry);let offset=0;
   for(const source of materials.get(d.material)){const vertices=decode(source.vertices,Float32Array);for(let v=0;v<source.count;v++)for(let a=3;a<23;a++)assert.equal(p.vertices[(v+offset)*23+a],vertices[v*23+a],'all colors and eight UV channels survive');offset+=source.count;}
   assert.equal(offset,p.count);assert(p.indices.every(i=>i<p.count));assert(p.vertices.every(Number.isFinite));
   for(let v=0;v<p.count;v++){assert(Math.abs(Math.hypot(...p.normals.subarray(v*3,v*3+3))-1)<1e-5);assert(Math.abs(Math.hypot(...p.tangents.subarray(v*4,v*4+3))-1)<1e-5);}
  }
  report.buildings.push({name:house.name||house.briarDesign,x:house.x,z:house.y,modules:modules.length,...merged.stats,nearTriangles});
  if(!first)first={cached,modules,merged};
 }
 report.totals=report.buildings.reduce((a,b)=>{for(const key of ['modules','sourceDraws','draws','nearTriangles','triangles','bytes'])a[key]=(a[key]||0)+b[key];return a;},{});
 // Nonuniform mirrored geometry must keep front faces and tangent handedness.
 const source=first.modules[0],mirror=[-2,0,0,3,0,3,0,2,0,0,.5,4];
 const mirrored=ctx.VeldrenBuildingLOD.merge('mirror',[{...source,matrix:mirror},{...source,matrix:mirror}]);
 assert(mirrored.geometry.every(p=>p.vertices.every(Number.isFinite)));
 const firstDraw=source.plan.draws[0],firstPacket=source.plan.geometry.find(p=>p.key===firstDraw.geometry),sourceIndices=decode(firstPacket.indices,Uint32Array),sourceTangents=decode(firstPacket.tangents,Float32Array),mirroredPacket=mirrored.geometry[0];
 assert.deepEqual(Array.from(mirroredPacket.indices.subarray(0,3)),[sourceIndices[0],sourceIndices[2],sourceIndices[1]],'mirrored triangles preserve their front face');assert.equal(mirroredPacket.tangents[3],-sourceTangents[3],'mirrored tangent handedness follows winding');
 assert.throws(()=>ctx.VeldrenBuildingLOD.merge('too-large',first.modules,16),/budget/);
 assert.throws(()=>ctx.VeldrenBuildingLOD.merge('singular',[{...source,matrix:new Array(12).fill(0)},source]),/Singular/);
 // Exercise selection, hysteresis, ground invalidation and owner retirement.
 const callbacks={},retired=[];let acquired=0,released=0;
 const mock={has:assets.has,record:assets.record,onReload:f=>(callbacks.reload=f,()=>{}),onDispose:f=>(callbacks.dispose=f,()=>{}),leaseBuildingPlan(id,modules,maxBytes){assert(first.merged.stats.bytes<=maxBytes,'the complete inn fits the mobile per-building limit');acquired++;return {ready:Promise.resolve(first.merged),release(){released++;}};}};
 const manager=ctx.VeldrenBuildingLOD.create(mock,id=>retired.push(id),'browser-mobile'),cached=first.cached;
 ctx.landHeight=()=>0;run('px=-1000;py=-1000;screen.h=600;');
 const far={eye:[cached.model[3]+200,70,cached.model[11]+200]},near={eye:[cached.model[3],5,cached.model[11]]};
 manager.begin('overworld');assert.equal(manager.request(cached,'house',near,'g1'),null);assert.equal(acquired,0);
 manager.request(cached,'house',far,'g1');await new Promise(resolve=>setImmediate(resolve));
 manager.begin('overworld');const descriptor=manager.request(cached,'house',far,'g1');assert(descriptor);assert.equal(acquired,1);assert.equal(released,1);manager.active(descriptor);assert.equal(manager.diagnostics().active,1);
 assert.equal(manager.request(cached,'house',near,'g1'),null,'near views keep detailed modules');
 ctx.VELDREN_CONTEXT='editor';assert.equal(manager.request(cached,'house',far,'g1'),null);delete ctx.VELDREN_CONTEXT;
 ctx.VeldrenBuildings.floorFilter={isolate:true};assert.equal(manager.request(cached,'house',far,'g1'),null);ctx.VeldrenBuildings.floorFilter=null;
 manager.begin('overworld');assert.equal(manager.request(cached,'house',far,'g2'),null);assert.equal(retired.length,1);await new Promise(resolve=>setImmediate(resolve));
 for(let n=0;n<4;n++){manager.request(cached,'budget:'+n,far,'g2');await new Promise(resolve=>setImmediate(resolve));}
 assert(manager.diagnostics().retainedBytes<=manager.diagnostics().budgetBytes);assert(manager.diagnostics().skipped.some(e=>/cache budget/.test(e)),'excess plans keep detailed rendering within the retained-memory cap');
 manager.begin('interior');assert.equal(manager.diagnostics().retainedBytes,0);assert.equal(manager.diagnostics().cached,0);
 callbacks.reload();manager.destroy();assert.equal(acquired,released);
 for(const lease of leases)lease.release();assert.equal(assets.diagnostics().dependencyLeases,0);assets.destroy();
 fs.mkdirSync(path.join(root,'.qa'),{recursive:true});fs.writeFileSync(path.join(root,'.qa/building-lod-geometry.json'),JSON.stringify(report,null,2));
 console.log('PASS: 12 Briar Haven canonical building plans, colors/UVs/materials, transformed normals/tangents, memory cap, authored immutability, near/editor selection and retirement.');console.log(JSON.stringify(report.totals));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
