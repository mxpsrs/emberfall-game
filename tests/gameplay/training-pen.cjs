const vm=require('node:vm'),assert=require('node:assert/strict'),{ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`{
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};draw=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;s.character={name:'Pen inspector'};s.tutorial=tutorialSteps.length;s.hp=1000;
const pen=TRAINING_PEN,gate=trainingPenGate,rats=objects.filter(o=>o.penId===pen.id);assert.equal(rats.length,15);
for(const o of objects.filter(o=>o.penId||o.penFence))assert.equal(objects.filter(a=>a.id===o.id).length,1,'pen object IDs do not collide with resources');
assert.deepEqual([tutorialTutor('combat').x,tutorialTutor('combat').y],[45,80]);assert.deepEqual([dummyObj.x,dummyObj.y],[44,78]);
for(const rat of rats){assert(insideTrainingPen(rat.homeX,rat.homeY,1));assert.equal(creatureAssets.rat.height*creatureSize(rat),.95);}
for(let y=pen.top;y<=pen.bottom;y++)for(let x=pen.left;x<=pen.right;x++)if(x===pen.left||x===pen.right||y===pen.top||y===pen.bottom)assert(!land(x,y),'closed perimeter blocks '+x+','+y);
let now=0;Date.now=()=>now;nextWorldTimerCheck=0;time=0;last=0;nextFrameAt=0;
function tick(){now+=50;frame(now);}
function finishWalk(){let opened=false;for(let i=0;i<500;i++){tick();opened||=gate.openedAt!==undefined;if(!path.length&&Math.hypot(px-s.x,py-s.y)<.001)return opened;}throw Error('Gate walk stalled at '+px+','+py);}
activateScene('overworld',46,82);assert(walkTo(51,82));assert(path.some(([x,y])=>x===gate.x&&y===gate.y),'planned entry uses the gate');assert(finishWalk(),'gate opens on approach');assert(insideTrainingPen(px,py));assert.equal(gate.openedAt,undefined,'gate shuts behind entry');assert(!land(gate.x,gate.y));
engage(gate);assert(finishWalk(),'tapping the gate opens it from inside');assert.equal(px,46);assert.equal(py,82);assert.equal(gate.openedAt,undefined,'gate shuts behind exit');
engage(gate);assert(finishWalk(),'tapping gate from outside enters');assert(insideTrainingPen(px,py));assert.equal(gate.openedAt,undefined);
assert(walkTo(46,82));finishWalk();activateScene('overworld',47,82);walkTo(51,82);tick();assert.notEqual(gate.openedAt,undefined);stop();tick();assert.equal(gate.openedAt,undefined,'cancelled approach shuts unused gate');
setTrainingGate(true);s.x=px=gate.x;s.y=py=gate.y;stop();tick();assert.notEqual(gate.openedAt,undefined,'gate never shuts on player in threshold');walkTo(46,82);finishWalk();assert.equal(gate.openedAt,undefined);
for(const [x,y]of [[46,82],[66,82],[56,74],[56,90]]){const p=route(56,82,false,1.45,x,y);assert(p&&p.some(([a,b])=>a===gate.x&&b===gate.y),'all approaches use the only entrance');}
assert(lineOfSight(47,80,50,80),'arrows and spells clear the low fence');assert(!land(48,80),'low fence still blocks movement');
const moved=new Set();activateScene('overworld',55,81);target=null;
for(let i=0;i<400;i++){time+=.5;livingWorld(.5);for(const rat of rats){advanceActorMovement(rat,.5);if(rat.x!==rat.homeX||rat.y!==rat.homeY)moved.add(rat);assert(insideTrainingPen(rat.x,rat.y,1));assert(insideTrainingPen(rat.drawX,rat.drawY,1));}}
assert(moved.size>=10,'the rats can roam inside the enlarged pen');
for(const rat of rats)Object.assign(rat,{x:rat.homeX,y:rat.homeY,drawX:rat.homeX,drawY:rat.homeY});
activateScene('overworld',46,82);target=rats[5];
for(const open of [false,true]){setTrainingGate(open);for(let i=0;i<60;i++){time+=.5;updateCombat(.5);advanceActorMovement(target,.5);assert(insideTrainingPen(target.x,target.y,1),'combat cannot lead rats through even an open gate');}}
stop();setTrainingGate(false);const rat=rats[0];rat.x=pen.left-3;advanceActorMovement(rat,.05);assert(insideTrainingPen(rat.x,rat.y,1),'invalid old position is repaired');
activateScene('overworld',rat.x+1,rat.y);s.tutorial=tutorialSteps.findIndex(a=>a.event==='monster');rat.hp=0;awardDefeat(rat,'melee');assert.equal(tutorialStep().event,'ranged-kit','any pen rat completes the field test');assert(s.groundLoot.some(p=>insideTrainingPen(p.x,p.y)),'loot remains inside pen');assert.notEqual(tutorialObject('rat'),rat,'guide chooses a living rat');
nextWorldTimerCheck=0;updateWorldTimers(now+26000);assert.equal(rat.dead,0);assert.equal(rat.hp,rat.maxhp);assert(insideTrainingPen(rat.x,rat.y,1));assert.equal(objects.filter(o=>o.penId===pen.id&&o.dead<=time).length,15,'all 15 can respawn');
setupTutorialVillage();assert.equal(objects.filter(o=>o.penId===pen.id).length,15,'repeat setup does not duplicate rats');
console.log('PASS: 15 larger rats, complete fence collision, gate entry/exit and automatic closure, interruption safety, constrained roaming/combat, tutorial kills, loot and respawn.');
}`,ctx);
