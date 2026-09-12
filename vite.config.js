import {defineConfig} from 'vite';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {handleSave,handlePlayers} from './worker/api.js';

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
 plugins:[{name:'emberfall-local-api',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const path=req.url?.split('?')[0];
  // Browser QA can exercise the exact packaged Worker at /__build__/ instead
  // of accidentally testing only Vite's unbundled source delivery.
  const handler=path?.startsWith('/__build__/')?async request=>{
   const worker=await import(pathToFileURL(fs.realpathSync('dist/server/index.js')).href);
   const url=new URL(request.url);url.pathname=url.pathname.slice('/__build__'.length);
   return worker.default.fetch(new Request(url,request),env);
  }:path==='/api/character'?handleSave:path==='/api/players'?handlePlayers:null;
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
