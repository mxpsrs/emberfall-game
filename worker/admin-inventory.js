const CAPES={adventureCloakForest:'Adventure cloak (forest green)',redLeatherCape:'Red leather cape'};

async function authorized(request,env){
  const expected=env.MAINTENANCE_TOKEN||env.ACCOUNT_RESET_TOKEN;
  if(typeof expected!=='string'||expected.length<32)return false;
  const supplied=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if(!supplied||supplied.length>256)return false;
  const digest=value=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  const [a,b]=await Promise.all([digest(expected),digest(supplied)]);
  const left=new Uint8Array(a),right=new Uint8Array(b);let difference=0;
  for(let i=0;i<left.length;i++)difference|=left[i]^right[i];
  return difference===0;
}

export function ensureCapeInventory(state){
  if(!state||typeof state!=='object')throw new Error('Invalid character state.');
  state.gear=state.gear&&typeof state.gear==='object'?state.gear:{};
  const before=Object.fromEntries(Object.keys(CAPES).map(id=>[id,Number(state.gear[id])||0]));
  for(const id of Object.keys(CAPES))state.gear[id]=Math.max(1,before[id]);
  return {state,before,after:Object.fromEntries(Object.keys(CAPES).map(id=>[id,state.gear[id]]))};
}

export async function handleCapeGrant(request,env){
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  if(!await authorized(request,env))return reply({error:'Administrator authorization required.'},401);
  if(!env.DB)return reply({error:'Character storage is unavailable.'},503);
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Invalid origin.'},403);
  try{
    const raw=await request.text();if(raw.length>1024)return reply({error:'Request too large.'},413);
    const body=JSON.parse(raw),username=String(body.username||'').trim().toLowerCase();
    if(!/^[a-z0-9_-]{5,24}$/.test(username)||!/^[a-zA-Z0-9-]{16,64}$/.test(body.requestId||''))return reply({error:'A valid username and stable request ID are required.'},400);
    const locked="EXISTS (SELECT 1 FROM game_maintenance WHERE id=1 AND status='locked')";
    if(!await env.DB.prepare('SELECT 1 AS ready WHERE '+locked).first())return reply({error:'Maintenance must be locked before changing an inventory.'},409);
    const account=await env.DB.prepare('SELECT id,username FROM game_accounts WHERE normalized_username=?').bind(username).first();
    if(!account)return reply({error:'Account not found.'},404);
    const userId='account:'+account.id,row=await env.DB.prepare('SELECT state,revision FROM character_saves WHERE user_id=?').bind(userId).first();
    if(!row)return reply({error:'Character save not found.'},404);
    const grant=ensureCapeInventory(JSON.parse(row.state));
    const changed=Object.keys(CAPES).some(id=>grant.after[id]!==grant.before[id]);
    if(changed){
      const stamp=new Date().toISOString(),result=await env.DB.prepare("UPDATE character_saves SET state=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=? AND "+locked).bind(JSON.stringify(grant.state),stamp,userId,row.revision).run();
      if(!result.meta.changes)return reply({error:'The character changed before the grant completed. Retry the same request ID.'},409);
    }
    return reply({requestId:body.requestId,username:account.username,items:Object.entries(CAPES).map(([id,name])=>({id,name,count:grant.after[id]})),revision:row.revision+(changed?1:0),replayed:!changed});
  }catch(error){console.error('cape_inventory_grant_failed',String(error?.message||error).slice(0,200));return reply({error:'Cape grant could not be confirmed. Retry the same request ID.'},503);}
}
