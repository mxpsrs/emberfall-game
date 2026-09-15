import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncSharedWorld} from '../worker/shared-world.js';
import catalog from '../worker/shared-catalog.json' with {type:'json'};
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const env={DB:{prepare(query){return {bind(...args){return {query,args,async first(){return sql.prepare(query).get(...args)},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}}}}}}},async batch(statements){sql.exec('BEGIN');try{const rows=statements.map(({query,args})=>({meta:{changes:sql.prepare(query).run(...args).changes}}));sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const e=Object.values(catalog.entities).find(e=>e.kind==='rat'&&e.scene==='overworld');e.hp=10000;
const state={xp:{Worship:0},equipment:{weapon:'woodenSword'},spirits:Object.fromEntries(Object.keys(catalog.spirits).map(id=>[id,{state:'set'}]))};let now=1000000,seq=0;const oldRandom=Math.random;Math.random=()=>.1;
async function cast(ids,nonce='cast'+(++seq),style='worship'){const id='event'+(++seq),result=await syncSharedWorld(env,'tester',state,{scene:e.scene,x:e.x,y:e.y,world:{protocol:1,watch:[e.id],events:[{id,kind:'hit',scene:e.scene,entity:e.id,generation:1,style,spirits:ids,cast:nonce}]}},now,'spirit-test');return result.receipts.find(r=>r.id===id);}
assert((await cast(['cinder'])).ok);assert((await cast([],undefined,'melee')).ok,'normal combat continues during spirit cooldown');assert((await cast(['pyre'])).ok,'different spirits can cast together');assert(!(await cast(['cinder'])).ok,'same spirit cannot bypass cooldown');assert((await cast(['flint'])).ok,'another twin has an independent cooldown');assert(!(await cast(['brook'])).ok,'healing spirit cannot forge a damage action');assert(!(await cast(['fake'])).ok);
now+=29999;assert(!(await cast(['cinder'])).ok);now++;assert((await cast(['cinder'])).ok,'original ready at thirty seconds');assert(!(await cast(['pyre'])).ok,'twin still cooling');now+=15000;assert((await cast(['pyre'])).ok,'twin ready at forty-five seconds');
const row=sql.prepare('SELECT state FROM shared_entities WHERE entity_id=?').get(e.id);assert(JSON.parse(row.state).slowUntil>1000000,'Flint slow stored for shared simulation');
Math.random=oldRandom;console.log('PASS: server-enforced independent 30/45-second spirit clocks, normal combat concurrency, unknown/support-only damage rejection and shared slowing.');
