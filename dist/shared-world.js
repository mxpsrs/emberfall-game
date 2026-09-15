'use strict';
// The shared protocol returns committed world changes and durable receipts.
// Receipt IDs are saved with the character before the server is told to retire them.
let sharedActionCache=null,sharedTaskCache=null,sharedAttackReadyAt=0;
let sharedActor=null,sharedScene=null,sharedOffset=0,sharedApplying=false,sharedLocalDrop=false,sharedPermit=false,sharedSequence=0;
const sharedCallbacks=new Map();
function sharedLive(){return typeof cloudReady!=='undefined'&&cloudReady&&assetsReady&&!cloudDisconnected&&!cloudConflict;}
function sharedNow(){return Date.now()+sharedOffset;}
function sharedEntity(o){return o&&questFightVisible(o,s)&&!o._sharedObject&&(fighter(o)||resourceDefinition(o)||o.building?.walkIn);}
function sharedQueue(kind,data={},callback){
 const id=data.id||Date.now().toString(36)+'-'+(++sharedSequence)+'-'+Math.random().toString(36).slice(2,12),event={id,kind,scene:currentScene,...data};
 (s.sharedOutbox??=[]).push(event);if(callback)sharedCallbacks.set(id,callback);save();return event;
}
function sharedFightClaimed(o){return sharedLive()&&fighter(o)&&(o.level||1)<27&&!!o._sharedTarget&&o._sharedTarget!==sharedActor&&!o._sharedDeadUntil;}
function sharedPending(kind,entity){return (s.sharedOutbox||[]).some(e=>e.kind===kind&&(entity===undefined||e.entity===String(entity)));}
function sharedTarget(kind,o,data={}){return sharedQueue(kind,{entity:String(o.id),generation:o._sharedGeneration,...data});}
function sharedTimedAction(source,key,age,duration,detail){if(!sharedTaskCache||sharedTaskCache.source!==source||sharedTaskCache.key!==key||age<sharedTaskCache.age-.05)sharedTaskCache={source,key,age,started:sharedNow()-age*1000};sharedTaskCache.age=age;return {...detail,started:sharedTaskCache.started,duration};}
function outgoingSharedAction(){
 const now=sharedNow(),g=gatheringActivity(),a=typeof questVisualAction==='function'?questVisualAction():playerAction;
 if(tutorialCrossing)return sharedTimedAction(tutorialCrossing,tutorialCrossing.phase,tutorialCrossing.age,tutorialCrossing.phase==='casting'?2600:1100,{kind:'teleport',color:tutorialCrossing.kind==='home'?'purple':tutorialCrossing.kind==='hunt'?'red':'green'});
 if(g)return sharedTimedAction(g.object,'gather',elapsed,actionDuration(g.object)*1000,{kind:'gather',type:g.object.type,tool:g.tool});
 if(a)return sharedTimedAction(mainStoryWork||mountainWork||a,a.kind,time-a.started,a.duration*1000,{kind:'work',work:a.kind});
 sharedTaskCache=null;
 if(sharedActionCache&&now-sharedActionCache.started<sharedActionCache.duration+1200)return sharedActionCache;
 return null;
}
function outgoingSharedWorld(){
 if(!sharedLive())return null;
 const urgent=new Set([target,pendingWalkInDoor,activeEncounter?.o].filter(Boolean).map(o=>String(o.id)));for(const e of s.sharedOutbox||[])if(e.scene===currentScene&&e.entity)urgent.add(e.entity);
 const candidates=worldObjectsInBounds(px-92,px+92,py-92,py+92).filter(o=>sharedEntity(o)&&Math.hypot((o.building?.walkIn?o.x:o.homeX??o.x)-px,(o.building?.walkIn?o.y:o.homeY??o.y)-py)<72).sort((a,b)=>(urgent.has(String(a.id))?-1000:fighter(a)&&Math.hypot(a.x-px,a.y-py)<32?-200+Math.hypot(a.x-px,a.y-py):Math.hypot(a.x-px,a.y-py))-(urgent.has(String(b.id))?-1000:fighter(b)&&Math.hypot(b.x-px,b.y-py)<32?-200+Math.hypot(b.x-px,b.y-py):Math.hypot(b.x-px,b.y-py))).slice(0,64);
 const poses=[];
 return {protocol:1,watch:candidates.map(o=>String(o.id)),revisions:sharedScene===currentScene?Object.fromEntries([...new Set([...candidates,...worldActors().filter(o=>Math.hypot(o.x-px,o.y-py)<75)])].filter(o=>Number.isInteger(o._sharedRevision)).map(o=>[String(o.id),o._sharedRevision])):{},poses,events:(s.sharedOutbox||[]).slice(0,12),ack:!cloudDirty&&!cloudBusy?(s.sharedReceipts||[]).slice(-80):[],arrival:s.sharedArrival?.destination===currentScene?s.sharedArrival.id:null};
}
function sharedGive(id,n){if(!n)return;const carried=STACKABLE.has(id)?(canCarry(id,n)?n:0):Math.min(n,bagSpaceFor(id));const bag=ITEMS[id]?.slot?(s.gear??={}):s.bag;bag[id]=(bag[id]||0)+carried;if(carried<n){s.bank??={};s.bank[id]=(s.bank[id]||0)+n-carried;toast('Supplies that did not fit were sent to your bank.');}}
function applySharedWorld(data){
 const w=data.world;if(!w||w.protocol!==1)return;
 sharedActor=w.actor;sharedOffset=w.serverTime-Date.now();sharedScene=currentScene;
 const find=id=>worldIndex().byId.get(String(id));
 for(const r of w.receipts){
  if((s.sharedReceipts||[]).includes(r.id))continue;
  const event=(s.sharedOutbox||[]).find(e=>e.id===r.id),o=(worldScenes[r.scene||event?.scene||currentScene]?.objects||objects).find(o=>String(o.id)===String(r.entity));sharedApplying=true;
  try{
   if(r.kind==='attack'&&Number.isFinite(r.readyAt))sharedAttackReadyAt=Math.max(sharedAttackReadyAt,r.readyAt);
   if(r.ok){
    if(r.kind==='hit'&&o){if(r.damage>0)awardCombatDamage(r.damage,r.style,r.focus);floating(r.damage?'−'+r.damage:'Miss',o.x,o.y,r.damage?'#ffe0bb':'#9caebd');o.hitAt=time;
     if(r.defeat){o.hp=0;if(!r.scene||r.scene===currentScene)awardDefeat(o,r.style);}
    }else if(r.kind==='enemyHit'&&o){const hp=o.hp;if(r.dodged)floating('Dodged',px,py,'#b5e9c8');else sharedEnemyHitBefore(o,r.damage);o.hp=hp;}
    else if(r.kind==='harvest'&&!r.missed){sharedGive(r.item,1);if(r.bait&&s.bag[r.bait]>0)s.bag[r.bait]--;gain(r.skill,r.xp);discoverSkillSpirit(r.skill);if(o){o.hitAt=time;floating('+1 '+ITEMS[r.item].name,o.x,o.y);if(['ore','tin'].includes(o.tutorialRole)){if(s.bag.copperOre>0&&s.bag.tinOre>0)tutorialEvent('ore');}else tutorialEvent(o.type);}}
    else if(r.kind==='fire'){gain('Firemaking',r.xp);discoverSkillSpirit('Firemaking');tutorialEvent('fire');playGameSound('fire');}
    else if(r.kind==='pickup'){sharedGive(r.item,r.count);tutorialEvent('loot');toast('Picked up '+ITEMS[r.item].name+(r.count>1?' ×'+r.count:'')+'.');}
    else if(r.kind==='door'&&o)sharedDoorBefore(o,r.opened,true);
    else if(r.kind==='teleport'){s.sharedArrival={id:r.id,destination:r.destination};}
   }else{
    if(r.kind==='attack'){meleeImpacts=meleeImpacts.filter(hit=>hit.sharedSwing!==r.id);projectiles=projectiles.filter(hit=>hit.sharedSwing!==r.id);}
    const recovering=r.code==='attack_cooldown';if(recovering&&Number.isFinite(r.readyAt))sharedAttackReadyAt=Math.max(sharedAttackReadyAt,r.readyAt);
    if(!recovering&&['attack','hit'].includes(r.kind)&&o&&target===o)stop();
    if(event?.kind==='fire')sharedGive(event.item,1);
    if(event?.kind==='drop')for(const [id,n]of Object.entries(event.items))sharedGive(id,n);
    if(!recovering&&!['enemyHit','companion'].includes(r.kind))toast(r.error||'That action is no longer available.');
   }
   const callback=sharedCallbacks.get(r.id);if(callback)callback(r);sharedCallbacks.delete(r.id);
   (s.sharedReceipts??=[]).push(r.id);s.sharedOutbox=(s.sharedOutbox||[]).filter(e=>e.id!==r.id);
  }finally{sharedApplying=false;}
  renderUI();save();
 }
 if(target&&!questFightVisible(target,s))stop();if(activeEncounter&&!questFightVisible(activeEncounter.o,s))resetEncounter(false);
 if(w.acked?.length){s.sharedReceipts=(s.sharedReceipts||[]).filter(id=>!w.acked.includes(id));save();}
 for(const v of w.entities){
  const o=find(v.entity);if(!o||!questFightVisible(o,s)||v.revision<(o._sharedRevision??-1))continue;const previous=o._sharedGeneration,previousOwner=o._sharedOwner,oldHP=o.hp,oldDead=o._sharedDeadUntil;
  o._sharedReady=true;o._sharedRevision=v.revision;o._sharedGeneration=v.generation;o._sharedOwner=v.owner;o._sharedTarget=v.target;o._sharedHazard=v.hazard;o._sharedPhase=v.phase||0;if(o.encounter==='colossus')o.enraged=o._sharedPhase===1;o._sharedDeadUntil=v.deadUntil;
  if(fighter(o)){o._sharedStationary??=!!o._stationary;o._stationary=v.owner!==sharedActor||o._sharedStationary;
   if(v.revision>=(o._sharedHPRevision??-1))o.hp=v.hp;o.maxhp=v.maxhp;
   if(v.owner!==sharedActor||previousOwner!==v.owner||previous!==v.generation){o.x=v.x;o.y=v.y;if(previous!==v.generation){o.drawX=v.x;o.drawY=v.y;}}
   if(v.owner!==sharedActor){delete o._returning;delete o._recovering;o._returnPath=null;}
   if(v.owner!==sharedActor&&v.pose)sharedEnemyPose(o,v.pose,v.generation,w.serverTime);
   if(oldHP>v.hp&&!sharedPending('hit',o.id))o.hitAt=time;
  }
  if(resourceDefinition(o)||fighter(o)){
   o.dead=v.deadUntil?Infinity:0;o.respawnAt=v.deadUntil||null;
   if(v.deadUntil&&!oldDead){o.deathAt=time;if(target===o)stop();if(activeEncounter?.o===o)resetEncounter(false);}
   if(!v.deadUntil&&oldDead){o.deathAt=-100;o.attackAt=-100;delete o._recovering;delete o._returning;}
  }
  if(o.building?.walkIn)sharedDoorBefore(o,v.opened,true);
 }
 applySharedEffects(w.effects||[],w.serverTime);
 // Private drops never arrive in another player's packet. Shared piles are
 // replaced from this snapshot, while protected account overflow stays private.
 const visible=new Set(w.objects.map(o=>o.id));
 s.groundLoot=(s.groundLoot||[]).filter(p=>!p._sharedObject||p.scene!==currentScene||visible.has(p._sharedObject));
 const stale=objects.filter(o=>o._sharedObject&&!visible.has(o._sharedObject));
 for(const o of stale){objects.splice(objects.indexOf(o),1);const list=worldScenes[currentScene].objects;if(list!==objects){const i=list.indexOf(o);if(i>=0)list.splice(i,1);}if(target===o)stop();}
 for(const p of w.objects){
  if(p.kind==='loot'){
   let pile=s.groundLoot.find(o=>o._sharedObject===p.id);if(!pile){pile={type:'loot',name:'Ground loot',dead:0,scene:currentScene,_sharedObject:p.id};s.groundLoot.push(pile);}Object.assign(pile,{items:p.items,x:p.x,y:p.y,expiresAt:p.expiresAt-sharedOffset});
   if(!Object.keys(pile.items).length)s.groundLoot=s.groundLoot.filter(o=>o!==pile);
  }else if(p.kind==='fire'){
   let o=objects.find(o=>o._sharedObject===p.id);if(!o){o={id:'fire:'+p.id,_sharedObject:p.id,type:'camp',name:'Log fire',cooking:true,sprite:7,dead:0,walkThrough:true};objects.push(o);if(worldScenes[currentScene].objects!==objects)worldScenes[currentScene].objects.push(o);}if(currentScene==='tutorial'){const nell=tutorialTutor('fishing');if(nell&&Math.hypot(p.x-nell.x,p.y-nell.y)<=6)o.tutorialRole='fishing-fire';}Object.assign(o,{x:p.x,y:p.y,homeX:p.x,homeY:p.y,drawX:p.x,drawY:p.y,logType:p.logType,expiresAt:p.expiresAt-sharedOffset});
  }
 }
}
const sharedAttackBefore=performAttack;
performAttack=function(o){if(!questFightVisible(o,s))return false;if(sharedFightClaimed(o)){if(target===o)stop();toast('Someone else is fighting that.');return false;}if(sharedLive()&&(!o._sharedReady||sharedScene!==currentScene)){toast('Waiting for the shared encounter…');return false;}if(sharedLive()&&(sharedNow()<sharedAttackReadyAt||sharedPending('attack')))return false;const result=sharedAttackBefore(o);if(result&&sharedLive()){sharedActionCache={kind:'combat',started:sharedNow(),duration:(playerAttackMotion.duration||1.4)*1000,style:playerAttackMotion.style,weapon:playerAttackMotion.weapon||null,target:{entity:String(o.id),x:o.x,y:o.y}};publishSharedAction(sharedActionCache);const swing=sharedTarget('attack',o,{style:playerAttackMotion.style,reserve:true});for(const hit of [...meleeImpacts,...projectiles])if(hit.o===o&&hit.sharedGeneration===undefined){hit.sharedGeneration=o._sharedGeneration;hit.sharedSwing=swing.id;}}return result;};
const sharedResolveBefore=resolveHit;
resolveHit=function(o,damage,style,slow,focus,generation,swing){if(!sharedLive())return sharedResolveBefore(o,damage,style,slow,focus);if(!questFightVisible(o,s))return;if(sharedFightClaimed(o)){if(target===o)stop();toast('Someone else is fighting that.');return;}if(!o._sharedReady||o._sharedDeadUntil||generation!==undefined&&generation!==o._sharedGeneration)return;const spirit=style==='worship'&&spiritEffect?.ids?{spirits:spiritEffect.ids,cast:spiritEffect.sharedCast??=(Date.now().toString(36)+'-spirit-'+(++sharedSequence))}:{};sharedTarget('hit',o,{style,focus,...spirit,...(swing?{id:swing+'-hit',swing}:{})});};
const sharedEnemyHitBefore=applyEnemyHit;
applyEnemyHit=function(o,hit){if(!sharedLive())return sharedEnemyHitBefore(o,hit);if(o._sharedOwner===sharedActor&&!sharedPending('enemyHit',o.id))sharedTarget('enemyHit',o,{style:o.attackVisualStyle||o.attackStyle||'melee'});};
const sharedMonsterDropBefore=monsterDrop;
monsterDrop=function(o){if(sharedLive()&&sharedApplying)return;return sharedMonsterDropBefore(o);};
const sharedAIBefore=updateEncounterAI;
updateEncounterAI=function(dt){if(sharedLive()){const o=activeEncounter?.o||target;if(o&&fighter(o)&&(!o._sharedReady||o._sharedOwner!==sharedActor)){if(activeEncounter&&(activeEncounter.scene!==currentScene||o.hp<=0||o.dead>time||Math.hypot(px-o.homeX,py-o.homeY)>(o.encounter?16:11)||Math.hypot(px-o.x,py-o.y)>18)){if(target===o)stop();resetEncounter(false);}if(activeEncounter){activeEncounter.phase=o._sharedPhase||0;activeEncounter.hazards=o._sharedHazard&&sharedNow()<o._sharedHazard.due?[sharedLocalHazard(o,o._sharedHazard)]:[];}renderEncounterHud();mountainTickWork(dt);return;}}return sharedAIBefore(dt);};
const sharedHarvestBefore=harvestResource;
harvestResource=function(o){if(!sharedLive())return sharedHarvestBefore(o);if(!o._sharedReady||sharedPending('harvest',o.id))return false;const d=resourceDefinition(o),tool=o.type==='tree'?'axe':o.type==='ore'?'pickaxe':d?.tool;if(!d||!resourceRequirement(o)||!useBeltTool(tool)||d.bait&&!(s.bag[d.bait]>0)||!canCarry(d.item||d.raw)){stop();return false;}sharedTarget('harvest',o);return true;};
const sharedDoorBefore=setWalkInDoor;
setWalkInDoor=function(o,open,restoring=false){if(!sharedLive()||restoring||sharedApplying)return sharedDoorBefore(o,open,restoring);if(!sharedPending('door',o.id))sharedTarget('door',o,{open});};
const sharedDropBefore=groundDrop;
groundDrop=function(items,x=s.x,y=s.y,scene=currentScene,protectedDrop=false){if(!sharedLive()||protectedDrop||sharedLocalDrop||sharedApplying)return sharedDropBefore(items,x,y,scene,protectedDrop);sharedQueue('drop',{items:{...items},x,y,scene});return {type:'loot',items:{...items},x,y,scene};};
const sharedLightBefore=lightLog;
lightLog=function(...args){sharedLocalDrop=true;try{return sharedLightBefore(...args);}finally{sharedLocalDrop=false;}};
function publishSharedFire(action){sharedQueue('fire',{x:action.x,y:action.y,log:ITEMS[action.id].logType,item:action.id});}
const sharedTakeBefore=takeGroundItem;
takeGroundItem=function(pile,id,limit=Infinity){if(!sharedLive()||!pile._sharedObject)return sharedTakeBefore(pile,id,limit);if(sharedPending('pickup'))return false;const n=Math.min(pile.items[id]||0,limit,STACKABLE.has(id)?(canCarry(id)?Infinity:0):bagSpaceFor(id));if(!n){toast('Your inventory is full.');return false;}sharedQueue('pickup',{object:pile._sharedObject,item:id,count:n});return false;};
function requestSharedTeleport(mode,destination,start){if(sharedPending('teleport'))return false;close();stop();sharedQueue('teleport',{mode,destination},r=>{if(!r.ok)return;sharedPermit=true;try{start();}finally{sharedPermit=false;}});return true;}
const sharedHuntBefore=beginHuntsmanTeleport;
beginHuntsmanTeleport=function(kind,speaker){if(!sharedLive()||sharedPermit)return sharedHuntBefore(kind,speaker);const e=HUNT_ENCOUNTERS[kind];if(!e)return false;if(activeEncounter||time-Math.max(lastAttack,playerHitAt)<8){toast('Leave combat and wait eight seconds before teleporting.');return false;}return requestSharedTeleport('hunt',e.scene,()=>sharedHuntBefore(kind,speaker));};
const sharedHomeBefore=beginHomeTeleport;
beginHomeTeleport=function(){if(!sharedLive()||sharedPermit)return sharedHomeBefore();if(!homeTeleportReady())return false;return requestSharedTeleport('home','overworld',()=>sharedHomeBefore());};
const sharedRowanBefore=beginTutorialCrossing;
beginTutorialCrossing=function(...args){if(!sharedLive()||sharedPermit)return sharedRowanBefore(...args);return requestSharedTeleport('rowan','overworld',()=>sharedRowanBefore(...args));};
function sharedActionTarget(a){const o=a?.target?.entity&&worldIndex().byId.get(a.target.entity);return o&&questFightVisible(o,s)?{x:o.drawX??o.x,y:o.drawY??o.y}:a?.target;}
function sharedPeerGear(peer){const a=sharedVisibleAction(peer);if(!a)return {};const age=(sharedNow()-a.started)/1000,duration=a.duration/1000;if(age<0||age>duration+.25)return {};const started=time-age;
 if(a.kind==='combat')return {weapon:a.weapon===undefined?peer.equipment?.weapon:a.weapon,_attackAt:started,_attackStyle:a.style};
 if(a.kind==='teleport')return {_castAt:started,_castDuration:duration,_castColor:a.color==='purple'?'#b785f5':a.color==='red'?'#ff6464':'#a7e6e0'};
 if(a.kind==='gather')return {_peerAction:{gathering:{object:{type:a.type},tool:a.tool,phase:Math.min(.999,age/duration)}}};
 return {_peerAction:{work:{kind:a.work,started,duration,committed:age>duration*.7}}};
}
const sharedDrawPeersBefore=drawOnlinePlayers;
drawOnlinePlayers=function(mesh,labels){sharedDrawPeersBefore(mesh,labels);for(const peer of onlinePeers.values()){const a=sharedVisibleAction(peer);if(a?.kind!=='teleport'||sharedNow()-a.started>a.duration)continue;const color=a.color==='purple'?'#b785f5':a.color==='red'?'#ff6464':'#a7e6e0',r=groundedPainter(mesh,peer.drawX+.5,peer.drawY+.5);lairRing(r,peer.drawX+.5,peer.drawY+.5,.8,.025,color);for(let i=0;i<8;i++){const angle=time*2+i*Math.PI/4;oval3(r,peer.drawX+.5+Math.sin(angle)*.7,(time+i*.2)%1.8,peer.drawY+.5+Math.cos(angle)*.7,.04,.04,.04,color,p=>p,5);}}};

const sharedStopBefore=stop;
stop=function(){const a=playerAction;if(sharedLive()&&a?.kind==='firemaking'&&!a.committed&&a.pile?.items[a.id]>0){const count=a.pile.items[a.id];delete a.pile.items[a.id];s.groundLoot=(s.groundLoot||[]).filter(p=>p!==a.pile);sharedQueue('drop',{items:{[a.id]:count},x:a.x,y:a.y,scene:a.scene});}return sharedStopBefore();};
const sharedProjectileBefore=drawCombatProjectiles3;
drawCombatProjectiles3=function(mesh){sharedProjectileBefore(mesh);for(const peer of onlinePeers.values()){const a=sharedVisibleAction(peer);if(a?.kind!=='combat'||!a.target||!['ranged','magic'].includes(a.style))continue;const goal=sharedActionTarget(a),clip=rebuiltAvatars[peer.frame||'male']?.clips[a.style],age=(sharedNow()-a.started)/1000-(clip?.releaseAt||.35),duration=.28+Math.hypot(goal.x-peer.x,goal.y-peer.y)*.025;if(age<0||age>duration)continue;const t=age/duration,start=[peer.drawX+.5,1.3,peer.drawY+.5],end=[goal.x+.5,.6,goal.y+.5],tip=start.map((v,i)=>v+(end[i]-v)*t);tip[1]+=Math.sin(t*Math.PI)*.15;const r=groundedPainter(mesh,tip[0],tip[2]);if(a.style==='ranged'){const d=end.map((v,i)=>v-start[i]),length=Math.hypot(...d)||1,tail=tip.map((v,i)=>v-d[i]/length*.78);briarEmit(r,rangedItemMesh('arrows',true),arrowTransform(tail,tip,.75));}else{oval3(r,...tip,.10,.10,.10,'#b6e2db',p=>p,8);for(let i=1;i<=3;i++){const back=Math.max(0,t-i*.06),p=start.map((v,j)=>v+(end[j]-v)*back);oval3(r,...p,.04,.04,.04,'#9acac9',p=>p,5);}}}};

// Arrival-time presentation is separate from the authoritative simulation clock.
// Delayed or repeated snapshots cannot erase or restart an observed attack.
const sharedVisualActions=new Map(),sharedEffectIds=new Set();
let sharedActivityStream=null,sharedActivityScene=null,sharedActivityRetry=0,sharedActivityBackoff=250,sharedPublishedAction=null;
function rememberSharedAction(actor,action,serverTime=sharedNow()){
 if(!action)return;const key=action.kind+':'+action.started+':'+(action.style||action.type||action.work||action.color||''),old=sharedVisualActions.get(actor);
 if(old?.key===key||old&&action.started<old.originalStarted)return;
 const age=Math.max(0,serverTime-action.started);if(age>6000)return;
 sharedVisualActions.set(actor,{key,originalStarted:action.started,action:{...action,started:sharedNow()-Math.min(age,100)}});
 if(sharedVisualActions.size>128)sharedVisualActions.delete(sharedVisualActions.keys().next().value);
}
function sharedVisibleAction(peer){
 const cached=sharedVisualActions.get(peer.id);
 const action=cached&&sharedNow()-cached.action.started<cached.action.duration?cached.action:peer.action;
 return action;
}
function sharedEnemyPose(o,pose,generation,serverTime){
 const key=generation+':'+pose.attackAt;
 if(pose.attackAt>0&&o._sharedPoseKey!==key&&serverTime-pose.attackAt<6000){o._sharedPoseKey=key;o.attackAt=time-Math.min(.1,Math.max(0,(serverTime-pose.attackAt)/1000));}
 o.attackClip=pose.clip;o.attackMove=pose.move;o.attackVisualStyle=pose.style||o.attackStyle;o.attackWindup=pose.windup/1000;o.attackHeading=pose.heading;
}
function applySharedEffects(effects,serverTime){
 for(const e of effects){
  if(sharedEffectIds.has(e.id))continue;sharedEffectIds.add(e.id);
  if(sharedEffectIds.size>512)sharedEffectIds.delete(sharedEffectIds.values().next().value);
  if(e.actor===sharedActor&&e.kind!=='enemyAction'||serverTime-e.at>6000)continue;
  const phaseTarget=worldIndex().byId.get(String(e.entity||e.action?.target?.entity));if(e.kind!=='activity'&&phaseTarget&&!questFightVisible(phaseTarget,s))continue;
  if(e.kind==='activity'){rememberSharedAction(e.actor,e.action,serverTime);continue;}
  const o=worldIndex().byId.get(String(e.entity));if(!o||e.generation!==o._sharedGeneration)continue;
  if(e.kind==='enemyAction'){if(o._sharedOwner!==sharedActor)sharedEnemyPose(o,e.pose,e.generation,serverTime);o._sharedHazard=e.hazard;continue;}
  o._sharedCombatUntil=time+4;
  if(e.kind==='enemyHit'){
   const peer=onlinePeers.get(e.actor);if(peer){floating(e.dodged?'Dodged':e.damage?'−'+e.damage:'Blocked',peer.drawX,peer.drawY,e.damage?'#ffaba1':'#9caebd');peer.sharedHitUntil=Date.now()+3000;}
  }else if(e.kind==='hit'||e.kind==='companion'){
   floating(e.damage?'−'+e.damage:'Miss',o.drawX??o.x,o.drawY??o.y,e.damage?'#ffe0bb':'#9caebd');o.hitAt=time;
   if(e.revision>=(o._sharedRevision??-1)&&e.revision>=(o._sharedHPRevision??-1)){o.hp=e.hp;o._sharedHPRevision=e.revision;}
  }
 }
}
function sharedCombatVisible(o){return questFightVisible(o,s)&&(!!o._sharedTarget||time<(o._sharedCombatUntil||0));}
function publishSharedAction(action){
 if(!sharedLive()||!action||typeof EventSource==='undefined')return;
 const key=action.kind+':'+action.started+':'+(action.style||action.type||action.work||action.color||'');if(key===sharedPublishedAction)return;sharedPublishedAction=key;
 // This request deliberately does not wait for an in-flight world poll or save.
 fetch('/api/activity',{method:'POST',signal:AbortSignal.timeout(4000),headers:{'Content-Type':'application/json'},body:JSON.stringify({scene:currentScene,x:px,y:py,action})}).catch(()=>{});
}
function ensureSharedActivityStream(){
 if(typeof EventSource==='undefined')return;
 if(sharedActivityScene!==currentScene||!sharedLive()||document.hidden){sharedActivityStream?.close();sharedActivityStream=null;sharedActivityScene=currentScene;sharedVisualActions.clear();sharedEffectIds.clear();}
 if(sharedActivityStream||!sharedLive()||document.hidden||Date.now()<sharedActivityRetry)return;
 const scene=currentScene,stream=new EventSource('/api/activity?scene='+encodeURIComponent(scene));sharedActivityStream=stream;
 stream.onmessage=event=>{if(scene!==currentScene||!sharedLive()||document.hidden){stream.close();if(sharedActivityStream===stream)sharedActivityStream=null;return;}try{const packet=JSON.parse(event.data);if(packet.scene===scene){sharedActivityBackoff=250;applySharedEffects(packet.effects,packet.serverTime);}}catch{}};
 stream.onerror=()=>{stream.close();if(sharedActivityStream!==stream)return;sharedActivityStream=null;const delay=sharedActivityBackoff;sharedActivityBackoff=Math.min(8000,delay*2);sharedActivityRetry=Date.now()+delay;setTimeout(ensureSharedActivityStream,delay);};
}

function sharedLocalHazard(o,h){return {...h,o,started:time-(sharedNow()-h.started)/1000,due:time+(h.due-sharedNow())/1000};}

function sharedCombatHazards(){return worldActors().filter(o=>o._sharedHazard&&!o._sharedDeadUntil&&Math.hypot(o.x-px,o.y-py)<30&&sharedNow()<o._sharedHazard.due).map(o=>sharedLocalHazard(o,o._sharedHazard));}
function sharedEncounterVisual(kind){
 if(!sharedLive())return activeEncounter;
 const o=worldActors().find(o=>o.encounter===kind&&!o._sharedDeadUntil);if(!o)return null;
 return {o,scene:currentScene,phase:o._sharedPhase||0,hazards:o._sharedHazard&&sharedNow()<o._sharedHazard.due?[sharedLocalHazard(o,o._sharedHazard)]:[]};
}
