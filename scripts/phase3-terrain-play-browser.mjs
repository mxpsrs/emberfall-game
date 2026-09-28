// Local built-Worker acceptance. Uses a disposable account/database; no hosted
// service, real account, or character save is modified.
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {openLocalStorage} from '../scripts/local-storage.mjs';
import worker from '../dist/server/index.js';
console.log('Local Worker imported');
const {chromium}=await import(process.env.VELDREN_PLAYWRIGHT?pathToFileURL(process.env.VELDREN_PLAYWRIGHT).href:'playwright');
const restoreDirectory=process.env.VELDREN_BROWSER_RESTORE;
if(restoreDirectory)assert.match(restoreDirectory,/[/\\]veldren-phase1-browser-[a-zA-Z0-9]+$/,'restore only a disposable acceptance fixture');
const data=restoreDirectory||mkdtempSync(join(tmpdir(),'veldren-phase1-browser-')),storage=openLocalStorage({dataDirectory:data}),{db,env}=storage;
console.log('Disposable storage opened');
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token=randomBytes(32).toString('hex');
if(!restoreDirectory)db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(owner,'PhaseOneQA','phaseoneqa',bcrypt.hashSync(randomBytes(32).toString('hex'),4),Date.now());
db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+86400000);
if(!restoreDirectory)db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run('account:'+owner,JSON.stringify({x:43,y:52,hp:10,gold:0,xp:{},bag:{},character:{name:'PhaseOneQA',look:0,race:'human',frame:'male',hair:0},storyOpeningSeen:true,metRowan:true}),1,new Date().toISOString());
if(restoreDirectory)assert.equal(db.prepare('SELECT username FROM game_accounts WHERE id=?').get(owner)?.username,'PhaseOneQA');
const requests=[],errors=[];let browser,qaPage,profileTimer;
const stage=process.env.VELDREN_BROWSER_STAGE||'all';assert(['all','terrain','reload','play'].includes(stage));
const watch=page=>{page.on('console',msg=>{if(msg.type()==='error'||msg.text().startsWith('PHASE3_STAGE'))console.log(msg.text().slice(0,300));});page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',e.stack||String(e));});};
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);requests.push({path:req.url,method:req.method});const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});const response=await worker.fetch(request,env);if(response.status>=400)console.log('HTTP',response.status,req.method,req.url,(await response.clone().text()).slice(0,300));res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(e){console.error(e);res.statusCode=500;res.end(String(e));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;mkdirSync('.qa/phase3',{recursive:true});
try{
 console.log('Launching browser');
 browser=await chromium.launch({headless:true,...(process.env.VELDREN_CHROMIUM?{executablePath:process.env.VELDREN_CHROMIUM}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'ember_session',value:token,url:origin}]);
 await context.addInitScript(()=>{let previous='';setInterval(()=>{const state=globalThis.realmStartup;if(!state)return;const text=JSON.stringify([state.stageCode,state.failed,state.finished,globalThis.VeldrenEditorBridge?.isReady()]);if(text!==previous){previous=text;console.log('PHASE3_STAGE',text);}},5000);});
 let terrain,save,editorPage;
 if(stage==='all'||stage==='terrain'){
 const page=editorPage=qaPage=await context.newPage();page.on('console',msg=>{if(msg.type()==='error'||msg.text().startsWith('PHASE3_STAGE'))console.log(msg.text().slice(0,300));});page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',e.stack||String(e))});
 console.log('Opening editor',origin);
 await page.goto(origin+'/editor/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.VeldrenEditorBridge?.isReady()||document.querySelector('iframe')?.contentWindow?.realmStartup?.failed,{},{timeout:600000});
 console.log('Editor ready');
 const frame=page.frames().find(f=>f.url().includes('viewport.html'));
 assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.isReady()),true,'editor startup must succeed');
 const before=await frame.evaluate(()=>JSON.stringify(s));
 if(process.env.VELDREN_BROWSER_PROFILE){const cdp=await context.newCDPSession(page);await cdp.send('Debugger.enable');cdp.on('Debugger.paused',async event=>{console.log('PROFILE_STACK',JSON.stringify(event.callFrames.slice(0,18).map(f=>({name:f.functionName,url:f.url,line:f.location.lineNumber}))));await cdp.send('Debugger.resume').catch(()=>{});});profileTimer=setInterval(()=>cdp.send('Debugger.pause').catch(()=>{}),30000);}
 console.log('Scene selector options',await page.locator('#sceneSelect').evaluate(e=>Array.from(e.options,o=>o.value).slice(0,6)));
 await page.locator('#sceneSelect').selectOption('overworld',{timeout:90000});console.log('Scene selection event finished');
 assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.sceneName()),'overworld');assert.equal(await frame.evaluate(()=>JSON.stringify(s)),before,'scene selection leaves character state unchanged');
 console.log('Independent scene selector passed');
 const cameraAligned=()=>{const c=VeldrenEditorTools?.camera,p=VeldrenEditorBridge.cameraState();return c&&[...c.eye,...c.center].every(Number.isFinite)&&Math.abs(c.center[0]-p.x-.5)<.02&&Math.abs(c.center[2]-p.y-.5)<.02;};
 await frame.waitForFunction(cameraAligned,{},{timeout:30000});
 const stationary=await frame.evaluate(()=>VeldrenEditorBridge.cameraState());
 await frame.evaluate(()=>VeldrenEditorBridge.setCameraKey('d',true));
 try{await frame.waitForFunction(x=>Math.abs(VeldrenEditorBridge.cameraState().x-x)>.05,stationary.x,{timeout:30000});}finally{await frame.evaluate(()=>VeldrenEditorBridge.clearCameraKeys());}
 await frame.waitForFunction(cameraAligned,{},{timeout:30000});
 assert.equal(await frame.evaluate(()=>JSON.stringify(s)),before,'camera movement leaves character state unchanged');
 assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.historyState().undo),0,'camera movement creates no authored commands');
 assert.deepEqual(errors,[],'overworld drawing must remain read-only');
 console.log('Rendered camera follows detached navigation');
 const terrainBefore=await frame.evaluate(()=>VeldrenTerrainEdits.serialize());
 await page.locator('#terrainTool').click();
 const box=await frame.locator('#world').boundingBox();assert(box);
 const ground=await frame.evaluate(()=>{
  const candidates=[];
  for(const y of [.82,.9,.7,.6])for(const x of [.5,.4,.6,.3,.7]){
   const p=unproject3(screen.w*x,screen.h*y);
   if(Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=0&&p.z>=0&&p.x<1152&&p.z<768&&!worldWaterSurface(p.x,p.z))candidates.push({x,y,world:p});
  }
  return {point:candidates[0],camera:VeldrenEditorBridge.cameraState(),anchor:[px,py],view:{...view3d},distance:cameraDistance3(),height:walkSurfaceHeight(px+.5,py+.5),frame:meshFrame3,renderer:realmGPU?.kind,size:[screen.w,screen.h],sample:unproject3(screen.w*.5,screen.h*.5)};
 });
 console.log('Terrain ground probe',JSON.stringify(ground));
 if(!ground.point)writeFileSync('.qa/phase3/terrain-camera-failure.json',JSON.stringify(ground,null,2));
 assert(ground.point,'visible ground must be available for a terrain stroke');
 const gx=box.x+box.width*ground.point.x,gy=box.y+box.height*ground.point.y;
 await page.mouse.move(gx,gy);await page.mouse.down();await page.mouse.move(gx+box.width*.025,gy,{steps:4});await page.mouse.up();
 terrain=await frame.evaluate(()=>VeldrenTerrainEdits.serialize());assert(terrain.scenes.overworld.heightNodes.length>0,'pointer stroke sculpts visible overworld');assert.notDeepEqual(terrain,terrainBefore,'stroke changes the saved terrain baseline');
 const state=await frame.evaluate(()=>VeldrenEditorBridge.historyState());assert.equal(state.undo,1);assert(state.dirty);
 await page.locator('#undoCommand').click();assert.deepEqual(await frame.evaluate(()=>VeldrenTerrainEdits.serialize()),terrainBefore);assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.historyState().dirty),false);
 await page.waitForFunction(()=>document.querySelector('#saveState').textContent==='No unsaved changes');
 await page.locator('#redoCommand').click();assert.deepEqual(await frame.evaluate(()=>VeldrenTerrainEdits.serialize()),terrain);
 console.log('Terrain pointer, native history and dirty boundary passed');
 await page.screenshot({path:'.qa/phase3/overworld-terrain.png'});
 save=await frame.evaluate(()=>VeldrenEditorBridge.save());assert(save.roundTripVerified);
 assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>/^\/api\/(character|players|social|activity)/.test(r.path)).length,0);
 writeFileSync('.qa/phase3/terrain-checkpoint.json',JSON.stringify({fixture:data,terrain,save:{revision:save.revision,roundTripVerified:save.roundTripVerified}}));
 if(stage==='terrain'){assert.deepEqual(errors,[]);await page.close();console.log('PASS: rendered camera, terrain pointer/history and verified save');}
 }else{const checkpoint=JSON.parse(readFileSync('.qa/phase3/terrain-checkpoint.json','utf8'));assert.equal(checkpoint.fixture,data,'resume the same disposable saved fixture');({terrain,save}=checkpoint);}
 if(stage==='all'||stage==='reload'){
 let page=editorPage;
 if(page)await page.reload({waitUntil:'domcontentloaded'});else{page=qaPage=await context.newPage();watch(page);await page.goto(origin+'/editor/',{waitUntil:'domcontentloaded',timeout:120000});}
await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.VeldrenEditorBridge?.isReady()||document.querySelector('iframe')?.contentWindow?.realmStartup?.failed,{},{timeout:600000});
 const fresh=page.frames().find(f=>f.url().includes('viewport.html'));assert.equal(await fresh.evaluate(()=>VeldrenEditorBridge.isReady()&&!realmStartup.failed),true,'fresh editor startup succeeds');assert.deepEqual(await fresh.evaluate(()=>VeldrenTerrainEdits.serialize()),terrain);
 assert.equal(requests.filter(r=>/^\/api\/(character|players|social|activity)/.test(r.path)).length,0);
 assert.deepEqual(errors,[]);writeFileSync('.qa/phase3/terrain-reload-result.json',JSON.stringify({fixture:data,revision:save.revision,verified:true,errors},null,2));
 console.log('PASS: terrain verified save/reload and editor isolation');await page.close();
 }
 if(stage==='all'||stage==='play'){

 const play=await context.newPage();play.on('console',msg=>{if(msg.type()==='error'||msg.text().startsWith('PHASE3_STAGE'))console.log(msg.text().slice(0,300));});play.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',e.stack||String(e))});await play.goto(origin+'/play',{waitUntil:'domcontentloaded',timeout:120000});
 await play.waitForFunction(()=>globalThis.realmStartup?.failed||typeof assetsReady!=='undefined'&&assetsReady,{},{timeout:600000});
 const runtime=await play.evaluate(()=>({ready:assetsReady,failed:realmStartup?.failed,abi:realmNative.abi,owned:VeldrenWorldObjects.enabled,scene:currentScene,quarries:VeldrenQuarryScene.enabled,services:VeldrenServiceScene.enabled,terrain:VeldrenTerrainEdits.serialize()}));
 assert(runtime.ready&&!runtime.failed&&runtime.owned&&runtime.quarries&&runtime.services);assert.deepEqual(runtime.terrain,terrain);
 await play.evaluate(()=>{if($('creator').open)$('creator').close();if($('modal').open)$('modal').close();renderUI();});const canvas=await play.locator('#world').boundingBox();assert(canvas);await play.mouse.click(canvas.x+canvas.width*.55,canvas.y+canvas.height*.6);await play.waitForTimeout(1000);
 assert.equal(await play.evaluate(()=>cloudDisconnected),false);await play.screenshot({path:'.qa/phase3/play-regression.png'});assert.deepEqual(errors,[]);
 writeFileSync('.qa/phase3/terrain-play-result.json',JSON.stringify({fixture:data,terrainNodes:terrain.scenes.overworld.heightNodes.length,save:{revision:save.revision,verified:save.roundTripVerified},runtime:{...runtime,terrain:undefined},errors},null,2));
 console.log('PASS: /play load, saved terrain, canonical ownership and movement');
 }
}catch(error){console.error('Browser acceptance failed',error);await qaPage?.screenshot({path:'.qa/phase3/terrain-failure.png',timeout:15000}).catch(()=>{});throw error;}finally{clearInterval(profileTimer);await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));storage.close();}
