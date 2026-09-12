'use strict';
const onlinePeers=new Map();let onlineScene=null,onlineEmote=null,onlineEmoteUntil=0;
async function syncOnlineWorld(){
 if(cloudDisconnected||cloudConflict)return;
 if(!assetsReady||!s.character||!cloudReady||cloudBusy||$('creator').open||document.hidden){setTimeout(syncOnlineWorld,1200);return;}
 try{const response=await fetch('/api/players',{method:'POST',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json'},body:JSON.stringify({scene:currentScene,x:px,y:py,heading:playerHeading,emote:Date.now()<onlineEmoteUntil?onlineEmote:null})});if(!response.ok)throw new Error('offline');const data=await response.json();
 if(onlineScene!==currentScene){onlinePeers.clear();onlineScene=currentScene;}
 const present=new Set();for(const peer of data.players){present.add(peer.id);const old=onlinePeers.get(peer.id);onlinePeers.set(peer.id,{...peer,drawX:old?.drawX??peer.x,drawY:old?.drawY??peer.y,seen:Date.now()});}for(const id of onlinePeers.keys())if(!present.has(id))onlinePeers.delete(id);
 $('onlineStatus').textContent=(onlinePeers.size+1)+' online here';
 }catch{$('onlineStatus').textContent='Connection lost';pauseForServer();return;}
 setTimeout(syncOnlineWorld,1000);
}
function drawOnlinePlayers(mesh,labels){if(onlineScene!==currentScene)return;for(const peer of onlinePeers.values()){
 if(Date.now()-peer.seen>12000)continue;const moving=Math.hypot(peer.drawX-peer.x,peer.drawY-peer.y)>.04;peer.drawX+=(peer.x-peer.drawX)*.16;peer.drawY+=(peer.y-peer.drawY)*.16;
 const p=project3(peer.drawX+.5,1,peer.drawY+.5);if(p.x< -80||p.x>screen.w+80||p.y< -120||p.y>screen.h+100)continue;
 humanoid3(mesh,peer.drawX+.5,peer.drawY+.5,peer.look,{...peer.equipment,_race:peer.race||'human',_frame:peer.frame,_hair:peer.hair},peer.heading,moving?time*10:0,peer.emote==='Hello!'?.6:0);
 labels.push([peer.name,peer.drawX+.5,2.15,peer.drawY+.5,'#bce2ee']);if(peer.emote)labels.push([peer.emote,peer.drawX+.5,2.6,peer.drawY+.5,'#f6e6b5']);
}}
$('waveButton').onclick=()=>{onlineEmote='Hello!';onlineEmoteUntil=Date.now()+5000;toast('You wave to nearby players.');};
setTimeout(syncOnlineWorld,1000);
