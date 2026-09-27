// Focused local WebGL acceptance. Serves repository bytes; never contacts a
// production game backend or changes accounts, characters or editor documents.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const playwright=await import(pathToFileURL(process.env.VELDREN_PLAYWRIGHT||path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')));
const root=path.resolve('dist'),output=path.resolve('.qa/phase2-editor-assets');fs.mkdirSync(output,{recursive:true});
const html=`<!doctype html><style>body{margin:0;background:#121820;color:white;font:14px system-ui;display:flex;flex-wrap:wrap}figure{margin:12px}canvas{width:384px;height:256px}</style>
<script>window.VELDREN_CONTEXT='editor';function realmAssetURL(p){return '/'+p}function realmLoadStatus(){}function realmLoadFailure(message,error){window.failure=String(error)}</script>
<script src="/asset-runtime.js"></script><script src="/asset-textures.js"></script><script src="/asset-materials.js"></script><script src="/asset-meshes.js"></script><script src="/asset-draws.js"></script><script src="/native-runtime.js"></script>
<script src="/vendor/filament/filament.js"></script><script src="/filament-bootstrap.js"></script><script src="/editor/asset-preview.js"></script>
<script>
window.acceptance=(async()=>{
 await Promise.all([filamentReady,realmNativeReady]);if(window.failure)throw Error(window.failure);
 const preview=createVeldrenAssetPreview(VeldrenAssets);window.testPreview=preview;const results=[];
 for(const id of ['rebuilt:Wall_Plaster_Straight','rebuilt:Roof_RoundTiles_4x6','avatar:male']){
  const canvas=await preview.render(id,{key:'acceptance'}),figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=id;figure.append(canvas,caption);document.body.append(figure);
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
  results.push({id,colors:colors.size,resources:preview.diagnostics()});
 }
 return {results,native:realmNative.kind};
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
 const result=await page.evaluate(()=>window.acceptance);assert.equal(result.native,'cpp-wasm');assert.deepEqual(errors,[]);
 for(const item of result.results){assert(item.colors>50,'Preview contains lit textured geometry: '+item.id);assert.equal(item.resources.models.gpuBytes,0);assert.equal(item.resources.textures.gpuBytes,0);}
 await page.screenshot({path:path.join(output,'native-asset-previews.png'),fullPage:true});
 await page.evaluate(()=>realmNative.destroy());assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({backend:'Chromium WebGL SwiftShader',...result,pageErrors:errors},null,2)+'\n');
 console.log('PASS: editor native PBR wall/roof and skinned avatar previews, visible geometry, bounded resource leases and teardown.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
