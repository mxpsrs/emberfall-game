'use strict';
const EQUIPMENT_EMPTY_ICONS={head:'helm',neck:'necklace',weapon:'melee',body:'gear',shield:'shield',hands:'glove',legs:'legs',feet:'boot'};
let equipmentPreviewAngle=-.4;
function appendEquipmentSlots(grid,interactive=true){
 for(const [slot,title]of EQUIPMENT_SLOTS){const id=s.equipment[slot],button=document.createElement('button');button.type='button';button.className='gearslot';button.dataset.equipmentSlot=slot;button.title=title+(id?': '+ITEMS[id].name:': empty');button.setAttribute('aria-label',button.title);
  if(id)button.appendChild(itemCanvas(id));else button.innerHTML=gameIcon(EQUIPMENT_EMPTY_ICONS[slot]);
  if(interactive){if(id)bindItemPress(button,id,false);else button.onclick=()=>{openGamePanel('bag');toast('Choose '+title.toLowerCase()+' from your bag.');};}else button.disabled=true;
  grid.appendChild(button);
 }
}
renderEquipment=function(){
 pageControls(1,1);if(toolBeltOpen)return renderToolBelt();const panel=$('panel');panel.innerHTML='<div class="questhead"><small>Combat level '+combatLevel()+'</small><small>Armour '+armorValue()+'</small></div><div id="equipmentGrid" class="equipmentgrid equipment-slots paper-equipment"></div><div class="equipment-actions"><button id="equipmentStats" type="button"></button><button id="equipmentTools" type="button"></button><button id="equipmentFollowers" type="button"></button></div>';
 appendEquipmentSlots($('equipmentGrid'));setHudButton('equipmentStats','View combat stats','stats');setHudButton('equipmentTools','Tool belt','tools');setHudButton('equipmentFollowers','Elemental Spirits','followers');
 $('equipmentStats').classList.toggle('tutorialfocus',tutorialStep()?.event==='combat-stats');
 $('equipmentStats').onclick=openCombatStats;$('equipmentTools').onclick=()=>{toolBeltOpen=true;renderEquipment();panel.scrollTop=0;};$('equipmentFollowers').onclick=openSpirits;paintItemIcons(panel);
};
function combatStatGroups(){return [
 ['Combat levels',COMBAT_SKILLS.map(skill=>[skill,lv(skill)])],
 ['Attack bonuses',[['Melee',equippedWeapon().style==='melee'?equippedWeapon().attackBonus||0:0],['Ranged',(combatStyle()==='ranged'?equippedWeapon().attackBonus||0:0)+equipmentBonus('rangedAccuracy')],['Magic',equipmentBonus('magicAccuracy')]]],
 ['Defence & damage',[['Armour',armorValue()],['Melee strength',equipmentBonus('strengthBonus')],['Magic damage',magicBonus()+'%'],['Maximum hit',playerMaxHit()]]],
 ['Weapon',[['Style',combatStyle()],['Attack range',combatStyle()==='melee'?'Adjacent':attackRange()+' tiles'],['Attack speed',actionDuration({type:'dummy'}).toFixed(1)+' seconds']]]
 ];}
function paintEquipmentPreview(){
 const c=$('equipmentPreview');if(!c||typeof creatorPainter!=='function')return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);const scale=190,cy=Math.cos(equipmentPreviewAngle),sy=Math.sin(equipmentPreviewAngle),old=meshDetail3;meshDetail3=1;
 try{const r=creatorPainter(g,(x,y,z)=>({x:c.width/2+(x*cy-z*sy)*scale,y:c.height-26-y*scale+(x*sy+z*cy)*scale*.09,depth:x*sy+z*cy+y*.09}),c.width,c.height);humanoid3(r,0,0,s.character?.look||0,s.equipment);r.flush();}finally{meshDetail3=old;}
}
function openCombatStats(){
 tutorialEvent('combat-stats');dialog('Equipment & combat stats','<div class="combat-stats-layout"><div><div id="statsEquipment" class="equipmentgrid equipment-slots paper-equipment"></div><p class="equipment-level">Combat level <b>'+combatLevel()+'</b></p></div><div class="equipment-character"><canvas id="equipmentPreview" width="330" height="410" tabindex="0" aria-label="Your equipped character. Swipe or use left and right arrows to turn."></canvas><small>Swipe to turn</small></div><div id="combatStatGroups" class="combat-stat-groups"></div></div>');$('modal').classList.add('combat-stats-window');
 appendEquipmentSlots($('statsEquipment'),false);paintItemIcons($('modalBody'));
 for(const [title,stats]of combatStatGroups()){const section=document.createElement('section'),h=document.createElement('h3'),list=document.createElement('dl');h.textContent=title;section.append(h,list);for(const [label,value]of stats){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);}$('combatStatGroups').appendChild(section);}
 const c=$('equipmentPreview');let drag=null,queued=false;const paint=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if($('modal').open)paintEquipmentPreview();});};
 c.addEventListener('pointerdown',e=>{if(drag||e.button!==0)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,angle:equipmentPreviewAngle};c.setPointerCapture(e.pointerId);});c.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;equipmentPreviewAngle=drag.angle+(e.clientX-drag.x)*.014;paint();});for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});
 c.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();equipmentPreviewAngle+=(e.key==='ArrowLeft'?-1:1)*.18;paint();}});paintEquipmentPreview();
}
const SKILL_PANEL_ICONS={Attack:'melee',Strength:'glove',Defense:'shield',Hitpoints:'heart',Ranged:'ranged',Magic:'magic',Worship:'shrine',Woodcutting:'tools',Mining:'mine',Fishing:'fish',Smithing:'forge',Firemaking:'spirit',Cooking:'eat',Fletching:'ranged',Farming:'leaf'};
function renderSkillInterface(){
 pageControls(1,1);const panel=$('panel');panel.innerHTML='<div class="questhead"><small>Total level '+Object.keys(s.xp).filter(k=>k!=='Combat').reduce((n,k)=>n+lv(k),0)+'</small><small>Combat '+combatLevel()+'</small></div><div id="skillTiles" class="skill-tiles"></div>';
 for(const [skill,xp]of Object.entries(s.xp).filter(([k])=>k!=='Combat')){const level=lv(skill),b=document.createElement('button');b.type='button';b.innerHTML=gameIcon(SKILL_PANEL_ICONS[skill]||'skills')+'<span>'+skill+'</span><b>'+level+'<small>/99</small></b>';b.title=skill+' · Level '+level;b.setAttribute('aria-label',skill+', level '+level+', '+Math.floor(xp)+' XP');b.onclick=()=>dialog(skill,'<p>Level <b>'+level+'</b> / 99</p><p>'+Math.floor(xp).toLocaleString()+' XP · '+(level===99?'Maximum level':Math.max(0,skillThreshold(skill,level+1)-xp).toLocaleString()+' XP to level '+(level+1))+'</p>'+(COMBAT_SKILL_DETAILS[skill]?'<p>'+COMBAT_SKILL_DETAILS[skill]+'</p>':''));$('skillTiles').appendChild(b);}
}
$('modal').addEventListener('close',()=>{$('modal').classList.remove('combat-stats-window');});
