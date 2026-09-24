'use strict';
// Roads and civic spaces define lots; deterministic decoration never chooses the skeleton.
const SETTLEMENT_PURPOSES={
 crownreach:['capital','Royal enclosure','Crown administration and grain trade','wells and the western river','Sunspire Castle'],
 ironhollow:['capital','Mountain citadel','Ore, masonry and royal foundries','cisterns and mountain springs','Ironcrown Citadel'],
 aelindor:['capital','Grove palace','Forest stewardship and learning','forest springs','The Bough Palace'],
 greyhaven:['city','Market crossroads','Regional trade and river transport','western watershed','Guild bell tower'],
 deepforge:['city','Foundry terraces','Metalworking and deep mining','Ironmirror watershed','Foundry headframe'],
 moonwillow:['city','Connected groves','Herbalism, weaving and forest trade','Silver River','Moon sanctuary'],
 briarhaven:['town','Market crossroads','Mainland services and farming','Stillwater and town well','Briarhaven well'],
 willowcross:['town','Market crossroads','Grain milling and river trade','Eastbank river','Mill and market'],
 stoneford:['large village','Roadside green','Highland provisions and husbandry','village well','Militia watchtower'],
 copperdelve:['large village','Mining green','Copper and local stone','spring-fed well','Quarry headframe'],
 stonehearth:['large village','Masons’ green','Stone cutting and mountain supplies','cistern','Masons’ hall'],
 fernwatch:['small village','Woodland grove','Forestry and forest watch','grove spring','Ancient watch tree'],
 silverbrook:['small village','Shrine green','Fishing and medicinal herbs','Silver River tributary','Waterside shrine']
};
function settlementBlueprint(t){
 const [settlementClass,plan,purpose,water,landmark]=SETTLEMENT_PURPOSES[t.id];
 const city=['city','capital'].includes(settlementClass),large=settlementClass==='large village';
 return {id:t.id,settlementClass,plan,purpose,industry:purpose,population:city?settlementClass==='capital'?420:240:large?85:settlementClass==='town'?125:35,water,landmark,political:t.capital?'kingdom seat':'local council',defense:t.capital?'city gates and inner enclosure':city?'guarded roads':'local watch',trade:city?'regional hub':'local supply',terrain:t.kingdom==='khazdur'?'graded stone terraces':t.kingdom==='sylvaran'?'groves with connected clearings':'graded streets and cultivated edge',radius:city?60:large?44:38,center:[t.x,t.y],entrances:[],roads:[],districts:[],quarries:[]};
}
function authoredLots(t,count){
 const city=t.kind==='city',large=SETTLEMENT_PURPOSES[t.id]?.[0]==='large village',slots=[];
 // Slot coordinates are pre-expansion tiles. Each row faces the reserved street south of it.
 const rows=city?[-12,-6,4,10,16]:large?[-12,-6,4]:[-6,4];
 const cols=city?[-17,-11,-5,3,9,15]:large?[-11,-5,3,9]:[-11,-5,3];
 for(const y of rows)for(const x of cols){if(city&&[-6,4].includes(y)&&[-5,3].includes(x))continue;slots.push([t.x+x,t.y+y]);}
 // Elven cities use four inhabited groves around a broad, unbuilt heart.
 if(t.kingdom==='sylvaran'&&city){slots.length=0;for(const [cx,cy]of [[-12,-8],[9,-8],[-12,10],[9,10]])for(const dy of [-3,3])for(const dx of [-6,0,6])slots.push([t.x+cx+dx,t.y+cy+dy]);slots.push([t.x-18,t.y-19]);}
 if(slots.length<count)throw new Error('Authored settlement has too few lots: '+t.id);
 return slots.slice(0,count);
}
function organicLots(t,count){return authoredLots(t,count);}
function plannedRoad(a,b,width=1.4,paved=false,settlement=null){
 const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);if(!d)return;
 organicRoads.push({a:[...a],b:[...b],na:[-dy/d,dx/d],nb:[-dy/d,dx/d],width,paved,settlement});
}
const settlementPlans=new Map();
function planPhysicalSettlements(world){
 for(const t of SETTLEMENTS){const plan=settlementBlueprint(t);settlementPlans.set(t.id,plan);t.settlementClass=plan.settlementClass;
  for(const b of world.buildings.filter(b=>b.settlement===t.id)){
   if(!t.legacy)b.planFacing=Math.abs(b.x-(t.x-15))<1?'east':'south';
   if(b.archetype==='castle'){b.x=t.x-24;b.y=t.y-78;b.w=49;b.h=39;b.planFacing='south';b.civilCastle=true;}
  }
 }
}
function buildPlannedStreets(world){
 for(const t of SETTLEMENTS){const plan=settlementPlans.get(t.id),city=t.kind==='city',large=plan.settlementClass==='large village',radius=plan.radius,paved=city||plan.settlementClass==='town';
  const local=world.buildings.filter(b=>b.settlement===t.id),addRoad=(a,b,width,role)=>{plannedRoad(a,b,width,paved,t.id);plan.roads.push({a,b,width,role});};
  const cx=t.x+.5,cy=t.y+.5;
  addRoad([cx-radius,cy],[cx+radius,cy],city?2.7:1.5,'main road');
  addRoad([cx,cy-(t.capital?40:radius)],[cx,cy+radius],t.capital?3.1:1.6,'civic approach');
  plan.entrances=[[cx-radius,cy],[cx+radius,cy],[cx,cy+radius]];
  if(!t.legacy){
   for(const b of local.filter(b=>b.archetype!=='castle')){
    const y=b.y+b.h+2.5;
    if(t.kingdom==='sylvaran'&&b.y<t.y-40){addRoad([b.service.x+.5,y],[cx-39,y],1.2,'grove approach');addRoad([cx-39,y],[cx-39,cy],1.2,'grove approach');}else addRoad([cx-radius+3,y],[cx+radius-3,y],city?1.35:1.0,'district street');
    plannedRoad([b.service.x+.5,b.service.y+.5],[b.service.x+.5,y],1,paved,t.id);
    b.district=['inn','shop','hall','temple'].includes(b.archetype)?'civic and market':b.archetype==='forge'||b.archetype==='mine'?'craft and industry':'residential';
   }
  }else for(const b of local){const door=[b.service.x+.5,b.service.y+.5];curveRoad(cx,cy,...door,1.2,paved);}
  plan.districts=['civic and market','residential',...(city||large?['craft and industry']:[])];
 }
 // Named trade connections, through the river crossings, instead of an arbitrary minimum tree.
 const links=[['briarhaven','willowcross'],['willowcross','stoneford'],['willowcross','crownreach'],['stoneford','greyhaven'],['crownreach','greyhaven'],['greyhaven','copperdelve'],['copperdelve','ironhollow'],['ironhollow','stonehearth'],['ironhollow','deepforge'],['deepforge','stonehearth'],['greyhaven','fernwatch'],['fernwatch','aelindor'],['aelindor','silverbrook'],['silverbrook','moonwillow'],['deepforge','moonwillow']];
 for(const [aid,bid]of links){const a=SETTLEMENTS.find(t=>t.id===aid),b=SETTLEMENTS.find(t=>t.id===bid),pa=settlementPlans.get(aid),pb=settlementPlans.get(bid),toward=(p,t)=>p.entrances.reduce((best,q)=>Math.hypot(q[0]-t.x,q[1]-t.y)<Math.hypot(best[0]-t.x,best[1]-t.y)?q:best),aa=toward(pa,b),bb=toward(pb,a);curveRoad(...aa,...bb,1.7);}
 roadBuckets=null;
}
const organicRoads=[];
function curveRoad(ax,az,bx,bz,width=1.1,paved=false){
 const points=planVillageLane([ax,az],[bx,bz]);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],normal=j=>{const before=points[Math.max(0,j-1)],after=points[Math.min(points.length-1,j+1)],dx=after[0]-before[0],dz=after[1]-before[1],len=Math.hypot(dx,dz)||1;return [-dz/len,dx/len];};organicRoads.push({a,b,na:normal(i-1),nb:normal(i),width,paved});}
}
const laneOccupancy=new Map();
function laneBlocked(x,z){const key=x+':'+z;if(laneOccupancy.has(key))return laneOccupancy.get(key);const bad=x<1||z<1||x>=sceneSizes.overworld[0]-1||z>=sceneSizes.overworld[1]-1||expandedWater(x,z)||worldScenes.overworld.buildings.some(b=>x+.5>b.x-.2&&x+.5<b.x+b.w+.2&&z+.5>b.y-.2&&z+.5<b.y+b.h+.2);laneOccupancy.set(key,bad);return bad;}
function planVillageLane(start,end){const sx=Math.floor(start[0]),sz=Math.floor(start[1]),ex=Math.floor(end[0]),ez=Math.floor(end[1]);if(sx===ex&&sz===ez)return [start,end];
 const key=(x,z)=>x+z*1152,origin=key(sx,sz),goal=key(ex,ez),cost=new Map([[origin,0]]),previous=new Map(),heap=[];
 const push=node=>{heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;};push({x:sx,z:sz,id:origin,g:0,f:0});let found=false;
 while(heap.length&&cost.size<70000){const a=pop();if(a.g>cost.get(a.id)+.001)continue;if(a.id===goal){found=true;break;}for(const [dx,dz]of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]]){const x=a.x+dx,z=a.z+dz,id=key(x,z);if(laneBlocked(x,z)||dx&&dz&&(laneBlocked(a.x+dx,a.z)||laneBlocked(a.x,a.z+dz)))continue;const bend=.055*(1+Math.sin(x*.14+z*.09)),g=a.g+(dx&&dz?1.4142:1)+bend;if(g<(cost.get(id)??Infinity)){cost.set(id,g);previous.set(id,a.id);push({x,z,id,g,f:g+Math.hypot(ex-x,ez-z)});}}}
 if(!found)throw new Error('No street route from '+start+' to '+end);
 const raw=[];for(let id=goal;id!==origin;id=previous.get(id))raw.push([id%1152+.5,Math.floor(id/1152)+.5]);raw.push([sx+.5,sz+.5]);raw.reverse();
 // Corner cutting gives the path a continuous edge while keeping it outside walls.
 let result=raw;for(let pass=0;pass<2;pass++){const next=[result[0]];for(let i=0;i<result.length-1;i++){const a=result[i],b=result[i+1];for(const t of [.25,.75]){const p=[a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t];if(!laneBlocked(Math.floor(p[0]),Math.floor(p[1])))next.push(p);}}next.push(result[result.length-1]);result=next;}
 const spaced=[result[0]];for(let i=1;i<result.length-1;i++)if(Math.hypot(result[i][0]-spaced.at(-1)[0],result[i][1]-spaced.at(-1)[1])>.8)spaced.push(result[i]);spaced.push(result.at(-1));return spaced;
}
function arrangeBriarhaven(world){const plan={inn:[30,32,11,10],shop:[49,35,9,8],forge:[63,30,11,10],realm_briarhaven_3:[73,62,9,8],realm_briarhaven_4:[54,65,9,7]};for(const b of world.buildings){const p=plan[b.service?.destination];if(p)Object.assign(b,{x:p[0],y:p[1],w:p[2],h:p[3]});}
 for(const o of world.objects){if(o.type==='elder'){Object.assign(o,{x:43,y:52,homeX:43,homeY:52,drawX:43,drawY:52});}if(['enemy','boss'].includes(o.type)&&o.x>28&&o.x<78&&o.y>28&&o.y<79){const x=83+(o.id%5)*4,y=65+(o.id%4)*5;Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});}}
}
const terrainBeforeOrganic=expandedTerrain;
expandedTerrain=function(x,z){if(!inWorld())return terrainBeforeOrganic(x,z);return worldWaterSurface(x,z)?3:0;};
const setupBeforeOrganic=setupExpandedWorld;
setupExpandedWorld=function(){const resume={scene:s.sceneId,x:s.x,y:s.y,scale:s.worldScale};setupBeforeOrganic();if(organicRoads.length)return;const world=worldScenes.overworld;expandPhysicalWorld(world);arrangeBriarhaven(world);setupVillageKitchen(world);planPhysicalSettlements(world);
 for(const b of world.buildings){if(!b.service)continue;const seg=Math.max(1,Math.round(b.w/2)),xx=b.x+(Math.floor(seg/2)+.5)*b.w/seg;b.service.x=Math.round(xx-.5);b.service.y=Math.round(b.y+b.h);}
 buildPlannedStreets(world);
 clearStreetObstacles(world);plantSettlementGroves(world);dressSettlementSites(world);populateWalkInRooms(world);resetLandSurface();realmNavigation.clear();const resuming=resume.scale===3&&resume.scene==='overworld';restoreWalkInDoors(world,resuming?resume:null);if(resuming)activateScene('overworld',resume.x,resume.y,false);
};
function clearStreetObstacles(world){for(const o of world.objects){if(!['tree','ore','prop'].includes(o.type))continue;const conflicts=(x,z)=>worldWaterDistance(x+.5,z+.5)<1.5||world.buildings.some(b=>x>=b.x-1&&x<b.x+b.w+1&&z>=b.y-1&&z<b.y+b.h+1)||organicRoads.some(seg=>Math.abs((seg.a[0]+seg.b[0])/2-x)<3&&Math.abs((seg.a[1]+seg.b[1])/2-z)<3&&roadSegmentDistance(x+.5,z+.5,seg)<seg.width+.45);if(!conflicts(o.x,o.y))continue;let found=false;for(let radius=2;radius<=12&&!found;radius+=2)for(let i=0;i<16&&!found;i++){const x=Math.round(o.x+Math.cos(i*Math.PI/8)*radius),z=Math.round(o.y+Math.sin(i*Math.PI/8)*radius);if(!expandedWater(x,z)&&!conflicts(x,z)&&!world.objects.some(p=>p!==o&&p.x===x&&p.y===z)){Object.assign(o,{x,y:z,homeX:x,homeY:z,drawX:x,drawY:z});found=true;}}}}
function roadSegmentDistance(x,z,seg){const dx=seg.b[0]-seg.a[0],dz=seg.b[1]-seg.a[1],t=Math.max(0,Math.min(1,((x-seg.a[0])*dx+(z-seg.a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-seg.a[0]-dx*t,z-seg.a[1]-dz*t);}
const realmCrossingsBeforeOrganic=drawRealmCrossings;
drawRealmCrossings=function(r){realmCrossingsBeforeOrganic(r);
 for(const b of buildings){
  if(!b.service||b.service.passageKind||b.arch)continue;
  const seg=Math.max(1,Math.round(b.w/2)),scale=b.w/seg/2,xx=b.x+(Math.floor(seg/2)+.5)*b.w/seg,open=typeof doorOpenFraction==='function'?doorOpenFraction(b.service):(b.service.openedAt===undefined?0:1);
  const m=typeof buildingDoorTransform==='function'?buildingDoorTransform(b):briarTransform(xx-.53*scale,0,b.y+b.h+.04,scale,-open*Math.PI*.52,scale*.85),q=project3(m[3],1.2,m[11]);
  // Cull the door itself, not a distant building corner. Castle gates use the
  // same visible, animated leaf and click transform as ordinary entrances.
  if(q.x< -150||q.x>screen.w+150||q.y< -200||q.y>screen.h+150)continue;
  briarEmit(r,(b.service?._assemblyDoor&&window.VeldrenBuildings?.model(b.service._assemblyDoor.model))||rebuiltModels.Door_1_Round,m);
 }
};
let doorReturnUntil=0;
const engageBeforeDoors=engage;
engage=function(o){if(o.type!=='door'||!o.destination)return engageBeforeDoors(o);const p=route(o.x,o.y,false);if(p===null){toast('There is no clear path to this door.');return;}o.openedAt=time;target=o;path=p;elapsed=0;renderAction();if(!p.length&&Math.hypot(px-o.x,py-o.y)<.05)arrive();};
openBuilding3=function(b){if(b.walkIn){walkTo(b.service.x,b.service.y);return;}if(b.service?.destination)engage(b.service);};
const leaveBeforeDoors=leaveInterior;
leaveInterior=function(){doorReturnUntil=time+2;leaveBeforeDoors();};
function updateDoorThreshold(){if(!inWorld()||time<doorReturnUntil||target?.type==='door')return;const door=objects.find(o=>o.type==='door'&&o.destination&&o.openedAt!==undefined&&Math.hypot(px-o.x,py-o.y)<.18);if(door)enterInterior(door);}

// Irregular groups of the existing tree assets frame towns and their approaches.
function plantSettlementGroves(world){let id=2400000;const occupied=new Set(world.objects.map(o=>o.x+':'+o.y));
 for(const town of SETTLEMENTS)for(let group=0;group<8;group++){
  const angle=group*2.399+town.x*.013,radius=(town.kind==='city'?65:26)+(group%3)*6,cx=town.x+Math.cos(angle)*radius,cz=town.y+Math.sin(angle)*radius;
  for(let n=0;n<5;n++){
   const x=Math.round(cx+Math.cos(n*2.399)*Math.sqrt(n)*2.2),y=Math.round(cz+Math.sin(n*2.399)*Math.sqrt(n)*2.2);id++;
   if(x<2||y<2||x>1149||y>765||worldWaterDistance(x+.5,y+.5)<2||occupied.has(x+':'+y))continue;
   if(world.buildings.some(b=>x>b.x-4&&x<b.x+b.w+4&&y>b.y-4&&y<b.y+b.h+4)||organicRoads.some(seg=>Math.abs(seg.a[0]-x)<6&&Math.abs(seg.a[1]-y)<6&&roadSegmentDistance(x+.5,y+.5,seg)<seg.width+2))continue;
   world.objects.push({id,type:'tree',name:town.kingdom==='khazdur'?'Mountain pine':'Old-growth oak',race:town.kingdom==='sylvaran'?'elf':town.kingdom==='khazdur'?'dwarf':'human',x,y,homeX:x,homeY:y,sprite:4,dead:0});occupied.add(x+':'+y);
  }
 }
}

// Road coverage is shaded on the terrain itself: no floating strips or depth fighting.
let roadBuckets=null;
function roadInfluence(x,z){
 if(!inWorld())return [0,0,0];
 if(!roadBuckets){roadBuckets=new Map();for(const seg of organicRoads){const pad=seg.width+3.2;for(let b=Math.floor((Math.min(seg.a[1],seg.b[1])-pad)/8);b<=Math.floor((Math.max(seg.a[1],seg.b[1])+pad)/8);b++)for(let a=Math.floor((Math.min(seg.a[0],seg.b[0])-pad)/8);a<=Math.floor((Math.max(seg.a[0],seg.b[0])+pad)/8);a++){const key=a+':'+b;if(!roadBuckets.has(key))roadBuckets.set(key,[]);roadBuckets.get(key).push(seg);}}}
 let amount=0,paved=0;for(const seg of roadBuckets.get(Math.floor(x/8)+':'+Math.floor(z/8))||[]){const edge=seg.width*(1+.06*Math.sin(x*2.3+z*1.7))-roadSegmentDistance(x,z,seg),t=Math.max(0,Math.min(1,(edge+.55)/1.1)),blend=t*t*(3-2*t);amount=Math.max(amount,blend);if(seg.paved)paved=Math.max(paved,blend);}
 for(const town of SETTLEMENTS){if(Math.abs(x-town.x)>5||Math.abs(z-town.y)>5)continue;const d=Math.hypot((x-town.x)/4.0,(z-town.y)/3.4),t=Math.max(0,Math.min(1,(1.1-d)/.25));amount=Math.max(amount,t);paved=Math.max(paved,t);}
 return [amount,paved,0];
}
function gradeRoadLand(x,z,height){if(!physicalWorldReady||!organicRoads.length)return height;if(!roadBuckets)roadInfluence(x,z);let best=0,target=height;for(const seg of roadBuckets.get(Math.floor(x/8)+':'+Math.floor(z/8))||[]){const dx=seg.b[0]-seg.a[0],dz=seg.b[1]-seg.a[1],length=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-seg.a[0])*dx+(z-seg.a[1])*dz)/length)),distance=Math.hypot(x-seg.a[0]-dx*t,z-seg.a[1]-dz*t),amount=Math.max(0,Math.min(1,(seg.width+3.2-distance)/3.2)),blend=amount*amount*(3-2*amount);if(blend>best){best=blend;target=landBase(seg.a[0],seg.a[1])*(1-t)+landBase(seg.b[0],seg.b[1])*t;}}return height*(1-best*.94)+target*best*.94;}
const organicGradeBefore=gradeLand;
gradeLand=function(x,z,height){return gradeRoadLand(x,z,organicGradeBefore(x,z,height));};

// Small, purposeful clusters identify services without filling travel lanes.
function dressSettlementSites(world){
 let id=3200000;
 const place=(name,cx,cz,radius=.6)=>{
  for(let r=0;r<=5;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const x=Math.round(cx+dx),y=Math.round(cz+dz);
   if(worldWaterDistance(x+.5,y+.5)<3||world.buildings.some(b=>x>=b.x-1&&x<b.x+b.w+1&&y>=b.y-1&&y<b.y+b.h+1||b.service&&Math.abs(x-b.service.x)<=radius+1.2&&y>=b.service.y-1&&y<=b.service.y+5)||world.objects.some(o=>!o.collected&&Math.hypot(o.x-x,o.y-y)<radius+1))continue;
   let road=false;for(let rz=-2;rz<=2;rz++)for(let rx=-2;rx<=2;rx++)if(Math.hypot(rx,rz)<radius+.5&&roadInfluence(x+.5+rx,y+.5+rz)[0]>.05)road=true;if(road)continue;
   world.objects.push({id:id++,type:'prop',name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:12,dead:0,collisionRadius:radius});return;
  }
 };
 for(const town of SETTLEMENTS){
  place('Village well',town.x+3,town.y-4,.9);
  for(const b of world.buildings.filter(b=>b.settlement===town.id&&['shop','inn','forge'].includes(b.archetype))){
   const z=b.y+b.h+2;
   if(b.archetype==='shop'){place('Merchant wagon',b.x+1,z,1.1);place('Supplies',b.x+b.w-1,z,.65);}
   if(b.archetype==='inn'){place('Dining table',b.x+2,z,.8);place('Barrel',b.x+4,z,.55);}
   if(b.archetype==='forge'){place('Log pile',b.x+1,z,.8);place('Tool table',b.x+b.w-2,z,.8);}
  }
 }
}
