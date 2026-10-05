import assert from 'node:assert/strict';
import {maintenanceGate,handleMaintenance} from '../../worker/maintenance.js';
const req=new Request('https://game.test/api/maintenance');
const original={warn:console.warn,error:console.error},logs=[];
console.warn=(...v)=>logs.push(v);console.error=(...v)=>logs.push(v);
function fixture(failures,status='open',message='D1_ERROR: temporary database connection failure'){
 let reads=0;
 return {env:{DB:{prepare(sql){assert(sql.startsWith('SELECT run_id'));return {async first(){reads++;if(reads<=failures)throw new Error(message);return {run_id:'outage-test-20260914',status,kick_at:0};}};},batch(){throw Error('Must not replay writes');}}},reads:()=>reads};
}
try{
 const healthy=fixture(0);assert.equal(await maintenanceGate(req,healthy.env),null);assert.equal(healthy.reads(),1);
 const recovered=fixture(1);assert.equal(await maintenanceGate(req,recovered.env),null);assert.equal(recovered.reads(),2);
 const locked=fixture(1,'locked');const lock=await maintenanceGate(req,locked.env);assert.equal(lock.status,503);assert.equal((await lock.json()).maintenance.status,'locked');
 const down=fixture(Infinity);const blocked=await maintenanceGate(req,down.env);assert.equal(blocked.status,503);assert.equal(down.reads(),2);assert(!(await blocked.text()).includes('D1_ERROR'),'database details stay out of client responses');
 const overloaded=fixture(Infinity,'open','D1_ERROR: D1 DB is overloaded. Requests queued for too long.');assert.equal((await maintenanceGate(req,overloaded.env)).status,503);assert.equal(overloaded.reads(),1,'do not retry into an overloaded database queue');
 const status=fixture(Infinity);assert.equal((await handleMaintenance(req,status.env)).status,503);assert.equal(status.reads(),2);
 assert(logs.some(row=>row[0]==='maintenance_database_read_retry'));
 assert(logs.some(row=>row[0]==='maintenance_database_read_failed'&&row[1].message.includes('D1_ERROR')));
}finally{Object.assign(console,original);}
console.log('PASS: bounded read recovery, persistent outage fails closed, maintenance lock preserved, diagnostics retained without client disclosure or write replay.');
