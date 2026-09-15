const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
renderUI=renderTutorial=renderAction=save=draw=drawPortrait=playGameSound=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;s.character={name:'Cook'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;currentScene='overworld';s.x=px=20;s.y=py=20;s.xp.Cooking=SKILL_XP[99];lineOfSight=()=>true;Math.random=()=>.99;
const camp={id:999991,type:'camp',x:21,y:20,dead:0,name:'Test fire',cooking:true},range={id:999992,type:'range',x:20,y:21,dead:0,name:'Test range'};objects.push(camp,range);
const previousWorkbench=openWorkbench;openWorkbench=()=>{throw new Error('Clicking fire must not open a menu');};assert(handleTutorialInteraction(camp));openWorkbench=previousWorkbench;assert(!$('modal').open);
function finish(){for(let i=0;i<100&&playerAction;i++){time+=.5;updatePlayerAction();}assert(!playerAction);}
for(const station of [camp,range]){s.bag={rawShrimp:4,rawTrout:2};assert(startCookingBatch('rawShrimp',station));assert.equal(s.bag.rawShrimp,4,'not instant conversion');finish();assert.equal(s.bag.rawShrimp,0);assert.equal(s.bag.shrimp,4);assert.equal(s.bag.rawTrout,2,'other foods untouched');}
s.bag={breadDough:3};assert(!startCookingBatch('breadDough',camp));assert(startCookingBatch('breadDough',range));finish();assert.equal(s.bag.bread,3);
s.bag={rawShrimp:4};assert(startCookingBatch('rawShrimp',camp));time+=1;updatePlayerAction();assert.equal(s.bag.rawShrimp,3);stop();time+=10;updatePlayerAction();assert.equal(s.bag.rawShrimp,3,'cancel stops the batch');
assert(startCookingBatch('rawShrimp',camp));camp.expiresAt=Date.now()-1;time+=1;updatePlayerAction();assert(!playerAction);assert.equal(s.bag.rawShrimp,3,'extinguished fires consume nothing');delete camp.expiresAt;
assert(startCookingBatch('rawShrimp',camp));px+=2;time+=1;updatePlayerAction();assert(!playerAction);assert.equal(s.bag.rawShrimp,3,'walking away consumes nothing');px=s.x;
s.xp.Cooking=0;s.bag={rawShrimp:3};Math.random=()=>0;assert(startCookingBatch('rawShrimp',range));finish();assert.equal(s.bag.burntFish,3,'burned attempts continue the same batch');assert.equal(s.xp.Cooking,0,'burnt food awards no XP');
for(const id of ['rawShrimp','rawTrout','breadDough'])assert(!itemActions(id,true).some(([label])=>/^Cook|^Bake/.test(label)),'no right-click cooking command');
console.log('PASS: timed all-of-one-item cooking on fire and range, bread batches, burns, mixed inventory, cancellation, movement, expired fires and no right-click Cook.');
`,ctx);
