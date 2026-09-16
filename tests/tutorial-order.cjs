const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(\`
const events=tutorialSteps.map(step=>step.event);
assert.equal(events[events.indexOf('talk-guide')+1],'bag');assert.equal(events[events.indexOf('bag')+1],'skills');assert.equal(events[events.indexOf('skills')+1],'talk-magic');
assert(events.indexOf('magic')<events.indexOf('talk-mining'));
assert(events.indexOf('smith')<events.indexOf('talk-combat'));
assert(events.indexOf('ranged')<events.indexOf('talk-woods'));
assert(events.indexOf('tree')<events.indexOf('talk-fishing'));
assert(events.indexOf('eat')<events.indexOf('talk-bank'));
assert.equal(events.length,38);assert.equal(new Set(events).size,38);
assert(TUTORS.guide.text.includes('open your bag'));assert(tutorialSteps.find(t=>t.event==='talk-woods').desc.includes('Forester Ash'));assert(TUTORS.cooking.text.includes('Banker Ada'));
for(const [version,oldEvents]of [[4,TUTORIAL_V4_EVENTS],[5,TUTORIAL_V5_EVENTS],[6,TUTORIAL_V6_EVENTS]])for(let progress=0;progress<=oldEvents.length;progress++){
 const state={...defaults(),character:{name:'Existing apprentice'},tutorialVersion:version,tutorial:progress,tutorialIslandVersion:FIRSTLIGHT_LAYOUT_VERSION,sceneId:'tutorial',x:42,y:51,tutorialReward:false,starterGearVersion:1,bag:{logs:2},xp:{Woodcutting:70,Cooking:0,Firemaking:0},tutorialGifts:{baking:true}};
 const possessions=JSON.stringify([state.bag,{...state.xp,'Relic Shaping':0},state.tutorialGifts,state.character]);normalizeJourney(state);
 assert.equal(state.tutorialVersion,TUTORIAL_VERSION);
 for(const completed of oldEvents.slice(0,progress).filter(event=>events.includes(event)))assert(state.tutorialCompleted.includes(completed),'finished lessons survive migration');
 if(progress<oldEvents.length){const pending=events.find(event=>!oldEvents.slice(0,progress).includes(event));assert.equal(events[state.tutorial],pending,'resume at first unfinished lesson in the new order');}else assert.equal(state.tutorial,38);
 assert.equal(JSON.stringify([state.bag,state.xp,state.tutorialGifts,state.character]),possessions);
 const snapshot=JSON.stringify(state);normalizeJourney(state);assert.equal(JSON.stringify(state),snapshot,'migration is stable on the next reload');
}
// Completed gathering lessons are remembered while a migrated player learns smithing.
s={...defaults(),character:{name:'Returning learner'},tutorialVersion:5,tutorial:15,tutorialIslandVersion:FIRSTLIGHT_LAYOUT_VERSION,sceneId:'tutorial',starterGearVersion:1};normalizeJourney(s);assert.equal(tutorialStep().event,'talk-magic');renderUI=renderTutorial=save=stop=()=>{};tutorialEvent('talk-magic');assert.equal(tutorialStep().event,'magic','already completed bag/skills lessons are skipped');tutorialEvent('magic');assert.equal(tutorialStep().event,'talk-mining');
console.log('PASS: requested tutor order, updated handoffs, all v4/v5 save positions migrated without losing completed lessons or possessions, reload stability and completed-step skipping.');
\`,ctx);`);
