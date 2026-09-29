// Focused local WebGL acceptance. Serves repository bytes; never contacts a
// production game backend or changes accounts, characters or editor documents.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const playwright=await import(pathToFileURL(process.env.VELDREN_PLAYWRIGHT||path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')));
const root=path.resolve('dist'),output=path.resolve('.qa/phase3-gizmo');fs.mkdirSync(output,{recursive:true});
const html=`<!doctype html><body style="margin:0;background:#152331"><canvas id="tools" width="800" height="600"></canvas>
<script>window.VELDREN_CONTEXT='editor';function realmAssetURL(p){return '/'+p}function realmLoadStatus(){}function realmLoadFailure(message,error){window.failure=String(error)}</script>
<script src="/asset-runtime.js"></script><script src="/native-runtime.js"></script><script src="/vendor/filament/filament.js"></script><script src="/filament-bootstrap.js"></script>
<script src="/editor/commands.js"></script><script src="/editor/geometry.js"></script><script src="/editor/gizmo-renderer.js"></script><script src="/editor/transform-tools.js"></script>
<script>
window.acceptance=(async()=>{
 await Promise.all([filamentReady,realmNativeReady]);if(window.failure)throw Error(window.failure);
 const canvas=document.getElementById('tools'),engine=Filament.Engine.create(canvas,{backend:Filament.Backend.OPENGL}),swap=engine.createSwapChain(),renderer=engine.createRenderer(),cameraEntity=Filament.EntityManager.get().create(),camera=engine.createCamera(cameraEntity),scene=engine.createScene(),view=engine.createView();
 const backend={engine,camera,width:800,height:600};view.setCamera(camera);view.setScene(scene);view.setViewport([0,0,800,600]);renderer.setClearOptions({clearColor:[.035,.065,.1,1],clear:true});
 const G=VeldrenEditorGeometry,cam={eye:[5,4,7],center:[0,0,0],up:[0,1,0],near:.25,left:-.18,right:.18,bottom:-.135,top:.135,width:800,height:600};
 camera.lookAt(cam.eye,cam.center,cam.up);camera.setProjection(Filament.Camera$Projection.PERSPECTIVE,cam.left,cam.right,cam.bottom,cam.top,cam.near,320);
 const overlay=await createVeldrenGizmoRenderer(backend),axes=[[1,0,0],[0,1,0],[0,0,1]],capture=document.createElement('canvas');capture.width=800;capture.height=600;const ctx=capture.getContext('2d'),results=[];
 for(const mode of ['move','rotate','scale']){
  overlay.update(G.handles(mode,[0,0,0],axes,2),2,mode,'axis1',null);
  let colored=0;const deadline=performance.now()+10000;
  while(colored<100&&performance.now()<deadline){engine.execute();if(renderer.beginFrame(swap)){renderer.renderView(view);overlay.render(renderer);renderer.endFrame();}engine.execute();ctx.drawImage(canvas,0,0);const pixels=ctx.getImageData(0,0,800,600).data;colored=0;for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>80)colored++;await new Promise(requestAnimationFrame);}
  results.push({mode,colored});
 }
 window.overlay=overlay;window.backend=backend;window.testResults=results;return results;
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
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('console',m=>console.log(m.type()+': '+m.text()));
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:120000});
 const result=await page.evaluate(()=>window.acceptance);console.log(result);await page.screenshot({path:path.join(output,'gizmo.png')});assert.deepEqual(errors,[]);for(const item of result)assert(item.colored>100,item.mode+' visible 3D handles');
 await page.screenshot({path:path.join(output,'gizmo.png')});await page.evaluate(()=>overlay.destroy());assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
