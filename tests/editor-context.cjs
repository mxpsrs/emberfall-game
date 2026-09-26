const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const page=fs.readFileSync(path.join(root,'dist/editor/viewport.html'),'utf8');
const editorPage=fs.readFileSync(path.join(root,'dist/editor/index.html'),'utf8');
const build=fs.readFileSync(path.join(root,'scripts/build.mjs'),'utf8');
assert.match(editorPage,/src="\/editor\/viewport\.html"/);
assert.doesNotMatch(editorPage,/\/play\?editor/);
assert.match(page,/window\.VELDREN_CONTEXT="editor"/);
assert.match(page,/editor\/editor-startup\.js.*editor\/editor-entry\.js/);
assert.doesNotMatch(page,/src="native-runtime\.js"/,'editor does not load the gameplay WASM bridge');
assert.match(build,/editorViewport\?\(editorAllowed\?'\/editor\/viewport\.html'/);
assert.match(build,/\/editor\/editor-startup\.js/);

const events=[],frames=[];
const state={window:{VELDREN_CONTEXT:'editor',realmStartup:{failed:false},filamentReady:Promise.resolve(),VELDREN_WORLD_EDITS_READY:Promise.resolve(),VeldrenWorldEdits:{async applyFinishedWorld(){events.push('world-edits')}}},
 document:{hidden:false},art:{},px:0,py:0,target:{},assetsReady:false,last:0,time:0,
 performance:{now:()=>100},requestAnimationFrame(fn){frames.push(fn)},
 realmLoadStatus(){events.push('loading')},realmLoadImage:async path=>({path}),realmAssetURL:path=>path,
 loadRebuiltTextures:async()=>{events.push('textures')},fetch:async()=>({ok:true,json:async()=>({})}),
 setupExpandedWorld(){events.push('world')},setupTutorialVillage(){events.push('tutorial-scene')},setupLoot(){events.push('loot')},
 resize(){events.push('resize')},realmLoadComplete(){events.push('ready')},draw(){events.push('draw')},
 realmLoadFailure(message,error){throw error||Error(message)}
};
vm.createContext(state);
vm.runInContext(fs.readFileSync(path.join(root,'dist/editor/editor-startup.js'),'utf8'),state);
(async()=>{
 await state.bootEditor();
 assert.equal(state.px,55);assert.equal(state.py,50);assert.equal(state.target,null);
 assert.equal(state.assetsReady,true);
 assert.deepEqual(events.slice(-5),['tutorial-scene','loot','world-edits','resize','ready']);
 assert.equal(frames.length,1);
 frames.shift()(116);assert(events.includes('draw'));assert.equal(frames.length,1);
 assert.equal(state.window.realmStartup.failed,false);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'dist/game.js'),'utf8'),/async function bootEditor/);
 console.log('PASS: authenticated editor viewport has a dedicated, playerless startup and render loop.');
})().catch(error=>{console.error(error);process.exitCode=1});
