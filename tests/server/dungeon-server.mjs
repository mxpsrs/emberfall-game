import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handlePlayers,handleSave,SAVE_RESET_VERSION} from '../../worker/api.js';
import catalog from '../../worker/shared-catalog.json' with {type:'json'};
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(query){return {query,args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(query).get(...this.args);},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){return {meta:{changes:sql.prepare(query).run(...this.args).changes}};}};},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>({meta:{changes:sql.prepare(s.query).run(...s.args).changes}}));sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const state={character:{name:'Explorer'},xp:{},bag:{logs:2},gold:5,hp:10,x:42,y:51,tutorialReward:true,tutorialVersion:7,tutorial:38,tutorialIslandVersion:2,sceneId:'overworld'};
const clients=[];for(let i=1;i<=2;i++){const id='explorer'+i,token=String(i).repeat(64);sql.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?)').run(id,id,id,'test-only',Date.now());sql.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(await digest(token),id,Date.now()+600000);clients.push({cookie:'ember_session='+token,state:structuredClone(state),revision:0});}
const request=(path,c,body,method='POST')=>new Request('https://game.test'+path,{method,headers:{cookie:c.cookie,origin:'https://game.test'},...(body?{body:JSON.stringify({...body,resetVersion:SAVE_RESET_VERSION})}:{})});
const call=async(handler,path,c,body,method)=>{const response=await handler(request(path,c,body,method),env),data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
for(const c of clients)c.revision=(await call(handleSave,'/api/character',c,{state:c.state,revision:0},'PUT')).revision;
for(const scene of ['lair_colossus','lair_veyr','lair_varkesh','lair_xalith','story_mine']){
 const [x,y]=catalog.entries[scene];assert(y>80,'expanded dungeon entry');
 const packet={scene,x,y,world:{protocol:1,watch:[],events:[]}};
 for(const c of clients){Object.assign(c.state,{sceneId:scene,x,y});c.revision=(await call(handleSave,'/api/character',c,{state:c.state,revision:c.revision},'PUT')).revision;await call(handlePlayers,'/api/players',c,packet);}
 const a=await call(handlePlayers,'/api/players',clients[0],packet),b=await call(handlePlayers,'/api/players',clients[1],packet);
 assert.equal(a.players.length,1);assert.equal(b.players.length,1);assert.equal(a.players[0].y,y);
 if(scene!=='story_mine'){assert(a.world.entities.some(e=>Number(e.entity)>=6400000),'approach guards are server owned');assert.deepEqual(a.world.entities.map(e=>[e.entity,e.hp]),b.world.entities.map(e=>[e.entity,e.hp]),'observers share guard health');}
 for(const c of clients){const saved=await call(handleSave,'/api/character',c,null,'GET');assert.equal(saved.state.sceneId,scene);assert.equal(saved.state.y,y);assert.deepEqual(saved.state.bag,{logs:2});}
}
console.log('PASS: two authenticated accounts enter expanded dungeon bounds, share approach guards and retain each dungeon position and belongings through saves.');sql.close();
