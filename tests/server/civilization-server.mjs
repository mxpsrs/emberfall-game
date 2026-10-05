import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handlePlayers,handleSave,SAVE_RESET_VERSION} from '../../worker/api.js';
import {syncSharedWorld} from '../../worker/shared-world.js';
import catalog from '../../worker/shared-catalog.json' with {type:'json'};
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(query){return {query,args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(query).get(...this.args);},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){return {meta:{changes:sql.prepare(query).run(...this.args).changes}};}};},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>({meta:{changes:sql.prepare(s.query).run(...s.args).changes}}));sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const state={character:{name:'Explorer'},xp:{},bag:{logs:2},gold:5,hp:10,x:42,y:51,tutorialReward:true,tutorialVersion:7,tutorial:38,tutorialIslandVersion:2,sceneId:'overworld'};
const clients=[];for(let i=1;i<=2;i++){const id='explorer'+i,token=String(i).repeat(64);sql.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(id,id,id,'test-only',Date.now());sql.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(await digest(token),id,Date.now()+600000);clients.push({cookie:'ember_session='+token,state:structuredClone(state),revision:0});}
const request=(path,c,body,method='POST')=>new Request('https://game.test'+path,{method,headers:{cookie:c.cookie,origin:'https://game.test'},...(body?{body:JSON.stringify({...body,resetVersion:SAVE_RESET_VERSION})}:{})});
const call=async(handler,path,c,body,method)=>{const response=await handler(request(path,c,body,method),env),data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
for(const c of clients)c.revision=(await call(handleSave,'/api/character',c,{state:c.state,revision:0},'PUT')).revision;
// Exercise all three real castle gate identities through authenticated packets.
for(const destination of ['realm_crownreach_25','realm_ironhollow_25','realm_aelindor_25']){
 const gate=Object.values(catalog.entities).find(e=>e.door===destination);assert(gate,'published castle gate '+destination);
 const packet=(open,id,inside=false)=>({scene:'overworld',x:gate.x,y:gate.y-(inside?2:0),world:{protocol:1,watch:[gate.id],events:id?[{id,kind:'door',scene:'overworld',entity:gate.id,generation:1,open}]:[]}});
 const opened=await call(handlePlayers,'/api/players',clients[0],packet(true,'open-'+gate.id));
 assert(opened.world.receipts.some(r=>r.id==='open-'+gate.id&&r.ok),'authenticated gate open '+destination);
 const observer=await call(handlePlayers,'/api/players',clients[1],packet(true));
 assert.equal(observer.world.entities.find(e=>e.entity===gate.id)?.opened,true,'second client sees opened gate');
 const closed=await call(handlePlayers,'/api/players',clients[1],packet(false,'close-'+gate.id,true));
 assert(closed.world.receipts.some(r=>r.id==='close-'+gate.id&&r.ok),'authenticated close from inside');
 const restored=await call(handlePlayers,'/api/players',clients[0],packet(false));
 assert.equal(restored.world.entities.find(e=>e.entity===gate.id)?.opened,false,'first client sees closed gate');
}
console.log('PASS: all three castle gates accept authenticated opening and closing from inside; both clients observe the same door state.');
assert(catalog.civilization.upperDecks.length>0,'published continuous upper floors');
assert(catalog.civilization.floors.every(scene=>/_lower$|_cellar$/.test(scene)),'only deep lower spaces publish separate scenes');
for(const scene of ['realm_ironhollow_25_lower','realm_ironhollow_0_cellar']){
 const [x,y]=catalog.entries[scene];assert(catalog.civilization.floors.includes(scene),'real published floor');
 const packet={scene,x,y,world:{protocol:1,watch:[],events:[]}};
 for(const c of clients){Object.assign(c.state,{sceneId:scene,x,y});c.revision=(await call(handleSave,'/api/character',c,{state:c.state,revision:c.revision},'PUT')).revision;await call(handlePlayers,'/api/players',c,packet);}
 const a=await call(handlePlayers,'/api/players',clients[0],packet),b=await call(handlePlayers,'/api/players',clients[1],packet);
 assert.equal(a.players.length,1);assert.equal(b.players.length,1);assert.equal(a.players[0].y,y);

 for(const c of clients){const saved=await call(handleSave,'/api/character',c,null,'GET');assert.equal(saved.state.sceneId,scene);assert.equal(saved.state.y,y);assert.deepEqual(saved.state.bag,{logs:2});}
}
for(const upper of catalog.civilization.upperDecks.slice(0,4)){
 const scene='overworld',x=Math.floor(upper.deck.x+upper.deck.w/2),y=Math.floor(upper.deck.y+upper.deck.h/2),packet={scene,x,y,world:{protocol:1,watch:[],events:[]}};
 for(const c of clients){Object.assign(c.state,{sceneId:scene,x,y});c.revision=(await call(handleSave,'/api/character',c,{state:c.state,revision:c.revision},'PUT')).revision;await call(handlePlayers,'/api/players',c,packet);}
 const a=await call(handlePlayers,'/api/players',clients[0],packet),b=await call(handlePlayers,'/api/players',clients[1],packet);assert.equal(a.players.length,1);assert.equal(b.players.length,1);assert.equal(a.players[0].y,y);
 for(const c of clients){const saved=await call(handleSave,'/api/character',c,null,'GET');assert.equal(saved.state.sceneId,'overworld');assert.equal(saved.state.y,y);assert.deepEqual(saved.state.bag,{logs:2});}
}
// Surface nodes use the same authoritative harvesting, depletion and respawn as mines.
const originalRandom=Math.random;Math.random=()=>0;let quarryClock=Date.now();
try{for(const q of catalog.civilization.quarries){
 const ore=Object.values(catalog.entities).find(e=>e.scene==='overworld'&&e.type==='ore'&&Math.abs(e.x-q.x)<q.rx&&Math.abs(e.y-q.y)<q.ry);assert(ore,q.id+' exported mineable node');
 const now=quarryClock+=120000,event={id:'quarry-'+q.id,kind:'harvest',scene:'overworld',entity:ore.id,generation:1},packet={scene:'overworld',x:ore.x+1,y:ore.y,world:{protocol:1,watch:[ore.id],events:[event]}},miner={xp:{Mining:1000000},toolBelt:{pickaxe:'ironPickaxe'}};
 const a=await syncSharedWorld(env,'explorer1',miner,packet,now,'quarry-review'),receipt=a.receipts.find(r=>r.id===event.id);assert(receipt?.ok&&!receipt.missed,JSON.stringify(receipt));
 const b=await syncSharedWorld(env,'explorer2',miner,{...packet,world:{...packet.world,events:[]}},now,'quarry-review');assert(b.entities.find(e=>e.entity===ore.id).deadUntil>now,'observer sees depleted '+q.id);
 const again=await syncSharedWorld(env,'explorer1',miner,packet,now,'quarry-review');assert.deepEqual(again.receipts.find(r=>r.id===event.id),receipt,'retry preserves one reward');
 const respawn=await syncSharedWorld(env,'explorer2',miner,{...packet,world:{...packet.world,events:[]}},now+ore.respawn+1,'quarry-review');assert.equal(respawn.entities.find(e=>e.entity===ore.id).deadUntil,0,'surface ore respawns');
}}finally{Math.random=originalRandom;}
console.log('PASS: two authenticated accounts share continuous overworld upper floors and intentional lower scenes, preserve saves, and share quarry harvesting/depletion/respawns with idempotent rewards.');sql.close();
