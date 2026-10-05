const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(`
draw=drawPortrait=renderUI=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
s.character={name:'Reward tester'};s.tutorial=38;s.tutorialReward=true;activateScene('overworld',55,61);
const sounds=[];playGameSound=kind=>sounds.push(kind);
function dismiss(){close();finishQuestCelebration();}
function displayed(){flushQuestCompletions();assert(activeQuestCompletion);assert($('modal').open);assert.equal(sounds.at(-1),'questComplete');return activeQuestCompletion;}
// Real village completion offers grant exactly the displayed +40% amount, once.
const expected=[63,98,70,280];
for(let i=1;i<=4;i++){
 s.quest=i;s.bag={};s.gear={};s.equipment={};s.kills=5;s.boss=true;
 if(i===1)s.bag={logs:5,ore:5,fish:3};if(i===3){s.gear.iron_weapon=1;for(const skill of COMBAT_SKILLS)s.xp[skill]=skillThreshold(skill,20);}
 elder();const fn=npcDialogueState.choices.find(([label])=>label==='Complete quest')[1];const before=s.bag.coins||0;fn();fn();
 assert.equal(s.bag.coins,before+expected[i-1]);assert.equal(questCompletionQueue.length,1);const card=displayed();assert.equal(card.title,quests[i].title);assert.equal(card.coins,expected[i-1]);dismiss();
}
assert.deepEqual(Array.from(frontierQuests,q=>q.reward),[63,98,126,210]);
for(let i=0;i<4;i++){
 const q=frontierQuests[i],npc=objects.find(o=>o.name===q.npc);s.frontier={quest:i,accepted:true,kills:q.goal};s.bag={herbs:5,ore:4,logs:4};activateScene('overworld',npc.x+1,npc.y);
 frontierTalk(npc);const fn=npcDialogueState?npcDialogueState.choices.find(([label])=>label==='Complete quest')[1]:$('modalBody').children.find(b=>b.textContent==='Complete quest').onclick;fn();if(playerAction){time+=2.3;updatePlayerAction();}assert.equal(s.frontier.quest,i+1);assert.equal(s.bag.coins,q.reward);
 assert.equal(displayed().coins,q.reward);dismiss();
}
assert.deepEqual(Array.from(MAIN_STORY_QUESTS,q=>q.coins),[200,300,400]);
assert.equal(MAIN_STORY_QUESTS[0].xp.Attack,250);assert.equal(MAIN_STORY_QUESTS[1].xp.Mining,400);assert.equal(MAIN_STORY_QUESTS[2].xp.Magic,500);
for(let i=0;i<3;i++){
 const r=MAIN_STORY_QUESTS[i];s.mainStoryQuest={stage:r.end-1};s.bag={};assert(mainStoryAdvance(r.end-1,null,{},i));assert(!mainStoryAdvance(r.end-1,null,{},i));assert.equal(s.bag.coins,r.coins);
 const card=displayed();assert.equal(card.title,r.title);assert.deepEqual(card.xp,r.xp);dismiss();
}
// Mountain reward flags survive replay and the card matches actual currency/XP.
s.mountainQuest={version:2,stage:11};s.bag={};s.bank={};const xp=s.xp.Mining;mountainReward(1);mountainReward(1);
assert.equal(s.bag.coins,600);assert.equal(s.xp.Mining,xp+600);assert.equal(questCompletionQueue.length,1);assert.equal(displayed().xp.Mining,600);dismiss();
s.mountainQuest.stage=20;mountainReward(2);assert.equal(displayed().coins,1000);assert(activeQuestCompletion.unlocks.includes('Repeat Veyr hunts through Rook'));dismiss();
// Opening a celebration never grants anything. Conversations finish first, then cards queue.
dialog('Existing conversation','Still talking');showQuestCompletion({title:'Test quest',coins:63});flushQuestCompletions();assert.equal(activeQuestCompletion,null);
const state=JSON.stringify(s);close();displayed();assert.equal(JSON.stringify(s),state);showQuestCompletion({title:'Second quest',xp:{Magic:420}});flushQuestCompletions();assert.equal(activeQuestCompletion.title,'Test quest');dismiss();assert.equal(displayed().title,'Second quest');dismiss();assert.equal(questCompletionQueue.length,0);
// Full inventory sends quest coins to the bank; the displayed reward remains exact.
s.bag={logs:25};s.bank={};const banked=grantQuestCoins(210);assert.equal(banked,210);assert.equal(s.bank.coins,210);assert(!s.bag.coins);
showQuestCompletion({title:'Full inventory reward',coins:210,banked});displayed();assert($('modalBody').children.find(el=>el.className==='completion-note').textContent.includes('210 coins were sent to your bank'));dismiss();
console.log('PASS: all village reward increases, mainland/frontier tables, mountain XP/currency/unlocks, real completion cards, one-time grants, queued conversations, sound, dismissal and safe bank overflow.');
`,ctx);
