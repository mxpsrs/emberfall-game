'use strict';
const COMBAT_SKILLS=['Hitpoints','Attack','Strength','Defense','Worship','Magic','Ranged'];
const COMBAT_SKILL_DETAILS={Hitpoints:'Raises your maximum health. Trained by dealing damage.',Attack:'Improves melee accuracy. Train with Accurate attacks.',Strength:'Raises melee damage. Train with Aggressive attacks.',Defense:'Reduces enemy accuracy and damage. Choose Defensive training.',Worship:'Deal damage with spirit abilities, bury bones and form spirit bonds for XP. Strengthens spirit attacks and adds protection every 5 levels.',Magic:'Cast spells to improve magic accuracy and damage.',Ranged:'Use a bow to improve ranged accuracy and damage.'};
function combatLevel(){return 1+Math.floor((lv('Hitpoints')-1)*.15+(lv('Attack')-1)*.2+(lv('Strength')-1)*.2+(lv('Defense')-1)*.2+(lv('Worship')-1)*.05+(lv('Magic')-1)*.1+(lv('Ranged')-1)*.1+1e-9);}
function migrateCombatSkills(state,original=state){
 const old=original?.xp||{},legacy=Math.max(0,Number(old.Combat)||0);state.xp=state.xp||{};
 for(const skill of COMBAT_SKILLS){const retained=Number(old[skill]);state.xp[skill]=Number.isFinite(retained)&&retained>=0?retained:['Hitpoints','Attack','Strength','Defense'].includes(skill)?legacy:0;}
 if(legacy&&!original?.combatSkillsVersion)state.legacyCombatXP=legacy;
 delete state.xp.Combat;state.combatSkillsVersion=1;
 if(!['accurate','aggressive','defensive','balanced'].includes(state.meleeTraining))state.meleeTraining='balanced';
 if(!['focused','defensive'].includes(state.rangedTraining))state.rangedTraining='focused';
 if(!['focused','defensive'].includes(state.magicTraining))state.magicTraining='focused';
}
function trainingFocus(style=combatStyle()){return style==='melee'?s.meleeTraining||'balanced':s[style+'Training']||'focused';}
function awardCombatDamage(damage,style,focus=trainingFocus(style)){
 if(!Number.isFinite(damage)||damage<=0||!['melee','ranged','magic','worship'].includes(style))return;
 const rewards={Hitpoints:damage*4/3};
 if(style==='melee'){
  const skill={accurate:'Attack',aggressive:'Strength',defensive:'Defense'}[focus];
  if(skill)rewards[skill]=damage*4;else for(const skill of ['Attack','Strength','Defense'])rewards[skill]=damage*4/3;
 }else if(style==='ranged'){rewards.Ranged=damage*(focus==='defensive'?2:4);if(focus==='defensive')rewards.Defense=damage*2;}
 else if(style==='magic'){rewards.Magic=damage*(focus==='defensive'?4/3:2);if(focus==='defensive')rewards.Defense=damage;}
 else rewards.Worship=damage*4;
 for(const [skill,xp]of Object.entries(rewards))gain(skill,xp,true);
 showExperienceDrop(rewards);
}
let playerAction=null,playerAttackMotion=null;
function buryBones(){
 if((s.bag.bones||0)<1||playerAction)return false;stop();playerAction={kind:'bury',started:time,duration:1.8,commitAt:.95,committed:false};renderAction();return true;
}
function updatePlayerAction(){
 const action=playerAction;if(!action)return;if(action.kind!=='bury'){updateSkillingAction(action);return;}const age=time-action.started;$('activity').style.width=Math.min(100,age/action.duration*100)+'%';
 if(!action.committed&&age>=action.commitAt){
  action.committed=true;if((s.bag.bones||0)<1){playerAction=null;return;}
  s.bag.bones--;gain('Worship',18,true);showExperienceDrop({Worship:18});tutorialEvent('bury');toast('Bones buried · +18 Worship XP');renderUI();save();
 }
 if(age>=action.duration){playerAction=null;$('activity').style.width='0';renderAction();}
}
function combatMotion(style){
 const clip=style==='melee'?(s.equipment.weapon?'melee':'unarmed'):style==='worship'?'magic':style;
 const a=typeof rebuiltAvatars!=='undefined'?rebuiltAvatars[s.character?.frame||'male']:null;
 return {clip,duration:a?.clips[clip]?.duration||(style==='ranged'?1.6:style==='magic'?1.3:1.05),releaseAt:a?.clips[clip]?.releaseAt||(style==='ranged'?.94:style==='magic'?.66:.3)};
}
function playerAccuracy(o,style=combatStyle()){const level=lv(style==='melee'?'Attack':style==='magic'?'Magic':'Ranged');return Math.max(.35,Math.min(.97,.84+(level-(o.level||1))*.025));}
function enemyAccuracy(o){return Math.max(.2,Math.min(.94,.83+((o.level||1)-lv('Defense'))*.025));}
function playerMaxHit(style=combatStyle()){return spiritBonus(style)+(style==='magic'?currentSpell().power+magicBonus():3)+lv(style==='magic'?'Magic':style==='ranged'?'Ranged':'Strength')+equippedWeapon().power+2;}
const MONSTER_ART={goblin:0,slime:1,wolf:2,ridgewolf:2,skeleton:3,king:4,rat:5,bandit:6,warden:7,sentinel:7};
const EQUIPMENT_SLOTS=[['head','Head'],['neck','Neck'],['ammo','Ammunition'],['weapon','Weapon'],['body','Body'],['shield','Shield'],['hands','Hands'],['legs','Legs'],['feet','Feet']];
function normalizeEquipmentSlots(state){
 state.equipment=state.equipment||{};state.gear=state.gear||{};state.bank=state.bank||{};
 // Old standalone attachments remain owned. Bank the previously worn copy
 // so simplifying the layout cannot overflow a full inventory or lose gear.
 for(const slot of ['crest','shoulders']){const id=state.equipment[slot];if(id){state.gear[id]=Math.max(0,(state.gear[id]||1)-1);state.bank[id]=(state.bank[id]||0)+1;}delete state.equipment[slot];}
 state.equippedAmmoCount=Number.isSafeInteger(state.equippedAmmoCount)&&state.equippedAmmoCount>0?state.equippedAmmoCount:0;
 if(!isAmmunition(state.equipment.ammo)||!state.equippedAmmoCount){state.equipment.ammo=null;state.equippedAmmoCount=0;}
 state.equipmentLayoutVersion=3;
}
const TOOL_BELT_TOOLS={axe:{name:'Axe',skill:'Woodcutting',description:'Used automatically when you chop a tree.'},pickaxe:{name:'Pickaxe',skill:'Mining',description:'Used automatically when you mine an ore deposit.'},fishingRod:{name:'Fishing rod',skill:'Fishing',description:'Used automatically at fishing spots.'},tinderbox:{name:'Tinderbox',skill:'Firemaking',description:'Used automatically when you light logs.'},hammer:{name:'Smithing hammer',skill:'Smithing',description:'Used automatically at a forge.'}};
function normalizeToolBelt(state){state.toolBelt={axe:true,pickaxe:true,fishingRod:true,tinderbox:true,hammer:true,...state.toolBelt};if(state.equipment)delete state.equipment.beltAttachment;return state.toolBelt;}
function useBeltTool(id){if(!normalizeToolBelt(s)[id]){toast('Your tool belt needs a '+TOOL_BELT_TOOLS[id].name.toLowerCase()+'.');return false;}s.lastToolUsed=id;return true;}
let toolBeltOpen=false;
const ITEMS={
 coins:{name:'Coins',icon:0,desc:'Money carried in your inventory. Add to pouch to store it, or offer it in a player trade.'},
 bronzeSword:{name:'Bronze sword',icon:0,slot:'weapon',style:'melee',power:1,range:1.45,desc:'A dependable starter sword. Choose Accurate, Aggressive, Defensive, or Balanced training.'},
 ironSword:{name:'Iron sword',icon:1,slot:'weapon',style:'melee',power:5,range:1.45,desc:'Forged iron. Four more damage than a bronze sword.'},
 shortbow:{name:'Shortbow',icon:2,slot:'weapon',style:'ranged',power:2,range:5,desc:'Fires one arrow per shot. Trains Ranged and Hitpoints; Defensive training also earns Defense XP.'},
 oakStaff:{name:'Oak staff',icon:3,slot:'weapon',style:'magic',power:1,range:4,desc:'Channels your selected spell using rune stones. Trains Magic and Hitpoints; Defensive training also earns Defense XP.'},
 ironHelm:{name:'Iron helmet',icon:4,slot:'head',armor:2,desc:'Reduces incoming damage by 2.'},
 leatherArmor:{name:'Leather armor',icon:5,slot:'body',armor:1,desc:'Light armor. Reduces incoming damage by 1.'},
 ironShield:{name:'Iron shield',icon:6,slot:'shield',armor:2,desc:'Reduces incoming damage by 2 with a melee weapon. Inactive with bows and staves.'},
 leatherBoots:{name:'Leather boots',icon:7,slot:'feet',armor:1,desc:'Sturdy footwear. Reduces incoming damage by 1.'},
 logs:{name:'Oak logs',icon:8,desc:'Gather from oak trees. Used for smithing and arrows. Sell for 3 coins each.'},
 ore:{name:'Iron ore',icon:9,desc:'Mine from iron deposits. Used for swords and arrows. Sell for 4 coins each.'},
 fish:{name:'Trout',icon:10,desc:'Eat to restore up to 14 health.'},
 fang:{name:'Wolf fang',icon:11,desc:'A trophy from a briar wolf. Sell for 6 coins.'},
 arrows:{name:'Arrows',icon:12,desc:'One consumed per bow shot. Buy at Mara’s store or craft at the forge.'},
 runes:{name:'Rune stones',icon:13,desc:'Fuel for magic. Buy at Mara’s store or find on monsters.'},
 bones:{name:'Bones',icon:14,desc:'Tap to bury one for 18 Worship XP. Dropped by creatures throughout the realm. Can also be sold for 4 coins.'},
 ashes:{name:'Ashes',icon:9,desc:'Cool ashes left after a log fire burns out.'},
 mageRobe:{name:'Mage robe',icon:15,slot:'body',magic:2,desc:'Adds 2 magic damage. Offers no armor protection.'}
};
const MODULAR_ARMOR_SETS=[{id:'bronze',name:'Bronze',source:'B',level:1,cost:28,armor:1},{id:'iron',name:'Iron',source:'I',level:5,cost:55,armor:2},{id:'gold',name:'Gold',source:'G',level:10,cost:95,armor:2},{id:'mithril',name:'Mithril',source:'M',level:20,cost:180,armor:3},{id:'dragonslayer',name:'Dragonslayer',source:'DS',level:35,cost:360,armor:4}];
const MODULAR_ARMOR_PARTS=[['head','Headgear','headgear'],['shoulders','Shoulder','shoulder pads'],['body','Chestplate','chestplate'],['hands','Gauntlets','gauntlets'],['legs','Legguards','legguards'],['feet','Boots','boots']];
const modularShopStock=[];
ITEMS.copperNecklace={name:'Copper necklace',slot:'neck',icon:14,model:'Veldren_Necklace',desc:'A simple copper necklace with a green stone. Worn in the necklace slot.'};modularShopStock.push(['copperNecklace',1,18]);
ITEMS.rangerCap={name:'Ranger cap',slot:'head',icon:4,rangedAccuracy:1,armor:1,desc:'A feathered archer’s cap. A little protection and +1 ranged accuracy.'};modularShopStock.push(['rangerCap',1,20]);
for(const set of MODULAR_ARMOR_SETS){
 for(const [slot,source,label]of MODULAR_ARMOR_PARTS){const id=set.id+'_'+slot,armor=['body','legs'].includes(slot)?set.armor:['head','shoulders'].includes(slot)?Math.max(1,set.armor-1):0;ITEMS[id]={name:set.name+' '+label,slot,icon:4,armor,defenseLevel:set.level,armorSet:set.id,model:source+'.'+set.source+'.001',desc:'Fitted '+set.name.toLowerCase()+' '+label+'. Equip and mix with other armor pieces. Requires Defense '+set.level+'.'};modularShopStock.push([id,1,Math.round(set.cost*(['body','legs'].includes(slot)?1.7:slot==='hands'||slot==='feet'?.65:1))]);}
 const shield=set.id+'_shield';ITEMS[shield]={name:set.name+' shield',slot:'shield',style:'melee',icon:6,armor:set.armor,defenseLevel:set.level,armorSet:set.id,model:(set.source==='G'?'G_':set.source)+'_Shield',desc:'A '+set.name.toLowerCase()+' shield. Its protection applies with melee weapons. Requires Defense '+set.level+'.'};modularShopStock.push([shield,1,set.cost]);
 const weapon=set.id+'_weapon';ITEMS[weapon]={name:set.name+' sword',slot:'weapon',style:'melee',icon:0,power:Math.min(8,set.armor+1),range:1.45,attackLevel:set.level,armorSet:set.id,model:set.source+'_Sword',desc:'A balanced '+set.name.toLowerCase()+' blade. Requires Attack '+set.level+'.'};modularShopStock.push([weapon,1,set.cost*2]);
}
for(const [i,label]of ['Crimson plume','Royal plume','Winged crest','Crown crest','Knight crest'].entries()){const id='helmet_crest_'+(i+1);ITEMS[id]={name:label,slot:'crest',icon:4,model:'HeadAttach.'+String(i+1).padStart(3,'0'),desc:'A cosmetic helmet attachment. Wear headgear first.'};modularShopStock.push([id,1,25+i*10]);}
const SPELLS={
 spark:{name:'Wind spark',level:1,cost:1,power:4,range:4,color:'#a7e9ff',desc:'A quick burst of arcane energy.'},
 ember:{name:'Ember bolt',level:3,cost:2,power:8,range:5,color:'#ffba63',desc:'A stronger bolt of flame.'},
 frost:{name:'Frost bind',level:5,cost:3,power:6,range:4,color:'#bfc7ff',slow:3,desc:'Slows the enemy’s approach for 3 seconds.'}
};
function equippedWeapon(){if(s.tutorialCasting&&!s.tutorialReward)return {name:'Practice spell',style:'magic',power:0,range:4};return ITEMS[s.equipment.weapon]||{name:'Unarmed',style:'melee',power:0,range:1.45};}
function combatStyle(){return equippedWeapon().style;}
function currentSpell(){return SPELLS[s.spell]||SPELLS.spark;}
function attackRange(o=null){return (combatStyle()==='magic'?currentSpell().range:equippedWeapon().range)+(o?.combatRadius||0);}
function armorValue(){return Math.floor((lv('Defense')-1)/6)+Math.floor(lv('Worship')/5)+spiritBonus('armor')+Object.entries(s.equipment).reduce((total,[slot,id])=>total+((slot==='shield'&&combatStyle()!=='melee')?0:ITEMS[id]?.armor||0),0);}
function magicBonus(){return Object.values(s.equipment).reduce((n,id)=>n+(ITEMS[id]?.magic||0),0);}
function owns(id){return ITEMS[id]?.slot?!!s.gear[id]:(s.bag[id]||0)>0;}
function isAmmunition(id){return !!ITEMS[id]?.rangedStrength;}
function ammunitionLabel(count){return count>=1000000?Math.floor(count/100000)/10+'M':count>=1000?Math.floor(count/100)/10+'K':String(count);}
function equipAmmunition(id){
 const count=s.bag[id]||0;if(!isAmmunition(id)||count<1)return false;
 const previous=s.equipment.ammo,remaining=s.equippedAmmoCount||0;
 if(previous&&previous!==id&&remaining&&inventorySlots().length-1+(s.bag[previous]>0?0:1)>BAG_SIZE){toast('Make space in your bag for the previous arrows.');return false;}
 stop();s.bag[id]=0;
 if(previous===id)s.equippedAmmoCount=remaining+count;
 else{if(previous&&remaining)s.bag[previous]=(s.bag[previous]||0)+remaining;s.equipment.ammo=id;s.equippedAmmoCount=count;}
 tutorialEvent('ranged-gear');renderUI();save();return true;
}
function unequipAmmunition(){
 const id=s.equipment.ammo,count=s.equippedAmmoCount||0;if(!id||!count)return false;
 if(!(s.bag[id]>0)&&inventorySlots().length>=BAG_SIZE){toast('Make space in your bag before unequipping arrows.');return false;}
 stop();s.bag[id]=(s.bag[id]||0)+count;s.equipment.ammo=null;s.equippedAmmoCount=0;renderUI();save();return true;
}
function equipItem(id){
 if(isAmmunition(id))return equipAmmunition(id);
 const item=ITEMS[id];if(!item?.slot||!owns(id))return false;const required=equipmentRequirement(item);if(required){toast('Requires '+required+'.');return false;}
 if(!EQUIPMENT_SLOTS.some(([slot])=>slot===item.slot)){toast(item.slot==='shoulders'?'Shoulder armor is included with the matching chest piece.':'This ornament is a keepsake. Headgear uses one equipment slot.');return false;}
 if(item.defenseLevel&&lv('Defense')<item.defenseLevel){toast('Requires Defense '+item.defenseLevel+'.');return false;}
 if(item.attackLevel&&lv('Attack')<item.attackLevel){toast('Requires Attack '+item.attackLevel+'.');return false;}
 if(item.slot==='crest'&&!s.equipment.head){toast('Equip headgear before adding a helmet attachment.');return false;}
 if(item.slot==='shield'&&combatStyle()==='ranged'){toast('Bows need both hands. Equip a one-handed weapon before wearing a shield.');return false;}
 if(item.slot==='weapon'&&item.style==='ranged'&&s.equipment.shield&&inventorySlots().length+(s.equipment.weapon?1:0)>BAG_SIZE){toast('Make room in your bag for your shield before equipping a bow.');return false;}
 stop();if(item.slot==='weapon'&&item.style==='ranged')s.equipment.shield=null;s.equipment[item.slot]=id;if(item.slot==='weapon')s.tutorialCasting=false;tutorialEvent('equip-dagger');tutorialEvent('training-gear');tutorialEvent('ranged-gear');renderUI();save();return true;
}
function unequipItem(slot){if(slot==='ammo')return unequipAmmunition();if(!s.equipment[slot])return false;if(inventorySlots().length+1>BAG_SIZE){toast('Make space in your inventory before unequipping.');return false;}stop();s.equipment[slot]=null;renderUI();save();return true;}
function chooseStyle(style){const id=Object.keys(s.gear).filter(id=>s.gear[id]>0&&ITEMS[id]?.style===style&&ITEMS[id]?.slot==='weapon'&&!equipmentRequirement(ITEMS[id])).sort((a,b)=>(ITEMS[b].attackBonus||ITEMS[b].magicAccuracy||0)-(ITEMS[a].attackBonus||ITEMS[a].magicAccuracy||0))[0];if(id){if(equipItem(id))toast(ITEMS[id].name+' equipped.');return;}if(style==='melee'){s.tutorialCasting=false;if(s.equipment.weapon&&!unequipItem('weapon'))return;renderUI();save();return;}toast(style==='magic'&&tutorialStep()?'Speak to Arcanist Elowen for your practice staff and runes.':'You need a '+(style==='ranged'?'bow':'staff')+' to use this combat style.');}
function itemCanvas(id,size=96){const c=document.createElement('canvas');c.width=size;c.height=size;c.dataset.itemIcon=id;c.setAttribute('aria-hidden','true');return c;}
function paintItemIcons(root){if(!assetsReady)return;root.querySelectorAll('[data-item-icon]').forEach(c=>{const id=c.dataset.itemIcon,item=ITEMS[id];if(!item&&id!=='toolBelt')return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);if(typeof drawItemModelIcon==='function'&&drawItemModelIcon(g,id))return;if(typeof drawModularItemIcon==='function'&&drawModularItemIcon(g,id))return;if(typeof drawRealmItem==='function'&&drawRealmItem(g,id))return;if(item)sprite(g,item.atlas||'items',item.icon,c.width/2,c.height-5,c.width-10,c.height-10);});}
function itemActions(id,fromBag=false){
 const item=ITEMS[id];if(!item)return [];
 const slot=isAmmunition(id)?'ammo':item.slot,worn=!fromBag&&slot&&s.equipment[slot]===id,actions=[];
 if(id==='coins')actions.push(['Add to pouch',addCoinsToPouch]);
 else if(slot&&EQUIPMENT_SLOTS.some(([key])=>key===slot))actions.push([worn?'Unequip':'Equip',()=>{const ok=worn?unequipItem(slot):equipItem(id);if(ok)toast(item.name+(worn?' unequipped.':' equipped.'));return ok;}]);
 else if(skillItemActions(id))actions.push(...skillItemActions(id));
 else if(id==='fish'||id==='herbs')actions.push([id==='fish'?'Eat trout':'Eat herbs',()=>{if(!owns(id))return false;if(id==='fish')eat();else{if(s.hp>=maxhp()){toast('Your health is full.');return false;}s.bag.herbs--;s.hp=Math.min(maxhp(),s.hp+6);renderUI();save();}return true;}]);
 else if(id==='bones')actions.push(['Bury',buryBones]);
 else if(id==='logs')actions.push(['Light fire',lightLog]);
 else if(id==='rawTrout')actions.push(['Cook',cookTrout]);
 else if(id==='ore'||id==='ironBar')actions.push([id==='ore'?'Smelt':'Smith arrowheads',workPracticeForge]);
 else if(id==='arrowheads')actions.push(['Make arrows',finishArrows]);
 else actions.push(['Examine',()=>{toast(item.name+': '+item.desc);return true;}]);
 if(!worn)actions.push(['Drop one',()=>{const bag=item.slot?s.gear:s.bag,spare=(bag[id]||0)-(item.slot&&s.equipment[item.slot]===id?1:0);if(spare<1)return false;bag[id]--;groundDrop({[id]:1});renderUI();save();toast('Dropped '+item.name+'.');return true;}]);
 return actions;
}
function primaryItemAction(id,fromBag=false,index=null){
 if(fromBag&&typeof selectedUseItem!=='undefined'&&selectedUseItem)return useItemOnItem(id);
 if(fromBag&&typeof selectUseItem==='function'&&!ITEMS[id]?.slot&&!isAmmunition(id)&&!ITEMS[id]?.heal&&!ITEMS[id]?.beltTool&&!['coins','bones','herbs'].includes(id))return selectUseItem(id,index);
 itemActions(id,fromBag)[0]?.[1]();
}
function itemDetails(id,fromBag=false){
 const item=ITEMS[id];if(!item)return;
 const isEquipped=!fromBag&&s.equipment[isAmmunition(id)?'ammo':item.slot]===id;
 const buttons=itemActions(id,fromBag).map(([label,action])=>[label,()=>{if(action()!==false)close();}]);
 dialog(item.name,'<div class="itemhero" id="itemhero"></div><p>'+item.desc+'</p>'+(isAmmunition(id)?'<p>'+(isEquipped?'Equipped':'In your bag')+': <b>'+(isEquipped?s.equippedAmmoCount:s.bag[id]||0).toLocaleString()+'</b></p>':item.slot?'<p class="desc">'+(item.power?'Attack bonus +'+item.power+' · ':'')+(item.armor?'Armor +'+item.armor+' · ':'')+(isEquipped?'Equipped':'In your inventory')+'</p>':'<p>In your bag: <b>'+(s.bag[id]||0)+'</b></p>'),buttons);
 $('itemhero').appendChild(itemCanvas(id,160));paintItemIcons($('itemhero'));
}
function bindItemPress(button,id,fromBag,tradeSide=null){
 let timer=null,start=null,suppressClick=false;
 const details=()=>tradeSide&&window.realmTrade?showTradeItemMenu(id,tradeSide,button):typeof showItemOptions==='function'?showItemOptions(id,fromBag,button):itemDetails(id,fromBag);
 const clear=()=>{clearTimeout(timer);timer=null;};
 button.addEventListener('pointerdown',e=>{if(e.button!==0)return;clear();start={x:e.clientX,y:e.clientY};suppressClick=false;timer=setTimeout(()=>{timer=null;suppressClick=true;details();},500);});
 button.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>9){clear();suppressClick=true;}});
 button.addEventListener('pointerup',()=>{clear();start=null;});
 button.addEventListener('pointercancel',()=>{clear();start=null;suppressClick=true;});
 button.addEventListener('pointerleave',()=>{clear();start=null;});
 button.addEventListener('contextmenu',e=>{e.preventDefault();clear();if(!suppressClick)details();suppressClick=true;});
 button.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();clear();details();}});
 button.onclick=e=>{if(suppressClick){e.preventDefault();suppressClick=false;return;}if(tradeSide&&window.realmTrade)tradeItemAction(id,tradeSide);else primaryItemAction(id,fromBag,Number(button.dataset?.inventoryIndex));};
 button.setAttribute('aria-label',tradeSide&&window.realmTrade?tradeItemLabel(id,tradeSide):ITEMS[id].name+'. '+(fromBag&&!ITEMS[id].slot&&!isAmmunition(id)&&!ITEMS[id].heal&&!ITEMS[id].beltTool&&!['coins','bones','herbs'].includes(id)?'Use':itemActions(id,fromBag)[0][0])+'. Hold for more options.');
}
function renderInventory(){
 pageControls(1,1);const slots=inventorySlots();const panel=$('panel');panel.innerHTML='<div class="inventory-summary"><span>'+slots.length+' / 25</span>'+(window.realmTrade?'<span>Tap to '+(window.realmTrade.kind==='bank'?'deposit':'sell')+'</span>':'')+'</div><div id="inventoryGrid" class="inventorygrid bag25"></div>';
 const grid=$('inventoryGrid');
 for(let i=0;i<25;i++){const slot=slots[i],b=document.createElement('button');b.className='bagslot';if(slot){const item=ITEMS[slot.id];b.setAttribute('aria-label',item.name+' ×'+slot.count);b.title=item.name;b.appendChild(itemCanvas(slot.id));if(STACKABLE.has(slot.id)){const qty=document.createElement('b');qty.textContent=slot.count;b.appendChild(qty);}bindItemPress(b,slot.id,true,window.realmTrade?'bag':null);}else{b.disabled=true;b.setAttribute('aria-label','Empty slot '+(i+1));}grid.appendChild(b);}paintItemIcons(panel);
}
function renderEquipment(){
 pageControls(1,1);if(toolBeltOpen)return renderToolBelt();const panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Worn equipment</h2><small>Armor '+armorValue()+'</small></div><div id="equipmentGrid" class="equipmentgrid equipment-slots"></div>';
 const grid=$('equipmentGrid');for(const [slot,title]of EQUIPMENT_SLOTS){const b=document.createElement('button');b.className='gearslot';b.dataset.equipmentSlot=slot;const id=s.equipment[slot],label=document.createElement('small');label.textContent=title;b.appendChild(label);if(id)b.appendChild(itemCanvas(id));const n=document.createElement('span');n.textContent=id?ITEMS[id].name:'Empty';b.appendChild(n);if(id)bindItemPress(b,id,false);else{b.setAttribute('aria-label',title+': empty. Choose an item from your bag.');b.onclick=()=>{tab='bag';panelPage=0;syncTabs();renderPanel();toast('Choose '+title.toLowerCase()+' from your inventory.');};}grid.appendChild(b);}
 const belt=document.createElement('button');belt.className='equipment-tools';belt.type='button';belt.textContent='Tool belt';belt.setAttribute('aria-label','Open tools. These do not use equipment slots.');belt.onclick=()=>{toolBeltOpen=true;renderEquipment();panel.scrollTop=0;};panel.appendChild(belt);paintItemIcons(panel);
}
function renderToolBelt(){
 const owned=normalizeToolBelt(s),panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Tool belt</h2><button id="backToEquipment" type="button">Back</button></div><p class="desc">Your belt and attached pouch stay worn together. Tools are used automatically and take no bag space.</p><div id="toolBeltContents" class="tool-belt-contents"></div>';
 $('backToEquipment').onclick=()=>{toolBeltOpen=false;renderEquipment();panel.scrollTop=0;};
 for(const [id,tool]of Object.entries(TOOL_BELT_TOOLS)){const fitted=ITEMS[owned[id+'Item']],row=document.createElement('div');row.className='tool-belt-entry';row.dataset.tool=id;row.innerHTML='<strong>'+(fitted?.name||tool.name)+'</strong><small>'+tool.skill+' · '+(owned[id]?'On belt':'Not on belt')+'</small><p>'+tool.description+'</p>';$('toolBeltContents').appendChild(row);}
}
function renderSpells(){
 pageControls(Object.keys(SPELLS).length,4);const panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Spellbook</h2><small>Magic '+lv('Magic')+'</small></div><p class="desc">'+s.bag.runes+' mind runes · Staff '+(combatStyle()==='magic'?'equipped':'required')+'</p><div id="spellList" class="spelllist"></div>';
 for(const [id,spell]of pageItems(Object.entries(SPELLS),4)){const b=document.createElement('button');const locked=lv('Magic')<spell.level;b.className='spellcard'+(s.spell===id?' active':'');b.disabled=locked;b.innerHTML='<span class="spellorb" style="--spell:'+spell.color+'">◆</span><span><strong>'+spell.name+'</strong><small>'+spell.desc+'</small><small>Magic '+spell.level+' · '+Object.entries(spell.ingredients).map(([id,n])=>n+' '+ITEMS[id].name).join(' + ')+' per cast'+(locked?' · Locked':'')+'</small></span>';b.onclick=()=>{s.spell=id;equipItem('oakStaff');toast(spell.name+' selected.');};$('spellList').appendChild(b);}
}
function renderCombatBar(){
 $('combatButtons').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.style===combatStyle()));
 $('combatResource').textContent=combatStyle()==='ranged'?(selectedAmmo()?(s.equippedAmmoCount+' '+ITEMS[selectedAmmo()].name):'Equip suitable arrows'):combatStyle()==='magic'?currentSpell().name+' · '+s.bag.runes+' runes':'Defense bonus '+armorValue()+' · '+equippedWeapon().name;
 const select=$('trainingFocus'),style=combatStyle(),focus=trainingFocus(style),key=style+':'+focus;
 if(select.dataset.selection!==key){select.innerHTML=(style==='melee'?[['balanced','Balanced · all melee'],['accurate','Accurate · Attack'],['aggressive','Aggressive · Strength'],['defensive','Defensive · Defense']]:[['focused',style==='magic'?'Focus · Magic':'Focus · Ranged'],['defensive','Defensive · shared XP']]).map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');select.value=focus;select.dataset.selection=key;}
 select.onchange=()=>{s[style==='melee'?'meleeTraining':style+'Training']=select.value;renderCombatBar();save();};
}
function buySupply(id,count,cost){if(!ITEMS[id]||!Number.isInteger(count)||count<1||!Number.isSafeInteger(cost)||cost<0)return false;if(carriedCoins()<cost){toast('You need '+cost+' coins.');return false;}const oldCoins=s.bag.coins||0,oldPouch=s.gold;if(!spendCoins(cost))return false;if(!canCarry(id,count)){s.bag.coins=oldCoins;s.gold=oldPouch;toast('Not enough inventory space.');return false;}if(ITEMS[id].slot)s.gear[id]=(s.gear[id]||0)+count;else s.bag[id]=(s.bag[id]||0)+count;renderUI();save();return true;}
function craftArrows(){if(s.bag.logs<1||s.bag.ore<1){toast('You need 1 log and 1 iron ore.');return false;}s.bag.logs--;s.bag.ore--;s.bag.arrows+=20;gain('Smithing',12);renderUI();save();return true;}
function lineOfSight(ax,ay,bx,by){const distance=Math.hypot(bx-ax,by-ay),steps=Math.ceil(distance*8);for(let i=1;i<steps;i++){const x=Math.round(ax+(bx-ax)*i/steps),y=Math.round(ay+(by-ay)*i/steps);if((x===ax&&y===ay)||(x===bx&&y===by))continue;if(worldWall(x,y)||buildings.some(b=>inBuilding(b,x,y))||(typeof worldObjectsAt==='function'?worldObjectsAt(x,y):objects).some(o=>(o.type==='tree'||o.blocksSight&&!o.penFence&&!/fence/i.test(o.name||''))&&o.x===x&&o.y===y))return false;}return true;}
function inAttackRange(o){return Math.hypot(o.x-px,o.y-py)<=attackRange(o)+.01&&lineOfSight(px,py,o.x,o.y);}
let projectiles=[],meleeImpacts=[],enemyClock=0,retaliationClock=0,playerHitAt=-100,playerAttackReadyAt=0;
function actorWalkSpeed(o){return o.type==='man'||o.type==='villager'?.75:['wolf','ridgewolf'].includes(o.kind)?1.6:o.kind==='slime'?.85:1.25;}
function advanceActorMovement(o,dt){
 if(o.penId&&!insideTrainingPen(o.x,o.y,1)){o.x=o.homeX;o.y=o.homeY;o.drawX=o.x;o.drawY=o.y;delete o._creatureMotion;}
 if(!Number.isFinite(o.drawX+o.drawY)){o.drawX=o.x;o.drawY=o.y;return;}
 const dx=o.x-o.drawX,dy=o.y-o.drawY,distance=Math.hypot(dx,dy),speed=actorWalkSpeed(o)*(o.slowUntil>time?.45:1),step=Math.min(distance,speed*dt);
 if(distance>0){o.drawX+=dx/distance*step;o.drawY+=dy/distance*step;}
}
function awardDefeat(o,style){
 frontierKill(o);if(o.type!=='dummy'&&(tutorialStep()?.event!=='monster'||o.penId&&o.kind==='rat'))tutorialEvent('monster');
 const respawnSeconds=o.type==='dummy'?8:25;o.dead=time+respawnSeconds;o.respawnAt=Date.now()+respawnSeconds*1000;o.deathAt=time;monsterDrop(o);
 if(o.kind==='warden'){s.wardenClear=true;toast('The Crypt guard falls. The supply cache is yours.');}
 else if(o.kind==='king'){s.boss=true;toast('The ruins guardian falls! Return to Elder Rowan.');}
 else if(o.kind==='dummy'){tutorialEvent('dummy');toast('Training complete.');}
 else{if(o.kind==='wolf')s.kills++;toast(o.name+' defeated · Loot on the ground');}
 stop();
}
function performAttack(o){
 if(time+.0001<playerAttackReadyAt||o.dead>time||o.hp<=0)return false;
 if(!inAttackRange(o)){const p=route(o.x,o.y,true,attackRange(o));if(p===null){stop();toast('No clear line of attack.');}else path=p;return false;}
 const style=combatStyle(),spell=currentSpell();
 const ammo=style==='ranged'?selectedAmmo():null;if(style==='ranged'&&!ammo){stop();toast(s.equipment.ammo&&s.equippedAmmoCount?'This bow cannot fire '+ITEMS[s.equipment.ammo].name.toLowerCase()+'. Equip suitable arrows.':'Equip arrows in your ammunition slot to fire your bow.');return false;}
 if(style==='magic'&&(lv('Magic')<spell.level||!hasIngredients(spell.ingredients))){stop();toast('Not enough runes for '+spell.name+'. Switch to melee or visit Mara.');return false;}
 const focus=trainingFocus(style),maxHit=playerMaxHit(style);
 if(style==='ranged'&&--s.equippedAmmoCount<=0){s.equippedAmmoCount=0;s.equipment.ammo=null;}if(style==='magic')consumeIngredients(spell.ingredients);
 if(style==='magic'){gain('Magic',spell.baseXP,true);showExperienceDrop({Magic:spell.baseXP});tutorialEvent('magic');}
 const accurate=Math.random()<playerAccuracy(o,style),rolled=accurate||o.type==='dummy'?Math.floor(Math.random()*(Math.max(1,maxHit)+1)):0;
 const damage=o.type==='dummy'||style==='ranged'&&accurate?Math.max(1,rolled):rolled;
 if(typeof playerHeading!=='undefined')playerHeading=Math.atan2(o.x-px,o.y-py);
 lastAttack=time;playerAttackMotion={...combatMotion(style),style,weapon:s.equipment.weapon,ammo,started:time,color:spell.color};playerAttackReadyAt=time+actionDuration(o);facing=o.x<s.x?-1:1;
 if(style==='melee')meleeImpacts.push({o,damage,focus,due:time+.30,enemy:false});else projectiles.push({x:px,y:py,tx:o.x,ty:o.y,age:-playerAttackMotion.releaseAt,duration:.28+Math.hypot(o.x-px,o.y-py)*.025,color:spell.color,style,o,damage,focus,ammo,scene:currentScene,frame:s.character?.frame||'male',heading:Math.atan2(o.x-px,o.y-py),targetHeight:o.kind==='rat'?.32:o.combatRadius?Math.max(.7,o.combatRadius):.8,recoverable:style==='ranged'&&Math.random()>=.2,slow:style==='magic'?spell.slow||0:0});
 renderUI();save();return true;
}
function resolveHit(o,damage,style,slow=0,focus=trainingFocus(style)){if(o.dead>time||o.hp<=0)return;const dealt=Math.min(o.hp,Math.max(0,damage));o.hp-=dealt;o.hitAt=time;if(dealt>0){o.slowUntil=slow?time+slow:o.slowUntil||0;awardCombatDamage(dealt,style,focus);}floating(dealt?'-'+dealt:'Miss',o.x,o.y,dealt?'#ffe0bb':'#9caebd');if(o.hp<=0)awardDefeat(o,style);renderAction();renderUI();save();}
function applyEnemyHit(o,hit){
 s.hp=Math.max(0,s.hp-hit);playerHitAt=hit>0?time:playerHitAt;floating(hit?'-'+hit:'Blocked',px,py,hit?'#ffaba1':'#a7c7cf');
 if(s.hp<=0){spendCoins(Math.min(5,carriedCoins()));returnToVillage();s.hp=maxhp();o.hp=o.maxhp;projectiles=[];meleeImpacts=[];stop();dialog('Rescued by the village','<p>You kept your equipment, items, and experience, but lost up to 5 coins.</p><p>Eat during combat, try armor, or use a bow or staff to attack from farther away.</p>');}
 renderUI();save();
}
function updatePlayerProjectiles(dt){
 for(const p of projectiles){
  p.age+=dt;
  if(p.o.dead<=time&&p.o.hp>0){p.tx=p.o.drawX??p.o.x;p.ty=p.o.drawY??p.o.y;}
  if(p.style==='ranged'&&p.age>=0&&!p.releasePose&&typeof rangedReleasePose==='function')p.releasePose=rangedReleasePose(p);
 }
 const hits=projectiles.filter(p=>p.age>=p.duration);projectiles=projectiles.filter(p=>p.age<p.duration);
 for(const p of hits){
  if(p.style==='ranged'&&p.recoverable&&p.ammo){
   let point=[Math.round(p.tx),Math.round(p.ty)];
   if(blocked(...point)){let found=null;for(let radius=1;radius<=4&&!found;radius++)for(let y=-radius;y<=radius&&!found;y++)for(let x=-radius;x<=radius;x++)if(Math.max(Math.abs(x),Math.abs(y))===radius&&!blocked(point[0]+x,point[1]+y)){found=[point[0]+x,point[1]+y];break;}if(found)point=found;}
   groundDrop({[p.ammo]:1},...point,p.scene||currentScene);save();
  }
  if(p.o.hp>0&&p.o.dead<=time)resolveHit(p.o,p.damage,p.style,p.slow,p.focus,p.sharedGeneration);
 }
}
function updateCombat(dt){
 const due=meleeImpacts.filter(hit=>hit.due<=time);meleeImpacts=meleeImpacts.filter(hit=>hit.due>time);
 for(const hit of due){if(hit.o.dead>time||hit.o.hp<=0||Math.hypot((hit.o.drawX??hit.o.x)-px,(hit.o.drawY??hit.o.y)-py)>1.75||!lineOfSight(px,py,hit.o.x,hit.o.y))continue;if(hit.enemy)applyEnemyHit(hit.o,hit.damage);else resolveHit(hit.o,hit.damage,'melee',0,hit.focus,hit.sharedGeneration);}
 updatePlayerProjectiles(dt);
 if(!target||!fighter(target))return;
 const o=target;
 if(o.dead>time){stop();return;}
 enemyClock+=dt;retaliationClock+=dt;
 if(Math.hypot((o.drawX??o.x)-px,(o.drawY??o.y)-py)>1.45){
   if(o.type!=='dummy'&&enemyClock>=.3&&Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)<.01){enemyClock=0;const p=route(s.x,s.y,true,1.45,o.x,o.y,o);if(p?.length){[o.x,o.y]=p[0];}}
 }else if(o.type!=='dummy'&&retaliationClock>=2.4&&lineOfSight(o.x,o.y,px,py)){
   retaliationClock=0;o.attackAt=time;const hit=Math.random()<enemyAccuracy(o)?Math.max(0,Math.floor(Math.random()*((o.atk||0)+(o.spread||0)+1))-Math.floor(lv('Worship')/5)-spiritBonus('armor')):0;meleeImpacts.push({o,damage:hit,due:time+.30,enemy:true});
 }
}
function drawProjectiles(){
 for(const p of projectiles){if(p.age<0)continue;const t=Math.min(1,p.age/p.duration),x=(p.x+(p.tx-p.x)*t+.5)*TILE-camera.x,y=(p.y+(p.ty-p.y)*t+.2)*TILE-camera.y;ctx.save();if(p.style==='ranged'){ctx.translate(x,y);ctx.rotate(Math.atan2(p.ty-p.y,p.tx-p.x)+Math.PI/4);sprite(ctx,'items',12,0,8,29,24);}else{ctx.shadowColor=p.color;ctx.shadowBlur=16;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,5+Math.sin(t*12),0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(p.tx-p.x)*5,y-(p.ty-p.y)*5);ctx.stroke();}ctx.restore();}
}
function syncTabs(){document.querySelectorAll('[data-tab]').forEach(b=>{const active=(b.dataset.tab===tab||b.dataset.tab==='gear'&&(window.equipmentStatsOpen||window.equipmentOpen))&&!$('gameDock').hidden;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-expanded',String(active));});const title=$('dockTitle');if(title)title.textContent={bag:'Bag',gear:'Equipment',quests:'Quests',skills:'Skills',spells:'Spells',hunts:'Hunts'}[tab]||'Adventurer';}
// Decode opaque atlas matte pixels into a canvas texture at load time. The source
// artwork stays untouched; the game renderer uses the texture's transparency mask.
function prepareAnimationAtlases(){
 for(const name of ['poses','walking']){
   const source=art[name],c=document.createElement('canvas');c.width=source.width;c.height=source.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(source,0,0);
   const data=g.getImageData(0,0,c.width,c.height),pixels=data.data;
   for(let i=0;i<pixels.length;i+=4){const lo=Math.min(pixels[i],pixels[i+1],pixels[i+2]),hi=Math.max(pixels[i],pixels[i+1],pixels[i+2]);if(lo>170&&hi-lo<14)pixels[i+3]=0;}
   g.putImageData(data,0,0);art[name]=c;art.bounds[name]=[];
   const rows=name==='poses'?3:4,rowCuts=name==='walking'?[0,331,641,935,c.height]:[0,363,721,c.height];
   for(let row=0;row<rows;row++)for(let col=0;col<4;col++){
     const left=Math.round(col*c.width/4),right=Math.round((col+1)*c.width/4),top=rowCuts[row],bottom=rowCuts[row+1];let minX=right,minY=bottom,maxX=left,maxY=top;
     for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(pixels[(y*c.width+x)*4+3]>100){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
     art.bounds[name].push({x:minX,y:minY,w:Math.max(1,maxX-minX+1),h:Math.max(1,maxY-minY+1)});
   }
 }
}
// Wearables use body-local anchors, then share the character's facing, bob and lunge.
function drawWornItem(g,id,x,bottom,width,height,rotation=0){
 const item=ITEMS[id];if(!item)return;
 sprite(g,'items',item.icon,x,bottom,width,height,1,rotation);
}
function drawEquippedCharacter(g,x,bottom,look,moving=false,attackAge=10,scale=1){
 const style=combatStyle(),swinging=attackAge>=0&&attackAge<.42;
 const action=swinging?Math.sin(attackAge/.42*Math.PI):0;
 const step=moving?Math.floor(time*8)%4:0;
 const bob=moving?Math.sin(time*16)*1.1:Math.sin(time*2.5)*.7;
 const attacking=!moving&&swinging,posed=false;
 const atlas='heroes';
 const index=look*4+(moving?step:1);
 // Normalize each source's body frame to a 61px-high figure.
 const width=45;
 g.save();g.translate(x,bottom+bob*scale);g.scale(facing*scale,scale);
 g.translate(attacking?(style==='melee'?action*5:style==='ranged'?-action*2:0):0,style==='magic'&&attacking?-action*2:0);
 if(attacking&&style==='melee')g.rotate(action*.12);
 if(s.equipment.shield&&style!=='melee')drawWornItem(g,s.equipment.shield,-17,-19,12,21);
 sprite(g,atlas,index,0,0,width,61);
 if(s.equipment.feet==='leatherBoots'){
   // Reuse the animated leg silhouette: footwear follows each foot exactly,
   // including passing poses, instead of pasting a static pair over the legs.
   g.save();g.beginPath();g.rect(-23,-20,46,21);g.clip();
   g.filter='brightness(1.32) saturate(1.2)';sprite(g,atlas,index,0,0,width,61);g.restore();
 }
 // Torso stays below the face. Robes extend from the shoulders to the ankles.
 const bodyX=-1;
 if(s.equipment.body==='mageRobe')drawWornItem(g,'mageRobe',bodyX,-8,25,35);
 else if(s.equipment.body)drawWornItem(g,s.equipment.body,bodyX,-25,23,23);
 if(s.equipment.head)drawWornItem(g,s.equipment.head,5,-46,14,15);
 // Attack poses already hold the matching bow/staff. At rest and on the move,
 // attach that same item to the weapon hand instead of using a baked-in sword.
 if(s.equipment.weapon&&!posed){
   const handX=14,handY=-28;
   const id=s.equipment.weapon;
   const turn=id==='shortbow'?-.15:id==='oakStaff'?-.42:-.25+(attacking?action*1.7:0);
   g.save();g.translate(handX,handY);g.rotate(turn);
   // Weapons in the item atlas point diagonally up-right: their grips sit
   // near the lower-left of their crop, so offset the crop to the hand.
   drawWornItem(g,id,id==='shortbow'?5:9,id==='shortbow'?13:2,id==='shortbow'?23:27,id==='oakStaff'?43:id==='shortbow'?37:32);
   g.restore();
 }
 if(s.equipment.shield&&style==='melee'){
   const shieldX=-10;
   const shieldHandY=-26;
   drawWornItem(g,s.equipment.shield,shieldX,shieldHandY+9,18,20);
 }
 if(attacking&&style==='melee'&&s.equipment.weapon){g.strokeStyle='#fff0c3';g.lineWidth=2;g.globalAlpha=1-attackAge/.42;g.beginPath();g.arc(10,-25,25,-1.4+attackAge*4,.1+attackAge*4);g.stroke();}
 g.restore();
}
function drawAnimatedPlayer(x,bottom){
 const moving=path.length>0||Math.hypot(px-s.x,py-s.y)>.02;
 const age=time-lastAttack;
 drawEquippedCharacter(ctx,x,bottom,s.character?.look||0,moving,age);
 if(!moving&&combatStyle()==='magic'&&age>=0&&age<.42){
   const action=Math.sin(age/.42*Math.PI);ctx.save();ctx.shadowColor=currentSpell().color;ctx.shadowBlur=20;ctx.strokeStyle=currentSpell().color;ctx.lineWidth=2;ctx.globalAlpha=1-age/.42;ctx.beginPath();ctx.ellipse(x,bottom,15+action*15,5+action*6,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
}
