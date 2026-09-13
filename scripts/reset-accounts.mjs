import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {values}=parseArgs({options:{reason:{type:'string'},retry:{type:'boolean'},help:{type:'boolean'}}});
if(values.help){
  console.log('Usage: npm run accounts:reset -- --reason "Why everyone is starting over"\nRetry an interrupted request: npm run accounts:reset -- --retry\nImmediately deletes all character saves and active sessions. Keeps usernames and passwords.');
  process.exit(0);
}
const token=process.env.EMBERFALL_RESET_TOKEN;
if(!token||token.length<32)throw new Error('Set EMBERFALL_RESET_TOKEN in .env.reset.local or the operator environment.');
const origin=new URL(process.env.EMBERFALL_SITE_URL||'https://emberfall-realms.rayfgarrison97.chatgpt.site');
if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('EMBERFALL_SITE_URL must be the HTTPS game origin.');
const directory=path.join(root,'.reset-requests'),receiptPath=path.join(directory,'latest.json');
const previous=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath,'utf8')):null;
let receipt;
if(values.retry){
  if(values.reason||!previous||previous.origin!==origin.origin)throw new Error('Retry requires an existing request for this game; do not supply a new reason.');
  receipt=previous;
}else{
  if(previous?.status==='pending')throw new Error('The last request is unconfirmed. Use --retry to finish that same reset.');
  const reason=values.reason?.trim();
  if(!reason||reason.length>200||/[\x00-\x1f\x7f]/.test(reason))throw new Error('Supply a one-line --reason of 1–200 characters.');
  receipt={requestId:randomUUID(),reason,origin:origin.origin,status:'pending'};
}
fs.mkdirSync(directory,{recursive:true,mode:0o700});
const saveReceipt=()=>fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
saveReceipt();
console.log('Global reset request: '+receipt.requestId);
// Pass the key through stdin, never the command line, a URL or a tracked file.
const response=spawnSync('curl',['--config','-','--silent','--show-error','--max-time','25','--request','POST','--url',origin.origin+'/api/admin/global-reset','--header','Content-Type: application/json','--data-binary',JSON.stringify({requestId:receipt.requestId,reason:receipt.reason}),'--write-out','\n%{http_code}'],{input:'header = '+JSON.stringify('Authorization: Bearer '+token)+'\n',encoding:'utf8',maxBuffer:1024*1024});
if(response.status!==0)throw new Error('Reset response was not confirmed. Use --retry; it reuses this request ID and cannot reset players twice.');
const split=response.stdout.lastIndexOf('\n'),status=Number(response.stdout.slice(split+1));
let result;try{result=JSON.parse(response.stdout.slice(0,split));}catch{throw new Error('Unexpected server response. Use --retry to confirm the same reset.');}
if(status!==200||result.reset?.id!==receipt.requestId||result.reset.completed!==1)throw new Error(result.error||'Reset was not confirmed. Use --retry.');
receipt={...receipt,status:'completed',reset:result.reset};saveReceipt();
console.log((result.replayed?'Reset already completed; no further data changed. ':'Reset complete. ')+result.reset.character_count+' saves deleted, '+result.reset.session_count+' sessions revoked. Usernames and passwords preserved.');
