const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(\`
renderUI=()=>{};renderTutorial=()=>{};save=()=>{};
currentScene='tutorial';
function at(event){s.tutorial=tutorialSteps.findIndex(t=>t.event===event);s.tutorialCompleted=[];s.tutorialActions={};}
function fresh(){s=defaults();s.character={name:'Guided apprentice'};s.gear={};s.bag={};s.bank={};s.equipment={};s.tutorialGifts={};s.tutorialReward=false;}
fresh();at('talk-magic');
talkTutor({tutor:'magic',name:'Arcanist Elowen'});
assert.equal(tutorialStep().event,'bag');assert.equal(npcDialogueState,null,'no rune menu or confirmation');
assert.equal(s.gear.oakStaff,1);assert.equal(s.bag.airRunes,30);assert.equal(s.bag.runes,20);
talkTutor({tutor:'magic',name:'Arcanist Elowen'});
assert.equal(s.gear.oakStaff,1);assert.equal(s.bag.airRunes,30,'talking again does not duplicate supplies');
at('magic');s.bag.airRunes=0;settleTutorialHandoffs();assert.equal(s.bag.airRunes,30,'practice runes refill without another conversation');
fresh();at('talk-magic');s.bag.logs=BAG_SIZE;
talkTutor({tutor:'magic',name:'Arcanist Elowen'});assert(s.tutorialMagicPending);assert.equal(tutorialStep().event,'talk-magic');
s.bag.logs-=3;settleTutorialHandoffs();assert.equal(tutorialStep().event,'bag');assert.equal(s.gear.oakStaff,1);assert(inventorySlots().length<=BAG_SIZE,'queued gift cannot overflow the bag');
fresh();at('training-kit');settleTutorialHandoffs();assert.equal(tutorialStep().event,'training-gear');assert.equal(s.gear.woodenSword,1);assert.equal(s.gear.woodenShield,1);
settleTutorialHandoffs();assert.equal(s.gear.woodenSword,1);
$('gameDock').hidden=true;assert.equal(tutorialGuidanceAction().selector,'#gameTabs [data-tab="bag"]');
$('gameDock').hidden=false;tab='bag';assert(tutorialGuidanceAction().selector.includes('woodenSword'));
s.equipment.weapon='woodenSword';assert(tutorialGuidanceAction().selector.includes('woodenShield'),'one equipment item at a time');
at('ranged-kit');settleTutorialHandoffs();assert.equal(tutorialStep().event,'ranged-gear');assert.equal(s.bag.arrows,60);
assert(tutorialGuidanceAction().selector.includes('shortbow'));s.equipment.weapon='shortbow';assert(tutorialGuidanceAction().selector.includes('arrows'));
at('ore');assert(tutorialGuidanceAction().instruction.includes('copper'));s.bag.copperOre=1;assert(tutorialGuidanceAction().instruction.includes('tin'));
at('smelt');selectedUseItem=null;assert(tutorialGuidanceAction().selector.includes('copperOre'));selectedUseItem='copperOre';assert(tutorialGuidanceAction().instruction.includes('furnace'));
window.realmWorkbench={kind:'furnace',metal:'iron'};assert(tutorialGuidanceAction().selector.includes('data-metal'));window.realmWorkbench.metal='bronze';assert(tutorialGuidanceAction().selector.includes('bronzeBar'));window.realmWorkbench=null;
at('mix-dough');selectedUseItem=null;assert(tutorialGuidanceAction().selector.includes('flour'));selectedUseItem='flour';assert(tutorialGuidanceAction().selector.includes('jugWater'));
at('smith');delete s.gear.bronze_dagger;tutorialEvent('smith');assert.equal(tutorialStep().event,'smith','other forged items do not finish the dagger lesson');
const marks=new Set(),controlTarget={classList:{add:x=>marks.add(x),remove:x=>marks.delete(x)},focus:()=>{}};
document.querySelector=()=>controlTarget;at('skills');renderTutorialGuidance();assert(marks.has('tutorial-next-control'));
s.tutorial=tutorialSteps.length;renderTutorialGuidance();assert(!marks.has('tutorial-next-control'),'highlight clears when tutorial ends');
console.log('PASS: automatic and queued supplies, no rune menu, idempotent kits, sequential UI targets, recipe guard and highlight cleanup.');
\`,ctx);`);
