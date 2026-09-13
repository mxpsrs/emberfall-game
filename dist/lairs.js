'use strict';
// Authored encounter spaces. Stable scene IDs and mainland exits survive saves.
const CREATURE_LAIRS={
 lair_colossus:{title:'The Crystal Crucible',subtitle:'Runeforged Colossus · Ancient crystal foundry',boss:'colossus',theme:'crystal',size:[46,48],entry:[23,44],arena:[23.5,18.5],spawn:[23,18],entrance:[945,387],floor:'#3d4d58',trim:'#8a9ea6',glow:'#72cfff',fog:[.11,.18,.25],ambient:[.86,.97,1.13],light:[.08,.24,.37],rooms:[['ellipse',23,19,17,15],['rect',19,30,9,16],['ellipse',10,27,5,5],['ellipse',36,27,5,5]]},
 lair_veyr:{title:'The Shattered Sanctum',subtitle:'Veyr the Mindbreaker · Ruined arcane sanctuary',boss:'veyr',theme:'arcane',size:[44,48],entry:[22,44],arena:[22,19],spawn:[22,18],entrance:[45,9],floor:'#4a4353',trim:'#93836b',glow:'#bd96f5',fog:[.17,.13,.23],ambient:[1,.91,1.12],light:[.21,.10,.31],rooms:[['ellipse',22,19,15,14],['rect',8,18,28,16],['rect',18,31,9,15],['rect',3,24,7,11],['rect',34,24,7,11]]},
 lair_varkesh:{title:'Blightwing Roost',subtitle:'Varkesh the Blightwing · Blighted mountain eyrie',boss:'varkesh',theme:'blight',size:[58,58],entry:[29,54],arena:[29,22],spawn:[29,21],entrance:[270,105],floor:'#555342',trim:'#a29265',glow:'#a6c776',fog:[.22,.25,.16],ambient:[1.08,1.02,.84],light:[.15,.19,.05],openAir:true,rooms:[['ellipse',29,22,23,19],['rect',24,37,11,19],['ellipse',16,36,8,7],['ellipse',42,35,8,7]]},
 lair_xalith:{title:'The Brood Hollow',subtitle:'Xalith the Broodmother · Amber hive cavern',boss:'xalith',theme:'hive',size:[54,54],entry:[27,50],arena:[27,21],spawn:[27,20],entrance:[720,516],floor:'#554333',trim:'#9e7850',glow:'#e1b666',fog:[.20,.15,.09],ambient:[1.1,.96,.79],light:[.29,.16,.035],rooms:[['ellipse',27,21,19,17],['rect',23,36,9,16],['ellipse',10,32,6,8],['ellipse',44,32,6,8]]},
 ork_warrens:{title:'Ork Warrens',subtitle:'Ork camps · Raided dwarven workings',theme:'ork',size:[38,44],entry:[19,39],arena:[19,20],entrance:[657,198],spawns:[[12,13],[26,15],[12,30],[25,32]],floor:'#615646',trim:'#99866b',glow:'#e2ac62',fog:[.20,.17,.13],ambient:[1.02,.95,.85],light:[.25,.14,.045],rooms:[['rect',14,3,10,38],['rect',4,7,12,11],['rect',22,8,12,11],['rect',4,24,12,11],['rect',22,25,12,11]]}
};
let creatureLairsReady=false,pendingLairSave=null;
const FOREST_GIANT_HABITAT={name:'Elderwood giant grove',entry:[43,127],spawns:[[38,138],[49,145],[36,153]],center:[42,144]};
function creatureLairReleased(lair){return lair.boss?encounterReleased(lair.boss):lair.theme==='ork'&&!!creatureAssets.ork;}
function lairContains(room,x,z){return room[0]==='ellipse'?((x-room[1])/room[3])**2+((z-room[2])/room[4])**2<=1:x>=room[1]&&z>=room[2]&&x<room[1]+room[3]&&z<room[2]+room[4];}
const wallBeforeLairs=worldWall;
worldWall=function(x,z){const lair=CREATURE_LAIRS[currentScene];if(!lair)return wallBeforeLairs(x,z);return x<1||z<1||x>=lair.size[0]-1||z>=lair.size[1]-1||!lair.rooms.some(room=>lairContains(room,x,z));};
function lairDecorBlocked(scene,x,z,allowPlinth=false){
 return (worldScenes[scene]?.decor||[]).some(o=>{
  const dx=x+.5-o.x,dz=z+.5-o.z,k=o.size||1;
  if(o.kind==='model'){
   const mesh=rebuiltModels[o.model];if(!mesh)return false;
   const [lo,hi]=mesh.bounds,s=o.height/(hi[1]-lo[1]),a=o.heading||0,c=Math.cos(a),n=Math.sin(a);
   return Math.abs(dx*c-dz*n)<(hi[0]-lo[0])*s/2+.18&&Math.abs(dx*n+dz*c)<(hi[2]-lo[2])*s/2+.18;
  }
  if(o.kind==='arch')return [-1,1].some(side=>Math.abs(dx-side*2.6*k)<.55*k&&Math.abs(dz)<.6*k);
  const radius=o.kind==='plinth'&&!allowPlinth?k:o.kind==='pillar'?.8*k:o.kind==='crystal'?.85*k:o.kind==='egg'?1.35*k:o.kind==='hearth'?k+.2:0;
  return radius>0&&Math.hypot(dx,dz)<radius;
 });
}
const navigationBeforeLairs=realmNav;
realmNav=function(){
 const nav=navigationBeforeLairs();if(CREATURE_LAIRS[currentScene]&&!nav.lairDecor){
  for(let z=0;z<nav.h;z++)for(let x=0;x<nav.w;x++)if(lairDecorBlocked(currentScene,x,z))nav.cells[z*nav.w+x]=1;
  nav.lairDecor=true;
 }return nav;
};
function lairScenery(lair){
 const [cx,cz]=lair.arena,decor=[],model=(name,x,z,height,heading=0,tint)=>decor.push({kind:'model',model:name,x,z,height,heading,tint}),feature=(kind,x,z,size=1)=>decor.push({kind,x,z,size});
 if(lair.theme==='crystal'){
  for(const side of [-1,1]){for(let n=0;n<5;n++)feature('crystal',cx+side*(13+n%2),cz-8+n*4,1.25+n%3*.3);for(let n=0;n<4;n++)model('Rock_Medium_1',cx+side*(6+n*.2),36+n*2,1.5+n%2*.35,n*.9,[.61,.76,.91]);}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;feature('pillar',cx+Math.cos(a)*11,cz+Math.sin(a)*10,i%3===0?.72:1);}
  feature('dais',cx,cz,5.7);feature('plinth',lair.spawn[0]+.5,lair.spawn[1]+.5,2.1);feature('arch',23,34,1.3);
 }else if(lair.theme==='arcane'){
  for(const side of [-1,1]){for(let n=0;n<4;n++){model('Wall_UnevenBrick_Straight',cx+side*12,10+n*5,2.5,n%2*.08,[.80,.72,.92]);feature('crystal',cx+side*11,9+n*5,.55);}for(let n=0;n<3;n++)model('World_Bookcase_2',cx+side*16,25+n*3,1.8,side*Math.PI/2);}
  for(const side of [-1,1]){model('World_Table_Large',cx+side*15.5,30,1,Math.PI/2);model('World_BookStand',cx+side*13.5,27,1.15);}
  feature('dais',cx,cz,5.1);feature('arch',cx,35,1.35);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;model('Rock_Medium_3',cx+Math.cos(a)*14,cz+Math.sin(a)*12,.65+i%3*.15,a,[.8,.72,.88]);}
 }else if(lair.theme==='blight'){
  for(const [x,z,h]of [[11,13,6],[47,13,5.5],[9,29,4.5],[49,29,6],[17,7,4],[42,8,4.7],[16,39,3.8],[44,38,4.2]])model('Rock_Medium_1',x,z,h,x*.7,[.83,.82,.63]);
  for(const [x,z]of [[12,21],[46,20],[18,37],[40,39]]){feature('pool',x,z,2.3);model('TwistedTree_1',x-2,z+1,3.8,x,[.58,.58,.31]);}
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;model('Rock_Medium_3',cx+Math.cos(a)*15,cz+Math.sin(a)*12,1+i%2*.5,a,[.85,.82,.65]);}
  feature('nest',cx,cz-3,6);feature('arch',29,43,1.7);
 }else if(lair.theme==='hive'){
  for(const side of [-1,1])for(let n=0;n<5;n++){feature('egg',cx+side*(14+n%2),10+n*5,1+n%3*.25);model('Rock_Medium_3',cx+side*18,12+n*5,2.2+n%2*.5,n,[.95,.72,.42]);}
  for(const [x,z]of [[11,31],[43,31],[18,8],[37,7]]){feature('egg',x,z,1.6);feature('web',x,z,2.3);}
  feature('arch',27,38,1.5);feature('nest',cx,cz-2,5.5);
 }else{
  for(const [x,z]of [[7,10],[29,12],[8,28],[30,29]]){model('World_WeaponStand',x,z,1.6);model('World_Crate_Wooden',x+2,z,1);model('World_Barrel',x+1,z+2,1.1);model('World_Bed_Twin1',x-1,z+3,.7);feature('hearth',x+3,z+2,.65);}
  for(const side of [-1,1])for(let n=0;n<5;n++)model('Rock_Medium_1',19+side*5,5+n*7,1.5,n,[.81,.77,.66]);
  model('World_Workbench',29,32,1);model('World_Anvil_Log',9,31,.9);
 }
 return decor;
}
function setupCreatureLairs(){
 if(creatureLairsReady)return;creatureLairsReady=true;let id=5800000;
 const mainland=worldScenes.overworld;
 for(const [scene,lair]of Object.entries(CREATURE_LAIRS)){
  if(!creatureLairReleased(lair))continue;
  sceneSizes[scene]=lair.size;
  const exit={id:id++,type:'exit',name:'Return to '+(lair.theme==='crystal'?'Deepforge':lair.theme==='arcane'?'Hollow Ruins':lair.theme==='blight'?'Ashwatch':lair.theme==='hive'?'Moonwillow':'Khaz-Dur'),sprite:13,x:lair.entry[0],y:lair.entry[1]+1,dead:0};
  worldScenes[scene]={title:lair.title,subtitle:lair.subtitle,objects:[exit],buildings:[],entry:lair.entry.slice(),exit,lair:scene,decor:lairScenery(lair),floorChunks:new Map(),openAir:!!lair.openAir};
  // Clear scenery from the approach, preserving services and quest characters.
  for(let i=mainland.objects.length-1;i>=0;i--){const o=mainland.objects[i];if(['tree','prop'].includes(o.type)&&Math.abs(o.x-lair.entrance[0])<5&&Math.abs(o.y-lair.entrance[1])<5)mainland.objects.splice(i,1);}
  const point=encounterSpawnPoint('overworld',...lair.entrance,16);if(!point)throw new Error('No reachable entrance for '+lair.title);
  const door={id:id++,type:'door',name:lair.title,sprite:13,x:point[0],y:point[1],destination:scene,lairEntrance:scene,dead:0,homeX:point[0],homeY:point[1]};mainland.objects.push(door);lair.entrance=point;
  lair.returnPoint=encounterSpawnPoint('overworld',point[0],point[1]+2,6);
  if(!lair.returnPoint)throw new Error('No clear return point for '+lair.title);
 }
 setupForestGiantHabitat(mainland);realmNavigation.clear();objects.splice(0,objects.length,...worldScenes[currentScene].objects);
}
function setupForestGiantHabitat(world){
 if(!creatureAssets.forestgiant)return;const habitat=FOREST_GIANT_HABITAT;
 // Leave the mature canopy around the grove, with clear space at each home.
 for(let i=world.objects.length-1;i>=0;i--){const o=world.objects[i];if(!['tree','prop'].includes(o.type))continue;if(habitat.spawns.some(([x,z])=>Math.hypot(o.x-x,o.y-z)<3.8))world.objects.splice(i,1);}
 let serial=5900000;const place=(model,x,y,height,heading,tint)=>{const p=encounterSpawnPoint('overworld',x,y,3);if(!p||habitat.spawns.some(([a,b])=>Math.hypot(p[0]-a,p[1]-b)<3.6))return;world.objects.push({id:serial++,type:'prop',name:model==='Fern_1'?'Woodland ferns':model==='Bush_Common'?'Elderwood undergrowth':'Mossy boulder',sprite:12,x:p[0],y:p[1],dead:0,habitatModel:model,habitatHeight:height,heading,tint,walkThrough:model!=='Rock_Medium_1'});};
 for(const [i,[x,z]]of [[29,133],[43,131],[55,137],[57,151],[43,159],[28,154],[27,141]].entries()){
  place('Rock_Medium_1',x,z,1.1+(i%3)*.2,i*.8,[.76,.89,.65]);
  place('Bush_Common',x+2,z+1,.9,i*.7,[.88,1,.79]);
  place('Fern_1',x-1,z+2,.65,i*.4,[.94,1,.85]);
 }
 for(const [x,y]of [[32,133],[54,156]]){const p=encounterSpawnPoint('overworld',x,y,2);if(p)world.objects.push({id:serial++,type:'prop',name:'Log pile',sprite:12,x:p[0],y:p[1],dead:0});}
 for(const [x,y]of [[26,131],[30,126],[36,125],[49,128],[58,132],[60,139],[60,149],[54,162],[45,165],[37,166],[29,161],[23,155],[22,144],[23,136],[44,132],[51,136],[29,147]]){
  const p=encounterSpawnPoint('overworld',x,y,2);if(!p||habitat.spawns.some(([a,b])=>Math.hypot(p[0]-a,p[1]-b)<5.5))continue;
  world.objects.push({id:serial++,type:'tree',name:'Oak tree',resourceId:'oak',sprite:0,x:p[0],y:p[1],dead:0,collisionRadius:1});
 }
}
const expandedBeforeLairs=setupExpandedWorld;
setupExpandedWorld=function(){pendingLairSave=CREATURE_LAIRS[s.sceneId]?{id:s.sceneId,x:s.x,y:s.y}:null;return expandedBeforeLairs();};
const villageBeforeLairs=setupTutorialVillage;
setupTutorialVillage=function(){villageBeforeLairs();setupCreatureLairs();if(pendingLairSave&&worldScenes[pendingLairSave.id]&&s.tutorial>=tutorialSteps.length){activateScene(pendingLairSave.id,pendingLairSave.x,pendingLairSave.y,false);}pendingLairSave=null;};
const leaveBeforeLairs=leaveInterior;
leaveInterior=function(){const lair=CREATURE_LAIRS[currentScene];if(!lair)return leaveBeforeLairs();const point=lair.returnPoint||lair.entrance;activateScene('overworld',...point);};
const regionBeforeLairs=regionInfo;
regionInfo=function(){const lair=CREATURE_LAIRS[currentScene];if(lair)return [lair.title,lair.subtitle];if(inWorld()&&creatureAssets.forestgiant&&Math.hypot(px-42,py-144)<20)return [FOREST_GIANT_HABITAT.name,'Forest Giants · Level 18'];return regionBeforeLairs();};
function lairModel(r,name,x,y,z,height,heading=0,tint){
 const mesh=rebuiltModels[name];if(!mesh)return 0;const [lo,hi]=mesh.bounds,k=height/(hi[1]-lo[1]),cx=(lo[0]+hi[0])*.5*k,cz=(lo[2]+hi[2])*.5*k,c=Math.cos(heading),s=Math.sin(heading);
 rebuiltPlace(r,name,x-cx*c-cz*s,y-lo[1]*k,z+cx*s-cz*c,k,heading,k,tint);return height;
}
function lairRing(r,x,z,radius,width,color,y=.065){for(let i=0;i<64;i++){const a=i/64*Math.PI*2,b=(i+1)/64*Math.PI*2;r.face([[x+Math.cos(a)*radius,y,z+Math.sin(a)*radius],[x+Math.cos(b)*radius,y,z+Math.sin(b)*radius],[x+Math.cos(b)*(radius-width),y,z+Math.sin(b)*(radius-width)],[x+Math.cos(a)*(radius-width),y,z+Math.sin(a)*(radius-width)]],color,null,19);}}
function lairPillar(r,x,z,k,glow){
 const stone=materialRealm(r,18),metal=materialRealm(r,7);
 profile3(stone,x,1.65*k,z,1.25*k,3.3*k,1.25*k,[[-.5,1.35],[-.40,1.35],[-.34,.85],[.32,.85],[.37,1.1],[.45,1.1],[.5,1.25]],'#848e95',p=>p,8);
 for(const y of [.5,2.65])profile3(metal,x,y*k,z,1.16*k,.1*k,1.16*k,[[-.5,1],[.5,1]],'#586776',p=>p,8);
 const light=materialRealm(r,19);for(const side of [-1,1]){
  const xx=x+side*.57*k;beamArt(light,[xx,1.1*k,z-.18*k],[xx,1.9*k,z+.18*k],.025*k,glow,4);beamArt(light,[xx,1.9*k,z+.18*k],[xx,2.2*k,z-.18*k],.025*k,glow,4);
 }
}
function drawLairFeature(r,o,lair){
 const {x,z}=o,k=o.size||1,glow=lair.boss==='colossus'&&typeof activeEncounter!=='undefined'&&activeEncounter?.o.encounter==='colossus'&&activeEncounter.phase===1?'#f3776b':lair.glow,stone=materialRealm(r,18),light=materialRealm(r,19);
 if(o.kind==='crystal'){
  lairModel(r,'Rock_Medium_3',x,0,z,k*.9,x,[.62,.72,.81]);
  for(let n=0;n<5;n++){const a=n*2.4,xx=x+Math.cos(a)*k*.45,zz=z+Math.sin(a)*k*.45,h=(n?1.2+n%3*.35:2.7)*k;profile3(n?materialRealm(r,7):light,xx,h*.5,zz,k*.5,h,k*.48,[[-.5,.9],[-.33,1],[.30,.85],[.5,0]],n?shade3(glow,.6+n*.065):glow,p=>p,6);}
 }else if(o.kind==='pillar')lairPillar(r,x,z,k,glow);
 else if(o.kind==='plinth'){
  profile3(stone,x,.14,z,k*2,.28,k*2,[[-.5,1],[.20,1],[.5,.9]],'#7b8592',p=>p,16);lairRing(r,x,z,k-.15,.07,glow,.29);
 }else if(o.kind==='dais'){
  for(const radius of [k,k-.55,k*.7])lairRing(r,x,z,radius,.07,lair.trim,.05);
  lairRing(r,x,z,k*.5,.055,glow);for(let i=0;i<12;i++){const a=i/12*Math.PI*2,xx=x+Math.cos(a)*(k-.25),zz=z+Math.sin(a)*(k-.25);beamArt(light,[xx-.12,.07,zz],[xx+.12,.07,zz+.15],.018,glow,4);}
 }else if(o.kind==='arch'){
  const hive=lair.theme==='hive',color=hive?'#98714b':lair.trim;
  for(const side of [-1,1]){if(!hive){if(lair.theme==='crystal')lairPillar(r,x+side*2.6*k,z,k,glow);else lairModel(r,'Wall_UnevenBrick_Straight',x+side*2.6*k,0,z,3.3*k,0,[.75,.8,.88]);}const points=[[x+side*3*k,0,z],[x+side*2.8*k,2*k,z],[x+side*1.7*k,3.7*k,z],[x,4.25*k,z]];for(let i=0;i<3;i++)beamArt(stone,points[i],points[i+1],(hive?.23:.17)*k,color,8);}
  if(!hive)profile3(light,x,3.7*k,z,.45*k,.8*k,.45*k,[[-.5,0],[0,1],[.5,0]],glow,p=>p,6);
 }else if(o.kind==='egg'){
  for(let i=0;i<3;i++){const xx=x+(i-1)*k*.7,zz=z+i%2*k*.5;profile3(materialRealm(r,7),xx,k*.7,zz,k*.82,k*1.4,k*.8,[[-.5,.48],[-.3,.88],[.08,1],[.35,.7],[.5,.13]],i===1?shade3(glow,.68):'#8c754d',p=>p,14);for(let j=0;j<5;j++){const a=j/5*Math.PI*2;beamArt(stone,[xx+Math.cos(a)*k*.43,k*.8,zz+Math.sin(a)*k*.43],[xx+Math.cos(a)*k*.23,k*1.25,zz+Math.sin(a)*k*.23],.021,'#584b37',5);}}
 }else if(o.kind==='web'){
  for(let j=0;j<6;j++){const a=j/6*Math.PI*2;beamArt(r,[x,.08,z],[x+Math.cos(a)*k,.10,z+Math.sin(a)*k],.012,'#b7ae87',4);}for(let j=1;j<5;j++)lairRing(r,x,z,j*k/4,.015,'#a79f7a',.09);
 }else if(o.kind==='nest'){
  for(let i=0;i<26;i++){const a=i/26*Math.PI*2,rad=k+Math.sin(i*7)*.35;beamArt(materialRealm(r,5),[x+Math.cos(a)*rad,.09,z+Math.sin(a)*rad],[x+Math.cos(a+.25)*(rad+.3),.18,z+Math.sin(a+.25)*(rad+.3)],.06,lair.theme==='hive'?'#8b6947':'#7d7856',7);}
 }else if(o.kind==='pool'){
  profile3(materialRealm(r,7),x,.02,z,k*2,.07,k*1.6,[[-.5,1],[.5,1]],'#556a35',p=>p,24);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;lairModel(r,'Rock_Medium_3',x+Math.cos(a)*k,.02,z+Math.sin(a)*k*.8,.33,i,[.73,.8,.49]);}
 }else if(o.kind==='hearth'){
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;lairModel(r,'Rock_Medium_3',x+Math.cos(a)*k,0,z+Math.sin(a)*k,.35,a);}
  profile3(light,x,.38,z,.6,.76,.6,[[-.5,1],[-.1,.6],[.5,0]],'#dc9c55',p=>p,9);
 }
}
function drawCreatureLair(r,minx,maxx,minz,maxz){
 const lair=CREATURE_LAIRS[currentScene];if(!lair)return;const world=worldScenes[currentScene];
 for(let z=Math.floor(minz/8)*8;z<=maxz;z+=8)for(let x=Math.floor(minx/8)*8;x<=maxx;x+=8){const key=x+':'+z;let tile=world.floorChunks.get(key);if(!tile){tile={};world.floorChunks.set(key,tile);}emitMesh3(r,cachedMesh3(tile,'prop',q=>{for(let zz=z;zz<z+8;zz++)for(let xx=x;xx<x+8;xx++)if(!worldWall(xx,zz)){const color=shade3(lair.floor,.94+.06*Math.sin(xx*3.7+zz*1.3));q.face([[xx,.025,zz],[xx+1,.025,zz],[xx+1,.025,zz+1],[xx,.025,zz+1]],color,null,['crystal','arcane','ork'].includes(lair.theme)?18:7);}return .03;}));}
 for(const o of world.decor){if(o.x<minx-8||o.x>maxx+8||o.z<minz-8||o.z>maxz+8)continue;if(o.kind==='model')lairModel(r,o.model,o.x,0,o.z,o.height,o.heading,o.tint);else drawLairFeature(r,o,lair);}
 drawColossusEffects(r);
}
function drawColossusShatter(r,x,z,progress,enraged){
 if(progress>=1)return;const light=materialRealm(r,19),color=enraged?'#f47564':'#83d8ed';
 for(let i=0;i<16;i++){const a=i*2.399,radius=.6+progress*(1.8+i%3*.35),y=.3+(i%5)*.65+Math.sin(progress*Math.PI)*1.6-progress*.8,k=(1-progress)*(.15+i%3*.05);
  profile3(light,x+Math.cos(a)*radius,Math.max(.1,y),z+Math.sin(a)*radius,k,k*2.4,k,[[-.5,0],[0,1],[.5,0]],color,p=>p,5);
 }
}
function drawColossusEffects(r){
 const f=typeof activeEncounter!=='undefined'&&activeEncounter;if(!f||f.scene!==currentScene||f.o.encounter!=='colossus')return;
 const light=materialRealm(r,19),color=f.o.enraged?'#ee7366':'#7ed0ed';
 for(const h of f.hazards){const t=Math.max(0,Math.min(1,(time-h.started)/(h.due-h.started))),x=h.x+.5,z=h.y+.5;
  if(h.key==='shot'){
   const p=Math.max(0,(t-.45)/.55);for(let i=0;i<3;i++){const offset=(i-1)*.45,xx=(f.o.x+.5)*(1-p)+x*p+offset,zz=(f.o.y+.5)*(1-p)+z*p,y=3.9*(1-p)+Math.sin(p*Math.PI)*1.2+.2;profile3(light,xx,y,zz,.27,.7,.27,[[-.5,0],[0,1],[.5,0]],color,v=>v,6);}
  }else if(h.key==='hex'){
   lairRing(r,x,z,h.radius,.055,'#c39ef2',.075);for(let i=0;i<6;i++){const a=time*1.8+i*Math.PI/3,rad=h.radius*(1-t*.5);profile3(light,x+Math.cos(a)*rad,.18+t*.7,z+Math.sin(a)*rad,.10,.22,.10,[[-.5,0],[0,1],[.5,0]],'#c8a8ef',v=>v,5);}
  }else if(h.key==='sweep')lairRing(r,x,z,2.2+t*2,.07,color,.31);
 }
}
const wallArtBeforeLairs=drawRealmWall;
drawRealmWall=function(r,x,z){
 const lair=CREATURE_LAIRS[currentScene];if(!lair)return wallArtBeforeLairs(r,x,z);if([[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dz])=>worldWall(x+dx,z+dz)))return;
 const foreground=(x-px)*Math.sin(view3d.yaw)+(z-py)*Math.cos(view3d.yaw)>1,height=foreground?1.05:2.6+Math.sin(x*6.1+z)*.3;
 lairModel(r,lair.theme==='arcane'?'Wall_UnevenBrick_Straight':'Rock_Medium_1',x+.5,0,z+.5,height,Math.sin(x*3+z)*.3,lair.theme==='hive'?[.9,.7,.43]:lair.theme==='blight'?[.82,.85,.67]:[.70,.76,.88]);
};
const propBeforeLairs=prop3;
prop3=function(r,o,x,z){if(o.habitatModel)return lairModel(r,o.habitatModel,x,0,z,o.habitatHeight,o.heading,o.tint);if(o.lairEntrance){const lair=CREATURE_LAIRS[o.lairEntrance];drawLairFeature(r,{kind:'arch',x,z,size:1},lair);if(lair.theme==='crystal'||lair.theme==='arcane')for(const side of [-1,1])drawLairFeature(r,{kind:'crystal',x:x+side*3.2,z:z-.8,size:.8},lair);return 4.4;}return propBeforeLairs(r,o,x,z);};
