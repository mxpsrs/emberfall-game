'use strict';
const creatorBeforeRebuild=openCreator;
openCreator=function(edit=false){
 creatorDraft={race:s.character?.race||'human',frame:s.character?.frame||'male',hair:s.character?.hair??0};
 $('creatorRace').value=creatorDraft.race;$('creatorFrame').value=creatorDraft.frame;$('creatorHair').value=String(creatorDraft.hair);
 creatorBeforeRebuild(edit);
 $('creatorIntro').textContent=edit?'Change your appearance. Your progress stays with you.':'Choose your heritage, appearance, and name to begin your adventure.';
 $('characterName').placeholder='Adventurer name';
};
for(const [id,key]of [['creatorRace','race'],['creatorFrame','frame'],['creatorHair','hair']])$(id).addEventListener('change',()=>{if(!creatorDraft)return;creatorDraft[key]=key==='hair'?Number($(id).value):$(id).value;renderLooks();});
$('creator').addEventListener('close',()=>{creatorDraft=null;});
startRebuiltRealm();
