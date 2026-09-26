'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'../dist/'),wasm=fs.readFileSync(base+'native/veldren-core.wasm'),plain=value=>JSON.parse(JSON.stringify(value));
async function boot(saved){
 const ctx={console,addEventListener(){},WebAssembly,DataView,TextEncoder,TextDecoder,fetch:async()=>({ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),realmAssetURL:p=>p,landHeight:()=>0,walkSurfaceHeight:()=>0,prop3(r,o,x,z){r.face([[x,0,z],[x+1,0,z],[x,1,z]],'#fff');return 1;}};ctx.window=ctx;vm.createContext(ctx);
 const run=code=>vm.runInContext(code,ctx),load=file=>run(fs.readFileSync(base+file+'.js','utf8'));
 run(`const exit={id:17,type:'exit',name:'Leave cave',x:5,y:7,sprite:13,passageKind:'ladder',dead:0};const sceneSizes={overworld:[96,84],cave:[20,30],cellar:[12,15]};const worldScenes={overworld:{title:'World',entry:[14,17],objects:[],buildings:[]},cave:{title:'Cave',subtitle:'Original',openAir:false,entry:[5,6],objects:[exit],buildings:[],exit},cellar:{title:'Cellar',entry:[6,12],objects:[],buildings:[],civilFloor:true,exterior:'overworld',returnAt:[8,9]}};const realmSceneInfo=new Map([['cave',{id:'cave',title:'Cave',kind:'mine',race:'dwarf',settlement:'town',building:{name:'Retired mine shell',kingdom:'iron'}}]]);const CREATURE_LAIRS={cave:{title:'Cave',subtitle:'Original',entry:[5,6],size:[20,30],openAir:false,theme:'crystal',fog:[.1,.2,.3],rooms:[['rect',1,1,18,28]],arena:[10,10],boss:'boss-a',spawn:[10,12]}};let currentScene='cave',objects=[exit];`);
 load('native-runtime');await ctx.realmNativeReady;for(const f of ['building-assembly','world-ownership-runtime','world-building-scene','world-light-scene','world-metadata-scene'])load(f);
 const n=ctx.realmNative.scenes,I=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
 if(saved)assert(n.load(saved));else{
  assert(n.load({format:'veldren.world',version:2,scenes:[{format:'veldren.scene',version:2,scene:'cellar',entities:[{id:'generated:cellar:root',name:'World',parent:null,active:true,transform:I(),components:{WorldGeneration:{}},metadata:{}},{id:'stair',name:'Stairs up',parent:'generated:cellar:root',active:true,transform:{...I(),position:[7,0,12]},components:{GeneratedProp:{generationKey:'stair',legacyCatalogId:'23'}},metadata:{civilStair:{destination:'overworld',entry:[8,9]}}}]}]}));
  run(`worldScenes.cellar.exit=VeldrenSceneOwnership.createView('cellar',realmNative.scenes.entity('cellar','stair'),'23');worldScenes.cellar.objects=[worldScenes.cellar.exit];`);
 }
 const report=await ctx.VeldrenMetadataScene.migrate();return {ctx,run,n,report};
}
async function main(){
 const {ctx,run,n,report}=await boot();assert.deepEqual(plain(report),{scenes:3,entries:3,exits:1});
 assert.equal(run('worldScenes.cave.exit.id'),17);assert.equal(run('worldScenes.cellar.exit._sceneEntityId'),'stair','existing stair is referenced, not cloned');
 const root='generated:cave:root',entry=root+':entry',exitId=run('worldScenes.cave.exit._sceneEntityId');
 run(`worldScenes.cave.title='Edited cave';sceneSizes.cave[0]=25;worldScenes.cave.entry[0]=8;CREATURE_LAIRS.cave.fog[1]=.8;worldScenes.cellar.returnAt[1]=11;`);
 assert.equal(n.entity('cave',root).components.SceneInfo.title,'Edited cave');assert.equal(run('realmSceneInfo.get("cave").title'),'Edited cave');assert.equal(run('CREATURE_LAIRS.cave.title'),'Edited cave');assert.equal(run('realmSceneInfo.get("cave").kingdom'),'iron','retired exterior kingdom persists in SceneInfo');assert.equal(run('realmSceneInfo.get("cave").building'),undefined,'retired shells are not resurrected as buildings');
 assert.equal(n.entity('cave',root).components.SceneBounds.size[0],25);assert.equal(n.entity('cave',entry).worldMatrix[12],8);assert.equal(n.entity('cave',root).components.SceneEnvironment.fog[1],.8);assert.equal(n.entity('cellar','generated:cellar:root').components.SceneNavigation.returnAt[1],11);
 assert.throws(()=>run('realmSceneInfo.clear()'),/Scene/);assert.throws(()=>run('worldScenes.cave.entry.push(3)'),{name:'TypeError'});assert.throws(()=>run('worldScenes.cave.entry=[NaN,3]'),/finite/);assert.throws(()=>run('worldScenes.cave.exit={id:17}'),/reference/);
 assert(n.setTransform('cave',root,{position:[10,0,20],rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2],scale:[2,2,2]}));const position=plain(run('worldScenes.cave.entry'));assert(Math.abs(position[0]-22)<1e-8&&Math.abs(position[1]-4)<1e-8,'entry follows parent rotation/scale');
 run('worldScenes.cave.entry=[30,40]');assert.deepEqual(plain(run('CREATURE_LAIRS.cave.entry')),[30,40]);assert(Math.abs(n.entity('cave',entry).transform.position[0]+10)<1e-8,'world entry writes preserve hierarchy');
 assert(n.setWorldTransform('cave',exitId,{position:[20,2,30],rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2],scale:[2,2,2]}));assert.equal(run('worldScenes.cave.exit.x'),20);assert(Math.abs(run('worldScenes.cave.exit.y')-30)<1e-8);
 const faces=[];ctx.prop3({face:p=>faces.push(p)},run('worldScenes.cave.exit'),20.5,30.5);assert(Math.abs(faces[0][0][0]-21)<1e-8&&Math.abs(faces[0][0][2]-29)<1e-8,'exit mesh uses native rotation and scale');
 const modified=plain(n.entity('cave',root));modified.components.SceneInfo.subtitle='Native edit';modified.components.SceneBounds.size=[40,50];assert(n.upsert('cave',modified));assert.equal(run('CREATURE_LAIRS.cave.subtitle'),'Native edit');assert.deepEqual(plain(run('sceneSizes.cave')),[40,50]);
 const saved=n.serialize();assert(n.load({format:'veldren.world',version:2,scenes:[]}));assert.equal(run('worldScenes.cave.title'),undefined);assert.equal(run('worldScenes.cave.exit'),undefined);assert.equal(run('worldScenes.cave.entry'),undefined);assert.equal(run('realmSceneInfo.size'),0);
 assert(n.load(saved));assert.equal(JSON.stringify(n.serialize()),JSON.stringify(saved));assert.equal(run('worldScenes.cave.exit.id'),17);assert.equal(run('realmSceneInfo.get("cave").title'),'Edited cave');
 assert(n.remove('cave',exitId));assert.equal(run('worldScenes.cave.exit'),undefined);await ctx.VeldrenMetadataScene.migrate();assert.equal(run('worldScenes.cave.objects.filter(o=>o.type==="exit").length'),0);
 const restored=await boot(n.serialize());assert.equal(restored.report.scenes,0);assert.equal(restored.run('worldScenes.cave.title'),'Edited cave');assert.equal(restored.run('worldScenes.cave.objects.filter(o=>o.type==="exit").length'),0,'fresh generator respects saved exit deletion');assert.deepEqual(plain(restored.run('worldScenes.cave.entry')),[30,40]);
 console.log('PASS: native metadata, scene bounds and entry hierarchy, shared realm/lair views, canonical stair/exit references, exit mesh transforms, guarded membership, save/unload/load and authoritative saved boot.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
