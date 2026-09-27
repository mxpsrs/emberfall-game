// Focused local WebGL acceptance. Serves repository bytes; never contacts a
// production game backend or changes accounts, characters or editor documents.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const playwright=await import(pathToFileURL(process.env.VELDREN_PLAYWRIGHT||path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')));
const root=path.resolve('dist'),output=path.resolve('.qa/phase2-models');fs.mkdirSync(output,{recursive:true});
const html=`<!doctype html><style>body{margin:0;background:#121820}.realm-surface{position:absolute;top:0;left:0}</style><canvas id="world"></canvas>
<script>
window.VELDREN_CONTEXT='editor';
const screen={w:800,h:600};let px=10,py=20,time=1,currentScene='overworld',realmGPU=null;
const view3d={yaw:0};const realmIdentityModel=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function realmAssetURL(p){return '/'+p}function realmLoadStatus(){}function realmLoadFailure(message,error){window.failure=String(error)}
function painter3(){}function project3(){}function canvasPainterRealm(){return {}}function realmPixelScale(){return 1}
function cameraPitch3(){return .8}function cameraZoom3(){return 32}function landHeight(){return 0}
function realmLightingState(){return {night:0,cave:0,house:0,lights:[]}}
</script>
<script src="/asset-runtime.js"></script><script src="/asset-textures.js"></script><script src="/asset-materials.js"></script><script src="/asset-meshes.js"></script><script src="/asset-draws.js"></script><script src="/native-runtime.js"></script>
<script src="/vendor/filament/filament.js"></script><script src="/filament-bootstrap.js"></script><script src="/renderer-filament.js"></script>
<script>
window.acceptance=(async()=>{
 await Promise.all([filamentReady,realmNativeReady]);if(window.failure)throw Error(window.failure);
 const gpu=createRealmFilamentGPU();window.testGPU=gpu;
 const raw=new Float32Array([
 -3,0,-3,0,1,0,1,1,1,1,0,0, -3,0,3,0,1,0,1,1,1,1,0,1, 3,0,3,0,1,0,1,1,1,1,1,1,
 -3,0,-3,0,1,0,1,1,1,1,0,0, 3,0,3,0,1,0,1,1,1,1,1,1, 3,0,-3,0,1,0,1,1,1,1,1,0
 ]),buffer={data:raw},entries=[{buffer,stride:48,model:[1,0,0,10,0,1,0,0,0,0,1,20],terrain:true}];
 const model='rebuilt:Wall_Plaster_Straight';gpu.assetDraws.begin('overworld');gpu.assetDraws.submit(model,[1,0,0,0,0,1,0,0,0,0,1,0,10,0,20,1]);gpu.assetDraws.end();
 while(gpu.assetDraws.diagnostics().loading)await new Promise(resolve=>setTimeout(resolve,10));
 if(gpu.assetDraws.diagnostics().failures.length)throw Error(gpu.assetDraws.diagnostics().failures.join(';'));
 const canonicalMesh={};VeldrenAssets.bindLegacy('rebuilt',{Wall_Plaster_Straight:canonicalMesh});
 entries.push(gpu.canonicalEntry(canonicalMesh,[1,0,0,10,0,1,0,0,0,0,1,20]));
 // Keep submitting until the test captures the actual GPU surface.
 let frames=0;function frame(){gpu.render(entries,[],null);frames++;window.testFrames=frames;window.testFrame=requestAnimationFrame(frame)}frame();
 await new Promise(resolve=>{function wait(){if(frames>=20)resolve();else requestAnimationFrame(wait)}wait()});
 return {models:gpu.modelResources.diagnostics(),draws:gpu.assetDraws.diagnostics(),textures:gpu.textureResources.diagnostics(),renderables:gpu.scene.getRenderableCount(),native:realmNative.kind,errors:gpu.engine.hasUnrecoverableFailure()};
})();window.acceptance.catch(error=>{window.failure=String(error)});
</script>`;
const server=http.createServer((request,response)=>{
 const name=new URL(request.url,'http://local').pathname;
 if(name==='/'){response.writeHead(200,{'Content-Type':'text/html'});response.end(html);return;}
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return;}
 const mime={'.js':'application/javascript','.wasm':'application/wasm','.json':'application/json','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
 response.writeHead(200,{'Content-Type':mime});fs.createReadStream(file).pipe(response);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await playwright.chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:120000});
 const result=await page.evaluate(()=>window.acceptance);assert.equal(result.errors,false);assert.equal(result.native,'cpp-wasm');assert(result.models.geometry>0);assert(result.draws.instances>0);assert(result.renderables>1);assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(output,'canonical-wall.png')});
 const teardown=await page.evaluate(()=>{cancelAnimationFrame(window.testFrame);realmNative.destroy();return testGPU.textureResources.diagnostics()});assert.equal(teardown.textures,0);assert.equal(teardown.gpuBytes,0);
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({backend:'Chromium WebGL SwiftShader',result,teardown,pageErrors:errors},null,2)+'\n');
 console.log('PASS: actual Chromium WebGL canonical PBR wall, native geometry/materials, zero page errors and zero resources after teardown.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
