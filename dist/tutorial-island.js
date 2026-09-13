'use strict';
// The apprenticeship owns an outdoor scene with no mainland entrance.
const TUTORIAL_SCENE='tutorial',TUTORIAL_ENTRY=[42,51],MAINLAND_ENTRY=[42,51];
let tutorialIslandReady=false,tutorialResume=null;
const tutorialComplete=state=>state.tutorialReward===true||state.tutorial>=tutorialSteps.length;
const insideTutorialArea=(x,y)=>Number.isFinite(x+y)&&x>=10&&x<=94&&y>=30&&y<=101;
const FIRSTLIGHT_LAYOUT_VERSION=2;
// The square and its civic lots were graded together before being paved.
// Keep a single finished elevation through the well, stalls and door aprons;
// broad earth banks meet the island's natural hills outside the developed area.
const FIRSTLIGHT_TOWN_LEVEL=.75;
const FIRSTLIGHT_TOWN_PADS=[[32,43,57,64],[29,31,42,43],[51,32,62,43],[57,49,70,62]];
const gradeBeforeFirstlight=gradeLand;
gradeLand=function(x,z,height){
 if(currentScene!==TUTORIAL_SCENE)return gradeBeforeFirstlight(x,z,height);
 let distance=Infinity;
 for(const [left,top,right,bottom]of FIRSTLIGHT_TOWN_PADS)distance=Math.min(distance,Math.hypot(Math.max(left-x,0,x-right),Math.max(top-z,0,z-bottom)));
 if(distance>=12)return height;
 const t=distance/12,blend=1-t*t*(3-2*t);
 return height*(1-blend)+FIRSTLIGHT_TOWN_LEVEL*blend;
};
const FIRSTLIGHT_COURTS=[
 {id:'square',x:43.5,y:53,rx:10,ry:8,paved:true,rect:true},
 {id:'woodland',x:24,y:47,rx:5,ry:4},
 {id:'fishing',x:28,y:64,rx:3,ry:4},
 {id:'smithy',x:79,y:47,rx:6,ry:4,paved:true},
 {id:'training',x:40,y:84,rx:4,ry:5},
 {id:'ratpen',x:56,y:82,rx:8,ry:6},
 {id:'shrine',x:28,y:88,rx:4,ry:4,paved:true},
 {id:'bank',x:56,y:42,rx:3,ry:2,paved:true},
 {id:'kitchen',x:73,y:67,rx:3,ry:3,paved:true},
 {id:'school',x:72,y:91,rx:3,ry:4,paved:true}
];
function moveFirstlightObject(o,dx,dy){for(const [x,y]of [['x','y'],['homeX','homeY'],['drawX','drawY']])if(Number.isFinite(o[x]+o[y])){o[x]+=dx;o[y]+=dy;}}
function moveFirstlightBuilding(island,id,x,y,facing){
 const b=island.buildings.find(b=>b.service.destination===id);if(!b)return;
 const old={x:b.x,y:b.y,facing:b.doorFacing||'south',...(b.southPlan?{w:b.southPlan.w,h:b.southPlan.h}:{w:b.w,h:b.h})};
 const local=(x,y)=>{const u=x-old.x,v=y-old.y;return old.facing==='east'?[old.w-1-v,u]:old.facing==='north'?[old.w-1-u,old.h-1-v]:old.facing==='west'?[v,old.h-1-u]:[u,v];};
 const door=local(b.service.x,b.service.y);
 b.x=x;b.y=y;b.doorFacing=facing;b.w=['east','west'].includes(facing)?old.h:old.w;b.h=['east','west'].includes(facing)?old.w:old.h;
 b.southPlan={x,y,w:old.w,h:old.h,service:{x:x+door[0],y:y+door[1]}};
 for(const o of island.objects)if(o===b.service||o.interiorBuilding===id){
  for(const [xx,yy]of [['x','y'],['homeX','homeY'],['drawX','drawY']])if(Number.isFinite(o[xx]+o[yy])){const [u,v]=local(o[xx],o[yy]);[o[xx],o[yy]]=buildingTile(b,x+u,y+v);}
  if(o!==b.service)o.roomYaw={south:0,east:Math.PI/2,north:Math.PI,west:-Math.PI/2}[facing];
 }
}
function arrangeFirstlight(island){
 // The island owns its placements, room plans and streets. Mainland lots stay put.
 const group=(test,dx,dy)=>island.objects.filter(o=>!o.interiorBuilding&&test(o)).forEach(o=>moveFirstlightObject(o,dx,dy));
 group(o=>o.tutor==='woods'||o.tutorialRole==='tree'||o.workplace==='woodland'||o.type==='prop'&&o.x>=22&&o.x<=30&&o.y>=44&&o.y<=49,-3,-2);
 group(o=>o.tutor==='mining'||['ore','tin','practice-forge','furnace'].includes(o.tutorialRole)||o.workplace==='smithy'||o.type==='prop'&&o.x>=64&&o.x<=75&&o.y>=42&&o.y<=46,11,3);
 group(o=>o.tutor==='worship'||o.tutorialRole==='cinder'||o.workplace==='shrine'||o.type==='prop'&&o.x>=40&&o.x<=43&&o.y>=62&&o.y<=67,-14,24);
 group(o=>o.tutor==='combat'||o.tutorialRole==='dummy'||o.workplace==='training'||o.type==='prop'&&!o.penFence&&o.x>=42&&o.x<=45&&o.y>=75&&o.y<=82,-4,5);
 moveFirstlightBuilding(island,'shop',60,51,'west');
 moveFirstlightBuilding(island,'forge',75,32,'west');
 moveFirstlightBuilding(island,'realm_briarhaven_4',52,33,'south');
 moveFirstlightBuilding(island,'village_kitchen',75,63,'west');
 moveFirstlightBuilding(island,'realm_briarhaven_3',74,87,'west');
 for(const [id,x,y]of [['bank',56,42],['school',72,91]]){const o=island.objects.find(o=>o.workplace===id);if(o)moveFirstlightObject(o,x-o.x,y-o.y);}
 const resident=island.objects.find(o=>o.tutorialRole==='town-resident');if(resident)moveFirstlightObject(resident,56-resident.x,59-resident.y);
 // Replace the old tiny square furniture with a furnished civic space.
 island.objects=island.objects.filter(o=>!(!o.interiorBuilding&&o.type==='prop'&&!o.workplace&&((o.x>=35&&o.x<=53&&o.y>=44&&o.y<=61)||['Merchant wagon','Tool table'].includes(o.name))));
 let id=5100000;
 const put=(type,name,x,y,extra={})=>{const o={id:id++,type,name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:12,dead:0,firstlightDetail:true,...extra};island.objects.push(o);return o;};
 for(const [name,x,y,extra]of [
  ['Village well',43,47,{collisionRadius:1.2}],['Village noticeboard',51,48,{}],
  ['Bench',36,49,{}],['Bench',36,58,{}],['Bench',49,59,{}],
  ['Flower planter',35,47,{}],['Flower planter',35,60,{}],['Flower planter',51,60,{}],
  ['Firstlight market stall',53,54,{collisionRadius:1.5}],['Firstlight market stall',36,54,{collisionRadius:1.5}],
  ['Square lantern',38,46,{}],['Square lantern',49,46,{}],['Square lantern',38,61,{}],['Square lantern',52,61,{}],
  ['Timber trail sign',28,45,{}],['Log pile',21,43,{}],['Axe chopping block',25,41,{}],
  ['Offering bowl',30,86,{}],['Flower planter',25,91,{}],['Bench',71,95,{}]
 ])put('prop',name,x,y,extra);
 const occupied=(x,y)=>island.buildings.some(b=>x>=b.x-2&&x<b.x+b.w+2&&y>=b.y-2&&y<b.y+b.h+2)||island.objects.some(o=>Math.hypot(o.x-x,o.y-y)<1.8);
 // Every new tree in Ash's working grove can be chopped at level one.
 const groveCandidates=[[13,33],[17,34],[21,33],[25,34],[28,33],[14,37],[18,38],[22,37],[26,38],[13,41],[17,42],[20,41],[28,41],[15,45],[18,46],[12,48],[16,50],[20,50],[15,53],[19,54],[22,53],[26,42]];
 for(let y=32;y<=44;y+=3)for(let x=12;x<=27;x+=3)groveCandidates.push([x+(y%2),y]);
 let planted=0;for(const [x,y]of groveCandidates){
  if(planted>=22)break;
  if(!occupied(x,y)){put('tree','Tree',x,y,{resourceId:'normal',sprite:4,firstlightGrove:true});planted++;}
 }
 // Remove incidental scenery from relocated rooms and their outdoor approaches.
 island.objects=island.objects.filter(o=>o.interiorBuilding||o.tutorialRole||o.penFence||o.workplace||o.firstlightDetail||!['tree','ore','prop','crop'].includes(o.type)||!island.buildings.some(b=>o.x>=b.x-1&&o.x<b.x+b.w+1&&o.y>=b.y-1&&o.y<b.y+b.h+1));
 for(const o of island.objects)if(o.workplace)o.name=o.name.replace(/Briarhaven/g,'Firstlight');
 island.roads=[];island.layoutVersion=FIRSTLIGHT_LAYOUT_VERSION;
}
function buildFirstlightStreets(){
 const island=worldScenes.tutorial;if(currentScene!=='tutorial'||island.roads.length)return;
 const front=id=>doorApproach(island.buildings.find(b=>b.service.destination===id).service,false);
 const town=[43,55],stops=[[27,48],[29,64],[28,91],[42,85],front('realm_briarhaven_3'),front('village_kitchen'),[79,50],front('realm_briarhaven_4'),front('inn')];
 const links=stops.map(p=>[town,p,true]);for(let i=1;i<stops.length;i++)links.push([stops[i-1],stops[i],false]);links.push([town,front('shop'),true]);
 for(const [a,b,paved]of links){
  const points=route(...b,true,1.45,...a);if(!points)throw new Error('Firstlight street cannot reach '+b);
  const line=[a,...points].map(p=>[p[0]+.5,p[1]+.5]);
  for(let i=1;i<line.length;i++)island.roads.push({a:line[i-1],b:line[i],width:paved?1.05:.75,paved:paved&&Math.hypot(line[i][0]-43,line[i][1]-53)<17});
 }
 island.roadBuckets=new Map();for(const seg of island.roads)for(let z=Math.floor((Math.min(seg.a[1],seg.b[1])-2)/8);z<=Math.floor((Math.max(seg.a[1],seg.b[1])+2)/8);z++)for(let x=Math.floor((Math.min(seg.a[0],seg.b[0])-2)/8);x<=Math.floor((Math.max(seg.a[0],seg.b[0])+2)/8);x++){const key=x+':'+z;if(!island.roadBuckets.has(key))island.roadBuckets.set(key,[]);island.roadBuckets.get(key).push(seg);}
 resetLandSurface();miniTerrain=null;mapServicesCache=null;
}
const roadsBeforeIsland=roadInfluence;
roadInfluence=function(x,z){
 if(currentScene!=='tutorial')return roadsBeforeIsland(x,z);
 const out=[0,0,0],smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 for(const seg of worldScenes.tutorial?.roadBuckets?.get(Math.floor(x/8)+':'+Math.floor(z/8))||[]){const amount=smooth((seg.width+.5-roadSegmentDistance(x,z,seg))/1.0);out[0]=Math.max(out[0],amount);if(seg.paved)out[1]=Math.max(out[1],amount);}
 for(const a of FIRSTLIGHT_COURTS){const dx=Math.abs((x-a.x)/a.rx),dz=Math.abs((z-a.y)/a.ry),d=a.rect?Math.pow(dx**6+dz**6,1/6):Math.hypot(dx,dz),amount=smooth((1.06-d)/.18);out[0]=Math.max(out[0],amount);if(a.paved)out[1]=Math.max(out[1],amount);}
 return out;
};
const journeyBeforeIsland=normalizeJourney;
normalizeJourney=function(state,original=state){
 const oldScene=original.sceneId,oldVersion=original.tutorialIslandVersion;
 journeyBeforeIsland(state,original);
 if(tutorialComplete(state)){
  state.tutorial=tutorialSteps.length;
  if(oldScene===TUTORIAL_SCENE){state.sceneId='overworld';[state.x,state.y]=MAINLAND_ENTRY;state.insideBuilding=null;state.openDoors=[];state.returnPoint=null;}
 }else{
  state.sceneId=TUTORIAL_SCENE;
  if(oldVersion!==FIRSTLIGHT_LAYOUT_VERSION||!insideTutorialArea(state.x,state.y)||oldScene&&oldScene!=='overworld'&&oldScene!==TUTORIAL_SCENE){[state.x,state.y]=TUTORIAL_ENTRY;state.insideBuilding=null;state.openDoors=[];}
  if(!oldVersion)for(const pile of state.groundLoot||[])if(pile.scene==='overworld'&&insideTutorialArea(pile.x,pile.y))pile.scene=TUTORIAL_SCENE;
 }
 state.tutorialIslandVersion=FIRSTLIGHT_LAYOUT_VERSION;
};
const worldBeforeIsland=setupExpandedWorld;
setupExpandedWorld=function(){
 tutorialResume??={scene:s.sceneId,x:s.x,y:s.y,doors:[...(s.openDoors||[])],inside:s.insideBuilding,islandVersion:s.tutorialIslandVersion};
 worldBeforeIsland();
};
const inWorldBeforeIsland=inWorld;
inWorld=function(){return currentScene===TUTORIAL_SCENE||inWorldBeforeIsland();};
const waterDistanceBeforeIsland=worldWaterDistance;
worldWaterDistance=function(x,y){
 const original=waterDistanceBeforeIsland(x,y);if(currentScene!==TUTORIAL_SCENE)return original;
 // Broad, wavy coast beyond every lesson; no bridge or land joins the mainland.
 const edge=Math.min(x-8.5+.7*Math.sin(y*.17),96-x+.7*Math.sin(y*.11),y-28+.6*Math.sin(x*.14),103-y+.7*Math.sin(x*.12));
 return Math.min(original,edge);
};
const villageBeforeIsland=setupTutorialVillage;
setupTutorialVillage=function(){
 villageBeforeIsland();if(tutorialIslandReady)return;
 const mainland=worldScenes.overworld;
 // Clone building/service relationships together, preserving the authored room layouts.
 const originals=mainland.objects.filter(o=>insideTutorialArea(o.x,o.y)&&!['boss','questgiver','exit'].includes(o.type)&&(!fighter(o)||o.tutorialRole||o.penId));
 const roomOriginals=mainland.buildings.filter(b=>insideTutorialArea(b.x,b.y)&&insideTutorialArea(b.x+b.w,b.y+b.h));
 const copies=new Map(originals.map(o=>[o,{...o}])),rooms=roomOriginals.map(b=>({...b}));
 rooms.forEach((b,i)=>{const source=roomOriginals[i],service=copies.get(source.service);b.service=service;if(service)service.building=b;});
 const islandObjects=[...copies.values()].filter(o=>o.type!=='door'||o.building?.walkIn&&rooms.includes(o.building));
 for(const o of islandObjects)if(o.interiorBuilding&&!rooms.some(b=>b.service?.destination===o.interiorBuilding))delete o.interiorBuilding;
 const island={objects:islandObjects,buildings:rooms.filter(b=>b.walkIn&&b.service),title:'Firstlight Isle',entry:[...TUTORIAL_ENTRY]};
 worldScenes[TUTORIAL_SCENE]=island;sceneSizes[TUTORIAL_SCENE]=[104,112];
 trainingPenGate=islandObjects.find(o=>o.type==='gate'&&o.penFence)||null;
 // Keep normal mainland services, but remove every tutor, lesson marker and practice target.
 mainland.objects=mainland.objects.flatMap(o=>{
  if(o.tutor==='guide'){const elder={...o,appearanceRole:'guide'};delete elder.tutor;delete elder.tutorialRole;return [elder];}
  if(o.tutor==='bank'){const banker={...o,type:'banker',name:'Briarhaven banker'};delete banker.tutor;delete banker.tutorialRole;return [banker];}
  if(o.tutor||o.penId||o.penFence||o.tutorialRole==='cinder'||['dummy','magic-dummy','practice-forge'].includes(o.tutorialRole)||o.workplace)return [];
  const copy={...o};delete copy.tutorialRole;return [copy];
 });
 // Reconnect mainland doors after replacing their object records.
 for(const b of mainland.buildings){const service=mainland.objects.find(o=>o.id===b.service?.id);if(service){b.service=service;service.building=b;}}
 arrangeFirstlight(island);
 const guide=islandObjects.find(o=>o.tutor==='guide');if(guide)guide.name='Elder Rowan';
 for(const b of island.buildings){b.name=b.name.replace(/Briarhaven/g,'Firstlight');b.service.name=b.name;}
 if(islandObjects.some(o=>o.spiritId==='cinder')){SPIRITS.cinder.scene=TUTORIAL_SCENE;SPIRITS.cinder.hint='Beside Keeper Sera on Firstlight Isle.';}
 tutorialIslandReady=true;realmNavigation.clear();resetLandSurface();miniTerrain=null;mapServicesCache=null;
 const resume=tutorialResume||{scene:s.sceneId,x:s.x,y:s.y,doors:s.openDoors||[]};
 const completed=tutorialComplete(s),destination=completed?(resume.scene===TUTORIAL_SCENE?'overworld':resume.scene||'overworld'):TUTORIAL_SCENE;
 s.openDoors=resume.doors||[];
 const migrating=!completed&&resume.islandVersion!==FIRSTLIGHT_LAYOUT_VERSION;
 const point=completed&&resume.scene===TUTORIAL_SCENE?MAINLAND_ENTRY:!completed&&(!insideTutorialArea(resume.x,resume.y)||migrating)?TUTORIAL_ENTRY:[resume.x,resume.y];
 activateScene(worldScenes[destination]?destination:'overworld',...point,false);
 if(currentScene===TUTORIAL_SCENE){buildFirstlightStreets();restoreWalkInDoors(island,{scene:'overworld',x:s.x,y:s.y});s.insideBuilding=buildings.find(b=>withinWalkIn(b,s.x,s.y))?.service.destination||null;}
 normalizeJourney(s);renderTutorial();
};
const activateBeforeIsland=activateScene;
activateScene=function(id,x,y,persist=true){
 if(tutorialIslandReady){
  if(id===TUTORIAL_SCENE&&tutorialComplete(s)){toast('Your apprenticeship is complete. Firstlight Isle is closed to mainland adventurers.');return false;}
  if(id!==TUTORIAL_SCENE&&!tutorialComplete(s)){toast('Finish your apprenticeship with Rowan before travelling to the mainland.');return false;}
 }
 const changed=currentScene!==id;if(changed){closeWorldOptions();if(window.realmTrade||window.realmWorkbench||window.equipmentStatsOpen)close();s.insideBuilding=null;resetLandSurface();mapServicesCache=null;}
 activateBeforeIsland(id,x,y,persist);if(id===TUTORIAL_SCENE&&tutorialIslandReady)buildFirstlightStreets();return currentScene===id;
};
const regionBeforeIsland=regionInfo;
regionInfo=function(){return currentScene===TUTORIAL_SCENE?['Firstlight Isle',s.insideBuilding?buildings.find(b=>b.service?.destination===s.insideBuilding)?.name||'Apprenticeship':'Apprenticeship · Depart with Elder Rowan']:regionBeforeIsland();};
const returnBeforeIsland=returnToVillage;
returnToVillage=function(){if(tutorialIslandReady&&!tutorialComplete(s))return activateScene(TUTORIAL_SCENE,...TUTORIAL_ENTRY);return returnBeforeIsland();};
function departTutorialIsland(){
 if(!tutorialComplete(s)||currentScene!==TUTORIAL_SCENE)return false;
 s.openDoors=[];s.returnPoint=null;s.insideBuilding=null;s.tutorialIslandVersion=FIRSTLIGHT_LAYOUT_VERSION;
 // Recover any protected overflow before leaving the one-way scene.
 for(const pile of s.groundLoot||[])if(pile.scene===TUTORIAL_SCENE&&pile.protectedDrop){for(const [id,n]of Object.entries(pile.items)){if(id==='coins')s.gold+=n;else s.bank[id]=(s.bank[id]||0)+n;}pile.items={};}
 s.groundLoot=(s.groundLoot||[]).filter(p=>p.scene!==TUTORIAL_SCENE);
 return activateScene('overworld',...MAINLAND_ENTRY,false);
}
// This sequence is deliberately transient: a reload during the cast resumes the
// final lesson; completion, belongings and the destination are saved together.
let tutorialCrossing=null;
function beginTutorialCrossing(){
 if(tutorialCrossing||currentScene!==TUTORIAL_SCENE||tutorialComplete(s)||tutorialStep()?.event!=='talk-finish')return false;
 if($('modal').open)close();stop();clearUseItem(false);closeWorldOptions();
 const rowan=tutorialTutor('guide'),remote=Math.hypot(rowan.x-px,rowan.y-py)>7;
 const caster=remote?{...rowan,x:px-2,y:py-1,drawX:px-2,drawY:py-1}:rowan;
 caster._castAt=time;caster._castDuration=2.6;
 tutorialCrossing={phase:'casting',age:0,caster,remote,committing:false,earned:false};
 playerHeading=Math.atan2(caster.x-px,caster.y-py);
 document.body.classList.add('tutorial-crossing');
 const veil=document.createElement('div');veil.id='tutorialCrossing';veil.setAttribute('role','status');veil.setAttribute('aria-live','polite');
 veil.innerHTML='<div class="crossing-veil"></div><p id="crossingCaption">Rowan opens the crossing…</p>';document.body.appendChild(veil);
 if(typeof playGameSound==='function')playGameSound('magic');return true;
}
function updateTutorialCrossing(dt){
 const crossing=tutorialCrossing;if(!crossing)return;
 crossing.age+=dt;
 if(crossing.phase==='casting'&&crossing.age>=2.6){
  crossing.committing=true;crossing.phase='saving';crossing.age=0;
  delete crossing.caster._castAt;delete crossing.caster._castDuration;
  tutorialEvent('talk-finish');
  $('crossingCaption').textContent='Crossing to Briarhaven…';
 }
 if(crossing.phase==='saving'){
  if(cloudReady&&(cloudBusy||cloudDirty)){if(!cloudBusy&&cloudDirty)flushCloudSave();}
  else{crossing.phase='arrival';crossing.age=0;$('crossingCaption').textContent='Briarhaven · The mainland';}
 }
 const opacity=crossing.phase==='casting'?Math.max(0,(crossing.age-2.15)/.45):crossing.phase==='saving'?1:Math.max(0,1-crossing.age/.6);
 $('tutorialCrossing')?.style.setProperty?.('--crossing-opacity',String(opacity));
 if(crossing.phase==='arrival'&&crossing.age>=1.1){
  tutorialCrossing=null;$('tutorialCrossing')?.remove();document.body.classList.remove('tutorial-crossing');showTutorialArrival(crossing.earned);
 }
}
function drawTutorialCrossing3(mesh){
 const crossing=tutorialCrossing;if(!crossing||crossing.phase==='saving')return;
 const arriving=crossing.phase==='arrival',t=crossing.age,fade=arriving?Math.max(0,1-t/1.1):Math.min(1,t/.4),x=px+.5,z=py+.5;
 const r=groundedPainter(mesh,x,z),glow=materialRealm(r,19),radius=arriving?.75+t*.8:.65+Math.min(1,t/2.6)*.35;
 for(const radiusScale of [1,1.25])for(let i=0;i<48;i++){
  const a=i*Math.PI/24,b=(i+1)*Math.PI/24,rr=radius*radiusScale,w=.025*fade;
  glow.face([[x+Math.cos(a)*(rr-w),.035,z+Math.sin(a)*(rr-w)],[x+Math.cos(a)*(rr+w),.035,z+Math.sin(a)*(rr+w)],[x+Math.cos(b)*(rr+w),.035,z+Math.sin(b)*(rr+w)],[x+Math.cos(b)*(rr-w),.035,z+Math.sin(b)*(rr-w)]],'#b0ead6');
 }
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6+t*.7,p=[x+Math.cos(angle)*radius,.05,z+Math.sin(angle)*radius];
  beamArt(glow,p,[p[0],.08+fade*.18,p[2]],.022*fade,'#e5dca2',5);
  const rise=(t*.8+i/12)%1,rr=radius*(1-rise*.55),size=(.02+Math.sin(rise*Math.PI)*.03)*fade;
  oval3(glow,x+Math.cos(angle)*rr,.1+rise*2.2,z+Math.sin(angle)*rr,size,size*1.6,size,'#cff6e1',p=>p,6);
 }
 if(!arriving){
  if(crossing.remote)creature3(mesh,crossing.caster,crossing.caster.x+.5,crossing.caster.y+.5);
  const c=crossing.caster,ground=walkSurfaceHeight(c.x+.5,c.y+.5)-walkSurfaceHeight(x,z);
  for(let i=0;i<7;i++){const u=(t*.65+i/7)%1;oval3(glow,(c.x+.5)*(1-u)+x*u,ground*(1-u)+1.35+Math.sin(u*Math.PI)*.4,(c.y+.5)*(1-u)+z*u,.045*fade,.045*fade,.045*fade,'#e0f2d6',p=>p,6);}
 }
}
for(const event of ['pointerdown','pointerup','click','keydown','wheel'])document.addEventListener(event,e=>{
 if(tutorialCrossing&&!cloudDisconnected){e.preventDefault();e.stopImmediatePropagation();}
},{capture:true,passive:false});
const atlasBeforeIsland=expandedMap;
expandedMap=function(page=0){if(currentScene===TUTORIAL_SCENE){openLocalMap();return;}return atlasBeforeIsland(page);};
const mapBeforeIsland=openLocalMap;
openLocalMap=function(selected=null){mapBeforeIsland(selected);if(currentScene===TUTORIAL_SCENE)$('mapKingdoms').hidden=true;};
worldMap=function(){openLocalMap();};$('mapBtn').onclick=worldMap;
const propBeforeFirstlight=prop3;
prop3=function(r,o,x,z){
 if(!o.firstlightDetail)return propBeforeFirstlight(r,o,x,z);
 const q=groundedPainter(r,x,z),wood=materialRealm(q,5);
 if(o.name==='Firstlight market stall'){
  worldModel(q,'Stall_Cart_Empty',x,0,z,1.4);
  for(const side of [-1,1]){box3(wood,x+side*1.05,1.25,z-.35,.12,2.5,.12,'#70563b');beamArt(wood,[x+side*1.05,2.3,z-.35],[x+side*1.05,2.3,z+.9],.055,'#866c4b',6);}
  worldRoof(q,x,2.45,z+.2,2.7,1.9,.45,o.id%2?'#7e5a47':'#657c68');
  worldModel(q,'Bucket_Wooden_1',x+.7,.65,z,.38);worldModel(q,'Crate_Wooden',x-1.2,0,z+.6,.5);return 3.1;
 }
 if(o.name==='Square lantern'){
  box3(wood,x,1.15,z,.14,2.3,.14,'#65503c');beamArt(wood,[x,2.25,z],[x+.48,2.25,z],.055,'#80684d',6);
  box3(q,x+.4,1.94,z,.3,.46,.3,'#3f4944');box3(materialRealm(q,19),x+.4,1.95,z+.16,.2,.3,.015,'#e6ba74');worldRoof(q,x+.4,2.19,z,.46,.46,.18,'#515b55');return 2.4;
 }
 if(o.name==='Timber trail sign'){
  box3(wood,x,.75,z,.13,1.5,.13,'#6d543c');box3(wood,x,1.28,z,1.3,.36,.12,'#997951');return 1.5;
 }
 return propBeforeFirstlight(r,o,x,z);
};
