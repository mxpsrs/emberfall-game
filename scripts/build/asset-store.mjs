import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compressAsset} from './asset-delivery.mjs';

export function exportStoredAssets(assets,{bootstrap=false,directory='.asset-cache/public-assets'}={}){
 fs.mkdirSync(directory,{recursive:true});const records=[];
 for(const [url,asset]of Object.entries(assets)){
  if(url.endsWith('.html')||!(url.startsWith('/assets/')||url.startsWith('/terrain-cells/')||asset.length>=512*1024))continue;
  const raw=Buffer.from(asset.data,'base64');let bytes=raw,encoding=null;
  if(/\.(js|json|css|txt|wasm|filamat)$/.test(url)&&raw.length>=1024){const candidate=compressAsset(raw,'.asset-cache/brotli-v1-q6',6);if(candidate.length<raw.length*.90){bytes=candidate;encoding='brotli';}}
  const sha=createHash('sha256').update(bytes).digest('hex'),key='veldren/assets/'+sha+(encoding?'.br':'.bin'),file=path.join(directory,path.basename(key));
  if(!fs.existsSync(file))fs.writeFileSync(file,bytes);
  const metadata={mime:asset.mime,length:asset.length,version:asset.version,storageKey:key,storageSha256:sha,storageLength:bytes.length,...(encoding?{storageEncoding:encoding}:{})};
  records.push({path:url,file:path.basename(file),...metadata});if(!bootstrap)assets[url]=metadata;
 }
 const manifest={format:'veldren.asset-store',version:1,records};fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
