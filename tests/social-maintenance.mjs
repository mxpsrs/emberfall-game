import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleSocial} from '../worker/social.js';
import {handleMaintenance,maintenanceGate} from '../worker/maintenance.js';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
let failWrite=false;
const env={ACCOUNT_RESET_TOKEN:'test-only-maintenance-token-1234567890',DB:{prepare(sql){return {args:[],bind(...args){this.args=args;return this},async first(){return db.prepare(sql).get(...this.args)},async all(){return {results:db.prepare(sql).all(...this.args)}},async run(){if(failWrite&&sql.startsWith('UPDATE character_saves'))throw new Error('Injected write failure');return {meta:{changes:db.prepare(sql).run(...this.args).changes}}}}},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const hash=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const cookies={};for(const [i,name]of ['alice','bobby','carol'].entries()){const token=String(i+1).repeat(64);cookies[name]='ember_session='+token;db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(name,name,name,'unused',Date.now());db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(await hash(token),name,Date.now()+1000000);db.prepare('INSERT INTO character_saves VALUES (?,?,1,?)').run('account:'+name,JSON.stringify({bag:{arrows:100,runes:20,coins:100},gear:{woodenSword:1},equipment:{weapon:'woodenSword'},gold:100,x:10,y:10,hp:30,xp:{}}),'now');db.prepare('INSERT INTO player_presence VALUES (?,?,?,?)').run(await hash('public-player:account:'+name),'overworld',JSON.stringify({x:i===2?100:10+i,y:10}),Date.now());}
const req=(name,body,query='?after=0')=>new Request('https://game.test/api/social'+query,{method:body?'POST':'GET',headers:{cookie:cookies[name]||'',origin:'https://game.test'},...(body?{body:JSON.stringify(body)}:{})});
const call=async (name,body,status=200)=>{db.exec("DELETE FROM auth_limits WHERE key LIKE 'social:%'");const r=await handleSocial(req(name,body),env);const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data};
assert.equal((await handleSocial(req('unknown'),env)).status,401);
await call('alice',{action:'message',text:'Local hello'});
assert.equal((await call('bobby')).messages.length,1);assert.equal((await call('carol')).messages.length,0,'distant local messages hidden');
await call('bobby',{action:'settings',public:'on',private:'friends',trade:'on'});
await call('alice',{action:'message',username:'bobby',text:'private'},400);
await call('alice',{action:'friend',username:'bobby'});assert.equal((await call('alice')).friends.length,1);assert.equal((await call('bobby')).friends.length,0,'friend lists are one-way');
await call('alice',{action:'message',username:'bobby',text:'private'},400,'sender adding recipient does not bypass recipient privacy');
await call('bobby',{action:'friend',username:'alice'});await call('alice',{action:'message',username:'bobby',text:'Private hello'});
assert.equal((await call('bobby')).messages.length,2);assert.equal((await call('carol')).messages.length,0,'private messages not exposed to third parties');
await call('bobby',{action:'ignore',username:'alice'});assert.equal((await call('bobby')).messages.length,0);await call('alice',{action:'message',username:'bobby',text:'blocked'},400);await call('alice',{action:'requestTrade',username:'bobby'},400);await call('bobby',{action:'removeIgnore',username:'alice'});
await call('bobby',{action:'removeFriend',username:'alice'});assert.equal((await call('alice')).friends.length,1,'removing a friend preserves the other list');await call('bobby',{action:'settings',public:'on',private:'on',trade:'on'});
let t=(await call('alice',{action:'requestTrade',username:'bobby'})).trade;
const act=async(name,action,extra={},status=200)=>{const data=await call(name,{action,id:t.id,revision:t.revision,...extra},status);if(data.trade)t=data.trade;return data;};
await act('bobby','acceptTrade');
await act('alice','offer',{offer:{gold:0,items:[{id:'woodenSword',count:1}]}},400);
await act('alice','offer',{offer:{gold:101,items:[]}},400);
await act('alice','offer',{offer:{gold:0,items:[{id:'coins',count:1}]}},400);
await act('alice','offer',{offer:{gold:10,items:[{id:'arrows',count:25}]}});
await act('alice','confirmTrade',{},400);await act('alice','acceptOffer');const firstRevision=t.revision;
await act('bobby','offer',{offer:{gold:0,items:[{id:'runes',count:5}]}});assert(!t.accepted&&!t.peerAccepted,'changing either offer clears first-stage acceptance');
await call('alice',{action:'confirmTrade',id:t.id,revision:firstRevision},409);
await act('alice','acceptOffer');await act('bobby','acceptOffer');assert.equal(t.stage,'review');assert.equal(JSON.parse(db.prepare('SELECT state FROM character_saves WHERE user_id=?').get('account:alice').state).bag.arrows,100,'first stage never transfers items');await act('alice','offer',{offer:{gold:0,items:[]}},400);await act('alice','confirmTrade');
failWrite=true;await act('bobby','confirmTrade',{},503);failWrite=false;
const state=name=>JSON.parse(db.prepare('SELECT state FROM character_saves WHERE user_id=?').get('account:'+name).state);
assert.equal(state('alice').bag.arrows,100,'failed batch rolls back both inventories');assert.equal(db.prepare('SELECT status FROM player_trades WHERE id=?').get(t.id).status,'active');
await act('bobby','confirmTrade');assert.equal(t.status,'complete');assert.equal(state('alice').bag.arrows,75);assert.equal(state('bobby').bag.arrows,125);assert.equal(state('alice').bag.runes,25);assert.equal(state('bobby').bag.runes,15);assert.equal(state('alice').bag.coins,90);assert.equal(state('bobby').bag.coins,110);assert.equal(state('alice').gold,100);assert.equal(state('bobby').gold,100);
await act('bobby','confirmTrade');assert.equal(state('alice').bag.arrows,75,'replay cannot transfer twice');
// A concurrent save invalidates a prior confirmation.
t=(await call('alice',{action:'requestTrade',username:'bobby'})).trade;await act('bobby','acceptTrade');await act('alice','acceptOffer');await act('bobby','acceptOffer');await act('alice','confirmTrade');db.prepare('UPDATE character_saves SET revision=revision+1 WHERE user_id=?').run('account:alice');await act('bobby','confirmTrade',{},409);await act('alice','cancelTrade');
await call('alice',{action:'requestTrade',username:'carol'},400);
// Coins arriving from another player need an inventory slot; a failed final
// confirmation leaves both saved balances untouched.
const fullState=state('bobby');fullState.bag={bones:25};db.prepare('UPDATE character_saves SET state=?,revision=revision+1 WHERE user_id=?').run(JSON.stringify(fullState),'account:bobby');
t=(await call('alice',{action:'requestTrade',username:'bobby'})).trade;await act('bobby','acceptTrade');await act('alice','offer',{offer:{gold:1,items:[]}});await act('alice','acceptOffer');await act('bobby','acceptOffer');await act('alice','confirmTrade');const beforeFull=JSON.stringify([state('alice'),state('bobby')]);await act('bobby','confirmTrade',{},400);assert.equal(JSON.stringify([state('alice'),state('bobby')]),beforeFull);await act('alice','cancelTrade');
// Maintenance starts once, cannot finish early, revokes sessions without touching saves.
const id='maintenance-test-request-0001';const admin=body=>new Request('https://game.test/api/admin/maintenance',{method:'POST',headers:{Authorization:'Bearer '+env.ACCOUNT_RESET_TOKEN},body:JSON.stringify({requestId:id,...body})});
const before=db.prepare('SELECT * FROM character_saves ORDER BY user_id').all();const started=await (await handleMaintenance(admin({action:'start'}),env)).json();assert.equal(started.status,'countdown');assert(started.kickAt-started.serverTime>=119000);const retry=await (await handleMaintenance(admin({action:'start'}),env)).json();assert.equal(started.kickAt,retry.kickAt);assert.equal((await handleMaintenance(admin({action:'finish'}),env)).status,409);assert.equal(await maintenanceGate(req('alice'),env),null);
db.exec("UPDATE game_maintenance SET kick_at=0");assert.equal((await maintenanceGate(req('alice'),env)).status,503);assert.equal(db.prepare('SELECT count(*) n FROM game_sessions').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM player_presence').get().n,0);assert.deepEqual(db.prepare('SELECT * FROM character_saves ORDER BY user_id').all(),before);assert.equal(db.prepare('SELECT count(*) n FROM game_accounts').get().n,3);
assert.equal((await (await handleMaintenance(admin({action:'finish'}),env)).json()).status,'open');
console.log('PASS: local/private isolation, one-way friends and privacy/ignore controls, equipped-item protection, offer revisions, two-stage atomic trade rollback and transfer, replay prevention, stale-save rejection, maintenance countdown and session-only disconnect.');
