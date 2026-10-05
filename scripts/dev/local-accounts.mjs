import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// The account folder is authoritative. The database is a local working index.
export function localAccounts(db,saveDirectory,atomicWrite){
 const folder=a=>path.join(saveDirectory,a.normalized_username);
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const accounts=()=>db.prepare('SELECT * FROM game_accounts').all();
 const safeDirectory=dir=>{const stat=fs.lstatSync(dir);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Account path must be a real directory: '+path.basename(dir));};
 const write=a=>{fs.mkdirSync(folder(a),{recursive:true,mode:0o700});safeDirectory(folder(a));atomicWrite(path.join(folder(a),'account.json'),{format:1,...a});if(process.platform!=='win32'){const fd=fs.openSync(saveDirectory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}};
 db.exec('CREATE TABLE IF NOT EXISTS local_account_format (version INTEGER PRIMARY KEY); CREATE TABLE IF NOT EXISTS local_account_outbox (id TEXT PRIMARY KEY)');
 // One-time upgrade, resumable before its marker is committed. Legacy files
 // are moved, never retained as a second source that can resurrect an account.
 if(!db.prepare('SELECT version FROM local_account_format WHERE version=2').get()){
  for(const a of accounts()){
   write(a);
   const old=path.join(saveDirectory,a.normalized_username+'.json'),next=path.join(folder(a),'character.json');
   if(fs.existsSync(old))fs.renameSync(old,next);
  }
  db.exec('INSERT INTO local_account_format VALUES (2)');
 }
 db.exec('CREATE TRIGGER IF NOT EXISTS local_account_insert AFTER INSERT ON game_accounts BEGIN INSERT OR REPLACE INTO local_account_outbox VALUES (NEW.id); END');
 function flush(){
  for(const row of db.prepare('SELECT a.* FROM game_accounts a JOIN local_account_outbox o ON a.id=o.id').all())write(row);
  db.exec('DELETE FROM local_account_outbox');
 }
 function purge(a){
  const id=a.id,user='account:'+id,actor=hash('public-player:'+user);
  for(const [table,where,args] of [
   ['game_sessions','account_id=?',[id]],['character_saves','user_id=?',[user]],
   ['archived_characters','user_id=?',[user]],['friendships','a=? OR b=?',[id,id]],
   ['player_trades','a=? OR b=?',[id,id]],['social_messages','author=? OR recipient=?',[id,id]],
   ['ignored_players','owner=? OR target=?',[id,id]],['social_settings','account_id=?',[id]],
   ['player_presence','player_id=?',[actor]],['shared_events','actor=?',[actor]],
   ['shared_objects',"json_extract(payload,'$.owner')=?",[actor]],
   ['shared_clocks',"id LIKE ?",[actor+':%']],
   ['auth_limits','key=? OR key LIKE ?',[hash('user:'+a.normalized_username),'social:%:'+id]],
   ['local_save_outbox','user_id=?',[user]],['local_account_outbox','id=?',[id]],
   ['game_accounts','id=?',[id]]
  ])db.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...args);
  db.prepare("UPDATE shared_entities SET state=json_set(state,'$.target',NULL,'$.defender',NULL),revision=revision+1 WHERE json_extract(state,'$.target')=?").run(actor);
  db.prepare("UPDATE social_messages SET audience=(SELECT COALESCE(json_group_array(value),'[]') FROM json_each(social_messages.audience) WHERE value<>?) WHERE EXISTS (SELECT 1 FROM json_each(social_messages.audience) WHERE value=?)").run(actor,actor);
 }
 function reconcile(){
  // Validate everything before deleting anything. Missing folders mean delete;
  // damaged or incomplete folders mean stop, so repairs remain possible.
  const pending=new Set(db.prepare('SELECT id FROM local_account_outbox').all().map(r=>r.id));
  const missing=[];
  for(const a of accounts()){
   if(pending.has(a.id))continue;
   if(!fs.existsSync(folder(a))){missing.push(a);continue;}
   safeDirectory(folder(a));
   const file=path.join(folder(a),'account.json');
   if(fs.lstatSync(file).isSymbolicLink())throw new Error('Account files must not be symbolic links.');
   const record=JSON.parse(fs.readFileSync(file,'utf8'));
   if(record.format!==1||['id','username','normalized_username','password_hash','created_at'].some(k=>record[k]!==a[k]))throw new Error('Account file does not match its local index: '+a.normalized_username);
  }
  if(missing.length){db.exec('BEGIN IMMEDIATE');try{for(const a of missing)purge(a);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
 }
 function restore(){
  const records=[];
  for(const entry of fs.readdirSync(saveDirectory,{withFileTypes:true})){
   if(!entry.isDirectory())continue;
   const file=path.join(saveDirectory,entry.name,'account.json');
   if(fs.lstatSync(file).isSymbolicLink())throw new Error('Account files must not be symbolic links.');
   const a=JSON.parse(fs.readFileSync(file,'utf8'));
   if(a.format!==1||!/^\w{3,20}$/.test(a.username)||a.normalized_username!==a.username.toLowerCase()||entry.name!==a.normalized_username||typeof a.id!=='string'||!a.id||!/^\$2[aby]\$\d\d\$.{53}$/.test(a.password_hash)||!Number.isSafeInteger(a.created_at))throw new Error('Invalid account folder: '+entry.name);
   records.push(a);
  }
  // A registration not yet written to a folder was never acknowledged. Do
  // not recreate it on restart: the owner may have removed its folder.
  for(const a of records)db.prepare('INSERT INTO game_accounts VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,normalized_username=excluded.normalized_username,password_hash=excluded.password_hash,created_at=excluded.created_at').run(a.id,a.username,a.normalized_username,a.password_hash,a.created_at);
  db.exec('DELETE FROM local_account_outbox');
 }
 return {reconcile,flush,restore};
}
