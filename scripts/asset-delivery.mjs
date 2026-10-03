import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';

// ASCII basE91 removes base64's 33% embedding overhead without changing a
// response byte. Excluding quotes, backslashes and backticks avoids JS escapes.
const alphabet=Array.from({length:94},(_,i)=>String.fromCharCode(i+33)).filter(c=>c!=='"'&&c!=='\\'&&c!=='`').join('');
export function encodeAsset(bytes){
 let queue=0,bits=0,out='';
 for(const byte of bytes){queue|=byte<<bits;bits+=8;if(bits>13){let value=queue&8191;if(value>88){queue>>>=13;bits-=13;}else{value=queue&16383;queue>>>=14;bits-=14;}out+=alphabet[value%91]+alphabet[Math.floor(value/91)];}}
 if(bits){out+=alphabet[queue%91];if(bits>7||queue>90)out+=alphabet[Math.floor(queue/91)];}return out;
}
export function decodeAsset(value,length){
 const alphabet=Array.from({length:94},(_,i)=>String.fromCharCode(i+33)).filter(c=>c!=='"'&&c!=='\\'&&c!=='`').join('');
 const digits=new Int16Array(128).fill(-1);for(let i=0;i<alphabet.length;i++)digits[alphabet.charCodeAt(i)]=i;
 const out=new Uint8Array(length);let pending=-1,queue=0,bits=0,index=0;
 for(let i=0;i<value.length;i++){
  const code=value.charCodeAt(i),digit=code<128?digits[code]:-1;if(digit<0)throw Error('Invalid embedded asset');
  if(pending<0)pending=digit;else{pending+=digit*91;queue|=pending<<bits;bits+=(pending&8191)>88?13:14;
   while(bits>7){if(index>=length)throw Error('Embedded asset overflow');out[index++]=queue&255;queue>>>=8;bits-=8;}pending=-1;}
 }
 if(pending>=0){if(index>=length)throw Error('Embedded asset overflow');out[index++]=(queue|pending<<bits)&255;}
 if(index!==length)throw Error('Truncated embedded asset');return out;
}

// Respect an explicit br;q=0 and Cloudflare's original browser header.
export function acceptsBrotli(request){
 const header=request.cf?.clientAcceptEncoding??request.headers.get('Accept-Encoding')??'';
 let wildcard=false;
 for(const entry of header.toLowerCase().split(',')){
  const [name,...parameters]=entry.trim().split(';');
  const parameter=parameters.map(p=>p.trim()).find(p=>p.startsWith('q='));
  const quality=parameter===undefined?1:Number(parameter.slice(2));
  if(name==='br')return Number.isFinite(quality)&&quality>0;
  if(name==='*')wildcard=Number.isFinite(quality)&&quality>0;
 }
 return wildcard;
}

// Source-only artifacts remain in Git. These formats/sheets have no consumer in
// either current startup; all game/editor models and active textures still ship.
export const sourceOnlyAssets=new Map([
 ...['atlas','ground-surfaces','ground-grass','ground-stone','ground-dirt'].map(n=>['assets/realms/'+n+'.ktx2','Superseded by the native PNG/mipmap path']),
 ...['ground-grass','ground-stone','ground-dirt','ground-water'].map(n=>['assets/realms/'+n+'.png','Input to the combined ground-surfaces atlas']),
 ...['characters','heroes','monsters','poses','walking','terrain'].map(n=>['assets/'+n+'.png','Retired 2D world sheet; startup loads only items and environment']),
 ...['spirits','spirit-portraits'].map(n=>['assets/'+n+'.png','Retired spirit presentation']),
 ['assets/canonical/registry.json','Build-time input; runtime uses assets/asset-registry.json']
]);

export function compressAsset(bytes,cacheRoot='.asset-cache/brotli-v1-q11'){
 const key=createHash('sha256').update(bytes).digest('hex'),file=path.join(cacheRoot,key+'.br');
 let compressed;
 if(fs.existsSync(file)){
  try{const candidate=fs.readFileSync(file);if(brotliDecompressSync(candidate,{maxOutputLength:bytes.length}).equals(bytes))compressed=candidate;}catch{}
 }
 if(!compressed){
  compressed=brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:11}});
  if(!brotliDecompressSync(compressed,{maxOutputLength:bytes.length}).equals(bytes))throw Error('Asset compression roundtrip failed');
  fs.mkdirSync(cacheRoot,{recursive:true});const temporary=file+'.tmp';fs.writeFileSync(temporary,compressed);fs.renameSync(temporary,file);
 }
 return compressed;
}

export function compressedCatalogPlugin(){
 return {name:'veldren-native-catalog-storage',setup(build){
  // The current authored Scene is also delivered as a browser asset. Compress
  // its API seed through the same lossless path instead of embedding another
  // large uncompressed copy in the Worker.
  build.onLoad({filter:/(?:worker\/(?:shared-catalog|trade-items)|editor-data\/world-scene)\.json$/},({path:file})=>{
   const data=compressAsset(fs.readFileSync(file)).toString('base64');
   return {loader:'js',contents:`import {brotliDecompressSync} from 'node:zlib';export default JSON.parse(new TextDecoder().decode(brotliDecompressSync(Uint8Array.from(atob(${JSON.stringify(data)}),c=>c.charCodeAt(0)))));`};
  });
 }};
}
