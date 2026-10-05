const {ctx,vm,fs}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(fs.readFileSync('client/tutorial-journal.js','utf8'),ctx);
vm.runInContext(`
draw=drawPortrait=renderUI=renderAction=save=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
s.character={name:'Relic review',look:0};time=100;lastAttack=playerHitAt=0;cloudReady=false;playGameSound=()=>{};
s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.bag={};s.gear={};s.equipment={};s.xp['Relic Shaping']=0;
function approach(key){const a=RELIC_ANCHORS[key];activateScene(a.scene,a.x,a.y+1,false);px=s.x=a.x;py=s.y=a.y+1;}
assert(!requestRelicOperation('shape','air'));
approach('teacher');assert(requestRelicOperation('accept'));assert.equal(relicQuestState().stage,1);
assert(!requestRelicOperation('archive'),'archive requires proximity');approach('archive');assert(requestRelicOperation('archive'));
approach('teacher');assert(requestRelicOperation('learn'));assert.equal(s.bag.relicChisel,1);
const seams=objects.filter(o=>o.resourceId==='lodestone');assert.equal(seams.length,10);assert(!requestRelicOperation('shape','air'));
const randomBefore=Math.random;Math.random=()=>0;const seam=seams[0];px=s.x=seam.x+1;py=s.y=seam.y;assert(harvestResource(seam));Math.random=randomBefore;
assert.equal(s.bag.lodestone,1);assert(requestRelicOperation('shape','air'));assert.equal(s.bag.unfinished_air,1);assert.equal(relicQuestState().stage,4);
assert(!requestRelicOperation('shape','heart'),'independent level gate');
approach('crossing');assert(handleWorldInteraction(relicObject('crossing')));assert.equal(tutorialCrossing.kind,'relic');assert.equal(currentScene,'overworld');
updateTutorialCrossing(2.6);assert.equal(currentScene,'fairy_between');updateTutorialCrossing(1.2);
assert(route(RELIC_ANCHORS.lake.x,RELIC_ANCHORS.lake.y,true),'lake is reachable');approach('lake');assert(requestRelicOperation('lake','air'));assert.equal(s.bag.lakeRecord,1);assert.equal(s.bag.airRunes,10);assert(!requestRelicOperation('lake','air'));
approach('return');assert(handleWorldInteraction(relicObject('return')));updateTutorialCrossing(2.6);assert.equal(currentScene,'overworld');updateTutorialCrossing(1.2);
approach('teacher');assert(requestRelicOperation('leyline'));assert.equal(relicQuestState().stage,6);assert.equal(s.bag.lakeRecord,0);
s.bag.lodestone=2;assert(requestRelicOperation('shape','air'));approach('altar');selectedUseItem='unfinished_air';assert(requestItemOnObject(relicObject('altar')));assert.equal(relicQuestState().stage,7);
const coins=s.bag.coins;assert.equal(coins,150);assert(!requestRelicOperation('leyline'));assert(requestRelicOperation('shape','mind'));assert(requestRelicOperation('charge','mind'));assert.equal(s.bag.coins,coins);assert.equal(s.bag.runes,10);
const saved=JSON.parse(JSON.stringify(s));normalizeJourney(saved,saved);assert.equal(saved.relicQuest.stage,7);assert(saved.xp['Relic Shaping']>0);assert(questJournalEntries().find(q=>q.id==='relic-shaping').complete);assert(questJournalRows('relic-shaping').every(r=>r.done));
s.bag={lodestone:1,relicChisel:1,normalLogs:23};assert(requestRelicOperation('shape','air'));assert.equal(inventorySlots().length,25);
s.bag={airRunes:10,runes:10,waterRunes:10,earthRunes:10};s.xp.Magic=skillThreshold('Magic',25);s.runEnergy=30;s.hp=3;
assert(castFieldSpell('trailwind'));assert.equal(s.runEnergy,54);assert.equal(s.bag.airRunes,8);assert(!castFieldSpell('trailwind'));assert(castFieldSpell('mendingCurrent'));assert.equal(s.hp,9);
for(const [metal,key,value]of [['mithril','runCost',.9],['adamant','guard',1],['black','magicDefense',10]]){s.equipment={head:metal+'_head',body:metal+'_body',legs:metal+'_legs'};assert.equal(fieldEquipmentEffects(s)[key],value);delete s.equipment.legs;assert.equal(fieldEquipmentEffects(s).sets.length,0);}
for(const [scene,stats]of Object.entries(ecologyReport.scenes))assert(stats.after>0,scene+' retains trees');
console.log('PASS: mining, quest order/range, inscription, animated crossings, lake proof, altar item use, one-time reward, independent skill/save recovery, full bag, support spells and material traits.');
`,ctx);
