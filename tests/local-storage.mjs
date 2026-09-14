import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openLocalStorage} from '../scripts/local-storage.mjs';
import {handleAuth,handleSave,handleSocial,SAVE_RESET_VERSION} from '../worker/api.js';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-local-test-'));
let store=openLocalStorage({dataDirectory:directory});
const request=(url,body,cookie)=>new Request('http://localhost'+url,{method:body?'POST':'GET',headers:{origin:'http://localhost',...(cookie?{cookie}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const players={};
const file=name=>JSON.parse(fs.readFileSync(path.join(directory,'player-saves',name+'.json'),'utf8'));
try{
 for(const name of ['alice','bobby']){
  const response=await handleAuth(request('/api/auth/register',{username:name,password:'local-password'},null),store.env);assert.equal(response.status,200);
  const account=store.db.prepare('SELECT id,username FROM game_accounts WHERE username=?').get(name),cookie=response.headers.get('set-cookie').split(';')[0];players[name]={account,cookie};
  const state={character:{name},bag:{arrows:100,runes:20,coins:10},gear:{},equipment:{},bank:{logs:2},xp:{Magic:5},gold:0,x:10,y:10,hp:10};
  const saved=await handleSave(new Request('http://localhost/api/character',{method:'PUT',headers:{cookie,origin:'http://localhost'},body:JSON.stringify({state,revision:0,resetVersion:SAVE_RESET_VERSION})}),store.env);
  assert.equal(saved.status,200);assert.deepEqual(file(name).state,state);
  const id=createHash('sha256').update('public-player:account:'+account.id).digest('hex');
  await store.env.DB.prepare('INSERT INTO player_presence VALUES (?,?,?,?)').bind(id,'overworld',JSON.stringify({x:10,y:10}),Date.now()).run();
 }
 const social=async(name,body)=>{const r=await handleSocial(request('/api/social',body,players[name].cookie),store.env);const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;};
 await social('alice',{action:'message',text:'Local chat works'});
 assert((await social('bobby')).messages.some(m=>m.body==='Local chat works'));
 let trade=(await social('alice',{action:'requestTrade',username:'bobby'})).trade;
 const act=async(name,action,extra={})=>{const r=await social(name,{action,id:trade.id,revision:trade.revision,...extra});if(r.trade)trade=r.trade;};
 await act('bobby','acceptTrade');await act('alice','offer',{offer:{gold:0,items:[{id:'arrows',count:25}]}});await act('alice','acceptOffer');await act('bobby','acceptOffer');await act('alice','confirmTrade');await act('bobby','confirmTrade');
 assert.equal(trade.status,'complete');assert.equal(file('alice').state.bag.arrows,75);assert.equal(file('bobby').state.bag.arrows,125);
 const before=fs.readFileSync(path.join(directory,'player-saves/alice.json'),'utf8');
 await assert.rejects(store.env.DB.batch([store.env.DB.prepare('UPDATE character_saves SET revision=revision+1'),store.env.DB.prepare('INSERT INTO missing_table VALUES (1)')]));
 assert.equal(fs.readFileSync(path.join(directory,'player-saves/alice.json'),'utf8'),before,'rolled-back transaction cannot change files');
 store.close();store=openLocalStorage({dataDirectory:directory});
 const login=await handleAuth(request('/api/auth/login',{username:'alice',password:'local-password'}),store.env);assert.equal(login.status,200,'account survives server restart');
 const loaded=await handleSave(request('/api/character',null,login.headers.get('set-cookie').split(';')[0]),store.env);assert.equal((await loaded.json()).state.bag.arrows,75);
 assert.equal(file('alice').state.bank.logs,2);assert.equal(file('alice').state.xp.Magic,5);
 store.close();
 // Simulate loss of only a character row, leaving its account and JSON intact.
 const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(path.join(directory,'server-data/veldren.sqlite'));db.prepare('DELETE FROM character_saves WHERE user_id=?').run('account:'+players.alice.account.id);db.close();
 store=openLocalStorage({dataDirectory:directory});assert.equal(JSON.parse(store.db.prepare('SELECT state FROM character_saves WHERE user_id=?').get('account:'+players.alice.account.id).state).bag.arrows,75);
 assert.equal(fs.readdirSync(path.join(directory,'player-saves')).filter(n=>n.endsWith('.json')).length,2);
 console.log('PASS: automatic JSON character files, real two-player chat/trade, transaction rollback, persistent login and saves across restart, and JSON recovery.');
}finally{store.close();fs.rmSync(directory,{recursive:true,force:true});}
