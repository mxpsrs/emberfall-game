const assert=require('node:assert/strict');
const {ctx,vm,fs,els,el,data,noop,root}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};s.sceneId='realm_aelindor_25';s.x=12;s.y=10;s.returnPoint=[131,178];setupExpandedWorld();setupSpirits();setupLoot();
assert.equal(currentScene,'overworld');const restoredPalace=buildings.find(b=>b.service?.destination==='realm_aelindor_25');assert(withinWalkIn(restoredPalace,s.x,s.y),'old room save resumes inside its physical palace');assert(restoredPalace.service.openedAt!==undefined,'restored character has an exit');assert(route(...doorApproach(restoredPalace.service,false)));activateScene('overworld',42,51);
assert.deepEqual(sceneSize(),[1152,768]);assert.equal(SETTLEMENTS.filter(t=>t.kind==='city').length,6);assert.equal(SETTLEMENTS.filter(t=>t.kind==='village').length,7);
const towns=worldScenes.overworld.buildings;let total=0;
// Connectivity spans the expanded continent, beyond one click's 45,000-cell
// pathfinding budget. Resolve lazy navigation cells and flood the mainland.
const nav=realmNav(),seen=new Uint8Array(nav.cells.length),queue=new Int32Array(nav.cells.length);let head=0,tail=0;queue[tail++]=51*nav.w+42;seen[queue[0]]=1;
while(head<tail){const id=queue[head++],x=id%nav.w,y=Math.floor(id/nav.w);for(const [dx,dy]of [[0,-1],[0,1],[-1,0],[1,0]]){const nx=x+dx,ny=y+dy,next=ny*nav.w+nx;if(nx<1||ny<1||nx>=nav.w-1||ny>=nav.h-1||seen[next]||realmCellBlocked(nav,next))continue;seen[next]=1;queue[tail++]=next;}}
for(const t of SETTLEMENTS){const list=towns.filter(b=>b.settlement===t.id);assert(list.length>=(t.kind==='city'?25:5),t.id+' building count '+list.length);total+=list.length;const [tx,ty]=realmDestination(t);assert(seen[ty*nav.w+tx],t.name+' is connected');for(const b of list){assert(b.service?.destination,b.name+' has an entrance');assert(b.walkIn||worldScenes[b.service.destination],b.name+' has a physical room or interior');const [ax,ay]=b.walkIn?doorApproach(b.service,false):[b.service.x,b.service.y+1];assert(seen[ay*nav.w+ax],b.name+' entrance connects to mainland');assert(route(b.service.x,b.service.y,true,1.45,ax,ay),b.name+' is reachable');}}
for(const k of KINGDOMS)assert(towns.some(b=>b.kingdom===k.id&&b.archetype==='castle'),k.name+' castle');
assert(worldScenes.mine.objects.some(o=>o.race==='dwarf'));assert(towns.some(b=>b.settlement==='ironhollow'&&b.race==='dwarf'));assert(towns.some(b=>b.settlement==='aelindor'&&b.race==='elf'));
for(const info of [...realmSceneInfo.values()].filter(info=>worldScenes[info.id])){activateScene(info.id,undefined,undefined,false);assert(land(...worldScenes[info.id].entry),info.id+' valid spawn');const exit=worldScenes[info.id].exit;assert(route(exit.x,exit.y,true),info.id+' exit path');}
let faces=0;const recorder={face(p,c){faces++;assert(p.length>=3);assert(p.every(a=>a.every(Number.isFinite)));assert(/^#[0-9a-f]{6}$/i.test(c),c);}};
for(const detail of [.5,1]){meshDetail3=detail;for(const b of towns)building3(recorder,b);for(const race of ['human','elf','dwarf'])for(const weapon of ['bronzeSword','shortbow','oakStaff'])humanoid3(recorder,0,0,1,{body:'leatherArmor',head:'ironHelm',feet:'leatherBoots',shield:'ironShield',weapon,_race:race},.7,1,.5);}
activateScene('overworld',42,51,false);screen={w:900,h:400};assetsReady=true;draw3d();assert(hitboxes.some(h=>h.building));
console.log(JSON.stringify({pass:true,kingdoms:KINGDOMS.length,cities:6,villages:7,settlementBuildings:total,castles:towns.filter(b=>b.archetype==='castle').length,interiors:realmSceneInfo.size,validatedModelFaces:faces}));
`,ctx);
