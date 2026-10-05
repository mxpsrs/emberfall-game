const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../../client/index.html','utf8'),game=fs.readFileSync(__dirname+'/../../client/game.js','utf8'),view3d=fs.readFileSync(__dirname+'/../../client/view3d.js','utf8');
assert(!html.includes('action-controls.css')&&!html.includes('action-controls.js')&&!html.includes('id="actionControls"'),'direct-action layer is dormant');
assert(!game.includes('updateActionControls')&&!game.includes('directActionMode'),'the frame loop uses route movement only');
assert(!/function clickWorld3\([^]*?spiritsDialog/.test(view3d),'world taps do not dereference the removed spirits dialog');
const display=fs.readFileSync(__dirname+'/../../client/play-display.js','utf8');assert(!/Move with the pad|WASD move/.test(display),'live help does not advertise retired direct controls');assert.match(html,/Tap or click clear ground to move/);
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`{
 renderUI=renderAction=renderTutorial=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;cloudDisconnected=cloudConflict=false;s.character={name:'Click tester'};s.tutorial=tutorialSteps.length;activateScene('tutorial',43,55);
 let walked=null,selected=null;worldScreenPoint=()=>({x:0,y:0});unproject3=()=>({x:46.5,z:57.5});worldHits3=()=>[];walkTo=(x,y)=>{walked=[x,y];return true};clickWorld3({clientX:10,clientY:10});assert.deepEqual(walked,[46,57],'empty ground click routes movement');
 const object={name:'Training dummy',type:'dummy',x:44,y:55,hp:10,maxhp:10,dead:0};worldHits3=()=>[{o:object}];select=o=>selected=o;clickWorld3({clientX:10,clientY:10});assert.equal(selected,object,'object click selects the world target');
 const legacy={spirits:{brook:{state:'set'}},attunedSpirit:'brook',firstSpirit:'brook',spiritWardUntil:99,xp:{Worship:10},bag:{bones:2}};normalizeSpiritRemoval(legacy);assert(!('spirits' in legacy));assert(!('attunedSpirit' in legacy));assert.deepEqual(legacy.bag,{bones:2});assert.deepEqual(legacy.xp,{Worship:10});assert.equal(legacy.spiritRemovalVersion,1);
 console.log('PASS: point-and-click ground routing and object selection are live; the direct-action layer remains dormant and companion retirement stays save-safe.');
}`,ctx);
