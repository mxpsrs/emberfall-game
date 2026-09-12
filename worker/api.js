// Identity comes only from Sites' authenticated request headers, never the save body.
export const SAVE_RESET_VERSION='2026-09-12-all-accounts-1';
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
async function resolvePlayer(request,env,headers){
 let keys=await accountKeys(request);
 if(!keys.length){let token=request.headers.get('cookie')?.match(/(?:^|;\s*)ember_guest=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!token){if(request.method!=='GET')return null;token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');headers['Set-Cookie']='ember_guest='+token+'; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax';}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));keys=['guest:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')];}
 let user=keys[0],row=null;for(const key of keys){const found=await env.DB.prepare('SELECT state, revision, updated_at FROM character_saves WHERE user_id = ?').bind(key).first();if(found){user=key;row=found;break;}}return {user,row};
}
export async function handleSave(request,env){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(body,status=200)=>new Response(JSON.stringify({...body,resetVersion:SAVE_RESET_VERSION}),{status,headers});
 if(!env.DB)return reply({error:'Character storage is unavailable.'},503);
 try{
 const player=await resolvePlayer(request,env,headers);if(!player)return reply({error:'Open the game to reconnect your character.'},401);
 const {user,row}=player;
 if(request.method==='GET'){return reply(row?{account:user,state:JSON.parse(row.state),revision:row.revision,updatedAt:row.updated_at}:{account:user,state:null,revision:0});}
 if(request.method!=='PUT')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 const raw=await request.text();if(raw.length>500000)return reply({error:'Save is too large'},413);
 let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid save'},400);}
 if(body.resetVersion!==SAVE_RESET_VERSION)return reply({code:'ACCOUNTS_RESET',error:'All characters have been reset. Reload Emberfall to create your new character.'},409);
 const st=body.state;if(!Number.isInteger(body.revision)||body.revision<0||!st||typeof st!=='object'||!st.xp||!st.bag||!Number.isFinite(st.x)||!Number.isFinite(st.y)||!Number.isFinite(st.hp)||!Number.isFinite(st.gold))return reply({error:'Invalid character data'},400);
 const stamp=new Date().toISOString(),data=JSON.stringify(st);
 const result=body.revision===0?await env.DB.prepare('INSERT INTO character_saves (user_id,state,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id) DO NOTHING').bind(user,data,stamp).run():await env.DB.prepare('UPDATE character_saves SET state = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(data,stamp,user,body.revision).run();
 if(!result.meta.changes)return reply({error:'Your character was saved in another tab or device. Reload to continue with that save.'},409);
 return reply({revision:body.revision+1,updatedAt:stamp});
 }catch(error){console.error('character_save_failed',error.message);return reply({error:'Could not reach character storage. Your local backup is safe.'},503);}
}

export async function handlePlayers(request,env){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'},reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 try{const raw=await request.text();if(raw.length>2048)return reply({error:'Request too large'},413);const input=JSON.parse(raw);
 const player=await resolvePlayer(request,env,headers);if(!player?.row)return reply({error:'Create your character first.'},401);
 const sizes={overworld:[1152,768],inn:[14,12],shop:[14,12],forge:[14,12],stoneInn:[14,12],stoneShop:[14,12],willowInn:[14,12],willowShop:[14,12],mine:[26,22],dungeon:[28,25]};const realmCounts={crownreach:26,greyhaven:25,briarhaven:5,willowcross:5,stoneford:5,ironhollow:26,deepforge:25,copperdelve:5,stonehearth:5,aelindor:26,moonwillow:25,fernwatch:5,silverbrook:5},match=String(input.scene).match(/^realm_([a-z]+)_(\d+)$/);const realm=match&&Object.hasOwn(realmCounts,match[1])&&Number(match[2])<realmCounts[match[1]],index=match?Number(match[2]):-1;const size=(Object.hasOwn(sizes,input.scene)?sizes[input.scene]:null)||(realm?(index===25?[24,22]:index===5&&["ironhollow","deepforge"].includes(match[1])?[26,22]:[16,14]):null);
 if(!size||!Number.isFinite(input.x)||!Number.isFinite(input.y)||input.x<0||input.y<0||input.x>=size[0]||input.y>=size[1])return reply({error:'Invalid position'},400);
 const state=JSON.parse(player.row.state);if(!state.character)return reply({error:'Create your character first.'},400);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('public-player:'+player.user));const id=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const allowed={weapon:['bronzeSword','ironSword','shortbow','oakStaff','oakShortbow','willowShortbow','mapleShortbow','yewShortbow','magicShortbow'],head:['ironHelm'],body:['leatherArmor','mageRobe','wizardRobe','adeptRobe','mysticRobe','studdedBody','greenHideBody','blueHideBody','redHideBody','blackHideBody'],feet:['leatherBoots'],shield:['ironShield'],shoulders:[],hands:[],legs:[],neck:['copperNecklace'],crest:[1,2,3,4,5].map(i=>'helmet_crest_'+i)},equipment={};for(const set of ['bronze','iron','steel','black','gold','mithril','adamant','rune','dragonslayer'])for(const slot of ['head','body','feet','shield','shoulders','hands','legs','weapon'])allowed[slot].push(set+'_'+slot);allowed.weapon.push(...['bronze','iron','steel','mithril','adamant','rune'].map(t=>t+'_dagger'));for(const [slot,ids]of Object.entries(allowed))equipment[slot]=ids.includes(state.equipment?.[slot])?state.equipment[slot]:null;const now=Date.now(),payload={id,name:String(state.character.name||'Adventurer').slice(0,18),look:Number.isInteger(state.character.look)&&state.character.look>=0&&state.character.look<=3?state.character.look:0,race:'human',frame:state.character.frame==='female'?'female':'male',hair:[0,1,2].includes(state.character.hair)?state.character.hair:0,equipment,x:input.x,y:input.y,heading:Number.isFinite(input.heading)?input.heading:0,emote:['Hello!','Follow me!','Nice gear!'].includes(input.emote)?input.emote:null};
 await env.DB.prepare('INSERT INTO player_presence (player_id,scene,payload,seen_at) VALUES (?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET scene=excluded.scene,payload=excluded.payload,seen_at=excluded.seen_at').bind(id,input.scene,JSON.stringify(payload),now).run();
 const result=await env.DB.prepare('SELECT payload FROM player_presence WHERE scene = ? AND seen_at > ? AND player_id <> ? ORDER BY seen_at DESC LIMIT 60').bind(input.scene,now-12000,id).all();
 return reply({players:result.results.map(row=>JSON.parse(row.payload))});
 }catch(error){console.error('player_presence_failed',error.message);return reply({error:'Online world temporarily unavailable'},503);}
}
