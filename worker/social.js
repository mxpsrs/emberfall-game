import {authenticatedPlayer} from './auth.js';
import ITEMS from './trade-items.json' with {type:'json'};
import {MAINTENANCE_OPEN_SQL} from './maintenance.js';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const pair=(a,b)=>[a,b].sort().join(':');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
async function presence(env,id){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('public-player:account:'+id)),key=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');const row=await env.DB.prepare('SELECT scene,payload FROM player_presence WHERE player_id=? AND seen_at>?').bind(key,Date.now()-12000).first();return row?{...JSON.parse(row.payload),scene:row.scene}:null;}
async function nearby(env,a,b){const p=await presence(env,a),q=await presence(env,b);return p&&q&&p.scene===q.scene&&Math.hypot(p.x-q.x,p.y-q.y)<=8;}
async function findAccount(env,name){if(typeof name!=='string'||!/^[a-zA-Z0-9_]{3,20}$/.test(name))fail('Enter an account username.');const p=await env.DB.prepare('SELECT id,username FROM game_accounts WHERE normalized_username=?').bind(name.toLowerCase()).first();if(!p)fail('That account was not found.',404);return p;}
async function rateLimit(env,id){const result=await env.DB.prepare('INSERT INTO auth_limits (key,window,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END,window=excluded.window RETURNING attempts').bind('social:'+id,Math.floor(Date.now()/10000)).first();if(result.attempts>12)fail('Please wait a moment before sending more requests.',429);}
async function saved(env,id){const row=await env.DB.prepare('SELECT state,revision FROM character_saves WHERE user_id=?').bind('account:'+id).first();if(!row)fail('Both players need a character.');return {...row,state:JSON.parse(row.state)};}
function count(state,id){const item=ITEMS[id];return item?.slot?Math.max(0,(state.gear?.[id]||0)-(state.equipment?.[item.slot]===id?1:0)):state.bag?.[id]||0;}
function offer(raw,state){if(!raw||typeof raw!=='object'||!integer(raw.gold)||raw.gold>state.gold||!Array.isArray(raw.items)||raw.items.length>25)fail('Invalid trade offer.');const seen=new Set();for(const entry of raw.items){if(!entry||!Object.hasOwn(ITEMS,entry.id)||seen.has(entry.id)||!integer(entry.count)||!entry.count||count(state,entry.id)<entry.count)fail('Only items currently in your bag can be offered.');seen.add(entry.id);}return {gold:raw.gold,items:raw.items.map(e=>({id:e.id,count:e.count}))};}
function exchange(state,give,take){state=structuredClone(state);state.bag||={};state.gear||={};state.gold=state.gold-give.gold+take.gold;if(!integer(state.gold))fail('That coin amount is too large.');for(const [items,sign]of [[give.items,-1],[take.items,1]])for(const e of items){const bag=ITEMS[e.id].slot?state.gear:state.bag;bag[e.id]=(bag[e.id]||0)+sign*e.count;if(!integer(bag[e.id]))fail('That item stack is too large.');}let slots=0;for(const [id,item]of Object.entries(ITEMS)){const n=count(state,id);if(n>0)slots+=item.stackable?1:n;}if(slots>25)fail('Both players need enough bag space for this trade.');return state;}
async function tradeView(env,row,id){if(!row)return null;const other=await env.DB.prepare('SELECT username FROM game_accounts WHERE id=?').bind(row.a===id?row.b:row.a).first();const data=JSON.parse(row.payload),side=row.a===id?'a':'b',peer=side==='a'?'b':'a';return {id:row.id,status:row.status,revision:row.revision,expiresAt:row.expires_at,username:other.username,incoming:side==='b',mine:data[side],theirs:data[peer],confirmed:!!data[side+'Confirm'],peerConfirmed:!!data[peer+'Confirm']};}
async function expire(env){await env.DB.prepare("UPDATE player_trades SET status='cancelled',revision=revision+1 WHERE status IN ('pending','active') AND expires_at<=?").bind(Date.now()).run();}
export async function handleSocial(request,env){
 try{
 const me=await authenticatedPlayer(request,env);if(!me)return reply({error:'Please reconnect.'},401);
 await expire(env);
 const url=new URL(request.url);
 if(request.method==='GET'){
  const here=await presence(env,me.id),after=Math.max(0,Number(url.searchParams.get('after'))||0);
  const rows=await env.DB.prepare(`SELECT m.id,m.body,m.created_at,a.username AS author,b.username AS recipient FROM social_messages m JOIN game_accounts a ON a.id=m.author LEFT JOIN game_accounts b ON b.id=m.recipient WHERE m.id>? AND m.created_at>? AND ((m.recipient IS NOT NULL AND (m.recipient=? OR m.author=?)) OR (m.recipient IS NULL AND m.scene=? AND (m.x-?)*(m.x-?)+(m.y-?)*(m.y-?)<=144)) ORDER BY m.id DESC LIMIT 60`).bind(after,Date.now()-86400000,me.id,me.id,here?.scene||'',here?.x||0,here?.x||0,here?.y||0,here?.y||0).all();
  const friends=await env.DB.prepare('SELECT f.status,f.requester,a.id,a.username FROM friendships f JOIN game_accounts a ON a.id=CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE f.a=? OR f.b=? ORDER BY a.username').bind(me.id,me.id,me.id).all();
  const list=await Promise.all(friends.results.map(async f=>({username:f.username,status:f.status,incoming:f.requester!==me.id,online:!!await presence(env,f.id)})));
  const tradeId=url.searchParams.get('trade');const row=tradeId?await env.DB.prepare('SELECT * FROM player_trades WHERE id=? AND (a=? OR b=?)').bind(tradeId,me.id,me.id).first():await env.DB.prepare("SELECT * FROM player_trades WHERE (a=? OR b=?) AND status IN ('pending','active') ORDER BY expires_at DESC LIMIT 1").bind(me.id,me.id).first();
  return reply({messages:rows.results.reverse(),friends:list,trade:await tradeView(env,row,me.id)});
 }
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==url.origin)return reply({error:'Invalid origin'},403);
 const raw=await request.text();if(raw.length>8192)return reply({error:'Request too large'},413);const body=JSON.parse(raw);await rateLimit(env,me.id);
 if(body.action==='message'){
  if(typeof body.text!=='string'||!body.text.trim()||body.text.length>250||/[\x00-\x08\x0b-\x1f\x7f]/.test(body.text))fail('Messages must contain 1–250 characters.');
  const here=await presence(env,me.id);if(!here)fail('Enter the world before chatting.');let recipient=null;
  if(body.username){const target=await findAccount(env,body.username);const friendship=await env.DB.prepare("SELECT pair FROM friendships WHERE pair=? AND status='accepted'").bind(pair(me.id,target.id)).first();if(!friendship)fail('Add each other as friends to send private messages.');recipient=target.id;}
  await env.DB.prepare('INSERT INTO social_messages (author,recipient,scene,x,y,body,created_at) VALUES (?,?,?,?,?,?,?)').bind(me.id,recipient,here.scene,here.x,here.y,body.text.trim(),Date.now()).run();
  await env.DB.prepare('DELETE FROM social_messages WHERE created_at<?').bind(Date.now()-86400000).run();return reply({ok:true});
 }
 if(['friend','acceptFriend','removeFriend'].includes(body.action)){
  const other=await findAccount(env,body.username);if(other.id===me.id)fail('Choose another player.');const key=pair(me.id,other.id);
  if(body.action==='friend'){const [a,b]=[me.id,other.id].sort();await env.DB.prepare("INSERT INTO friendships (pair,a,b,requester,status) VALUES (?,?,?,?,'pending') ON CONFLICT(pair) DO NOTHING").bind(key,a,b,me.id).run();}
  if(body.action==='acceptFriend')await env.DB.prepare("UPDATE friendships SET status='accepted' WHERE pair=? AND requester<>?").bind(key,me.id).run();
  if(body.action==='removeFriend')await env.DB.prepare('DELETE FROM friendships WHERE pair=?').bind(key).run();return reply({ok:true});
 }
 if(body.action==='requestTrade'){
  const other=await findAccount(env,body.username);if(other.id===me.id||!await nearby(env,me.id,other.id))fail('Stand within 8 tiles of the other player to trade.');await saved(env,me.id);await saved(env,other.id);
  const id=crypto.randomUUID(),empty={gold:0,items:[]},payload=JSON.stringify({a:empty,b:empty});
  const insert=await env.DB.prepare("INSERT INTO player_trades (id,a,b,status,revision,payload,expires_at) SELECT ?,?,?,'pending',1,?,? WHERE NOT EXISTS (SELECT 1 FROM player_trades WHERE status IN ('pending','active') AND (a IN (?,?) OR b IN (?,?)))").bind(id,me.id,other.id,payload,Date.now()+180000,me.id,other.id,me.id,other.id).run();if(!insert.meta.changes)fail('One of you is already trading.',409);
  return reply({trade:await tradeView(env,await env.DB.prepare('SELECT * FROM player_trades WHERE id=?').bind(id).first(),me.id)});
 }
 const row=await env.DB.prepare('SELECT * FROM player_trades WHERE id=? AND (a=? OR b=?)').bind(String(body.id||''),me.id,me.id).first();if(!row)fail('Trade not found.',404);
 if(['complete','cancelled'].includes(row.status))return reply({trade:await tradeView(env,row,me.id)});
 const side=row.a===me.id?'a':'b',data=JSON.parse(row.payload);let status=row.status;
 if(body.revision!==row.revision)fail('The offer changed. Review it again.',409);
 if(body.action==='cancelTrade')status='cancelled';
 else{
  if(!await nearby(env,row.a,row.b))fail('The other player is no longer nearby. Cancel this trade.');
  if(body.action==='acceptTrade'){if(side!=='b'||row.status!=='pending')fail('Trade cannot be accepted.');status='active';}
  else if(row.status!=='active')fail('Wait for the other player to accept.');
  else if(body.action==='offer'){data[side]=offer(body.offer,(await saved(env,me.id)).state);delete data.aConfirm;delete data.bConfirm;}
  else if(body.action==='confirmTrade'){
   const a=await saved(env,row.a),b=await saved(env,row.b);offer(data.a,a.state);offer(data.b,b.state);data[side+'Confirm']={revision:side==='a'?a.revision:b.revision};
   if(data.aConfirm&&data.bConfirm){
    if(data.aConfirm.revision!==a.revision||data.bConfirm.revision!==b.revision)fail('An inventory changed. Update the offer and confirm again.',409);
    const nextA=exchange(a.state,data.a,data.b),nextB=exchange(b.state,data.b,data.a),stamp=new Date().toISOString();
    const guard="EXISTS (SELECT 1 FROM player_trades WHERE id=? AND status='committing')";
    const results=await env.DB.batch([
     env.DB.prepare(`UPDATE player_trades SET status='committing',payload=? WHERE id=? AND revision=? AND status='active' AND expires_at>? AND (SELECT revision FROM character_saves WHERE user_id=?)=? AND (SELECT revision FROM character_saves WHERE user_id=?)=? AND ${MAINTENANCE_OPEN_SQL}`).bind(JSON.stringify(data),row.id,row.revision,Date.now(),'account:'+row.a,a.revision,'account:'+row.b,b.revision),
     env.DB.prepare('UPDATE character_saves SET state=?,revision=revision+1,updated_at=? WHERE user_id=? AND '+guard).bind(JSON.stringify(nextA),stamp,'account:'+row.a,row.id),
     env.DB.prepare('UPDATE character_saves SET state=?,revision=revision+1,updated_at=? WHERE user_id=? AND '+guard).bind(JSON.stringify(nextB),stamp,'account:'+row.b,row.id),
     env.DB.prepare("UPDATE player_trades SET status='complete',revision=revision+1 WHERE id=? AND status='committing'").bind(row.id)
    ]);if(!results[0].meta.changes)fail('The trade changed. Review the latest offers.',409);
    return reply({trade:await tradeView(env,await env.DB.prepare('SELECT * FROM player_trades WHERE id=?').bind(row.id).first(),me.id)});
   }
  }else fail('Unknown social action.');
 }
 const changed=await env.DB.prepare("UPDATE player_trades SET status=?,revision=revision+1,payload=?,expires_at=? WHERE id=? AND revision=? AND status IN ('pending','active')").bind(status,JSON.stringify(data),Date.now()+180000,row.id,row.revision).run();if(!changed.meta.changes)fail('The offer changed. Review it again.',409);
 return reply({trade:await tradeView(env,await env.DB.prepare('SELECT * FROM player_trades WHERE id=?').bind(row.id).first(),me.id)});
 }catch(error){return reply({error:error.status?error.message:'Social service is temporarily unavailable.'},error.status||503);}
}
