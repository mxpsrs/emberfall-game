'use strict';
const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
const run=source=>vm.runInContext(source,ctx);

ctx.document.hidden=false;
run(`
 const editorFrameCounters={draws:0,timers:0,movements:0,actors:0,world:0,saves:0,schedules:0};
 window.VeldrenEditorBridge={isReady:()=>true};
 assetsReady=true;s.character={name:'Editor test'};cloudReady=true;
 assert.equal(cloudDirty,false);queueCloudSave();
 assert.equal(cloudDirty,false,'editor actions must not queue character saves');
 queueCloudSave=()=>editorFrameCounters.saves++;
 save();assert.equal(editorFrameCounters.saves,0,'pagehide/visibility/boot saves are inert in editor mode');
 updateWorldTimers=()=>editorFrameCounters.timers++;
 updateCameraKeys=()=>{};observeRenderTime=()=>{};
 observeTutorialCamera=()=>{};updatePlayerAction=()=>{};updateTrainingGate=()=>{};updateCombat=()=>{};
 advanceMovement=()=>{editorFrameCounters.movements++;return false};
 advanceWorldActors=()=>editorFrameCounters.actors++;
 livingWorld=()=>editorFrameCounters.world++;
 draw=()=>editorFrameCounters.draws++;
 time=4;saveClock=11;last=990;nextFrameAt=0;
 frame(1000);frame(1017);
 assert.equal(editorFrameCounters.draws,2,'editor camera renders one frame for each scheduled visual tick');
 assert(time>4,'visual animations continue while the editor camera moves');
 assert.equal(saveClock,11,'editor does not advance the character autosave clock');
 for(const key of ['timers','movements','actors','world','saves'])assert.equal(editorFrameCounters[key],0,'editor does not run '+key);
 window.VeldrenEditorBridge={isReady:()=>false};
 frame(1034);
 assert.equal(editorFrameCounters.draws,3,'gameplay still draws');
 for(const key of ['timers','movements','actors','world','saves'])assert.equal(editorFrameCounters[key],1,'gameplay still runs '+key);
 assert.equal(saveClock,0,'gameplay autosave clock is reset after saving');
`);
// A second tab's editor viewport must not overwrite the real player's
// account-scoped presence row in the shared-world API.
vm.runInContext(fs.readFileSync(__dirname+'/../dist/multiplayer.js','utf8'),ctx,{filename:'multiplayer.js'});
let presencePosts=0;
ctx.AbortSignal={timeout:()=>({})};
ctx.fetch=async()=>{presencePosts++;return {ok:true,status:200,json:async()=>({players:[],serverTime:Date.now()})};};
(async()=>{
 run(`window.VeldrenEditorBridge={isReady:()=>true};cloudDisconnected=false;cloudConflict=false;onlineScene='overworld';onlinePeers.set('old',{id:'old'});`);
 await run('syncOnlineWorldOnce()');
 run(`assert.equal(onlineScene,null);assert.equal(onlinePeers.size,0);`);
 ctx.assert.equal(presencePosts,0,'editor does not publish presence for the game account');
 run(`window.VeldrenEditorBridge={isReady:()=>false};cloudDisconnected=false;cloudConflict=false;`);
 await run('syncOnlineWorldOnce()');
 ctx.assert.equal(presencePosts,1,'normal gameplay still publishes presence');
 console.log('PASS: editor renders visual frames without gameplay simulation or saves and does not replace a playing tab’s presence.');
})().catch(error=>{console.error(error);process.exitCode=1});
