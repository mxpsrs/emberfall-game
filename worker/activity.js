import {authenticatedPlayer} from './auth.js';
import {currentResetVersion} from './reset-policy.js';
import {publicAction,readSharedEffects} from './shared-world.js';

// A small, independent notification path. World transactions remain authoritative.
// Four reads/second preserves the urgent channel without ten DB polls/second.
// Streams are renewed after 32 reads, bounding connection lifetime and DB work.
export async function handleActivity(request,env){
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 try{
  const account=await authenticatedPlayer(request,env);if(!account)return reply({error:'Reconnect to the game.'},401);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('public-player:account:'+account.id));
  const actor=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const row=await env.DB.prepare('SELECT scene,payload FROM player_presence WHERE player_id=? AND seen_at>?').bind(actor,Date.now()-12000).first();
  if(!row)return reply({error:'Join the world first.'},409);
  const position=JSON.parse(row.payload),scope=String(await currentResetVersion(env)),scene=row.scene;
  if(request.method==='POST'){
   const raw=await request.text();if(raw.length>2048)return reply({error:'Request too large'},413);
   const input=JSON.parse(raw),now=Date.now();
   if(input.scene!==scene||!Number.isFinite(input.x)||!Number.isFinite(input.y)||Math.hypot(input.x-position.x,input.y-position.y)>12)return reply({error:'Invalid activity position'},400);
   const action=publicAction(input,now);if(!action)return reply({error:'Invalid activity'},400);
   // Exact start timestamps deduplicate the urgent write and ordinary snapshots.
   await env.DB.prepare("INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,'activity',?,?,1) ON CONFLICT DO NOTHING").bind(actor+':activity:'+action.kind+':'+action.started,scope,scene,actor,JSON.stringify({...action,x:input.x,y:input.y}),now).run();
   return reply({ok:true,serverTime:Date.now()});
  }
  const saved=await env.DB.prepare('SELECT state FROM character_saves WHERE user_id=?').bind('account:'+account.id).first();
  const questState=saved?JSON.parse(saved.state):null;
  const url=new URL(request.url);if(url.searchParams.get('scene')!==scene)return reply({error:'Scene changed'},409);
  let since=Date.now()-1000,cancelled=false,reads=0;const seen=new Set(),encoder=new TextEncoder();
  request.signal.addEventListener('abort',()=>{cancelled=true;},{once:true});
  const stream=new ReadableStream({
   async pull(controller){
    if(cancelled)return;
    try{
     const effects=await readSharedEffects(env.DB,scope,scene,actor,position,since,questState);
     const fresh=effects.filter(e=>!seen.has(e.id));for(const e of fresh){seen.add(e.id);since=Math.max(since,e.at-1000);}
     if(cancelled)return;
     controller.enqueue(encoder.encode('data: '+JSON.stringify({scene,serverTime:Date.now(),effects:fresh})+'\n\n'));
     if(++reads>=32){controller.close();return;}
     await new Promise(resolve=>setTimeout(resolve,250));
    }catch{if(!cancelled)controller.close();}
   },cancel(){cancelled=true;}
  });
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'}});
 }catch{return reply({error:'Activity connection unavailable'},503);}
}
