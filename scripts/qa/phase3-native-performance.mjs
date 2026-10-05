// Native authoring microbenchmark; excludes Filament rendering and DOM work.
// Supply an exported canonical WorldDocument. No saved input is changed.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const input=process.argv[2];if(!input)throw Error('Usage: node scripts/qa/phase3-native-performance.mjs world.json');
const document=JSON.parse(fs.readFileSync(input,'utf8'));
const context={console,TextEncoder,TextDecoder,DataView,WebAssembly,AbortController,URL,Map,Set,realmAssetURL:p=>p,VELDREN_CONTEXT:'editor',addEventListener(){},fetch:async path=>{const bytes=fs.readFileSync(new URL('../../client/'+String(path).replace(/^\//,''),import.meta.url));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>JSON.parse(bytes.toString())};}};
context.window=context;vm.createContext(context);
for(const path of ['asset-runtime.js','native-runtime.js','editor/commands.js','editor/geometry.js','editor/selection.js'])vm.runInContext(fs.readFileSync(new URL('../../client/'+path,import.meta.url),'utf8'),context);
const native=await context.realmNativeReady,n=native.scenes;await context.VeldrenAssets.ready;
let start=performance.now();assert(n.load(document));const loadMs=performance.now()-start;
const scene=document.scenes.reduce((a,b)=>a.entities.length>b.entities.length?a:b),name=scene.scene;
const selection=context.createVeldrenSelection({native:n,scene:()=>name,assets:context.VeldrenAssets});
start=performance.now();selection.hierarchy('wall');const hierarchyColdMs=performance.now()-start;
const target=scene.entities.find(e=>e.components.MeshRenderer&&!e.components.BuildingPart);assert(target);
const node=n.entity(name,target.id),position=node.worldMatrix.slice(12,15),ray={origin:[position[0],position[1]+100,position[2]],direction:[0,-1,0]};
start=performance.now();selection.candidates(ray);const pickingColdMs=performance.now()-start;
const samples=[];for(let i=0;i<100;i++){start=performance.now();selection.candidates(ray);samples.push(performance.now()-start);}
const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)]};};
const commands=context.createVeldrenEditorCommands(n,()=>name),commandSamples=[];
commands.begin('100 transform updates');for(let i=0;i<100;i++){const transform=JSON.parse(JSON.stringify(node.transform));if(transform.affine)transform.affine[12]+=(i+1)*.01;else transform.position[0]+=(i+1)*.01;start=performance.now();commands.execute('Move',[{op:'transform',id:target.id,transform}]);commandSamples.push(performance.now()-start);}commands.commit();assert.equal(commands.status().undo,1);commands.undo();assert.deepEqual(JSON.parse(JSON.stringify(n.entity(name,target.id).transform)),JSON.parse(JSON.stringify(node.transform)));
const editedPicking=[];for(let i=0;i<10;i++){const transform=JSON.parse(JSON.stringify(node.transform));if(transform.affine)transform.affine[12]+=(i+1)*.01;else transform.position[0]+=(i+1)*.01;commands.execute('Move',[{op:'transform',id:target.id,transform}]);start=performance.now();selection.candidates(ray);editedPicking.push(performance.now()-start);}for(let i=0;i<10;i++)commands.undo();
const result={afterTransformPicking:summary(editedPicking),scope:'Node actual-WASM bridge; excludes renderer and DOM',scenes:document.scenes.length,entities:document.scenes.reduce((sum,s)=>sum+s.entities.length,0),scene:name,sceneEntities:scene.entities.length,loadMs,hierarchyColdMs,pickingColdMs,pickingWarm:summary(samples),transform:summary(commandSamples),groupedUndo:true};
fs.mkdirSync('.qa/phase3',{recursive:true});fs.writeFileSync('.qa/phase3/native-performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));selection.destroy();native.destroy();
