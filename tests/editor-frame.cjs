'use strict';
const assert=require('node:assert/strict');
const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
const run=source=>vm.runInContext(source,ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../dist/editor/editor-startup.js','utf8'),ctx,{filename:'editor-startup.js'});

ctx.document.hidden=false;
run(`
 const editorFrameCounters={draws:0,timers:0,movements:0,actors:0,world:0,saves:0,schedules:0};
 window.VELDREN_CONTEXT='editor';
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
 editorFrame(1000);editorFrame(1017);
 assert.equal(editorFrameCounters.draws,2,'editor camera renders one frame for each scheduled visual tick');
 assert(time>4,'visual animations continue while the editor camera moves');
 assert.equal(saveClock,11,'editor does not advance the character autosave clock');
 for(const key of ['timers','movements','actors','world','saves'])assert.equal(editorFrameCounters[key],0,'editor does not run '+key);
 window.VELDREN_CONTEXT='runtime';nextFrameAt=0;
 frame(1034);
 assert.equal(editorFrameCounters.draws,3,'gameplay still draws');
 for(const key of ['timers','movements','actors','world','saves'])assert.equal(editorFrameCounters[key],1,'gameplay still runs '+key);
 assert.equal(saveClock,0,'gameplay autosave clock is reset after saving');
`);
const failures=[];ctx.realmReportRuntimeFailure=(error,stage)=>failures.push({message:error.message,stage});
let schedules=0;ctx.requestAnimationFrame=()=>schedules++;
run("window.VELDREN_CONTEXT='editor';assetsReady=true;");
ctx.window.VeldrenEditorBridge={prepareFrame(){throw Error('Temporary preparation failure');}};
ctx.editorFrame(1050);assert.equal(schedules,1);assert.equal(failures[0].stage,'editor-preparation');
ctx.window.VeldrenEditorBridge={prepareFrame(){}};ctx.draw=()=>{throw Error('Temporary draw failure');};
ctx.editorFrame(1067);assert.equal(schedules,2);assert.equal(failures[1].stage,'editor-render');
let recoveredDraws=0;ctx.draw=()=>recoveredDraws++;ctx.editorFrame(1084);
assert.equal(schedules,3);assert.equal(recoveredDraws,1,'the next editor frame recovers after either failure');
// A second tab's editor viewport must not overwrite the real player's
// account-scoped presence row in the shared-world API.
vm.runInContext(fs.readFileSync(__dirname+'/../dist/multiplayer.js','utf8'),ctx,{filename:'multiplayer.js'});
let presencePosts=0;
ctx.AbortSignal={timeout:()=>({})};
ctx.fetch=async()=>{presencePosts++;return {ok:true,status:200,json:async()=>({players:[],serverTime:Date.now()})};};
(async()=>{
 run(`window.VELDREN_CONTEXT='editor';cloudDisconnected=false;cloudConflict=false;onlineScene='overworld';onlinePeers.set('old',{id:'old'});`);
 await run('syncOnlineWorldOnce()');
 run(`assert.equal(onlineScene,null);assert.equal(onlinePeers.size,0);`);
 ctx.assert.equal(presencePosts,0,'editor does not publish presence for the game account');
 run(`window.VELDREN_CONTEXT='runtime';cloudDisconnected=false;cloudConflict=false;`);
 await run('syncOnlineWorldOnce()');
 ctx.assert.equal(presencePosts,1,'normal gameplay still publishes presence');
 console.log('PASS: editor renders visual frames without gameplay simulation or saves and does not replace a playing tab’s presence.');
})().catch(error=>{console.error(error);process.exitCode=1});
