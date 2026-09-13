import {spawnSync} from 'node:child_process';
const [action,requestId]=process.argv.slice(2);
if(!['start','check','finish'].includes(action)||!requestId||!/^[a-zA-Z0-9-]{16,64}$/.test(requestId))throw new Error('Usage: node scripts/maintenance.mjs start|check|finish REQUEST_ID');
const token=process.env.EMBERFALL_MAINTENANCE_TOKEN||process.env.EMBERFALL_RESET_TOKEN;
if(!token||token.length<32||/[\r\n]/.test(token))throw new Error('Set the maintenance operator token.');
const origin=new URL(process.env.EMBERFALL_SITE_URL||'https://emberfall-realms.rayfgarrison97.chatgpt.site');
if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Expected HTTPS game origin.');
const args=['--config','-','--silent','--show-error','--max-time','25','--url',origin.origin+'/api/admin/maintenance','--write-out','\n%{http_code}'];
if(action!=='check')args.push('--request','POST','--header','Content-Type: application/json','--data-binary',JSON.stringify({action,requestId}));
const r=spawnSync('curl',args,{input:'header = '+JSON.stringify('Authorization: Bearer '+token)+'\n',encoding:'utf8'});
if(r.status!==0)throw new Error('Maintenance response unconfirmed; retry the same request ID.');
const cut=r.stdout.lastIndexOf('\n'),status=Number(r.stdout.slice(cut+1));let body;try{body=JSON.parse(r.stdout.slice(0,cut));}catch{throw new Error('Unexpected maintenance response.');}
if(status!==200||body.id!==requestId)throw new Error(body.error||'Maintenance request did not match. Do not deploy.');
console.log(JSON.stringify(body));
if(action==='check'&&body.status!=='locked')process.exitCode=2;
