const fs=require('fs');
const bootstrap=fs.readFileSync('tests/gameplay/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../../client/'","const root=process.cwd()+'/client/'");
eval(bootstrap+`\nvm.runInContext(\`
renderUI=()=>{};renderTutorial=()=>{};save=()=>{};
currentScene='tutorial';
function at(event){s.tutorial=tutorialSteps.findIndex(t=>t.event===event);s.tutorialCompleted=[];s.tutorialActions={};}
function fresh(){s=defaults();s.character={name:'Guided apprentice'};s.gear={};s.bag={};s.bank={};s.equipment={};s.tutorialGifts={};s.tutorialReward=false;}
assert(TUTORS.guide.text.includes('My name is Rowan'),'chapter text preserves Rowan introduction');
let classicSpellPage='field';
fresh();at('magic');tab='spells';$('gameDock').hidden=false;
for(const page of ['field','supplies','teleports']){classicSpellPage=page;assert.equal(tutorialGuidanceAction().selector,'[data-spell-page="combat"]','guide exposes the combat page before the spell');}
classicSpellPage='combat';assert.equal(tutorialGuidanceAction().selector,'[data-spell-id="spark"]');
fresh();at('talk-magic');
talkTutor({tutor:'magic',name:'Arcanist Elowen'});
assert.equal(tutorialStep().event,'talk-magic');assert.deepEqual(npcDialogueState.choices.map(c=>c[0]),['Continue'],'original dialogue remains, without rune-selection choices');npcDialogueState.choices[0][1]();assert.equal(tutorialStep().event,'magic');
assert.equal(s.gear.oakStaff,1);assert.equal(s.bag.airRunes,30);assert.equal(s.bag.runes,20);
talkTutor({tutor:'magic',name:'Arcanist Elowen'});
assert.equal(s.gear.oakStaff,1);assert.equal(s.bag.airRunes,30,'talking again does not duplicate supplies');
at('magic');s.bag.airRunes=0;settleTutorialHandoffs();assert.equal(s.bag.airRunes,30,'practice runes refill without another conversation');
fresh();at('talk-magic');s.bag.logs=BAG_SIZE;
talkTutor({tutor:'magic',name:'Arcanist Elowen'});assert(s.tutorialMagicPending);assert.equal(tutorialStep().event,'talk-magic');
s.bag.logs-=3;settleTutorialHandoffs();assert.equal(tutorialStep().event,'magic');assert.equal(s.gear.oakStaff,1);assert(inventorySlots().length<=BAG_SIZE,'queued gift cannot overflow the bag');
fresh();close();at('training-kit');settleTutorialHandoffs();assert.equal(tutorialStep().event,'training-kit');assert(npcDialogueState);npcDialogueState.choices[0][1]();assert.equal(tutorialStep().event,'training-gear');assert.equal(s.gear.woodenSword,1);assert.equal(s.gear.woodenShield,1);
settleTutorialHandoffs();assert.equal(s.gear.woodenSword,1);
$('gameDock').hidden=true;assert.equal(tutorialGuidanceAction().selector,'#gameTabs [data-tab="bag"]');
$('gameDock').hidden=false;tab='bag';assert(tutorialGuidanceAction().selector.includes('woodenSword'));
s.equipment.weapon='woodenSword';assert(tutorialGuidanceAction().selector.includes('woodenShield'),'one equipment item at a time');
at('ranged-kit');showValeLesson();assert.equal(tutorialStep().event,'ranged-kit');npcDialogueState.choices[0][1]();assert.equal(tutorialStep().event,'ranged-gear');assert.equal(s.bag.arrows,60);
assert(tutorialGuidanceAction().selector.includes('shortbow'));s.equipment.weapon='shortbow';assert(tutorialGuidanceAction().selector.includes('arrows'));
at('ore');assert(tutorialGuidanceAction().instruction.includes('copper'));s.bag.copperOre=1;assert(tutorialGuidanceAction().instruction.includes('tin'));
at('smelt');selectedUseItem=null;assert(tutorialGuidanceAction().selector.includes('copperOre'));selectedUseItem='copperOre';assert(tutorialGuidanceAction().instruction.includes('furnace'));
window.realmWorkbench={kind:'furnace',metal:'iron'};assert(tutorialGuidanceAction().selector.includes('data-metal'));window.realmWorkbench.metal='bronze';assert(tutorialGuidanceAction().selector.includes('bronzeBar'));window.realmWorkbench=null;
at('mix-dough');selectedUseItem=null;assert(tutorialGuidanceAction().selector.includes('flour'));selectedUseItem='flour';assert(tutorialGuidanceAction().selector.includes('jugWater'));
at('smith');delete s.gear.bronze_dagger;tutorialEvent('smith');assert.equal(tutorialStep().event,'smith','other forged items do not finish the dagger lesson');
// Transfers, early close and reconnect preserve one banking lesson.
fresh();at('deposit');s.bag.logs=2;s.bag.bones=1;s.bank.bones=2;openBank();
assert(transferBank('logs'));assert.equal(tutorialStep().event,'withdraw');assert.equal(s.tutorialBankItem,'logs');
assert(transferBank('bones',true));assert.equal(s.tutorialBankPhase,'withdraw','withdrawing another item cannot skip the selected item');
close();assert.equal(tutorialStep().event,'withdraw');openBank();assert(transferBank('logs',true));assert.equal(s.tutorialBankPhase,'quantity');
close();assert.equal(tutorialStep().event,'withdraw','closing before quantity acknowledgement does not finish');
s=JSON.parse(JSON.stringify(s));normalizeJourney(s,s);openBank();assert.equal(s.tutorialBankPhase,'quantity','reload resumes without repeating the transfer');
assert(tutorialGuidanceAction().instruction.includes('1, 5, 10 or All'));tutorialBankQuantity();assert.equal(s.tutorialBankPhase,'close');
assert.equal(tutorialStep().event,'withdraw','quantity selection alone does not finish banking');close();assert.equal(tutorialStep().event,'talk-worship');assert.equal(s.tutorialBankPhase,'done');
const bankXP=JSON.stringify(s.xp);openBank();close();assert.equal(tutorialStep().event,'talk-worship');assert.equal(JSON.stringify(s.xp),bankXP);
close();at('talk-worship');talkTutor({tutor:'worship',name:'Keeper Sera'});assert(npcDialogueState.pages.join(' ').includes('Higher Worship'));assert(npcDialogueState.pages.join(' ').includes('30 seconds'));close();
const marks=new Set(),controlTarget={classList:{add:x=>marks.add(x),remove:x=>marks.delete(x)},focus:()=>{}};
document.querySelector=()=>controlTarget;at('skills');renderTutorialGuidance();assert(marks.has('tutorial-next-control'));
s.tutorial=tutorialSteps.length;renderTutorialGuidance();assert(!marks.has('tutorial-next-control'),'highlight clears when tutorial ends');
at('skills');s.tutorialCompleted=['camera','walk','talk-guide','bag'];const history=questJournalRows('tutorial');assert.equal(history.length,5);assert(history.slice(0,-1).every(row=>row.done));assert.equal(history.at(-1).done,false);assert(history.at(-1).text.includes('Skills'));assert(!history.some(row=>row.text.includes('Elowen')),'future instructions stay hidden');assert(questJournalEntries().some(q=>q.id==='village-1'));
console.log('PASS: automatic and queued supplies, no rune menu, idempotent kits, sequential UI targets, recipe guard and highlight cleanup.');
\`,ctx);`);
