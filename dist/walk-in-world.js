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
function populateWalkInRooms(world){for(const b of world.buildings){if(!b.walkIn)continue;const room=worldScenes[b.service.destination];if(!room)continue;b.service.walkThrough=true;b.service.building=b;const [w,h]=sceneSizes[b.service.destination]||[16,14],used=new Set();
 const place=(original,x,y)=>{let chosen=null;for(let radius=0;radius<Math.max(b.w,b.h)&&!chosen;radius++)for(let dz=-radius;dz<=radius&&!chosen;dz++)for(let dx=-radius;dx<=radius&&!chosen;dx++){const a=x+dx,c=y+dz;if(a<=b.x||a>=b.x+b.w-1||c<=b.y||c>=b.y+b.h-1||used.has(a+':'+c)||c>b.y+b.h-4&&Math.abs(a-b.service.x)<2)continue;chosen=[a,c];}if(!chosen)return;const [a,c]=chosen;used.add(a+':'+c);world.objects.push({...original,interiorBuilding:b.service.destination,x:a,y:c,homeX:a,homeY:c,drawX:a,drawY:c});};
 for(const original of room.objects){if(original.type==='exit')continue;place(original,Math.round(b.x+1+(original.x/(w-1))*(b.w-3)),Math.round(b.y+1+(original.y/(h-1))*(b.h-3)));}
 const furnishings=b.archetype==='inn'?[['Bed',2,2],['Bed',b.w-3,2],['Dining table',Math.floor(b.w/2),Math.floor(b.h/2)],['Chair',Math.floor(b.w/2)+1,Math.floor(b.h/2)]]:b.archetype==='shop'?[['Display table',Math.floor(b.w/2),Math.floor(b.h/2)],['Supplies',b.w-2,b.h-3]]:b.archetype==='forge'?[['Tool table',2,b.h-3],['Supplies',b.w-2,2]]:[];
 for(const [i,[name,x,y]]of furnishings.entries())place({id:800000+b.service.id*10+i,type:'prop',name,sprite:12,dead:0},b.x+x,b.y+y);
 }
 if(inWorld()){objects.splice(0,objects.length,...world.objects);buildings.splice(0,buildings.length,...world.buildings);}
 // Existing saves inside a shop now resume inside that shop's physical world footprint.
 const b=world.buildings.find(b=>b.walkIn&&b.service.destination===s.sceneId);if(b){const [w,h]=sceneSizes[s.sceneId]||[16,14],x=Math.round(b.x+1+s.x/(w-1)*(b.w-3)),y=Math.round(b.y+1+s.y/(h-1)*(b.h-3));activateScene('overworld',x,y,false);}
}
const solidBuildingBefore=inBuilding;
inBuilding=function(b,x,y){if(!b.walkIn)return solidBuildingBefore(b,x,y);if(x<b.x||x>=b.x+b.w||y<b.y||y>=b.y+b.h)return false;const perimeter=x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1;if(!perimeter)return false;return !(y===b.y+b.h-1&&x===b.service.x&&b.service.openedAt!==undefined);};
const engageBeforeWalkIn=engage;
let pendingWalkInDoor=null;
const stopBeforeWalkIn=stop;
stop=function(){pendingWalkInDoor=null;stopBeforeWalkIn();};
function continueThroughDoor(o){o.openedAt=time;realmNavigation.clear();const p=route(o.x,o.y-2,false);pendingWalkInDoor=null;if(p===null){toast('The doorway is blocked.');return;}path=p;renderAction();}
engage=function(o){if(!o.building?.walkIn)return engageBeforeWalkIn(o);stop();if(o.openedAt!==undefined||Math.hypot(px-o.x,py-o.y)<1.1){continueThroughDoor(o);return;}const p=route(o.x,o.y,false);if(p===null){toast('There is no clear path to the door.');return;}path=p;pendingWalkInDoor=o;renderAction();};
updateDoorThreshold=function(){if(!inWorld())return;if(pendingWalkInDoor&&!path.length&&Math.hypot(px-pendingWalkInDoor.x,py-pendingWalkInDoor.y)<.2)continueThroughDoor(pendingWalkInDoor);const b=buildings.find(b=>b.walkIn&&px>b.x&&px<b.x+b.w-1&&py>b.y&&py<b.y+b.h-1);if(b&&s.insideBuilding!==b.service.destination){s.insideBuilding=b.service.destination;if(b.archetype==='inn')tutorialEvent('inn');}else if(!b)s.insideBuilding=null;};
const enterBeforeWalkIn=enterInterior;
enterInterior=function(o){if(o.building?.walkIn)return engage(o);return enterBeforeWalkIn(o);};
const regionBeforeWalkIn=regionInfo;
regionInfo=function(){if(inWorld()&&s.insideBuilding){const b=buildings.find(b=>b.service?.destination===s.insideBuilding);if(b)return [b.name,'Walk through the door to return outside'];}return regionBeforeWalkIn();};
returnToVillage=function(){activateScene('overworld',42,51);};

bridge3=function(r,z){realmBridge(r,112.5,z+4.5,11,8,true);};
