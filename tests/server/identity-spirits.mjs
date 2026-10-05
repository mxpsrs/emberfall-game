import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spiritBuild,spiritStrike,spiritGuard,spiritBondRank} from '../../worker/spirit-rules.js';
const require=createRequire(import.meta.url),{ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
ctx.assert=assert;
vm.runInContext(`
renderUI=renderAction=save=renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;
s=defaults();s.character={name:'Build test'};s.tutorial=tutorialSteps.length;time=100;lastAttack=playerHitAt=0;
s.spirits=Object.fromEntries(Object.keys(SPIRITS).map(id=>[id,{state:'set',bondXP:0}]));s.attunedSpirit='cinder';
assert.equal(spiritBonus('armor'),0,'collecting eight Spirits does not stack passives');
assert.equal(spiritBonus('melee'),0,'flat collection damage is retired');
assert(attuneSpirit('brook'));assert.equal(spiritBonus('health'),4);
s.spirits.brook.state='recovery';s.spirits.brook.readyAt=Date.now()+30000;assert.equal(spiritBonus('health'),4,'attuned passive survives Unleash recovery');
target={type:'enemy',hp:10,dead:0};assert(!attuneSpirit('cairn'),'cannot swap builds during combat');target=null;
assert(attuneSpirit('cairn'));assert.equal(spiritBonus('health'),0);assert.equal(spiritBonus('armor'),4);
const cash=s.gold,bag=JSON.stringify(s.bag);advanceSpiritBond('Fishing',2);assert.equal(s.spirits.cairn.bondXP,0,'unrelated gathering does not feed this bond');
advanceSpiritBond('Mining',2);assert.equal(s.spirits.cairn.bondXP,2);assert.equal(s.xp.Worship,1);
gain('Mining',999);assert.equal(s.spirits.cairn.bondXP,2,'quest XP does not create resonance');
advanceSpiritBond('worship',4);assert.equal(s.spirits.cairn.bondXP,6);assert.equal(s.gold,cash);assert.equal(JSON.stringify(s.bag),bag);
s.spirits.cairn.bondXP=240;s.xp.Worship=0;assert.equal(spiritBondRank(s,'cairn',lv('Worship')),1);
s.xp.Worship=560;assert.equal(spiritBondRank(s,'cairn',lv('Worship')),2);
s.xp.Worship=4235;assert.equal(spiritBondRank(s,'cairn',lv('Worship')),3);
const saved=JSON.parse(JSON.stringify(s));s=saved;setupSpirits();assert.equal(s.attunedSpirit,'cairn');assert.equal(s.spirits.cairn.bondXP,240);assert.equal(spiritBonus('armor'),6);
// Ranged and magic retain their useful starting distance; attunement never routes to melee.
s.attunedSpirit='zephyr';s.equipment.weapon='shortbow';s.equipment.ammo='arrows';s.equippedAmmoCount=50;const foe={type:'enemy',x:15,y:10,hp:100,maxhp:100,dead:0,level:1,defenseLevel:1};px=s.x=10;py=s.y=10;lineOfSight=()=>true;
assert(inAttackRange(foe));const airAim=playerAccuracy(foe,'ranged');s.attunedSpirit='cinder';assert(airAim>playerAccuracy(foe,'ranged'));s.attunedSpirit='zephyr';foe.x=11;const nearAim=playerAccuracy(foe,'ranged');s.attunedSpirit='cinder';assert.equal(nearAim,playerAccuracy(foe,'ranged'),'distance requirement is real');
`,ctx);
const all=['cinder','brook','zephyr','cairn','pyre','rill','gale','flint'];
for(const id of all){
 const state={attunedSpirit:id,spirits:{[id]:{state:'recovery',bondXP:240}}};let memory;
 for(let n=0;n<8;n++){
  const style=n%2?'magic':'melee',damage=n===2?0:2,now=100000+n*3000;
  ctx.input={state,memory,style,damage,now};const local=JSON.parse(vm.runInContext('JSON.stringify(spiritStrike(input.state,12,input.memory,input.damage,input.style,input.now))',ctx));
  const server=spiritStrike(state,12,memory,damage,style,now);assert.deepEqual(local,JSON.parse(JSON.stringify(server)),'server/client parity '+id);memory=server.memory;
  if(damage===0)assert.equal(server.damage,0,'passives never turn a miss into damage');
 }
}
const build=id=>({attunedSpirit:id,spirits:{[id]:{bondXP:0}}});
function combo(id,count){let m,out;for(let n=0;n<count;n++){out=spiritStrike(build(id),1,m,2,'melee',n*3000);m=out.memory;}return out;}
assert.equal(combo('cinder',4).damage,3);assert.equal(combo('brook',5).heal,1);assert.equal(combo('rill',4).heal,1);assert.equal(combo('gale',4).energy,4);assert.equal(combo('flint',5).slow,1);
assert.equal(spiritGuard(build('cairn'),1,4),3);assert.equal(spiritGuard(build('cairn'),1,1),1);assert.equal(spiritGuard(build('cairn'),1,0),0);
assert.equal(spiritBuild(build('zephyr'),1).runCost,.85);assert.equal(spiritBuild(build('gale'),1).runCost,.8);
const weave=spiritStrike(build('pyre'),1,undefined,2,'melee',0);assert.equal(spiritStrike(build('pyre'),1,weave.memory,2,'magic',3000).damage,3);
assert.equal(spiritStrike(build('cinder'),1,combo('cinder',3).memory,2,'melee',50000).proc,null,'old chains expire');
assert.equal(spiritBondRank({spirits:{cinder:{bondXP:Infinity}}},'cinder',1),1,'Worship gates cannot be skipped');
console.log('PASS: eight distinct non-stacking builds, successful-action bond progression, cooldown persistence, switching restrictions, save recovery, accuracy range, misses, guard thresholds and shared/local rule parity.');
