// Identity comes only from Sites' authenticated request headers, never the save body.
async function accountKeys(request){
 const id=request.headers.get('oai-authenticated-user-id')?.trim();
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 const keys=[];if(id)keys.push(id);
 if(email&&/^[^\s@]+@[^\s@]+$/.test(email)){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email));
  keys.push('email:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''));
 }
 return keys;
}
export async function handleSave(request,env){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 const keys=await accountKeys(request);if(!keys.length)return reply({error:'Your signed-in account is unavailable. Reopen Emberfall from ChatGPT and try again.',code:'ACCOUNT_UNAVAILABLE'},401);
 if(!env.DB)return reply({error:'Character storage is unavailable.'},503);
 try{
 let user=keys[0],row=null;
 // Preserve an existing ID-keyed save, and retain email-keyed saves if an ID becomes available later.
 for(const key of keys){const found=await env.DB.prepare('SELECT state, revision, updated_at FROM character_saves WHERE user_id = ?').bind(key).first();if(found){user=key;row=found;break;}}
 if(request.method==='GET'){return reply(row?{account:user,state:JSON.parse(row.state),revision:row.revision,updatedAt:row.updated_at}:{account:user,state:null,revision:0});}
 if(request.method!=='PUT')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 const raw=await request.text();if(raw.length>500000)return reply({error:'Save is too large'},413);
 let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid save'},400);}
 const st=body.state;if(!Number.isInteger(body.revision)||body.revision<0||!st||typeof st!=='object'||!st.xp||!st.bag||!Number.isFinite(st.x)||!Number.isFinite(st.y)||!Number.isFinite(st.hp)||!Number.isFinite(st.gold))return reply({error:'Invalid character data'},400);
 const stamp=new Date().toISOString(),data=JSON.stringify(st);
 const result=body.revision===0?await env.DB.prepare('INSERT INTO character_saves (user_id,state,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id) DO NOTHING').bind(user,data,stamp).run():await env.DB.prepare('UPDATE character_saves SET state = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(data,stamp,user,body.revision).run();
 if(!result.meta.changes)return reply({error:'Your character was saved in another tab or device. Reload to continue with that save.'},409);
 return reply({revision:body.revision+1,updatedAt:stamp});
 }catch(error){console.error('character_save_failed',error.message);return reply({error:'Could not reach character storage. Your local backup is safe.'},503);}
}
