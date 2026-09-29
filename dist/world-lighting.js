'use strict';
const WORLD_LIGHT_LIMIT=16,WORLD_LIT_ROOM_LIMIT=12;
function setupCaveTorches(scene){
 const previous=currentScene;currentScene=scene;
 try{
  const w=worldScenes[scene],[width,height]=sceneSize(),floor=[],candidates=[];
  const solid=(x,z)=>worldWall(x,z)||lairRockBlocked(scene,x,z);
  for(let z=1;z<height-1;z++)for(let x=1;x<width-1;x++)if(!solid(x,z)){
   floor.push([x+.5,z+.5]);
   const edge=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dz])=>solid(x+dx,z+dz));
   if(edge&&!w.objects.some(o=>(o.type==='exit'||o.mainStoryKey||o.mountainKey)&&Math.hypot(x-o.x,z-o.y)<2.5)&&!lairDecorBlocked(scene,x,z))candidates.push({x:x+.5+edge[0]*.35,z:z+.5+edge[1]*.35,dx:edge[0],dz:edge[1]});
  }
  const torches=[];
  for(const p of floor){if(torches.some(o=>Math.hypot(p[0]-o.x,p[1]-o.z)<11))continue;
   const c=candidates.filter(o=>!torches.some(t=>Math.hypot(t.x-o.x,t.z-o.z)<6)).reduce((best,o)=>!best||Math.hypot(p[0]-o.x,p[1]-o.z)<Math.hypot(p[0]-best.x,p[1]-best.z)?o:best,null);
   if(c&&!torches.includes(c))torches.push(c);
  }
  w.wallTorches=torches;
 }finally{currentScene=previous;}
}
let worldLightingReady=false;
const lightsSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){lightsSetupBefore();if(worldLightingReady)return;worldLightingReady=true;for(const id of Object.keys(worldScenes))if(cavePassageKind(id))setupCaveTorches(id);setupSettlementLanterns();};
function worldNightFactor(){const hours=worldHour();return hours>=20||hours<5?1:hours>=17?(hours-17)/3:hours<8?(8-hours)/3:0;}
function worldLightSources(scene=currentScene){
 if(globalThis.VeldrenLightScene?.enabled)return globalThis.VeldrenLightScene.sources(scene,worldNightFactor());
 const w=worldScenes[scene],sources=[],night=worldNightFactor(),inside=(x,z)=>w?.buildings.some(b=>b.walkIn&&x>b.x&&x<b.x+b.w&&z>b.y&&z<b.y+b.h),add=(x,y,z,radius,color=[1,.74,.45],intensity=1.25)=>sources.push({x,y:y+landHeight(x,z),z,radius,color,intensity});
 for(const o of w?.wallTorches||[])add(o.x,1.75,o.z,18);
 const nearby=scene===currentScene?worldObjectsInBounds(px-70,px+70,py-70,py+70):w?.objects||[];
 for(const o of nearby){
  if(o.interiorBuilding||inside(o.x+.5,o.y+.5)||o.collected||o.dead>time||Number.isFinite(o.expiresAt)&&o.expiresAt<=Date.now())continue;
  if(o.type==='camp')add(o.x+.5,.65,o.y+.5,13,[1,.65,.32],1.8);
  else if(o.streetLantern&&night>0)add(o.x+.5,2.75,o.y+.5,19,[1,.80,.51],1.7*night);
  else if(o.name==='Square lantern'&&night>0){const yaw=o.placement?.yaw||0;add(o.x+.5+Math.cos(yaw)*.4,1.95,o.y+.5-Math.sin(yaw)*.4,12,[1,.75,.43],1.5*night);}
  else if(o.type==='range'||o.type==='furnace')add(o.x+.5,1,o.y+.5,9,[1,.61,.28],1.5);
 }
 for(const o of w?.decor||[]){if(o.kind==='hearth'&&!inside(o.x,o.z))add(o.x,.55,o.z,13,[1,.65,.32],1.8);else if(o.kind==='crystal')add(o.x,1.4,o.z,8,[.35,.65,1],.9);}
 // Indoor illumination is confined to room bounds in the shader; no outdoor point source.
 return sources;
}
function houseLanternPosition(b){return {x:b.x+1.1,y:1.85,z:b.y+1.1};}
// Keep only the bounded nearest set; score each candidate once, with stable ties.
function realmNearestLighting(values,limit,score){
 const selected=[],scores=[];
 for(const value of values){const distance=score(value);if(!Number.isFinite(distance))continue;
  let i=scores.length;while(i>0&&distance<scores[i-1])i--;
  if(i>=limit)continue;selected.splice(i,0,value);scores.splice(i,0,distance);
  if(selected.length>limit){selected.pop();scores.pop();}
 }
 return selected;
}
function realmLightingState(){
 const night=worldNightFactor();
 const cave=!!cavePassageKind(currentScene),house=!inWorld()&&!cave;
 const lights=realmNearestLighting(worldLightSources(),WORLD_LIGHT_LIMIT,o=>{const dx=o.x-px,dz=o.z-py,d=dx*dx+dz*dz;return d<(o.radius+50)**2?d/(o.radius*o.radius):Infinity;});
 const buildings=worldScenes[currentScene]?.buildings||[];
 const nearest=realmNearestLighting(buildings,WORLD_LIT_ROOM_LIMIT,b=>{if(!b.walkIn)return Infinity;const dx=b.x+b.w/2-px,dz=b.y+b.h/2-py;return dx*dx+dz*dz;}),rooms=[],roomCeilings=[];
 for(const b of nearest){rooms.push([b.x+.6,b.y+.6,b.x+b.w-.6,b.y+b.h-.6]);roomCeilings.push(landHeight(b.x+b.w/2,b.y+b.h/2)+2.5);}
 return {lights,rooms,roomCeilings,cave:cave&&!CREATURE_LAIRS[currentScene]?.openAir?1:0,house:house?1:0,night:house?0:night};
}
function drawWallTorch3(r,o){
 const p=groundedPainter(r,o.x,o.z),iron='#45423b',wood='#765333';
 beamArt(p,[o.x+o.dx*.9,.65,o.z+o.dz*.9],[o.x,.65,o.z],.09,iron,6);
 beamArt(p,[o.x,.5,o.z],[o.x,1.65,o.z],.10,wood,6);
 oval3(p,o.x,1.5,o.z,.26,.24,.26,iron,v=>v,6);
 const flame=materialRealm(p,19),flicker=Math.sin(time*8+o.x*2+o.z)*.06;
 cone3(flame,o.x,1.57,o.z,.19,.52+flicker,'#efaa4b',7);cone3(flame,o.x,1.59,o.z,.10,.34-flicker,'#ffe2a0',6);
}
function drawHouseLantern3(r,b){
 const o=houseLanternPosition(b),p=groundedPainter(r,o.x,o.z),metal='#554a3c';
 beamArt(p,[b.x+.15,o.y+.4,o.z],[o.x,o.y+.4,o.z],.06,metal,6);
 for(const side of [-1,1]){beamArt(p,[o.x+side*.16,o.y-.2,o.z-.12],[o.x+side*.16,o.y+.2,o.z-.12],.035,metal,5);beamArt(p,[o.x+side*.16,o.y-.2,o.z+.12],[o.x+side*.16,o.y+.2,o.z+.12],.035,metal,5);}
 box3(materialRealm(p,19),o.x,o.y,o.z,.24,.32,.18,'#f0c47c');box3(p,o.x,o.y+.23,o.z,.4,.08,.34,metal);box3(p,o.x,o.y-.23,o.z,.4,.08,.34,metal);
 beamArt(p,[o.x,o.y+.27,o.z],[o.x,o.y+.4,o.z],.035,metal,5);
}
function drawWorldLightFixtures3(r,minx,maxx,minz,maxz){
 for(const o of worldScenes[currentScene]?.wallTorches||[])if(o.x>=minx-3&&o.x<=maxx+3&&o.z>=minz-3&&o.z<=maxz+3)drawWallTorch3(r,o);
 for(const b of buildings)if(b.walkIn&&b._cutaway&&b.x+b.w>=minx&&b.x<=maxx&&b.y+b.h>=minz&&b.y<=maxz)emitMesh3(r,cachedMesh3(b,'indoor-lantern',q=>{drawHouseLantern3(q,b);return 2.3;}));
}

function setupSettlementLanterns(){
 const previous=currentScene;let serial=8300000;
 try{for(const scene of ['overworld','tutorial']){
  currentScene=scene;const w=worldScenes[scene],placed=[],occupied=new Set(w.objects.filter(o=>!o.walkThrough).map(o=>o.x+':'+o.y));
  const forbidden=new Set();
  for(const b of w.buildings)for(let y=b.y-2;y<=b.y+b.h+2;y++)for(let x=b.x-2;x<=b.x+b.w+2;x++)if(inBuilding(b,x,y)||Math.hypot(x-b.service?.x,y-b.service?.y)<2.2)forbidden.add(x+':'+y);
  for(const b of w.buildings)if(b.service)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.hypot(dx,dy)<2.2)forbidden.add((b.service.x+dx)+':'+(b.service.y+dy));
  for(const o of w.objects.filter(o=>o.mainStoryKey||o.mountainKey||o.tutor||o.type==='fish'))for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)forbidden.add((o.x+dx)+':'+(o.y+dy));
  const clear=(x,y)=>!occupied.has(x+':'+y)&&!forbidden.has(x+':'+y)&&!water(x,y)&&worldWaterDistance(x+.5,y+.5)>1&&!worldWall(x,y);
  const place=(x,y,area)=>{if(placed.some(o=>Math.hypot(o.x-x,o.y-y)<9))return;const options=[];for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const a=Math.round(x+dx),b=Math.round(y+dy);if(clear(a,b)&&!placed.some(o=>Math.hypot(o.x-a,o.y-b)<9))options.push([a,b]);}options.sort((a,b)=>Math.hypot(a[0]-x,a[1]-y)-Math.hypot(b[0]-x,b[1]-y));const p=options[0];if(!p)return;const o={id:serial++,type:'prop',name:'Street lantern',streetLantern:true,settlementLight:area,x:p[0],y:p[1],homeX:p[0],homeY:p[1],dead:0};w.objects.push(o);placed.push(o);occupied.add(p[0]+':'+p[1]);};
  for(const b of w.buildings){if(!b.service)continue;place(b.service.x+3,b.service.y+2,b.settlement||b.name);if(b.archetype==='castle'||b.w>15){place(b.x-2,b.y+b.h+2,b.name);place(b.x+b.w+2,b.y+b.h+2,b.name);place(b.x+b.w/2,b.y-2,b.name);}}
  if(scene==='overworld')for(const town of SETTLEMENTS){
   const radius=town.kind==='city'?80:38;
   place(town.x+3,town.y+3,town.id);
   for(const seg of organicRoads){const dx=seg.b[0]-seg.a[0],dy=seg.b[1]-seg.a[1],length=Math.hypot(dx,dy);if(!length)continue;const count=Math.ceil(length/13);for(let i=0;i<=count;i++){const x=seg.a[0]+dx*i/count,y=seg.a[1]+dy*i/count;if(Math.hypot(x-town.x,y-town.y)>radius)continue;place(x-dy/length*2.6,y+dx/length*2.6,town.id);}}
  }else for(const o of [...w.objects].filter(o=>o.tutor||o.type==='elder'))place(o.x+3,o.y+3,'Firstlight Isle');
 }}finally{currentScene=previous;realmNavigation.clear();(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(worldScenes[previous].objects):objects.splice(0,objects.length,...worldScenes[previous].objects));}
}
function drawStreetLantern3(r,o,x,z){
 const p=groundedPainter(r,x,z),metal='#46453e';
 box3(p,x,.12,z,.44,.24,.44,'#83816c');beamArt(p,[x,.2,z],[x,3.25,z],.11,metal,7);
 beamArt(p,[x,3.25,z],[x+.35,3.25,z],.065,metal,6);
 box3(p,x,2.44,z,.56,.10,.56,metal);box3(p,x,3.07,z,.64,.10,.64,metal);
 for(const dx of [-.23,.23])for(const dz of [-.23,.23])beamArt(p,[x+dx,2.48,z+dz],[x+dx,3.02,z+dz],.045,metal,5);
 box3(materialRealm(p,19.25),x,2.76,z,.36,.46,.36,'#ffda8a');cone3(p,x,3.12,z,.43,.25,metal,4);return 3.4;
}
const streetLanternPropBefore=prop3;
prop3=function(p,o,x,z){return o.streetLantern?drawStreetLantern3(p,o,x,z):streetLanternPropBefore(p,o,x,z);};
