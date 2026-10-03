'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const source=fs.readFileSync('dist/world-lighting.js','utf8'),context={};vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function realmNearestLighting'),source.indexOf('const realmLightingFrame')),context);
 const values=Array.from({length:10000},(_,i)=>({id:i,distance:(i*7919)%10007}));let scored=0;
 const actual=context.realmNearestLighting(values,16,v=>{scored++;return v.distance;});
 assert.deepEqual(Array.from(actual,v=>v.id),values.slice().sort((a,b)=>a.distance-b.distance).slice(0,16).map(v=>v.id));assert.equal(scored,values.length);
 const ties=[{id:1,distance:1},{id:2,distance:1},{id:3,distance:Infinity}];assert.deepEqual(Array.from(context.realmNearestLighting(ties,2,v=>v.distance),v=>v.id),[1,2]);
 let initialized,fetches=[],resolved=false;
 const boot={console,Uint8Array,Promise,Error,navigator:{userAgent:''},realmAssetURL:p=>p,realmLoadStatus(){},realmLoadFailure(){throw Error('Unexpected boot failure');},setTimeout(){return 1;},clearTimeout(){},realmNativeReady:Promise.resolve(),Filament:{init(assets,callback){initialized=callback;}},fetch:async url=>{fetches.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}};
 boot.window=boot;vm.createContext(boot);vm.runInContext(fs.readFileSync('dist/filament-bootstrap.js','utf8'),boot);
 assert.equal(fetches.length,2,'both textures start before Filament initialization finishes');boot.filamentReady.then(()=>resolved=true);await Promise.resolve();assert(!resolved);
 await initialized();await boot.filamentReady;assert(resolved);assert.equal(boot.VELDREN_FILAMENT_ASSETS.atlasBytes.length,8);
 console.log('PASS: 10000 lighting candidates scored once with identical nearest results; textures fetch during initialization, readiness waits for initialization and images.');
})().catch(error=>{console.error(error);process.exitCode=1;});
