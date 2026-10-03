// Reproducible local production-Filament capture; never contacts a hosted game.
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash,randomBytes} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
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
const {createCanvas,loadImage}=await import('@napi-rs/canvas');
async function surfaceLuminance(path){const bitmap=await loadImage(path),canvas=createCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d');context.drawImage(bitmap,0,0);const region=[320,360,1160,600],pixels=context.getImageData(...region).data,values=[];let sum=0;for(let i=0;i<pixels.length;i+=64){const y=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;sum+=y;values.push(y);}values.sort((a,b)=>a-b);return {region,mean:sum/values.length,median:values[Math.floor(values.length/2)]};}
const storage=openLocalStorage({root,dataDirectory:mkdtempSync(join(tmpdir(),'veldren-briar-qa-'))}),{db,env}=storage;
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token=randomBytes(32).toString('hex'),errors=[],requests=[];
db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(owner,'BriarVisualQA','briarvisualqa',bcrypt.hashSync(randomBytes(32).toString('hex'),4),Date.now());
db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+86400000);
db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run('account:'+owner,JSON.stringify({x:42,y:51,sceneId:'overworld',worldScale:3,briarhavenLayoutVersion:2,buildingLayoutVersion:1,kitchenLayoutVersion:1,tutorialReward:true,tutorial:100,hp:10,gold:0,xp:{},bag:{},character:{name:'BriarVisualQA',look:0,race:'human',frame:'male',hair:1},storyOpeningSeen:true,metRowan:true}),1,new Date().toISOString());
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);requests.push(req.url);const response=await worker.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),env);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(e){errors.push(String(e));res.statusCode=500;res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const output=resolve('docs/qa/briar-haven',label);mkdirSync(output,{recursive:true});let browser,qaPage,captureName='startup';
let resumed,recoveredSchool;
if(process.env.VELDREN_QA_RECOVER_SCHOOL==='1'){
 assert.equal(process.env.VELDREN_QA_VIEW,'school-facade');assert.notEqual(process.env.VELDREN_QA_RESUME,'1');
 recoveredSchool=JSON.parse(gunzipSync(readFileSync(join(output,'result.json.gz'))));
 assert.equal(recoveredSchool.workerSha256,workerSha256,'retain School samples only for identical production bytes');assert.deepEqual(recoveredSchool.errors,[]);assert.deepEqual(recoveredSchool.editorBindingErrors,[]);
 assert.deepEqual(recoveredSchool.resolution,[1920,1080]);assert.equal(recoveredSchool.deviceScaleFactor,1);assert.equal(recoveredSchool.hour,11);
 assert.equal(recoveredSchool.results.length,1);const v=recoveredSchool.results[0];assert.equal(v.name,'school-facade');assert.equal(v.frames.length,120);
 const f=v.frames.at(-1),d=f.renderer,t=f.terrain;assert.deepEqual(d.draws.failures,[]);assert.equal(d.draws.loading,0);assert.equal(d.draws.pendingVisibleInstances,0);assert.equal(d.draws.construction.queued,0);assert.equal(d.models.buildQueue.queued,0);assert.equal(d.frame.deferredResources,0);assert.equal(d.frame.deferredRenderables,0);assert.equal(d.residency.overBudget,false);
 assert.equal(t.mode,'worker');assert.equal(t.pending,0);assert.equal(t.failures,0);assert.equal(t.baseValid,true);assert.equal(t.bakedSourceMatched,true);assert.equal(t.snapshotMs,0);
 console.log('RECOVER School: retain 120 verified samples and recapture the lost image after loading settles');
}
if(process.env.VELDREN_QA_RESUME==='1'){
 assert.notEqual(process.env.VELDREN_QA_VIEW,'school-facade','resume the matched route only');
 resumed=JSON.parse(gunzipSync(readFileSync(join(output,'capture-progress.json.gz'))));
 assert.equal(resumed.workerSha256,workerSha256,'resume only identical compiled production bytes');
 assert.deepEqual(resumed.resolution,[1920,1080]);assert.equal(resumed.deviceScaleFactor,1);assert.equal(resumed.hour,11);
 assert.deepEqual(resumed.errors,[]);assert.deepEqual(resumed.editorBindingErrors,[]);
 assert.equal(new Set(resumed.results.map(r=>r.name)).size,resumed.results.length);
 for(const view of resumed.results){
  assert.equal(view.frames.length,120);assert(readFileSync(join(output,view.name+'.jpg')).length>10000);
  const f=view.frames.at(-1),d=f.renderer,t=f.terrain;
  assert.equal(d.draws.loading,0);assert.equal(d.draws.pendingVisibleInstances,0);assert.equal(d.draws.construction.queued,0);assert.deepEqual(d.draws.failures,[]);
  assert.equal(d.models.buildQueue.queued,0);assert.equal(d.frame.deferredResources,0);assert.equal(d.frame.deferredRenderables,0);assert.equal(d.residency.overBudget,false);
  assert.equal(t.mode,'worker');assert.equal(t.pending,0);assert.equal(t.failures,0);assert.equal(t.baseValid,true);assert.equal(t.bakedSourceMatched,true);assert.equal(t.snapshotMs,0);
 }
 console.log('RESUME identical Worker:',resumed.results.map(r=>r.name).join(', '));
}
const heartbeat=setInterval(async()=>{
 if(!qaPage)return;
 const state=await qaPage.evaluate(()=>({frames:globalThis.__qaFrames?.length||0,terrain:typeof realmGPU==='undefined'?null:realmGPU?.terrainWork,draws:typeof realmGPU==='undefined'?null:realmGPU?.assetDraws?.diagnostics?.()})).catch(()=>null);
 if(state)console.log('PROGRESS',captureName,JSON.stringify(state));
},30000);
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.VELDREN_CHROMIUM||'/tmp/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});await context.addCookies([{name:'ember_session',value:token,url:origin}]);
 await context.addInitScript(()=>{
 window.__qaTerrainTrace=[];
 for(const [name,methods] of [['VeldrenTerrainStreaming',['invalidate','invalidateBase']],['VeldrenTerrainEdits',['applyDocument']]]){
  let value;Object.defineProperty(window,name,{configurable:true,get:()=>value,set:next=>{value=next;for(const method of methods){const original=next[method];next[method]=function(...args){const result=original.apply(this,args);__qaTerrainTrace.push({name,method,ready:!!window.VeldrenWorldObjects?.enabled,result,bounds:method==='invalidate'?args[0]:undefined,stack:new Error().stack});return result;};}}});
 }
 window.VELDREN_PERFORMANCE=true;window.__qaGl={draws:0,instanced:0};for(const Type of [WebGLRenderingContext,WebGL2RenderingContext])for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=Type.prototype[name];if(original)Type.prototype[name]=function(...args){__qaGl.draws++;if(name.endsWith('Instanced'))__qaGl.instanced++;return original.apply(this,args)}}});
 const page=qaPage=await context.newPage();page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e))});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,240))});
 const started=performance.now();await page.goto(origin+'/play',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>globalThis.realmStartup?.failed||typeof assetsReady!=='undefined'&&assetsReady,{},{timeout:600000});
 assert.equal(await page.evaluate(()=>!!realmStartup?.failed),false,'production startup succeeds');
 const editorBindingErrors=await page.evaluate(()=>globalThis.VELDREN_WORLD_EDITS_STATUS?.errors||[]);
 const resumedStartupMs=performance.now()-started,startupMs=resumed?.startupMs??resumedStartupMs;await page.evaluate(()=>{if($('creator').open)$('creator').close();if($('modal').open)$('modal').close();worldHour=()=>11;renderUI();window.__qaFrames=[];window.__qaPreviousFrame=0;const original=draw;draw=function(...args){const start=performance.now(),interval=__qaPreviousFrame?start-__qaPreviousFrame:0,glBefore={...__qaGl},result=original.apply(this,args);__qaPreviousFrame=start;if(realmGPU?.presented)__qaFrames.push({cpuMs:performance.now()-start,frameIntervalMs:interval,webglCalls:{draws:__qaGl.draws-glBefore.draws,instanced:__qaGl.instanced-glBefore.instanced},heap:performance.memory?.usedJSHeapSize||0,terrain:{...realmGPU.terrainWork},renderer:realmGPU.diagnostics()});if(__qaFrames.length>180)__qaFrames.shift();return result}});
 const matchedRoutes=[['main-street',42,51,-2.05,.27],['services-smithy',75,49,-2.80,.32],['houses',62,31,-2.8,.32],['magic-school',75,71,0,.30],['interior',41,46,-2.05,.36],['town-edge',64,115,-2.05,.29]];
 // Preserve the matching baseline route. The school's north-facing facade
 // also needs a south-looking inspection from its actual entrance approach.
 assert(!process.env.VELDREN_QA_VIEW||['school-facade','terrain-first'].includes(process.env.VELDREN_QA_VIEW));
 const routes=process.env.VELDREN_QA_VIEW==='school-facade'?[['school-facade',75,73,Math.PI,.28]]:process.env.VELDREN_QA_VIEW==='terrain-first'?[matchedRoutes[5],matchedRoutes[1],...matchedRoutes.filter((_,i)=>i!==5&&i!==1)]:matchedRoutes;
 const results=resumed?.results.slice()||[];
 assert(results.every(v=>routes.some(r=>r[0]===v.name)),'all retained views belong to this route');
 for(const [name,x,z,yaw,tilt]of routes){
  if(results.some(r=>r.name===name))continue;captureName=name;
  console.log('CAPTURE',name);const settleStarted=performance.now();await page.evaluate(({x,z,yaw,tilt})=>{stop();activateScene('overworld',x,z,false);view3d.yaw=yaw;view3d.tilt=tilt;view3d.zoom=102;for(const b of buildings)if(b.service&&withinWalkIn(b,x,z))setWalkInDoor(b.service,true,true);updateDoorThreshold();__qaFrames.length=0;__qaPreviousFrame=0;}, {x,z,yaw,tilt});
  await page.waitForFunction(()=>realmGPU?.presented&&__qaFrames.length>=12,{},{timeout:120000});
  await page.screenshot({path:join(output,name+'-loading.png'),timeout:120000});
  console.log('TERRAIN TRACE',JSON.stringify(await page.evaluate(()=>__qaTerrainTrace)));
  console.log('STREAM',name,JSON.stringify(await page.evaluate(()=>({renderer:realmGPU.diagnostics(),performance:realmGPU.performanceSnapshot?.(),terrain:realmGPU.terrainWork,native:VeldrenWorldPerformance.diagnostics(),preparation:VeldrenAssets.ioDiagnostics()}))));
  if(process.env.VELDREN_QA_QUICK==='1'){
   const diagnostic=await page.evaluate(async()=>{
    const expected=await(await fetch(realmAssetURL('world-scene.json'))).json(),actual=VeldrenWorldEdits.state.world,differences=[];
    const compare=(a,b,path)=>{if(differences.length>=12)return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],path+'.'+k);}else if(a!==b)differences.push({path,expected:a,actual:b});};compare(expected,actual,'world');
    return {trace:__qaTerrainTrace,camera:realmFilamentCameraState(),renderer:realmGPU.diagnostics(),performance:realmGPU.performanceSnapshot?.(),terrain:realmGPU.terrainWork,source:{expected:VeldrenPrebuiltWorld.fingerprint(expected),actual:VeldrenPrebuiltWorld.fingerprint(actual),differences}};
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
  await page.waitForFunction(count=>__qaFrames.length>=count,recoveredSchool?30:120,{timeout:300000});
  await page.screenshot({path:join(output,name+'.png'),timeout:120000});await page.screenshot({path:join(output,name+'.jpg'),type:'jpeg',quality:90,timeout:120000});let result=await page.evaluate(name=>({name,scene:currentScene,player:[s.x,s.y],camera:realmFilamentCameraState(),view:{...view3d},frames:__qaFrames.slice(-120)}),name);result.arrivalFrames=arrivalFrames;result.settleMs=settleMs;
  if(recoveredSchool){const retained=recoveredSchool.results[0];for(const key of ['name','scene','player','view'])assert.deepEqual(result[key],retained[key],'recaptured School matches original '+key);for(const key of ['eye','center'])for(let i=0;i<3;i++)assert(Math.abs(result.camera[key][i]-retained.camera[key][i])<.001,'recaptured School matches original camera');result.collectedFrames=result.frames;result.frames=result.frames.slice(-30);result.samplePolicy='Last 30 settled frames; all frames collected while capturing are retained.';result={...retained,recovery:{reason:'Workspace cleanup removed the image; original exact-Worker 120-frame receipt survived.',recaptured:result}};}
  results.push(result);const progress={complete:false,label,workerSha256,editorBindingErrors,startupMs,...(resumed?{resume:{retainedViews:resumed.results.map(r=>r.name),resumedStartupMs}}:{}),resolution:[1920,1080],deviceScaleFactor:1,hour:11,results,errors};writeFileSync(join(output,'partial.json'),JSON.stringify(progress,null,2));writeFileSync(join(output,'capture-progress.json.gz'),gzipSync(JSON.stringify(progress),{level:9}));console.log('READY',name,Math.round(settleMs),'ms');
 }
 if(process.env.VELDREN_QA_VIEW==='terrain-first')results.sort((a,b)=>matchedRoutes.findIndex(r=>r[0]===a.name)-matchedRoutes.findIndex(r=>r[0]===b.name));
 if(process.env.VELDREN_QA_VIEW==='school-facade'){
  const profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');
  await page.evaluate(()=>{__qaFrames.length=0;});await page.waitForFunction(()=>__qaFrames.length>=30,{},{timeout:300000});
  const {profile}=await profiler.send('Profiler.stop');await profiler.detach();
  writeFileSync(join(output,'cpu-profile.json.gz'),gzipSync(JSON.stringify(profile),{level:9}));
  const sampled=new Map();for(let i=0;i<(profile.samples||[]).length;i++)sampled.set(profile.samples[i],(sampled.get(profile.samples[i])||0)+(profile.timeDeltas[i]||0));
  const hotspots=profile.nodes.map(n=>({name:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,ms:Math.round((sampled.get(n.id)||0)/1000)})).filter(n=>n.ms>0).sort((a,b)=>b.ms-a.ms).slice(0,24);
  writeFileSync(join(output,'cpu-hotspots.json'),JSON.stringify({workerSha256,softwareGpu:true,samples:30,hotspots},null,2));console.log('PROFILE',JSON.stringify(hotspots.slice(0,8)));
  await page.evaluate(()=>{worldHour=()=>21;__qaFrames.length=0;__qaPreviousFrame=0;});
  await page.waitForFunction(()=>__qaFrames.length>=30&&(realmGPU.terrainWork?.pending??0)===0&&realmGPU.diagnostics().draws.loading===0,{},{timeout:300000});
  const night=await page.evaluate(()=>({name:'night-school',hour:worldHour(),scene:currentScene,player:[s.x,s.y],camera:realmFilamentCameraState(),frames:__qaFrames.slice(-30)}));
  await page.screenshot({path:join(output,'night-school.jpg'),type:'jpeg',quality:90,timeout:120000});
  const dayLuminance=await surfaceLuminance(join(output,'school-facade.jpg')),nightLuminance=await surfaceLuminance(join(output,'night-school.jpg'));assert(nightLuminance.mean<dayLuminance.mean*.9,'actual night surfaces must remain visibly darker than matching daylight');
  const landmark=await page.evaluate(()=>{const b=buildings.find(b=>b.briarDesign?.school);if(!b)throw Error('Missing canonical Magic School');if(Math.hypot(s.x-b.service.x,s.y-b.service.y)>8)throw Error('School facade view missed the actual entrance');return {buildingId:b._sceneEntityId,name:b.name,destination:b.service.destination,door:[b.service.x,b.service.y]};});
  writeFileSync(join(output,'night.json.gz'),gzipSync(JSON.stringify({workerSha256,backend:'Filament WebGL / SwiftShader software GPU',resolution:[1920,1080],deviceScaleFactor:1,night,landmark,surfaceLuminance:{day:dayLuminance,night:nightLuminance},errors}),{level:9}));console.log('READY night-school',JSON.stringify({landmark,surfaceLuminance:{day:dayLuminance.mean,night:nightLuminance.mean}}));
  if(recoveredSchool){
   const previous=JSON.parse(gunzipSync(readFileSync(join(output,'smithy.json.gz')))),v=previous.smithy,f=v.frames.at(-1),d=f.renderer,t=f.terrain;assert.equal(previous.workerSha256,workerSha256);assert.equal(previous.hour,11);assert.deepEqual(previous.errors,[]);assert.equal(v.frames.length,120);assert.equal(d.draws.loading,0);assert.equal(d.draws.pendingVisibleInstances,0);assert.equal(d.draws.construction.queued,0);assert.deepEqual(d.draws.failures,[]);assert.equal(d.models.buildQueue.queued,0);assert.equal(d.frame.deferredResources,0);assert.equal(d.frame.deferredRenderables,0);assert.equal(d.residency.overBudget,false);assert.equal(t.pending,0);assert.equal(t.baseValid,true);assert.equal(t.bakedSourceMatched,true);assert.equal(t.snapshotMs,0);assert(readFileSync(join(output,'smithy-facade.jpg')).length>10000);console.log('RETAIN exact-Worker smithy: original settled 120-frame receipt and inspected image');
  }else{
  // The matched services baseline faces the rear yard. Inspect the actual
  // west-facing smithy work bay as well, without changing that baseline route.
  await page.evaluate(()=>{worldHour=()=>11;stop();activateScene('overworld',74,40,false);view3d.yaw=-Math.PI/2;view3d.tilt=.27;view3d.zoom=102;__qaFrames.length=0;__qaPreviousFrame=0;});
  await page.waitForFunction(()=>{const d=realmGPU.diagnostics(),t=realmGPU.terrainWork;return __qaFrames.length>=60&&d.draws.loading===0&&d.draws.pendingVisibleInstances===0&&d.draws.construction.queued===0&&d.models.buildQueue.queued===0&&d.frame.deferredResources===0&&d.frame.deferredRenderables===0&&t?.pending===0;},{},{timeout:600000});
  await page.evaluate(()=>{__qaFrames.length=0;__qaPreviousFrame=0;});await page.waitForFunction(()=>__qaFrames.length>=120,{},{timeout:300000});
  const smithy=await page.evaluate(()=>({name:'smithy-facade',scene:currentScene,player:[s.x,s.y],camera:realmFilamentCameraState(),view:{...view3d},frames:__qaFrames.slice(-120)}));
  await page.screenshot({path:join(output,'smithy-facade.jpg'),type:'jpeg',quality:90,timeout:120000});
  writeFileSync(join(output,'smithy.json.gz'),gzipSync(JSON.stringify({workerSha256,hour:11,resolution:[1920,1080],deviceScaleFactor:1,smithy,errors}),{level:9}));console.log('READY smithy-facade');
  }
 }
 assert.deepEqual(errors,[]);const result={label,workerSha256,editorBindingErrors,startupMs,...(resumed?{resume:{retainedViews:resumed.results.map(r=>r.name),resumedStartupMs}}:{}),browser:await browser.version(),backend:'Filament WebGL / SwiftShader software GPU',resolution:[1920,1080],deviceScaleFactor:1,hour:11,results,errors,limitations:['Software rendering does not certify physical GPU or phone performance.']};writeFileSync(join(output,'result.json'),JSON.stringify(result,null,2));writeFileSync(join(output,'result.json.gz'),gzipSync(JSON.stringify(result),{level:9}));assert.deepEqual(editorBindingErrors,[],'saved editor objects must resolve before visual acceptance');if(process.env.VELDREN_QA_QUICK!=='1')assert.equal(results.length,routes.length);console.log(process.env.VELDREN_QA_QUICK==='1'?'DIAGNOSTIC':'PASS',label,results.length,'production-Filament views');
}catch(error){
  const state=await qaPage?.evaluate(()=>({trace:globalThis.__qaTerrainTrace,startup:globalThis.realmStartup,frames:globalThis.__qaFrames?.length||0,renderer:typeof realmGPU==='undefined'?null:realmGPU?.diagnostics?.(),terrain:typeof realmGPU==='undefined'?null:realmGPU?.terrainWork,recentFrames:globalThis.__qaFrames?.slice(-3),edits:globalThis.VELDREN_WORLD_EDITS_STATUS})).catch(()=>null);
 writeFileSync(join(output,'failure.json'),JSON.stringify({error:String(error),state,errors},null,2));
 await qaPage?.screenshot({path:join(output,'failure.png'),timeout:120000}).catch(()=>{});
 console.log('CAPTURE FAILURE',JSON.stringify({frames:state?.frames,draws:state?.renderer?.draws,frame:state?.renderer?.frame}));throw error;
}finally{clearInterval(heartbeat);await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));storage.close();await releaseGraphics();}
