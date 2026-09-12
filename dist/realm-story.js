'use strict';
const FREEDOM_FIGHTER_STORIES={
 guide:'My name is Rowan. I summoned you from another world. A blight is spreading across our three kingdoms, and everyone born under our skies is bound by its curse. You alone came from beyond its reach. You may be the only one who can stop him.\nThis is Firstlight Isle, a refuge between worlds. I cannot send you into ours unprepared. I gathered these freedom fighters to teach you how to survive there. Each of them has kept our people alive in a different way.\nFirst, learn where your belongings and skills are kept. Then find Forester Ash west of this square. When every lesson is done, return to me. I will open your one-way crossing to Briarhaven.',
 woods:'I used to supply timber to the king’s garrisons. Now my wood shelters the people they drove from their homes. A fighter who cannot make a camp does not last long.\nTap the marked tree to cut a log. Your axe is on your tool belt. Then find Fisher Nell at Stillwater, west of the square. She will teach you to feed yourself when supplies run out.',
 fishing:'We have hidden families along these shores. I can catch supper, hide our tracks, and have the children asleep before a patrol passes. You will need more than a sharp blade in the kingdoms.\nCatch shrimp at the marked fishing spot. Hold a log and choose Light fire beside me. Then select your raw shrimp and tap that fire to cook it. There is a tree beside me if you need another log.\nOnce you have cooked a catch, visit Bram in the kitchen east of the square. He kept our fighters fed through the siege.',
 cooking:'Rowan says you are our chance to end this. To me, you look like someone who needs a meal. Freedom fighters still get hungry, and no one wins a battle on an empty stomach.\nTake this flour and water. Select the flour, then tap the water to make dough. Select the dough and tap the range to bake bread. Keep the food for when you are hurt.\nFind Smith Orin in the yard east of the square afterward. He can teach you to make a weapon when there is no one left to sell you one.',
 mining:'We lost the royal forges when the garrisons turned. Every weapon we carry now is made or repaired by our own hands. I will teach you to do the same.\nMine a copper ore and a tin ore in this yard. Select either ore and use it on the furnace, then choose the bronze bar recipe. Select the bar, use it on the anvil, and choose Dagger.\nCaptain Vale is at the training yard south of the village. Take your dagger to her. She will make sure you know which end to hold.',
 combat:'I swore to protect the people, not the crown. When the soldiers forgot the difference, I left—and brought everyone I could with me. Courage matters. Preparation keeps you alive.\nEquip the bronze dagger you made, then inspect your combat stats. After that I will give you a wooden sword and shield. Practise on the dummy before entering the rat pen.\nKeep food ready. Defeat a rat and collect its bones and coins. When you are finished, visit Ada in the bank north of the yard. A freedom fighter protects their supplies as carefully as their friends.',
 bank:'I moved our stores out before the garrison could seize them. Food, tools, coins—none of it means much if it is lost on the road.\nYour bank is shared with the one waiting on the mainland. Deposit something from your bag, then withdraw it. Worn equipment stays separate.\nKeeper Sera waits at the shrine south of the square. Ask her why even a desperate resistance takes time to honour the fallen.',
 worship:'We fight so the living can have a future. We remember the dead so we do not forget why. Our bonds with the spirits began long before the blight.\nBury bones from your bag to train Worship. Then meet Cinder beside the shrine and form a bond. A spirit is a companion, not a possession.\nArcanist Elowen is in the school east of the bank. She helped Rowan open the passage that brought you here. Now she will teach you to command a little of that power yourself.',
 magic:'Calling someone across worlds takes more than magic. It takes trust that the person who answers will choose to help. Rowan made that choice. Now yours begins.\nTake this staff and these runes. Equip the staff with the Magic icon, then cast at my practice dummy. Wind strike uses an air rune and a mind rune. Your Magic skill grows with practice.\nWhen you have made your first cast, return to Rowan in the square. The crossing to the mainland is ready. Once you leave this refuge, there is no road back.'
};
for(const [role,text]of Object.entries(FREEDOM_FIGHTER_STORIES))TUTORS[role].text=text;
const openingStep=tutorialSteps.find(t=>t.event==='talk-guide');openingStep.title='Answer the stranger’s call';openingStep.desc='A mysterious man is calling you over from the square. Find out where you are—and why he brought you here.';
const lastLesson=tutorialSteps.find(t=>t.event==='talk-finish');lastLesson.title='Cross into the threatened world';lastLesson.desc='Return to Rowan. The freedom fighters have prepared you. Ask him to open the one-way crossing to Briarhaven on the mainland.';
function applyStoryIdentity(){const guide=tutorialTutor('guide');if(!guide)return;const met=s.metRowan||s.tutorial>tutorialSteps.findIndex(t=>t.event==='talk-guide');guide.name=met?'Elder Rowan':'Mysterious man';TUTORS.guide.name=guide.name;if(met)s.metRowan=true;}
const villageBeforeStory=setupTutorialVillage;
setupTutorialVillage=function(){villageBeforeStory();applyStoryIdentity();if(s.tutorial>2)s.storyOpeningSeen=true;};
function maybeShowStoryOpening(){
 if(!assetsReady||!s.character||currentScene!=='tutorial'||s.storyOpeningSeen||$('creator').open||$('modal').open)return;
 s.storyOpeningSeen=true;save();const stranger=tutorialTutor('guide');
 openNpcDialogue(stranger,['You awaken on unfamiliar grass. The last sky you remember was not this one. A stranger waits by the square, watching you.','Over here, traveller. Easy now. You have crossed a very long way. Come to me when you can stand; there is much I must explain.'],[['Get to your feet',close]],'An awakening between worlds');
}
const tutorialBeforeStory=tutorialEvent;
tutorialEvent=function(event){
 if(event==='talk-guide'&&tutorialStep()?.event===event){s.metRowan=true;applyStoryIdentity();}
 const before=s.tutorial;const result=tutorialBeforeStory(event);if(s.tutorial!==before&&typeof playGameSound==='function')playGameSound(tutorialStep()?'lesson':'quest');return result;
};
const tutorBeforeStory=talkTutor;
talkTutor=function(o){
 if(o.tutor==='guide'&&currentScene==='tutorial'){
  if(tutorialStep()?.event==='talk-finish'){
   openNpcDialogue(o,['You arrived here with nothing but the clothes you wore in another world. Now you have learned to gather, make, fight, and stand beside the spirits. My freedom fighters have taught you what they can.','The blight’s curse could not follow you across the veil. That is why I called you—and why our last hope rests with you. But what you do with that hope must be your choice.','I will send you to Briarhaven on the mainland. Your belongings, your bank, and everything you learned will travel with you. The crossing will close behind you. You cannot return to Firstlight Isle.'],[['I am ready. Send me to the mainland.',()=>{close();tutorialEvent('talk-finish');}],['I need a little more time.',close]],'The one-way crossing');return;
  }
  if(tutorialStep()?.event!=='talk-guide'){openNpcDialogue(o,['The fighters are here to help you. '+tutorialStep().desc], [['Continue learning',close]],'Preparing for the crossing');return;}
 }
 return tutorBeforeStory(o);
};
