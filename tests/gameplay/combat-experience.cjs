const vm=require('vm'),assert=require('node:assert/strict');
const {ctx}=require('../../scripts/qa/game-fixture.cjs');ctx.assert=assert;
vm.runInContext(`{
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,a+' equals '+b);
function fresh(){s=defaults();s.character={name:'XP test'};s.tutorial=tutorialSteps.length;for(const skill of COMBAT_SKILLS)s.xp[skill]=0;time=10;floaters=[];target=null;spiritEffect=null;stoneWard=0;spiritRenewal=0;}
for(const [style,focus,expected]of [
 ['melee','accurate',{Attack:4}],['melee','aggressive',{Strength:4}],['melee','defensive',{Defense:4}],
 ['melee','balanced',{Attack:4/3,Strength:4/3,Defense:4/3}],['ranged','focused',{Ranged:4}],['ranged','defensive',{Ranged:2,Defense:2}],
 ['magic','focused',{Magic:2}],['magic','defensive',{Magic:4/3,Defense:1}],['worship','focused',{Worship:4}]
]){
 fresh();const enemy={hp:100,maxhp:100,dead:0,x:1,y:1};
 for(const damage of [1,3,7]){const before={...s.xp};resolveHit(enemy,damage,style,0,focus);for(const skill of COMBAT_SKILLS)near(s.xp[skill]-before[skill],damage*(style==='melee'?3:1)*(skill==='Hitpoints'?4/3:expected[skill]||0));}
 assert(floaters.some(f=>f.experience),'a damage hit has visible XP feedback');
 const before=JSON.stringify(s.xp);resolveHit(enemy,0,style,0,focus);assert.equal(JSON.stringify(s.xp),before,'misses grant no damage XP');
}
fresh();let defeats=0;awardDefeat=o=>{defeats++;o.dead=time+25;};const enemy={type:'enemy',hp:2,maxhp:2,dead:0,x:1,y:1};
resolveHit(enemy,999,'worship');near(s.xp.Worship,8);near(s.xp.Hitpoints,8/3);resolveHit(enemy,999,'worship');assert.equal(defeats,1);near(s.xp.Worship,8);
fresh();s.x=px=10;s.y=py=10;s.equipment.weapon='oakStaff';s.bag.runes=5;s.bag.airRunes=5;inAttackRange=()=>true;Math.random=()=>.999;playerAttackReadyAt=0;
const spell=currentSpell(),casterTarget={type:'enemy',hp:100,maxhp:100,dead:0,x:15,y:10,level:1};assert(performAttack(casterTarget));near(s.xp.Magic,spell.baseXP);const before=JSON.stringify(s.xp);time+=2;updateCombat(2);assert.equal(JSON.stringify(s.xp),before,'a splashed spell keeps only the legitimate base cast XP');
console.log('PASS: every combat/training style, damage scaling per hit, visible XP, misses, overkill, dead targets, repeat prevention and spell base XP.');
}`,ctx);
