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
expandedWater=function(x,z){if(!physicalWorldReady)return waterBeforeWalkIn(x,z);if(!inWorld())return false;const a=x/3,b=z/3;if(a<96&&b<84)return borderWater(a,b);if(onRealmRoad(x,z)||SETTLEMENTS.some(t=>Math.hypot((x-t.x)/3,(z-t.y)/3)<32))return false;return (b>=150&&b<=153&&a>45&&a<365)||(a>=180&&a<=183&&b>5&&b<149)||(a>340&&b>170);};
const kingdomBeforeWalkIn=kingdomAt;
kingdomAt=function(x,z){return kingdomBeforeWalkIn(physicalWorldReady?x/3:x,physicalWorldReady?z/3:z);};
const settlementBeforeWalkIn=settlementAt;
settlementAt=function(x,z){if(!physicalWorldReady)return settlementBeforeWalkIn(x,z);return SETTLEMENTS.find(t=>Math.hypot((x-t.x)/(t.kind==='city'?90:45),(z-t.y)/(t.kind==='city'?90:40))<1);};
const oldLandBase=landBase;
landBase=function(x,z){return oldLandBase(physicalWorldReady?x/3:x,physicalWorldReady?z/3:z);};
function populateWalkInRooms(world){for(const b of world.buildings){if(!b.walkIn)continue;const room=worldScenes[b.service.destination];if(!room)continue;b.service.walkThrough=true;b.service.building=b;const [w,h]=sceneSizes[b.service.destination]||[16,14],used=new Set();for(const original of room.objects){if(original.type==='exit')continue;const o={...original,interiorBuilding:b.service.destination};let x=Math.round(b.x+1+(original.x/(w-1))*(b.w-3)),y=Math.round(b.y+1+(original.y/(h-1))*(b.h-3));for(let d=0;used.has(x+':'+y)&&d<8;d++)x=Math.min(b.x+b.w-2,x+1);used.add(x+':'+y);Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});world.objects.push(o);}}
 if(inWorld()){objects.splice(0,objects.length,...world.objects);buildings.splice(0,buildings.length,...world.buildings);}
 // Existing saves inside a shop now resume inside that shop's physical world footprint.
 const b=world.buildings.find(b=>b.walkIn&&b.service.destination===s.sceneId);if(b){const [w,h]=sceneSizes[s.sceneId]||[16,14],x=Math.round(b.x+1+s.x/(w-1)*(b.w-3)),y=Math.round(b.y+1+s.y/(h-1)*(b.h-3));activateScene('overworld',x,y,false);}
}
const solidBuildingBefore=inBuilding;
inBuilding=function(b,x,y){if(!b.walkIn)return solidBuildingBefore(b,x,y);if(x<b.x||x>=b.x+b.w||y<b.y||y>=b.y+b.h)return false;const perimeter=x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1;if(!perimeter)return false;return !(y===b.y+b.h-1&&x===b.service.x&&b.service.openedAt!==undefined);};
const engageBeforeWalkIn=engage;
engage=function(o){if(!o.building?.walkIn)return engageBeforeWalkIn(o);o.openedAt=time;realmNavigation.clear();const p=route(o.x,o.y-2,false);if(p===null){toast('There is no clear path through this doorway.');return;}stop();path=p;renderAction();};
updateDoorThreshold=function(){if(!inWorld())return;const b=buildings.find(b=>b.walkIn&&px>b.x&&px<b.x+b.w-1&&py>b.y&&py<b.y+b.h-1);if(b&&s.insideBuilding!==b.service.destination){s.insideBuilding=b.service.destination;tutorialEvent('inn');}else if(!b)s.insideBuilding=null;};
const enterBeforeWalkIn=enterInterior;
enterInterior=function(o){if(o.building?.walkIn)return engage(o);return enterBeforeWalkIn(o);};
const regionBeforeWalkIn=regionInfo;
regionInfo=function(){if(inWorld()&&s.insideBuilding){const b=buildings.find(b=>b.service?.destination===s.insideBuilding);if(b)return [b.name,'Walk through the door to return outside'];}return regionBeforeWalkIn();};
returnToVillage=function(){activateScene('overworld',42,51);};

const crossingsBeforeRooms=drawRealmCrossings;
drawRealmCrossings=function(r){crossingsBeforeRooms(r);for(const b of buildings){if(!b.walkIn||!b._cutaway)continue;for(let z=b.y+1;z<b.y+b.h-1;z++)for(let x=b.x+1;x<b.x+b.w-1;x++)r.face([[x,.045,z],[x,.045,z+1],[x+1,.045,z+1],[x+1,.045,z]],'#988975',null,3);}};

bridge3=function(r,z){realmBridge(r,112.5,z+4.5,11,8,true);};
