// Run only the packaged, local Briar Haven review build. No hosted API is used.
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash,randomBytes} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import bcrypt from 'bcryptjs';
import {openLocalStorage} from '../dev/local-storage.mjs';
import worker from '../../dist/server/index.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const port=Number(process.env.VELDREN_PREVIEW_PORT||8787);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a port from 1024 to 65535.');
const storage=openLocalStorage({root,dataDirectory:process.env.VELDREN_PREVIEW_DATA||resolve(root,'briar-preview-data')});
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token=randomBytes(32).toString('hex');
const account=storage.db.prepare('SELECT id FROM game_accounts WHERE id=?').get(owner);
if(!account)storage.db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(owner,'BriarReview','briarreview',bcrypt.hashSync(randomBytes(32).toString('hex'),4),Date.now());
storage.db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+86400000);
if(!storage.db.prepare('SELECT user_id FROM character_saves WHERE user_id=?').get('account:'+owner)){
 storage.db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run('account:'+owner,JSON.stringify({x:55,y:61,sceneId:'overworld',worldScale:3,briarhavenLayoutVersion:2,buildingLayoutVersion:1,kitchenLayoutVersion:1,tutorialReward:true,tutorial:100,hp:10,gold:0,xp:{},bag:{},character:{name:'BriarReview',look:0,race:'human',frame:'male',topStyle:5,bottomStyle:4,topColor:4,bottomColor:5,hair:1,hairColor:1,skin:2,beard:0},storyOpeningSeen:true,metRowan:true}),1,new Date().toISOString());
}
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  if(url.pathname==='/preview'){
   res.writeHead(302,{'Set-Cookie':'ember_session='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400','Location':'/play','Cache-Control':'no-store'});res.end();return;
  }
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
  const response=await worker.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),storage.env);
  res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));
  if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
 }catch(error){console.error('Local preview request failed:',error.message);if(!res.headersSent)res.writeHead(500);res.end('Local preview request failed.');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
console.log('Briar Haven review: http://127.0.0.1:'+port+'/preview');
console.log('After opening the game, the editor is at http://127.0.0.1:'+port+'/editor/');
console.log('This build uses its own local character. Stop with Ctrl+C.');
let closing=false;
async function close(){if(closing)return;closing=true;server.closeAllConnections();await new Promise(r=>server.close(r));storage.close();}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>close().then(()=>process.exit(process.exitCode||0)));
