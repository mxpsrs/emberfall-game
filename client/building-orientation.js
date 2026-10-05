'use strict';
// Rotate each complete room around its lot, including its door and contents.
// The original south-facing plan remains the source for authored geometry.
const BUILDING_LAYOUT_VERSION=1;
const KITCHEN_LAYOUT_VERSION=1;
function buildingTile(b,x,y){
 const p=b.southPlan;if(!p)return [x,y];const u=x-p.x,v=y-p.y;
 switch(b.doorFacing){case 'east':return [b.x+v,b.y+p.w-1-u];case 'north':return [b.x+p.w-1-u,b.y+p.h-1-v];case 'west':return [b.x+p.h-1-v,b.y+u];default:return [x,y];}
}
function buildingRotation(b){
 const p=b.southPlan;if(!p)return [1,0,0,0,0,1,0,0,0,0,1,0];
 const angle={south:0,east:Math.PI/2,north:Math.PI,west:-Math.PI/2}[b.doorFacing],c=Math.round(Math.cos(angle)),sn=Math.round(Math.sin(angle));
 const offset=b.doorFacing==='east'?[0,p.w]:b.doorFacing==='north'?[p.w,p.h]:b.doorFacing==='west'?[p.h,0]:[0,0];
 return [c,0,sn,b.x+offset[0]-c*p.x-sn*p.y,0,1,0,0,-sn,0,c,b.y+offset[1]+sn*p.x-c*p.y];
}
function buildingDoorTransform(b){
 if(b.civilCastle){const [x,y]=doorThreshold(b.service);return briarTransform(x+.5-.53,0,y+.54,1,-doorOpenFraction(b.service)*Math.PI*.52,.85);}
 const p=b.southPlan||b,xx=p.service?p.service.x+.5:b.service?b.service.x+.5:p.x+p.w/2;
 const leaf=briarTransform(xx-.514,0,p.y+p.h+.04,1,-doorOpenFraction(b.service)*Math.PI*.52,1);
 return affineMultiply(buildingRotation(b),leaf);
}
function chooseBuildingFacing(b,world){
 if(b.planFacing)return b.planFacing;
 const town=SETTLEMENTS.find(t=>t.id===b.settlement);if(!town||!b.service)return 'south';
 const dx=town.x-(b.x+b.w/2),dy=town.y-(b.y+b.h/2),horizontal=dx>0?'east':'west',vertical=dy>0?'south':'north';
 const candidates=Math.abs(dx)>Math.abs(dy)?[horizontal,vertical]:[vertical,horizontal];
 for(const facing of candidates){
  const w=['east','west'].includes(facing)?b.h:b.w,h=['east','west'].includes(facing)?b.w:b.h;
  if(world.buildings.some(a=>a!==b&&b.x<a.x+a.w+1&&b.x+w+1>a.x&&b.y<a.y+a.h+1&&b.y+h+1>a.y))continue;
  const candidate={...b,w,h,doorFacing:facing},door=buildingTile(candidate,b.service.x,b.service.y);
  if(expandedWater(...door))continue;
  return facing;
 }
 return vertical;
}
function buildingResumePosition(world,resume){
 let x=resume.x,y=resume.y;
 if(resume.version===BUILDING_LAYOUT_VERSION&&resume.kitchenVersion!==KITCHEN_LAYOUT_VERSION&&x>=33&&x<41&&y>=43&&y<52){
  const kitchen=world.buildings.find(b=>b.service?.destination==='village_kitchen');
  if(kitchen){const source=kitchen.southPlan;return buildingTile(kitchen,source.x+8-(y-43),source.y+x-33);}
 }
 if(resume.version!==BUILDING_LAYOUT_VERSION){
  if(x>=30&&x<39&&y>=63&&y<71){x+=43;y-=1;}
  const b=world.buildings.find(b=>b.walkIn&&x>=b.southPlan.x&&x<b.southPlan.x+b.southPlan.w&&y>=b.southPlan.y&&y<b.southPlan.y+b.southPlan.h);
  if(b)[x,y]=buildingTile(b,x,y);
 }
 return [x,y];
}
function orientTownBuildings(world,resume){
 for(const b of world.buildings){
  if(!b.service||b.southPlan)continue;
  b.southPlan={x:b.x,y:b.y,w:b.w,h:b.h,service:{x:b.service.x,y:b.service.y}};
  b.doorFacing=chooseBuildingFacing(b,world);
  if(['east','west'].includes(b.doorFacing))[b.w,b.h]=[b.h,b.w];
  const move=o=>{for(const [x,y]of [['x','y'],['homeX','homeY'],['drawX','drawY']])if(Number.isFinite(o[x]+o[y]))[o[x],o[y]]=buildingTile(b,o[x],o[y]);};
  move(b.service);b.service.building=b;
  for(const o of world.objects)if(o!==b.service&&o.interiorBuilding===b.service.destination){move(o);o.roomYaw={south:0,east:Math.PI/2,north:Math.PI,west:-Math.PI/2}[b.doorFacing];}
 }
 laneOccupancy.clear();
 const seenStreetCells=new Set(),streetPoints=[];
 for(const seg of organicRoads)for(const p of [seg.a,seg.b]){const key=Math.floor(p[0])+':'+Math.floor(p[1]);if(seenStreetCells.has(key))continue;seenStreetCells.add(key);if(!laneBlocked(Math.floor(p[0]),Math.floor(p[1])))streetPoints.push(p);}
 // Attach the new fronts to the existing street network, outside all walls.
 for(const b of world.buildings){
  if(!b.southPlan||b.doorFacing==='south')continue;
  const door=[b.service.x+.5,b.service.y+.5];let nearest=null,best=Infinity;
  for(const p of streetPoints){const distance=(p[0]-door[0])**2+(p[1]-door[1])**2;if(distance<best){best=distance;nearest=p;}}
  if(nearest)curveRoad(...nearest,...door,.95,SETTLEMENTS.find(t=>t.id===b.settlement)?.kind==='city');
 }
 // Keep foliage and outside props clear of the reoriented footprint/approach.
 for(const o of world.objects){
  if(o.interiorBuilding||!['tree','ore','prop'].includes(o.type))continue;
  const obstructed=(x,y)=>world.buildings.some(b=>x>=b.x-1&&x<b.x+b.w+1&&y>=b.y-1&&y<b.y+b.h+1||b.service&&Math.hypot(x-b.service.x,y-b.service.y)<2);
  if(!obstructed(o.x,o.y))continue;
  let found=false;for(let radius=2;radius<15&&!found;radius++)for(let i=0;i<16&&!found;i++){
   const x=Math.round(o.x+Math.cos(i*Math.PI/8)*radius),y=Math.round(o.y+Math.sin(i*Math.PI/8)*radius);
   if(obstructed(x,y)||expandedWater(x,y)||world.objects.some(p=>p!==o&&p.x===x&&p.y===y))continue;
   Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});found=true;
  }
 }
 if(resume.scene==='overworld'){
  const [x,y]=buildingResumePosition(world,resume);
  realmNavigation.clear();activateScene('overworld',x,y,false);
 }
 s.buildingLayoutVersion=BUILDING_LAYOUT_VERSION;s.kitchenLayoutVersion=KITCHEN_LAYOUT_VERSION;roadBuckets=null;miniTerrain=null;realmNavigation.clear();resetLandSurface();
}
const setupBeforeBuildingFacing=setupExpandedWorld;
let buildingResume=null;
setupExpandedWorld=function(){if(townBuildingsOriented)return;buildingResume??={scene:s.sceneId,x:s.x,y:s.y,version:s.buildingLayoutVersion,kitchenVersion:s.kitchenLayoutVersion,scale:s.worldScale};setupBeforeBuildingFacing();if(buildingResume.scale!==3||buildingResume.scene!=='overworld'&&s.sceneId==='overworld')buildingResume={scene:s.sceneId,x:s.x,y:s.y,version:undefined,scale:3};};
const tutorialBeforeBuildingFacing=setupTutorialVillage;
let townBuildingsOriented=false;
setupTutorialVillage=function(){tutorialBeforeBuildingFacing();if(townBuildingsOriented)return;townBuildingsOriented=true;orientTownBuildings(worldScenes.overworld,buildingResume||{scene:s.sceneId,x:s.x,y:s.y,version:s.buildingLayoutVersion,kitchenVersion:s.kitchenLayoutVersion});};
const buildingBeforeFacing=building3;
building3=function(r,b){
 if(!b.southPlan||b.doorFacing==='south')return buildingBeforeFacing(r,b);
 const m=buildingRotation(b),q={face(points,color,normals,material,colors,uvs){r.face(points.map(p=>briarPoint(p,0,m)),color,normals?.map(n=>[m[0]*n[0]+m[2]*n[2],n[1],m[8]*n[0]+m[10]*n[2]]),material,colors,uvs);}};
 if(r.indexed)q.indexed=(mesh,transform)=>r.indexed(mesh,affineMultiply(m,transform));
 const source={...b,...b.southPlan,service:{...b.service,...b.southPlan.service},_orientationYaw:{east:Math.PI/2,north:Math.PI,west:-Math.PI/2}[b.doorFacing]};
 const height=buildingBeforeFacing(q,source);if(!b._generatedBuildingEntity)b.visualHeight=height;return height;
};
const propBeforeRoomFacing=prop3;
prop3=function(r,o,x,z){
 if(!o.roomYaw)return propBeforeRoomFacing(r,o,x,z);
 const m=affineMultiply(briarTransform(x,0,z,1,o.roomYaw),briarTransform(-x,0,-z)),q={face(points,color,normals,material,colors,uvs){r.face(points.map(p=>briarPoint(p,0,m)),color,normals?.map(n=>[m[0]*n[0]+m[2]*n[2],n[1],m[8]*n[0]+m[10]*n[2]]),material,colors,uvs);}};
 if(r.indexed)q.indexed=(mesh,transform)=>r.indexed(mesh,affineMultiply(m,transform));
 return propBeforeRoomFacing(q,o,x,z);
};
