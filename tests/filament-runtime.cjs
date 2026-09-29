'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');

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
   screen:{w:932,h:430},px:10,py:20,view3d:{yaw:0},cameraPitch3:()=>.8,cameraZoom3:()=>32,currentScene:'overworld',time:1,realmGPU:null,painter3(){},project3(){},canvasPainterRealm(){return{};},navigator:{userAgent:'iPhone WebKit test'},
   realmLightingState:()=>({night:0,cave:0,house:0,lights:[{x:10,y:2,z:20,radius:8,intensity:1,color:[1,.5,.2]}]})};
  context.window=context;context.matchMedia=q=>({matches:q==='(pointer: coarse)'});vm.createContext(context);await require('./helpers/native-assets.cjs')(context,root);vm.runInContext(fs.readFileSync(path.join(root,'dist/renderer-filament.js'),'utf8'),context,{filename:'renderer-filament.js'});
  let orientationBuilds=0;const buildOrientation=F.SurfaceOrientation$Builder.prototype.build;F.SurfaceOrientation$Builder.prototype.build=function(){orientationBuilds++;return buildOrientation.call(this);};
  const gpu=context.createRealmFilamentGPU(),raw=new Float32Array([
   0,0,0,0,1,0,1,0,0,1,0,0,
   1,0,0,0,1,0,0,1,0,1,1,0,
   0,0,1,0,1,0,0,0,1,1,0,1
  ]),buffer={data:raw},index={buffer:{data:new Uint16Array([0,1,2])}};
  const terrainBuffer={data:new Float32Array(raw)};
  gpu.render([{buffer,index,stride:48,model:context.realmIdentityModel,bossColor:2,dissolve:.1},{buffer:terrainBuffer,index,stride:48,model:context.realmIdentityModel,terrain:true}],Array.from(raw),null);
  assert.equal(gpu.kind,'filament');assert.equal(parent.node.dataset.renderer,'filament');assert.deepEqual([gpu.width,gpu.height],[1864,860]);assert.deepEqual(shadowOptions,{mapSize:1024,shadowCascades:1,stable:true,normalBias:.8,constantBias:.001,maxShadowDistance:80});
  for(let i=0;i<8;i++)gpu.render([],Array.from(raw),null);const before=orientationBuilds;
  for(let i=0;i<12;i++)gpu.render([],Array.from(raw),null);assert.equal(orientationBuilds,before,'steady dynamic normals reuse tangent staging across all three buffers');
  const changed=Array.from(raw);changed[3]=1;changed[4]=0;gpu.render([],changed,null);assert.equal(orientationBuilds,before+1,'changed normals rebuild tangent staging');
  assert.equal(context.VELDREN_FILAMENT_ASSETS.atlasBytes,null);assert.equal(context.VELDREN_FILAMENT_ASSETS.groundSurfacesBytes,null);
  assert.equal(gpu.scene.getRenderableCount(),1);assert.equal(gpu.scene.getLightCount(),2);assert.equal(gpu.engine.hasUnrecoverableFailure(),false);
  assert.equal(gpu.textureResources.diagnostics().textures,2);context.VeldrenAssets.destroy();assert.equal(gpu.textureResources.diagnostics().textures,0);
  console.log('Filament 1.77 iPhone-sized runtime, capped backing surface, mobile shadows, textures, geometry and render pass verified');resolve();
 }catch(error){reject(error);}
})).finally(()=>fs.rmSync(temporary,{recursive:true,force:true})).catch(error=>{console.error(error);process.exitCode=1;});
