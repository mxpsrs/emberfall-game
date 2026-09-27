// Local built-Worker acceptance. Uses a disposable account/database; no hosted
// service, real account, or character save is modified.
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {openLocalStorage} from '../scripts/local-storage.mjs';
import worker from '../dist/server/index.js';
const {chromium}=await import(process.env.VELDREN_PLAYWRIGHT?pathToFileURL(process.env.VELDREN_PLAYWRIGHT).href:'playwright');
const restoreDirectory=process.env.VELDREN_BROWSER_RESTORE;
if(restoreDirectory)assert.match(restoreDirectory,/[/\\]veldren-phase1-browser-[a-zA-Z0-9]+$/,'restore only a disposable acceptance fixture');
const data=restoreDirectory||mkdtempSync(join(tmpdir(),'veldren-phase1-browser-')),storage=openLocalStorage({dataDirectory:data}),{db,env}=storage;
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token=randomBytes(32).toString('hex');
if(!restoreDirectory)db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(owner,'PhaseOneQA','phaseoneqa',bcrypt.hashSync(randomBytes(32).toString('hex'),4),Date.now());
db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+86400000);
if(!restoreDirectory)db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run('account:'+owner,JSON.stringify({x:43,y:52,hp:10,gold:0,xp:{},bag:{},character:{name:'PhaseOneQA',look:0,race:'human',frame:'male',hair:0},storyOpeningSeen:true,metRowan:true}),1,new Date().toISOString());
if(restoreDirectory)assert.equal(db.prepare('SELECT username FROM game_accounts WHERE id=?').get(owner)?.username,'PhaseOneQA');
const requests=[],errors=[];let browser;
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);requests.push({path:req.url,method:req.method});const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});const response=await worker.fetch(request,env);if(response.status>=400)console.log('HTTP',response.status,req.method,req.url,(await response.clone().text()).slice(0,300));res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(e){console.error(e);res.statusCode=500;res.end(String(e));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;mkdirSync('.qa/phase3',{recursive:true});
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'ember_session',value:token,url:origin}]);
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e))});page.on('console',m=>{if(m.type()==='error')console.log(m.text())});
 await page.goto(origin+'/editor/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.location.pathname==='/editor/viewport.html');const frame=page.frames().find(f=>f.url().includes('viewport.html'));
 await frame.waitForFunction(()=>window.VeldrenEditorBridge?.isReady()||window.realmStartup?.failed,{},{timeout:600000});
 const initial=await frame.evaluate(()=>{if(!VeldrenEditorBridge.isReady())throw Error(JSON.stringify(realmStartup));const api=VeldrenEditorBridge,candidate=api.listEntities().find(e=>e.kind==='object'&&!e.protected&&e.entityId);api.selectByRef(candidate.kind,candidate.id);api.focusSelection();api.setTool('move');return candidate;});console.log('Selected',initial);
 await frame.waitForFunction(()=>!!VeldrenEditorTools.camera,{},{timeout:60000});
 await page.waitForTimeout(2000);await page.locator("#moveTool").click();await page.waitForTimeout(500);await page.screenshot({path:".qa/phase3/before-gizmo.png"});
 const drag=await frame.evaluate(()=>{const api=VeldrenEditorBridge,G=VeldrenEditorGeometry,id=api.getSelection().entityId,name=api.getSelection().scene,n=realmNative.scenes,camera=VeldrenEditorTools.camera,node=n.entity(name,id),pivot=api.displayMatrix(node).slice(12,15),size=G.length(G.sub(camera.eye,pivot))*(camera.top-camera.bottom)/camera.near*90/camera.height,surface=document.getElementById('world'),rect=surface.getBoundingClientRect(),screen=p=>{const q=G.project(camera,p);return {x:rect.left+q[0]*rect.width,y:rect.top+q[1]*rect.height}};return {id,name,before:JSON.stringify(node.transform),from:screen(G.add(pivot,[size*.7,0,0])),to:screen(G.add(pivot,[size*1.2,0,0]))};});
 console.log('Drag coordinates',drag);const iframeBox=await page.locator('iframe').boundingBox();await page.mouse.move(iframeBox.x+drag.from.x,iframeBox.y+drag.from.y);await page.mouse.down();await page.mouse.move(iframeBox.x+drag.to.x,iframeBox.y+drag.to.y,{steps:8});await page.mouse.up();
 await page.screenshot({path:".qa/phase3/after-gizmo.png"});console.log("Drag status",await frame.evaluate(()=>({dragging:VeldrenEditorTools.dragging,history:VeldrenEditorBridge.historyState(),selection:VeldrenEditorBridge.getSelection()})));
 const result=await frame.evaluate(drag=>{const api=VeldrenEditorBridge,n=realmNative.scenes,after=JSON.stringify(n.entity(drag.name,drag.id).transform);if(after===drag.before)throw Error('No canonical transform change');api.undo();if(JSON.stringify(n.entity(drag.name,drag.id).transform)!==drag.before)throw Error('Undo mismatch');api.redo();return {id:drag.id,changed:true,history:api.historyState(),cameraIndependent:!realmNative.step};},drag);
 await page.screenshot({path:'.qa/phase3/editor-gizmo.png'});assert.deepEqual(errors,[]);writeFileSync('.qa/phase3/gizmo-result.json',JSON.stringify({initial,result,errors},null,2));console.log('PASS',JSON.stringify(result));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));storage.close();}
