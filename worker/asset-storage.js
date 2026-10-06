import {Readable as AssetReadable} from 'node:stream';
import {createBrotliDecompress as AssetBrotliDecompress} from 'node:zlib';
import {authorized} from './maintenance.js';

const unavailable=()=>new Response('Game assets are temporarily unavailable. Retry shortly.',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'5'}});
const validKey=key=>/^veldren\/assets\/[a-f0-9]{64}\.(br|bin)$/.test(key||'');
export async function handleAssetUpload(request,env){
 if(!await authorized(request,env))return Response.json({error:'Administrator authorization required.'},{status:401});
 if(!['PUT','HEAD','POST'].includes(request.method))return new Response('Method not allowed',{status:405});
 const key=new URL(request.url).searchParams.get('key'),batch=request.headers.get('X-Asset-Batch');
 if(request.method!=='POST'&&!batch&&!validKey(key))return new Response('Invalid asset key',{status:400});
 if(!env.GAME_ASSETS)return unavailable();
 try{
  if(request.method==='POST'){
   const text=await request.text();if(text.length>32768)return new Response('Manifest too large',{status:413});
   const keys=JSON.parse(text);if(!Array.isArray(keys)||keys.length>100||keys.some(k=>!validKey(k)))return new Response('Invalid asset manifest',{status:400});
   const objects=await Promise.all(keys.map(async key=>{const o=await env.GAME_ASSETS.head(key);return {key,size:o?.size??null,sha256:o?.customMetadata?.sha256??null};}));
   return Response.json({objects},{headers:{'Cache-Control':'no-store'}});
  }
  if(request.method==='HEAD'){const object=await env.GAME_ASSETS.head(key);return new Response(null,{status:object?200:404,headers:object?{'Content-Length':String(object.size),'X-Asset-Sha256':object.customMetadata?.sha256||''}:{}});}
  const limit=16*1024*1024;if(Number(request.headers.get('Content-Length'))>limit)return new Response('Asset too large',{status:413});
  const chunks=[];let length=0;for await(const chunk of request.body||[]){length+=chunk.byteLength;if(length>limit)return new Response('Asset too large',{status:413});chunks.push(chunk);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const entries=batch?JSON.parse(atob(batch)):[{key,length}];
  if(!Array.isArray(entries)||entries.length>64||entries.some(e=>!validKey(e.key)||!Number.isSafeInteger(e.length)||e.length<0)||entries.reduce((n,e)=>n+e.length,0)!==length)return new Response('Invalid asset batch',{status:400});
  const verified=[];offset=0;for(const entry of entries){const body=bytes.subarray(offset,offset+entry.length);offset+=entry.length;
   const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),v=>v.toString(16).padStart(2,'0')).join('');
   if(entry.key.split('/').pop().split('.')[0]!==sha)return new Response('Asset checksum mismatch',{status:422});verified.push({...entry,body,sha});
  }
  // Content addressed keys cannot replace any different valid payload.
  for(const entry of verified)await env.GAME_ASSETS.put(entry.key,entry.body,{customMetadata:{sha256:entry.sha},httpMetadata:{contentType:'application/octet-stream'}});
  return Response.json({stored:true,objects:verified.map(e=>({key:e.key,bytes:e.length,sha256:e.sha}))},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('asset_upload_failed',String(error?.message||error).slice(0,160));return unavailable();}
}

export async function serveStoredAsset(request,env,asset,headers,acceptsBrotli,context){
 const compressed=asset.storageEncoding==='brotli',passThrough=compressed&&acceptsBrotli(request);
 if(compressed)headers.Vary='Accept-Encoding';if(passThrough)headers['Content-Encoding']='br';
 if(request.headers.get('If-None-Match')===headers.ETag)return new Response(null,{status:304,headers});
 const range=request.headers.get('Range');let selectedRange=null;
 if(range&&asset.mime==='audio/mpeg'){
  const match=range.match(/^bytes=(\d*)-(\d*)$/);let start,end;
  if(match&&(match[1]||match[2])){start=match[1]?Number(match[1]):Math.max(0,asset.length-Number(match[2]));end=match[1]&&match[2]?Number(match[2]):asset.length-1;end=Math.min(end,asset.length-1);}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=asset.length||asset.storageEncoding)return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+asset.length}});
  selectedRange={offset:start,length:end-start+1};headers['Content-Range']='bytes '+start+'-'+end+'/'+asset.length;headers['Content-Length']=String(selectedRange.length);
 }
 if(asset.mime==='audio/mpeg')headers['Accept-Ranges']='bytes';
 if(!env.GAME_ASSETS)return unavailable();
 try{
  // Dispatch runtimes may forbid even reading caches.default. Cache access is
  // optional; storage reads and browser cache headers remain sufficient.
  let edgeCache=null;try{edgeCache=globalThis.caches?.default;}catch{}
  const version=new URL(request.url).searchParams.get('v');
  const canCache=request.method==='GET'&&!selectedRange&&version===asset.version&&headers['Cache-Control'].startsWith('public');
  const cacheUrl=new URL(request.url);cacheUrl.search='';cacheUrl.pathname='/__veldren_asset_cache/'+asset.storageKey;cacheUrl.searchParams.set('representation',passThrough?'br':'identity');
  const cacheKey=new Request(cacheUrl);if(canCache&&edgeCache){try{const hit=await edgeCache.match(cacheKey);if(hit)return new Response(hit.body,{status:hit.status,headers:hit.headers,encodeBody:passThrough?'manual':'automatic'});}catch{edgeCache=null;}}
  const object=request.method==='HEAD'?await env.GAME_ASSETS.head(asset.storageKey):await env.GAME_ASSETS.get(asset.storageKey,selectedRange?{range:selectedRange}:undefined);
  if(!object||object.customMetadata?.sha256!==asset.storageSha256||!selectedRange&&object.size!==asset.storageLength)return unavailable();
  let body=request.method==='HEAD'?null:object.body;
  if(body&&compressed&&!passThrough)body=AssetReadable.toWeb(AssetReadable.fromWeb(body).pipe(AssetBrotliDecompress()));
  if(!selectedRange)headers['Content-Length']=String(passThrough?asset.storageLength:asset.length);
  const response=new Response(body,{status:selectedRange?206:200,headers,encodeBody:passThrough?'manual':'automatic'});
  if(canCache&&edgeCache&&context?.waitUntil){try{const cached=response.clone();context.waitUntil(Promise.resolve().then(()=>edgeCache.put(cacheKey,cached)).catch(()=>{}));}catch{}}
  return response;
 }catch(error){console.error('asset_read_failed',String(error?.message||error).slice(0,160));return unavailable();}
}
