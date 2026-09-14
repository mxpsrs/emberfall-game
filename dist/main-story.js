'use strict';
// Three ordered mainland quests. Evidence, bound tools and rescue progress are saved together.
const MAIN_STORY_QUESTS=[
 {title:'The Broken Watch',start:0,end:7,coins:150,xp:{Attack:200,Defense:200}},
 {title:'The Weight of an Oath',start:7,end:18,coins:200,xp:{Mining:250,Smithing:250}},
 {title:'Echoes Without a Name',start:18,end:25,coins:250,xp:{Magic:300,Hitpoints:150}}
];
const MAIN_STORY_STEPS=[
 ['Speak to Captain Rellan in Briarhaven. Recommended Combat 8.','rellan'],
 ['Ask wagon driver Tovin what happened to the courier.','driver'],
 ['Examine the abandoned cart, cut harness and muddy bootprints.','clues'],
 ['Use the evidence to choose the courier’s trail at the road marker.','trail'],
 ['Defeat the raider lookout on the eastern trail.','lookout'],
 ['Recover the stolen dispatch from the lookout’s satchel.','dispatch'],
 ['Bring the dispatch to Rellan and explain why its seal is forged.','rellan'],
 ['Take Rellan’s forged order to Forewoman Hesta at Ironhollow. Requires Mining 5 and Smithing 5.','hesta'],
 ['Inspect the broken freight lift and read its safety plate.','lift'],
 ['Open the ventilation beside the lift before attempting a rescue.','airway'],
 ['Mine usable iron from the collapsed support. Mining 5; pickaxe required.','support'],
 ['Forge a locking pin from the recovered iron at the rescue workbench. Smithing 5.','forge'],
 ['Install the locking pin and secure the lift brake.','lift'],
 ['Seat the counterweight against the secured brake to open the escape ramp.','lift'],
 ['Reach miner Bera beside the opened lift and ask her to follow.','bera'],
 ['Reach miner Oren beside the lift and bring him with you too.','oren'],
 ['Escort BOTH miners to Hesta. Stay close; they wait if you move too far away.','escort'],
 ['Report to Hesta with both miners safely returned.','hesta'],
 ['Bring the miners’ testimony to Scholar Ilyra at the roadside shrine. Requires Magic 5. Recommended Combat 12.','ilyra'],
 ['Listen to the three enchanted oathstones: the Bell, the Lantern and the Hand.','stones'],
 ['Compare the oathstones’ whispers with the living miners’ testimony. Speak to Ilyra.','ilyra'],
 ['Trace the shrine’s sigils in the order revealed by the stolen memories.','shrine'],
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
function mainStoryState(){
 let q=s.mainStoryQuest;if(!q||typeof q!=='object'||Array.isArray(q))q=s.mainStoryQuest={};
 q.version=1;q.stage=Number.isInteger(q.stage)?Math.max(0,Math.min(25,q.stage)):0;
 for(const [field,keys]of [['clues',MAIN_STORY_CLUES],['stones',MAIN_STORY_STONES]])q[field]=Array.isArray(q[field])?[...new Set(q[field].filter(k=>keys[k]))]:[];
 q.runes=Number.isInteger(q.runes)?Math.max(0,Math.min(2,q.runes)):0;
 q.rescued=Array.isArray(q.rescued)?[...new Set(q.rescued.filter(k=>['bera','oren'].includes(k)))]:[];return q;
}
function mainStoryComplete(){return mainStoryState().stage===25;}
function mainStoryTitle(stage=mainStoryState().stage){return MAIN_STORY_QUESTS.find(q=>stage<q.end)?.title||'The King Beneath the Mountain';}
let mainStoryReady=false,mainStorySerial=6200000,mainStoryWork=null;
function mainStoryObject(key){return worldScenes.overworld?.objects.find(o=>o.mainStoryKey===key);}
function mainStoryPlace(key,name,x,y,extra={}){
 const p=encounterSpawnPoint('overworld',x,y,24);if(!p)throw new Error('No safe story position: '+key);
 const [a,b]=p,o={id:mainStorySerial++,mainStoryKey:key,type:'prop',sprite:12,name,x:a,y:b,drawX:a,drawY:b,homeX:a,homeY:b,dead:0,_stationary:true,...extra};worldScenes.overworld.objects.push(o);return o;
}
function setupMainStory(){
 if(mainStoryReady)return;mainStoryReady=true;const b=SETTLEMENTS.find(t=>t.id==='briarhaven'),h=SETTLEMENTS.find(t=>t.id==='ironhollow');
 const npc=(key,name,x,y,race='human')=>mainStoryPlace(key,name,x,y,{type:'questgiver',characterSprite:true,sprite:2,race});
 const prop=(key,name,x,y,model)=>mainStoryPlace(key,name,x,y,{mountainModel:model});
 npc('rellan','Captain Rellan',b.x+7,b.y+9);npc('driver','Wagon driver Tovin',b.x+23,b.y+12);
 prop('cart',MAIN_STORY_CLUES.cart[0],b.x+28,b.y+17,'World_Workbench');
 prop('harness',MAIN_STORY_CLUES.harness[0],b.x+31,b.y+20,'World_WeaponStand');
 prop('boots',MAIN_STORY_CLUES.boots[0],b.x+35,b.y+19,'Rock_Medium_1');
 prop('trail','Split-trail road marker',b.x+38,b.y+22,'World_BookStand');
 const lookout=mainStoryPlace('lookout','Raider lookout',b.x+48,b.y+21,{type:'enemy',kind:'storylookout',mainStoryStage:4,sprite:species.bandit?.sprite||2});
 applyEnemyTier(lookout,{...ENEMY_TIERS.bandit,look:'bandit',name:'Raider lookout',hp:18,level:8,maxHit:2});
 prop('dispatch','Lookout’s dispatch satchel',b.x+51,b.y+23,'World_BookStand');
 npc('hesta','Forewoman Hesta',h.x+29,h.y+24,'dwarf');
 prop('lift','Broken freight lift',h.x+38,h.y+34,'World_Workbench');
 prop('airway','Blocked ventilation grate',h.x+42,h.y+32,'Rock_Medium_1');
 prop('support','Collapsed iron support',h.x+44,h.y+37,'Rock_Medium_1');
 prop('forge','Rescue workbench',h.x+32,h.y+29,'World_Workbench');
 npc('bera','Miner Bera',h.x+40,h.y+42,'dwarf');npc('oren','Miner Oren',h.x+43,h.y+44,'dwarf');
 npc('ilyra','Scholar Ilyra',h.x-32,h.y+35,'elf');
 prop('bell',MAIN_STORY_STONES.bell[0],h.x-38,h.y+40,'Rock_Medium_1');
 prop('lantern',MAIN_STORY_STONES.lantern[0],h.x-33,h.y+44,'Rock_Medium_1');
 prop('hand',MAIN_STORY_STONES.hand[0],h.x-27,h.y+41,'Rock_Medium_1');
 prop('shrine','Shrine of the Borrowed Voice',h.x-32,h.y+49,'Rock_Medium_1');
 const shade=mainStoryPlace('shade','Echo shade',h.x-29,h.y+54,{type:'enemy',kind:'storyshade',mainStoryStage:22,sprite:species.skeleton.sprite});
 applyEnemyTier(shade,{...ENEMY_TIERS.skeleton,look:'skeleton',name:'Echo shade',hp:26,level:12,maxHit:3,style:'magic',weak:'ranged',tint:[.7,.85,1.2]});syncMainStoryWorld();
}
const mainStorySetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){mainStorySetupBefore();setupMainStory();};
function syncMainStoryWorld(){
 if(!mainStoryReady)return;const q=mainStoryState(),h=mainStoryObject('hesta');
 for(const key of ['bera','oren']){
  const o=mainStoryObject(key),saved=q.positions?.[key];
  const safe=Array.isArray(saved)&&saved.length===2&&saved.every(Number.isFinite)&&Math.hypot(saved[0]-h.x,saved[1]-h.y)<100;
  const p=q.stage>=17||q.rescued.includes(key)?encounterSpawnPoint('overworld',h.x+(key==='bera'?2:-2),h.y+3,12):safe&&q.stage>=15?saved:[o.homeX,o.homeY];
  if(p)Object.assign(o,{x:p[0],y:p[1],drawX:p[0],drawY:p[1]});
 }
 realmNavigation.clear();mapServicesCache=null;if(currentScene==='overworld')objects.splice(0,objects.length,...worldScenes.overworld.objects);
}
function mainStoryAdvance(stage,o,change={},rewardIndex=null){
 const q=mainStoryState();if(q.stage!==stage||o&&!mountainNear(o))return false;Object.assign(q,change,{stage:stage+1});
 // Completion, XP and currency are stored atomically in the same save. Overflow goes to the bank.
 if(rewardIndex!==null){const r=MAIN_STORY_QUESTS[rewardIndex],key='reward'+(rewardIndex+1);if(!q[key]){q[key]=true;
  const carried=canCarry('coins')?Math.min(r.coins,Math.max(0,COIN_LIMIT-(s.bag.coins||0))):0;s.bag.coins=(s.bag.coins||0)+carried;
  if(carried<r.coins){s.bank??={};s.bank.coins=(s.bank.coins||0)+r.coins-carried;toast('Your quest coins were sent to the bank.');}
  for(const [skill,xp]of Object.entries(r.xp))gain(skill,xp,true);showExperienceDrop(r.xp);playGameSound('quest');
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
  'Tovin survived. Hear his account, then inspect the cart and the tracks. Bring evidence before you accuse anyone. A convincing tale is not the same as a true one. Recommended Combat 8.'
 ],'Investigate the missing courier.');
 if(k==='driver'&&stage===1)return mainStoryOffer(o,1,[
  'They stopped us before the bend. The courier jumped clear and fled west in his soft riding shoes. The raider took only the dispatch sleeve, then walked east. I hid beneath the cart.',
  'I heard a knife scrape the harness after the horses were already loose. If they wanted coin, why leave the strongbox? Look at the cart, the leather and the muddy footprints yourself.'
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
  return openNpcDialogue(o,['Two workers, a jammed lift, and an order telling us to leave them. Your forged dispatch explains the order. It does not get my people home.', 'Inspect the lift first. Open the ventilation, salvage the iron support and forge a locking pin at our rescue workbench. Follow the safety plate. I will hold the surface route open.'],[['Bring both workers home.',()=>{if(lv('Mining')>=5&&lv('Smithing')>=5&&mainStoryAdvance(7,o))close();}]],MAIN_STORY_QUESTS[1].title);
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
 'I have signed their testimony and attached your forged dispatch. They heard their own voices calling from the dark. Scholar Ilyra tends the old roadside shrine west of here. Take this to her before someone else follows those whispers.'
 ],'Complete The Weight of an Oath.',{testimony:true},1);
 if(k==='ilyra'&&stage===18){
  if(lv('Magic')<5)return openNpcDialogue(o,['These oathstones once remembered promises freely given. Someone has cursed them to steal living voices. You need Magic 5 to loosen the enchantment without shattering the memories.'],[],MAIN_STORY_QUESTS[2].title);
  return openNpcDialogue(o,['These oathstones once held the promises of travelers: sound a warning, carry a light, offer a helping hand. The ward-keepers blessed them so no traveler would be left alone in the dark.', 'Now their sigils are twisted. They steal the voices of people who pass and whisper false summons beneath the mountain. Listen to the Bell, Lantern and Hand stones. Compare their memories with Hesta’s witnesses before touching the shrine. Magic 5 is required; recommended Combat 12 for what the curse may wake.'],[['Investigate the stolen voices.',()=>{if(lv('Magic')>=5&&mainStoryAdvance(18,o))close();}]],MAIN_STORY_QUESTS[2].title);
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
 const q=mainStoryState();if(currentScene==='tutorial'){toast('Finish the apprenticeship to begin the mainland story.');return false;}
 if(currentScene!=='overworld'){const before=currentScene;leaveInterior();return currentScene!==before?mainStoryGuide():false;}
 let key=MAIN_STORY_STEPS[q.stage][1];if(key==='maerin'){close();return mountainTravelTo(mountainObject('maerin').o);}
 if(key==='clues')key=Object.keys(MAIN_STORY_CLUES).find(k=>!q.clues.includes(k));if(key==='stones')key=Object.keys(MAIN_STORY_STONES).find(k=>!q.stones.includes(k));
 if(key==='escort'){const lagging=['bera','oren'].map(mainStoryObject).find(o=>!q.rescued.includes(o.mainStoryKey)&&Math.hypot(o.x-px,o.y-py)>8);if(lagging){const p=route(lagging.x,lagging.y,true,2.5);if(p===null)return false;close();stop();path=p;renderAction();toast('Return to '+lagging.name+', then lead both miners to Hesta.');return true;}const h=mainStoryObject('hesta'),p=route(h.x,h.y,true,2);if(p===null){toast('Return to the miners and find a clear route to Hesta.');return false;}close();stop();path=p;renderAction();return true;}
 const o=mainStoryObject(key);if(!o)return false;close();return mountainTravelTo(o);
}
function mainStoryTickEscort(){
 const q=mainStoryState();if(q.stage!==16||currentScene!=='overworld')return;const h=mainStoryObject('hesta');
 for(const key of ['bera','oren']){
  if(q.rescued.includes(key))continue;const o=mainStoryObject(key),distance=Math.hypot(o.x-px,o.y-py),followReach=key==='bera'?1.8:2.8;
  if(distance<=12&&distance>followReach&&Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)<.05){const next=route(Math.round(px),Math.round(py),true,followReach,o.x,o.y,o)?.[0];if(next){o.heading=Math.atan2(next[0]-o.x,next[1]-o.y);o.x=next[0];o.y=next[1];}}
  (q.positions??={})[key]=[o.x,o.y];if(Math.hypot(o.x-h.x,o.y-h.y)<=5){q.rescued.push(key);save();toast(o.name+' has reached safety. '+q.rescued.length+' / 2.');}
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
 if(key==='harness'){for(const side of [-1,1]){beam([-.35,.035,side*.21],[.06,.045,side*.12],.035,'#614329');beam([.19,.025,side*.14],[.4,.025,side*.26],.035,'#614329');}box(.02,.065,0,.11,.03,.4,iron);return .15;}
 if(key==='boots'){for(let i=0;i<4;i++)oval3(p,x-.3+i*.19,.025,z+(i%2?.14:-.1),.13,.025,.24,'#72503c',a=>a,6);return .12;}
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
