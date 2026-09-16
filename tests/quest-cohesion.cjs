const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
vm.runInContext(fs.readFileSync('dist/tutorial-journal.js','utf8'),ctx);
vm.runInContext(`
draw=drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
s.character={name:'Cohesion tester',look:0};s.tutorial=38;s.tutorialVersion=7;s.tutorialReward=true;assetsReady=true;renderUI=renderAction=save=playGameSound=()=>{};
activateScene('overworld',55,61);
for(const [scene,w]of Object.entries(worldScenes)){const ids=new Set();for(const o of w.objects){assert(!ids.has(String(o.id)),scene+' duplicate '+o.id+' '+o.name);ids.add(String(o.id));}}
function press(label){if(npcDialogueState){const choice=npcDialogueState.choices.find(([l])=>l===label);assert(choice,label);return choice[1];}const b=$('modalBody').children.find(b=>b.textContent===label&&b.onclick);assert(b,label);return b.onclick;}
function beside(o){activateScene('overworld',o.x+1,o.y);}
// Every earlier quest exposes an existing world target and an actionable journal row.
const elderNpc=objects.find(o=>o.type==='elder');
for(let i=1;i<=4;i++){
 s.quest=i;s.bag={};s.gear={};s.equipment={};s.kills=0;s.boss=false;
 const target=sideQuestObjective(false,i);assert(target,'Briarhaven target '+i);assert(worldScenes.overworld.objects.includes(target));
 assert(questJournalRows('village-'+i).some(row=>!row.done&&row.run),'Briarhaven directions '+i);
 if(i===1){s.bag={logs:5,ore:5,fish:3};}
 if(i===2)s.kills=5;
 if(i===3){s.gear.iron_weapon=1;for(const skill of COMBAT_SKILLS)s.xp[skill]=skillThreshold(skill,20);}
 if(i===4)s.boss=true;
 assert(ready(),'real requirements '+i);beside(elderNpc);elder();const complete=press('Complete quest'),before=(s.bag.coins||0)+s.gold;complete();assert.equal(s.quest,i+1);const after=(s.bag.coins||0)+s.gold;assert(after>before);complete();assert.equal((s.bag.coins||0)+s.gold,after,'one reward per quest');if(i===1)assert.equal(s.bag.fish,0,'delivery consumes cooked fish');
}
for(let i=0;i<4;i++){
 const q=frontierQuests[i],npc=worldScenes.overworld.objects.find(o=>o.name===q.npc);assert(npc);
 s.frontier={quest:i,accepted:false,kills:0};s.bag={};beside(npc);frontierTalk(npc);press('Accept quest')();
 const target=sideQuestObjective(true,i);assert(target,'Stoneford target '+i);assert(questJournalRows('frontier-'+i).some(row=>!row.done&&row.run),'Stoneford directions '+i);
 if(q.kind==='deliver')s.bag.herbs=5;if(q.kind==='repair'){s.bag.ore=4;s.bag.logs=4;}if(q.kind==='hunt')s.frontier.kills=q.goal;
 frontierTalk(npc);const finish=press('Complete quest');finish();if(q.kind==='repair'){assert.equal(s.frontier.quest,i,'repair waits for action');time+=2.3;updatePlayerAction();}
 assert.equal(s.frontier.quest,i+1);const gold=(s.bag.coins||0)+s.gold;finish();if(playerAction){time+=2.3;updatePlayerAction();}assert.equal((s.bag.coins||0)+s.gold,gold,'no duplicate Stoneford reward');
}
// The inspection itself is visible, cancellable and leaves no completed evidence.
s.mainStoryQuest={stage:2,clues:[]};const cart=mainStoryObject('cart');beside(cart);mainStoryInteract(cart);assert.equal(playerAction.kind,'investigate');assert(!$('modal').open);time+=1;updatePlayerAction();assert(!$('modal').open);stop();assert.equal(s.mainStoryQuest.clues.length,0);
mainStoryInteract(cart);time+=2.3;updatePlayerAction();assert($('modal').open);press('Record the evidence.')();assert(s.mainStoryQuest.clues.includes('cart'));
assert(worldOptionsFor(cart)[0][0].startsWith('Investigate'));
// Every physical story objective occupies navigable land, and named locations have dressing.
for(const [scene,w]of Object.entries(worldScenes))for(const o of w.objects.filter(o=>o.mainStoryKey||o.mountainKey)){currentScene=scene;assert(!water(o.x,o.y),o.name+' in water');assert(!worldWall(o.x,o.y),o.name+' inside wall');}
for(const key of ['ledger','tools','summons'])assert(mountainObject(key).o.interiorBuilding,'Wardkeeper evidence uses a real home: '+key);
currentScene='overworld';for(const title of ['Old pilgrim camp','Ironhollow rescue camp','Redclay Bend','Hollow Shrine','Northern Watch','Ashwatch','Riverbend'])assert(questSites.some(p=>p.name.includes(title)),title);
assert(worldScenes.overworld.objects.filter(o=>o.raiderCamp&&o.campModel==='tent').length===3);
const lookout=mainStoryObject('lookout');assert.equal(worldScenes.overworld.objects.find(o=>o.id===lookout.id),lookout);
assert(route(lookout.x,lookout.y,true,1.5,205,142)!==null,'camp entrance connected');assert(route(mainStoryObject('dispatch').x,mainStoryObject('dispatch').y,true,1.5,212,142)!==null,'satchel accessible');
// Brook boosts maximum, never base level; healing and recovery honor the current cap.
s.xp.Hitpoints=skillThreshold('Hitpoints',10);s.spirits={brook:{state:'set'}};s.hp=5;assert.equal(lv('Hitpoints'),10);assert.equal(maxhp(),14);s.bag.fish=3;eatFood('fish');eatFood('fish');assert.equal(s.hp,14);s.spirits.brook={state:'recovery',readyAt:Date.now()+30000};s.hp=Math.min(s.hp,maxhp());assert.equal(s.hp,14);assert.equal(lv('Hitpoints'),10);s.spirits.brook.state='set';assert.equal(maxhp(),14);assert.equal(s.hp,14,'recovery does not remove the attuned health bonus');
console.log('PASS: all 8 village quests, current item/skill checks, directions, delivery consumption, timed repair, duplicate rewards, inspection interruption, unique identities, all story-object footprints, named quest sites, camp paths and Brook health semantics.');
`,ctx);
