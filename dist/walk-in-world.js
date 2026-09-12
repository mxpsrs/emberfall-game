'use strict';
let physicalWorldReady=false;
function expandPhysicalWorld(world){if(physicalWorldReady)return;physicalWorldReady=true;const scale=3;sceneSizes.overworld=[1152,768];for(const t of SETTLEMENTS){t.x*=scale;t.y*=scale;}for(const road of realmRoads)for(let i=0;i<4;i++)road[i]*=scale;for(const b of world.buildings){b.x*=scale;b.y*=scale;b.w*=scale;if(b.w%2===0)b.w++;b.h*=scale;b.walkIn=!!b.service?.destination&&!/mine|crypt|dungeon|ruins/i.test(b.service.destination+' '+b.name);}
 for(const o of world.objects)for(const key of ['x','y','homeX','homeY','drawX','drawY'])if(Number.isFinite(o[key]))o[key]*=scale;
 if(s.worldScale!==3){if(!s.sceneId||s.sceneId==='overworld'){s.x*=scale;s.y*=scale;px=s.x;py=s.y;}if(s.returnPoint)s.returnPoint=s.returnPoint.map(v=>v*scale);for(const p of s.groundLoot||[])if(p.scene==='overworld'){p.x*=scale;p.y*=scale;}s.worldScale=3;}
 for(const def of Object.values(SPIRITS))if(def.scene==='overworld'){def.x*=scale;def.y*=scale;}world.entry=world.entry.map(v=>v*scale);realmNavigation.clear();miniTerrain=null;realmArtCrossings=[];
 // Wider river spans retain continuous, walkable crossings in the enlarged world.
 for(const [ax,az,bx,bz]of realmRoads){if(az===bz&&az<447&&az>15&&Math.min(ax,bx)<540&&Math.max(ax,bx)>549)realmArtCrossings.push({x:544.5,z:az,w:11,d:4});if(ax===bx&&ax>135&&ax<1095&&Math.min(az,bz)<450&&Math.max(az,bz)>459)realmArtCrossings.push({x:ax,z:454.5,w:4,d:11});}
}
const waterBeforeWalkIn=expandedWater;
function worldWaterDistance(x,z){
 if(!physicalWorldReady)return waterBeforeWalkIn(x,z)?-1:10;if(!inWorld())return 100;
 const a=x/3,b=z/3;
 let d=Math.min(x-6-2*Math.sin(z*.035),z-5-2*Math.sin(x*.03),1145+2*Math.sin(z*.025)-x,761+2*Math.cos(x*.025)-z);
 if(a<96&&b<84){
  const lake=(Math.hypot((x-15.5)/10.5,(z-66.5)/11.5)-1)*10.5+.24*Math.sin(z*.18+x*.12);
  const pond=(Math.hypot((x-141)/15,(z-132)/13.5)-1)*13.5+.35*Math.sin(x*.12-z*.17);
  const river=Math.max(Math.abs(x-(111.5+1.25*Math.sin((z-52)*.055)))-3.6,3-z,z-177);
  return Math.min(d,lake,pond,river);
 }
 if(SETTLEMENTS.some(t=>Math.hypot((x-t.x)/3,(z-t.y)/3)<32))return d;
 return Math.min(d,Math.max(Math.abs(z-(454.5+2.5*Math.sin(x*.015)))-4.5,135-x,x-1095),Math.max(Math.abs(x-(544.5+2*Math.sin(z*.021)))-4.5,15-z,z-447),Math.max(1020+8*Math.sin(z*.012)-x,510+9*Math.sin(x*.017)-z));
}
function worldWaterSurface(x,z){return worldWaterDistance(x,z)<0;}
let physicalBridges=null;
const villageBridges=[{x:111.5,z:51.5,span:16,width:6,eastWest:true},{x:111.5,z:105.5,span:16,width:6,eastWest:true}];
function bridgesInRealm(){return physicalBridges??= [...villageBridges,...(realmArtCrossings||[]).map(b=>({x:b.x,z:b.z,span:Math.max(b.w,b.d)+6,width:Math.min(b.w,b.d),eastWest:b.w>b.d}))];}
function bridgeAt(x,z){if(!inWorld()||!physicalWorldReady)return null;return bridgesInRealm().find(b=>Math.abs(b.eastWest?x-b.x:z-b.z)<=b.span/2&&Math.abs(b.eastWest?z-b.z:x-b.x)<=b.width/2-.65);}
function bridgeBarrier(x,z){return inWorld()&&physicalWorldReady&&bridgesInRealm().some(b=>Math.abs(b.eastWest?x-b.x:z-b.z)<b.span/2+.35&&Math.abs(b.eastWest?z-b.z:x-b.x)>b.width/2-.65&&Math.abs(b.eastWest?z-b.z:x-b.x)<b.width/2+.55);}
expandedWater=function(x,z){return bridgeBarrier(x+.5,z+.5)||(worldWaterSurface(x+.5,z+.5)&&!bridgeAt(x+.5,z+.5));};
function bridgeDeckHeight(b,x,z){const u=Math.max(0,Math.min(1,((b.eastWest?x-b.x:z-b.z)+b.span/2)/b.span)),a=landHeight(b.x-(b.eastWest?b.span/2:0),b.z-(b.eastWest?0:b.span/2)),c=landHeight(b.x+(b.eastWest?b.span/2:0),b.z+(b.eastWest?0:b.span/2));return a*(1-u)+c*u+.06+.65*Math.sin(u*Math.PI);}
function walkSurfaceHeight(x,z){const b=bridgeAt(x,z);return b?bridgeDeckHeight(b,x,z):landHeight(x,z);}

const kingdomBeforeWalkIn=kingdomAt;
kingdomAt=function(x,z){return kingdomBeforeWalkIn(physicalWorldReady?x/3:x,physicalWorldReady?z/3:z);};
const settlementBeforeWalkIn=settlementAt;
settlementAt=function(x,z){if(!physicalWorldReady)return settlementBeforeWalkIn(x,z);return SETTLEMENTS.find(t=>Math.hypot((x-t.x)/(t.kind==='city'?90:45),(z-t.y)/(t.kind==='city'?90:40))<1);};
const oldLandBase=landBase;
landBase=function(x,z){
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 const raw=(a,b)=>oldLandBase(physicalWorldReady?a/3:a,physicalWorldReady?b/3:b)*1.65+1.8*Math.sin(a*.020)*Math.cos(b*.017)+(physicalWorldReady?smooth(565,650,a)*(1-smooth(410,465,b))*(3.8+3.1*Math.sin(a*.026)*Math.cos(b*.024)):0);
 let height=raw(x,z);
 if(physicalWorldReady)for(const town of SETTLEMENTS){const inner=town.kind==='city'?65:26,outer=inner+36,d=Math.hypot(x-town.x,z-town.y);if(d>=outer)continue;const t=Math.max(0,(d-inner)/(outer-inner)),weight=1-t*t*(3-2*t),rise=(town.kingdom==='khazdur'?1.35:.65)*Math.sin((x-town.x)*.055)*Math.cos((z-town.y)*.046);height=height*(1-weight)+(raw(town.x,town.y)+rise)*weight;}
 return height;
};
function populateWalkInRooms(world){for(const b of world.buildings){if(!b.walkIn)continue;const room=worldScenes[b.service.destination];if(!room)continue;b.service.walkThrough=true;b.service.building=b;const [w,h]=sceneSizes[b.service.destination]||[16,14],used=new Set();
 const place=(original,x,y)=>{let chosen=null;for(let radius=0;radius<Math.max(b.w,b.h)&&!chosen;radius++)for(let dz=-radius;dz<=radius&&!chosen;dz++)for(let dx=-radius;dx<=radius&&!chosen;dx++){const a=x+dx,c=y+dz;if(a<=b.x||a>=b.x+b.w-1||c<=b.y||c>=b.y+b.h-1||used.has(a+':'+c)||c>b.y+2&&Math.abs(a-b.service.x)<1.2)continue;chosen=[a,c];}if(!chosen)return;const [a,c]=chosen;used.add(a+':'+c);world.objects.push({...original,interiorBuilding:b.service.destination,x:a,y:c,homeX:a,homeY:c,drawX:a,drawY:c});};
 const kind=b.archetype,center=b.service.x-b.x;
 for(const original of room.objects){
  if(original.type==='exit')continue;
  let x=Math.round(1+original.x/(w-1)*(b.w-3)),y=Math.round(1+original.y/(h-1)*(b.h-3));
  if(kind==='inn'){
   if(original.type==='prop')continue;
   if(original.type==='inn'){x=2;y=2;}
   else if(original.type==='camp'){x=b.w-2;y=2;}
   else {x=b.w-3;y=Math.floor(b.h*.65);}
  }
  place(original,b.x+x,b.y+y);
 }
 const furnishings=kind==='inn'?
  [['Serving table',2,3],['Barrel',1,2],['Barrel',1,3],['Bed',b.w-3,3],['Bed',b.w-3,5],['Dining table',2,b.h-4],['Chair',1,b.h-4],['Chair',3,b.h-4],['Dining table',b.w-3,b.h-4],['Chair',b.w-2,b.h-4],['Bookcase',1,5]]:
  kind==='shop'?[['Display table',2,Math.floor(b.h/2)],['Display table',b.w-3,Math.floor(b.h/2)],['Supplies',b.w-2,b.h-3],['Bookcase',1,2]]:
  kind==='forge'?[['Tool table',2,b.h-3],['Supplies',b.w-2,2],['Barrel',1,2]]:
  kind==='house'?[['Chair',2,Math.floor(b.h/2)],['Barrel',b.w-2,b.h-3],['Bookcase',1,2]]:[];
 for(const [i,[name,x,y]]of furnishings.entries())place({id:1600000+b.service.id*100+i,type:'prop',name,sprite:12,dead:0},b.x+x,b.y+y);

 }
 if(inWorld()){objects.splice(0,objects.length,...world.objects);buildings.splice(0,buildings.length,...world.buildings);}
 // Existing saves inside a shop now resume inside that shop's physical world footprint.
 const b=world.buildings.find(b=>b.walkIn&&b.service.destination===s.sceneId);if(b){const [w,h]=sceneSizes[s.sceneId]||[16,14],x=Math.round(b.x+1+s.x/(w-1)*(b.w-3)),y=Math.round(b.y+1+s.y/(h-1)*(b.h-3));activateScene('overworld',x,y,false);}
}
const solidBuildingBefore=inBuilding;
inBuilding=function(b,x,y){if(!b.walkIn)return solidBuildingBefore(b,x,y);if(x<b.x||x>=b.x+b.w||y<b.y||y>=b.y+b.h)return false;const perimeter=x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1;if(!perimeter)return false;const [dx,dy]=doorThreshold(b.service);return !(y===dy&&x===dx&&b.service.openedAt!==undefined);};
// Door clicks operate the leaf; exposed interior ground remains directly walkable.
function buildingRoofHidden(b,x=px,y=py){return !!b.walkIn&&Math.hypot(Math.max(b.x-x-.5,0,x+.5-b.x-b.w),Math.max(b.y-y-.5,0,y+.5-b.y-b.h))<=5;}
function withinWalkIn(b,x,y){return x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h;}
function doorNormal(o){return ({south:[0,1],east:[1,0],north:[0,-1],west:[-1,0]})[o.building?.doorFacing||'south'];}
function doorThreshold(o){const [dx,dy]=doorNormal(o);return [o.x-dx,o.y-dy];}
function doorApproach(o,inside=false){const [dx,dy]=doorNormal(o);return [o.x-dx*(inside?2:0),o.y-dy*(inside?2:0)];}
function doorOpenFraction(o){const m=o.doorMotion;if(!m)return o.openedAt===undefined?0:1;const t=Math.min(1,Math.max(0,(time-m.start)/.28)),e=t*t*(3-2*t);return m.from+(m.to-m.from)*e;}
function setWalkInDoor(o,open,restoring=false){
 const from=doorOpenFraction(o);if(open)o.openedAt=restoring?time-1:time;else delete o.openedAt;
 o.doorMotion=restoring?null:{from,to:open?1:0,start:time};
 const opened=new Set(Array.isArray(s.openDoors)?s.openDoors:[]);if(open)opened.add(o.destination);else opened.delete(o.destination);s.openDoors=[...opened];
 const nav=realmNavigation.get('overworld');if(nav){const [x,y]=doorThreshold(o);nav.cells[y*nav.w+x]=open?0:1;}if(!restoring)save();
}
function restoreWalkInDoors(world,position=null){
 const resume=position||{scene:s.sceneId,x:s.x,y:s.y},doors=world.buildings.filter(b=>b.walkIn),valid=new Set(doors.map(b=>b.service.destination)),legacy=s.doorStateVersion!==1;
 s.openDoors=(Array.isArray(s.openDoors)?s.openDoors:[]).filter(id=>valid.has(id));
 // One-time repair for old saves stranded behind a door whose state was lost.
 for(const b of doors)setWalkInDoor(b.service,s.openDoors.includes(b.service.destination)||(legacy&&resume.scene==='overworld'&&withinWalkIn(b,resume.x,resume.y)),true);
 s.doorStateVersion=1;
}
const engageBeforeWalkIn=engage;
let pendingWalkInDoor=null,pendingDoorApproachY=null,pendingDoorApproachX=null;
const stopBeforeWalkIn=stop;
stop=function(){pendingWalkInDoor=null;pendingDoorApproachY=null;pendingDoorApproachX=null;stopBeforeWalkIn();};
function operateWalkInDoor(o){
 pendingWalkInDoor=null;pendingDoorApproachY=null;pendingDoorApproachX=null;
 const [dx,dy]=doorThreshold(o);if(o.openedAt!==undefined&&Math.hypot(px-dx,py-dy)<.8){toast('Step clear of the doorway to close it.');return;}
 setWalkInDoor(o,o.openedAt===undefined);renderAction();
}
function approachWalkInDoor(o){
 const inside=withinWalkIn(o.building,px,py),[approachX,approachY]=doorApproach(o,inside);stop();
 const p=route(approachX,approachY,false);if(p===null){toast('There is no clear path to the door.');return;}
 path=p;pendingWalkInDoor=o;pendingDoorApproachX=approachX;pendingDoorApproachY=approachY;renderAction();
}
engage=function(o){if(o.building?.walkIn)return approachWalkInDoor(o);return engageBeforeWalkIn(o);};
const openBuildingBeforeWalkIn=openBuilding3;
openBuilding3=function(b){if(b.walkIn)return walkTo(...doorApproach(b.service,withinWalkIn(b,px,py)));return openBuildingBeforeWalkIn(b);};
updateDoorThreshold=function(){
 if(!inWorld())return;
 if(pendingWalkInDoor&&!path.length&&Math.hypot(px-pendingDoorApproachX,py-pendingDoorApproachY)<.02)operateWalkInDoor(pendingWalkInDoor);
 const b=buildings.find(b=>b.walkIn&&withinWalkIn(b,px,py));
 if(b&&s.insideBuilding!==b.service.destination){s.insideBuilding=b.service.destination;if(b.archetype==='inn')tutorialEvent('inn');}
 else if(!b)s.insideBuilding=null;
};
const enterBeforeWalkIn=enterInterior;
enterInterior=function(o){if(o.building?.walkIn)return engage(o);return enterBeforeWalkIn(o);};
const regionBeforeWalkIn=regionInfo;
regionInfo=function(){if(inWorld()&&s.insideBuilding){const b=buildings.find(b=>b.service?.destination===s.insideBuilding);if(b)return [b.name,'Walk through the door to return outside'];}return regionBeforeWalkIn();};
returnToVillage=function(){
 activateScene('overworld',42,51);
 for(let radius=0;radius<8;radius++)for(let z=51-radius;z<=51+radius;z++)for(let x=42-radius;x<=42+radius;x++){
  if(!land(x,z)||worldWaterDistance(x+.5,z+.5)<4||objects.some(o=>o.type==='tree'&&Math.hypot(o.x-x,o.y-z)<4))continue;
  activateScene('overworld',x,z);return;
 }
};

bridge3=function(r,z){realmBridge(r,111.5,z+3.5,16,6,true);};

// The arch, parapets and walking deck share the same world-space profile.
realmBridge=function(r,x,z,span,width,eastWest){
 const b={x,z,span,width,eastWest},at=(u,v,h=0)=>{const xx=x+(eastWest?u:v),zz=z+(eastWest?v:u);return [xx,bridgeDeckHeight(b,xx,zz)+h-landHeight(xx,zz),zz];},stone=materialRealm(r,18),courses=Math.ceil(span/.7);
 for(let i=0;i<courses;i++){
  const a=-span/2+i*span/courses,c=-span/2+(i+1)*span/courses;
  stone.face([at(a,-width/2),at(c,-width/2),at(c,width/2),at(a,width/2)],'#999c8c');
  for(const side of [-1,1]){
   const v=side*width/2,inside=v-side*.23;
   stone.face([at(a,v,-.4),at(c,v,-.4),at(c,v,.63),at(a,v,.63)],'#969b8c');
   stone.face([at(a,inside),at(a,inside,.63),at(c,inside,.63),at(c,inside)],'#a2a694');
   stone.face([at(a,v,.65),at(c,v,.65),at(c,inside,.65),at(a,inside,.65)],'#b6b8a1');
  }
 }
 // Curved masonry soffit leaves an actual open arch over the river.
 for(const side of [-1,1])for(let i=0;i<20;i++){
  const a=-span*.34+i*span*.68/20,c=-span*.34+(i+1)*span*.68/20,v=side*(width/2-.08),arch=u=>-.38-Math.pow(Math.abs(u)/(span*.34),3)*2.4;
  stone.face([at(a,v,-.37),at(c,v,-.37),at(c,v,arch(c)),at(a,v,arch(a))],'#828b80');
 }
 return 2;
};
