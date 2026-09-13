import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {values}=parseArgs({options:{reason:{type:'string'},help:{type:'boolean'}}});
if(values.help){
  console.log('Usage: npm run accounts:reset -- --reason "Why everyone is starting over"\nPrepares one global character reset for the next publication. Keeps login credentials; clears progress, sessions and presence.');
  process.exit(0);
}
const reason=values.reason?.trim();
if(!reason||reason.length>200||/[\r\n\x00-\x1f\x7f]/.test(reason))throw new Error('Supply a one-line --reason of 1–200 characters.');
const pending=spawnSync('git',['status','--porcelain','--','drizzle'],{cwd:root,encoding:'utf8'});
if(pending.status!==0)throw new Error('Could not inspect migration changes.');
if(pending.stdout.trim())throw new Error('An uncommitted migration already exists. Finish that batch before preparing another reset.');
const journalPath=path.join(root,'drizzle/meta/_journal.json');
const before=JSON.parse(fs.readFileSync(journalPath,'utf8'));
const generated=spawnSync(process.execPath,[path.join(root,'node_modules/drizzle-kit/bin.cjs'),'generate','--custom','--name','global_account_reset'],{cwd:root,encoding:'utf8'});
if(generated.status!==0)throw new Error('Could not prepare reset migration: '+(generated.stderr||generated.stdout));
const after=JSON.parse(fs.readFileSync(journalPath,'utf8'));
if(after.entries.length!==before.entries.length+1)throw new Error('Expected exactly one new migration. Inspect the migration journal before continuing.');
const entry=after.entries.at(-1),migration=entry.tag+'.sql';
const id=new Date().toISOString().slice(0,19).replace('T','-').replaceAll(':','')+'-all-accounts-'+randomUUID().slice(0,8);
const pendingReset=`NOT EXISTS (SELECT 1 FROM game_resets WHERE reset_id = '${id}')`;
const statements=[
  `DELETE FROM game_sessions WHERE ${pendingReset};`,
  `UPDATE character_saves SET state = '{"freshStart":"${id}"}', revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE ${pendingReset};`,
  `DELETE FROM player_presence WHERE ${pendingReset};`,
  `INSERT INTO game_resets (reset_id,account_count,reset_at) SELECT '${id}', count(*), strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM character_saves HAVING ${pendingReset};`
];
fs.writeFileSync(path.join(root,'drizzle',migration),'-- Owner-requested global character reset: '+reason+'\n-- Preserve login identities and passwords. Audit guards make replay a no-op.\n'+statements.join('\n--> statement-breakpoint\n')+'\n');
fs.writeFileSync(path.join(root,'worker/reset-policy.js'),'// Updated by npm run accounts:reset -- --reason "...".\nexport const GLOBAL_ACCOUNT_RESET=Object.freeze('+JSON.stringify({id,reason,migration},null,2)+');\nexport const SAVE_RESET_VERSION=GLOBAL_ACCOUNT_RESET.id;\n');
console.log('Prepared '+id+' in drizzle/'+migration+'.\nRun npm run accounts:reset:check, then build and publish through the existing Sites workflow. The live game has not been reset by this command.');
