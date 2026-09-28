// Opt-in measurements of the actual built world. All HTTP and saves stay local.
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openLocalStorage} from './local-storage.mjs';
import worker from '../dist/server/index.js';
const {chromium}=await import(process.env.VELDREN_PLAYWRIGHT?pathToFileURL(process.env.VELDREN_PLAYWRIGHT).href:'playwright');
const storage=openLocalStorage({dataDirectory:mkdtempSync(join(tmpdir(),'veldren-phase4-browser-'))}),{db,env}=storage;
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token=randomBytes(32).toString('hex');
db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(owner,'PhaseFourQA','phasefourqa',bcrypt.hashSync(randomBytes(32).toString('hex'),4),Date.now());
db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+86400000);
db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run('account:'+owner,JSON.stringify({x:43,y:52,hp:10,gold:0,xp:{},bag:{},character:{name:'PhaseFourQA',look:0,race:'human',frame:'male',hair:0},storyOpeningSeen:true,metRowan:true}),1,new Date().toISOString());
const errors=[],requests=[];let browser;
const savedWorld=process.env.VELDREN_STARTUP_WORLD?JSON.parse(readFileSync(process.env.VELDREN_STARTUP_WORLD,'utf8')):null;
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);requests.push(req.url);const response=savedWorld&&req.url==='/api/editor/edits'&&req.method==='GET'?Response.json(savedWorld):await worker.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),env);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(e){console.error(e);res.statusCode=500;res.end(String(e));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const output='.qa/startup';mkdirSync(output,{recursive:true});
try{
 browser=await chromium.launch({headless:true,...(process.env.VELDREN_CHROMIUM?{executablePath:process.env.VELDREN_CHROMIUM}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:956,height:440},isMobile:true,hasTouch:true,deviceScaleFactor:1});await context.addCookies([{name:'ember_session',value:token,url:origin}]);
 await context.addInitScript(()=>{window.__startupPaints=0;let previous='';setInterval(()=>{const stage=globalThis.realmStartup?.stage;if(stage&&stage!==previous){previous=stage;console.log('STARTUP STEP',stage);}},500);const watch=()=>{__startupPaints++;requestAnimationFrame(watch);};requestAnimationFrame(watch);});
 const results=[];
 for(const route of ['/play','/editor/']){
  const page=await context.newPage(),began=performance.now();page.on('pageerror',error=>{errors.push(String(error));console.error('PAGE ERROR',error);});
  page.on('console',message=>{if(message.type()==='error'||message.text().startsWith('STARTUP STEP'))console.log(message.text());});
  await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:120000});
  const frame=route==='/play'?page:page.frames().find(frame=>frame.url().includes('viewport.html'));assert(frame);
  await frame.waitForFunction(()=>globalThis.realmStartup?.finished||globalThis.realmStartup?.failed,{},{timeout:240000});
  const status=await frame.evaluate(()=>({finished:realmStartup.finished,failed:realmStartup.failed,stage:realmStartup.stageCode,paints:__startupPaints,owned:VeldrenWorldObjects.enabled}));
  console.log(route,'STARTUP',JSON.stringify(status),'milliseconds',Math.round(performance.now()-began));assert(status.finished&&!status.failed&&status.owned);assert(status.paints>5,'startup yields browser paint turns');
  if(route==='/editor/')await frame.waitForFunction(()=>VeldrenEditorBridge.isReady(),{},{timeout:120000});
  await frame.waitForFunction(()=>typeof realmGPU!=='undefined'&&realmGPU?.kind==='filament'&&meshFrame3>=2,{},{timeout:120000});
  assert.deepEqual(errors,[]);
  results.push({route,...status,milliseconds:Math.round(performance.now()-began)});
  await page.screenshot({path:output+(route==='/play'?'/play.png':'/editor.png')});await page.close();
 }
 writeFileSync(output+'/result.json',JSON.stringify({results,errors,savedWorldRevision:savedWorld?.revision},null,2));console.log('PASS: authenticated game and editor startup, paint turns and Filament frames using disposable local saves');
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));storage.close();}
