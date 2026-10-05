// Opt-in measurements of the actual built world. All HTTP and saves stay local.
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {openLocalStorage} from '../dev/local-storage.mjs';
import worker from '../../dist/server/index.js';
const {chromium}=await import(process.env.VELDREN_PLAYWRIGHT?pathToFileURL(process.env.VELDREN_PLAYWRIGHT).href:'playwright');
const storage=openLocalStorage({dataDirectory:mkdtempSync(join(tmpdir(),'veldren-phase4-browser-'))}),{db,env}=storage;
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token=randomBytes(32).toString('hex');
db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(owner,'PhaseFourQA','phasefourqa',bcrypt.hashSync(randomBytes(32).toString('hex'),4),Date.now());
db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+86400000);
db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run('account:'+owner,JSON.stringify({x:43,y:52,hp:10,gold:0,xp:{},bag:{},character:{name:'PhaseFourQA',look:0,race:'human',frame:'male',hair:0},storyOpeningSeen:true,metRowan:true}),1,new Date().toISOString());
const errors=[],requests=[];let browser;
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);requests.push(req.url);const response=await worker.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),env);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(e){console.error(e);res.statusCode=500;res.end(String(e));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const mobile=process.env.VELDREN_PERFORMANCE_MOBILE==='1',viewport=mobile?{width:844,height:390}:{width:1440,height:900};
const label=process.env.VELDREN_PERFORMANCE_LABEL||'baseline',output='.qa/phase4/'+label;assert.match(label,/^[a-z0-9-]+$/);mkdirSync(output,{recursive:true});
const sourceBase=process.env.VELDREN_PERFORMANCE_BASE||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
try{
 browser=await chromium.launch({headless:true,...(process.env.VELDREN_CHROMIUM?{executablePath:process.env.VELDREN_CHROMIUM}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport,...(mobile?{isMobile:true,hasTouch:true,deviceScaleFactor:1}:{})});await context.addCookies([{name:'ember_session',value:token,url:origin}]);
 await context.addInitScript(()=>{window.VELDREN_PERFORMANCE=true;window.__phase4GL={drawCalls:0,instancedCalls:0,instances:0};
  for(const Type of [window.WebGLRenderingContext,window.WebGL2RenderingContext])if(Type)for(const key of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=Type.prototype[key];if(!original)continue;Type.prototype[key]=function(...args){__phase4GL.drawCalls++;if(key.endsWith('Instanced')){__phase4GL.instancedCalls++;__phase4GL.instances+=args.at(-1);}return original.apply(this,args);};}
 });
 const watch=page=>page.on('pageerror',e=>{errors.push(String(e));console.error('PAGE ERROR',e.message);});
 async function install(frame){await frame.evaluate(()=>{
  window.__phase4Frames=[];window.__phase4Transforms=0;window.__phase4Presented=false;const originalBegin=realmGPU.renderer.beginFrame;realmGPU.renderer.beginFrame=function(...args){const result=originalBegin.apply(this,args);__phase4Presented=result;return result;};const originalTransform=Filament.TransformManager.prototype.setTransform;Filament.TransformManager.prototype.setTransform=function(...args){__phase4Transforms++;return originalTransform.apply(this,args);};
  const originalBounds=worldObjectsInBounds;window.__phase4Query={ms:0,count:0};worldObjectsInBounds=function(...args){const start=performance.now(),result=originalBounds(...args);__phase4Query.ms+=performance.now()-start;__phase4Query.count+=result.length;return result;};
  const originalDraw=draw;draw=function(...args){const start=performance.now(),gl={...__phase4GL},transforms=__phase4Transforms;__phase4Query={ms:0,count:0};__phase4Presented=false;const result=originalDraw(...args);const measured={presented:__phase4Presented,cpuFrameMs:performance.now()-start,visibilityQueryMs:__phase4Query.ms,consideredObjects:__phase4Query.count,consideredBuildings:buildings.length,partition:globalThis.VeldrenWorldPerformance?.diagnostics()||null,drawCalls:__phase4GL.drawCalls-gl.drawCalls,instancedCalls:__phase4GL.instancedCalls-gl.instancedCalls,hardwareInstances:__phase4GL.instances-gl.instances,transformSubmissions:__phase4Transforms-transforms,renderer:realmGPU.diagnostics(),browserHeapBytes:performance.memory?.usedJSHeapSize??null};if(__phase4Presented)__phase4Frames.push(measured);if(__phase4Frames.length>32)__phase4Frames.shift();return result;};
 });}
 async function sample(frame,name){await frame.waitForFunction(()=>realmGPU.assetDraws.diagnostics().loading===0,{},{timeout:240000});await frame.evaluate(()=>{__phase4Frames.length=0;});await frame.waitForFunction(()=>__phase4Frames.length>=3,{},{timeout:300000});const result=await frame.evaluate(name=>({name,scene:currentScene,camera:{x:px,y:py,...view3d},frames:__phase4Frames.slice(-3)}),name);console.log('MEASURED',name,JSON.stringify(result.frames.at(-1)));return result;}
 const started=performance.now(),page=await context.newPage();watch(page);console.log('Opening '+label+' editor');await page.goto(origin+'/editor/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.VeldrenEditorBridge?.isReady(),{},{timeout:600000});
 const frame=page.frames().find(f=>f.url().includes('viewport.html'));const editorReadyMs=performance.now()-started;console.log('Editor ready',editorReadyMs);await install(frame);
 const document=await frame.evaluate(()=>VeldrenEditorBridge.exportWorld());writeFileSync(output+'/world.json',JSON.stringify(document));
 const counts={scenes:document.scenes.length,entities:document.scenes.reduce((n,s)=>n+s.entities.length,0),perScene:document.scenes.map(s=>({name:s.scene,entities:s.entities.length,renderables:s.entities.filter(e=>e.components?.MeshRenderer).length}))};
 const results=[await sample(frame,'populated-editor-hierarchy')];
 await page.locator('#sceneSelect').selectOption('overworld',{timeout:120000});
 const viewpoints=[['dense-settlement',14,17,false],['wilderness',165,140,false],['building-heavy',254,39,false],['long-distance-overview',254,39,true]],requested=process.env.VELDREN_PERFORMANCE_VIEWS?.split(',');
 const targets=await frame.evaluate(views=>{const nodes=realmNative.scenes.read('overworld').entities.filter(e=>e.components?.MeshRenderer&&e.activeInHierarchy!==false).map(e=>({id:e.id,m:realmNative.scenes.entity('overworld',e.id).worldMatrix}));return views.map(([name,x,z])=>[name,nodes.reduce((best,n)=>Math.hypot(n.m[12]-x,n.m[14]-z)<Math.hypot(best.m[12]-x,best.m[14]-z)?n:best).id]);},viewpoints);
 for(let lap=0;lap<Number(process.env.VELDREN_PERFORMANCE_LAPS||1);lap++)for(const [viewName,x,z,zoomOut] of viewpoints){
  if(requested&&!requested.includes(viewName))continue;
  const name=viewName+(lap?'-return-'+lap:'');
  await frame.evaluate(id=>{VeldrenEditorBridge.selectEntity(id);VeldrenEditorBridge.focusSelection();},targets.find(([name])=>name===viewName)[1]);
  if(zoomOut){const box=await frame.locator('#world').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,1100);}
  results.push(await sample(frame,name));
  writeFileSync(output+'/partial.json',JSON.stringify({editorReadyMs,counts,results,errors},null,2));
  await page.screenshot({path:output+'/'+name+'.png',timeout:180000});
 }
 assert.equal(requests.filter(p=>/^\/api\/(character|players|social|activity)/.test(p)).length,0);await page.close();
 const play=await context.newPage();watch(play);const playStart=performance.now();await play.goto(origin+'/play',{waitUntil:'domcontentloaded',timeout:120000});await play.waitForFunction(()=>typeof assetsReady!=='undefined'&&assetsReady,{},{timeout:600000});const playReadyMs=performance.now()-playStart;await install(play);results.push(await sample(play,'ordinary-gameplay'));await play.screenshot({path:output+'/ordinary-gameplay.png'});
 assert.deepEqual(errors,[]);
 const result={label,sourceCommit:process.env.VELDREN_PERFORMANCE_COMMIT||null,sourceBase,environment:{browser:await browser.version(),renderer:'SwiftShader software GPU',viewport:[viewport.width,viewport.height],mobile,samplesPerView:3},editorReadyMs,playReadyMs,counts,results,errors,limitations:['CPU frame time includes software-renderer submission; not hardware FPS.','GPU bytes are known allocation estimates, not driver VRAM.','Decoded canonical CPU asset bytes are unavailable; firstRenderMs is relative to viewport navigation.','VisibilityQueryMs retains the old query probe for baseline comparison; current native partition counters are reported separately.']};writeFileSync(output+'/result.json',JSON.stringify(result,null,2));console.log('PASS: '+results.length+' populated viewpoints; no page errors');
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));storage.close();}
