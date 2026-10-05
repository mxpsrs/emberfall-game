const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(fs.readFileSync('client/encounters.js','utf8'),ctx);
vm.runInContext(`{
renderUI=renderAction=renderTutorial=save=tutorialEvent=()=>{};currentScene='mine';
const close=(a,b,eps=.0001)=>assert(Math.hypot(...a.map((v,i)=>v-b[i]))<eps);
for(const sex of ['male','female'])for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const clip of ['bowIdle','ranged','walk','run'])for(const phase of [0,.125,.25,.5,.58,.75,1]){
 const a=rebuiltAvatars[sex],root=briarTransform(4,0,5,1,heading),mesh=avatarGpuPose(sex,clip,phase,{weapon:'shortbow'},0),age=clip==='ranged'?phase*a.clips.ranged.duration:-1,bow=fittedBowPose(root,mesh,age);
 const palm=briarPoint([0,0,0],0,affineMultiply(root,mesh.pose.subarray(a.left*12,a.left*12+12)));close(bow.grip,palm);
 for(const anchor of [ARCHER_BOW.top,ARCHER_BOW.bottom]){let nearest=Infinity;const p=rebuiltModels.Archer_Bow.p;for(let i=0;i<p.length;i+=3)nearest=Math.min(nearest,Math.hypot(p[i]-anchor[0],p[i+1]-anchor[1],p[i+2]-anchor[2]));assert(nearest<.02,'string endpoint touches the wooden limb');}
 if(age>.45&&age<.94){const right=briarPoint([0,0,0],0,affineMultiply(root,mesh.pose.subarray(a.right*12,a.right*12+12)));close(bow.nock,right);assert(Math.hypot(...bow.tip.map((v,i)=>v-bow.nock[i]))>Math.hypot(...bow.grip.map((v,i)=>v-bow.nock[i]))+.15);const forward=[Math.sin(heading),0,Math.cos(heading)],rest=bow.top.map((v,i)=>(v+bow.bottom[i])/2);assert(bow.grip.reduce((sum,v,i)=>sum+(v-rest[i])*forward[i],0)>.1,'limbs curve back toward archer');}
}
s=defaults();s.character={frame:'male'};s.x=px=5;s.y=py=5;s.equipment={weapon:'shortbow',ammo:'arrows'};s.equippedAmmoCount=20;s.bag={arrows:50};s.tutorial=tutorialSteps.length;time=10;playerAttackReadyAt=0;target=null;
const rat={kind:'rat',type:'enemy',x:9,y:5,drawX:9,drawY:5,hp:8,maxhp:8,level:1,defenseLevel:1,dead:0};objects.splice(0,objects.length);buildings.splice(0,buildings.length);
assert(inAttackRange(rat));objects.push({type:'fence',penFence:true,blocksSight:true,name:'Pen fence',x:7,y:5});assert(inAttackRange(rat),'arrows can cross the pen fence');objects.push({type:'tree',x:7,y:5});assert(!inAttackRange(rat),'trees block shots');objects.pop();
let draws=0;Math.random=()=>[0,.9,.99][draws++%3];assert(performAttack(rat));assert.equal(s.equippedAmmoCount,19);assert.equal(s.bag.arrows,50);const shot=projectiles[0];assert.equal(shot.damage,2);updatePlayerProjectiles(shot.age*-1-.01);assert(!s.groundLoot?.length);assert.equal(rat.hp,8);
updatePlayerProjectiles(.02);assert(shot.releasePose);close(shot.releasePose.tip,rangedReleasePose(shot).tip);updatePlayerProjectiles(1);assert.equal(rat.hp,6);assert.equal(s.groundLoot[0].items.arrows,1);assert.equal(s.xp.Ranged,8);updatePlayerProjectiles(10);assert.equal(s.groundLoot[0].items.arrows,1,'a shot drops only once');
time+=10;playerAttackReadyAt=0;Math.random=()=>.99;assert(performAttack(rat));const xp=s.xp.Ranged;updatePlayerProjectiles(2);assert.equal(rat.hp,6);assert.equal(s.xp.Ranged,xp);assert.equal(s.groundLoot[0].items.arrows,2,'misses also leave recoverable ammo');
const pile=s.groundLoot[0];assert(takeGroundItem(pile,'arrows'));assert.equal(s.bag.arrows,52);assert.equal(s.equippedAmmoCount,18,'picked-up arrows must be equipped again');
time+=10;playerAttackReadyAt=0;draws=0;Math.random=()=>[0,.9,.1][draws++%3];assert(performAttack(rat));updatePlayerProjectiles(2);assert.equal(s.groundLoot.length,0,'broken arrows do not drop');
time+=10;playerAttackReadyAt=0;Math.random=()=>.99;assert(performAttack(rat));rat.hp=0;rat.dead=time+20;updatePlayerProjectiles(2);assert.equal(s.groundLoot[0].items.arrows,1,'a target dying mid-flight does not erase its arrow');
// Real attack rolls across the complete equipment progression, at long range.
const tiers=[['shortbow','arrows',1],['oakShortbow','steelArrows',5],['willowShortbow','mithrilArrows',20],['mapleShortbow','adamantArrows',30],['yewShortbow','runeArrows',40],['magicShortbow','runeArrows',50]];
let previous=0;for(const [bow,ammo,level]of tiers){s.equipment={weapon:bow,ammo};s.equippedAmmoCount=2500;s.xp.Ranged=skillThreshold('Ranged',level);const max=playerMaxHit('ranged');assert(max>=previous);previous=max;assert.equal(actionDuration(rat),2.4);assert.equal(selectedAmmo(),ammo);for(const enemy of [...Object.values(ENEMY_TIERS),...Object.values(HUNT_ENCOUNTERS)]){const accuracy=playerAccuracy({level:enemy.level,defenseLevel:Math.max(1,Math.floor(enemy.level*.65)),weak:enemy.weak},'ranged');assert(accuracy>0&&accuracy<1);assert(max*accuracy/actionDuration(rat)>0);}assert(inAttackRange({...rat,x:5,y:5+ITEMS[bow].range}));assert(!inAttackRange({...rat,x:5,y:5+ITEMS[bow].range+.1}));}
// Seeded level-one rat fights through performAttack; no tutorial-only bonuses.
let seed=83291;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const times=[];for(let trial=0;trial<2000;trial++){s.equipment={weapon:'shortbow',ammo:'arrows'};s.xp.Ranged=0;s.equippedAmmoCount=100;s.spirits={};rat.dead=0;rat.hp=8;let shots=0;while(rat.hp>0&&shots<100){time+=2.4;playerAttackReadyAt=0;projectiles=[];assert(performAttack(rat));rat.hp-=projectiles[0].damage;shots++;}times.push(shots*2.4);}
times.sort((a,b)=>a-b);assert(times[1000]<25);assert(times[1900]<45);console.log('PASS: both rigs through four motions/headings; palm/string/arrow alignment; launch/impact timing; hits, misses, breakage and recovery; ammo conservation; fences/trees; all six bow tiers. Level-one rat median '+times[1000].toFixed(1)+'s, 95th percentile '+times[1900].toFixed(1)+'s across 2,000 fights.');
}`,ctx);
