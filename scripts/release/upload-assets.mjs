import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]||'.asset-cache/public-assets'),origin=process.env.VELDREN_SITE_URL||'https://emberfall-realms.rayfgarrison97.chatgpt.site';
const token=process.env.EMBERFALL_MAINTENANCE_TOKEN||process.env.VELDREN_MAINTENANCE_TOKEN;
if(!token||token.length<32||/[\r\n]/.test(token))throw Error('Private operator credential required');
const url=new URL(origin);if(url.protocol!=='https:'||url.pathname!=='/'||url.username||url.password)throw Error('Expected HTTPS game origin');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),unique=[...new Map(manifest.records.map(r=>[r.storageKey,r])).values()],began=Date.now();
fs.mkdirSync('.qa/asset-phase3',{recursive:true});
function request(method,{json,file,batch}={}){return new Promise((resolve,reject)=>{
 const target=new URL('/api/admin/assets',url),args=['--config','-','--silent','--show-error','--max-time','50','--url',target.href,'--write-out','\n%{http_code}','--request',method];
 if(file)args.push('--upload-file',file);if(json)args.push('--header','Content-Type: application/json','--data-binary',JSON.stringify(json));
 const child=spawn('curl',args,{stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);let config='header = '+JSON.stringify('Authorization: Bearer '+token)+'\n';if(batch)config+='header = '+JSON.stringify('X-Asset-Batch: '+Buffer.from(JSON.stringify(batch)).toString('base64'))+'\n';child.stdin.end(config);
 child.once('error',reject);child.once('close',code=>{if(code)return reject(Error('Asset request failed: '+err.slice(0,160)));const cut=out.lastIndexOf('\n'),status=Number(out.slice(cut+1));if(status!==200)return reject(Error('Asset request rejected: '+status));try{resolve(JSON.parse(out.slice(0,cut)))}catch{reject(Error('Invalid asset response'))}});
});}
async function inventory(){const objects=new Map();for(let at=0;at<unique.length;at+=200){const replies=await Promise.all([unique.slice(at,at+100),unique.slice(at+100,at+200)].filter(g=>g.length).map(g=>request('POST',{json:g.map(r=>r.storageKey)})));for(const reply of replies)for(const r of reply.objects)objects.set(r.key,r);console.log(JSON.stringify({checked:Math.min(at+200,unique.length),total:unique.length}));}return objects;}
const existing=await inventory(),missing=[];for(const r of unique){const bytes=fs.readFileSync(path.join(root,r.file));if(bytes.length!==r.storageLength||createHash('sha256').update(bytes).digest('hex')!==r.storageSha256)throw Error('Local asset checksum mismatch');const remote=existing.get(r.storageKey);if(remote?.size!==r.storageLength||remote?.sha256!==r.storageSha256)missing.push(r);}
let uploaded=0;
for(let at=0;at<missing.length;){const group=[];let bytes=0;while(at<missing.length&&group.length<48){const r=missing[at];if(group.length&&bytes+r.storageLength>12*1024*1024)break;group.push(r);bytes+=r.storageLength;at++;}
 const file=path.resolve('.qa/asset-phase3/upload-batch.bin');fs.writeFileSync(file,Buffer.concat(group.map(r=>fs.readFileSync(path.join(root,r.file)))));let reply;
 for(let attempt=0;attempt<3;attempt++){try{reply=await request('PUT',{file,batch:group.map(r=>({key:r.storageKey,length:r.storageLength}))});break;}catch(error){if(attempt===2)throw error;}}
 if(!reply.stored||reply.objects.length!==group.length||reply.objects.some((r,i)=>r.key!==group[i].storageKey||r.sha256!==group[i].storageSha256||r.bytes!==group[i].storageLength))throw Error('Upload acknowledgement mismatch');uploaded+=group.length;console.log(JSON.stringify({uploaded,totalMissing:missing.length}));
}
const final=await inventory();for(const r of unique){const stored=final.get(r.storageKey);if(stored?.size!==r.storageLength||stored?.sha256!==r.storageSha256)throw Error('Remote asset verification failed: '+r.path);}
const receipt={date:new Date().toISOString(),records:manifest.records.length,uniqueObjects:unique.length,verified:unique.length,uploaded,seconds:Math.round((Date.now()-began)/1000),manifestSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'manifest.json'))).digest('hex')};fs.writeFileSync('.qa/asset-phase3/upload.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
