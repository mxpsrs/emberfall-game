const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};toast=()=>{};
const fresh=defaults();assert(!('Combat' in fresh.xp));for(const k of COMBAT_SKILLS)assert.equal(fresh.xp[k],k==='Hitpoints'?1154:0);
const old={xp:{Combat:140,Ranged:70,Magic:35,Mining:80},hp:42,character:{name:'Veteran'}};
s={...defaults(),...old,xp:{...defaults().xp,...old.xp}};migrateCombatSkills(s,old);
for(const k of ['Hitpoints','Attack','Strength','Defense'])assert.equal(s.xp[k],140);
assert.equal(s.xp.Ranged,70);assert.equal(s.xp.Mining,80);assert.equal(maxhp(),2);normalizeSkillProgression(s,old);s.hp=Math.min(s.hp,maxhp());assert.equal(maxhp(),10);assert.equal(s.hp,10);
const once=JSON.stringify(s);migrateCombatSkills(s);assert.equal(JSON.stringify(s),once);
for(const skill of COMBAT_SKILLS){s=defaults();const before=combatLevel();s.xp[skill]=35*20**2;assert(combatLevel()>before,skill+' contributes to total combat');}
s=defaults();awardCombatDamage(3,'melee','accurate');assert.equal(s.xp.Attack,36);assert.equal(s.xp.Hitpoints,1166);assert.equal(s.xp.Strength,0);assert.equal(s.xp.Defense,0);
s=defaults();awardCombatDamage(3,'melee','aggressive');assert.equal(s.xp.Strength,36);assert.equal(s.xp.Attack,0);
s=defaults();awardCombatDamage(3,'melee','defensive');assert.equal(s.xp.Defense,36);
s=defaults();awardCombatDamage(3,'melee','balanced');for(const k of ['Attack','Strength','Defense','Hitpoints'])assert.equal(s.xp[k],k==='Hitpoints'?1166:12);
for(const [style,skill]of [['magic','Magic'],['ranged','Ranged']]){s=defaults();awardCombatDamage(3,style,'defensive');assert.equal(s.xp[skill],style==='magic'?4:6);assert.equal(s.xp.Defense,style==='magic'?3:6);assert.equal(s.xp.Hitpoints,1158);}
s=defaults();s.bag.bones=1;assert.equal(itemActions('bones',true)[0][0],'Bury');assert(buryBones());assert.equal(s.bag.bones,1);time+=1.81;updatePlayerAction();assert.equal(s.bag.bones,0);assert.equal(s.xp.Worship,18);assert(!buryBones());assert.equal(s.xp.Worship,18);
s=defaults();const dummy={level:1,hp:100,maxhp:100,dead:0,x:1,y:1};const accuracy=playerAccuracy(dummy),maxDamage=playerMaxHit(),enemyHit=enemyAccuracy(dummy),armor=armorValue(),hp=maxhp();
s.xp.Attack=3500;assert(playerAccuracy(dummy)>accuracy);s.xp.Strength=3500;assert(playerMaxHit()>maxDamage);s.xp.Defense=3500;assert(enemyAccuracy(dummy)<enemyHit);assert.equal(armorValue(),armor,'Defense skill improves hit avoidance, not the worn gear bonus');assert.equal(maxhp(),hp);
s=defaults();const beforeMiss=JSON.stringify(s.xp);resolveHit(dummy,0,'melee');assert.equal(JSON.stringify(s.xp),beforeMiss);
let defeated=0;awardDefeat=o=>{defeated++;o.dead=time+25;};dummy.hp=2;resolveHit(dummy,1000,'melee',0,'accurate');assert.equal(s.xp.Attack,24);assert(Math.abs(s.xp.Hitpoints-(1154+8))<1e-7);resolveHit(dummy,1000,'melee');assert.equal(defeated,1);assert.equal(s.xp.Attack,24);
s=defaults();inAttackRange=()=>true;dummy.hp=100;dummy.dead=0;s.equipment.weapon='shortbow';s.equipment.ammo='arrows';s.equippedAmmoCount=10;s.rangedTraining='defensive';const arrows=s.bag.arrows;performAttack(dummy);assert.equal(s.equippedAmmoCount,9);assert.equal(s.bag.arrows,arrows);assert.equal(projectiles.at(-1).focus,'defensive');s.rangedTraining='focused';assert.equal(projectiles.at(-1).focus,'defensive');
renderCombatBar();assert($('trainingFocus').innerHTML.includes('Defensive'));
console.log('PASS: seven independent skills, legacy migration, all-skill combat level, training modes, accuracy/damage/defense effects, bone burial, miss/overkill XP and captured projectile training.');
`,ctx);
