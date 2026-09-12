'use strict';
// A village apprenticeship. Every task observes an actual player action.
const tutorialObject=role=>worldScenes.overworld?.objects.find(o=>o.tutorialRole===role&&!o.collected);
const tutorialTutor=role=>tutorialObject('tutor-'+role);
const lesson=(event,title,desc,role=null)=>({event,title,desc,point:()=>role?tutorialObject(role==='ore'&&s.bag.copperOre>0?'tin':role):null});
const tutorialSteps=[
 lesson('camera','Look around','Swipe with one finger to turn the camera. Pinch to zoom. On a computer, drag the view or hold the arrow keys.'),
 lesson('walk','Take your first steps','Tap any clear ground and walk a few steps. Tap Run to travel faster; your energy recovers while walking or resting.'),
 lesson('talk-guide','Meet Elder Rowan','Rowan is in Briarhaven’s village square. He will explain the controls and introduce your tutors.','tutor-guide'),
 lesson('bag','Your belongings','Tap the bag icon on the right. Tap an item to use it; press and hold to see its other actions.'),
 lesson('skills','Your skills','Open the Skills tab. Each skill has its own level and XP, including Attack, Strength, Defense and Hitpoints.'),
 lesson('talk-woods','Find the woodland tutor','Rowan sends you to Forester Ash beside the timber yard.','tutor-woods'),
 lesson('tree','Cut your first log','Tap the marked tree. Your axe is carried with you; gathering trains Woodcutting.','tree'),
 lesson('fire','Make your first fire','Step onto clear ground outdoors. Open your bag and tap a log to light a fire and earn Firemaking XP.'),
 lesson('talk-fishing','Follow Ash’s directions','Find Fisher Nell at Stillwater, just west of the village.','tutor-fishing'),
 lesson('fish','Net some shrimp','Tap the highlighted fishing spot. Your catch goes into your bag as raw food.','fish'),
 lesson('talk-cooking','Meet the cooking tutor','Nell sends you to Cook Bram at the outdoor kitchen beside the inn.','tutor-cooking'),
 lesson('cook','Cook your catch','Tap the cooking hearth while carrying raw shrimp. Cooking turns it into food you can eat.','hearth'),
 lesson('eat','Food for the road','Tap Eat, or tap a cooked shrimp in your bag. Food restores health; raw fish must be cooked first.'),
 lesson('talk-mining','Visit the smith','Bram sends you to Smith Orin beside Briarhaven’s forge. He teaches both Mining and Smithing.','tutor-mining'),
 lesson('ore','Mine copper and tin','Mine one copper ore and one tin ore in the yard. Both rocks can be mined at level 1.','ore'),
 lesson('smelt','Smelt a bronze bar','Tap the furnace to combine one copper ore and one tin ore into bronze.','furnace'),
 lesson('smith','Work the metal','Tap the practice anvil to hammer your bronze bar into your first bronze dagger. Both actions earn Smithing XP.','practice-forge'),
 lesson('talk-combat','Meet the combat tutor','Orin sends you to Captain Vale at the training yard.','tutor-combat'),
 lesson('equip-dagger','Equip your bronze dagger','Open your bag and tap the bronze dagger you forged to equip it. Your weapon appears in the Equipment panel.'),
 lesson('combat-stats','Inspect your combat stats','Open Equipment, then tap the combat stats icon beneath your worn items. See your levels and the bonuses from your dagger.'),
 lesson('training-kit','A better practice weapon','Return to Captain Vale. He has a wooden training sword and shield to help you learn sword-and-shield combat.','tutor-combat'),
 lesson('training-gear','Prepare for practice','Equip both the wooden training sword and wooden shield from your bag. Keep your bronze dagger; you made it yourself.'),
 lesson('dummy','Practice your attacks','With your wooden sword and shield equipped, tap the training dummy. Choose Attack, Strength, Defense or balanced training using the selector.','dummy'),
 lesson('monster','A small field test','Defeat the giant rat just south of the training yard. Tap Eat if your health gets low.','rat'),
 lesson('loot','Pick up the drops','Collect the coins and bones where the rat fell. Each tap takes the next item; keep the bones for Keeper Sera.'),
 lesson('talk-bank','Visit the banker','Vale sends you to Banker Ada inside Briarhaven Bank, southeast of the training yard. Open the door, then walk inside.','tutor-bank'),
 lesson('deposit','Store a supply','Talk to Ada and open your bank. Deposit an item from your bag. Stored items persist with your character.','tutor-bank'),
 lesson('withdraw','Take it back','Withdraw an item from your bank. Worn equipment stays separate from stored supplies.','tutor-bank'),
 lesson('talk-worship','Meet the shrine keeper','Ada sends you to Keeper Sera at the village shrine. Worship and spirits are taught together.','tutor-worship'),
 lesson('bury','Honour the fallen','Tap bones in your bag to bury them for Worship XP. Sera can provide practice bones if you need them.'),
 lesson('spirit','Form a spiritual bond','Speak to Cinder beside Sera and form a bond. Worship grows through burial and first bonds; spirits grant their own bonuses.','cinder'),
 lesson('talk-magic','Find the magic tutor','Sera sends you to Arcanist Elowen inside the magic school. Open the door and walk in.','tutor-magic'),
 lesson('magic','Cast your first spell','Equip Elowen’s staff using the Magic icon, then attack the practice dummy. Each spell uses runes and trains your Magic level.','magic-dummy'),
 lesson('talk-finish','Ready for the realm','Return to Rowan in the square. Your apprenticeship is complete; the kingdoms and his first quest await.','tutor-guide')
];
const TUTORIAL_V2_EVENTS=['camera','walk','talk-guide','bag','skills','talk-woods','tree','fire','talk-fishing','fish','talk-cooking','cook','eat','talk-mining','ore','smelt','smith','talk-combat','gear','dummy','monster','loot','talk-bank','deposit','withdraw','talk-worship','bury','spirit','talk-magic','magic','talk-finish'];

// Tutorial guidance is independent of the player's selected walking destination.
let tutorialRouteCache={key:'',at:-1,points:[]};
function tutorialGoal(){
 if(!inWorld()||!s.character||!tutorialStep()||Math.hypot(px-43,py-52)>95)return null;
 const step=tutorialStep();let goal=step.point();
 if(step.event==='loot')goal=(s.groundLoot||[]).filter(o=>o.scene===currentScene&&o.items.bones>0).sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py))[0]||null;
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
function tutorialStep(){return Number.isInteger(s.tutorial)?tutorialSteps[s.tutorial]||null:null;}
function normalizeJourney(state,original=state){
 const previous=Math.max(0,Math.floor(Number(original?.tutorial)||0));
 state.tutorial=original?.tutorialVersion===3?Math.min(tutorialSteps.length,previous):original?.tutorialVersion===2?(previous>=TUTORIAL_V2_EVENTS.length?tutorialSteps.length:tutorialSteps.findIndex(t=>t.event===(['gear','dummy'].includes(TUTORIAL_V2_EVENTS[previous])?'equip-dagger':TUTORIAL_V2_EVENTS[previous]))):previous>=14?tutorialSteps.length:0;
 if(!original?.starterGearVersion&&!state.tutorialReward&&state.tutorial<tutorialSteps.length){for(const id of ['bronzeSword','shortbow','oakStaff','leatherArmor','leatherBoots']){if(state.gear[id]>0)state.gear[id]--;for(const slot of Object.keys(state.equipment))if(state.equipment[slot]===id)state.equipment[slot]=null;}}
 state.starterGearVersion=1;state.tutorialVersion=3;state.runEnabled=state.runEnabled===true;state.tutorialGifts=state.tutorialGifts&&typeof state.tutorialGifts==='object'&&!Array.isArray(state.tutorialGifts)?state.tutorialGifts:{};
 state.runEnergy=Number.isFinite(state.runEnergy)?Math.max(0,Math.min(100,state.runEnergy)):100;
 state.bank=state.bank&&typeof state.bank==='object'&&!Array.isArray(state.bank)?state.bank:{};
 for(const key of Object.keys(state.bank))if(!ITEMS[key]||!Number.isFinite(state.bank[key])||state.bank[key]<1)delete state.bank[key];else state.bank[key]=Math.floor(state.bank[key]);
 for(const skill of ['Cooking','Firemaking'])state.xp[skill]=Math.max(0,Number(state.xp[skill])||0);
}
function tutorialEvent(event){
 if(!s.character||tutorialStep()?.event!==event)return;
 if(event==='loot'&&!(s.bag.bones>0))return;
 if(event==='equip-dagger'&&s.equipment.weapon!=='bronze_dagger')return;
 if(event==='combat-stats'&&s.equipment.weapon!=='bronze_dagger')return;
 if(event==='training-kit'&&!s.tutorialGifts?.combat)return;
 if((event==='training-gear'||event==='dummy')&&(s.equipment.weapon!=='woodenSword'||s.equipment.shield!=='woodenShield'))return;
 s.tutorial++;stop();tutorialCameraStart=null;
 if(!tutorialStep()){
  const earned=!s.tutorialReward;if(earned){s.gold+=15;s.tutorialReward=true;for(const id of ['bronzeSword','shortbow','oakStaff','leatherArmor','leatherBoots'])if(!(s.gear[id]>0||s.bank[id]>0))s.bank[id]=(s.bank[id]||0)+1;for(const [id,n]of Object.entries({arrows:60,runes:40,airRunes:120,fish:3}))s.bank[id]=(s.bank[id]||0)+n;s.tutorialCasting=false;}
  dialog('Apprenticeship complete','<p>“You have learned from every tutor. Keep your crafted dagger, training sword and shield, staff, and everything you gathered along the way. You earned them.”</p><p>Talk to Rowan again for the village quest, or follow the roads into the kingdoms.</p>'+(earned?'<p><b>Bonus: 15 coins, plus a bronze sword, bow, leather armor, boots and extra food, arrows and runes in your bank.</b> Your worn items and bag stay with you.</p>':''));
 }
 renderTutorial();renderUI();save();
 if(tutorialStep()?.event==='equip-dagger'&&s.equipment.weapon==='bronze_dagger')tutorialEvent('equip-dagger');
}
function observeTutorialCamera(){
 if(tutorialStep()?.event!=='camera')return;
 if(!tutorialCameraStart){tutorialCameraStart={yaw:view3d.yaw,tilt:view3d.tilt};return;}
 if(Math.abs(view3d.yaw-tutorialCameraStart.yaw)>.16||Math.abs(view3d.tilt-tutorialCameraStart.tilt)>.12)tutorialEvent('camera');
}
function renderTutorial(){
 const step=tutorialStep();$('tutorial').hidden=!s.character||!step||!inWorld();$('eat').classList.toggle('tutorialfocus',step?.event==='eat');
 if(!step)return;
 if(tutorialShownIndex!==s.tutorial&&s.tutorial<2){$('tutorial').classList.remove('collapsed');$('tutCollapse').textContent='Minimize';}tutorialShownIndex=s.tutorial;
 $('tutCount').textContent='APPRENTICESHIP · '+(s.tutorial+1)+' / '+tutorialSteps.length;
 $('tutTitle').textContent=step.title;$('tutDesc').textContent=step.desc;
 const far=!inWorld()||Math.hypot(s.x-43,s.y-52)>90,goal=tutorialGoal();
 $('guide').hidden=!far&&!step.point()&&!['bag','skills','loot','bury','fire','spirit','equip-dagger','combat-stats','training-gear'].includes(step.event);
 $('guide').textContent=far?'Return to the tutors':goal?.tutorialDoor?'Open '+goal.name+' door':goal?'Go to '+goal.name:['bag','skills','bury','fire','equip-dagger','combat-stats','training-gear'].includes(step.event)?'Open '+(step.event==='combat-stats'?'Equipment':step.event==='skills'?'Skills':'Bag'):step.event==='spirit'?'Open Spirits':'Find my loot';
}
function openTutorialPanel(which){openGamePanel(which);}
function guide(){
 const step=tutorialStep();if(!step)return;
 if(!inWorld()||Math.hypot(s.x-43,s.y-52)>90){dialog('Continue in Briarhaven','<p>Your tutors are in the starting village. Return to Rowan’s square to continue this lesson. Your belongings, levels and bank come with you.</p>',[['Return to Briarhaven',()=>{close();activateScene('overworld',42,51);renderTutorial();}],['Stay here',close]]);return;}
 if(['bag','skills','bury','fire','equip-dagger','combat-stats','training-gear'].includes(step.event)){openTutorialPanel(step.event==='combat-stats'?'gear':step.event==='skills'?'skills':'bag');return;}
 if(step.event==='spirit'&&s.spirits.cinder){openSpirits();return;}
 let point=tutorialGoal();
 if(point){if(point.dead>time){toast('The practice target will be ready again shortly.');return;}engage(point.tutorialDoor||point);}
 else toast(step.event==='loot'?'Defeat another rat to find fresh drops.':'Follow the lesson above.');
}

const TUTORS={
 guide:{name:'Elder Rowan',at:[43,52],look:0,text:'Welcome to Briarhaven. The minimap moves you to a place when you tap it. Swipe with one finger to turn your view. The icons on the right open your bag, equipment and skills. Tap an item for its usual action, and hold for its other options. Look at your bag and skills, then meet Forester Ash west of the square.'},
 woods:{name:'Forester Ash',at:[28,49],look:2,text:'Trees supply logs and Woodcutting experience. Tap the tree beside me to cut one, then tap that log in your bag on clear outdoor ground to light a fire. Firemaking has its own level. When your fire is lit, follow the path to Fisher Nell at Stillwater.'},
 fishing:{name:'Fisher Nell',at:[28,63],look:1,text:'Tap the fishing ripples at the shore. Your net is already with you. Every catch trains Fishing, but raw shrimp needs cooking. Take your catch to Cook Bram by the inn.'},
 cooking:{name:'Cook Bram',at:[38,45],look:3,text:'A catch is only a meal after it is cooked. With raw shrimp in your bag, tap my cooking hearth to cook one and train Cooking. Try the food, then visit Smith Orin east of the square.'},
 mining:{name:'Smith Orin',at:[68,43],look:0,text:'Mine copper and tin in my yard. The furnace combines them into bronze. At the anvil, work a bronze bar into a dagger. Better ores and recipes need higher levels. Mining and Smithing have separate levels. When you have made your dagger, Captain Vale will teach you to fight.'},
 combat:{name:'Captain Vale',at:[51,56],look:1,text:'First, equip the bronze dagger you forged. Then open Equipment and inspect your combat stats. I will give you a wooden sword and shield before we practise on the dummy. Attack improves melee accuracy, Strength raises its damage, Defense protects you and Hitpoints raises your health. Ranged and Magic train separately. Pick a weapon using the style buttons, then choose what to train. Defeat the dummy, try the rat south of the yard, and collect its drops. Banker Ada is your next stop, inside Briarhaven Bank to the southeast. Open the door and walk in.'},
 bank:{name:'Banker Ada',at:[56,68],look:3,text:'Welcome to Briarhaven Bank. Your bag has limited space. The bank holds supplies and unworn equipment for later and saves them with your character. Deposit an item, then withdraw it. Afterward, visit Keeper Sera at the shrine south of the square.'},
 worship:{name:'Keeper Sera',at:[42,63],look:2,text:'Burying bones honours the fallen and trains Worship. First bonds with spirits also earn Worship experience. Cinder waits beside the shrine: form a bond to gain its equipped bonus. Spirits belong to this spiritual practice. Afterward, Arcanist Elowen will teach you magic in the school east of the bank.'},
 magic:{name:'Arcanist Elowen',at:[76,65],look:3,text:'Welcome to the village magic school. Take this staff and runes, then equip the staff using the Magic icon. Wind strike uses an air rune and a mind rune per cast; stronger spells unlock with your Magic level. Cast at my practice dummy, then return to Rowan to finish your apprenticeship.'}
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
  const room=role==='bank'?'realm_briarhaven_4':role==='magic'?'realm_briarhaven_3':null;const o=make('tutor-'+role,'tutor',t.name,...t.at,{tutor:role,characterSprite:true,look:t.look,sprite:t.look,_stationary:true,...(room?{interiorBuilding:room}:{})});if(room)place(o,...t.at);
 }
 for(const [role,x,y]of [['tree',24,48],['ore',73,46]]){const o=tutorialObject(role);if(o)fit(o,x,y);}
 // The fishing marker occupies a water cell beside a walkable eastern bank.
 const fishing=tutorialObject('fish');let fishingSpot=null;
 for(let y=60;y<71;y++)for(let x=18;x<28;x++)if(expandedWater(x,y)&&!expandedWater(x+1,y)&&!occupied(x+1,y,null)&&(!fishingSpot||Math.hypot(x-25,y-64)<Math.hypot(fishingSpot.x-25,fishingSpot.y-64)))fishingSpot={x,y};
 if(fishing&&fishingSpot)place(fishing,fishingSpot.x,fishingSpot.y);
 dummyObj.tutorialRole='dummy';fit(dummyObj,48,58);dummyObj.atk=0;
 const rat=world.objects.find(o=>o.kind==='rat');rat.tutorialRole='rat';fit(rat,46,62);
 make('hearth','camp','Cooking hearth',39,46,{cooking:true});
 make('practice-forge','practiceForge','Practice forge',66,44);
 make('town-resident','villager','Tobin the beggar',54,49,{characterSprite:true,civilianModel:'chosan',_stationary:true,talk:'“A warm meal and dry boots make a fine day. Mara’s store is just here, and the cooking hearth is west by the inn. If you find work, keep your tools on your belt—you’ll want room in your bag.”'});
 const dummy=make('magic-dummy','dummy','Spell practice dummy',79,66,{...species.dummy,kind:'dummy',maxhp:40,hp:40,atk:0});dummy.name='Spell practice dummy';dummy.interiorBuilding='realm_briarhaven_3';place(dummy,79,66);
 const cinder=world.objects.find(o=>o.spiritId==='cinder');if(cinder){cinder.tutorialRole='cinder';fit(cinder,44,64);}SPIRITS.cinder.hint='Beside Keeper Sera at Briarhaven’s shrine.';
 dressTutorWorkplaces(world);setupSkillWorld(world);
 if(inWorld()){objects.splice(0,objects.length,...world.objects);buildings.splice(0,buildings.length,...world.buildings);}realmNavigation.clear();miniTerrain=null;roadBuckets=null;resetLandSurface();
 normalizeJourney(s);renderTutorial();
}
function talkTutor(o){
 const role=o.tutor,expected=tutorialStep()?.event;
 if(role==='combat'&&expected==='training-kit'){
  dialog('Captain Vale','<p>“You made that dagger yourself—good work. It is a poor choice for learning to defend yourself, though. Take this wooden sword and shield. Their reach and protection will help you practise safely.”</p><p>Both are yours to keep. Equip them from your bag, then try the dummy.</p>',[['Take sword and shield',()=>{if(grantTutorialItems('combat',{woodenSword:1,woodenShield:1})){close();tutorialEvent('training-kit');}}]]);return;
 }
 if(role==='combat'&&['equip-dagger','combat-stats','training-gear'].includes(expected)){
  const step=tutorialStep();dialog('Captain Vale','<p>“'+step.desc+'”</p>',[['Open '+(expected==='combat-stats'?'Equipment':'Bag'),()=>{close();openTutorialPanel(expected==='combat-stats'?'gear':'bag');}]]);return;
 }
 if(role==='guide'&&expected==='talk-finish'){dialog('Elder Rowan','<p>“You have learned from our tutors and practised each skill. Take these supplies and choose where your story leads next.”</p>',[['Finish apprenticeship',()=>{close();tutorialEvent('talk-finish');}]]);return;}
 if(role==='guide'&&expected!=='talk-guide'){elder();return;}
 const t=TUTORS[role],buttons=[];
 if(expected==='talk-'+role)buttons.push(['Continue',()=>{if(role==='magic'&&!grantTutorialItems('magic',{oakStaff:1,airRunes:30,runes:20}))return;close();tutorialEvent('talk-'+role);}]);
 if(role==='bank')buttons.push(['Open bank',()=>{close();openBank();}]);
 if(role==='magic'&&expected==='magic'&&!s.tutorialGifts?.magic)buttons.push(['Take practice staff and runes',()=>{if(grantTutorialItems('magic',{oakStaff:1,airRunes:30,runes:20}))close();}]);
 if(role==='worship'&&s.tutorial< tutorialSteps.length&&!(s.bag.bones>0))buttons.push(['Take practice bones',()=>{if(addToBag('bones')){close();save();toast('Bury the practice bones from your bag.');}}]);
 if(role==='magic'&&s.tutorial<tutorialSteps.length){if(s.bag.airRunes<1)buttons.push(['Take 10 air runes',()=>{if(addToBag('airRunes',10))close();}]);if(s.bag.runes<1)buttons.push(['Take 5 practice runes',()=>{if(addToBag('runes',5))close();}]);}
 dialog(t.name,'<p>“'+t.text+'”</p>',buttons);
}
function grantTutorialItems(key,items){
 s.tutorialGifts=s.tutorialGifts||{};if(s.tutorialGifts[key])return true;
 const needed=Object.entries(items).reduce((n,[id,count])=>n+(STACKABLE.has(id)?(owns(id)?0:1):count),0);
 if(inventorySlots().length+needed>BAG_SIZE){toast('Make '+needed+' spaces in your bag, then speak to the tutor again.');return false;}
 for(const [id,count]of Object.entries(items)){const collection=ITEMS[id].slot?s.gear:s.bag;collection[id]=(collection[id]||0)+count;}
 s.tutorialGifts[key]=true;renderUI();save();return true;
}
function handleTutorialInteraction(o){
 if(o.tutor){stop();talkTutor(o);return true;}
 if(o.workstation==='furnace'){stop();if(tutorialStep()?.event==='smelt')smeltMetal('bronze');else openSmithing('furnace');return true;}
 if(o.type==='practiceForge'){stop();workPracticeForge();return true;}
 if(o.type==='camp'&&o.cooking&&Object.keys(s.bag).some(id=>s.bag[id]>0&&ITEMS[id]?.rawFish)){stop();cookTrout();return true;}
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
 s.bag.logs--;const o={id:practiceFireSerial++,type:'camp',name:'Log fire',x:s.x,y:s.y,homeX:s.x,homeY:s.y,drawX:s.x,drawY:s.y,sprite:7,dead:0,walkThrough:true,expires:time+PLAYER_FIRE_LIFETIME/1000,expiresAt:Date.now()+PLAYER_FIRE_LIFETIME};worldScenes.overworld.objects.push(o);objects.push(o);gain('Firemaking',20);tutorialEvent('fire');renderUI();save();toast('Fire lit · +20 Firemaking XP');return true;
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
 const count=Math.min(quantity,available,room);if(count<1){if(withdraw)toast('Make space in your bag to withdraw.');return false;}
 if(withdraw){s.bank[id]-=count;bag[id]=(bag[id]||0)+count;}
 else{bag[id]-=count;s.bank[id]=(s.bank[id]||0)+count;}
 tutorialEvent(withdraw?'withdraw':'deposit');if(refresh){renderUI();save();}return count;
}
function openBank(){
 openTrade('bank');
}

// Permanent village workplaces. Their supplies and entrances remain after the course.
const tutorialWorkplaces=[
 {id:'square',name:'Briarhaven square',x:43,y:52,rx:4,ry:3,paved:true},
 {id:'woodland',name:'Ash’s timber yard',x:27,y:49,rx:5,ry:4},
 {id:'fishing',name:'Stillwater landing',x:28,y:64,rx:2.7,ry:3.7},
 {id:'kitchen',name:'Wayfarer’s outdoor kitchen',x:36,y:46,rx:4.5,ry:3,paved:true},
 {id:'smithy',name:'Orin’s smithing yard',x:68,y:44,rx:5,ry:4,paved:true},
 {id:'training',name:'Briarhaven training yard',x:49,y:59,rx:4.3,ry:4.5},
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
function dressTutorWorkplaces(world){
 let id=3700000;
 const prop=(name,x,y,extra={})=>{const o={id:id++,type:'prop',name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:12,dead:0,...extra};world.objects.push(o);return o;};
 for(const a of tutorialWorkplaces){prop(a.name,a.x,a.y,{workplace:a.id,walkThrough:true});}
 for(const [name,x,y]of [
  ['Village noticeboard',45,50],['Bench',46,52],['Flower planter',41,54],
  ['Log pile',25,45],['Log pile',23,46],['Woodcutter’s tool table',29,46],['Axe chopping block',26,47],['Supplies',30,48],
  ['Fishing supplies',28,61],['Barrel',29,65],['Bench',29,67],
  ['Cooking table',35,44],['Barrel',32,44],['Fresh produce crate',33,46],['Bench',34,48],
  ['Smith’s tool table',72,42],['Log pile',64,42],['Ore supplies',72,44],['Forge furnace',66,42],
  ['Weapon rack',52,58],['Arrow target',47,56],['Training supplies',51,61],
  ['Stone altar',41,64],['Offering bowl',40,62],['Bench',43,67]
 ])prop(name,x,y);
 for(const [name,x,y,room]of [
  ['Bank counter',56,69,'realm_briarhaven_4'],['Bank chest',60,67,'realm_briarhaven_4'],['Bank chest',60,69,'realm_briarhaven_4'],['Ledger table',56,66,'realm_briarhaven_4'],
  ['Bookcase',74,63,'realm_briarhaven_3'],['Bookcase',75,63,'realm_briarhaven_3'],['Study table',74,66,'realm_briarhaven_3'],['Rune supplies',80,63,'realm_briarhaven_3']
 ])prop(name,x,y,{interiorBuilding:room});
 // Short open fence runs frame the yard; the north/south paths stay two tiles wide.
 for(const [x,y,h]of [[45,57,0],[45,59,0],[53,60,0],[47,64,Math.PI/2],[49,64,Math.PI/2]])prop('Training yard fence',x,y,{heading:h});
 for(const [x,y,h]of [[22,47,0],[22,49,0],[25,44,Math.PI/2],[27,44,Math.PI/2]])prop('Timber yard fence',x,y,{heading:h});
 const lanes=[[[43,52],[28,50]],[[28,50],[28,63]],[[28,63],[36,48]],[[43,52],[68,45]],[[43,52],[50,55]],[[50,62],[58,74]],[[58,74],[77,72]],[[43,64],[58,74]]];
 for(const [a,b]of lanes)curveRoad(a[0]+.5,a[1]+.5,b[0]+.5,b[1]+.5,.72);
}
