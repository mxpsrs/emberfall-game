const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(fs.readFileSync('client/item-models.js','utf8'),ctx);
vm.runInContext(`{
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};draw=()=>{};save=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();objects.splice(0);buildings.splice(0);realmNavigation.clear();assetsReady=true;
let now=0;function tick(){now+=50;frame(now);}
function reset(weapon){s=defaults();s.character={name:'Timing'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.equipment.weapon=weapon;s.equipment.ammo='arrows';s.equippedAmmoCount=100;s.bag.arrows=13;s.bag.runes=100;s.bag.airRunes=100;s.hp=1000;activateScene('overworld',45,90);playerAttackReadyAt=0;time=0;now=0;last=0;nextFrameAt=0;projectiles=[];objects.splice(0);realmNavigation.clear();}
function enemy(x,y){const o={id:900001,type:'enemy',kind:'goblin',name:'Timing target',x,y,drawX:x,drawY:y,homeX:x,homeY:y,hp:999,maxhp:999,level:1,atk:1,dead:0};objects.push(o);return o;}
for(const weapon of ['shortbow','oakStaff']){
 reset(weapon);const range=attackRange(),o=enemy(45+Math.floor(range),90);engage(o);tick();
 assert.equal(projectiles.length,1,weapon+' opens fire on its first frame in range');assert.equal(px,45);assert.equal(py,90);assert(Math.hypot(o.drawX-px,o.drawY-py)>1.45);
 const ready=playerAttackReadyAt,shots=weapon==='shortbow'?'arrows':'runes',after=weapon==='shortbow'?s.equippedAmmoCount:s.bag[shots];stop();engage(o);tick();assert.equal(weapon==='shortbow'?s.equippedAmmoCount:s.bag[shots],after,'retargeting does not bypass cooldown');assert.equal(playerAttackReadyAt,ready);
 for(let i=0;i<18;i++)tick();assert(Math.hypot(o.drawX-px,o.drawY-py)>1.45,'enemy remains at a distance after one second');assert(Math.hypot(o.drawX-(45+Math.floor(range)),o.drawY-90)<1.4,'monster approaches at a readable walking speed');
}
reset('oakStaff');let o=enemy(57,90);engage(o);tick();assert.equal(projectiles.length,0,'out of range does not cast');
for(let i=0;i<160&&!projectiles.length;i++)tick();assert(projectiles.length,'walk into spell range then cast');assert(inAttackRange(o));assert(Math.hypot(o.x-px,o.y-py)>2,'stop short of melee');
reset('shortbow');o=enemy(49,90);const blocker={id:900002,type:'tree',resourceId:'normal',x:47,y:90,drawX:47,drawY:90,dead:0};objects.push(blocker);realmNavigation.clear();assert(!inAttackRange(o),'tree blocks line of sight');assert(!performAttack(o));assert.equal(s.equippedAmmoCount,100);assert.equal(s.bag.arrows,13);
reset('woodenSword');o=enemy(47,90);assert(!performAttack(o),'melee still needs adjacent range');assert.equal(meleeImpacts.length,0);
for(const type of ['tree','ore','fish']){
 reset('shortbow');const resource={id:900004,type,resourceId:type==='tree'?'normal':type==='ore'?'copper':'shrimp',x:46,y:90,drawX:46,drawY:90,dead:0};objects.push(resource);realmNavigation.clear();engage(resource);tick();
 assert(gatheringActivity(),type+' animates on reaching the resource');assert(gatheringActivity().phase>0&&gatheringActivity().phase<.1);assert.equal(s.equipment.weapon,'shortbow','using a belt tool preserves equipment');assert.equal(s.xp[{tree:'Woodcutting',ore:'Mining',fish:'Fishing'}[type]],0,'no early XP before the gathering attempt');
 walkTo(45,92);assert.equal(gatheringActivity(),null,'walking cancels gathering immediately');
}
let shown=null;humanoid3=(r,x,z,look,gear)=>shown=gear;
for(const person of [{type:'man',kind:'man',name:'Man',level:1},{type:'villager',race:'elf',name:'Villager'},{type:'shop',race:'dwarf',name:'Merchant'}]){creature3({}, {...person,id:21,x:45,y:90,drawX:45,drawY:90},45.5,90.5);assert(!shown.weapon&&!shown.body&&!shown.head,'ordinary people wear clothes');}
creature3({}, {type:'villager',name:'Town guard',id:25,x:45,y:90,drawX:45,drawY:90},45.5,90.5);assert(shown.weapon&&shown.body,'guards keep duty equipment');
const man={type:'man',x:46,y:90,drawX:45,drawY:90};advanceActorMovement(man,.5);assert.equal(man.drawX,45.375,'civilians stroll rather than jumping tiles');
console.log('PASS: immediate ranged/magic opening attacks, range and sight limits, approach/stop distance, persistent cooldown, slower monsters, immediate gathering poses and ordinary civilian clothing.');
}`,ctx);
