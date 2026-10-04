const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();
s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.mainStoryQuest={stage:25};s.mountainQuest={stage:20,lairKey:true};
const errors=[],counts={rooms:0,bookcases:0,ranges:0,lamps:0,chairs:0,stalls:0,services:0},check=(condition,message)=>{if(!condition)errors.push(message);};
for(const r of propPlacementRooms.values()){
 if(!r.props.length)continue;counts.rooms++;const scene=worldScenes[r.scene];
 for(const o of r.props){const a=o.placement,rule=PROP_RULES[o.propKind],box=propBox(o);
  check(!!a.reason&&!!a.anchor,r.id+' missing placement purpose');check(rule.rooms.includes(r.usage),r.id+' inappropriate '+o.name);
  if(rule.requiresWall){
   const margin=(r.outer&&!r.outer.civilCastle) ? .22 : 1.12;
   const gap={north:box.top-(r.y+margin),south:r.y+r.h-margin-box.bottom,west:box.left-(r.x+margin),east:r.x+r.w-margin-box.right}[a.wall];
   check(Math.abs(gap)<.001,r.id+' '+o.name+' does not meet its wall');
   const forward=[Math.sin(a.yaw),Math.cos(a.yaw)],inside=[r.center[0]-(box.left+box.right)/2,r.center[1]-(box.top+box.bottom)/2];
   check(forward[0]*inside[0]+forward[1]*inside[1]>0,r.id+' '+o.name+' faces wall');
  }
  if(o.propKind==='bookcase')counts.bookcases++;if(o.type==='range')counts.ranges++;
  check(!propDoorExclusion(r,box),r.id+' '+o.name+' blocks door');
  for(const stair of scene.objects.filter(p=>p.civilStair))check(!propBoxesOverlap(box,{left:stair.x-1,right:stair.x+2,top:stair.y-2,bottom:stair.y+3}),r.id+' '+o.name+' blocks stair');
  if(o.propKind==='chair'){
   counts.chairs++;const table=scene.objects.find(p=>p.id===a.target);check(!!table,'chair has actual table');
   if(table){const dx=table.x-o.x,dy=table.y-o.y;check((dx*Math.sin(a.yaw)+dy*Math.cos(a.yaw))/Math.hypot(dx,dy)>.99,'chair faces table');}
  }
 }
 for(let i=0;i<r.props.length;i++)for(let j=i+1;j<r.props.length;j++)check(!propBoxesOverlap(propBox(r.props[i]),propBox(r.props[j])),r.id+' furniture overlaps');
}
for(const scene of ['overworld','tutorial']){
 currentScene=scene;const w=worldScenes[scene];
 for(const arch of w.buildings.filter(b=>b.arch&&!b.service))check(!w.buildings.some(b=>b.walkIn&&propBoxesOverlap({left:arch.x,right:arch.x+arch.w,top:arch.y,bottom:arch.y+arch.h},{left:b.x,right:b.x+b.w,top:b.y,bottom:b.y+b.h})),'decorative arch overlaps usable building');
 for(const o of w.objects.filter(o=>o.placement&&!o.placement.room)){
  const box=propBox(o),a=o.placement,rule=PROP_RULES[o.propKind];check(!rule.indoorOnly,o.name+' indoor furniture outside');check(rule.zones.includes(a.zone),o.name+' incompatible zone');
  check(!propBridgeOverlap(box),o.name+' blocks bridge');
  if(rule.clearance){const front=propFrontBox(o);check(!w.objects.some(p=>p!==o&&!p.walkThrough&&Math.abs(p.x-o.x)<8&&Math.abs(p.y-o.y)<8&&propBoxesOverlap(front,propBox(p))),o.name+' has blocked customer/interaction space');}
  if(!['well','monument'].includes(o.propKind))check(!propTravelOverlap(box),o.name+' blocks travel lane');
  if(o.propKind==='lamp'){counts.lamps++;check(!w.buildings.some(b=>propBoxesOverlap(box,{left:b.x,right:b.x+b.w,top:b.y,bottom:b.y+b.h})),o.name+' lamp inside building');}
  if(o.propKind==='well')check(Math.hypot(o.x-a.target[0],o.y-a.target[1])<=1.5,'well away from intended civic focus');
  if(o.propKind==='stall'){counts.stalls++;check((a.target[0]-o.x)*Math.sin(a.yaw)+(a.target[1]-o.y)*Math.cos(a.yaw)>0,'stall faces customers');}
 }
}
activateScene('overworld',55,61,false);for(const b of buildings)if(b.walkIn)setWalkInDoor(b.service,true,true);
check(objects.filter(o=>o.briarhavenGoblin).length===15,'15 goblins retained');
check(objects.filter(o=>o.name==='Brambleclaw tent').length===6,'six purposeful goblin shelters retained');
for(const clerk of objects.filter(o=>o.name==='Civic banker')){
 const counter=objects.find(o=>o.propKind==='counter'&&o.serviceOwner===clerk.id&&o.placement);check(!!counter,'civic banker has an accessible customer counter');if(!counter)continue;
 check(clerk.workstationId===counter.id,'banker retains its actual counter identity');
 check(Math.abs(counter.x-clerk.x-Math.sin(counter.placement.yaw))<.001&&Math.abs(counter.y-clerk.y-Math.cos(counter.placement.yaw))<.001,'banker stands behind the counter');
 const front=propFrontBox(counter),x=Math.floor((front.left+front.right)/2),y=Math.floor((front.top+front.bottom)/2);s.x=px=x;s.y=py=y;
 check(!blocked(x,y)&&!!route(clerk.x,clerk.y,true),'bank counter has a usable customer approach');
}
for(const feed of objects.filter(o=>o.name==='Stable feed')){const b=buildings.find(b=>b.service?.destination===feed.civilCourtyard);check(feed.propKind==='storage'&&feed.y>=b.y+35,'stable supplies belong to courtyard service edge');}
for(const q of surfaceQuarries){check(objects.some(o=>o.quarry===q.id&&o.civilDecor==='crane'),'quarry crane retained: '+q.id);check(objects.some(o=>o.quarry===q.id&&/cart/i.test(o.name)),'quarry loading cart retained: '+q.id);}
for(const q of surfaceQuarries)for(let y=q.y-8;y<=q.y+q.ry+6;y++)for(const dx of [-2,0,2])check(gradeLand(q.x+dx,y,0)===propGradeBefore(q.x+dx,y,0),'quarry work pads preserve ramp: '+q.id);
for(const b of buildings.filter(b=>b.walkIn)){
 const town=SETTLEMENTS.find(t=>t.id===b.settlement);if(town){let at=null;for(let r=0;r<8&&!at;r++)for(const [dx,dy]of [[-r,4],[r,4],[0,4+r],[0,4-r]])if(land(town.x+dx,town.y+dy))at=[town.x+dx,town.y+dy];if(at){s.x=px=at[0];s.y=py=at[1];}}
 const doorway=doorApproach(b.service,true);check(!!route(...doorway),b.name+' doorway route');
 const services=objects.filter(o=>o.interiorBuilding===b.service.destination&&['banker','shop','inn','range','forge'].includes(o.type));
 for(const o of services){counts.services++;check(!!route(o.x,o.y,true),b.name+' inaccessible '+o.name);}
 if(['inn','shop'].includes(b.archetype))check(objects.some(o=>o.interiorBuilding===b.service.destination&&o.propKind==='counter'),b.name+' needs service counter');
}
for(const bridge of bridgesInRealm()){
 const x=Math.floor(bridge.x-(bridge.eastWest?bridge.span/2-1:0)),y=Math.floor(bridge.z-(bridge.eastWest?0:bridge.span/2-1));
 check(!!route(Math.floor(bridge.x),Math.floor(bridge.z),false,1.45,x,y),'bridge centre reachable from entrance');
}
const castle=buildings.find(b=>b.settlement==='ironhollow'&&b.civilCastle);s.x=px=castle.x+24;s.y=py=castle.y+27;const records=mountainObject('library_books');check(records.o.placement?.wall,'quest records use library wall');check(!!route(records.o.x,records.o.y,true),'sealing records remain reachable');
const before=objects.map(o=>[o.id,o.x,o.y]);setupTutorialVillage();check(JSON.stringify(before)===JSON.stringify(objects.map(o=>[o.id,o.x,o.y])),'repeated setup is stable');
globalThis.propAudit={counts,errors,removed:propPlacementReport.removed,placed:propPlacementReport.placed,rooms:propPlacementReport.rooms,setupMilliseconds:propPlacementReport.setupMilliseconds};
console.log(JSON.stringify({counts,errors}));
`,ctx);
fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/prop-placement-audit.json',JSON.stringify(ctx.propAudit,null,2));
if(ctx.propAudit.errors.length)throw new Error(ctx.propAudit.errors.length+' prop placement regressions; see .qa/prop-placement-audit.json');
console.log('PASS: global semantic placement, wall facing, furniture groups, bridge/door/stair clearance, all services and retained quest records.');
