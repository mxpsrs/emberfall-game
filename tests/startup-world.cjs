const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
const run=source=>vm.runInContext(source,ctx);
ctx.setInterval=()=>0;ctx.clearInterval=()=>{};ctx.document.readyState='complete';
const get=ctx.document.getElementById,retired=new Set(['waveButton','worldClock','onlineStatus','activity','targetTitle','targetSub','eat','runButton']);
ctx.document.getElementById=id=>retired.has(id)?null:get(id);
ctx.fetch=async url=>({ok:true,json:async()=>String(url).includes('edits')?{edits:{version:1,revision:1,changes:[null,{scene:'overworld',kind:'object',id:'stale-test',x:0,y:0}]}}:{}});
ctx.requestAnimationFrame=fn=>{if(fn.name==='frame')return;fn(0)};
for(const f of ['multiplayer','building-assembly','building-runtime','world-scene-format','world-edits-runtime'])run(fs.readFileSync(__dirname+'/../dist/'+f+'.js','utf8'));
// A browser's window is globalThis. The shared fixture keeps a separate window
// object, so expose the format API there as the real page does.
ctx.window.VeldrenSceneFormat=ctx.VeldrenSceneFormat;
run(`
const startupStages=[];window.realmStartup={failed:false};
realmLoadStatus=()=>{};realmSetStartupStage=stage=>startupStages.push(stage);
realmStartupTask=async(stage,task)=>task();realmLoadFailure=(message,error)=>{throw error};realmLoadComplete=()=>{window.realmStartup.finished=true};
ensureGameLogin=async()=>{};window.realmNativeReady=Promise.resolve();window.filamentReady=Promise.resolve();initializeCloud=async()=>{};loadRebuiltTextures=async()=>{};realmLoadImage=async()=>({});realmAssetURL=x=>x;
// Graphics have a separate real Filament runtime test. Keep the actual world,
// tutorial and persistence code here; stub only presentation and network.
initHud=()=>{};resize=()=>{};renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};draw=()=>{};drawPortrait=()=>{};maybeShowStoryOpening=()=>{};save=()=>{};
s.character={name:'Startup test'};
`);
(async()=>{
 await run('boot()');
 run(`assert(window.realmStartup.finished);assert(!window.realmStartup.failed);assert(worldScenes.overworld);assert(worldScenes.tutorial);assert.deepEqual(startupStages,['world-generation','tutorial-generation','editor-world','hud-init','first-draw']);assert(window.VELDREN_WORLD_EDITS_STATUS.rejected===1);assert(window.VELDREN_WORLD_EDITS_STATUS.unmatched===1);stop();initGameIcons();`);
 console.log('PASS: actual world/tutorial construction, startup stage sequence, rejected and stale edits, deleted DOM, multiplayer initialization and startup completion.');
})().catch(error=>{console.error(error);process.exitCode=1});
