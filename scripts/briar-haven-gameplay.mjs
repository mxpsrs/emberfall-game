// Real pointer input and movement against the local, built review Worker.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

process.env.VELDREN_PREVIEW_PORT=process.env.VELDREN_PREVIEW_PORT||'8797';
process.env.VELDREN_PREVIEW_DATA=mkdtempSync(join(tmpdir(),'briar-gameplay-'));
await import('./briar-haven-preview.mjs');
const {chromium}=await import(pathToFileURL(process.env.VELDREN_PLAYWRIGHT||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const origin='http://127.0.0.1:'+process.env.VELDREN_PREVIEW_PORT;
const output=resolve('docs/qa/briar-haven/gameplay');mkdirSync(output,{recursive:true});
const errors=[];let browser,page;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.VELDREN_CHROMIUM||'/tmp/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
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
  setWalkInDoor(b.service,false,true);activateScene('overworld',...outside,false);view3d.yaw=0;view3d.tilt=.30;view3d.zoom=102;renderUI();
  window.__gameplayInn=b.service.destination;return {name:b.name,id:b._sceneEntityId,outside,inside,frame:meshFrame3};
 });
 await page.waitForFunction(frame=>meshFrame3>frame+2,inn.frame,{timeout:30000});
 const door=await page.evaluate(()=>{
  const h=hitboxes.find(h=>h.door&&h.o.destination===__gameplayInn);if(!h)return null;
  const x=h.polygon.reduce((n,p)=>n+p.x,0)/h.polygon.length,y=h.polygon.reduce((n,p)=>n+p.y,0)/h.polygon.length;
  return {pixel:[x,y],size:[screen.w,screen.h],picked:worldHits3(x,y)[0]?.o.destination};
 });
 assert(door&&door.picked===await page.evaluate(()=>__gameplayInn),'the rendered door is picked before its wall');
 await page.mouse.click(box.x+door.pixel[0]*box.width/door.size[0],box.y+door.pixel[1]*box.height/door.size[1]);
 await page.waitForFunction(()=>buildings.find(b=>b.service?.destination===__gameplayInn).service.openedAt!==undefined,{},{timeout:30000});
 await page.evaluate(()=>openBuilding3(buildings.find(b=>b.service?.destination===__gameplayInn)));
 await page.waitForFunction(()=>s.insideBuilding===__gameplayInn&&!path.length,{},{timeout:60000});
 assert.equal(await page.evaluate(()=>{const b=buildings.find(b=>b.service?.destination===__gameplayInn);setWalkInDoor(b.service,false,true);return buildingRoofHidden(b);}),true,'closing the door keeps the occupied cutaway');
 await page.evaluate(()=>{const b=buildings.find(b=>b.service?.destination===__gameplayInn);setWalkInDoor(b.service,true,true);walkTo(...doorApproach(b.service,false));});
 await page.waitForFunction(()=>!s.insideBuilding&&!path.length,{},{timeout:60000});
 assert.equal(await page.evaluate(()=>buildingRoofHidden(buildings.find(b=>b.service?.destination===__gameplayInn))),false,'walking outside restores the full roof');
 assert.equal(await page.evaluate(()=>cloudDisconnected||cloudConflict),false);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:join(output,'returned-outside.png'),timeout:120000});
 writeFileSync(join(output,'result.json'),JSON.stringify({localOnly:true,pointer:{cameraBefore,cameraDragged,cameraZoomed,walkTarget:[target.x,target.z]},inn,doorPicked:true,entered:true,closedDoorCutaway:true,exited:true,restoredRoof:true,errors},null,2)+'\n');
 console.log('PASS rendered door picking, physical entry/exit, occupied cutaway, restored roof and local account connection');
}catch(error){await page?.screenshot({path:join(output,'failure.png'),timeout:30000}).catch(()=>{});writeFileSync(join(output,'failure.json'),JSON.stringify({error:String(error),errors},null,2));console.error(error);process.exitCode=1;}
finally{await browser?.close();process.kill(process.pid,'SIGTERM');}
