'use strict';
const onlinePeers=new Map();let onlineScene=null,onlineEmote=null,onlineEmoteUntil=0;
async function syncOnlineWorld(){
 if(cloudDisconnected||cloudConflict)return;
 if(!assetsReady||!s.character||!cloudReady||$('creator').open||document.hidden){setTimeout(syncOnlineWorld,1200);return;}
 // Presence must follow the saved journey, for every island layout version.
 // Otherwise the server correctly rejects a mainland arrival as unfinished.
 if(onlineScene!==currentScene&&cloudDirty)await flushCloudSave();
 if(cloudDisconnected||cloudConflict)return;
 if(onlineScene!==currentScene&&(cloudDirty||cloudBusy)){setTimeout(syncOnlineWorld,1200);return;}
 const requestedScene=currentScene,started=performance.now();
 try{const response=await fetch('/api/players',{method:'POST',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json'},body:JSON.stringify({scene:requestedScene,x:px,y:py,heading:playerHeading,emote:Date.now()<onlineEmoteUntil?onlineEmote:null,running:playerMotion.running,moving:playerMotion.moving,route:playerMotion.moving?[[s.x,s.y],...path.slice(0,7)]:[]})});
 // An island request can still be in flight when Rowan finishes the crossing.
 if(requestedScene!==currentScene){setTimeout(syncOnlineWorld,0);return;}
 if(!response.ok)throw new Error('offline');const data=await response.json();
 if(requestedScene!==currentScene){setTimeout(syncOnlineWorld,0);return;}
 if(onlineScene!==currentScene){onlinePeers.clear();onlineScene=currentScene;if(typeof gameMessage==='function')gameMessage('Connected to '+(currentScene==='tutorial'?'Firstlight Isle':'the shared world')+'.',{key:'world-connection'});}
 const present=new Set(),received=performance.now();for(const peer of data.players){present.add(peer.id);const old=onlinePeers.get(peer.id),stamp=received-Math.max(0,(data.serverTime||peer.stamp)-peer.stamp),samples=old?.samples||[];
 if(!samples.length||peer.stamp!==old?.stamp){samples.push({x:peer.x,y:peer.y,at:stamp});while(samples.length>12)samples.shift();}
 onlinePeers.set(peer.id,{...peer,samples,drawX:old?.drawX??peer.x,drawY:old?.drawY??peer.y,drawHeading:old?.drawHeading??peer.heading,phase:old?.phase||0,drawAt:old?.drawAt??received,seen:Date.now(),sampleAt:stamp});}for(const id of onlinePeers.keys())if(!present.has(id))onlinePeers.delete(id);
 $('onlineStatus').textContent=currentScene==='tutorial'?'Firstlight Isle · '+(onlinePeers.size+1)+' online':(onlinePeers.size+1)+' online here';
 }catch{if(requestedScene!==currentScene){setTimeout(syncOnlineWorld,0);return;}$('onlineStatus').textContent='Connection lost';pauseForServer();return;}
 setTimeout(syncOnlineWorld,Math.max(20,250-(performance.now()-started)));
}
function samplePeerPosition(peer,now){
 const at=now-250,samples=peer.samples||[];
 for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(at<=b.at){const t=Math.max(0,Math.min(1,(at-a.at)/Math.max(1,b.at-a.at)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}}
 let x=peer.x,y=peer.y,budget=Math.max(0,Math.min(500,at-peer.sampleAt))/1000*(peer.running?4.5:2.25);
 if(peer.moving)for(const node of peer.route||[]){const dx=node[0]-x,dy=node[1]-y,d=Math.hypot(dx,dy);if(!d)continue;const step=Math.min(budget,d);x+=dx/d*step;y+=dy/d*step;budget-=step;if(budget<=0)break;}
 return {x,y};
}
function drawOnlinePlayers(mesh,labels){if(onlineScene!==currentScene)return;for(const peer of onlinePeers.values()){
 if(Date.now()-peer.seen>12000)continue;const now=performance.now(),dt=Math.min(.1,(now-peer.drawAt)/1000),pos=samplePeerPosition(peer,now),distance=Math.hypot(pos.x-peer.drawX,pos.y-peer.drawY),moving=distance>.001;peer.drawAt=now;peer.drawX=pos.x;peer.drawY=pos.y;peer.phase=(peer.phase+distance/(peer.running?3.2:1.4))%1;peer.drawHeading+=Math.atan2(Math.sin(peer.heading-peer.drawHeading),Math.cos(peer.heading-peer.drawHeading))*(1-Math.exp(-14*dt));
 const p=project3(peer.drawX+.5,1,peer.drawY+.5);if(p.x< -80||p.x>screen.w+80||p.y< -120||p.y>screen.h+100)continue;
 humanoid3(mesh,peer.drawX+.5,peer.drawY+.5,peer.look,{...peer.equipment,_race:peer.race||'human',_frame:peer.frame,_hair:peer.hair,_appearance:peer.appearance,_ammoCount:peer.visibleArrows||0,_peerMotion:{moving,running:peer.running,phase:peer.phase}},peer.drawHeading,moving?1:0,peer.emote==='Hello!'?.6:0);
 const feet=project3(peer.drawX+.5,0,peer.drawY+.5),head=project3(peer.drawX+.5,2,peer.drawY+.5),width=Math.max(24,cameraZoom3()*.75);
 hitboxes.push({x:feet.x-width/2,y:Math.min(feet.y,head.y)-6,w:width,h:Math.abs(feet.y-head.y)+12,depth:feet.depth,o:{type:'player',id:peer.id,name:peer.name,username:peer.username,x:peer.x,y:peer.y}});
 labels.push([peer.name,peer.drawX+.5,2.15,peer.drawY+.5,'#bce2ee']);if(typeof socialOverheads!=='undefined'){const chat=socialOverheads.get(peer.username?.toLowerCase());if(chat&&Date.now()<chat.until)pushOverheadChat(labels,chat.text,peer.drawX,peer.drawY);}if(peer.emote)labels.push([peer.emote,peer.drawX+.5,2.6,peer.drawY+.5,'#f6e6b5']);
}}
$('waveButton').onclick=()=>{onlineEmote='Hello!';onlineEmoteUntil=Date.now()+5000;toast('You wave to nearby players.');};
setTimeout(syncOnlineWorld,1000);

let followedPlayerId=null,followRouteAt=0;
function followPlayer(id){const peer=onlinePeers.get(id);if(!peer||onlineScene!==currentScene)return;stop();followedPlayerId=id;followRouteAt=0;toast('Following '+peer.name);updatePlayerFollow();}
function updatePlayerFollow(){
 if(!followedPlayerId||time<followRouteAt)return;followRouteAt=time+.6;
 const peer=onlinePeers.get(followedPlayerId);
 if(!peer||onlineScene!==currentScene||Date.now()-peer.seen>12000){stop();return;}
 if(Math.hypot(peer.x-px,peer.y-py)<=1.6){path=[];return;}
 const next=route(peer.x,peer.y,true,1.45);if(next!==null)path=next;
}
