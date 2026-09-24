'use strict';
const onlinePeers=new Map();let onlineScene=null,onlineEmote=null,onlineEmoteUntil=0;
// Capture tile departures in the movement loop, before a network poll can skip
// them. Sequence IDs distinguish real turns, including revisiting the same tile.
let movementTrail=[],movementTrailScene=null,movementTrailEpoch=0,movementTrailSequence=0;
function recordPlayerDeparture(x,y){
 if(movementTrailScene!==currentScene||movementTrail.length&&Math.hypot(x-movementTrail.at(-1)[1],y-movementTrail.at(-1)[2])>1.5){movementTrail=[];movementTrailScene=currentScene;movementTrailEpoch=Math.max(Date.now(),movementTrailEpoch+1);movementTrailSequence=0;}
 movementTrail.push([++movementTrailSequence,x,y,Date.now()]);if(movementTrail.length>24)movementTrail.shift();
}
function outgoingMovementTrail(){return movementTrailScene===currentScene&&movementTrail.length&&Math.hypot(px-movementTrail.at(-1)[1],py-movementTrail.at(-1)[2])<=2?movementTrail.map(([seq,x,y,at])=>[seq,x,y,Math.min(60000,Math.max(0,Date.now()-at))]):[];}
let onlineSyncBusy=false,onlineSyncTimer=null;
async function syncOnlineWorld(){
 if(onlineSyncBusy)return;onlineSyncBusy=true;clearTimeout(onlineSyncTimer);onlineSyncTimer=null;try{await syncOnlineWorldOnce();}finally{onlineSyncBusy=false;if(!cloudDisconnected&&!cloudConflict&&!onlineSyncTimer)scheduleOnlineSync(100);}
}
function scheduleOnlineSync(delay){clearTimeout(onlineSyncTimer);onlineSyncTimer=setTimeout(()=>{onlineSyncTimer=null;syncOnlineWorld();},delay);}
async function syncOnlineWorldOnce(){
 if(cloudDisconnected||cloudConflict)return;
 if(!assetsReady||!s.character||!cloudReady||$('creator').open||document.hidden){scheduleOnlineSync(1200);return;}
 // Presence must follow the saved journey, for every island layout version.
 // Otherwise the server correctly rejects a mainland arrival as unfinished.
 if((onlineScene!==currentScene||typeof sharedPending==='function'&&sharedPending('teleport'))&&cloudDirty)await flushCloudSave();
 if(cloudDisconnected||cloudConflict)return;
 if(onlineScene!==currentScene&&(cloudDirty||cloudBusy)){scheduleOnlineSync(1200);return;}
 const requestedScene=currentScene,started=performance.now();
 if(typeof publishSharedAction==='function')publishSharedAction(outgoingSharedAction());
 try{const response=await fetch('/api/players',{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify({world:typeof outgoingSharedWorld==='function'?outgoingSharedWorld():null,action:typeof outgoingSharedAction==='function'?outgoingSharedAction():null,scene:requestedScene,x:px,y:py,trailEpoch:movementTrailEpoch,trail:outgoingMovementTrail(),heading:playerHeading,emote:Date.now()<onlineEmoteUntil?onlineEmote:null,running:playerMotion.running,moving:playerMotion.moving,route:playerMotion.moving?[[s.x,s.y],...path.slice(0,7)]:[]})});
 // An island request can still be in flight when Rowan finishes the crossing.
 if(requestedScene!==currentScene){scheduleOnlineSync(0);return;}
 if(await handleConnectionResponse(response))return;if(!response.ok)throw new Error('offline');if(cloudDisconnected||cloudConflict)return;const data=await response.json();if(cloudDisconnected||cloudConflict)return;
 if(requestedScene!==currentScene){scheduleOnlineSync(0);return;}
 if(onlineScene!==currentScene){onlinePeers.clear();onlineScene=currentScene;if(typeof gameMessage==='function')gameMessage('Connected to '+(currentScene==='tutorial'?'Firstlight Isle':'the shared world')+'.',{key:'world-connection'});}
 if(typeof applySharedWorld==='function')applySharedWorld(data);
 if(typeof ensureSharedActivityStream==='function')ensureSharedActivityStream();
 const present=new Set(),received=performance.now();for(const peer of data.players){present.add(peer.id);acceptPeerSnapshot(peer,received,data.serverTime,received-started);}for(const id of onlinePeers.keys())if(!present.has(id))onlinePeers.delete(id);
 $('onlineStatus').textContent=currentScene==='tutorial'?'Firstlight Isle · '+(onlinePeers.size+1)+' online':(onlinePeers.size+1)+' online here';
 }catch{if(requestedScene!==currentScene){scheduleOnlineSync(0);return;}$('onlineStatus').textContent='Reconnecting…';transientConnectionFailure();return;}
 scheduleOnlineSync(Math.max(100,500-(performance.now()-started)));
}
function acceptPeerSnapshot(peer,received,serverTime,roundTrip=0){
 if(typeof rememberSharedAction==='function')rememberSharedAction(peer.id,peer.action,serverTime);
 const old=onlinePeers.get(peer.id),samples=old?.samples||[];if(old&&Number.isFinite(peer.hp)&&peer.hp<old.hp&&Date.now()>(old.sharedHitUntil||0)&&typeof floating==='function')floating('−'+(old.hp-peer.hp),peer.x,peer.y,'#ffaba1');
 let stamp=received-Math.max(0,(serverTime||peer.stamp)-peer.stamp)-roundTrip/2;
 if(old&&peer.stamp<old.stamp)return;
 if(peer.stamp===old?.stamp)stamp=old.sampleAt;
 else {stamp=Math.max(stamp,(samples.at(-1)?.at??-Infinity)+.01);samples.push({x:peer.x,y:peer.y,at:stamp});while(samples.length>12)samples.shift();}
 onlinePeers.set(peer.id,{...peer,sharedHitUntil:old?.sharedHitUntil||0,samples,drawX:old?.drawX??peer.x,drawY:old?.drawY??peer.y,drawHeading:old?.drawHeading??peer.heading,phase:old?.phase||0,drawAt:old?.drawAt??received,seen:Date.now(),sampleAt:stamp});
}
function samplePeerPosition(peer,now){
 const at=now-250,samples=peer.samples||[];
 for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(at<=b.at){const t=Math.max(0,Math.min(1,(at-a.at)/Math.max(1,b.at-a.at)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}}
 let x=peer.x,y=peer.y,budget=Math.max(0,Math.min(500,at-peer.sampleAt))/1000*(peer.running?4.5:2.25);
 if(peer.moving)for(const node of peer.route||[]){const dx=node[0]-x,dy=node[1]-y,d=Math.hypot(dx,dy);if(!d)continue;const step=Math.min(budget,d);x+=dx/d*step;y+=dy/d*step;budget-=step;if(budget<=0)break;}
 return {x,y};
}
// A late packet can revise the predicted position. Converge over frames rather
// than snapping the model backwards or several tiles forward in a single frame.
function advancePeerVisual(peer,now){
 const dt=Math.max(0,Math.min(.1,(now-(peer.drawAt??now))/1000)),pos=samplePeerPosition(peer,now);
 const dx=pos.x-peer.drawX,dy=pos.y-peer.drawY,distance=Math.hypot(dx,dy);
 const limit=(peer.running?4.5:2.25)*1.35*dt,step=Math.min(distance,limit);
 if(distance>8){peer.drawX=pos.x;peer.drawY=pos.y;}
 else if(distance>0){peer.drawX+=dx/distance*step;peer.drawY+=dy/distance*step;}
 peer.drawAt=now;return {dt,distance:distance>8?0:step};
}
function drawOnlinePlayers(mesh,labels){if(onlineScene!==currentScene)return;for(const peer of onlinePeers.values()){
 if(Date.now()-peer.seen>12000)continue;const now=performance.now(),{dt,distance}=advancePeerVisual(peer,now),action=typeof sharedVisibleAction==='function'?sharedVisibleAction(peer):peer.action,combat=action?.kind==='combat'&&Date.now()+(typeof sharedOffset==='number'?sharedOffset:0)-action.started<action.duration,moving=distance>.001&&(!action||Date.now()+(typeof sharedOffset==='number'?sharedOffset:0)-action.started>=action.duration||peer.moving);peer.phase=(peer.phase+distance/(peer.running?3.2:1.4))%1;const facingTarget=combat&&(typeof sharedActionTarget==='function'?sharedActionTarget(action):action.target),heading=facingTarget?Math.atan2(facingTarget.x-peer.x,facingTarget.y-peer.y):peer.heading;peer.drawHeading+=Math.atan2(Math.sin(heading-peer.drawHeading),Math.cos(heading-peer.drawHeading))*(1-Math.exp(-14*dt));
 const p=project3(peer.drawX+.5,1,peer.drawY+.5);if(p.x< -80||p.x>screen.w+80||p.y< -120||p.y>screen.h+100)continue;
 humanoid3(mesh,peer.drawX+.5,peer.drawY+.5,peer.look,{...peer.equipment,...(typeof sharedPeerGear==='function'?sharedPeerGear(peer):{}),_race:peer.race||'human',_frame:peer.frame,_hair:peer.hair,_appearance:peer.appearance,_ammoCount:peer.visibleArrows||0,_peerMotion:{moving,running:peer.running,phase:peer.phase}},peer.drawHeading,moving?1:0,peer.emote==='Hello!'?.6:0);
 const feet=project3(peer.drawX+.5,0,peer.drawY+.5),head=project3(peer.drawX+.5,2,peer.drawY+.5),width=Math.max(24,cameraZoom3()*.75);
 hitboxes.push({x:feet.x-width/2,y:Math.min(feet.y,head.y)-6,w:width,h:Math.abs(feet.y-head.y)+12,depth:feet.depth,o:{type:'player',id:peer.id,name:peer.name,username:peer.username,x:peer.x,y:peer.y}});
 labels.push([peer.name,peer.drawX+.5,2.15,peer.drawY+.5,'#bce2ee']);if(typeof socialOverheads!=='undefined'){const chat=socialOverheads.get(peer.username?.toLowerCase());if(chat&&Date.now()<chat.until)pushOverheadChat(labels,chat.text,peer.drawX,peer.drawY);}if(peer.emote)labels.push([peer.emote,peer.drawX+.5,2.6,peer.drawY+.5,'#f6e6b5']);
}}
$('waveButton').onclick=()=>{onlineEmote='Hello!';onlineEmoteUntil=Date.now()+5000;toast('You wave to nearby players.');};
setTimeout(syncOnlineWorld,1000);

let followedPlayerId=null,followRouteAt=0,followSequence=null,followEpoch=null,followRetryAt=0;
function followPlayer(id){const peer=onlinePeers.get(id);if(!peer||onlineScene!==currentScene)return;stop();followedPlayerId=id;followRouteAt=0;followSequence=null;followEpoch=null;followRetryAt=0;toast('Following '+peer.name);updatePlayerFollow();}
function updatePlayerFollow(){
 if(!followedPlayerId||time<followRouteAt)return;followRouteAt=time+.05;
 const peer=onlinePeers.get(followedPlayerId);
 if(!peer||onlineScene!==currentScene||Date.now()-peer.seen>12000){stop();return;}
 const trail=peer.trail||[];
 if(peer.trailEpoch!==followEpoch){path=[];followSequence=null;followEpoch=peer.trailEpoch;}
 if(time<followRetryAt)return;
 // Join the latest known departed tile, then append every subsequent tile in
 // order. Do not round interpolated poses or replace an unfinished route.
 let nodes=followSequence===null?trail.slice(-1):trail.filter(n=>n[0]>followSequence);
 if(!nodes.length){
  if(followSequence!==null)return;
  // A newly spawned, stationary leader has no movement history yet.
  if(!peer.moving&&!path.length){const next=route(Math.round(peer.x),Math.round(peer.y),false);if(next!==null)path=next;followRetryAt=time+.5;}
  return;
 }
 let nextPath=path.slice(),start=nextPath.at(-1)||[s.x,s.y];
 for(const node of nodes){
  const leg=route(node[1],node[2],false,1.45,start[0],start[1]);
  if(leg===null){followRetryAt=time+.5;break;}
  nextPath.push(...leg);start=[node[1],node[2]];followSequence=node[0];
 }
 path=nextPath;
}
