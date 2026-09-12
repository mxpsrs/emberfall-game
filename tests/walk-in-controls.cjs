const vm=require('node:vm'),assert=require('node:assert/strict'),{ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`{
renderUI=renderAction=renderTutorial=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();s.character={name:'Door tester'};s.tutorial=tutorialSteps.length;assetsReady=true;
function settle(){for(let i=0;i<500;i++){time+=.05;advanceMovement(.05);updateDoorThreshold();if(!path.length&&!pendingWalkInDoor&&Math.hypot(px-s.x,py-s.y)<.02)return;}throw new Error('Door interaction did not finish');}
const cases=[...new Set(buildings.filter(b=>b.walkIn).map(b=>b.doorFacing))].map(facing=>buildings.find(b=>b.walkIn&&b.doorFacing===facing));
for(const id of ['realm_briarhaven_4','realm_briarhaven_3','village_kitchen']){const b=buildings.find(b=>b.service?.destination===id);if(!cases.includes(b))cases.push(b);}
for(const b of cases){
 const o=b.service,outside=doorApproach(o),inside=doorApproach(o,true);activateScene('overworld',...outside);setWalkInDoor(o,false,true);
 assert(buildingRoofHidden(b),b.name+' roof hides while outside the doorway');
 assert(buildingRoofHidden(b,b.x-5.5,b.y+1),'roof hides exactly five tiles from the wall');assert(!buildingRoofHidden(b,b.x-5.51,b.y+1),'roof returns beyond five tiles');
 openBuilding3(b);settle();assert(o.openedAt===undefined,'building tap only approaches');assert.deepEqual([s.x,s.y],outside);
 select(o);settle();assert(o.openedAt!==undefined,'door tap opens the leaf');assert.deepEqual([s.x,s.y],outside,'opening does not walk inside');
 assert(walkTo(...inside));settle();assert.deepEqual([s.x,s.y],inside,'interior destination routes through the opened doorway');
 select(o);settle();assert(o.openedAt===undefined,'door tap closes from inside');assert.deepEqual([s.x,s.y],inside);
 select(o);settle();assert(o.openedAt!==undefined);assert(walkTo(...outside));settle();assert.deepEqual([s.x,s.y],outside,'player walks back outside');
 setWalkInDoor(o,false,true);select(o);stop();settle();assert(o.openedAt===undefined,'Stop cancels queued opening');
 select(o);walkTo(...outside);settle();assert(o.openedAt===undefined,'new destination cancels queued opening');
}
// Test actual rendered click targets, including the two buildings reported inaccessible.
screen={w:1112,h:512};view3d.zoom=34;
for(const id of ['realm_briarhaven_4','realm_briarhaven_3','village_kitchen']){
 const b=buildings.find(b=>b.service?.destination===id),o=b.service;activateScene('overworld',...doorApproach(o));setWalkInDoor(o,true,true);draw3d();
 assert(b._cutaway);assert(!hitboxes.some(hit=>hit.building===b),'hidden roof cannot intercept floor clicks');
 let candidate=null;
 for(let y=b.y+1;y<b.y+b.h-1&&!candidate;y++)for(let x=b.x+1;x<b.x+b.w-1&&!candidate;x++){
  if(!land(x,y))continue;const p=project3(x+.5,0,y+.5);
  const hit=hitboxes.some(h=>h.polygon?pointInHull3(p.x,p.y,h.polygon):p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h);
  if(!hit&&p.x>0&&p.x<1112&&p.y>0&&p.y<512)candidate=p;
 }
 assert(candidate,b.name+' exposes a clear floor target');clickWorld3({clientX:candidate.x,clientY:candidate.y});settle();assert(withinWalkIn(b,px,py),b.name+' actual floor click walks inside');
 const tutor=objects.find(p=>p.tutor&&p.interiorBuilding===id);assert(route(tutor.x,tutor.y,true,1.45)!==null,'interior tutor is reachable');
}
console.log('PASS: manual doors, five-tile roof removal, unobstructed floor clicks, entry/exit and tutor routes for bank, school and kitchen; all four orientations and cancellation.');
}`,ctx);
