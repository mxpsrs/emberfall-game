const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
for(const f of ['trading','world-options','item-use','tutorial-island','npc-dialogue','realm-story','lairs','encounters'])vm.runInContext(fs.readFileSync('client/'+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(`{
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
s.character={name:'Scaling'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.sceneId='overworld';setupExpandedWorld();setupSpirits();setupTutorialVillage();
const fighters=Object.values(worldScenes).flatMap(w=>w.objects).filter(o=>fighter(o)&&o.kind!=='dummy');assert(fighters.length>100);
for(const o of fighters){for(const key of ['level','maxhp','maxHit','attackLevel','defenseLevel'])assert(Number.isFinite(o[key])&&o[key]>0,o.name+' '+key);for(const style of ['melee','ranged','magic']){const p=playerAccuracy(o,style);assert(Number.isFinite(p)&&p>0&&p<1,o.name+' '+style);const incoming=enemyAccuracy(o,style);assert(Number.isFinite(incoming)&&incoming>0&&incoming<1);}}
const civilians=fighters.filter(o=>o.kind==='man');assert(civilians.length);assert(civilians.every(o=>o.level===1&&o.maxHit===1&&o.maxhp===10));
const savedStats=JSON.stringify(fighters.map(o=>[o.level,o.maxhp,o.maxHit,o.attackLevel,o.defenseLevel]));
const oldLv=lv;
// lv is a lexical constant; change XP through the game's XP table.
function train(level){for(const skill of COMBAT_SKILLS)s.xp[skill]=skillThreshold(skill,level);}
const enemy={level:40,attackLevel:28,defenseLevel:26,maxHit:7,weak:'magic'};
s.equipment={weapon:'bronze_weapon'};s.spirits={};train(1);const lowAcc=playerAccuracy(enemy),lowHit=playerMaxHit(),lowIncoming=enemyAccuracy(enemy);
train(60);assert(playerAccuracy(enemy)>lowAcc);assert(playerMaxHit()>lowHit);assert(enemyAccuracy(enemy)<lowIncoming);
const bareAcc=playerAccuracy(enemy),bareHit=playerMaxHit();s.equipment.weapon='dragonslayer_weapon';assert(playerAccuracy(enemy)>bareAcc);assert(playerMaxHit()>bareHit);
const noArmor=enemyAccuracy(enemy);for(const slot of ['head','body','legs','hands','feet','shield'])s.equipment[slot]='dragonslayer_'+slot;assert(enemyAccuracy(enemy)<noArmor);
s.equipment={weapon:'oakStaff',body:'mysticRobe'};assert(playerAccuracy(enemy,'magic')>playerAccuracy({...enemy,weak:'ranged'},'magic'));
train(1);const levelOneMagic=enemyAccuracy(enemy,'magic');train(60);assert(enemyAccuracy(enemy,'magic')<levelOneMagic);
s.equipment={weapon:'magicShortbow',ammo:'runeArrows'};s.equippedAmmoCount=2500;train(1);const rangedLow=playerMaxHit('ranged');train(60);assert(playerMaxHit('ranged')>rangedLow);
const bossRows=Object.values(HUNT_ENCOUNTERS).sort((a,b)=>a.level-b.level);for(let i=1;i<bossRows.length;i++){assert(bossRows[i].hp>bossRows[i-1].hp);assert(bossRows[i].maxHit>bossRows[i-1].maxHit);}
Math.random=()=>0;assert.equal(enemyDamage(enemy),0,'damage includes zero');let draws=0;Math.random=()=>draws++%2===0?0:.999999;assert.equal(enemyDamage(enemy),7,'armor affects accuracy, not advertised max hit');
assert.equal(JSON.stringify(fighters.map(o=>[o.level,o.maxhp,o.maxHit,o.attackLevel,o.defenseLevel])),savedStats,'enemy tiers never change with player level');
console.log('PASS: '+fighters.length+' world combatants, human baselines, three attack styles, levels/gear/armor, boss progression, misses and fixed enemy tiers.');
}`,ctx);
