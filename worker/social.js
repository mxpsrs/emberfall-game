import {authenticatedPlayer} from './auth.js';
import ITEMS from './trade-items.json' with {type:'json'};
import {MAINTENANCE_OPEN_SQL} from './maintenance.js';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const pair=(a,b)=>[a,b].sort().join(':');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
const LOCAL_CHAT_RADIUS=25,LOCAL_CHAT_LIFETIME=12000;
async function publicPlayerKey(id){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('public-player:account:'+id));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
async function presence(env,id){const key=await publicPlayerKey(id);const row=await env.DB.prepare('SELECT scene,payload FROM player_presence WHERE player_id=? AND seen_at>?').bind(key,Date.now()-12000).first();return row?{...JSON.parse(row.payload),scene:row.scene}:null;}
async function nearby(env,a,b){const p=await presence(env,a),q=await presence(env,b);return p&&q&&p.scene===q.scene&&Math.hypot(p.x-q.x,p.y-q.y)<=8;}
async function findAccount(env,name){if(typeof name!=='string'||!/^[a-zA-Z0-9_]{3,20}$/.test(name))fail('Enter an account username.');const p=await env.DB.prepare('SELECT id,username FROM game_accounts WHERE normalized_username=?').bind(name.toLowerCase()).first();if(!p)fail('That account was not found.',404);return p;}
const defaultSettings={public_mode:'on',private_mode:'on',trade_mode:'on'};
async function settings(env,id){return await env.DB.prepare('SELECT * FROM social_settings WHERE account_id=?').bind(id).first()||defaultSettings;}
async function isFriend(env,owner,target){return !!await env.DB.prepare("SELECT pair FROM friendships WHERE ((a=? AND b=?) OR (a=? AND b=?)) AND (status='accepted' OR (requester=? AND status='listed'))").bind(owner,target,target,owner,owner).first();}
async function isIgnored(env,owner,target){return !!await env.DB.prepare('SELECT owner FROM ignored_players WHERE owner=? AND target=?').bind(owner,target).first();}
async function permits(env,owner,sender,kind){if(await isIgnored(env,owner,sender))return false;const mode=(await settings(env,owner))[kind+'_mode'];return mode==='on'||mode==='friends'&&await isFriend(env,owner,sender);}
async function rateLimit(env,id,kind){const result=await env.DB.prepare('INSERT INTO auth_limits (key,window,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END,window=excluded.window RETURNING attempts').bind('social:'+kind+':'+id,Math.floor(Date.now()/10000)).first();if(result.attempts>(kind==='chat'?12:60))fail('Please wait a moment before sending more requests.',429);}
async function saved(env,id){const row=await env.DB.prepare('SELECT state,revision FROM character_saves WHERE user_id=?').bind('account:'+id).first();if(!row)fail('Both players need a character.');return {...row,state:JSON.parse(row.state)};}
function count(state,id){const item=ITEMS[id];return item?.slot?Math.max(0,(state.gear?.[id]||0)-(state.equipment?.[item.slot]===id?1:0)):state.bag?.[id]||0;}
function offer(raw,state){if(!raw||typeof raw!=='object'||!integer(raw.gold)||raw.gold>(state.bag?.coins||0)||!Array.isArray(raw.items)||raw.items.length>25)fail('Invalid trade offer.');const seen=new Set();for(const entry of raw.items){if(!entry||!Object.hasOwn(ITEMS,entry.id)||entry.id==='coins'||ITEMS[entry.id].tradeable===false||seen.has(entry.id)||!integer(entry.count)||!entry.count||count(state,entry.id)<entry.count)fail('Only items currently in your bag can be offered.');seen.add(entry.id);}return {gold:raw.gold,items:raw.items.map(e=>({id:e.id,count:e.count}))};}
function exchange(state,give,take){state=structuredClone(state);state.bag||={};state.gear||={};state.bag.coins=(state.bag.coins||0)-give.gold+take.gold;if(!integer(state.bag.coins))fail('That coin amount is too large.');for(const [items,sign]of [[give.items,-1],[take.items,1]])for(const e of items){const bag=ITEMS[e.id].slot?state.gear:state.bag;bag[e.id]=(bag[e.id]||0)+sign*e.count;if(!integer(bag[e.id]))fail('That item stack is too large.');}let slots=0;for(const [id,item]of Object.entries(ITEMS)){const n=count(state,id);if(n>0)slots+=item.stackable?1:n;}if(slots>25)fail('Both players need enough bag space for this trade.');return state;}
async function tradeView(env,row,id){if(!row)return null;const other=await env.DB.prepare('SELECT username FROM game_accounts WHERE id=?').bind(row.a===id?row.b:row.a).first();const data=JSON.parse(row.payload),side=row.a===id?'a':'b',peer=side==='a'?'b':'a';return {id:row.id,status:row.status,revision:row.revision,expiresAt:row.expires_at,username:other.username,incoming:side==='b',mine:data[side],theirs:data[peer],stage:data.stage||'offer',accepted:!!data[side+'Accept'],peerAccepted:!!data[peer+'Accept'],confirmed:!!data[side+'Confirm'],peerConfirmed:!!data[peer+'Confirm']};}
async function expire(env,id){await env.DB.prepare("UPDATE player_trades SET status='cancelled',revision=revision+1 WHERE (a=? OR b=?) AND status IN ('pending','active') AND expires_at<=?").bind(id,id,Date.now()).run();}
export async function handleSocial(request,env){
 try{
 const me=await authenticatedPlayer(request,env);if(!me)return reply({error:'Please reconnect.'},401);
 await expire(env,me.id);
 const url=new URL(request.url);
 if(request.method==='GET'){
  // A fresh client starts at the live head. Local listeners are recorded at
  // send time; walking into a place never retrieves its previous conversations.
  const head=(await env.DB.prepare("SELECT COALESCE((SELECT seq FROM sqlite_sequence WHERE name='social_messages'),0) AS id").first()).id;
  const rawAfter=url.searchParams.get('after'),after=rawAfter===null?head:Math.min(head,Math.max(0,Number(rawAfter)||0));
  const rows=await env.DB.prepare(`SELECT m.id,m.body,m.created_at,m.author AS authorId,a.username AS author,b.username AS recipient FROM social_messages m JOIN game_accounts a ON a.id=m.author LEFT JOIN game_accounts b ON b.id=m.recipient WHERE m.id>? AND m.id<=? AND ((m.recipient IS NOT NULL AND m.created_at>? AND (m.recipient=? OR m.author=?)) OR (m.recipient IS NULL AND m.created_at>? AND (m.author=? OR EXISTS (SELECT 1 FROM json_each(m.audience) listener WHERE listener.value=?)))) ORDER BY m.id ASC LIMIT 60`).bind(after,head,Date.now()-86400000,me.id,me.id,Date.now()-LOCAL_CHAT_LIFETIME,me.id,await publicPlayerKey(me.id)).all();
  const friends=await env.DB.prepare("SELECT DISTINCT a.id,a.username FROM friendships f JOIN game_accounts a ON a.id=CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE (f.a=? OR f.b=?) AND (f.status='accepted' OR (f.status='listed' AND f.requester=?)) ORDER BY a.username").bind(me.id,me.id,me.id,me.id).all();
  const list=await Promise.all(friends.results.map(async f=>({username:f.username,status:'accepted',online:!!await presence(env,f.id)&&await permits(env,f.id,me.id,'private')})));
  const tradeId=url.searchParams.get('trade');let row=tradeId?await env.DB.prepare('SELECT * FROM player_trades WHERE id=? AND (a=? OR b=?)').bind(tradeId,me.id,me.id).first():await env.DB.prepare("SELECT * FROM player_trades WHERE (a=? OR b=?) AND status IN ('pending','active') ORDER BY expires_at DESC LIMIT 1").bind(me.id,me.id).first();
  if(!row||['complete','cancelled'].includes(row.status)){const next=await env.DB.prepare("SELECT * FROM player_trades WHERE (a=? OR b=?) AND status IN ('pending','active') ORDER BY expires_at DESC LIMIT 1").bind(me.id,me.id).first();if(next&&!row)row=next;}
  const prefs=await settings(env,me.id),messages=[];for(const m of rows.results){if(m.authorId!==me.id&&(await isIgnored(env,me.id,m.authorId)||!m.recipient&&(prefs.public_mode==='off'||prefs.public_mode==='friends'&&!await isFriend(env,me.id,m.authorId))))continue;const {authorId,...message}=m;messages.push({...message,age:Math.max(0,Date.now()-m.created_at)});}
  const ignores=await env.DB.prepare('SELECT a.username FROM ignored_players i JOIN game_accounts a ON a.id=i.target WHERE i.owner=?').bind(me.id).all();
  return reply({messages,cursor:rows.results.length===60?rows.results.at(-1).id:head,settings:prefs,ignores:ignores.results.map(p=>p.username),friends:list,trade:await tradeView(env,row,me.id)});
 }
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==url.origin)return reply({error:'Invalid origin'},403);
 const raw=await request.text();if(raw.length>8192)return reply({error:'Request too large'},413);const body=JSON.parse(raw);await rateLimit(env,me.id,body.action==='message'?'chat':'action');
 if(body.action==='message'){
  if(typeof body.text!=='string'||!body.text.trim()||body.text.length>250||/[\x00-\x08\x0b-\x1f\x7f]/.test(body.text))fail('Messages must contain 1–250 characters.');
  const here=await presence(env,me.id);if(!here)fail('Enter the world before chatting.');let recipient=null,recipientName=null;
  if(body.username){const target=await findAccount(env,body.username);if(!await presence(env,target.id)||!await permits(env,target.id,me.id,'private'))fail('That player is offline or unavailable.');if(target.id===me.id)fail('Choose another player.');recipient=target.id;recipientName=target.username;}
  const now=Date.now();
  // Capture the audience atomically with the message, using authenticated
  // server presence, a circular 25-tile radius, and the same scene.
  const inserted=await env.DB.prepare(`INSERT INTO social_messages (author,recipient,scene,x,y,body,created_at,audience) VALUES (?,?,?,?,?,?,?,CASE WHEN ? IS NULL THEN (SELECT COALESCE(json_group_array(player_id),'[]') FROM player_presence WHERE scene=? AND seen_at>? AND (json_extract(payload,'$.x')-?)*(json_extract(payload,'$.x')-?)+(json_extract(payload,'$.y')-?)*(json_extract(payload,'$.y')-?)<=?) ELSE '[]' END) RETURNING id`).bind(me.id,recipient,here.scene,here.x,here.y,body.text.trim(),now,recipient,here.scene,now-12000,here.x,here.x,here.y,here.y,LOCAL_CHAT_RADIUS**2).first();
  await env.DB.prepare('DELETE FROM social_messages WHERE created_at<? OR (recipient IS NULL AND created_at<?)').bind(now-86400000,now-LOCAL_CHAT_LIFETIME).run();
  return reply({ok:true,message:{id:inserted.id,author:me.username,recipient:recipientName,body:body.text.trim(),created_at:now,age:0}});

 }
 if(body.action==='settings'){
  const values=['public','private','trade'].map(k=>body[k]);if(values.some(v=>!['on','friends','off'].includes(v)))fail('Invalid chat setting.');
  await env.DB.prepare('INSERT INTO social_settings (account_id,public_mode,private_mode,trade_mode) VALUES (?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET public_mode=excluded.public_mode,private_mode=excluded.private_mode,trade_mode=excluded.trade_mode').bind(me.id,...values).run();return reply({ok:true});
 }
 if(['friend','removeFriend','ignore','removeIgnore'].includes(body.action)){
  const other=await findAccount(env,body.username);if(other.id===me.id)fail('Choose another player.');
  if(body.action==='friend')await env.DB.prepare("INSERT INTO friendships (pair,a,b,requester,status) VALUES (?,?,?,?,'listed') ON CONFLICT(pair) DO NOTHING").bind('list:'+me.id+':'+other.id,me.id,other.id,me.id).run();
  if(body.action==='removeFriend'){
   // Preserve the other player's side of old mutual friendships.
   await env.DB.prepare("UPDATE friendships SET status='listed',requester=? WHERE pair=? AND status='accepted'").bind(other.id,pair(me.id,other.id)).run();
   await env.DB.prepare("DELETE FROM friendships WHERE requester=? AND status IN ('listed','pending') AND ((a=? AND b=?) OR (a=? AND b=?))").bind(me.id,me.id,other.id,other.id,me.id).run();
  }
  if(body.action==='ignore')await env.DB.prepare('INSERT INTO ignored_players (owner,target) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM ignored_players WHERE owner=? AND target=?)').bind(me.id,other.id,me.id,other.id).run();
  if(body.action==='removeIgnore')await env.DB.prepare('DELETE FROM ignored_players WHERE owner=? AND target=?').bind(me.id,other.id).run();
  return reply({ok:true});
 }
 if(body.action==='requestTrade'){
  const other=await findAccount(env,body.username);if(other.id===me.id||!await nearby(env,me.id,other.id))fail('Stand within 8 tiles of the other player to trade.');if(!await permits(env,other.id,me.id,'trade'))fail('That player is not accepting trade requests.');await saved(env,me.id);await saved(env,other.id);
  const existing=await env.DB.prepare("SELECT * FROM player_trades WHERE status='pending' AND ((a=? AND b=?) OR (a=? AND b=?))").bind(me.id,other.id,other.id,me.id).first();
  if(existing){if(existing.b===me.id){await env.DB.prepare("UPDATE player_trades SET status='active',revision=revision+1 WHERE id=? AND status='pending' AND revision=?").bind(existing.id,existing.revision).run();}return reply({trade:await tradeView(env,await env.DB.prepare('SELECT * FROM player_trades WHERE id=?').bind(existing.id).first(),me.id)});}
  const id=crypto.randomUUID(),empty={gold:0,items:[]},payload=JSON.stringify({a:empty,b:empty});
  const insert=await env.DB.prepare("INSERT INTO player_trades (id,a,b,status,revision,payload,expires_at) SELECT ?,?,?,'pending',1,?,? WHERE NOT EXISTS (SELECT 1 FROM player_trades WHERE status IN ('pending','active') AND (a IN (?,?) OR b IN (?,?)))").bind(id,me.id,other.id,payload,Date.now()+180000,me.id,other.id,me.id,other.id).run();if(!insert.meta.changes)fail('One of you is already trading.',409);
  return reply({trade:await tradeView(env,await env.DB.prepare('SELECT * FROM player_trades WHERE id=?').bind(id).first(),me.id)});
 }
 const row=await env.DB.prepare('SELECT * FROM player_trades WHERE id=? AND (a=? OR b=?)').bind(String(body.id||''),me.id,me.id).first();if(!row)fail('Trade not found.',404);
 if(['complete','cancelled'].includes(row.status))return reply({trade:await tradeView(env,row,me.id)});
 const side=row.a===me.id?'a':'b',data=JSON.parse(row.payload);let status=row.status;
 if(body.action!=='cancelTrade'&&body.revision!==row.revision)fail('The offer changed. Review it again.',409);
 if(body.action==='cancelTrade')status='cancelled';
 else{
  if(!await nearby(env,row.a,row.b))fail('The other player is no longer nearby. Cancel this trade.');
  if(body.action==='acceptTrade'){if(side!=='b'||row.status!=='pending')fail('Trade cannot be accepted.');status='active';}
  else if(row.status!=='active')fail('Wait for the other player to accept.');
  else if(body.action==='offer'){if(data.stage==='review')fail('Decline to change a trade after final review.');data[side]=offer(body.offer,(await saved(env,me.id)).state);delete data.aAccept;delete data.bAccept;delete data.aConfirm;delete data.bConfirm;}
  else if(body.action==='acceptOffer'){if(data.stage==='review')fail('The trade is already in final review.');const a=await saved(env,row.a),b=await saved(env,row.b);offer(data.a,a.state);offer(data.b,b.state);data[side+'Accept']=true;if(data.aAccept&&data.bAccept){data.stage='review';data.aRevision=a.revision;data.bRevision=b.revision;}}
  else if(body.action==='confirmTrade'){
   if(data.stage!=='review')fail('Both players must accept the offer before final confirmation.');
   const a=await saved(env,row.a),b=await saved(env,row.b);offer(data.a,a.state);offer(data.b,b.state);if(data.aRevision!==a.revision||data.bRevision!==b.revision)fail('An inventory changed. Decline and start a new trade.',409);data[side+'Confirm']={revision:side==='a'?a.revision:b.revision};
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
