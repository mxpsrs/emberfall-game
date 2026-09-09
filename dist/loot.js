'use strict';
const BAG_SIZE=25,STACKABLE=new Set(['arrows','runes']);
function inventorySlots(){const slots=[];for(const [id,count]of Object.entries(s.bag)){if(!ITEMS[id]||ITEMS[id].slot||count<=0)continue;if(STACKABLE.has(id))slots.push({id,count});else for(let n=0;n<count;n++)slots.push({id,count:1});}for(const [id,count]of Object.entries(s.gear)){const item=ITEMS[id];if(!item?.slot)continue;const stored=count-(s.equipment[item.slot]===id?1:0);for(let n=0;n<stored;n++)slots.push({id,count:1});}return slots;}
function bagSpaceFor(id){return STACKABLE.has(id)&&s.bag[id]>0?Infinity:Math.max(0,BAG_SIZE-inventorySlots().length);}
function canCarry(id,count=1){return bagSpaceFor(id)>=(STACKABLE.has(id)?1:count);}
function addToBag(id,count=1){if(!canCarry(id,count)){toast('Your 25-slot inventory is full. Drop or use an item first.');return false;}s.bag[id]=(s.bag[id]||0)+count;return true;}
function groundDrop(items,x=s.x,y=s.y,scene=currentScene){
 s.groundLoot=s.groundLoot||[];let pile=s.groundLoot.find(p=>p.x===x&&p.y===y&&p.scene===scene);
 if(!pile){pile={type:'loot',name:'Ground loot',dead:0,x,y,scene,items:{}};s.groundLoot.push(pile);}
 for(const [id,n]of Object.entries(items))if(n>0)pile.items[id]=(pile.items[id]||0)+n;return pile;
}
function setupLoot(){
 s.groundLoot=s.groundLoot||[];
 // Preserve old saves that predate capacity: their excess waits at their feet.
 const overflow={};while(inventorySlots().length>BAG_SIZE){const slot=inventorySlots().at(-1);const amount=STACKABLE.has(slot.id)?s.bag[slot.id]:1;if(ITEMS[slot.id]?.slot)s.gear[slot.id]-=amount;else s.bag[slot.id]-=amount;overflow[slot.id]=(overflow[slot.id]||0)+amount;}
 if(Object.keys(overflow).length){groundDrop(overflow);toast('Your extra supplies are on the ground beside you.');save();}
}
function monsterDrop(o){
 if(o.kind==='dummy')return;
 const table={ridgewolf:{fang:2,bones:1},sentinel:{bones:4,runes:20,ironSword:1},wolf:{fang:1,bones:1},goblin:{bones:1,arrows:3},slime:{herbs:1,runes:2},skeleton:{bones:2,runes:3},bandit:{bones:1,arrows:5},rat:{bones:1},man:{bones:1},king:{bones:3,runes:15,ironHelm:1},warden:{bones:3,runes:12,ironShield:1}};
 groundDrop({coins:o.coins||0,...(table[o.kind]||{bones:1})},o.x,o.y);
}
function takeGroundItem(pile,id,limit=Infinity){
 const n=Math.min(pile.items[id]||0,limit);if(!n)return false;
 let taken=n;
 if(id==='coins')s.gold+=n;
 else if(ITEMS[id]?.slot){taken=Math.min(n,bagSpaceFor(id));if(!taken){toast('Inventory full. This loot stays on the ground.');return false;}s.gear[id]=(s.gear[id]||0)+taken;}
 else {taken=STACKABLE.has(id)?(canCarry(id,n)?n:0):Math.min(n,bagSpaceFor(id));if(!taken){toast('Inventory full. This loot stays on the ground.');return false;}s.bag[id]=(s.bag[id]||0)+taken;}
 pile.items[id]-=taken;if(!pile.items[id])delete pile.items[id];
 if(!Object.keys(pile.items).length)s.groundLoot=s.groundLoot.filter(p=>p!==pile);
 tutorialEvent('loot');renderUI();save();return true;
}
function topGroundItem(pile){return Object.keys(pile.items).find(id=>pile.items[id]>0)||null;}
function groundItemLabel(pile){const id=topGroundItem(pile);if(!id)return '';const n=pile.items[id];return (id==='coins'?'Coins':ITEMS[id]?.name||id)+((id==='coins'||STACKABLE.has(id))&&n>1?' ×'+n:'');}
function pickupGroundLoot(pile){
 stop();
 if(pile.scene!==currentScene||!s.groundLoot.includes(pile))return;
 if(Math.hypot(px-pile.x,py-pile.y)>.2){toast('Move onto the loot to pick it up.');return;}
 const id=topGroundItem(pile);if(!id)return;
 const name=id==='coins'?'Coins':ITEMS[id]?.name||id,before=pile.items[id];
 if(takeGroundItem(pile,id,id==='coins'||STACKABLE.has(id)?Infinity:1)){
  const amount=before-(pile.items[id]||0);toast('Picked up '+name+(amount>1?' ×'+amount:'')+'.');
 }
}
function drawGroundLoot(){
 for(const pile of s.groundLoot||[]){if(pile.scene!==currentScene)continue;const x=(pile.x+.5)*TILE-camera.x,y=(pile.y+.78)*TILE-camera.y;
 if(x<-35||x>screen.w+35||y<-35||y>screen.h+35)continue;
 const ids=Object.keys(pile.items).filter(id=>id!=='coins');groundRing(pile.x,pile.y,'#e8c88099',14);
 ids.slice(0,3).forEach((id,i)=>{const item=ITEMS[id];if(item)sprite(ctx,item.atlas||'items',item.icon,x+(i-1)*8,y-i*3,23,23);});
 if(!ids.length){ctx.fillStyle='#dcb65b';ctx.beginPath();ctx.ellipse(x,y-5,8,4,0,0,Math.PI*2);ctx.fill();}
 hitboxes.push({x:x-19,y:y-30,w:38,h:38,o:pile});
 if(Math.hypot(s.x-pile.x,s.y-pile.y)<3)label('Loot',x,y+10,'#f6dda1',11);
 }
}
