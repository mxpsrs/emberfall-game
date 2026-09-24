import {authenticatedPlayer} from './auth.js';
import {sanitize,confirmation} from './editor-document.js';
import seed from '../editor-data/world-edits.json' with {type:'json'};

// Verified existing owner account. Never grant editor access by a reusable name.
const OWNER='2db1d2ba-75e2-4c27-bcdf-94e742f95c86';
const MAX_BYTES=1024*1024;
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
async function owner(request,env){return (await authenticatedPlayer(request,env))?.id===OWNER;}
export async function editorAccess(request,env){
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 try{return await owner(request,env)?reply({ok:true}):reply({error:'Sign in with the mxpsrs owner account to open the editor.'},403);}
 catch{return reply({error:'Editor authorization unavailable. Please retry.'},503);}
}
async function metadata(data){
 const text=JSON.stringify(data,null,2)+'\n',bytes=new TextEncoder().encode(text);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 return {ok:true,path:'production world edits',runtimePath:'/api/editor/edits',revision:data.revision,count:data.changes.length,bytes:bytes.length,sha256,runtimeSha256:sha256,updatedAt:data.updatedAt,edits:data};
}
async function read(env){
 const row=await env.DB.prepare('SELECT document FROM editor_world WHERE id=?').bind(1).first();
 return row?JSON.parse(row.document):seed;
}
async function readBody(request){
 if(Number(request.headers.get('content-length'))>MAX_BYTES)throw Object.assign(Error('Editor save exceeds 1 MB'),{status:413});
 const reader=request.body?.getReader();if(!reader)throw Object.assign(Error('Missing world edits'),{status:400});
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw Object.assign(Error('Editor save exceeds 1 MB'),{status:413});}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(Error('Invalid world edit document'),{status:400});}
}
export async function handleEditorEdits(request,env){
 try{
  if(request.method==='GET')return reply(await metadata(await read(env)));
  if(request.method!=='PUT')return reply({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
  if(!await owner(request,env))return reply({error:'Only the owner can save world edits.'},403);
  const input=await readBody(request);
  if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0)return reply({error:'A valid expectedRevision is required.'},400);
  const current=await read(env);let data;
  try{data=sanitize(input,current);}catch(error){return reply({error:error.message},error.status||400);}
  const document=JSON.stringify(data),previous=JSON.stringify(current);
  if(new TextEncoder().encode(document).length>MAX_BYTES)return reply({error:'Editor save exceeds 1 MB'},413);
  // Compare-and-swap in one statement. Retain the previous document atomically.
  const saved=await env.DB.prepare(`INSERT INTO editor_world (id,revision,document,previous_document,updated_by) VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,previous_document=editor_world.document,updated_by=excluded.updated_by WHERE editor_world.revision=?`).bind(data.revision,document,previous,OWNER,input.expectedRevision).run();
  if(!saved.meta.changes)return reply({error:'The world was saved in another tab. Reload before saving.'},409);
  return reply({...await metadata(data),confirmed:data.changes.map(confirmation)});
 }catch(error){console.error('editor_storage_failed',error?.message);return reply({error:error.status?error.message:'World edit storage is unavailable. Your changes have not been confirmed.'},error.status||503);}
}
