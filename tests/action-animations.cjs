const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(fs.readFileSync('dist/item-models.js','utf8'),ctx);
vm.runInContext(`{
renderUI=renderAction=renderTutorial=save=()=>{};currentScene='mine';time=10;lastAttack=-100;creatorDraft=null;
s=defaults();s.character={name:'Animations',frame:'male'};s.tutorial=tutorialSteps.length;s.bag.bones=2;playerMotion.blend=0;
assert(buryBones());assert.equal(s.bag.bones,2);assert.equal(s.xp.Worship,0,'starting an animation does not award XP');
time+=.5;updatePlayerAction();stop();assert.equal(s.bag.bones,2,'cancel before placement keeps the bones');assert.equal(s.xp.Worship,0);
assert(buryBones());time+=.96;updatePlayerAction();assert.equal(s.bag.bones,1);assert.equal(s.xp.Worship,18);updatePlayerAction();assert.equal(s.xp.Worship,18,'placement commits once');
stop();assert.equal(s.bag.bones,1,'cancelling recovery cannot duplicate the bones');
assert(buryBones());time+=1.81;updatePlayerAction();assert.equal(playerAction,null);assert.equal(s.xp.Worship,36);
assert(!Object.keys(ITEMS).some(id=>/quiver/i.test(id)),'the cosmetic quiver is never an inventory item');
for(const count of [0,1,5,2500,1000000])assert.equal(visibleQuiverArrows(count),Math.min(count,5));
for(const frame of ['male','female']){
 s.character={name:'Animations',frame,look:2,hair:1,hairColor:3,skin:4,topStyle:5,bottomStyle:3,topColor:1,bottomColor:2};s.equipment={weapon:'shortbow',head:'rangerCap',ammo:'arrows'};s.equippedAmmoCount=2500;playerAction=null;lastAttack=-100;
 const draws=[],painter={face(){},indexed(model){draws.push(model);},skinned(model){draws.push(model);}};
 humanoid3(painter,5.5,5.5,2,s.equipment);
 assert(draws.includes(rebuiltModels.Archer_Quiver),'bow automatically displays its cosmetic quiver');assert(draws.includes(rebuiltModels.Ranger_Cap));
 assert.equal(draws.filter(m=>m===rangedItemMesh('arrows',true)).length,5,'2500 arrows never become 2500 meshes');
 s.equippedAmmoCount=0;draws.length=0;humanoid3(painter,5.5,5.5,2,s.equipment);assert(draws.includes(rebuiltModels.Archer_Quiver));assert(!draws.includes(rangedItemMesh('arrows',true)),'empty equipped ammo makes the quiver empty');
 s.equipment.weapon='oakStaff';draws.length=0;humanoid3(painter,5.5,5.5,2,s.equipment);assert(!draws.includes(rebuiltModels.Archer_Quiver),'switching away from a bow hides the quiver');
 const expected=avatarMaterial(frame,s.equipment,2);playerAction={kind:'bury',started:time-.8,duration:1.8};draws.length=0;humanoid3(painter,5.5,5.5,2,s.equipment);assert.deepEqual(draws[0].p,expected.p);assert.deepEqual(draws[0].c,expected.c,'burial keeps the exact chosen body and clothes');playerAction=null;
 for(const id of ['shortbow','rangerCap','arrows'])assert(itemVisual(id)?.authored,'worn props also supply ground and inventory geometry');
}
const o={x:8,y:5,hp:100,maxhp:100,dead:0};s.equipment={weapon:'shortbow',ammo:'arrows'};s.equippedAmmoCount=2;s.bag.arrows=13;playerAttackReadyAt=0;inAttackRange=()=>true;target=null;projectiles=[];Math.random=()=>.5;
assert(performAttack(o));const release=playerAttackMotion.releaseAt;assert(projectiles[0].age<0);const draws=[],painter={face(){},indexed(mesh){draws.push(mesh);}};drawCombatProjectiles3(painter);assert.equal(draws.length,0,'the arrow waits for the release frame');
updateCombat(release-.01);assert.equal(o.hp,100);updateCombat(.02);drawCombatProjectiles3(painter);assert(draws.includes(rangedItemMesh('arrows',true)),'flight renders an actual arrow');assert.equal(o.hp,100,'damage waits for flight to finish');
updateCombat(1);assert(o.hp<100);assert.equal(s.bag.arrows,13);assert.equal(s.equippedAmmoCount,1);
console.log('PASS: burial commit/cancel, body identity, bow-only cosmetic quiver, bounded arrow meshes, shared item models and release-to-impact timing.');
}`,ctx);
