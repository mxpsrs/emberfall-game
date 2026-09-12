const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createCanvas,Path2D}=require('@napi-rs/canvas');
const {ctx,els}=require('../scripts/benchmark-desktop.cjs');ctx.Path2D=Path2D;ctx.assert=assert;
const oldCreate=ctx.document.createElement;ctx.document.createElement=type=>type==='canvas'?createCanvas(64,64):oldCreate(type);
for(const file of ['game-icons','map-icons'])vm.runInContext(fs.readFileSync('dist/'+file+'.js','utf8'),ctx);
const canvas=createCanvas(300,300);Object.assign(ctx.document.getElementById('minimap'),{width:300,height:300,getContext:()=>canvas.getContext('2d'),getBoundingClientRect:()=>({left:800,top:10,width:140,height:140})});
vm.runInContext(`{
renderAction=()=>{};renderTutorial=()=>{};renderUI=()=>{};save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;s.character={name:'Map reader',frame:'male'};activateScene('overworld',43,52);
const entries=collectMapServices(),tutors=entries.filter(e=>e.tags.includes('tutor'));assert.equal(tutors.length,9);assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
const shop=entries.find(e=>e.name==='Mara’s General Store');assert(shop);assert(shop.tags.includes('weapons')&&shop.tags.includes('armour'));assert(shopStock.some(([id])=>ITEMS[id]?.slot==='weapon'));assert(shopStock.some(([id])=>ITEMS[id]?.slot==='shield'||ITEMS[id]?.slot==='body'));
assert(!entries.filter(e=>e.kind==='forge').some(e=>e.tags.includes('shop')),'anvils are not invented stores');
const bank=entries.find(e=>e.kind==='bank');assert(bank.tags.includes('tutor'));assert.equal(entries.filter(e=>e.building===bank.building).length,1,'bank and tutor share one marker');
delete bank.building.service.openedAt;let goal=mapTravelGoal(bank);assert.equal(goal.target,bank.building.service);assert(goal.door);assert.equal(goal.label,'Go to entrance');
setWalkInDoor(bank.building.service,true,true);assert.equal(mapTravelGoal(bank).target,bank.target,'open entrance routes to the actual banker');
const other=shop.building;px=shop.x;py=shop.y;delete other.service.openedAt;goal=mapTravelGoal(bank);assert.equal(goal.target,other.service,'closed room must be exited first');assert.equal(goal.y,other.service.y-2);
activateScene('overworld',43,52);drawMinimap();assert(miniServiceMarkers.length>=6);const marker=miniServiceMarkers.find(m=>m.entry.tags.includes('tutor')),rect=$('minimap').getBoundingClientRect(),x=rect.left+marker.x*rect.width/300,y=rect.top+marker.y*rect.height/300;
assert.equal(hitMapService(miniServiceMarkers,x,y,rect,300,300).id,marker.entry.id,'scaled canvas hit matches visible icon');assert.equal(mapServiceAtMinimap({clientX:x,clientY:y}).id,marker.entry.id);
let opened=null,walked=0;const realOpen=openLocalMap;openLocalMap=id=>opened=id;walkTo=()=>walked++;walkFromMinimap({clientX:x,clientY:y});assert.equal(opened,marker.entry.id);assert.equal(walked,0,'service taps do not accidentally walk');
walkFromMinimap({clientX:rect.left,clientY:rect.top});assert.equal(walked,0,'outside round minimap is inert');openLocalMap=realOpen;
const iconCanvas=document.createElement('canvas');iconCanvas.width=iconCanvas.height=48;for(const name of Object.keys(GAME_ICON_DEFS)){const g=iconCanvas.getContext('2d');g.clearRect(0,0,48,48);drawGameIcon(g,name,0,0,48);assert(g.getImageData(0,0,48,48).data.some(v=>v>0),name+' draws');}
console.log('PASS: real shop stock, all nine tutors, bank deduplication, indoor entrance/exit routes, scaled marker taps, circular boundaries and every shared icon.');
}`,ctx);
