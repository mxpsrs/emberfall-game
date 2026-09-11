'use strict';
// A village apprenticeship. Every task observes an actual player action.
const tutorialObject=role=>worldScenes.overworld?.objects.find(o=>o.tutorialRole===role&&!o.collected);
const tutorialTutor=role=>tutorialObject('tutor-'+role);
const lesson=(event,title,desc,role=null)=>({event,title,desc,point:()=>role?tutorialObject(role):null});
const tutorialSteps=[
 lesson('camera','Look around','Rotate the camera with ↶ or ↷. On a phone, use two fingers; on a computer, drag the view.'),
 lesson('walk','Take your first steps','Tap any clear ground and walk a few steps. Tap Run to travel faster; your energy recovers while walking or resting.'),
 lesson('talk-guide','Meet Elder Rowan','Rowan is in Briarhaven’s village square. He will explain the controls and introduce your tutors.','tutor-guide'),
 lesson('bag','Your belongings','Open Bag & menus. Tap an item to use it; press and hold to see its other actions.'),
 lesson('skills','Your skills','Open the Skills tab. Each skill has its own level and XP, including Attack, Strength, Defense and Hitpoints.'),
 lesson('talk-woods','Find the woodland tutor','Rowan sends you to Forester Ash beside the village oak grove.','tutor-woods'),
 lesson('tree','Cut an oak log','Tap the marked oak. Your axe is carried with you; gathering trains Woodcutting.','tree'),
 lesson('fire','Make your first fire','Step onto clear ground outdoors. Open your bag and tap an oak log to light a fire and earn Firemaking XP.'),
 lesson('talk-fishing','Follow Ash’s directions','Find Fisher Nell at Stillwater, just west of the village.','tutor-fishing'),
 lesson('fish','Catch a raw trout','Tap the highlighted fishing spot. Your catch goes into your bag as raw food.','fish'),
 lesson('talk-cooking','Meet the cooking tutor','Nell sends you to Cook Bram at the outdoor kitchen beside the inn.','tutor-cooking'),
 lesson('cook','Cook your catch','Tap the cooking hearth while carrying raw trout. Cooking turns it into food you can eat.','hearth'),
 lesson('eat','Food for the road','Tap Eat, or tap a cooked trout in your bag. Food restores health; raw fish must be cooked first.'),
 lesson('talk-mining','Visit the smith','Bram sends you to Smith Orin beside Briarhaven’s forge. He teaches both Mining and Smithing.','tutor-mining'),
 lesson('ore','Mine iron ore','Tap the iron deposit beside the smithy to gather one ore.','ore'),
 lesson('smelt','Smelt an iron bar','Return to the practice forge and tap it to smelt your ore.','practice-forge'),
 lesson('smith','Work the metal','Tap the practice forge again to hammer the bar into arrowheads. Both actions earn Smithing XP.','practice-forge'),
 lesson('talk-combat','Meet the combat tutor','Orin sends you to Captain Vale at the training yard.','tutor-combat'),
 lesson('gear','Choose a fighting style','Tap Melee, Ranged or Magic to equip its weapon. The training selector chooses which combat skill gains XP.'),
 lesson('dummy','Practice your attacks','Tap the training dummy. Attack controls accuracy, Strength controls melee damage, Defense protects you, and Hitpoints gives health.','dummy'),
 lesson('monster','A small field test','Defeat the giant rat just south of the training yard. Tap Eat if your health gets low.','rat'),
 lesson('loot','Pick up the drops','Collect the coins and bones where the rat fell. Each tap takes the next item; keep the bones for Keeper Sera.'),
 lesson('talk-bank','Visit the banker','Vale sends you to Banker Ada, beside the general store.','tutor-bank'),
 lesson('deposit','Store a supply','Talk to Ada and open your bank. Deposit an item from your bag. Stored items persist with your character.','tutor-bank'),
 lesson('withdraw','Take it back','Withdraw an item from your bank. Worn equipment stays separate from stored supplies.','tutor-bank'),
 lesson('talk-worship','Meet the shrine keeper','Ada sends you to Keeper Sera at the village shrine. Worship and spirits are taught together.','tutor-worship'),
 lesson('bury','Honour the fallen','Tap bones in your bag to bury them for Worship XP. Sera can provide practice bones if you need them.'),
 lesson('spirit','Form a spiritual bond','Speak to Cinder beside Sera and form a bond. Worship grows through burial and first bonds; spirits grant their own bonuses.','cinder'),
 lesson('talk-magic','Find the magic tutor','Sera sends you to Arcanist Elowen at the practice circle.','tutor-magic'),
 lesson('magic','Cast your first spell','Tap Magic to equip your staff, then attack the practice dummy. A cast uses runes and trains your own Magic level.','magic-dummy'),
 lesson('talk-finish','Ready for the realm','Return to Rowan in the square. Your apprenticeship is complete; the kingdoms and his first quest await.','tutor-guide')
];
let tutorialCameraStart=null,tutorialShownIndex=null;
function tutorialStep(){return Number.isInteger(s.tutorial)?tutorialSteps[s.tutorial]||null:null;}
function normalizeJourney(state,original=state){
 const previous=Math.max(0,Math.floor(Number(original?.tutorial)||0));
 state.tutorial=original?.tutorialVersion===2?Math.min(tutorialSteps.length,previous):previous>=14?tutorialSteps.length:0;
 state.tutorialVersion=2;state.runEnabled=state.runEnabled===true;
 state.runEnergy=Number.isFinite(state.runEnergy)?Math.max(0,Math.min(100,state.runEnergy)):100;
 state.bank=state.bank&&typeof state.bank==='object'&&!Array.isArray(state.bank)?state.bank:{};
 for(const key of Object.keys(state.bank))if(!ITEMS[key]||!Number.isFinite(state.bank[key])||state.bank[key]<1)delete state.bank[key];else state.bank[key]=Math.floor(state.bank[key]);
 for(const skill of ['Cooking','Firemaking'])state.xp[skill]=Math.max(0,Number(state.xp[skill])||0);
}
function tutorialEvent(event){
 if(!s.character||tutorialStep()?.event!==event)return;
 if(event==='loot'&&!(s.bag.bones>0))return;
 s.tutorial++;stop();tutorialCameraStart=null;
 if(!tutorialStep()){
  const earned=!s.tutorialReward;if(earned){s.gold+=15;s.tutorialReward=true;}
  dialog('Apprenticeship complete','<p>“You have met Briarhaven’s tutors and learned to live off the land. Your next adventure is yours to choose.”</p><p>Talk to Rowan again for the village quest, or follow the roads into the kingdoms.</p>'+(earned?'<p><b>Reward: 15 coins.</b></p>':''));
 }
 renderTutorial();renderUI();save();
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
 const far=!inWorld()||Math.hypot(s.x-43,s.y-52)>90;
 $('guide').hidden=!far&&!step.point()&&!['bag','skills','loot','bury','fire','spirit'].includes(step.event);
 $('guide').textContent=far?'Return to the tutors':step.point()?'Go to '+step.point().name:['bag','skills','bury','fire'].includes(step.event)?'Open '+(step.event==='skills'?'Skills':'Bag'):step.event==='spirit'?'Open Spirits':'Find my loot';
}
function openTutorialPanel(which){$('gameDock').hidden=false;document.body.classList.add('panels-open');$('togglePanels').setAttribute('aria-expanded','true');$('togglePanels').textContent='Close panels';tab=which;panelPage=0;syncTabs();tutorialEvent(which);renderPanel();}
function guide(){
 const step=tutorialStep();if(!step)return;
 if(!inWorld()||Math.hypot(s.x-43,s.y-52)>90){dialog('Continue in Briarhaven','<p>Your tutors are in the starting village. Return to Rowan’s square to continue this lesson. Your belongings, levels and bank come with you.</p>',[['Return to Briarhaven',()=>{close();activateScene('overworld',42,51);renderTutorial();}],['Stay here',close]]);return;}
 if(['bag','skills','bury','fire'].includes(step.event)){openTutorialPanel(step.event==='skills'?'skills':'bag');return;}
 if(step.event==='spirit'&&s.spirits.cinder){openSpirits();return;}
 let point=step.point();if(step.event==='loot')point=(s.groundLoot||[]).filter(o=>o.scene===currentScene).sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py))[0];
 if(point){if(point.dead>time){toast('The practice target will be ready again shortly.');return;}engage(point);}
 else toast(step.event==='loot'?'Defeat another rat to find fresh drops.':'Follow the lesson above.');
}

const TUTORS={
 guide:{name:'Elder Rowan',at:[43,52],look:0,text:'Welcome to Briarhaven. The minimap moves you to a place when you tap it. The camera arrows turn your view. Bag & menus holds your belongings, equipment and skills. Tap an item for its usual action, and hold for its other options. Look at your bag and skills, then meet Forester Ash west of the square.'},
 woods:{name:'Forester Ash',at:[29,51],look:2,text:'Trees supply logs and Woodcutting experience. Tap the oak beside me to cut one, then tap that log in your bag on clear outdoor ground to light a fire. Firemaking has its own level. When your fire is lit, follow the path to Fisher Nell at Stillwater.'},
 fishing:{name:'Fisher Nell',at:[28,63],look:1,text:'Tap the fishing ripples at the shore. Your rod is already with you. Every catch trains Fishing, but raw trout needs cooking. Take your catch to Cook Bram by the inn.'},
 cooking:{name:'Cook Bram',at:[38,45],look:3,text:'A catch is only a meal after it is cooked. With raw trout in your bag, tap my cooking hearth to cook one and train Cooking. Try the food, then visit Smith Orin east of the square.'},
 mining:{name:'Smith Orin',at:[62,46],look:0,text:'Mine the iron beside the forge. At the practice forge, one tap smelts ore into a bar; the next works that bar into arrowheads. Mining and Smithing have separate levels. When you have made arrowheads, Captain Vale will teach you to fight.'},
 combat:{name:'Captain Vale',at:[52,54],look:1,text:'Attack improves melee accuracy, Strength raises its damage, Defense protects you and Hitpoints raises your health. Ranged and Magic train separately. Pick a weapon using the style buttons, then choose what to train. Defeat the dummy, try the rat south of the yard, and collect its drops. Banker Ada is your next stop.'},
 bank:{name:'Banker Ada',at:[59,44],look:3,text:'Your bag has limited space. The bank holds supplies and unworn equipment for later and saves them with your character. Deposit an item, then withdraw it. Afterward, visit Keeper Sera at the shrine south of the square.'},
 worship:{name:'Keeper Sera',at:[40,60],look:2,text:'Burying bones honours the fallen and trains Worship. First bonds with spirits also earn Worship experience. Cinder waits beside the shrine: form a bond to gain its equipped bonus. Spirits belong to this spiritual practice. Afterward, Arcanist Elowen will teach you magic.'},
 magic:{name:'Arcanist Elowen',at:[58,57],look:3,text:'Equip your staff with the Magic button. Wind spark uses one rune per cast; stronger spells unlock with your Magic level. Cast at my practice dummy, then return to Rowan to finish your apprenticeship.'}
};
let tutorialVillageReady=false;
function setupTutorialVillage(){
 if(tutorialVillageReady)return;tutorialVillageReady=true;
 const world=worldScenes.overworld,place=(o,x,y)=>{Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});return o;};
 const occupied=(x,y,except)=>expandedWater(x,y)||world.buildings.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h)||world.objects.some(o=>o!==except&&!o.walkThrough&&!fighter(o)&&!o.collected&&o.x===x&&o.y===y);
 const fit=(o,x,y)=>{for(let r=0;r<12;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;const a=x+dx,b=y+dy;if(!occupied(a,b,o))return place(o,a,b);}throw new Error('No tutor position for '+o.name);};
 const make=(role,type,name,x,y,extra={})=>{const o={id:2800000+world.objects.filter(o=>o.id>=2800000).length,type,name,sprite:5,dead:0,hitAt:-100,attackAt:-100,tutorialRole:role,...extra};fit(o,x,y);world.objects.push(o);return o;};
 for(const [role,t]of Object.entries(TUTORS)){
  if(role==='guide'){elderObj.tutorialRole='tutor-guide';elderObj.tutor='guide';continue;}
  make('tutor-'+role,'tutor',t.name,...t.at,{tutor:role,characterSprite:true,look:t.look,sprite:t.look,_stationary:true});
 }
 for(const [role,x,y]of [['tree',26,51],['ore',60,49]]){const o=tutorialObject(role);if(o)fit(o,x,y);}
 // The fishing marker occupies a water cell beside a walkable eastern bank.
 const fishing=tutorialObject('fish');let fishingSpot=null;
 for(let y=60;y<71;y++)for(let x=18;x<28;x++)if(expandedWater(x,y)&&!expandedWater(x+1,y)&&!occupied(x+1,y,null)&&(!fishingSpot||Math.hypot(x-25,y-64)<Math.hypot(fishingSpot.x-25,fishingSpot.y-64)))fishingSpot={x,y};
 if(fishing&&fishingSpot)place(fishing,fishingSpot.x,fishingSpot.y);
 dummyObj.tutorialRole='dummy';fit(dummyObj,49,58);dummyObj.atk=0;
 const rat=world.objects.find(o=>o.kind==='rat');rat.tutorialRole='rat';fit(rat,47,78);
 make('hearth','camp','Cooking hearth',39,46,{cooking:true});
 make('practice-forge','practiceForge','Practice forge',61,47);
 const dummy=make('magic-dummy','dummy','Spell practice dummy',61,57,{...species.dummy,kind:'dummy',maxhp:40,hp:40,atk:0});dummy.name='Spell practice dummy';
 const cinder=world.objects.find(o=>o.spiritId==='cinder');if(cinder){cinder.tutorialRole='cinder';fit(cinder,38,61);}SPIRITS.cinder.hint='Beside Keeper Sera at Briarhaven’s shrine.';
 if(inWorld())objects.splice(0,objects.length,...world.objects);realmNavigation.clear();miniTerrain=null;
 normalizeJourney(s);renderTutorial();
}
function talkTutor(o){
 const role=o.tutor,expected=tutorialStep()?.event;
 if(role==='guide'&&expected==='talk-finish'){dialog('Elder Rowan','<p>“You have learned from our tutors and practised each skill. Take these supplies and choose where your story leads next.”</p>',[['Finish apprenticeship',()=>{close();tutorialEvent('talk-finish');}]]);return;}
 if(role==='guide'&&expected!=='talk-guide'){elder();return;}
 const t=TUTORS[role],buttons=[];
 if(expected==='talk-'+role)buttons.push(['Continue',()=>{close();tutorialEvent('talk-'+role);}]);
 if(role==='bank')buttons.push(['Open bank',()=>{close();openBank();}]);
 if(role==='worship'&&s.tutorial< tutorialSteps.length&&!(s.bag.bones>0))buttons.push(['Take practice bones',()=>{if(addToBag('bones')){close();save();toast('Bury the practice bones from your bag.');}}]);
 if(role==='magic'&&s.tutorial<tutorialSteps.length){if(!s.gear.oakStaff)buttons.push(['Borrow a staff',()=>{if(!canCarry('oakStaff')){toast('Make space in your bag.');return;}s.gear.oakStaff=1;close();}]);if(s.bag.runes<1)buttons.push(['Take 5 practice runes',()=>{if(addToBag('runes',5))close();}]);}
 dialog(t.name,'<p>“'+t.text+'”</p>',buttons);
}
function handleTutorialInteraction(o){
 if(o.tutor){stop();talkTutor(o);return true;}
 if(o.type==='practiceForge'){stop();workPracticeForge();return true;}
 if(o.type==='camp'&&o.cooking&&s.bag.rawTrout>0){stop();cookTrout();return true;}
 return false;
}

ITEMS.rawTrout={name:'Raw trout',icon:10,desc:'Cook beside a fire or hearth to make a meal.'};
ITEMS.ironBar={name:'Iron bar',icon:9,desc:'Smelted iron. Work it at a forge to make arrowheads.'};
ITEMS.arrowheads={name:'Iron arrowheads',icon:12,desc:'Combine ten arrowheads with an oak log to make ten arrows.'};
STACKABLE.add('arrowheads');
let practiceFireSerial=2900000;
function lightLog(){
 if(!s.bag.logs)return false;stop();
 if(!inWorld()||buildings.some(b=>b.walkIn?withinWalkIn(b,px,py):px>=b.x&&px<b.x+b.w&&py>=b.y&&py<b.y+b.h)||water(s.x,s.y)){toast('Light a fire on clear ground outdoors.');return false;}
 if(objects.some(o=>o.type==='camp'&&Math.hypot(o.x-px,o.y-py)<1)){toast('There is already a fire here.');return false;}
 s.bag.logs--;const o={id:practiceFireSerial++,type:'camp',name:'Log fire',x:s.x,y:s.y,homeX:s.x,homeY:s.y,drawX:s.x,drawY:s.y,sprite:7,dead:0,walkThrough:true,expires:time+90};worldScenes.overworld.objects.push(o);objects.push(o);gain('Firemaking',20);tutorialEvent('fire');renderUI();save();toast('Fire lit · +20 Firemaking XP');return true;
}
function cookTrout(){
 if(!s.bag.rawTrout){toast('Catch a raw trout first.');return false;}
 if(!objects.some(o=>o.type==='camp'&&o.dead<=time&&Math.hypot(o.x-px,o.y-py)<=2)){toast('Stand beside a campfire or cooking hearth to cook.');return false;}
 s.bag.rawTrout--;s.bag.fish=(s.bag.fish||0)+1;gain('Cooking',20);tutorialEvent('cook');renderUI();save();toast('Trout cooked · +20 Cooking XP');return true;
}
function workPracticeForge(){
 if(!objects.some(o=>(o.type==='practiceForge'||o.type==='forge')&&Math.hypot(o.x-px,o.y-py)<2)){toast('Stand beside the practice forge.');return false;}
 if(s.bag.ironBar>0){s.bag.ironBar--;s.bag.arrowheads=(s.bag.arrowheads||0)+10;gain('Smithing',20);tutorialEvent('smith');toast('10 arrowheads forged · +20 Smithing XP');}
 else if(s.bag.ore>0){s.bag.ore--;s.bag.ironBar=(s.bag.ironBar||0)+1;gain('Smithing',15);tutorialEvent('smelt');toast('Iron bar smelted · +15 Smithing XP');}
 else{toast('Bring iron ore or an iron bar to the forge.');return false;}
 renderUI();save();return true;
}
function finishArrows(){if((s.bag.arrowheads||0)<10||s.bag.logs<1){toast('You need 10 arrowheads and an oak log.');return false;}s.bag.arrowheads-=10;s.bag.logs--;s.bag.arrows=(s.bag.arrows||0)+10;gain('Smithing',10);renderUI();save();return true;}
function transferBank(id,withdraw=false){
 const item=ITEMS[id];if(!item)return false;const bag=item.slot?s.gear:s.bag;
 if(withdraw){if(!(s.bank[id]>0)||!canCarry(id)){toast('Make space in your bag to withdraw.');return false;}s.bank[id]--;bag[id]=(bag[id]||0)+1;}
 else{const spare=(bag[id]||0)-(item.slot&&s.equipment[item.slot]===id?1:0);if(spare<1)return false;bag[id]--;s.bank[id]=(s.bank[id]||0)+1;}
 tutorialEvent(withdraw?'withdraw':'deposit');renderUI();save();return true;
}
function openBank(){
 dialog('Briarhaven Bank','<p>Tap an item to move one. Your worn gear stays equipped.</p><div class="bankcolumns"><section><h3>Your bag</h3><div id="bankDeposit"></div></section><section><h3>Stored</h3><div id="bankWithdraw"></div></section></div>');
 for(const [id,item]of Object.entries(ITEMS))for(const withdraw of [false,true]){const count=withdraw?s.bank[id]||0:(item.slot?s.gear[id]||0:s.bag[id]||0)-(item.slot&&s.equipment[item.slot]===id?1:0);if(count<1)continue;const b=document.createElement('button');b.textContent=(withdraw?'Withdraw ':'Deposit ')+item.name+' · '+count;b.onclick=()=>{if(transferBank(id,withdraw))openBank();};$(withdraw?'bankWithdraw':'bankDeposit').appendChild(b);}
}
