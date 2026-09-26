'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {ctx}=require('../scripts/game-fixture.cjs');
const run=source=>vm.runInContext(source,ctx),load=file=>run(fs.readFileSync(path.join(__dirname,'../dist',file+'.js'),'utf8'));
async function main(){
 const wasm=fs.readFileSync(path.join(__dirname,'../dist/native/veldren-core.wasm'));
 Object.assign(ctx,{WebAssembly,DataView,TextEncoder,TextDecoder,fetch:async()=>({ok:true,status:200,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}),realmAssetURL:p=>'/'+p});
 load('native-runtime');await ctx.window.realmNativeReady;ctx.realmNative=ctx.window.realmNative;ctx.realmNativeReady=ctx.window.realmNativeReady;
 for(const file of ['building-assembly','building-runtime','world-scene-format','world-ownership-runtime','world-building-scene','world-scenery-scene','world-road-scene'])load(file);
 ctx.VeldrenBuildings=ctx.window.VeldrenBuildings;
 run('setupExpandedWorld();setupTutorialVillage();setupLoot();VeldrenSceneOwnership.captureGenerationIdentity();VeldrenBuildingScene.capture(worldScenes);');
 run('VeldrenWorldEdits={state:{world:VeldrenSceneFormat.fromLegacy({version:1,revision:0,changes:[]})}};VeldrenSceneFormat.attachRuntimeWorld(VeldrenWorldEdits.state.world,worldScenes);');
 await ctx.VeldrenSceneOwnership.migrateStaticProps();
 const registry=run('worldScenes'),raw=registry.overworld.buildings.find(b=>b.civilUpper&&b.service),count=Object.values(registry).reduce((n,w)=>n+w.buildings.length,0);
 const origin={x:raw.x,y:raw.y,id:raw._generatedBuildingId,doorId:raw.service.id,doorX:raw.service.x,doorY:raw.service.y,ramp:{...raw.civilUpper.ramp},deck:{...raw.civilUpper.decks[0]}};
 const shape=b=>{ctx.testBuilding=b;return run(`(()=>{const faces=[],instances=[];building3({face(points){faces.push(points)},indexed(mesh,matrix){instances.push({bounds:mesh.bounds,matrix})}},testBuilding);return JSON.stringify({faces,instances});})()`)};
 const beforeGeometry=shape(raw),result=await ctx.VeldrenBuildingScene.migrate(),native=ctx.realmNative.scenes;
 assert.equal(result.buildings,count);assert(result.parts>count,'buildings have room/wall/deck/door child entities');
 const b=registry.overworld.buildings.find(b=>b._sceneEntityId===origin.id);assert(b?._generatedBuildingEntity);assert.equal(b.service.id,origin.doorId,'network-visible door catalog identity preserved');assert.equal(b.service.building,b);
 assert.equal(b.service.x,origin.doorX);assert.equal(b.civilUpper.ramp.x,origin.ramp.x);assert.equal(b.civilUpper.decks[0].y,origin.deck.y);
 const compare=(a,b,path='geometry')=>{if(typeof a==='number'){assert(Math.abs(a-b)<1e-7,path+': '+a+' != '+b);return;}assert.deepEqual(Object.keys(a||{}),Object.keys(b||{}),path+' shape');for(const key of Object.keys(a||{}))compare(a[key],b[key],path+'.'+key);};compare(JSON.parse(shape(b)),JSON.parse(beforeGeometry));
 const decorationCount=Object.values(registry).reduce((n,w)=>n+(w.decor?.length||0),0),sceneryResult=await ctx.VeldrenSceneryScene.migrate();assert.equal(sceneryResult.decorations,decorationCount);
 const roadResult=await ctx.VeldrenRoadScene.migrate();assert(roadResult.roads>100,'full procedural road network');assert(registry.tutorial.roads.length>0,'Firstlight streets materialized before ownership transfer');
 const doc=native.serialize(),all=doc.scenes.flatMap(s=>s.entities);assert.equal(all.filter(e=>e.components.GeneratedBuilding).length,count);assert(all.some(e=>e.components.DoorState));
 for(const scene of doc.scenes){const ids=new Set(scene.entities.map(e=>e.id));assert.equal(ids.size,scene.entities.length);for(const e of scene.entities)if(e.parent)assert(ids.has(e.parent),'valid parent '+e.id);}
 const oldDoor={x:b.service.x,y:b.service.y},attached=registry.overworld.objects.find(o=>o.type==='prop'&&native.entity('overworld',o._sceneEntityId)?.parent===origin.id),oldProp=attached&&{x:attached.x,y:attached.y};
 const transform={position:[b.x+8,0,b.y+9],rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2],scale:[2,2,2]};assert(native.setTransform('overworld',origin.id,transform));
 const dx=oldDoor.x-origin.x,dz=oldDoor.y-origin.y;assert(Math.abs(b.service.x-(origin.x+8+2*dz))<1e-7);assert(Math.abs(b.service.y-(origin.y+9-2*dx))<1e-7,'door follows building rotation and scale');
 if(attached){assert(Math.abs(attached.x-(origin.x+8+2*(oldProp.y-origin.y)))<1e-7,'attached prop follows hierarchy');}
 const surface=b.civilUpper,deck=surface.decks[0],point=ctx.VeldrenAssembly.point(ctx.VeldrenBuildingScene.matrices.row(native.entity('overworld',deck._sceneEntityId).worldMatrix),[.5,0,.5]);
 assert(ctx.VeldrenBuildingScene.surfaceAt(surface,point[0],point[2]),'rotated/scaled deck participates in canonical collision/height queries');
 b.service.openedAt=12;assert.equal(native.entity('overworld',b.service._sceneEntityId).components.DoorState.open,true);delete b.service.openedAt;assert.equal(native.entity('overworld',b.service._sceneEntityId).components.DoorState.open,false);
 const assembled=ctx.VeldrenBuildingScene.ensureAssembly(b);assert(assembled.modules.length>0,'building edit creates canonical module entities');
 const part=assembled.modules.find(m=>m.role==='wall'&&!m.objectId);assert(part,'representative wall module');const partBefore=part.local[3];part.local[3]=partBefore+.25;
 assert(Math.abs(b.assembly.modules.find(m=>m.id===part.id).local[3]-(partBefore+.25))<1e-9,'module writes flow to canonical Transform');
 const rendered=ctx.VeldrenBuildingScene.renderAssembly(b);assert(rendered.instances.length>0,'module renderer resolves canonical asset references');
 const saved=native.serialize();assert(native.load({format:'veldren.world',version:2,scenes:[]}));assert.equal(registry.overworld.buildings.length,0,'unload drops derived building views');assert(native.load(saved));
 assert.equal(JSON.stringify(native.serialize()),JSON.stringify(saved),'complete generated building hierarchy/components/transforms round-trip');
 const restored=registry.overworld.buildings.find(b=>b._sceneEntityId===origin.id);assert(restored);assert.equal(restored.service.id,origin.doorId);
 const restoredDoor=restored.service._sceneEntityId;assert(native.remove('overworld',origin.id));assert(!registry.overworld.buildings.some(b=>b._sceneEntityId===origin.id));assert(!registry.overworld.objects.some(o=>o._sceneEntityId===restoredDoor));
 console.log('PASS: '+count+' buildings, '+result.parts+' parts, '+result.doors+' doors plus '+decorationCount+' lair decorations and '+roadResult.roads+' road segments: Scene ownership, geometry parity, hierarchy propagation, door catalog/state, surfaces and save/unload/load.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
