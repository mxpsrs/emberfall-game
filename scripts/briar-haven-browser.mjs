// Reproducible local production-Filament capture; never contacts a hosted game.
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash,randomBytes} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {acquireBriarBrowserLock} from './briar-browser-lock.mjs';
const root=resolve(process.env.VELDREN_QA_ROOT||'.'),label=process.env.VELDREN_QA_LABEL||'after';
assert.match(label,/^[a-z0-9-]+$/);
const releaseGraphics=await acquireBriarBrowserLock();
const workerSha256=createHash('sha256').update(readFileSync(join(root,'dist/server/index.js'))).digest('hex');
const {openLocalStorage}=await import(pathToFileURL(join(root,'scripts/local-storage.mjs')).href);
const {default:worker}=await import(pathToFileURL(join(root,'dist/server/index.js')).href);
const {chromium}=await import(pathToFileURL(process.env.VELDREN_PLAYWRIGHT||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const storage=openLocalStorage({root,dataDirectory:mkdtempSync(join(tmpdir(),'veldren-briar-qa-'))}),{db,env}=storage;
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token=randomBytes(32).toString('hex'),errors=[],requests=[];
db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(owner,'BriarVisualQA','briarvisualqa',bcrypt.hashSync(randomBytes(32).toString('hex'),4),Date.now());
db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+86400000);
db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run('account:'+owner,JSON.stringify({x:42,y:51,sceneId:'overworld',worldScale:3,briarhavenLayoutVersion:2,buildingLayoutVersion:1,kitchenLayoutVersion:1,tutorialReward:true,tutorial:100,hp:10,gold:0,xp:{},bag:{},character:{name:'BriarVisualQA',look:0,race:'human',frame:'male',hair:1},storyOpeningSeen:true,metRowan:true}),1,new Date().toISOString());
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);requests.push(req.url);const response=await worker.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),env);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(e){errors.push(String(e));res.statusCode=500;res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const output=resolve('docs/qa/briar-haven',label);mkdirSync(output,{recursive:true});let browser,qaPage;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.VELDREN_CHROMIUM||'/tmp/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});await context.addCookies([{name:'ember_session',value:token,url:origin}]);
 await context.addInitScript(()=>{window.VELDREN_PERFORMANCE=true;window.__qaGl={draws:0,instanced:0};for(const Type of [WebGLRenderingContext,WebGL2RenderingContext])for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=Type.prototype[name];if(original)Type.prototype[name]=function(...args){__qaGl.draws++;if(name.endsWith('Instanced'))__qaGl.instanced++;return original.apply(this,args)}}});
 const page=qaPage=await context.newPage();page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e))});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,240))});
 const started=performance.now();await page.goto(origin+'/play',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>globalThis.realmStartup?.failed||typeof assetsReady!=='undefined'&&assetsReady,{},{timeout:600000});
 assert.equal(await page.evaluate(()=>!!realmStartup?.failed),false,'production startup succeeds');
 const editorBindingErrors=await page.evaluate(()=>globalThis.VELDREN_WORLD_EDITS_STATUS?.errors||[]);
 const startupMs=performance.now()-started;await page.evaluate(()=>{if($('creator').open)$('creator').close();if($('modal').open)$('modal').close();worldHour=()=>11;renderUI();window.__qaFrames=[];window.__qaPreviousFrame=0;const original=draw;draw=function(...args){const start=performance.now(),interval=__qaPreviousFrame?start-__qaPreviousFrame:0,result=original.apply(this,args);__qaPreviousFrame=start;if(realmGPU?.presented)__qaFrames.push({cpuMs:performance.now()-start,frameIntervalMs:interval,heap:performance.memory?.usedJSHeapSize||0,terrain:{...realmGPU.terrainWork},renderer:realmGPU.diagnostics()});if(__qaFrames.length>180)__qaFrames.shift();return result}});
 const matchedRoutes=[['main-street',42,51,-2.05,.27],['services-smithy',75,49,-2.80,.32],['houses',62,31,-2.8,.32],['magic-school',75,71,0,.30],['interior',41,46,-2.05,.36],['town-edge',64,115,-2.05,.29]];
 // Preserve the matching baseline route. The school's north-facing facade
 // also needs a south-looking inspection from its actual entrance approach.
 assert(!process.env.VELDREN_QA_VIEW||['school-facade','terrain-first'].includes(process.env.VELDREN_QA_VIEW));
 const routes=process.env.VELDREN_QA_VIEW==='school-facade'?[['school-facade',75,73,Math.PI,.28]]:process.env.VELDREN_QA_VIEW==='terrain-first'?[matchedRoutes[5],matchedRoutes[1],...matchedRoutes.filter((_,i)=>i!==5&&i!==1)]:matchedRoutes;
 const results=[];
 for(const [name,x,z,yaw,tilt]of routes){
  console.log('CAPTURE',name);const settleStarted=performance.now();await page.evaluate(({x,z,yaw,tilt})=>{stop();activateScene('overworld',x,z,false);view3d.yaw=yaw;view3d.tilt=tilt;view3d.zoom=102;for(const b of buildings)if(b.service&&withinWalkIn(b,x,z))setWalkInDoor(b.service,true,true);updateDoorThreshold();__qaFrames.length=0;__qaPreviousFrame=0;}, {x,z,yaw,tilt});
  await page.waitForFunction(()=>realmGPU?.presented&&__qaFrames.length>=12,{},{timeout:120000});
  await page.screenshot({path:join(output,name+'-loading.png'),timeout:120000});
  console.log('STREAM',name,JSON.stringify(await page.evaluate(()=>({renderer:realmGPU.diagnostics(),performance:realmGPU.performanceSnapshot?.(),terrain:realmGPU.terrainWork,native:VeldrenWorldPerformance.diagnostics(),preparation:VeldrenAssets.ioDiagnostics()}))));
  if(process.env.VELDREN_QA_QUICK==='1'){
   const diagnostic=await page.evaluate(async()=>{
    const expected=await(await fetch(realmAssetURL('world-scene.json'))).json(),actual=VeldrenWorldEdits.state.world,differences=[];
    const compare=(a,b,path)=>{if(differences.length>=12)return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],path+'.'+k);}else if(a!==b)differences.push({path,expected:a,actual:b});};compare(expected,actual,'world');
    return {camera:realmFilamentCameraState(),renderer:realmGPU.diagnostics(),performance:realmGPU.performanceSnapshot?.(),terrain:realmGPU.terrainWork,source:{expected:VeldrenPrebuiltWorld.fingerprint(expected),actual:VeldrenPrebuiltWorld.fingerprint(actual),differences}};
   });
   writeFileSync(join(output,'diagnostic.json'),JSON.stringify(diagnostic,null,2));console.log('SOURCE',JSON.stringify(diagnostic.source));break;
  }
  await page.waitForFunction(()=>{
   if(!realmGPU?.presented||__qaFrames.length<60)return false;
   const d=realmGPU.assetDraws?.diagnostics();
   const renderer=realmGPU.diagnostics(),terrain=realmGPU.terrainWork;
   return (!d||d.loading===0&&(d.pendingVisibleInstances??d.pendingInstances)===0&&d.construction.queued===0&&d.failures.length===0)&&(!renderer.frame||renderer.frame.deferredResources===0&&renderer.frame.deferredRenderables===0)&&(renderer.models?.buildQueue?.queued??0)===0&&(terrain?.pending??0)===0;
  },{},{timeout:600000});
  const settleMs=performance.now()-settleStarted,arrivalFrames=await page.evaluate(()=>__qaFrames.slice(0,8));
  await page.evaluate(()=>{__qaFrames.length=0;__qaPreviousFrame=0;});
  await page.waitForFunction(()=>__qaFrames.length>=120,{},{timeout:300000});
  await page.screenshot({path:join(output,name+'.png'),timeout:120000});await page.screenshot({path:join(output,name+'.jpg'),type:'jpeg',quality:90,timeout:120000});const result=await page.evaluate(name=>({name,scene:currentScene,player:[s.x,s.y],camera:realmFilamentCameraState(),view:{...view3d},frames:__qaFrames.slice(-120)}),name);result.arrivalFrames=arrivalFrames;result.settleMs=settleMs;results.push(result);const progress={complete:false,label,workerSha256,editorBindingErrors,startupMs,resolution:[1920,1080],deviceScaleFactor:1,hour:11,results,errors};writeFileSync(join(output,'partial.json'),JSON.stringify(progress,null,2));writeFileSync(join(output,'capture-progress.json.gz'),gzipSync(JSON.stringify(progress),{level:9}));console.log('READY',name,Math.round(settleMs),'ms');
 }
 if(process.env.VELDREN_QA_VIEW==='terrain-first')results.sort((a,b)=>matchedRoutes.findIndex(r=>r[0]===a.name)-matchedRoutes.findIndex(r=>r[0]===b.name));
 assert.deepEqual(errors,[]);const result={label,workerSha256,editorBindingErrors,startupMs,browser:await browser.version(),backend:'Filament WebGL / SwiftShader software GPU',resolution:[1920,1080],deviceScaleFactor:1,hour:11,results,errors,limitations:['Software rendering does not certify physical GPU or phone performance.']};writeFileSync(join(output,'result.json'),JSON.stringify(result,null,2));writeFileSync(join(output,'result.json.gz'),gzipSync(JSON.stringify(result),{level:9}));assert.deepEqual(editorBindingErrors,[],'saved editor objects must resolve before visual acceptance');if(process.env.VELDREN_QA_QUICK!=='1')assert.equal(results.length,routes.length);console.log(process.env.VELDREN_QA_QUICK==='1'?'DIAGNOSTIC':'PASS',label,results.length,'production-Filament views');
}catch(error){
  const state=await qaPage?.evaluate(()=>({startup:globalThis.realmStartup,frames:globalThis.__qaFrames?.length||0,renderer:typeof realmGPU==='undefined'?null:realmGPU?.diagnostics?.(),terrain:typeof realmGPU==='undefined'?null:realmGPU?.terrainWork,recentFrames:globalThis.__qaFrames?.slice(-3),edits:globalThis.VELDREN_WORLD_EDITS_STATUS})).catch(()=>null);
 writeFileSync(join(output,'failure.json'),JSON.stringify({error:String(error),state,errors},null,2));
 await qaPage?.screenshot({path:join(output,'failure.png'),timeout:120000}).catch(()=>{});
 console.log('CAPTURE FAILURE',JSON.stringify({frames:state?.frames,draws:state?.renderer?.draws,frame:state?.renderer?.frame}));throw error;
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));storage.close();await releaseGraphics();}
