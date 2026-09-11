const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

for(const f of ['view3d','art-direction','renderer-gl','kingdoms','realm-models'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};s.sceneId='realm_aelindor_25';s.x=12;s.y=10;s.returnPoint=[131,178];setupExpandedWorld();setupSpirits();setupLoot();
assert.equal(currentScene,'realm_aelindor_25');assert.equal(s.x,12);assert.equal(s.y,10);leaveInterior();assert.equal(currentScene,'overworld');assert.equal(s.x,131);
assert.deepEqual(sceneSize(),[384,256]);assert.equal(SETTLEMENTS.filter(t=>t.kind==='city').length,6);assert.equal(SETTLEMENTS.filter(t=>t.kind==='village').length,7);
const towns=worldScenes.overworld.buildings;let total=0;
for(const t of SETTLEMENTS){const list=towns.filter(b=>b.settlement===t.id);assert(list.length>=(t.kind==='city'?25:5),t.id+' building count '+list.length);total+=list.length;assert(route(...realmDestination(t),false,1.45,14,17),t.name+' is connected');for(const b of list){assert(b.service?.destination,b.name+' has an entrance');assert(worldScenes[b.service.destination],b.name+' has an interior');assert(route(b.service.x,b.service.y,true,1.45,...realmDestination(t)),b.name+' is reachable');}}
for(const k of KINGDOMS)assert(towns.some(b=>b.kingdom===k.id&&b.archetype==='castle'),k.name+' castle');
assert(worldScenes.mine.objects.some(o=>o.race==='dwarf'));assert(worldScenes.realm_ironhollow_5.objects.some(o=>o.race==='dwarf'));assert(worldScenes.realm_aelindor_0.objects.some(o=>o.race==='elf'));
for(const info of realmSceneInfo.values()){activateScene(info.id,undefined,undefined,false);assert(land(...worldScenes[info.id].entry),info.id+' valid spawn');const exit=worldScenes[info.id].exit;assert(route(exit.x,exit.y,true),info.id+' exit path');}
let faces=0;const recorder={face(p,c){faces++;assert(p.length>=3);assert(p.every(a=>a.every(Number.isFinite)));assert(/^#[0-9a-f]{6}$/i.test(c),c);}};
for(const detail of [.5,1]){meshDetail3=detail;for(const b of towns)building3(recorder,b);for(const race of ['human','elf','dwarf'])for(const weapon of ['bronzeSword','shortbow','oakStaff'])humanoid3(recorder,0,0,1,{body:'leatherArmor',head:'ironHelm',feet:'leatherBoots',shield:'ironShield',weapon,_race:race},.7,1,.5);}
activateScene('overworld',126,38,false);screen={w:900,h:400};assetsReady=true;draw3d();assert(hitboxes.some(h=>h.building));
console.log(JSON.stringify({pass:true,kingdoms:KINGDOMS.length,cities:6,villages:7,settlementBuildings:total,castles:towns.filter(b=>b.archetype==='castle').length,interiors:realmSceneInfo.size,validatedModelFaces:faces}));
`,ctx);
