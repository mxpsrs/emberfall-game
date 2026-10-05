'use strict';
// Arc One: stable saved stage boundaries; the enemies, never the player, break the prison.
const MOUNTAIN_STEPS=[
 ['The Wardkeeper families','Bring the physical Memory Shard and evidence to Maerin. Mining 8, Smithing 8, Magic 8; recommended Combat 15.','maerin'],
 ['Three empty homes','Investigate the Wardkeeper ledger, abandoned tools and false summons at three Ironhollow homes.','clues'],
 ['An organized operation','Compare the missing families with the road, mine and shrine evidence. Speak to Maerin.','maerin'],
 ['The service passage','Recover the Wardkeepers’ service-hatch bearing. Mining 8.','bearing'],
 ['Repair the escape access','Repair the bearing at Ironhollow’s ward workbench. Smithing 8.','workbench'],
 ['A way to the prison','Open only the outer service hatch with the repaired bearing and Magic 8. The prison seals remain intact.','seal'],
 ['The occupied Underworks','Explore the occupied Underworks. Recover the agents’ field orders, then defeat the Oathbound Watcher beyond their barricades.','watcher'],
 ['The name beneath the mountain','Reach Warden Edda. Learn what the unknown agents are attempting to awaken.','edda'],
 ['Protect the living','Restore the escape ventilation so Edda can evacuate the Wardkeeper survivors.','vent'],
 ['The final seal','Race north to the final prison seal. Stop the masked operatives.','memory'],
 ['The prison is broken','Return to Maerin with Edda’s testimony. The enemy has awakened Veyr.','maerin'],
 ['A world of borrowed voices','Begin The Borrowed King with Maerin. Magic 10, Worship 8; recommended Combat 18.','maerin'],
 ['Alaric’s mistake','Read the shard’s Wardkeeper record in your journal, then seek Master Alaric in Ironcrown’s library.','expert'],
 ['The counter-ward','Bind 2 iron bars, 6 air relics and 6 mind relics at the ward workbench. Magic 10.','workbench'],
 ['Agree on the truth','Return to Alaric. Learn the counter-ward’s signal.','expert'],
 ['The halls of trust','Cross the Shattered Sanctum. Test three captive memories against your journal and counter-ward readings.','bindings'],
 ['Stand together','Meet Alaric before the inner arena. Confirm his identity and anchor the counter-ward.','expert'],
 ['The Borrowed King','Defeat Veyr through three phases. Watch physical warnings and use counter-ward insight to expose his imitations.','veyr'],
 ['More than one prison','Search the agents’ abandoned survey chart beside the shattered throne.','aftermath'],
 ['A battle won','Return to Maerin. Collect the Veilbreaker Ring and record the other marked locations.','maerin'],
 ['Arc One complete','Veyr is defeated and Ironhollow is safe. Rook offers repeat echo hunts; the other targets remain unresolved.','huntsman']
];
const MOUNTAIN_CLUES={
 ledger:['Wardkeeper family duty ledger','Generations of three Ironhollow families maintained a prison below the mountain. Recent missing names match the duty rotations. Someone added access dates in unfamiliar ink.','The missing families were Wardkeepers, custodians of ancient protections.'],
 tools:['Tools outside an empty Wardkeeper home','Dinner is untouched. A child’s note says: “Father heard Grandmother at the cellar stairs. Grandmother is buried.” Boot marks include an unfamiliar adult who waited outside.','A familiar dead relative’s voice lured a Wardkeeper underground; another person followed.'],
 summons:['Copied summons at the shuttered home','An old royal impression was copied onto new parchment. The ink and seven-point wax match the raiders’ orders. A scrap lists shifts, shrine fragments and three family names.','The forged orders, mine sabotage and missing families belong to one organized operation.']
};
const MOUNTAIN_BINDINGS={
 child:{name:'The borrowed captain',question:'Rellan’s image orders you to surrender the counter-ward: “The royal seven-point seal proves my command.” The apparition casts no shadow across a lit floor.',answer:'Rellan confirmed the current seal has five points. Keep the ward.',wrong:'Obey the seven-point order.',memory:'Orders of the Dead: the copied royal seal had seven points; the current seal has five.',spirit:'The counter-ward repeats exactly with the apparition: a copied human rhythm.'},
 miner:{name:'The stolen last shift',question:'Bera calls: “I rang the bell and shouted Oren to safety.” Her lips repeat a fraction after the echo. An old rescue brace lies beneath the scene.',answer:'Dust took Bera’s voice before the bell. This memory is altered.',wrong:'Bera called Oren below after the bell.',memory:'The Last Shift: Bera could not speak before the bell. Both miners returned to Hesta.',spirit:'The counter-ward’s pulse passes through the false Bera, but catches on the real iron brace beneath her.'},
 keeper:{name:'The remembered companion',question:'Alaric’s lost companion begs: “Open the inner ward; trust my voice.” The real counter-ward burns in three steady points, while her copied light flickers in only two.',answer:'Alaric’s signal has three steady lights. Hold the ward and free the memory.',wrong:'Open the ward because the voice is familiar.',memory:'Alaric admitted following a copied friend’s voice. The agreed signal is three steady lights; no ally will ask you to lower the counter-ward.',spirit:'The counter-ward keeps its steady three-beat signal against the two-beat imitation.'}
};
const ARC_REWARDS={
 rellanSignet:{npc:'rellan',main:7},ironhollowBelt:{npc:'hesta',main:18},whisperPendant:{npc:'ilyra',main:25},wardkeeperCape:{npc:'edda',mountain:11},veilbreakerRing:{npc:'expert',mountain:20}
};
function arcOwnsAnywhere(id){return (s.gear?.[id]||0)+(s.bag?.[id]||0)+(s.bank?.[id]||0)>0||Object.values(s.equipment||{}).includes(id)||(s.groundLoot||[]).some(p=>p.items?.[id]>0);}
function arcGiveItem(id){
 if(!ITEMS[id])return false;s.gear??={};s.bag??={};s.bank??={};
 if(canCarry(id)){const bag=ITEMS[id].slot?s.gear:s.bag;bag[id]=(bag[id]||0)+1;}else{s.bank[id]=(s.bank[id]||0)+1;toast(ITEMS[id].name+' was sent to your bank.');}return true;
}
function arcConsumeItem(id){const bag=ITEMS[id]?.slot?s.gear:s.bag;if(bag?.[id]>0){bag[id]--;return true;}if(s.bank?.[id]>0){s.bank[id]--;return true;}return false;}
function arcRecoveryChoices(o){
 const key=o.mainStoryKey||o.mountainKey,choices=[];
 for(const [id,r]of Object.entries(ARC_REWARDS))if(r.npc===key&&(r.main?mainStoryState().stage>=r.main:mountainState().stage>=r.mountain)&&!arcOwnsAnywhere(id))choices.push(['Recover '+ITEMS[id].name,()=>{if(!mountainNear(o)||arcOwnsAnywhere(id)||window.playerTrade)return;if(arcGiveItem(id)){save();renderUI();close();toast(ITEMS[id].name+' recovered.');}}]);
 if(key==='ilyra'&&mainStoryState().stage>=24&&mountainState().stage===0&&!arcOwnsAnywhere('memoryShard'))choices.push(['Recover the Memory Shard',()=>{if(mountainNear(o)&&mountainState().stage===0&&!arcOwnsAnywhere('memoryShard')){arcGiveItem('memoryShard');save();renderUI();close();}}]);
 return choices;
}
function arcGate(chapter){
 const requirements=chapter===4?{Mining:8,Smithing:8,Magic:8}:{Magic:10,Worship:8};
 for(const [skill,n]of Object.entries(requirements))if(lv(skill)<n)return 'Requires '+skill+' '+n+'.';
 return '';
}
function arcWorldReaction(o){
 const q=mountainState();if(q.stage<10)return '';
 const key=o.mainStoryKey||o.mountainKey;
 if(q.stage>=18)return ({rellan:'The false orders have stopped. We still check our countersigns face to face. Trust deserves that much care.',hesta:'Bera and Oren came home. That is what I tell people when they ask what you did beneath the mountain.',ilyra:'Veyr copied our memories, but could not reproduce the counter-ward’s independent signal.',edda:'The voices have stopped. We will keep watch over the empty chambers; survival is no reason to leave them unguarded.'})[key]||'The impossible voices have stopped. People are checking on their families; Ironhollow remembers who brought them home.';
 return key==='rellan'?'Two guards heard me order opposite patrols. I gave neither command. We now check written countersigns face to face.':key==='hesta'?'A child heard his father call from the closed shaft while that same father stood beside him. We travel in pairs now.':key==='ilyra'?'Human memories are being repeated with terrible precision. The copies fail to reproduce the counter-ward’s independent signal.':key==='edda'?'I still hear my dead mother at doorways. I stay with witnesses. We must stop Veyr before more people follow.':'Someone called a familiar name from an empty room. Nobody here is willing to follow a voice alone.';
}
function mountainState(){
 let q=s.mountainQuest;if(!q||typeof q!=='object'||Array.isArray(q))q=s.mountainQuest={};
 const legacy=q.version!==2&&q.stage>0;q.version=2;q.stage=Number.isInteger(q.stage)?Math.max(0,Math.min(20,q.stage)):0;
 if(legacy){if(q.stage>=11){q.reward1=true;q.awakened=true;}if(q.stage>=20)q.reward2=true;if(q.stage>=6)q.fieldOrders=true;q.arcMigrated=true;}
 q.clues=Array.isArray(q.clues)?[...new Set(q.clues.filter(k=>MOUNTAIN_CLUES[k]))]:[];
 q.bindings=Array.isArray(q.bindings)?[...new Set(q.bindings.filter(k=>MOUNTAIN_BINDINGS[k]))]:[];
 return q;
}
function mountainUnlocked(){return mountainState().stage===20;}
let mountainReady=false,mountainSerial=6100000,mountainWork=null,mountainJournal='story';
CREATURE_LAIRS.quest_underiron={title:'The Sealed Underworks',subtitle:'Wardkeeper halls · An occupied prison',quest:true,theme:'arcane',size:[52,128],entry:[26,121],arena:[22,19],entrance:[766,156],floor:'#454b50',trim:'#9c9382',glow:'#9bcbd4',fog:[.12,.15,.17],ambient:[.85,.95,1.02],light:[.08,.14,.2],rooms:[['rect',18,30,9,16],['rect',7,23,30,12],['rect',9,6,26,19],['rect',22,105,9,19],['ellipse',26,102,13,11],['rect',11,93,20,8],['rect',10,73,9,24],['ellipse',15,71,11,10],['rect',14,62,29,8],['rect',36,43,9,24],['ellipse',38,44,10,9],['rect',21,36,20,9]]};
// Its physical entrance belongs beneath Ironhollow, not beside unrelated ruins.
CREATURE_LAIRS.lair_veyr.entrance=[794,157];
CREATURE_LAIRS.lair_veyr.subtitle='The Borrowed King · Three halls of trust';
CREATURE_LAIRS.lair_veyr.approach.name='The Shattered Sanctum';
CREATURE_LAIRS.lair_veyr.approach.rooms=['Hall of False Orders','Gallery of the Last Shift','The Companion’s Threshold'];
const mountainLairRelease=creatureLairReleased;
creatureLairReleased=function(lair){return lair.quest||mountainLairRelease(lair);};
function mountainObject(key){for(const [scene,w]of Object.entries(worldScenes)){const o=w.objects.find(o=>o.mountainKey===key);if(o)return {scene,o};}return null;}
function mountainPlace(scene,key,name,x,y,extra={}){
 const point=encounterSpawnPoint(scene,x,y,20);if(!point)throw new Error('No safe quest position: '+key);
 const [a,b]=point,o={id:mountainSerial++,type:'prop',sprite:12,name,x:a,y:b,drawX:a,drawY:b,homeX:a,homeY:b,dead:0,_stationary:true,mountainKey:key,...extra};worldScenes[scene].objects.push(o);return o;
}
function mountainNPC(scene,key,name,x,y,race='dwarf'){return mountainPlace(scene,key,name,x,y,{type:'questgiver',sprite:2,characterSprite:true,race});}
let mountainLibraryHome=null;
function setupMountainLibrary(){
 const world=worldScenes.overworld,b=world.buildings.find(b=>b.settlement==='ironhollow'&&b.archetype==='castle');
 if(!b)throw new Error('Ironcrown Citadel is required for the library quest');
 const previous=currentScene;currentScene='overworld';
 const place=(key,name,type,model)=>{
  for(let y=b.y+4;y<b.y+b.h-3;y++)for(let x=b.x+4;x<b.x+Math.floor(b.w/2)-2;x++){
   if(worldWall(x,y)||world.objects.some(o=>Math.hypot(o.x-x,o.y-y)<2.2))continue;
   const o={id:mountainSerial++,mountainKey:key,type,name,sprite:type==='questgiver'?0:12,x,y,homeX:x,homeY:y,drawX:x,drawY:y,dead:0,_stationary:true,interiorBuilding:b.service.destination,...(type==='questgiver'?{characterSprite:true,race:'human'}:{mountainModel:model})};world.objects.push(o);return o;
  }throw new Error('No free library floor for '+key);
 };
 try{const expert=place('expert','Master Alaric','questgiver');mountainLibraryHome={x:expert.x,y:expert.y,building:b.service.destination};place('library_books','Ironcrown library · Sealing records','prop','World_Bookcase_2');}finally{currentScene=previous;}
}
function syncMountainExpert(){
 const found=mountainObject('expert');if(!found||!mountainLibraryHome)return;const q=mountainState(),destination=q.stage>=15&&q.stage<=19?'lair_veyr':'overworld';
 if(found.scene===destination)return;
 const o=found.o;if(!globalThis.VeldrenWorldObjects?.enabled)worldScenes[found.scene].objects=worldScenes[found.scene].objects.filter(p=>p!==o);
 const point=destination==='overworld'?[mountainLibraryHome.x,mountainLibraryHome.y]:encounterSpawnPoint(destination,22,37,10);
 if(!point)throw new Error('No safe position for Alaric');Object.assign(o,{x:point[0],y:point[1],homeX:point[0],homeY:point[1],drawX:point[0],drawY:point[1]});
 if(destination==='overworld')o.interiorBuilding=mountainLibraryHome.building;else delete o.interiorBuilding;
 if(globalThis.VeldrenWorldObjects?.enabled)VeldrenWorldObjects.moveActor(o,destination);else worldScenes[destination].objects.push(o);
}
function mountainInspectFragment(){
 const q=mountainState();if(q.stage!==12||!q.memory)return;
 dialog('Wardkeeper record in the shard','<p>A broken entry names Master Alaric among the adventurers who repaired the prison years ago. A diagram shows three points of light surrounding an unbroken inner ward.</p><p>The record does not name the unknown attackers. Alaric may know how to resist the being they released.</p>',[['Copy the record for Alaric.',()=>{if(q.stage!==12)return;q.inscription=true;save();close();toast('Seek Master Alaric in Ironcrown’s library.');}]]);
}
function mountainExpertReveal(o){
 if(!mountainState().inscription)return mountainSay(o,['Read the Wardkeeper entry in your journal first. I need to know which binding failed.'],[['Read the shard’s record.',mountainInspectFragment]],'The Borrowed King');
 return mountainOffer(o,12,['Years ago my companions and I helped contain Veyr. He spoke with a friend’s voice from beyond the ward. I believed him. I damaged a protection trying to let her out. Edda’s predecessors repaired what I broke.', 'That old mistake left scars in the prison. It did not hire these raiders, forge these orders or sabotage this mine. Living people found the weakness and deliberately opened it. I do not know who they are.', 'We will forge a counter-ward: two iron bars, six air relics and six mind relics. Bind it with Magic 10 at Ironhollow’s workbench. I will maintain it inside the Sanctum.', 'Veyr copies human memory with frightening accuracy. Your Spirit is fundamentally different. It can expose a false reaction, but you must still compare clues and choose what to trust. Any bonded Spirit can help.'],'Prepare the counter-ward together.',()=>{mountainAdvance(12,o,{truths:true,lairKey:true});close();});
}
function setupMountainQuest(){
 if(mountainReady)return;mountainReady=true;
 const t=SETTLEMENTS.find(t=>t.id==='ironhollow');
 mountainNPC('overworld','maerin','Archivist Maerin',t.x+2,t.y+5);
 mountainNPC('overworld','huntsman','Huntsman Rook',48,92,'human');
 setupMountainLibrary();
 mountainPlace('overworld','ledger',MOUNTAIN_CLUES.ledger[0],t.x-14,t.y+6,{mountainModel:'World_BookStand'});
 mountainPlace('overworld','tools',MOUNTAIN_CLUES.tools[0],t.x+15,t.y+10,{mountainModel:'World_WeaponStand'});
 mountainPlace('overworld','summons',MOUNTAIN_CLUES.summons[0],t.x+9,t.y-16,{mountainModel:'World_BookStand'});
 mountainPlace('overworld','bearing','Collapsed ward workings',t.x+22,t.y+32,{mountainModel:'Rock_Medium_1'});
 mountainPlace('overworld','workbench','Ward workbench',t.x+11,t.y+19,{mountainModel:'World_Workbench'});
 const entrance=CREATURE_LAIRS.quest_underiron.entrance;
 mountainPlace('overworld','seal','Three-sigil royal seal',entrance[0]+2,entrance[1]+1,{mountainModel:'World_BookStand'});
 const guard=mountainPlace('quest_underiron','watcher','Oathbound Watcher',22,31,{type:'enemy',kind:'mountainwatcher',sprite:species.skeleton.sprite});
 applyEnemyTier(guard,{...ENEMY_TIERS.skeleton,look:'skeleton',name:'Oathbound Watcher',hp:40,level:15,maxHit:4,weak:'magic'});
 mountainNPC('quest_underiron','edda','Warden Edda',12,27);
 mountainPlace('quest_underiron','vent','Ventilation wheel',31,27,{mountainModel:'World_Workbench'});
 mountainPlace('quest_underiron','memory','Final prison seal',22,10,{mountainModel:'World_BookStand'});
 mountainNPC('quest_underiron','survivor','Trapped miner Dorrin',12,29);
 for(const [key,x,y]of [['child',22,119],['miner',12,92],['keeper',33,65]])mountainPlace('lair_veyr','binding_'+key,MOUNTAIN_BINDINGS[key].name,x,y,{mountainModel:'World_BookStand'});
 mountainPlace('lair_veyr','aftermath','Abandoned multi-site survey chart',27,11,{mountainModel:'World_BookStand'});
 mountainPlace('quest_underiron','fieldOrders','Masked agents’ field orders',14,69,{mountainModel:'World_BookStand'});
 for(const [i,x,y]of [[0,27,98],[1,14,80],[2,38,52]]){const agent=mountainPlace('quest_underiron','agent_'+i,'Masked excavator',x,y,{type:'enemy',kind:'wardagent',sprite:species.bandit.sprite});applyEnemyTier(agent,{...ENEMY_TIERS.bandit,look:'bandit',name:'Masked excavator',level:13,hp:26,maxHit:3});}
 mountainNPC('quest_underiron','saboteur','Masked seal-breaker',26,12,'human');mountainNPC('quest_underiron','accomplice','Masked lookout',18,11,'human');
 syncMountainWorld();
 if(!mountainCanEnter(currentScene)){const point=CREATURE_LAIRS[currentScene]?.returnPoint;if(point)activateScene('overworld',...point,false);}
}
function syncMountainWorld(){
 if(!mountainReady)return;const q=mountainState(),found=mountainObject('edda');
 const destination=q.stage>=10?'overworld':'quest_underiron';
 if(found&&found.scene!==destination){
  if(!globalThis.VeldrenWorldObjects?.enabled)worldScenes[found.scene].objects=worldScenes[found.scene].objects.filter(o=>o!==found.o);
  const maerin=mountainObject('maerin').o,at=destination==='overworld'?[maerin.x+3,maerin.y+2]:destination==='lair_veyr'?[22,37]:[12,27];
  const point=encounterSpawnPoint(destination,...at,12);if(!point)throw new Error('No safe position for Edda');
  Object.assign(found.o,{x:point[0],y:point[1],drawX:point[0],drawY:point[1],homeX:point[0],homeY:point[1]});if(globalThis.VeldrenWorldObjects?.enabled)VeldrenWorldObjects.moveActor(found.o,destination);else worldScenes[destination].objects.push(found.o);
 }
 syncMountainExpert();
 const watcher=mountainObject('watcher')?.o;if(watcher&&q.stage>=7){watcher.hp=0;watcher.dead=Infinity;watcher.collected=true;}
 const survivor=mountainObject('survivor')?.o;if(survivor)survivor.name=q.stage>=9?'Dorrin · Safe passage opened':'Trapped miner Dorrin';
 realmNavigation.clear();mapServicesCache=null;(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(worldScenes[currentScene].objects):objects.splice(0,objects.length,...worldScenes[currentScene].objects));
}
const mountainSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){mountainSetupBefore();setupMountainQuest();};
function mountainNear(o){return !!o&&objects.includes(o)&&currentScene!=='tutorial'&&Math.hypot(px-o.x,py-o.y)<=2&&lineOfSight(px,py,o.x,o.y);}
function mountainAdvance(expected,o,change={}){
 const q=mountainState();if(q.stage!==expected||o&&!mountainNear(o))return false;
 if(expected===0){const gate=arcGate(4);if(gate||!mainStoryComplete()){toast(gate||'Complete Whispers at Hollow Shrine.');return false;}if(!arcOwnsAnywhere('memoryShard')&&!mainStoryState().arcMigrated){toast('Retrieve the Memory Shard from your bank or Ilyra.');return false;}arcConsumeItem('memoryShard');change.memory=true;}
 if(expected===11){const gate=arcGate(5);if(gate){toast(gate);return false;}}
 Object.assign(q,change,{stage:expected+1});if(expected===10)mountainReward(1,false);if(expected===19)mountainReward(2,false);syncMountainWorld();save();renderUI();toast('Quest updated: '+MOUNTAIN_STEPS[q.stage][0]);return true;
}
function mountainSay(o,pages,choices=[],topic){openNpcDialogue(o,pages,choices,topic||'The King Beneath the Mountain');}
function mountainOffer(o,expected,pages,label,action){mountainSay(o,pages,[[label,()=>{if(mountainState().stage!==expected||!mountainNear(o))return;action();}],['I need more time.',close]]);}
function mountainReward(part,persist=true){
 const q=mountainState(),key='reward'+part;if(q[key])return;q[key]=true;
 const rewards=part===1?{Mining:600,Smithing:600,Magic:600,Defense:300,Hitpoints:300}:{Attack:750,Strength:750,Defense:750,Hitpoints:750,Magic:750,Ranged:750,Worship:750};
 const coins=part===1?600:1000,item=part===1?'wardkeeperCape':'veilbreakerRing',banked=grantQuestCoins(coins);arcGiveItem(item);
 for(const [skill,n]of Object.entries(rewards))gain(skill,n,true);showExperienceDrop(rewards);if(persist)save();
 if(typeof showQuestCompletion==='function')showQuestCompletion({title:part===1?'The King Beneath the Mountain':'The Borrowed King',coins,banked,xp:rewards,unlocks:[ITEMS[item].name,part===1?'The Borrowed King':'Repeat Veyr hunts through Rook']});
}
function mountainTalk(o){
 const q=mountainState(),key=o.mountainKey;
 if(key==='huntsman')return openHuntsman(o);
 if(key==='maerin'){
  if(q.stage===0){const gate=arcGate(4);if(gate)return mountainSay(o,[gate,'The Memory Shard links this investigation to our Wardkeeper records. Bring it when you are ready.']);
   return mountainOffer(o,0,['This shard names families who maintained ancient protections beneath Ironhollow. Wardkeepers. Several have disappeared in the last few days.', 'The road attack hid a delivery. The mine collapse hid a dig. The shrine was searched for seal fragments. Now someone is removing the people who maintain the prison.', 'Investigate three empty family homes: the duty ledger to the west, abandoned tools east, and copied summons north. We must learn who was taken and find a way down. Recommended Combat 15.'],'Hand over the shard and investigate.',()=>{if(mountainAdvance(0,o))close();});}
  if(q.stage===2)return mountainSay(o,['The names match. These were Wardkeepers. Familiar voices drew them into cellars; unfamiliar boots followed. The false summons uses the raiders’ copied seal.', 'This is organized. Someone is deliberately trying to open an ancient prison. We suspect they want to destabilize Veldren, but we have no proof of their larger purpose.', 'Warn the remaining families or shelter them in the archive. Then repair the outer service hatch: recover its bearing, reshape it at the ward workbench, and follow the inscription. Opening that hatch does not alter the prison seals.'],[['Warn the remaining families.',()=>{if(mountainAdvance(2,o,{choice:'warn'}))close();}],['Shelter the families in the archive.',()=>{if(mountainAdvance(2,o,{choice:'shelter'}))close();}]]);
  if(q.stage===10)return mountainOffer(o,10,['Edda reached the archive with survivors. Her account is clear: the masked operatives completed the final rite. You did not release Veyr. They did.', q.choice==='warn'?'Your warning saved the remaining families. Neighbours checked every familiar voice before following it.':'The families you sheltered stayed together and refused voices calling from empty corridors.', 'Guards are hearing contradictory commands. Citizens hear the dead. Edda names the being Veyr. We must stop him, and we need someone who survived facing him before. Take the Wardkeeper Cape; you earned it saving their people.'],'Complete The King Beneath the Mountain.',()=>{if(mountainAdvance(10,o)){mountainReward(1);close();}});
  if(q.stage===11){const gate=arcGate(5);if(gate)return mountainSay(o,[gate,'Veyr copies people, not Spirits perfectly. Any usable Spirit will do.']);return mountainOffer(o,11,['Veyr is awake. Rellan’s guards received conflicting orders in his voice. Hesta heard children called back into the mine. Nobody knows which memories to trust.', 'Our records name Master Alaric. Read the surviving Wardkeeper entry in your journal and find him in Ironcrown’s library. Recommended Combat 18. Bring a Spirit; no particular element is required.'],'Begin The Borrowed King.',()=>{if(mountainAdvance(11,o))close();});}
  if(q.stage===19)return mountainOffer(o,19,['Veyr is defeated. The voices have stopped and the families are returning. You and Alaric won this battle; nothing in this chart diminishes what that took.', 'This is the intruders’ work, not Veyr’s memory. Ironhollow is marked as one completed operation. Several other locations carry different seal diagrams and unfinished survey codes.', 'They are attempting to awaken multiple ancient beings. We do not know their name, their leaders, or why they want this. Destabilizing Veldren is our interpretation, not a confession.', 'Rest. Help Ironhollow recover. We will study the other marks before sending anyone after another prison. The Veilbreaker Ring is yours. Rook can offer repeat echo hunts; they do not change what happened here.'],'Complete The Borrowed King.',()=>{if(mountainAdvance(19,o)){mountainReward(2);close();}});
  return mountainSay(o,[q.stage===20?'Veyr is defeated. Ironhollow was one of several targets. The other marks remain under study; we will not mistake a theory for knowledge.':MOUNTAIN_STEPS[q.stage][1]],arcRecoveryChoices(o));
 }
 if(key==='edda'&&q.stage===7)return mountainOffer(o,7,['The being below is Veyr. Our families have maintained his prison for generations. He can enter human memories and wear the voices and identities people trust.', 'Masked strangers brought stolen shrine fragments into the Underworks. They used our names and familiar voices to lure Wardkeepers down, then took their seal tokens. Veyr did not arrange your road attack or this excavation. Those people are trying to wake him.', 'The Watcher mistook their stolen tokens for authority. You broke its hold. Restore the escape ventilation for our survivors, then hurry north. The last protection is still standing—for now.'],'Protect the survivors and reach the final seal.',()=>{if(mountainAdvance(7,o,{veyrNamed:true}))close();});
 if(key==='expert'&&q.stage===12)return mountainExpertReveal(o);
 if(key==='expert'&&q.stage===14)return mountainOffer(o,14,['Three steady lights: that is my counter-ward’s signal. I will never tell you to lower it. If my voice does, trust the agreement we made here.', 'Veyr may imitate Rellan, Bera, me, even you. Check their words against your journal and the physical scene. Your Spirit can expose what his human mimicry gets wrong; press Spirit insight at a memory or during combat. It gives a clue, not the answer.', 'Enter the Shattered Sanctum beneath Ironhollow. Cross the Hall of False Orders, the Gallery of the Last Shift, and the Companion’s Threshold. Free the trapped minds, then meet me at the inner arena.'],'Enter the Sanctum together.',()=>{if(mountainAdvance(14,o,{signalKnown:true}))close();});
 if(key==='expert'&&q.stage===16)return mountainOffer(o,16,['Count the lights. Three, steady. I am holding the ward just as we agreed.', 'Veyr first borrows familiar commands, then fractures the arena, then steals your likeness. Solid marked ground is dangerous even when a voice calls it safe. Spirit insight shows the copies as hollow outlines for a short time; you still have to move and choose your target.', 'I will blunt his attacks, interrupt some hazards and mend your wounds. Keep pressure on him. If you retreat, the freed minds remain free. We finish this together.'],'Anchor the counter-ward and face Veyr.',()=>{if(mountainAdvance(16,o,{identityConfirmed:true}))close();});
 if(key==='expert')return mountainSay(o,[q.stage>=18?'We defeated him. I will not pretend that undoes what he took. Search the operatives’ abandoned survey chart, then bring it to Maerin.':q.stage===17?'Three steady lights. Keep the ward. Watch the real ground markings; use Spirit insight if the copies confuse you.':MOUNTAIN_STEPS[q.stage][1]],arcRecoveryChoices(o),'The Borrowed King');
 if(key==='edda')return mountainSay(o,[q.stage>=10?arcWorldReaction(o):'The strangers are moving north. We must protect the survivors and reach the final seal.'],arcRecoveryChoices(o));
 if(key==='survivor')return mountainSay(o,[q.stage>=9?'Edda opened the escape. I will lead the families up. Do not follow the voice that sounds like your commander.':'The miners’ timber supports run straight through our ancestors’ stone halls. Those masked people knew where to dig. Edda kept us alive.']);
 if(key==='saboteur'||key==='accomplice')return mountainSay(o,[q.stage>=10?'The operatives are gone. No identity remains.':'“The final fragments are in position. Hold the passage.”']);
}
function mountainWorkStart(o,stage,skill,level,label,finish,requirements={}){
 if(mountainState().stage!==stage||!mountainNear(o))return false;
 if(lv(skill)<level){toast('Requires '+skill+' '+level+'.');return false;}
 if(skill==='Mining'&&!useBeltTool('pickaxe'))return false;
 if(Object.entries(requirements).some(([id,n])=>(s.bag[id]||0)<n)){toast('Bring 2 iron bars, 6 air relics and 6 mind relics in your bag.');return false;}
 close();stop();mountainWork={o,stage,skill,level,label,finish,requirements,age:0,scene:currentScene};
 playerHeading=Math.atan2(o.x-px,o.y-py);renderAction();return true;
}
const mountainStopBefore=stop;
stop=function(){mountainWork=null;return mountainStopBefore();};
const mountainGatherBefore=gatheringActivity;
gatheringActivity=function(){if(mountainWork&&mountainWork.skill==='Mining')return {object:mountainWork.o,tool:'pickaxe',phase:(mountainWork.age% .8)/.8};return mountainGatherBefore();};
function mountainTickWork(dt){
 const job=mountainWork;if(!job)return;
 if(currentScene!==job.scene||!mountainNear(job.o)||activeEncounter||mountainState().stage!==job.stage){mountainWork=null;return;}
 const before=job.age;job.age+=dt;
 if(Math.floor(before/.8)!==Math.floor(job.age/.8))playGameSound(job.skill==='Magic'?'magic':job.skill==='Mining'?'mine':'smith',job.o.x,job.o.y);
 if(job.age<3.2)return;mountainWork=null;
 if(lv(job.skill)<job.level||Object.entries(job.requirements).some(([id,n])=>(s.bag[id]||0)<n))return;
 for(const [id,n]of Object.entries(job.requirements))s.bag[id]-=n;
 job.finish();renderAction();renderUI();save();
}
const mountainActionBefore=renderAction;
renderAction=function(){mountainActionBefore();if(mountainWork){}};
function mountainSeal(o,index=0){
 if(mountainState().stage!==5||!mountainNear(o))return;if(lv('Magic')<8){toast('Requires Magic 8.');return;}
 const order=['Stone','Iron','Breath'];
 dialog('The three-sigil seal','<p>“Stone remembers. Iron carries. Breath awakens.”</p><p>The repaired bearing opens the outer service hatch only. It does not touch the prison seals. Trace the maintenance inscription in order.</p><p>'+index+' / 3 sigils awakened.</p>',
 ['Breath','Stone','Iron'].map(word=>[word,()=>{
  if(mountainState().stage!==5||!mountainNear(o))return;
  if(word!==order[index]){toast('The seal falls quiet. Read the inscription and start again.');return mountainSeal(o,0);}
  if(index<2)return mountainSeal(o,index+1);
  mountainAdvance(5,o);close();toast('The royal passage opens. Enter the Sealed Underworks.');
 }]));
}
function mountainBinding(o,key){
 const q=mountainState(),row=MOUNTAIN_BINDINGS[key];
 if(q.bindings.includes(key)){dialog(row.name,'<p>This mind is free. Its voice is no longer repeating Veyr’s command.</p>');return;}
 if(q.stage!==15){dialog(row.name,'<p>A voice is trapped in the stone. '+(q.stage<15?'You need a prepared counter-ward and Alaric’s help.':'The binding has fallen silent.')+'</p>');return;}
 const reply=(correct)=>{if(mountainState().stage!==15||!mountainNear(o))return;if(!correct){toast('The binding tightens. That answer repeats Veyr’s command. Consult the truths in your journal.');close();return;}
  if(!q.bindings.includes(key))q.bindings.push(key);if(q.bindings.length===3)mountainAdvance(15,o);save();close();toast('A captive mind is free. '+q.bindings.length+' / 3.');};
 dialog(row.name,'<p>'+row.question+'</p>',[[row.wrong,()=>reply(false)],[row.answer,()=>reply(true)],['Read it with the counter-ward.',()=>arcCounterWardInsight(o,key)],['Consult the recorded evidence.',()=>dialog('Known facts','<p>'+row.memory+'</p>',[['Return to the memory.',()=>mountainBinding(o,key)]])],['Step away.',close]]);
}
function mountainInteract(o){
 if(!mountainNear(o))return;
 const q=mountainState(),key=o.mountainKey;stop();
 if(o.characterSprite)return mountainTalk(o);
 if(MOUNTAIN_CLUES[key]){
  if(q.stage===0)return dialog(o.name,'<p>An Ironhollow family has left in a hurry. Archivist Maerin is gathering their records; bring him the shrine evidence before opening this investigation.</p>');
  const row=MOUNTAIN_CLUES[key];dialog(row[0],'<p>'+row[1]+'</p>',q.stage===1&&!q.clues.includes(key)?[['Record the evidence.',()=>{if(q.stage!==1||!mountainNear(o)||q.clues.includes(key))return;q.clues.push(key);if(q.clues.length===3)mountainAdvance(1,o);save();close();}]]:[]);return;
 }
 if(key==='fieldOrders')return dialog(o.name,'<p>Separate teams: clear the road; close the legitimate shift; recover shrine fragments; take Wardkeeper tokens; finish the final seal. Every signature is coded. No group name or location of command is given.</p>',[['Copy the field orders.',()=>{if(!mountainNear(o))return;q.fieldOrders=true;save();close();toast('The coordinated operation is recorded. Reach the Oathbound Watcher.');}]]);
 if(key==='bearing'&&q.stage===3)return dialog(o.name,'<p>An iron bearing is trapped beneath loose stone. Recover it with your pickaxe. Mining 8 required. This quest component is kept in your journal.</p>',[['Recover the bearing.',()=>mountainWorkStart(o,3,'Mining',8,'Recovering the ward bearing',()=>mountainAdvance(3,o))]]);
 if(key==='workbench'){
  if(q.stage===4)return dialog(o.name,'<p>The recovered bearing is bent. Use the workbench to reshape it and repair the royal passage. Smithing 8 required.</p>',[['Reforge the bearing.',()=>mountainWorkStart(o,4,'Smithing',8,'Reforging the ward bearing',()=>mountainAdvance(4,o))]]);
  if(q.stage===13)return dialog(o.name,'<p>Bind a counter-ward from <b>2 iron bars, 6 air relics and 6 mind relics</b>. Requires Magic 10. Alaric can sustain this ward during your first Veyr battle.</p>',[['Bind the counter-ward.',()=>{if(lv('Magic')<10){toast('Requires Magic 10.');return;}mountainWorkStart(o,13,'Magic',10,'Binding the counter-ward',()=>mountainAdvance(13,o,{ward:true}),{ironBar:2,airRunes:6,runes:6});}]]);
 }
 if(key==='seal'&&q.stage===5)return mountainSeal(o);
 if(key==='vent'&&q.stage===8)return dialog(o.name,'<p>The return chain has slipped. Seat it in the guide, then turn the wheel toward the open passage. Edda waits until there is enough air to move the survivors.</p>',[['Restore the ventilation.',()=>mountainWorkStart(o,8,'Smithing',1,'Restoring the escape route',()=>mountainAdvance(8,o,{rescued:true}))]]);
 if(key==='memory'&&q.stage===9)return beginArcAwakening(o);
 if(key?.startsWith('binding_'))return mountainBinding(o,key.slice(8));
 if(key==='aftermath'&&q.stage===18)return dialog(o.name,'<p>A survey chart lies beneath the operatives’ abandoned tools. Several locations across Veldren carry seal diagrams. Ironhollow is one, marked “opened.” Other sites have incomplete routes and coded references.</p><p>These people are attempting to awaken multiple ancient beings. The chart names neither the organization nor every prisoner. Veyr was the first you witnessed them release.</p>',[['Preserve the enemy survey chart.',()=>{if(mountainAdvance(18,o,{lastMemory:true,multipleTargets:true}))close();}]]);
 dialog(o.name,'<p>'+MOUNTAIN_STEPS[q.stage][1]+'</p>');
}
const mountainInteractionBefore=handleWorldInteraction;
handleWorldInteraction=function(o){if(o.mountainKey&&!fighter(o)){mountainInteract(o);return true;}return mountainInteractionBefore(o);};
// Block both the physical doorway and direct scene changes until their story gate.
function mountainCanEnter(id){const q=mountainState();return id==='quest_underiron'?q.stage>=6:id==='lair_veyr'?q.stage>=15&&!!q.lairKey:true;}
const mountainSceneBefore=activateScene;
activateScene=function(id,...args){
 if(mountainReady&&!mountainCanEnter(id)){toast(id==='lair_veyr'?'Prepare with Alaric during The Borrowed King before entering the Sanctum.':'Restore the Wardkeepers’ service hatch during The King Beneath the Mountain first.');stop();return false;}
 return mountainSceneBefore(id,...args);
};
function mountainCanFight(o){const q=mountainState();return o.mountainKey==='watcher'?q.stage===6&&!!q.fieldOrders:o.encounter==='veyr'?q.stage===17||q.stage===20&&s.questRematch==='veyr':o.kind==='wardagent'?q.stage>=6:true;}
const mountainAttackBefore=performAttack,mountainBeginBefore=beginEncounter;
performAttack=function(o){if(!mountainCanFight(o)){stop();toast(o.encounter==='veyr'?'Free the three captive minds and speak to Alaric before confronting Veyr.':'Recover the agents’ field orders from their lower camp before confronting the Watcher.');return false;}return mountainAttackBefore(o);};
beginEncounter=function(o){if(!mountainCanFight(o))return;const previous=activeEncounter;mountainBeginBefore(o);if(activeEncounter&&activeEncounter!==previous&&o.encounter==='veyr'&&mountainState().stage===17){activeEncounter.companionWard=true;activeEncounter.companionHealAt=time+5;activeEncounter.companionPulseAt=time+3;activeEncounter.companionInterruptAt=time+7;toast('Alaric: I have the ward. Keep moving—I am with you!');}};
function mountainAssisted(o){return mountainState().stage===17&&currentScene==='lair_veyr'&&o?.encounter==='veyr'&&activeEncounter?.o===o&&activeEncounter.companionWard;}
const mountainHitBefore=applyEnemyHit;
applyEnemyHit=function(o,hit){if(mountainAssisted(o)&&hit>0&&!(typeof sharedApplying!=='undefined'&&sharedApplying)){hit=Math.max(1,Math.ceil(hit*.5));floating('Alaric’s ward',px,py,'#a4e0e7');}return mountainHitBefore(o,hit);};
const mountainAIBefore=updateEncounterAI;
updateEncounterAI=function(dt){
 const f=activeEncounter;
 if(f&&mountainAssisted(f.o)){
  const companion=mountainObject('expert')?.o;
  if(companion){
   if(f.companionInterruptAt<=time){const shared=typeof sharedLive==='function'&&sharedLive(),hazards=shared?sharedCombatHazards():f.hazards;if(hazards.length){if(shared)sharedTarget('wardInterrupt',f.o);else f.hazards.shift();f.companionInterruptAt=time+10;companion._castAt=time;companion._castDuration=1.2;floating('Alaric anchors the ward',f.o.x,f.o.y,'#a4e0e7');}}
   if(f.companionHealAt<=time){s.hp=Math.min(maxhp(),s.hp+3);renderUI();f.companionHealAt=time+6;companion._castAt=time;companion._castDuration=1.2;floating('+3 · Alaric',px,py,'#a4e0e7');}
   // Companion damage gives no player XP and cannot land the finishing blow.
   if(f.companionPulseAt<=time){if(typeof sharedLive==='function'&&sharedLive())sharedTarget('companion',f.o);else f.o.hp=Math.max(1,f.o.hp-2);f.companionPulseAt=time+4;companion._castAt=time;companion._castDuration=1.2;floating('−2 · Alaric',f.o.x,f.o.y,'#a4e0e7');}
  }
 }
 mountainAIBefore(dt);mountainTickWork(dt);
};
const mountainDefeatBefore=awardDefeat;
awardDefeat=function(o,style){
 const q=mountainState(),watcher=o.mountainKey==='watcher'&&q.stage===6,veyr=o.encounter==='veyr'&&mountainAssisted(o);
 mountainDefeatBefore(o,style);
 if(watcher)mountainAdvance(6,null);
 if(veyr){mountainAdvance(17,null,{veyrDefeated:true});toast('Veyr is defeated. Recover the agents’ survey chart before leaving. Complete the quest with Maerin to unlock repeat hunts.');}
};
const mountainDrawBefore=drawTutorialCrossing3;
drawTutorialCrossing3=function(mesh){
 mountainDrawBefore(mesh);const f=activeEncounter;if(!f||!mountainAssisted(f.o))return;const companion=mountainObject('expert')?.o;if(!companion)return;
 // Alaric projects the ward from the entrance dais; a visible tether reaches the player.
 const r=groundedPainter(mesh,px+.5,py+.5),glow=materialRealm(r,19);
 if(time-(companion._castAt||-100)<1.2){for(let i=0;i<6;i++){const u=(time*.7+i/6)%1;oval3(glow,(companion.x+.5)*(1-u)+(px+.5)*u,1.1+Math.sin(u*Math.PI)*.7,(companion.y+.5)*(1-u)+(py+.5)*u,.055,.055,.055,'#9bdddf',p=>p,6);}}
 lairRing(r,px+.5,py+.5,.8,.025,'#8fcbd5');
};
function openHuntsman(o){
 const q=mountainState(),choices=[];
 if(q.stage<20)choices.push(['The King Beneath the Mountain',()=>{close();openGamePanel('quests');}]);
 for(const [kind,e]of Object.entries(HUNT_ENCOUNTERS))if(encounterReleased(kind)&&(kind!=='veyr'||mountainUnlocked()))choices.push(['Teleport: '+e.name,()=>beginHuntsmanTeleport(kind,o)]);
 mountainSay(o,[q.stage<20?'Maerin in Ironhollow is looking for someone who can investigate the voices beneath the mountain. Repeat Veyr hunts unlock after The Borrowed King is complete. My other hunting paths are open.':'Veyr is defeated. The Sanctum retains a combat echo that my crossing can challenge. The original battle stays won. I can send you to its entrance whenever you are ready. These hunts will not have Alaric’s protection.','My crossings burn red. They take you to the entrance, where you can prepare before approaching your quarry.'],choices,'Huntsman crossings');
}
function beginHuntsmanTeleport(kind,speaker=null){
 const e=HUNT_ENCOUNTERS[kind];if(!e||!encounterReleased(kind)||kind==='veyr'&&!mountainUnlocked()||!worldScenes[e.scene]||currentScene==='tutorial'||!tutorialComplete(s)||tutorialCrossing)return false;
 if(activeEncounter||time-Math.max(lastAttack,playerHitAt)<8){toast('Leave combat and wait eight seconds before asking for a crossing.');return false;}
 if(cloudConflict||cloudDisconnected||window.maintenancePreparing||window.playerTrade)return false;
 close();stop();clearUseItem(false);closeWorldOptions();
 const rook=speaker||mountainObject('huntsman')?.o;if(!rook)return false;
 const remote=!objects.includes(rook)||Math.hypot(rook.x-px,rook.y-py)>7;
 const caster=remote?{...rook,x:px-2,y:py-1,drawX:px-2,drawY:py-1}:rook;caster._castAt=time;caster._castDuration=2.6;caster._castColor='#ff6464';
 tutorialCrossing={kind:'hunt',phase:'casting',age:0,caster,remote,destination:e.scene,destinationName:e.area,colors:['#ff5555','#ff9b82','#ffc4b9','#ee6464']};
 document.body.classList.add('tutorial-crossing');const veil=document.createElement('div');veil.id='tutorialCrossing';veil.className='huntsman-crossing';veil.setAttribute('role','status');veil.setAttribute('aria-live','polite');veil.innerHTML='<div class="crossing-veil"></div><p id="crossingCaption">Huntsman Rook opens a crimson crossing…</p>';document.body.appendChild(veil);playGameSound('teleport');return true;
}
function finishHuntsmanCrossing(crossing){
 if(!mountainCanEnter(crossing.destination)){crossing.destinationName='Crossing closed';return;}
 if(crossing.destination==='lair_veyr')s.questRematch='veyr';
 const lair=CREATURE_LAIRS[crossing.destination],boss=worldScenes[crossing.destination].objects.find(o=>o.encounter);
 // An explicit new hunt starts a fresh encounter, including after a previous clear.
 if(boss&&!(typeof sharedLive==='function'&&sharedLive())){boss.hp=boss.maxhp;boss.dead=0;boss.respawnAt=0;delete boss._recovering;delete boss._returning;}
 s.insideBuilding=null;s.returnPoint=lair.returnPoint?.slice();activateScene(crossing.destination,...lair.entry);save();
}
const mountainHuntsBefore=renderHunts;
renderHunts=function(){
 mountainHuntsBefore();if(huntingGroundsOpen)return;
 for(const card of $('huntCards').children){const title=card.querySelector('h3')?.textContent,e=Object.entries(HUNT_ENCOUNTERS).find(([,row])=>row.name===title);if(!e)continue;const [kind]=e,b=card.querySelector('button');if(!b)continue;
  if(kind==='veyr'&&!mountainUnlocked()){b.textContent='Quest: The King Beneath the Mountain';b.disabled=currentScene==='tutorial';b.onclick=()=>{mountainJournal='story';openGamePanel('quests');};}
  else{b.textContent=currentScene==='tutorial'?'Available on the mainland':'Huntsman teleport';b.onclick=()=>beginHuntsmanTeleport(kind);}
 }
};
function mountainGuide(){
 if(playerAction?.kind==='investigate')return true;
 const q=mountainState();let key=MOUNTAIN_STEPS[q.stage][2];
 if(q.stage===6&&!q.fieldOrders)key='fieldOrders';
 if(key==='clues')key=Object.keys(MOUNTAIN_CLUES).find(k=>!q.clues.includes(k));
 if(key==='bindings')key='binding_'+Object.keys(MOUNTAIN_BINDINGS).find(k=>!q.bindings.includes(k));
 let found=key==='veyr'?{scene:'lair_veyr',o:worldScenes.lair_veyr.objects.find(o=>o.encounter==='veyr')}:mountainObject(key);
 if(!found)return;
 if(currentScene==='tutorial'){toast('Finish the apprenticeship to begin this mainland story.');return;}
 if(currentScene!==found.scene){
  if(currentScene!=='overworld'){const exit=worldScenes[currentScene]?.exit;if(exit){close();return mountainTravelTo(exit);}return false;}
  found={scene:'overworld',o:objects.find(o=>o.destination===found.scene)};
 }
 if(q.stage===12&&!q.inscription)return mountainInspectFragment();
 if(found.o){
  const room=found.o.interiorBuilding&&buildings.find(b=>b.service?.destination===found.o.interiorBuilding);
  if(room&&room.service.openedAt===undefined){close();engage(room.service);toast('Open Ironcrown Citadel, then follow the objective again to reach its library.');return;}
  close();mountainTravelTo(found.o);
 }
}
function mountainTravelTo(o){
 const reach=fighter(o)?attackRange(o):1.45;
 let planned=route(o.x,o.y,true,reach);
 if(planned===null&&currentScene==='overworld'){
  // Long cross-kingdom routes use the established road bridges, keeping each
  // search within the navigation budget instead of silently stopping halfway.
  const anchors=[[126,105],[288,336],[576,336],[762,336]];
  const closest=(x,y)=>anchors.reduce((best,p,i)=>Math.hypot(p[0]-x,p[1]-y)<Math.hypot(anchors[best][0]-x,anchors[best][1]-y)?i:best,0);
  const a=closest(s.x,s.y),b=closest(o.x,o.y),waypoints=[];
  for(let i=a;;i+=a<=b?1:-1){const point=encounterSpawnPoint('overworld',...anchors[i],12);if(!point)return false;waypoints.push(point);if(i===b)break;}
  waypoints.push([o.x,o.y]);let x=s.x,y=s.y;planned=[];
  for(let i=0;i<waypoints.length;i++){const [tx,ty]=waypoints[i],leg=route(tx,ty,i===waypoints.length-1,reach,x,y);if(leg===null){planned=null;break;}planned.push(...leg);if(leg.length)[x,y]=leg.at(-1);}
 }
 if(planned===null){toast('The route is blocked. Open any nearby exit door, then follow the objective again.');return false;}
 stop();target=o;path=planned;elapsed=0;renderAction();if(!path.length)arrive();return true;
}
function renderMountainJournal(){
 pageControls(1,1);const q=mountainState(),step=MOUNTAIN_STEPS[q.stage],p=$('panel'),title=q.stage<11?'The King Beneath the Mountain':'The Borrowed King';
 p.innerHTML='<div class="questhead"><h2>'+title+'</h2><small>Arc One · The Awakening of Veyr</small></div><section class="mountain-current"><h3>'+step[0]+'</h3><p>'+step[1]+'</p></section><p class="desc">'+(q.stage<11?'Mining 8 · Smithing 8 · Magic 8 · Recommended Combat 15':'Magic 10 · Worship 8 · Any usable Spirit · Recommended Combat 18')+'</p>';
 const follow=document.createElement('button');follow.textContent=q.stage===12&&!q.inscription?'Read the shard’s record':'Follow current objective';follow.onclick=mountainGuide;follow.disabled=currentScene==='tutorial';p.appendChild(follow);
 const notes=document.createElement('details');notes.className='mountain-notes';const summary=document.createElement('summary');summary.textContent='Evidence and completed objectives';notes.appendChild(summary);
 const note=text=>{const item=document.createElement('p');item.textContent=text;notes.appendChild(item);};
 for(const key of q.clues)note(MOUNTAIN_CLUES[key][2]);
 if(q.stage>=3)note('Service-hatch inscription: Stone remembers. Iron carries. Breath awakens. This hatch is separate from the prison.');
 if(q.fieldOrders)note('Coded field orders coordinate the road, mine, shrine and Wardkeeper abductions. The group remains unidentified.');
 if(q.veyrNamed||q.stage>=8)note('Edda: Veyr has been imprisoned for generations. He copies trusted human voices and memories. Unknown agents deliberately seek to awaken him.');
 if(q.awakened)note('The masked operatives completed the final rite before we could stop them. They released Veyr. I did not.');
 if(q.inscription)note('The shard records Alaric’s earlier work repairing the prison. Seek him at Ironcrown’s library.');
 if(q.truths)for(const row of Object.values(MOUNTAIN_BINDINGS))note(row.memory);
 if(q.signalKnown)note('Our agreed signal: three steady ward lights. No true ally will ask me to lower the counter-ward. Spirits cannot be perfectly copied.');
 for(const key of q.bindings)note(MOUNTAIN_BINDINGS[key].name+': freed.');
 if(q.lastMemory)note('Enemy survey chart: Ironhollow was only one target. Several other prisons are marked. Identities, motives and the other prisoners remain unknown.');
 for(let i=0;i<q.stage;i++)note('✓ '+MOUNTAIN_STEPS[i][0]);p.appendChild(notes);
 const rewards=document.createElement('p');rewards.className='desc';rewards.textContent=q.stage<11?'Rewards: 600 coins; 600 Mining, Smithing and Magic XP; 300 Defence and Hitpoints XP; Wardkeeper Cape.':'Rewards: 1,000 coins; 750 XP in Attack, Strength, Defence, Hitpoints, Magic, Range and Worship; Veilbreaker Ring. Veyr’s Orb is separate boss loot: 1/250 per kill, including the story kill.';p.appendChild(rewards);
}
const mountainPanelBefore=renderPanel;
renderPanel=function(){
 if(tab!=='quests')return mountainPanelBefore();
 if(mountainJournal==='story')renderMountainJournal();else mountainPanelBefore();
 const nav=document.createElement('div');nav.className='mountain-journal-nav';
 for(const [id,name]of [['story','Mountain story'],['villages','Village quests']]){const b=document.createElement('button');b.textContent=name;b.setAttribute('aria-pressed',String(mountainJournal===id));b.onclick=()=>{mountainJournal=id;panelPage=0;renderPanel();};nav.appendChild(b);}$('panel').prepend(nav);
};
MAP_SERVICE_TYPES.quest=['quests','Story quests'];
const mountainMapBefore=mapObjectService;
mapObjectService=function(o){if(o.mountainKey&&!fighter(o))return {kind:'quest',tags:['quest'],detail:o.mountainKey==='huntsman'?'Huntsman crossings':o.characterSprite?'The King Beneath the Mountain':'Story evidence / objective'};return mountainMapBefore(o);};
const mountainPropBefore=prop3;
prop3=function(r,o,x,z){if(o.mountainModel)return lairModel(groundedPainter(r,x,z),o.mountainModel,x,0,z,1.25);return mountainPropBefore(r,o,x,z);};
