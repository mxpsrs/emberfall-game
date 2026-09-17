'use strict';
// Enemy tiers are authored once. They never scale against the current player.
const ENEMY_TIERS={
 man:{level:1,hp:10,maxHit:1,interval:3.6,accuracy:.30},
 forestgiant:{name:'Forest Giant',look:'forestgiant',level:18,hp:34,maxHit:4,interval:3.8,weak:'magic',combatRadius:.7},
 ork:{name:'Ork',look:'ork',level:26,hp:46,maxHit:5,interval:3.5,weak:'magic',combatRadius:.45},
 warden:{name:'Crypt guard',level:12,hp:28,maxHit:3,interval:3.5},
 king:{name:'Ruins guardian',level:18,hp:48,maxHit:4,interval:3.5},
 sentinel:{name:'Ashwatch guardian',level:30,hp:68,maxHit:5,interval:3.5},
 rat:{level:1,hp:species.rat.hp,maxHit:1,interval:3.6,accuracy:.30},slime:{level:2,hp:6,maxHit:1,interval:3.5,accuracy:.36},
 wolf:{level:4,hp:10,maxHit:2,interval:3.3},goblin:{level:6,hp:14,maxHit:2,interval:3.2},
 skeleton:{level:10,hp:20,maxHit:3,interval:3.1},bandit:{level:12,hp:24,maxHit:3,interval:3.1},ridgewolf:{level:15,hp:28,maxHit:4,interval:3.1},
 thornwolf:{name:'Thornback wolf',look:'wolf',level:5,hp:12,maxHit:2,interval:3.3,weak:'magic',tint:[.75,1,.65]},
 slinger:{name:'Goblin slinger',look:'goblin',level:7,hp:15,maxHit:2,interval:3.4,style:'ranged',weak:'melee',tint:[1.2,1,.7]},
 brambleslime:{name:'Bramble slime',look:'slime',level:9,hp:18,maxHit:3,interval:3.5,style:'magic',weak:'ranged',tint:[.7,1.1,.6]},
 hexer:{name:'Goblin hexer',look:'goblin',level:13,hp:23,maxHit:3,interval:3.5,style:'magic',weak:'ranged',tint:[.85,.7,1.25]},
 cavecrawler:{name:'Cave crawler',look:'rat',level:16,hp:27,maxHit:4,interval:3.3,weak:'melee',size:2.15,tint:[.8,.9,1.15]},
 quarrybrute:{name:'Quarry brute',look:'goblin',level:20,hp:34,maxHit:4,interval:3.8,weak:'magic',size:1.45,tint:[1.1,.8,.7]},
 ironhideslime:{name:'Ironhide slime',look:'slime',level:25,hp:42,maxHit:5,interval:3.6,weak:'magic',size:1.2,tint:[.7,.85,1.1]},
 emberhound:{name:'Ember hound',look:'wolf',level:30,hp:49,maxHit:5,interval:3.1,style:'magic',weak:'ranged',size:1.2,tint:[1.25,.7,.45]},
 ironrevenant:{name:'Iron revenant',look:'skeleton',level:36,hp:58,maxHit:6,interval:3.4,weak:'magic',tint:[.75,.85,1.1]},
 moonstalker:{name:'Moonstalker',look:'wolf',level:42,hp:67,maxHit:7,interval:3.1,weak:'melee',size:1.3,tint:[.65,.9,1.25]},
 grovehexer:{name:'Grove hexer',look:'goblin',level:48,hp:76,maxHit:7,interval:3.6,style:'magic',weak:'ranged',tint:[.6,1.1,.85]},
 duskwraith:{name:'Dusk wraith',look:'skeleton',level:54,hp:86,maxHit:8,interval:3.5,style:'magic',weak:'ranged',tint:[.9,.6,1.25]},
 ashknight:{name:'Ashen knight',look:'skeleton',level:60,hp:96,maxHit:9,interval:3.4,weak:'magic',size:1.15,tint:[1.15,.65,.5]},
 crystalguard:{name:'Crystal guardian',look:'king',level:66,hp:108,maxHit:10,interval:3.8,style:'ranged',weak:'melee',size:.8,tint:[.65,1.1,1.2]}
};
// A boss is released only after its approved native model, actions and lair pass review.
// The four designs are approved; unreleased entries never spawn or expose empty lairs.
const HUNT_ENCOUNTERS={
 veyr:{name:'Veyr the Mindbreaker',look:'boss_veyr',released:true,combatRadius:.7,mechanics:true,rank:'Boss',level:20,hp:78,maxHit:5,coins:70,marks:3,scene:'lair_veyr',at:[22,18],area:'The Shattered Sanctum',weak:'ranged',phases:[{name:'Borrowed authority',at:1,moves:['memoryCall','sweep']},{name:'Fractured trust',at:.66,moves:['falseRefuge','memoryCall']},{name:'The stolen self',at:.33,moves:['stolenSelf','falseRefuge','memoryCall']}],rareDrops:{veyrOrb:250},drops:{bones:3,chaosRunes:12,ironBar:2}},
 varkesh:{name:'Varkesh the Blightwing',look:'boss_varkesh',released:true,combatRadius:2.1,lockAttackHeading:true,interval:4.3,attackLabel:'Fangs and blighted breath',rank:'Boss',level:30,hp:108,maxHit:6,coins:105,marks:3,scene:'lair_varkesh',at:[29,21],area:'Blightwing Roost',weak:'magic',style:'ranged',drops:{bones:3,steelBar:2,chaosRunes:15}},
 colossus:{name:'Runeforged Colossus',look:'boss_colossus',released:true,anchored:true,combatRadius:2.2,mechanics:true,rank:'Boss',level:42,hp:158,maxHit:8,coins:155,marks:4,scene:'lair_colossus',at:[23,18],area:'The Crystal Crucible',weak:'magic',phases:[{name:'Crystalbound',at:1,moves:['sweep','shot','hex']},{name:'Crimson Overload',at:.5,speed:.75,moves:['sweep','shot','hex']}],drops:{mithrilBar:2,deathRunes:15}},
 xalith:{name:'Xalith the Broodmother',look:'boss_xalith',released:true,combatRadius:1.05,rank:'Boss',level:62,hp:236,maxHit:11,coins:240,marks:5,scene:'lair_xalith',at:[27,20],area:'The Brood Hollow',weak:'melee',style:'melee',drops:{adamantBar:2,bloodRunes:15}}
};
const HUNT_FIELD_NOTES={
 "veyr": {
  "origin": "The Wardkeepers held Veyr beneath Ironhollow. The forged orders, sabotaged mine and altered shrine memories lead to that prison.",
  "tactics": "Follow the solid ground warnings, not the voices. Complete the counter-ward preparations with Alaric for assistance in the story encounter."
 },
 "varkesh": {
  "origin": "Varkesh nests above the abandoned Ashwatch galleries. The scorched watch camp and exposed ascent mark the route into its roost.",
  "tactics": "Its breath follows a committed facing. Step sideways out of the green cone; range alone will not keep you safe."
 },
 "colossus": {
  "origin": "A foundry sentinel remains bound to the Crystal Crucible. Runeforged refers to the inscriptions cut into its frame, not spell currency: Veldren mages consume Relics.",
  "tactics": "The Colossus stays anchored. Leave the cleave circle and marked impact spots. Below half health, Crimson Overload shortens its attack intervals."
 },
 "xalith": {
  "origin": "The root caverns below Moonwillow shelter Xalith and her amber nursery. The nesting chambers are an inhabited lair, not a sealed treasure room.",
  "tactics": "The Broodmother closes for melee attacks. Watch the scythe strike, keep room to retreat, and bring food suited to a long fight."
 }
};
function encounterReleased(kind){const e=HUNT_ENCOUNTERS[kind];return !!(e?.released&&creatureAssets[e.look]?.source);}
const HUNT_ZONES=[
 {name:'Elderwood fringe',at:[69,117],kinds:['thornwolf','slinger','brambleslime']},
 {name:'Pinewatch trails',at:[193,36],kinds:['hexer','cavecrawler','quarrybrute']},
 {name:'Khaz-Dur foothills',at:[633,177],kinds:['ironhideslime','emberhound','ironrevenant']},
 {name:'Sylvaran border groves',at:[333,489],kinds:['moonstalker','grovehexer','duskwraith']},
 {name:'Deepforge slag fields',at:[933,363],kinds:['ashknight','crystalguard']}
];
const ENCOUNTER_MOVES={
 memoryCall:{name:'Borrowed command',style:'magic',shape:'circle',windup:2.6,radius:1.6,hint:'Leave the solid marked circle; the voice is false',voice:'Rellan: “Hold your position. That is an order.”'},
 falseRefuge:{name:'False refuge',style:'magic',shape:'ring',windup:2.8,radius:4.6,inner:2.1,origin:'enemy',hint:'The solid ring is dangerous. Move inside or beyond it',voice:'Bera: “Stay in the shining ring. It is safe.”'},
 stolenSelf:{name:'Stolen self',style:'magic',shape:'cross',windup:2.7,radius:.8,length:6,hint:'Step diagonally off both solid lines; follow the real shadow',voice:'Your own voice: “I remember this. Do exactly what I do.”'},
 bite:{name:'Strike',style:'melee',shape:'strike',windup:.55,range:1.65,hint:'Melee attack'},
 arrow:{name:'Arrow',style:'ranged',shape:'projectile',windup:.7,range:6,hint:'Ranged attack'},
 blight:{name:'Blighted breath',style:'ranged',shape:'cone',windup:2.1,length:9.4,halfAngle:.34,hint:'Step sideways out of the green cone'},
 spell:{name:'Spell',style:'magic',shape:'projectile',windup:.85,range:6,hint:'Magic attack'},
 sweep:{name:'Sweeping blow',style:'melee',shape:'circle',windup:1.8,radius:2.5,origin:'enemy',hint:'Step outside the circle'},
 pounce:{name:'Pounce',style:'melee',shape:'line',windup:1.8,radius:.85,hint:'Step aside from the marked path'},
 shot:{name:'Volley',style:'ranged',shape:'circle',windup:1.6,radius:1.15,hint:'Move away from the marked spot'},
 hex:{name:'Arcane eruption',style:'magic',shape:'circle',windup:1.9,radius:1.55,hint:'Move away from the marked spot'},
 ring:{name:'Expanding ring',style:'magic',shape:'ring',windup:2.3,radius:4.4,inner:1.8,origin:'enemy',hint:'Move close or beyond the outer ring'},
 cross:{name:'Crossfire',style:'ranged',shape:'cross',windup:2.1,radius:.75,length:5,hint:'Step off both marked lines'}
};
let activeEncounter=null,encountersReady=false,encounterHealClock=0,encounterHudKey='';
ITEMS.huntersMark={name:'Hunter’s mark',icon:11,desc:'Earned from minibosses and bosses. Trade marks for equipment in the Hunts panel.'};STACKABLE.add('huntersMark');
function huntProgress(){const p=s.combatProgress=s.combatProgress||{};p.kills=p.kills||{};p.firstClears=p.firstClears||{};return p;}
const durationBeforeEncounters=actionDuration;
// Opposed attack/defence rolls for every enemy, including bosses and civilians.
// Enemy stats are fixed by their tier, never by the current player's level.
playerAccuracy=function(o,style=combatStyle()){
 const skill={melee:'Attack',ranged:'Ranged',magic:'Magic',worship:'Worship'}[style]||'Attack',focus=trainingFocus(style);
 const bonus=style==='magic'?equipmentBonus('magicAccuracy')+(s.equipment.weapon==='veyrOrb'&&o._memoryFrayUntil>time?ITEMS.veyrOrb.memoryFray:0):style==='ranged'?(equippedWeapon().attackBonus||0)+equipmentBonus('rangedAccuracy'):style==='worship'?equipmentBonus('worshipAccuracy'):equipmentBonus('attackBonus');
 const stance=style==='melee'?(focus==='accurate'?3:focus==='balanced'?1:0):focus==='focused'?3:0;
 const attack=(lv(skill)+8+stance)*Math.max(1,bonus+64+(['ranged','magic'].includes(style)&&Math.hypot(o.x-px,o.y-py)>=3?spiritBuild(s,lv('Worship')).aim:0)),defenceStyle=style==='worship'?'magic':style;
 const weak=(o.weak||HUNT_ENCOUNTERS[o.kind]?.weak)===defenceStyle;
 const defense=((o.defenseLevel??o.level??1)+9)*Math.max(1,64+(o.defenseBonuses?.[defenceStyle]||0))*(weak?.8:1);
 return attackRollChance(attack,defense);
};
enemyAccuracy=function(o,style='melee'){
 const focus=trainingFocus(),stance=focus==='defensive'?3:focus==='balanced'?1:0;
 const level=style==='magic'?lv('Magic')*.7+lv('Defense')*.3:lv('Defense');
 const armor=style==='magic'?Math.max(0,equipmentBonus('magicAccuracy'))+equipmentBonus('magicDefense'):equipmentBonus('armor');
 const defense=(level+8+stance)*(64+armor+spiritBonus('armor'));
 const attack=((o.attackLevel??o.level??1)+8)*(64+(o.attackBonus||0))*(o.accuracy===undefined?1:o.accuracy/.53);
 return attackRollChance(attack,defense);
};
actionDuration=function(o){return fighter(o)?.6*(combatStyle()==='magic'?5:equippedWeapon().attackTicks||4):durationBeforeEncounters(o);};
function enemyDamage(o,style='melee',special=false){
 if(Math.random()>=enemyAccuracy(o,style))return 0;
 const max=o.maxHit??Math.max(1,(o.atk||0)+(o.spread||0));
 return spiritGuard(s,lv('Worship'),Math.floor(Math.random()*(max+1)));
}
function applyEnemyTier(o,row){
 const hp=o.hp>0?Math.min(1,o.hp/(o.maxhp||o.hp)):1,level=Math.max(1,row.level||1);
 Object.assign(o,row,{maxhp:row.hp,hp:Math.max(1,Math.ceil(row.hp*hp)),atk:row.maxHit,spread:0,defenseLevel:row.defenseLevel??Math.max(1,Math.floor(level*.65)),attackLevel:row.attackLevel??Math.max(1,Math.floor(level*.7)),attackStyle:row.style||'melee'});
 if(row.look){o.creatureLook=row.look;MONSTER_ART[o.kind]=MONSTER_ART[row.look]||MONSTER_ART[creatureAssets[row.look]?.base];}
}
function encounterSpawnPoint(scene,x,y,radius=12,allowPlinth=false){
 const saved=currentScene;currentScene=scene;const world=worldScenes[scene],[w,h]=sceneSize();
 const free=(a,b)=>a>2&&b>2&&a<w-3&&b<h-3&&!worldWall(a,b)&&!water(a,b)&&!lairDecorBlocked(scene,a,b,allowPlinth)&&!world.buildings.some(o=>a>=o.x-2&&a<=o.x+o.w+2&&b>=o.y-2&&b<=o.y+o.h+2)&&!world.objects.some(o=>Math.hypot(a-o.x,b-o.y)<1.5);
 try{for(let r=0;r<=radius;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r&&free(x+dx,y+dy))return [x+dx,y+dy];return null;}finally{currentScene=saved;}
}
function setupEncounters(){
 if(encountersReady)return;encountersReady=true;let serial=4700000;
 for(const [scene,world]of Object.entries(worldScenes))for(const o of world.objects){
  if(!fighter(o)||o.kind==='dummy')continue;
  const row=ENEMY_TIERS[o.kind]||{level:Math.max(1,o.level||1),hp:o.maxhp||o.hp||10,maxHit:o.maxHit??Math.max(1,Math.ceil((o.level||1)/7)),interval:o.interval||3.6};applyEnemyTier(o,row);if(['king','warden','sentinel'].includes(o.kind)){o.type='enemy';o.repeatable=true;}
  if(scene==='tutorial')continue;
  const encounter=HUNT_ENCOUNTERS[o.kind];if(encounter&&encounterReleased(o.kind)){applyEnemyTier(o,encounter);o.encounter=o.kind;o.repeatable=true;o._stationary=true;o.type=encounter.rank==='Boss'?'boss':'enemy';}
 }
 const spawnOne=(kind,scene,x,y)=>{
  const row=HUNT_ENCOUNTERS[kind]||ENEMY_TIERS[kind];if(!row||row.look&&!creatureAssets[row.look])return null;const point=encounterSpawnPoint(scene,x,y,12,!!row.anchored);if(!point)return null;
  const [a,b]=point,o={id:serial++,kind,type:row.rank==='Boss'?'boss':'enemy',x:a,y:b,homeX:a,homeY:b,drawX:a,drawY:b,dead:0,attackAt:-100,hitAt:-100,coins:Math.max(4,Math.round(row.level*1.6)),sprite:species[row.look]?.sprite||11};
  applyEnemyTier(o,row);if(row.rank){o.encounter=kind;o.repeatable=true;o._stationary=true;}worldScenes[scene].objects.push(o);return o;
 };
 for(const zone of HUNT_ZONES)zone.kinds.forEach((kind,i)=>{for(let n=0;n<3;n++)spawnOne(kind,'overworld',zone.at[0]+i*7+(n%2)*3,zone.at[1]+Math.floor(n/2)*6);});
 for(const [kind,e]of Object.entries(HUNT_ENCOUNTERS))if(encounterReleased(kind)&&worldScenes[e.scene]&&!worldScenes[e.scene].objects.some(o=>o.kind===kind))spawnOne(kind,e.scene,...e.at);
 if(creatureAssets.forestgiant)for(const point of FOREST_GIANT_HABITAT.spawns){const giant=spawnOne('forestgiant','overworld',...point);if(giant)giant.habitat='elderwood';}
 if(creatureAssets.ork&&worldScenes.ork_warrens)for(const point of CREATURE_LAIRS.ork_warrens.spawns)spawnOne('ork','ork_warrens',...point);
 // Stable, separate IDs keep new dungeon populations from renumbering bosses.
 serial=6400000;
 for(const [scene,lair]of Object.entries(CREATURE_LAIRS))if(lair.approach&&worldScenes[scene]){
  for(const [i,[x,y]]of lair.approach.stations.entries())for(const side of [-1,1]){
   const guard=spawnOne(lair.approach.guards[i],scene,x+side*3,y-4);
   if(guard){guard.dungeonGuard=true;guard.homeX=guard.x;guard.homeY=guard.y;}
  }
 }
 realmNavigation.clear();objects.splice(0,objects.length,...worldScenes[currentScene].objects);huntProgress();
}
const villageBeforeEncounters=setupTutorialVillage;
setupTutorialVillage=function(){villageBeforeEncounters();setupEncounters();};
function resetEncounter(recover=true){
 const fight=activeEncounter,o=fight?.o;
 if(o){delete o._inCombat;delete o.enraged;delete o.attackRecovery;delete o.attackWindup;delete o.attackMove;delete o.attackHeading;o.attackAt=-100;
  if(recover&&o.hp>0&&o.dead<=time){o._returning=true;o._recovering=true;o._returnPath=null;o._recoverClock=0;o._returnAt=time;}
 }
 activeEncounter=null;encounterHudKey='';const hud=$('encounterHud');if(hud)hud.hidden=true;
}
function updateEnemyRecovery(dt){
 for(const o of worldActors()){if(!o._recovering||o._inCombat||o._sharedReady&&typeof sharedLive==='function'&&sharedLive()&&o._sharedOwner!==sharedActor)continue;if(o.hp<=0||o.dead>time){delete o._recovering;delete o._returning;continue;}
  if(o._returning&&Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)<.03){
   if(o.x===o.homeX&&o.y===o.homeY){delete o._returning;o._returnPath=null;}
   else if(time>=o._returnAt){
    if(!o._returnPath?.length)o._returnPath=route(o.homeX,o.homeY,false,1.45,o.x,o.y,o);
    const step=o._returnPath?.shift();if(step&&land(...step)&&trainingRatCanMove(o,...step)){[o.x,o.y]=step;o._returnAt=time+.15;}else{o._returnPath=null;o._returnAt=time+.8;}
   }
  }
  o._recoverClock=(o._recoverClock||0)+dt;if(o._recoverClock>=5){const ticks=Math.floor(o._recoverClock/5);o._recoverClock-=ticks*5;if(!o._sharedReady)o.hp=Math.min(o.maxhp,o.hp+ticks);}
  if(o.hp>=o.maxhp&&!o._returning)delete o._recovering;
 }
}
function beginEncounter(o){
 if(!fighter(o)||o.kind==='dummy'||o.hp<=0||o.dead>time)return;
 if(activeEncounter?.o===o)return;
 resetEncounter();delete o._returning;delete o._recovering;o._returnPath=null;delete o.enraged;delete o.attackRecovery;o._inCombat=true;activeEncounter={o,scene:currentScene,phase:0,move:0,nextAttack:time+(o.encounter?2.5:o.interval||3.2),nextMove:time,started:time,hazards:[]};encounterHealClock=0;
}
const attackBeforeEncounters=performAttack;
performAttack=function(o){const ok=attackBeforeEncounters(o);if(ok)beginEncounter(o);return ok;};
const arriveBeforeEncounters=arrive;
arrive=function(){arriveBeforeEncounters();if(target&&fighter(target)&&inAttackRange(target))performAttack(target);};
const sceneBeforeEncounters=activateScene;
activateScene=function(...args){const previous=currentScene,result=sceneBeforeEncounters(...args);if(previous!==currentScene)resetEncounter();return result;};
function hazardContains(h,x,y){
 const dx=x-h.x,dy=y-h.y,d=Math.hypot(dx,dy);
 if(h.shape==='projectile')return Math.hypot(x-h.fromX,y-h.fromY)<=h.range+1;
 if(h.shape==='strike')return Math.hypot(x-(h.o.drawX??h.o.x),y-(h.o.drawY??h.o.y))<=1.8+(h.o.combatRadius||0);
 if(h.shape==='cone'){
  const vx=x-h.fromX,vy=y-h.fromY,range=Math.hypot(vx,vy);
  return range<=h.length&&(range<.01||(vx*Math.sin(h.heading)+vy*Math.cos(h.heading))/range>=Math.cos(h.halfAngle));
 }
 if(h.shape==='ring')return d>=h.inner&&d<=h.radius;
 if(h.shape==='cross')return Math.abs(dx)<=h.radius&&Math.abs(dy)<=h.length||Math.abs(dy)<=h.radius&&Math.abs(dx)<=h.length;
 if(h.shape==='line'){const ax=h.x-h.fromX,ay=h.y-h.fromY,length=ax*ax+ay*ay,t=length?Math.max(0,Math.min(1,((x-h.fromX)*ax+(y-h.fromY)*ay)/length)):0;return Math.hypot(x-h.fromX-t*ax,y-h.fromY-t*ay)<=h.radius;}
 return d<=h.radius;
}
function scheduleEnemyMove(fight,key){
 const o=fight.o,definition=HUNT_ENCOUNTERS[o.encounter],speed=definition?.phases?.[fight.phase]?.speed||1,move={...ENCOUNTER_MOVES[key]};
 o.attackClip=o.kind==='forestgiant'?['attack','attack2','attack3'][fight.move%3]:null;
 if(o.kind==='forestgiant')move.windup=1;
 if(o.encounter==='colossus'){
  Object.assign(move,key==='sweep'?{name:'Crystal cleave',radius:4.2}:key==='shot'?{name:'Crystal barrage'}:{name:'Runic eruption'});
  o.attackRecovery=1.35*speed;
 }
 if(o.encounter==='veyr'){
  if(key==='sweep')Object.assign(move,{name:'Orb strike',radius:3.2});
  o.attackClip=key==='sweep'?(fight.phase?'attack3':fight.move%4===0?'attack':'attack2'):key==='ring'?'cast2':'cast';
  o.attackRecovery=key==='sweep'?.85:1.0;
 }
 if(o.encounter==='varkesh'){
  if(key==='bite')Object.assign(move,{name:'Fang strike',shape:'cone',length:4.6,halfAngle:.78,windup:1.2,hint:'Move behind or away from its jaws'});
  o.attackClip=key==='bite'?'attack':'cast';o.attackRecovery=key==='bite'?.8:1.05;
 }
 if(o.encounter==='xalith'){
  Object.assign(move,{name:'Scythe cleave',shape:'circle',origin:'enemy',radius:3.2,windup:1.15,hint:'Step outside the circle'});
  o.attackClip=fight.move%2?'attack2':'attack';o.attackRecovery=.70;
 }
 move.windup*=speed;const near=move.origin==='enemy';
 const h={...move,key,o,x:near?(o.drawX??o.x):px,y:near?(o.drawY??o.y):py,fromX:o.drawX??o.x,fromY:o.drawY??o.y,started:time,due:time+move.windup};
 if(o.encounter==='varkesh'){h.heading=Math.atan2(h.x-h.fromX,h.y-h.fromY);o.attackHeading=h.heading;}
 fight.hazards.push(h);o.attackAt=time;o.attackMove=key;o.attackVisualStyle=move.style;o.attackWindup=move.windup;
 if(typeof playGameSound==='function')playGameSound(move.style==='magic'?'magic':move.style==='ranged'?'bow':'sword',o.x,o.y);
}
function updateEncounterAI(dt){
 updateEnemyRecovery(dt);
 if(!activeEncounter&&target&&fighter(target)&&target.kind!=='dummy'&&inAttackRange(target))beginEncounter(target);
 const fight=activeEncounter;if(!fight){
  if(!target&&!path.length&&time-Math.max(lastAttack,playerHitAt)>8&&s.hp<maxhp()){encounterHealClock+=dt;if(encounterHealClock>=5){encounterHealClock=0;s.hp=Math.min(maxhp(),s.hp+1);renderUI();save();}}else encounterHealClock=0;
  renderEncounterHud();return;
 }
 const o=fight.o,definition=HUNT_ENCOUNTERS[o.encounter];
 if(fight.scene!==currentScene||o.hp<=0||o.dead>time){resetEncounter(false);return;}
 if(Math.hypot(px-o.homeX,py-o.homeY)>(definition?16:11)||Math.hypot(px-o.x,py-o.y)>18){if(target===o)stop();resetEncounter();toast('You escaped. The enemy returns to its territory.');return;}
 if(definition?.mechanics){const phase=definition.phases.reduce((n,p,i)=>o.hp/o.maxhp<=p.at?i:n,0);if(phase!==fight.phase){fight.phase=phase;fight.move=0;fight.hazards=[];fight.nextAttack=time+2;o.attackAt=-100;delete o.attackMove;toast(o.name+' · '+definition.phases[phase].name);if(typeof playGameSound==='function')playGameSound('phase',o.x,o.y);}if(o.encounter==='colossus')o.enraged=phase===1;}
 for(const h of fight.hazards)if(h.key==='pounce'&&time>=h.started+h.windup*.6&&!blocked(Math.round(h.x),Math.round(h.y))&&lineOfSight(h.fromX,h.fromY,h.x,h.y)){
  const progress=Math.max(0,Math.min(1,(time-h.started-h.windup*.6)/(h.windup*.4)));o.x=Math.round(h.x);o.y=Math.round(h.y);o.drawX=h.fromX+(o.x-h.fromX)*progress;o.drawY=h.fromY+(o.y-h.fromY)*progress;
 }
 for(const h of fight.hazards.filter(h=>h.due<=time)){
  if(o.hp<=0||o.dead>time)break;
  if(hazardContains(h,px,py)&&lineOfSight(h.fromX,h.fromY,px,py))applyEnemyHit(o,enemyDamage(o,h.style,h.key!=='bite'));
  else if(!['strike','projectile'].includes(h.shape))floating('Dodged',px,py,'#b5e9c8');
 }
 if(activeEncounter!==fight)return;
 fight.hazards=fight.hazards.filter(h=>h.due>time);
 const distance=Math.hypot((o.drawX??o.x)-px,(o.drawY??o.y)-py),style=o.attackStyle||'melee',range=definition?.mechanics?1.6+(o.combatRadius||0):style==='melee'?1.5+(o.combatRadius||0):5.5;
 const recovering=o.encounter==='varkesh'&&time<(o.attackAt||0)+(o.attackWindup||0)+(o.attackRecovery||0);
 if(!definition?.anchored&&!recovering&&!fight.hazards.length&&distance>range&&time>=fight.nextMove&&Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)<.03){
  fight.nextMove=time+.35;const p=route(Math.round(px),Math.round(py),true,range,o.x,o.y,o);if(p?.length){[o.x,o.y]=p[0];}
 }
 if(time>=fight.nextAttack&&!fight.hazards.length&&lineOfSight(o.x,o.y,px,py)){
  let key=definition?.mechanics?definition.phases[fight.phase].moves[fight.move%definition.phases[fight.phase].moves.length]:style==='magic'?'spell':style==='ranged'?'arrow':'bite';
  if(o.encounter==='varkesh')key=distance<3.7?'bite':'blight';
  if(key==='bite'&&distance>1.7+(o.combatRadius||0)){if(definition?.mechanics)key=definition.phases[fight.phase].moves.find(k=>k!=='bite')||'shot';else return;}
  if(distance>10)return;
  scheduleEnemyMove(fight,key);fight.move++;fight.nextAttack=time+o.attackWindup+(definition?.mechanics?2.3*(definition.phases[fight.phase].speed||1):o.interval||3.2);
 }
 renderEncounterHud();
}
// Resolve the existing player projectiles/XP, then run fixed-stat enemy attacks.
updateCombat=function(dt){
 const due=meleeImpacts.filter(hit=>hit.due<=time);meleeImpacts=meleeImpacts.filter(hit=>hit.due>time);
 for(const hit of due){if(hit.o.dead>time||hit.o.hp<=0||Math.hypot((hit.o.drawX??hit.o.x)-px,(hit.o.drawY??hit.o.y)-py)>1.75+(hit.o.combatRadius||0)||!lineOfSight(px,py,hit.o.x,hit.o.y))continue;if(hit.enemy)applyEnemyHit(hit.o,hit.damage);else resolveHit(hit.o,hit.damage,'melee',0,hit.focus,hit.sharedGeneration,hit.sharedSwing);}
 updatePlayerProjectiles(dt);
 updateEncounterAI(dt);
};
const defeatBeforeEncounters=awardDefeat;
awardDefeat=function(o,style){
 const p=huntProgress();p.kills[o.kind]=(p.kills[o.kind]||0)+1;
 const first=!!o.encounter&&!p.firstClears[o.kind];if(first)p.firstClears[o.kind]=true;
 defeatBeforeEncounters(o,style);if(style==='ranged'&&o.penId&&o.kind==='rat')tutorialEvent('ranged');if(o.encounter){o.dead=time+60;o.respawnAt=Date.now()+60000;if(first&&o.encounter!=='veyr'){const coins=Math.round(o.level*4*1.4),banked=grantQuestCoins(coins);if(typeof showQuestCompletion==='function')showQuestCompletion({title:o.name,coins,banked,hunt:true,note:'First-clear bonus awarded. Collect your marks and other drops from the ground.'});}if(!first&&typeof playGameSound==='function')playGameSound('quest');}
 if(activeEncounter?.o===o)resetEncounter(false);save();
};
const lootBeforeEncounters=monsterDrop;
monsterDrop=function(o){
 const e=HUNT_ENCOUNTERS[o.encounter];if(e){const drops=Object.fromEntries(Object.entries(e.drops||{}).filter(([id])=>ITEMS[id])),point=e.anchored?encounterSpawnPoint(currentScene,o.homeX,o.homeY+4,6)||[s.x,s.y]:[o.x,o.y];for(const [id,denominator]of Object.entries(e.rareDrops||{}))if(Math.floor(Math.random()*denominator)===0)drops[id]=1;groundDrop({coins:e.coins,huntersMark:e.marks,...drops},...point);return;}
 if(ENEMY_TIERS[o.kind]?.look){const bonus=o.kind==='forestgiant'?{bones:2,logs:3}:o.attackStyle==='magic'?{runes:3+Math.floor(o.level/5),airRunes:5+o.level}:o.attackStyle==='ranged'?{arrows:5+Math.floor(o.level/3)}:{bones:1};groundDrop({coins:o.coins,...bonus},o.x,o.y);return;}
 lootBeforeEncounters(o);
};
function renderEncounterHud(){
 const box=$('encounterHud');if(!box)return;const f=activeEncounter;if(!f){box.hidden=true;return;}const o=f.o,e=HUNT_ENCOUNTERS[o.encounter],h=f.hazards[0];if(o.type!=='boss'&&!e?.mechanics){box.hidden=true;return;}
 const title=o.name+' · Lv. '+o.level,phase=e?.mechanics?e.rank+' · '+e.phases[f.phase].name:(e?e.rank+' · ':'')+(o.attackLabel||(o.attackStyle||'melee')+' attacks'),tell=h?h.name+' · '+h.hint:'',key=[title,phase,tell].join('|');
 box.hidden=false;if(key!==encounterHudKey){$('encounterName').textContent=title;$('encounterPhase').textContent=phase;$('encounterTell').textContent=tell;encounterHudKey=key;}
 $('encounterPhase').hidden=o.encounter!=='veyr';$('encounterTell').hidden=!h;box.dataset.casting=String(!!h);
 $('encounterHealth').style.width=Math.max(0,o.hp/o.maxhp*100)+'%';$('encounterHP').textContent=Math.max(0,o.hp)+' / '+o.maxhp;$('encounterCast').style.width=h?Math.min(100,(time-h.started)/(h.due-h.started)*100)+'%':'0%';box.dataset.style=h?.style||o.attackStyle||'melee';
}
function drawEncounterWarnings(){
 const hazards=typeof sharedLive==='function'&&sharedLive()?sharedCombatHazards():activeEncounter?.hazards||[];if(!hazards.length)return;ctx.save();
 const point=(x,y)=>project3(x+.5,.07+walkSurfaceHeight(x+.5,y+.5)-landHeight(x+.5,y+.5),y+.5);
 const line=(a,b,width)=>{const p=point(...a),q=point(...b);ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();};
 for(const h of hazards){if(h.shape==='strike')continue;if(h.shape==='projectile'){const t=Math.min(1,(time-h.started)/(h.due-h.started)),p=point(h.fromX+(h.x-h.fromX)*t,h.fromY+(h.y-h.fromY)*t);ctx.fillStyle=h.style==='magic'?'#bb94ee':'#e7c781';ctx.beginPath();ctx.arc(p.x,p.y-10,h.style==='magic'?5:3,0,Math.PI*2);ctx.fill();continue;}const color=h.style==='magic'?'#ba8fff':h.style==='ranged'?'#e7bb66':'#ee8c70';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=.5+.15*Math.sin(time*12);
  if(h.shape==='cone'){/* The lair renderer draws the exact ground sector. */}
  else if(h.shape==='line'){line([h.fromX,h.fromY],[h.x,h.y],Math.max(8,cameraZoom3()*h.radius));}
  else if(h.shape==='cross'){line([h.x-h.length,h.y],[h.x+h.length,h.y],Math.max(8,cameraZoom3()*h.radius));line([h.x,h.y-h.length],[h.x,h.y+h.length],Math.max(8,cameraZoom3()*h.radius));}
  else{ring3(ctx,h.x+.5,h.y+.5,color,h.radius);if(h.inner)ring3(ctx,h.x+.5,h.y+.5,color,h.inner);else{ctx.globalAlpha=.15;ctx.beginPath();for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,p=point(h.x+Math.cos(a)*h.radius,h.y+Math.sin(a)*h.radius);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.closePath();ctx.fill();}}
  ctx.globalAlpha=1;const p=point(h.x,h.y);label(Math.max(0,h.due-time).toFixed(1)+'s',p.x,p.y-8,color,12);
 }ctx.restore();
}
const drawBeforeEncounters=draw3d;
draw3d=function(){drawBeforeEncounters();drawEncounterWarnings();};
const HUNT_REWARDS=[['iron_weapon',3],['willowBow',3],['oakStaff',2],['steel_weapon',7],['steel_body',8],['mithril_weapon',16],['mithril_body',20],['adamant_weapon',28],['rune_weapon',40]];
let huntingGroundsOpen=false;
function huntSectionLink(label,grounds){const b=document.createElement('button');b.className='hunt-section';b.textContent=label;b.onclick=()=>{huntingGroundsOpen=grounds;panelPage=0;renderHunts();};$('panel').appendChild(b);}
function renderHunts(){
 const rows=Object.entries(HUNT_ENCOUNTERS).filter(([kind])=>encounterReleased(kind)).sort((a,b)=>a[1].level-b[1].level),p=huntProgress(),panel=$('panel');if(!rows.length||huntingGroundsOpen)return renderHuntingGrounds();pageControls(rows.length+1,3);
 panel.innerHTML='<div class="questhead"><h2>Hunter’s journal</h2><small>Combat '+combatLevel()+'</small></div><p class="desc">Choose your next challenge. Levels are recommendations. Bosses return after one minute.</p><div id="huntCards"></div>';
 for(const [kind,e]of pageItems([...rows,['rewards',null]],3)){
  const card=document.createElement('section');card.className='hunt-card';
  if(kind==='rewards'){card.innerHTML='<h3>Mark exchange</h3><p>'+(s.bag.huntersMark||0)+' marks carried · Earn more from named encounters.</p>';for(const [id,cost]of HUNT_REWARDS){if(!ITEMS[id])continue;const b=document.createElement('button');b.textContent=ITEMS[id].name+' · '+cost+' marks';b.disabled=(s.bag.huntersMark||0)<cost;b.onclick=()=>{if((s.bag.huntersMark||0)<cost||!canCarry(id)){toast('Bring enough marks and make space in your bag.');return;}s.bag.huntersMark-=cost;s.gear[id]=(s.gear[id]||0)+1;save();renderUI();};card.appendChild(b);}}
  else{card.innerHTML='<h3>'+e.name+'</h3><small>'+e.rank+' · Recommended Combat '+e.level+'</small><p>'+e.area+' · '+(e.mechanics?e.phases.length+' phases':(e.style||'melee')+' attacks')+'<br>Weak to '+e.weak+' · '+e.marks+' marks per clear</p><p class="hunt-clears">'+(p.kills[kind]||0)+' clears'+(kind==='veyr'?' · Orb: 1/250 every kill':p.firstClears[kind]?' · First-clear reward earned':' · First clear: '+Math.round(e.level*4*1.4)+' bonus coins')+'</p>';const b=document.createElement('button');b.textContent=currentScene==='tutorial'?'Available on the mainland':'Find encounter';b.disabled=currentScene==='tutorial';b.onclick=()=>{const scene=worldScenes[e.scene],o=scene.objects.find(o=>o.kind===kind);if(!o)return;if(currentScene!==e.scene){if(currentScene==='overworld'){const door=objects.find(o=>o.destination===e.scene);if(door){openGamePanel('hunts',true);select(door);return;}}toast('Return to the mainland to follow this hunt.');return;}openGamePanel('hunts',true);const point=encounterSpawnPoint(currentScene,Math.round(o.homeX),Math.round(o.homeY)+4,6);if(point)walkTo(...point);toast(e.name+' · Combat '+e.level+' recommended. Bring food.');};card.appendChild(b);const notes=HUNT_FIELD_NOTES[kind];if(notes){const read=document.createElement('button');read.textContent='Read field notes';read.onclick=()=>dialog(e.name,'<p>'+notes.origin+'</p><p><b>Approach:</b> '+notes.tactics+'</p><p>Ordinary loot falls on the ground. Collect it after the fight. Leaving or losing an encounter does not complete your private quest objectives.</p>');card.appendChild(read);}}
  $('huntCards').appendChild(card);
 }huntSectionLink('Browse ordinary hunting grounds',true);
}
function renderHuntingGrounds(){
 const grounds=[{name:'Elderwood giant grove',at:FOREST_GIANT_HABITAT.entry,kinds:['forestgiant']},...HUNT_ZONES];
 if(worldScenes.ork_warrens)grounds.splice(3,0,{name:'Ork Warrens',at:CREATURE_LAIRS.ork_warrens.entrance,kinds:['ork'],scene:'ork_warrens'});pageControls(grounds.length,3);
 $('panel').innerHTML='<div class="questhead"><h2>Hunting grounds</h2><small>Combat '+combatLevel()+'</small></div><p class="desc">Find creatures suited to your level. Their strength stays fixed as you improve. Bring food and collect drops from the ground.</p><div id="huntCards"></div>';
 for(const zone of pageItems(grounds,3)){
  const rows=zone.kinds.map(k=>ENEMY_TIERS[k]),low=Math.min(...rows.map(e=>e.level)),high=Math.max(...rows.map(e=>e.level)),card=document.createElement('section');card.className='hunt-card';card.innerHTML='<h3>'+zone.name+'</h3><small>Creature levels '+low+(high!==low?'–'+high:'')+'</small><p>'+rows.map(e=>e.name).join(' · ')+'</p>';
  const b=document.createElement('button');b.textContent=currentScene==='tutorial'?'Available on the mainland':'Find hunting ground';b.disabled=currentScene==='tutorial';b.onclick=()=>{if(currentScene!=='overworld'){toast('Return to the mainland to follow this trail.');return;}if(zone.scene){const door=objects.find(o=>o.destination===zone.scene);if(door){openGamePanel('hunts',true);select(door);}return;}const point=encounterSpawnPoint('overworld',...zone.at,12);if(point){openGamePanel('hunts',true);walkTo(...point);}};card.appendChild(b);$('huntCards').appendChild(card);
 }if(Object.keys(HUNT_ENCOUNTERS).some(encounterReleased))huntSectionLink('Bosses and mark exchange',false);
}
const panelBeforeEncounters=renderPanel;
renderPanel=function(){if(tab==='hunts')return renderHunts();return panelBeforeEncounters();};

// A memory fracture changes follow-up accuracy, never adds an unearned hit or XP.
const arcHitBefore=resolveHit;
resolveHit=function(o,damage,style,...rest){const orb=style==='magic'&&s.equipment.weapon==='veyrOrb',before=o.hp;const result=arcHitBefore(o,damage,style,...rest);if(orb&&o.hp<before)o._memoryFrayUntil=time+4;return result;};
