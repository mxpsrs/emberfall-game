'use strict';
// Vale resumes the conversation at each milestone. Gifts and acknowledgements
// are saved separately, so reconnecting cannot duplicate a kit or skip a speech.
let valeApproachKey='';
function valeLessonPending(){
 const event=tutorialStep()?.event;
 return event==='training-kit'||event==='ranged-kit'||event==='monster'&&!s.tutorialGifts?.valeRatBriefed;
}
function showValeLesson(event=tutorialStep()?.event){
 const speak=(text,done)=>dialog('Captain Vale','<p>'+text+'</p>',[['Continue',()=>{close();done();queueTutorialGuidance();}]]);
 if(event==='talk-combat'){
  speak('Welcome to the training yard. Open your Equipment tab, then equip the bronze dagger you just made from the bag beside it.',()=>tutorialEvent('talk-combat'));return true;
 }
 if(event==='training-kit'||event==='ranged-kit'){
  const melee=event==='training-kit',key=melee?'combat':'ranged',items=melee?{woodenSword:1,woodenShield:1,shrimp:3}:{shortbow:1,arrows:60};
  if(!s.tutorialGifts?.[key]&&inventorySlots().length+tutorialGiftSpace(items)>BAG_SIZE){s.tutorialValePendingSpace=true;return true;}
  s.tutorialValePendingSpace=false;if(!grantTutorialItems(key,items))return true;
  if(melee)s.tutorialGifts.combatFood=true;
  speak(melee?'Good job. But that dagger is not a proper weapon for this practice. Here is a wooden sword and shield, and some food. Equip the sword and shield, then practise on that dummy over there.':'Great job against that rat. Now it is time to learn ranged attacks. Here is a shortbow and 60 arrows. Equip the bow and the arrows, stay outside the fence, and kill a rat by shooting across it.',()=>tutorialEvent(event));return true;
 }
 if(event==='monster'&&!s.tutorialGifts?.valeRatBriefed){
  speak('Great job on the dummy. Now I want to see how you fare against a real enemy. Go through the gate into the rat pen and defeat a giant rat with your sword and shield. Eat some food if you get hurt.',()=>{s.tutorialGifts??={};s.tutorialGifts.valeRatBriefed=true;save();});return true;
 }
 if(['equip-dagger','training-gear','dummy','monster','ranged-gear','ranged','loot'].includes(event)){
  speak(tutorialStep().desc,()=>{});return true;
 }
 return false;
}
function settleValeLesson(){
 if(!valeLessonPending()){valeApproachKey='';s.tutorialValePendingSpace=false;return;}
 if(npcDialogueState)return;
 const event=tutorialStep().event,vale=tutorialTutor('combat');
 if(event==='training-kit'){showValeLesson(event);return;}
 if(!vale)return;
 if(Math.hypot(px-vale.x,py-vale.y)<=1.6){showValeLesson(event);return;}
 const key=(s.character?.name||'')+':'+event;
 if(valeApproachKey===key)return;
 valeApproachKey=key;
 if(typeof gameMessage==='function')gameMessage('Captain Vale: Good work! Come back over here for your next lesson.');
 // Use the normal route and gate handling; never teleport through the fence.
 engage(vale);
}
