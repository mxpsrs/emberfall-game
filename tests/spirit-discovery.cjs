const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
renderUI=renderAction=renderTutorial=save=draw=drawPortrait=playSpiritBondSound=()=>{};
for(const node of [document.body])node.style.setProperty=()=>{};
const create=document.createElement;document.createElement=(...args)=>{const e=create(...args);e.style.setProperty=()=>{};return e;};
setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;s.character={name:'Spirit tester'};
let now=1000000;Date.now=()=>now;
const random=Math.random;
for(const w of Object.values(worldScenes))assert(!w.objects.some(o=>o.type==='spirit'),'no world spirit models');
assert.equal(typeof drawGuardian,'undefined');assert.equal(Object.keys(SPIRITS).length,8);
const originals=JSON.stringify({gold:s.gold,bag:s.bag,xp:s.xp});
s.spirits={brook:{state:'set',recovery:0},cairn:{state:'standby',recovery:0}};setupSpirits();assert(s.spirits.brook&&s.spirits.cairn);assert.equal(spiritRemaining('cairn'),0);assert.equal(s.spirits.cairn.state,'set');assert.equal(JSON.stringify({gold:s.gold,bag:s.bag,xp:s.xp}),originals);
for(const choice of FIRST_SPIRITS){
 s.spirits={};s.tutorial=tutorialSteps.findIndex(t=>t.event==='spirit');s.tutorialCompleted=[];s.tutorialActions={};currentScene='tutorial';const tutor=tutorialTutor('worship');s.x=px=tutor.x;s.y=py=tutor.y+1;
 assert(chooseFirstSpirit(choice),'all four tutor options work');assert(s.spirits[choice]);assert.equal(s.firstSpirit,choice);assert.equal(tutorialStep().event,'talk-finish');assert(!chooseFirstSpirit(FIRST_SPIRITS.find(x=>x!==choice)),'no second free choice');assert.equal(spiritBondEffect.id,choice);
}
s.spirits={};Math.random=()=>0;assert.equal(discoverSkillSpirit('Fishing'),null,'no discovery before tutor choice');
s.spirits={cinder:{state:'set'}};s.xp.Fishing=0;Math.random=()=>.9;assert.equal(discoverSkillSpirit('Fishing'),null);s.xp.Fishing=SKILL_XP[10];assert.equal(discoverSkillSpirit('Fishing'),'brook','level ten guarantees first water on a successful action');
s.xp.Fishing=SKILL_XP[11];assert.equal(discoverSkillSpirit('Fishing'),null,'rare twin has no pity even at higher skill');Math.random=()=>0;assert.equal(discoverSkillSpirit('Fishing'),'rill');assert.equal(discoverSkillSpirit('Fishing'),null,'never duplicate an owned spirit');
for(const [skill,id]of Object.entries(SPIRIT_SKILLS)){s.spirits={ [id==='cinder'?'brook':'cinder']:{state:'set'} };s.xp[skill]=SKILL_XP[10];assert.equal(discoverSkillSpirit(skill),id);const twin=Object.keys(SPIRITS).find(k=>SPIRITS[k].twin===id);assert.equal(discoverSkillSpirit(skill),null,'twins wait until level eleven');s.xp[skill]=SKILL_XP[11];Math.random=()=>.99;assert.equal(discoverSkillSpirit(skill),null);Math.random=()=>0;assert.equal(discoverSkillSpirit(skill),twin);}
s.spirits={cinder:{state:'set'}};s.xp.Fishing=0;gain('Fishing',SKILL_XP[15]);assert(!s.spirits.brook,'quest XP cannot roll a discovery');
// Simultaneous abilities retain combat target, path and normal attack clock.
s.spirits=Object.fromEntries(Object.keys(SPIRITS).map(id=>[id,{state:'set',recovery:0}]));s.xp.Hitpoints=SKILL_XP[50];s.hp=20;s.runEnergy=10;currentScene='overworld';s.x=px=42;s.y=py=51;lineOfSight=()=>true;
const enemy={id:900000,type:'enemy',kind:'rat',x:43,y:51,hp:500,maxhp:500,dead:0};objects.push(enemy);target=enemy;path=[[42,52]];playerAttackReadyAt=80;const hits=[];resolveHit=(...args)=>hits.push(args);playerAccuracy=()=>1;Math.random=()=>.5;
assert(unleashSpirit('cinder'));assert(unleashSpirit('pyre'));assert(unleashSpirit('gale'));assert(!unleashSpirit('cinder'));assert.equal(target,enemy);assert.equal(path.length,1);assert.equal(playerAttackReadyAt,80);assert.equal(hits.length,0,'damage waits for visual release');assert.equal(spiritRemaining('cinder'),30);assert.equal(spiritRemaining('pyre'),45);
updateSpirits(2);assert(hits.length>=2,'both damage casts commit');assert.equal(s.runEnergy,45);const hitCount=hits.length;updateSpirits(2);assert.equal(hits.length,hitCount,'no duplicate impacts');assert.equal(target,enemy);assert.equal(playerAttackReadyAt,80);
s=JSON.parse(JSON.stringify(s));now+=30000;assert.equal(spiritRemaining('cinder'),0);assert.equal(spiritRemaining('pyre'),15);assert.equal(s.spirits.cinder.state,'set');now+=15000;assert.equal(spiritRemaining('pyre'),0);
assert(unleashSpirit('brook'));updateSpirits(2);assert.equal(s.hp,40);assert(unleashSpirit('rill'));updateSpirits(1);for(let i=0;i<13;i++)updateSpirits(1);assert.equal(s.hp,maxhp(),'renewal respects max health');
assert(unleashSpirit('cairn'));updateSpirits(1);assert(stoneWard>0);assert(unleashSpirit('flint'));updateSpirits(1);assert(hits.some(h=>h[3]===6),'earth twin distinct slow');
Math.random=random;
console.log('PASS: four first choices, eight spirits, all skill discovery routes, level-10 guarantees, rare-only twins, no quest XP drops, retained saves, independent 30/45-second cooldowns, concurrent timed abilities and uninterrupted combat.');
`,ctx);
