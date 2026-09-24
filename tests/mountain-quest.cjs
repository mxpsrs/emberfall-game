const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
let randomSeed=76151;Math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
s.mainStoryQuest={stage:25};s.character={name:'Quest tester',look:0};s.tutorial=39;s.tutorialVersion=6;s.tutorialReward=true;assetsReady=true;s.runEnabled=false;
for(const k of ['Mining','Smithing','Magic'])s.xp[k]=skillThreshold(k,10);
for(const k of ['Attack','Strength','Defense','Ranged','Hitpoints'])s.xp[k]=skillThreshold(k,20);
s.xp.Worship=skillThreshold('Worship',8);s.spirits={brook:{state:'set'}};s.hp=maxhp();s.gear.shortbow=1;s.bag.arrows=200;equipItem('shortbow');equipItem('arrows');
activateScene('overworld',42,92);assert(!worldScenes.tutorial.objects.some(o=>o.mountainKey));
assert.equal(beginHuntsmanTeleport('veyr'),false);assert.equal(activateScene('lair_veyr'),false);
assert.equal(activateScene('quest_underiron'),false);
let now=0;function tick(){now+=50;frame(now);}
function until(test,label,max=40000){for(let i=0;i<max;i++){if(test())return;tick();}throw new Error('Timeout '+label+' scene '+currentScene+' pos '+s.x+','+s.y+' stage '+mountainState().stage+' target '+target?.name+' path '+path.length);}
function press(label){if(npcDialogueState){const choice=npcDialogueState.choices.find(([l])=>l===label);assert(choice,'NPC choice '+label);choice[1]();return;}const b=$('modalBody').children.find(b=>b.textContent===label&&b.onclick);assert(b,'dialog choice '+label);b.onclick();}
function objective(){assert(!$('modal').open);const scene=currentScene;mountainGuide();assert(currentScene!==scene||path.length||target||pendingWalkInDoor||playerAction||$('modal').open,'objective must route '+mountainState().stage);until(()=>{if($('modal').open)return true;if(!path.length&&!target&&!pendingWalkInDoor)mountainGuide();return false;},'objective '+mountainState().stage);}
function stage(n){assert.equal(mountainState().stage,n);console.log('Mountain stage '+n);}
function reload(){s=JSON.parse(JSON.stringify(s));normalizeJourney(s,s);syncMountainWorld();}
// Long-distance mainland routing to the quest giver; each objective uses actual pathing.
objective();press('Hand over the shard and investigate.');stage(1);
for(let i=0;i<3;i++){objective();press('Record the evidence.');reload();}stage(2);
objective();press('Warn the remaining families.');stage(3);
objective();const mining=s.xp.Mining;s.xp.Mining=0;press('Recover the bearing.');assert(!mountainWork);stage(3);s.xp.Mining=mining;press('Recover the bearing.');assert(mountainWork);stop();stage(3);assert(!mountainWork,'moving cancels incomplete work');
objective();press('Recover the bearing.');until(()=>!mountainWork,'mine bearing');stage(4);
objective();press('Reforge the bearing.');until(()=>!mountainWork,'forge bearing');stage(5);
objective();press('Breath');stage(5);press('Stone');press('Iron');press('Breath');stage(6);
// Follow guide enters the dungeon, then approaches its guardian through normal combat.
objective();press('Copy the field orders.');assert(mountainState().fieldOrders);mountainGuide();
until(()=>{if(s.hp<8)s.hp=maxhp();return mountainState().stage===7;},'watcher fight');stage(7);
objective();press('Protect the survivors and reach the final seal.');stage(8);
objective();press('Restore the ventilation.');until(()=>!mountainWork,'restore vent');stage(9);
mountainGuide();until(()=>!!arcAwakening,'reach final seal');assert.equal(mountainState().stage,9);until(()=>mountainState().stage===10,'villains finish the rite');assert(mountainState().awakened);stage(10);assert(mountainState().memory);reload();
objective();press('Complete The King Beneath the Mountain.');stage(11);assert(mountainState().reward1);const partOneXP=s.xp.Mining;mountainReward(1);assert.equal(s.xp.Mining,partOneXP,'rewards cannot repeat');
objective();press('Begin The Borrowed King.');stage(12);objective();press('Copy the record for Alaric.');assert(mountainState().inscription);reload();
objective();assert.equal(npcDialogueState.speaker.name,'Master Alaric');assert(npcDialogueState.pages.some(p=>p.includes('I believed him')));assert(npcDialogueState.pages.some(p=>p.includes('Living people')));press('Prepare the counter-ward together.');stage(13);assert(mountainState().lairKey);
// Do not consume partial ingredients, even after a cancelled attempt.
objective();const startBars=s.bag.ironBar||0;press('Bind the counter-ward.');stage(13);assert(!mountainWork);assert.equal(s.bag.ironBar||0,startBars);
s.bag.ironBar=2;s.bag.airRunes=6;s.bag.runes=6;press('Bind the counter-ward.');stop();assert.equal(s.bag.ironBar,2);
objective();press('Bind the counter-ward.');until(()=>!mountainWork,'counter-ward');stage(14);assert.equal(s.bag.ironBar,0);assert.equal(s.bag.airRunes,0);assert.equal(s.bag.runes,0);reload();
objective();press('Enter the Sanctum together.');stage(15);assert.equal(mountainObject('expert').scene,'lair_veyr');assert.equal(mountainObject('edda').scene,'overworld');
mountainGuide();until(()=>currentScene==='lair_veyr','enter Sanctum');
const boss=objects.find(o=>o.encounter==='veyr');assert.equal(performAttack(boss),false,'boss cannot bypass captive objectives');
for(const key of Object.keys(MOUNTAIN_BINDINGS)){objective();press(MOUNTAIN_BINDINGS[key].wrong);stage(15);objective();press(MOUNTAIN_BINDINGS[key].answer);reload();}
stage(16);objective();press('Anchor the counter-ward and face Veyr.');stage(17);
mountainGuide();until(()=>!!activeEncounter,'start assisted Veyr');assert(mountainAssisted(boss));assert.equal(beginHuntsmanTeleport('varkesh'),false,'no escaping active combat with a hunt teleport');
// Force a first-attempt defeat to exercise real death/rescue and retry persistence.
s.hp=1;applyEnemyHit(boss,5);assert.equal(currentScene,'overworld');stage(17);assert.equal(mountainState().bindings.length,3);assert(!mountainUnlocked());close();reload();
mountainGuide();until(()=>currentScene==='lair_veyr','retry Sanctum');mountainGuide();until(()=>!!activeEncounter,'retry fight');assert(mountainAssisted(boss));
const hp=s.hp;applyEnemyHit(boss,4);assert.equal(s.hp,hp-2,'Alaric halves incoming damage');
const f=activeEncounter;f.companionHealAt=time;f.companionPulseAt=time;f.companionInterruptAt=time;f.hazards.push({due:time+5,key:'hex'});const enemyHP=boss.hp;updateEncounterAI(.05);assert.equal(boss.hp,enemyHP-2);assert(s.hp>=hp-2);assert.equal(f.hazards.length,0);
until(()=>mountainState().stage===18,'assisted Veyr victory',30000);assert(!mountainUnlocked());assert(!mountainAssisted(boss));reload();
objective();press('Preserve the enemy survey chart.');stage(19);objective();press('Complete The Borrowed King.');stage(20);assert(mountainState().reward2);reload();
const rewardXP=s.xp.Magic;mountainReward(2);assert.equal(s.xp.Magic,rewardXP);
// Teleport animation uses the original casting/arrival sequence, with red geometry.
stop();time+=9;assert(beginHuntsmanTeleport('veyr'));assert.equal(tutorialCrossing.kind,'hunt');assert.equal(tutorialCrossing.colors[0],'#ff5555');assert(!beginHuntsmanTeleport('veyr'),'double click cannot start two crossings');const origin=currentScene;
for(let i=0;i<30;i++)tick();assert.equal(currentScene,origin,'casting remains visible before travel');until(()=>!tutorialCrossing,'Huntsman animation');assert.equal(currentScene,'lair_veyr');assert.equal(s.tutorial,tutorialSteps.length);assert.equal(boss.hp,boss.maxhp);assert.equal(boss.dead,0);
engage(boss);until(()=>!!activeEncounter,'repeat Veyr');assert(!mountainAssisted(boss),'repeat hunts have no story assistance');assert(!activeEncounter.companionWard);
const normalHP=s.hp;applyEnemyHit(boss,4);assert.equal(s.hp,normalHP-4,'normal damage restored');stop();resetEncounter();
// Story progress and existing village stories coexist in the journal.
tab='quests';mountainJournal='story';renderPanel();assert($('panel').children.length);mountainJournal='villages';renderPanel();assert.equal(s.quest,0);assert.equal(s.frontier.quest,0);
console.log('PASS: both story chapters through real routes, castle doors, clue collection, inscription, puzzles, interrupted crafting, actual guardian and assisted Veyr battles, death/retry, durable rewards, and red repeat-hunt crossing without assistance.');
`,ctx);
// A new runtime rebuilds the correct quest scene and companion from the save.
const resumeBootstrap="delete require.cache[require.resolve('../scripts/game-fixture.cjs')];const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');";
const resumeState=JSON.parse(vm.runInContext('JSON.stringify(s)',ctx));
for(const [stage,scene] of [[6,'quest_underiron'],[17,'lair_veyr'],[20,'lair_veyr']]){
 const restored={...resumeState,sceneId:scene,x:22,y:44,mountainQuest:{version:1,stage,lairKey:stage>=17,ward:stage>=17,clues:['ledger','tools','summons'],bindings:stage>=17?['child','miner','keeper']:[]}};
 const setup="s="+JSON.stringify(restored)+";normalizeJourney(s,s);draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assert.equal(currentScene,"+JSON.stringify(scene)+");assert.equal(mountainState().stage,"+stage+");assert.equal(mountainObject('expert').scene,"+JSON.stringify(stage===17?'lair_veyr':'overworld')+");assert.equal(objects.filter(o=>o.mountainKey==='watcher').length,"+(stage===6?1:0)+");";
 eval(resumeBootstrap+"\nvm.runInContext("+JSON.stringify(setup)+",ctx);");
}
console.log('PASS: fresh-runtime reload restores Underworks progress, assisted-fight companion and completed-hunt access.');
