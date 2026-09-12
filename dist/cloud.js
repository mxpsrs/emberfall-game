'use strict';
let cloudReady=false,cloudRevision=0,cloudDirty=false,cloudBusy=false,cloudTimer=null,cloudConflict=false,cloudAccount=null;
let cloudResetVersion=null;
let cloudDisconnected=false;
function pauseForServer(title='Connection lost',message='Gameplay is paused. Reconnect to load your latest server save.'){
 if(cloudDisconnected)return;cloudDisconnected=true;cloudStatus('Connection lost · gameplay paused');
 if(typeof assetsReady!=='undefined'&&assetsReady)stop();
 document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
 const overlay=document.createElement('div');overlay.id='connectionPause';overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');overlay.innerHTML='<h2>'+title+'</h2><p>'+message+'</p><button id="reconnectGame">Reconnect</button>';document.body.appendChild(overlay);$('reconnectGame').onclick=()=>location.reload();$('reconnectGame').focus?.();
}
window.addEventListener('offline',()=>pauseForServer());
for(const event of ['pointerdown','pointerup','click','keydown','wheel'])document.addEventListener(event,e=>{if(cloudDisconnected&&!e.target.closest?.('#connectionPause')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
function cloudStatus(text){const el=$('cloudStatus');if(el)el.textContent=text;}
async function initializeCloud(){
 cloudStatus('Loading character…');const response=await fetch('/api/character',{cache:'no-store'});if(!response.ok){const error=new Error('Could not load your account save.');error.status=response.status;throw error;}const record=await response.json();
 cloudAccount=record.account;cloudResetVersion=record.resetVersion||null;let restored=record.state;
 // The server save is authoritative; never restore pending device progress.
 s=defaults();
 if(restored){const d=defaults();s={...d,...restored,xp:{...d.xp,...restored.xp},bag:{...d.bag,...restored.bag},gear:{...d.gear,...restored.gear},equipment:{...d.equipment,...restored.equipment}};}
 migrateCombatSkills(s,restored||s);normalizeJourney(s,restored||s);normalizeSkillProgression(s,restored||s);normalizeToolBelt(s);normalizeEquipmentSlots(s);s.hp=Math.max(1,Math.min(s.hp,maxhp()));
 if(s.character)s.character.race='human';cloudRevision=record.revision;cloudReady=true;cloudStatus('Account save ready');
}
function backupCloudState(pending){try{localStorage.setItem('emberfall-cloud-backup-v1',JSON.stringify({account:cloudAccount,revision:cloudRevision,resetVersion:cloudResetVersion,pending,state:s}));}catch{}}
function queueCloudSave(){if(!cloudReady||cloudConflict||cloudDisconnected||!s.character)return;cloudDirty=true;backupCloudState(true);cloudStatus('Saving…');clearTimeout(cloudTimer);cloudTimer=setTimeout(flushCloudSave,700);}
async function flushCloudSave(){
 if(!cloudReady||cloudBusy||!cloudDirty||cloudConflict||cloudDisconnected)return false;clearTimeout(cloudTimer);cloudBusy=true;cloudDirty=false;
 try{const response=await fetch('/api/character',{method:'PUT',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:cloudRevision,resetVersion:cloudResetVersion,state:s}),keepalive:true});
 if(response.status===401){cloudConflict=true;pauseForServer('Reconnect your character','Your connection expired. Reconnect to load your server save.');return false;}
 if(response.status===409){cloudConflict=true;const error=await response.json();pauseForServer(error.code==='ACCOUNTS_RESET'?'Characters reset':'Newer save available',error.code==='ACCOUNTS_RESET'?'All players are starting fresh. Reconnect to create your character.':'A newer save exists on the server. Reconnect to continue with it.');return false;}
 if(!response.ok)throw new Error('Save unavailable');const result=await response.json();cloudRevision=result.revision;backupCloudState(cloudDirty);cloudStatus('Saved to account');return true;
 }catch{cloudDirty=true;pauseForServer();return false;}
 finally{cloudBusy=false;if(cloudDirty&&!cloudConflict&&!cloudDisconnected)cloudTimer=setTimeout(flushCloudSave,3000);}
}
window.addEventListener('pagehide',()=>{clearTimeout(cloudTimer);flushCloudSave();});
