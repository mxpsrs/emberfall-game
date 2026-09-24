'use strict';
let maintenanceNotice=null,maintenancePollBusy=false,maintenanceFinalSave=false,maintenanceChatSecond=-1;
const maintenanceBanner=document.createElement('div');maintenanceBanner.id='maintenanceNotice';maintenanceBanner.hidden=true;maintenanceBanner.setAttribute('role','status');document.body.appendChild(maintenanceBanner);
async function pollMaintenance(){
 if(maintenancePollBusy)return;maintenancePollBusy=true;
 try{const r=await fetch('/api/maintenance',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(r.ok){const next=await r.json();next.offset=next.serverTime-Date.now();if(next.id!==maintenanceNotice?.id){maintenanceFinalSave=false;if(next.status==='countdown'&&typeof addServiceMessage==='function')addServiceMessage('System maintenance in 2 minutes. Your progress will be saved, then everyone will be disconnected.');}maintenanceNotice=next;}}
 catch{}finally{maintenancePollBusy=false;setTimeout(pollMaintenance,2000);}
}
async function renderMaintenance(){
 const m=maintenanceNotice;maintenanceBanner.hidden=!m||m.status==='open';if(!m||m.status==='open')return;
 const remaining=Math.max(0,Math.ceil((m.kickAt-Date.now()-m.offset)/1000));maintenanceBanner.textContent='System maintenance · '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
 if(remaining!==maintenanceChatSecond){maintenanceChatSecond=remaining;if(typeof gameMessage==='function')gameMessage(maintenanceBanner.textContent,{key:'maintenance-countdown',service:true});}
 if(remaining<=5&&!maintenanceFinalSave){maintenanceFinalSave=true;window.maintenancePreparing=true;if(cloudReady&&!cloudDisconnected){stop();queueCloudSave();await flushCloudSave();}}
 if(!remaining||m.status==='locked')pauseForServer('System maintenance','Your session has ended for the update. Reconnect when maintenance is complete.');
}
setInterval(renderMaintenance,250);pollMaintenance();

for(const event of ['pointerdown','pointerup','click','keydown','wheel'])document.addEventListener(event,e=>{if(window.maintenancePreparing&&!e.target.closest?.('#connectionPause')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
