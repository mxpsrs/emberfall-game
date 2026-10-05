const {ctx,vm,fs}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(fs.readFileSync('client/tutorial-journal.js','utf8'),ctx);
vm.runInContext(`
draw=drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
s.character={name:'Journal tester',look:0};s.tutorial=38;s.tutorialVersion=7;s.tutorialReward=true;assetsReady=true;renderUI=renderAction=save=()=>{};
activateScene('overworld',55,61);s.quest=0;s.frontier={quest:0,accepted:false,kills:0};
function descendants(e){return [e,...e.children.flatMap(descendants)];}
for(const [main,mountain]of [[0,0],[8,0],[19,0],[25,1],[25,12],[25,17],[25,20]]){
 s.mainStoryQuest={version:3,stage:main};s.mountainQuest={version:2,stage:mountain};s.trackedQuest=main<25?'main-'+(main<7?0:main<18?1:2):'mountain-1';
 questJournalSelection=null;renderQuestJournal();
 const button=$('panel').children.flatMap(descendants).find(e=>e.dataset.questId==='frontier-0');assert(button);button.onclick();
 assert.equal(questJournalSelection,'frontier-0');const tracked=s.trackedQuest;
 for(let n=0;n<3;n++){renderQuestJournal();assert.equal(questJournalSelection,'frontier-0');assert.equal(s.trackedQuest,tracked,'reading never changes tracking');}
 const nodes=descendants($('panel'));assert(nodes.some(e=>e.textContent===frontierQuests[0].title));assert(!nodes.some(e=>e.textContent?.includes('NEXT STEP')&&e.textContent?.includes('Veyr')));
 const guideButton=nodes.find(e=>e.textContent==='Show me where');assert(guideButton);guideButton.onclick();assert.equal(s.trackedQuest,'frontier-0');assert.equal(trackedQuestId(),'frontier-0');assert.equal(rawQuestObjective(trackedQuestId()).o.name,frontierQuests[0].npc);
 assert.equal(mainStoryState().stage,main);assert.equal(mountainState().stage,mountain);stop();
}
s.mainStoryQuest={version:3,stage:8};s.mountainQuest={version:2,stage:0};
questJournalSelection='mountain-2';renderQuestJournal();assert(!descendants($('panel')).some(e=>e.textContent==='Show me where'),'locked chapter does not route into another quest');
const npc=worldScenes.overworld.objects.find(o=>o.name===frontierQuests[0].npc);activateScene('overworld',npc.x+1,npc.y);frontierTalk(npc);
$('modalBody').children.find(e=>e.textContent==='Accept quest').onclick();assert(s.frontier.accepted);s.bag.herbs=5;frontierTalk(npc);$('modalBody').children.find(e=>e.textContent==='Complete quest').onclick();
assert.equal(s.frontier.quest,1);assert.equal(mainStoryState().stage,8);assert.equal(mountainState().stage,0);
console.log('PASS: clicking, rerendering and tracking a different quest at seven story states; locked chapters stay put; side quest acceptance and completion while The Last Shift remains active.');
`,ctx);
