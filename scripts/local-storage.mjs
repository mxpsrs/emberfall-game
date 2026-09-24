import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {localAccounts} from './local-accounts.mjs';
import {RESET_VERSION_SQL} from '../worker/reset-policy.js';

// Account folders supply credentials and characters at startup. SQLite is a
// local transactional index and social/world store; no cloud service is used.
export function openLocalStorage({root=process.cwd(),dataDirectory=process.env.VELDREN_DATA_DIR||root}={}){
 const directory=path.resolve(dataDirectory),saveDirectory=path.join(directory,'player-saves'),serverDirectory=path.join(directory,'server-data');
 for(const dir of [saveDirectory,serverDirectory])fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const db=new DatabaseSync(path.join(serverDirectory,'veldren.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');
 try{
  db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL)');
  for(const name of fs.readdirSync(path.join(root,'drizzle')).filter(n=>n.endsWith('.sql')).sort()){
   const sql=fs.readFileSync(path.join(root,'drizzle',name),'utf8'),hash=createHash('sha256').update(sql).digest('hex');
   const existing=db.prepare('SELECT hash FROM local_migrations WHERE name=?').get(name);
   if(existing){if(existing.hash!==hash)throw new Error('Applied local migration changed: '+name);continue;}
   db.exec('BEGIN IMMEDIATE');try{db.exec(sql);db.prepare('INSERT INTO local_migrations VALUES (?,?)').run(name,hash);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  }
  db.exec('CREATE TABLE IF NOT EXISTS local_save_outbox (user_id TEXT PRIMARY KEY, username TEXT, state TEXT, revision INTEGER, updated_at TEXT, reset_version TEXT, deleted INTEGER NOT NULL DEFAULT 0)');
 }catch(error){db.close();throw error;}
 const resetVersion=()=>db.prepare('SELECT '+RESET_VERSION_SQL+' AS version').get().version;
 const filename=row=>path.join(saveDirectory,row.username.toLowerCase(),'character.json');
 function atomicWrite(destination,record){
  const temporary=destination+'.'+randomUUID()+'.tmp';let fd;
  try{fd=fs.openSync(temporary,'wx',0o600);fs.writeFileSync(fd,JSON.stringify(record,null,2)+'\n');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temporary,destination);if(process.platform!=='win32'){const dir=fs.openSync(path.dirname(destination),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}}}
  finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
 }
 let accountFiles;try{accountFiles=localAccounts(db,saveDirectory,atomicWrite);}catch(error){db.close();throw error;}
 function flushPlayerFiles(){
  accountFiles.reconcile();accountFiles.flush();
  const pending=db.prepare('SELECT * FROM local_save_outbox ORDER BY user_id').all();if(!pending.length)return;
  for(const row of pending){
   const account=db.prepare('SELECT username FROM game_accounts WHERE id=?').get(row.user_id.slice(8));
   if(!account)continue;
   const destination=filename(account);
   if(row.deleted){if(fs.existsSync(destination))fs.unlinkSync(destination);}
   else atomicWrite(destination,{format:1,resetVersion:row.reset_version,userId:row.user_id,username:row.username||null,revision:row.revision,updatedAt:row.updated_at,state:JSON.parse(row.state)});
  }
  // Keep the whole transaction's outbox until every participant's file lands.
  // A crash halfway through a trade is replayed before characters are loaded.
  if(process.platform!=='win32'){const fd=fs.openSync(saveDirectory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
  db.exec('DELETE FROM local_save_outbox');
 }
 function validSave(record){return record?.format===1&&typeof record.userId==='string'&&record.userId.startsWith('account:')&&Number.isSafeInteger(record.revision)&&record.revision>0&&record.state&&typeof record.state==='object'&&record.state.xp&&record.state.bag&&['x','y','hp','gold'].every(k=>Number.isFinite(record.state[k]));}
 try{
  accountFiles.restore();
  flushPlayerFiles();
  // Validate the complete folder before replacing any cached character state.
  const records=[],seen=new Set();
  for(const name of fs.readdirSync(saveDirectory,{withFileTypes:true}).filter(e=>e.isDirectory()&&fs.existsSync(path.join(saveDirectory,e.name,'character.json'))).map(e=>e.name+'/character.json')){
   let record;try{record=JSON.parse(fs.readFileSync(path.join(saveDirectory,name),'utf8'));}catch{throw new Error('Unreadable player save: '+name+'; repair it before restarting.');}
   if(!validSave(record)||seen.has(record.userId))throw new Error('Invalid or duplicate player save: '+name);seen.add(record.userId);
   const account=db.prepare('SELECT id,username FROM game_accounts WHERE id=?').get(record.userId.slice('account:'.length));
   if(!account)continue; // Keep orphan files intact until their accounts are restored.
   if(filename({user_id:record.userId,username:account.username})!==path.join(saveDirectory,name))throw new Error('Player save filename does not match its account: '+name);
   records.push({...record,username:account.username});
  }
  db.exec('BEGIN IMMEDIATE');
  try{
   for(const event of ['insert','update','delete'])db.exec('DROP TRIGGER IF EXISTS local_character_'+event);
   const previous=new Map(db.prepare('SELECT * FROM character_saves').all().map(row=>[row.user_id,row]));
   db.exec('DELETE FROM character_saves');
   for(const record of records){
    const old=previous.get(record.userId),state=JSON.stringify(record.state);
    // Offline file edits/restores win; advance the revision so an old browser
    // cannot immediately overwrite a restored file with stale cached progress.
    const changed=old&&(old.state!==state||old.revision!==record.revision);
    const revision=changed?Math.max(old.revision,record.revision)+1:record.revision,stamp=changed?new Date().toISOString():record.updatedAt||new Date().toISOString();
    db.prepare('INSERT INTO character_saves VALUES (?,?,?,?)').run(record.userId,state,revision,stamp);
    if(changed)db.prepare('INSERT OR REPLACE INTO local_save_outbox VALUES (?,?,?,?,?,?,0)').run(record.userId,record.username,state,revision,stamp,resetVersion());
   }
   for(const event of ['INSERT','UPDATE','DELETE']){
    const ref=event==='DELETE'?'OLD':'NEW';
    db.exec(`CREATE TRIGGER local_character_${event.toLowerCase()} AFTER ${event} ON character_saves BEGIN INSERT OR REPLACE INTO local_save_outbox (user_id,username,state,revision,updated_at,reset_version,deleted) VALUES (${ref}.user_id,(SELECT username FROM game_accounts WHERE 'account:'||id=${ref}.user_id),${ref}.state,${ref}.revision,${ref}.updated_at,${RESET_VERSION_SQL},${event==='DELETE'?1:0}); END;`);
   }
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  flushPlayerFiles();
 }catch(error){db.close();throw error;}
 class Statement{
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async first(column){accountFiles.reconcile();const row=db.prepare(this.sql).get(...this.args);return column?row?.[column]??null:row??null;}
  async all(){accountFiles.reconcile();return {success:true,results:db.prepare(this.sql).all(...this.args)};}
  execute(){const result=db.prepare(this.sql).run(...this.args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
  async run(){accountFiles.reconcile();const result=this.execute();flushPlayerFiles();return result;}
 }
 const DB={prepare:sql=>new Statement(sql),async batch(statements){
  // No await within a transaction: another HTTP request cannot interleave.
  accountFiles.reconcile();db.exec('BEGIN IMMEDIATE');let results;
  try{results=statements.map(statement=>statement.execute());db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  flushPlayerFiles();return results;
 }};
 let closed=false;
 return {db,env:{DB},saveDirectory,serverDirectory,close(){if(closed)return;try{flushPlayerFiles();}finally{db.close();closed=true;}}};
}
