import {DatabaseSync} from 'node:sqlite';import assert from 'node:assert/strict';import fs from 'node:fs';import {handleSave,handlePlayers} from '../worker/api.js';
const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}}}}}}}}};
const req=(path,method='GET',cookie='',body)=>new Request('https://game.test'+path,{method,headers:{cookie,origin:'https://game.test'},...(body?{body:JSON.stringify(body)}:{})});
async function guest(name){const r=await handleSave(req('/api/character'),env);assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly/);const data=await r.json();assert.equal(data.state,null);const state={x:14,y:17,hp:30,gold:0,xp:{Combat:0},bag:{fish:1},character:{name,look:0},equipment:{weapon:'bronzeSword'}};assert.equal((await handleSave(req('/api/character','PUT',cookie,{state,revision:0}),env)).status,200);return cookie;}
const a=await guest('Player A'),b=await guest('Player B');assert.notEqual(a,b);
const presence=(cookie,scene='overworld',x=14)=>handlePlayers(req('/api/players','POST',cookie,{scene,x,y:17,heading:0,emote:'Hello!'}),env);
let r=await presence(a);assert.equal(r.status,200);assert.equal((await r.json()).players.length,0);r=await presence(b);let peers=(await r.json()).players;assert.equal(peers.length,1);assert.equal(peers[0].name,'Player A');assert.equal(peers[0].emote,'Hello!');assert(!JSON.stringify(peers).includes(a.split('=')[1]));
await presence(a,'overworld',16);peers=(await (await presence(b)).json()).players;assert.equal(peers[0].x,16);
assert.equal((await handlePlayers(req('/api/players','POST','',{scene:'overworld',x:14,y:17}),env)).status,401);
assert.equal((await presence(a,'overworld',999)).status,400);
const saved=await (await handleSave(req('/api/character','GET',b),env)).json();assert.equal(saved.state.character.name,'Player B');
db.exec('UPDATE player_presence SET seen_at=0');assert.equal((await (await presence(b)).json()).players.length,0);
console.log('PASS: two separate guests, durable saves, real player discovery, movement/emote synchronization, session secrecy, stale-player expiry and rejected invalid writes.');
