const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
vm.runInContext(fs.readFileSync('dist/item-models.js','utf8'),ctx);
vm.runInContext(`
draw=drawPortrait=renderUI=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;s.character={name:'Reward tester',look:0};s.tutorial=38;s.tutorialVersion=7;s.tutorialReward=true;activateScene('overworld',55,61);
s.mainStoryQuest={};assert(!mainStoryState().arcMigrated);s.mountainQuest={};assert(!mountainState().arcMigrated);
for(const [index,r]of MAIN_STORY_QUESTS.entries()){
 s.mainStoryQuest={version:3,stage:r.end-1};s.bag={logs:25};s.bank={forgedOrders:index===0?1:0};const before={...s.xp};assert(mainStoryAdvance(r.end-1,null,{},index));assert.equal(s.bank.coins,r.coins);assert.equal(s.bank[r.item],1);for(const [skill,n]of Object.entries(r.xp))assert.equal(s.xp[skill],(before[skill]||0)+n);assert(!mainStoryAdvance(r.end-1,null,{},index));assert.equal(s.bank[r.item],1);
}
for(const [part,stage,coins,item]of [[1,10,600,'wardkeeperCape'],[2,19,1000,'veilbreakerRing']]){
 s.mountainQuest={version:2,stage};s.bag={logs:25};s.bank={};const before={...s.xp};assert(mountainAdvance(stage,null));assert.equal(s.bank.coins,coins);assert.equal(s.bank[item],1);const after=JSON.stringify(s.xp);mountainReward(part);assert.equal(JSON.stringify(s.xp),after);assert.equal(s.bank.coins,coins);if(part===2)for(const skill of ['Attack','Strength','Defense','Hitpoints','Magic','Ranged','Worship'])assert.equal(s.xp[skill],before[skill]+750);
}
s.mainStoryQuest={version:3,stage:25};s.mountainQuest={version:2,stage:20};syncMountainWorld();s.bag={};s.bank={};s.gear={};s.equipment={};
for(const [id,r]of Object.entries(ARC_REWARDS)){
 const npc=(r.main?mainStoryObject(r.npc):mountainObject(r.npc).o);activateScene('overworld',npc.x+1,npc.y);assert.equal(arcRecoveryChoices(npc).filter(([l])=>l==='Recover '+ITEMS[id].name).length,1);arcRecoveryChoices(npc).find(([l])=>l==='Recover '+ITEMS[id].name)[1]();assert.equal(s.gear[id],1);assert(equipItem(id));assert.equal(s.equipment[ITEMS[id].slot],id);assert(!arcRecoveryChoices(npc).some(([l])=>l==='Recover '+ITEMS[id].name));assert(unequipItem(ITEMS[id].slot));assert.equal(transferBank(id,false,1),1);assert(!arcRecoveryChoices(npc).some(([l])=>l==='Recover '+ITEMS[id].name));assert.equal(transferBank(id,true,1),1);assert.equal(s.gear[id],1);assert.equal(shopSalePrice(id),0);assert.equal(sell(id,100),false);assert(!itemActions(id,true).some(([l])=>l.startsWith('Drop')));
}
assert.equal(ITEMS.rellanSignet.armor,1);assert(ITEMS.veilbreakerRing.armor>ITEMS.rellanSignet.armor);assert.equal(ITEMS.ironhollowBelt.miningSuccess,.02);assert.equal(ITEMS.whisperPendant.worshipAccuracy,2);
s.gear.veyrOrb=1;s.xp.Magic=skillThreshold('Magic',19);assert(!equipItem('veyrOrb'));s.xp.Magic=skillThreshold('Magic',20);assert(equipItem('veyrOrb'));assert.equal(s.equipment.weapon,'veyrOrb');assert(itemActions('veyrOrb',true).some(([l])=>l==='Drop one'));assert.equal(STACKABLE.has('veyrOrb'),false);
const targetOrb={hp:100,defenseLevel:20,dead:0,x:px,y:py};const base=playerAccuracy(targetOrb,'magic');resolveHit(targetOrb,1,'magic');assert(playerAccuracy(targetOrb,'magic')>base);time+=4.1;assert.equal(playerAccuracy(targetOrb,'magic'),base);
for(const id of ['rellanSignet','ironhollowBelt','whisperPendant','wardkeeperCape','veilbreakerRing','veyrOrb']){const faces=[];assert(buildArcItem({face:p=>faces.push(p)},id));assert(faces.flat(2).every(Number.isFinite));}
for(const id of Object.keys(SPIRITS)){s.spirits={[id]:{state:'set'}};s.xp.Worship=skillThreshold('Worship',8);assert(!arcGate(5),id+' is a usable Spirit');}s.spirits={};assert(arcGate(5).includes('Spirit'));
s.mainStoryQuest={version:3,stage:7};s.xp.Mining=skillThreshold('Mining',4);s.xp.Smithing=skillThreshold('Smithing',5);assert(!mainStoryAdvance(7,null));s.xp.Mining=skillThreshold('Mining',5);assert(mainStoryAdvance(7,null));
s.mainStoryQuest={version:3,stage:18};s.xp.Magic=skillThreshold('Magic',4);assert(!mainStoryAdvance(18,null));s.xp.Magic=skillThreshold('Magic',5);assert(mainStoryAdvance(18,null));
s.mainStoryQuest={version:1,stage:25};s.mountainQuest={version:1,stage:20};const xp=JSON.stringify(s.xp);assert(mainStoryState().reward1&&mainStoryState().reward2&&mainStoryState().reward3);assert(mountainState().reward1&&mountainState().reward2);mountainReward(2);assert.equal(JSON.stringify(s.xp),xp);
console.log('PASS: exact one-time rewards, full-bag bank delivery, real slots, bank/recovery ownership checks, bound sale/drop rules, Magic-20 Orb and memory effect, every Spirit accepted, skill gates and legacy no-repeat migration.');
`,ctx);
