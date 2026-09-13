const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export const MAINTENANCE_OPEN_SQL="NOT EXISTS (SELECT 1 FROM game_maintenance WHERE status='locked' OR (status='countdown' AND kick_at<=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))";
export async function maintenanceState(env){
 const now=Date.now();
 const existing=await env.DB.prepare('SELECT run_id,status,kick_at FROM game_maintenance WHERE id=1').first();
 if(!existing||existing.status!=='countdown'||existing.kick_at>now)return {id:existing?.run_id||null,status:existing?.status||'open',kickAt:existing?.kick_at||0,serverTime:now,message:'System maintenance'};
 const due="EXISTS (SELECT 1 FROM game_maintenance WHERE status='countdown' AND kick_at<=?)";
 await env.DB.batch([
  env.DB.prepare('DELETE FROM game_sessions WHERE '+due).bind(now),
  env.DB.prepare('DELETE FROM player_presence WHERE '+due).bind(now),
  env.DB.prepare("UPDATE game_maintenance SET status='locked' WHERE status='countdown' AND kick_at<=?").bind(now)
 ]);
 const row=await env.DB.prepare('SELECT run_id,status,kick_at FROM game_maintenance WHERE id=1').first();
 return {id:row?.run_id||null,status:row?.status||'open',kickAt:row?.kick_at||0,serverTime:now,message:'System maintenance'};
}
export async function maintenanceGate(request,env){
 try{const state=await maintenanceState(env);return state.status==='locked'?reply({error:'System maintenance. Please reconnect after the update.',maintenance:state},503):null;}
 catch{return reply({error:'Game service is temporarily unavailable.'},503);}
}
async function authorized(request,env){
 const expected=env.MAINTENANCE_TOKEN||env.ACCOUNT_RESET_TOKEN,supplied=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if(!expected||expected.length<32||!supplied||supplied.length>256)return false;
 const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const a=await digest(expected),b=await digest(supplied);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
export async function handleMaintenance(request,env){
 try{
 const admin=new URL(request.url).pathname.includes('/admin/');
 if(admin&&!await authorized(request,env))return reply({error:'Administrator authorization required.'},401);
 if(!admin){if(request.method!=='GET')return reply({error:'Method not allowed'},405);return reply(await maintenanceState(env));}
 if(request.method==='GET')return reply(await maintenanceState(env));
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 const raw=await request.text();if(raw.length>1024)return reply({error:'Request too large'},413);const body=JSON.parse(raw);
 if(!/^[a-zA-Z0-9-]{16,64}$/.test(body.requestId))return reply({error:'A stable request ID is required.'},400);
 const current=await maintenanceState(env);
 if(body.action==='start'){
  if(current.status!=='open')return reply(current,current.id===body.requestId?200:409);
  const deadline=Date.now()+120000;
  await env.DB.prepare("INSERT INTO game_maintenance (id,run_id,status,kick_at) VALUES (1,?,'countdown',?) ON CONFLICT(id) DO UPDATE SET run_id=excluded.run_id,status=excluded.status,kick_at=excluded.kick_at WHERE game_maintenance.status='open' AND game_maintenance.run_id<>excluded.run_id").bind(body.requestId,deadline).run();
 }else if(body.action==='finish'){
  if(current.id!==body.requestId||current.status==='countdown')return reply({error:'Wait for the disconnect and finish the matching deployment first.'},409);
  await env.DB.prepare("UPDATE game_maintenance SET status='open' WHERE id=1 AND run_id=? AND status='locked'").bind(body.requestId).run();
 }else return reply({error:'Unknown maintenance action'},400);
 return reply(await maintenanceState(env));
 }catch{return reply({error:'Maintenance service unavailable'},503);}
}
