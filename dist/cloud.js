'use strict';
let cloudReady=false,cloudRevision=0,cloudDirty=false,cloudBusy=false,cloudTimer=null,cloudConflict=false,cloudAccount=null;
function cloudStatus(text){const el=$('cloudStatus');if(el)el.textContent=text;}
async function initializeCloud(){
 cloudStatus('Loading character…');const response=await fetch('/api/character',{cache:'no-store'});if(!response.ok){const error=new Error('Could not load your account save.');error.status=response.status;throw error;}const record=await response.json();
 cloudAccount=record.account;let restored=record.state;
 try{const backup=JSON.parse(localStorage.getItem('emberfall-cloud-backup-v1'));if(backup?.account===cloudAccount&&backup.pending&&backup.revision===record.revision&&backup.state?.xp&&backup.state?.bag)restored=backup.state;}catch{}
 s=defaults();
 if(restored){const d=defaults();s={...d,...restored,xp:{...d.xp,...restored.xp},bag:{...d.bag,...restored.bag},gear:{...d.gear,...restored.gear},equipment:{...d.equipment,...restored.equipment}};}
 migrateCombatSkills(s,restored||s);s.hp=Math.max(1,Math.min(s.hp,maxhp()));
 if(s.character)s.character.race='human';cloudRevision=record.revision;cloudReady=true;cloudStatus('Account save ready');
}
function backupCloudState(pending){try{localStorage.setItem('emberfall-cloud-backup-v1',JSON.stringify({account:cloudAccount,revision:cloudRevision,pending,state:s}));}catch{}}
function queueCloudSave(){if(!cloudReady||cloudConflict||!s.character)return;cloudDirty=true;backupCloudState(true);cloudStatus('Saving…');clearTimeout(cloudTimer);cloudTimer=setTimeout(flushCloudSave,700);}
async function flushCloudSave(){
 if(!cloudReady||cloudBusy||!cloudDirty||cloudConflict)return false;clearTimeout(cloudTimer);cloudBusy=true;cloudDirty=false;
 try{const response=await fetch('/api/character',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:cloudRevision,state:s}),keepalive:true});
 if(response.status===401){cloudConflict=true;cloudStatus('Sign in to resume account saving');dialog('Reconnect your account','<p>Reopen Emberfall from ChatGPT to reconnect your account. Your character backup is kept on this device.</p>',[['Retry connection',()=>location.reload()]]);return false;}
 if(response.status===409){cloudConflict=true;cloudStatus('Reload: newer account save');dialog('Character open elsewhere','<p>A newer save exists from another tab or device. Reload to use it. This session’s local backup has been kept.</p>',[['Reload character',()=>location.reload()]]);return;}
 if(!response.ok)throw new Error('Save unavailable');const result=await response.json();cloudRevision=result.revision;backupCloudState(cloudDirty);cloudStatus('Saved to account');return true;
 }catch{cloudDirty=true;cloudStatus('Offline · backup on device');return false;}
 finally{cloudBusy=false;if(cloudDirty&&!cloudConflict)cloudTimer=setTimeout(flushCloudSave,3000);}
}
window.addEventListener('pagehide',()=>{clearTimeout(cloudTimer);flushCloudSave();});
