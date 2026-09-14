const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
vm.runInContext(fs.readFileSync('dist/multiplayer.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('dist/shared-world.js','utf8'),ctx);
vm.runInContext(`
draw=()=>{};drawPortrait=()=>{};$('panelBody').prepend=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
renderUI=()=>{};renderAction=()=>{};renderEncounterHud=()=>{};save=()=>{};playGameSound=()=>{};
const catalog=JSON.parse(CATALOG);let checked=0;
for(const [scene,w]of Object.entries(worldScenes))for(const o of w.objects){if(!sharedEntity(o))continue;const e=catalog.entities[scene+':'+o.id];assert(e,'shared entity exists '+scene+':'+o.id);assert.equal(e.x,o.building?.walkIn?o.x:o.homeX??o.x,'stable x '+o.name);assert.equal(e.y,o.building?.walkIn?o.y:o.homeY??o.y,'stable y '+o.name);checked++;}
assert(checked>1400);
assetsReady=true;cloudReady=true;cloudDirty=false;cloudBusy=false;s.character={name:'Tester',look:0};s.bag={};s.gear={};
const rat=objects.find(o=>o.kind==='rat'),scene=currentScene;assert(rat);px=s.x=rat.x;py=s.y=rat.y;
let state={entity:String(rat.id),hp:rat.maxhp,maxhp:rat.maxhp,x:rat.x,y:rat.y,generation:1,deadUntil:0,owner:'other',ownerUntil:Date.now()+5000,pose:null};
let revision=0;function receive(entities=[state],props=[],receipts=[]){entities=entities.map(e=>({...e,revision:++revision}));applySharedWorld({world:{protocol:1,actor:'self',serverTime:Date.now(),entities,objects:props,receipts}});}
receive();assert.equal(rat._sharedOwner,'other');assert.equal(rat._stationary,true);
const beforeKills=s.kills||0;receive([{...state,hp:0,deadUntil:Date.now()+25000}]);assert.equal(rat.hp,0);assert.equal(rat.dead,Infinity);assert.equal(s.kills||0,beforeKills,'remote kills grant no credit');
updateWorldTimers(Date.now()+100000);assert.equal(rat.dead,Infinity,'local timer cannot respawn shared enemy');
receive([{...state,generation:2}]);assert.equal(rat.dead,0);assert.equal(rat.hp,rat.maxhp);
const loot={id:'drop-1',kind:'loot',items:{bones:1},x:px,y:py,expiresAt:Date.now()+120000};receive([state],[loot]);let pile=s.groundLoot.find(p=>p._sharedObject==='drop-1');assert(pile);
takeGroundItem(pile,'bones');assert.equal(s.bag.bones||0,0,'pickup waits for server claim');const request=s.sharedOutbox.find(e=>e.kind==='pickup');assert(request);
receive([state],[],[{id:request.id,kind:'pickup',ok:true,item:'bones',count:1}]);assert.equal(s.bag.bones,1);assert(!s.groundLoot.some(p=>p._sharedObject==='drop-1'));
receive([state],[],[{id:request.id,kind:'pickup',ok:true,item:'bones',count:1}]);assert.equal(s.bag.bones,1,'repeated receipt cannot award twice');
const fire={id:'fire-1',kind:'fire',logType:'normal',x:px,y:py,expiresAt:Date.now()+150000};receive([state],[fire]);assert(objects.some(o=>o._sharedObject==='fire-1'&&o.cooking));receive();assert(!objects.some(o=>o._sharedObject==='fire-1'),'expired shared fire removed');
const g=sharedPeerGear({action:{kind:'gather',type:'tree',tool:'axe',started:Date.now()-600,duration:2400}});assert.equal(g._peerAction.gathering.tool,'axe');assert(g._peerAction.gathering.phase>0);
const cast=sharedPeerGear({action:{kind:'teleport',color:'red',started:Date.now()-200,duration:2600}});assert.equal(cast._castColor,'#ff6464');assert(Number.isFinite(cast._castAt));
assert(Number.isFinite(sharedPeerGear({action:{kind:'combat',started:Date.now()-100,duration:1200}})._attackAt));
const before=s.sharedOutbox.length;resolveHit(rat,99,'melee',0,'balanced',999);assert.equal(s.sharedOutbox.length,before,'stale projectile generation rejected by client');
console.log('PASS: '+checked+' stable entity identities, remote death without credit, server respawn, receipt replay protection, real pickup application, shared fire lifecycle, remote gathering/combat/red teleport animation state.');
`,Object.assign(ctx,{CATALOG:fs.readFileSync('worker/shared-catalog.json','utf8')}));
