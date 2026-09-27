'use strict';
// The real Filament NOOP backend checks renderer behavior without a GPU.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

const root=path.join(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-static-render-'));
const source=fs.readFileSync(path.join(root,'dist/vendor/filament/filament.js'),'utf8')
 .replace('Filament = Object.assign(module, Filament);','Filament = Object.assign(module, Filament);globalThis.__VELDREN_TEST_FILAMENT__=Filament;');
fs.writeFileSync(path.join(temporary,'filament.cjs'),source);
fs.copyFileSync(path.join(root,'dist/vendor/filament/filament.wasm'),path.join(temporary,'filament.wasm'));
global.window={};
const Factory=require(path.join(temporary,'filament.cjs'));
new Promise((resolve,reject)=>Factory.init([],async()=>{
 try{
  const F=global.__VELDREN_TEST_FILAMENT__;
  F.Engine.create=()=>F.Engine._create(F.Backend.NOOP,F.Engine.createDefaultConfig());
  const textures=new Uint8Array(fs.readFileSync(path.join(root,'dist/assets/realms/ground-surfaces-mobile.png')));
  const parent={insertBefore(node){node.parentElement=this;}},world={parentElement:parent};
  let groundHeight=0,transforms=0;
  const original=F.TransformManager.prototype.setTransform;
  F.TransformManager.prototype.setTransform=function(...args){transforms++;return original.apply(this,args);};
  const context={Filament:F,console,Math,Float32Array,Uint8Array,Uint16Array,Map,Set,WeakMap,Promise,Error,Number,Array,
   document:{createElement(){return {className:'',dataset:{},style:{},setAttribute(){},width:0,height:0};},getElementById(id){return id==='world'?world:null;}},
   VELDREN_FILAMENT_ASSETS:{material:new Uint8Array(fs.readFileSync(path.join(root,'dist/materials/veldren-world.filamat'))),terrainMaterial:new Uint8Array(fs.readFileSync(path.join(root,'dist/materials/veldren-terrain.filamat'))),atlasBytes:textures,groundSurfacesBytes:textures},
   realmIdentityModel:new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),realmPixelScale:()=>1,landHeight:()=>groundHeight,
   screen:{w:900,h:500},px:10,py:20,view3d:{yaw:0},cameraPitch3:()=>.8,cameraZoom3:()=>32,currentScene:'overworld',time:1,realmGPU:null,painter3(){},project3(){},navigator:{userAgent:'Mozilla/5.0'},realmLightingState:()=>({night:0,cave:0,house:0,lights:[]})};
  context.window=context;context.matchMedia=()=>({matches:false});vm.createContext(context);await require('./helpers/native-assets.cjs')(context,root);
  vm.runInContext(fs.readFileSync(path.join(root,'dist/renderer-filament.js'),'utf8'),context,{filename:'renderer-filament.js'});
  const gpu=context.createRealmFilamentGPU(),raw=new Float32Array([
   0,0,0,0,1,0,1,0,0,1,0,0,
   1,0,0,0,1,0,0,1,0,1,1,0,
   0,0,1,0,1,0,0,0,1,1,0,1
  ]),buffer={data:raw};
  const models=Array.from({length:256},(_,i)=>[1,0,0,(i%16)*3,0,1,0,0,0,0,1,Math.floor(i/16)*3]);
  const entries=models.map(model=>({buffer,stride:48,model}));
  const render=()=>gpu.render(entries,[],null);
  render();const initialTransforms=transforms;
  const start=performance.now();for(let i=0;i<30;i++)render();const steadyMs=performance.now()-start;
  const steadyTransforms=transforms-initialTransforms;
  models[7][3]+=1;render();const movementTransforms=transforms-initialTransforms-steadyTransforms;
  const beforeHeight=transforms;groundHeight=2;render();const groundingTransforms=transforms-beforeHeight;
  if(!process.env.BENCHMARK_BASELINE){
   assert.equal(initialTransforms,256,'each new entity receives its world transform');
   assert.equal(steadyTransforms,0,'stationary entities do not resend transforms to Filament');
   assert.equal(movementTransforms,1,'mutated model matrix moves only its own entity');
   assert.equal(groundingTransforms,256,'terrain sculpting immediately regrounds all visible entities');
  }
  context.VeldrenAssets.destroy();
  console.log(JSON.stringify({initialTransforms,steadyTransforms,movementTransforms,groundingTransforms,steadyMs:Number(steadyMs.toFixed(2)),frames:30,entities:256}));resolve();
 }catch(error){reject(error);}
})).finally(()=>fs.rmSync(temporary,{recursive:true,force:true})).catch(error=>{console.error(error);process.exitCode=1;});
