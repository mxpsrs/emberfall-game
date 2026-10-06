import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
const origin=process.env.VELDREN_SITE_URL||'https://emberfall-realms.rayfgarrison97.chatgpt.site',root='.asset-cache/public-assets',manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));
const url=new URL(origin);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/')throw Error('Expected HTTPS game origin');
const records=manifest.records,chosen=[records.find(r=>r.path==='/assets/asset-registry.json'),records.find(r=>r.path==='/vendor/filament/filament.wasm'),records.find(r=>r.path==='/assets/realms/atlas-filament-mobile.png'),records.find(r=>r.path.startsWith('/assets/canonical/models/')),records.find(r=>r.path.startsWith('/terrain-cells/'))];
const output='.qa/asset-phase3/live';fs.mkdirSync(output,{recursive:true});const results=[];
for(const [i,r]of chosen.entries()){
 if(!r)throw Error('Missing delivery fixture');const target=new URL(r.path,url);target.searchParams.set('v',r.version);const file=path.join(output,i+'.bin'),headers=path.join(output,i+'.headers');
 const response=spawnSync('curl',['--silent','--show-error','--compressed','--max-time','45','--url',target.href,'--output',file,'--dump-header',headers,'--write-out','%{http_code}'],{encoding:'utf8'});
 if(response.status||response.stdout!=='200')throw Error('Production asset failed: '+r.path+' '+response.stdout);
 const stored=fs.readFileSync(path.join(root,r.file)),expected=r.storageEncoding==='brotli'?brotliDecompressSync(stored):stored,actual=fs.readFileSync(file);if(!actual.equals(expected))throw Error('Production bytes differ: '+r.path);
 const result={path:r.path,status:200,decodedBytes:actual.length,sha256:createHash('sha256').update(actual).digest('hex'),expectedBytesMatch:true};results.push(result);console.log(JSON.stringify(result));
}
const audio=records.find(r=>r.mime==='audio/mpeg'),audioFile=path.join(output,'audio-range.bin'),response=spawnSync('curl',['--silent','--show-error','--max-time','30','--range','10-29','--url',new URL(audio.path,url).href,'--output',audioFile,'--write-out','%{http_code}'],{encoding:'utf8'});
if(response.status||response.stdout!=='206'||!fs.readFileSync(audioFile).equals(fs.readFileSync(path.join(root,audio.file)).subarray(10,30)))throw Error('Production audio range mismatch');results.push({path:audio.path,status:206,range:'bytes=10-29',expectedBytesMatch:true});
const receipt={date:new Date().toISOString(),origin,results,allPassed:true};fs.writeFileSync('.qa/asset-phase3/live.json',JSON.stringify(receipt,null,2)+'\n');console.log('PASS: production registry, Filament WASM/PNG, model, terrain and audio range bytes match the verified asset store.');
