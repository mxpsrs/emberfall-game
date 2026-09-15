'use strict';
// Portraits and elemental bonds only: there are no spirit actors in the world.
const SPIRITS={
 cinder:{name:'Cinder',element:'Fire',icon:0,color:'#ffad67',skill:'Firemaking',bonus:'Adds 2 melee and magic damage.',passive:{melee:2,magic:2},ability:'Flare · a focused fire strike',power:14},
 brook:{name:'Brook',element:'Water',icon:1,color:'#8bdaff',skill:'Fishing',bonus:'While active: +8 maximum health above your Hitpoints level. This bonus pauses during its automatic cooldown.',passive:{health:8},ability:'Mending tide · heal up to 20 health',heal:20},
 zephyr:{name:'Zephyr',element:'Air',icon:2,color:'#b9eddb',skill:'Woodcutting',bonus:'Adds 2 ranged damage.',passive:{ranged:2},ability:'Gust · wind strike and 3 seconds of slow',power:10,slow:3},
 cairn:{name:'Cairn',element:'Earth',icon:3,color:'#dac099',skill:'Mining',bonus:'Adds 2 armor.',passive:{armor:2},ability:'Stoneguard · +4 armor for 8 seconds',ward:8},
 pyre:{name:'Pyre',element:'Fire',icon:4,color:'#ff7953',skill:'Firemaking',twin:'cinder',bonus:'Adds 1 melee and magic damage.',passive:{melee:1,magic:1},ability:'Emberburst · fire damage in a small area',power:11,area:2},
 rill:{name:'Rill',element:'Water',icon:5,color:'#65cfe9',skill:'Fishing',twin:'brook',bonus:'Adds 1 armor.',passive:{armor:1},ability:'Renewal · restore up to 24 health over 12 seconds',renewal:12},
 gale:{name:'Gale',element:'Air',icon:6,color:'#d3fff4',skill:'Woodcutting',twin:'zephyr',bonus:'Adds 1 ranged damage.',passive:{ranged:1},ability:'Second wind · restore 35 run energy',energy:35},
 flint:{name:'Flint',element:'Earth',icon:7,color:'#e6bb6b',skill:'Mining',twin:'cairn',bonus:'Adds 1 armor.',passive:{armor:1},ability:'Faultline · earth strike and 6 seconds of slow',power:9,slow:6}
};
const FIRST_SPIRITS=['cinder','brook','zephyr','cairn'];
const SPIRIT_SKILLS={Firemaking:'cinder',Fishing:'brook',Woodcutting:'zephyr',Mining:'cairn'};
const SPIRIT_FIRST_CHANCE=1/12,SPIRIT_TWIN_CHANCE=1/2000;
for(const [id,d]of Object.entries(SPIRITS))d.hint=d.twin?'Rare twin of '+SPIRITS[d.twin].name+'. After finding '+SPIRITS[d.twin].name+', each successful '+d.skill+' action from level 11 has a 1 in 2,000 chance. No guaranteed drop.':'Choose at Keeper Sera’s shrine, or discover through '+d.skill+'. After your first bond: 1 in 12 per successful action, guaranteed on a successful action at level 10 or above.';
let selectedSpirit='cinder',spiritEffect=null,stoneWard=0,spiritTick=0,spiritBondEffect=null,spiritRenewal=0,spiritRenewalTick=0;
let spiritWorldSlotsReserved=false;
function spiritCooldown(id){return SPIRITS[id]?.twin?45:30;}
function spiritRemaining(id){
 const v=s.spirits?.[id];if(!v)return 0;
 if(v.state==='standby'){v.state='set';v.recovery=0;}
 if(v.state==='recovery'){
  if(!Number.isFinite(v.readyAt))v.readyAt=Date.now()+Math.max(0,Number(v.recovery)||0)*1000;
  v.recovery=Math.max(0,(v.readyAt-Date.now())/1000);
  if(v.recovery===0){v.state='set';delete v.readyAt;}
 }
 return v.state==='recovery'?v.recovery:0;
}
function spiritBonus(kind){return Object.entries(SPIRITS).reduce((n,[id,d])=>n+(s.spirits?.[id]&&!spiritRemaining(id)?(d.passive[kind]||0):0),kind==='armor'&&stoneWard>0?4:0);}
function spiritHasBond(){return Object.keys(SPIRITS).some(id=>s.spirits?.[id]);}
function setupSpirits(){
 s.spirits=s.spirits||{};
 // Keep historical IDs of subsequent tutors/resources stable across publication.
 if(!spiritWorldSlotsReserved){serial+=4;spiritWorldSlotsReserved=true;}
 for(const world of Object.values(worldScenes))for(let i=world.objects.length-1;i>=0;i--)if(world.objects[i].type==='spirit')world.objects.splice(i,1);
 for(let i=objects.length-1;i>=0;i--)if(objects[i].type==='spirit')objects.splice(i,1);
 $('spiritButton').onclick=openSpirits;$('closeSpirits').onclick=()=>{$('spiritsDialog').close();save();};
 $('summonSpirits').onclick=summonSpirits;$('spiritsDialog').addEventListener('close',()=>{$('spiritButton').setAttribute('aria-pressed','false');});
}
function spiritPortraitMarkup(id){const d=SPIRITS[id],url=typeof realmAssetURL==='function'?realmAssetURL('assets/spirit-portraits.png'):'assets/spirit-portraits.png';return '<span class="spirit-art" aria-hidden="true" style="background-image:url('+url+');background-position:'+(d.icon%4/3*100)+'% '+(d.icon<4?0:100)+'%"></span>';}
function chooseFirstSpirit(id){
 if(!FIRST_SPIRITS.includes(id)||spiritHasBond()||tutorialStep()?.event!=='spirit')return false;
 const tutor=tutorialTutor('worship');if(currentScene!=='tutorial'||!tutor||Math.hypot(px-tutor.x,py-tutor.y)>3)return false;
 close();stop();return bondSpirit(id,'tutor');
}
function openFirstSpiritChoice(){
 if(spiritHasBond()){tutorialEvent('spirit');openSpirits();return;}
 if(tutorialStep()?.event!=='spirit')return;
 close();dialogBeforePortrait('Choose your first spirit','<p>Keeper Sera: “Choose the element you want beside you. You can find the other three by practising their skills.”</p><div class="first-spirit-choices">'+FIRST_SPIRITS.map(id=>{const d=SPIRITS[id];return '<button type="button" data-spirit-choice="'+id+'" style="--spirit-color:'+d.color+'">'+spiritPortraitMarkup(id)+'<strong>'+d.name+' · '+d.element+'</strong><span>'+d.bonus+'</span><small>'+d.ability+'</small><b>Bond with '+d.name+'</b></button>';}).join('')+'</div><p>Your choice joins your spirit party immediately. Manage its bonus and ability in Spirits.</p>');
 for(const b of $('modalBody').querySelectorAll('[data-spirit-choice]'))b.onclick=()=>chooseFirstSpirit(b.dataset.spiritChoice);
}
function bondSpirit(id,source){
 const d=SPIRITS[id];if(!d||s.spirits?.[id])return false;
 s.spirits??={};s.spirits[id]={state:'set',recovery:0,source,discoveredAt:Date.now()};selectedSpirit=id;
 gain('Worship',20);if(source==='tutor')s.firstSpirit=id;
 tutorialEvent('spirit');spiritBondEffect={id,scene:currentScene,x:px,y:py,age:0,duration:3.2};
 const old=$('spiritDiscovery');if(old)old.remove();
 const banner=document.createElement('div');banner.id='spiritDiscovery';banner.setAttribute('role','status');banner.style.setProperty('--spirit-color',d.color);
 banner.innerHTML=spiritPortraitMarkup(id)+'<div><small>'+(d.twin?'RARE TWIN DISCOVERED':'ELEMENTAL BOND FORMED')+'</small><strong>'+d.name+' · '+d.element+'</strong><span>Joined your party · +20 Worship XP</span></div>';
 document.body.appendChild(banner);setTimeout(()=>banner.remove(),6500);
 if(typeof playSpiritBondSound==='function')playSpiritBondSound(d.element);
 toast(d.name+' has joined your spirit party! '+d.bonus);renderUI();save();return true;
}
// Called only by successful resource/fire completion and committed shared receipts.
// Quest XP, failed attempts, opening menus and clicks never roll for spirits.
function discoverSkillSpirit(skill){
 const first=SPIRIT_SKILLS[skill];if(!first||!spiritHasBond())return null;
 if(!s.spirits[first]){if(lv(skill)>=10||Math.random()<SPIRIT_FIRST_CHANCE){bondSpirit(first,skill);return first;}return null;}
 const twin=Object.keys(SPIRITS).find(id=>SPIRITS[id].twin===first);
 if(lv(skill)>=11&&!s.spirits[twin]&&Math.random()<SPIRIT_TWIN_CHANCE){bondSpirit(twin,skill);return twin;}return null;
}
let spiritQuickOpen=false;
function openSpirits(){
 if(spiritHasBond())tutorialEvent('spirit');
 spiritQuickOpen=true;socialRoot.hidden=false;socialRoot.classList.add('spirit-quick-open');
 $('spiritButton').setAttribute('aria-pressed','true');renderSpirits();
}
function closeSpiritChoices(){spiritQuickOpen=false;socialRoot.classList.remove('spirit-quick-open');$('spiritQuickPanel')?.remove();$('spiritButton').setAttribute('aria-pressed','false');}
function spiritOpponent(){return target&&fighter(target)&&target.hp>0&&target.dead<=time&&Math.hypot(target.x-s.x,target.y-s.y)<=6&&lineOfSight(s.x,s.y,target.x,target.y)?target:null;}
function renderSpirits(){
 if(!spiritQuickOpen)return;
 let panel=$('spiritQuickPanel');if(!panel){panel=document.createElement('section');panel.id='spiritQuickPanel';panel.setAttribute('aria-label','Unleash a spirit');socialRoot.appendChild(panel);}
 panel.innerHTML='<header><strong>Unleash a spirit</strong><span>Automatic recovery · 30s / twins 45s</span><button type="button" id="closeSpiritQuick">Back to chat</button></header><div class="quick-spirit-grid"></div><p id="spiritQuickHelp" role="status">Choose a ready spirit. Combat continues.</p>';
 $('closeSpiritQuick').onclick=closeSpiritChoices;
 const grid=panel.querySelector('.quick-spirit-grid');
 for(const [id,d]of Object.entries(SPIRITS)){
  const owned=s.spirits?.[id],remaining=spiritRemaining(id),b=document.createElement('button');b.type='button';b.dataset.spirit=id;
  b.style.setProperty('--spirit-color',d.color);b.className='quick-spirit'+(!owned?' undiscovered':'');b.disabled=!owned||remaining>0;
  b.innerHTML=spiritPortraitMarkup(id)+'<span>'+d.name+'</span><small>'+(remaining?Math.ceil(remaining)+'s':owned?'Unleash':'Not found')+'</small>';
  const info=d.name+' · '+d.element+(d.twin?' · Rare twin':'')+'. '+(owned?d.ability+'. '+d.bonus+' '+spiritCooldown(id)+' second cooldown.':d.hint);
  b.title=info;b.setAttribute('aria-label',info);b.onpointerenter=b.onfocus=()=>{$('spiritQuickHelp').textContent=info;};
  b.onclick=()=>{selectedSpirit=id;if(unleashSpirit(id))renderSpirits();};grid.appendChild(b);
 }
 const combo=document.createElement('button');combo.type='button';combo.className='spirit-convergence';combo.textContent='Convergence';combo.title='Combine all ready spirits in an area attack. Each begins its own cooldown.';combo.disabled=Object.keys(SPIRITS).filter(id=>s.spirits?.[id]&&!spiritRemaining(id)).length<2;combo.onclick=()=>{if(summonSpirits())renderSpirits();};grid.appendChild(combo);
}
function refreshSpiritTimers(){
 if(!spiritQuickOpen)return;
 for(const b of $('spiritQuickPanel')?.querySelectorAll('[data-spirit]')||[]){const id=b.dataset.spirit,remaining=spiritRemaining(id),owned=s.spirits?.[id];b.disabled=!owned||remaining>0;const label=b.querySelector('small');if(label)label.textContent=remaining?Math.ceil(remaining)+'s':owned?'Unleash':'Not found';}
 const combo=$('spiritQuickPanel')?.querySelector('.spirit-convergence');if(combo)combo.disabled=Object.keys(SPIRITS).filter(id=>s.spirits?.[id]&&!spiritRemaining(id)).length<2;
}
function spiritMaxHit(power,convergence=false){return power+Math.floor(lv('Worship')*(convergence?.4:.2));}
function spiritDamage(enemy,maxHit){return Math.random()<playerAccuracy(enemy,'worship')?Math.floor(Math.random()*(maxHit+1)):0;}
function unleashSpirit(id){return false;} // Caster animation implementation in guardian-spirits.js.
function summonSpirits(){return false;}
function updateSpirits(dt){
 stoneWard=Math.max(0,stoneWard-dt);let changed=false;
 for(const [id,value]of Object.entries(s.spirits||{}))if(SPIRITS[id]&&value.state==='recovery'){if(spiritRemaining(id)===0)changed=true;}

 if(spiritBondEffect){spiritBondEffect.age+=dt;if(spiritBondEffect.age>=spiritBondEffect.duration||spiritBondEffect.scene!==currentScene)spiritBondEffect=null;}
 if(spiritRenewal>0){const active=Math.min(dt,spiritRenewal);spiritRenewal-=active;spiritRenewalTick+=active;while(spiritRenewalTick>=1){spiritRenewalTick-=1;const heal=Math.min(2,maxhp()-s.hp);if(heal>0&&s.hp>0){s.hp+=heal;floating('+'+heal,px,py,SPIRITS.rill.color);changed=true;}}}
 spiritTick+=dt;if(changed){renderUI();save();}if(spiritTick>.2){spiritTick=0;refreshSpiritTimers();}
}
function drawSpiritEffect(){
 const e=spiritEffect||spiritBondEffect;if(!e)return;const d=e.id?SPIRITS[e.id]:null,t=e.age/e.duration,x=(e.x+.5)*TILE-camera.x,y=(e.y+.5)*TILE-camera.y;
 ctx.save();ctx.globalAlpha=Math.sin(t*Math.PI);ctx.strokeStyle=d?.color||e.color;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,20+t*50,10+t*25,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
