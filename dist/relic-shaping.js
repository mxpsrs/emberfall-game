'use strict';
// Stable item keys preserve existing spell costs and inventories.
const RELIC_RECIPES={
 air:{name:'Air',item:'airRunes',level:1,count:10,xp:8},mind:{name:'Mind',item:'runes',level:1,count:10,xp:8},
 water:{name:'Water',item:'waterRunes',level:5,count:10,xp:10},earth:{name:'Earth',item:'earthRunes',level:9,count:10,xp:12},
 fire:{name:'Fire',item:'fireRunes',level:14,count:10,xp:15},fracture:{name:'Fracture',item:'chaosRunes',level:25,count:5,xp:24},
 memory:{name:'Memory',item:'deathRunes',level:45,count:5,xp:36},heart:{name:'Heart',item:'bloodRunes',level:65,count:5,xp:48}
};
const RELIC_ANCHORS={};
ORE_RESOURCES.lodestone={name:'Lodestone seam',item:'lodestone',level:1,xp:18,respawn:10};
addSkillItem('lodestone',{name:'Lodestone',icon:9,value:5,desc:'A stone that holds an inscription. Use a chisel on it to choose a relic type.'});
addSkillItem('relicChisel',{name:'Inscribing chisel',icon:12,tradeable:false,desc:'Selene’s tool. Use it on lodestone to inscribe unfinished relics.'});
addSkillItem('lakeRecord',{name:'Lake resonance record',icon:13,tradeable:false,desc:'Proof that the Fairy Lands lake can restore relics. Bring it to Arcanist Selene.'});
for(const [id,r]of Object.entries(RELIC_RECIPES)){r.unfinished='unfinished_'+id;addSkillItem(r.unfinished,{name:'Unfinished '+r.name.toLowerCase()+' relic',icon:13,relicType:id,desc:'Inscribed lodestone. Use on the leyline altar inside Briarhaven’s magic school after Selene opens the connection.'});STACKABLE.add(r.unfinished);}
if(typeof SKILL_PANEL_ICONS!=='undefined')SKILL_PANEL_ICONS['Relic Shaping']='spells';
COMBAT_SKILL_DETAILS['Relic Shaping']='Mine lodestone, inscribe a chosen pattern with a chisel, then charge unfinished relics at Selene’s leyline altar. The Well Between Worlds unlocks the craft. Higher skill unlocks more intricate patterns.';
function relicQuestState(state=s){state.relicQuest??={stage:0};state.relicQuest.stage=Math.max(0,Math.min(7,Math.floor(Number(state.relicQuest.stage)||0)));return state.relicQuest;}
const relicNormalizeBefore=normalizeJourney;
normalizeJourney=function(state,original=state){relicNormalizeBefore(state,original);state.xp['Relic Shaping']=Math.max(0,Number(state.xp['Relic Shaping'])||0);relicQuestState(state);};
s.xp['Relic Shaping']??=0;
function relicOperation(state,action,recipe,input){
 const stage=Number(state.relicQuest?.stage)||0,r=RELIC_RECIPES[recipe],bag=state.bag||{};
 const at=key=>{const a=RELIC_ANCHORS[key];return a&&input.scene===a.scene&&Math.hypot(input.x-a.x,input.y-a.y)<=2;};
 const fail=error=>({ok:false,error});
 const result={ok:true,action,recipe,take:{},give:{},xp:{}};
 if(action==='accept'){if(stage!==0||!at('teacher'))return fail('Speak to Selene to begin.');result.stage=1;}
 else if(action==='archive'){if(stage!==1||!at('archive'))return fail('Find the old crossing records in Ironcrown’s library.');result.stage=2;}
 else if(action==='learn'){if(stage!==2||!at('teacher'))return fail('Bring the library discovery to Selene.');result.stage=3;if(!bag.relicChisel)result.give.relicChisel=1;}
 else if(action==='chisel'){if(stage<3||!at('teacher')||bag.relicChisel||state.bank?.relicChisel)return fail('Your chisel is in your bag or bank.');result.give.relicChisel=1;}
 else if(action==='shape'){
  if(stage<3)return fail('Learn the inscription from Selene during The Well Between Worlds.');
  if(!r)return fail('Choose a relic pattern.');
  if(skillLevel('Relic Shaping',state.xp?.['Relic Shaping'])<r.level)return fail('Requires Relic Shaping '+r.level+'.');
  if(!bag.relicChisel||!bag.lodestone)return fail('You need an inscribing chisel and lodestone in your bag.');
  result.take.lodestone=1;result.give[r.unfinished]=1;result.xp['Relic Shaping']=r.xp;
  if(stage===3&&recipe==='air')result.stage=4;
 }else if(action==='lake'){
  if(stage!==4||!at('lake')||!bag.unfinished_air)return fail('Bring an unfinished Air relic to the lake’s immersion stone.');
  result.take.unfinished_air=1;result.give.airRunes=10;result.give.lakeRecord=1;result.stage=5;result.xp['Relic Shaping']=20;
 }else if(action==='leyline'){
  if(stage!==5||!at('teacher')||!bag.lakeRecord)return fail('Bring the lake resonance record to Selene.');
  result.take.lakeRecord=1;result.stage=6;
 }else if(action==='charge'){
  if(stage<6||!at('altar'))return fail('Selene must first connect the school altar to the Fairy Lands lake.');
  if(!r||!bag[r.unfinished])return fail('Bring an unfinished relic to the leyline altar.');
  if(skillLevel('Relic Shaping',state.xp?.['Relic Shaping'])<r.level)return fail('Requires Relic Shaping '+r.level+'.');
  result.take[r.unfinished]=1;result.give[r.item]=r.count;result.xp['Relic Shaping']=r.xp*2;
  if(stage===6){result.stage=7;result.xp['Relic Shaping']+=150;result.xp.Magic=100;result.give.coins=150;}
 }else return fail('Unknown relic action.');
 return result;
}
function applyRelicOperation(result){
 if(!result.ok)return false;
 for(const [id,n]of Object.entries(result.take))s.bag[id]=Math.max(0,(s.bag[id]||0)-n);
 for(const [id,n]of Object.entries(result.give)){if(typeof sharedGive==='function')sharedGive(id,n);else if(canCarry(id,n))s.bag[id]=(s.bag[id]||0)+n;else{s.bank??={};s.bank[id]=(s.bank[id]||0)+n;toast(ITEMS[id].name+' sent to your bank.');}}
 const was=relicQuestState().stage;if(result.stage!==undefined)relicQuestState().stage=Math.max(was,result.stage);
 for(const [skill,xp]of Object.entries(result.xp))gain(skill,xp,true);
 if(result.action==='leyline'){const teacher=relicObject('teacher');if(teacher){teacher._castAt=time;teacher._castDuration=2.4;}}
 playerAction={kind:'ritual',started:time,duration:1.8};
 if(typeof publishSharedAction==='function')publishSharedAction({kind:'work',work:'ritual',started:sharedNow(),duration:1800});
 close();renderUI();save();
 if(result.stage===7&&was<7&&typeof showQuestCompletion==='function')showQuestCompletion({title:'The Well Between Worlds',coins:150,unlocks:['Relic Shaping at the Briarhaven leyline altar']});
 else toast(result.action==='shape'?'Inscription complete. Use the unfinished relic on the charging altar.':result.action==='charge'?'The leyline charges your relics.':RELIC_QUEST_STEPS[relicQuestState().stage]||'Quest updated.');
 return true;
}
function requestRelicOperation(action,recipe){
 if(typeof tradeBusy==='function'&&tradeBusy()){toast('Finish trading before shaping relics.');return false;}
 const result=relicOperation(s,action,recipe,{scene:currentScene,x:px,y:py});if(!result.ok){toast(result.error);return false;}
 if(action==='shape'&&!canMake(result.take,RELIC_RECIPES[recipe].unfinished)){toast('Make room for the unfinished relic.');return false;}
 if(typeof sharedLive==='function'&&sharedLive()){if(sharedPending('relic'))return false;sharedQueue('relic',{action,recipe});return true;}
 return applyRelicOperation(result);
}
function renderRelicShapingPage(){
 const p=$('panel'),intro=document.createElement('p');intro.className='classic-spell-detail';intro.textContent='Relic Shaping '+lv('Relic Shaping')+' · Chisel + lodestone → unfinished relic. Charge it at the school altar. '+(relicQuestState().stage<3?'Begin The Well Between Worlds with Selene.':relicQuestState().stage<6?'Finish Selene’s quest to connect the altar.':'');p.appendChild(intro);
 for(const [id,r]of Object.entries(RELIC_RECIPES)){const b=document.createElement('button');b.type='button';b.className='fieldcraft-recipe';b.textContent=r.name+' pattern · Relic Shaping '+r.level+'\n1 lodestone → 1 unfinished relic → '+r.count+' '+r.name.toLowerCase()+' relics';b.onclick=()=>requestRelicOperation('shape',id);p.appendChild(b);}
}
function openRelicMenu(){openGamePanel('spells');classicSpellPage='supplies';renderClassicSpells();return true;}
const relicItemActionsBefore=skillItemActions;
skillItemActions=function(id){if(id==='lodestone'||id==='relicChisel')return [['Inscribe relic',openRelicMenu]];if(ITEMS[id]?.relicType)return [['Charge at school altar',()=>{const o=relicObject('altar');return o&&requestItemOnObject(o,id);}]];return relicItemActionsBefore(id);};
const relicUsePairBefore=useItemOnItem;
useItemOnItem=function(other){if(selectedUseItem==='relicChisel'&&other==='lodestone'||selectedUseItem==='lodestone'&&other==='relicChisel'){if(!s.bag.relicChisel||!s.bag.lodestone)return false;clearUseItem();return openRelicMenu();}return relicUsePairBefore(other);};
const relicFitsBefore=itemFitsStation;
itemFitsStation=function(id,o){if(o.relicKey==='altar')return !!ITEMS[id]?.relicType;if(o.relicKey==='lake')return id==='unfinished_air';if(id==='lodestone')return false;return relicFitsBefore(id,o);};
const relicCompleteUseBefore=completeItemUse;
completeItemUse=function(){const u=pendingItemUse;if(u&&['altar','lake'].includes(u.object.relicKey)){const valid=u.scene===currentScene&&objects.includes(u.object)&&Math.hypot(px-u.object.x,py-u.object.y)<=1.5&&lineOfSight(s.x,s.y,u.object.x,u.object.y);stop();if(valid)requestRelicOperation(u.object.relicKey==='lake'?'lake':'charge',ITEMS[u.id].relicType);return true;}return relicCompleteUseBefore();};
const RELIC_QUEST_STEPS=[
 'Speak to Arcanist Selene inside Briarhaven’s magic school about dwindling relics.',
 'Search the crossing records in Ironcrown Citadel’s ground-floor library, left of its great hall.',
 'Bring the lost lake inscription back to Selene at the Briarhaven school.',
 'Mine lodestone at a surface quarry. Use Selene’s chisel on it and choose the Air pattern.',
 'Use the school’s crossing stone to enter the Fairy Lands. Dunk an unfinished Air relic at the lake immersion stone.',
 'Return through the crossing and show the lake resonance record to Selene.',
 'Inscribe another lodestone. Use an unfinished relic on the school’s leyline altar.',
 'The Well Between Worlds is complete. Shape and charge new relics at the school.'
];
function relicObject(key){const a=RELIC_ANCHORS[key];return a&&worldScenes[a.scene]?.objects.find(o=>o.relicKey===key);}
function relicObjective(){
 const stage=relicQuestState().stage;if(stage===7)return null;
 if(currentScene==='fairy_between')return {scene:currentScene,o:relicObject(stage===4?'lake':'return')};
 if((stage===3||stage===6)&&!s.bag.lodestone&&!Object.values(RELIC_RECIPES).some(r=>s.bag[r.unfinished]>0))return {scene:'overworld',o:worldScenes.overworld.objects.filter(o=>o.resourceId==='lodestone').sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py))[0]};
 const key=['teacher','archive','teacher','teacher','crossing','teacher','altar'][stage];return {scene:RELIC_ANCHORS[key].scene,o:relicObject(key)};
}
function relicGuide(){const goal=relicObjective();if(!goal)return false;if(currentScene!==goal.scene){toast(RELIC_QUEST_STEPS[relicQuestState().stage]);return false;}close();return mountainTravelTo(goal.o);}
function relicQuestRows(){const stage=relicQuestState().stage;return RELIC_QUEST_STEPS.slice(0,Math.min(7,stage+1)).map((text,i)=>({text,done:i<stage,run:i===stage?relicGuide:undefined}));}
function relicDialogue(o){
 const stage=relicQuestState().stage;
 if(o.relicKey==='teacher'){
  const speeches={0:'Our relic reserves are running out. Merchants are selling old stores, and nobody here remembers how to replace them. Ironcrown’s library keeps records of the first crossings. Will you search there for a way to make more?',2:'The record describes a lake in the Fairy Lands, the space between worlds. Lodestone can hold its power if we inscribe the right pattern. Take my chisel. Mine lodestone at a surface quarry, use the chisel on it, and choose Air. I can open a brief crossing while you test the lake.',5:'Your record proves it: the lake restores the inscription. The ancient rite does not move the lake; it draws a leyline between the two worlds. I will bind its far end here, inside our school. Try the altar with another unfinished relic.',6:'The leyline is anchored. Inscribe another lodestone and use the unfinished relic on the altar. Its power will come from the lake, even while you stand here.',7:'The school no longer depends on a dwindling stockpile. Your Relic Shaping skill will reveal more intricate patterns. Mine lodestone, choose an inscription, then charge it here.'};
  const actions=[];if(stage===0)actions.push(['Find a new source of relics.',()=>requestRelicOperation('accept')]);if(stage===2)actions.push(['Learn the inscription.',()=>requestRelicOperation('learn')]);if(stage===5)actions.push(['Bind the lake to the school.',()=>requestRelicOperation('leyline')]);if(stage>=3&&!s.bag.relicChisel&&!s.bank?.relicChisel)actions.push(['Replace my lost chisel.',()=>requestRelicOperation('chisel')]);
  openNpcDialogue(o,speeches[stage]||RELIC_QUEST_STEPS[stage],actions,'The Well Between Worlds');return true;
 }
 if(o.relicKey==='archive'){dialog('Old crossing records','<p>“Between the mortal lands lies a lake that remembers every current. Inscribe lodestone, immerse the pattern, and the stone shall carry the current home. To draw its power from afar, bind two anchors with the ancient leyline rite.”</p>',stage===1?[['Record the lake inscription.',()=>requestRelicOperation('archive')]]:[]);return true;}
 if(o.relicKey==='crossing'||o.relicKey==='return'){
  if(o.relicKey==='crossing'&&stage<4){toast('Selene must prepare the crossing and you must inscribe an Air relic first.');return true;}
  return beginRelicCrossing(o);
 }
 if(o.relicKey==='lake'){dialog('The remembering lake','<p>The lake glows beside the immersion stone. Use an unfinished Air relic on the water to test the old inscription.</p>',stage===4?[['Dunk an unfinished Air relic.',()=>requestRelicOperation('lake','air')]]:[]);return true;}
 if(o.relicKey==='altar'){const rows=Object.entries(RELIC_RECIPES).filter(([,r])=>s.bag[r.unfinished]>0).map(([id,r])=>['Charge '+r.name+' relic',()=>requestRelicOperation('charge',id)]);dialog('Leyline altar','<p>'+(stage<6?'The altar is dormant. Help Selene discover the lake and bind the leyline.':'A thread of lake light runs through the stone. Use an unfinished relic here to charge it.')+'</p>',stage>=6?rows:[]);return true;}
 return false;
}
function beginRelicCrossing(o){
 if(!homeTeleportReady())return false;
 const anchor=RELIC_ANCHORS[o.relicKey];
 if(!anchor||anchor.scene!==currentScene||Math.hypot(px-anchor.x,py-anchor.y)>2||relicQuestState().stage<4)return false;
 const destination=o.relicKey==='crossing'?'fairy_between':'overworld';
 const start=()=>{
  close();stop();clearUseItem(false);closeWorldOptions();
  tutorialCrossing={kind:'relic',phase:'casting',age:0,caster:{x:px,y:py},remote:false,destination,destinationName:destination==='fairy_between'?'The Remembering Lake':'Briarhaven magic school'};
  document.body.classList.add('tutorial-crossing');
  const veil=document.createElement('div');veil.id='tutorialCrossing';veil.setAttribute('role','status');veil.setAttribute('aria-live','polite');
  veil.innerHTML='<div class="crossing-veil"></div><p id="crossingCaption">Opening the crossing between worlds…</p>';document.body.appendChild(veil);playGameSound('teleport');return true;
 };
 return typeof sharedLive==='function'&&sharedLive()?requestSharedTeleport('relic',destination,start):start();
}
function finishRelicCrossing(crossing){
 const a=RELIC_ANCHORS.crossing;s.insideBuilding=null;s.returnPoint=null;
 activateScene(crossing.destination,...(crossing.destination==='fairy_between'?[20,49]:[a.x,a.y+1]));
}
const relicInteractBefore=handleWorldInteraction;
handleWorldInteraction=function(o){if(o.relicKey){stop();return relicDialogue(o);}return relicInteractBefore(o);};
let relicWorldReady=false,relicSerial=9300000;
function setupRelicWorld(){
 if(relicWorldReady)return;relicWorldReady=true;const world=worldScenes.overworld,school=world.buildings.find(b=>b.service?.destination==='realm_briarhaven_3'),castle=world.buildings.find(b=>b.name.includes('Ironcrown'));
 const put=(scene,key,name,x,y,extra={})=>{const o={id:relicSerial++,type:'prop',name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:12,dead:0,hitAt:-100,relicKey:key,...extra};worldScenes[scene].objects.push(o);if(key)RELIC_ANCHORS[key]={scene,x,y};return o;};
 const teacher=world.objects.find(o=>o.name==='Arcanist Selene');teacher.relicKey='teacher';RELIC_ANCHORS.teacher={scene:'overworld',x:teacher.x,y:teacher.y};
 const old=currentScene;currentScene='overworld';
 try{
  const altar=world.objects.find(o=>o.interiorBuilding===school.service.destination&&o.name==='Study table');
  altar.name='Leyline altar';altar.propKind='altar';altar.relicKey='altar';RELIC_ANCHORS.altar={scene:'overworld',x:altar.x,y:altar.y};
  put('overworld','crossing','Fairy crossing stone',school.x+5,school.y+3,{interiorBuilding:school.service.destination,questModel:'seal',walkThrough:true});
  const library=castle.civilRooms.find(r=>r.usage==='library'),shelf=world.objects.find(o=>o.interiorBuilding===castle.service.destination&&o.civilRoom===library.name&&/Bookcase/.test(o.name));
  shelf.name='Old crossing records';shelf.relicKey='archive';RELIC_ANCHORS.archive={scene:'overworld',x:shelf.x,y:shelf.y};
  for(const q of surfaceQuarries){let placed=0;for(const dx of [6,-6,8,-8]){if(placed===2)break;for(const dy of [0,3,-3,6,-6]){const x=q.x+dx,y=q.y+dy;if(quarryCliff(q,x,y)||world.objects.some(o=>!o.walkThrough&&Math.hypot(o.x-x,o.y-y)<2))continue;put('overworld',null,'Lodestone seam',x,y,{type:'ore',resourceId:'lodestone',quarry:q.id});placed++;break;}}if(placed<2)throw new Error('No lodestone access at '+q.name);}

 }finally{currentScene=old;}
 worldScenes.fairy_between={objects:[],buildings:[],title:'Fairy Lands · The Remembering Lake',entry:[20,49]};sceneSizes.fairy_between=[76,68];
 put('fairy_between','return','Crossing back to Briarhaven',20,51,{questModel:'seal'});
 put('fairy_between','lake','Lake immersion stone',38,43,{questModel:'seal'});
 put('fairy_between','keeper','Nim · Keeper of the lake',32,42,{type:'villager',characterSprite:true,race:'elf',talk:'This is the space between your worlds. The lake remembers power; your inscriptions give it a shape. Selene may draw a thread home, but the source stays here.',relicKey:null});
 for(const [i,[x,y]]of [[13,24],[21,19],[31,13],[48,12],[59,21],[62,37],[56,51],[43,55],[14,43]].entries())put('fairy_between',null,'Moonwillow tree',x,y,{type:'tree',resourceId:'willow',treeArt:'broadleaf'});
 for(const [x,y]of [[22,47],[27,46],[32,45],[37,44]])put('fairy_between',null,'Lake path lantern',x,y,{type:'camp',walkThrough:true});
 if(currentScene==='overworld')objects.splice(0,objects.length,...world.objects);resetLandSurface();realmNavigation.clear();
}
const relicSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){relicSetupBefore();setupRelicWorld();};
const relicInWorldBefore=inWorld;
inWorld=function(){return currentScene==='fairy_between'||relicInWorldBefore();};
const relicWaterBefore=worldWaterDistance;
worldWaterDistance=function(x,y){return currentScene==='fairy_between'?Math.min(x-4,y-4,72-x,64-y,(Math.hypot((x-40)/15,(y-29)/12)-1)*12):relicWaterBefore(x,y);};
const relicGradeBefore=gradeLand;
gradeLand=function(x,y,h){return currentScene==='fairy_between'?.6:relicGradeBefore(x,y,h);};
const relicBridgesBefore=bridgesInRealm;
bridgesInRealm=function(){return currentScene==='fairy_between'?[]:relicBridgesBefore();};
const relicRegionBefore=regionInfo;
regionInfo=function(){return currentScene==='fairy_between'?['Fairy Lands','The Remembering Lake · Between worlds']:relicRegionBefore();};
const relicRoadBefore=roadInfluence;
roadInfluence=function(x,y){if(currentScene!=='fairy_between')return relicRoadBefore(x,y);const d=roadSegmentDistance(x,y,{a:[20.5,49.5],b:[38.5,43.5]});return [Math.max(0,1-d/1.6),0];};
const relicTrackedBefore=trackedQuestId,relicObjectiveBefore=rawQuestObjective;
trackedQuestId=function(){return s.trackedQuest==='relic-shaping'&&relicQuestState().stage<7?'relic-shaping':relicTrackedBefore();};
rawQuestObjective=function(id){return id==='relic-shaping'?relicObjective():relicObjectiveBefore(id);};

const relicMarkerBefore=questNpcMarker;
questNpcMarker=function(o){const wanted=['teacher','archive','teacher','teacher','crossing','teacher','altar'][relicQuestState().stage];if(o.relicKey&&o.relicKey===wanted)return '!';if(currentScene==='fairy_between'&&o.relicKey===(relicQuestState().stage===4?'lake':'return'))return '!';return relicMarkerBefore(o);};
