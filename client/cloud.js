'use strict';
let cloudReady=false,cloudRevision=0,cloudDirty=false,cloudBusy=false,cloudTimer=null,cloudConflict=false,cloudAccount=null;
let cloudResetVersion=null;
let cloudDisconnected=false,cloudRecovering=false,cloudRecoveryBusy=false,cloudRecoveryTimer=null,cloudRecoveryDelay=1000,cloudPendingSave=null,cloudSaveGeneration=0,cloudPendingGeneration=0;
function transientConnectionFailure(){
 if(cloudConflict||window.maintenancePreparing||cloudDisconnected&&!cloudRecovering)return;
 cloudRecovering=true;pauseForServer('Reconnecting…','Your connection was interrupted. Gameplay is paused while we reconnect automatically.');
 clearTimeout(cloudRecoveryTimer);cloudRecoveryTimer=setTimeout(recoverConnection,cloudRecoveryDelay);cloudRecoveryDelay=Math.min(10000,cloudRecoveryDelay*2);
}
async function recoverConnection(){
 if(!cloudRecovering||cloudRecoveryBusy||cloudConflict)return;
 if(document.hidden||cloudBusy){cloudRecoveryTimer=setTimeout(recoverConnection,1000);return;}
 cloudRecoveryBusy=true;
 try{
  while(cloudDirty||cloudPendingSave){if(!await flushCloudSave())return;}
  const response=await fetch('/api/character',{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(await handleConnectionResponse(response))return;
  if(!response.ok)throw new Error('Unavailable');const record=await response.json();
  if(record.account!==cloudAccount||(record.resetVersion||null)!==cloudResetVersion||record.revision!==cloudRevision){cloudConflict=true;pauseForServer('Newer save available','Reconnect to load the latest character saved on your account.');return;}
  if(!cloudRecovering||window.maintenancePreparing)return;
  cloudRecovering=false;cloudDisconnected=false;cloudRecoveryDelay=1000;document.getElementById?.('connectionPause')?.remove();cloudStatus('Reconnected · progress saved');
  if(typeof syncOnlineWorld==='function')syncOnlineWorld();
 }catch{transientConnectionFailure();}finally{cloudRecoveryBusy=false;}
}
async function handleConnectionResponse(response){
 if(response.status===503){const data=await response.json().catch(()=>null);if(data?.maintenance?.status==='locked'){window.maintenancePreparing=true;pauseForServer('System maintenance','Your session has ended for the update. Reconnect after maintenance is complete.');return true;}}
 if(response.status===401){cloudConflict=true;pauseForServer('Reconnect your character','Your session expired. Reconnect to sign in and load your server save.');return true;}
 if(response.status===400||response.status===403){cloudConflict=true;pauseForServer('Reconnect your character','The server could not accept this character update. Reconnect to load your latest server save.');return true;}
 return false;
}
function removeRetiredCompanionFields(state){
 if(!state||typeof state!=='object'||state.retiredCompanionFieldsVersion===1)return state;
 for(const key of ['spirits','attunedSpirit','firstSpirit','spiritWardUntil','spiritProgressVersion'])delete state[key];
 state.retiredCompanionFieldsVersion=1;return state;
}
window.addEventListener('online',()=>{if(cloudRecovering){clearTimeout(cloudRecoveryTimer);recoverConnection();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cloudRecovering){clearTimeout(cloudRecoveryTimer);recoverConnection();}});

function pauseForServer(title='Connection lost',message='Gameplay is paused. Reconnect to load your latest server save.'){
 if(cloudDisconnected){if(!cloudRecovering||title==='Reconnecting…')return;document.getElementById?.('connectionPause')?.remove();}if(title!=='Reconnecting…'){cloudRecovering=false;clearTimeout(cloudRecoveryTimer);}if(typeof gameMessage==='function')gameMessage(title+': '+message,{service:true});cloudDisconnected=true;cloudStatus('Connection lost · gameplay paused');
 if(typeof assetsReady!=='undefined'&&assetsReady)stop();
 document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
 const overlay=document.createElement('div');overlay.id='connectionPause';overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');overlay.innerHTML='<h2>'+title+'</h2><p>'+message+'</p><button id="reconnectGame">Reconnect</button>';document.body.appendChild(overlay);$('reconnectGame').textContent=cloudRecovering?'Retry now':'Reconnect';$('reconnectGame').onclick=()=>{if(cloudRecovering){clearTimeout(cloudRecoveryTimer);recoverConnection();}else location.reload();};$('reconnectGame').focus?.();
}
window.addEventListener('offline',()=>{if(cloudReady)transientConnectionFailure();});
for(const event of ['pointerdown','pointerup','click','keydown','wheel'])document.addEventListener(event,e=>{if(cloudDisconnected&&!e.target.closest?.('#connectionPause')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
function cloudStatus(text){const el=$('cloudStatus');if(el)el.textContent=text;if(typeof gameMessage==='function')gameMessage(text,{key:'save-status'});}
async function initializeCloud(){
 cloudStatus('Loading character…');const response=await fetch('/api/character',{cache:'no-store'});if(!response.ok){const error=new Error('Could not load your account save.');error.status=response.status;throw error;}const record=await response.json();
 cloudAccount=record.account;cloudResetVersion=record.resetVersion||null;let restored=record.state;
 // The server save is authoritative; never restore pending device progress.
 s=defaults();
 if(restored){const d=defaults();s={...d,...restored,xp:{...d.xp,...restored.xp},bag:{...d.bag,...restored.bag},gear:{...d.gear,...restored.gear},equipment:{...d.equipment,...restored.equipment}};}
 migrateCombatSkills(s,restored||s);normalizeJourney(s,restored||s);normalizeSkillProgression(s,restored||s);normalizeToolBelt(s);normalizeEquipmentSlots(s);removeRetiredCompanionFields(s);s.hp=Math.max(1,Math.min(s.hp,maxhp()));
 if(s.character)s.character.race='human';cloudRevision=record.revision;cloudReady=true;cloudStatus('Account save ready');
}
function backupCloudState(pending){try{localStorage.setItem('emberfall-cloud-backup-v1',JSON.stringify({account:cloudAccount,revision:cloudRevision,resetVersion:cloudResetVersion,pending,state:s}));}catch{}}
function queueCloudSave(){if(window.VELDREN_CONTEXT==='editor'||!cloudReady||cloudConflict||cloudDisconnected||!s.character)return;cloudSaveGeneration++;cloudDirty=true;backupCloudState(true);cloudStatus('Saving…');clearTimeout(cloudTimer);cloudTimer=setTimeout(flushCloudSave,700);}
async function flushCloudSave(){
 if(window.VELDREN_CONTEXT==='editor'||!cloudReady||cloudBusy||!cloudDirty&&!cloudPendingSave||cloudConflict||cloudDisconnected&&!cloudRecovering)return false;clearTimeout(cloudTimer);cloudBusy=true;cloudDirty=false;
 try{
 // Retry precisely the same commit after a lost response. A newer local change
 // gets a separate revision after this snapshot has been acknowledged.
 if(!cloudPendingSave){cloudPendingGeneration=cloudSaveGeneration;cloudPendingSave={revision:cloudRevision,resetVersion:cloudResetVersion,state:JSON.parse(JSON.stringify({...s,_saveRequestId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}))};}
 const response=await fetch('/api/character',{method:'PUT',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify(cloudPendingSave)});
 if(await handleConnectionResponse(response))return false;
 if(response.status===409){cloudConflict=true;const error=await response.json();pauseForServer(error.code==='ACCOUNTS_RESET'?'Characters reset':'Newer save available',error.code==='ACCOUNTS_RESET'?'All players are starting fresh. Reconnect to create your character.':'A newer save exists on the server. Reconnect to continue with it.');return false;}
 if(!response.ok)throw new Error('Save unavailable');const result=await response.json();cloudRevision=result.revision;cloudPendingSave=null;cloudDirty=cloudDirty||cloudSaveGeneration>cloudPendingGeneration;backupCloudState(cloudDirty);cloudStatus('Saved to account');return true;
 }catch{cloudDirty=true;transientConnectionFailure();return false;}
 finally{cloudBusy=false;if(cloudDirty&&!cloudConflict&&!cloudDisconnected)cloudTimer=setTimeout(flushCloudSave,3000);}
}
window.addEventListener('pagehide',()=>{clearTimeout(cloudTimer);flushCloudSave();});
