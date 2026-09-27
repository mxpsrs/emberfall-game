const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
const run=s=>vm.runInContext(s,ctx);ctx.document.readyState='complete';ctx.fetch=async()=>({ok:true,json:async()=>({edits:{version:1,revision:1,changes:[]}})});
for(const f of ['world-scene-format','building-assembly','building-runtime','terrain-editor-runtime','world-edits-runtime']){run(fs.readFileSync(__dirname+'/../dist/'+f+'.js','utf8'));if(f==='world-scene-format')run('window.VeldrenSceneFormat=VeldrenSceneFormat;');}
ctx.setInterval=()=>0;ctx.clearInterval=()=>{};
const oldGet=ctx.document.getElementById;
const retired=new Set(['waveButton','worldClock','onlineStatus','targetTitle','targetSub','activity','eat','runButton']);
ctx.document.getElementById=id=>retired.has(id)?null:oldGet(id);
run(fs.readFileSync(__dirname+'/../dist/multiplayer.js','utf8'));
run('stop();initGameIcons();');
run(`
renderUI=()=>{};renderAction=()=>{};draw=()=>{};drawPortrait=()=>{};
setupExpandedWorld();setupTutorialVillage();setupLoot();
window.VeldrenBuildings.install();
const A=VeldrenAssembly,B=window.VeldrenBuildings;
const scene=worldScenes.overworld;
activateScene('overworld',55,61,false);
const house=scene.buildings.find(b=>b.walkIn&&!b.civilCastle&&b.archetype==='house');assert(house,'existing house');
house._editorId='test-house';const assembly=B.ensure(house,scene);
assert(assembly.modules.length>10,'actual authored modules captured');
assert(assembly.modules.some(m=>m.role==='roof'));assert(assembly.modules.some(m=>m.role==='wall'));
const wall=assembly.modules.find(m=>m.role==='wall'&&/Straight$/.test(m.model));assert(wall);
const initial=A.serialize(assembly),history=new A.History();wall.local[3]+=.25;history.push(initial,assembly);const moved=A.serialize(assembly);
assert.notDeepEqual(initial,moved);B.attach(house,history.undo(moved),scene);assert.deepEqual(A.serialize(house.assembly),initial);
B.attach(house,history.redo(initial),scene);assert.deepEqual(A.serialize(house.assembly),moved);
const beforeService=[house.service.x,house.service.y],roofs=house.assembly.modules.filter(m=>m.role==='roof').length;
house.assembly.parent[3]+=5;B.commit(house);assert.equal(house.service.x,beforeService[0]+5);assert.equal(house.service.y,beforeService[1]);
assert.equal(B.rendered(house).instances.length,B.rendered(house).instances.length);assert.equal(house.assembly.modules.filter(m=>m.role==='roof').length,roofs);
const door=house.assembly.modules.find(m=>m.role==='entrance');assert(door&&door.destination===house.service.destination);
const oldHost=door.host;const other=house.assembly.modules.find(m=>m.role==='wall'&&m.id!==oldHost&&/Straight$/.test(m.model)&&m.floor===0);assert(other);
B.opening(house,door,other.id);B.commit(house);assert.equal(door.host,other.id);assert(/Door_Round/.test(other.model));
if(oldHost)assert(/Straight/.test(house.assembly.modules.find(m=>m.id===oldHost).model),'old opening filled');
assert.equal(house.service.destination,door.destination);const threshold=doorThreshold(house.service);house.service.openedAt=1;assert(!inBuilding(house,...threshold),'new entrance navigable');delete house.service.openedAt;assert(inBuilding(house,...threshold),'closed entrance collides');
// A placed stair must connect to an actual continuous upper deck. The deck
// keeps its original identity so walking across the landing retains height.
currentScene='overworld';objects.splice(0,objects.length,...scene.objects);buildings.splice(0,buildings.length,...scene.buildings);
const upstairs=scene.buildings.find(b=>b.walkIn&&b.civilUpper&&b.doorFacing==='south'&&b!==house);assert(upstairs,'authored upper floor');
const upperAssembly=B.ensure(upstairs,scene),deck=upstairs.civilUpper.decks[0],stairMesh=B.model('rebuilt:Stair_Interior_SolidExtended');assert(stairMesh);
const upperZ=deck.y+1.5,baseZ=upperZ-upstairs.y-stairMesh.bounds[0][2];
const stair={id:'test-placed-stair',model:'rebuilt:Stair_Interior_SolidExtended',role:'stairs',floor:0,local:A.transform(deck.x+1.5-upstairs.x,0,baseZ),bounds:A.clone(stairMesh.bounds),stairs:{fromFloor:0,toFloor:1,origin:[0,0,baseZ],rampPath:null}};
const connection=B.stairConnection(upstairs,stair);assert(connection,'stair actually meets existing deck');assert.equal(connection.structure,upstairs.civilUpper);
const wrong={...A.clone(stair),id:'unsupported-stair',local:A.transform(2.5,0,2.5)};assert.equal(B.stairConnection(upstairs,wrong),null,'unsupported stairs do not create fictional floors');
const moveX=2,lowZ=connection.line.az,highZ=connection.line.bz,midZ=(lowZ+highZ)/2;
const obstacles=[connection.line.ax,connection.line.ax+moveX].map((x,i)=>({id:990001+i,type:'prop',name:'Stair collision probe',x:Math.floor(x),y:Math.floor(midZ),sprite:12,dead:0}));
for(const o of obstacles){scene.objects.push(o);if(scene.objects!==objects)objects.push(o);}
realmNavigation.delete('overworld');const nav=realmNav(),oldId=Math.floor(midZ)*nav.w+Math.floor(connection.line.ax),newId=oldId+moveX;
assert.equal(nav.cells[oldId],1);assert.equal(nav.cells[newId],1);
const withoutStair=A.serialize(upperAssembly);upperAssembly.modules.push(stair);B.commit(upstairs);
assert.equal(civilWalkableArchitectureAt(connection.line.ax,midZ)?.structure,upstairs.civilUpper);
assert.equal(civilWalkableArchitectureAt(connection.line.ax,midZ)?.kind,'ramp');assert.equal(nav.cells[oldId],0,'new ramp opens occupied path');
stair.local[3]+=moveX;B.commit(upstairs);assert.equal(nav.cells[oldId],1,'old ramp cell restored after moving');assert.equal(nav.cells[newId],0,'new ramp cell opened');
const withStair=A.serialize(upstairs.assembly);upstairs.assembly.modules=upstairs.assembly.modules.filter(m=>m.id!==stair.id);B.commit(upstairs);assert.equal(nav.cells[newId],1,'new ramp cell restored on delete');
B.attach(upstairs,withStair,scene);assert.equal(blocked(Math.floor(connection.line.ax+moveX),Math.floor(midZ)),false,'saved attach reopens cached route without commit');B.commit(upstairs);assert.equal(nav.cells[newId],0,'reattached stair opens route');
B.attach(upstairs,withoutStair,scene);B.commit(upstairs);assert.equal(nav.cells[newId],1);
const homeScene=currentScene;currentScene='firstlight';B.attach(upstairs,withStair,scene);currentScene=homeScene;
assert.equal(civilWalkableArchitectureAt(connection.line.ax+moveX,midZ)?.structure,upstairs.civilUpper,'saved overworld stairs restore when player starts elsewhere');
assert.equal(blocked(Math.floor(connection.line.ax+moveX),Math.floor(midZ)),false,'off-scene saved attach invalidates cached navigation');
B.attach(upstairs,withoutStair,scene);B.commit(upstairs);assert.equal(nav.cells[newId],1,'undo removes stair route');
for(const o of obstacles){scene.objects.splice(scene.objects.indexOf(o),1);if(scene.objects!==objects)objects.splice(objects.indexOf(o),1);}realmNavigation.delete('overworld');
const saved=A.serialize(house.assembly);B.attach(house,JSON.parse(JSON.stringify(saved)),scene);assert.deepEqual(A.serialize(house.assembly),saved,'deterministic reload');
const source={id:'a',model:'rebuilt:Wall_UnevenBrick_Straight',role:'wall',floor:0,local:A.identity(),bounds:[[0,0,0],[2,3,.3]]},candidate={...A.clone(source),id:'b',local:A.transform(2.2,0,0)};
const snapped=A.snap({modules:[source]},candidate,{grid:.25,mode:'edge'});assert.equal(snapped.module.local[3],2);assert.equal(snapped.host,'a');
const edits=window.VeldrenWorldEdits,obj=scene.objects.find(o=>o.type==='tree'),ox=obj.x;
const editDoc={version:1,revision:2,changes:[null,{scene:'overworld',kind:'object',id:'missing-entity',x:1,y:1},{scene:'overworld',kind:'object',id:String(obj.id),x:ox+5,y:obj.y},{scene:'overworld',kind:'building',id:'test-house',x:house.x,y:house.y,assembly:saved}]};
edits.applyDocument(editDoc);assert.equal(obj.x,ox+5);edits.applyDocument(editDoc);assert.equal(obj.x,ox+5);assert.equal(house.service.x,A.point(saved.parent,saved.modules.find(m=>m.role==='entrance').opening.service)[0]);
assert(window.VELDREN_WORLD_EDITS_STATUS.rejected>0);assert(window.VELDREN_WORLD_EDITS_STATUS.unmatched>0);
console.log('PASS: actual house modules, local transforms, snap, linked entrance/opening, parent move, roof count, undo/redo, serialization, isolated bad/stale edits and idempotence.');
`);

// The editor now requires the canonical native command owner. Its former
// native-disabled RuntimeBinding mock did not exercise the production editor.
// Verify the same building projection writes through real WASM and shared history.
require('./editor-building-history.cjs');
