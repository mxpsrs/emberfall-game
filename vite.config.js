import {defineConfig} from 'vite';
import {openLocalStorage} from './scripts/dev/local-storage.mjs';
import {editorPersistencePlugin} from './scripts/dev/editor-persistence.mjs';
import {Readable} from 'node:stream';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {handleSave,handlePlayers,handleAuth,handleStatus,handleSocial,handleActivity,handleMaintenance,maintenanceGate} from './worker/api.js';

const storage=openLocalStorage(),{db,env}=storage;
console.log('Player save files: '+storage.saveDirectory);
export default defineConfig({
 root:'client',
 server:{host:'127.0.0.1',allowedHosts:['terminal.local'],fs:{deny:['**/player-saves/**','**/server-data/**','**/.env*','**/*.{pem,crt}']}},
 plugins:[
  editorPersistencePlugin(),
  {name:'veldren-local-api',configureServer(server){server.httpServer?.once('close',()=>storage.close());server.middlewares.use(async(req,res,next)=>{
   const path=req.url?.split('?')[0];
   if(/(?:^|\/)(?:player-saves|server-data)(?:\/|$)/i.test(decodeURIComponent(path||''))){res.statusCode=404;res.end('Not found');return;}
   if(path==='/')req.url='/landing.html'+(req.url.includes('?')?'?'+req.url.split('?').slice(1).join('?'):'');
   if(path==='/donate'||path==='/donate/')req.url='/donate.html';
   if(path==='/__tutorial-layout__/'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('tests/browser/tutorial-layout.html','utf8'));return;}
   if(path==='/__tutorial-game__/'){
    const token='b'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
    await env.DB.prepare('INSERT OR IGNORE INTO game_accounts VALUES (?,?,?,?,?)').bind('tutorial-qa','TutorialQA','tutorialqa','$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',Date.now()).run();
    db.prepare('INSERT OR REPLACE INTO game_sessions VALUES (?,?,?)').run(hash,'tutorial-qa',Date.now()+3600000);
    res.setHeader('Set-Cookie','ember_session='+token+'; Path=/; HttpOnly; SameSite=Lax');res.setHeader('Content-Type','text/html');
    res.end(fs.readFileSync('client/index.html','utf8').replace('<head>','<head><base href="/">').replace('</body>',new URL(req.url,'http://local').searchParams.get('fresh')==='1'?'</body>':'<script>'+fs.readFileSync('tests/browser/tutorial-preview.js','utf8')+'</script></body>'));return;
   }
   if(path==='/play'||path==='/play/')req.url='/index.html'+(req.url.includes('?')?'?'+req.url.split('?').slice(1).join('?'):'');
   if(process.env.VELDREN_ENABLE_QA==='1'&&path==='/__creator-layout__/'){const token='a'.repeat(64),hash=createHash('sha256').update(token).digest('hex');await env.DB.prepare('INSERT OR IGNORE INTO game_accounts VALUES (?,?,?,?,?)').bind('creator-qa','CreatorTest','creatortest','$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',Date.now()).run();db.prepare('INSERT OR REPLACE INTO game_sessions VALUES (?,?,?)').run(hash,'creator-qa',Date.now()+3600000);res.setHeader('Set-Cookie','ember_session='+token+'; Path=/; HttpOnly; SameSite=Lax');res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('tests/browser/creator-layout.html','utf8'));return;}
   if(path==='/__skills-layout__/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('tests/browser/skills-layout.html','utf8'));return;}
   if(path==='/__armor-layout__/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('tests/browser/armor-layout.html','utf8'));return;}
   if(path==='/__trade-layout__/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('tests/browser/trade-layout.html','utf8'));return;}
   const handler=path?.startsWith('/__build__/')?async request=>{
    const workerPath=fs.realpathSync('dist/server/index.js'),worker=await import(pathToFileURL(workerPath).href+'?build='+fs.statSync(workerPath).mtimeMs),url=new URL(request.url);url.pathname=url.pathname.slice('/__build__'.length);
    const response=await worker.default.fetch(new Request(url,request),env);
    if(url.pathname==='/'&&url.searchParams.get('creatorQA')==='1'){const fixture=fs.readFileSync('tests/browser/creator-preview.js','utf8');return new Response((await response.text()).replace('</body>','<script>'+fixture+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
    if(url.pathname==='/'&&url.searchParams.get('skillsQA')==='smith'){const fixture=fs.readFileSync('tests/browser/skills-preview.js','utf8');return new Response((await response.text()).replace('</body>','<script>'+fixture+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
    if(url.pathname==='/'&&['bronze','iron','gold','mithril','dragonslayer'].includes(url.searchParams.get('armorQA'))){const fixture=fs.readFileSync('tests/browser/armor-preview.js','utf8');return new Response((await response.text()).replace('</body>','<script>'+fixture+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
    if(url.pathname==='/'&&['bank','shop'].includes(url.searchParams.get('tradeQA'))){const fixture=fs.readFileSync('tests/browser/trade-preview.js','utf8');return new Response((await response.text()).replace('</body>','<script>'+fixture+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
    return response;
   }:path==='/api/maintenance'||path==='/api/admin/maintenance'?handleMaintenance:path==='/api/social'?handleSocial:path==='/api/activity'?handleActivity:path==='/api/status'?handleStatus:path?.startsWith('/api/auth/')?handleAuth:path==='/api/character'?handleSave:path==='/api/players'?handlePlayers:null;
   if(!handler)return next();
   try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks),request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});
    const blocked=path?.startsWith('/api/')&&!['/api/maintenance','/api/admin/maintenance','/api/status'].includes(path)?await maintenanceGate(request,env):null,response=blocked||await handler(request,env);res.statusCode=response.status;
    response.headers.forEach((value,key)=>res.setHeader(key,key==='set-cookie'?value.replace('; Secure',''):value));if(response.body){const stream=Readable.fromWeb(response.body);res.once('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res)}else res.end();
   }catch(error){console.error(error);res.statusCode=500;res.end('Local preview API error')}
  })}}
 ]
});
