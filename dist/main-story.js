'use strict';
// Three ordered mainland quests. Evidence, bound tools and rescue progress are saved together.
const MAIN_STORY_QUESTS=[
 {title:'The Broken Watch',start:0,end:7,coins:210,xp:{Attack:280,Defense:280}},
 {title:'The Weight of an Oath',start:7,end:18,coins:280,xp:{Mining:350,Smithing:350}},
 {title:'Echoes Without a Name',start:18,end:25,coins:350,xp:{Magic:420,Hitpoints:210}}
];
const MAIN_STORY_STEPS=[
 ['Speak to Captain Rellan in Briarhaven. Recommended Combat 8.','rellan'],
 ['Ask wagon driver Tovin what happened to the courier.','driver'],
 ['Follow the southeast road out of Briarhaven to the ambush at Redclay Bend. Examine the cart, harness and bootprints.','clues'],
 ['Use the evidence to choose the courier’s trail at the road marker.','trail'],
 ['Follow the eastern trail beyond Redclay Bend to the raider camp. Defeat its lookout.','lookout'],
 ['Recover the stolen dispatch from the lookout’s satchel.','dispatch'],
 ['Bring the dispatch to Rellan and explain why its seal is forged.','rellan'],
 ['Take Rellan’s forged order to Forewoman Hesta at Ironhollow. Requires Mining 5 and Smithing 5.','hesta'],
 ['Enter the Freight Mine southeast of Ironhollow. Follow the lower workings to the broken lift and read its safety plate.','lift'],
 ['Open the ventilation beside the lift before attempting a rescue.','airway'],
 ['Mine usable iron from the collapsed support. Mining 5; pickaxe required.','support'],
 ['Return to Hesta’s surface rescue workbench and forge a locking pin. Smithing 5.','forge'],
 ['Install the locking pin and secure the lift brake.','lift'],
 ['Seat the counterweight against the secured brake to open the escape ramp.','lift'],
 ['Reach miner Bera in the lower refuge beyond the opened lift and ask her to follow.','bera'],
 ['Reach miner Oren in the lower refuge and bring him with you too.','oren'],
 ['Escort BOTH miners to Hesta. Stay close; they wait if you move too far away.','escort'],
 ['Report to Hesta with both miners safely returned.','hesta'],
 ['Bring the miners’ testimony to Scholar Ilyra at the old pilgrim camp southwest of Ironhollow. Requires Magic 5. Recommended Combat 12.','ilyra'],
 ['Walk the old pilgrim trail: Bell southwest of Ilyra, Lantern farther south, Hand to the east.','stones'],
 ['Compare the oathstones’ whispers with the living miners’ testimony. Speak to Ilyra.','ilyra'],
 ['Continue south beyond the oathstones to the ruined shrine. Trace its sigils in the remembered order.','shrine'],
 ['Defeat the echo shade bound to the cursed shrine.','shade'],
 ['Break the shrine’s enchantment and bind its final whisper into a memory shard.','shrine'],
 ['Bring the whispering shard to Ilyra.','ilyra'],
 ['Take the forged dispatch, miners’ testimony and memory shard to Archivist Maerin in Ironhollow.','maerin']
];
const MAIN_STORY_CLUES={
 cart:['Abandoned courier cart','The strongbox is untouched. A narrow dispatch sleeve has been cut from beneath the seat. The attacker wanted the patrol orders, not the coins.'],
 harness:['Cut harness','The leather was sliced while the cart stood still. This was a staged raid, not an animal attack.'],
 boots:['Muddy bootprints','Heavy boots lead east through wet red clay. The western trail is dry chalk; the courier wore soft riding shoes.']
};
const MAIN_STORY_STONES={
 bell:['Oathstone of the Bell','The courier’s stolen voice whispers: “First the bell warned us.” An ancient sigil for Warning shines beneath the moss.'],
 lantern:['Oathstone of the Lantern','Bera’s voice murmurs: “After the bell, I raised my lantern.” Yet Bera had lost her voice in the mine before the bell sounded. Its sigil means Light.'],
 hand:['Oathstone of the Hand','Oren’s voice answers: “Only after the lantern did I lend a hand.” The real Oren stood beside Bera when both their voices called from below. Its sigil means Mercy.']
};
CREATURE_LAIRS.story_mine={title:'Ironhollow Freight Mine',subtitle:'Abandoned workings · The Weight of an Oath',quest:true,theme:'ork',size:[50,92],entry:[25,86],arena:[25,25],entrance:[842,187],floor:'#514d46',trim:'#99866b',glow:'#d7b77d',fog:[.14,.13,.12],ambient:[.94,.9,.82],light:[.2,.15,.07],rooms:[['rect',4,5,18,19],['rect',17,12,15,9],['rect',20,72,11,17],['ellipse',25,69,13,12],['rect',9,47,8,25],['rect',10,44,30,8],['rect',32,24,8,26],['ellipse',25,22,16,15]]};
function mainStoryFound(key){for(const [scene,w]of Object.entries(worldScenes)){const o=w.objects.find(o=>o.mainStoryKey===key);if(o)return {scene,o};}return null;}
function mainStoryState(){
 let q=s.mainStoryQuest;if(!q||typeof q!=='object'||Array.isArray(q))q=s.mainStoryQuest={};
 q.version=2;q.stage=Number.isInteger(q.stage)?Math.max(0,Math.min(25,q.stage)):0;
 for(const [field,keys]of [['clues',MAIN_STORY_CLUES],['stones',MAIN_STORY_STONES]])q[field]=Array.isArray(q[field])?[...new Set(q[field].filter(k=>keys[k]))]:[];
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
 prop('trail','Split-trail road marker',b.x+117,b.y+78,'World_BookStand');
 const lookout=mainStoryPlace('lookout','Raider lookout',212,142,{type:'enemy',kind:'storylookout',mainStoryStage:4,sprite:species.bandit?.sprite||2});
 applyEnemyTier(lookout,{...ENEMY_TIERS.bandit,look:'bandit',name:'Raider lookout',hp:18,level:8,maxHit:2});
 prop('dispatch','Lookout’s dispatch satchel',227,143,'World_BookStand');
 const mine=CREATURE_LAIRS.story_mine,entrance=mine.entrance;
 npc('hesta','Forewoman Hesta',entrance[0]-7,entrance[1]+7,'dwarf');
 prop('lift','Broken freight lift',25,28,'World_Workbench','story_mine');
 prop('airway','Blocked ventilation grate',12,18,'Rock_Medium_1','story_mine');
 prop('support','Collapsed iron support',37,21,'Rock_Medium_1','story_mine');
 prop('forge','Rescue workbench',entrance[0]-11,entrance[1]+10,'World_Workbench');
 npc('bera','Miner Bera',12,16,'dwarf','story_mine');npc('oren','Miner Oren',17,16,'dwarf','story_mine');
 npc('ilyra','Scholar Ilyra',h.x-155,h.y+156,'elf');
 prop('bell',MAIN_STORY_STONES.bell[0],h.x-185,h.y+180,'Rock_Medium_1');
 prop('lantern',MAIN_STORY_STONES.lantern[0],h.x-145,h.y+213,'Rock_Medium_1');
 prop('hand',MAIN_STORY_STONES.hand[0],h.x-99,h.y+183,'Rock_Medium_1');
 prop('shrine','Shrine of the Borrowed Voice',h.x-133,h.y+250,'Rock_Medium_1');
 const shade=mainStoryPlace('shade','Echo shade',h.x-130,h.y+255,{type:'enemy',kind:'storyshade',mainStoryStage:22,sprite:species.skeleton.sprite});
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
 const q=mainStoryState();if(q.stage!==stage||o&&!mountainNear(o))return false;Object.assign(q,change,{stage:stage+1});
 // Completion, XP and currency are stored atomically in the same save. Overflow goes to the bank.
 if(rewardIndex!==null){const r=MAIN_STORY_QUESTS[rewardIndex],key='reward'+(rewardIndex+1);if(!q[key]){q[key]=true;
  const carried=canCarry('coins')?Math.min(r.coins,Math.max(0,COIN_LIMIT-(s.bag.coins||0))):0;s.bag.coins=(s.bag.coins||0)+carried;
  if(carried<r.coins){s.bank??={};s.bank.coins=(s.bank.coins||0)+r.coins-carried;toast('Your quest coins were sent to the bank.');}
  for(const [skill,xp]of Object.entries(r.xp))gain(skill,xp,true);showExperienceDrop(r.xp);if(typeof showQuestCompletion==='function')showQuestCompletion({title:r.title,coins:r.coins,xp:r.xp,note:carried<r.coins?(r.coins-carried)+' coins were sent to your bank. Experience has been awarded.':undefined});
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
 if(![12,13].includes(mainStoryState().stage))return;
 dialog('Freight lift safety mechanism','<p>The safety plate reads: “Pin the brake. Seat the weight. Open the ramp.” The forged locking pin is ready.</p>',[
 ['Secure the brake.',()=>{if(!mountainNear(o))return;if(mainStoryState().stage===12){mainStoryAdvance(12,o,{brake:true});mainStoryMechanism(o);}else toast('The brake is secured. Seat the counterweight next.');}],
 ['Seat the counterweight.',()=>{if(!mountainNear(o))return;if(mainStoryState().stage===12){toast('The brake slips. The safety catch holds; secure the brake first.');return;}if(mainStoryAdvance(13,o,{ramp:true}))close();}]
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
 if(k==='rellan'&&stage===0)return mainStoryOffer(o,0,[
  'A courier left Briarhaven with orders to withdraw our road patrols. His cart returned without him. If I obey a missing dispatch, this road will be empty of guards by nightfall.',
  'Tovin survived and reached Briarhaven. Hear his account, then follow the southeast road to Redclay Bend. The cart is still at the ambush site. Bring evidence before you accuse anyone. A convincing tale is not the same as a true one. Recommended Combat 8.'
 ],'Investigate the missing courier.');
 if(k==='driver'&&stage===1)return mainStoryOffer(o,1,[
  'They stopped us before the bend. The courier jumped clear and fled west in his soft riding shoes. The raider took only the dispatch sleeve, then walked east. I hid beneath the cart.',
  'I heard a knife scrape the harness after the horses were already loose. If they wanted coin, why leave the strongbox? Follow the southeast road beyond the village to Redclay Bend. The cart, cut leather and muddy footprints are still there; the raider camp is farther east.'
 ],'Record Tovin’s account.',{witness:true});
 if(MAIN_STORY_CLUES[k])return dialog(o.name,'<p>'+MAIN_STORY_CLUES[k][1]+'</p>',stage===2&&!q.clues.includes(k)?[['Record the evidence.',()=>{const state=mainStoryState();if(state.stage!==2||!mountainNear(o)||state.clues.includes(k))return;state.clues.push(k);if(state.clues.length===3)mainStoryAdvance(2,o);else save();close();}]]:[]);
 if(k==='trail'&&stage===3)return dialog(o.name,'<p>The western trail is dry chalk. To the east, red clay bears heavy bootprints. The courier wore soft riding shoes.</p>',[
 ['Follow the courier west.',()=>{if(mountainNear(o)&&mainStoryState().stage===3)toast('The courier escaped that way. The heavy boots and stolen dispatch went east.');}],
 ['Follow the raider east.',()=>{if(mainStoryAdvance(3,o))close();}]]);
 if(k==='dispatch'&&stage===5)return dialog(o.name,'<p>The order would abandon both the road patrols and the Ironhollow lift crew. Its wax shows a seven-point crown. Rellan’s current royal orders bear five points.</p>',[['Preserve the forged dispatch.',()=>{if(mainStoryAdvance(5,o,{dispatch:true}))close();}]]);
 if(k==='rellan'&&stage===6)return openNpcDialogue(o,[
 'The courier reached our western checkpoint alive. Tovin’s story agrees with your evidence. Now, what proves the recovered order is false?',
 'This order bears seven crown points. Our current royal seal bears five. Whoever stamped it copied an obsolete impression. Hesta’s crew at Ironhollow is named in the order too. Take it to her before another life is spent on a lie.'
 ],[['Tovin must have forged it.',()=>toast('His account matches the tracks. Look at the seal, not the frightened witness.')],['The crown has seven points; the royal seal has five.',()=>{if(mainStoryAdvance(6,o,{dispatch:true},0))close();}]],MAIN_STORY_QUESTS[0].title);
 if(k==='hesta'&&stage===7){
  if(lv('Mining')<5||lv('Smithing')<5)return openNpcDialogue(o,['That matches the order my supervisor received: abandon the crew. I refused. Bera and Oren are still below the freight lift. You need Mining 5 and Smithing 5 to repair its safety gear.'],[],MAIN_STORY_QUESTS[1].title);
  return openNpcDialogue(o,['Two workers, a jammed lift, and an order telling us to leave them. Your forged dispatch explains the order. It does not get my people home.', 'Enter the mine beside our camp. The passage turns west through the old loading hall, then east to the lower lift. Open the ventilation and salvage iron there; bring it back to my surface workbench to forge a locking pin. Follow the safety plate. I will hold the surface route open.'],[['Bring both workers home.',()=>{if(lv('Mining')>=5&&lv('Smithing')>=5&&mainStoryAdvance(7,o))close();}]],MAIN_STORY_QUESTS[1].title);
 }
 if(k==='lift'&&stage===8)return dialog(o.name,'<p>The cage is wedged beside the lower landing. An escape ramp is folded beneath it. Safety plate: “Air before entry. Pin the brake. Seat the weight. Open the ramp.”</p>',[['Record the safety sequence.',()=>{if(mainStoryAdvance(8,o,{safety:true}))close();}]]);
 if(k==='airway'&&stage===9)return dialog(o.name,'<p>Pull the fallen slats clear and wind the grate open. The workers need fresh air before the lift can move.</p>',[['Open the ventilation.',()=>mainStoryWorkStart(o,9,'Smithing',1,'Opening the ventilation',{ventilation:true})]]);
 if(k==='support'&&stage===10)return dialog(o.name,'<p>A usable length of iron is trapped in the fallen stone. Recover it with your pickaxe. Mining 5. Rescue components stay with your journal.</p>',[['Recover the iron support.',()=>mainStoryWorkStart(o,10,'Mining',5,'Recovering usable iron',{iron:true})]]);
 if(k==='forge'&&stage===11)return dialog(o.name,'<p>Heat the salvaged iron, draw it to the brake socket’s width, then quench the locking pin. Smithing 5.</p>',[['Forge the locking pin.',()=>mainStoryWorkStart(o,11,'Smithing',5,'Forging the locking pin',{pin:true})]]);
 if(k==='lift'&&[12,13].includes(stage))return mainStoryMechanism(o);
 if(k==='bera'&&stage===14)return mainStoryOffer(o,14,['Fresh air. I lost my voice in the dust before the warning bell, but Oren heard me calling him deeper into the mine. It was not me.', 'I can walk. Get Oren too, then lead us to Hesta. Stay close enough for us to see you.'],'Follow me to Hesta.');
 if(k==='oren'&&stage===15)return mainStoryOffer(o,15,['I heard Bera call from below while she stood beside me. Then my own voice answered. We passed the old oathstones at the roadside shrine that morning. I remember the carvings were warm, though the sun had not risen.', 'Both of us are here. Lead us to Hesta. If you get too far ahead, we will wait rather than take the wrong passage.'],'Come with us to the surface.');
 if(k==='hesta'&&stage===17)return mainStoryOffer(o,17,[
 'Bera. Oren. Both accounted for. The supervisor called obedience a duty. An oath that abandons living people is worth less than the paper it is written on.',
 'I have signed their testimony and attached your forged dispatch. They heard their own voices calling from the dark. Scholar Ilyra camps southwest of Ironhollow, where the old pilgrim road approaches the woodland. The oathstones mark different stops along that road; the ruined shrine stands farther south. Take this to her before someone else follows those whispers.'
 ],'Complete The Weight of an Oath.',{testimony:true},1);
 if(k==='ilyra'&&stage===18){
  if(lv('Magic')<5)return openNpcDialogue(o,['These oathstones once remembered promises freely given. Someone has cursed them to steal living voices. You need Magic 5 to loosen the enchantment without shattering the memories.'],[],MAIN_STORY_QUESTS[2].title);
  return openNpcDialogue(o,['These oathstones once held the promises of travelers: sound a warning, carry a light, offer a helping hand. The ward-keepers blessed them so no traveler would be left alone in the dark.', 'Now their sigils are twisted. They steal the voices of people who pass and whisper false summons beneath the mountain. From my camp, seek the Bell southwest, the Lantern farther south, and the Hand on the eastern return path. The ruined shrine lies south beyond them. Listen to all three stones. Compare their memories with Hesta’s witnesses before touching the shrine. Magic 5 is required; recommended Combat 12 for what the curse may wake.'],[['Investigate the stolen voices.',()=>{if(lv('Magic')>=5&&mainStoryAdvance(18,o))close();}]],MAIN_STORY_QUESTS[2].title);
 }
 if(MAIN_STORY_STONES[k])return dialog(o.name,'<p>'+MAIN_STORY_STONES[k][1]+'</p>',stage===19&&!q.stones.includes(k)?[['Remember the whisper.',()=>{const state=mainStoryState();if(state.stage!==19||!mountainNear(o)||state.stones.includes(k))return;state.stones.push(k);if(state.stones.length===3)mainStoryAdvance(19,o);else save();close();}]]:[]);
 if(k==='ilyra'&&stage===20)return openNpcDialogue(o,['Bera had lost her voice before the bell. Oren stood beside her when her voice called from below, then heard himself answer. What do the whispers tell us?'],[
 ['The miners called to each other below.',()=>toast('Bera could not speak, and Oren stood beside her. Their testimony contradicts that tale.')],
 ['The curse is stealing living voices.',()=>{if(mainStoryAdvance(20,o,{comparison:true})){close();toast('Ilyra: Restore the oath in its proper order. Warning, light, mercy: Bell, Lantern, Hand.');}}]
 ],MAIN_STORY_QUESTS[2].title);
 if(k==='shrine'&&stage===21)return mainStoryRunes(o);
 if(k==='shrine'&&stage===23)return dialog(o.name,'<p>The shade unravels. Beneath its stolen voices, a final whisper trembles in the stone: “Send the ward-keepers below. Let the borrowed voice carry the order.”</p><p>Break the curse and bind that memory into a fallen shard. Maerin must hear it.</p>',[['Break the curse and bind the memory.',()=>mainStoryWorkStart(o,23,'Magic',5,'Unbinding the cursed shrine',{memoryShard:true})]]);
 if(k==='ilyra'&&stage===24)return mainStoryOffer(o,24,[
 'The oathstones have fallen quiet. Their blessing can heal now. You brought back more than a whisper: you have shown that the voice beneath the mountain can be resisted.',
 'A forged order emptied the road. Another abandoned the lift crew. A curse stole their voices to summon the ward-keepers below. Archivist Maerin in Ironhollow has been collecting missing names. Bring him the dispatch, Hesta’s testimony and this memory shard. Keep copies of the written evidence in your journal.'
 ],'Complete Echoes Without a Name.',{memoryShard:true},2);
 const message=k==='hesta'&&stage<7?'Complete The Broken Watch with Captain Rellan before beginning this rescue.':k==='ilyra'&&stage<18?'Complete The Weight of an Oath with Hesta before investigating the shrine.':['bera','oren'].includes(k)&&stage>=17?'We are both safe. Hesta has our testimony. Thank you for coming back.':MAIN_STORY_STEPS[stage][0];
 if(o.characterSprite)return openNpcDialogue(o,[message],[],mainStoryTitle());dialog(o.name,'<p>'+message+'</p>');
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
 let key=MAIN_STORY_STEPS[q.stage][1];
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
regionInfo=function(){return currentScene==='overworld'&&raiderCampContains(s.x,s.y,6)?['Redclay raider camp','The Broken Watch · Stolen patrol orders']:raiderRegionBefore();};
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
