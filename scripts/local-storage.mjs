import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {RESET_VERSION_SQL} from '../worker/reset-policy.js';

// A persistent, local D1-compatible adapter. SQL transactions still protect
// trades and accounts; every committed character save is also an ordinary file.
export function openLocalStorage({root=process.cwd(),dataDirectory=process.env.VELDREN_DATA_DIR||root}={}){
 const directory=path.resolve(dataDirectory),saveDirectory=path.join(directory,'player-saves'),serverDirectory=path.join(directory,'server-data');
 for(const dir of [saveDirectory,serverDirectory])fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const db=new DatabaseSync(path.join(serverDirectory,'veldren.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');
 db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL)');
 for(const name of fs.readdirSync(path.join(root,'drizzle')).filter(n=>n.endsWith('.sql')).sort()){
  const sql=fs.readFileSync(path.join(root,'drizzle',name),'utf8'),hash=createHash('sha256').update(sql).digest('hex');
  const existing=db.prepare('SELECT hash FROM local_migrations WHERE name=?').get(name);
  if(existing){if(existing.hash!==hash)throw new Error('Applied local migration changed: '+name);continue;}
  db.exec('BEGIN IMMEDIATE');try{db.exec(sql);db.prepare('INSERT INTO local_migrations VALUES (?,?)').run(name,hash);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');db.close();throw error;}
 }
 const resetVersion=()=>db.prepare('SELECT '+RESET_VERSION_SQL+' AS version').get().version;
 function validSave(record){return record?.format===1&&typeof record.userId==='string'&&Number.isSafeInteger(record.revision)&&record.revision>0&&record.state&&typeof record.state==='object'&&record.state.xp&&record.state.bag&&['x','y','hp','gold'].every(k=>Number.isFinite(record.state[k]));}
 // Files can restore missing character rows when the corresponding local
 // account still exists. A newer committed DB row always wins after a crash.
 for(const name of fs.readdirSync(saveDirectory).filter(n=>n.endsWith('.json'))){
  let record;try{record=JSON.parse(fs.readFileSync(path.join(saveDirectory,name),'utf8'));}catch{throw new Error('Unreadable player save: '+name+'; repair or move it before restarting.');}
  if(!validSave(record))throw new Error('Invalid player save: '+name);
  const account=db.prepare('SELECT id FROM game_accounts WHERE id=?').get(record.userId.replace(/^account:/,''));
  if(!account||record.resetVersion!==resetVersion())continue;
  const current=db.prepare('SELECT revision FROM character_saves WHERE user_id=?').get(record.userId);
  if(!current)db.prepare('INSERT INTO character_saves (user_id,state,revision,updated_at) VALUES (?,?,?,?)').run(record.userId,JSON.stringify(record.state),record.revision,record.updatedAt||new Date().toISOString());
 }
 const revisions=new Map();let knownIds=new Set();
 function flushPlayerFiles(){
  const rows=db.prepare("SELECT c.*,a.username FROM character_saves c LEFT JOIN game_accounts a ON c.user_id='account:'||a.id").all();
  for(const row of rows){
   const fingerprint=row.revision+':'+row.updated_at;if(revisions.get(row.user_id)===fingerprint)continue;
   const name=/^[a-zA-Z0-9_]{3,20}$/.test(row.username||'')?row.username.toLowerCase():createHash('sha256').update(row.user_id).digest('hex');
   const destination=path.join(saveDirectory,name+'.json'),temporary=destination+'.'+randomUUID()+'.tmp';
   const record={format:1,resetVersion:resetVersion(),userId:row.user_id,username:row.username||null,revision:row.revision,updatedAt:row.updated_at,state:JSON.parse(row.state)};
   let fd;try{fd=fs.openSync(temporary,'wx',0o600);fs.writeFileSync(fd,JSON.stringify(record,null,2)+'\n');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temporary,destination);revisions.set(row.user_id,fingerprint);}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  }
  // A committed explicit reset must not resurrect removed characters on boot.
  const ids=new Set(rows.map(row=>row.user_id));
  for(const name of fs.readdirSync(saveDirectory).filter(n=>n.endsWith('.json'))){const filename=path.join(saveDirectory,name),record=JSON.parse(fs.readFileSync(filename,'utf8'));if(validSave(record)&&knownIds.has(record.userId)&&!ids.has(record.userId))fs.unlinkSync(filename);}
  knownIds=ids;
 }
 class Statement{
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async first(column){const row=db.prepare(this.sql).get(...this.args);return column?row?.[column]??null:row??null;}
  async all(){return {success:true,results:db.prepare(this.sql).all(...this.args)};}
  execute(){const result=db.prepare(this.sql).run(...this.args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
  async run(){const result=this.execute();if(/\bcharacter_saves\b/i.test(this.sql)&&result.meta.changes)flushPlayerFiles();return result;}
 }
 const DB={prepare:sql=>new Statement(sql),async batch(statements){
  // No await within the transaction: another HTTP request cannot interleave.
  db.exec('BEGIN IMMEDIATE');let results;
  try{results=statements.map(statement=>statement.execute());db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  if(statements.some((statement,i)=>/\bcharacter_saves\b/i.test(statement.sql)&&results[i].meta.changes))flushPlayerFiles();return results;
 }};
 flushPlayerFiles();
 return {db,env:{DB},saveDirectory,serverDirectory,close(){flushPlayerFiles();db.close();}};
}
