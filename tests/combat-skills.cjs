const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};toast=()=>{};
const fresh=defaults();assert(!('Combat' in fresh.xp));for(const k of COMBAT_SKILLS)assert.equal(fresh.xp[k],0);
const old={xp:{Combat:140,Ranged:70,Magic:35,Mining:80},hp:42,character:{name:'Veteran'}};
s={...defaults(),...old,xp:{...defaults().xp,...old.xp}};migrateCombatSkills(s,old);
for(const k of ['Hitpoints','Attack','Strength','Defense'])assert.equal(s.xp[k],140);
assert.equal(s.xp.Ranged,70);assert.equal(s.xp.Mining,80);assert.equal(maxhp(),42);assert.equal(s.hp,42);
const once=JSON.stringify(s);migrateCombatSkills(s);assert.equal(JSON.stringify(s),once);
for(const skill of COMBAT_SKILLS){s=defaults();const before=combatLevel();s.xp[skill]=35*20**2;assert(combatLevel()>before,skill+' contributes to total combat');}
s=defaults();awardCombatDamage(3,'melee','accurate');assert.equal(s.xp.Attack,9);assert.equal(s.xp.Hitpoints,3);assert.equal(s.xp.Strength,0);assert.equal(s.xp.Defense,0);
s=defaults();awardCombatDamage(3,'melee','aggressive');assert.equal(s.xp.Strength,9);assert.equal(s.xp.Attack,0);
s=defaults();awardCombatDamage(3,'melee','defensive');assert.equal(s.xp.Defense,9);
s=defaults();awardCombatDamage(3,'melee','balanced');for(const k of ['Attack','Strength','Defense','Hitpoints'])assert.equal(s.xp[k],3);
for(const [style,skill]of [['magic','Magic'],['ranged','Ranged']]){s=defaults();awardCombatDamage(3,style,'defensive');assert.equal(s.xp[skill],6);assert.equal(s.xp.Defense,3);assert.equal(s.xp.Hitpoints,3);}
s=defaults();s.bag.bones=1;assert.equal(itemActions('bones',true)[0][0],'Bury');assert(buryBones());assert.equal(s.bag.bones,0);assert.equal(s.xp.Worship,18);assert(!buryBones());assert.equal(s.xp.Worship,18);
s=defaults();const dummy={level:1,hp:100,maxhp:100,dead:0,x:1,y:1};const accuracy=playerAccuracy(dummy),maxDamage=playerMaxHit(),enemyHit=enemyAccuracy(dummy),armor=armorValue(),hp=maxhp();
s.xp.Attack=3500;assert(playerAccuracy(dummy)>accuracy);s.xp.Strength=3500;assert(playerMaxHit()>maxDamage);s.xp.Defense=3500;assert(enemyAccuracy(dummy)<enemyHit);assert(armorValue()>armor);assert.equal(maxhp(),hp);
s=defaults();const beforeMiss=JSON.stringify(s.xp);resolveHit(dummy,0,'melee');assert.equal(JSON.stringify(s.xp),beforeMiss);
let defeated=0;awardDefeat=o=>{defeated++;o.dead=time+25;};dummy.hp=2;resolveHit(dummy,1000,'melee',0,'accurate');assert.equal(s.xp.Attack,6);assert.equal(s.xp.Hitpoints,2);resolveHit(dummy,1000,'melee');assert.equal(defeated,1);assert.equal(s.xp.Attack,6);
s=defaults();inAttackRange=()=>true;dummy.hp=100;dummy.dead=0;s.equipment.weapon='shortbow';s.rangedTraining='defensive';const arrows=s.bag.arrows;performAttack(dummy);assert.equal(s.bag.arrows,arrows-1);assert.equal(projectiles.at(-1).focus,'defensive');s.rangedTraining='focused';assert.equal(projectiles.at(-1).focus,'defensive');
renderCombatBar();assert($('trainingFocus').innerHTML.includes('Defensive'));
console.log('PASS: seven independent skills, legacy migration, all-skill combat level, training modes, accuracy/damage/defense effects, bone burial, miss/overkill XP and captured projectile training.');
`,ctx);
