export {handleSocial} from './social.js';
export {handleStatus} from './status.js';
export {maintenanceGate,handleMaintenance} from './maintenance.js';
import {authenticatedPlayer,handleAuth} from './auth.js';
import {SAVE_RESET_VERSION,currentResetVersion,RESET_VERSION_SQL} from './reset-policy.js';
export {handleGlobalReset} from './admin-reset.js';
export {handleAuth};
export {SAVE_RESET_VERSION};
const completedApprenticeship=state=>state?.tutorialReward===true||(state?.tutorialVersion===4&&state?.tutorial>=36||state?.tutorialVersion===5&&state?.tutorial>=39);
async function resolvePlayer(request,env){const account=await authenticatedPlayer(request,env);if(!account)return null;const user='account:'+account.id;const row=await env.DB.prepare('SELECT state,revision,updated_at FROM character_saves WHERE user_id=?').bind(user).first();return {user,row,username:account.username};}
export async function handleSave(request,env){
 let resetVersion=SAVE_RESET_VERSION;
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(body,status=200)=>new Response(JSON.stringify({...body,resetVersion}),{status,headers});
 if(!env.DB)return reply({error:'Character storage is unavailable.'},503);
 try{
 resetVersion=await currentResetVersion(env);
 const player=await resolvePlayer(request,env,headers);if(!player)return reply({error:'Open the game to reconnect your character.'},401);
 const {user,row}=player;
 if(request.method==='GET'){return reply(row?{account:user,username:player.username,state:JSON.parse(row.state),revision:row.revision,updatedAt:row.updated_at}:{account:user,username:player.username,state:null,revision:0});}
 if(request.method!=='PUT')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 const raw=await request.text();if(raw.length>500000)return reply({error:'Save is too large'},413);
 let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid save'},400);}
 if(body.resetVersion!==resetVersion)return reply({code:'ACCOUNTS_RESET',error:'All characters have been reset. Reload Veldren to create your new character.'},409);
 const st=body.state;if(!Number.isInteger(body.revision)||body.revision<0||!st||typeof st!=='object'||!st.xp||!st.bag||!Number.isFinite(st.x)||!Number.isFinite(st.y)||!Number.isFinite(st.hp)||!Number.isFinite(st.gold))return reply({error:'Invalid character data'},400);
 const previous=row?JSON.parse(row.state):null;
 // Enforce identity on the server too, including attempts to erase the
 // character first and recreate it under a different name. Revision checks
 // below prevent a concurrent first save from replacing an established name.
 if(typeof previous?.character?.name==='string'&&st.character?.name!==previous.character.name)return reply({error:'Your character name is permanent. You can still change your appearance.'},400);
 if(completedApprenticeship(previous)&&(!completedApprenticeship(st)||st.sceneId==='tutorial'))return reply({error:'The apprenticeship is complete. Tutorial re-entry is unavailable.'},400);
 if(st.tutorialIslandVersion>=1&&((st.sceneId==='tutorial')===completedApprenticeship(st)))return reply({error:'Invalid apprenticeship destination.'},400);
 const stamp=new Date().toISOString(),data=JSON.stringify(st);
 const result=body.revision===0?await env.DB.prepare(`INSERT INTO character_saves (user_id,state,revision,updated_at) SELECT ?,?,1,? WHERE ${RESET_VERSION_SQL}=? ON CONFLICT(user_id) DO NOTHING`).bind(user,data,stamp,body.resetVersion).run():await env.DB.prepare(`UPDATE character_saves SET state = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ? AND ${RESET_VERSION_SQL}=?`).bind(data,stamp,user,body.revision,body.resetVersion).run();
 if(!result.meta.changes){resetVersion=await currentResetVersion(env);return reply(resetVersion!==body.resetVersion?{code:'ACCOUNTS_RESET',error:'All characters have been reset. Reload Veldren to create your new character.'}:{error:'Your character was saved in another tab or device. Reload to continue with that save.'},409);}
 return reply({revision:body.revision+1,updatedAt:stamp});
 }catch(error){console.error('character_save_failed',error.message);return reply({error:'Could not reach character storage. Your local backup is safe.'},503);}
}

export async function handlePlayers(request,env){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'},reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 try{const raw=await request.text();if(raw.length>2048)return reply({error:'Request too large'},413);const input=JSON.parse(raw),resetVersion=await currentResetVersion(env);
 const player=await resolvePlayer(request,env,headers);if(!player?.row)return reply({error:'Create your character first.'},401);
 const sizes={tutorial:[104,112],overworld:[1152,768],inn:[14,12],shop:[14,12],forge:[14,12],stoneInn:[14,12],stoneShop:[14,12],willowInn:[14,12],willowShop:[14,12],mine:[26,22],dungeon:[28,25],ork_warrens:[38,44],lair_colossus:[46,48],lair_veyr:[44,48],lair_varkesh:[58,58],lair_xalith:[54,54]};const realmCounts={crownreach:26,greyhaven:25,briarhaven:5,willowcross:5,stoneford:5,ironhollow:26,deepforge:25,copperdelve:5,stonehearth:5,aelindor:26,moonwillow:25,fernwatch:5,silverbrook:5},match=String(input.scene).match(/^realm_([a-z]+)_(\d+)$/);const realm=match&&Object.hasOwn(realmCounts,match[1])&&Number(match[2])<realmCounts[match[1]],index=match?Number(match[2]):-1;const size=(Object.hasOwn(sizes,input.scene)?sizes[input.scene]:null)||(realm?(index===25?[24,22]:index===5&&["ironhollow","deepforge"].includes(match[1])?[26,22]:[16,14]):null);
 if(!size||!Number.isFinite(input.x)||!Number.isFinite(input.y)||input.x<0||input.y<0||input.x>=size[0]||input.y>=size[1])return reply({error:'Invalid position'},400);
 // Trail coordinates are finite integral, adjacent and ordered. Reject a
 // malformed trail as a whole; filtering individual nodes would invent gaps.
 const validTrail=Array.isArray(input.trail)&&input.trail.length<=24&&input.trail.every((n,i)=>Array.isArray(n)&&n.length===4&&n.every(Number.isFinite)&&Number.isSafeInteger(n[0])&&n[0]>0&&Number.isInteger(n[1])&&Number.isInteger(n[2])&&n[1]>=0&&n[2]>=0&&n[1]<size[0]&&n[2]<size[1]&&n[3]>=0&&n[3]<=60000&&(!i||n[0]===input.trail[i-1][0]+1&&Math.hypot(n[1]-input.trail[i-1][1],n[2]-input.trail[i-1][2])<=1.5));
 const trail=validTrail&&(!input.trail.length||Math.hypot(input.trail.at(-1)[1]-input.x,input.trail.at(-1)[2]-input.y)<=2)?input.trail:[];
 const state=JSON.parse(player.row.state);if(!state.character)return reply({error:'Create your character first.'},400);
 if(input.scene==='tutorial'&&completedApprenticeship(state))return reply({error:'Firstlight Isle is closed to mainland adventurers.'},403);
 if(state.tutorialIslandVersion>=1&&!completedApprenticeship(state)&&input.scene!=='tutorial')return reply({error:'Complete the apprenticeship before entering the mainland.'},403);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('public-player:'+player.user));const id=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const allowed={weapon:['woodenSword','bronzeSword','ironSword','shortbow','oakStaff','oakShortbow','willowShortbow','mapleShortbow','yewShortbow','magicShortbow'],head:['ironHelm','rangerHood','rangerCap'],body:['leatherArmor','mageRobe','wizardRobe','adeptRobe','mysticRobe','studdedBody','greenHideBody','blueHideBody','redHideBody','blackHideBody'],feet:['leatherBoots'],shield:['woodenShield','ironShield'],hands:[],legs:[],neck:['copperNecklace']},equipment={};for(const set of ['bronze','iron','steel','black','gold','mithril','adamant','rune','dragonslayer'])for(const slot of ['head','body','feet','shield','hands','legs','weapon'])allowed[slot].push(set+'_'+slot);allowed.weapon.push(...['bronze','iron','steel','mithril','adamant','rune'].map(t=>t+'_dagger'));for(const [slot,ids]of Object.entries(allowed))equipment[slot]=ids.includes(state.equipment?.[slot])?state.equipment[slot]:null;const now=Date.now(),payload={id,username:player.username,name:String(state.character.name||'Adventurer').slice(0,18),look:Number.isInteger(state.character.look)&&state.character.look>=0&&state.character.look<=3?state.character.look:0,race:'human',frame:state.character.frame==='female'?'female':'male',hair:[0,1,2,3,4].includes(state.character.hair)?state.character.hair:0,appearance:Object.fromEntries(['skin','hair','hairColor','beard','topStyle','topColor','bottomStyle','bottomColor'].map(k=>[k,Number.isInteger(state.character[k])&&state.character[k]>=0&&state.character[k]<=7?state.character[k]:0])),equipment,visibleArrows:Number.isSafeInteger(state.equippedAmmoCount)?Math.min(5,Math.max(0,state.equippedAmmoCount)):0,stamp:now,trailEpoch:Number.isSafeInteger(input.trailEpoch)?input.trailEpoch:0,trail,running:input.running===true,moving:input.moving===true,route:Array.isArray(input.route)?input.route.slice(0,8).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[1]>=0&&p[0]<size[0]&&p[1]<size[1]&&Math.hypot(p[0]-input.x,p[1]-input.y)<12):[],x:input.x,y:input.y,heading:Number.isFinite(input.heading)?input.heading:0,emote:['Hello!','Follow me!','Nice gear!'].includes(input.emote)?input.emote:null};
 const seen=await env.DB.prepare(`INSERT INTO player_presence (player_id,scene,payload,seen_at) SELECT ?,?,?,? WHERE ${RESET_VERSION_SQL}=? ON CONFLICT(player_id) DO UPDATE SET scene=excluded.scene,payload=excluded.payload,seen_at=excluded.seen_at`).bind(id,input.scene,JSON.stringify(payload),now,resetVersion).run();
 if(!seen.meta.changes)return reply({error:'Characters have been reset. Reconnect to create your character.'},401);
 const result=await env.DB.prepare('SELECT payload FROM player_presence WHERE scene = ? AND seen_at > ? AND player_id <> ? ORDER BY seen_at DESC LIMIT 60').bind(input.scene,now-12000,id).all();
 return reply({serverTime:now,players:result.results.map(row=>JSON.parse(row.payload))});
 }catch(error){console.error('player_presence_failed',error.message);return reply({error:'Online world temporarily unavailable'},503);}
}
