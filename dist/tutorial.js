'use strict';
// A village apprenticeship. Every task observes an actual player action.
const tutorialObject=role=>{const matches=(worldScenes.tutorial||worldScenes.overworld)?.objects.filter(o=>o.tutorialRole===role&&!o.collected)||[];return role==='rat'?matches.sort((a,b)=>Number(a.dead>time)-Number(b.dead>time)||Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py))[0]:matches[0];};
const tutorialTutor=role=>tutorialObject('tutor-'+role);
const lesson=(event,title,desc,role=null)=>({event,title,desc,point:()=>role?tutorialObject(role==='ore'&&s.bag.copperOre>0?'tin':role):null});
const TUTORIAL_VERSION=8;
const TUTORIAL_V7_EVENTS=["camera", "walk", "talk-guide", "talk-magic", "bag", "skills", "magic", "talk-mining", "ore", "smelt", "smith", "talk-combat", "equip-dagger", "combat-stats", "training-kit", "training-gear", "dummy", "monster", "ranged-kit", "ranged-gear", "ranged", "loot", "talk-woods", "tree", "talk-fishing", "fish", "fire", "cook-shrimp", "talk-cooking", "mix-dough", "bake-bread", "eat", "talk-bank", "deposit", "withdraw", "talk-worship", "bury", "spirit", "talk-finish"];
const TUTORIAL_V6_EVENTS=["camera", "walk", "talk-guide", "talk-magic", "bag", "skills", "magic", "talk-mining", "ore", "smelt", "smith", "talk-combat", "equip-dagger", "combat-stats", "training-kit", "training-gear", "dummy", "monster", "loot", "ranged-kit", "ranged-gear", "ranged", "talk-woods", "tree", "talk-fishing", "fish", "fire", "cook-shrimp", "talk-cooking", "mix-dough", "bake-bread", "eat", "talk-bank", "deposit", "withdraw", "talk-worship", "bury", "spirit", "talk-finish"];
const tutorialSteps=[
 lesson('camera','Look around','Swipe with one finger to turn the camera. Pinch to zoom. On a computer, drag the view or hold the arrow keys.'),
 lesson('walk','Take your first steps','Tap any clear ground and walk a few steps. Tap Run to travel faster; your energy recovers while walking or resting.'),
 lesson('talk-guide','Meet Elder Rowan','Rowan is in Firstlight Isle’s village square. He will explain the controls and introduce your tutors.','tutor-guide'),
 lesson('bag','Your belongings','Open Bag in the navigation bar. Tap a material to highlight it, then tap another item or a world target. Press and hold any item for Use and its other actions.'),
 lesson('skills','Your skills','Open the Skills tab. Each skill has its own level and XP, including Attack, Strength, Defense and Hitpoints.'),
 lesson('talk-magic','Find the magic tutor','Rowan sends you to Arcanist Elowen inside the magic school in the island’s southeast. Open the door and walk in.','tutor-magic'),
 lesson('magic','Cast your first spell','Equip Elowen’s staff using the Magic icon, then attack the practice dummy. Each spell uses relics and trains your Magic level.','magic-dummy'),
 lesson('talk-mining','Visit the smith','Elowen sends you to Smith Orin beside the island’s forge. He teaches both Mining and Smithing.','tutor-mining'),
 lesson('ore','Mine copper and tin','Mine one copper ore and one tin ore in the yard. Both rocks can be mined at level 1.','ore'),
 lesson('smelt','Smelt a bronze bar','Tap copper or tin ore in your bag, then tap the furnace. Choose the bronze bar recipe to combine both ores.','furnace'),
 lesson('smith','Work the metal','Tap your bronze bar, then tap the practice anvil. Choose Dagger in the smithing menu. Your bag stays visible as you work.','practice-forge'),
 lesson('talk-combat','Meet the combat tutor','Orin sends you to Captain Vale at the training yard.','tutor-combat'),
 lesson('equip-dagger','Equip your bronze dagger','Open Equipment, then tap the bronze dagger in the bag beside it to equip it.'),
 lesson('training-kit','A better practice weapon','Captain Vale will give you a wooden training sword and shield.','tutor-combat'),
 lesson('training-gear','Prepare for practice','Equip both the wooden training sword and wooden shield from your bag. Keep your bronze dagger; you made it yourself.'),
 lesson('dummy','Practice your attacks','With your wooden sword and shield equipped, tap the training dummy. Choose Attack, Strength, Defense or balanced training using the selector.','dummy'),
 lesson('monster','Enter the rat pen','Go through the gate beside Vale and defeat a giant rat inside the pen. The gate closes behind you. Tap Eat if your health gets low.','rat'),
 lesson('ranged-kit','Learn ranged combat','Return to Captain Vale for a shortbow and arrows. He will teach you to fight across the low fence.','tutor-combat'),
 lesson('ranged-gear','Equip your bow and arrows','Equip the shortbow, then equip the arrows in your ammunition slot. Arrows left in your bag cannot be fired.'),
 lesson('ranged','Shoot across the fence','Stand outside the rat pen and attack a giant rat with your shortbow. Stay within bow range. Low fences stop feet, but arrows and spells can pass over them. Defeat a rat to complete the lesson.','rat'),
 lesson('loot','Pick up the drops','Collect the coins and bones where the rat fell. Each tap takes the next item; keep the bones for Keeper Sera.'),
 lesson('talk-woods','Find the woodland tutor','Vale sends you to Forester Ash beside the timber yard to learn how to make camp.','tutor-woods'),
 lesson('tree','Cut your first log','Tap the marked tree. Your axe is carried with you; gathering trains Woodcutting.','tree'),
 lesson('talk-fishing','Follow Ash’s directions','Find Fisher Nell at Stillwater, just west of the village.','tutor-fishing'),
 lesson('fish','Net some shrimp','Tap the highlighted fishing spot. Your catch goes into your bag as raw food.','fish'),
 lesson('fire','Light a fire beside Nell','Stay beside Fisher Nell. Hold a log in your bag and choose Light fire on clear ground. If you need another log, chop the tree beside her.'),
 lesson('cook-shrimp','Cook with Nell','Tap raw shrimp in your bag to highlight it, then tap the fire you lit beside Nell. You will walk to that fire and cook one shrimp.','fishing-fire'),
 lesson('talk-cooking','Visit the village kitchen','Nell sends you to Cook Bram inside the kitchen on the island’s eastern lane. He will supply a new recipe.','tutor-cooking'),
 lesson('mix-dough','Mix your bread dough','Bram has given you flour and water. Tap the flour to highlight it, then tap the jug of water to mix bread dough.'),
 lesson('bake-bread','Bake at the range','Tap bread dough in your bag to highlight it, then tap the range inside the kitchen to bake bread.','range'),
 lesson('eat','Food for the road','Try Eat with your cooked bread or shrimp. Food restores health. If your health is full, keep that food for a fight.'),
 lesson('talk-bank','Visit the banker','Bram sends you to Banker Ada inside Firstlight Bank to the north. Open the bank door and walk inside.','tutor-bank'),
 lesson('deposit','Store a supply','Talk to Ada and open your bank. Deposit an item from your bag. Stored items persist with your character.','tutor-bank'),
 lesson('withdraw','Take it back','Withdraw an item from your bank. Worn equipment stays separate from stored supplies.','tutor-bank'),
 lesson('talk-worship','Meet the shrine keeper','Ada sends you to Keeper Sera at the shrine in the island’s southwest. She teaches remembrance and Worship.','tutor-worship'),
 lesson('bury','Honour the fallen','Tap bones in your bag to bury them for Worship XP. Sera can provide practice bones if you need them.'),
 lesson('talk-finish','Ready for the realm','Return to Rowan in the square. Finish your apprenticeship with him to teleport to Briarhaven on the mainland. You cannot return to this island.','tutor-guide')
];
const TUTORIAL_V2_EVENTS=['camera','walk','talk-guide','bag','skills','talk-woods','tree','fire','talk-fishing','fish','talk-cooking','cook','eat','talk-mining','ore','smelt','smith','talk-combat','gear','dummy','monster','loot','talk-bank','deposit','withdraw','talk-worship','bury','spirit','talk-magic','magic','talk-finish'];
const TUTORIAL_V5_EVENTS=["camera","walk","talk-guide","bag","skills","talk-woods","tree","talk-fishing","fish","fire","cook-shrimp","talk-cooking","mix-dough","bake-bread","eat","talk-mining","ore","smelt","smith","talk-combat","equip-dagger","combat-stats","training-kit","training-gear","dummy","monster","loot","ranged-kit","ranged-gear","ranged","talk-bank","deposit","withdraw","talk-worship","bury","spirit","talk-magic","magic","talk-finish"];
const TUTORIAL_V4_EVENTS=TUTORIAL_V5_EVENTS.filter(e=>!['ranged-kit','ranged-gear','ranged'].includes(e));
const TUTORIAL_V3_EVENTS=['camera','walk','talk-guide','bag','skills','talk-woods','tree','fire','talk-fishing','fish','talk-cooking','cook','eat','talk-mining','ore','smelt','smith','talk-combat','equip-dagger','combat-stats','training-kit','training-gear','dummy','monster','loot','talk-bank','deposit','withdraw','talk-worship','bury','spirit','talk-magic','magic','talk-finish'];

// Tutorial guidance is independent of the player's selected walking destination.
let tutorialRouteCache={key:'',at:-1,points:[]};
function tutorialGoal(){
 if(!inWorld()||!s.character||!tutorialStep()||Math.hypot(px-43,py-52)>95)return null;
 const step=tutorialStep();let goal=step.point();
 if(step.event==='fire')goal=!besideFishingTutor()?tutorialTutor('fishing'):Object.keys(s.bag).some(id=>s.bag[id]>0&&ITEMS[id]?.logType)?null:tutorialObject('fishing-tree');
 if(step.event==='loot')goal=(s.groundLoot||[]).filter(o=>o.scene===currentScene&&o.items.bones>0).sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py))[0]||null;
 if(typeof tutorialGuidanceWorldGoal==='function')goal=tutorialGuidanceWorldGoal(goal);
 if(!goal||goal.collected||goal.dead>time)return null;
 const inside=buildings.find(b=>b.walkIn&&withinWalkIn(b,px,py)),room=buildings.find(b=>b.walkIn&&(goal.interiorBuilding===b.service.destination||withinWalkIn(b,goal.x,goal.y)));
 const closed=inside&&inside!==room&&inside.service.openedAt===undefined?inside:room&&inside!==room&&room.service.openedAt===undefined?room:null;
 if(closed){const door=closed.service,[x,y]=doorApproach(door,closed===inside);return {...door,x,y,tutorialDoor:door};}
 return goal;
}
function tutorialGuideRoute(){
 const goal=tutorialGoal();if(!goal)return [];
 const key=[s.tutorial,s.x,s.y,goal.id??'loot',goal.x,goal.y,(s.openDoors||[]).join(',')].join(':');
 if(key===tutorialRouteCache.key&&time-tutorialRouteCache.at<.6)return tutorialRouteCache.points;
 const reach=fighter(goal)?attackRange():1.45,points=route(goal.x,goal.y,!goal.tutorialDoor&&goal.type!=='loot',reach)||[];
 tutorialRouteCache={key,at:time,points};return points;
}

let tutorialCameraStart=null,tutorialShownIndex=null;
const REMEMBERED_LESSONS=['fire','cook-shrimp','mix-dough','bake-bread','eat','bury','smelt','smith'];
function besideFishingTutor(){const nell=tutorialTutor('fishing');return inWorld()&&nell&&Math.hypot(px-nell.x,py-nell.y)<=6;}
function tutorialStep(){return Number.isInteger(s.tutorial)?tutorialSteps[s.tutorial]||null:null;}
function normalizeJourney(state,original=state){
 const previous=Math.max(0,Math.floor(Number(original?.tutorial)||0)),version=original?.tutorialVersion;
 const events=tutorialSteps.map(step=>step.event);
 const oldEvents=version===TUTORIAL_VERSION?events:version===7?TUTORIAL_V7_EVENTS:version===6?TUTORIAL_V6_EVENTS:version===5?TUTORIAL_V5_EVENTS:version===4?TUTORIAL_V4_EVENTS:version===3?TUTORIAL_V3_EVENTS:version===2?TUTORIAL_V2_EVENTS:null;
 // Record completed lesson identities before changing the sequence. Earlier
 // work stays complete even when its lesson now appears later in the journey.
 const completed=new Set([6,TUTORIAL_VERSION].includes(version)&&Array.isArray(original.tutorialCompleted)?original.tutorialCompleted.filter(event=>events.includes(event)):[]);
 for(const event of oldEvents?.slice(0,previous)||[])completed.add(event==='cook'?'cook-shrimp':event==='gear'?'equip-dagger':event);
 const finished=original?.tutorialReward===true||(oldEvents?previous>=oldEvents.length:previous>=14);
 state.tutorialCompleted=events.filter(event=>finished||completed.has(event));
 const next=events.findIndex(event=>!completed.has(event));
 state.tutorial=finished||next<0?events.length:next;
 if(!original?.starterGearVersion&&!state.tutorialReward&&state.tutorial<tutorialSteps.length){for(const id of ['bronzeSword','shortbow','oakStaff','leatherArmor','leatherBoots']){if(state.gear[id]>0)state.gear[id]--;for(const slot of Object.keys(state.equipment))if(state.equipment[slot]===id)state.equipment[slot]=null;}}
 state.starterGearVersion=1;state.tutorialVersion=TUTORIAL_VERSION;state.runEnabled=state.runEnabled===true;state.tutorialGifts=state.tutorialGifts&&typeof state.tutorialGifts==='object'&&!Array.isArray(state.tutorialGifts)?state.tutorialGifts:{};
 state.tutorialActions=Object.fromEntries(REMEMBERED_LESSONS.filter(event=>state.tutorialActions?.[event]===true).map(event=>[event,true]));
 state.runEnergy=Number.isFinite(state.runEnergy)?Math.max(0,Math.min(100,state.runEnergy)):100;
 state.bank=state.bank&&typeof state.bank==='object'&&!Array.isArray(state.bank)?state.bank:{};
 for(const key of Object.keys(state.bank))if(!ITEMS[key]||!Number.isFinite(state.bank[key])||state.bank[key]<1)delete state.bank[key];else state.bank[key]=Math.floor(state.bank[key]);
 for(const skill of ['Cooking','Firemaking'])state.xp[skill]=Math.max(0,Number(state.xp[skill])||0);
}
function tutorialEvent(event){
 if(!s.character||!tutorialStep()||typeof tutorialIslandReady!=='undefined'&&tutorialIslandReady&&currentScene!=='tutorial')return;
 if(event==='fire'&&!besideFishingTutor())return;
 if(event==='cook-shrimp'&&(!besideFishingTutor()||!s.tutorialActions?.fire))return;
 if(event==='smith'&&!(s.gear.bronze_dagger>0))return;
 if(REMEMBERED_LESSONS.includes(event)){s.tutorialActions??={};s.tutorialActions[event]=true;}
 if(tutorialStep().event!==event)return;
 if(event==='talk-finish'&&typeof beginTutorialCrossing==='function'&&currentScene==='tutorial'&&!tutorialCrossing?.committing)return beginTutorialCrossing();
 if(event==='monster'&&(!insideTrainingPen(px,py)||combatStyle()!=='melee'||typeof showValeLesson==='function'&&!s.tutorialGifts?.valeRatBriefed))return;
 if(event==='ranged'&&(insideTrainingPen(px,py)||combatStyle()!=='ranged'))return;
 if(event==='loot'&&!(s.bag.bones>0))return;
 if(event==='equip-dagger'&&s.equipment.weapon!=='bronze_dagger')return;
 if(event==='combat-stats'&&s.equipment.weapon!=='bronze_dagger')return;
 if(event==='ranged-kit'&&!s.tutorialGifts?.ranged)return;
 if(event==='ranged-gear'&&(combatStyle()!=='ranged'||!s.equippedAmmoCount))return;
 if(event==='training-kit'&&!s.tutorialGifts?.combat)return;
 if((event==='training-gear'||event==='dummy')&&(s.equipment.weapon!=='woodenSword'||s.equipment.shield!=='woodenShield'))return;
 s.tutorialCompleted??=[];if(!s.tutorialCompleted.includes(event))s.tutorialCompleted.push(event);
 s.tutorial++;while(tutorialSteps[s.tutorial]&&s.tutorialCompleted.includes(tutorialSteps[s.tutorial].event))s.tutorial++;stop();tutorialCameraStart=null;
 if(!tutorialStep()){
  const earned=!s.tutorialReward;if(earned){tutorialCompletionBanked=grantQuestCoins(21);s.tutorialReward=true;tutorialCompletionItems={};for(const id of ['bronzeSword','shortbow','oakStaff','leatherArmor','leatherBoots'])if(!(s.gear[id]>0||s.bank[id]>0)){s.bank[id]=(s.bank[id]||0)+1;tutorialCompletionItems[id]=1;}for(const [id,n]of Object.entries({arrows:84,runes:56,airRunes:168,fish:4})){s.bank[id]=(s.bank[id]||0)+n;tutorialCompletionItems[id]=n;}s.tutorialCasting=false;}
  if(typeof departTutorialIsland==='function')departTutorialIsland();
  if(typeof tutorialCrossing!=='undefined'&&tutorialCrossing)tutorialCrossing.earned=earned;else showTutorialArrival(earned);
 }
 renderTutorial();renderUI();save();
 if(tutorialStep()?.event==='equip-dagger'&&s.equipment.weapon==='bronze_dagger')tutorialEvent('equip-dagger');
 else if(s.tutorialActions?.[tutorialStep()?.event])tutorialEvent(tutorialStep().event);
}
let tutorialCompletionItems={},tutorialCompletionBanked=0;
function showTutorialArrival(earned){
 if(earned&&typeof showQuestCompletion==='function')showQuestCompletion({title:'The First Accord',coins:21,banked:tutorialCompletionBanked,items:tutorialCompletionItems,unlocks:['Briarhaven and the mainland'],note:'Equipment and supplies have been placed in your bank. Your carried belongings stay with you.'});
 dialog('Elder Rowan','<p>“You brought a signal, forged a blade, protected the stores and prepared your own supplies. You are ready to carry the First Accord. Keep what you made; Briarhaven needs people who can help one another.”</p><p>The crossing closes behind you. You are in Briarhaven now, on the mainland of Veldren. Firstlight Isle is beyond your reach. Find me in the square when you are ready; your next story starts here.</p>'+(earned?'<p><b>Bonus: 21 coins, plus a bronze sword, bow, leather armor, boots and extra food, arrows and relics in your bank.</b> Your worn items and bag stay with you.</p>':''));
}
function observeTutorialCamera(){
 if(tutorialStep()?.event!=='camera')return;
 if(!tutorialCameraStart){tutorialCameraStart={yaw:view3d.yaw,tilt:view3d.tilt};return;}
 if(Math.abs(view3d.yaw-tutorialCameraStart.yaw)>.16||Math.abs(view3d.tilt-tutorialCameraStart.tilt)>.12)tutorialEvent('camera');
}
function renderTutorial(){
 const step=tutorialStep();
 if(step&&tutorialShownIndex!==s.tutorial&&typeof tutorialGuidanceAction!=='function'&&typeof gameMessage==='function')gameMessage(step.title+': '+step.desc,{action:()=>guide()});
 tutorialShownIndex=s.tutorial;
}
function openTutorialPanel(which){openGamePanel(which);}
function guide(){
 const step=tutorialStep();if(!step)return;
 if(!inWorld()||Math.hypot(s.x-43,s.y-52)>90){dialog('Continue on Firstlight Isle','<p>Your tutors are on Firstlight Isle. Return to Rowan’s square to continue this lesson. Your belongings, levels and bank come with you.</p>',[['Return to the square',()=>{close();activateScene(worldScenes.tutorial?'tutorial':'overworld',42,51);renderTutorial();}],['Stay here',close]]);return;}
 if(step.event==='combat-stats'){openCombatStats();return;}
 if(['bag','skills','bury','fire','mix-dough','equip-dagger','training-gear','ranged-gear'].includes(step.event)&&!(step.event==='fire'&&tutorialGoal())){openTutorialPanel(step.event==='skills'?'skills':'bag');return;}
 let point=tutorialGoal();
 if(point){if(point.dead>time){toast('The practice target will be ready again shortly.');return;}engage(point.tutorialDoor||point);}
 else toast(step.event==='loot'?'Defeat another rat to find fresh drops.':'Follow the lesson above.');
}

const TUTORS={
 guide:{name:'Elder Rowan',at:[43,52],look:0,text:'Welcome to Firstlight Isle. The minimap moves you to a place when you tap it. Swipe with one finger to turn your view. The navigation bar opens your bag, equipment and skills. Tap a material to highlight it, then choose an item or a world target. Hold any item for Use and its other options. Start with Arcanist Elowen at the magic school in the southeast. She will teach you to cast your first spell.'},
 woods:{name:'Forester Ash',at:[28,49],look:2,text:'Trees supply logs and Woodcutting experience. Tap the tree beside me to cut a log, then carry it to Fisher Nell at Stillwater. She will show you how to light a fire and cook your first catch. There is another tree beside her if you need more logs.'},
 fishing:{name:'Fisher Nell',at:[28,63],look:1,text:'Tap the fishing ripples at the shore. Your net is already with you. Every catch trains Fishing. Stay beside me, light a fire with a log, and cook your shrimp while I watch. Chop the tree beside me if you need another log. Then visit Cook Bram inside the village kitchen east of the square for a new recipe.'},
 cooking:{name:'Cook Bram',at:[57,52],look:3,text:'Welcome to the village kitchen. Nell taught you to cook a catch over a fire; now we will bake bread. Take my flour and water. Select the flour, then tap the water to mix dough. Select the dough and use it on the range beside me to bake it. Try your food, then visit Banker Ada at Firstlight Bank north of the square.'},
 mining:{name:'Smith Orin',at:[68,43],look:0,text:'Elowen has shown you magic. Now mine copper and tin in my yard. The furnace combines them into bronze. At the anvil, work a bronze bar into a dagger. Better ores and recipes need higher levels. Mining and Smithing have separate levels. When you have made your dagger, Captain Vale will teach you to fight.'},
 combat:{name:'Captain Vale',at:[45,80],look:1,text:'First, equip the bronze dagger you forged. Then open Equipment and inspect your combat stats. I will give you a wooden sword and shield before we practise on the dummy. Attack improves melee accuracy, Strength raises its damage, Defense protects you and Hitpoints raises your health. Ranged and Magic train separately. After the dummy, go through the gate beside me and defeat a giant rat. The gate closes behind you when you enter or leave, and the rats stay inside. Collect its drops, then return to me for your shortbow and arrows. After your ranged lesson, visit Forester Ash at the timber yard northwest of the square.'},
 bank:{name:'Banker Ada',at:[56,68],look:3,text:'Welcome to Firstlight Bank. Your bag has limited space. The bank holds supplies and unworn equipment for later and saves them with your character. Deposit an item, then withdraw it. Afterward, visit Keeper Sera at the shrine south of the square.'},
 worship:{name:'Keeper Sera',at:[42,63],look:2,text:'Burying bones honours the fallen and trains Worship. Across Veldren, memorial shrines preserve the names and sacrifices that history might otherwise lose. Honor the remains you carried here, then return to Rowan in the square to complete the First Accord.'},
 magic:{name:'Arcanist Elowen',at:[76,65],look:3,text:'Welcome to the village magic school. First, open Bag and Skills to see your supplies and progress. Take this staff and relics, then equip the staff using the Magic icon. Gust Needle uses an air relic and a mind relic per cast; stronger spells unlock with your Magic level. Cast at my practice dummy, then visit Smith Orin at the forge northeast of the square.'}
};
let tutorialVillageReady=false;
function setupTutorialVillage(){
 if(tutorialVillageReady)return;tutorialVillageReady=true;
 const world=worldScenes.overworld,place=(o,x,y)=>{Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});return o;};
 setupTutorWorkplaces(world);
 const occupied=(x,y,except)=>expandedWater(x,y)||world.buildings.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h)||world.objects.some(o=>o!==except&&!o.walkThrough&&!fighter(o)&&!o.collected&&o.x===x&&o.y===y);
 const fit=(o,x,y)=>{for(let r=0;r<12;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;const a=x+dx,b=y+dy;if(!occupied(a,b,o))return place(o,a,b);}throw new Error('No tutor position for '+o.name);};
 const make=(role,type,name,x,y,extra={})=>{const o={id:2800000+world.objects.filter(o=>o.id>=2800000).length,type,name,sprite:5,dead:0,hitAt:-100,attackAt:-100,tutorialRole:role,...extra};fit(o,x,y);world.objects.push(o);return o;};
 for(const [role,t]of Object.entries(TUTORS)){
  if(role==='guide'){elderObj.tutorialRole='tutor-guide';elderObj.tutor='guide';elderObj._stationary=true;continue;}
  const room=role==='cooking'?'village_kitchen':role==='bank'?'realm_briarhaven_4':role==='magic'?'realm_briarhaven_3':null;const o=make('tutor-'+role,'tutor',t.name,...t.at,{tutor:role,characterSprite:true,look:t.look,sprite:t.look,_stationary:true,...(room?{interiorBuilding:room}:{})});if(room)place(o,...t.at);
 }
 for(const [role,x,y]of [['tree',24,48],['ore',73,46]]){const o=tutorialObject(role);if(o)fit(o,x,y);}
 // The fishing marker occupies a water cell beside a walkable eastern bank.
 const fishing=tutorialObject('fish');let fishingSpot=null;
 for(let y=60;y<71;y++)for(let x=18;x<28;x++)if(expandedWater(x,y)&&!expandedWater(x+1,y)&&!occupied(x+1,y,null)&&(!fishingSpot||Math.hypot(x-25,y-64)<Math.hypot(fishingSpot.x-25,fishingSpot.y-64)))fishingSpot={x,y};
 if(fishing&&fishingSpot)place(fishing,fishingSpot.x,fishingSpot.y);
 dummyObj.tutorialRole='dummy';fit(dummyObj,44,78);dummyObj.atk=0;
 const range=make('range','range','Cooking range',60,51,{cooking:true,workstation:'range',interiorBuilding:'village_kitchen'});place(range,60,51);
 make('fishing-tree','tree','Tree',31,63,{resourceId:'normal',sprite:4});
 make('practice-forge','practiceForge','Practice forge',66,44);
 make('town-resident','villager','Tobin the beggar',54,49,{characterSprite:true,civilianModel:'chosan',_stationary:true,talk:'“A warm meal and dry boots make a fine day. Mara’s store is just here, and the cooking hearth is west by the inn. If you find work, keep your tools on your belt—you’ll want room in your bag.”'});
 const dummy=make('magic-dummy','dummy','Spell practice dummy',79,66,{...species.dummy,kind:'dummy',maxhp:40,hp:40,atk:0});dummy.name='Spell practice dummy';dummy.interiorBuilding='realm_briarhaven_3';place(dummy,79,66);
 // Sera teaches remembrance; no additional world actors are needed.
 dressTutorWorkplaces(world);setupSkillWorld(world);setupTrainingPen(world);
 if(inWorld()){objects.splice(0,objects.length,...world.objects);buildings.splice(0,buildings.length,...world.buildings);}realmNavigation.clear();miniTerrain=null;roadBuckets=null;resetLandSurface();
 normalizeJourney(s);renderTutorial();
}
function talkTutor(o){
 const role=o.tutor,expected=tutorialStep()?.event;
 if(role==='magic'&&tutorialStep()){
  const ready=giveTutorialMagicSupplies();
  if(expected==='talk-magic'&&ready){dialog(TUTORS.magic.name,'<p>“'+TUTORS.magic.text+'”</p>',[['Continue',()=>{close();tutorialEvent('talk-magic');}]]);return;}
  if(typeof gameMessage==='function')gameMessage('Arcanist Elowen: '+(ready?'Your staff and practice relics are ready. Follow your next instruction.':'Make room in your bag. I will hand over your supplies as soon as there is space.'));
  renderTutorial();return;
 }
 if(role==='combat'&&typeof showValeLesson==='function'&&showValeLesson(expected))return;
 if(role==='guide'&&expected==='talk-finish'){dialog('Elder Rowan','<p>“You have learned from our tutors and practised each skill. I will teleport you to Briarhaven on the mainland. Take your supplies with you; this is a one-way journey.”</p>',[['Finish apprenticeship',()=>{close();tutorialEvent('talk-finish');}]]);return;}
 if(role==='guide'&&expected!=='talk-guide'){elder();return;}
 const t=TUTORS[role],buttons=[];
 if(expected==='talk-'+role)buttons.push(['Continue',()=>{if(role==='cooking'&&!grantTutorialItems('baking',{flour:1,jugWater:1})){s.tutorialBakingPending=true;close();openGamePanel('bag');save();return;}close();tutorialEvent('talk-'+role);if(role==='bank')openBank();}]);
 if(role==='cooking'&&['mix-dough','bake-bread'].includes(expected)&&!(s.bag.breadDough>0)&&!(s.bag.bread>0)&&!hasIngredients({flour:1,jugWater:1}))buttons.push(['Take baking ingredients',()=>{const missing={flour:Math.max(0,1-(s.bag.flour||0)),jugWater:Math.max(0,1-(s.bag.jugWater||0))};if(Object.entries(missing).every(([id,n])=>!n||canCarry(id,n))){for(const [id,n]of Object.entries(missing))if(n)addToBag(id,n);close();}}]);
 if(role==='bank'&&expected!=='talk-bank')buttons.push(['Open bank',()=>{close();openBank();}]);
 if(role==='combat'&&['dummy','monster'].includes(expected)&&!s.tutorialGifts?.combatFood)buttons.push(['Take food for the rat pen',()=>{if(grantTutorialItems('combatFood',{shrimp:3}))close();}]);
 if(role==='worship'&&s.tutorial< tutorialSteps.length&&!(s.bag.bones>0))buttons.push(['Take practice bones',()=>{if(addToBag('bones')){close();save();toast('Bury the practice bones from your bag.');}}]);
 dialog(t.name,t.text.split('\n').map(p=>'<p>'+p+'</p>').join(''),buttons);
}
function tutorialGiftSpace(items){return Object.entries(items).reduce((n,[id,count])=>n+(STACKABLE.has(id)?(owns(id)?0:1):count),0);}
function giveTutorialMagicSupplies(){
 const items={};if(!(s.gear.oakStaff>0))items.oakStaff=1;
 if(!(s.bag.airRunes>0))items.airRunes=30;if(!(s.bag.runes>0))items.runes=20;
 const needed=tutorialGiftSpace(items);s.tutorialMagicPending=true;
 if(inventorySlots().length+needed>BAG_SIZE)return false;
 for(const [id,count]of Object.entries(items)){const bag=ITEMS[id].slot?s.gear:s.bag;bag[id]=(bag[id]||0)+count;}
 s.tutorialGifts??={};s.tutorialGifts.magic=true;s.tutorialMagicPending=false;
 if(Object.keys(items).length){renderUI();save();}return true;
}
function grantTutorialItems(key,items){
 s.tutorialGifts=s.tutorialGifts||{};if(s.tutorialGifts[key])return true;
 const needed=Object.entries(items).reduce((n,[id,count])=>n+(STACKABLE.has(id)?(owns(id)?0:1):count),0);
 if(inventorySlots().length+needed>BAG_SIZE){toast('Make '+needed+' spaces in your bag for your tutor’s supplies.');return false;}
 for(const [id,count]of Object.entries(items)){const collection=ITEMS[id].slot?s.gear:s.bag;collection[id]=(collection[id]||0)+count;}
 s.tutorialGifts[key]=true;renderUI();save();return true;
}
function handleTutorialInteraction(o){
 if(o.tutor){stop();talkTutor(o);return true;}
 if(o.workstation==='furnace'){stop();openSmithing('furnace');return true;}
 if(o.type==='practiceForge'){stop();workPracticeForge();return true;}
 if(o.type==='camp'&&o.cooking){stop();return true;}
 if(o.type==='range'){stop();openWorkbench('cooking',null,o);return true;}
 return false;
}

ITEMS.rawShrimp={name:'Raw trout',icon:10,desc:'Cook beside a fire or hearth to make a meal.'};
ITEMS.ironBar={name:'Iron bar',icon:9,desc:'Smelted iron. Work it at a forge to make arrowheads.'};
ITEMS.arrowheads={name:'Iron arrowheads',icon:12,desc:'Combine ten arrowheads with a log to make ten arrows.'};
STACKABLE.add('arrowheads');
let practiceFireSerial=2900000;
function lightLog(){
 if(!useBeltTool('tinderbox'))return false;
 if(!s.bag.logs)return false;stop();
 if(!inWorld()||buildings.some(b=>b.walkIn?withinWalkIn(b,px,py):px>=b.x&&px<b.x+b.w&&py>=b.y&&py<b.y+b.h)||water(s.x,s.y)){toast('Light a fire on clear ground outdoors.');return false;}
 if(objects.some(o=>o.type==='camp'&&Math.hypot(o.x-px,o.y-py)<1)){toast('There is already a fire here.');return false;}
 s.bag.logs--;const o={id:practiceFireSerial++,type:'camp',name:'Log fire',x:s.x,y:s.y,homeX:s.x,homeY:s.y,drawX:s.x,drawY:s.y,sprite:7,dead:0,walkThrough:true,expires:time+PLAYER_FIRE_LIFETIME/1000,expiresAt:Date.now()+PLAYER_FIRE_LIFETIME};if(globalThis.VeldrenWorldObjects?.enabled)VeldrenWorldObjects.addSession('overworld',o,'fire');else{worldScenes.overworld.objects.push(o);objects.push(o);}gain('Firemaking',20);tutorialEvent('fire');renderUI();save();toast('Fire lit · +20 Firemaking XP');return true;
}
function cookTrout(){
 if(!s.bag.rawShrimp){toast('Net some shrimp first.');return false;}
 if(!objects.some(o=>o.type==='camp'&&o.dead<=time&&Math.hypot(o.x-px,o.y-py)<=2)){toast('Stand beside a campfire or cooking hearth to cook.');return false;}
 s.bag.rawShrimp--;s.bag.fish=(s.bag.fish||0)+1;gain('Cooking',20);tutorialEvent('cook');renderUI();save();toast('Trout cooked · +20 Cooking XP');return true;
}
function workPracticeForge(){
 if(!useBeltTool('hammer'))return false;
 if(!objects.some(o=>(o.type==='practiceForge'||o.type==='forge')&&Math.hypot(o.x-px,o.y-py)<2)){toast('Stand beside the practice forge.');return false;}
 if(s.bag.ironBar>0){s.bag.ironBar--;s.bag.arrowheads=(s.bag.arrowheads||0)+10;gain('Smithing',20);tutorialEvent('smith');toast('10 arrowheads forged · +20 Smithing XP');}
 else if(s.bag.ore>0){s.bag.ore--;s.bag.ironBar=(s.bag.ironBar||0)+1;gain('Smithing',15);tutorialEvent('smelt');toast('Iron bar smelted · +15 Smithing XP');}
 else{toast('Bring iron ore or an iron bar to the forge.');return false;}
 renderUI();save();return true;
}
function finishArrows(){if((s.bag.arrowheads||0)<10||s.bag.logs<1){toast('You need 10 arrowheads and a log.');return false;}s.bag.arrowheads-=10;s.bag.logs--;s.bag.arrows=(s.bag.arrows||0)+10;gain('Smithing',10);renderUI();save();return true;}
function transferBank(id,withdraw=false,quantity=1,refresh=true){
 const item=ITEMS[id];if(!item)return false;const bag=item.slot?s.gear:s.bag;
 if(!(quantity>0)||(!Number.isFinite(quantity)&&quantity!==Infinity))return false;quantity=quantity===Infinity?quantity:Math.floor(quantity);s.bank=s.bank||{};
 const available=withdraw?s.bank[id]||0:(bag[id]||0)-(item.slot&&s.equipment[item.slot]===id?1:0);
 const room=withdraw?(STACKABLE.has(id)?(canCarry(id)?Infinity:0):bagSpaceFor(id)):Infinity;
 const count=window.realmNative?.transactions?.transferCount(quantity,available,room)??Math.min(quantity,available,room);if(count<1){if(withdraw)toast('Make space in your bag to withdraw.');return false;}
 if(withdraw){s.bank[id]-=count;bag[id]=(bag[id]||0)+count;}
 else{bag[id]-=count;s.bank[id]=(s.bank[id]||0)+count;}
 if(typeof tutorialBankTransfer==='function')tutorialBankTransfer(id,withdraw);
 else tutorialEvent(withdraw?'withdraw':'deposit');
 if(refresh){renderUI();save();}return count;
}
function openBank(){
 openTrade('bank');
}

// Permanent village workplaces. Their supplies and entrances remain after the course.
const tutorialWorkplaces=[
 {id:'square',name:'Briarhaven square',x:43,y:52,rx:4,ry:3,paved:true},
 {id:'woodland',name:'Ash’s timber yard',x:27,y:49,rx:5,ry:4},
 {id:'fishing',name:'Stillwater landing',x:28,y:64,rx:2.7,ry:3.7},
 {id:'kitchen',name:'Village kitchen',x:57,y:52,rx:4.5,ry:3,paved:true},
 {id:'smithy',name:'Orin’s smithing yard',x:68,y:44,rx:5,ry:4,paved:true},
 {id:'training',name:'Briarhaven training yard',x:44,y:79,rx:4,ry:5},
 {id:'ratpen',name:'Giant rat pen',x:56,y:82,rx:8,ry:6},
 {id:'shrine',name:'Shrine of the First Flame',x:42,y:64,rx:2.8,ry:3,paved:true},
 {id:'bank',name:'Briarhaven Bank',x:58,y:74,rx:3,ry:2,paved:true},
 {id:'school',name:'Briarhaven magic school',x:77,y:72,rx:3,ry:2,paved:true}
];
function setupTutorWorkplaces(world){
 for(const [id,name]of [['realm_briarhaven_4','Briarhaven Bank'],['realm_briarhaven_3','Briarhaven magic school']]){
  const b=world.buildings.find(b=>b.service?.destination===id);if(!b)continue;b.name=name;b.service.name=name;
  world.objects=world.objects.filter(o=>o.interiorBuilding!==id);if(worldScenes[id])worldScenes[id].title=name;
 }
 // Clear incidental scenery from work areas before placing the authored arrangement.
 world.objects=world.objects.filter(o=>o.tutorialRole||o.type==='door'||fighter(o)||o.interiorBuilding||!['tree','ore','prop','crop'].includes(o.type)||!tutorialWorkplaces.some(a=>Math.hypot((o.x-a.x)/a.rx,(o.y-a.y)/a.ry)<1.15));
}
function setupVillageKitchen(world){
 const destination='village_kitchen';if(world.buildings.some(b=>b.service?.destination===destination))return;
 const service={id:4800000,type:'door',name:'Village kitchen',x:58,y:57,dead:0,sprite:13,walkThrough:true,destination};
 const b={x:54,y:49,w:9,h:8,name:'Village kitchen',service,walkIn:true,settlement:'briarhaven',kingdom:'aurelia',race:'human',archetype:'house',variant:0,visualHeight:4.7};service.building=b;
 world.buildings.push(b);world.objects=world.objects.filter(o=>o.type==='door'||fighter(o)||o.tutorialRole||o.x<b.x-1||o.x>b.x+b.w||o.y<b.y-1||o.y>b.y+b.h);world.objects.push(service);
 // Residents displaced by the plot resume outdoors with an outdoor home position.
 for(const o of world.objects){
  if(!fighter(o)||!withinWalkIn(b,o.x,o.y))continue;
  let spot=null;for(let radius=1;radius<15&&!spot;radius++)for(let dy=-radius;dy<=radius&&!spot;dy++)for(let dx=-radius;dx<=radius&&!spot;dx++){
   if(Math.abs(dx)!==radius&&Math.abs(dy)!==radius)continue;const x=o.x+dx,y=o.y+dy;
   if(expandedWater(x,y)||world.buildings.some(a=>x>=a.x-1&&x<=a.x+a.w&&y>=a.y-1&&y<=a.y+a.h)||world.objects.some(a=>a!==o&&!a.walkThrough&&a.x===x&&a.y===y))continue;spot=[x,y];
  }
  if(spot){const [x,y]=spot;Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});}
 }
}
function dressTutorWorkplaces(world){
 let id=3700000;
 const prop=(name,x,y,extra={})=>{const o={id:id++,type:'prop',name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:12,dead:0,...extra};world.objects.push(o);return o;};
 for(const a of tutorialWorkplaces)if(a.id!=='kitchen'){prop(a.name,a.x,a.y,{workplace:a.id,walkThrough:true});}
 for(const [name,x,y]of [
  ['Village noticeboard',45,50],['Bench',46,52],['Flower planter',41,54],
  ['Log pile',25,45],['Log pile',23,46],['Woodcutter’s tool table',29,46],['Axe chopping block',26,47],['Supplies',30,48],
  ['Fishing supplies',28,61],['Barrel',29,65],['Bench',29,67],
  ['Smith’s tool table',72,42],['Log pile',64,42],['Ore supplies',72,44],['Forge furnace',66,42],
  ['Weapon rack',45,75],['Arrow target',42,76],['Training supplies',42,82],
  ['Stone altar',41,64],['Offering bowl',40,62],['Bench',43,67]
 ])prop(name,x,y);
 for(const [name,x,y,room]of [
  ['Cooking table',56,51,'village_kitchen'],['Flour supplies',55,50,'village_kitchen'],['Fresh produce crate',55,53,'village_kitchen'],['Water barrel',61,54,'village_kitchen'],
  ['Bank counter',56,69,'realm_briarhaven_4'],['Bank chest',60,67,'realm_briarhaven_4'],['Bank chest',60,69,'realm_briarhaven_4'],['Ledger table',56,66,'realm_briarhaven_4'],
  ['Bookcase',74,63,'realm_briarhaven_3'],['Bookcase',75,63,'realm_briarhaven_3'],['Study table',74,66,'realm_briarhaven_3'],['Relic supplies',80,63,'realm_briarhaven_3']
 ])prop(name,x,y,{interiorBuilding:room});
 for(const [x,y,h]of [[22,47,0],[22,49,0],[25,44,Math.PI/2],[27,44,Math.PI/2]])prop('Timber yard fence',x,y,{heading:h});
 const lanes=[[[43,52],[28,50]],[[28,50],[28,63]],[[43,52],[58,57]],[[43,52],[68,45]],[[43,52],[50,55]],[[50,62],[58,74]],[[58,74],[77,72]],[[43,64],[58,74]],[[50,62],[45,72]],[[45,72],[46,82]],[[46,82],[48,82]]];
 for(const [a,b]of lanes)curveRoad(a[0]+.5,a[1]+.5,b[0]+.5,b[1]+.5,.72);
}

// A full collision boundary, shared by the gate, rat movement and tutorial.
const TRAINING_PEN={id:'vale-rats',left:48,right:64,top:76,bottom:88,gateX:48,gateY:82};
let trainingPenGate=null;
function insideTrainingPen(x,y,margin=0){const p=TRAINING_PEN;return x>p.left+margin&&x<p.right-margin&&y>p.top+margin&&y<p.bottom-margin;}
function trainingRatCanMove(o,x,y){
 if(!o.penId)return true;
 // A clear border also keeps the enlarged bodies and tails off the fence.
 return insideTrainingPen(x,y,1)&&!objects.some(a=>a!==o&&a.penId===o.penId&&a.dead<=time&&(a.x===x&&a.y===y||Math.hypot((a.drawX??a.x)-x,(a.drawY??a.y)-y)<.8));
}
function trainingGateOccupies(x,y){const g=trainingPenGate;return !!g&&(g._generatedService?globalThis.VeldrenServiceScene.contains(g,x,y):g.x===x&&g.y===y);}
function trainingGateClosedAt(x,y){const g=trainingPenGate;return inWorld()&&g&&trainingGateOccupies(x,y)&&g.openedAt===undefined&&objects.includes(g);}
function trainingGateFraction(){const g=trainingPenGate;if(!g)return 0;const m=g.motion;if(!m)return g.openedAt===undefined?0:1;const t=Math.max(0,Math.min(1,(time-m.start)/.24));return m.from+(m.to-m.from)*t*t*(3-2*t);}
function setTrainingGate(open){const g=trainingPenGate;if(!g||(g.openedAt!==undefined)===open)return;const from=trainingGateFraction();if(open)g.openedAt=time;else delete g.openedAt;g.blocksSight=!open;g.motion={from,to:open?1:0,start:time};}
function prepareTrainingGateStep(next){
 const g=trainingPenGate;if(!inWorld()||!g||!trainingGateOccupies(next[0],next[1])||!objects.includes(g))return true;
 setTrainingGate(true);return trainingGateFraction()>.95;
}
function crossingTrainingGate(){const g=trainingPenGate;return inWorld()&&g&&g.openedAt!==undefined&&(trainingGateOccupies(s.x,s.y)||path[0]&&trainingGateOccupies(...path[0]));}
function updateTrainingGate(){
 const g=trainingPenGate;if(!g)return;
 const nearby=inWorld()&&Math.abs(px-g.x)<.85&&Math.abs(py-g.y)<.85;
 if(nearby)setTrainingGate(true);
 else if(!crossingTrainingGate())setTrainingGate(false);
}
function enterTrainingGate(){const g=trainingPenGate;if(g)walkTo(g.x+(insideTrainingPen(px,py)||px>g.x? -2:2),g.y);}
function setupTrainingPen(world){
 if(world.objects.some(o=>o.penId===TRAINING_PEN.id))return;
 const p=TRAINING_PEN;
 world.objects=world.objects.filter(o=>o.tutorialRole||fighter(o)||o.interiorBuilding||o.walkThrough||o.x<p.left-1||o.x>p.right+1||o.y<p.top-1||o.y>p.bottom+1);
 const put=(id,type,name,x,y,extra={})=>{const o={id,type,name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,dead:0,hitAt:-100,attackAt:-100,...extra};world.objects.push(o);return o;};
 let id=4900000;
 for(let y=p.top;y<=p.bottom;y++)for(let x=p.left;x<=p.right;x++){
  if(x!==p.left&&x!==p.right&&y!==p.top&&y!==p.bottom)continue;
  if(x===p.gateX&&y===p.gateY){trainingPenGate=put(id++,'gate','Rat pen gate',x,y,{walkThrough:true,blocksSight:true,penFence:true});continue;}
  put(id++,'prop','Rat pen fence',x,y,{penFence:true,blocksSight:true,heading:y===p.top||y===p.bottom?Math.PI/2:0});
 }
 const original=world.objects.find(o=>o.kind==='rat'&&!o.penId);
 for(let i=0;i<15;i++){
  const x=p.left+2+(i%5)*3,y=p.top+2+Math.floor(i/5)*4;
  const o=i===0&&original?original:put(4900100+i,'enemy',species.rat.name,x,y,{...species.rat,kind:'rat',maxhp:species.rat.hp});
  Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y,hp:species.rat.hp,maxhp:species.rat.hp,atk:species.rat.atk,spread:species.rat.spread,_stationary:false,tutorialRole:'rat',penId:p.id,roamClock:i*.31});
 }
 realmNavigation.clear();
}
