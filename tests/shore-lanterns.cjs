const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;s.worldClock=380;s.character={name:'Shore review'};s.tutorial=38;s.tutorialReward=true;
let fishCount=0,lamps=0;
for(const scene of ['overworld','tutorial']){
 s.tutorial=scene==='tutorial'?0:38;s.tutorialReward=scene!=='tutorial';activateScene(scene);const w=worldScenes[scene];
 for(const o of w.objects.filter(o=>o.type==='fish')){
  assert(water(o.x,o.y),o.name+' in water');const bank=fishingBank(o);assert(bank,o.name+' accessible dry bank');assert(route(o.x,o.y,true,1.45,...bank)!==null,o.name+' can be fished from bank');
  if(scene==='overworld')assert.equal(o.fishingHabitat,['trout','salmon'].includes(o.resourceId)?'freshwater':'sea',o.name+' habitat');
  else if(o.tutorialRole==='fish'){const tutor=tutorialTutor('fishing');assert(Math.hypot(bank[0]-tutor.x,bank[1]-tutor.y)<=6,'tutorial fishing stays near tutor');}fishCount++;
 }
 for(const o of w.objects.filter(o=>o.streetLantern)){
  assert(!water(o.x,o.y)&&!worldWall(o.x,o.y),'lamp on solid land');assert(!w.buildings.some(b=>inBuilding(b,o.x,o.y)),'street lamp outside house');assert(!land(o.x,o.y),'post collision');
  assert(w.buildings.every(b=>!b.service||Math.hypot(o.x-b.service.x,o.y-b.service.y)>=2.2),'door remains clear');lamps++;
 }
 const sample=w.objects.find(o=>o.streetLantern);px=sample.x;py=sample.y;const light=worldLightSources().find(l=>l.x===sample.x+.5&&l.z===sample.y+.5);assert(light&&light.radius>=18,'street lamp actually illuminates its surroundings');
 const capture=capturePickGeometry3({face(){},indexed(){}});prop3(capture.painter,sample,sample.x+.5,sample.y+.5);assert(capture.geometry.length>15,'visible post, cage and glowing glass');
}
s.tutorial=38;s.tutorialReward=true;activateScene('overworld');
for(const t of SETTLEMENTS)assert(objects.some(o=>o.streetLantern&&Math.hypot(o.x-t.x,o.y-t.y)<20),t.name+' centre has street lighting');
for(const b of buildings.filter(b=>b.archetype==='castle'))assert(objects.some(o=>o.streetLantern&&Math.hypot(o.x-b.service.x,o.y-b.service.y)<12),b.name+' entrance lit');
assert.equal(fishCount,10);assert(lamps>100);console.log('PASS: all '+fishCount+' fish spots in appropriate water with reachable banks; '+lamps+' visible outdoor lamps, all settlements/castles, clear doors and fixed light sources.');
`,ctx);
