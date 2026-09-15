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
  for(const [key,x,y]of [['cart',157,143],['harness',160,144],['boots',165,142]])questRelocate(mainStoryObject(key),x,y);
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
  for(const key of ['bell','lantern','hand']){const o=mainStoryObject(key);questClear(o.x,o.y,4,4);questSite(o.name,o.x,o.y,3,3);questScenery('Weathered pilgrim waymarker',o.x-2,o.y+2,{questModel:'waymarker'});}
  const shrine=mainStoryObject('shrine');questClear(shrine.x,shrine.y,10,9);questSite('Ruined shrine of the Borrowed Voice',shrine.x,shrine.y,9,8);
  for(const [dx,dy]of [[-6,-5],[6,-5],[-6,5],[6,5]])questScenery('Broken shrine pillar',shrine.x+dx,shrine.y+dy,{questModel:'ruinPillar'});
  for(const [dx,dy]of [[-3,-6],[2,-6],[-7,0],[7,0]])questScenery('Fallen shrine masonry',shrine.x+dx,shrine.y+dy,{questModel:'rubble'});
  for(const [dx,dy]of [[-3,-7],[2,-7],[-7,-3],[7,-3]])questScenery('Broken shrine wall',shrine.x+dx,shrine.y+dy,{questModel:'ruinWall',collisionRadius:1.6});
  questTrail([il.x,il.y+4],[mainStoryObject('bell').x,mainStoryObject('bell').y+2]);
  questTrail([mainStoryObject('bell').x,mainStoryObject('bell').y+2],[mainStoryObject('lantern').x,mainStoryObject('lantern').y+2]);
  questTrail([mainStoryObject('lantern').x,mainStoryObject('lantern').y+2],[mainStoryObject('hand').x,mainStoryObject('hand').y+2]);
  questTrail([mainStoryObject('lantern').x,mainStoryObject('lantern').y+2],[shrine.x,shrine.y+4]);
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
mainStoryInteract=function(o){const k=o.mainStoryKey;if(MAIN_STORY_CLUES[k]||MAIN_STORY_STONES[k]||['trail','dispatch'].includes(k))return beginQuestInspection(o,()=>questMainInteractBefore(o));return questMainInteractBefore(o);};
const questMountainInteractBefore=mountainInteract;
mountainInteract=function(o){if(MOUNTAIN_CLUES[o.mountainKey]||['memory','aftermath'].includes(o.mountainKey))return beginQuestInspection(o,()=>questMountainInteractBefore(o));return questMountainInteractBefore(o);};
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
MOUNTAIN_STEPS[1][0]='The missing ward-keepers';
MAIN_STORY_STEPS[2][0]='At Redclay Bend southeast of Briarhaven, investigate the abandoned cart, cut harness and eastbound bootprints. Stand beside each clue and choose Record the evidence.';
MAIN_STORY_STEPS[4][0]='Follow the eastern trail from Redclay Bend to the timber barricades. Defeat the lookout at the camp’s west entrance.';
MAIN_STORY_STEPS[5][0]='Enter the raider camp and search the dispatch satchel beside the stolen supply crates.';
MAIN_STORY_STEPS[19][0]='Follow the marked pilgrim trail from Ilyra’s camp: Bell southwest, Lantern farther south, then Hand northeast. Investigate each oathstone and remember its whisper.';

const questPropsBefore=prop3;
prop3=function(r,o,x,z){
 const key=o.questModel||o.mountainKey;
 if(!key)return questPropsBefore(r,o,x,z);
 const p=groundedPainter(r,x,z),q=worldLocal(p,x,0,z),wood='#795b3d',iron='#78828a',stone='#7c8278',paper='#d5c59f';
 const box=(x,y,z,w,h,d,c)=>box3(q,x,y,z,w,h,d,c);
 const beam=(a,b,w=.05,c=wood)=>beamArt(q,a,b,w,c,6);
 const wheel=(x,y,z,radius)=>{for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;beam([x+Math.cos(a)*radius,y+Math.sin(a)*radius,z],[x+Math.cos(b)*radius,y+Math.sin(b)*radius,z],.045,iron);}for(const [a,b]of [[[x-radius,y,z],[x+radius,y,z]],[[x,y-radius,z],[x,y+radius,z]]])beam(a,b,.035,iron);};
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
 if(['memory','aftermath'].includes(key)||key.startsWith('binding_')){profile3(q,0,.3,0,.8,.6,.8,[[-.5,1],[.5,.65]],stone,v=>v,6);profile3(materialRealm(q,19),0,1,0,.45,.85,.45,[[-.5,.6],[0,1],[.5,.1]],'#86bac5',v=>v,5);return 1.5;}
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
