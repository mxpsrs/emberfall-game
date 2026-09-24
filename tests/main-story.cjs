const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
vm.runInContext(fs.readFileSync(__dirname+'/../dist/tutorial-journal.js','utf8'),ctx);
vm.runInContext(`
let seed=51138;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
s.character={name:'Story tester',look:0};s.tutorial=39;s.tutorialVersion=6;s.tutorialReward=true;assetsReady=true;s.runEnabled=false;
for(const k of ['Mining','Smithing','Magic'])s.xp[k]=skillThreshold(k,5);
for(const k of ['Attack','Strength','Defense','Ranged','Hitpoints'])s.xp[k]=skillThreshold(k,20);
s.hp=maxhp();s.gear.shortbow=1;s.bag.arrows=400;equipItem('shortbow');equipItem('arrows');activateScene('overworld',42,92);
let now=0;function tick(){now+=50;frame(now);}
function until(test,label,max=40000){for(let i=0;i<max;i++){if(test())return;tick();}throw new Error('Timeout '+label+' stage '+mainStoryState().stage+' pos '+px+','+py+' path '+path.length+' target '+target?.name+' miners '+JSON.stringify(['bera','oren'].map(k=>{const o=mainStoryObject(k);return [k,o.x,o.y,o.drawX,o.drawY,route(Math.round(px),Math.round(py),true,1.8,o.x,o.y,o)?.length];})));}
function press(label){if(npcDialogueState){const choice=npcDialogueState.choices.find(([l])=>l===label);assert(choice,'NPC choice '+label);choice[1]();return;}const b=$('modalBody').children.find(b=>b.textContent===label&&b.onclick);assert(b,'dialog choice '+label);b.onclick();}
function objective(){close();assert(mainStoryGuide()!==false,'guide found path');until(()=>{if($('modal').open)return true;if(!path.length&&!target)mainStoryGuide();return false;},'objective');}
function stage(n){assert.equal(mainStoryState().stage,n);console.log('Stage '+n+' reached');}
function reload(){s=JSON.parse(JSON.stringify(s));normalizeJourney(s,s);syncMainStoryWorld();}
function work(label,n){objective();press(label);assert(mainStoryWork);until(()=>!mainStoryWork,label);stage(n);reload();}
assert(!worldScenes.tutorial.objects.some(o=>o.mainStoryKey));assert.equal(performAttack(mainStoryObject('lookout')),false);assert.equal(performAttack(mainStoryObject('shade')),false);assert.equal(mountainAdvance(0,null),false);
assert(questJournalRows('main-1')[0].text.includes('Orders of the Dead'));assert(questJournalRows('main-2')[0].text.includes('The Last Shift'));assert(questJournalRows('mountain-1')[0].text.includes('Whispers at Hollow Shrine'));
objective();press('Investigate the courier attack.');stage(1);objective();press('Record Tovin’s testimony.');stage(2);
for(let i=0;i<4;i++){objective();press('Record the evidence.');reload();}stage(3);
objective();press('Check west.');stage(3);press('Follow the matching eastbound tracks.');stage(4);
mainStoryGuide();until(()=>{if(s.hp<8)s.hp=maxhp();return mainStoryState().stage===5;},'lookout combat');stage(5);
objective();press('Take the forged orders.');stage(6);assert(mainStoryState().dispatch);reload();
objective();stage(6);const attackXP=s.xp.Attack,bagBefore=s.bag,bankCoins=s.bank.coins||0;s.bank.forgedOrders=s.bag.forgedOrders;delete s.bag.forgedOrders;s.bag={logs:25};
const finishWatch=npcDialogueState.choices.find(([label])=>label==='The false orders cleared a route to Ironhollow.')[1];finishWatch();stage(7);assert.equal(s.xp.Attack,attackXP+250);finishWatch();assert.equal(s.xp.Attack,attackXP+250);assert(mainStoryState().reward1);assert.equal(s.bank.coins,bankCoins+200);s.bag=bagBefore;reload();
objective();const mining=s.xp.Mining;s.xp.Mining=0;close();mainStoryInteract(mainStoryObject('hesta'));assert.equal(npcDialogueState.choices.length,0);stage(7);s.xp.Mining=mining;close();mainStoryInteract(mainStoryObject('hesta'));press('Enter the rescue workings.');stage(8);
objective();press('Follow the alternate rescue route.');stage(9);work('Clear the maintenance passage.',10);
objective();press('Salvage the iron tie.');assert(mainStoryWork);stop();assert(!mainStoryWork);stage(10);
work('Salvage the iron tie.',11);work('Forge the locking pin and refuge brace.',12);
objective();press('Seat the counterweight and open the ramp.');stage(12);press('Install the pin and secure the brake.');assert(mainStoryWork);until(()=>!mainStoryWork,'pin brake');stage(13);reload();objective();press('Record the excavation and shrine route.');stage(13);assert(mainStoryState().excavation);objective();press('Seat the counterweight and open the ramp.');until(()=>!mainStoryWork,'counterweight');stage(14);
objective();press('Brace the refuge and help Bera out.');stage(15);reload();objective();press('Lead both workers to Hesta.');stage(16);
assert.equal(mainStoryState().rescued.length,0);mainStoryGuide();until(()=>{if($('modal').open)close();if(!path.length&&!target&&mainStoryState().stage===16)mainStoryGuide();return mainStoryState().stage===17;},'escort both miners');stage(17);assert.equal(mainStoryState().rescued.length,2);reload();
objective();const beforeMining=s.xp.Mining,finishRescue=npcDialogueState.choices.find(([label])=>label==='Complete The Last Shift.')[1];finishRescue();stage(18);finishRescue();assert.equal(s.xp.Mining,beforeMining+400);assert(mainStoryState().testimony);reload();
objective();const magic=s.xp.Magic;s.xp.Magic=0;close();mainStoryInteract(mainStoryObject('ilyra'));assert.equal(npcDialogueState.choices.length,0);s.xp.Magic=magic;close();mainStoryInteract(mainStoryObject('ilyra'));press('Explore Hollow Shrine.');stage(19);
for(let i=0;i<3;i++){objective();press('Record this memory and its evidence.');reload();}stage(20);
objective();press('Every voice in the shrine must be true.');stage(20);press('Bera could not speak before the bell; that memory was altered.');stage(21);
objective();press('Hand');stage(21);assert.equal(mainStoryState().runes,0);press('Bell');reload();objective();assert.equal(mainStoryState().runes,1);press('Lantern');press('Hand');stage(22);
mainStoryGuide();until(()=>target?.mainStoryKey==='shade'&&!path.length,'reach shade');s.hp=1;applyEnemyHit(mainStoryObject('shade'),5);stage(22);assert.equal(mainStoryState().stones.length,3);close();reload();s.hp=maxhp();
mainStoryGuide();until(()=>{if(s.hp<8)s.hp=maxhp();if(!path.length&&!target)mainStoryGuide();return mainStoryState().stage===23;},'shade retry');stage(23);
work('Stabilize and take the Memory Shard.',24);assert(mainStoryState().memoryShard);
objective();const beforeMagic=s.xp.Magic,finishEcho=npcDialogueState.choices.find(([label])=>label==='Complete Whispers at Hollow Shrine.')[1];finishEcho();stage(25);finishEcho();assert.equal(s.xp.Magic,beforeMagic+500);assert(mainStoryComplete());reload();
assert(questJournalEntries().filter(q=>q.id.startsWith('main-')).every(q=>q.complete));for(let i=0;i<3;i++)assert(questJournalRows('main-'+i).every(row=>row.done));
for(const k of ['Mining','Smithing','Magic'])s.xp[k]=skillThreshold(k,8);objective();assert.equal(npcDialogueState.speaker.name,'Archivist Maerin');press('Hand over the shard and investigate.');assert.equal(mountainState().stage,1);
for(const [id,name]of Object.entries({runes:'Mind',airRunes:'Air',waterRunes:'Water',earthRunes:'Earth',fireRunes:'Fire',chaosRunes:'Fracture',deathRunes:'Memory',bloodRunes:'Heart'}))assert.equal(ITEMS[id].name,name+' relic');
for(const slot of ['head','body','hands','legs','feet','shield'])assert(ITEMS['rune_'+slot].name.startsWith('Eldrite '));
assert.deepEqual(SPELLS.spark.ingredients,{airRunes:1,runes:1},'existing relic IDs keep recipes compatible');
console.log('PASS: three ordered quests, real routes and combat, wrong answers, skill gates, interrupted work, both miners escorted, death/retry, durable rewards, journal, relic names and mountain unlock.');
`,ctx);
const saved=JSON.parse(vm.runInContext('JSON.stringify(s)',ctx));
for(const stage of [2,13,16,21,22,25]){
 delete require.cache[require.resolve('../scripts/game-fixture.cjs')];const fresh=require('../scripts/game-fixture.cjs');
 const restored={...saved,mainStoryQuest:{...saved.mainStoryQuest,stage,rescued:stage===16?['bera']:stage>16?['bera','oren']:[],positions:{oren:[803,157]}},mountainQuest:{stage:0}};
 fresh.vm.runInContext('s='+JSON.stringify(restored)+';normalizeJourney(s,s);draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assert.equal(mainStoryState().stage,'+stage+');assert.equal(Object.values(worldScenes).flatMap(w=>w.objects).filter(o=>o.mainStoryKey).length,24);',fresh.ctx);
}
vm.runInContext('s.mainStoryQuest={stage:0};s.mountainQuest={stage:6};assert(mountainCanEnter("quest_underiron"));assert(mountainAdvance(6,null));assert.equal(mountainState().stage,7);',ctx);
console.log('PASS: fresh-runtime recovery and existing mountain progress remain available.');
