'use strict';
const EQUIPMENT_EMPTY_ICONS={head:'helm',neck:'necklace',ammo:'ammo',weapon:'attack',body:'gear',shield:'shield',hands:'glove',legs:'legs',feet:'boot',ring:'ring',cape:'cape',belt:'belt'};
let equipmentPreviewAngle=-.4,equipmentToolView=false;
window.equipmentStatsOpen=false;window.equipmentOpen=false;
function appendEquipmentSlots(grid,interactive=true){
 for(const [slot,title]of EQUIPMENT_SLOTS){const id=s.equipment[slot],button=document.createElement('button');button.type='button';button.className='gearslot';button.dataset.equipmentSlot=slot;button.title=title+(id?': '+ITEMS[id].name:': empty');button.setAttribute('aria-label',button.title);
  if(id)button.appendChild(itemCanvas(id));else button.innerHTML=gameIcon(EQUIPMENT_EMPTY_ICONS[slot]);
  if(slot==='ammo'&&id){const count=document.createElement('b');count.className='equipment-quantity';count.textContent=ammunitionLabel(s.equippedAmmoCount);button.appendChild(count);button.title+=' ×'+s.equippedAmmoCount.toLocaleString();button.setAttribute('aria-label',button.title);}
  if(interactive){if(id)bindItemPress(button,id,false);else button.onclick=()=>{openGamePanel('bag');toast('Choose '+title.toLowerCase()+' from your bag.');};}else button.disabled=true;
  if(slot==='ammo'&&id)button.setAttribute('aria-label',button.title+'. Unequip. Hold for options.');
  grid.appendChild(button);
 }
}
renderEquipment=function(){
 pageControls(1,1);if(toolBeltOpen)return renderToolBelt();const panel=$('panel');panel.innerHTML='<div class="questhead"><small>Combat level '+combatLevel()+'</small><small>Armour '+armorValue()+'</small></div><div id="equipmentGrid" class="equipmentgrid equipment-slots paper-equipment"></div><div class="equipment-actions"><button id="equipmentStats" type="button"></button><button id="equipmentTools" type="button"></button></div>';
 appendEquipmentSlots($('equipmentGrid'));setHudButton('equipmentStats','View combat stats','stats');setHudButton('equipmentTools','Tool belt','tools');
 $('equipmentStats').classList.toggle('tutorialfocus',tutorialStep()?.event==='combat-stats');
 $('equipmentStats').onclick=openCombatStats;$('equipmentTools').onclick=()=>{toolBeltOpen=true;renderEquipment();panel.scrollTop=0;};paintItemIcons(panel);
};
function combatStatGroups(){return [
 ['Combat levels',COMBAT_SKILLS.map(skill=>[skill,lv(skill)])],
 ['Attack bonuses',[['Melee',equippedWeapon().style==='melee'?equippedWeapon().attackBonus||0:0],['Ranged',(combatStyle()==='ranged'?equippedWeapon().attackBonus||0:0)+equipmentBonus('rangedAccuracy')],['Magic',equipmentBonus('magicAccuracy')]]],
 ['Defence & damage',[['Armour',armorValue()],['Melee strength',equipmentBonus('strengthBonus')],['Magic damage',magicBonus()+'%'],['Maximum hit',playerMaxHit()]]],
 ['Weapon',[['Style',combatStyle()],['Attack range',combatStyle()==='melee'?'Adjacent':attackRange()+' tiles'],['Attack speed',actionDuration({type:'dummy'}).toFixed(1)+' seconds'],['Arrows equipped',(s.equippedAmmoCount||0).toLocaleString()]]]
 ];}
function paintEquipmentPreview(){
 const c=$('equipmentPreview');if(!c||typeof creatorPainter!=='function')return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);const scale=190,cy=Math.cos(equipmentPreviewAngle),sy=Math.sin(equipmentPreviewAngle),old=meshDetail3;meshDetail3=1;
 try{const r=creatorPainter(g,(x,y,z)=>({x:c.width/2+(x*cy-z*sy)*scale,y:c.height-26-y*scale+(x*sy+z*cy)*scale*.09,depth:x*sy+z*cy+y*.09}),c.width,c.height);humanoid3(r,0,0,s.character?.look||0,{...s.equipment,_appearance:s.character,_ammoCount:s.equippedAmmoCount});r.flush();}finally{meshDetail3=old;}
}
function endCombatStats(){
 if(!window.equipmentStatsOpen&&!window.equipmentOpen)return;window.equipmentStatsOpen=false;window.equipmentOpen=false;equipmentToolView=false;syncTabs();
 document.body.classList.remove('equipment-stats-open','equipment-open');$('modal').classList.remove('combat-stats-window','equipment-window');$('modal').removeAttribute('aria-label');
 $('closeModal').textContent='Back to adventure';$('closeModal').setAttribute('aria-label','Back to adventure');
}
function renderCombatStats(){
 if(window.equipmentOpen)return renderWornEquipment();
 if(!window.equipmentStatsOpen||!$('modal').open)return;
 const grid=$('statsEquipment'),groups=$('combatStatGroups'),scroll=groups.scrollTop;
 const focusedSlot=document.activeElement?.closest?.('[data-equipment-slot]')?.dataset.equipmentSlot;
 grid.replaceChildren();appendEquipmentSlots(grid);paintItemIcons(grid);$('equipmentCombatLevel').textContent=combatLevel();groups.replaceChildren();
 if(equipmentToolView){
  const owned=normalizeToolBelt(s),back=document.createElement('button');back.textContent='Back to combat stats';back.onclick=()=>{equipmentToolView=false;renderCombatStats();};groups.appendChild(back);
  for(const [id,tool]of Object.entries(TOOL_BELT_TOOLS)){const row=document.createElement('section'),name=document.createElement('h3'),detail=document.createElement('p');name.textContent=ITEMS[owned[id+'Item']]?.name||tool.name;detail.textContent=tool.skill+' · '+(owned[id]?'On belt':'Not on belt');row.append(name,detail);groups.appendChild(row);}
 }else for(const [title,stats]of combatStatGroups()){const section=document.createElement('section'),h=document.createElement('h3'),list=document.createElement('dl');h.textContent=title;section.append(h,list);for(const [label,value]of stats){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);}$('combatStatGroups').appendChild(section);}
 groups.scrollTop=scroll;if(focusedSlot)grid.querySelector('[data-equipment-slot="'+focusedSlot+'"]').focus({preventScroll:true});paintEquipmentPreview();
}
function openEquipment(toggle=false){
 if(toggle&&(window.equipmentOpen||window.equipmentStatsOpen)){close();return;}
 if(window.equipmentOpen&&$('modal').open){openGamePanel('bag');return;}
 prepareEquipmentWindow();openGamePanel('bag');window.equipmentOpen=true;syncTabs();document.body.classList.add('equipment-open');
 const modal=$('modal');modal.classList.add('equipment-window');modal.setAttribute('aria-label','Worn equipment');
 $('closeModal').textContent='×';$('closeModal').setAttribute('aria-label','Close worn equipment');
 $('modalBody').innerHTML='<h2 id="wornEquipmentTitle">Worn equipment</h2><div id="wornEquipmentContents"></div><div id="wornEquipmentActions" class="equipment-actions"><button id="equipmentStats" type="button"></button><button id="equipmentTools" type="button"></button></div>';
 modal.show();renderWornEquipment();
 setHudButton('equipmentStats','View combat stats','stats');setHudButton('equipmentTools','Tool belt','tools');
 $('equipmentStats').onclick=openCombatStats;$('equipmentTools').onclick=()=>{equipmentToolView=true;renderWornEquipment();};
}
function prepareEquipmentWindow(){
 if(typeof npcDialogueState!=='undefined'&&npcDialogueState)endNpcDialogue();
 if(window.realmWorkbench)endWorkbench();if(window.realmTrade)endTrade();
 if(window.equipmentOpen||window.equipmentStatsOpen)endCombatStats();if($('modal').open)$('modal').close();stop();
}
function renderWornEquipment(){
 if(!window.equipmentOpen||!$('modal').open)return;
 const contents=$('wornEquipmentContents');contents.replaceChildren();$('wornEquipmentTitle').textContent=equipmentToolView?'Tool belt':'Worn equipment';$('wornEquipmentActions').hidden=equipmentToolView;
 if(equipmentToolView){
  const back=document.createElement('button');back.type='button';back.className='equipment-tools-back';back.textContent='Back to worn equipment';back.onclick=()=>{equipmentToolView=false;renderWornEquipment();};contents.appendChild(back);
  const owned=normalizeToolBelt(s),list=document.createElement('div');list.className='equipment-tool-list';
  for(const [id,tool]of Object.entries(TOOL_BELT_TOOLS)){const row=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=ITEMS[owned[id+'Item']]?.name||tool.name;detail.textContent=tool.skill+' · '+(owned[id]?'On belt':'Not on belt');row.append(name,detail);list.appendChild(row);}contents.appendChild(list);
 }else{
  const grid=document.createElement('div');grid.id='wornEquipmentGrid';grid.className='equipmentgrid equipment-slots paper-equipment';appendEquipmentSlots(grid);contents.appendChild(grid);paintItemIcons(grid);
  $('equipmentStats').classList.toggle('tutorialfocus',tutorialStep()?.event==='combat-stats');
 }
}
function openCombatStats(){
 if(typeof npcDialogueState!=='undefined'&&npcDialogueState)endNpcDialogue();
 if(window.realmWorkbench)endWorkbench();
 if(window.equipmentStatsOpen&&$('modal').open){tutorialEvent('combat-stats');openGamePanel('bag');return;}
 prepareEquipmentWindow();tutorialEvent('combat-stats');openGamePanel('bag');
 window.equipmentStatsOpen=true;syncTabs();document.body.classList.add('equipment-stats-open');
 const modal=$('modal');modal.classList.add('combat-stats-window');modal.setAttribute('aria-label','Equipment and combat stats');
 $('closeModal').textContent='×';$('closeModal').setAttribute('aria-label','Close equipment and combat stats');
 $('modalBody').innerHTML='<h2>Equipment & combat stats</h2><div class="combat-stats-layout"><div><div id="statsEquipment" class="equipmentgrid equipment-slots paper-equipment"></div><p class="equipment-level">Combat level <b id="equipmentCombatLevel"></b></p><div class="equipment-actions"><button id="pairedEquipmentTools" type="button"></button></div></div><div class="equipment-character"><canvas id="equipmentPreview" width="330" height="410" tabindex="0" aria-label="Your equipped character. Swipe or use left and right arrows to turn."></canvas><small>Swipe to turn</small></div><div id="combatStatGroups" class="combat-stat-groups" tabindex="0" aria-label="Combat levels and equipment bonuses"></div></div>';
 // Modeless, like the bank: the adjacent bag remains available for equipping.
 modal.show();renderCombatStats();
 setHudButton('pairedEquipmentTools','Tool belt','tools');
 $('pairedEquipmentTools').onclick=()=>{equipmentToolView=!equipmentToolView;renderCombatStats();};
 const c=$('equipmentPreview');let drag=null,queued=false;const paint=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(window.equipmentStatsOpen)paintEquipmentPreview();});};
 c.addEventListener('pointerdown',e=>{if(drag||e.button!==0)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,angle:equipmentPreviewAngle};c.setPointerCapture(e.pointerId);});c.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;equipmentPreviewAngle=drag.angle+(e.clientX-drag.x)*.014;paint();});for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});
 c.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();equipmentPreviewAngle+=(e.key==='ArrowLeft'?-1:1)*.18;paint();}});
}
const SKILL_PANEL_ICONS={Attack:'attack',Strength:'strength',Defense:'shield',Hitpoints:'heart',Ranged:'ranged',Magic:'magic',Worship:'shrine',Woodcutting:'woodcutting',Mining:'mine',Fishing:'fish',Smithing:'forge',Firemaking:'firemaking',Cooking:'cooking',Fletching:'fletching',Farming:'farming'};
function openIconGuide(){
 const groups=[['Game controls',CLASSIC_TABS.map(([,icon,label])=>[label,icon])],['Skills',Object.entries(SKILL_PANEL_ICONS)],['Map services',Object.values(MAP_SERVICE_TYPES).map(([icon,label])=>[label,icon])]];
 dialog('Icon guide','<p>Hover over an icon for its name. On a phone, hold a menu or skill icon to see its label. Hold an item for its usual action menu.</p>'+groups.map(([name,entries])=>'<h3>'+name+'</h3><div class="icon-guide">'+entries.map(([label,icon])=>'<div>'+gameIcon(icon)+'<span>'+label+'</span></div>').join('')+'</div>').join(''));
}
function renderSkillInterface(){
 pageControls(1,1);const panel=$('panel');panel.innerHTML='<div class="questhead"><small>Total level '+Object.keys(s.xp).filter(k=>k!=='Combat').reduce((n,k)=>n+lv(k),0)+'</small><small>Combat '+combatLevel()+'</small></div><div id="skillTiles" class="skill-tiles"></div>';
 for(const [skill,xp]of Object.entries(s.xp).filter(([k])=>k!=='Combat')){const level=lv(skill),b=document.createElement('button');b.type='button';b.innerHTML=gameIcon(SKILL_PANEL_ICONS[skill]||'skills')+'<span>'+skill+'</span><b>'+level+'<small>/ '+level+'</small></b>';b.title=skill+' · Level '+level;b.dataset.skill=skill;b.dataset.helpHold='true';b.dataset.tooltip=skill+' · Level '+level+' / 99\nCurrent XP: '+Math.floor(xp).toLocaleString()+'\n'+(level===99?'Maximum level':Math.ceil(Math.max(0,skillThreshold(skill,level+1)-xp)).toLocaleString()+' XP to level '+(level+1));b.setAttribute('aria-label',skill+', level '+level+', '+Math.floor(xp)+' XP');b.onclick=()=>dialog(skill,'<p>Level <b>'+level+'</b> / 99</p><p>'+Math.floor(xp).toLocaleString()+' XP · '+(level===99?'Maximum level':Math.max(0,skillThreshold(skill,level+1)-xp).toLocaleString()+' XP to level '+(level+1))+'</p>'+(COMBAT_SKILL_DETAILS[skill]?'<p>'+COMBAT_SKILL_DETAILS[skill]+'</p>':''));$('skillTiles').appendChild(b);}
}
$('modal').addEventListener('close',()=>{if(!$('modal').open)endCombatStats();});
document.addEventListener('keydown',e=>{if((window.equipmentStatsOpen||window.equipmentOpen)&&e.key==='Escape'){e.preventDefault();close();}});
