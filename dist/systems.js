'use strict';
const ITEMS={
 bronzeSword:{name:'Bronze sword',icon:0,slot:'weapon',style:'melee',power:1,range:1.45,desc:'A dependable starter sword. Trains Combat.'},
 ironSword:{name:'Iron sword',icon:1,slot:'weapon',style:'melee',power:5,range:1.45,desc:'Forged iron. Four more damage than a bronze sword.'},
 shortbow:{name:'Shortbow',icon:2,slot:'weapon',style:'ranged',power:2,range:5,desc:'Fires one arrow per shot. Trains Ranged and Combat.'},
 oakStaff:{name:'Oak staff',icon:3,slot:'weapon',style:'magic',power:1,range:4,desc:'Channels your selected spell using rune stones. Trains Magic and Combat.'},
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
 bones:{name:'Bones',icon:14,desc:'Dropped by goblins and skeletons. Sell for 4 coins.'},
 mageRobe:{name:'Mage robe',icon:15,slot:'body',magic:2,desc:'Adds 2 magic damage. Offers no armor protection.'}
};
const SPELLS={
 spark:{name:'Wind spark',level:1,cost:1,power:4,range:4,color:'#a7e9ff',desc:'A quick burst of arcane energy.'},
 ember:{name:'Ember bolt',level:3,cost:2,power:8,range:5,color:'#ffba63',desc:'A stronger bolt of flame.'},
 frost:{name:'Frost bind',level:5,cost:3,power:6,range:4,color:'#bfc7ff',slow:3,desc:'Slows the enemy’s approach for 3 seconds.'}
};
function equippedWeapon(){return ITEMS[s.equipment.weapon]||{name:'Unarmed',style:'melee',power:0,range:1.45};}
function combatStyle(){return equippedWeapon().style;}
function currentSpell(){return SPELLS[s.spell]||SPELLS.spark;}
function attackRange(){return combatStyle()==='magic'?currentSpell().range:equippedWeapon().range;}
function armorValue(){return Object.entries(s.equipment).reduce((total,[slot,id])=>total+((slot==='shield'&&combatStyle()!=='melee')?0:ITEMS[id]?.armor||0),0);}
function magicBonus(){return Object.values(s.equipment).reduce((n,id)=>n+(ITEMS[id]?.magic||0),0);}
function owns(id){return ITEMS[id]?.slot?!!s.gear[id]:(s.bag[id]||0)>0;}
function equipItem(id){
 const item=ITEMS[id];if(!item?.slot||!owns(id))return false;
 stop();s.equipment[item.slot]=id;renderUI();save();return true;
}
function unequipItem(slot){stop();s.equipment[slot]=null;renderUI();save();}
function chooseStyle(style){const id=style==='magic'?'oakStaff':style==='ranged'?'shortbow':(s.gear.ironSword?'ironSword':'bronzeSword');if(equipItem(id))toast(ITEMS[id].name+' equipped.');}
function itemCanvas(id,size=96){const c=document.createElement('canvas');c.width=size;c.height=size;c.dataset.itemIcon=id;c.setAttribute('aria-hidden','true');return c;}
function paintItemIcons(root){if(!assetsReady)return;root.querySelectorAll('[data-item-icon]').forEach(c=>{const item=ITEMS[c.dataset.itemIcon];if(!item)return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);sprite(g,'items',item.icon,c.width/2,c.height-5,c.width-10,c.height-10);});}
function itemDetails(id){
 const item=ITEMS[id];if(!item)return;
 const isEquipped=item.slot&&s.equipment[item.slot]===id;
 const buttons=[];
 if(item.slot)buttons.push([isEquipped?'Unequip':'Equip',()=>{if(isEquipped)unequipItem(item.slot);else equipItem(id);close();toast(isEquipped?item.name+' unequipped.':item.name+' equipped.');}]);
 if(id==='fish')buttons.push(['Eat trout',()=>{eat();close();}]);
 dialog(item.name,'<div class="itemhero" id="itemhero"></div><p>'+item.desc+'</p>'+(item.slot?'<p class="desc">'+(item.power?'Attack bonus +'+item.power+' · ':'')+(item.armor?'Armor +'+item.armor+' · ':'')+(isEquipped?'Equipped':'In your inventory')+'</p>':'<p>In your bag: <b>'+(s.bag[id]||0)+'</b></p>'),buttons);
 $('itemhero').appendChild(itemCanvas(id,160));paintItemIcons($('itemhero'));
}
function renderInventory(){
 const panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Your inventory</h2><small>Tap an item</small></div><div id="inventoryGrid" class="inventorygrid"></div>';
 const grid=$('inventoryGrid');
 const ids=Object.keys(ITEMS).filter(owns);
 pageControls(ids.length,8);for(const id of pageItems(ids,8)){const item=ITEMS[id],b=document.createElement('button');b.className='inventoryitem';b.setAttribute('aria-label',item.name+(item.slot?'':', '+s.bag[id]));b.appendChild(itemCanvas(id));const name=document.createElement('span');name.className='itemname';name.textContent=item.name;b.appendChild(name);const qty=document.createElement('b');qty.className='quantity';qty.textContent=item.slot?(s.equipment[item.slot]===id?'E':''):s.bag[id];b.appendChild(qty);b.onclick=()=>itemDetails(id);grid.appendChild(b);}
 const pad=(4-pageItems(ids,8).length%4)%4;for(let i=0;i<pad;i++){const div=document.createElement('div');div.className='inventoryempty';grid.appendChild(div);}
 paintItemIcons(panel);
}
function renderEquipment(){
 pageControls(1,1);const panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Equipment</h2><small>Armor '+armorValue()+'</small></div><div id="equipmentGrid" class="equipmentgrid"></div><p class="desc" id="gearSummary"></p>';
 const grid=$('equipmentGrid');
 for(const [slot,title]of [['head','Head'],['body','Body'],['weapon','Weapon'],['shield','Shield'],['feet','Feet']]){const b=document.createElement('button');b.className='gearslot';const id=s.equipment[slot],label=document.createElement('small');label.textContent=title;b.appendChild(label);if(id)b.appendChild(itemCanvas(id));const n=document.createElement('span');n.textContent=id?ITEMS[id].name:'Empty';b.appendChild(n);b.onclick=()=>{if(id)itemDetails(id);else{tab='bag';syncTabs();renderPanel();toast('Choose an item to equip.');}};grid.appendChild(b);}
 $('gearSummary').textContent=equippedWeapon().name+' · '+combatStyle()+' · Range '+Math.floor(attackRange())+' tiles'+(s.equipment.shield&&combatStyle()!=='melee'?' · Shield inactive':'');paintItemIcons(panel);
}
function renderSpells(){
 pageControls(3,2);const panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Spellbook</h2><small>Magic '+lv('Magic')+'</small></div><p class="desc">'+s.bag.runes+' rune stones · Staff '+(combatStyle()==='magic'?'equipped':'required')+'</p><div id="spellList" class="spelllist"></div>';
 for(const [id,spell]of pageItems(Object.entries(SPELLS),2)){const b=document.createElement('button');const locked=lv('Magic')<spell.level;b.className='spellcard'+(s.spell===id?' active':'');b.disabled=locked;b.innerHTML='<span class="spellorb" style="--spell:'+spell.color+'">◆</span><span><strong>'+spell.name+'</strong><small>'+spell.desc+'</small><small>Magic '+spell.level+' · '+spell.cost+' rune'+(spell.cost>1?'s':'')+' per cast'+(locked?' · Locked':'')+'</small></span>';b.onclick=()=>{s.spell=id;equipItem('oakStaff');toast(spell.name+' selected.');};$('spellList').appendChild(b);}
}
function renderCombatBar(){
 $('combatButtons').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.style===combatStyle()));
 $('combatResource').textContent=combatStyle()==='ranged'?s.bag.arrows+' arrows':combatStyle()==='magic'?currentSpell().name+' · '+s.bag.runes+' runes':'Armor '+armorValue()+' · '+equippedWeapon().name;
}
function buySupply(id,count,cost){if(s.gold<cost){toast('You need '+cost+' coins.');return false;}if(ITEMS[id].slot&&owns(id)){toast('You already own this item.');return false;}s.gold-=cost;if(ITEMS[id].slot)s.gear[id]=1;else s.bag[id]=(s.bag[id]||0)+count;renderUI();save();return true;}
function craftArrows(){if(s.bag.logs<1||s.bag.ore<1){toast('You need 1 log and 1 iron ore.');return false;}s.bag.logs--;s.bag.ore--;s.bag.arrows+=20;gain('Smithing',12);renderUI();save();return true;}
function lineOfSight(ax,ay,bx,by){const distance=Math.hypot(bx-ax,by-ay),steps=Math.ceil(distance*8);for(let i=1;i<steps;i++){const x=Math.round(ax+(bx-ax)*i/steps),y=Math.round(ay+(by-ay)*i/steps);if((x===ax&&y===ay)||(x===bx&&y===by))continue;if(buildings.some(b=>inBuilding(b,x,y))||objects.some(o=>o.type==='tree'&&o.x===x&&o.y===y))return false;}return true;}
function inAttackRange(o){return Math.hypot(o.x-s.x,o.y-s.y)<=attackRange()+.01&&lineOfSight(s.x,s.y,o.x,o.y);}
let projectiles=[],enemyClock=0,retaliationClock=0;
function awardDefeat(o,style){
 o.dead=time+(o.type==='dummy'?8:25);const skill=style==='magic'?'Magic':style==='ranged'?'Ranged':'Combat';gain(skill,o.xp);if(skill!=='Combat')gain('Combat',Math.ceil(o.xp*.5));s.gold+=o.coins;if(o.loot)s.bag[o.loot]++;
 if(o.kind==='goblin'||o.kind==='bandit')s.bag.arrows+=3;
 if(o.kind==='slime'||o.kind==='skeleton')s.bag.runes+=2;
 if(o.kind==='king'){s.boss=true;toast('The Hollow King falls! Return to Elder Rowan.');}
 else if(o.kind==='dummy'){if(s.tutorial===5)s.hp=Math.max(1,Math.min(s.hp,maxhp()-6));tutorialEvent('dummy');toast('Training complete. Try your food button to heal.');}
 else{if(o.kind==='wolf')s.kills++;toast(o.name+' defeated · +'+o.coins+' coins · +'+o.xp+' '+skill+' XP');}
 stop();
}
function performAttack(o){
 if(!inAttackRange(o)){const p=route(o.x,o.y,true,attackRange());if(p===null){stop();toast('No clear line of attack.');}else path=p;return false;}
 const style=combatStyle(),spell=currentSpell();
 if(style==='ranged'&&s.bag.arrows<1){stop();toast('Out of arrows. Switch to melee, buy arrows, or craft them.');return false;}
 if(style==='magic'&&(lv('Magic')<spell.level||s.bag.runes<spell.cost)){stop();toast('Not enough runes for '+spell.name+'. Switch to melee or visit Mara.');return false;}
 if(style==='ranged')s.bag.arrows--;if(style==='magic')s.bag.runes-=spell.cost;
 const skill=style==='magic'?'Magic':style==='ranged'?'Ranged':'Combat';
 const damage=(style==='magic'?spell.power+magicBonus():3)+lv(skill)+equippedWeapon().power+Math.floor(Math.random()*3);
 lastAttack=time;facing=o.x<s.x?-1:1;
 if(style==='melee')resolveHit(o,damage,style);else projectiles.push({x:px,y:py,tx:o.x,ty:o.y,age:0,duration:.28+Math.hypot(o.x-px,o.y-py)*.025,color:spell.color,style,o,damage,slow:style==='magic'?spell.slow||0:0});
 renderUI();save();return true;
}
function resolveHit(o,damage,style,slow=0){if(o.dead>time)return;o.hp-=damage;o.hitAt=time;o.slowUntil=slow?time+slow:o.slowUntil||0;floating('-'+damage,o.x,o.y);if(o.hp<=0)awardDefeat(o,style);renderAction();renderUI();save();}
function updateCombat(dt){
 for(const p of projectiles)p.age+=dt;
 const hits=projectiles.filter(p=>p.age>=p.duration);projectiles=projectiles.filter(p=>p.age<p.duration);
 for(const p of hits)resolveHit(p.o,p.damage,p.style,p.slow);
 if(!target||!fighter(target))return;
 const o=target;
 if(o.dead>time){stop();return;}
 enemyClock+=dt;retaliationClock+=dt;
 if(Math.hypot(o.x-s.x,o.y-s.y)>1.45){
   if(o.type!=='dummy'&&enemyClock>=(o.slowUntil>time?.9:.38)){enemyClock=0;const p=route(s.x,s.y,true,1.45,o.x,o.y);if(p?.length){[o.x,o.y]=p[0];}}
 }else if(retaliationClock>=1.3&&lineOfSight(o.x,o.y,s.x,s.y)){
   retaliationClock=0;o.attackAt=time;const hit=Math.max(1,o.atk+Math.floor(Math.random()*(o.spread+1))-armorValue());s.hp-=hit;floating('-'+hit,px,py,'#ffaba1');
   if(s.hp<=0){s.gold=Math.max(0,s.gold-5);s.x=14;s.y=17;px=14;py=17;s.hp=maxhp();o.hp=o.maxhp;projectiles=[];stop();dialog('Rescued by the village','<p>You kept your equipment, items, and experience, but lost up to 5 coins.</p><p>Eat during combat, try armor, or use a bow or staff to attack from farther away.</p>');}renderUI();save();
 }
}
function drawProjectiles(){
 for(const p of projectiles){const t=Math.min(1,p.age/p.duration),x=(p.x+(p.tx-p.x)*t+.5)*TILE-camera.x,y=(p.y+(p.ty-p.y)*t+.2)*TILE-camera.y;ctx.save();if(p.style==='ranged'){ctx.translate(x,y);ctx.rotate(Math.atan2(p.ty-p.y,p.tx-p.x)+Math.PI/4);sprite(ctx,'items',12,0,8,29,24);}else{ctx.shadowColor=p.color;ctx.shadowBlur=16;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,5+Math.sin(t*12),0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(p.tx-p.x)*5,y-(p.ty-p.y)*5);ctx.stroke();}ctx.restore();}
}
function syncTabs(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));}
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
function drawAnimatedPlayer(x,bottom){
 const look=s.character?.look||0,moving=path.length||Math.hypot(px-s.x,py-s.y)>.02,style=combatStyle(),attackAge=time-lastAttack,swinging=attackAge<.42;
 if(moving){const frame=Math.floor(time*8)%4,bob=Math.sin(time*16)*1.1;sprite(ctx,'walking',look*4+frame,x,bottom+bob,48,62,facing);return;}
 const breathe=Math.sin(time*2.5)*.7,action=swinging?Math.sin(attackAge/.42*Math.PI):0;
 if(style==='melee'){
   const atlas=s.equipment.weapon?'characters':'poses',index=s.equipment.weapon?look:8+look;
   sprite(ctx,atlas,index,x+facing*action*6,bottom+breathe,45,61,facing,action*.24);
   if(swinging&&s.equipment.weapon){ctx.save();ctx.translate(x,bottom-29);ctx.scale(facing,1);ctx.strokeStyle='#fff0c3';ctx.lineWidth=3;ctx.globalAlpha=1-attackAge/.42;ctx.beginPath();ctx.arc(6,-1,28,-1.4+attackAge*4,.1+attackAge*4);ctx.stroke();ctx.restore();}
 }else if(style==='ranged'){
   sprite(ctx,'poses',look,x-facing*action*2,bottom+breathe,58+action*3,61,facing,-action*.025);
 }else{
   sprite(ctx,'poses',4+look,x,bottom+breathe-action*2,49,64,facing,action*.04);
   if(swinging){ctx.save();ctx.shadowColor=currentSpell().color;ctx.shadowBlur=20;ctx.strokeStyle=currentSpell().color;ctx.lineWidth=2;ctx.globalAlpha=1-attackAge/.42;ctx.beginPath();ctx.ellipse(x,bottom,15+action*15,5+action*6,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=currentSpell().color;for(let j=0;j<5;j++){const angle=time*6+j*Math.PI*2/5;ctx.beginPath();ctx.arc(x+Math.cos(angle)*20,bottom-30+Math.sin(angle)*12,2,0,Math.PI*2);ctx.fill();}ctx.restore();}
 }
}
