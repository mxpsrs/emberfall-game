'use strict';
// OSRS-style core progression. Worship, spirits and the permanent tool belt are Veldren rules.
const SKILL_XP=[0,0];let cumulativeSkillXP=0;
for(let level=1;level<99;level++){cumulativeSkillXP+=Math.floor(level+300*Math.pow(2,level/7));SKILL_XP[level+1]=Math.floor(cumulativeSkillXP/4);}
function skillLevel(skill,xp=s.xp[skill]){xp=Math.max(0,Number(xp)||0);if(skill==='Worship')return Math.min(99,1+Math.floor(Math.sqrt(xp/35)));let lo=1,hi=99;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(xp>=SKILL_XP[mid])lo=mid;else hi=mid-1;}return lo;}
function skillThreshold(skill,level){return skill==='Worship'?35*(Math.min(99,level)-1)**2:SKILL_XP[Math.min(99,Math.max(1,level))];}
function normalizeSkillProgression(state,original=state){
 state.xp=state.xp||{};
 if(original.skillProgressionVersion!==1){
  state.previousSkillXP={...state.xp};
  for(const [skill,value]of Object.entries(state.xp)){if(skill==='Worship')continue;const xp=Math.max(0,Number(value)||0),level=Math.min(99,1+Math.floor(Math.sqrt(xp/35))),fraction=level===99?0:(xp-35*(level-1)**2)/(35*level**2-35*(level-1)**2);state.xp[skill]=SKILL_XP[level]+(level<99?(SKILL_XP[level+1]-SKILL_XP[level])*fraction:0);}
  state.xp.Hitpoints=Math.max(SKILL_XP[10],state.xp.Hitpoints||0);
 }
 for(const skill of ['Fletching','Farming'])state.xp[skill]=Math.max(0,Number(state.xp[skill])||0);
 state.skillProgressionVersion=1;state.xp.Hitpoints=Math.max(SKILL_XP[10],state.xp.Hitpoints||0);
 for(const [slot,id]of Object.entries(state.equipment||{}))if(ITEMS[id]&&Object.entries(ITEMS[id].requirements||{}).some(([skill,level])=>skillLevel(skill,state.xp[skill])<level)){state.equipment[slot]=null;state.gear[id]=Math.max(1,state.gear[id]||0);}
 for(const [id,n]of Object.entries({airRunes:120,feathers:30}))if(state.bag[id]===undefined)state.bag[id]=n;
}
const TREE_RESOURCES={
 normal:{name:'Tree',item:'normalLogs',level:1,xp:25,fire:40,respawn:8},
 oak:{name:'Oak tree',item:'logs',level:15,xp:37.5,fire:60,respawn:14},
 willow:{name:'Willow tree',item:'willowLogs',level:30,xp:67.5,fire:90,respawn:15},
 maple:{name:'Maple tree',item:'mapleLogs',level:45,xp:100,fire:135,respawn:35},
 yew:{name:'Yew tree',item:'yewLogs',level:60,xp:175,fire:202.5,respawn:60},
 magic:{name:'Magic tree',item:'magicLogs',level:75,xp:250,fire:303.8,respawn:120}
};
const ORE_RESOURCES={
 copper:{name:'Copper rock',item:'copperOre',level:1,xp:17.5,respawn:5},tin:{name:'Tin rock',item:'tinOre',level:1,xp:17.5,respawn:5},
 iron:{name:'Iron rock',item:'ore',level:15,xp:35,respawn:8},coal:{name:'Coal rock',item:'coal',level:30,xp:50,respawn:30},
 gold:{name:'Gold rock',item:'goldOre',level:40,xp:65,respawn:60},mithril:{name:'Mithril rock',item:'mithrilOre',level:55,xp:80,respawn:60},
 adamant:{name:'Adamantite rock',item:'adamantOre',level:70,xp:95,respawn:120},rune:{name:'Runite rock',item:'runeOre',level:85,xp:125,respawn:360}
};
const FISH_RESOURCES={
 shrimp:{name:'Shrimp',raw:'rawShrimp',food:'shrimp',level:1,xp:10,cookLevel:1,cookXP:30,heal:3,burnStop:34,tool:'fishingNet'},
 trout:{name:'Trout',raw:'rawTrout',food:'fish',level:20,xp:50,cookLevel:15,cookXP:70,heal:7,burnStop:50,tool:'fishingRod',bait:'feathers'},
 salmon:{name:'Salmon',raw:'rawSalmon',food:'salmon',level:30,xp:70,cookLevel:25,cookXP:90,heal:9,burnStop:58,tool:'fishingRod',bait:'feathers'},
 lobster:{name:'Lobster',raw:'rawLobster',food:'lobster',level:40,xp:90,cookLevel:40,cookXP:120,heal:12,burnStop:74,tool:'lobsterPot'},
 swordfish:{name:'Swordfish',raw:'rawSwordfish',food:'swordfish',level:50,xp:100,cookLevel:45,cookXP:140,heal:14,burnStop:86,tool:'harpoon'},
 shark:{name:'Shark',raw:'rawShark',food:'shark',level:76,xp:110,cookLevel:80,cookXP:210,heal:20,burnStop:99,tool:'harpoon'}
};
const METAL_RECIPES={
 bronze:{name:'Bronze',level:1,xp:6.2,bar:'bronzeBar',ingredients:{copperOre:1,tinOre:1},smithXP:12.5},
 iron:{name:'Iron',level:15,xp:12.5,bar:'ironBar',ingredients:{ore:1},smithXP:25},
 steel:{name:'Steel',level:30,xp:17.5,bar:'steelBar',ingredients:{ore:1,coal:2},smithXP:37.5},
 gold:{name:'Gold',level:40,xp:22.5,bar:'goldBar',ingredients:{goldOre:1},smithXP:0},
 mithril:{name:'Mithril',level:50,xp:30,bar:'mithrilBar',ingredients:{mithrilOre:1,coal:4},smithXP:50},
 adamant:{name:'Adamant',level:70,xp:37.5,bar:'adamantBar',ingredients:{adamantOre:1,coal:6},smithXP:62.5},
 rune:{name:'Rune',level:85,xp:50,bar:'runeBar',ingredients:{runeOre:1,coal:8},smithXP:75}
};
const FOOD_BY_ID={};const SKILL_SHOP_STOCK=[];
const addSkillItem=(id,item,price=0,count=1)=>{ITEMS[id]={icon:9,...ITEMS[id],...item};if(price)SKILL_SHOP_STOCK.push([id,count,price*count]);};
addSkillItem('flour',{name:'Flour',desc:'Mix with a jug of water to make bread dough.'},2);
addSkillItem('jugWater',{name:'Jug of water',desc:'Mix with flour to make bread dough.'},1);
addSkillItem('breadDough',{name:'Bread dough',desc:'Bake at a cooking range to make bread.'});
addSkillItem('bread',{name:'Bread',heal:5,desc:'A freshly baked loaf. Restores up to 5 Hitpoints.',value:5});
for(const [key,t]of Object.entries(TREE_RESOURCES))addSkillItem(t.item,{name:key==='normal'?'Logs':t.name.replace(' tree','')+' logs',icon:8,logType:key,desc:'Light at Firemaking '+t.level+' for '+t.fire+' XP. Gather at Woodcutting '+t.level+'.',value:Math.ceil(t.level/3)+1});
for(const [key,o]of Object.entries(ORE_RESOURCES))addSkillItem(o.item,{name:o.name.replace(' rock',' ore'),resource:key,desc:'Mine at Mining '+o.level+' for '+o.xp+' XP. Smelt the ore at a furnace.',value:o.level+1});
for(const [key,f]of Object.entries(FISH_RESOURCES)){
 addSkillItem(f.raw,{name:'Raw '+f.name.toLowerCase(),icon:10,rawFish:key,desc:'Requires Cooking '+f.cookLevel+'. Cooking grants '+f.cookXP+' XP; food can burn.',value:Math.max(1,Math.floor(f.heal/2))});
 addSkillItem(f.food,{name:f.name,icon:10,heal:f.heal,desc:'Eat to restore up to '+f.heal+' Hitpoints.',value:f.heal});FOOD_BY_ID[f.food]=f;
}
for(const [key,m]of Object.entries(METAL_RECIPES))addSkillItem(m.bar,{name:m.name+' bar',metal:key,desc:'Smelt at Smithing '+m.level+'. Work this bar at an anvil.',value:m.level*2+3});
for(const [id,name,price]of [['airRunes','Air runes',4],['waterRunes','Water runes',4],['earthRunes','Earth runes',4],['fireRunes','Fire runes',4],['chaosRunes','Chaos runes',90],['deathRunes','Death runes',180],['bloodRunes','Blood runes',400],['feathers','Feathers',2],['arrowShafts','Arrow shafts',1],['headlessArrows','Headless arrows',3]]){addSkillItem(id,{name,icon:id.includes('Rune')?13:12,desc:name+'. Used in spells or fletching.'},price,10);STACKABLE.add(id);}
ITEMS.runes.name='Mind runes';ITEMS.runes.desc='Mind runes power strike spells. Elemental runes are also required.';
ITEMS.arrows.name='Bronze arrows';ITEMS.arrows.rangedStrength=7;ITEMS.arrows.desc='Bronze arrows. Equip a bow to use them.';
addSkillItem('burntFish',{name:'Burnt fish',icon:10,desc:'A spoiled catch. Higher Cooking reduces the chance of burning food.'});
addSkillItem('potatoSeeds',{name:'Potato seeds',desc:'Plant in a farming patch at Farming 1.'},1,5);STACKABLE.add('potatoSeeds');
addSkillItem('potato',{name:'Potato',desc:'A crop harvested from a planted potato patch.',value:2});
const extraTools={fishingNet:{name:'Small fishing net',skill:'Fishing',description:'Used for shrimp.'},lobsterPot:{name:'Lobster pot',skill:'Fishing',description:'Used for lobsters from level 40.'},harpoon:{name:'Harpoon',skill:'Fishing',description:'Used for swordfish and sharks.'},knife:{name:'Knife',skill:'Fletching',description:'Cuts logs into arrow shafts.'},seedDibber:{name:'Seed dibber',skill:'Farming',description:'Plants seeds in cleared farming patches.'}};
Object.assign(TOOL_BELT_TOOLS,extraTools);
const normalizeOriginalBelt=normalizeToolBelt;
normalizeToolBelt=function(state){const belt=normalizeOriginalBelt(state);for(const id of Object.keys(extraTools))if(belt[id]===undefined)belt[id]=true;return belt;};

function resourceDefinition(o){return o.type==='tree'?TREE_RESOURCES[o.resourceId||'normal']:o.type==='ore'?ORE_RESOURCES[o.resourceId||'copper']:o.type==='fish'?FISH_RESOURCES[o.resourceId||'shrimp']:null;}
function resourceRequirement(o){const d=resourceDefinition(o),skill={tree:'Woodcutting',ore:'Mining',fish:'Fishing'}[o.type];if(!d)return false;if(lv(skill)<d.level){toast('Requires '+skill+' '+d.level+'.');return false;}return true;}
function gatheringActivity(){
 const o=target;if(!o||!resourceDefinition(o)||path.length||Math.hypot(s.x-px,s.y-py)>.02||Math.hypot(o.x-px,o.y-py)>1.46||o.dead>time)return null;
 return {object:o,tool:o.type==='tree'?'axe':o.type==='ore'?'pickaxe':resourceDefinition(o).tool,phase:Math.min(.999,elapsed/actionDuration(o))};
}
function harvestResource(o){
 const d=resourceDefinition(o);if(!d||!resourceRequirement(o)){stop();return false;}
 const skill={tree:'Woodcutting',ore:'Mining',fish:'Fishing'}[o.type],tool=o.type==='tree'?'axe':o.type==='ore'?'pickaxe':d.tool,item=d.item||d.raw;
 if(!useBeltTool(tool)){stop();return false;}if(d.bait&&!(s.bag[d.bait]>0)){stop();toast('You need '+ITEMS[d.bait].name.toLowerCase()+'.');return false;}
 if(!canCarry(item)){stop();toast('Your bag is full.');return false;}
 const chance=Math.min(.95,.4+(lv(skill)-d.level)*.009+gatheringToolRank(tool)*.025);if(Math.random()>chance)return false;
 if(!addToBag(item))return false;if(d.bait)s.bag[d.bait]--;
 gain(skill,d.xp);if(typeof gameMessage==='function')gameMessage((o.type==='fish'?'You catch ':o.type==='ore'?'You mine ':'You get ')+ITEMS[item].name.toLowerCase()+'.');floating('+1 '+ITEMS[item].name.toLowerCase(),o.x,o.y);o.hitAt=time;
 if(o.type==='ore'||o.type==='tree'&&(o.resourceId==='normal'||Math.random()<.125)){o.dead=time+d.respawn;o.respawnAt=Date.now()+d.respawn*1000;stop();}
 if(o.tutorialRole==='ore'||o.tutorialRole==='tin'){if(s.bag.copperOre>0&&s.bag.tinOre>0)tutorialEvent('ore');}else tutorialEvent(o.type);
 renderUI();save();return true;
}
function hasIngredients(ingredients){return Object.entries(ingredients).every(([id,n])=>(s.bag[id]||0)>=n);}
function consumeIngredients(ingredients){for(const [id,n]of Object.entries(ingredients))s.bag[id]-=n;}
function canMake(ingredients,result,count=1){const freed=Object.entries(ingredients).reduce((n,[id,q])=>n+(STACKABLE.has(id)?(s.bag[id]===q?1:0):q),0);return inventorySlots().length-freed+(STACKABLE.has(result)&&s.bag[result]>0?0:STACKABLE.has(result)?1:count)<=BAG_SIZE;}
function requireSkill(skill,level){if(lv(skill)>=level)return true;toast('Requires '+skill+' '+level+'.');return false;}
function eatFood(id){if(!(s.bag[id]>0)||!ITEMS[id]?.heal)return false;if(s.hp>=maxhp()){tutorialEvent('eat');toast('Your health is already full.');return false;}s.bag[id]--;const n=Math.min(ITEMS[id].heal,maxhp()-s.hp);s.hp+=n;if(typeof gameMessage==='function')gameMessage('You eat the '+ITEMS[id].name.toLowerCase()+'. It heals '+n+' Hitpoints.');floating('+'+n,px,py,'#b9efad');tutorialEvent('eat');renderUI();save();return true;}
function nearbyWork(type){return objects.find(o=>(type==='fire'?['camp','range'].includes(o.type):type==='forge'?['forge','practiceForge'].includes(o.type):o.workstation===type)&&o.dead<=time&&Math.hypot(o.x-px,o.y-py)<2&&lineOfSight(s.x,s.y,o.x,o.y));}
let pendingCooking=null;
function requestCookFish(id){
 if(typeof selectUseItem==='function')return selectUseItem(id);
 const fish=FISH_RESOURCES[ITEMS[id]?.rawFish],bread=id==='breadDough';if(!fish&&!bread||!(s.bag[id]>0))return false;
 if(!requireSkill('Cooking',fish?.cookLevel||1))return false;
 if(nearbyWork(bread?'range':'fire')){stop();return bread?bakeBread():cookFish(id);}
 const fires=objects.filter(o=>(bread?o.type==='range':['camp','range'].includes(o.type))&&o.dead<=time&&Math.hypot(o.x-px,o.y-py)<40).sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py));
 for(const fire of fires){const p=route(fire.x,fire.y,true,1.45);if(p===null)continue;stop();pendingCooking={id,fire};target=fire;path=p;renderAction();if(!p.length&&Math.hypot(px-s.x,py-s.y)<.02)arrive();return true;}
 toast(bread?'Open the kitchen door and use its cooking range.':'Find a reachable fire or range to cook your catch.');return false;
}
function mixBreadDough(){
 const ingredients={flour:1,jugWater:1};if(!hasIngredients(ingredients)){toast('You need flour and a jug of water.');return false;}
 if(!canMake(ingredients,'breadDough')){toast('Make space in your bag for the dough.');return false;}
 consumeIngredients(ingredients);s.bag.breadDough=(s.bag.breadDough||0)+1;tutorialEvent('mix-dough');renderUI();save();toast('Flour and water mixed into bread dough.');return true;
}
function bakeBread(){
 if(!(s.bag.breadDough>0)){toast('Mix flour and water into dough first.');return false;}
 if(!nearbyWork('range')){toast('Use a cooking range to bake your bread.');return false;}
 s.bag.breadDough--;s.bag.bread=(s.bag.bread||0)+1;gain('Cooking',40);tutorialEvent('bake-bread');renderUI();save();toast('Bread baked · +40 Cooking XP');return true;
}
function fireExit(x,y){return [[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dy])=>[x+dx,y+dy]).find(([a,b])=>land(a,b)&&!objects.some(o=>!o.collected&&o.dead<=time&&o.x===a&&o.y===b&&!o.walkThrough));}
function clearFireTile(x,y){return inWorld()&&!water(x,y)&&!buildings.some(b=>withinWalkIn(b,x,y))&&!objects.some(o=>!o.collected&&o.dead<=time&&o.x===x&&o.y===y&&(o.type==='camp'||!o.walkThrough));}
function lightLog(id=Object.keys(s.bag).find(id=>s.bag[id]>0&&ITEMS[id]?.logType)){
 const d=TREE_RESOURCES[ITEMS[id]?.logType];if(!d||!s.bag[id]){toast('You need logs.');return false;}
 if(!useBeltTool('tinderbox')||!requireSkill('Firemaking',d.level))return false;
 if(!clearFireTile(s.x,s.y)||!fireExit(s.x,s.y)){toast('Find clear outdoor ground with room to step away.');return false;}
 if(Math.hypot(px-s.x,py-s.y)>.02){toast('Finish your step before lighting a fire.');return false;}
 stop();s.bag[id]--;const pile=groundDrop({[id]:1});
 playerAction={kind:'firemaking',id,pile,x:s.x,y:s.y,scene:currentScene,started:time,duration:2.4,commitAt:2.1,committed:false,attempt:0};
 renderUI();renderAction();save();return true;
}
function updateSkillingAction(action){
 const age=time-action.started;$('activity').style.width=Math.min(100,age/action.duration*100)+'%';
 if(action.scene!==currentScene||Math.hypot(px-action.x,py-action.y)>.08){stop();return;}
 if(!action.committed&&age>=action.commitAt){
  if(action.kind==='cook'){
   const fire=action.fire;if(!objects.includes(fire)||fire.collected||fire.dead>time||fire.expiresAt<=Date.now()||Math.hypot(fire.x-px,fire.y-py)>1.5){stop();toast('The fire is no longer available.');return;}
   action.committed=true;cookFish(action.id,true,fire);
  }else{
   if(!s.groundLoot.includes(action.pile)||!(action.pile.items[action.id]>0)||!clearFireTile(action.x,action.y)||!fireExit(action.x,action.y)){stop();toast('The logs or fire site are no longer available.');return;}
   const d=TREE_RESOURCES[ITEMS[action.id].logType],chance=Math.min(.95,.45+(lv('Firemaking')-d.level)*.012);
   if(!besideFishingTutor()&&Math.random()>chance&&action.attempt<5){action.attempt++;action.started=time-.45;toast('You strike the tinderbox again…');return;}
   action.committed=true;action.pile.items[action.id]--;if(!action.pile.items[action.id])delete action.pile.items[action.id];if(!Object.keys(action.pile.items).length)s.groundLoot=s.groundLoot.filter(p=>p!==action.pile);
   const o={id:practiceFireSerial++,type:'camp',name:'Log fire',cooking:true,...(besideFishingTutor()?{tutorialRole:'fishing-fire'}:{}),x:action.x,y:action.y,homeX:action.x,homeY:action.y,drawX:action.x,drawY:action.y,sprite:7,dead:0,walkThrough:true,logType:ITEMS[action.id].logType,expiresAt:Date.now()+PLAYER_FIRE_LIFETIME};
   worldScenes[currentScene].objects.push(o);if(worldScenes[currentScene].objects!==objects)objects.push(o);gain('Firemaking',d.fire);tutorialEvent('fire');if(typeof playGameSound==='function')playGameSound('fire');renderUI();save();toast('Fire lit · +'+d.fire+' Firemaking XP');
  }
 }
 if(age>=action.duration&&playerAction===action){playerAction=null;$('activity').style.width='0';if(action.kind==='firemaking'&&action.committed){const exit=fireExit(action.x,action.y);if(exit){path=[exit];target=null;}}renderAction();}
}

function cookFish(id=Object.keys(s.bag).find(id=>s.bag[id]>0&&ITEMS[id]?.rawFish),commit=false,station=null){
 const f=FISH_RESOURCES[ITEMS[id]?.rawFish];if(!f||!s.bag[id]){toast('Bring a raw catch to a hearth or fire.');return false;}
 if(!requireSkill('Cooking',f.cookLevel))return false;const fire=station||nearbyWork('fire');if(!fire||!objects.includes(fire)||Math.hypot(fire.x-px,fire.y-py)>2){toast('Stand beside a range or fire.');return false;}
 if(fire.type==='camp'&&!commit){stop();playerHeading=Math.atan2(fire.x-px,fire.y-py);playerAction={kind:'cook',id,fire,x:px,y:py,scene:currentScene,started:time,duration:1.8,commitAt:.95,committed:false};renderAction();return true;}
 const supervised=['fish','fire','cook-shrimp'].includes(tutorialStep()?.event)&&f===FISH_RESOURCES.shrimp&&besideFishingTutor();const burnt=!supervised&&Math.random()<Math.max(0,(f.burnStop-lv('Cooking'))/(f.burnStop-f.cookLevel)*.32);
 s.bag[id]--;const result=burnt?'burntFish':f.food;s.bag[result]=(s.bag[result]||0)+1;if(!burnt){gain('Cooking',f.cookXP);if(f===FISH_RESOURCES.shrimp&&fire.type==='camp')tutorialEvent('cook-shrimp');}renderUI();save();toast(burnt?'The fish burns. Higher Cooking improves your chances.':f.name+' cooked · +'+f.cookXP+' Cooking XP');return true;
}
function cookTrout(){return cookFish();}
function smeltMetal(key){
 const m=METAL_RECIPES[key];if(!m||!requireSkill('Smithing',m.level))return false;if(!nearbyWork('furnace')){toast('Stand beside a furnace to smelt ore.');return false;}
 if(!hasIngredients(m.ingredients)){toast('You need '+Object.entries(m.ingredients).map(([id,n])=>n+' '+ITEMS[id].name).join(' + ')+'.');return false;}
 if(!canMake(m.ingredients,m.bar)){toast('Make space in your bag.');return false;}consumeIngredients(m.ingredients);
 if(key==='iron'&&Math.random()>Math.min(.8,.5+(lv('Smithing')-15)*.01)){renderUI();save();toast('The iron ore is impure and fails to form a bar.');return false;}
 s.bag[m.bar]=(s.bag[m.bar]||0)+1;gain('Smithing',m.xp);tutorialEvent('smelt');renderUI();save();toast(m.name+' bar smelted.');return true;
}
const smithPatterns={dagger:{name:'Dagger',offset:0,bars:1,count:1},arrowheads:{name:'Arrowheads ×15',offset:4,bars:1,count:15},weapon:{name:'Sword',offset:4,bars:1,count:1},head:{name:'Headgear',offset:10,bars:2,count:1},shield:{name:'Shield',offset:12,bars:2,count:1},legs:{name:'Legguards',offset:15,bars:3,count:1},body:{name:'Chestplate',offset:17,bars:5,count:1}};
function smithingLevel(key,part){const tier=['bronze','iron','steel','mithril','adamant','rune'].indexOf(key),levels={dagger:[1,15,30,50,70,85],arrowheads:[5,20,35,55,75,90],weapon:[4,19,34,54,74,89],head:[7,22,37,57,77,92],shield:[12,27,42,62,82,97],legs:[16,31,46,66,86,99],body:[18,33,48,68,88,99]};return levels[part]?.[tier]||99;}
function smithMetal(key,part){
 const m=METAL_RECIPES[key],p=smithPatterns[part];if(!m||!p||key==='gold')return false;const id=part==='arrowheads'?(key==='iron'?'arrowheads':key+'Arrowheads'):key+'_'+part,level=smithingLevel(key,part),ingredients={[m.bar]:p.bars};
 if(!ITEMS[id]||!requireSkill('Smithing',level)||!useBeltTool('hammer'))return false;if(!nearbyWork('forge')){toast('Stand beside an anvil.');return false;}if(!hasIngredients(ingredients)){toast('You need '+p.bars+' '+m.name.toLowerCase()+' bars.');return false;}if(!canMake(ingredients,id,p.count)){toast('Make space in your bag.');return false;}
 consumeIngredients(ingredients);const bag=ITEMS[id].slot?s.gear:s.bag;bag[id]=(bag[id]||0)+p.count;gain('Smithing',m.smithXP*p.bars);tutorialEvent('smith');renderUI();save();toast(ITEMS[id].name+' made.');return true;
}
function openSmithing(kind='forge',metal='bronze'){
 if(typeof openWorkbench==='function')return openWorkbench(kind,metal);
 const smelting=kind==='furnace',m=METAL_RECIPES[metal];dialog(smelting?'Smelting furnace':'Smithing anvil','<p>Smithing '+lv('Smithing')+' · '+(s.bag[m.bar]||0)+' '+m.name.toLowerCase()+' bars</p><div id="metalChoices" class="recipe-metals"></div><div id="smithChoices" class="recipe-list"></div>');
 for(const [id,row]of Object.entries(METAL_RECIPES)){if(!smelting&&id==='gold')continue;const b=document.createElement('button');b.textContent=row.name;b.setAttribute('aria-pressed',String(id===metal));b.onclick=()=>openSmithing(kind,id);$('metalChoices').appendChild(b);}
 const rows=smelting?[['bar',{name:m.name+' bar',offset:0}]]:Object.entries(smithPatterns);
 for(const [part,p]of rows){const level=smelting?m.level:smithingLevel(metal,part),b=document.createElement('button');b.disabled=lv('Smithing')<level;b.textContent=p.name+' · Smithing '+level+' · '+(smelting?Object.entries(m.ingredients).map(([id,n])=>n+' '+ITEMS[id].name).join(' + '):p.bars+' bars');b.onclick=()=>{if(smelting)smeltMetal(metal);else smithMetal(metal,part);openSmithing(kind,metal);};$('smithChoices').appendChild(b);}
}
function workPracticeForge(){openSmithing('forge');return true;}
function fletch(id){
 if(!useBeltTool('knife'))return false;let ingredients,result,count=15,xp,level=1;
 if(ITEMS[id]?.logType){const tree=TREE_RESOURCES[ITEMS[id].logType];level=tree.level;ingredients={[id]:1};result='arrowShafts';count=15*(Object.keys(TREE_RESOURCES).indexOf(ITEMS[id].logType)+1);xp=5*(count/15);}
 else if(id==='arrowShafts'){ingredients={arrowShafts:15,feathers:15};result='headlessArrows';xp=15;}
 else{const metal=id==='arrowheads'?'iron':id.replace('Arrowheads',''),tier=['bronze','iron','steel','mithril','adamant','rune'].indexOf(metal);if(tier<0)return false;level=[1,15,30,45,60,75][tier];ingredients={[id]:15,headlessArrows:15};result=metal==='bronze'?'arrows':metal+'Arrows';xp=[19.5,37.5,75,112.5,150,187.5][tier];}
 if(!requireSkill('Fletching',level))return false;if(!hasIngredients(ingredients)){toast('You need '+Object.entries(ingredients).map(([k,n])=>n+' '+ITEMS[k].name).join(' + ')+'.');return false;}if(!canMake(ingredients,result,count)){toast('Make space in your bag.');return false;}consumeIngredients(ingredients);s.bag[result]=(s.bag[result]||0)+count;gain('Fletching',xp);renderUI();save();toast(count+' '+ITEMS[result].name+' made.');return true;
}
function finishArrows(){const id=Object.keys(s.bag).find(id=>s.bag[id]>=15&&(id==='arrowheads'||id.endsWith('Arrowheads')));return id?fletch(id):false;}

const GEAR_TIERS=[
 {id:'bronze',name:'Bronze',level:1,source:'B',attack:4,strength:4,defense:8,cost:30},
 {id:'iron',name:'Iron',level:1,source:'I',attack:8,strength:6,defense:12,cost:65},
 {id:'steel',name:'Steel',level:5,source:'I',attack:12,strength:10,defense:18,cost:150,tint:[1.13,1.16,1.18]},
 {id:'black',name:'Black',level:10,source:'I',attack:17,strength:14,defense:24,cost:300,tint:[.42,.46,.48]},
 {id:'mithril',name:'Mithril',level:20,source:'M',attack:24,strength:20,defense:32,cost:600},
 {id:'adamant',name:'Adamant',level:30,source:'M',attack:33,strength:28,defense:46,cost:1200,tint:[.66,1.06,.63]},
 {id:'rune',name:'Rune',level:40,source:'M',attack:48,strength:40,defense:65,cost:2500,tint:[.68,1.10,1.24]},
 {id:'gold',name:'Gilded',level:40,source:'G',attack:48,strength:40,defense:65,cost:3500},
 {id:'dragonslayer',name:'Dragonslayer',level:60,source:'DS',attack:67,strength:60,defense:95,cost:9000}
];
const weights={head:.36,shoulders:.16,body:1,hands:.10,legs:.72,feet:.12,shield:.70};
for(const tier of GEAR_TIERS){
 const set=MODULAR_ARMOR_SETS.find(a=>a.id===tier.id);if(set)Object.assign(set,{level:tier.level,name:tier.name});
 for(const [slot,source,label]of [...MODULAR_ARMOR_PARTS,['shield','Shield','shield'],['weapon','Sword','sword']]){
  const id=tier.id+'_'+slot,weapon=slot==='weapon';ITEMS[id]={...ITEMS[id],name:tier.name+' '+label,slot,icon:weapon?0:slot==='shield'?6:4,style:weapon||slot==='shield'?'melee':undefined,armorSet:tier.id,model:weapon?tier.source+'_Sword':slot==='shield'?(tier.source==='G'?'G_':tier.source)+'_Shield':source+'.'+tier.source+'.001',modelTint:tier.tint,range:weapon?1.45:undefined,power:weapon?tier.strength:0,attackBonus:weapon?tier.attack:0,strengthBonus:weapon?tier.strength:0,armor:weapon?0:Math.round(tier.defense*weights[slot]),attackTicks:weapon?4:undefined,requirements:{[weapon?'Attack':'Defense']:tier.level},attackLevel:weapon?tier.level:undefined,defenseLevel:weapon?undefined:tier.level,magicAccuracy:weapon?0:-Math.round(16*(weights[slot]||0)),rangedAccuracy:weapon?0:-Math.round(8*(weights[slot]||0)),desc:tier.name+' '+label+'. Requires '+(weapon?'Attack':'Defense')+' '+tier.level+'. '+(weapon?'Four-tick sword; higher accuracy and Strength bonus.':'Protects against physical attacks; heavy metal reduces ranged and magic accuracy.')};
  const cost=tier.cost*(weapon?2:slot==='body'?2:slot==='legs'?1.5:1),row=modularShopStock.find(a=>a[0]===id);if(row)row[2]=cost;else modularShopStock.push([id,1,cost]);
 }
}
for(const [id,template]of [['bronzeSword','bronze_weapon'],['ironSword','iron_weapon'],['ironHelm','iron_head'],['ironShield','iron_shield']])ITEMS[id]={...ITEMS[template],name:ITEMS[id].name};
addSkillItem('woodenSword',{name:'Wooden training sword',icon:0,slot:'weapon',style:'melee',model:'Emberfall_WoodenSword',range:1.45,power:0,attackBonus:4,strengthBonus:4,attackTicks:4,requirements:{Attack:1},desc:'Captain Vale’s wooden practice sword. A broader grip and reach than your first dagger; yours to keep.'});
addSkillItem('woodenShield',{name:'Wooden training shield',icon:6,slot:'shield',style:'melee',model:'Emberfall_WoodenShield',armor:3,requirements:{Defense:1},desc:'A wooden practice shield from Captain Vale. Offers modest protection with a melee weapon.'});
Object.assign(ITEMS.leatherArmor,{armor:8,rangedAccuracy:2,magicAccuracy:-2,requirements:{Defense:1},desc:'Light leather body armor. Defense 1; suitable for early ranged training.'});
Object.assign(ITEMS.leatherBoots,{armor:1,requirements:{Defense:1},desc:'Light leather boots. Requires Defense 1.'});
Object.assign(ITEMS.mageRobe,{armor:0,magic:0,magicAccuracy:5,requirements:{Magic:1},desc:'Light robes that improve magic accuracy.'});
Object.assign(ITEMS.oakStaff,{attackBonus:0,magicAccuracy:10,power:0,attackTicks:5,requirements:{Magic:1},desc:'A staff for autocasting spells. Requires Magic 1. Select a spell in your spellbook.'});
Object.assign(ITEMS.shortbow,{attackBonus:8,power:0,attackTicks:4,requirements:{Ranged:1},maxAmmo:1,desc:'A basic bow. Requires Ranged 1; fires bronze or iron arrows.'});
for(const [key,name,level,bonus,maxAmmo]of [['oak','Oak',5,14,5],['willow','Willow',20,20,20],['maple','Maple',30,29,30],['yew','Yew',40,47,40],['magic','Magic',50,69,60]]){
 const id=key+'Shortbow';addSkillItem(id,{name:name+' shortbow',slot:'weapon',style:'ranged',icon:2,range:7,power:0,attackBonus:bonus,attackTicks:4,maxAmmo,requirements:{Ranged:level},desc:'Requires Ranged '+level+'. Better ranged accuracy and support for stronger arrows.'},level*50+100);
}
addSkillItem('rangerHood',{name:'Ranger hood',slot:'head',icon:4,model:'Outfit_Ranger_Head_Hood',openFace:true,armor:1,rangedAccuracy:1,requirements:{Defense:1},desc:'A cloth ranger hood, worn separately from your everyday clothes. Requires Defense 1.'},35);
for(const [key,name,level,bonus]of [['wizard','Wizard',1,8],['adept','Adept',20,15],['mystic','Mystic',40,20]])addSkillItem(key+'Robe',{name:name+' robe',slot:'body',icon:15,magic:0,magicAccuracy:bonus,armor:0,requirements:{Magic:level},desc:'Requires Magic '+level+'. Improves spell accuracy.'},100+level*30);
for(const [key,name,level,defense]of [['studded','Studded leather',20,18],['greenHide','Green hide',40,35],['blueHide','Blue hide',50,42],['redHide','Red hide',60,50],['blackHide','Black hide',70,60]])addSkillItem(key+'Body',{name:name+' body',slot:'body',icon:5,armor:defense,rangedAccuracy:Math.round(defense*.35),magicAccuracy:-15,requirements:{Ranged:level,Defense:level>=40?40:20},desc:'Ranged '+level+' and Defense '+(level>=40?40:20)+'. Ranged armor with improved physical protection.'},200+level*40);
for(const key of ['bronze','iron','steel','mithril','adamant','rune'])ITEMS[key+'_dagger']={...ITEMS[key+'_weapon'],name:METAL_RECIPES[key].name+' dagger',modelScale:.72,desc:'A light dagger. Requires Attack '+GEAR_TIERS.find(t=>t.id===key).level+'.'};
for(const [index,key]of ['bronze','iron','steel','mithril','adamant','rune'].entries()){
 const m=METAL_RECIPES[key],head=key==='iron'?'arrowheads':key+'Arrowheads';addSkillItem(head,{name:m.name+' arrowheads',icon:12,desc:'Combine 15 with 15 headless arrows using Fletching.'});STACKABLE.add(head);
 if(key!=='bronze'){const id=key+'Arrows';addSkillItem(id,{name:m.name+' arrows',icon:12,ammoLevel:[1,1,5,20,30,40][index],rangedStrength:[7,10,16,22,31,49][index],desc:'Stronger ammunition. A suitable bow is required.'},[1,2,4,8,16,30][index],20);STACKABLE.add(id);}
}
for(const [i,key]of ['bronze','iron','steel','black','mithril','adamant','rune','dragonslayer'].entries())for(const tool of ['axe','pickaxe']){const level=[1,1,6,11,21,31,41,61][i],name=GEAR_TIERS.find(a=>a.id===key).name;addSkillItem(key+(tool==='axe'?'Axe':'Pickaxe'),{name:name+' '+tool,icon:tool==='axe'?8:9,beltTool:tool,toolTier:key,toolRank:i,requirements:{[tool==='axe'?'Woodcutting':'Mining']:level},desc:'Add to your tool belt. Requires '+(tool==='axe'?'Woodcutting':'Mining')+' '+level+'. Improves gathering success.'},20*Math.pow(2,i));}
// Complete chest pieces include their shoulder protection. Existing accessory
// copies remain bankable/sellable, but no longer occupy separate worn slots.
for(const tier of GEAR_TIERS){const body=ITEMS[tier.id+'_body'];body.armor+=Math.round(tier.defense*weights.shoulders);body.desc+=' Includes matching shoulder armor.';}
for(const item of Object.values(ITEMS))if(item.slot==='shoulders'||item.slot==='crest')item.desc=item.slot==='shoulders'?'Shoulder armor is now included with its matching chest piece. This older part can be stored or sold.':'A keepsake helmet ornament. Headgear now uses a single equipment slot. This older ornament can be stored or sold.';
for(let i=modularShopStock.length-1;i>=0;i--)if(['shoulders','crest'].includes(ITEMS[modularShopStock[i][0]]?.slot))modularShopStock.splice(i,1);
function equipmentRequirement(item,state=s){for(const [skill,level]of Object.entries(item.requirements||{}))if(skillLevel(skill,state.xp[skill])<level)return skill+' '+level;return null;}
function fitBeltTool(id){const item=ITEMS[id];if(!item?.beltTool||!s.bag[id])return false;const requirement=equipmentRequirement(item);if(requirement){toast('Requires '+requirement+'.');return false;}const key=item.beltTool+'Item',previous=s.toolBelt[key]||('bronze'+(item.beltTool==='axe'?'Axe':'Pickaxe'));if(previous===id){toast('That tool is already on your belt.');return false;}s.bag[id]--;s.bag[previous]=(s.bag[previous]||0)+1;s.toolBelt[key]=id;renderUI();save();toast(item.name+' added to your tool belt.');return true;}
function gatheringToolRank(tool){const id=s.toolBelt?.[tool+'Item'];return id&&ITEMS[id]&&!equipmentRequirement(ITEMS[id])?ITEMS[id].toolRank||0:0;}

for(const key of Object.keys(SPELLS))delete SPELLS[key];
for(const [id,name,level,maxHit,baseXP,element,elementCount,air,catalyst]of [
 ['spark','Wind strike',1,2,5.5,'airRunes',0,1,'runes'],['frost','Water strike',5,4,7.5,'waterRunes',1,1,'runes'],['earthStrike','Earth strike',9,6,9.5,'earthRunes',2,1,'runes'],['ember','Fire strike',13,8,11.5,'fireRunes',3,2,'runes'],
 ['windBolt','Wind bolt',17,9,13.5,'airRunes',0,2,'chaosRunes'],['waterBolt','Water bolt',23,10,16.5,'waterRunes',2,2,'chaosRunes'],['earthBolt','Earth bolt',29,11,19.5,'earthRunes',3,2,'chaosRunes'],['fireBolt','Fire bolt',35,12,22.5,'fireRunes',4,3,'chaosRunes'],
 ['windBlast','Wind blast',41,13,25.5,'airRunes',0,3,'deathRunes'],['waterBlast','Water blast',47,14,28.5,'waterRunes',3,3,'deathRunes'],['earthBlast','Earth blast',53,15,31.5,'earthRunes',4,3,'deathRunes'],['fireBlast','Fire blast',59,16,34.5,'fireRunes',5,4,'deathRunes'],
 ['windWave','Wind wave',62,17,36,'airRunes',0,5,'bloodRunes'],['waterWave','Water wave',65,18,37.5,'waterRunes',7,5,'bloodRunes'],['earthWave','Earth wave',70,19,40,'earthRunes',7,5,'bloodRunes'],['fireWave','Fire wave',75,20,42.5,'fireRunes',7,5,'bloodRunes']
]){const ingredients={airRunes:air,[catalyst]:1};if(elementCount)ingredients[element]=elementCount;SPELLS[id]={name,level,element,tier:['runes','chaosRunes','deathRunes','bloodRunes'].indexOf(catalyst)+1,power:maxHit,baseXP,ingredients,cost:1,range:8,color:element==='waterRunes'?'#79c9ed':element==='earthRunes'?'#c8ba83':element==='fireRunes'?'#e7a365':'#b6e2db',desc:'Maximum hit '+maxHit+'. '+baseXP+' base Magic XP per cast.'};}
function selectedAmmo(){const id=s.equipment.ammo,weapon=equippedWeapon();return s.equippedAmmoCount>0&&isAmmunition(id)&&(ITEMS[id].ammoLevel||1)<=(weapon.maxAmmo||1)?id:null;}
function attackRollChance(attack,defense){return attack>defense?1-(defense+2)/(2*(attack+1)):attack/(2*(defense+1));}
function equipmentBonus(stat){return Object.entries(s.equipment).reduce((n,[slot,id])=>n+(slot==='shield'&&combatStyle()!=='melee'?0:ITEMS[id]?.[stat]||0),0);}
combatLevel=function(){const base=.25*(lv('Defense')+lv('Hitpoints')+Math.floor(lv('Worship')/2)),melee=.325*(lv('Attack')+lv('Strength')),ranged=.325*Math.floor(lv('Ranged')*1.5),magic=.325*Math.floor(lv('Magic')*1.5);return Math.floor(base+Math.max(melee,ranged,magic));};
playerAccuracy=function(o,style=combatStyle()){const level=lv(style==='melee'?'Attack':style==='magic'?'Magic':style==='worship'?'Worship':'Ranged'),focus=trainingFocus(style),bonus=style==='magic'?equipmentBonus('magicAccuracy'):style==='ranged'?(equippedWeapon().attackBonus||0)+equipmentBonus('rangedAccuracy'):equippedWeapon().attackBonus||0,effective=level+8+(style==='melee'?(focus==='accurate'?3:focus==='balanced'?1:0):focus==='focused'?3:0),attack=effective*Math.max(1,bonus+64),defense=((o.defenseLevel||o.level||1)+9)*64;return attackRollChance(attack,defense);};
enemyAccuracy=function(o){const defensive=trainingFocus()==='defensive'?3:trainingFocus()==='balanced'?1:0,attack=((o.attackLevel||o.level||1)+8)*64,defense=(lv('Defense')+8+defensive)*(equipmentBonus('armor')+64);return attackRollChance(attack,defense);};
playerMaxHit=function(style=combatStyle()){if(style==='magic')return Math.floor(currentSpell().power*(1+magicBonus()/100))+spiritBonus('magic');const focus=trainingFocus(style),effective=lv(style==='ranged'?'Ranged':'Strength')+8+(style==='melee'?(focus==='aggressive'?3:focus==='balanced'?1:0):focus==='focused'?3:0),bonus=style==='ranged'?(ITEMS[selectedAmmo()]?.rangedStrength||0):equipmentBonus('strengthBonus');return Math.max(style==='ranged'?2:1,Math.floor(.5+effective*(bonus+64)/640))+spiritBonus(style);};
armorValue=function(){return equipmentBonus('armor')+Math.floor(lv('Worship')/5)+spiritBonus('armor');};
function actionDuration(o){if(fighter(o))return .6*(combatStyle()==='magic'?5:equippedWeapon().attackTicks||4);return o.type==='tree'?2.4:o.type==='ore'?1.8:o.type==='fish'?3:2.4;}
Object.assign(COMBAT_SKILL_DETAILS,{Defense:'Reduces an enemy’s chance to hit. Train with Defensive attacks.',Woodcutting:'Logs at 1; oak 15; willow 30; maple 45; yew 60; magic 75.',Mining:'Copper/tin 1; iron 15; coal 30; gold 40; mithril 55; adamantite 70; runite 85.',Fishing:'Shrimp 1; trout 20; salmon 30; lobster 40; swordfish 50; shark 76.',Firemaking:'Burn logs for XP. Better logs require higher levels. Fires leave ashes after 2½ minutes.',Cooking:'Cook raw catches at a fire. Higher levels unlock food and reduce burning.',Smithing:'Smelt ores at a furnace; work bars at an anvil. Recipes show levels and materials.',Fletching:'Logs → shafts; shafts + feathers → headless arrows; add arrowheads.',Farming:'Plant potato seeds in a patch. Crops grow while you are away.'});

function setupSkillWorld(world){
 let id=3800000;const assigned=new Set();
 const setResource=(o,key)=>{const d=o.type==='tree'?TREE_RESOURCES[key]:o.type==='ore'?ORE_RESOURCES[key]:FISH_RESOURCES[key];if(o.type==='tree'&&!o.treeArt)o.treeArt=/pine/i.test(o.name||'')?'pine':'broadleaf';o.resourceId=key;o.name=o.type==='fish'?d.name+' fishing spot':d.name;assigned.add(o);return o;};
 const tree=tutorialObject('tree');if(tree)setResource(tree,'normal');const ore=tutorialObject('ore');if(ore)setResource(ore,'copper');const fish=tutorialObject('fish');if(fish)setResource(fish,'shrimp');
 const place=(type,key,x,y,extra={})=>{const o={id:id++,type,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:type==='tree'?4:type==='ore'?6:9,dead:0,hitAt:-100,attackAt:-100,...extra};setResource(o,key);world.objects.push(o);return o;};
 place('ore','tin',75,46,{tutorialRole:'tin'});place('ore','iron',76,43);place('ore','coal',75,49);
 for(const [key,x,y]of [['normal',24,51],['normal',26,53],['oak',21,52],['oak',22,55],['willow',30,58]])place('tree',key,x,y);
 let oi=0,fi=0;
 for(const scene of Object.values(worldScenes))for(const o of scene.objects){
  if(assigned.has(o))continue;
  if(o.type==='tree'){const near=Math.hypot(o.x-43,o.y-52)<90,elf=o.race==='elf',grove=Math.abs(Math.imul(Math.floor(o.x/20),31)+Math.imul(Math.floor(o.y/20),17));setResource(o,near?(grove%3?'normal':'oak'):elf?['maple','yew','magic'][grove%3]:['normal','oak','willow','maple','yew'][grove%5]);}
  if(o.type==='ore')setResource(o,['copper','tin','iron','coal','gold','mithril','adamant','rune'][oi++%8]);
  if(o.type==='fish')setResource(o,['shrimp','trout','salmon','lobster','swordfish','shark'][fi++%6]);
  if(o.type==='prop'&&o.name==='Forge furnace')o.workstation='furnace';
  if(o.type==='crop'){o.name='Farming patch';o.harvestedUntil=0;}
 }
 const practice=tutorialObject('practice-forge');if(practice){practice.name='Practice anvil';practice.workstation='anvil';}
 const furnace=world.objects.find(o=>o.name==='Forge furnace');if(furnace){furnace.workstation='furnace';furnace.tutorialRole='furnace';}
 // Every smithy has a furnace as well as its existing anvil.
 for(const b of world.buildings.filter(b=>b.walkIn&&b.archetype==='forge'&&b.service.destination!=='forge')){
  const x=b.x+b.w-2,y=b.y+2;if(world.objects.some(o=>o.x===x&&o.y===y))continue;
  world.objects.push({id:id++,type:'prop',name:'Forge furnace',workstation:'furnace',x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:8,dead:0,interiorBuilding:b.service.destination});
 }
 for(const o of world.objects.filter(o=>o.tutorialRole==='dummy'||o.tutorialRole==='magic-dummy')){o.hp=o.maxhp=5;o.atk=0;o.spread=0;}
 const rat=tutorialObject('rat');if(rat){rat.hp=rat.maxhp=5;rat.atk=1;rat.spread=0;rat._stationary=true;}
}
function tendCrop(o){
 s.farmPlots=s.farmPlots||{};const key=currentScene+':'+o.id,plot=s.farmPlots[key];
 if(!plot){if(!useBeltTool('seedDibber'))return false;if((s.bag.potatoSeeds||0)<3){toast('Planting this patch needs 3 potato seeds. Mara sells them.');return false;}s.bag.potatoSeeds-=3;s.farmPlots[key]={plantedAt:Date.now(),readyAt:Date.now()+40*60*1000,harvests:3+Math.floor(Math.random()*5)};gain('Farming',8);save();renderUI();toast('Potatoes planted. They grow in 40 minutes, including while you are away.');return true;}
 if(Date.now()<plot.readyAt){toast('Growing potatoes · about '+Math.ceil((plot.readyAt-Date.now())/60000)+' minutes remaining.');return false;}
 if(!addToBag('potato'))return false;gain('Farming',9);if(--plot.harvests<=0)delete s.farmPlots[key];renderUI();save();return true;
}
function skillItemActions(id){const item=ITEMS[id];if(id==='flour'||id==='jugWater')return [['Mix dough',mixBreadDough]];if(id==='breadDough')return [['Bake bread',()=>requestCookFish(id)]];if(item.heal)return [['Eat',()=>eatFood(id)]];if(item.logType)return [['Light fire',()=>lightLog(id)],['Cut arrow shafts',()=>fletch(id)]];if(item.rawFish)return [['Cook',()=>requestCookFish(id)]];if(item.beltTool)return [['Add to tool belt',()=>fitBeltTool(id)]];if(id==='arrowShafts'||id==='arrowheads'||id.endsWith('Arrowheads'))return [['Fletch',()=>fletch(id)]];if(item.metal)return [['Smith arrowheads',()=>smithMetal(item.metal,'arrowheads')],['Recipes',()=>{openSmithing('forge',item.metal);return true;}]];if(item.resource)return [['Smelt',()=>smeltMetal(item.resource==='copper'||item.resource==='tin'?'bronze':item.resource==='coal'?'steel':item.resource)]];return null;}
