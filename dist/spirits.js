'use strict';
// Portraits and elemental bonds only: there are no spirit actors in the world.
const SPIRITS={
 cinder:{name:'Cinder',element:'Fire',icon:0,color:'#ffad67',skill:'Firemaking',ability:'Flare · a focused fire strike',power:14},
 brook:{name:'Brook',element:'Water',icon:1,color:'#8bdaff',skill:'Fishing',ability:'Mending tide · heal up to 20 health',heal:20},
 zephyr:{name:'Zephyr',element:'Air',icon:2,color:'#b9eddb',skill:'Woodcutting',ability:'Gust · wind strike and 3 seconds of slow',power:10,slow:3},
 cairn:{name:'Cairn',element:'Earth',icon:3,color:'#dac099',skill:'Mining',ability:'Stoneguard · +4 armor for 8 seconds',ward:8},
 pyre:{name:'Pyre',element:'Fire',icon:4,color:'#ff7953',skill:'Firemaking',twin:'cinder',ability:'Emberburst · fire damage in a small area',power:11,area:2},
 rill:{name:'Rill',element:'Water',icon:5,color:'#65cfe9',skill:'Fishing',twin:'brook',ability:'Renewal · restore up to 24 health over 12 seconds',renewal:12},
 gale:{name:'Gale',element:'Air',icon:6,color:'#d3fff4',skill:'Woodcutting',twin:'zephyr',ability:'Second wind · restore 35 run energy',energy:35},
 flint:{name:'Flint',element:'Earth',icon:7,color:'#e6bb6b',skill:'Mining',twin:'cairn',ability:'Faultline · earth strike and 6 seconds of slow',power:9,slow:6}
};
const FIRST_SPIRITS=['cinder','brook','zephyr','cairn'];
const SPIRIT_SKILLS={Firemaking:'cinder',Fishing:'brook',Woodcutting:'zephyr',Mining:'cairn'};
const SPIRIT_FIRST_CHANCE=1/12,SPIRIT_TWIN_CHANCE=1/2000;
// Pure build rules are exported verbatim for authoritative shared combat.
function spiritAttuned(state){return SPIRITS[state.attunedSpirit]&&state.spirits?.[state.attunedSpirit]?state.attunedSpirit:state.spirits?.[state.firstSpirit]?state.firstSpirit:Object.keys(SPIRITS).find(id=>state.spirits?.[id])||null;}
function spiritBondRank(state,id,worship){const xp=Math.max(0,Number(state.spirits?.[id]?.bondXP)||0);return xp>=240&&worship>=12?3:xp>=80&&worship>=5?2:1;}
function spiritBuild(state,worship){
 const id=spiritAttuned(state),rank=spiritBondRank(state,id,worship);
 return {id,rank,armor:id==='cairn'?3+rank:id==='flint'?2:id==='rill'?(rank>=2?2:1):0,health:id==='brook'?3+rank:0,aim:id==='zephyr'?3+rank:id==='gale'?2:0,runCost:id==='zephyr'?.85:id==='gale'?.8:1};
}
function spiritStrike(state,worship,memory,damage,style,now){
 const build=spiritBuild(state,worship),id=build.id;
 const out={damage,heal:0,energy:0,slow:0,proc:null,spirit:id,memory};
 if(!id||damage<=0||!['melee','ranged','magic'].includes(style))return out;
 const old=memory?.id===id&&now-memory.at<12000?memory:{id,hits:0,style:null,procAt:-100000};
 const m=out.memory={...old,hits:old.hits+1,style,at:now},strong=build.rank===3?2:1;
 if(id==='cinder'&&m.hits%4===0){out.damage+=strong;out.proc='Kindle';}
 if(id==='brook'&&m.hits%5===0){out.heal=strong;out.proc='Undertow';}
 if(id==='rill'&&m.hits%4===0){out.heal=strong;out.proc='Quiet current';}
 if(id==='gale'&&m.hits%4===0){out.energy=3+build.rank;out.proc='Slipstream';}
 if(id==='flint'&&m.hits%5===0){out.damage+=1+strong;out.slow=1;out.proc='Fault';}
 if(id==='pyre'&&old.style&&old.style!==style&&now-old.procAt>=6000){out.damage+=strong;m.procAt=now;out.proc='Crossfire';}
 return out;
}
function spiritGuard(state,worship,damage){const b=spiritBuild(state,worship);return b.id==='cairn'&&damage>=(b.rank===3?3:4)?damage-1:damage;}
const SPIRIT_IDENTITIES={
 cinder:['Kindle','Every fourth damaging weapon hit on the same foe deals +1 damage (+2 at bond III).'],
 brook:['Undertow','+4 maximum health, rising to +6. Every fifth damaging weapon hit heals 1 (+2 at bond III).'],
 zephyr:['Farwind','15% less run energy used. At least 3 tiles away, ranged and magic gain +4 accuracy, rising to +6.'],
 cairn:['Bedrock','+4 armour, rising to +6. Hits of 4 or more deal 1 less damage (3 or more at bond III).'],
 pyre:['Crossfire','Switching between melee, ranged and magic damaging hits adds +1 damage (+2 at bond III), at most once per 6 seconds.'],
 rill:['Quiet current','+1 armour (+2 at bond II). Every fourth damaging weapon hit on the same foe restores 1 health (+2 at bond III).'],
 gale:['Slipstream','20% less run energy used; +2 accuracy from 3 tiles. Every fourth damaging weapon hit restores 4–6 run energy.'],
 flint:['Fault','+2 armour. Every fifth damaging weapon hit adds +2 damage (+3 at bond III) and slows its target for 1 second.']
};
for(const [id,[identity,bonus]]of Object.entries(SPIRIT_IDENTITIES)){Object.assign(SPIRITS[id],{identity,bonus,passive:{}});}
function attuneSpirit(id){
 if(!s.spirits?.[id]||!SPIRITS[id])return false;
 if((target&&fighter(target))||time-Math.max(lastAttack,playerHitAt)<5||typeof tradeCombatActive==='function'&&tradeCombatActive()||window.playerTrade){toast('Leave combat for five seconds before changing your attunement.');return false;}
 if(spiritAttuned(s)===id)return true;
 s.attunedSpirit=id;s.spiritProgressVersion=1;s.hp=Math.min(s.hp,maxhp());spiritBondEffect={id,scene:currentScene,x:px,y:py,age:0,duration:1.8};
 toast('Attuned to '+SPIRITS[id].name+' · '+SPIRITS[id].identity);renderUI();save();return true;
}
function advanceSpiritBond(source,amount=1,id=spiritAttuned(s)){
 if(!SPIRITS[id]||!s.spirits?.[id]||source!=='combat'&&source!=='worship'&&SPIRITS[id].skill!==source)return;
 const v=s.spirits[id],before=spiritBondRank(s,id,lv('Worship'));v.bondXP=Math.min(240,Math.max(0,Number(v.bondXP)||0)+amount);
 if(source!=='worship')gain('Worship',1,true);
 if(spiritBondRank(s,id,lv('Worship'))>before)toast(SPIRITS[id].name+' bond deepened.');
}
function applySpiritStrikeFeedback(effect,enemy){
 if(!effect)return;if(effect.heal)s.hp=Math.min(maxhp(),s.hp+effect.heal);if(effect.energy)s.runEnergy=Math.min(100,(s.runEnergy??100)+effect.energy);
 if(effect.proc){const d=SPIRITS[effect.spirit];floating(effect.proc,px,py,d?.color||'#bcdeff');spiritBondEffect={id:effect.spirit,scene:currentScene,x:px,y:py,age:0,duration:.75};}
 if(effect.damage>0)advanceSpiritBond('combat',1,effect.spirit);
}
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
function spiritBonus(kind){return (spiritBuild(s,lv('Worship'))[kind]||0)+(kind==='armor'&&stoneWard>0?4:0);}
function spiritHasBond(){return Object.keys(SPIRITS).some(id=>s.spirits?.[id]);}
function setupSpirits(){
 s.spirits=s.spirits||{};s.attunedSpirit=spiritAttuned(s);s.spiritProgressVersion=1;
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
 s.spirits??={};s.spirits[id]={state:'set',recovery:0,source,discoveredAt:Date.now(),bondXP:0};selectedSpirit=id;if(!s.attunedSpirit||!s.spirits[s.attunedSpirit])s.attunedSpirit=id;
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
 advanceSpiritBond(skill,2);
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
 panel.innerHTML='<header><strong>Unleash a spirit</strong><span>Passives stay active · 30s / twins 45s</span><button type="button" id="closeSpiritQuick">Back to chat</button></header><div class="quick-spirit-grid"></div><p id="spiritQuickHelp" role="status">Unleash any ready Spirit. Your attuned passive remains active; combat continues.</p>';
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
 const combo=document.createElement('button');combo.type='button';combo.className='spirit-convergence';combo.textContent='Convergence';combo.title='Combine up to two ready Spirits in an area attack, prioritizing your attunement. Each begins its own cooldown.';combo.disabled=Object.keys(SPIRITS).filter(id=>s.spirits?.[id]&&!spiritRemaining(id)).length<2;combo.onclick=()=>{if(summonSpirits())renderSpirits();};grid.appendChild(combo);
}
function refreshSpiritTimers(){
 updateSpiritHud();
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

function spiritBondDescription(id){const rank=spiritBondRank(s,id,lv('Worship')),xp=Math.max(0,Number(s.spirits?.[id]?.bondXP)||0);return 'Bond '+['','I','II','III'][rank]+' · '+Math.min(240,xp)+'/240 resonance'+(rank===3?' · Fully attuned':rank===1?' · Next: 80 resonance + Worship 5':' · Next: 240 resonance + Worship 12');}
function renderSpiritBuildPanel(){
 pageControls(1,1);const p=$('panel');p.replaceChildren();classicHeading('Spirit attunement');
 const intro=document.createElement('p');intro.className='desc';intro.textContent='Weapon + stats + one attuned Spirit. Passives stay active during Unleash recovery. Change attunement after five seconds out of combat.';p.appendChild(intro);
 const active=spiritAttuned(s);if(!s.spirits?.[selectedSpirit])selectedSpirit=active||FIRST_SPIRITS[0];
 const grid=document.createElement('div');grid.className='classic-spirit-grid spirit-build-grid';
 for(const [id,d]of Object.entries(SPIRITS)){const b=document.createElement('button');b.type='button';b.dataset.bond=id;b.setAttribute('aria-pressed',String(selectedSpirit===id));b.setAttribute('aria-label',d.name+' · '+(s.spirits?.[id]?(id===active?'Attuned':'Discovered'):'Undiscovered'));b.style.setProperty('--spirit-color',d.color);b.innerHTML=spiritPortraitMarkup(id)+'<span>'+d.name+'</span><small>'+(id===active?'Attuned':d.twin?'Rare twin':d.element)+'</small>';b.onclick=()=>{selectedSpirit=id;renderSpiritBuildPanel();};grid.appendChild(b);}
 p.appendChild(grid);const id=selectedSpirit,d=SPIRITS[id],owned=s.spirits?.[id],detail=document.createElement('section');detail.className='spirit-build-detail';detail.style.setProperty('--spirit-color',d.color);
 detail.innerHTML='<h3>'+d.name+' / '+d.identity+'</h3><p><b>Passive while attuned</b><br>'+d.bonus+'</p><p><b>Unleash · '+spiritCooldown(id)+'s recovery</b><br>'+d.ability+'</p><p>'+(owned?spiritBondDescription(id):d.hint)+'</p>';
 if(owned){const meter=document.createElement('meter');meter.min=0;meter.max=240;meter.value=owned.bondXP||0;meter.setAttribute('aria-label',d.name+' bond resonance');detail.appendChild(meter);const bind=classicButton(id===active?'Attuned to '+d.name:'Attune '+d.name,()=>{if(attuneSpirit(id))renderSpiritBuildPanel();});bind.disabled=id===active;detail.appendChild(bind);detail.appendChild(classicButton('Unleash '+d.name,()=>{unleashSpirit(id);renderSpiritBuildPanel();},'spirit'));}
 p.appendChild(detail);const loop=document.createElement('p');loop.className='desc';loop.textContent='Deepen the attuned bond: damaging weapon hits +1 resonance; matching '+d.skill+' successes +2; completed remembrance +4. Combat and matching gathering also grant +1 Worship XP. Hits reset after 12 seconds away from that foe; misses never trigger a passive.';p.appendChild(loop);
}
function updateSpiritHud(){
 const hud=$('spiritBuildHud');if(!hud)return;const id=spiritAttuned(s),d=SPIRITS[id],rank=spiritBondRank(s,id,lv('Worship')),remaining=id?Math.ceil(spiritRemaining(id)):0;
 const key=[id,rank,remaining,combatStyle()].join(':');if(hud.dataset.value===key)return;hud.dataset.value=key;hud.style.setProperty('--spirit-color',d?.color||'#99bccb');
 hud.innerHTML=(d?spiritPortraitMarkup(id):gameIcon('spirit'))+'<span><small>'+combatStyle()+' · '+(d?'BOND '+['','I','II','III'][rank]:'NO ATTUNEMENT')+'</small><strong>'+(d?d.name+' / '+d.identity:'Choose your Spirit')+'</strong><small>'+(!d?'No Spirit discovered':remaining?'Unleash ready in '+remaining+'s':'Unleash ready')+'</small></span>';hud.title=d?d.bonus:'Discover a Spirit through your apprenticeship or gathering.';hud.setAttribute('aria-label',d?'Spirit build: '+d.name+', '+d.identity+'. '+(remaining?remaining+' seconds until Unleash':'Unleash ready'):'Spirit build: no attunement');
}
