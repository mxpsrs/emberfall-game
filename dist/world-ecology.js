'use strict';
// One deterministic placement and elevation contract for the entire continent.
// This runs after architecture, water, roads, quest scenery and worksite props.
const ECOLOGY_VERSION=7,ecologyScenes=new Map(),ecologyRoads=new Map(),ecologyPads=new Map();
const ecologyReport={version:ECOLOGY_VERSION,scenes:{},roads:0,pads:0,removed:[],moved:[],added:0};
const ecologyLayouts={};
let ecologyReady=false;
const ecologyGradeBefore=gradeLand;
const ecoSmooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const ecoKey=(x,y,size=16)=>Math.floor(x/size)+':'+Math.floor(y/size);
function ecoIndex(map,value,left,top,right,bottom){for(let y=Math.floor(top/16);y<=Math.floor(bottom/16);y++)for(let x=Math.floor(left/16);x<=Math.floor(right/16);x++){const k=x+':'+y;if(!map.has(k))map.set(k,[]);map.get(k).push(value);}}
function ecoRectDistance(x,y,p){return Math.hypot(Math.max(p.left-x,0,x-p.right),Math.max(p.top-y,0,y-p.bottom));}
gradeLand=function(x,y,height){
 let h=ecologyGradeBefore(x,y,height);if(!ecologyReady||!['overworld','tutorial'].includes(currentScene))return h;
 // Existing civic foundations and the rat yard are already graded together.
 // Do not let a nearby resource pad or road reintroduce a slope through them.
 if(currentScene==='tutorial'&&FIRSTLIGHT_TOWN_PADS.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b))return FIRSTLIGHT_TOWN_LEVEL;
 // Excavations have authored terraces and a continuous ramp; retain their profile.
 if(currentScene==='overworld'&&quarryAt(x,y,8))return h;
 const pads=ecologyPads.get(currentScene)?.get(ecoKey(x,y))||[];
 let weight=0,total=0,strength=0;
 for(const p of pads){const d=ecoRectDistance(x,y,p);if(d>p.fade)continue;const blend=1-ecoSmooth(d/p.fade);if(d===0)return p.height;const w=blend/Math.max(.25,d*d);weight+=w;total+=w*p.height;strength=Math.max(strength,blend);}
 if(weight)h=h*(1-strength)+total/weight*strength;
 let best=0,roadHeight=h;
 for(const seg of ecologyRoads.get(currentScene)?.get(ecoKey(x,y))||[]){const d=roadSegmentDistance(x,y,seg),blend=1-ecoSmooth((d-seg.width)/7);if(blend<=best)continue;const dx=seg.b[0]-seg.a[0],dy=seg.b[1]-seg.a[1],t=Math.max(0,Math.min(1,((x-seg.a[0])*dx+(y-seg.a[1])*dy)/(dx*dx+dy*dy)));best=blend;roadHeight=seg.ha*(1-t)+seg.hb*t;}
 return h*(1-best)+roadHeight*best;
};
function ecologyTerrain(scene,w){
 const pads=new Map();ecologyPads.set(scene,pads);
 const pad=(left,top,right,bottom,height,reason,fade=7)=>{const p={left,top,right,bottom,height,fade,reason};ecoIndex(pads,p,left-fade,top-fade,right+fade,bottom+fade);ecologyReport.pads++;};
 if(scene==='overworld'){
  // Briarhaven keeps a level civic heart and individual foundations while the
  // land between districts rolls naturally toward the river and forest edge.
  pad(48,53,66,71,.75,'Briarhaven civic square',7);
  for(const b of w.buildings.filter(b=>b.settlement==='briarhaven'||b.x>=28&&b.x+b.w<=92&&b.y>=28&&b.y+b.h<=92)){const h=ecologyGradeBefore(b.x+b.w/2,b.y+b.h/2,landBase(b.x+b.w/2,b.y+b.h/2));pad(b.x-.5,b.y-.5,b.x+b.w+.5,b.y+b.h+.5,h,b.name+' foundation',5);}
  for(const t of SETTLEMENTS){if(t.id==='briarhaven')continue;const plan=settlementPlans.get(t.id),r=plan.radius*.52;pad(t.x-r,t.y-r,t.x+r,t.y+r,plan.grade,t.name+' civic ground',14);}
 }
 for(const o of w.objects){
  if(o.interiorBuilding||o.type==='tree'||fighter(o)||o.building)continue;
  if(o.placement){
   if(scene==='overworld'&&quarryAt(o.x,o.y,10))continue;
   const b=propBox(o),h=ecologyGradeBefore(o.x+.5,o.y+.5,landBase(o.x+.5,o.y+.5));
   // Terrain is interpolated between integer nodes, so keep a one-node rim
   // level around the model's actual footprint as well as its centre.
   pad(b.left-1.05,b.top-1.05,b.right+1.05,b.bottom+1.05,h,o.name+' support',4);
   continue;
  }
  if(o.walkThrough&&o.type!=='fish')continue;
  const briarSupport=scene==='overworld'&&o.type==='prop'&&o.x>=28&&o.x<=92&&o.y>=28&&o.y<=92;
  if(!(o.tutor||o.mainStoryKey||o.mountainKey||o.type==='ore'||o.type==='fish'||o.lairEntrance||o.passageKind||o.briarhavenDetail&&o.type==='prop'||briarSupport))continue;
  if(scene==='overworld'&&quarryAt(o.x,o.y,10))continue;
  const detailPad=o.briarhavenDetail||briarSupport;
  const h=ecologyGradeBefore(o.x+.5,o.y+.5,landBase(o.x+.5,o.y+.5)),r=o.lairEntrance||o.passageKind?2.5:o.tutor?2:detailPad?.85:1.2;
  if(worldWaterDistance(o.x+.5,o.y+.5)<5)continue;
  pad(o.x+.5-r,o.y+.5-r,o.x+.5+r,o.y+.5+r,h,o.name+' approach',6);
 }
 ecologyRoadTerrain(scene,pads);
}
function ecologyRoadTerrain(scene,pads){
 const roads=new Map();ecologyRoads.set(scene,roads);
 const source=scene==='overworld'?organicRoads:(worldScenes.tutorial?.roads||[]),nodes=new Map(),edges=[];
 const node=(x,y)=>{const key=Math.round(x*100)+':'+Math.round(y*100);if(nodes.has(key))return nodes.get(key);let height=ecologyGradeBefore(x,y,landBase(x,y));for(const p of pads.get(ecoKey(x,y))||[])if(ecoRectDistance(x,y,p)===0){height=p.height;break;}const n={x,y,height};nodes.set(key,n);return n;};
 for(const seg of source){const len=Math.hypot(seg.b[0]-seg.a[0],seg.b[1]-seg.a[1]),n=Math.max(1,Math.ceil(len/5));let a=node(...seg.a);for(let i=1;i<=n;i++){const b=node(seg.a[0]+(seg.b[0]-seg.a[0])*i/n,seg.a[1]+(seg.b[1]-seg.a[1])*i/n);edges.push({a,b,width:seg.width||1.5});a=b;}}
 // Preserve valleys and ridges away from travel, while limiting road-only grades.
 for(let pass=0;pass<6;pass++)for(const e of pass%2?[...edges].reverse():edges){const limit=.22*Math.hypot(e.a.x-e.b.x,e.a.y-e.b.y);if(e.a.height>e.b.height+limit)e.a.height=e.b.height+limit;if(e.b.height>e.a.height+limit)e.b.height=e.a.height+limit;}
 for(const e of edges){const seg={a:[e.a.x,e.a.y],b:[e.b.x,e.b.y],ha:e.a.height,hb:e.b.height,width:e.width};const p=e.width+7;ecoIndex(roads,seg,Math.min(e.a.x,e.b.x)-p,Math.min(e.a.y,e.b.y)-p,Math.max(e.a.x,e.b.x)+p,Math.max(e.a.y,e.b.y)+p);ecologyReport.roads++;}
}
function ecologyTreeRadius(o){const look=treeAppearance(o),mesh=rebuiltModels[look.model],b=mesh?.bounds;return b?Math.max(1,(Math.max(b[1][0]-b[0][0],b[1][2]-b[0][2])/(b[1][1]-b[0][1]))*look.height*.45):1.7;}
function ecologyContext(scene,w){
 const ctx={scene,w,caves:w.objects.filter(o=>o.passageKind==='cave'||o.lairEntrance),walls:new Map(),trees:new Map(),obstacles:new Map(),buildings:new Map(),roads:new Map(),blocked:new Set(),placed:[]};
 for(const wall of civilWalls.get(scene)?.values()||[])ecoIndex(ctx.walls,wall,wall.x-8,wall.y-8,wall.x+8,wall.y+8);
 for(const b of w.buildings)ecoIndex(ctx.buildings,b,b.x-8,b.y-8,b.x+b.w+8,b.y+b.h+8);
 for(const o of w.objects.filter(o=>o.type!=='tree')){
  const x=o.homeX??o.x,y=o.homeY??o.y;if(!Number.isFinite(x+y))continue;
  ecoIndex(ctx.obstacles,o,x-9,y-9,x+9,y+9);
  if(!o.walkThrough&&!o.collected)for(const [a,b]of o.propKind?propCollisionTiles(o):[[x,y]])ctx.blocked.add(a+':'+b);
 }
 const source=scene==='overworld'?organicRoads:(worldScenes.tutorial?.roads||[]);
 for(const seg of source){const p=seg.width+7;ecoIndex(ctx.roads,seg,Math.min(seg.a[0],seg.b[0])-p,Math.min(seg.a[1],seg.b[1])-p,Math.max(seg.a[0],seg.b[0])+p,Math.max(seg.a[1],seg.b[1])+p);}
 return ctx;
}
function ecologyTreeProblem(ctx,o,x=o.x,y=o.y){
 const r=ecologyTreeRadius(o),[mw,mh]=sceneSizes[ctx.scene]||[1152,768];
 if(x<2||y<2||x>=mw-2||y>=mh-2||worldWaterDistance(x+.5,y+.5)<Math.max(1.3,r*.65)||water(x,y)||worldWall(x,y))return 'water or boundary';
 const key=ecoKey(x,y);
 for(const wall of ctx.walls.get(key)||[])if(Math.hypot(x-wall.x,y-wall.y)<r+1.2)return 'wall clearance';
 // Cave rocks extend behind the interaction marker; reserve their whole outcrop.
 for(const p of ctx.caves)if(Math.hypot(x-(p.homeX??p.x),y-(p.homeY??p.y)+3)<8+r)return 'cave outcrop clearance';
 for(const b of ctx.buildings.get(key)||[])if(x>b.x-r-1.4&&x<b.x+b.w+r+.4&&y>b.y-r-1.4&&y<b.y+b.h+r+.4)return 'building clearance';
 for(const seg of ctx.roads.get(key)||[])if(roadSegmentDistance(x+.5,y+.5,seg)<seg.width+1.2+r*.65)return 'road corridor';
 if(roadInfluence(x+.5,y+.5)[0]>.08)return 'square or travelled ground';
 if(ctx.scene==='overworld'){
  for(const b of physicalBridges||[])if(b._generatedBridge?globalThis.VeldrenBridgeScene.approach(b,x,y,r):Math.abs(b.eastWest?x-b.x:y-b.z)<b.span/2+2+r&&Math.abs(b.eastWest?y-b.z:x-b.x)<b.width/2+1+r)return 'bridge approach';
  for(const t of SETTLEMENTS){const plan=settlementPlans.get(t.id);if(Math.hypot(x-t.x,y-t.y)<Math.min(20,plan.radius*.38))return 'civic clearing';}
  if(Math.hypot(x-BRIARHAVEN_PLAZA[0],y-BRIARHAVEN_PLAZA[1])<8)return 'arrival clearing';
 }
 for(const p of ctx.obstacles.get(key)||[]){const px=p.homeX??p.x,py=p.homeY??p.y,important=p.tutor||p.mainStoryKey||p.mountainKey||p.lairEntrance||p.passageKind||p.type==='door'||p.type==='gate'||p.type==='bank'||p.type==='shop';const gap=important?3.3+r*.65:p.type==='ore'||p.type==='fish'?2.3+r*.6:p.characterSprite||fighter(p)?2.2+r*.55:(p.collisionRadius||.6)+r*.75+.6;if(Math.hypot(x-px,y-py)<gap)return important?'interaction sightline':'prop or actor clearance';}
 for(const p of ctx.trees.get(key)||[])if(p!==o&&Math.hypot(x-p.x,y-p.y)<r+ecologyTreeRadius(p)+.35)return 'canopy overlap';
 const h=landHeight(x+.5,y+.5),slope=Math.max(...[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>Math.abs(landHeight(x+.5+dx,y+.5+dy)-h)));
 if(slope>.7)return 'steep resource footing';
 const usable=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const a=x+dx,b=y+dy;return !water(a,b)&&!worldWall(a,b)&&!ctx.blocked.has(a+':'+b)&&!(ctx.buildings.get(ecoKey(a,b))||[]).some(h=>inBuilding(h,a,b))&&Math.abs(landHeight(a+.5,b+.5)-h)<.72;});
 return usable?null:'no harvesting approach';
}
function ecologyPlace(ctx,o,x,y,purpose){Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y,ecology:{purpose,version:ECOLOGY_VERSION}});ctx.placed.push(o);const r=ecologyTreeRadius(o)+5;ecoIndex(ctx.trees,o,x-r,y-r,x+r,y+r);ctx.blocked.add(x+':'+y);}
function ecologyPlant(scene,w){
 const ctx=ecologyContext(scene,w),old=w.objects.filter(o=>o.type==='tree').sort((a,b)=>Number(!!b.tutorialRole)-Number(!!a.tutorialRole)||a.id-b.id),stats={before:old.length,kept:0,moved:0,removed:0,added:0};
 // Reuse build-time placements when the authored world still matches. Runtime
 // collision and heights remain live; only the expensive placement search is baked.
 let hash=2166136261;const source=JSON.stringify([ECOLOGY_VERSION,w.objects.map(o=>[o.id,o.type,o.homeX??o.x,o.homeY??o.y,o.resourceId]),w.buildings.map(b=>[b.x,b.y,b.w,b.h])]);for(const c of source)hash=Math.imul(hash^c.charCodeAt(0),16777619);const signature=String(hash>>>0);
 const cached=typeof ECOLOGY_LAYOUT!=='undefined'&&ECOLOGY_LAYOUT[scene];
 if(cached?.signature===signature&&!(typeof ecologyRegenerate!=='undefined'&&ecologyRegenerate)){
  const originals=new Map(old.map(o=>[o.id,o]));
  for(const [id,x,y,resourceId,treeArt,race,purpose]of cached.trees){const o=originals.get(id)||{id,type:'tree',name:TREE_RESOURCES[resourceId].name,resourceId,treeArt,race,sprite:4,dead:0,hitAt:-100};ecologyPlace(ctx,o,x,y,purpose);}
  w.objects=[...w.objects.filter(o=>o.type!=='tree'),...ctx.placed];ecologyScenes.set(scene,ctx);ecologyReport.scenes[scene]=cached.stats;ecologyReport.added+=cached.stats.added;ecologyReport.moved.push(...cached.moved);ecologyReport.removed.push(...cached.removed);ecologyLayouts[scene]=cached;return;
 }
 const movedStart=ecologyReport.moved.length,removedStart=ecologyReport.removed.length;
 for(const o of old){const problem=ecologyTreeProblem(ctx,o);if(!problem){ecologyPlace(ctx,o,o.x,o.y,o.realmScenery?'woodland edge':'resource grove');stats.kept++;continue;}
  let found=null;const max=o.tutorialRole?12:36;
  for(let radius=2;radius<=max&&!found;radius+=2)for(let i=0;i<16&&!found;i++){const a=i*2.399+Number(o.id)*.013,x=Math.round(o.x+Math.cos(a)*radius),y=Math.round(o.y+Math.sin(a)*radius);if(!ecologyTreeProblem(ctx,o,x,y))found=[x,y];}
  if(found){ecologyReport.moved.push({scene,id:o.id,from:[o.x,o.y],to:found,reason:problem});ecologyPlace(ctx,o,...found,'relocated woodland resource');stats.moved++;}
  else{if(o.tutorialRole)throw new Error('Required tutorial tree has no safe placement: '+o.tutorialRole);ecologyReport.removed.push({scene,id:o.id,reason:problem});stats.removed++;}
 }
 if(scene==='overworld'){
  // Forest patches, not a density multiplier: dry foothills are sparse, wet
  // woodland has willow edges, elven woodland carries higher-tier groves.
  for(let cy=24;cy<744;cy+=24)for(let cx=24;cx<1128;cx+=24){
   const seed=worldRand(cx*.317,cy*.431),kingdom=kingdomAt(cx,cy),forest=kingdom.race==='elf'?seed>.17:kingdom.race==='dwarf'?seed>.76:seed>.43;
   if(!forest||worldWaterDistance(cx,cy)<5||surfaceQuarries.some(q=>Math.abs(cx-q.x)<q.rx+14&&Math.abs(cy-q.y)<q.ry+14))continue;
   const clusterX=cx+(worldRand(cx+8,cy)-.5)*17,clusterY=cy+(worldRand(cx,cy+9)-.5)*17,count=kingdom.race==='dwarf'?5:9+Math.floor(seed*5);
   for(let i=0;i<count;i++){
    const angle=i*2.399+seed*6.28,radius=2+Math.sqrt(i)*3.1+(worldRand(cx+i,cy)-.5)*2,x=Math.round(clusterX+Math.cos(angle)*radius),y=Math.round(clusterY+Math.sin(angle)*radius);
    const waterEdge=worldWaterDistance(x+.5,y+.5)<9,key=waterEdge?'willow':kingdom.race==='elf'?['maple','yew','magic'][Math.floor(seed*17+i)%3]:Math.hypot(x-55,y-61)<110?'normal':['normal','oak','maple','yew'][Math.floor(seed*13+i)%4];
    const o={id:9100000+(cy/24*48+cx/24)*20+i,type:'tree',name:TREE_RESOURCES[key].name,resourceId:key,race:kingdom.race,treeArt:kingdom.race==='dwarf'?'pine':'broadleaf',sprite:4,dead:0,hitAt:-100};
    if(ecologyTreeProblem(ctx,o,x,y))continue;ecologyPlace(ctx,o,x,y,waterEdge?'riverbank grove':kingdom.race==='dwarf'?'foothill copse':'woodland patch');stats.added++;ecologyReport.added++;
   }
  }
 }
 w.objects=[...w.objects.filter(o=>o.type!=='tree'),...ctx.placed];stats.after=ctx.placed.length;ecologyScenes.set(scene,ctx);ecologyReport.scenes[scene]=stats;
 ecologyLayouts[scene]={signature,trees:ctx.placed.map(o=>[o.id,o.x,o.y,o.resourceId,o.treeArt||null,o.race||null,o.ecology.purpose]),stats,moved:ecologyReport.moved.slice(movedStart),removed:ecologyReport.removed.slice(removedStart)};
}
const ecologySetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){
 ecologySetupBefore();if(ecologyReady)return;
 const saved={scene:currentScene,x:s.x,y:s.y};
 for(const scene of ['overworld','tutorial']){const w=worldScenes[scene];currentScene=scene;(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(w.objects):objects.splice(0,objects.length,...w.objects));buildings.splice(0,buildings.length,...w.buildings);resetLandSurface();ecologyTerrain(scene,w);}
 ecologyReady=true;
 for(const [scene,w]of Object.entries(worldScenes)){
  if(!w.objects.some(o=>o.type==='tree')&&!['overworld','tutorial'].includes(scene))continue;
  currentScene=scene;(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(w.objects):objects.splice(0,objects.length,...w.objects));buildings.splice(0,buildings.length,...w.buildings);resetLandSurface();ecologyPlant(scene,w);
 }
 // Visual footings are finalized only after deterministic object placement
 // and ecology's terrain pass. Their elevation must not change resource IDs,
 // room furnishing or NPCs.
 if(typeof propFinalizeSupportPads==='function')propFinalizeSupportPads();
 propFootingsReady=true;
 currentScene=saved.scene;(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(worldScenes[currentScene].objects):objects.splice(0,objects.length,...worldScenes[currentScene].objects));buildings.splice(0,buildings.length,...worldScenes[currentScene].buildings);resetLandSurface();realmNavigation.clear();roadBuckets=null;miniTerrain=null;worldUnderstory.clear();worldObjectRevision++;
};
