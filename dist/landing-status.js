(() => {
 'use strict';
 const panel=document.getElementById('realm-status');
 if(!panel)return;
 const label=document.getElementById('server-state'),players=document.getElementById('player-count'),note=document.getElementById('status-note');
 let timer,busy=false;
 async function refresh(){
  clearTimeout(timer);
  if(document.hidden||busy)return;
  busy=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch('/api/status',{cache:'no-store',signal:controller.signal});
   const data=await response.json();
   if(response.status===503&&data.status==='offline'){
    panel.dataset.state='offline';label.textContent='Server offline';players.textContent='Player count unavailable';note.textContent='We’ll check again shortly.';
   }else{
    if(!response.ok||!['online','maintenance'].includes(data.status)||!Number.isSafeInteger(data.players)||data.players<0)throw new Error('Invalid status');
    panel.dataset.state=data.status;label.textContent=data.status==='maintenance'?'Server maintenance':'Server online';
    players.textContent=data.players.toLocaleString()+(data.players===1?' player in game':' players in game');
    note.textContent=data.status==='maintenance'?'An update is underway. Check back shortly.':data.maintenanceAt?'Maintenance begins shortly.':'Live count · Refreshes every 15 seconds';
   }
  }catch{
   panel.dataset.state='unknown';label.textContent='Server unreachable';players.textContent='Player count unavailable';note.textContent='Unable to check the server. Retrying shortly.';
  }finally{clearTimeout(timeout);busy=false;if(!document.hidden)timer=setTimeout(refresh,15000);}
 }
 document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden)refresh();});
 refresh();
})();
