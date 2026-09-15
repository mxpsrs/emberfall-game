'use strict';
// One observable action at a time. Keep the saved lesson IDs stable so existing
// apprentices resume without losing progress, belongings or remembered work.
let tutorialGuidanceBusy=false,tutorialGuidanceQueued=false,tutorialGuidanceKey='',tutorialGuidanceTarget=null;
// Banking keeps the existing saved lesson IDs. Its smaller milestones survive
// closing the window or reconnecting, without repeating a completed transfer.
function tutorialBankTransfer(id,withdraw){
 if(!tutorialGuidanceActive())return;
 const event=tutorialStep().event;
 if(!withdraw&&event==='deposit'){
  s.tutorialBankItem=id;s.tutorialBankPhase='withdraw';tutorialEvent('deposit');
 }else if(withdraw&&event==='withdraw'&&!['quantity','close'].includes(s.tutorialBankPhase)){
  if(s.tutorialBankItem&&s.tutorialBankItem!==id&&(s.bank[s.tutorialBankItem]||0)>0)return;
  s.tutorialBankItem=id;s.tutorialBankPhase='quantity';queueTutorialGuidance();
 }
}
function tutorialBankQuantity(){
 if(tutorialGuidanceActive()&&tutorialStep().event==='withdraw'&&s.tutorialBankPhase==='quantity'){
  s.tutorialBankPhase='close';save();queueTutorialGuidance();
 }
}
function tutorialBankClosed(){
 if(tutorialGuidanceActive()&&tutorialStep().event==='withdraw'&&s.tutorialBankPhase==='close'){
  s.tutorialBankPhase='done';tutorialEvent('withdraw');
 }
 queueTutorialGuidance();
}
const TUTORIAL_REASONS={
 camera:'You can turn the view without moving your character. Pinch to zoom, or use your mouse wheel.',
 walk:'Your character walks around obstacles. Hold or right-click anything in the world to see its available actions.',
 bag:'Your bag holds 25 spaces. Tap a material to select Use, then tap what you want to use it with. Hold or right-click for more actions.',
 skills:'Doing an activity earns experience in that skill. More XP raises its level and unlocks better equipment and activities.',
 magic:'Wind strike spends one air relic and one mind relic per cast. The school supplies practice relics; casting trains Magic.',
 ore:'Bronze needs one copper ore and one tin ore. Mining supplies the raw material; Smithing turns it into equipment.',
 smelt:'A furnace melts the two ores into one bronze bar. Select Bronze first, then the Bronze bar recipe.',
 smith:'The anvil shapes a bar into equipment. We are making a dagger you can keep after this lesson.',
 'equip-dagger':'Worn equipment appears on your character. The Equipment window shows each body slot; your bag stays beside it.',
 'training-gear':'The sword goes in your weapon hand and the shield in the other. Tap each one in your bag to wear it.',
 dummy:'Attacks repeat while your target is alive and in reach. Accurate trains Attack, Aggressive trains Strength, and Defensive trains Defense. A zero means the attack did no damage.',
 monster:'A live enemy fights back. Watch your health by the minimap and tap Eat when hurt. Food restores health; moving away stops your attack.',
 'ranged-gear':'A bow needs equipped ammunition. Carrying arrows in the bag alone is not enough; tap them to put them in the ammo slot.',
 ranged:'The fence blocks walking but allows arrows through. Stay outside it and close enough for your bow to reach the rat.',
 loot:'Defeated creatures leave items on the ground. Pick them up to put them in your bag. Save the bones for Sera.',
 tree:'Your axe lives on the tool belt, so you do not need to equip it. Logs become campfires and crafting supplies.',
 fish:'Raw shrimp are not ready to eat. Catch one now, then Nell will guide you through making a fire and cooking it.',
 fire:'A tinderbox from your tool belt lights the log. Use clear outdoor ground near Nell and wait for the lighting animation to finish.',
 'cook-shrimp':'Select the raw shrimp first, then use it on your fire. Cooked food has its own item icon and restores health.',
 'mix-dough':'Using flour on water combines the ingredients into dough. The highlighted item is the one you are currently using.',
 'bake-bread':'Use the dough on the kitchen range. Baking trains Cooking and gives you food to take into a fight.',
 eat:'Food restores missing health. At full health, trying Eat completes this lesson and keeps your meal for later.',
 deposit:'Your bank keeps supplies between visits and on the mainland. Only items in your bag are deposited; worn equipment stays on you.',
 withdraw:'A stored item returns to your bag when you withdraw it. You need enough free bag space.',
 bury:'Worship strengthens spirit attacks and improves your protection as it levels. Burying one bone gives 18 Worship XP. First bonds and spirit damage also train it.',
 spirit:'Choose your first elemental companion with Sera. Unleash opens your spirit choices in the chat box without stopping combat. Spirits reactivate after 30 seconds; rare twins take 45 seconds.',
 'talk-finish':'Your bank, belongings and skill levels travel with you. Rowan’s crossing to Briarhaven is one way.'
};
function tutorialGuidanceActive(){return !!s.character&&!!tutorialStep()&&currentScene==='tutorial';}
function settleTutorialHandoffs(){
 if(tutorialGuidanceBusy||!tutorialGuidanceActive())return;
 tutorialGuidanceBusy=true;
 try{
  let event=tutorialStep().event;
  if(s.tutorialMagicPending||(event==='magic'&&(!(s.gear.oakStaff>0)||!(s.bag.airRunes>0)||!(s.bag.runes>0)))){
   if(giveTutorialMagicSupplies()&&event==='talk-magic')tutorialEvent('talk-magic');
  }
  settleValeLesson();
 }finally{tutorialGuidanceBusy=false;}
}
function tutorialGuidanceWorldGoal(goal){
 const event=tutorialStep()?.event;
 if(valeLessonPending()&&['monster','ranged-kit'].includes(event))return tutorialTutor('combat');
 if(event==='ranged'&&insideTrainingPen(px,py)||event==='monster'&&!insideTrainingPen(px,py))return trainingPenGate;
 if(event==='cook-shrimp'&&!(s.bag.rawShrimp>0))return tutorialObject('fish');
 if(event==='bury'&&!(s.bag.bones>0))return tutorialTutor('worship');
 return goal;
}
function tutorialGuidanceAction(){
 if(!tutorialGuidanceActive())return null;
 const step=tutorialStep(),event=step.event,index=s.tutorial;
 const name=event==='talk-worship'&&s.tutorialBankPhase==='done'?'Banker Ada':index<5?'Elder Rowan':index<7?'Arcanist Elowen':index<11?'Smith Orin':index<21?'Captain Vale':index<23?'Forester Ash':index<27?'Fisher Nell':index<31?'Cook Bram':index<34?'Banker Ada':index<37?'Keeper Sera':'Elder Rowan';
 const make=(key,instruction,selector=null,run=guide)=>({key:event+':'+key,title:step.title,speaker:name,instruction,selector,run,button:selector?'Show control':'Show me where',progress:''});
 const nav=(id,label)=>make('open-'+id,'Open '+label+'.','#gameTabs [data-tab="'+id+'"]',()=>openGamePanel(id));
 const bagOpen=()=>$('gameDock').hidden===false&&tab==='bag';
 const item=(id,verb='Tap',suffix='')=>!bagOpen()?nav('bag','Bag'):make('item-'+id,verb+' '+ITEMS[id].name+suffix+'.','#inventoryGrid [data-item-id="'+id+'"]',()=>openGamePanel('bag'));
 const world=(text,key='world')=>make(key,text);
 const selected=typeof selectedUseItem==='string'?selectedUseItem:null;
 const bench=window.realmWorkbench;
 if(s.tutorialMagicPending||s.tutorialValePendingSpace)return make('space','Make room in your bag. Your tutor will give you the supplies automatically.',null,()=>openGamePanel('bag'));
 if(valeLessonPending())return world(['monster','ranged-kit'].includes(event)?'Come back to me for your next lesson.':'Finish speaking with me to receive your practice equipment.','vale-conversation');
 if(event==='camera')return world('Swipe the game view with one finger, or drag with your mouse, to turn the camera.');
 if(event==='walk')return world('Tap a clear patch of ground to walk there.');
 if(event.startsWith('talk-'))return world(event==='talk-finish'?'Speak to Elder Rowan to finish your apprenticeship.':event==='talk-worship'&&s.tutorialBankPhase==='done'?'That is banking learned. Find Keeper Sera at the shrine in the southwest. She will teach you Worship.':'Speak to '+TUTORS[event.slice(5)].name+'.');
 if(event==='bag')return {...nav('bag','Bag'),instruction:'Open your bag. This is where things go when you pick them up.'};
 if(event==='skills')return {...nav('skills','Skills'),instruction:'Open Skills. There is a lot to learn in this world, but my freedom fighters and I will show you the ropes.'};
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
 if(event==='equip-dagger')return !window.equipmentOpen?nav('gear','Equipment'):item('bronze_dagger','Tap',' to equip it');
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
 if(event==='deposit'||event==='withdraw'){
  if(window.realmTrade?.kind!=='bank')return make('bank','Open Ada’s bank to continue this lesson.',null,()=>{const ada=tutorialTutor('bank');if(ada&&Math.hypot(px-ada.x,py-ada.y)<2)openBank();else guide();});
  if(event==='deposit')return make('deposit','Tap the first highlighted item in your bag to deposit it.','#inventoryGrid [data-item-id]');
  if(s.tutorialBankPhase==='quantity')return make('quantity','Tap 1, 5, 10 or All to choose how many items each deposit or withdrawal moves.','.trade-quantity',tutorialBankQuantity);
  if(s.tutorialBankPhase==='close')return make('close-bank','Quantity set. Close the bank with × to finish my lesson.','#closeModal',close);
  const id=s.tutorialBankItem&&(s.bank[s.tutorialBankItem]||0)>0?s.tutorialBankItem:null;
  return make('withdraw','Now tap '+(id?ITEMS[id].name:'the highlighted stored item')+' in the bank to withdraw it.',id?'#tradeGrid [data-item-id="'+id+'"]':'#tradeGrid [data-item-id]');
 }
 if(event==='bury')return s.bag.bones>0?item('bones','Tap',' to bury them'):world('Speak to Keeper Sera for practice bones.');
 if(event==='spirit'){
  const bond=$('modalBody')?.querySelector('[data-spirit-choice]');
  if(bond)return {...make('bond','Choose any of the four elemental companions.'),element:bond};
  return world('Speak to Keeper Sera to choose your first elemental companion.');
 }
 return world(step.desc);
}
const tutorialJournalNextAction=tutorialNextAction;
tutorialNextAction=function(){return tutorialGuidanceAction()||tutorialJournalNextAction();};
function renderTutorialGuidance(){
 if(tutorialGuidanceBusy)return;
 settleTutorialHandoffs();
 let action=tutorialGuidanceAction();
 if(tutorialGuidanceTarget){tutorialGuidanceTarget.classList.remove('tutorial-next-control');tutorialGuidanceTarget=null;}
 if(!action){tutorialGuidanceKey='';document.getElementById('tutorialCoach')?.remove();return;}
 if(npcDialogueState){document.getElementById('tutorialCoach')?.remove();return;}
 if($('modal').open&&!action.selector&&!action.element&&!npcDialogueState)action={...action,key:action.key+':close',instruction:'Close this window to continue.',selector:'#closeModal',run:close};
 const el=action.element||(action.selector?document.querySelector(action.selector):null);
 if(el&&!el.disabled&&(!el.getClientRects||el.getClientRects().length)){el.classList.add('tutorial-next-control');tutorialGuidanceTarget=el;}
 const key=(s.character.name||'')+':'+action.key;
 renderTutorialCoach(action,key);
 if(tutorialGuidanceKey!==key){
  tutorialGuidanceKey=key;
  if(typeof gameMessage==='function')gameMessage(action.speaker+': '+action.instruction,{action:()=>{questJournalSelection='tutorial';openGamePanel('quests');}});
  if(tab==='quests'&&!$('gameDock').hidden&&questJournalSelection==='tutorial')renderQuestJournal();
 }
}
function renderTutorialCoach(action,key){
 let coach=document.getElementById('tutorialCoach');
 const inWindow=$('modal').open&&(window.realmTrade||window.realmWorkbench||action.element?.closest?.('#modalBody'));
 const parent=inWindow?$('modalBody'):$('game');
 if(!coach){coach=document.createElement('section');coach.id='tutorialCoach';coach.setAttribute('aria-label','Tutorial guidance');}
 if(coach.parentElement!==parent)parent.prepend(coach);
 coach.className='tutorial-coach'+(inWindow?' tutorial-coach-inline':'');
 if(coach.dataset.action===key)return;
 coach.dataset.action=key;coach.replaceChildren();
 const bank=window.realmTrade?.kind==='bank';
 const label=document.createElement('strong');label.textContent=bank?'Ada: ':action.speaker+' · '+action.title;coach.appendChild(label);
 const instruction=document.createElement('p');instruction.setAttribute('role','status');instruction.textContent=action.instruction;coach.appendChild(instruction);
 const why=bank?null:TUTORIAL_REASONS[tutorialStep()?.event];
 if(why){const details=document.createElement('details'),summary=document.createElement('summary'),copy=document.createElement('p');summary.textContent='How this works';copy.textContent=why;details.append(summary,copy);coach.appendChild(details);}
 if(bank)return;
 const button=document.createElement('button');button.type='button';button.textContent=action.button;button.onclick=()=>{
  if(action.button==='Got it'){action.run();return;}
  const target=action.element||(action.selector?document.querySelector(action.selector):null);
  if(target){target.scrollIntoView?.({block:'nearest'});target.focus?.({preventScroll:true});}
  else action.run();
 };coach.appendChild(button);
}
function queueTutorialGuidance(){
 if(tutorialGuidanceQueued)return;tutorialGuidanceQueued=true;
 requestAnimationFrame(()=>{tutorialGuidanceQueued=false;renderTutorialGuidance();});
}
const guidedTutorialEvent=tutorialEvent;
tutorialEvent=function(event){guidedTutorialEvent(event);queueTutorialGuidance();};
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
