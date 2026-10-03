// Real pointer input and movement against the local, built review Worker.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {acquireBriarBrowserLock} from './briar-browser-lock.mjs';

const releaseGraphics=await acquireBriarBrowserLock();
const workerSha256=createHash('sha256').update(readFileSync('dist/server/index.js')).digest('hex');
process.env.VELDREN_PREVIEW_PORT=process.env.VELDREN_PREVIEW_PORT||'8797';
process.env.VELDREN_PREVIEW_DATA=mkdtempSync(join(tmpdir(),'briar-gameplay-'));
await import('./briar-haven-preview.mjs');
const {chromium}=await import(pathToFileURL(process.env.VELDREN_PLAYWRIGHT||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const origin='http://127.0.0.1:'+process.env.VELDREN_PREVIEW_PORT;
const output=resolve('docs/qa/briar-haven/gameplay');mkdirSync(output,{recursive:true});
const errors=[],networkFailures=[];let browser,page,currentBuilding=null;
const recoveries=[];
const settleView=()=>page.waitForFunction(()=>{
 const d=realmGPU?.diagnostics();return d&&d.frame&&!cloudDisconnected&&!cloudConflict&&d.draws.loading===0&&d.draws.pendingVisibleInstances===0&&d.draws.construction.queued===0&&d.models.buildQueue.queued===0&&d.frame.deferredResources===0&&d.frame.deferredRenderables===0&&(realmGPU.terrainWork?.pending??0)===0;
},{},{timeout:360000});
async function serverDoor(id,open){
 await page.evaluate(({id,open})=>{const b=buildings.find(b=>b._sceneEntityId===id);setWalkInDoor(b.service,open);},{id,open});
 await page.waitForFunction(({id,open})=>{const o=buildings.find(b=>b._sceneEntityId===id).service;return !cloudDisconnected&&!cloudConflict&&!sharedPending('door',o.id)&&(o.openedAt!==undefined)===open;},{id,open},{timeout:120000});
}
async function travelThroughDoor(building,inside){
 const goal=inside?building.inside:building.outside;
 for(let attempt=0;attempt<4;attempt++){
  await settleView();await serverDoor(building.id,true);const failuresBefore=networkFailures.length;
  const frame=await page.evaluate(({building,goal})=>{if(!walkTo(...goal))throw Error(building.name+' door travel has no route');return meshFrame3;},{building,goal});
  await page.waitForFunction(({building,goal,inside,frame})=>{
   const reached=!path.length&&Math.hypot(px-goal[0],py-goal[1])<.05&&(inside?s.insideBuilding===building.destination:!s.insideBuilding);
   // Logical tiles advance before the final rendered step reaches its endpoint.
   // Keep waiting at the target tile; an early stop elsewhere still fails.
   return reached||cloudDisconnected||cloudConflict||meshFrame3>frame+2&&!path.length&&(s.x!==goal[0]||s.y!==goal[1]);
  },{building,goal,inside,frame},{timeout:180000});
  const state=await page.evaluate(({building,goal,inside})=>({reached:!path.length&&Math.hypot(px-goal[0],py-goal[1])<.05&&(inside?s.insideBuilding===building.destination:!s.insideBuilding),position:[px,py],disconnected:cloudDisconnected,conflict:cloudConflict}),{building,goal,inside});
  if(state.reached)return;
  assert.equal(state.conflict,false,'local fixture must not have an account conflict');
  assert(state.disconnected||networkFailures.length>failuresBefore,building.name+' unexpectedly stopped door travel without a connection interruption');
  // Keep the physical endpoint and collision checks. A software-GPU stall can
  // expire the real presence channel. Resume the same walk after the existing
  // reconnect flow and record it; never change server timeouts or teleport.
  recoveries.push({building:building.name,leg:inside?'enter':'exit',attempt:attempt+1,position:state.position,failures:networkFailures.slice(failuresBefore)});
  console.log('RECOVER software-render connection interruption',building.name,inside?'enter':'exit');
  await page.waitForFunction(()=>!cloudDisconnected&&!cloudConflict,{},{timeout:120000});
 }
 throw Error(building.name+' could not complete physical door travel after connection recovery');
}
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.VELDREN_CHROMIUM||'/tmp/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 await context.addInitScript(()=>{window.VELDREN_PERFORMANCE=true;});
 page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 page.on('requestfailed',request=>{const url=new URL(request.url());if(url.pathname.startsWith('/api/'))networkFailures.push({path:url.pathname,method:request.method(),error:request.failure()?.errorText});});
 page.on('response',response=>{const url=new URL(response.url());if(url.pathname.startsWith('/api/')&&response.status()>=400){const failure={path:url.pathname,status:response.status()};networkFailures.push(failure);response.json().then(body=>{failure.error=body.error;}).catch(()=>{});}});
 await page.goto(origin+'/preview',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>realmStartup?.failed||typeof assetsReady!=='undefined'&&assetsReady,{},{timeout:600000});
 assert.equal(await page.evaluate(()=>!!realmStartup.failed),false);
 assert.deepEqual(await page.evaluate(()=>VELDREN_WORLD_EDITS_STATUS.errors),[],'saved editor objects resolve in gameplay');
 await page.evaluate(()=>{if($('creator').open)$('creator').close();if($('modal').open)$('modal').close();worldHour=()=>11;renderUI();});
 const box=await page.locator('#world').boundingBox();assert(box);
 const cameraBefore=await page.evaluate(()=>({...view3d}));
 await page.mouse.move(box.x+box.width*.60,box.y+box.height*.32);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.60+75,box.y+box.height*.32+25,{steps:8});await page.mouse.up();
 const cameraDragged=await page.evaluate(()=>({...view3d}));
 assert(cameraDragged.yaw-cameraBefore.yaw>.2,'pointer drag orbits the actual camera');
 assert(cameraDragged.tilt>cameraBefore.tilt,'pointer drag pitches the actual camera');
 await page.mouse.wheel(0,180);
 const cameraZoomed=await page.evaluate(()=>({...view3d}));
 assert(cameraZoomed.zoom<cameraDragged.zoom&&cameraZoomed.zoom>=cameraZoomed.min,'wheel zoom follows limits');
 await page.waitForFunction(()=>Math.abs(cameraPose3().yaw-view3d.yaw)<.02&&Math.abs(cameraPose3().pitch-view3d.tilt)<.01,{},{timeout:30000});
 const target=await page.evaluate(()=>{
  for(let r=2;r<=5;r++)for(const [dx,dz]of [[r,0],[0,-r],[-r,0],[0,r],[r,-r]]){
   const x=s.x+dx,z=s.y+dz;if(!land(x,z)||!route(x,z))continue;
   const p=project3(x+.5,.02+walkSurfaceHeight(x+.5,z+.5)-landHeight(x+.5,z+.5),z+.5),picked=unproject3(p.x,p.y);
   if(p.x>150&&p.x<screen.w-220&&p.y>80&&p.y<screen.h-100&&Math.floor(picked.x)===x&&Math.floor(picked.z)===z&&!worldHits3(p.x,p.y).length)return {x,z,pixel:[p.x,p.y],size:[screen.w,screen.h]};
  }return null;
 });
 assert(target,'a clear visible street tile can be picked');
 await page.mouse.click(box.x+target.pixel[0]*box.width/target.size[0],box.y+target.pixel[1]*box.height/target.size[1]);
 await page.waitForFunction(({x,z})=>s.x===x&&s.y===z&&!path.length&&Math.hypot(px-x,py-z)<.05,target,{timeout:60000});
 console.log('PASS actual drag, pitch, wheel zoom and click-to-walk',JSON.stringify([target.x,target.z]));
 const inn=await page.evaluate(()=>{
  const b=buildings.find(b=>b.settlement==='briarhaven'&&b.archetype==='inn');if(!b)throw Error('Briar inn absent');
  const outside=doorApproach(b.service,false),inside=doorApproach(b.service,true);
  activateScene('overworld',...outside,false);view3d.yaw=0;view3d.tilt=.30;view3d.zoom=102;renderUI();
  window.__gameplayInn=b.service.destination;return {name:b.name,id:b._sceneEntityId,outside,inside,frame:meshFrame3};
 });
 await settleView();await serverDoor(inn.id,false);
 await page.waitForFunction(frame=>meshFrame3>frame+2,inn.frame,{timeout:30000});
 const door=await page.evaluate(()=>{
  const h=hitboxes.find(h=>h.door&&h.o.destination===__gameplayInn);if(!h)return null;
  const x=h.polygon.reduce((n,p)=>n+p.x,0)/h.polygon.length,y=h.polygon.reduce((n,p)=>n+p.y,0)/h.polygon.length;
  return {pixel:[x,y],size:[screen.w,screen.h],picked:worldHits3(x,y)[0]?.o.destination};
 });
 assert(door&&door.picked===await page.evaluate(()=>__gameplayInn),'the rendered door is picked before its wall');
 await page.mouse.click(box.x+door.pixel[0]*box.width/door.size[0],box.y+door.pixel[1]*box.height/door.size[1]);
 await page.waitForFunction(()=>{const o=buildings.find(b=>b.service?.destination===__gameplayInn).service;return o.openedAt!==undefined&&!sharedPending('door',o.id);},{},{timeout:120000});
 await page.evaluate(()=>openBuilding3(buildings.find(b=>b.service?.destination===__gameplayInn)));
 await page.waitForFunction(()=>s.insideBuilding===__gameplayInn&&!path.length,{},{timeout:60000});
 await serverDoor(inn.id,false);
 assert.equal(await page.evaluate(()=>buildingRoofHidden(buildings.find(b=>b.service?.destination===__gameplayInn))),true,'closing the door keeps the occupied cutaway');
 await serverDoor(inn.id,true);
 await page.evaluate(()=>{const b=buildings.find(b=>b.service?.destination===__gameplayInn);if(!walkTo(...doorApproach(b.service,false)))throw Error('Inn exit route is blocked');});
 await page.waitForFunction(()=>!s.insideBuilding&&!path.length,{},{timeout:60000});
 assert.equal(await page.evaluate(()=>buildingRoofHidden(buildings.find(b=>b.service?.destination===__gameplayInn))),false,'walking outside restores the full roof');
 const buildingIds=await page.evaluate(()=>buildings.filter(b=>b.briarDesign).map(b=>b._sceneEntityId));
 assert.equal(buildingIds.length,12,'all twelve rebuilt buildings are present in the actual runtime');
 const traversal=[];
 for(const id of buildingIds){
 let building=await page.evaluate(id=>{
   const b=buildings.find(b=>b._sceneEntityId===id),outside=doorApproach(b.service,false),inside=doorApproach(b.service,true),threshold=doorThreshold(b.service);
   stop();activateScene('overworld',...outside,false);updateDoorThreshold();
   view3d.yaw=({south:0,north:Math.PI,east:Math.PI/2,west:-Math.PI/2})[b.doorFacing||'south'];view3d.tilt=.30;
   return {id,name:b.name,destination:b.service.destination,outside,inside,threshold};
  },id);
  currentBuilding=building;console.log('ENTER building traversal',building.name,JSON.stringify({outside:building.outside,inside:building.inside}));
  // SwiftShader can block the browser while a new view builds. Settle that work
  // before measuring physical door travel; this is not a hardware FPS test.
  await settleView();await serverDoor(id,false);
  building.closed=await page.evaluate(b=>inBuilding(buildings.find(o=>o._sceneEntityId===b.id),...b.threshold),building);
  await serverDoor(id,true);
  Object.assign(building,await page.evaluate(b=>({clear:!inBuilding(buildings.find(o=>o._sceneEntityId===b.id),...b.threshold),planned:route(...b.inside)}),building));
  assert(building.closed&&building.clear,building.name+' server-confirmed door collision matches its open state');
  assert(building.planned,building.name+' has an entrance route');
  await travelThroughDoor(building,true);
  assert.equal(await page.evaluate(id=>buildingRoofHidden(buildings.find(b=>b._sceneEntityId===id)),id),true,building.name+' retains its occupied cutaway');
  await travelThroughDoor(building,false);
  assert.equal(await page.evaluate(id=>buildingRoofHidden(buildings.find(b=>b._sceneEntityId===id)),id),false,building.name+' restores its roof after exit');
  traversal.push({...building,entered:true,exited:true});console.log('PASS building traversal',building.name);
 }
 await page.evaluate(outside=>{stop();activateScene('overworld',...outside,false);view3d.yaw=0;view3d.tilt=.30;renderUI();},inn.outside);
 assert.equal(await page.evaluate(()=>cloudDisconnected||cloudConflict),false);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:join(output,'returned-outside.png'),timeout:120000});
 await page.screenshot({path:join(output,'returned-outside.jpg'),type:'jpeg',quality:90,timeout:120000});
 writeFileSync(join(output,'result.json'),JSON.stringify({localOnly:true,workerSha256,pointer:{cameraBefore,cameraDragged,cameraZoomed,walkTarget:[target.x,target.z]},inn,doorPicked:true,entered:true,closedDoorCutaway:true,exited:true,restoredRoof:true,traversal,networkFailures,recoveries,errors},null,2)+'\n');
 console.log('PASS rendered door picking, physical entry/exit, occupied cutaway, restored roof and local account connection');
}catch(error){const state=await page?.evaluate(()=>({position:[px,py],tile:[s.x,s.y],insideBuilding:s.insideBuilding,path,cloud:{disconnected:cloudDisconnected,conflict:cloudConflict,recovering:cloudRecovering,saveBusy:cloudBusy,syncBusy:onlineSyncBusy}})).catch(()=>null);await page?.screenshot({path:join(output,'failure.png'),timeout:30000}).catch(()=>{});writeFileSync(join(output,'failure.json'),JSON.stringify({error:String(error),currentBuilding,state,networkFailures,errors},null,2));console.error(error);process.exitCode=1;}
finally{await browser?.close();await releaseGraphics();process.kill(process.pid,'SIGTERM');}
