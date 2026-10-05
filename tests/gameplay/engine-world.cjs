// Spatial lookup must preserve the original world, pick order and moving actors.
const fs=require('fs'),vm=require('vm'),{ctx}=require('../../scripts/qa/benchmark-desktop.cjs');
for(const f of ['trading','world-options','item-models','equipment-interface','item-use','tutorial-island','npc-dialogue','realm-story','lairs','encounters','briarhaven','game-audio'])vm.runInContext(fs.readFileSync(__dirname+'/../../client/'+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();s.tutorial=tutorialSteps.length;s.tutorialReward=true;
function verifyBounds(a,b,c,d){const expected=objects.filter(o=>o.x>=a&&o.x<=b&&o.y>=c&&o.y<=d),actual=worldObjectsInBounds(a,b,c,d);assert.deepEqual(actual,expected,'spatial lookup preserves every object and its original pick order');}
for(const scene of ['overworld','tutorial','mine','overworld']){
 activateScene(scene,42,51,false);const [w,h]=sceneSize();
 for(let i=0;i<30;i++){const x=(i*53)%w,y=(i*31)%h;verifyBounds(x-21,x+37,y-19,y+32);}
 const actor=worldActors().find(o=>!o._stationary);assert(actor);const old=[actor.x,actor.y];actor.x=17;actor.y=19;verifyBounds(16,20,16,20);assert(worldObjectsAt(17,19).includes(actor));[actor.x,actor.y]=old;
 const prop={type:'prop',x:18,y:18,name:'Index test'};objects.push(prop);verifyBounds(16,20,16,20);assert(worldObjectsAt(18,18).includes(prop));objects.splice(objects.indexOf(prop),1);assert(!worldObjectsAt(18,18).includes(prop));
 const moved=objects.find(o=>!worldActors().includes(o));const original=[moved.x,moved.y];moved.x=33;moved.y=33;resetLandSurface();verifyBounds(32,35,32,35);[moved.x,moved.y]=original;resetLandSurface();
}
activateScene('overworld',55,61,false);const actors=worldActors().slice(),nativeBatches=[];window.realmNative={stepActors(batch,dt,x,y,selected,clock){nativeBatches.push({batch:[...batch],dt,x,y,selected,clock});}};
const scenery=Array.from({length:10000},(_,i)=>({type:'prop',x:250+i%50,y:150+Math.floor(i/50),walkThrough:true}));objects.push(...scenery);advanceWorldActors(.016);assert.equal(nativeBatches.length,1,'world actors cross the native boundary once per frame');assert.deepEqual(nativeBatches[0].batch,actors,'the native core receives every live actor in stable order');assert(nativeBatches[0].batch.every(o=>!scenery.includes(o)),'ten thousand static props add no native movement work');verifyBounds(50,65,50,70);objects.splice(objects.length-scenery.length);delete window.realmNative;
// A fresh navigation map can be constructed without evaluating terrain on
// untouched tiles; the first query resolves exact production terrain collision.
realmNavigation.delete(currentScene);const oldWall=worldWall;let wallCalls=0;
worldWall=(...args)=>{wallCalls++;return oldWall(...args);};
const nav=realmNav();assert.equal(wallCalls,0);assert(nav.cells.filter(v=>v===2).length>nav.cells.length*.5);
for(const [x,y]of [[0,0],[1,1],[111,52],[111,60],[121,52],[200,170],[300,220]]){const id=y*nav.w+x;if(nav.cells[id]!==2)continue;const expected=Number(!!(oldWall(x,y)||water(x,y)||terrainCellBlocked(x,y)));assert.equal(realmCellBlocked(nav,id),expected);const before=wallCalls;realmCellBlocked(nav,id);assert.equal(wallCalls,before,'resolved terrain is cached');}
worldWall=oldWall;
console.log('PASS: mainland/tutorial/mine spatial equivalence, stable pick order, live actor positions, add/remove/relocation invalidation, static-prop movement cost and lazy exact terrain collision.');
`,ctx);
