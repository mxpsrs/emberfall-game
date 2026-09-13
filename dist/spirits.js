'use strict';
const SPIRITS={
 cinder:{name:'Cinder',element:'Fire',icon:0,color:'#ffad67',scene:'overworld',x:11,y:19,bonus:'Adds 2 melee and magic damage.',skill:null,ability:'Flare · 14 damage',hint:'Beside Briarhaven’s southern camp.',power:14},
 brook:{name:'Brook',element:'Water',icon:1,color:'#8bdaff',scene:'overworld',x:9,y:23,bonus:'Adds 8 maximum health.',skill:'Fishing',ability:'Mending tide · heal 20',hint:'On the eastern shore of Stillwater. Fishing level 2.'},
 zephyr:{name:'Zephyr',element:'Air',icon:2,color:'#b9edb0',scene:'overworld',x:49,y:9,bonus:'Adds 2 ranged damage.',skill:'Woodcutting',ability:'Gust · 10 damage + slow',hint:'Deep in Pinewatch Woods. Woodcutting level 2.',power:10},
 cairn:{name:'Cairn',element:'Earth',icon:3,color:'#dac099',scene:'mine',x:22,y:18,bonus:'Adds 2 armor.',skill:'Mining',ability:'Stoneguard · +4 armor for 8s',hint:'In the eastern mine chamber. Mining level 2.'}
};
let selectedSpirit='cinder',spiritEffect=null,stoneWard=0,spiritTick=0;
function spiritBonus(kind){const set=id=>s.spirits?.[id]?.state==='set';return kind==='health'&&set('brook')?8:kind==='armor'?((set('cairn')?2:0)+(stoneWard>0?4:0)):kind==='ranged'&&set('zephyr')?2:(kind==='magic'||kind==='melee')&&set('cinder')?2:0;}
function setupSpirits(){
 s.spirits=s.spirits||{};
 for(const [id,def]of Object.entries(SPIRITS)){
  if(s.spirits[id])continue;const o=add('spirit',def.x,def.y,def.name,def.icon,{spiritId:id});objects.pop();worldScenes[def.scene].objects.push(o);if(currentScene===def.scene)objects.push(o);
 }
 $('spiritButton').onclick=openSpirits;$('closeSpirits').onclick=()=>{$('spiritsDialog').close();save();};
 $('summonSpirits').onclick=summonSpirits;$('spiritsDialog').addEventListener('close',()=>{$('spiritButton').setAttribute('aria-pressed','false');});
}
function collectSpirit(o){
 const id=o.spiritId,def=SPIRITS[id];stop();if(s.spirits[id])return;
 if(def.skill&&lv(def.skill)<2){dialog(def.name+' · '+def.element+' spirit','<p>This spirit is curious about your '+def.skill.toLowerCase()+'. Reach <b>'+def.skill+' level 2</b> to form a bond.</p>');return;}
 dialog(def.name+' · '+def.element+' spirit','<p>'+def.name+' offers to form an elemental bond with you.</p><p><b>Active bonus:</b> '+def.bonus+'</p><p>Unleash its ability to put it on standby. Two or more standby spirits can power your elemental convergence.</p>',[['Form a bond',()=>{if(s.spirits[id])return;s.spirits[id]={state:'set',recovery:0};gain('Worship',20);o.collected=true;o.dead=Infinity;tutorialEvent('spirit');close();toast(def.name+' bonded with you. Open the spirits icon to manage your spirits.');renderUI();save();}]]);
}
function openSpirits(){if(s.spirits.cinder)tutorialEvent('spirit');path=[];if(target&&!fighter(target))stop();$('spiritsDialog').showModal();$('spiritButton').setAttribute('aria-pressed','true');renderSpirits();}
function spiritOpponent(){return target&&fighter(target)&&target.hp>0&&target.dead<=time&&Math.hypot(target.x-s.x,target.y-s.y)<=6&&lineOfSight(s.x,s.y,target.x,target.y)?target:null;}
function renderSpirits(){
 const choices=$('spiritChoices');choices.innerHTML='';
 for(const [id,def]of Object.entries(SPIRITS)){const b=document.createElement('button');b.className=id===selectedSpirit?'chosen':'';b.textContent=def.name;b.setAttribute('aria-pressed',String(id===selectedSpirit));const state=document.createElement('small');state.textContent=!s.spirits[id]?'Undiscovered':s.spirits[id].state==='set'?'Active':s.spirits[id].state==='standby'?'Standby':'Recovering';b.appendChild(state);b.onclick=()=>{selectedSpirit=id;renderSpirits();};choices.appendChild(b);}
 const def=SPIRITS[selectedSpirit],owned=s.spirits[selectedSpirit];$('spiritName').textContent=def.name+' · '+def.element;
 const g=$('spiritPortrait').getContext('2d');g.clearRect(0,0,160,160);if(assetsReady)sprite(g,'spirits',def.icon,80,155,140,140);
 $('spiritDescription').textContent=owned?def.bonus+' '+def.ability+'.':def.hint;
 $('spiritState').textContent=!owned?'Not discovered':owned.state==='set'?'Active · bonus applied':owned.state==='standby'?'Standby · ready for convergence':'Recovering · '+Math.ceil(owned.recovery)+' seconds of adventuring';
 const actions=$('spiritActions');actions.innerHTML='';
 if(owned?.state==='set'){
  const b=document.createElement('button');b.textContent='Unleash';b.onclick=()=>unleashSpirit(selectedSpirit);actions.appendChild(b);
  const standby=document.createElement('button');standby.textContent='Standby';standby.onclick=()=>{owned.state='standby';s.hp=Math.min(s.hp,maxhp());renderUI();renderSpirits();save();};actions.appendChild(standby);
 }else if(owned?.state==='standby'){
  const reset=document.createElement('button');reset.textContent='Activate · 12s recovery';reset.onclick=()=>{owned.state='recovery';owned.recovery=12;renderSpirits();save();};actions.appendChild(reset);
 }
 const n=Object.values(s.spirits).filter(x=>x.state==='standby').length;$('summonSpirits').disabled=n<2;$('summonSpirits').textContent='Elemental convergence · '+n+' / 2+ standby';
}
function unleashSpirit(id){
 const owned=s.spirits[id],def=SPIRITS[id];if(!owned||owned.state!=='set')return false;
 const enemy=spiritOpponent();if(def.power&&!enemy){$('spiritState').textContent='Close this panel and select a nearby enemy first.';return false;}
 if(id==='brook'&&s.hp>=maxhp()){$('spiritState').textContent='Your health is already full.';return false;}
 owned.state='standby';s.hp=Math.min(s.hp,maxhp());
 if(id==='brook'){const healed=Math.min(20,maxhp()-s.hp);s.hp+=healed;floating('+'+healed,px,py,'#9ee5ff');}
 if(id==='cairn')stoneWard=8;
 if(def.power)resolveHit(enemy,def.power+lv('Worship'),'worship',id==='zephyr'?3:0);
 spiritEffect={icon:def.icon,color:def.color,age:0,duration:1.3,large:false,x:px,y:py};$('spiritsDialog').close();renderUI();save();return true;
}
function summonSpirits(){
 const ready=Object.entries(s.spirits).filter(([,v])=>v.state==='standby'),enemy=spiritOpponent();
 if(ready.length<2)return false;if(!enemy){$('spiritState').textContent='Select a nearby enemy before summoning.';return false;}
 for(const [,value]of ready){value.state='recovery';value.recovery=30;}
 const x=enemy.x,y=enemy.y,damage=ready.length*12+lv('Worship')*2;
 const victims=objects.filter(o=>fighter(o)&&o.hp>0&&o.dead<=time&&(o===enemy||o.type==='enemy')&&Math.hypot(o.x-x,o.y-y)<=2.5&&lineOfSight(x,y,o.x,o.y));
 for(const o of victims)resolveHit(o,damage,'worship');
 spiritEffect={icon:SPIRITS[ready[0][0]].icon,color:'#e5c8ff',age:0,duration:2,large:true,x,y};$('spiritsDialog').close();renderUI();save();return true;
}
function updateSpirits(dt){
 stoneWard=Math.max(0,stoneWard-dt);let changed=false;
 for(const value of Object.values(s.spirits||{}))if(value.state==='recovery'){value.recovery=Math.max(0,value.recovery-dt);if(value.recovery===0){value.state='set';changed=true;}}
 if(spiritEffect){spiritEffect.age+=dt;if(spiritEffect.age>=spiritEffect.duration)spiritEffect=null;}
 spiritTick+=dt;if(changed){renderUI();save();toast('A spirit recovered and is active again.');}if(spiritTick>1){spiritTick=0;if($('spiritsDialog').open)renderSpirits();}
}
function drawSpiritEffect(){
 if(!spiritEffect)return;const e=spiritEffect,t=e.age/e.duration,x=(e.x+.5)*TILE-camera.x,y=(e.y+.5)*TILE-camera.y;
 ctx.save();ctx.globalAlpha=Math.sin(t*Math.PI);ctx.strokeStyle=e.color;ctx.lineWidth=e.large?4:2;ctx.shadowColor=e.color;ctx.shadowBlur=15;ctx.beginPath();ctx.ellipse(x,y,20+t*(e.large?100:35),10+t*30,0,0,Math.PI*2);ctx.stroke();sprite(ctx,'spirits',e.icon,x,y-10-t*35,e.large?110:65,e.large?120:70);ctx.restore();
}
