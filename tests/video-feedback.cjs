const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;s.character={name:'Video review'};s.tutorial=38;s.tutorialReward=true;activateScene('story_mine',25,86);
screen={w:800,h:390};$('modal').open=$('creator').open=$('spiritsDialog').open=false;
let feedbackNow=100;performance.now=()=>feedbackNow;let walked=null,selected=null;
const oldWalk=walkTo,oldSelect=select,oldPick=unproject3;walkTo=(x,y)=>{walked=[x,y];return true};select=o=>selected=o;unproject3=()=>({x:25.5,z:80.5});hitboxes=[];
clickWorld3({clientX:100,clientY:120});assert.deepEqual(walked,[25,80]);assert.equal(worldClickFeedback.interaction,false);assert.equal(worldClickFeedback.x,100);assert.equal(worldClickFeedback.y,120);
const cart=objects.find(o=>o.name==='Freight rail cart');hitboxes=[{x:80,y:100,w:40,h:40,o:cart,depth:1}];clickWorld3({clientX:100,clientY:120});assert.equal(selected,cart);assert.equal(worldClickFeedback.interaction,true);
feedbackNow+=700;drawWorldClick();assert.equal(worldClickFeedback,null,'marker expires');
$('modal').open=true;clickWorld3({clientX:100,clientY:120});assert.equal(worldClickFeedback,null,'modal taps never click the world');$('modal').open=false;
walkTo=oldWalk;select=oldSelect;unproject3=oldPick;
// Actual projected floor points round-trip at all camera angles in the recording.
for(const yaw of [-2,-.55,0,1.5,3]){view3d.yaw=yaw;for(const [x,z]of [[25.5,86.5],[23.5,84.5],[28.5,82.5]]){const q=project3(x,0,z),p=unproject3(q.x,q.y);assert(Math.hypot(p.x-x,p.z-z)<.001);}}
for(const key of ['lift','airway','support','bera','oren']){const o=mainStoryObject(key);assert(route(o.x,o.y,true,1.45,25,86)!==null,key+' reachable from mine entrance');}
// Restored boulders keep a stable full footprint; nearby floor cells are blocked.
const originalEmit=briarEmit,emitted=[];briarEmit=(r,mesh,m)=>emitted.push({mesh,m});view3d.yaw=0;px=25;py=86;drawRealmWall({face(){}},19,80);assert(emitted.length);assert(lairRockBlocked('story_mine',20,80),'rock shoulder blocks adjacent floor');const first=emitted[0].m;emitted.length=0;view3d.yaw=Math.PI;drawRealmWall({face(){}},19,80);const second=emitted[0].m;for(const i of [0,2,3,8,10,11])assert.equal(first[i],second[i],'camera cutaway preserves horizontal geometry');briarEmit=originalEmit;
activateScene('overworld',55,61);const nav=realmNav();for(const o of objects.filter(o=>o.lairEntrance&&o.passageKind!=='ladder')){assert(lairEntranceBlocked(o,o.x-4,o.y-.5),'outcrop is solid');assert(realmCellBlocked(nav,o.y*nav.w+o.x-4),'navigation blocks outcrop');assert(!lairEntranceBlocked(o,o.x+.5,o.y+1.5),'doorway remains clear');assert(route(o.x,o.y,true,1.45)!==null,o.name+' remains accessible');}
console.log('PASS: yellow walk / red interaction click positions, expiry, modal suppression, mine floor picking at five angles, all rescue objectives reachable, restored wall shoulders with stable collision and every cave entrance accessible with solid rocks.');
`,ctx);
