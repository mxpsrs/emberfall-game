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
import {openLocalStorage} from '../dev/local-storage.mjs';
import {acquireBriarBrowserLock} from './briar-browser-lock.mjs';
const releaseGraphics=await acquireBriarBrowserLock();
const workerSha256=createHash('sha256').update(readFileSync('dist/server/index.js')).digest('hex');
const {default:worker}=await import('../../dist/server/index.js');
const {chromium}=await import(pathToFileURL(process.env.VELDREN_PLAYWRIGHT||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const restoreDirectory=process.env.VELDREN_BROWSER_RESTORE;
if(restoreDirectory)assert.match(restoreDirectory,/[/\\]veldren-phase1-browser-[a-zA-Z0-9]+$/,'restore only a disposable acceptance fixture');
const data=restoreDirectory||mkdtempSync(join(tmpdir(),'veldren-phase1-browser-')),storage=openLocalStorage({dataDirectory:data}),{db,env}=storage;
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token=randomBytes(32).toString('hex');
if(!restoreDirectory)db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(owner,'PhaseOneQA','phaseoneqa',bcrypt.hashSync(randomBytes(32).toString('hex'),4),Date.now());
db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+86400000);
if(!restoreDirectory)db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run('account:'+owner,JSON.stringify({x:43,y:52,hp:10,gold:0,xp:{},bag:{},character:{name:'PhaseOneQA',look:0,race:'human',frame:'male',hair:0},storyOpeningSeen:true,metRowan:true}),1,new Date().toISOString());
if(restoreDirectory)assert.equal(db.prepare('SELECT username FROM game_accounts WHERE id=?').get(owner)?.username,'PhaseOneQA');
const requests=[],errors=[];let browser,qaPage;
async function settledEditorView(frame){
 await frame.waitForFunction(()=>{
  const d=realmGPU?.diagnostics(),t=realmGPU?.terrainWork;
  return realmGPU?.presented&&!realmStartup.failed&&d?.frame&&d.draws.loading===0&&d.draws.pendingVisibleInstances===0&&d.draws.construction.queued===0&&d.models.buildQueue.queued===0&&d.frame.deferredResources===0&&d.frame.deferredRenderables===0&&(t?.pending??0)===0;
 },{},{timeout:600000});
 const view=await frame.evaluate(()=>({renderer:realmGPU.diagnostics(),terrain:realmGPU.terrainWork,scene:VeldrenEditorBridge.sceneName(),camera:VeldrenEditorBridge.cameraState()}));
 assert.deepEqual(view.renderer.draws.failures,[]);assert.equal(view.terrain.failures,0);return view;
}
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);requests.push({path:req.url,method:req.method});const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});const response=await worker.fetch(request,env);if(response.status>=400)console.log('HTTP',response.status,req.method,req.url,(await response.clone().text()).slice(0,300));res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(e){console.error(e);res.statusCode=500;res.end(String(e));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;mkdirSync('.qa/phase3',{recursive:true});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.VELDREN_CHROMIUM||'/tmp/chromium',args:[...(process.env.VELDREN_BROWSER_HOLD?['--remote-debugging-port=9223']:[]),'--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'ember_session',value:token,url:origin}]);
 const page=qaPage=await context.newPage();page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR STACK',e.stack||String(e))});page.on('console',m=>{if(m.type()==='error')console.log(m.text())});
 await page.goto(origin+'/editor/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.location.pathname==='/editor/viewport.html');const frame=page.frames().find(f=>f.url().includes('viewport.html'));
 await frame.waitForFunction(()=>window.VeldrenEditorBridge?.isReady()||window.realmStartup?.failed,{},{timeout:600000});

 await page.locator('#sceneSelect').selectOption('overworld',{timeout:90000});
 assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.sceneName()),'overworld');
 const initial=await frame.evaluate(()=>({scene:VeldrenEditorBridge.sceneName(),count:realmNative.scenes.read(VeldrenEditorBridge.sceneName()).entities.length}));
 console.log('Populated editor',initial);assert(initial.count>500);
 const fixture=await frame.evaluate(()=>{const api=VeldrenEditorBridge,n=realmNative.scenes,name=api.sceneName();api.executeCommand('Acceptance fixture',[
  {op:'create',entity:{id:'phase3-house',name:'Phase 3 acceptance house',transform:{position:[55,0,50]},components:{}}},
  {op:'create',entity:{id:'phase3-wall',name:'Phase 3 acceptance wall',parent:'phase3-house',components:{MeshRenderer:{asset:'rebuilt:Wall_Plaster_Straight',renderPath:'canonical'}}}},
  {op:'create',entity:{id:'phase3-other',name:'Phase 3 second parent',transform:{position:[60,0,50]},components:{}}}
 ]);api.selectEntity('phase3-wall');api.focusSelection();return {name};});
 await page.locator('#entitySearch').fill('Phase 3 acceptance');
 await page.locator('[data-entity-id="phase3-wall"] .canonical-name').click();
 const inspector=page.locator('#componentInspector');
 await inspector.getByLabel('Name',{exact:true}).fill('Phase 3 edited wall');await inspector.getByLabel('Name',{exact:true}).press('Tab');
 assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.sceneEntity('phase3-wall').name),'Phase 3 edited wall');
 const transform=inspector.locator('fieldset').filter({has:page.locator('legend', {hasText:'Local Transform'})});
 await page.evaluate(()=>{window.__phase3InspectorEvents=[];const panel=document.querySelector('#componentInspector');for(const type of ['input','change','focusin','focusout'])panel.addEventListener(type,event=>{if(event.target.matches('input'))__phase3InspectorEvents.push({type,label:event.target.getAttribute('aria-label'),value:event.target.value});},true);});
 console.log('Inspector before numeric edit',await frame.evaluate(()=>VeldrenEditorBridge.sceneEntity('phase3-wall').transform));
 await transform.getByLabel('Y',{exact:true}).first().fill('1.25');
 console.log('Inspector numeric input',await transform.getByLabel('Y',{exact:true}).first().inputValue());
 await transform.getByLabel('Y',{exact:true}).first().press('Tab');
 console.log('Inspector after numeric edit',await frame.evaluate(()=>VeldrenEditorBridge.sceneEntity('phase3-wall').transform),await page.evaluate(()=>__phase3InspectorEvents));
 assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.sceneEntity('phase3-wall').transform.position[1]),1.25);
 await page.locator('#undoCommand').click();assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.sceneEntity('phase3-wall').transform.position[1]),0);await page.locator('#redoCommand').click();
 console.log('Inspector UI edits and undo/redo passed');
 const reparent=await frame.evaluate(()=>{const api=VeldrenEditorBridge,before=api.sceneEntity('phase3-wall').worldMatrix;api.executeCommand('Reparent acceptance',[{op:'reparent',id:'phase3-wall',parent:'phase3-other',preserveWorld:true}]);const after=api.sceneEntity('phase3-wall').worldMatrix;api.undo();return {before,after};});assert.deepEqual(reparent.before,reparent.after);
 const prefab=await frame.evaluate(()=>{const api=VeldrenEditorBridge;api.selectEntity('phase3-house');const definition=api.createPrefab('phase3-house','Acceptance house prefab').created[0],copy=api.instantiatePrefab(definition).created[0];return {definition,copy};});
 await page.locator('#entitySearch').fill('');
 assert.equal(await frame.evaluate(id=>!!VeldrenEditorBridge.sceneEntity(id).components.PrefabInstance,prefab.copy),true);
 await inspector.getByRole('button',{name:'Update all instances'}).click();
 console.log('Hierarchy and prefab actions passed');
 const buildingResult=await frame.evaluate(()=>{const api=VeldrenEditorBridge,n=realmNative.scenes,scene=api.sceneName(),candidate=api.listEntities().find(e=>e.kind==='building'&&/Wayfarer.*Rest|Briarhaven/i.test(e.name));if(!candidate)throw Error('No populated building fixture');api.selectByRef(candidate.kind,candidate.id);const before=n.entity(scene,candidate.entityId),state=api.enterBuilding();const part=state.parts.find(p=>p.role==='wall');if(!part)throw Error('Building has no wall');api.selectPart(part.id);const original=api.buildingState().parts.find(p=>p.id===part.id).local[3],undo=api.historyState().undo;api.setPart({x:original+.25});if(api.historyState().undo!==undo+1)throw Error('Building edit was not grouped');api.undo();if(api.buildingState().parts.find(p=>p.id===part.id).local[3]!==original)throw Error('Building undo failed');api.redo();api.exitBuilding();return {name:candidate.name,part:part.id,history:api.historyState()};});console.log('Building acceptance',buildingResult);
 await frame.waitForFunction(()=>!realmStartup.failed,{},{timeout:30000});
 await frame.evaluate(()=>{VeldrenEditorBridge.selectEntity('phase3-wall');VeldrenEditorBridge.focusSelection();VeldrenEditorBridge.setTool('move');});
 const cameraCharacter=await frame.evaluate(()=>JSON.stringify(s)),cameraBefore=await frame.evaluate(()=>VeldrenEditorBridge.cameraState());
 const cameraUndo=await frame.evaluate(()=>VeldrenEditorBridge.historyState().undo);
 await frame.evaluate(()=>VeldrenEditorBridge.setCameraKey('d',true));
 try{await frame.waitForFunction(x=>Math.abs(VeldrenEditorBridge.cameraState().x-x)>.08,cameraBefore.x,{timeout:30000});}finally{await frame.evaluate(()=>VeldrenEditorBridge.clearCameraKeys());}
 assert.equal(await frame.evaluate(()=>JSON.stringify(s)),cameraCharacter);assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.historyState().undo),cameraUndo);
 const focusFrame=await frame.evaluate(()=>{VeldrenEditorBridge.selectEntity('phase3-wall');VeldrenEditorBridge.focusSelection();VeldrenEditorBridge.setTool('move');return meshFrame3;});
 await frame.waitForFunction(value=>meshFrame3>value+2&&!!VeldrenEditorTools.camera,focusFrame,{timeout:30000});
 const gizmo=await frame.evaluate(()=>{const api=VeldrenEditorBridge,G=VeldrenEditorGeometry,c=VeldrenEditorTools.camera,node=api.sceneEntity('phase3-wall'),pivot=api.displayMatrix(node).slice(12,15),size=G.length(G.sub(c.eye,pivot))*(c.top-c.bottom)/c.near*90/c.height,r=document.getElementById('world').getBoundingClientRect(),project=p=>{const q=G.project(c,p);return [r.left+q[0]*r.width,r.top+q[1]*r.height];};return {before:JSON.stringify(node.transform),position:node.worldMatrix.slice(12,15),from:project(G.add(pivot,[size*.7,0,0])),to:project(G.add(pivot,[size*.7+Math.max(.75,size*.65),0,0]))};});
 const iframeBox=await page.locator('iframe').boundingBox();await page.mouse.move(iframeBox.x+gizmo.from[0],iframeBox.y+gizmo.from[1]);await page.mouse.down();gizmo.started=await frame.evaluate(()=>JSON.stringify(VeldrenEditorBridge.sceneEntity('phase3-wall').transform));await page.mouse.move(iframeBox.x+gizmo.to[0],iframeBox.y+gizmo.to[1],{steps:8});await page.mouse.up();
 assert(await frame.evaluate(p=>Math.hypot(...VeldrenEditorBridge.sceneEntity('phase3-wall').worldMatrix.slice(12,15).map((v,i)=>v-p[i]))>.2,gizmo.position),'actual gizmo drag moves the native entity by a snapped translation');
 await frame.evaluate(()=>VeldrenEditorBridge.undo());assert.equal(await frame.evaluate(()=>JSON.stringify(VeldrenEditorBridge.sceneEntity('phase3-wall').transform)),gizmo.started);await frame.evaluate(()=>VeldrenEditorBridge.redo());
 console.log('PASS actual detached camera and rendered gizmo drag/undo/redo');
 const terrainBefore=await frame.evaluate(()=>VeldrenTerrainEdits.serialize()),terrainUndo=await frame.evaluate(()=>VeldrenEditorBridge.historyState().undo);
 await page.locator('#terrainTool').click();
 const ground=await frame.evaluate(()=>{for(const y of [.82,.9,.7,.6])for(const x of [.5,.4,.6,.3,.7]){const p=unproject3(screen.w*x,screen.h*y);if(Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=0&&p.z>=0&&p.x<1152&&p.z<768&&!worldWaterSurface(p.x,p.z)&&!buildings.some(b=>p.x>=b.x-.7&&p.x<=b.x+b.w+.7&&p.z>=b.y-.7&&p.z<=b.y+b.h+.7))return {x,y};}return null;});assert(ground,'visible editable ground');
 const canvas=await frame.locator('#world').boundingBox(),gx=canvas.x+canvas.width*ground.x,gy=canvas.y+canvas.height*ground.y;
 await page.mouse.move(gx,gy);await page.mouse.down();await page.mouse.move(gx+canvas.width*.025,gy,{steps:4});await page.mouse.up();
 const terrainAfter=await frame.evaluate(()=>VeldrenTerrainEdits.serialize());assert.notDeepEqual(terrainAfter,terrainBefore);assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.historyState().undo),terrainUndo+1);
 await page.locator('#undoCommand').click();assert.deepEqual(await frame.evaluate(()=>VeldrenTerrainEdits.serialize()),terrainBefore);await page.locator('#redoCommand').click();assert.deepEqual(await frame.evaluate(()=>VeldrenTerrainEdits.serialize()),terrainAfter);
 console.log('PASS actual terrain pointer stroke and shared undo/redo');
 mkdirSync('docs/qa/briar-haven',{recursive:true});
 const terrainRendered=await settledEditorView(frame);
 await page.screenshot({path:'docs/qa/briar-haven/editor-terrain.png'});
 await page.screenshot({path:'docs/qa/briar-haven/editor-terrain.jpg',type:'jpeg',quality:90});
 await page.screenshot({path:'.qa/phase3/hierarchy-inspector.png'});
 console.log('PHASE save');const save=await frame.evaluate(()=>VeldrenEditorBridge.save());assert(save.roundTripVerified);assert.equal(await frame.evaluate(()=>VeldrenEditorBridge.historyState().dirty),false);
 const savedWall=await frame.evaluate(()=>VeldrenEditorBridge.sceneEntity('phase3-wall'));
 console.log('PHASE reload');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.VeldrenEditorBridge?.isReady(),{},{timeout:600000});
 const restoredFrame=page.frames().find(f=>f.url().includes('viewport.html'));
 const restored=await restoredFrame.evaluate(({id,definition})=>({wall:VeldrenEditorBridge.sceneEntity('phase3-wall'),instance:VeldrenEditorBridge.sceneEntity(id),definition:VeldrenEditorBridge.sceneEntity(definition)}),{id:prefab.copy,definition:prefab.definition});assert.deepEqual(restored.wall,savedWall);assert(restored.instance.components.PrefabInstance);assert(restored.definition.components.PrefabDefinition);
 assert.deepEqual(await restoredFrame.evaluate(()=>VeldrenTerrainEdits.serialize()),terrainAfter,'authored terrain survives verified save and fresh reload');console.log('PHASE restored');const reloadRendered=await settledEditorView(restoredFrame);await restoredFrame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:'docs/qa/briar-haven/editor-reloaded.png'});await page.screenshot({path:'docs/qa/briar-haven/editor-reloaded.jpg',type:'jpeg',quality:90});
 assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>/^\/api\/(character|players|social|activity)/.test(r.path)).length,0);
 writeFileSync('docs/qa/briar-haven/editor-result.json',JSON.stringify({localOnly:true,workerSha256,initial,prefab,buildingResult,save:{revision:save.revision,verified:save.roundTripVerified},cameraMovement:true,gizmoDrag:true,terrainStroke:true,reload:true,renderedViews:{terrain:terrainRendered,reload:reloadRendered},errors},null,2));console.log('PASS: populated hierarchy, Inspector, native prefabs, grouped building edit, save/reload and editor isolation');
}catch(error){await qaPage?.screenshot({path:'.qa/phase3/authoring-failure.png'}).catch(()=>{});console.error(error);if(process.env.VELDREN_BROWSER_HOLD){console.log('Diagnostic browser retained on localhost:9223');await new Promise(()=>{});}throw error;}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));storage.close();await releaseGraphics();}
