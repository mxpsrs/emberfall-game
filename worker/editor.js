import {authenticatedPlayer} from './auth.js';
import {MAX_WORLD_BYTES,decodeWorld,saveWorld} from './editor-storage.js';
import {sanitize,sanitizeTerrain,confirmation} from './editor-document.js';
import '../dist/world-scene-format.js';
import seed from '../editor-data/world-scene.json' with {type:'json'};
const {fromLegacy,toLegacy,mergeLegacy,validateWorld}=globalThis.VeldrenSceneFormat;

// Editor grants use immutable account IDs, never reusable usernames.
const OWNER='2db1d2ba-75e2-4c27-bcdf-94e742f95c86';
const MAX_BYTES=MAX_WORLD_BYTES;
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
async function authorizedEditor(request,env){
 const account=await authenticatedPlayer(request,env);if(!account)return null;
 const grants=typeof env.VELDREN_EDITOR_ACCOUNT_IDS==='string'?env.VELDREN_EDITOR_ACCOUNT_IDS.split(/[\s,]+/):[];
 return account.id===OWNER||grants.includes(account.id)?account:null;
}
export async function editorAccess(request,env){
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 try{return await authorizedEditor(request,env)?reply({ok:true}):reply({error:'Sign in with an account that has editor access.'},403);}
 catch{return reply({error:'Editor authorization unavailable. Please retry.'},503);}
}
async function metadata(data){
 const edits=toLegacy(data),text=JSON.stringify(edits,null,2)+'\n',worldText=JSON.stringify(data,null,2)+'\n';
 const [digest,worldDigest]=await Promise.all([
  crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)),
  crypto.subtle.digest('SHA-256',new TextEncoder().encode(worldText))
 ]);
 const hex=value=>Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
 const sha256=hex(digest),worldSha256=hex(worldDigest);
 return {ok:true,path:'production world edits',runtimePath:'/api/editor/edits',revision:data.revision,count:edits.changes.length,bytes:new TextEncoder().encode(text).length,sha256,runtimeSha256:sha256,worldSha256,updatedAt:data.updatedAt,world:data,edits};
}
async function read(env){
 const row=await env.DB.prepare('SELECT document FROM editor_world WHERE id=?').bind(1).first();
 const document=row?await decodeWorld(row.document,env.DB):seed;
 return document?.format==='veldren.world'?document:fromLegacy(document);
}
async function readBody(request){
 if(Number(request.headers.get('content-length'))>MAX_BYTES)throw Object.assign(Error('Editor save exceeds 32 MB'),{status:413});
 const reader=request.body?.getReader();if(!reader)throw Object.assign(Error('Missing world edits'),{status:400});
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw Object.assign(Error('Editor save exceeds 32 MB'),{status:413});}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(Error('Invalid world edit document'),{status:400});}
}
export async function handleEditorEdits(request,env){
 try{
  if(request.method==='GET')return reply(await metadata(await read(env)));
  if(request.method!=='PUT')return reply({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
  const editor=await authorizedEditor(request,env);
  if(!editor)return reply({error:'Editor access is required to save world edits.'},403);
  const input=await readBody(request);
  if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)return reply({error:'A valid expectedRevision is required.'},400);
  const current=await read(env);
  if(input.expectedRevision!==current.revision)return reply({error:'The world was saved in another tab. Reload before saving.'},409);
  let data;
  try{
   if(input?.format==='veldren.world'){
    data=structuredClone(input);delete data.expectedRevision;
    data.revision=current.revision+1;data.updatedAt=new Date().toISOString();
    if(data.terrain!==undefined)data.terrain=sanitizeTerrain(data.terrain);
    else if(current.terrain!==undefined)data.terrain=current.terrain;
    validateWorld(data);toLegacy(data);
   }else data=mergeLegacy(current,sanitize(input,toLegacy(current)));
  }catch(error){return reply({error:error.message},error.status||400);}
  const saved=await saveWorld(env.DB,data,current,editor.id,input.expectedRevision);
  if(!saved.meta.changes)return reply({error:'The world was saved in another tab. Reload before saving.'},409);
  return reply({...await metadata(data),confirmed:toLegacy(data).changes.map(confirmation)});
 }catch(error){console.error('editor_storage_failed',error?.message);return reply({error:error.status?error.message:'World edit storage is unavailable. Your changes have not been confirmed.'},error.status||503);}
}
