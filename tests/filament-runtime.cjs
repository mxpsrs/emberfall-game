'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {transformSync}=require('esbuild');

const root=path.join(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-filament-'));
const runtimeSource=fs.readFileSync(path.join(root,'dist/vendor/filament/filament.js'),'utf8')
 .replace('Filament = Object.assign(module, Filament);','Filament = Object.assign(module, Filament);globalThis.__VELDREN_FILAMENT_TEST__=Filament;');
fs.writeFileSync(path.join(temporary,'filament.cjs'),runtimeSource);
fs.copyFileSync(path.join(root,'dist/vendor/filament/filament.wasm'),path.join(temporary,'filament.wasm'));

global.window={};
const Factory=require(path.join(temporary,'filament.cjs'));
new Promise((resolve,reject)=>Factory.init([],async()=>{
 try{
  const F=global.__VELDREN_FILAMENT_TEST__;
  F.assets={material:new Uint8Array(fs.readFileSync(path.join(root,'dist/materials/veldren-world.filamat'))),terrainMaterial:new Uint8Array(fs.readFileSync(path.join(root,'dist/materials/veldren-terrain.filamat'))),atlas:new Uint8Array(fs.readFileSync(path.join(root,'dist/assets/realms/atlas-filament.png'))),'ground-surfaces':new Uint8Array(fs.readFileSync(path.join(root,'dist/assets/realms/ground-surfaces.png')))};
  F.Engine.create=surface=>{assert.deepEqual([surface.width,surface.height],[1864,860],'iOS canvas is sized before Filament creates its swap chain');return F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig());};
  // NOOP validates resource construction but cannot execute GPU mipmap
  // generation. Mobile must not invoke Filament's native PNG decoder.
  F.Engine.prototype.createTextureFromPng=function(){throw new Error('mobile native PNG decoding is forbidden');};
  F.Texture.prototype.generateMipmaps=function(){};
  let shadowOptions=null;const applyShadowOptions=F.LightManager$Builder.prototype.shadowOptions;
  F.LightManager$Builder.prototype.shadowOptions=function(options){shadowOptions={...options};return applyShadowOptions.call(this,options);};
  const parent={insertBefore(node){node.parentElement=this;this.node=node;}},world={parentElement:parent};
  const context={Filament:F,console,Math,Float32Array,Uint8Array,Uint16Array,Map,Set,WeakMap,Promise,Error,Number,Array,
   document:{createElement(){return {className:'',dataset:{},setAttribute(){},width:0,height:0};},getElementById(id){return id==='world'?world:null;}},
   VELDREN_FILAMENT_ASSETS:{material:'material',terrainMaterial:'terrainMaterial',atlas:'atlas',groundSurfaces:'ground-surfaces',groundSurfacesType:'png',atlasBytes:new Uint8Array(fs.readFileSync(path.join(root,'dist/assets/realms/atlas-filament-mobile.png'))),groundSurfacesBytes:new Uint8Array(fs.readFileSync(path.join(root,'dist/assets/realms/ground-surfaces-mobile.png')))},realmIdentityModel:new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),realmGroundedMatrix:model=>model,realmPixelScale:()=>2,
   screen:{w:932,h:430},px:10,py:20,view3d:{yaw:0},cameraPitch3:()=>.8,cameraZoom3:()=>32,cameraPose3:()=>({eye:[10.5,6,24],center:[10.5,1.12,20.5],near:.12,far:320,left:-.11,right:.11,bottom:-.05,top:.08}),currentScene:'overworld',time:1,realmGPU:null,painter3(){},project3(){},canvasPainterRealm(){return{};},navigator:{userAgent:'iPhone WebKit test'},
   realmLightingState:()=>({night:0,cave:0,house:0,lights:[{x:10,y:2,z:20,radius:8,intensity:1,color:[1,.5,.2]}]})};
  context.window=context;context.matchMedia=q=>({matches:q==='(pointer: coarse)'});vm.createContext(context);await require('./helpers/native-assets.cjs')(context,root);
  const rendererSource=transformSync(fs.readFileSync(path.join(root,'dist/renderer-filament.js'),'utf8'),{minifyWhitespace:true,legalComments:'none',target:'es2022'}).code;
  vm.runInContext(rendererSource,context,{filename:'renderer-filament.js'});
  let orientationBuilds=0;const buildOrientation=F.SurfaceOrientation$Builder.prototype.build;F.SurfaceOrientation$Builder.prototype.build=function(){orientationBuilds++;return buildOrientation.call(this);};
  const gpu=context.createRealmFilamentGPU(),raw=new Float32Array([
   0,0,0,0,1,0,1,0,0,1,0,0,
   1,0,0,0,1,0,0,1,0,1,1,0,
   0,0,1,0,1,0,0,0,1,1,0,1
  ]),buffer={data:raw},index={buffer:{data:new Uint16Array([0,1,2])}};
  const terrainBuffer={data:new Float32Array(raw)};
  // Exercise the live GPU skin path with actual Filament bindings. Palette
  // uploads must preserve row-major source transforms in column-major mat4s.
  const skinnedRaw=new Float32Array(60);
  for(let v=0;v<3;v++){skinnedRaw.set(raw.subarray(v*12,v*12+12),v*20);skinnedRaw[v*20+12]=v%2;skinnedRaw[v*20+16]=1;}
  const palette=new Float32Array([1,0,0,2,0,1,0,3,0,0,1,4,0,-1,0,5,1,0,0,6,0,0,1,7]),skinBuffer={data:skinnedRaw};
  let uploadedBones=null,boneCalls=0;const setBones=F.RenderableManager.prototype.setBonesFromMatrices;
  F.RenderableManager.prototype.setBonesFromMatrices=function(instance,bones,offset){uploadedBones=bones.map(m=>Array.from(m));boneCalls++;return setBones.call(this,instance,bones,offset);};
  const skinEntry={buffer:skinBuffer,index,stride:80,model:context.realmIdentityModel,palette};
  gpu.render([skinEntry],[],null);
  assert.equal(boneCalls,1);assert.deepEqual(uploadedBones[1],[0,1,0,0,-1,0,0,0,0,0,1,0,5,6,7,1]);
  gpu.render([skinEntry],[],null);assert.equal(boneCalls,1,'unchanged palettes skip another upload');
  gpu.render([{...skinEntry,palette:new Float32Array(palette)}],[],null);assert.equal(boneCalls,2,'a new animation pose uploads bones');
  assert.equal(gpu.skinning,true);assert.equal(gpu.engine.hasUnrecoverableFailure(),false);
  F.RenderableManager.prototype.setBonesFromMatrices=setBones;
  // Actual authored bodies/hair bind separate textured primitives on one rig.
  const characterContext=require('../scripts/benchmark-desktop.cjs').ctx;
  vm.runInContext(fs.readFileSync(path.join(root,'dist/renderer-gl.js'),'utf8').slice(fs.readFileSync(path.join(root,'dist/renderer-gl.js'),'utf8').indexOf('const realmTopologies='),fs.readFileSync(path.join(root,'dist/renderer-gl.js'),'utf8').indexOf('function realmAllowsGpuSkinning')),context);
  for(const sex of ['male','female']){
   const character=vm.runInContext(`avatarGpuPose('${sex}','walk',.35,{_appearance:{frame:'${sex}',skin:2,eyeColor:3,hair:5,hairColor:4,topStyle:6,bottomStyle:5}},0)`,characterContext),mesh=character.gpuMesh;
   const entry={...context.realmSkinnedEntry(gpu,mesh),palette:character.pose,model:context.realmIdentityModel,characterMesh:mesh};gpu.frameId++;
   try{gpu.render([entry],[],null);}catch(error){throw new Error('Character preparation '+sex+': '+error);}
   const waitLeases=mesh.materialParts.filter(part=>part.material).map(part=>gpu.materialResources.acquire(part.material,'browser-mobile',part.tint));
   await Promise.all(waitLeases.map(lease=>lease.ready));
   // The render resource also joins these shared leases through async part
   // callbacks and Promise.all; drain that finite chain before the next frame.
   for(let i=0;i<4;i++)await Promise.resolve();
   for(const lease of waitLeases)lease.release();try{gpu.render([entry],[],null);}catch(error){throw new Error('Textured character render '+sex+': '+error);}
   assert.equal(gpu.scene.getRenderableCount(),1,'textured '+sex+' character is a complete renderable');assert.equal(gpu.engine.hasUnrecoverableFailure(),false);
   entry.buffer.retire();gpu.releaseBuffer(entry.buffer);assert.equal(gpu.materialResources.diagnostics().leases,0,'character retirement releases every material');
  }
  gpu.render([{buffer,index,stride:48,model:context.realmIdentityModel,bossColor:2,dissolve:.1},{buffer:terrainBuffer,index,stride:48,model:context.realmIdentityModel,terrain:true}],Array.from(raw),null);
  assert.equal(gpu.kind,'filament');assert.equal(parent.node.dataset.renderer,'filament');assert.deepEqual([gpu.width,gpu.height],[1864,860]);assert.deepEqual(shadowOptions,{mapSize:1024,shadowCascades:1,stable:true,normalBias:.6,constantBias:.001,maxShadowDistance:80});
  for(let i=0;i<8;i++)gpu.render([],Array.from(raw),null);const before=orientationBuilds;
  for(let i=0;i<12;i++)gpu.render([],Array.from(raw),null);assert.equal(orientationBuilds,before,'steady dynamic normals reuse tangent staging across all three buffers');
  const changed=Array.from(raw);changed[3]=1;changed[4]=0;gpu.render([],changed,null);assert.equal(orientationBuilds,before+1,'changed normals rebuild tangent staging');
  assert.equal(context.VELDREN_FILAMENT_ASSETS.atlasBytes,null);assert.equal(context.VELDREN_FILAMENT_ASSETS.groundSurfacesBytes,null);
  assert.equal(gpu.scene.getRenderableCount(),1);assert.equal(gpu.scene.getLightCount(),2);assert.equal(gpu.engine.hasUnrecoverableFailure(),false);
  const originalIntensity=F.LightManager.prototype.setIntensity,pointSamples=[];
  F.LightManager.prototype.setIntensity=function(instance,power){originalIntensity.call(this,instance,power);if(this.isPointLight(instance))pointSamples.push({candela:this.getIntensity(instance),position:Array.from(this.getPosition(instance)),color:Array.from(this.getColor(instance)),radius:this.getFalloff(instance),shadows:this.isShadowCaster(instance)});};
  const lantern={x:10,y:2.75,z:20,radius:19,intensity:1.7,color:[1,.8,.51]},lighting={night:1,cave:0,house:0,lights:[lantern]};context.realmLightingState=()=>lighting;
  gpu.render([],Array.from(raw),null);const point=pointSamples.at(-1);
  assert.deepEqual(point.position,[10,2.75,20]);assert.equal(point.radius,19);assert.equal(point.shadows,false,'local lighting retains the existing shadow cost');assert(point.color[0]>point.color[1]&&point.color[1]>point.color[2],'authored warm light reaches Filament');
  // Native getIntensity returns candela. At four units from the lantern,
  // ground-facing illuminance must compete with the accepted night fill.
  const d2=4*4+lantern.y*lantern.y,cutoff=(1-(d2/(point.radius*point.radius))**2)**2,floorLux=point.candela*lantern.y/(d2*Math.sqrt(d2))*cutoff;
  const nightSun=context.realmFilamentLightingProfile(lighting).sun;assert(floorLux>nightSun,'a visible lamp illuminates nearby ground instead of only glowing itself');assert(floorLux<nightSun*4,'local light does not wash out the night');
  lantern.intensity=0;gpu.render([],Array.from(raw),null);assert.equal(gpu.scene.getLightCount(),1,'zero-strength sources fully stop illuminating');
  lantern.intensity=1.7;lighting.lights=Array.from({length:20},(_,i)=>({...lantern,x:10+i}));
  for(let i=0;i<30;i++)gpu.render([],Array.from(raw),null);assert.equal(gpu.scene.getLightCount(),9,'mobile retains eight point lights plus the sun');
  lighting.lights=[];gpu.render([],Array.from(raw),null);assert.equal(gpu.scene.getLightCount(),1,'scene light removal leaves no active emitter');
  F.LightManager.prototype.setIntensity=originalIntensity;
  assert.equal(gpu.textureResources.diagnostics().textures,2);context.VeldrenAssets.destroy();assert.equal(gpu.textureResources.diagnostics().textures,0);
  console.log('Filament 1.77 runtime verified: local light '+floorLux.toFixed(1)+' lux at four units, native color/position/falloff, zero/off transitions and bounded mobile lights.');resolve();
 }catch(error){reject(error);}
})).finally(()=>fs.rmSync(temporary,{recursive:true,force:true})).catch(error=>{console.error(error);process.exitCode=1;});
