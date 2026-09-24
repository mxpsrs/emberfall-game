const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(\`
renderAction=draw=drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
s.character={name:'Cook regression'};s.tutorialVersion=TUTORIAL_VERSION;s.tutorial=tutorialSteps.findIndex(t=>t.event==='talk-cooking');s.tutorialCompleted=tutorialSteps.slice(0,s.tutorial).map(t=>t.event);assetsReady=true;
activateScene('tutorial',29,64);
let now=0;Date.now=()=>now;
guide();
for(let i=0;i<3000&&!npcDialogueState;i++){now+=50;frame(now);}
assert(npcDialogueState,'one Show me where reaches Bram and opens his conversation through the closed kitchen door');
assert.equal(npcDialogueState.speaker.tutor,'cooking');
while(npcDialogueState.page<npcDialogueState.pages.length-1){npcDialogueState.page++;renderNpcDialogue();}
s.gear={};s.bag={logs:BAG_SIZE};s.tutorialGifts={};
npcDialogueState.choices.find(c=>c[0]==='Continue')[1]();
assert(!$('modal').open,'full bag closes the conversation so the player can make room');assert(s.tutorialBakingPending);assert.equal(tutorialStep().event,'talk-cooking');
s.bag.logs-=2;settleTutorialHandoffs();assert.equal(tutorialStep().event,'mix-dough');assert.equal(s.bag.flour,1);assert.equal(s.bag.jugWater,1);assert(!s.tutorialBakingPending);
settleTutorialHandoffs();assert.equal(s.bag.flour,1,'queued supplies are given once');
let modalCalls=0,nonmodalCalls=0;$('modal').showModal=()=>{modalCalls++;$('modal').open=true;};$('modal').show=()=>{nonmodalCalls++;$('modal').open=true;};
openNpcDialogue(tutorialTutor('cooking'),'Keep the world alive.',[['Continue',close]]);
assert.equal(nonmodalCalls,1);assert.equal(modalCalls,0,'conversation does not make the world inert');
assert(cameraInputAllowed({}),'camera is usable during a conversation');
const beforeTime=time,beforeYaw=view3d.yaw;cameraKeyDown({key:'ArrowRight',preventDefault:()=>{}});
for(let i=0;i<20;i++){now+=50;frame(now);}
assert(time>beforeTime+.8,'world simulation advances while speaking');assert.notEqual(view3d.yaw,beforeYaw,'camera rotates while speaking');cameraKeys.clear();
assert(npcDialogueState,'world updates preserve the conversation');close();
for(const panel of ['bank','equipment','workbench','generic','player-trade','creator']){
 if(panel==='bank')openBank();else if(panel==='equipment')openEquipment();else if(panel==='generic')dialog('Test menu','Menu stays open');else if(panel==='player-trade')window.playerTrade=true;else if(panel==='creator')$('creator').open=true;else {$('modal').open=true;window.realmWorkbench={kind:'cooking'};}
 const actor={id:999998,type:'villager',characterSprite:true,_stationary:true,x:43,y:51,drawX:42,drawY:51,homeX:43,homeY:51,dead:0};objects.push(actor);
 const started=time,drawX=actor.drawX;for(let i=0;i<20;i++){now+=50;frame(now);}
 assert(time>started+.8,panel+' does not pause world time');assert(actor.drawX>drawX,panel+' does not freeze NPC motion');
 if(panel!=='creator')assert(cameraInputAllowed({}),panel+' allows camera input');
 objects.splice(objects.indexOf(actor),1);window.playerTrade=false;$('creator').open=false;window.realmWorkbench=null;close();
}
console.log('PASS: single-request kitchen entry, full-bag recovery, non-modal dialogue, camera rotation and NPC/world simulation across interfaces.');
\`,ctx);`);
