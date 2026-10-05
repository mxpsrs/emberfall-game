const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../..');
const page=fs.readFileSync(path.join(root,'client/editor/viewport.html'),'utf8');
const editorPage=fs.readFileSync(path.join(root,'client/editor/index.html'),'utf8');
const build=fs.readFileSync(path.join(root,'scripts/build.mjs'),'utf8');
assert.match(editorPage,/src="\/editor\/viewport\.html"/);
assert.doesNotMatch(editorPage,/\/play\?editor/);
assert.match(page,/window\.VELDREN_CONTEXT="editor"/);
assert.match(page,/editor\/editor-startup\.js.*editor\/editor-entry\.js/);
assert.match(page,/src="native-runtime\.js"/,'editor schedules its scene-only native core');
assert.match(build,/editorViewport\?\(editorAllowed\?'\/editor\/viewport\.html'/);
assert.match(build,/\/editor\/editor-startup\.js/);

const events=[],frames=[];
const state={window:{VELDREN_CONTEXT:'editor',realmStartup:{failed:false},filamentReady:Promise.resolve(),realmNativeReady:Promise.resolve(),VELDREN_WORLD_EDITS_READY:Promise.resolve(),VeldrenWorldEdits:{async applyFinishedWorld(){events.push('world-edits')}}},
 document:{hidden:false},art:{},px:0,py:0,target:{},assetsReady:false,last:0,time:0,
 currentScene:'tutorial',worldScenes:{overworld:{objects:[],buildings:[]}},objects:[],buildings:[],resetLandSurface(){events.push('terrain-reset')},
 VeldrenPrebuiltWorld:{load:async()=>true,nativeReady:true,activateNative:async()=>true},realmStartupStep:async(message,p,stage,fn)=>fn(),
 performance:{now:()=>100},requestAnimationFrame(fn){frames.push(fn)},
 realmLoadStatus(){events.push('loading')},realmLoadImage:async path=>({path}),realmAssetURL:path=>path,
 loadRebuiltTextures:async()=>{events.push('textures')},fetch:async()=>({ok:true,json:async()=>({})}),
 setupExpandedWorld(){events.push('world')},setupTutorialVillage(){events.push('tutorial-scene')},setupLoot(){events.push('loot')},
 resize(){events.push('resize')},realmLoadComplete(){events.push('ready')},draw(){events.push('draw')},
 realmLoadFailure(message,error){throw error||Error(message)}
};
state.window.VeldrenEditorBridge={async initialize(){events.push('controls-ready')},isReady:()=>true,adoptCanonicalDocument(){}};
for(const name of ['VeldrenQuarryScene','VeldrenServiceScene'])state.window[name]={capture(){events.push(name+':capture')},async migrate(){events.push(name+':migrate')}};
vm.createContext(state);
vm.runInContext(fs.readFileSync(path.join(root,'client/editor/editor-startup.js'),'utf8'),state);
(async()=>{
 await state.bootEditor();
 assert.equal(state.px,55);assert.equal(state.py,50);assert.equal(state.target,null);
 assert.equal(state.assetsReady,true);
 assert.equal(state.currentScene,'overworld');assert(events.indexOf('controls-ready')<events.indexOf('ready'),'loading remains until controls initialize');
 for(const name of ['VeldrenQuarryScene','VeldrenServiceScene'])assert(events.includes(name+':capture'));

 assert.equal(frames.length,1);
 frames.shift()(116);assert(events.includes('draw'));assert.equal(frames.length,1);
 assert.equal(state.window.realmStartup.failed,false);
 events.length=0;state.assetsReady=false;delete state.window.VeldrenEditorBridge;await assert.rejects(state.bootEditor(),/Editor controls did not load/);assert(!events.includes('ready'),'failed controls never hide loading');
 assert.doesNotMatch(fs.readFileSync(path.join(root,'client/game.js'),'utf8'),/async function bootEditor/);
 console.log('PASS: authenticated editor viewport has a dedicated, playerless startup and render loop.');
})().catch(error=>{console.error(error);process.exitCode=1});

// Exercise the actual outer-page loader while the iframe is still parsing.
const outer=fs.readFileSync(path.join(root,'client/editor/editor.js'),'utf8');
let appended=0,timers=0;const win={},doc={readyState:'loading',getElementById:()=>null,createElement:()=>({}),body:{appendChild(){appended++;}}};
const loader={frame:{contentWindow:win,contentDocument:doc},setTimeout(){timers++},connect(){},waitForBridge(){},status:{},log(){}};vm.createContext(loader);
vm.runInContext(outer.slice(outer.indexOf(' function injectBridge(){'),outer.indexOf(' function waitForBridge(){'))+';injectBridge();',loader);assert.equal(appended,0);
doc.readyState='interactive';vm.runInContext('injectBridge()',loader);assert.equal(appended,0);win.VeldrenAssembly={};win.VeldrenBuildings={};vm.runInContext('injectBridge()',loader);assert.equal(appended,1);assert.equal(timers,2);
