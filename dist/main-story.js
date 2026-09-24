'use strict';
// Arc One preserves legacy stage boundaries while replacing the investigation.
const MAIN_STORY_QUESTS=[
 {title:'Orders of the Dead',start:0,end:7,coins:200,xp:{Attack:250,Defense:250,Hitpoints:150},item:'rellanSignet',unlocks:['The Last Shift','Northern-road evidence archive','Raider Camp access']},
 {title:'The Last Shift',start:7,end:18,coins:300,xp:{Mining:400,Smithing:400,Hitpoints:200},item:'ironhollowBelt',unlocks:['Whispers at Hollow Shrine','Ironhollow lower workings']},
 {title:'Whispers at Hollow Shrine',start:18,end:25,coins:400,xp:{Magic:500,Hitpoints:250,Worship:250},item:'whisperPendant',unlocks:['The King Beneath the Mountain','Hollow Shrine research']}
];
const MAIN_STORY_STEPS=[
 ['Speak to Captain Rellan in Briarhaven after Firstlight Apprenticeship. Recommended Combat 8.','rellan'],
 ['Hear surviving wagon driver Tovin’s account of the courier attack.','driver'],
 ['Investigate the damaged cart, cut harness, courier’s body and tracks at Redclay Bend.','clues'],
 ['Follow the heavy eastbound prints at the split-trail marker.','trail'],
 ['Reach the fortified raider camp and defeat its west-gate lookout.','lookout'],
 ['Search the paid raiders’ dispatch satchel beside their stolen cargo.','dispatch'],
 ['Hand the forged royal orders to Rellan. Explain the withdrawn patrols and passage toward Ironhollow.','rellan'],
 ['Show Hesta your evidence at Ironhollow’s rescue camp. Requires Mining 5 and Smithing 5. Recommended Combat 10.','hesta'],
 ['Enter the Freight Mine. Examine the sabotaged lift at the lower loading hall.','lift'],
 ['Clear the western maintenance passage with your pickaxe. Avoid the marked falling-stone patches.','airway'],
 ['Recover usable iron from the collapsed support farther along the alternate route.','support'],
 ['Use the underground rescue anvil to forge a brace for the refuge entrance.','forge'],
 ['Install the forged locking pin and secure the lift brake.','lift'],
 ['Investigate the secret excavation, then seat the lift counterweight to open the refuge ramp.','excavation'],
 ['Reach Bera in the western refuge. Brace the entrance and ask her to follow.','bera'],
 ['Find Oren in the adjoining refuge. Bring both workers back together.','oren'],
 ['Escort Bera and Oren through the winding mine to Hesta. Stay close; they wait if separated.','escort'],
 ['Report the rescue, deliberate sabotage and impossible voices to Hesta.','hesta'],
 ['Meet Scholar Ilyra at the abandoned pilgrim camp southwest of Ironhollow. Magic 5; recommended Combat 12.','ilyra'],
 ['Explore Hollow Shrine: Bell on the approach, Lantern in the buried pilgrim hall, Hand in the eastern archive.','stones'],
 ['Compare genuine and altered memories with Ilyra at the pilgrim camp.','ilyra'],
 ['Enter the shrine’s deepest chamber. Restore the oath: warning, light, then mercy.','shrine'],
 ['Defeat the Echo Shade feeding in the shrine’s buried reliquary.','shade'],
 ['Stabilize the physical Memory Shard in the reliquary.','shrine'],
 ['Bring the Memory Shard to Ilyra. The surviving energy points beneath Ironhollow.','ilyra'],
 ['Bring the Memory Shard and your evidence journal to Archivist Maerin in Ironhollow.','maerin']
];
const MAIN_STORY_CLUES={
 cart:['Attacked royal courier cart','A broken wheel and two embedded arrows mark a prepared ambush. The strongbox is untouched; the dispatch sleeve was cut away. Whoever hired the attackers wanted orders, not money.'],
 harness:['Cut harness and discarded raider knife','The leather was sliced while the wagon stood still. The discarded knife matches raider equipment. Someone planned to stop the courier here.'],
 body:['Fallen royal courier','The courier’s torn tabard bears Briarhaven’s crest. His stiff hand holds a duty slip: northern patrols were withdrawn before he reached the bend. Tovin’s account and the wounds agree.'],
 boots:['Eastbound heavy bootprints','Heavy boots lead east through red clay, away from the courier’s riding-shoe prints. Beyond them, narrow crate-wheel ruts continue toward Ironhollow.']
};
const MAIN_STORY_STONES={
 bell:['Oathstone of the Bell','A genuine pilgrim memory: “First sound the bell to warn the road.” Beneath it, Tovin’s remembered words repeat: “They left the strongbox.” You heard him say this in Briarhaven.'],
 lantern:['Oathstone of the Lantern','Bera’s voice: “I called Oren below after the warning bell.” This contradicts her testimony: dust had taken her voice before the bell. Someone altered this memory. The old sigil still means Light.'],
 hand:['Oathstone of the Hand','An older, broken memory: “Warning, then light, then lend a hand. Wardkeepers ... Ironhollow ... keep the fragments together.” Fresh chisel scars surround an empty seal socket. Recent visitors removed something.']
};
CREATURE_LAIRS.story_mine={title:'Ironhollow Freight Mine',subtitle:'The Last Shift · Sabotaged workings and miners’ refuges',quest:true,theme:'ork',size:[50,92],entry:[25,86],arena:[25,25],entrance:[842,187],floor:'#514d46',trim:'#99866b',glow:'#d7b77d',fog:[.14,.13,.12],ambient:[.94,.9,.82],light:[.2,.15,.07],rooms:[['rect',4,5,18,19],['rect',17,12,15,9],['rect',20,72,11,17],['ellipse',25,69,13,12],['rect',9,47,8,25],['rect',10,44,30,8],['rect',32,24,8,26],['ellipse',25,22,16,15]]};
CREATURE_LAIRS.story_shrine={title:'Hollow Shrine',subtitle:'Whispers at Hollow Shrine · The buried pilgrim halls',quest:true,theme:'arcane',size:[62,112],entry:[30,105],arena:[30,18],entrance:[677,363],floor:'#414c49',trim:'#8f9b89',glow:'#92cabb',fog:[.10,.15,.15],ambient:[.82,.94,.91],light:[.08,.15,.15],rooms:[['rect',26,88,9,20],['ellipse',30,86,12,12],['rect',10,78,22,8],['rect',9,58,9,25],['ellipse',16,56,12,12],['rect',15,47,35,9],['rect',42,27,9,26],['ellipse',45,27,12,12],['rect',27,18,22,9],['ellipse',29,18,14,13]]};
function mainStoryFound(key){for(const [scene,w]of Object.entries(worldScenes)){const o=w.objects.find(o=>o.mainStoryKey===key);if(o)return {scene,o};}return null;}
function mainStoryState(){
 let q=s.mainStoryQuest;if(!q||typeof q!=='object'||Array.isArray(q))q=s.mainStoryQuest={};
 const legacy=q.version!==3&&q.stage>0;q.version=3;q.stage=Number.isInteger(q.stage)?Math.max(0,Math.min(25,q.stage)):0;
 for(const [field,keys]of [['clues',MAIN_STORY_CLUES],['stones',MAIN_STORY_STONES]])q[field]=Array.isArray(q[field])?[...new Set(q[field].filter(k=>keys[k]))]:[];
 if(legacy){if(q.stage>=7)q.reward1=true;if(q.stage>=18)q.reward2=true;if(q.stage>=25)q.reward3=true;if(q.stage>2&&!q.clues.includes('body'))q.clues.push('body');q.arcMigrated=true;}
 q.runes=Number.isInteger(q.runes)?Math.max(0,Math.min(2,q.runes)):0;
 q.rescued=Array.isArray(q.rescued)?[...new Set(q.rescued.filter(k=>['bera','oren'].includes(k)))]:[];return q;
}
function mainStoryComplete(){return mainStoryState().stage===25;}
function mainStoryTitle(stage=mainStoryState().stage){return MAIN_STORY_QUESTS.find(q=>stage<q.end)?.title||'The King Beneath the Mountain';}
// Briarhaven owns 6200000–6299999. Story IDs must also be unique among
// non-combat scenery: receipt lookup searches every object in the scene.
let mainStoryReady=false,mainStorySerial=6300000,mainStoryWork=null;
function mainStoryObject(key){return mainStoryFound(key)?.o;}
function mainStoryPlace(key,name,x,y,extra={}){
 const scene=extra.storyScene||'overworld',p=encounterSpawnPoint(scene,x,y,24);if(!p)throw new Error('No safe story position: '+key);
 const [a,b]=p,o={id:mainStorySerial++,mainStoryKey:key,type:'prop',sprite:12,name,x:a,y:b,drawX:a,drawY:b,homeX:a,homeY:b,dead:0,_stationary:true,...extra};worldScenes[scene].objects.push(o);return o;
}
function setupMainStory(){
 if(mainStoryReady)return;mainStoryReady=true;const b=SETTLEMENTS.find(t=>t.id==='briarhaven'),h=SETTLEMENTS.find(t=>t.id==='ironhollow');
 setupRaiderCamp();
 const npc=(key,name,x,y,race='human',storyScene='overworld')=>mainStoryPlace(key,name,x,y,{type:'questgiver',characterSprite:true,sprite:2,race,storyScene});
 const prop=(key,name,x,y,model,storyScene='overworld')=>mainStoryPlace(key,name,x,y,{mountainModel:model,storyScene});
 npc('rellan','Captain Rellan',b.x+7,b.y+9);npc('driver','Wagon driver Tovin',b.x+23,b.y+12);
 prop('cart',MAIN_STORY_CLUES.cart[0],b.x+90,b.y+72,'World_Workbench');
 prop('harness',MAIN_STORY_CLUES.harness[0],b.x+93,b.y+75,'World_WeaponStand');
 prop('boots',MAIN_STORY_CLUES.boots[0],b.x+100,b.y+74,'Rock_Medium_1');
 prop('body',MAIN_STORY_CLUES.body[0],b.x+88,b.y+75,'World_Bed_Twin1');
 prop('trail','Split-trail road marker',b.x+117,b.y+78,'World_BookStand');
 const lookout=mainStoryPlace('lookout','Raider lookout',212,142,{type:'enemy',kind:'storylookout',mainStoryStage:4,sprite:species.bandit?.sprite||2});
 applyEnemyTier(lookout,{...ENEMY_TIERS.bandit,look:'bandit',name:'Raider lookout',hp:18,level:8,maxHit:2});
 prop('dispatch','Lookout’s dispatch satchel',227,143,'World_BookStand');
 const mine=CREATURE_LAIRS.story_mine,entrance=mine.entrance;
 npc('hesta','Forewoman Hesta',entrance[0]-7,entrance[1]+7,'dwarf');
 prop('lift','Broken freight lift',25,65,'World_Workbench','story_mine');
 prop('airway','Blocked ventilation grate',12,57,'Rock_Medium_1','story_mine');
 prop('support','Collapsed iron support',14,47,'Rock_Medium_1','story_mine');
 prop('forge','Underground rescue anvil',34,45,'World_Workbench','story_mine');
 prop('excavation','Unrecorded excavation and coded supplies',31,24,'World_BookStand','story_mine');
 const crawler=mainStoryPlace('crawler','Disturbed cave crawler',35,34,{storyScene:'story_mine',type:'enemy',kind:'storycrawler',sprite:species.rat.sprite});
 applyEnemyTier(crawler,{...ENEMY_TIERS.cavecrawler,look:'rat',name:'Disturbed cave crawler',level:10,hp:24,maxHit:3});
 npc('bera','Miner Bera',12,16,'dwarf','story_mine');npc('oren','Miner Oren',17,16,'dwarf','story_mine');
 npc('ilyra','Scholar Ilyra',h.x-155,h.y+156,'elf');
 prop('bell',MAIN_STORY_STONES.bell[0],h.x-185,h.y+180,'Rock_Medium_1');
 prop('lantern',MAIN_STORY_STONES.lantern[0],16,58,'Rock_Medium_1','story_shrine');
 prop('hand',MAIN_STORY_STONES.hand[0],45,29,'Rock_Medium_1','story_shrine');
 prop('shrine','Shrine of the Borrowed Voice',27,11,'Rock_Medium_1','story_shrine');
 const shade=mainStoryPlace('shade','Echo shade',31,19,{storyScene:'story_shrine',type:'enemy',kind:'storyshade',mainStoryStage:22,sprite:species.skeleton.sprite});
 applyEnemyTier(shade,{...ENEMY_TIERS.skeleton,look:'skeleton',name:'Echo shade',hp:26,level:12,maxHit:3,style:'magic',weak:'ranged',tint:[.7,.85,1.2]});syncMainStoryWorld();
}
const mainStorySetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){mainStorySetupBefore();setupMainStory();};
function mainStoryMoveMiner(key,scene,point){
 const found=mainStoryFound(key);if(!found)return;const o=found.o;
 if(found.scene!==scene){found.o&&worldScenes[found.scene].objects.splice(worldScenes[found.scene].objects.indexOf(o),1);worldScenes[scene].objects.push(o);}
 Object.assign(o,{x:point[0],y:point[1],drawX:point[0],drawY:point[1]});
}
function syncMainStoryWorld(){
 if(!mainStoryReady)return;const q=mainStoryState(),h=mainStoryObject('hesta');
 for(const key of ['bera','oren']){
  const o=mainStoryObject(key),saved=q.positions?.[key],scene=q.escortScene==='overworld'?'overworld':'story_mine';
  const safe=Array.isArray(saved)&&saved.length===2&&saved.every(Number.isFinite)&&(scene==='story_mine'?saved[0]>1&&saved[0]<49&&saved[1]>1&&saved[1]<91:Math.hypot(saved[0]-h.x,saved[1]-h.y)<100);
  if(q.stage>=17||q.rescued.includes(key))mainStoryMoveMiner(key,'overworld',encounterSpawnPoint('overworld',h.x+(key==='bera'?2:-2),h.y+3,12)||[h.x,h.y+3]);
  else mainStoryMoveMiner(key,safe&&q.stage>=15?scene:'story_mine',safe&&q.stage>=15?saved:[o.homeX,o.homeY]);
 }
 realmNavigation.clear();mapServicesCache=null;objects.splice(0,objects.length,...worldScenes[currentScene].objects);
}
// Escort transitions carry both miners through the physical mine mouth, never
// through a quest-guide teleport. Old completed and partially rescued saves survive.
const mainStoryLeaveBefore=leaveInterior;
leaveInterior=function(){
 const q=mainStoryState();
 if(currentScene==='story_mine'&&q.stage===16){
  const waiting=['bera','oren'].filter(k=>!q.rescued.includes(k));
  if(waiting.some(k=>{const o=mainStoryObject(k);return Math.hypot(o.x-px,o.y-py)>12;})){stop();toast('Bera and Oren are waiting in the mine. Bring them close before leading them out.');return false;}
  const result=mainStoryLeaveBefore();if(currentScene==='overworld'){
   q.escortScene='overworld';for(const [i,k]of waiting.entries()){const p=encounterSpawnPoint('overworld',px+i*2,py+2,8)||[px,py];mainStoryMoveMiner(k,'overworld',p);(q.positions??={})[k]=p;}
   objects.splice(0,objects.length,...worldScenes.overworld.objects);save();
  }return result;
 }return mainStoryLeaveBefore();
};
function mainStoryAdvance(stage,o,change={},rewardIndex=null){
 const q=mainStoryState();if(q.stage!==stage||o&&!mountainNear(o))return false;if(stage===0&&!tutorialComplete(s))return false;
 if(stage===23&&!arcGiveItem('memoryShard'))return false;
 if(stage===5&&!arcGiveItem('forgedOrders'))return false;
 if(stage===6){if(!arcConsumeItem('forgedOrders')&&!q.arcMigrated){toast('Recover a copy from the raiders’ dispatch satchel.');return false;}change.forgedOrdersRecorded=true;}
 if(stage===7&&(lv('Mining')<5||lv('Smithing')<5)||stage===18&&lv('Magic')<5)return false;
 Object.assign(q,change,{stage:stage+1});
 // Completion, XP and currency are stored atomically in the same save. Overflow goes to the bank.
 if(rewardIndex!==null){const r=MAIN_STORY_QUESTS[rewardIndex],key='reward'+(rewardIndex+1);if(!q[key]){q[key]=true;
  const carried=canCarry('coins')?Math.min(r.coins,Math.max(0,COIN_LIMIT-(s.bag.coins||0))):0;s.bag.coins=(s.bag.coins||0)+carried;
  if(carried<r.coins){s.bank??={};s.bank.coins=(s.bank.coins||0)+r.coins-carried;toast('Your quest coins were sent to the bank.');}
  arcGiveItem(r.item);for(const [skill,xp]of Object.entries(r.xp))gain(skill,xp,true);showExperienceDrop(r.xp);if(typeof showQuestCompletion==='function')showQuestCompletion({title:r.title,coins:r.coins,xp:r.xp,unlocks:[ITEMS[r.item].name,...r.unlocks],note:carried<r.coins?(r.coins-carried)+' coins were sent to your bank. Experience has been awarded.':undefined});
 }}
 for(const key of ['lift','airway','bell','lantern','hand','shrine']){const prop=mainStoryObject(key);if(prop){const variants=staticMeshes3.get(prop);if(variants&&realmGPU)for(const mesh of variants.values()){const entry=realmGPU.cache.get(mesh);if(entry){realmGPU.gl.deleteBuffer(entry.buffer);realmGPU.cache.delete(mesh);}}staticMeshes3.delete(prop);}}
 save();renderUI();toast(rewardIndex===null?'Quest updated: '+MAIN_STORY_STEPS[q.stage][0]:MAIN_STORY_QUESTS[rewardIndex].title+' complete · '+MAIN_STORY_QUESTS[rewardIndex].coins+' coins · '+Object.entries(MAIN_STORY_QUESTS[rewardIndex].xp).map(([k,n])=>n+' '+k+' XP').join(' · '));return true;
}
function mainStoryOffer(o,stage,pages,label,change={},reward=null){openNpcDialogue(o,pages,[[label,()=>{if(mainStoryAdvance(stage,o,change,reward))close();}],['I need more time.',close]],mainStoryTitle(stage));}
function mainStoryWorkStart(o,stage,skill,level,label,change={}){
 if(mainStoryState().stage!==stage||!mountainNear(o))return false;if(lv(skill)<level){toast('Requires '+skill+' '+level+'.');return false;}if(skill==='Mining'&&!useBeltTool('pickaxe'))return false;
 close();stop();mainStoryWork={o,stage,skill,level,label,change,age:0};playerHeading=Math.atan2(o.x-px,o.y-py);renderAction();return true;
}
const mainStoryStopBefore=stop;stop=function(){mainStoryWork=null;return mainStoryStopBefore();};
const mainStoryGatherBefore=gatheringActivity;gatheringActivity=function(){if(mainStoryWork?.skill==='Mining')return {object:mainStoryWork.o,tool:'pickaxe',phase:(mainStoryWork.age%.8)/.8};return mainStoryGatherBefore();};
const mainStoryActionBefore=renderAction;renderAction=function(){mainStoryActionBefore();if(mainStoryWork){$('targetTitle').textContent=mainStoryWork.label;$('targetSub').textContent='Working… Move to cancel.';}};
function mainStoryMechanism(o){
 const q=mainStoryState();if(![12,13].includes(q.stage))return;
 dialog('Freight lift safety controls','<p>The safety plate reads: <b>Air before entry. Pin the brake. Seat the weight. Open the ramp.</b></p><p>'+(!q.brake?'The forged locking pin fits the brake socket.':'The brake is locked. The counterweight can now lift the refuge ramp.')+'</p>',[
 ['Install the pin and secure the brake.',()=>{if(!mountainNear(o))return;if(q.stage!==12){toast('The brake is secured. Seat the counterweight next.');return;}mainStoryWorkStart(o,12,'Smithing',5,'Pinning the lift brake',{brake:true});}],
 ['Seat the counterweight and open the ramp.',()=>{if(!mountainNear(o))return;if(q.stage===12){toast('The safety catch holds. Pin the brake before moving the weight.');return;}if(!q.excavation){toast('Inspect the unrecorded excavation first. Make sure nobody is working behind the ramp.');return;}mainStoryWorkStart(o,13,'Smithing',5,'Seating the lift counterweight',{ramp:true});}]
 ]);
}
function mainStoryRunes(o){
 const q=mainStoryState();if(q.stage!==21||!mountainNear(o))return;
 dialog('The shrine’s three sigils','<p>The stolen memories speak of warning, light, then mercy. Trace their symbols in order to loosen the binding.</p><p>'+q.runes+' / 3 sigils awakened.</p>',['Hand','Bell','Lantern'].map(word=>[word,()=>{
  const state=mainStoryState();if(state.stage!==21||!mountainNear(o))return;
  if(word!==['Bell','Lantern','Hand'][state.runes]){state.runes=0;save();toast('The sigils grow cold. Warning, light, then mercy: consult the memories in your journal.');return mainStoryRunes(o);}
  if(state.runes===2){if(mainStoryAdvance(21,o,{runes:0}))close();}else{state.runes++;save();mainStoryRunes(o);}
 }]));
}
function mainStoryInteract(o){
 if(!mountainNear(o))return;stop();const q=mainStoryState(),k=o.mainStoryKey,stage=q.stage;
 if(k==='rellan'&&stage===0){
  if(!tutorialComplete(s))return openNpcDialogue(o,['Finish Firstlight Apprenticeship before taking responsibility for a royal investigation.']);
  return mainStoryOffer(o,0,['A royal courier was killed at Redclay Bend. He carried orders withdrawing the northern patrols. Those patrols stood down before he arrived. Nobody at court admits issuing the order.', 'Tovin, his wagon driver, survived. Hear him first. Then follow the southeast road to the wreck. Bring back what happened, not a convenient suspect. Recommended Combat 8.'],'Investigate the courier attack.');
 }
 if(k==='driver'&&stage===1)return mainStoryOffer(o,1,['They cut the harness, shot the courier, and took his dispatch. They left the strongbox. I hid underneath until they went east.', 'A covered load passed north while the road was empty. The guards had already gone. At Redclay Bend, examine the cart, leather, body and tracks. The heavy boots lead toward the barricaded camp.'],'Record Tovin’s testimony.',{witness:true});
 if(MAIN_STORY_CLUES[k])return dialog(o.name,'<p>'+MAIN_STORY_CLUES[k][1]+'</p>',stage===2&&!q.clues.includes(k)?[['Record the evidence.',()=>{if(q.stage!==2||!mountainNear(o)||q.clues.includes(k))return;q.clues.push(k);if(q.clues.length===Object.keys(MAIN_STORY_CLUES).length)mainStoryAdvance(2,o);else save();close();}]]:[]);
 if(k==='trail'&&stage===3)return dialog(o.name,'<p>The courier’s light riding prints end at the ambush. Heavy red-clay bootprints and a dragged dispatch sleeve lead east. The west path has no matching tracks.</p>',[['Follow the matching eastbound tracks.',()=>{if(mainStoryAdvance(3,o))close();}],['Check west.',()=>toast('No matching bootprints. Compare the tracks recorded in your journal.')]]);
 if(k==='dispatch'&&stage===6&&!arcOwnsAnywhere('forgedOrders'))return dialog(o.name,'<p>A second impression survives beneath the satchel lining. Take this copy to Rellan.</p>',[['Recover the forged orders.',()=>{if(mountainNear(o)&&!arcOwnsAnywhere('forgedOrders')){arcGiveItem('forgedOrders');save();close();}}]]);
 if(k==='dispatch'&&stage===5)return dialog(o.name,'<p>The satchel contains royal-looking orders, a payment tally for intercepting the courier, and a cargo slip: “Northern road clear. Delivery onward to Ironhollow.” The payer used no name.</p><p>The wax bears a seven-point crown. Rellan’s current orders bear five.</p>',[['Take the forged orders.',()=>{if(mainStoryAdvance(5,o,{dispatch:true,paidRaiders:true}))close();}]]);
 if(k==='rellan'&&stage===6)return openNpcDialogue(o,['The court confirms it issued no withdrawal. Seven points: an obsolete seal copied carefully enough to fool a road sergeant.', 'The raiders were paid hands. Someone needed this road empty long enough to move people or cargo toward Ironhollow. Their orders also mention an abandoned mine shift. Hesta needs to see your findings.', 'I will hold the original orders. Your journal keeps the seal comparison, payment tally and cargo route. Take my signet; it identifies the person who brought me evidence.'],[['The false orders cleared a route to Ironhollow.',()=>{if(mainStoryAdvance(6,o,{dispatch:true,forgedOrdersRecorded:true},0))close();}]],MAIN_STORY_QUESTS[0].title);
 if(k==='hesta'&&stage===7){
  if(lv('Mining')<5||lv('Smithing')<5)return openNpcDialogue(o,['Bera and Oren are trapped. The rescue needs Mining 5 and Smithing 5. Train with ordinary deposits and the smith, then come straight back.']);
  return mainStoryOffer(o,7,['I received orders to seal the lower shift. I refused. My deputy obeyed a second copy and shut the return route. Then the roof came down.', 'Inspect the damaged lift in the lower loading hall. Its main route is gone; work around it through the western maintenance passage. Salvage iron and forge a locking pin and refuge brace at the underground anvil. Pin the brake before seating the counterweight to open the escape ramp. Creatures have fled the deeper workings into our refuge approach.', 'Find Bera and Oren, then bring both up the same mine mouth. Their families are waiting here. Recommended Combat 10.'],'Enter the rescue workings.');
 }
 if(k==='lift'&&stage===8)return dialog(o.name,'<p>The suspension was cut before the collapse. Fresh wedges were driven into the roof supports from the far side. The safety plate reads: Air before entry. Pin the brake. Seat the weight. Open the ramp. A painted maintenance arrow points west around the broken landing. This was deliberate sabotage.</p>',[['Follow the alternate rescue route.',()=>{if(mainStoryAdvance(8,o,{sabotage:true,safety:true}))close();}]]);
 if(k==='airway'&&stage===9)return dialog(o.name,'<p>A low, ventilated maintenance passage runs around the blocked shaft. Clear its loose stone; the painted support lines mark where the roof is sound.</p>',[['Clear the maintenance passage.',()=>mainStoryWorkStart(o,9,'Mining',5,'Clearing the rescue route',{ventilation:true})]]);
 if(k==='support'&&stage===10)return dialog(o.name,'<p>An iron tie survives inside the shattered support. Recover enough to brace the refuge entrance.</p>',[['Salvage the iron tie.',()=>mainStoryWorkStart(o,10,'Mining',5,'Recovering rescue iron',{iron:true})]]);
 if(k==='forge'&&stage===11)return dialog(o.name,'<p>The miners’ anvil and banked hearth still work. Shape the salvaged tie into a locking pin and refuge brace. Return to the lift to pin its brake, then investigate the hidden excavation beyond the crawler before opening the ramp.</p>',[['Forge the locking pin and refuge brace.',()=>mainStoryWorkStart(o,11,'Smithing',5,'Forging a rescue brace',{pin:true})]]);
 if(k==='lift'&&[12,13].includes(stage))return mainStoryMechanism(o);
 if(k==='excavation'&&stage===13)return dialog(o.name,'<p>Recent picks cut through a much older wall. Unmarked supply crates match the road cargo. A coded survey points to Hollow Shrine; the same seven-point seal orders legitimate miners away.</p><p>Someone used the rescue emergency to conceal a search below Ironhollow.</p>',[['Record the excavation and shrine route.',()=>{if(q.stage!==13||!mountainNear(o))return;q.excavation=true;save();close();toast('The excavation is recorded. Return to the lift and seat its counterweight.');}]]);
 if(k==='bera'&&stage===14)return mainStoryOffer(o,14,['You have a brace. Set it under that cracked lintel ... there. I can get through.', 'Dust took my voice before the warning bell. Oren heard me calling from below while I stood beside him. I could not speak. Then I heard my mother. She died ten winters ago.'],'Brace the refuge and help Bera out.',{bracedRefuge:true});
 if(k==='oren'&&stage===15)return mainStoryOffer(o,15,['First Bera, then the shift supervisor, then my son calling me deeper. My son is outside with Hesta. Somebody had stripped an old carved wall before the roof fell.', 'My grandmother told stories about stolen voices at Hollow Shrine. That survey scrap names it too. We can walk now. Keep both of us close through the bends.'],'Lead both workers to Hesta.');
 if(k==='hesta'&&stage===17)return mainStoryOffer(o,17,['Both alive. Their families can breathe again. My deputy has admitted obeying the false closure order; somebody used our duty against us.', 'You found an unrecorded dig beneath legitimate workings. The cargo, sabotage and copied orders fit a planned operation. The voices do not fit anything I know.', 'Take our testimony and the shrine survey to Scholar Ilyra at the abandoned pilgrim camp southwest of Ironhollow. The lower workings will remain open for ordinary mining. You have earned this miner’s belt.'],'Complete The Last Shift.',{testimony:true,excavation:true},1);
 if(k==='ilyra'&&stage===18){
  if(lv('Magic')<5)return openNpcDialogue(o,['You need Magic 5 to read these enchanted oathstones without destroying the surviving memories.']);
  return mainStoryOffer(o,18,['Recent visitors dug through Hollow Shrine. They copied some inscriptions, damaged others, and removed pieces from ancient seal sockets. They left no name.', 'The Bell marks the isolated approach. A stair beneath the ruined shrine leads to the Lantern in the pilgrim hall and the Hand in the eastern archive. Follow the carved waymarkers; compare every memory with what the miners actually told you.', 'Some memories are true. A convincing voice is not proof. Return to me after all three stones. Recommended Combat 12.'],'Explore Hollow Shrine.');
 }
 if(MAIN_STORY_STONES[k]&&stage<19)return dialog(o.name,'<p>A weathered pilgrim symbol rests beneath moss and fresh chisel scars. Ilyra needs the miners’ testimony before she can compare these memories safely.</p>');
 if(MAIN_STORY_STONES[k])return dialog(o.name,'<p>'+MAIN_STORY_STONES[k][1]+'</p>',stage===19&&!q.stones.includes(k)?[['Record this memory and its evidence.',()=>{if(q.stage!==19||!mountainNear(o)||q.stones.includes(k))return;q.stones.push(k);if(q.stones.length===3)mainStoryAdvance(19,o);else save();close();}]]:[]);
 if(k==='ilyra'&&stage===20)return openNpcDialogue(o,['The Bell agrees with Tovin. The Lantern says Bera called after the bell. Which part can we test against a living witness?'],[['Bera could not speak before the bell; that memory was altered.',()=>{if(mainStoryAdvance(20,o,{comparison:true})){close();toast('Ilyra: The original oath remains: Bell, Lantern, Hand. Restore it in the deepest chamber.');}}],['Every voice in the shrine must be true.',()=>toast('Bera’s recorded testimony contradicts the Lantern. Read Evidence in your journal and try again.')]],MAIN_STORY_QUESTS[2].title);
 if(k==='shrine'&&stage===21)return mainStoryRunes(o);
 if(k==='shrine'&&stage===23)return dialog(o.name,'<p>The Echo Shade falls, but the floor still trembles with whispers coming from the mountain. A solid shard remains in the reliquary: “Wardkeepers ... Ironhollow ... prison ... keep the seal fragments ...” The rest is missing.</p>',[['Stabilize and take the Memory Shard.',()=>mainStoryWorkStart(o,23,'Magic',5,'Stabilizing the Memory Shard',{memoryShard:true})]]);
 if(k==='ilyra'&&stage===24)return mainStoryOffer(o,24,['The shade was feeding on this phenomenon. Killing it did not stop the current beneath the stone. The source lies deeper beneath the mountain.', 'These incomplete memories concern Wardkeepers, ancient seals, Ironhollow, and a prison. They do not tell us what is imprisoned. Someone has been researching how those protections work.', 'Keep the physical Memory Shard. Take it with your journal to Archivist Maerin. This Whisper Pendant may help you notice supernatural disturbances; it cannot tell you what every vision means.'],'Complete Whispers at Hollow Shrine.',{memoryShard:true},2);
 const recovery=arcRecoveryChoices(o),reaction=arcWorldReaction(o);
 const post=k==='driver'&&stage>=7?'The northern road has reopened. I still remember the covered load passing toward Ironhollow while the patrols were gone. Those raiders knew exactly when to strike.':k==='rellan'&&stage>=7?'I have secured the forged orders. The raiders were paid to clear the northern road; we still do not know their employer. Your signet can be replaced if lost.':k==='hesta'&&stage>=18?'The workers are back, and the lower mine remains open. Bera and Oren will speak with you. I can replace your miner’s belt if it is lost.':k==='ilyra'&&stage>=25?'The shrine is open for research. The counter-ward reacts differently from copied human memories; that difference may matter. Maerin has the Wardkeeper records.': ['bera','oren'].includes(k)&&stage>=17?(k==='bera'?'I never called from below. I remember standing beside Oren, unable to speak.':'My son was above ground. The voice knew our private names, but it did not know where he really was.'):MAIN_STORY_STEPS[stage][0];
 if(o.characterSprite)return openNpcDialogue(o,[...(reaction?[reaction]:[]),post],recovery,mainStoryTitle());dialog(o.name,'<p>'+post+'</p>');
}
const mainStoryInteractionBefore=handleWorldInteraction;handleWorldInteraction=function(o){if(o.mainStoryKey&&!fighter(o)){mainStoryInteract(o);return true;}return mainStoryInteractionBefore(o);};
const mainStoryCanFightBefore=mountainCanFight;mountainCanFight=function(o){return o.mainStoryStage!==undefined?mainStoryState().stage===o.mainStoryStage:mainStoryCanFightBefore(o);};
const mainStoryDefeatBefore=awardDefeat;awardDefeat=function(o,style){const stage=mainStoryState().stage,advance=o.mainStoryStage===stage;mainStoryDefeatBefore(o,style);if(advance)mainStoryAdvance(stage,null);};
const mainStoryMountainTalkBefore=mountainTalk;mountainTalk=function(o){if(o.mountainKey==='maerin'&&mountainState().stage===0&&!mainStoryComplete())return openNpcDialogue(o,['I need the evidence Rellan, Hesta and Ilyra are gathering before we can open this investigation. '+MAIN_STORY_STEPS[mainStoryState().stage][0]],[['Follow the main story.',()=>{close();mainStoryGuide();}]],'The King Beneath the Mountain');return mainStoryMountainTalkBefore(o);};
const mainStoryMountainAdvanceBefore=mountainAdvance;mountainAdvance=function(stage,o,...args){if(stage===0&&!mainStoryComplete())return false;return mainStoryMountainAdvanceBefore(stage,o,...args);};
const mainStoryMountainGuideBefore=mountainGuide;mountainGuide=function(){if(mountainState().stage===0&&!mainStoryComplete())return mainStoryGuide();return mainStoryMountainGuideBefore();};
function mainStoryGuide(){
 if(playerAction?.kind==='investigate')return true;
 const q=mainStoryState();if(currentScene==='tutorial'){toast('Finish the apprenticeship to begin the mainland story.');return false;}
 let key=MAIN_STORY_STEPS[q.stage][1];if(q.stage===13&&q.excavation)key='lift';if(q.stage===6&&!arcOwnsAnywhere('forgedOrders'))key='dispatch';
 if(key==='clues')key=Object.keys(MAIN_STORY_CLUES).find(k=>!q.clues.includes(k));if(key==='stones')key=Object.keys(MAIN_STORY_STONES).find(k=>!q.stones.includes(k));
 let found=key==='maerin'?mountainObject('maerin'):mainStoryFound(key);
 if(key==='escort'){
  const lagging=['bera','oren'].map(mainStoryFound).find(f=>!q.rescued.includes(f.o.mainStoryKey)&&f.scene===currentScene&&Math.hypot(f.o.x-px,f.o.y-py)>8);
  if(lagging){const p=route(lagging.o.x,lagging.o.y,true,2.5);if(p===null)return false;close();stop();path=p;renderAction();toast('Return to '+lagging.o.name+', then lead both miners to the surface.');return true;}
  found=currentScene==='story_mine'?{scene:'story_mine',o:worldScenes.story_mine.exit}:mainStoryFound('hesta');
  if(currentScene==='overworld'){const p=route(found.o.x,found.o.y,true,2);if(p===null)return false;close();stop();path=p;renderAction();return true;}
 }
 if(!found)return false;
 if(currentScene!==found.scene){
  if(currentScene!=='overworld')found={scene:currentScene,o:worldScenes[currentScene]?.exit};
  else found={scene:'overworld',o:objects.find(o=>o.destination===found.scene)};
 }
 if(!found.o)return false;close();return mountainTravelTo(found.o);
}
function mainStoryTickEscort(){
 const q=mainStoryState();if(q.stage!==16||!['overworld','story_mine'].includes(currentScene))return;const h=mainStoryObject('hesta');
 for(const key of ['bera','oren']){
  if(q.rescued.includes(key)||mainStoryFound(key).scene!==currentScene)continue;const o=mainStoryObject(key),distance=Math.hypot(o.x-px,o.y-py),followReach=key==='bera'?1.8:2.8;
  if(distance<=12&&distance>followReach&&Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)<.05){const next=route(Math.round(px),Math.round(py),true,followReach,o.x,o.y,o)?.[0];if(next){o.heading=Math.atan2(next[0]-o.x,next[1]-o.y);o.x=next[0];o.y=next[1];}}
  (q.positions??={})[key]=[o.x,o.y];q.escortScene=currentScene;if(currentScene==='overworld'&&Math.hypot(o.x-h.x,o.y-h.y)<=5){q.rescued.push(key);save();toast(o.name+' has reached safety. '+q.rescued.length+' / 2.');}
 }
 if(q.rescued.length===2)mainStoryAdvance(16,null);
}
const mainStoryAIBefore=updateEncounterAI;updateEncounterAI=function(dt){
 mainStoryAIBefore(dt);mainStoryTickEscort();const job=mainStoryWork;if(!job)return;
 if(mainStoryState().stage!==job.stage||!mountainNear(job.o)||activeEncounter){mainStoryWork=null;renderAction();return;}
 const before=job.age;job.age+=dt;$('activity').style.width=Math.min(100,job.age/3.2*100)+'%';if(Math.floor(before/.8)!==Math.floor(job.age/.8))playGameSound(job.skill==='Magic'?'magic':job.skill==='Mining'?'mine':'smith',job.o.x,job.o.y);
 if(job.age>=3.2){mainStoryWork=null;if(lv(job.skill)>=job.level)mainStoryAdvance(job.stage,job.o,job.change);renderAction();}
};
const mainStoryMapBefore=mapObjectService;mapObjectService=function(o){if(o.mainStoryKey&&!fighter(o))return {kind:'quest',tags:['quest'],detail:'Main story · '+(o.characterSprite?'Quest character':'Evidence / objective')};return mainStoryMapBefore(o);};
// Authored low-poly quest props: timber rescue gear and weathered, enchanted stone.
const mainStoryPropBefore=prop3;
prop3=function(r,o,x,z){
 const key=o.mainStoryKey;if(!key)return mainStoryPropBefore(r,o,x,z);
 const p=groundedPainter(r,x,z),q=mainStoryState(),wood='#806343',iron='#59636b',stone='#777d78',pale='#acb3a5';
 const beam=(a,b,w=.04,color=wood)=>beamArt(p,[x+a[0],a[1],z+a[2]],[x+b[0],b[1],z+b[2]],w,color,6);
 const box=(a,b,c,w,h,d,color)=>box3(p,x+a,b,z+c,w,h,d,color);
 const wheel=(xx,yy,zz,radius,color)=>{for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;beam([xx+Math.cos(a)*radius,yy+Math.sin(a)*radius,zz],[xx+Math.cos(b)*radius,yy+Math.sin(b)*radius,zz],.04,color);}for(let i=0;i<4;i++){const a=i*Math.PI/2;beam([xx,yy,zz],[xx+Math.cos(a)*radius,yy+Math.sin(a)*radius,zz],.025,color);}};
 if(key==='cart'){
  for(let i=0;i<5;i++)box(0,.52,-.4+i*.2,1.35,.09,.17,wood);
  for(const side of [-1,1]){box(0,.76,side*.48,1.45,.4,.08,wood);wheel(-.35,.34,side*.56,.3,iron);wheel(.4,.34,side*.56,.3,iron);}
  box(-.68,.76,0,.08,.4,1,wood);beam([.5,.49,-.3],[1.1,.18,-.3],.04);beam([.5,.49,.3],[1.1,.18,.3],.04);return 1;
 }
 if(key==='harness'){for(const side of [-1,1]){beam([-.35,.035,side*.21],[.06,.045,side*.12],.10,'#3d291b');beam([.19,.025,side*.14],[.4,.025,side*.26],.10,'#3d291b');}box(.02,.065,0,.11,.03,.4,iron);return .15;}
 if(key==='boots'){
  // Alternating toe and heel impressions point east toward the raider trail.
  for(let i=0;i<6;i++){const bx=x-1.15+i*.46,bz=z+(i%2?.27:-.27);oval3(p,bx,.045,bz,.30,.025,.18,'#3e2b20',a=>a,10);box3(p,bx-.29,.052,bz,.15,.035,.25,'#463024');for(let j=0;j<3;j++)box3(p,bx-.08+j*.09,.076,bz,.035,.012,.24,'#846143');}return .16;
 }
 if(key==='trail'){box(0,.62,0,.1,1.24,.1,wood);box(0,1.1,0,.8,.2,.07,'#aa8c60');beam([-.32,1.1,.04],[-.14,1.1,.04],.02,pale);beam([.13,1.1,.04],[.32,1.1,.04],.02,'#77533d');return 1.3;}
 if(key==='dispatch'){box(0,.14,0,.42,.24,.33,'#795337');box(0,.28,0,.33,.04,.24,'#d4c59e');oval3(p,x+.06,.31,z,.08,.02,.08,'#9c493e',a=>a,6);return .35;}
 if(key==='lift'){
  for(const side of [-1,1]){box(side*.66,1.16,0,.17,2.32,.18,wood);beam([side*.66,.04,-.4],[side*.66,.9,0],.055);}
  box(0,2.27,0,1.6,.2,.24,wood);const height=q.ramp?.3:.85;
  for(let i=0;i<5;i++)box(0,height,-.32+i*.16,1.15,.09,.14,'#9b7d54');
  for(const side of [-1,1]){beam([side*.52,height,0],[side*.52,2.17,0],.021,iron);box(side*.53,height+.23,0,.055,.46,.7,wood);}
  wheel(.66,1.15,.18,.25,iron);box(.87,q.brake?.43:1.3,0,.26,.4,.29,stone);beam([.85,2.15,0],[.85,q.brake?.64:1.51,0],.025,iron);
  if(q.ramp)for(let i=0;i<5;i++)box(0,.29-i*.055,.44+i*.12,1,.06,.15,wood);return 2.4;
 }
 if(key==='airway'){box(0,.18,0,.9,.35,.7,stone);box(0,.37,0,.64,.04,.49,'#252d30');for(let i=0;i<5;i++)box(-.27+i*.135,q.ventilation?.65:.4,0,.045,.055,.54,iron);return .7;}
 if(MAIN_STORY_STONES[key]||key==='shrine'){
  const main=key==='shrine',height=main?1.25:1.05,light=materialRealm(p,19),glow=q.stage>=24?'#8cab91':'#9cbed5';
  profile3(p,x,.14,z,main?1.2:.72,.28,main?1.05:.63,[[-.5,1],[.5,.83]],stone,a=>a,7);
  profile3(p,x,height/2+.2,z,main?.83:.48,height,main?.49:.26,[[-.5,1],[.24,.91],[.5,.62]],pale,a=>a,5);
  const strokes=key==='bell'?[[[-.12,.75],[0,.9]],[[0,.9],[.12,.75]],[[-.12,.75],[.12,.75]],[[0,.75],[0,.68]]]:key==='lantern'?[[[0,.95],[-.13,.78]],[[-.13,.78],[0,.6]],[[0,.6],[.13,.78]],[[.13,.78],[0,.95]]]:key==='hand'?[[[-.13,.62],[0,.75]],[[0,.75],[.13,.9]],[[0,.75],[0,.94]]]:[[[-.22,.68],[0,1.14]],[[0,1.14],[.22,.68]],[[.22,.68],[-.22,.68]],[[0,.68],[0,.43]]];
  for(const [a,b]of strokes)beamArt(light,[x+a[0],a[1],z+(main?.265:.145)],[x+b[0],b[1],z+(main?.265:.145)],.018,glow,4);
  if(main){for(const side of [-1,1])profile3(p,x+side*.62,.45,z,.28,.9,.28,[[-.5,1],[.5,.8]],stone,a=>a,5);lairRing(light,x,z,.65,.03,glow);}
  for(let i=0;i<3;i++)crownArt(p,x-.2+i*.2,.12,z-.22,.23,.14,.19,'#5d7350',i+o.id);return height+.3;
 }
 return mainStoryPropBefore(r,o,x,z);
};

const mainStoryEquipmentBefore=npcEquipment;npcEquipment=function(o){const gear=mainStoryEquipmentBefore(o);if(o.mainStoryKey==='rellan')Object.assign(gear,{legs:'iron_legs',hands:'iron_hands',feet:'iron_feet'});if(o.mainStoryKey==='ilyra')gear.weapon='oakStaff';return gear;};

// Keep guided walking at the escort's pace through corners. Do not strand the
// miners merely because a long path was chosen in one click.
const mainStoryMovementBefore=advanceMovement;
advanceMovement=function(dt){
 if(mainStoryState().stage===16&&path.length){
  const next=path[0];
  if(['bera','oren'].some(key=>{const f=mainStoryFound(key);if(!f||f.scene!==currentScene||mainStoryState().rescued.includes(key))return false;const d=Math.hypot(f.o.x-px,f.o.y-py);return d>7&&Math.hypot(f.o.x-next[0],f.o.y-next[1])>d;}))return;
 }
 return mainStoryMovementBefore(dt);
};


// A small defended roadside camp. Geometry and collision share these footprints.
const RAIDER_CAMP={left:208,right:234,top:129,bottom:154,x:221,y:142};
let raiderCampReady=false;
const raiderCampFootprints=[];
function raiderCampContains(x,y,pad=0){const c=RAIDER_CAMP;return x>=c.left-pad&&x<=c.right+pad&&y>=c.top-pad&&y<=c.bottom+pad;}
function setupRaiderCamp(){
 if(raiderCampReady)return;raiderCampReady=true;const world=worldScenes.overworld;
 const trail={a:[172.5,139.5],b:[212.5,142.5],width:1.15};
 world.objects=world.objects.filter(o=>o.mainStoryKey||o.interiorBuilding||!['tree','ore','prop','crop','enemy','camp'].includes(o.type)||!(raiderCampContains(o.x,o.y,3)||roadSegmentDistance(o.x+.5,o.y+.5,trail)<3));
 let serial=6500000;
 const put=(name,x,y,extra={})=>{const o={id:serial++,type:'prop',name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:12,dead:0,raiderCamp:true,...extra};world.objects.push(o);return o;};
 const solid=(o,rx,ry)=>{o.walkThrough=true;raiderCampFootprints.push({x:o.x,y:o.y,rx,ry});return o;};
 for(const [x,y,heading]of [[215,134,0],[226,134,0],[229,149,Math.PI]])solid(put('Raider canvas tent',x,y,{campModel:'tent',heading}),2,1.5);
 for(let x=208;x<=234;x+=2){solid(put('Sharpened timber barricade',x,129,{campModel:'palisade'}),1,.4);solid(put('Sharpened timber barricade',x,154,{campModel:'palisade'}),1,.4);}
 for(let y=131;y<=152;y+=2){solid(put('Sharpened timber barricade',234,y,{campModel:'palisade',heading:Math.PI/2}),.4,1);if(y<138||y>146)solid(put('Sharpened timber barricade',208,y,{campModel:'palisade',heading:Math.PI/2}),.4,1);}
 for(const y of [138,146])put('Raider warning banner',208,y,{campModel:'banner'});
 put('Raider cooking fire',221,142,{type:'camp',sprite:7,cooking:true,walkThrough:true});
 for(const [name,x,y]of [['Log pile',220,145],['Bench',218,142],['Bench',223,145],['Stolen supply crate',227,141],['Stolen supply crate',230,140],['Barrel',231,138],['Barrel',232,141],['Weapon rack',215,149],['Raider bedroll',216,136],['Raider bedroll',226,136]])put(name,x,y,{campModel:/bedroll/.test(name)?'bedroll':null});
 for(const [x,y]of [[218,151],[231,133]]){const o=put('Camp raider',x,y,{type:'enemy',kind:'bandit',_stationary:true,sprite:species.bandit?.sprite||2});applyEnemyTier(o,{...ENEMY_TIERS.bandit,look:'bandit',name:'Camp raider',hp:18,level:8,maxHit:2});}
 organicRoads.push(trail,{a:[208.5,142.5],b:[227.5,143.5],width:1.4});roadBuckets=null;realmNavigation.clear();resetLandSurface();miniTerrain=null;mapServicesCache=null;
}
const raiderWallBefore=worldWall;
worldWall=function(x,y){return currentScene==='overworld'&&raiderCampReady&&raiderCampContains(x,y,1)&&raiderCampFootprints.some(p=>Math.abs(x-p.x)<=p.rx&&Math.abs(y-p.y)<=p.ry)||raiderWallBefore(x,y);};
// These collision cells are rendered by the camp props, never as dungeon walls.
const raiderWallArtBefore=drawRealmWall;
drawRealmWall=function(r,x,y){if(currentScene==='overworld'&&raiderCampFootprints.some(p=>Math.abs(x-p.x)<=p.rx&&Math.abs(y-p.y)<=p.ry))return;return raiderWallArtBefore(r,x,y);};
const raiderGradeBefore=gradeLand;
gradeLand=function(x,y,height){const base=raiderGradeBefore(x,y,height);if(currentScene!=='overworld'||!raiderCampReady)return base;const c=RAIDER_CAMP,d=Math.hypot(Math.max(c.left-2-x,0,x-c.right-2),Math.max(c.top-2-y,0,y-c.bottom-2));if(d>=8)return base;const t=d/8,blend=1-t*t*(3-2*t);return base*(1-blend)+landBase(c.x,c.y)*blend;};
const raiderRoadBefore=roadInfluence;
roadInfluence=function(x,y){const out=raiderRoadBefore(x,y);if(currentScene!=='overworld'||!raiderCampReady)return out;const c=RAIDER_CAMP,d=Math.max(Math.abs((x-c.x)/13),Math.abs((y-c.y)/12.5)),wear=Math.max(0,Math.min(1,(1-d)/.12));return [Math.max(out[0],wear*.9),out[1],out[2]];};
const raiderRegionBefore=regionInfo;
regionInfo=function(){return currentScene==='overworld'&&raiderCampContains(s.x,s.y,6)?['Redclay raider camp','Orders of the Dead · Stolen patrol orders']:raiderRegionBefore();};
const raiderPropBefore=prop3;
prop3=function(r,o,x,z){
 if(!o.campModel)return raiderPropBefore(r,o,x,z);
 const p=groundedPainter(r,x,z),q=worldLocal(p,x,0,z),wood='#6b4e35',cloth='#795c46',red='#793e34';
 const beam=(a,b,width=.06)=>beamArt(q,a,b,width,wood,6);
 if(o.campModel==='tent'){
  const h=2.5;
  for(const side of [-1,1]){q.face([[side*2,0,-1.5],[0,h,-1.5],[0,h,1.5],[side*2,0,1.5]],side<0?cloth:'#94765a',null,13);beam([side*2,0,-1.5],[side*2,0,1.5]);}
  q.face([[-2,0,-1.5],[2,0,-1.5],[0,h,-1.5]],cloth,null,13);
  for(const side of [-1,1]){q.face([[side*2,0,1.5],[side*.55,0,1.5],[0,h,1.5]],red,null,13);beam([0,h,side*1.5],[0,0,side*1.5]);}
  beam([0,h,-1.6],[0,h,1.6],.09);return h;
 }
 if(o.campModel==='palisade'){
  const turn=o.heading?([a,b,c])=>[c,b,a]:v=>v;
  for(let i=0;i<5;i++){const a=-.8+i*.4,h=1.65+((i+o.id)%3)*.12;beamArt(q,turn([a,0,0]),turn([a,h,0]),.15,wood,5);profile3(q,...turn([a,h+.13,0]),.3,.3,.3,[[-.5,1],[.5,.01]],'#9b7951',v=>v,5);}
  for(const h of [.45,1.15])beamArt(q,turn([-1,h,.16]),turn([1,h,.16]),.07,'#48382a',5);return 2.1;
 }
 if(o.campModel==='banner'){beam([0,0,0],[0,3.1,0],.085);beam([0,2.9,0],[1,2.9,0]);q.face([[.08,2.85,0],[.95,2.85,0],[.95,1.7,0],[.5,1.9,0],[.08,1.7,0]],red,null,13);beamArt(q,[.24,2.65,.02],[.73,2.08,.02],.025,'#c7b394',5);beamArt(q,[.73,2.65,.02],[.24,2.08,.02],.025,'#c7b394',5);return 3.15;}
 if(o.campModel==='bedroll'){box3(q,0,.11,0,.65,.2,1.6,'#665c43');profile3(q,0,.21,-.6,.7,.33,.34,[[-.5,.8],[.5,.8]],'#a28f6d',v=>v,6);return .4;}
 return raiderPropBefore(r,o,x,z);
};
