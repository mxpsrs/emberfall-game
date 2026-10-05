'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'../../client/'),wasm=fs.readFileSync(base+'native/veldren-core.wasm'),plain=v=>JSON.parse(JSON.stringify(v));
const I=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]}),close=(a,b,label='number')=>assert(Math.abs(a-b)<1e-8,label+': '+a+' != '+b);
async function fixture(saved=null,editor=false){
 const ctx={console,addEventListener(){},WebAssembly,DataView,TextEncoder,TextDecoder,fetch:async()=>({ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),realmAssetURL:p=>p};ctx.window=ctx;if(editor)ctx.VELDREN_CONTEXT='editor';vm.createContext(ctx);const run=s=>vm.runInContext(s,ctx),load=f=>run(fs.readFileSync(base+f+'.js','utf8'));
 run(`let currentScene='overworld',invalidations=0;const worldScenes={overworld:{objects:[],buildings:[]}},realmNavigation=new Map(),settlementPlans=new Map(),SETTLEMENTS=[];let surfaceQuarries=[{id:'west',name:'West quarry',x:50,y:60,rx:20,ry:20,levels:2,level:8,type:'local',town:'west',ores:['copper']},{id:'east',name:'East quarry',x:120,y:80,rx:27,ry:25,levels:3,level:10,type:'regional',town:'east',ores:['iron']}];const organicRoads=[];function gradeLand(x,z,h){return h;}function gradeRoadLand(x,z,h){return h;}function resetLandSurface(){}const landHeights=new Map(),realmGPU={terrain:new Map([['overworld',new Map()]]),gl:{deleteBuffer(){invalidations++}}};`);
 const civil=fs.readFileSync(base+'civilization-world.js','utf8');run(civil.slice(civil.indexOf('function quarryAt('),civil.indexOf('const civilWallBefore=')));
 const props=fs.readFileSync(base+'prop-placement.js','utf8');run(props.slice(props.indexOf('let propWorkPads='),props.indexOf('function propPrepareWorkPads(')));
 run(`propFootingsReady=true;propWorkPads.push({x:58,y:87,rx:7,ry:6,height:7,reason:'Loading apron',quarry:'west'},{x:60,y:88,rx:2,ry:2,height:6,reason:'Second work pad',quarry:'west'},{x:58,y:87,rx:1,ry:1,height:5,reason:'Crane footing',supportOnly:true,objectId:77});propSupportPads.push(propWorkPads[2]);for(const p of propWorkPads)propIndexPad(p);`);
 const baseline=run(`(()=>{const out=[];for(const q of surfaceQuarries)for(let x=q.x-q.rx-13;x<q.x+q.rx+14;x+=2.3)for(let y=q.y-q.ry-13;y<q.y+q.ry+14;y+=2.7)out.push({x,y,id:quarryAt(x,y,14)?.id,edge:quarryShapeEdge(q,x,y),depth:quarryDepth(q,x,y),cliff:quarryCliff(q,x,y),key:q.id,grade:gradeLand(x,y,2),footing:propWorkFootingHeight(x,y,2)});return out;})()`);
 load('terrain-editor-runtime');load('native-runtime');load('editor/commands');await ctx.realmNativeReady;for(const f of ['building-assembly','world-ownership-runtime','world-building-scene','world-quarry-scene'])load(f);
 const n=ctx.realmNative.scenes;
 for(const row of [
  {id:'generated:overworld:root',name:'World',components:{WorldGeneration:{}},transform:I()},
  {id:'crane',name:'Crane',components:{GeneratedProp:{legacyCatalogId:77}},metadata:{quarry:'west'},transform:{...I(),position:[58,0,87],rotation:[0,Math.sin(.2),0,Math.cos(.2)]}},
  {id:'ore',name:'Copper',components:{CatalogIdentity:{id:88,scene:'overworld'},ResourcePlacement:{quarry:'west'},Gatherable:{type:'ore',resourceId:'copper'}},transform:{...I(),position:[40,0,56]}},
  {id:'office',name:'Office',components:{SettlementMember:{quarry:'west'}},transform:{...I(),position:[65,0,90]}},
  {id:'office-child',name:'Desk',parent:'office',components:{GeneratedProp:{legacyCatalogId:99}},metadata:{quarry:'west'},transform:{...I(),position:[2,0,3]}}
 ])assert(n.upsert('overworld',{parent:null,active:true,metadata:{},...row}));
 ctx.VeldrenQuarryScene.capture();if(saved)assert(n.load(saved));const report=await ctx.VeldrenQuarryScene.migrate();return {ctx,run,n,report,baseline,q:ctx.VeldrenQuarryScene};
}
async function main(){
 for(const editor of [false,true]){
  const f=await fixture(null,editor),{ctx,run,n,q}=f;assert.deepEqual(plain(f.report),{quarries:2,pads:3,attached:3});assert(Object.isFrozen(run('surfaceQuarries')));assert(Object.isFrozen(run('propWorkPads')));assert.throws(()=>run('surfaceQuarries.pop()'),/read only|delete|extensible/);
  const west=run("surfaceQuarries.find(q=>q.id==='west')"),id=west._sceneEntityId;
  for(const old of f.baseline){const view=run('surfaceQuarries').find(q=>q.id===old.key),sample=q.sample(old.x,old.y,0,view);close(sample.edge,old.edge,'edge');close(sample.depth,old.depth,'depth');close(q.sample(old.x+.5,old.y+.5,0,view).cliff,old.cliff,'cliff');assert.equal(q.at(old.x,old.y,14)?.id,old.id);ctx.testPoint=old;close(run('gradeLand(testPoint.x,testPoint.y,2)'),old.grade,'grade');close(run('propWorkFootingHeight(testPoint.x,testPoint.y,2)'),old.footing,'footing');}
  assert.equal(n.entity('overworld','ore').parent,id);assert.equal(n.entity('overworld','ore').components.CatalogIdentity.id,88);assert.equal(n.entity('overworld','office-child').parent,'office','preserve existing internal hierarchy');close(n.entity('overworld','crane').worldMatrix[12],58);close(n.entity('overworld','office-child').worldMatrix[14],93);
  const support=run('propSupportPads[0]');assert.equal(n.entity('overworld',support._sceneEntityId).parent,'crane');close(support.height,5);
  run("realmGPU.terrain.get('overworld').set('8:50:60',{x:50,z:60,buffer:1});landHeights.set(1,123);realmNavigation.set('overworld',{});");
  const transform={position:[200,3,250],rotation:[0,Math.sin(Math.PI/8),0,Math.cos(Math.PI/8)],scale:[2,3,4]};assert(n.setTransform('overworld',id,transform));
  const A=ctx.VeldrenAssembly,m=ctx.VeldrenBuildingScene.matrices.row(n.entity('overworld',id).worldMatrix),p=A.point(m,[-10,0,-4]),ramp=A.point(m,[0,0,12]);
  assert.equal(q.at(p[0],p[2])._sceneEntityId,id);assert(!q.at(50,60));assert(q.rampAt(ramp[0],ramp[2]));assert(!q.rampAt(50,72));
  close(n.entity('overworld','ore').worldMatrix[12],p[0]);close(n.entity('overworld','ore').worldMatrix[14],p[2]);close(q.sample(p[0],p[2]).height,3+3*(8-q.sample(p[0],p[2]).depth),'parent elevation/scale');
  const padPoint=A.point(m,[8,0,27]);close(q.padHeight(padPoint[0],padPoint[2],0,true),18,'transformed crane support');close(q.padHeight(58,87,2,true),2,'old pad index discarded');assert.equal(run("realmGPU.terrain.get('overworld').get('8:50:60').complete"),false,'edited terrain is scheduled to rebuild while its old mesh remains visible');assert.equal(run('landHeights.size'),0);assert.equal(run('realmNavigation.size'),0);

  if(editor){
   // Run the production editor selection/transform functions against real
   // native quarry and pad views, including the distinct pad surface height.
   const editorSource=fs.readFileSync(base+'editor/editor-runtime.js','utf8');
   run(`let ready=true,buildingContext=null,sceneDocumentDirty=false;const buildings=[],objects=[],snap={position:0,rotation:0};function sceneObjects(){return []}function sceneBuildings(){return []}function ensureBase(ref){return {x:ref.entity.x,y:ref.entity.y}}function invalidate(){}function recordChange(){}const editorCommands=createVeldrenEditorCommands(window.realmNative.scenes,()=>String(currentScene),()=>{});function commandSystem(){return editorCommands}const snapValue=(v,s)=>s?Math.round(v/s)*s:v;`);
   for(const name of ['protectedObject','refForObject','resolveRef','entityRotation','entityScale','entityInfo','allEntities','setEntityTransform']){
    const start=editorSource.indexOf(' function '+name+'('),end=editorSource.indexOf('\n function ',start+1);assert(start>=0&&end>start,name);run(editorSource.slice(start,end));
   }
   assert(run("allEntities().some(e=>e.id==='west'&&e.protected)"));assert.equal(run("resolveRef('object','west').entity._sceneEntityId"),id);
   ctx.padId=support._sceneEntityId;const before=n.entity('overworld',ctx.padId).worldMatrix;ctx.padElevation=before[13];
   run("setEntityTransform(resolveRef('object',padId),{x:310,y:320,rotation:30,scale:1.5})");close(n.entity('overworld',ctx.padId).worldMatrix[13],ctx.padElevation,'editor preserves transform elevation, not pad surface height');assert(n.setWorldTransform('overworld',ctx.padId,{...I(),affine:Array.from(before)}));
  }
  const before=q.sample(p[0],p[2]).height;west.level=11;assert(q.sample(p[0],p[2]).height>before);assert.equal(n.entity('overworld',id).components.Quarry.level,11);
  const changed=plain(n.entity('overworld',id));changed.active=false;assert(n.upsert('overworld',changed));assert(!q.at(p[0],p[2]));close(q.padHeight(padPoint[0],padPoint[2],2,true),2,'inactive parent removes pads');assert(!Array.from(run('surfaceQuarries')).some(v=>v._sceneEntityId===id));changed.active=true;assert(n.upsert('overworld',changed));
  const invalid=plain(changed);invalid.components.Quarry.rx=0;assert(n.upsert('overworld',invalid));assert.equal(n.quarrySample('overworld',p[0],p[2],0,id),null);assert(n.upsert('overworld',changed));assert.equal(n.quarrySample('overworld',NaN,0),null);assert.equal(n.quarryRampAt('overworld',Infinity,0),false);close(n.terrainPadHeight('missing',0,0,9),9);
  const saved=n.serialize();assert(n.load({format:'veldren.world',version:2,scenes:[]}));assert.equal(run('surfaceQuarries.length'),0);assert(n.load(saved));assert.equal(JSON.stringify(n.serialize()),JSON.stringify(saved));
  // Native graph deletion owns the whole worksite; a saved deletion is never
  // recreated by the old generator on fresh runtime or editor boot.
  assert(n.remove('overworld',id));assert(!n.entity('overworld','ore'));assert(!n.entity('overworld',support._sceneEntityId));const deleted=n.serialize(),fresh=await fixture(deleted,editor);assert.equal(fresh.report.quarries,0);assert.equal(fresh.report.pads,0);assert.equal(JSON.stringify(fresh.n.serialize()),JSON.stringify(deleted));
  fresh.ctx.realmNative.destroy();ctx.realmNative.destroy();
 }
 console.log('PASS: native quarry/pad ownership, terrain and cliff parity, worksite hierarchy, catalog identities, transformed cuts/ramps/supports, activation, cache invalidation and authoritative saved runtime/editor boot.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
