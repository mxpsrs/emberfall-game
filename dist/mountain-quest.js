'use strict';
// The King Beneath the Mountain: two persistent, one-time story chapters.
// Evidence and bound quest tools live in the journal, never in droppable inventory.
const MOUNTAIN_STEPS=[
 ['The names below','Speak to Archivist Maerin in Ironhollow.','maerin'],
 ['Three empty homes','Examine the abandoned shift ledger, miner’s tools and royal summons around Ironhollow.','clues'],
 ['A pattern in the names','Bring the three pieces of evidence to Maerin.','maerin'],
 ['Stone remembers','Recover a bearing from the collapsed workings outside Ironhollow. Requires Mining 5.','bearing'],
 ['Iron carries','Reforge the recovered bearing at the ward workbench. Requires Smithing 5.','workbench'],
 ['Breath awakens','Install the bearing and solve the three-rune seal at the Underworks entrance.','seal'],
 ['The last watch','Enter the Sealed Underworks and defeat the Oathbound Watcher guarding the survivors.','watcher'],
 ['A name still living','Reach Warden Edda in the Underworks and hear what happened.','edda'],
 ['Open the way home','Restore the ventilation wheel so Edda can lead the trapped miners out.','vent'],
 ['The borrowed voice','Recover the memory from the royal recording stone.','memory'],
 ['Part One: the witness returns','Bring the memory and Edda’s testimony to Maerin in Ironhollow.','maerin'],
 ['A voice that is not his','Speak to Maerin to begin Part Two.','maerin'],
 ['The inscription in the glass','Investigate the fragment in your journal, then take its inscription to Master Alaric in Ironcrown Citadel’s library.','expert'],
 ['A ward of your own','At Ironhollow’s ward workbench, bind 2 iron bars, 6 air runes and 6 mind runes. Requires Smithing 5 and Magic 5.','workbench'],
 ['The adventurer who returned','Meet Master Alaric in the castle library. Prepare together for the Sanctum.','expert'],
 ['Unbind the captives','Enter the Shattered Sanctum. Free all three captive minds by answering them with the truths in your journal.','bindings'],
 ['Before the Mindbreaker','Speak to Alaric inside the Sanctum. He will hold your ward while you fight.','expert'],
 ['Break Veyr’s hold','Defeat Veyr the Mindbreaker with Alaric’s protection. Bring food, watch the ground and keep attacking.','veyr'],
 ['What he was listening to','Examine the fractured memory left inside the Sanctum.','aftermath'],
 ['Part Two: names returned','Bring the truth back to Maerin in Ironhollow.','maerin'],
 ['The mountain still answers','Both chapters complete. Veyr can be challenged again through Huntsman Rook.','huntsman']
];
const MOUNTAIN_CLUES={
 ledger:['Abandoned shift ledger','The same three families have maintained the lower ward for generations. Their latest shifts have been crossed out in a different hand.','The missing people inherited duties at the ward.'],
 tools:['Miner’s abandoned tools','A pickaxe lies beside an unfinished repair. A child has scratched a warning into its handle: “Father heard Grandmother calling. Grandmother is buried.”','The voice imitates someone each victim trusts.'],
 summons:['Royal summons','The seal is genuine, but the signature repeats the same tiny crack on every sheet. The last order bears your name and tomorrow’s date.','The orders copy an old impression; they are not newly signed.']
};
const MOUNTAIN_BINDINGS={
 child:{name:'The child’s binding',question:'A small voice repeats, “He said he was my father. He knew my name. Why would I not follow?”',answer:'Knowing your name does not make him your father.',wrong:'You should have obeyed the king.',memory:'Alaric: a stolen name proves nothing about its speaker.'},
 miner:{name:'The miner’s binding',question:'“I left the wheel turning. If I stop working, everyone below me dies. Tell me I can rest.”',answer:'The ventilation is restored. Your watch is over.',wrong:'Keep turning the wheel. We still need you.',memory:'Edda: the ventilation wheel is turning and the miners have escaped.'},
 keeper:{name:'The keeper’s binding',question:'“My king ordered me to guard this place. If the voice is his, I must obey.”',answer:'An oath protects people, not a borrowed voice.',wrong:'An oath must be obeyed, whoever suffers.',memory:'Maerin: the purpose of the oath was to protect living people.'}
};
function mountainState(){
 let q=s.mountainQuest;if(!q||typeof q!=='object'||Array.isArray(q))q=s.mountainQuest={};
 q.version=1;q.stage=Number.isInteger(q.stage)?Math.max(0,Math.min(20,q.stage)):0;
 q.clues=Array.isArray(q.clues)?[...new Set(q.clues.filter(k=>MOUNTAIN_CLUES[k]))]:[];
 q.bindings=Array.isArray(q.bindings)?[...new Set(q.bindings.filter(k=>MOUNTAIN_BINDINGS[k]))]:[];
 return q;
}
function mountainUnlocked(){return mountainState().stage>=18;}
let mountainReady=false,mountainSerial=6100000,mountainWork=null,mountainJournal='story';
CREATURE_LAIRS.quest_underiron={title:'The Sealed Underworks',subtitle:'Ironhollow · The King Beneath the Mountain',quest:true,theme:'arcane',size:[44,48],entry:[22,44],arena:[22,19],entrance:[766,156],floor:'#454b50',trim:'#9c9382',glow:'#9bcbd4',fog:[.12,.15,.17],ambient:[.85,.95,1.02],light:[.08,.14,.2],rooms:[['rect',18,30,9,16],['rect',7,23,30,12],['rect',9,6,26,19]]};
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
 const o=found.o;worldScenes[found.scene].objects=worldScenes[found.scene].objects.filter(p=>p!==o);
 const point=destination==='overworld'?[mountainLibraryHome.x,mountainLibraryHome.y]:encounterSpawnPoint(destination,22,37,10);
 if(!point)throw new Error('No safe position for Alaric');Object.assign(o,{x:point[0],y:point[1],homeX:point[0],homeY:point[1],drawX:point[0],drawY:point[1]});
 if(destination==='overworld')o.interiorBuilding=mountainLibraryHome.building;else delete o.interiorBuilding;
 worldScenes[destination].objects.push(o);
}
function mountainInspectFragment(){
 const q=mountainState();if(q.stage!==12||!q.memory)return;
 dialog('The inscription in the glass','<p>Turned against the light, the memory fragment reveals writing beneath its surface:</p><p><i>“Within the broken oath, the listener waits. Return the witness to the threshold.”</i></p><p>The letters circle a key-shaped cut in the glass. This was fashioned deliberately; it is more than a recording.</p>',[['Copy the strange inscription.',()=>{if(mountainState().stage!==12)return;q.inscription=true;save();close();toast('Take the inscription to Master Alaric in Ironcrown Citadel’s library.');}]]);
}
function mountainExpertReveal(o){
 const q=mountainState();if(!q.inscription)return mountainSay(o,['Maerin’s letter mentions writing inside the glass. Examine the fragment in your quest journal and copy every word. An incomplete inscription can be dangerous.'],[['Investigate the fragment.',mountainInspectFragment]]);
 return mountainOffer(o,12,[
  'Where did you find this? No—let me read it. “Within the broken oath…” I cut those words into the glass myself. This is a key to Veyr’s lair, the Shattered Sanctum. It was never merely a memory stone.',
  'Before I kept this library, I was an adventurer. My companions and I tried to seal Veyr away. I mistook his silence for surrender. When I closed the binding, he spoke with my friend’s voice. I broke the seal to let her out. It was him.',
  'I escaped with half the key. I entrusted it to Ironcrown’s ward-keepers, who hid it inside their recording stone. I thought its memories would bury the path. Instead Veyr followed those memories back to them. The missing families are paying for my failure.',
  'I will assist you this time. Forge a counter-ward at Ironhollow’s workbench: two iron bars, six air runes and six mind runes. Smithing 5 and Magic 5. Bring it back to me; together we can wake the key without answering his voice.',
  'Three truths will free the captive minds. Knowing a name does not prove who is speaking. The miners’ duty ends when their people are safe. An oath protects people, not a borrowed voice. I forgot that last truth once. I will not forget it again.'
 ],'Let us finish what you started.',()=>{mountainAdvance(12,o,{truths:true,lairKey:true});close();});
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
 mountainPlace('overworld','seal','Three-rune royal seal',entrance[0]+2,entrance[1]+1,{mountainModel:'World_BookStand'});
 const guard=mountainPlace('quest_underiron','watcher','Oathbound Watcher',22,31,{type:'enemy',kind:'mountainwatcher',sprite:species.skeleton.sprite});
 applyEnemyTier(guard,{...ENEMY_TIERS.skeleton,look:'skeleton',name:'Oathbound Watcher',hp:32,level:12,maxHit:3,weak:'magic'});
 mountainNPC('quest_underiron','edda','Warden Edda',12,27);
 mountainPlace('quest_underiron','vent','Ventilation wheel',31,27,{mountainModel:'World_Workbench'});
 mountainPlace('quest_underiron','memory','Royal recording stone',22,10,{mountainModel:'World_BookStand'});
 mountainNPC('quest_underiron','survivor','Trapped miner Dorrin',12,29);
 for(const [key,x,y]of [['child',9,30],['miner',35,31],['keeper',15,11]])mountainPlace('lair_veyr','binding_'+key,MOUNTAIN_BINDINGS[key].name,x,y,{mountainModel:'World_BookStand'});
 mountainPlace('lair_veyr','aftermath','Fractured memory',27,11,{mountainModel:'World_BookStand'});
 syncMountainWorld();
 if(!mountainCanEnter(currentScene)){const point=CREATURE_LAIRS[currentScene]?.returnPoint;if(point)activateScene('overworld',...point,false);}
}
function syncMountainWorld(){
 if(!mountainReady)return;const q=mountainState(),found=mountainObject('edda');
 const destination=q.stage>=10?'overworld':'quest_underiron';
 if(found&&found.scene!==destination){
  worldScenes[found.scene].objects=worldScenes[found.scene].objects.filter(o=>o!==found.o);
  const maerin=mountainObject('maerin').o,at=destination==='overworld'?[maerin.x+3,maerin.y+2]:destination==='lair_veyr'?[22,37]:[12,27];
  const point=encounterSpawnPoint(destination,...at,12);if(!point)throw new Error('No safe position for Edda');
  Object.assign(found.o,{x:point[0],y:point[1],drawX:point[0],drawY:point[1],homeX:point[0],homeY:point[1]});worldScenes[destination].objects.push(found.o);
 }
 syncMountainExpert();
 const watcher=mountainObject('watcher')?.o;if(watcher&&q.stage>=7){watcher.hp=0;watcher.dead=Infinity;watcher.collected=true;}
 const survivor=mountainObject('survivor')?.o;if(survivor)survivor.name=q.stage>=9?'Dorrin · Safe passage opened':'Trapped miner Dorrin';
 realmNavigation.clear();mapServicesCache=null;objects.splice(0,objects.length,...worldScenes[currentScene].objects);
}
const mountainSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){mountainSetupBefore();setupMountainQuest();};
function mountainNear(o){return !!o&&objects.includes(o)&&currentScene!=='tutorial'&&Math.hypot(px-o.x,py-o.y)<=2&&lineOfSight(px,py,o.x,o.y);}
function mountainAdvance(expected,o,change={}){
 const q=mountainState();if(q.stage!==expected||o&&!mountainNear(o))return false;
 Object.assign(q,change,{stage:expected+1});syncMountainWorld();save();renderUI();toast('Quest updated: '+MOUNTAIN_STEPS[q.stage][0]);return true;
}
function mountainSay(o,pages,choices=[],topic){openNpcDialogue(o,pages,choices,topic||'The King Beneath the Mountain');}
function mountainOffer(o,expected,pages,label,action){mountainSay(o,pages,[[label,()=>{if(mountainState().stage!==expected||!mountainNear(o))return;action();}],['I need more time.',close]]);}
function mountainReward(part){
 const q=mountainState(),key='reward'+part;if(q[key])return;q[key]=true;
 const rewards=part===1?{Mining:250,Smithing:250}:{Magic:400,Defense:300};
 receiveCoins(part===1?200:350);for(const [skill,n]of Object.entries(rewards))gain(skill,n,true);
 showExperienceDrop(rewards);save();toast('Part '+part+' complete · '+(part===1?'200 coins · 250 Mining and Smithing XP':'350 coins · 400 Magic XP · 300 Defense XP · Veyr hunts unlocked'));playGameSound('quest');
}
function mountainTalk(o){
 const q=mountainState(),key=o.mountainKey;
 if(key==='huntsman')return openHuntsman(o);
 if(key==='maerin'){
  if(q.stage===0)return mountainOffer(o,0,[
   'Thirteen nights. Thirteen names spoken from shafts we sealed before my grandfather was born. By sunrise, each person named is gone. The court calls it desertion. I have read the names. They include a child.',
   'King Thargrim has closed the lower workings. His guards will not listen to another petition. I need evidence they cannot dismiss: the shift ledger, the tools left outside the eastern homes, and the summons posted north of the square.',
   'If you investigate, do not answer anything that calls from below—even if it knows you. Recommended Combat 20 for this story. You will need Mining 5, Smithing 5 and, in Part Two, Magic 5.'
  ],'Investigate the disappearances.',()=>{mountainAdvance(0,o);close();});
  if(q.stage===2){
   const pages=['The ward-keepers’ descendants. Of course. These families inherited the right to enter the lower chamber. Someone is collecting its keys—and the keys are people.',
    'Your summons is impossible. The stamp was made long before you arrived in Veldren. Something has added your name to an old command. That is no lawful order.',
    'The emergency passage uses an older mechanism: stone remembers, iron carries, breath awakens. Recover its bearing from the collapsed workings, reshape it at our ward workbench, then wake the entrance seal. Should I warn the families publicly, or move them quietly?'];
   return mountainSay(o,pages,[['Warn the families. They deserve the truth.',()=>{if(mountainAdvance(2,o,{choice:'warn'}))close();}],['Move the families quietly; keep the names sealed.',()=>{if(mountainAdvance(2,o,{choice:'shelter'}))close();}]]);
  }
  if(q.stage===10)return mountainOffer(o,10,[
   'Edda is alive. So are the people the court had already written off. I will enter their testimony into the public record before anyone can seal it away.',
   q.choice==='warn'?'Your warning reached the families. They refused the next summons together. The square was full of witnesses; the guards could not pretend not to see.':'We moved the families into the archive after dusk. None answered last night’s summons. Their names will stay under seal until the danger passes.',
   'In this memory, the king’s voice continues after the recording stone breaks. Another voice laughs behind it. Strange writing lies beneath the fracture, too fine to read without a closer look. You have proved the disappearances can be stopped. Now we must find the speaker.'
  ],'Complete Part One.',()=>{if(mountainAdvance(10,o)){mountainReward(1);close();}});
  if(q.stage===11)return mountainOffer(o,11,[
   'The fragment still speaks when no one touches it. There is an inscription beneath its cracked surface. Examine it closely before taking it to Master Alaric, the expert in Ironcrown Citadel’s library.',
   'Edda will stay beside the archive while she recovers. Alaric has spent years collecting records of failed sealings. If anyone recognizes the writing, it will be him.',
   'The oath beneath Ironcrown was meant to protect living people. Remember that if the voice demands obedience. A dead king has no right to spend another life.'
  ],'Begin Part Two.',()=>{mountainAdvance(11,o);close();});
  if(q.stage===19)return mountainOffer(o,19,[
   'The voices stopped before dawn. The missing have begun to return, frightened and exhausted, but speaking with their own voices. Alaric sent word of what you did inside the Sanctum.',
   'Veyr stole the ward-keepers’ memories to reach the binding beneath Ironcrown. He could imitate its keeper, but he could not enter the deepest chamber. That is why your name appeared: someone from beyond Veldren might pass where he could not.',
   'His last memory shows three bindings beneath three kingdoms. One line repeats: “I did not wake him. I heard him wake.” Veyr is beaten. Whatever answered beneath the mountain remains there.',
   'For now, the families are safe. Huntsman Rook can reopen a path to the Sanctum whenever you choose to hunt Veyr’s returning echo. Alaric’s ward was spent freeing the captives; those hunts will be yours to win.'
  ],'Complete Part Two.',()=>{if(mountainAdvance(19,o)){mountainReward(2);close();}});
  return mountainSay(o,[q.stage===20?'The archive holds every rescued name. We have not forgotten what is beneath Ironcrown. For now, the lower passages stay sealed and the families live.':MOUNTAIN_STEPS[q.stage][1]]);
 }
 if(key==='edda'||key==='expert'){
  if(key==='expert'&&q.stage===12)return mountainExpertReveal(o);
  if(key==='edda'&&q.stage===7)return mountainOffer(o,7,[
   'Do not say my name loudly. That thing learned it from the duty roll. It called in my mother’s voice. I knew she was dead. I followed anyway.',
   'I was the lower ward’s keeper. The Watcher turned on us when the voice changed its orders. Dorrin got the children into a side shaft, but the air is failing.',
   'Restore the ventilation wheel across this chamber. I will lead them through the emergency passage. Afterward, take the recording stone from the northern chamber. It heard both voices.'
  ],'I will open the escape route.',()=>{mountainAdvance(7,o);close();});
  if(key==='expert'&&q.stage===14)return mountainOffer(o,14,[
   'The inscription has awakened. This fragment is the key I broke when my first sealing failed. Your counter-ward will let us carry it without surrendering our minds.',
   'I will hold the counter-ward while you fight. I can blunt his attacks and break some eruptions, but I cannot make you invincible. Bring food. A bow gives you room to move; Veyr is vulnerable to ranged attacks.',
   'Before we face him, free the three captive minds inside the Shattered Sanctum near the Hollow Ruins. Answer with what we learned, not with the commands he has made them repeat. I will meet you just inside the entrance.'
  ],'Meet me in the Sanctum.',()=>{mountainAdvance(14,o);close();});
  if(key==='expert'&&q.stage===16)return mountainOffer(o,16,[
   'Three voices, finally quiet. The ward is taking hold. When he draws an eruption beneath your feet, move. I will break one when I can, but the binding needs time to recover.',
   'I will keep your mind anchored and mend your wounds while you press the attack. I cannot strike the final blow for you. If we have to retreat, come back; the people you freed stay free.',
   'Last time I entered without a counter-ward. I left my companions behind when the seal broke. I cannot undo that. This time, I stand with you until it is finished.'
  ],'Stand with me, Alaric.',()=>{mountainAdvance(16,o);close();});
  if(key==='expert')return mountainSay(o,[q.stage===20?'The failed sealing is no longer the last page of my story. Thank you for standing with me. The fragment remains your key; Rook can open a crossing to Veyr’s returning echo.':q.stage>=18?'We did it. I heard my own thoughts when he fell. Take the fractured memory from the north side of the Sanctum to Maerin. It may tell us why he wanted you.':q.stage===17?'The ward is ready. Stay near the fight so I can reach you. Watch the marked ground and eat when you need to.':q.stage>=13?MOUNTAIN_STEPS[q.stage][1]:'I catalogue accounts of failed bindings. Some of those accounts are my own. If you find an inscription from a broken seal, bring it to me.']);
  return mountainSay(o,[q.stage>=10?'The families are safe, and Maerin has my testimony. Thank you for coming back for us.':q.stage>=9?'The ventilation is turning. Dorrin can lead the others out. I will tell Maerin what happened here.':'The others are alive. Defeat the Watcher and come close; it listens when we speak.']);
 }
 if(key==='survivor')return mountainSay(o,[q.stage>=9?'Fresh air. I never thought I would be grateful for a draft. The children are already heading up the passage Edda marked.':q.choice==='warn'?'Your warning reached us. We were packing when the voice came. Help Edda open the ventilation; we can get the children out.':'Edda has kept us together. We have been breathing through wet cloths. Please get the wheel turning again.']);
}
function mountainWorkStart(o,stage,skill,level,label,finish,requirements={}){
 if(mountainState().stage!==stage||!mountainNear(o))return false;
 if(lv(skill)<level){toast('Requires '+skill+' '+level+'.');return false;}
 if(skill==='Mining'&&!useBeltTool('pickaxe'))return false;
 if(Object.entries(requirements).some(([id,n])=>(s.bag[id]||0)<n)){toast('Bring 2 iron bars, 6 air runes and 6 mind runes in your bag.');return false;}
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
 const before=job.age;job.age+=dt;$('activity').style.width=Math.min(100,job.age/3.2*100)+'%';
 if(Math.floor(before/.8)!==Math.floor(job.age/.8))playGameSound(job.skill==='Magic'?'magic':job.skill==='Mining'?'mine':'smith',job.o.x,job.o.y);
 if(job.age<3.2)return;mountainWork=null;
 if(lv(job.skill)<job.level||Object.entries(job.requirements).some(([id,n])=>(s.bag[id]||0)<n))return;
 for(const [id,n]of Object.entries(job.requirements))s.bag[id]-=n;
 job.finish();renderAction();renderUI();save();
}
const mountainActionBefore=renderAction;
renderAction=function(){mountainActionBefore();if(mountainWork){$('targetTitle').textContent=mountainWork.label;$('targetSub').textContent='Working… Move to cancel.';}};
function mountainSeal(o,index=0){
 if(mountainState().stage!==5||!mountainNear(o))return;
 const order=['Stone','Iron','Breath'];
 dialog('The three-rune seal','<p>“Stone remembers. Iron carries. Breath awakens.”</p><p>The repaired bearing fits. Touch the runes in the order of the inscription.</p><p>'+index+' / 3 runes awakened.</p>',
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
 dialog(row.name,'<p>'+row.question+'</p>',[[row.wrong,()=>reply(false)],[row.answer,()=>reply(true)],['Step away.',close]]);
}
function mountainInteract(o){
 if(!mountainNear(o))return;
 const q=mountainState(),key=o.mountainKey;stop();
 if(o.characterSprite)return mountainTalk(o);
 if(MOUNTAIN_CLUES[key]){
  const row=MOUNTAIN_CLUES[key];dialog(row[0],'<p>'+row[1]+'</p>',q.stage===1&&!q.clues.includes(key)?[['Record the evidence.',()=>{if(q.stage!==1||!mountainNear(o)||q.clues.includes(key))return;q.clues.push(key);if(q.clues.length===3)mountainAdvance(1,o);save();close();}]]:[]);return;
 }
 if(key==='bearing'&&q.stage===3)return dialog(o.name,'<p>An iron bearing is trapped beneath loose stone. Recover it with your pickaxe. Mining 5 required. This quest component is kept in your journal.</p>',[['Recover the bearing.',()=>mountainWorkStart(o,3,'Mining',5,'Recovering the ward bearing',()=>mountainAdvance(3,o))]]);
 if(key==='workbench'){
  if(q.stage===4)return dialog(o.name,'<p>The recovered bearing is bent. Use the workbench to reshape it and repair the royal passage. Smithing 5 required.</p>',[['Reforge the bearing.',()=>mountainWorkStart(o,4,'Smithing',5,'Reforging the ward bearing',()=>mountainAdvance(4,o))]]);
  if(q.stage===13)return dialog(o.name,'<p>Bind a counter-ward from <b>2 iron bars, 6 air runes and 6 mind runes</b>. Requires Smithing 5 and Magic 5. Alaric can sustain this ward during your first Veyr battle.</p>',[['Bind the counter-ward.',()=>{if(lv('Smithing')<5){toast('Requires Smithing 5.');return;}mountainWorkStart(o,13,'Magic',5,'Binding the counter-ward',()=>mountainAdvance(13,o,{ward:true}),{ironBar:2,airRunes:6,runes:6});}]]);
 }
 if(key==='seal'&&q.stage===5)return mountainSeal(o);
 if(key==='vent'&&q.stage===8)return dialog(o.name,'<p>The return chain has slipped. Seat it in the guide, then turn the wheel toward the open passage. Edda waits until there is enough air to move the survivors.</p>',[['Restore the ventilation.',()=>mountainWorkStart(o,8,'Smithing',1,'Restoring the escape route',()=>mountainAdvance(8,o,{rescued:true}))]]);
 if(key==='memory'&&q.stage===9)return dialog(o.name,'<p>The stone repeats a royal address. It cracks; the address continues. Behind it, another voice whispers: “Again. I almost have him.”</p><p>A glimpse of a broken observatory flashes through the glass. The memory loosens from the stone.</p>',[['Recover the memory fragment.',()=>{if(mountainAdvance(9,o,{memory:true}))close();}]]);
 if(key?.startsWith('binding_'))return mountainBinding(o,key.slice(8));
 if(key==='aftermath'&&q.stage===18)return dialog(o.name,'<p>Veyr kneels before an unseen presence. Three circles burn beneath a mountain, a forest and a crown city.</p><p>“The outsider can cross the binding. I only need the right voice.”</p><p>The presence answers with a heartbeat that shakes the glass. Veyr recoils: “I did not wake him. I heard him wake.”</p>',[['Preserve the final memory.',()=>{if(mountainAdvance(18,o,{lastMemory:true}))close();}]]);
 dialog(o.name,'<p>'+MOUNTAIN_STEPS[q.stage][1]+'</p>');
}
const mountainInteractionBefore=handleWorldInteraction;
handleWorldInteraction=function(o){if(o.mountainKey&&!fighter(o)){mountainInteract(o);return true;}return mountainInteractionBefore(o);};
// Block both the physical doorway and direct scene changes until their story gate.
function mountainCanEnter(id){const q=mountainState();return id==='quest_underiron'?q.stage>=6:id==='lair_veyr'?q.stage>=15&&!!q.lairKey:true;}
const mountainSceneBefore=activateScene;
activateScene=function(id,...args){
 if(mountainReady&&!mountainCanEnter(id)){toast(id==='lair_veyr'?'Prepare with Alaric during Part Two before entering the Sanctum.':'Restore the royal seal during Part One first.');stop();return false;}
 return mountainSceneBefore(id,...args);
};
function mountainCanFight(o){const q=mountainState();return o.mountainKey==='watcher'?q.stage===6:o.encounter==='veyr'?q.stage>=17:true;}
const mountainAttackBefore=performAttack,mountainBeginBefore=beginEncounter;
performAttack=function(o){if(!mountainCanFight(o)){stop();toast(o.encounter==='veyr'?'Free the three captive minds and speak to Alaric before confronting Veyr.':'This enemy belongs to the sealed passage investigation.');return false;}return mountainAttackBefore(o);};
beginEncounter=function(o){if(!mountainCanFight(o))return;const previous=activeEncounter;mountainBeginBefore(o);if(activeEncounter&&activeEncounter!==previous&&o.encounter==='veyr'&&mountainState().stage===17){activeEncounter.companionWard=true;activeEncounter.companionHealAt=time+5;activeEncounter.companionPulseAt=time+3;activeEncounter.companionInterruptAt=time+7;toast('Alaric: I have the ward. Keep moving—I am with you!');}};
function mountainAssisted(o){return mountainState().stage===17&&currentScene==='lair_veyr'&&o?.encounter==='veyr'&&activeEncounter?.o===o&&activeEncounter.companionWard;}
const mountainHitBefore=applyEnemyHit;
applyEnemyHit=function(o,hit){if(mountainAssisted(o)&&hit>0){hit=Math.max(1,Math.ceil(hit*.5));floating('Alaric’s ward',px,py,'#a4e0e7');}return mountainHitBefore(o,hit);};
const mountainAIBefore=updateEncounterAI;
updateEncounterAI=function(dt){
 const f=activeEncounter;
 if(f&&mountainAssisted(f.o)){
  const companion=mountainObject('expert')?.o;
  if(companion){
   if(f.companionInterruptAt<=time&&f.hazards.length){f.hazards.shift();f.companionInterruptAt=time+10;companion._castAt=time;companion._castDuration=1.2;floating('Eruption broken',f.o.x,f.o.y,'#a4e0e7');}
   if(f.companionHealAt<=time){s.hp=Math.min(maxhp(),s.hp+3);renderUI();f.companionHealAt=time+6;companion._castAt=time;companion._castDuration=1.2;floating('+3 · Alaric',px,py,'#a4e0e7');}
   // Companion damage gives no player XP and cannot land the finishing blow.
   if(f.companionPulseAt<=time){f.o.hp=Math.max(1,f.o.hp-2);f.companionPulseAt=time+4;companion._castAt=time;companion._castDuration=1.2;floating('−2 · Alaric',f.o.x,f.o.y,'#a4e0e7');}
  }
 }
 mountainAIBefore(dt);mountainTickWork(dt);
};
const mountainDefeatBefore=awardDefeat;
awardDefeat=function(o,style){
 const q=mountainState(),watcher=o.mountainKey==='watcher'&&q.stage===6,veyr=o.encounter==='veyr'&&mountainAssisted(o);
 mountainDefeatBefore(o,style);
 if(watcher)mountainAdvance(6,null);
 if(veyr){mountainAdvance(17,null,{veyrDefeated:true});toast('Veyr’s hold is broken. Huntsman Rook can now open repeat hunts. Recover the fractured memory before leaving.');}
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
 if(q.stage<18)choices.push(['The King Beneath the Mountain',()=>{close();openGamePanel('quests');}]);
 for(const [kind,e]of Object.entries(HUNT_ENCOUNTERS))if(encounterReleased(kind)&&(kind!=='veyr'||mountainUnlocked()))choices.push(['Teleport: '+e.name,()=>beginHuntsmanTeleport(kind,o)]);
 mountainSay(o,[q.stage<18?'Maerin in Ironhollow is looking for someone who can investigate the voices beneath the mountain. Veyr’s trail remains sealed until you face him with Alaric. My other hunting paths are open.':'Alaric told me what happened in the Sanctum. The captive minds are free, but Veyr’s echo gathers there again. I can send you to its entrance whenever you are ready. These hunts will not have Alaric’s protection.','My crossings burn red. They take you to the entrance, where you can prepare before approaching your quarry.'],choices,'Huntsman crossings');
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
 const lair=CREATURE_LAIRS[crossing.destination],boss=worldScenes[crossing.destination].objects.find(o=>o.encounter);
 // An explicit new hunt starts a fresh encounter, including after a previous clear.
 if(boss){boss.hp=boss.maxhp;boss.dead=0;boss.respawnAt=0;delete boss._recovering;delete boss._returning;}
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
 const q=mountainState();let key=MOUNTAIN_STEPS[q.stage][2];
 if(key==='clues')key=Object.keys(MOUNTAIN_CLUES).find(k=>!q.clues.includes(k));
 if(key==='bindings')key='binding_'+Object.keys(MOUNTAIN_BINDINGS).find(k=>!q.bindings.includes(k));
 let found=key==='veyr'?{scene:'lair_veyr',o:worldScenes.lair_veyr.objects.find(o=>o.encounter==='veyr')}:mountainObject(key);
 if(!found)return;
 if(currentScene==='tutorial'){toast('Finish the apprenticeship to begin this mainland story.');return;}
 if(currentScene!==found.scene){
  if(currentScene!=='overworld'){const before=currentScene;leaveInterior();if(currentScene!==before)return mountainGuide();return;}
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
 pageControls(1,1);const q=mountainState(),step=MOUNTAIN_STEPS[q.stage],p=$('panel');
 p.innerHTML='<div class="questhead"><h2>The King Beneath the Mountain</h2><small>Main story · '+(q.stage===20?'Complete':q.stage<=10?'Part One · The Names Below':'Part Two · A Voice That Is Not His')+'</small></div><section class="mountain-current"><h3>'+step[0]+'</h3><p>'+step[1]+'</p></section><p class="desc">Recommended Combat 20 · Mining 5 · Smithing 5 · Magic 5</p>';
 const follow=document.createElement('button');follow.textContent=q.stage===12&&!q.inscription?'Investigate the fragment':'Follow current objective';follow.onclick=mountainGuide;follow.disabled=currentScene==='tutorial';p.appendChild(follow);
 const notes=document.createElement('details');notes.className='mountain-notes';const summary=document.createElement('summary');summary.textContent='Evidence, quest tools and completed objectives';notes.appendChild(summary);
 const note=text=>{const item=document.createElement('p');item.textContent=text;notes.appendChild(item);};
 for(const key of q.clues)note(MOUNTAIN_CLUES[key][2]);
 if(q.stage>=3)note('Seal inscription: Stone remembers. Iron carries. Breath awakens.');
 if(q.stage>=4&&q.stage<=5)note(q.stage===4?'Quest tool: recovered ward bearing.':'Quest tool: repaired ward bearing.');
 if(q.memory)note('Memory fragment: a second voice speaks behind the king’s recording.');
 if(q.inscription)note('Inscription: “Within the broken oath, the listener waits. Return the witness to the threshold.”');
 if(q.lairKey)note('Alaric identified the fragment as his broken key to Veyr’s lair. He failed to seal Veyr away and has agreed to help you.');
 if(q.truths)for(const row of Object.values(MOUNTAIN_BINDINGS))note(row.memory);
 if(q.ward)note(q.stage<18?'Quest tool: counter-ward, ready for Alaric.':'The counter-ward was spent freeing the captive minds.');
 for(const key of q.bindings)note(MOUNTAIN_BINDINGS[key].name+': freed.');
 if(q.lastMemory)note('Veyr: “I did not wake him. I heard him wake.” Three bindings lie beneath Veldren’s kingdoms.');
 for(let i=0;i<q.stage;i++)note('✓ '+MOUNTAIN_STEPS[i][0]);p.appendChild(notes);
 const rewards=document.createElement('p');rewards.className='desc';rewards.textContent='Part One: 200 coins, 250 Mining XP, 250 Smithing XP. Part Two: 350 coins, 400 Magic XP, 300 Defense XP. Assisted Veyr victory unlocks repeat Huntsman crossings.';p.appendChild(rewards);
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
