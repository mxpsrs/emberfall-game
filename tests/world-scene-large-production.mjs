import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleEditorEdits} from '../worker/editor.js';
import {decodeWorld} from '../worker/editor-storage.js';
const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE game_accounts(id TEXT PRIMARY KEY,username TEXT); CREATE TABLE game_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT,expires_at INTEGER); CREATE TABLE character_saves(user_id TEXT PRIMARY KEY,state TEXT);');db.exec(readFileSync(new URL('../drizzle/0018_nappy_violations.sql',import.meta.url),'utf8'));
const owner='2db1d2ba-75e2-4c27-bcdf-94e742f95c86',token='a'.repeat(64);db.prepare('INSERT INTO game_accounts VALUES (?,?)').run(owner,'owner');db.prepare('INSERT INTO game_sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),owner,Date.now()+3600000);db.prepare('INSERT INTO character_saves VALUES (?,?)').run('untouched','original character');
let failBatch=false;
class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}async first(){return db.prepare(this.sql).get(...this.args)||null;}async run(){return {meta:{changes:db.prepare(this.sql).run(...this.args).changes}};}}
const env={DB:{prepare:sql=>new Statement(sql),async batch(statements){db.exec('BEGIN');try{const result=[];for(const [i,s]of statements.entries()){result.push(await s.run());if(failBatch&&i===1)throw Error('Injected chunk write failure');}db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}}};
// Serialize batch execution, matching the synchronous SQLite transaction used
// by the local worker adapter and the atomic production DB.batch contract.
let queue=Promise.resolve();const batch=env.DB.batch;env.DB.batch=statements=>{const result=queue.then(()=>batch(statements));queue=result.catch(()=>{});return result;};
const call=(method,body)=>handleEditorEdits(new Request('https://veldren.test/api/editor/edits',{method,headers:{cookie:'ember_session='+token,origin:'https://veldren.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
const original=await (await call('GET')).json(),path=process.env.VELDREN_WORLD_OUTPUT||'.qa/phase1/generated-world.json';
const source=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{format:'veldren.world',version:2,revision:0,updatedAt:null,scenes:[{format:'veldren.scene',version:2,scene:'test',entities:Array.from({length:15000},(_,i)=>({id:'entity:'+i,name:'World '+i,parent:null,active:true,transform:{position:[i,0,i],rotation:[0,0,0,1],scale:[1,1,1]},components:{MeshRenderer:{asset:'procedural:prop/12'}},metadata:{notes:Array.from({length:12},(_,j)=>createHash('sha256').update(i+':'+j).digest('hex')).join('')}}))}]};
assert(Buffer.byteLength(JSON.stringify(source))>8*1024*1024,'exercise the real transport limit');
let response=await call('PUT',{...source,expectedRevision:original.revision});assert.equal(response.status,200,await response.clone().text());const first=await response.json();
const read=await (await call('GET')).json();assert.deepEqual(read.world,first.world);assert.equal(read.worldSha256,first.worldSha256);
const row=db.prepare('SELECT * FROM editor_world WHERE id=1').get(),manifest=JSON.parse(row.document);assert.equal(manifest.format,'veldren.world.chunks');assert(manifest.chunks.length>1);assert.deepEqual(JSON.parse(row.previous_document),original.world);
const writes=await Promise.all([call('PUT',{...read.world,expectedRevision:read.revision}),call('PUT',{...read.world,expectedRevision:read.revision})]);assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
const current=await (await call('GET')).json();assert.equal(current.revision,read.revision+1);assert.deepEqual(await decodeWorld(db.prepare('SELECT previous_document FROM editor_world WHERE id=1').get().previous_document,env.DB),read.world,'previous world is independently recoverable');
const rows=()=>db.prepare('SELECT * FROM editor_world ORDER BY id').all(),before=rows();failBatch=true;response=await call('PUT',{...current.world,expectedRevision:current.revision});assert.equal(response.status,503);assert.deepEqual(rows(),before,'failed chunk writes roll back together with the manifest');failBatch=false;
assert.equal((await call('PUT',{...current.world,expectedRevision:0})).status,409);assert.deepEqual(rows(),before);
assert.equal(db.prepare('SELECT state FROM character_saves WHERE user_id=?').get('untouched').state,'original character');
const largest=Math.max(...rows().map(r=>Buffer.byteLength(r.document)+Buffer.byteLength(r.previous_document||'')));assert(largest<300*1024,'each row stays bounded, including the previous snapshot reference');
console.log(JSON.stringify({result:'PASS',worldBytes:Buffer.byteLength(JSON.stringify(source)),chunks:manifest.chunks.length,largestRowBytes:largest,revision:current.revision}));
console.log('PASS: full generated world saves and rereads exactly; bounded chunks, atomic current/previous revisions, concurrent CAS, rollback and character isolation.');db.close();
