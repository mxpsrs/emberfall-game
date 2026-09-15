import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncSharedWorld,publicAction,readSharedEffects} from '../worker/shared-world.js';
import catalog from '../worker/shared-catalog.json' with {type:'json'};
const sqlite=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const db={prepare(sql){return {bind(...args){return {sql,args,async first(){return sqlite.prepare(sql).get(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}}}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(({sql,args})=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};

const now=Date.now(),foe=Object.values(catalog.entities).find(e=>e.mainStoryStage===4),actor='fighting-player',observer='completed-player',scope='quest-animation',state={tutorialReward:true,mainStoryQuest:{stage:5}};assert(foe);
const pos={x:foe.x+1,y:foe.y};
for(const style of ['melee','ranged','magic']){
 const action={kind:'combat',style,started:now,duration:1400,target:{entity:foe.id,x:foe.x,y:foe.y}};
 sqlite.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,1)').run(style,scope,foe.scene,actor,'activity',JSON.stringify({...action,...pos}),now);
}
for(const kind of ['enemyAction','hit'])sqlite.prepare('INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,1)').run(kind,scope,foe.scene,actor,kind,JSON.stringify({entity:foe.id,...pos,ok:true,damage:2,generation:1}),now);
const effects=await readSharedEffects(db,scope,foe.scene,observer,pos,now-1000,state);
assert.equal(effects.length,3);assert(effects.every(e=>e.kind==='activity'),'only the player animations pass quest filtering');
const snapshot=await syncSharedWorld({DB:db},observer,state,{scene:foe.scene,...pos,world:{protocol:1,watch:[foe.id]}},now,scope);
assert(!snapshot.entities.some(e=>e.entity===foe.id),'the completed quest enemy stays hidden');assert.equal(snapshot.effects.length,3,'polling and immediate channel agree');
const vm=await import('node:vm'),source=fs.readFileSync('dist/shared-world.js','utf8');
const ctx=vm.createContext({assert,Date,time:100,s:state,sharedNow:()=>now,sharedActor:observer,questFightVisible:()=>false,worldIndex:()=>({byId:new Map([[foe.id,{id:foe.id,x:0,y:0}]])}),effects,actor,foe,onlinePeers:new Map()});
for(const [start,end]of [['function sharedActionTarget(', 'const sharedDrawPeersBefore='],['const sharedVisualActions=', 'function sharedLocalHazard(']]){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);vm.runInContext(source.slice(a,b),ctx);}
vm.runInContext(`
for(const event of effects){sharedVisualActions.clear();sharedEffectIds.clear();applySharedEffects([event],sharedNow());const peer={id:actor};const action=sharedVisibleAction(peer);assert.equal(action.kind,'combat');assert.equal(action.style,event.action.style);assert.equal(sharedPeerGear(peer)._attackStyle,event.action.style);assert.equal(sharedPeerGear(peer)._attackAt,time);assert.equal(sharedActionTarget(action).x,foe.x,'hidden enemies use the transmitted aim position');}
`,ctx);
console.log('PASS: completed observers receive melee, ranged and magic player animations through polling and the immediate activity path while quest enemies, enemy attacks and enemy hit splats remain hidden.');
