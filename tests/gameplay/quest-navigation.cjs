const {ctx,vm,fs}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(fs.readFileSync('client/tutorial-journal.js','utf8'),ctx);
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;s.character={name:'Quest navigation'};s.tutorial=38;s.tutorialReward=true;activateScene('overworld',55,61);
let stages=0;
for(let stage=0;stage<25;stage++){
 s.mainStoryQuest={stage};s.mountainQuest={stage:0};s.trackedQuest='main-'+(stage<7?0:stage<18?1:2);const goal=questWorldObjective();assert(goal,'main stage '+stage+' has a target');const direct=rawQuestObjective(trackedQuestId());assert(direct?.o,'main step has a real object');
 if(direct.scene!=='overworld')assert.equal(goal.destination,direct.scene,'cross-scene guidance points to entrance');
 else assert(goal===direct.o||goal.building?.walkIn,'same-scene goal is the real object or its closed door');stages++;
}
s.mainStoryQuest={stage:2,clues:[]};trackQuest('main-0');const cart=questWorldObjective();assert.equal(cart.mainStoryKey,'cart');s.mainStoryQuest.clues.push('cart');assert.equal(questWorldObjective().mainStoryKey,'harness');s.mainStoryQuest.clues.push('harness');assert.equal(questWorldObjective().mainStoryKey,'body');s.mainStoryQuest.clues.push('body');assert.equal(questWorldObjective().mainStoryKey,'boots');
s.mainStoryQuest={stage:25};
for(let stage=0;stage<20;stage++){s.mountainQuest={stage,inscription:true};trackQuest(stage<11?'mountain-1':'mountain-2');assert(questWorldObjective(),'mountain stage '+stage+' target');stages++;}
s.mountainQuest={stage:12,inscription:false};trackQuest('mountain-2');assert.equal(questWorldObjective(),null,'journal-only investigation has no misleading world target');s.mountainQuest={stage:20};assert.equal(questWorldObjective(),null,'finished story removes its target');
for(let i=1;i<=4;i++){s.quest=i;trackQuest('village-'+i);assert(questWorldObjective(),'village '+i);assert(questJournalRows('village-'+i).some(r=>!r.done),'current journal instruction');}
for(let i=0;i<frontierQuests.length;i++){s.frontier={quest:i,accepted:false,kills:0};trackQuest('frontier-'+i);const npc=rawQuestObjective(trackedQuestId()).o;assert.equal(questNpcMarker(npc),'!','unaccepted offer');s.frontier.accepted=true;assert.notEqual(questNpcMarker(npc),'!','accepted offer removes exclamation');assert(questWorldObjective());}
s.relicQuest={stage:7};s.quest=5;s.frontier={quest:frontierQuests.length,accepted:false};s.mainStoryQuest={stage:25};s.mountainQuest={stage:20};for(const o of objects)assert.equal(questNpcMarker(o),null,'completed NPC '+o.name);
s.mainStoryQuest={stage:0};assert.equal(questNpcMarker(mainStoryObject('rellan')),'!');s.mainStoryQuest={stage:2};assert.equal(questNpcMarker(mainStoryObject('rellan')),null,'Rellan is not current while collecting clues');s.mainStoryQuest={stage:6};s.bag.forgedOrders=1;assert.equal(questNpcMarker(mainStoryObject('rellan')),'?','ready to report');
const commands=[];const g=new Proxy({},{get:(_,k)=>(...args)=>commands.push([k,...args]),set:()=>true});trackQuest('main-0');drawQuestMinimap(g,()=>[900,-300],300,300);const position=commands.find(c=>c[0]==='translate');assert(position[1]>=24&&position[1]<=276&&position[2]>=24&&position[2]<=276,'far arrow stays visible at edge');
console.log('PASS: '+stages+' story stages, sequential evidence targets, all village/frontier quests, journal-only steps, completion cleanup, correct NPC offer/report markers and clamped minimap arrow.');
`,ctx);
