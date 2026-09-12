'use strict';
// Selection is temporary; only a chosen, reachable target can consume materials.
let selectedUseItem=null,selectedUseIndex=null,pendingItemUse=null;
window.realmWorkbench=null;
function clearUseItem(refresh=true){selectedUseItem=null;selectedUseIndex=null;if(refresh){if(tab==='bag')renderInventory();renderAction();}}
function selectUseItem(id,index=null){
 if(!ITEMS[id]||spareItemCount(id)<1)return false;
 stop();if(window.realmTrade||window.realmWorkbench||window.equipmentStatsOpen)close();
 openGamePanel('bag');selectedUseItem=id;selectedUseIndex=Number.isInteger(index)?index:inventorySlots().findIndex(slot=>slot.id===id);
 renderInventory();renderAction();return true;
}
function useItemOnItem(other){
 const id=selectedUseItem;if(!id)return false;
 if(id===other){clearUseItem();return false;}
 if(spareItemCount(id)<1||spareItemCount(other)<1){clearUseItem();toast('That item is no longer in your bag.');return false;}
 const pair=(a,b)=>id===a&&other===b||id===b&&other===a;
 const heads=[id,other].find(k=>k==='arrowheads'||k.endsWith('Arrowheads'));
 clearUseItem(false);
 let result=false;
 if(pair('flour','jugWater'))result=mixBreadDough();
 else if(pair('arrowShafts','feathers'))result=fletch('arrowShafts');
 else if(heads&&[id,other].includes('headlessArrows'))result=fletch(heads);
 else if(pair('copperOre','tinOre'))toast('Use either ore on a furnace to smelt a bronze bar.');
 else toast('You cannot use '+ITEMS[id].name+' on '+ITEMS[other].name+'.');
 renderUI();return result;
}
function itemStationKind(o){return o.workstation==='furnace'?'furnace':['forge','practiceForge'].includes(o.type)||o.workstation==='anvil'?'forge':['camp','range'].includes(o.type)?'cooking':null;}
function metalForOre(id){return Object.keys(METAL_RECIPES).find(key=>key!=='steel'&&Object.hasOwn(METAL_RECIPES[key].ingredients,id))||'steel';}
function itemFitsStation(id,o){const kind=itemStationKind(o),item=ITEMS[id];return kind==='cooking'?!!item?.rawFish||id==='breadDough'&&o.type==='range':kind==='furnace'?!!item?.resource:kind==='forge'?!!item?.metal:o.type==='crop'&&id==='potatoSeeds';}
function requestItemOnObject(o,id=selectedUseItem){
 if(!id||!ITEMS[id]||spareItemCount(id)<1){clearUseItem();return false;}
 if(!objects.includes(o)||o.collected||o.dead>time){clearUseItem();toast('That target is no longer available.');return false;}
 if(!itemFitsStation(id,o)){clearUseItem();toast(id==='breadDough'&&o.type==='camp'?'Bread dough needs a cooking range.':'You cannot use '+ITEMS[id].name+' on '+o.name+'.');return false;}
 if(window.realmWorkbench)close();
 const p=route(o.x,o.y,true,1.45);if(p===null){toast('Open any doors and find a clear path to '+o.name+'.');return false;}
 stop();clearUseItem(false);pendingItemUse={id,object:o,scene:currentScene};target=o;path=p;renderUI();renderAction();
 if(!p.length&&Math.hypot(px-s.x,py-s.y)<.02)arrive();return true;
}
function completeItemUse(){
 const use=pendingItemUse;if(!use)return false;
 const {id,object:o,scene}=use;
 const valid=scene===currentScene&&objects.includes(o)&&!o.collected&&o.dead<=time&&spareItemCount(id)>0&&Math.hypot(px-o.x,py-o.y)<=1.5&&lineOfSight(s.x,s.y,o.x,o.y);
 stop();if(!valid){toast('That item or target is no longer available.');renderUI();return true;}
 const kind=itemStationKind(o);
 if(kind==='cooking'){if(id==='breadDough')bakeBread();else cookFish(id);}
 else if(kind==='furnace')openWorkbench('furnace',metalForOre(id),o);
 else if(kind==='forge')openWorkbench('forge',ITEMS[id].metal,o);
 else if(o.type==='crop')tendCrop(o);
 return true;
}
const stopBeforeItemUse=stop;
stop=function(){const selected=!!selectedUseItem;pendingItemUse=null;clearUseItem(false);stopBeforeItemUse();if(selected&&tab==='bag')renderInventory();};
const arriveBeforeItemUse=arrive;
arrive=function(){if(pendingItemUse){completeItemUse();return;}return arriveBeforeItemUse();};
const selectBeforeItemUse=select;
select=function(o){if(selectedUseItem)return requestItemOnObject(o);return selectBeforeItemUse(o);};
const actionBeforeItemUse=renderAction;
renderAction=function(){
 actionBeforeItemUse();const id=selectedUseItem||pendingItemUse?.id;if(!id)return;
 $('targetTitle').textContent='Use '+ITEMS[id].name;
 $('targetSub').textContent=pendingItemUse?'Walking to '+pendingItemUse.object.name:'Choose an item or a target in the world. Tap Cancel to clear.';
};
const inventoryBeforeItemUse=renderInventory;
renderInventory=function(){
 if(selectedUseItem&&spareItemCount(selectedUseItem)<1)clearUseItem(false);
 inventoryBeforeItemUse();const slots=inventorySlots();
 if(selectedUseItem&&slots[selectedUseIndex]?.id!==selectedUseItem)selectedUseIndex=slots.findIndex(o=>o.id===selectedUseItem);
 $('inventoryGrid').querySelectorAll('button').forEach((b,i)=>{b.dataset.inventoryIndex=String(i);if(slots[i])b.dataset.itemId=slots[i].id;const selected=!!selectedUseItem&&i===selectedUseIndex;b.classList.toggle('item-selected',selected);b.setAttribute('aria-pressed',String(selected));});
 if(selectedUseItem){const hint=document.createElement('div');hint.className='item-use-hint';hint.setAttribute('role','status');const label=document.createElement('span'),cancel=document.createElement('button');label.textContent='Use '+ITEMS[selectedUseItem].name+' →';cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>{clearUseItem();renderAction();};hint.append(label,cancel);$('panel').appendChild(hint);}
};
function showItemOptions(id,fromBag,anchor){
 closeWorldOptions();const item=ITEMS[id];if(!item)return;
 const menu=document.createElement('div');menu.id='worldOptions';menu.setAttribute('role','menu');menu.setAttribute('aria-label',item.name+' options');
 const title=document.createElement('strong');title.textContent=item.name;menu.appendChild(title);
 const actions=[];
 if(fromBag&&selectedUseItem&&selectedUseItem!==id)actions.push(['Use '+ITEMS[selectedUseItem].name+' → '+item.name,()=>useItemOnItem(id)]);
 if(fromBag)actions.push(['Use '+item.name,()=>selectUseItem(id,Number(anchor.dataset.inventoryIndex))]);
 for(const [label,action]of itemActions(id,fromBag))if(label!=='Examine')actions.push([label,()=>{clearUseItem(false);action();}]);
 actions.push(['Examine',()=>toast(item.name+': '+item.desc)],['Cancel',()=>{}]);
 for(const [label,action]of actions){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=label;b.onclick=()=>{closeWorldOptions();action();};menu.appendChild(b);}
 document.body.appendChild(menu);const rect=anchor.getBoundingClientRect(),box=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-box.width-8))+'px';menu.style.top=Math.max(8,Math.min(rect.top,window.innerHeight-box.height-8))+'px';menu.querySelector('button')?.focus();
}
const optionsBeforeItemUse=worldOptionsFor;
worldOptionsFor=function(o){
 const actions=optionsBeforeItemUse(o).map(([label,action])=>[label,()=>{clearUseItem(false);action();}]);if(o.collected||o.dead>time)return actions;
 if(selectedUseItem){const id=selectedUseItem;actions.unshift(['Use '+ITEMS[id].name+' → '+o.name,()=>requestItemOnObject(o,id)]);}
 if(o.type==='banker'||o.tutor==='bank'||o.type==='prop'&&/bank (chest|counter)/i.test(o.name))actions.unshift(['Bank '+o.name,()=>engage(o)]);
 return actions;
};
const worldInteractionBeforeItemUse=handleWorldInteraction;
handleWorldInteraction=function(o){
 if(o.type==='banker'||o.tutor==='bank'&&tutorialStep()?.event!=='talk-bank'||o.type==='prop'&&/bank (chest|counter)/i.test(o.name)){stop();openBank();return true;}
 return worldInteractionBeforeItemUse(o);
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selectedUseItem){e.preventDefault();clearUseItem();renderAction();}});

// Workshops use the bank's modeless frame and keep the existing bag beside it.
function endWorkbench(){
 window.realmWorkbench=null;document.body.classList.remove('workbench-open');$('modal').classList.remove('trade-window','workbench-window');$('modal').removeAttribute('aria-label');$('closeModal').textContent='Back to adventure';$('closeModal').setAttribute('aria-label','Back to adventure');
}
function openWorkbench(kind='forge',metal='bronze',station=null){
 station=station||nearbyWork(kind==='cooking'?'fire':kind);
 if(!station||!objects.includes(station)||Math.hypot(station.x-px,station.y-py)>=2||!lineOfSight(s.x,s.y,station.x,station.y)){toast('Use your materials on a '+(kind==='cooking'?'fire or cooking range':kind==='furnace'?'furnace':'smithing anvil')+'.');return false;}
 if(window.realmTrade)endTrade();if(window.equipmentStatsOpen)endCombatStats();if(window.realmWorkbench)endWorkbench();if($('modal').open)$('modal').close();
 stop();openGamePanel('bag');window.realmWorkbench={kind,metal:METAL_RECIPES[metal]?metal:'bronze',station,scene:currentScene};
 document.body.classList.add('workbench-open');$('modal').classList.add('trade-window','workbench-window');$('modal').setAttribute('aria-label',kind==='cooking'?'Cooking':kind==='furnace'?'Smelting furnace':'Smithing anvil');
 $('closeModal').textContent='×';$('closeModal').setAttribute('aria-label','Close workshop');
 $('modalBody').innerHTML='<div class="trade-heading"><div><h2 id="workbenchTitle"></h2><p id="workbenchSummary"></p></div></div><div id="metalChoices" class="workbench-metals" role="group" aria-label="Metal"></div><div id="workbenchRecipes" class="workbench-recipes" aria-label="Recipes"></div><p class="workbench-help">Select a recipe to make one. Your ingredients stay visible in your bag.</p>';
 $('modal').show();renderWorkbench();return true;
}
function workbenchRecipes(){
 const t=window.realmWorkbench;if(!t)return [];
 if(t.kind==='cooking')return Object.keys(s.bag).filter(id=>s.bag[id]>0&&(ITEMS[id]?.rawFish||id==='breadDough'&&t.station.type==='range')).map(id=>{const f=FISH_RESOURCES[ITEMS[id].rawFish];return {id:f?.food||'bread',name:f?.name||'Bread',ingredients:{[id]:1},level:f?.cookLevel||1,skill:'Cooking',make:()=>id==='breadDough'?bakeBread():cookFish(id)};});
 const m=METAL_RECIPES[t.metal];
 if(t.kind==='furnace')return [{id:m.bar,name:m.name+' bar',ingredients:m.ingredients,level:m.level,skill:'Smithing',make:()=>smeltMetal(t.metal)}];
 return Object.entries(smithPatterns).map(([part,p])=>({id:part==='arrowheads'?(t.metal==='iron'?'arrowheads':t.metal+'Arrowheads'):t.metal+'_'+part,name:p.name,ingredients:{[m.bar]:p.bars},level:smithingLevel(t.metal,part),skill:'Smithing',make:()=>smithMetal(t.metal,part)}));
}
function renderWorkbench(){
 const t=window.realmWorkbench;if(!t||!$('modal').open)return;
 const valid=t.scene===currentScene&&objects.includes(t.station)&&t.station.dead<=time&&!t.station.collected&&Math.hypot(px-t.station.x,py-t.station.y)<2;
 if(!valid){endWorkbench();$('modal').close();return;}
 const cooking=t.kind==='cooking',metal=METAL_RECIPES[t.metal];$('workbenchTitle').textContent=cooking?t.station.name:t.kind==='furnace'?'Smelting furnace':'Smithing anvil';$('workbenchSummary').textContent=cooking?'Cooking '+lv('Cooking'):'Smithing '+lv('Smithing')+' · '+(s.bag[metal.bar]||0)+' '+metal.name.toLowerCase()+' bars in your bag';
 const choices=$('metalChoices');choices.replaceChildren();choices.hidden=cooking;
 if(!cooking)for(const [key,m]of Object.entries(METAL_RECIPES)){if(t.kind==='forge'&&key==='gold')continue;const b=document.createElement('button');b.type='button';b.textContent=m.name;b.setAttribute('aria-pressed',String(t.metal===key));b.onclick=()=>{t.metal=key;renderWorkbench();};choices.appendChild(b);}
 const grid=$('workbenchRecipes'),scroll=grid.scrollTop;grid.replaceChildren();const recipes=workbenchRecipes();
 for(const r of recipes){const b=document.createElement('button');b.type='button';b.className='workbench-recipe';const enough=hasIngredients(r.ingredients),unlocked=lv(r.skill)>=r.level;b.disabled=!enough||!unlocked;b.appendChild(itemCanvas(r.id));const copy=document.createElement('span'),name=document.createElement('strong'),requirement=document.createElement('small'),materials=document.createElement('small');name.textContent=r.name;requirement.textContent=r.skill+' '+r.level+(unlocked?'':' · Locked');materials.textContent=Object.entries(r.ingredients).map(([id,n])=>ITEMS[id].name+' '+(s.bag[id]||0)+' / '+n).join(' + ');copy.append(name,requirement,materials);b.appendChild(copy);b.onclick=()=>{clearUseItem(false);r.make();renderUI();};grid.appendChild(b);}
 if(!recipes.length){const p=document.createElement('p');p.className='workbench-empty';p.textContent='Bring raw fish'+(t.station.type==='range'?' or bread dough':'')+' to cook here.';grid.appendChild(p);}
 grid.scrollTop=scroll;paintItemIcons(grid);
}
$('modal').addEventListener('close',()=>{if(!$('modal').open&&window.realmWorkbench)endWorkbench();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.realmWorkbench){e.preventDefault();close();}});
