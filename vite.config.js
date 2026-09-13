import {defineConfig} from 'vite';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {handleSave,handlePlayers,handleAuth} from './worker/api.js';

// Isolated local gameplay saves; production continues to use the Sites D1 binding.
const db=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const env={DB:{prepare(sql){return{bind(...args){return{
 async first(){return db.prepare(sql).get(...args)},
 async all(){return{results:db.prepare(sql).all(...args)}},
 async run(){return{meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}
}}}}}};
export default defineConfig({
 root:'dist',
 server:{host:'0.0.0.0',allowedHosts:['terminal.local']},
 plugins:[{name:'veldren-local-api',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const path=req.url?.split('?')[0];
  if(path==='/')req.url='/landing.html'+(req.url.includes('?')?'?'+req.url.split('?').slice(1).join('?'):'');
  if(path==='/donate'||path==='/donate/')req.url='/donate.html';
  if(path==='/play'||path==='/play/')req.url='/index.html'+(req.url.includes('?')?'?'+req.url.split('?').slice(1).join('?'):'');
  if(path==='/__creator-layout__/'){const token='a'.repeat(64),hash=createHash('sha256').update(token).digest('hex');db.prepare('INSERT OR IGNORE INTO game_accounts VALUES (?,?,?,?,?)').run('creator-qa','CreatorTest','creatortest','not-a-login-hash',Date.now());db.prepare('INSERT OR REPLACE INTO game_sessions VALUES (?,?,?)').run(hash,'creator-qa',Date.now()+3600000);res.setHeader('Set-Cookie','ember_session='+token+'; Path=/; HttpOnly; SameSite=Lax');res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('tests/creator-layout.html','utf8'));return;}
  if(path==='/__skills-layout__/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('tests/skills-layout.html','utf8'));return;}
  if(path==='/__armor-layout__/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('tests/armor-layout.html','utf8'));return;}
  if(path==='/__trade-layout__/'){
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end(fs.readFileSync('tests/trade-layout.html','utf8'));return;
  }
  // Browser QA can exercise the exact packaged Worker at /__build__/ instead
  // of accidentally testing only Vite's unbundled source delivery.
  const handler=path?.startsWith('/__build__/')?async request=>{
   const workerPath=fs.realpathSync('dist/server/index.js');
   const worker=await import(pathToFileURL(workerPath).href+'?build='+fs.statSync(workerPath).mtimeMs);
   const url=new URL(request.url);url.pathname=url.pathname.slice('/__build__'.length);
   const response=await worker.default.fetch(new Request(url,request),env);
   if(url.pathname==='/'&&url.searchParams.get('creatorQA')==='1'){const fixture=fs.readFileSync('tests/creator-preview.js','utf8');return new Response((await response.text()).replace('</body>','<script>'+fixture+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
   if(url.pathname==='/'&&url.searchParams.get('skillsQA')==='smith'){const fixture=fs.readFileSync('tests/skills-preview.js','utf8');return new Response((await response.text()).replace('</body>','<script>'+fixture+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
   if(url.pathname==='/'&&['bronze','iron','gold','mithril','dragonslayer'].includes(url.searchParams.get('armorQA'))){const fixture=fs.readFileSync('tests/armor-preview.js','utf8');return new Response((await response.text()).replace('</body>','<script>'+fixture+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
   if(url.pathname==='/'&&['bank','shop'].includes(url.searchParams.get('tradeQA'))){
    const fixture=fs.readFileSync('tests/trade-preview.js','utf8');
    return new Response((await response.text()).replace('</body>','<script>'+fixture+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
   }
   return response;
  }:path?.startsWith('/api/auth/')?handleAuth:path==='/api/character'?handleSave:path==='/api/players'?handlePlayers:null;
  if(!handler)return next();
  try{
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const body=Buffer.concat(chunks);
   const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})});
   const response=await handler(request,env);res.statusCode=response.status;
   response.headers.forEach((value,key)=>res.setHeader(key,key==='set-cookie'?value.replace('; Secure',''):value));
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error(error);res.statusCode=500;res.end('Local preview API error');}
 })}}]
});
