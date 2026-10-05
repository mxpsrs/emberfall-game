'use strict';
// Pair each underground transition without changing saved scene or object IDs.
function caveFurnitureFootprint(o,x=o.x,z=o.z){
 let hx=o.size||.65,hz=hx;
 if(o.kind==='model'){
  const mesh=rebuiltModels[o.model];if(!mesh)return [];
  const [lo,hi]=mesh.bounds,k=o.height/(hi[1]-lo[1]);hx=(hi[0]-lo[0])*k/2;hz=(hi[2]-lo[2])*k/2;
 }
 const a=o.heading||0,c=Math.cos(a),n=Math.sin(a),points=[];
 for(let ix=0;ix<=Math.ceil(hx*5);ix++)for(let iz=0;iz<=Math.ceil(hz*5);iz++){
  const dx=-hx+2*hx*ix/Math.max(1,Math.ceil(hx*5)),dz=-hz+2*hz*iz/Math.max(1,Math.ceil(hz*5));points.push([x+dx*c+dz*n,z-dx*n+dz*c]);
 }return points;
}
function caveFurnitureFits(scene,o,x=o.x,z=o.z){
 const lair=CREATURE_LAIRS[scene];
 return caveFurnitureFootprint(o,x,z).every(([a,b])=>lair.rooms.some(room=>lairContains(room,Math.floor(a),Math.floor(b)))&&!lairRockBlocked(scene,Math.floor(a),Math.floor(b)));
}
function arrangeCaveFurniture(scene){
 const w=worldScenes[scene],furniture=w.decor.filter(o=>o.kind==='model'&&/^World_/.test(o.model)||o.kind==='hearth'),placed=[];
 const radius=o=>{const points=caveFurnitureFootprint(o,0,0);return Math.max(.5,...points.map(p=>Math.hypot(...p)));};
 for(const o of furniture){
  const r=radius(o),clear=(x,z)=>caveFurnitureFits(scene,o,x,z)&&!placed.some(p=>Math.hypot(x-p.x,z-p.z)<r+p.r+.3)&&!w.objects.some(p=>(p.characterSprite||p.mainStoryKey||p.mountainKey||p.type==='exit')&&Math.hypot(x-p.x-.5,z-p.y-.5)<r+1.4);
  if(!clear(o.x,o.z)){
   const spots=[];for(let z=2;z<CREATURE_LAIRS[scene].size[1]-2;z++)for(let x=2;x<CREATURE_LAIRS[scene].size[0]-2;x++)if(Math.hypot(x-o.x,z-o.z)<16&&clear(x,z))spots.push([x,z]);
   spots.sort((a,b)=>Math.hypot(a[0]-o.x,a[1]-o.z)-Math.hypot(b[0]-o.x,b[1]-o.z));
   if(!spots.length)throw new Error('No grounded furniture position in '+scene+' for '+(o.model||o.kind));
   [o.x,o.z]=spots[0];
  }
  placed.push({x:o.x,z:o.z,r});
 }
}
let cavePassagesReady=false;
const caveSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){
 caveSetupBefore();if(cavePassagesReady)return;cavePassagesReady=true;
 for(const [scene,w]of Object.entries(worldScenes)){
  const kind=cavePassageKind(scene);if(!kind||!w.exit)continue;
  Object.assign(w.exit,{passageKind:kind,passageScene:scene,name:kind==='ladder'?'Ladder to the surface':'Cave opening to the surface'});
  for(const outside of Object.values(worldScenes)){
   const doors=new Set([...outside.objects,...outside.buildings.map(b=>b.service).filter(Boolean)].filter(o=>o.type==='door'&&o.destination===scene));
   for(const door of doors){Object.assign(door,{passageKind:kind,passageScene:scene});delete door.openedAt;if(!outside.objects.includes(door))outside.objects.push(door);}
   // Legacy mine/crypt shells must not leave a house door standing over a shaft.
   outside.buildings=outside.buildings.filter(b=>!doors.has(b.service)||b.walkIn);
  }
  if(CREATURE_LAIRS[scene])arrangeCaveFurniture(scene);
 }
 buildings.splice(0,buildings.length,...worldScenes[currentScene].buildings);realmNavigation.clear();(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(worldScenes[currentScene].objects):objects.splice(0,objects.length,...worldScenes[currentScene].objects));
 // Preserve progress and recover only coordinates invalidated by corrected scenery.
 if(!land(s.x,s.y)){const point=encounterSpawnPoint(currentScene,s.x,s.y,16)||worldScenes[currentScene].entry;[s.x,s.y]=point;[px,py]=point;path=[];}
};
const caveOptionsBefore=worldOptionsFor;
worldOptionsFor=function(o){
 if(!o.passageKind)return caveOptionsBefore(o);
 const verb=o.passageKind==='ladder'?(o.type==='exit'?'Climb up ':'Climb down '):(o.type==='exit'?'Leave through ':'Enter ');
 return [[verb+o.name,()=>select(o)],['Examine '+o.name,()=>toast(o.passageKind==='ladder'?'A fixed ladder connects this chamber to the surface.':'A rock tunnel connects this cavern to the world outside.')]];
};

const caveEngageBefore=engage;
engage=function(o){return o.passageKind?engageBeforeDoors(o):caveEngageBefore(o);};
