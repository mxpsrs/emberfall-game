import {MAINTENANCE_OPEN_SQL} from './maintenance.js';
import bcrypt from 'bcryptjs';
const SESSION_AGE=30*24*60*60;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function tokenDigest(token){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))));}
function sessionToken(request){return request.headers.get('cookie')?.match(/(?:^|;\s*)ember_session=([a-f0-9]{64})(?:;|$)/)?.[1];}
export async function authenticatedPlayer(request,env){
 const token=sessionToken(request);if(!token)return null;
 return env.DB.prepare('SELECT a.id,a.username FROM game_sessions s JOIN game_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(await tokenDigest(token),Date.now()).first();
}
export async function handleAuth(request,env){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(!env.DB)return reply({error:'Account service is unavailable.'},503);
 const action=new URL(request.url).pathname.split('/').at(-1);
 try{
 if(action==='session'&&request.method==='GET'){const account=await authenticatedPlayer(request,env);return reply({account:account?{username:account.username}:null});}
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 if(action==='logout'){const token=sessionToken(request);if(token)await env.DB.prepare('DELETE FROM game_sessions WHERE token_hash=?').bind(await tokenDigest(token)).run();headers['Set-Cookie']='ember_session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax';return reply({ok:true});}
 if(!['register','login'].includes(action))return reply({error:'Not found'},404);
 const raw=await request.text();if(raw.length>2048)return reply({error:'Request too large'},413);
 let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request'},400);}
 const username=typeof body.username==='string'?body.username.trim():'',password=body.password;
 if(!/^[a-zA-Z0-9_]{3,20}$/.test(username))return reply({error:'Use a username of 3–20 letters, numbers, or underscores.'},400);
 if(typeof password!=='string'||password.length<5)return reply({error:'Your password must be at least 5 characters.'},400);
 if(new TextEncoder().encode(password).length>72)return reply({error:'That password is too long. Use 72 bytes or fewer.'},400);
 const normalized=username.toLowerCase(),now=Date.now(),window=Math.floor(now/900000),ip=request.headers.get('cf-connecting-ip')||'unknown';
 for(const [key,limit]of [[await tokenDigest('ip:'+ip),40],[await tokenDigest('user:'+normalized),12]]){
  const result=await env.DB.prepare('INSERT INTO auth_limits (key,window,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END,window=excluded.window RETURNING attempts').bind(key,window).first();
  if(result.attempts>limit){headers['Retry-After']='900';return reply({error:'Too many attempts. Try again in 15 minutes.'},429);}
 }
 let account=await env.DB.prepare('SELECT id,username,password_hash FROM game_accounts WHERE normalized_username=?').bind(normalized).first();
 if(action==='register'){
  if(account)return reply({error:'That username is already taken.'},409);
  const id=crypto.randomUUID(),hash=await bcrypt.hash(password,12);
  const inserted=await env.DB.prepare('INSERT INTO game_accounts (id,username,normalized_username,password_hash,created_at) VALUES (?,?,?,?,?) ON CONFLICT(normalized_username) DO NOTHING').bind(id,username,normalized,hash,now).run();
  if(!inserted.meta.changes)return reply({error:'That username is already taken.'},409);
  account={id,username};
 }else{
  const hash=account?.password_hash||'$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
  const matches=await bcrypt.compare(password,hash);if(!account||!matches)return reply({error:'Incorrect username or password.'},401);
 }
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 const session=await env.DB.prepare(`INSERT INTO game_sessions (token_hash,account_id,expires_at) SELECT ?,?,? WHERE ${MAINTENANCE_OPEN_SQL}`).bind(await tokenDigest(token),account.id,now+SESSION_AGE*1000).run();
 if(!session.meta.changes)return reply({error:'System maintenance. Please reconnect after the update.'},503);
 headers['Set-Cookie']='ember_session='+token+'; Path=/; Max-Age='+SESSION_AGE+'; Secure; HttpOnly; SameSite=Lax';
 return reply({account:{username:account.username}});
 }catch(error){console.error('account_service_failed');return reply({error:'Account service is temporarily unavailable. Please retry.'},503);}
}
