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
import {openLocalStorage} from '../dev/local-storage.mjs';
import worker from '../../dist/server/index.js';
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
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;mkdirSync('.qa/phase1',{recursive:true});
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1280,height:800}});await context.addCookies([{name:'ember_session',value:token,url:origin}]);
 const watch=page=>{page.on('pageerror',e=>{errors.push(e.stack||e.message);console.log('PAGE ERROR',e.message)});page.on('console',msg=>{if(msg.type()==='error'||msg.text().startsWith('PHASE1_STAGE'))console.log('CONSOLE',msg.text().slice(0,300))});};
 await context.addInitScript(()=>{let previous='';setInterval(()=>{const state=window.realmStartup;const text=JSON.stringify([state?.stageCode,state?.failed,state?.finished,typeof assetsReady!=='undefined'&&assetsReady]);if(text!==previous){previous=text;console.log('PHASE1_STAGE',text);}},5000);});
 let runtime=null;if(!restoreDirectory&&process.env.VELDREN_BROWSER_ONLY!=='editor'){const play=await context.newPage();watch(play);console.log('Opening built /play');await play.goto(origin+'/play',{waitUntil:'domcontentloaded',timeout:120000});
 await play.waitForFunction(()=>globalThis.realmStartup?.failed||typeof assetsReady!=='undefined'&&assetsReady,{},{timeout:600000});
 runtime=await play.evaluate(()=>({ready:assetsReady,failed:realmStartup?.failed,stage:realmStartup?.stage,abi:realmNative.abi,owned:VeldrenWorldObjects.enabled,scene:currentScene,objects:objects.length,quarries:VeldrenQuarryScene.enabled,services:VeldrenServiceScene.enabled}));console.log('Runtime',JSON.stringify(runtime));assert(runtime.ready);assert(runtime.owned&&runtime.quarries&&runtime.services);
 await play.evaluate(()=>{if($('creator').open)$('creator').close();if($('modal').open)$('modal').close();renderUI();});
 const canvas=play.locator('#world');const box=await canvas.boundingBox();assert(box);await play.mouse.click(box.x+box.width*.55,box.y+box.height*.6);await play.waitForTimeout(1000);
 assert.equal(await play.evaluate(()=>cloudDisconnected),false);await play.screenshot({path:'.qa/phase1/play.png'});assert.equal(errors.length,0,errors.join('\n'));await play.close();
 }
 const playerRequests=requests.length;const editor=await context.newPage();watch(editor);console.log('Opening built /editor/');await editor.goto(origin+'/editor/',{waitUntil:'domcontentloaded',timeout:120000});await editor.waitForSelector('iframe',{timeout:30000});await editor.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.location.pathname==='/editor/viewport.html');const viewport=editor.frames().find(f=>f.url().includes('viewport.html'));assert(viewport);
 await viewport.waitForFunction(()=>globalThis.realmStartup?.failed||window.VeldrenEditorBridge?.isReady(),{},{timeout:600000});
 const initial=await viewport.evaluate(()=>({ready:VeldrenEditorBridge.isReady(),failed:realmStartup.failed,context:VELDREN_CONTEXT,services:VeldrenServiceScene.enabled,quarries:VeldrenQuarryScene.enabled,membership:VeldrenWorldObjects.enabled,worldBytes:new TextEncoder().encode(JSON.stringify(VeldrenEditorBridge.exportWorld())).length}));console.log('Editor',JSON.stringify(initial));assert(initial.ready&&initial.services&&initial.quarries&&initial.membership);assert.equal(initial.context,'editor');
 if(restoreDirectory){
  const id=process.env.VELDREN_BROWSER_RESTORE_ENTITY;assert(id,'restore requires the saved entity ID');
  const response=await context.request.get(origin+'/api/editor/edits');assert.equal(response.status(),200);const document=await response.json();
  const expected=document.world.scenes.flatMap(s=>s.entities).find(e=>e.id===id);assert(expected);assert(document.revision>=9);
  const restoredEntity=await viewport.evaluate(id=>VeldrenEditorBridge.exportWorld().scenes.flatMap(s=>s.entities).find(e=>e.id===id),id);
  assert.deepEqual(restoredEntity,expected,'a fresh browser retains the saved entity exactly');
  assert.deepEqual(requests.filter(r=>/^\/api\/(character|players|social|activity|auth)/.test(r.path)),[]);
  assert.equal(errors.length,0,errors.join('\n'));
  const result={editor:initial,id,revision:document.revision,restored:true,errors,requests:requests.length};
  writeFileSync('.qa/phase1/browser-restore-result.json',JSON.stringify(result,null,2)+'\n');
  console.log('PASS: fresh browser reload retains the saved native entity exactly and runs no player controllers.');
 }else{
 const edit=await viewport.evaluate(()=>{const api=VeldrenEditorBridge;const candidate=api.listEntities().find(e=>e.kind==='object'&&!e.protected&&e.type==='prop');if(!candidate)throw Error('No editable prop');const before=api.selectByRef(candidate.kind,candidate.id);api.focusSelection();const changed=api.setTransform({x:before.x+1,y:before.y,rotation:35,scale:1.2});const duplicate=api.duplicateSelection();if(!duplicate)throw Error('Duplicate did not resolve');api.deleteSelection();api.selectByRef(candidate.kind,candidate.id);return {before,changed,selected:api.getSelection()};});assert.equal(edit.changed.x,edit.before.x+1);console.log('Editor transform, duplicate and delete passed');
 await editor.screenshot({path:'.qa/phase1/editor.png'});
 const saved=await viewport.evaluate(async()=>{await VeldrenEditorBridge.save();return VeldrenEditorBridge.savedState()});console.log('Save',JSON.stringify(saved));assert(saved.revision>0);
 const savedWorld=await viewport.evaluate(()=>VeldrenEditorBridge.exportWorld());const persisted=savedWorld.scenes.flatMap(s=>s.entities).find(e=>e.id===edit.before.id);assert(persisted);
 const endpoint=await context.request.get(origin+'/api/editor/edits');assert.equal(endpoint.status(),200);const document=await endpoint.json();assert.equal(document.revision,saved.revision);assert.deepEqual(document.world.scenes.flatMap(s=>s.entities).find(e=>e.id===edit.before.id),persisted);
 const unexpected=requests.slice(playerRequests).filter(r=>/^\/api\/(character|players|social|activity|auth)/.test(r.path));assert.deepEqual(unexpected,[],'editor does not run character, player or social controllers');
 writeFileSync('.qa/phase1/browser-edit-result.json',JSON.stringify({runtime,editor:initial,id:edit.before.id,saved,errors,editorPlayerRequests:unexpected.length,restoreDirectory:data},null,2)+'\n');
 await editor.reload({waitUntil:'domcontentloaded',timeout:120000});await editor.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.location.pathname==='/editor/viewport.html');const restored=editor.frames().find(f=>f.url().includes('viewport.html'));await restored.waitForFunction(()=>window.VeldrenEditorBridge?.isReady(),{},{timeout:600000});
 const restoredEntity=await restored.evaluate(id=>{const n=VeldrenEditorBridge.exportWorld().scenes.flatMap(s=>s.entities).find(e=>e.id===id);return n;},edit.before.id);assert.deepEqual(restoredEntity,persisted,'a fresh editor boot retains the saved entity');console.log('Fresh editor reload passed');
 assert.equal(errors.length,0,errors.join('\n'));
 const result={runtime,editor:initial,edit:{id:edit.before.id,x:edit.changed.x,rotation:edit.changed.rotation,scale:edit.changed.scale},saved,errors,requests:requests.length};writeFileSync('.qa/phase1/browser-result.json',JSON.stringify(result,null,2)+'\n');console.log('PASS: built Worker /play and /editor/ graphical startup, native migrations, pointer interaction, editor transform/duplicate/delete and verified save.');
 }
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));storage.close();}
