// Local integration/load probe: actual authenticated handlers, not hosted capacity certification.
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {handleAuth,handlePlayers,handleSave,handleActivity,SAVE_RESET_VERSION} from '../worker/api.js';
import {handleSocial} from '../worker/social.js';
import catalog from '../worker/shared-catalog.json' with {type:'json'};
const sql=new DatabaseSync(':memory:');
for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
let queries=0,sqlMs=0;
const execute=(query,args,mode)=>{const start=performance.now();try{queries++;return sql.prepare(query)[mode](...args);}finally{sqlMs+=performance.now()-start;}};
const env={DB:{prepare(query){return {query,args:[],bind(...args){assert(args.length<=100);this.args=args;return this;},async first(){return execute(query,this.args,'get');},async all(){return {results:execute(query,this.args,'all')};},async run(){return {meta:{changes:execute(query,this.args,'run').changes}};}};},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>({meta:{changes:execute(s.query,s.args,'run').changes}}));sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const req=(path,cookie='',body,method=body?'POST':'GET')=>new Request('https://game.test'+path,{method,headers:{cookie,origin:'https://game.test'},...(body?{body:JSON.stringify({...body,resetVersion:SAVE_RESET_VERSION})}:{})});
let requests=0;
async function call(handler,path,cookie,body,method){const response=await handler(req(path,cookie,body,method),env);requests++;const data=await response.json();assert.equal(response.status,200,path+': '+JSON.stringify(data));return data;}
const rat=Object.values(catalog.entities).find(e=>e.kind==='rat'&&e.scene==='overworld');assert(rat);
const clients=await Promise.all(Array.from({length:39},async(_,i)=>{
 const name='LoadTester'+String(i).padStart(2,'0');
 const response=await handleAuth(req('/api/auth/register','',{username:name,password:'local-load-test-only!'}),env);
 assert.equal(response.status,200,await response.clone().text());
 const cookie=response.headers.get('set-cookie').split(';')[0];
 const state={character:{name,look:0},xp:{Hitpoints:200000},bag:{logs:10},equipment:{weapon:'bronzeSword'},hp:100,gold:100,x:rat.x+1,y:rat.y,sceneId:'overworld',tutorialReward:true,tutorialVersion:7,tutorial:38,tutorialIslandVersion:2};
 const saved=await call(handleSave,'/api/character',cookie,{state,revision:0},'PUT');
 const session=await call(handleAuth,'/api/auth/session',cookie);assert.equal(session.account.username,name);
 return {name,cookie,state,revision:saved.revision,ack:[],generation:1,cursor:0};
}));
let combatReceipts=0,successfulHits=0,peerChecks=0,chatChecks=0,streamFrames=0,stopStreams=false;
const streams=[];
async function poll(c,round){
 c.state.x=(c.target?.x??rat.x)+Math.sin(round/8)*.1;c.state.y=(c.target?.y??rat.y)+Math.cos(round/8)*.1;
 const events=round%12===0?[{id:c.name+'-hit-'+round,kind:'hit',scene:rat.scene,entity:rat.id,generation:c.generation,style:'melee'}]:[];
 const body=await call(handlePlayers,'/api/players',c.cookie,{scene:rat.scene,x:c.state.x,y:c.state.y,moving:true,world:{protocol:1,watch:[rat.id],events,ack:c.ack}});
 c.ack=body.world.receipts.map(r=>r.id);c.target=body.world.entities.find(e=>e.entity===rat.id);c.generation=c.target?.generation||c.generation;
 for(const r of body.world.receipts)if(r.kind==='hit'){combatReceipts++;if(r.ok)successfulHits++;}
 if(round>0){assert.equal(body.players.length,38,'all other clients visible');assert.equal(new Set(body.players.map(p=>p.id)).size,38);peerChecks++;}
}
await Promise.all(clients.map(c=>poll(c,-1)));
const queryStart=queries,sqlStart=sqlMs,requestStart=requests,start=performance.now();
const streamTasks=clients.map(async c=>{
 while(!stopStreams){
  const response=await handleActivity(req('/api/activity?scene=overworld',c.cookie),env);assert.equal(response.status,200);
  const reader=response.body.getReader();streams.push(reader);
  try{while(!stopStreams){const chunk=await reader.read();if(chunk.done)break;assert(new TextDecoder().decode(chunk.value).startsWith('data: '));streamFrames++;}}finally{await reader.cancel();streams.splice(streams.indexOf(reader),1);}
 }
});
const rounds=Number(process.env.VELDREN_LOAD_ROUNDS||120);assert(Number.isInteger(rounds)&&rounds>=120&&rounds<=2400);
let lateRounds=0,maxRoundMs=0;
try{
 for(let round=0;round<rounds;round++){
  const roundStart=performance.now();
  await Promise.all(clients.map(c=>poll(c,round)));
  if(round===3)await Promise.all(clients.map(c=>call(handleSocial,'/api/social',c.cookie,{action:'message',text:'Local '+c.name})));
  if(round%3===1)await Promise.all(clients.map(async c=>{const result=await call(handleSocial,'/api/social?after='+c.cursor,c.cookie);c.cursor=result.cursor;if(round===4){assert.equal(result.messages.length,39,'every nearby client hears all 39 local messages');chatChecks++;}}));
  if(round===6){const message=await call(handleSocial,'/api/social',clients[0].cookie,{action:'message',username:clients[1].name,text:'Private load check'});await Promise.all(clients.slice(1).map(async(c,i)=>{const result=await call(handleSocial,'/api/social?after='+(message.message.id-1),c.cookie);assert.equal(result.messages.some(m=>m.body==='Private load check'),i===0,'private message isolation');}));}
  if(round%40===39)await Promise.all(clients.map(async c=>{const saved=await call(handleSave,'/api/character',c.cookie,{state:c.state,revision:c.revision},'PUT');assert.equal(saved.revision,c.revision+1);c.revision=saved.revision;}));
  const elapsed=performance.now()-roundStart;maxRoundMs=Math.max(maxRoundMs,elapsed);if(elapsed>250)lateRounds++;
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,start+(round+1)*250-performance.now())));
 }
}finally{stopStreams=true;await Promise.all([...streams].map(r=>r.cancel()));await Promise.all(streamTasks);}
const durationMs=performance.now()-start;
await Promise.all(clients.map(async c=>{const saved=await call(handleSave,'/api/character',c.cookie);assert.equal(saved.revision,1+Math.floor(rounds/40));assert.deepEqual(saved.state,c.state,'each character save remains separate and intact');}));
assert(successfulHits>0,'combat receipts: '+JSON.stringify(sql.prepare("SELECT result FROM shared_events WHERE kind='hit' LIMIT 3").all()));assert(combatReceipts>=39);assert.equal(chatChecks,39);assert.equal(peerChecks,39*(rounds-1));assert(streamFrames>=39*100,'39 active notification streams during the run');
console.log(JSON.stringify({result:'PASS',environment:'local in-memory SQLite; NOT a live D1 capacity certification',clients:39,rounds,targetWorldHz:4,durationMs:Math.round(durationMs),requests:requests-requestStart,queries:queries-queryStart,queriesPerSecond:Math.round((queries-queryStart)/(durationMs/1000)),sqlExecutionMs:Math.round(sqlMs-sqlStart),maxRoundMs:Math.round(maxRoundMs),lateRounds,peerChecks,combatReceipts,successfulHits,chatChecks,streamFrames,savedCharacters:39},null,2));
sql.close();
