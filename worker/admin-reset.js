async function validResetToken(request,env){
  const expected=env.ACCOUNT_RESET_TOKEN;
  if(typeof expected!=='string'||expected.length<32)return false;
  const supplied=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if(!supplied||supplied.length>256)return false;
  const digest=value=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  const [a,b]=await Promise.all([digest(expected),digest(supplied)]);
  const left=new Uint8Array(a),right=new Uint8Array(b);let difference=0;
  for(let i=0;i<left.length;i++)difference|=left[i]^right[i];
  return difference===0;
}

export async function handleGlobalReset(request,env){
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  if(!await validResetToken(request,env))return reply({error:'Administrator authorization required.'},401);
  if(!env.DB)return reply({error:'Character storage is unavailable.'},503);
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Invalid origin.'},403);
  try{
    if(request.method==='GET'){
      const id=new URL(request.url).searchParams.get('requestId');
      const row=id?await env.DB.prepare('SELECT * FROM global_resets WHERE id=? AND completed=1').bind(id).first():await env.DB.prepare('SELECT * FROM global_resets WHERE completed=1 ORDER BY rowid DESC LIMIT 1').bind().first();
      const counts=await env.DB.prepare('SELECT (SELECT count(*) FROM game_accounts) AS accounts,(SELECT count(*) FROM character_saves) AS characters,(SELECT count(*) FROM game_sessions) AS sessions,(SELECT count(*) FROM archived_characters) AS archives').first();
      return reply({reset:row||null,counts});
    }
    if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
    const raw=await request.text();if(raw.length>2048)return reply({error:'Request too large.'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
    const {requestId,reason,mode,restoreFrom}=body;
    if(!['archive','restore','purge'].includes(mode))return reply({error:'Select archive, restore or purge.'},400);
    if(mode==='purge'&&body.confirmation!=='DELETE ALL ACCOUNTS')return reply({error:'Complete account removal requires DELETE ALL ACCOUNTS confirmation.'},400);
    if(typeof requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)||typeof reason!=='string'||!reason.trim()||reason.length>200||/[\x00-\x1f\x7f]/.test(reason))return reply({error:'Supply a request ID and a one-line reason of 1–200 characters.'},400);
    const id=requestId.toLowerCase();
    const existing=await env.DB.prepare('SELECT * FROM global_resets WHERE id=? AND completed=1').bind(id).first();
    if(existing)return reply({reset:existing,replayed:true});
    if(mode==='restore'&&(!restoreFrom||!await env.DB.prepare('SELECT id FROM beta_checkpoints WHERE id=?').bind(restoreFrom).first()))return reply({error:'Choose an existing archived checkpoint.'},400);
    // A database guard is repeated in the transaction to reject races with reopening.
    const locked="EXISTS (SELECT 1 FROM game_maintenance WHERE id=1 AND status='locked')";
    if(!await env.DB.prepare('SELECT 1 AS ready WHERE '+locked).first())return reply({error:'Maintenance must be locked before a beta reset or restoration.'},409);
    const pending='EXISTS (SELECT 1 FROM global_resets WHERE id=? AND completed=0)';
    if(mode==='purge'){
      const counts=await env.DB.prepare('SELECT (SELECT count(*) FROM game_accounts) AS accounts,(SELECT count(*) FROM character_saves) AS characters,(SELECT count(*) FROM archived_characters) AS archives').first();
      // Child rows precede accounts. One atomic batch deletes both active data
      // and archived copies; its non-personal receipt makes retries safe.
      const tables=['game_sessions','player_presence','character_saves','archived_characters','beta_checkpoints','player_trades','friendships','social_messages','ignored_players','social_settings','auth_limits','shared_events','shared_objects','shared_entities','shared_clocks','game_accounts'];
      const result=await env.DB.batch([
        env.DB.prepare("INSERT INTO global_resets (id,reason,character_count,session_count,presence_count,reset_at,completed) SELECT ?,?,(SELECT count(*) FROM character_saves),(SELECT count(*) FROM game_sessions),(SELECT count(*) FROM player_presence),strftime('%Y-%m-%dT%H:%M:%fZ','now'),0 WHERE "+locked+" ON CONFLICT(id) DO NOTHING").bind(id,reason.trim()),
        ...tables.map(table=>env.DB.prepare('DELETE FROM '+table+' WHERE '+pending).bind(id)),
        env.DB.prepare('UPDATE global_resets SET completed=1 WHERE id=? AND completed=0').bind(id)
      ]);
      const reset=await env.DB.prepare('SELECT * FROM global_resets WHERE id=? AND completed=1').bind(id).first();
      if(!reset)return reply({error:'Maintenance changed; no accounts were deleted.'},409);
      return reply({reset,deleted:counts,replayed:result[0].meta.changes===0});
    }
    // Archive every byte and revision before replacing the active saves. D1 batch
    // rolls the entire operation back if any snapshot or restoration write fails.
    const result=await env.DB.batch([
      env.DB.prepare("INSERT INTO global_resets (id,reason,character_count,session_count,presence_count,reset_at,completed) SELECT ?,?,(SELECT count(*) FROM character_saves),(SELECT count(*) FROM game_sessions),(SELECT count(*) FROM player_presence),strftime('%Y-%m-%dT%H:%M:%fZ','now'),0 WHERE "+locked+" ON CONFLICT(id) DO NOTHING").bind(id,reason.trim()),
      env.DB.prepare('INSERT INTO beta_checkpoints (id,restore_from) SELECT ?,? WHERE '+pending+' ON CONFLICT(id) DO NOTHING').bind(id,mode==='restore'?restoreFrom:null,id),
      env.DB.prepare('INSERT INTO archived_characters (checkpoint_id,user_id,state,revision,updated_at) SELECT ?,user_id,state,revision,updated_at FROM character_saves WHERE '+pending).bind(id,id),
      env.DB.prepare("UPDATE player_trades SET status='cancelled',revision=revision+1 WHERE status IN ('pending','active') AND "+pending).bind(id),
      env.DB.prepare('DELETE FROM character_saves WHERE '+pending).bind(id),
      ...(mode==='restore'?[env.DB.prepare('INSERT INTO character_saves (user_id,state,revision,updated_at) SELECT user_id,state,revision,updated_at FROM archived_characters WHERE checkpoint_id=? AND '+pending).bind(restoreFrom,id)]:[]),
      env.DB.prepare('DELETE FROM game_sessions WHERE '+pending).bind(id),
      env.DB.prepare('DELETE FROM player_presence WHERE '+pending).bind(id),
      env.DB.prepare('UPDATE global_resets SET completed=1 WHERE id=? AND completed=0').bind(id)
    ]);
    const reset=await env.DB.prepare('SELECT * FROM global_resets WHERE id=? AND completed=1').bind(id).first();
    if(!reset)return reply({error:'Maintenance changed; no reset was performed.'},409);
    return reply({reset,checkpointId:id,restoredFrom:mode==='restore'?restoreFrom:null,replayed:result[0].meta.changes===0});
  }catch{console.error('global_reset_failed');return reply({error:'Reset could not be confirmed. Retry the same request ID.'},503);}
}
