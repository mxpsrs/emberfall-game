import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleSocial} from '../../worker/social.js';
import {handleMaintenance,maintenanceGate} from '../../worker/maintenance.js';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
let failWrite=false;
const env={ACCOUNT_RESET_TOKEN:'test-only-maintenance-token-1234567890',DB:{prepare(sql){return {args:[],bind(...args){this.args=args;return this},async first(){return db.prepare(sql).get(...this.args)},async all(){return {results:db.prepare(sql).all(...this.args)}},async run(){if(failWrite&&sql.startsWith('UPDATE character_saves'))throw new Error('Injected write failure');return {meta:{changes:db.prepare(sql).run(...this.args).changes}}}}},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const hash=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const cookies={};for(const [i,name]of ['alice','bobby','carol'].entries()){const token=String(i+1).repeat(64);cookies[name]='ember_session='+token;db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(name,name,name,'unused',Date.now());db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(await hash(token),name,Date.now()+1000000);db.prepare('INSERT INTO character_saves VALUES (?,?,1,?)').run('account:'+name,JSON.stringify({bag:{arrows:100,runes:20,coins:100},gear:{woodenSword:1},equipment:{weapon:'woodenSword'},gold:100,x:10,y:10,hp:30,xp:{}}),'now');db.prepare('INSERT INTO player_presence VALUES (?,?,?,?)').run(await hash('public-player:account:'+name),'overworld',JSON.stringify({x:i===2?100:10+i,y:10}),Date.now());}
const req=(name,body,query='')=>new Request('https://game.test/api/social'+query,{method:body?'POST':'GET',headers:{cookie:cookies[name]||'',origin:'https://game.test'},...(body?{body:JSON.stringify(body)}:{})});
const call=async (name,body,status=200)=>{db.exec("DELETE FROM auth_limits WHERE key LIKE 'social:%'");const r=await handleSocial(req(name,body),env);const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data};

const read=async(name,after)=>{const r=await handleSocial(req(name,null,after===undefined?'':'?after='+after),env);assert.equal(r.status,200);return r.json();};
const move=async(name,x,y=10,scene='overworld',age=0)=>db.prepare('UPDATE player_presence SET scene=?,payload=?,seen_at=? WHERE player_id=?').run(scene,JSON.stringify({x,y}),Date.now()-age,await hash('public-player:account:'+name));
await move('bobby',35);await move('carol',35.01);
let start=await read('bobby');assert.equal(start.messages.length,0);
const one=await call('alice',{action:'message',text:'At the boundary'});assert.equal(one.message.author,'alice');assert.equal(one.message.recipient,null);
assert.deepEqual((await read('bobby',start.cursor)).messages.map(m=>m.body),['At the boundary'],'exactly 25 tiles hears local chat');
assert.equal((await read('carol',0)).messages.length,0,'beyond 25 tiles is excluded');
await move('bobby',200);await move('carol',10);
assert.equal((await read('bobby',0)).messages.length,1,'a message heard at send time remains deliverable after walking away');
assert.equal((await read('carol',0)).messages.length,0,'walking into range cannot pick up earlier speech, even milliseconds later');
assert.equal((await read('bobby')).messages.length,0,'opening a fresh chat connection does not replay history');
await move('bobby',25,30);await move('carol',25.01,30);
const two=await call('alice',{action:'message',text:'Circular boundary'});
assert.equal((await read('bobby',one.message.id)).messages.length,1,'15/20 diagonal is exactly 25 tiles');
assert.equal((await read('carol',one.message.id)).messages.length,0,'radius is circular, not a 50-tile square');
await move('bobby',10,10,'mine');await move('carol',10,10,'overworld',13000);
const three=await call('alice',{action:'message',text:'No other scenes or stale presence'});
assert.equal((await read('bobby',two.message.id)).messages.length,0);assert.equal((await read('carol',two.message.id)).messages.length,0);
// Hours-old local rows are never returned, even to their original listeners.
db.prepare('UPDATE social_messages SET created_at=? WHERE recipient IS NULL').run(Date.now()-3600000);
assert.equal((await read('bobby',0)).messages.length,0);
await move('carol',10);const remote=await call('alice',{action:'message',username:'bobby',text:'Private across scenes'});
assert.equal(remote.message.recipient,'bobby');assert.equal((await read('bobby',three.message.id)).messages[0].body,'Private across scenes');assert.equal((await read('carol',three.message.id)).messages.length,0);
await call('bobby',{action:'ignore',username:'alice'});await call('alice',{action:'message',username:'bobby',text:'Blocked'},400);await call('bobby',{action:'removeIgnore',username:'alice'});
await call('bobby',{action:'settings',public:'on',private:'off',trade:'on'});await call('alice',{action:'message',username:'bobby',text:'Unavailable'},400);
// Pagination walks forward without discarding older messages in a busy burst.
await move('bobby',10);const boundary=(await read('bobby')).cursor;
for(let i=0;i<65;i++)await call('alice',{action:'message',text:'Burst '+i});
const page1=await read('bobby',boundary),page2=await read('bobby',page1.cursor);assert.equal(page1.messages.length,60);assert.equal(page2.messages.length,5);assert.equal(page1.messages[0].body,'Burst 0');assert.equal(page2.messages.at(-1).body,'Burst 64');
const high=page2.cursor;db.exec('DELETE FROM social_messages');assert.equal((await read('bobby',high)).cursor,high,'expiry does not rewind the stream');
console.log('PASS: send-time local audience, exact circular 25-tile range, scenes, stale presence, no walk-in or reconnect history, private isolation/privacy, immediate sender echo, ordered burst pagination and stable cursor.');
