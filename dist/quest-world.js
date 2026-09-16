'use strict';
// Quest scenery, directions and physical actions share the existing world.
// Quest stage numbers and completed saves are deliberately retained.
let questWorldReady=false,questScenerySerial=6600000;
const questSites=[],questSceneryBounds=[];
function questSite(name,x,y,rx,ry){const site={name,x,y,rx,ry,height:landBase(x,y)};questSites.push(site);return site;}
function questScenery(name,x,y,extra={},scene='overworld'){
 const w=worldScenes[scene],previous=currentScene;currentScene=scene;
 try{
  let point;if(extra.interiorBuilding){const room=w.buildings.find(b=>b.service?.destination===extra.interiorBuilding);if(room)for(let r=0;r<=4&&!point;r++)for(let dy=-r;dy<=r&&!point;dy++)for(let dx=-r;dx<=r&&!point;dx++){const a=x+dx,b=y+dy;if(a>room.x+2&&a<room.x+room.w-2&&b>room.y+2&&b<room.y+room.h-2&&!worldWall(a,b)&&!w.objects.some(o=>Math.hypot(a-o.x,b-o.y)<1.7))point=[a,b];}}else point=encounterSpawnPoint(scene,x,y,7);if(!point)return null;
  const o={id:questScenerySerial++,type:'prop',name,x:point[0],y:point[1],homeX:point[0],homeY:point[1],drawX:point[0],drawY:point[1],sprite:12,dead:0,questScenery:true,...extra};w.objects.push(o);return o;
 }finally{currentScene=previous;}
}
function questClear(x,y,rx,ry){const w=worldScenes.overworld;w.objects=w.objects.filter(o=>o.mainStoryKey||o.mountainKey||o.raiderCamp||o.interiorBuilding||!['prop','tree','ore','crop','camp'].includes(o.type)||Math.abs(o.x-x)>rx||Math.abs(o.y-y)>ry);}
function questRelocate(o,x,y){Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});}
function questTrail(a,b,width=.85){
 const start=organicRoads.length;curveRoad(...a,...b,width);const segments=organicRoads.slice(start);
 worldScenes.overworld.objects=worldScenes.overworld.objects.filter(o=>o.mainStoryKey||o.mountainKey||o.raiderCamp||o.questScenery||!['tree','ore'].includes(o.type)||!segments.some(seg=>roadSegmentDistance(o.x+.5,o.y+.5,seg)<seg.width+1));
}
function setupQuestWorld(){
 if(questWorldReady)return;questWorldReady=true;const previous=currentScene;currentScene='overworld';
 try{
  // An actual roadside ambush, with a trail of prints heading toward the camp.
  questClear(160,142,10,8);questSite('Redclay Bend · Courier ambush',160,142,10,7);
  for(const [key,x,y]of [['cart',157,143],['harness',160,144],['boots',165,142],['body',155,140]])questRelocate(mainStoryObject(key),x,y);
  questScenery('Scattered dispatch papers',157,147,{questModel:'papers'});
  questScenery('Broken wagon wheel',154,145,{questModel:'wheel'});
  questTrail([98,113],[157,145],1);questTrail([160,146],[172,139]);
  // The signed eastern trail follows land and crosses the river at a real bridge.
  for(let i=organicRoads.length-1;i>=0;i--){const seg=organicRoads[i];if(seg.a[0]===172.5&&seg.b[0]===212.5)organicRoads.splice(i,1);}
  questTrail([172,139],[208,142]);
  const h=mainStoryObject('hesta');questClear(h.x-1,h.y+2,9,7);questSite('Ironhollow rescue camp',h.x-1,h.y+2,9,7);
  questScenery('Rescue crew canvas tent',h.x-4,h.y+4,{campModel:'tent',collisionRadius:2});
  questScenery('Rescue supply crate',h.x+3,h.y+3);questScenery('Rope and tool rack',h.x+4,h.y-1);
  questScenery('Rescue campfire',h.x,h.y+5,{type:'camp',cooking:true,walkThrough:true});
  const il=mainStoryObject('ilyra');
  // Keep the pilgrim campsite outside generated town lots, not between houses.
  const campsite=questOpenSite(il.x,il.y,10,8);questRelocate(il,...campsite);questClear(il.x,il.y,9,7);questSite('Old pilgrim camp',il.x,il.y,9,7);
  questScenery('Pilgrim canvas tent',il.x-4,il.y-3,{campModel:'tent',collisionRadius:2});
  questScenery('Pilgrim campfire',il.x+3,il.y+2,{type:'camp',cooking:true,walkThrough:true});
  questScenery('Pilgrim research table',il.x-2,il.y+3);questScenery('Pilgrim supply sack',il.x-5,il.y+3);
  const bell=mainStoryObject('bell');questClear(bell.x,bell.y,4,4);questSite(bell.name,bell.x,bell.y,3,3);questScenery('Ancient Bell waymarker',bell.x-2,bell.y+2,{questModel:'waymarker'});
  const shrine={x:CREATURE_LAIRS.story_shrine.entrance[0],y:CREATURE_LAIRS.story_shrine.entrance[1]};
  questClear(shrine.x,shrine.y+8,11,6);questSite('Hollow Shrine · Ruined pilgrim court',shrine.x,shrine.y+7,11,7);
  for(const [dx,dy]of [[-8,5],[8,5],[-8,12],[8,12]])questScenery('Weathered shrine pillar',shrine.x+dx,shrine.y+dy,{questModel:'ruinPillar'});
  for(const [dx,dy]of [[-5,12],[5,12],[-9,9],[9,9]])questScenery('Overgrown pilgrim masonry',shrine.x+dx,shrine.y+dy,{questModel:'rubble'});
  for(const dx of [-7,7])questScenery('Weathered Wardkeeper statue',shrine.x+dx,shrine.y+8,{questModel:'wardStatue'});
  questTrail([il.x,il.y+4],[bell.x,bell.y+2]);questTrail([bell.x,bell.y+2],[shrine.x,shrine.y+10]);
  for(const [name,x,y,model]of [['Abandoned pilgrim bedroll',25,90,'bedroll'],['Recent excavation tools',20,81,'tools'],['Moved ancient stone',13,63,'rubble'],['Damaged inscription',44,34,'ledger'],['Unmarked research supplies',48,23,'papers'],['Empty seal-fragment socket',26,17,'seal'],['Weathered pilgrim statue',35,88,'wardStatue'],['Old waymarker',13,50,'waymarker'],['Old waymarker',46,43,'waymarker']])questScenery(name,x,y,model==='bedroll'?{campModel:model}:{questModel:model},'story_shrine');
  // Use three real walk-in homes, rather than unrelated roadside click points.
  const homes=worldScenes.overworld.buildings.filter(b=>b.settlement==='ironhollow'&&b.archetype==='house'&&b.walkIn);
  for(const [i,key]of ['ledger','tools','summons'].entries()){
   const home=homes[i],o=mountainObject(key)?.o;if(!home||!o)continue;
   const spot=questScenery('Wardkeeper evidence position',home.x+4,home.y+4,{interiorBuilding:home.service.destination});
   if(spot){questRelocate(o,spot.x,spot.y);o.interiorBuilding=home.service.destination;worldScenes.overworld.objects.splice(worldScenes.overworld.objects.indexOf(spot),1);home.name=['Fenn Wardkeeper home','Arden Wardkeeper home','Merrit Wardkeeper home'][i];}
  }
  // Furnish the existing castle library and mining sites without inventing doors.
  const expert=mountainObject('expert');if(expert.scene==='overworld'){
   questScenery('Library reading table',expert.o.x+2,expert.o.y+3,{interiorBuilding:expert.o.interiorBuilding,questModel:'ledger'});
   for(const [dx,dy]of [[4,0],[8,0],[0,6],[8,6]])questScenery('Library bookcase',expert.o.x+dx,expert.o.y+dy,{interiorBuilding:expert.o.interiorBuilding});
   questScenery('Library research table',expert.o.x+6,expert.o.y+4,{interiorBuilding:expert.o.interiorBuilding,questModel:'ledger'});
  }
  const bearing=mountainObject('bearing').o;questClear(bearing.x,bearing.y,5,5);questSite('Collapsed ward workings',bearing.x,bearing.y,5,5);
  questScenery('Collapsed timber support',bearing.x+2,bearing.y+2,{questModel:'timbers'});questScenery('Mine rubble',bearing.x-2,bearing.y+1,{questModel:'rubble'});
  for(const [name,x,y,model]of [['Freight rail cart',25,67,'cart'],['Mine support frame',13,58,'timbers'],['Salvage crate',35,42,null],['Miners’ refuge bedroll',10,12,'bedroll'],['Miners’ refuge bedroll',10,19,'bedroll']])questScenery(name,x,y,model==='bedroll'?{campModel:model}:model?{questModel:model}:{},'story_mine');
  for(const [name,x,y,model]of [['Survivors’ bedroll',10,28,'bedroll'],['Survivors’ water barrel',15,29,null],['Ward support frame',21,38,'timbers']])questScenery(name,x,y,model==='bedroll'?{campModel:model}:model?{questModel:model}:{},'quest_underiron');
  // New timber intersects much older Wardkeeper halls; preserve broad, navigable aisles.
  for(const [name,x,y,model]of [
   ['Wardkeeper threshold',23,115,'ruinPillar'],['Broken ward relief',30,113,'seal'],['Fresh mining frame',25,106,'timbers'],
   ['Intruders’ supply tent',32,100,'tent'],['Discarded field bedroll',29,101,'bedroll'],['Barricade beside the supply route',22,97,'ruinWall'],
   ['Stolen seal-token chest',14,86,'papers'],['Abandoned excavation tools',12,75,'tools'],['Damaged ward inscription',20,70,'ledger'],
   ['Wardkeeper statue',38,57,'wardStatue'],['Agent barricade',40,48,'ruinWall'],['Recent mining struts',33,42,'timbers'],
   ['Broken inner seal',17,36,'seal'],['Evacuated family bedding',10,31,'bedroll'],['Final seal anchor',27,15,'seal']
  ])questScenery(name,x,y,['tent','bedroll'].includes(model)?{campModel:model}:{questModel:model},'quest_underiron');
  for(const [name,x,y,model]of [
   ['Broken road orders',21,128,'papers'],['A familiar seven-point seal',27,115,'seal'],['Last-shift refuge brace',10,90,'timbers'],
   ['Discarded family memento',17,84,'ledger'],['Counter-ward waymarker',34,69,'waymarker'],['Empty companion’s bedroll',29,62,'bedroll'],
   ['Shattered ward statue',17,49,'wardStatue'],['Operatives’ survey instruments',30,12,'tools']
  ])questScenery(name,x,y,model==='bedroll'?{campModel:model}:{questModel:model},'lair_veyr');
  for(const [name,x,y]of [['Ironhollow copper seam',9,53],['Ironhollow tin seam',38,31],['Lower-workings iron seam',24,25]])questScenery(name,x,y,{type:'ore',resourceId:name.includes('copper')?'copper':name.includes('tin')?'tin':'iron'},'story_mine');
  for(const [key,name,x,y]of [['waitingMother','Marae · Waiting for Bera',h.x-3,h.y+1],['waitingChild','Taren · Oren’s son',h.x+3,h.y+5]])questScenery(name,x,y,{type:'questgiver',characterSprite:true,race:'dwarf',arcCivilian:key});
  for(const [i,x,y]of [[0,15,18],[1,29,21],[2,23,26]])questScenery('Borrowed '+['Captain Rellan','Miner Bera','companion'][i],x,y,{arcPhantom:i+1,walkThrough:true,collected:true},'lair_veyr');
  // Earlier village quests have physical ruins, a beacon and farm rows too.
  for(const [kind,label]of [['king','Hollow Ruins · Northern Watch'],['sentinel','Ashwatch watchpost ruins']]){
   const o=worldScenes.overworld.objects.find(o=>o.kind===kind);if(!o)continue;
   questClear(o.x,o.y,8,7);questSite(label,o.x,o.y,8,7);
   for(const [dx,dy]of [[-5,-4],[5,-4],[-5,4],[5,4]])questScenery('Broken watchtower pillar',o.x+dx,o.y+dy,{questModel:'ruinPillar'});
   questScenery('Fallen watchtower wall',o.x-3,o.y-5,{questModel:'rubble'});
  }
  const beacon=worldScenes.overworld.buildings.find(b=>b.name==='The coastal beacon');if(beacon)beacon.questBeacon=true;
  const farmer=worldScenes.overworld.objects.find(o=>o.name==='Farmer Tessa');if(farmer){questSite('Riverbend Farms',farmer.x+5,farmer.y,9,12);questScenery('Riverbend harvest cart',farmer.x-3,farmer.y+3,{questModel:'cart'});}
  const keeper=worldScenes.overworld.objects.find(o=>o.name==='Keeper Orin');if(keeper)questSite('Coastal beacon',keeper.x,keeper.y,8,7);
  roadBuckets=null;realmNavigation.clear();resetLandSurface();miniTerrain=null;mapServicesCache=null;
  objects.splice(0,objects.length,...worldScenes[previous].objects);
 }finally{currentScene=previous;}
}
const questWorldSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){questWorldSetupBefore();setupQuestWorld();};
const questGradeBefore=gradeLand;
gradeLand=function(x,y,height){let base=questGradeBefore(x,y,height);if(currentScene!=='overworld')return base;for(const p of questSites){if(/Farms|beacon/.test(p.name))continue;const d=Math.hypot(Math.max(Math.abs(x-p.x)-p.rx,0),Math.max(Math.abs(y-p.y)-p.ry,0));if(d>=5)continue;const t=d/5,w=1-t*t*(3-2*t);base=base*(1-w)+p.height*w;}return base;};
const questRoadBefore=roadInfluence;
roadInfluence=function(x,y){const out=questRoadBefore(x,y);if(currentScene!=='overworld')return out;let amount=out[0];for(const p of questSites){if(/Farms|beacon/.test(p.name))continue;const d=Math.max(Math.abs(x-p.x)/p.rx,Math.abs(y-p.y)/p.ry);if(d<1)amount=Math.max(amount,Math.min(.8,(1-d)*4));}return [amount,out[1],out[2]];};
const questRegionBefore=regionInfo;
regionInfo=function(){if(currentScene==='overworld'){const p=questSites.find(p=>Math.abs(s.x-p.x)<=p.rx+3&&Math.abs(s.y-p.y)<=p.ry+3);if(p)return [p.name,'Veldren · Roads, witnesses and old oaths'];}return questRegionBefore();};

// Investigation is a cancellable physical action. Findings appear only after
// the character finishes looking; recording evidence remains the player's choice.
function beginQuestInspection(o,finish){
 if(o&&!mountainNear(o))return false;close();stop();
 const stage=mainStoryState().stage,mountain=mountainState().stage;
 playerAction={kind:'investigate',o,scene:currentScene,started:time,duration:2.2,stage,mountain,finish};
 if(o)playerHeading=Math.atan2(o.x-px,o.y-py);renderAction();return true;
}
const questPlayerActionBefore=updatePlayerAction;
updatePlayerAction=function(){
 const a=playerAction;if(a?.kind!=='investigate')return questPlayerActionBefore();
 if(currentScene!==a.scene||a.o&&!mountainNear(a.o)||a.stage!==mainStoryState().stage||a.mountain!==mountainState().stage){stop();return;}
 const age=time-a.started;$('activity').style.width=Math.min(100,age/a.duration*100)+'%';
 if(age>=a.duration){playerAction=null;renderAction();a.finish();}
};
const questActionBefore=renderAction;
renderAction=function(){questActionBefore();if(playerAction?.kind==='investigate'){$('targetTitle').textContent='Investigating '+(playerAction.o?.name||'the memory fragment');$('targetSub').textContent='Looking for evidence… Move to cancel.';}};
function questVisualAction(){
 if(playerAction)return playerAction;
 const job=mainStoryWork||mountainWork;if(!job||job.skill==='Mining')return null;
 return {kind:job.skill==='Magic'?'ritual':'repair',started:time-job.age,duration:3.2};
}
const questMainInteractBefore=mainStoryInteract;
mainStoryInteract=function(o){const k=o.mainStoryKey;if(MAIN_STORY_CLUES[k]||MAIN_STORY_STONES[k]||['trail','dispatch','excavation','lift'].includes(k))return beginQuestInspection(o,()=>{if(MAIN_STORY_STONES[k])arcMemoryVision={o,key:k,until:time+9};questMainInteractBefore(o);});return questMainInteractBefore(o);};
const questMountainInteractBefore=mountainInteract;
mountainInteract=function(o){if(MOUNTAIN_CLUES[o.mountainKey]||['aftermath','fieldOrders'].includes(o.mountainKey))return beginQuestInspection(o,()=>questMountainInteractBefore(o));return questMountainInteractBefore(o);};
const questFragmentBefore=mountainInspectFragment;
mountainInspectFragment=function(){if(mountainState().stage!==12||!mountainState().memory)return;return beginQuestInspection(null,questFragmentBefore);};
const questOptionsBefore=worldOptionsFor;
worldOptionsFor=function(o){const rows=questOptionsBefore(o);if((o.mainStoryKey||o.mountainKey)&&!o.characterSprite&&!fighter(o))return [['Investigate '+o.name,()=>select(o)],...rows.filter(([label])=>!/^Use |^Examine /.test(label))];return rows;};

// Match old quest checks to the current items and communicate actual skill gates.
quests[1].desc='Bring Rowan 5 oak logs, 5 iron ore and 3 cooked trout. Gather oak at Woodcutting 15, iron at Mining 15, trout at Fishing 20 and Cooking 15; supplies can also be bought.';
quests[1].checks=()=>[['Oak logs',s.bag.logs||0,5],['Iron ore',s.bag.ore||0,5],['Cooked trout',s.bag.fish||0,3]];
quests[3].desc='Obtain an iron sword and reach Combat 3, then return to Rowan. Forging an iron sword requires Smithing 19 and 1 iron bar; purchased swords also count.';
quests[3].checks=()=>[['Iron sword',Number(owns('ironSword')||owns('iron_weapon')),1],['Combat level',lv('Combat'),3]];
quests[4].desc='Follow the north road from Briarhaven to Hollow Ruins. Defeat the ruins guardian among the broken watchtower pillars, then return to Rowan. Recommended Combat 18; take armour and cooked food.';
frontierQuests[2].desc='Bring Keeper Orin 4 iron ore and 4 oak logs to repair the coastal beacon southeast of Stoneford. Requires Mining 15 and Woodcutting 15 to gather them yourself.';
const questPropsBefore=prop3;
prop3=function(r,o,x,z){
 const key=o.mainStoryKey==='body'?'courierBody':o.questModel||o.mountainKey;
 if(!key)return questPropsBefore(r,o,x,z);
 const p=groundedPainter(r,x,z),q=worldLocal(p,x,0,z),wood='#795b3d',iron='#78828a',stone='#7c8278',paper='#d5c59f';
 const box=(x,y,z,w,h,d,c)=>box3(q,x,y,z,w,h,d,c);
 const beam=(a,b,w=.05,c=wood)=>beamArt(q,a,b,w,c,6);
 const wheel=(x,y,z,radius)=>{for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;beam([x+Math.cos(a)*radius,y+Math.sin(a)*radius,z],[x+Math.cos(b)*radius,y+Math.sin(b)*radius,z],.045,iron);}for(const [a,b]of [[[x-radius,y,z],[x+radius,y,z]],[[x,y-radius,z],[x,y+radius,z]]])beam(a,b,.035,iron);};
 if(key==='courierBody'){const laid={face:(points,col,n,mat,colors,uv)=>q.face(points.map(([a,b,c])=>[a,b*.08+.18-c,b]),col,null,mat,colors,uv)};humanoid3(laid,0,0,0,{_civilian:true,_cloth:[.2,.28,.42]},0,0,0,.9);box(.15,.10,-.2,.35,.025,.5,paper);return .5;}
 if(key==='wardStatue'){const gray={face:(points,col,n,mat,colors,uv)=>q.face(points,stone,null,12)};humanoid3(gray,0,0,1,{_civilian:true},0,0,0,1.2);profile3(q,0,.14,0,1.2,.28,1.2,[[-.5,1],[.5,.9]],stone,v=>v,8);return 2.5;}
 if(key==='ledger'||key==='library_books'){worldModel(p,key==='ledger'?'Table_Large':'Bookcase_2',x,0,z,key==='ledger'?.8:1.9);if(key==='ledger'){box(0,.84,0,.65,.07,.43,paper);box(0,.89,0,.035,.015,.43,'#584d3d');}return key==='ledger'?1:2;}
 if(key==='summons'){box(0,.8,0,.13,1.6,.13,wood);box(0,1.2,0,.95,.75,.10,wood);box(0,1.23,.07,.56,.52,.02,paper);profile3(q,0,1.1,.09,.11,.04,.11,[[-.5,1],[.5,1]],'#8e4036',v=>v,7);return 1.65;}
 if(key==='tools'){worldModel(p,'Pickaxe_Bronze',x,.06,z,.9,Math.PI/2);worldModel(p,'Bucket_Wooden_1',x+.45,0,z+.2,.4);return .5;}
 if(key==='bearing'||key==='rubble'){for(const [i,[a,b]]of [[-.6,-.2],[.3,-.4],[.6,.2],[-.1,.3]].entries())worldModel(p,'Rock_Medium_1',x+a,0,z+b,.4+i*.12);if(key==='bearing')wheel(0,.45,.48,.28);return 1;}
 if(key==='timbers'){for(const side of [-1,1]){beam([side*.8,0,0],[side*.65,2.4,0],.12);beam([side*1.2,0,.3],[side*.65,1,0],.08);}beam([-.85,2.4,0],[.85,2.4,0],.14);return 2.6;}
 if(key==='ruinWall'){for(let i=0;i<5;i++)box(-1.2+i*.6,.4+(i%2)*.1,0,.58,.8+(i%2)*.2,.65,stone);return 1.2;}
 if(key==='ruinPillar'){profile3(q,0,.2,0,1.3,.4,1.3,[[-.5,1],[.5,.9]],stone,v=>v,6);profile3(q,0,1.35,0,.85,2.3,.85,[[-.5,1],[.3,.85],[.5,.7]],stone,v=>v,5);return 2.6;}
 if(key==='waymarker'){box(0,.7,0,.12,1.4,.12,wood);box(0,1.2,0,.7,.25,.1,'#a48c61');for(const a of [-.2,0,.2])box(a,1.23,.07,.06,.06,.02,paper);return 1.5;}
 if(key==='wheel'){wheel(0,.45,0,.42);return 1;}
 if(key==='cart'){worldModel(p,'Stall_Cart_Empty',x,0,z,1.6);return 1.7;}
 if(key==='papers'){for(let i=0;i<3;i++)box(-.4+i*.32,.04+i*.01,i%2*.3,.32,.02,.4,paper);return .1;}
 if(key==='workbench'){worldModel(p,'Workbench',x,0,z,.85);wheel(0,1,.15,.23);worldModel(p,'Anvil_Log',x+.65,0,z,.65);return 1.3;}
 if(key==='vent'){box(0,.65,0,1.1,1.3,.5,stone);wheel(0,1.05,.37,.55);beam([0,1.05,.35],[0,1.05,.55],.08,iron);for(const a of [-.4,0,.4])box(a,.45,.29,.12,.6,.1,iron);return 1.7;}
 if(key==='seal'){for(const a of [-.55,0,.55]){profile3(q,a,.55,0,.48,1.1,.32,[[-.5,1],[.5,.8]],stone,v=>v,6);box(a,.72,.19,.18,.2,.02,'#a6c6ce');}return 1.25;}
 if(key==='aftermath'){worldModel(p,'Table_Large',x,0,z,.8);box(0,.86,0,1.2,.015,.8,paper);for(const [i,a,b]of [[0,-.4,-.2],[1,.1,-.1],[2,.4,.2],[3,-.2,.22]]){profile3(q,a,.88,b,.13,.03,.13,[[-.5,1],[.5,1]],i===0?'#854742':'#617ba0',v=>v,7);beam([-.4,.89,-.2],[a,.89,b],.012,'#82755a');}return 1;}
 if(key==='memory'){const broken=mountainState().awakened||arcAwakening?.age>=6;for(const a of [-1.2,0,1.2]){profile3(q,a,broken?.4:1,0,.6,broken?.8:2,.5,[[-.5,1],[.5,.8]],stone,v=>v,6);if(!broken)box(a,1.25,.3,.18,.25,.035,'#abdfd6');}return broken?1:2.3;}
 if(key.startsWith('binding_')){profile3(q,0,.3,0,.8,.6,.8,[[-.5,1],[.5,.65]],stone,v=>v,6);profile3(materialRealm(q,19),0,1,0,.45,.85,.45,[[-.5,.6],[0,1],[.5,.1]],'#86bac5',v=>v,5);return 1.5;}
 return questPropsBefore(r,o,x,z);
};
// The beacon remains the same landmark but now has a visible signal basket.
const questBuildingBefore=building3;
building3=function(r,b){
 if(!b.questBeacon)return questBuildingBefore(r,b);
 const x=b.x+b.w/2,z=b.y+b.h/2,p=groundedPainter(r,x,z),w=Math.min(b.w,b.h)*.85;
 profile3(p,x,.4,z,w,.8,w,[[-.5,1],[.5,.85]],'#8d9187',v=>v,8);
 profile3(p,x,4,z,w*.66,7,w*.66,[[-.5,1],[.5,.72]],'#747c78',v=>v,8);
 for(const y of [1.5,3.6,5.7])profile3(p,x,y,z,w*.69,.2,w*.69,[[-.5,1],[.5,1]],'#a0a292',v=>v,8);
 profile3(p,x,7.8,z,w*.75,.7,w*.75,[[-.5,.85],[.5,1]],'#999d92',v=>v,8);
 profile3(p,x,8.4,z,w*.5,.7,w*.5,[[-.5,.65],[.5,1]],'#514638',v=>v,8);
 for(const side of [-1,1])for(const y of [3,5.5])box3(p,x+side*w*.3,y,z,.04,.7,.35,'#293331');
 b.visualHeight=10;return 10;
};

function sideQuestObjective(frontier,index){
 const q=frontier?frontierQuests[index]:quests[index],w=worldScenes.overworld;if(!q)return null;
 const npc=w.objects.find(o=>frontier?o.name===q.npc:o.type==='elder');
 if((frontier?s.frontier.quest:s.quest)!==index||frontier&&!s.frontier.accepted)return npc;
 const nearest=filter=>w.objects.filter(filter).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];
 if(frontier){
  if(q.kind==='hunt')return s.frontier.kills>=q.goal?npc:nearest(o=>o.kind===q.enemy&&!o.dead);
  if(q.kind==='deliver')return (s.bag.herbs||0)>=5?npc:nearest(o=>o.type==='crop');
  if((s.bag.ore||0)<4)return nearest(o=>o.type==='ore'&&resourceDefinition(o)?.item==='ore');
  if((s.bag.logs||0)<4)return nearest(o=>o.type==='tree'&&resourceDefinition(o)?.item==='logs');return npc;
 }
 if(index===1){if((s.bag.logs||0)<5)return nearest(o=>o.type==='tree'&&resourceDefinition(o)?.item==='logs');if((s.bag.ore||0)<5)return nearest(o=>o.type==='ore'&&resourceDefinition(o)?.item==='ore');if((s.bag.fish||0)<3){if((s.bag.rawTrout||0)+(s.bag.fish||0)>=3)return nearest(o=>o.type==='range'||o.type==='camp'&&o.cooking);return nearest(o=>o.type==='fish'&&resourceDefinition(o)?.raw==='rawTrout');}}
 if(index===2&&s.kills<5)return nearest(o=>o.kind==='wolf'&&!o.dead);
 if(index===3&&!(owns('ironSword')||owns('iron_weapon')))return w.objects.find(o=>o.type==='forge');
 if(index===4&&!s.boss)return nearest(o=>o.kind==='king');return npc;
}
function guideSideQuest(frontier,index){
 if(currentScene==='tutorial'){toast('Finish Firstlight’s apprenticeship to start mainland quests.');return false;}
 if(playerAction?.kind==='investigate')return true;
 if(currentScene!=='overworld'){const exit=worldScenes[currentScene]?.exit;if(exit){close();return mountainTravelTo(exit);}return false;}
 const o=sideQuestObjective(frontier,index);if(!o){toast('The target is returning. Check the quest instructions and try again shortly.');return false;}
 const room=o.interiorBuilding&&buildings.find(b=>b.service?.destination===o.interiorBuilding);close();return mountainTravelTo(room&&room.service.openedAt===undefined?room.service:o);
}
const FRONTIER_ACCOUNTS=[
 ['The fever came with the families fleeing the watchposts. I have beds, but my medicine chest is empty. Farmer Tessa grows the fresh herbs I need at Riverbend Farms.','Five fresh herbs will let me treat the next wagon of refugees.'],
 ['The ridge wolves are taking pack animals along Stoneford’s eastern supply road. I cannot escort every wagon while the watchposts stand empty.','Drive back four ridge wolves, then report to me. Ordinary briar wolves are not the animals attacking this road.'],
 ['Our signal basket collapsed when the patrols withdrew. Without the beacon, boats cannot find the supply landing after dark.','Bring four iron ore and four oak logs. I can smelt the brackets; help me secure the timber and raise the signal basket.'],
 ['The beacon burns, but Ashwatch’s guardian still obeys an old command to turn every traveller away. The abandoned watchpost lies north of this beacon, beyond Stoneford’s eastern ridge.','Defeat the Ashwatch guardian among the ruined pillars and return. This is the last task I need before the supply road can reopen.']
];
frontierTalk=function(o){
 stop();const state=s.frontier,index=state.quest,q=frontierQuests[index];
 if(!q)return dialog(o.name,'<p>The sick have medicine, the ridge road is safer, and our beacon guides the supply boats again.</p>');
 if(o.name!==q.npc)return dialog(o.name,'<p>Speak to '+q.npc+' about '+q.title+'. Select it in your quest journal for directions.</p>');
 const ready=()=>frontierQuests[state.quest]===q&&state.accepted&&(q.kind==='deliver'?(s.bag.herbs||0)>=5:q.kind==='repair'?(s.bag.ore||0)>=4&&(s.bag.logs||0)>=4:state.kills>=q.goal);
 const finish=()=>{if(!ready()||!mountainNear(o))return;if(q.kind==='deliver')s.bag.herbs-=5;if(q.kind==='repair'){s.bag.ore-=4;s.bag.logs-=4;}const banked=grantQuestCoins(q.reward);state.quest++;state.accepted=false;state.kills=0;close();save();if(typeof showQuestCompletion==='function')showQuestCompletion({title:q.title,coins:q.reward,banked,unlocks:q.kind==='repair'?['Coastal beacon restored']:[]});};
 const body='<p>'+FRONTIER_ACCOUNTS[index].join('</p><p>')+'</p><p>'+q.desc+'</p>';
 if(!state.accepted)return dialog(q.title,body+'<p>Reward: '+q.reward+' coins.</p>',[['Accept quest',()=>{if(state.quest!==index||state.accepted)return;state.accepted=true;state.kills=0;close();save();toast('Quest started: '+q.title);}]]);
 return dialog(q.title,body+'<p>'+(ready()?'The task is ready to finish.':q.kind==='hunt'?state.kills+' / '+q.goal+' defeated.':'Gather the supplies, then return.')+'</p>',ready()?[['Complete quest',()=>q.kind==='repair'?beginQuestInspection(o,finish):finish()]]:[]);
};

frontierQuests[1].desc+=' Recommended Combat 15; take cooked food.';
frontierQuests[3].desc='Defeat the Ashwatch guardian at the ruined watchpost north of the coastal beacon, beyond Stoneford’s eastern ridge. Return to Keeper Orin. Recommended Combat 30; bring armour and food.';

function questOpenSite(x,y,rx,ry){const w=worldScenes.overworld;for(let radius=0;radius<=80;radius+=4)for(let i=0;i<16;i++){const a=Math.round(x+Math.cos(i*Math.PI/8)*radius),b=Math.round(y+Math.sin(i*Math.PI/8)*radius);if(w.buildings.some(h=>a+rx+15>=h.x&&a-rx-15<=h.x+h.w&&b+ry+15>=h.y&&b-ry-15<=h.y+h.h))continue;if([[0,0],[-rx,-ry],[rx,-ry],[-rx,ry],[rx,ry]].some(([dx,dy])=>water(a+dx,b+dy)||worldWall(a+dx,b+dy)))continue;return [a,b];}throw new Error('No clear land for quest campsite');}

const questCrossingsBefore=drawRealmCrossings;
drawRealmCrossings=function(r){questCrossingsBefore(r);if(currentScene!=='overworld'||(s.frontier?.quest||0)<=2)return;const b=buildings.find(b=>b.questBeacon);if(!b)return;const x=b.x+b.w/2,z=b.y+b.h/2,pos=project3(x,9,z);if(pos.x< -150||pos.x>screen.w+150||pos.y< -150||pos.y>screen.h+150)return;const p=materialRealm(groundedPainter(r,x,z),19);for(let i=0;i<3;i++)profile3(p,x+(i-1)*.5,9.1,z,.7,1.5+Math.sin(time*4+i)*.15,.7,[[-.5,1],[.5,.01]],i===1?'#edc878':'#d78043',v=>v,6);};

// Arc presentation stays local to the character's canonical story phase.
let arcMemoryVision=null,arcAwakening=null,arcInsightUntil=0,arcInsightCooldown=0,arcLastWarning='',arcHazardClock=0;
function beginArcAwakening(o){
 if(mountainState().stage!==9||!mountainNear(o)||arcAwakening)return false;
 close();stop();arcAwakening={o,scene:currentScene,age:0,beat:-1};
 toast('The final chamber: masked operatives are already fitting the last stolen fragment.');return true;
}
const ARC_AWAKENING_BEATS=[
 ['Masked seal-breaker','“The fragments are seated. Complete the severance.”',0],
 ['Warden Edda','“Stop! That is the prison seal!”',3],
 ['Final protection','The operative tears out the last ward-pin. Three lights crack; the floor shudders. The masked pair escape through a collapsing side shaft.',6],
 ['A dead mother’s voice','“Edda, sweetheart. Come down. I have been waiting.”',9],
 ['Captain Rellan’s voice','“Abandon your posts. Open the northern road.” The real captain is nowhere near the chamber.',12],
 ['Veyr','“You know that voice. Surely you can trust it.” Edda refuses the false instruction and leads the survivors away.',15]
];
function arcSpiritInsight(o=null,key=null){
 const id=arcUsableSpirit();if(!id){toast('Any ready bonded Spirit can inspect an illusion. Let a recovering Spirit rest.');return false;}
 if(time<arcInsightCooldown){toast('Your Spirit is still comparing the echoes.');return false;}
 if(o&&!mountainNear(o))return false;
 arcInsightCooldown=time+8;arcInsightUntil=time+5+(s.equipment.ring==='veilbreakerRing'?1:0);
 if(key){const q=mountainState();(q.insightClues??={})[key]=true;save();dialog(SPIRITS[id].name+' · Spirit insight','<p>'+MOUNTAIN_BINDINGS[key].spirit+'</p><p>Compare this reaction with the recorded facts; choose the answer yourself.</p>',[['Return to the memory.',()=>mountainBinding(o,key)]]);}
 else toast(SPIRITS[id].name+': the borrowed figures repeat perfectly. The true enemy casts a solid shadow. Solid ground warnings remain dangerous.');
 return true;
}
function arcRefreshOperatives(){for(const key of ['saboteur','accomplice']){const o=mountainObject(key)?.o;if(o){o.collected=mountainState().stage>=10;o.dead=o.collected?Infinity:0;}}}
const arcSyncBefore=syncMountainWorld;syncMountainWorld=function(){arcSyncBefore();arcRefreshOperatives();};
const arcTickBefore=updateEncounterAI;
updateEncounterAI=function(dt){
 arcTickBefore(dt);
 if(arcAwakening){const a=arcAwakening;if(currentScene!==a.scene||mountainState().stage!==9||Math.hypot(px-a.o.x,py-a.o.y)>18){arcAwakening=null;arcRefreshOperatives();return;}
  a.age+=dt;const beat=Math.min(ARC_AWAKENING_BEATS.length-1,Math.floor(a.age/3));
  if(beat!==a.beat){a.beat=beat;const [who,line]=ARC_AWAKENING_BEATS[beat];toast(who+': '+line);const villain=mountainObject('saboteur')?.o;if(villain){villain._castAt=time;villain._castDuration=2.6;}if(beat===2){playGameSound('magic',a.o.x,a.o.y);for(const k of ['saboteur','accomplice']){const v=mountainObject(k)?.o;if(v)v.collected=true;}}}
  if(a.age>=18){arcAwakening=null;mountainAdvance(9,null,{memory:true,awakened:true,veyrNamed:true});toast('Veyr is awake. The operatives broke his prison. Return to Maerin.');}
 }
 if(currentScene==='story_mine'&&mainStoryState().stage>=8&&mainStoryState().stage<17){
  arcHazardClock+=dt;const cycle=arcHazardClock%8,spots=[[12,61],[35,39]],spot=spots[Math.floor(arcHazardClock/8)%spots.length];
  if(cycle>=3&&cycle-dt<3&&Math.hypot(px-spot[0],py-spot[1])<10)toast('Loose stone falls ahead. Leave the marked patch before the dust drops.');
  if(cycle>=6&&cycle-dt<6&&Math.hypot(px-spot[0],py-spot[1])<1.25){s.hp=Math.max(1,s.hp-2);floating('Falling stone −2',px,py,'#e8bb82');save();renderUI();}
 }
 arcUpdateMemories(dt);
 const hazards=typeof sharedLive==='function'&&sharedLive()?sharedCombatHazards():activeEncounter?.hazards||[];
 const h=hazards.find(h=>h.o?.encounter==='veyr'||activeEncounter?.o?.encounter==='veyr');if(h&&h.key+':'+h.started!==arcLastWarning){arcLastWarning=h.key+':'+h.started;toast('Borrowed voice: '+(h.voice||'“You can trust me.”')+' Alaric: Watch the solid markings.');}
};
const arcDrawBefore=drawTutorialCrossing3;
drawTutorialCrossing3=function(mesh){
 arcDrawBefore(mesh);
 if(activeEncounter?.o?.encounter==='veyr'&&mountainAssisted(activeEncounter.o)){const a=mountainObject('expert')?.o;if(a){const p=groundedPainter(mesh,a.x+.5,a.y+.5);for(let i=0;i<3;i++){const angle=i*Math.PI*2/3;oval3(materialRealm(p,19),a.x+.5+Math.cos(angle)*.75,1.5,a.y+.5+Math.sin(angle)*.75,.09,.12,.09,'#b5eee0',v=>v,6);}}}
 if(arcMemoryVision&&time<arcMemoryVision.until&&objects.includes(arcMemoryVision.o)){const v=arcMemoryVision,o=mainStoryObject(v.key==='bell'?'driver':'bera'),x=v.o.x+2,z=v.o.y+.5;humanoid3({face:(points,col,n)=>mesh.face(points,col,n,19.1)},x,z,npcLook(o),{...npcEquipment(o),_castAt:time-(time%2),_castDuration:2},0,0,0,.95);}
 if(arcAwakening){const a=arcAwakening,q=groundedPainter(mesh,a.o.x+.5,a.o.y+.5),broken=a.age>=6;for(let i=0;i<3;i++){const angle=i*Math.PI*2/3+a.age*.4;oval3(materialRealm(q,19),a.o.x+.5+Math.cos(angle)*1.4,broken?.25:1.3,a.o.y+.5+Math.sin(angle)*1.4,.13,.13,.13,broken?'#b778da':'#9ddddd',p=>p,6);}}
 if(currentScene==='story_mine'&&mainStoryState().stage>=8&&mainStoryState().stage<17){const cycle=arcHazardClock%8,spot=[[12,61],[35,39]][Math.floor(arcHazardClock/8)%2];if(cycle>=3&&cycle<=6){const q=groundedPainter(mesh,...spot);lairRing(q,spot[0]+.5,spot[1]+.5,1.25,.025,'#d9a768');for(let i=0;i<4;i++)oval3(q,spot[0]+.5+Math.sin(i*3)*.6,2.5-(cycle-3)*.65,spot[1]+.5+Math.cos(i*2)*.5,.06,.06,.06,'#b5a997',p=>p,5);}}
 if(s.equipment.neck==='whisperPendant'&&(currentScene==='story_shrine'||currentScene==='quest_underiron'||currentScene==='lair_veyr')){const q=groundedPainter(mesh,px+.5,py+.5);oval3(materialRealm(q,19),px+.5,1.45,py+.5,.035,.05,.035,'#9acccd',p=>p,6);}
};
// Inspection and combat use the same Spirit control; no particular element is privileged.
const arcHudBefore=renderEncounterHud;
renderEncounterHud=function(){arcHudBefore();const box=$('encounterHud');if(!box)return;let button=$('arcSpiritInsight');if(!button){button=document.createElement('button');button.id='arcSpiritInsight';button.type='button';button.textContent='Spirit insight';button.onclick=()=>arcSpiritInsight();box.appendChild(button);}button.hidden=activeEncounter?.o?.encounter!=='veyr';};

// Apparitions never receive loot, collision or damage rolls. Their missing shadows
// and repeated gestures are readable without Spirit insight; insight adds information.
let arcAmbientClock=0;
function arcVeyrPhase(){const boss=worldScenes.lair_veyr?.objects.find(o=>o.encounter==='veyr');return boss&&boss.hp>0&&boss.dead<=time?boss.hp/boss.maxhp<=.33?2:boss.hp/boss.maxhp<=.66?1:0:-1;}
function arcUpdateMemories(dt){
 const stage=mountainState().stage,phase=arcVeyrPhase(),fighting=activeEncounter?.o?.encounter==='veyr';
 for(const o of worldScenes.lair_veyr?.objects||[])if(o.arcPhantom)o.collected=!(fighting&&phase>=1);
 if(currentScene!=='overworld'||stage<10||stage>=18)return;
 arcAmbientClock+=dt;if(arcAmbientClock<16)return;arcAmbientClock=0;
 const nearby=objects.filter(o=>o.characterSprite&&Math.hypot(o.x-px,o.y-py)<12&&!fighter(o));
 const o=nearby[Math.floor(time/16)%Math.max(1,nearby.length)];if(!o)return;
 o._castAt=time;o._castDuration=1.5;
 floating(o.mainStoryKey==='rellan'?'“I gave no such order.”':o.mainStoryKey==='hesta'?'“Stay with someone you know.”':'“That voice… But you are here.”',o.x,o.y,'#c7b7de');
}
const arcInteractionBefore=handleWorldInteraction;
handleWorldInteraction=function(o){
 if(o.arcPhantom){toast(time<arcInsightUntil?'Your Spirit exposes an empty imitation. The real Veyr has a solid shadow.':'The figure casts no shadow. Its greeting repeats exactly. Compare it with the moving, shadowed enemy.');return true;}
 if(o.arcCivilian){openNpcDialogue(o,[mainStoryState().stage>=17?'You brought them both home. We keep the rescue camp supplied for the miners still working below.':o.arcCivilian==='waitingMother'?'Bera was on the last shift. Hesta refused the seal order, but somebody closed the return route. Please bring her back.':'Father is underground. I am staying right here. If anyone hears me down there, it is not me.',...(mountainState().stage>=10?[arcWorldReaction(o)]:[])]);return true;}
 return arcInteractionBefore(o);
};
const arcPropBefore=prop3;
prop3=function(r,o,x,z){
 if(!o.arcPhantom)return arcPropBefore(r,o,x,z);
 const p=groundedPainter(r,x,z);
 if(time<arcInsightUntil){for(const side of [-1,1]){beamArt(p,[x+side*.20,.30,z],[x+side*.14,1.25,z],.025,'#b4eee5',5);beamArt(p,[x+side*.14,1.25,z],[x+side*.33,.72,z],.025,'#b4eee5',5);}oval3(materialRealm(p,19),x,1.6,z,.12,.16,.12,'#c1f0e5',v=>v,6);}
 else {const original=mainStoryObject(o.arcPhantom===1?'rellan':'bera'),gear={...npcEquipment(original),_castAt:time-(time%2),_castDuration:2,_castColor:'#9670bf'};humanoid3({face:(points,col,n)=>r.face(points,col,n,19.1)},x,z,o.arcPhantom,gear,Math.atan2(px-x,py-z),0,0,.95);}
 return 2;
};
const arcCreatureBefore=creature3;
creature3=function(r,o,x,z){
 if(o.encounter==='veyr'&&o.hp>0&&o.hp/o.maxhp<=.33&&o.dead<=time){
  // The final phase copies the actual player's appearance, equipment and attack pose.
  const gear={...s.equipment,_appearance:{...s.character},_attackAt:o.attackAt,_attackStyle:combatStyle(),_castColor:'#b797e5'};
  humanoid3(r,x,z,s.character?.look||0,gear,Math.atan2(px+.5-x,py+.5-z),0,0,1.15);
  const p=groundedPainter(r,x,z);lairRing(materialRealm(p,19),x,z,.70,.02,time<arcInsightUntil?'#b5ecdc':'#8d6ea9');return 2.2;
 }
 return arcCreatureBefore(r,o,x,z);
};

const arcNpcEquipmentBefore=npcEquipment;
npcEquipment=function(o){const gear=arcNpcEquipmentBefore(o);return o.kind==='wardagent'||['saboteur','accomplice'].includes(o.mountainKey)?{...gear,head:'rangerHood',_hoodColor:0,body:'leatherArmor',weapon:'ironSword'}:gear;};
