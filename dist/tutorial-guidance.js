'use strict';
// One observable action at a time. Keep the saved lesson IDs stable so existing
// apprentices resume without losing progress, belongings or remembered work.
let tutorialGuidanceBusy=false,tutorialGuidanceQueued=false,tutorialGuidanceKey='',tutorialGuidanceTarget=null;
function tutorialGuidanceActive(){return !!s.character&&!!tutorialStep()&&currentScene==='tutorial';}
function settleTutorialHandoffs(){
 if(tutorialGuidanceBusy||!tutorialGuidanceActive())return;
 tutorialGuidanceBusy=true;
 try{
  let event=tutorialStep().event;
  if(s.tutorialMagicPending||(event==='magic'&&(!(s.gear.oakStaff>0)||!(s.bag.airRunes>0)||!(s.bag.runes>0)))){
   if(giveTutorialMagicSupplies()&&event==='talk-magic')tutorialEvent('talk-magic');
  }
  event=tutorialStep()?.event;
  const kit=event==='training-kit'?['combat',{woodenSword:1,woodenShield:1,shrimp:3}]:event==='ranged-kit'?['ranged',{shortbow:1,arrows:60}]:null;
  if(kit&&(s.tutorialGifts?.[kit[0]]||inventorySlots().length+tutorialGiftSpace(kit[1])<=BAG_SIZE)){
   if(grantTutorialItems(...kit)){
    if(kit[0]==='combat')s.tutorialGifts.combatFood=true;
    if(typeof gameMessage==='function')gameMessage(kit[0]==='combat'?'Captain Vale: That dagger will not protect you well. Here is a wooden sword, shield and some food.':'Captain Vale: Good work. Here is your shortbow and 60 arrows. Let’s learn ranged combat.');
    tutorialEvent(event);
   }
  }
 }finally{tutorialGuidanceBusy=false;}
}
function tutorialGuidanceWorldGoal(goal){
 const event=tutorialStep()?.event;
 if(event==='ranged'&&insideTrainingPen(px,py)||event==='monster'&&!insideTrainingPen(px,py))return trainingPenGate;
 if(event==='cook-shrimp'&&!(s.bag.rawShrimp>0))return tutorialObject('fish');
 if(event==='bury'&&!(s.bag.bones>0))return tutorialTutor('worship');
 return goal;
}
function tutorialGuidanceAction(){
 if(!tutorialGuidanceActive())return null;
 const step=tutorialStep(),event=step.event,index=s.tutorial;
 const name=index<3?'Elder Rowan':index<7?'Arcanist Elowen':index<11?'Smith Orin':index<22?'Captain Vale':index<24?'Forester Ash':index<28?'Fisher Nell':index<32?'Cook Bram':index<35?'Banker Ada':index<38?'Keeper Sera':'Elder Rowan';
 const make=(key,instruction,selector=null,run=guide)=>({key:event+':'+key,title:step.title,speaker:name,instruction,selector,run,button:selector?'Show control':'Show me where',progress:''});
 const nav=(id,label)=>make('open-'+id,'Open '+label+'.','#gameTabs [data-tab="'+id+'"]',()=>openGamePanel(id));
 const bagOpen=()=>$('gameDock').hidden===false&&tab==='bag';
 const item=(id,verb='Tap',suffix='')=>!bagOpen()?nav('bag','Bag'):make('item-'+id,verb+' '+ITEMS[id].name+suffix+'.','#inventoryGrid [data-item-id="'+id+'"]',()=>openGamePanel('bag'));
 const world=(text,key='world')=>make(key,text);
 const selected=typeof selectedUseItem==='string'?selectedUseItem:null;
 const bench=window.realmWorkbench;
 if(s.tutorialMagicPending||['training-kit','ranged-kit'].includes(event))return make('space','Make room in your bag. Your tutor will give you the supplies automatically.',null,()=>openGamePanel('bag'));
 if(event==='camera')return world('Swipe the game view with one finger, or drag with your mouse, to turn the camera.');
 if(event==='walk')return world('Tap a clear patch of ground to walk there.');
 if(event.startsWith('talk-'))return world(event==='talk-finish'?'Speak to Elder Rowan to finish your apprenticeship.':'Speak to '+TUTORS[event.slice(5)].name+'.');
 if(event==='bag')return nav('bag','Bag');
 if(event==='skills')return nav('skills','Skills');
 if(event==='magic'){
  if(s.equipment.weapon!=='oakStaff'||s.spell!=='spark')return tab!=='spells'||$('gameDock').hidden?nav('spells','Magic'):make('spell','Tap Wind strike to ready your staff and spell.','[data-spell-id="spark"]',()=>openGamePanel('spells'));
  return world('Tap the practice dummy inside Elowen’s school to cast your spell.');
 }
 if(event==='ore')return world(s.bag.copperOre>0?'You have copper. Tap the tin rock to mine one tin ore.':'Tap the copper rock to mine one copper ore.',s.bag.copperOre>0?'tin':'copper');
 if(event==='smelt'||event==='smith'){
  const smelt=event==='smelt',id=smelt?'copperOre':'bronzeBar',kind=smelt?'furnace':'forge';
  if(bench?.kind===kind){
   if(bench.metal!=='bronze')return make('metal','Select Bronze.','[data-metal="bronze"]');
   return make('recipe',smelt?'Tap Bronze bar to smelt your ores.':'Tap Dagger to forge your bronze dagger.','[data-recipe-id="'+(smelt?'bronzeBar':'bronze_dagger')+'"]');
  }
  if(selected!==id&&!(smelt&&selected==='tinOre'))return item(id,'Tap',' to select it');
  return world(smelt?'Tap Orin’s furnace to use your selected ore.':'Tap Orin’s anvil to use your selected bronze bar.');
 }
 if(event==='equip-dagger')return item('bronze_dagger','Tap',' to equip it');
 if(event==='combat-stats')return window.equipmentOpen?make('stats','Tap Combat stats beneath your equipment.','#equipmentStats',openCombatStats):nav('gear','Equipment');
 if(event==='training-gear')return item(s.equipment.weapon!=='woodenSword'?'woodenSword':'woodenShield','Tap',' to equip it');
 if(event==='ranged-gear')return item(combatStyle()!=='ranged'?'shortbow':'arrows','Tap',' to equip it');
 if(event==='dummy')return world('Tap Vale’s training dummy and defeat it.');
 if(event==='monster')return world(insideTrainingPen(px,py)?'Tap a giant rat and defeat it.':'Walk through the gate into the rat pen.',insideTrainingPen(px,py)?'rat':'gate');
 if(event==='loot')return world('Pick up the bones from your rat’s drops.');
 if(event==='ranged')return insideTrainingPen(px,py)?make('leave','Walk out of the rat pen through its gate.',null,enterTrainingGate):world('Tap a giant rat across the fence and defeat it with your bow.','shoot');
 if(event==='tree')return world('Tap the marked tree to cut one log.');
 if(event==='fish')return world('Tap the fishing spot beside Nell to catch shrimp.');
 if(event==='fire'){
  if(!besideFishingTutor())return world('Walk to the clear ground beside Fisher Nell.');
  if(!(s.bag.logs>0))return world('Chop the tree beside Nell for a log.','log');
  if(typeof playerAction!=='undefined'&&playerAction)return world('Wait for your fire to catch.','lighting');
  const light=Array.from($('worldOptions')?.querySelectorAll('button')||[]).find(b=>/^Light fire/.test(b.textContent));
  if(light)return {...make('light','Choose Light fire.'),element:light};
  return item('logs','Right-click or hold',' to open its actions');
 }
 if(event==='cook-shrimp'){
  if(!(s.bag.rawShrimp>0))return world('Catch another shrimp at Nell’s fishing spot.','catch');
  if(!tutorialObject('fishing-fire'))return make('relight','Light another log beside Nell.',null,()=>openGamePanel('bag'));
  if(selected!=='rawShrimp')return item('rawShrimp','Tap',' to select it');
  return world('Tap the fire beside Nell to cook your shrimp.');
 }
 if(event==='mix-dough')return selected==='flour'?item('jugWater','Tap',' to mix bread dough'):item('flour','Tap',' to select it');
 if(event==='bake-bread')return selected==='breadDough'?world('Tap the kitchen range to bake your bread.'):item('breadDough','Tap',' to select it');
 if(event==='eat')return item(s.bag.bread>0?'bread':'shrimp','Tap',' to eat it');
 if(event==='deposit')return window.realmTrade?.kind==='bank'?make('deposit','Tap one item in your bag to deposit it.','#inventoryGrid [data-item-id]'):make('bank','Open Ada’s bank.',null,()=>{const ada=tutorialTutor('bank');if(ada&&Math.hypot(px-ada.x,py-ada.y)<2)openBank();else guide();});
 if(event==='withdraw')return window.realmTrade?.kind==='bank'?make('withdraw','Tap your stored item to withdraw it.','#tradeGrid [data-item-id]'):make('bank','Open Ada’s bank.',null,guide);
 if(event==='bury')return s.bag.bones>0?item('bones','Tap',' to bury them'):world('Speak to Keeper Sera for practice bones.');
 if(event==='spirit')return world('Speak to Cinder beside Sera to form a bond.');
 return world(step.desc);
}
const tutorialJournalNextAction=tutorialNextAction;
tutorialNextAction=function(){return tutorialGuidanceAction()||tutorialJournalNextAction();};
function renderTutorialGuidance(){
 if(tutorialGuidanceBusy)return;
 settleTutorialHandoffs();
 let action=tutorialGuidanceAction(),coach=$('tutorialCoach');
 if(!coach){coach=document.createElement('section');coach.id='tutorialCoach';coach.setAttribute('aria-label','Tutor guidance');coach.innerHTML='<div><strong id="tutorialCoachSpeaker"></strong><button id="tutorialCoachHide" type="button" aria-label="Minimize tutorial guidance">−</button></div><p id="tutorialCoachLine" role="status" aria-live="polite"></p><button id="tutorialCoachGuide" type="button">Show me where</button>';$('game').appendChild(coach);$('tutorialCoachHide').onclick=()=>{const collapsed=coach.classList.toggle('coach-collapsed');$('tutorialCoachHide').textContent=collapsed?'+':'−';$('tutorialCoachHide').setAttribute('aria-label',collapsed?'Expand tutorial guidance':'Minimize tutorial guidance');};}
 coach.hidden=!action;
 if(tutorialGuidanceTarget){tutorialGuidanceTarget.classList.remove('tutorial-next-control');tutorialGuidanceTarget=null;}
 if(!action){tutorialGuidanceKey='';return;}
 // Do not ask players to click scenery through a window. The close button is
 // itself the next action, while workbench and inventory steps remain usable.
 if($('modal').open&&!action.selector&&!action.element&&!npcDialogueState)action={...action,key:action.key+':close',instruction:'Close this window to continue.',selector:'#closeModal',run:close};
 const el=action.element||(action.selector?document.querySelector(action.selector):null);
 if(el&&!el.disabled&&(!el.getClientRects||el.getClientRects().length)){el.classList.add('tutorial-next-control');tutorialGuidanceTarget=el;}
 $('tutorialCoachSpeaker').textContent=action.speaker+' · '+(s.tutorial+1)+'/'+tutorialSteps.length;
 if($('tutorialCoachLine').textContent!==action.instruction)$('tutorialCoachLine').textContent=action.instruction;
 $('tutorialCoachGuide').textContent=action.selector?'Show control':'Show me where';
 $('tutorialCoachGuide').onclick=()=>{if(el){el.scrollIntoView?.({block:'nearest'});el.focus();}else action.run();};
 const key=(s.character.name||'')+':'+action.key;
 if(tutorialGuidanceKey!==key){
  tutorialGuidanceKey=key;
  if(typeof gameMessage==='function')gameMessage(action.speaker+': '+action.instruction,{action:()=>action.run()});
 }
}
function queueTutorialGuidance(){
 if(tutorialGuidanceQueued)return;tutorialGuidanceQueued=true;
 requestAnimationFrame(()=>{tutorialGuidanceQueued=false;renderTutorialGuidance();});
}
const guidedTutorialEvent=tutorialEvent;
tutorialEvent=function(event){guidedTutorialEvent(event);settleTutorialHandoffs();queueTutorialGuidance();};
const guidedTutorialRender=renderTutorial;
renderTutorial=function(){guidedTutorialRender();queueTutorialGuidance();};
const guidedRenderUI=renderUI;
renderUI=function(){guidedRenderUI();queueTutorialGuidance();};
document.addEventListener('click',queueTutorialGuidance);
document.addEventListener('contextmenu',queueTutorialGuidance);
document.addEventListener('pointerup',queueTutorialGuidance);
document.addEventListener('close',queueTutorialGuidance,true);
// Refresh position-dependent instructions without adding work to every frame.
let tutorialGuidancePosition='';
const guidedAdvanceMovement=advanceMovement;
advanceMovement=function(dt){const result=guidedAdvanceMovement(dt);if(tutorialGuidanceActive()){const key=s.x+','+s.y;if(key!==tutorialGuidancePosition){tutorialGuidancePosition=key;queueTutorialGuidance();}}return result;};
queueTutorialGuidance();
