'use strict';
const MONSTER_ART={goblin:0,slime:1,wolf:2,ridgewolf:2,skeleton:3,king:4,rat:5,bandit:6,warden:7,sentinel:7};
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
function armorValue(){return spiritBonus('armor')+Object.entries(s.equipment).reduce((total,[slot,id])=>total+((slot==='shield'&&combatStyle()!=='melee')?0:ITEMS[id]?.armor||0),0);}
function magicBonus(){return Object.values(s.equipment).reduce((n,id)=>n+(ITEMS[id]?.magic||0),0);}
function owns(id){return ITEMS[id]?.slot?!!s.gear[id]:(s.bag[id]||0)>0;}
function equipItem(id){
 const item=ITEMS[id];if(!item?.slot||!owns(id))return false;
 stop();s.equipment[item.slot]=id;tutorialEvent('gear');renderUI();save();return true;
}
function unequipItem(slot){if(!s.equipment[slot])return false;if(inventorySlots().length>=BAG_SIZE){toast('Make space in your inventory before unequipping.');return false;}stop();s.equipment[slot]=null;renderUI();save();return true;}
function chooseStyle(style){const id=style==='magic'?'oakStaff':style==='ranged'?'shortbow':(s.gear.ironSword?'ironSword':'bronzeSword');if(equipItem(id))toast(ITEMS[id].name+' equipped.');}
function itemCanvas(id,size=96){const c=document.createElement('canvas');c.width=size;c.height=size;c.dataset.itemIcon=id;c.setAttribute('aria-hidden','true');return c;}
function paintItemIcons(root){if(!assetsReady)return;root.querySelectorAll('[data-item-icon]').forEach(c=>{const item=ITEMS[c.dataset.itemIcon];if(!item)return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);sprite(g,item.atlas||'items',item.icon,c.width/2,c.height-5,c.width-10,c.height-10);});}
function itemDetails(id,fromBag=false){
 const item=ITEMS[id];if(!item)return;
 const isEquipped=!fromBag&&item.slot&&s.equipment[item.slot]===id;
 const buttons=[];
 if(!isEquipped)buttons.push(['Drop one',()=>{const bag=item.slot?s.gear:s.bag;if(bag[id]>0){bag[id]--;groundDrop({[id]:1});close();toast('Dropped '+item.name+'.');}}]);
 if(item.slot)buttons.push([isEquipped?'Unequip':'Equip',()=>{if(isEquipped){if(!unequipItem(item.slot))return;}else if(!equipItem(id))return;close();toast(isEquipped?item.name+' unequipped.':item.name+' equipped.');}]);
 if(id==='herbs')buttons.push(['Eat herbs',()=>{if(s.hp>=maxhp()){toast('Your health is full.');return;}if(s.bag.herbs>0){s.bag.herbs--;s.hp=Math.min(maxhp(),s.hp+6);renderUI();save();close();}}]);
 if(id==='fish')buttons.push(['Eat trout',()=>{eat();close();}]);
 dialog(item.name,'<div class="itemhero" id="itemhero"></div><p>'+item.desc+'</p>'+(item.slot?'<p class="desc">'+(item.power?'Attack bonus +'+item.power+' · ':'')+(item.armor?'Armor +'+item.armor+' · ':'')+(isEquipped?'Equipped':'In your inventory')+'</p>':'<p>In your bag: <b>'+(s.bag[id]||0)+'</b></p>'),buttons);
 $('itemhero').appendChild(itemCanvas(id,160));paintItemIcons($('itemhero'));
}
function renderInventory(){
 pageControls(1,1);const slots=inventorySlots();const panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Inventory</h2><small>'+slots.length+' / 25</small></div><div id="inventoryGrid" class="inventorygrid bag25"></div>';
 const grid=$('inventoryGrid');
 for(let i=0;i<25;i++){const slot=slots[i],b=document.createElement('button');b.className='bagslot';if(slot){const item=ITEMS[slot.id];b.setAttribute('aria-label',item.name+' ×'+slot.count);b.title=item.name;b.appendChild(itemCanvas(slot.id));if(STACKABLE.has(slot.id)){const qty=document.createElement('b');qty.textContent=slot.count;b.appendChild(qty);}b.onclick=()=>itemDetails(slot.id,true);}else{b.disabled=true;b.setAttribute('aria-label','Empty slot '+(i+1));}grid.appendChild(b);}paintItemIcons(panel);
}
function renderEquipment(){
 pageControls(1,1);const panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Worn equipment</h2><small>Armor '+armorValue()+'</small></div><div id="equipmentGrid" class="equipmentgrid"></div>';
 const grid=$('equipmentGrid');for(const [slot,title]of [['head','Head'],['body','Body'],['weapon','Weapon'],['shield','Shield'],['feet','Feet']]){const b=document.createElement('button');b.className='gearslot';const id=s.equipment[slot],label=document.createElement('small');label.textContent=title;b.appendChild(label);if(id)b.appendChild(itemCanvas(id));const n=document.createElement('span');n.textContent=id?ITEMS[id].name:'Empty';b.appendChild(n);b.onclick=()=>{if(id)itemDetails(id);else{tab='bag';panelPage=0;syncTabs();renderPanel();toast('Choose an item in your inventory to equip.');}};grid.appendChild(b);}paintItemIcons(panel);
}
function renderSpells(){
 pageControls(3,2);const panel=$('panel');panel.innerHTML='<div class="questhead"><h2>Spellbook</h2><small>Magic '+lv('Magic')+'</small></div><p class="desc">'+s.bag.runes+' rune stones · Staff '+(combatStyle()==='magic'?'equipped':'required')+'</p><div id="spellList" class="spelllist"></div>';
 for(const [id,spell]of pageItems(Object.entries(SPELLS),2)){const b=document.createElement('button');const locked=lv('Magic')<spell.level;b.className='spellcard'+(s.spell===id?' active':'');b.disabled=locked;b.innerHTML='<span class="spellorb" style="--spell:'+spell.color+'">◆</span><span><strong>'+spell.name+'</strong><small>'+spell.desc+'</small><small>Magic '+spell.level+' · '+spell.cost+' rune'+(spell.cost>1?'s':'')+' per cast'+(locked?' · Locked':'')+'</small></span>';b.onclick=()=>{s.spell=id;equipItem('oakStaff');toast(spell.name+' selected.');};$('spellList').appendChild(b);}
}
function renderCombatBar(){
 $('combatButtons').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.style===combatStyle()));
 $('combatResource').textContent=combatStyle()==='ranged'?s.bag.arrows+' arrows':combatStyle()==='magic'?currentSpell().name+' · '+s.bag.runes+' runes':'Armor '+armorValue()+' · '+equippedWeapon().name;
}
function buySupply(id,count,cost){if(s.gold<cost){toast('You need '+cost+' coins.');return false;}if(ITEMS[id].slot&&owns(id)){toast('You already own this item.');return false;}if(!canCarry(id,count)){toast('Not enough inventory space.');return false;}s.gold-=cost;if(ITEMS[id].slot)s.gear[id]=1;else s.bag[id]=(s.bag[id]||0)+count;renderUI();save();return true;}
function craftArrows(){if(s.bag.logs<1||s.bag.ore<1){toast('You need 1 log and 1 iron ore.');return false;}s.bag.logs--;s.bag.ore--;s.bag.arrows+=20;gain('Smithing',12);renderUI();save();return true;}
function lineOfSight(ax,ay,bx,by){const distance=Math.hypot(bx-ax,by-ay),steps=Math.ceil(distance*8);for(let i=1;i<steps;i++){const x=Math.round(ax+(bx-ax)*i/steps),y=Math.round(ay+(by-ay)*i/steps);if((x===ax&&y===ay)||(x===bx&&y===by))continue;if(worldWall(x,y)||buildings.some(b=>inBuilding(b,x,y))||objects.some(o=>o.type==='tree'&&o.x===x&&o.y===y))return false;}return true;}
function inAttackRange(o){return Math.hypot(o.x-s.x,o.y-s.y)<=attackRange()+.01&&lineOfSight(s.x,s.y,o.x,o.y);}
let projectiles=[],enemyClock=0,retaliationClock=0;
function awardDefeat(o,style){
 frontierKill(o);if(o.type!=='dummy')tutorialEvent('monster');
 o.dead=time+(o.type==='dummy'?8:25);const skill=style==='magic'?'Magic':style==='ranged'?'Ranged':'Combat';gain(skill,o.xp);if(skill!=='Combat')gain('Combat',Math.ceil(o.xp*.5));monsterDrop(o);
 if(o.kind==='warden'){s.wardenClear=true;toast('The Crypt Warden falls. The supply cache is yours.');}
 else if(o.kind==='king'){s.boss=true;toast('The Hollow King falls! Return to Elder Rowan.');}
 else if(o.kind==='dummy'){if(s.tutorial===5)s.hp=Math.max(1,Math.min(s.hp,maxhp()-6));tutorialEvent('dummy');toast('Training complete. Try your food button to heal.');}
 else{if(o.kind==='wolf')s.kills++;toast(o.name+' defeated · Loot on the ground · +'+o.xp+' '+skill+' XP');}
 stop();
}
function performAttack(o){
 if(!inAttackRange(o)){const p=route(o.x,o.y,true,attackRange());if(p===null){stop();toast('No clear line of attack.');}else path=p;return false;}
 const style=combatStyle(),spell=currentSpell();
 if(style==='ranged'&&s.bag.arrows<1){stop();toast('Out of arrows. Switch to melee, buy arrows, or craft them.');return false;}
 if(style==='magic'&&(lv('Magic')<spell.level||s.bag.runes<spell.cost)){stop();toast('Not enough runes for '+spell.name+'. Switch to melee or visit Mara.');return false;}
 if(style==='ranged')s.bag.arrows--;if(style==='magic')s.bag.runes-=spell.cost;
 const skill=style==='magic'?'Magic':style==='ranged'?'Ranged':'Combat';
 const damage=spiritBonus(style)+(style==='magic'?spell.power+magicBonus():3)+lv(skill)+equippedWeapon().power+Math.floor(Math.random()*3);
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
   if(s.hp<=0){s.gold=Math.max(0,s.gold-5);returnToVillage();s.x=14;s.y=17;px=14;py=17;s.hp=maxhp();o.hp=o.maxhp;projectiles=[];stop();dialog('Rescued by the village','<p>You kept your equipment, items, and experience, but lost up to 5 coins.</p><p>Eat during combat, try armor, or use a bow or staff to attack from farther away.</p>');}renderUI();save();
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
