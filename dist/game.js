'use strict';
const $ = id => document.getElementById(id);
const W = 384, H = 256, TILE = 48, SAVE_KEY = 'emberfall-save-v1';
const defaults = () => ({
  x:14, y:17, hp:30, gold:0,
  xp:{Hitpoints:0,Attack:0,Strength:0,Defense:0,Worship:0,Magic:0,Ranged:0,Woodcutting:0,Mining:0,Fishing:0,Smithing:0,Firemaking:0,Cooking:0},
  combatSkillsVersion:1,meleeTraining:'balanced',rangedTraining:'focused',magicTraining:'focused',
  bag:{logs:0, ore:0, fish:3, fang:0, bones:0, arrows:60, runes:40},
  sword:0, quest:0, kills:0, boss:false, character:null,
  spirits:{}, tutorial:0, tutorialVersion:2, tutorialReward:false, spell:"spark",
  runEnabled:false,runEnergy:100,bank:{},
  gear:{bronzeSword:1,shortbow:1,oakStaff:1,leatherArmor:1,leatherBoots:1},
  equipment:{weapon:"bronzeSword",head:null,body:"leatherArmor",shield:null,feet:"leatherBoots"}
});
let s = defaults();
const lv = skill => skill==='Combat'?combatLevel():1+Math.floor(Math.sqrt(Math.max(0,Number(s.xp[skill])||0)/35));
const maxhp = () => 30 + (lv('Hitpoints') - 1) * 6 + spiritBonus('health');
s.hp = Math.max(1, Math.min(s.hp, maxhp()));
s.quest = Math.max(0, Math.min(5, s.quest));
s.tutorial = Math.max(0, Math.floor(Number(s.tutorial)||0));
if (s.character) s.character.look = Math.max(0, Math.min(3, Number(s.character.look) || 0));
const objects = [], buildings = [];
let serial = 0;
function add(type, x, y, name, sprite, extra={}) {
  const o = {id:serial++, type, x, y, homeX:x, homeY:y, drawX:x, drawY:y, name, sprite, dead:0, hitAt:-100, attackAt:-100, ...extra};
  objects.push(o); return o;
}
[[3,4],[6,5],[8,3],[4,8],[7,9],[9,7],[3,12],[6,13],[8,11],[10,4],[2,6],[10,18],[4,28],[7,30]].forEach(([x,y]) => add('tree',x,y,'Oak tree',4));
[[22,4],[25,5],[26,8],[23,9],[21,7],[27,3],[13,20]].forEach(([x,y]) => add('ore',x,y,'Iron deposit',6));
[[2,20],[5,19],[8,24],[8,21]].forEach(([x,y]) => add('fish',x,y,'Fishing spot',9));
for(const [role,x,y]of [['tree',10,18],['ore',13,20],['fish',8,21]])objects.find(o=>o.x===x&&o.y===y).tutorialRole=role;
const elderObj = add('elder',14,15,'Elder Rowan',4);
const campObj = add('camp',12,17,'Campfire',7);
const shopObj = add('shop',17,15,'Mara the merchant',5);
const forgeObj = add('forge',20,15,'Village forge',8);
const innObj = add('inn',11,15,'The Wayfarer’s Rest',13);
buildings.push(
  {x:10,y:12,w:3,h:3,sprite:0,name:'Wayfarer’s Rest',service:innObj},
  {x:16,y:12,w:3,h:3,sprite:2,name:'Mara’s General Store',service:shopObj},
  {x:19,y:11,w:3,h:4,sprite:1,name:'Briarhaven Smithy',service:forgeObj},
  {x:13,y:5,w:4,h:2,sprite:3,name:'Hollow Gate',arch:true,service:null}
);
const species = {
  wolf:{name:'Briar wolf',sprite:10,hp:16,atk:2,spread:2,xp:24,coins:7,level:2,loot:'fang'},
  goblin:{name:'Goblin scavenger',sprite:8,hp:21,atk:3,spread:2,xp:30,coins:9,level:3,loot:'bones'},
  slime:{name:'Marsh slime',sprite:9,hp:10,atk:1,spread:1,xp:12,coins:4,level:1},
  skeleton:{name:'Restless skeleton',sprite:11,hp:30,atk:4,spread:2,xp:42,coins:13,level:5,loot:'bones'},
  bandit:{name:'Road bandit',sprite:13,hp:36,atk:4,spread:3,xp:48,coins:17,level:6},
  rat:{name:'Giant rat',sprite:15,hp:8,atk:1,spread:1,xp:8,coins:2,level:1},
  man:{name:'Man',sprite:6,hp:12,atk:1,spread:2,xp:14,coins:5,level:1},
  dummy:{name:'Training dummy',sprite:14,hp:12,atk:1,spread:0,xp:6,coins:0,level:1},
  king:{name:'The Hollow King',sprite:12,hp:90,atk:5,spread:4,xp:180,coins:80,level:10}
};
function spawn(kind,x,y,extra={}) {
  const spec=species[kind];
  return add(kind==='king'?'boss':kind==='man'?'man':kind==='dummy'?'dummy':'enemy',x,y,spec.name,spec.sprite,{...spec,kind,maxhp:spec.hp,...extra});
}
[[20,23],[23,22],[25,20],[21,26],[26,25]].forEach(([x,y])=>spawn('wolf',x,y));
[[25,14],[28,16],[30,19],[32,15]].forEach(([x,y])=>spawn('goblin',x,y));
[[10,26],[12,29],[5,29]].forEach(([x,y])=>spawn('slime',x,y));
[[11,4],[19,4],[20,2]].forEach(([x,y])=>spawn('skeleton',x,y));
[[29,28],[32,30]].forEach(([x,y])=>spawn('bandit',x,y));
[[6,16],[8,17],[10,23]].forEach(([x,y])=>spawn('rat',x,y));
spawn('man',15,18,{name:'Man · farmhand',sprite:6});
spawn('man',19,18,{name:'Man · traveler',sprite:7});
spawn('man',14,23,{name:'Man · woodworker',sprite:6});
const dummyObj=spawn('dummy',16,19);
spawn('king',15,3);
const water=(x,y)=>expandedWater(x,y);
function inBuilding(b,x,y) {
  if(x<b.x||x>=b.x+b.w||y<b.y||y>=b.y+b.h)return false;
  return !b.arch || x===b.x || x===b.x+b.w-1;
}
const fighter=o=>o&&['enemy','boss','man','dummy'].includes(o.type);
let blocked=(x,y)=>worldWall(x,y)||water(x,y)||buildings.some(b=>inBuilding(b,x,y))||objects.some(o=>o.x===x&&o.y===y&&!fighter(o)&&!o.collected);
const land=(x,y)=>!blocked(x,y);
if((!s.sceneId||s.sceneId==='overworld')&&!land(s.x,s.y)){s.x=14;s.y=17;}
let px=s.x, py=s.y, path=[], target=null, elapsed=0, moveClock=0;
let tab='quests', floaters=[], time=0, camera={x:0,y:0}, screen={w:0,h:0}, last=0, toastUntil=0, saveClock=0;
let facing=1, lastAttack=-100, assetsReady=false, selectedLook=s.character?.look||0, editingCharacter=false, hitboxes=[];
const canvas=$('world'), ctx=canvas.getContext('2d');
const art={};
const looks=[{name:'Blue wanderer',description:'Short brown hair, blue tunic'},{name:'Crimson wanderer',description:'Auburn ponytail, crimson tunic'},{name:'Emerald wanderer',description:'Short black hair, emerald tunic'},{name:'Violet wanderer',description:'Silver hair, violet tunic'}];
function save() {
  queueCloudSave();try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));$('saveStatus').textContent='Progress saved on this device';}
  catch{$('saveStatus').textContent='Saving unavailable in this browser';}
}
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;toastUntil=time+3.8;}
function gain(skill,n,quiet=false){if(skill==='Combat'){awardCombatDamage(Math.max(0,Math.floor(n/3)),'melee','balanced');if(!quiet)renderUI();return;}const before=lv(skill),healthBefore=maxhp();s.xp[skill]=(s.xp[skill]||0)+Math.max(0,n);if(lv(skill)>before){toast(skill+' level '+lv(skill)+'!');if(skill==='Hitpoints')s.hp=Math.min(maxhp(),s.hp+maxhp()-healthBefore);}if(!quiet)renderUI();}
function floating(text,x,y,color='#ffe2a1'){floaters.push({text,x,y,life:1.4,color});}
function stop(){if(typeof playerMotion!=='undefined')playerMotion.moving=false;target=null;path=[];elapsed=0;$('activity').style.width='0';renderAction();}
function route(tx,ty,adjacent=false,reach=1.45,startX=s.x,startY=s.y){
  const start=[startX,startY],open=[{x:startX,y:startY,g:0,f:0}],cost=new Map([[start.join(','),0]]),prev=new Map();let end=null;
  while(open.length){
    open.sort((a,b)=>a.f-b.f);const {x,y,g}=open.shift();if(g>cost.get(x+','+y))continue;
    if(adjacent?Math.hypot(x-tx,y-ty)<=reach+.01&&lineOfSight(x,y,tx,ty):x===tx&&y===ty){end=[x,y];break;}
    for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0],[-1,-1],[1,-1],[1,1],[-1,1]]){
      const nx=x+dx,ny=y+dy,k=nx+','+ny;
      if(!land(nx,ny)||(dx&&dy&&(!land(x+dx,y)||!land(x,y+dy))))continue;
      const next=g+Math.hypot(dx,dy);if(next<(cost.get(k)??Infinity)){cost.set(k,next);prev.set(k,[x,y]);open.push({x:nx,y:ny,g:next,f:next+Math.max(0,Math.hypot(tx-nx,ty-ny)-(adjacent?reach:0))});}
    }
  }
  if(!end)return null;const out=[];while(end[0]!==start[0]||end[1]!==start[1]){out.unshift(end);end=prev.get(end.join(','));}return out;
}
function select(o){
  if(o.dead>time||(o.type==='boss'&&s.boss)){toast(o.type==='boss'?'The Hollow King has fallen.':'They will return shortly.');return;}
  if(o.type==='man'){
    dialog(o.name,'An ordinary villager going about his day.<div class="npcdetails">Combat level '+o.level+' · '+o.maxhp+' HP<br>Drops coins when defeated.</div>',[
      ['Talk',()=>dialog(o.name,'“The goblins are gathering east of town. Mara sells food if you’re heading out.”')],
      ['Attack',()=>{close();engage(o);},'danger']
    ]);return;
  }
  engage(o);
}
function engage(o){const p=route(o.x,o.y,o.type!=='loot',fighter(o)?attackRange():1.45);if(!p){toast('There is no clear path to that spot.');return;}target=o;path=p;elapsed=0;enemyClock=0;retaliationClock=0;renderAction();if(!path.length&&(o.type!=='loot'||Math.hypot(px-s.x,py-s.y)<.02))arrive();}
function walkTo(x,y){
 x=Math.floor(x);y=Math.floor(y);const [w,h]=sceneSize();if(!Number.isFinite(x+y)||x<0||y<0||x>=w||y>=h)return false;
 let p=land(x,y)?route(x,y):null;
 if(p===null){const candidates=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=4&&land(x+dx,y+dy))candidates.push([x+dx,y+dy,Math.hypot(dx,dy)+Math.hypot(x+dx-px,y+dy-py)*.015]);candidates.sort((a,b)=>a[2]-b[2]);for(const [a,b]of candidates.slice(0,3)){p=route(a,b);if(p!==null)break;}}
 if(p===null){toast('That spot is out of reach.');return false;}stop();path=p;renderAction();return true;
}
function arrive(){
  if(!target)return;
  const o=target;
  if(handleWorldInteraction(o))return;
  if(['elder','camp','shop','forge','inn'].includes(o.type)){
    stop();
    if(o.type==='elder'){tutorialEvent('elder');elder();}
    if(o.type==='camp'){s.hp=maxhp();tutorialEvent('camp');toast('Rested by the campfire. Health restored.');renderUI();save();}
    if(o.type==='shop')shop();
    if(o.type==='forge')forge();
    if(o.type==='inn')inn();
  }else if(o.type==='boss'&&(!s.sword||lv('Combat')<3)){stop();toast('Bring an iron sword and reach Combat level 3 first.');}
  renderAction();
}
function renderAction(){
  const a=target;
  $('targetTitle').textContent=a?(path.length?'Walking to '+a.name:a.name):path.length?'Following the path':'Explore the borderlands';
  $('targetSub').textContent=a?(fighter(a)?combatStyle()+' · '+Math.max(0,a.hp)+' / '+a.maxhp+' HP · Eat to heal':{tree:'Chopping oak · Woodcutting XP',ore:'Mining iron · Mining XP',fish:'Catching trout · Fishing XP'}[a.type]||'Tap Stop to cancel'):path.length?'Tap Stop or another spot to change course.':'Tap a resource, building, person, or monster.';
}
function dialog(title,html,buttons=[]){
  stop();$('modalBody').innerHTML='';const h=document.createElement('h2');h.textContent=title;$('modalBody').appendChild(h);
  const body=document.createElement('div');body.className='dialogcopy';body.innerHTML=html;$('modalBody').appendChild(body);
  for(const [label,fn,style] of buttons){const b=document.createElement('button');b.className=style||'primary';b.textContent=label;b.onclick=fn;$('modalBody').appendChild(b);}
  if(!$('modal').open)$('modal').showModal();
}
function close(){$('modal').close();renderUI();save();}
const quests=[
  {title:'A village in need',desc:'Find Elder Rowan beside the village square to begin your adventure.'},
  {title:'Tools of the trade',desc:'Gather 5 oak logs, 5 iron ore, and 3 trout. Bring them to Elder Rowan.',checks:()=>[['Oak logs',s.bag.logs,5],['Iron ore',s.bag.ore,5],['Trout',s.bag.fish,3]]},
  {title:'Teeth in the thicket',desc:'Defeat 5 briar wolves southeast of the village, then return to Rowan.',checks:()=>[['Wolves defeated',s.kills,5]]},
  {title:'Iron resolve',desc:'Forge an iron sword at the smithy. Train Combat to level 3, then speak to Rowan.',checks:()=>[['Iron sword',s.sword,1],['Combat level',lv('Combat'),3]]},
  {title:'The Hollow Crown',desc:'Defeat the Hollow King beyond the northern gate. Bring word back to Rowan.',checks:()=>[['Hollow King defeated',+s.boss,1]]},
  {title:'Guardian of Briarhaven',desc:'The Hollow King has fallen. Explore the goblin camp, hunt bandits, or keep mastering your skills.'}
];
function ready(){const q=quests[s.quest];return q.checks&&q.checks().every(([,v,n])=>v>=n);}
function elder(){
  if(s.quest===0){dialog('Elder Rowan','<p>“Welcome to Briarhaven. The forest has turned restless. Gather supplies for the village and I’ll see that you’re rewarded.”</p><p>Your axe, pickaxe, and fishing rod are already equipped.</p>',[['Accept quest',()=>{s.quest=1;close();toast('Quest accepted: Tools of the trade');}]]);return;}
  if(s.quest===5){dialog('Elder Rowan','<p>“Briarhaven will remember your name, Guardian. There will always be a place for you beside our fire.”</p>');return;}
  if(ready()){
    const reward=[0,45,70,50,200][s.quest];
    dialog('Elder Rowan','<p>“Well done, adventurer. Your work gives this village hope.”</p><p>Reward: <b>'+reward+' coins</b>'+(s.quest===4?' and the Guardian title.':'.')+'</p>',[['Complete quest',()=>{if(s.quest===1){s.bag.logs-=5;s.bag.ore-=5;}s.gold+=reward;s.quest++;close();toast(s.quest===5?'You are the Guardian of Briarhaven!':'Quest complete! Check your journal for the next quest.');}]]);
  }else dialog('Elder Rowan','<p>'+quests[s.quest].desc+'</p><p>“Rest by the campfire when you need to heal. Watch for goblins on the eastern road.”</p>');
}
const shopStock=[['fish',3,9],['arrows',20,10],['runes',20,14],['ironHelm',1,50],['ironShield',1,45],['mageRobe',1,65]];
const shopPrices={herbs:3,logs:3,ore:4,fang:6,bones:4};
function shop(mode='buy',message=''){
 dialog('Mara’s General Store','<div class="shopheading"><span>Coins <b>'+s.gold+'</b></span><span>Bag '+inventorySlots().length+' / '+BAG_SIZE+'</span></div><div class="shoptabs"><button id="shopBuy" aria-pressed="'+(mode==='buy')+'">Buy</button><button id="shopSell" aria-pressed="'+(mode==='sell')+'">Sell</button></div><p id="shopNotice" role="status">'+message+'</p><div id="shopItems" class="shopitems"></div>');
 $('shopBuy').onclick=()=>shop('buy');$('shopSell').onclick=()=>shop('sell');
 const rows=mode==='buy'?shopStock:Object.entries(shopPrices).filter(([id])=>(s.bag[id]||0)>0).map(([id,price])=>[id,s.bag[id],price]);
 if(!rows.length){$('shopNotice').textContent=(message?message+' ':'')+'You have no items Mara can buy.';return;}
 for(const [id,count,price]of rows){
  const item=ITEMS[id],row=document.createElement('button');row.className='shopitem';row.appendChild(itemCanvas(id));
  const copy=document.createElement('span');copy.className='shopitemcopy';const cost=mode==='buy'?price:price*count;
  const reason=mode==='sell'?'':item.slot&&owns(id)?'Already owned':s.gold<price?'Need '+(price-s.gold)+' more coins':!canCarry(id,count)?'Bag full':'';
  copy.innerHTML='<strong>'+item.name+(count>1?' ×'+count:'')+'</strong><small>'+cost+' coins'+(reason?' · '+reason:'')+'</small>';row.appendChild(copy);row.disabled=!!reason;
  row.setAttribute('aria-label',(mode==='buy'?'Buy ':'Sell ')+item.name+' ×'+count+' for '+cost+' coins'+(reason?'. '+reason:''));
  row.onclick=()=>{if(mode==='buy'){if(buySupply(id,count,price))shop('buy','Bought '+item.name+(count>1?' ×'+count:'')+'.');}else sell(id,price);};$('shopItems').appendChild(row);
 }
 paintItemIcons($('shopItems'));
}
function sell(item,price){const quantity=s.bag[item]||0;if(!quantity){shop('sell','You have none of that item to sell.');return false;}s.gold+=quantity*price;s.bag[item]=0;renderUI();save();shop('sell','Sold '+ITEMS[item].name+' ×'+quantity+' for '+quantity*price+' coins.');return true;}

function forge(){
 const buttons=[];
 if(!s.sword)buttons.push(['Forge iron sword · 5 ore + 2 logs + 20 coins',()=>{if(s.bag.ore<5||s.bag.logs<2||s.gold<20){toast('You need 5 ore, 2 logs, and 20 coins.');return;}s.bag.ore-=5;s.bag.logs-=2;s.gold-=20;s.sword=1;s.gear.ironSword=1;s.equipment.weapon='ironSword';gain('Smithing',70);close();toast('Iron sword forged and equipped!');}]);
 buttons.push(['Craft 20 arrows · 1 ore + 1 log',()=>{if(craftArrows()){forge();toast('20 arrows crafted.');}}]);
 dialog('Briarhaven Smithy','<p>'+s.bag.ore+' iron ore · '+s.bag.logs+' oak logs · '+s.gold+' coins</p><p>'+(s.sword?'You own an iron sword. Equip it from the Equipment tab.':'Forge a stronger sword or make arrows for your bow.')+'</p>',buttons);
}
function inn(){dialog('The Wayfarer’s Rest','<p>Warm bread, a crackling hearth, and stories from the old road.</p><p>“Take a moment to rest. You look like you’ve come a long way.”</p>',[['Rest · free',()=>{s.hp=maxhp();close();toast('You leave the inn fully rested.');}],['Ask about the region',()=>dialog('Word from the road','<p>Goblins gather east of Briarhaven. Slimes lurk southwest of the lake. Wolves roam the southeast thicket, and bandits guard the far southern road.</p><p>The skeletons near the northern ruins are stronger. Make an iron sword before going there.</p>')]]);}
function eat(){
  if(!s.bag.fish){toast('No trout. Fish at the lake or buy some from Mara.');return;}
  if(s.hp>=maxhp()){tutorialEvent('eat');toast('Your health is already full.');return;}
  const heal=Math.min(14,maxhp()-s.hp);s.bag.fish--;s.hp+=heal;floating('+'+heal,px,py,'#b9efad');tutorialEvent('eat');renderUI();save();
}
function tickAction(){
  const o=target;if(!o)return;
  if(o.type==='crop'){if(o.harvestedUntil>time){stop();toast('This patch is growing back.');return;}if(!addToBag('herbs')){stop();return;}o.harvestedUntil=time+35;gain('Farming',15);floating('+1 herbs',o.x,o.y);stop();renderUI();save();return;}
  if(['tree','ore','fish'].includes(o.type)){
    const skill={tree:'Woodcutting',ore:'Mining',fish:'Fishing'}[o.type],item={tree:'logs',ore:'ore',fish:'rawTrout'}[o.type];
    if(!addToBag(item)){stop();return;}gain(skill,12);floating('+1 '+{logs:'oak log',ore:'iron ore',rawTrout:'raw trout'}[item],o.x,o.y);o.hitAt=time;lastAttack=time;tutorialEvent(o.type);renderUI();save();return;
  }
  if(fighter(o))performAttack(o);
}

function renderUI(){
  $('hp').textContent=s.hp+' / '+maxhp();$('hpbar').style.width=(s.hp/maxhp()*100)+'%';$('hpbar').parentElement?.classList.toggle('critical',s.hp/maxhp()<=.25);
  $('rank').textContent=(s.character?.name||'Adventurer')+' · Combat '+lv('Combat');$('gold').textContent=s.gold;$('food').textContent=s.bag.fish;
  renderPanel();renderCombatBar();renderRun();if(assetsReady)drawPortrait();
}
function renderPanel(){
  if(tab==='skills'&&!$('gameDock').hidden)tutorialEvent('skills');
  if(tab==='bag'){renderInventory();return;}if(tab==='gear'){renderEquipment();return;}if(tab==='spells'){renderSpells();return;}
  let html='';
  if(tab==='quests'){
    pageControls(2,1);if(panelPage===1){renderFrontierQuest();return;}
    const q=quests[s.quest];html='<div class="questhead"><h2>'+q.title+'</h2><small>'+(s.quest===5?'COMPLETE':s.quest===0?'PROLOGUE':s.quest+' / 4')+'</small></div><p class="desc">'+q.desc+'</p>';
    if(q.checks)html+='<div class="objectives">'+q.checks().map(([name,v,n])=>'<span class="chip '+(v>=n?'done':'')+'">'+(v>=n?'✓ ':'')+name+' '+Math.min(v,n)+'/'+n+'</span>').join('')+'</div>';
    if(ready())html+='<p class="desc" style="color:#e0bc75">Ready to turn in — tap Elder Rowan.</p>';
  }
  if(tab==='bag')html='<div class="grid">'+[['Oak logs',s.bag.logs],['Iron ore',s.bag.ore],['Trout',s.bag.fish],['Wolf fangs',s.bag.fang],['Bones',s.bag.bones]].map(([n,v])=>'<div class="item">'+n+' <b>×'+v+'</b></div>').join('')+'</div><p class="desc">Equipped: '+(s.sword?'Iron sword (+4 damage)':'Bronze sword')+' · Axe · Pickaxe · Fishing rod<br>Trout heals 14 HP. Sell materials at Mara’s store.</p>';
  if(tab==='skills'){const skills=Object.entries(s.xp).filter(([k])=>k!=='Combat');pageControls(skills.length,4);html='<div class="questhead"><h2>Skills</h2><small>Combat '+combatLevel()+'</small></div><div class="grid skillcards">'+pageItems(skills,4).map(([k,x])=>{const level=lv(k),base=35*(level-1)**2,next=35*level**2;return '<div class="item" title="'+(COMBAT_SKILL_DETAILS[k]||'')+'">'+k+' <b>Lv. '+level+'</b><small>'+x+' / '+next+' XP</small><div class="skillbar"><i style="width:'+((x-base)/(next-base)*100)+'%"></i></div><small class="skillpurpose">'+(COMBAT_SKILL_DETAILS[k]||'')+'</small></div>';}).join('')+'</div>';}
  $('panel').innerHTML=html;
}
function openCreator(edit=false){
  stop();if($('modal').open)$('modal').close();editingCharacter=edit;selectedLook=s.character?.look||0;
  $('characterName').value=s.character?.name||'';$('creatorTitle').textContent=edit?'Your adventurer':'Create your adventurer';
  $('creatorIntro').textContent=edit?'Choose how you appear in the borderlands.':s.quest>0?'Welcome back to Briarhaven. Give your adventurer a name and appearance. Your items and skills are waiting for you.':'Beyond Briarhaven’s gates, the old roads are growing dangerous. A new adventurer has arrived.';
  $('begin').textContent=edit?'Save character':'Enter Briarhaven';$('cancelCreator').hidden=!edit;
  const container=$('looks');container.innerHTML='';
  looks.forEach((look,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',look.description);b.setAttribute('aria-pressed',String(selectedLook===i));b.className=selectedLook===i?'chosen':'';const c=document.createElement('canvas');c.width=120;c.height=120;b.appendChild(c);b.onclick=()=>{selectedLook=i;renderLooks();};container.appendChild(b);});
  $('creator').showModal();renderLooks();
}
function renderLooks(){
  $('looks').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('chosen',i===selectedLook);b.setAttribute('aria-pressed',String(i===selectedLook));const c=b.querySelector('canvas'),g=c.getContext('2d');g.clearRect(0,0,120,120);drawEquippedCharacter(g,60,117,i,false,10,1.7);});
  const c=$('characterPreview'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);shadow(g,192,260,55);drawEquippedCharacter(g,192,260,selectedLook,false,10,3.8);$('lookName').textContent=looks[selectedLook].name;
}
function drawPortrait(){const g=$('portraitCanvas').getContext('2d');g.clearRect(0,0,96,96);drawEquippedCharacter(g,48,103,s.character?.look||0,false,10,1.7);}
async function finishCharacter(name,look){
  const cleaned=name.trim().replace(/[\u0000-\u001f<>]/g,'').slice(0,18);if(!cleaned)return false;
  if(!s.character){$('tutorial').classList.remove('collapsed');$('tutCollapse').textContent='Minimize';}
  const draft=typeof creatorDraft==='undefined'?null:creatorDraft;
  s.character={name:cleaned,look:Math.max(0,Math.min(3,look)),race:'human',frame:draft?.frame||s.character?.frame||'male',hair:draft?.hair??s.character?.hair??0,creationVersion:2};
  $('begin').disabled=true;$('begin').textContent='Saving character…';$('characterSaveError').textContent='';
  save();const saved=await flushCloudSave();$('begin').disabled=false;
  if(!saved){$('begin').textContent='Retry saving character';$('characterSaveError').textContent='Your character has not saved to your account yet. Check your connection and retry.';return true;}
  $('creator').close();renderUI();renderTutorial();save();if(!editingCharacter)toast('Welcome to Briarhaven, '+cleaned+'.');return true;
}
function showHelp(){dialog('The adventurer’s handbook','<p><b>Tap the ground</b> to walk. Tap resources to gather. Tap monsters to fight automatically. Tap a man to choose Talk or Attack.</p><p><b>Eat trout</b> to heal during battle. Tap elsewhere to retreat. The inn and campfire restore all health.</p><p>Tap a door to open or close it, then tap the ground to walk through. Doors keep their state when you return. Use the map to walk to a region.</p><p>Use Bag to inspect and equip items. Gear shows your armor. Ranged consumes arrows; Magic consumes rune stones. Choose spells in the spellbook. Mara sells ammunition, and the forge makes arrows.</p><p>Tap Run to move faster while energy lasts. Energy recovers while walking or resting. On a computer, R toggles running.</p><p>Progress saves to your account, with a backup on this device.</p>',[['Edit character',()=>openCreator(true)],['Replay opening tutorial',()=>{close();s.tutorial=0;s.tutorialVersion=2;tutorialCameraStart=null;renderTutorial();save();}]]);}
function worldMap(){expandedMap();}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2,Math.sqrt(8294400/Math.max(1,r.width*r.height)));screen={w:r.width,h:r.height};canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}
function shadow(g,x,y,size){g.fillStyle='#0a17274a';g.beginPath();g.ellipse(x,y,size,size*.29,0,0,Math.PI*2);g.fill();}
// Sprite atlases are generated artwork; each logical sprite is one equal atlas cell.
function sprite(g,atlas,index,x,bottom,width,height,flip=1,rotation=0){
  const img=art[atlas];if(!img)return;
  const cols=['terrain','spirits'].includes(atlas)?2:4,rows=atlas==='poses'?3:cols,cellW=img.width/cols,cellH=img.height/rows;
  const crop=art.bounds?.[atlas]?.[index]||{x:(index%cols)*cellW,y:Math.floor(index/cols)*cellH,w:cellW,h:cellH};
  const ratio=Math.min(width/crop.w,height/crop.h),dw=crop.w*ratio,dh=crop.h*ratio;
  g.save();g.translate(x,bottom);g.scale(flip,1);g.rotate(rotation);g.drawImage(img,crop.x,crop.y,crop.w,crop.h,-dw/2,-dh,dw,dh);g.restore();return {x:x-dw/2,y:bottom-dh,w:dw,h:dh};
}
function terrainType(x,y){return expandedTerrain(x,y);}
function drawGround(){
  const {w,h}=screen,minX=Math.floor(camera.x/TILE),minY=Math.floor(camera.y/TILE),img=art.terrain;
  for(let y=minY;y<minY+h/TILE+2;y++)for(let x=minX;x<minX+w/TILE+2;x++){
    const a=x*TILE-camera.x,b=y*TILE-camera.y,t=terrainType(x,y);
    if(img){const cw=img.width/2,ch=img.height/2;ctx.drawImage(img,(t%2)*cw,Math.floor(t/2)*ch,cw,ch,a,b,TILE+1,TILE+1);}else{ctx.fillStyle='#405440';ctx.fillRect(a,b,TILE+1,TILE+1);}
    if(x<1||y<1||x>=W-1||y>=H-1){ctx.fillStyle='#0a1e1fc9';ctx.fillRect(a,b,TILE+1,TILE+1);}
    if(t===3){ctx.fillStyle='#addbe510';ctx.fillRect(a+4,b+16+Math.sin(time+x)*3,26,1);ctx.fillRect(a+15,b+35+Math.sin(time+y)*2,25,1);}
    if(t===1){ctx.fillStyle='#b7965315';ctx.fillRect(a,b,TILE+1,TILE+1);}
  }
}
function groundRing(x,y,color,r=18){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse((x+.5)*TILE-camera.x,(y+.82)*TILE-camera.y,r,r*.42,0,0,Math.PI*2);ctx.stroke();}
function label(text,x,y,color='#f5e7be',size=12){ctx.font='600 '+size+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#17252ad9';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
function draw(){
  const {w,h}=screen;camera.x=px*TILE+TILE/2-w/2;camera.y=py*TILE+TILE/2-h/2;ctx.clearRect(0,0,w,h);drawGround();drawSceneWalls();hitboxes=[];drawGroundLoot();
  if(path.length){ctx.strokeStyle='#ffe6a0b0';ctx.lineWidth=2;ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo((px+.5)*TILE-camera.x,(py+.8)*TILE-camera.y);for(const [x,y]of path)ctx.lineTo((x+.5)*TILE-camera.x,(y+.8)*TILE-camera.y);ctx.stroke();ctx.setLineDash([]);const end=path[path.length-1];groundRing(end[0],end[1],'#ffe6a0',10);}
  const tutPoint=inWorld()&&s.character&&!!tutorialStep()?tutorialStep()?.point?.():null;
  if(tutPoint){groundRing(tutPoint.x,tutPoint.y,'#ffd98b',22+Math.sin(time*3)*3);const tx=(tutPoint.x+.5)*TILE-camera.x,ty=(tutPoint.y+.5)*TILE-camera.y;if(tx<20||tx>w-20||ty<65||ty>h-25){const dx=tx-w/2,dy=ty-h/2,t=Math.min((w/2-25)/Math.max(1,Math.abs(dx)),(h/2-70)/Math.max(1,Math.abs(dy)));const ex=w/2+dx*t,ey=h/2+dy*t;ctx.save();ctx.translate(ex,ey);ctx.rotate(Math.atan2(dy,dx));ctx.fillStyle='#ffe1a2';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-5,-6);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.restore();}}
  const renderables=buildings.map(b=>({b,depth:b.y+b.h-.2}));
  for(const o of objects)if(o.dead<=time&&!(o.type==='boss'&&s.boss))renderables.push({o,depth:o.y+.9});
  renderables.push({player:true,depth:py+.91});renderables.sort((a,b)=>a.depth-b.depth);
  for(const entry of renderables){
    if(entry.b){
      const b=entry.b,x=(b.x+b.w/2)*TILE-camera.x,bottom=(b.y+b.h)*TILE-camera.y;
      if(x< -200||x>w+200||bottom< -20||bottom>h+240)continue;
      shadow(ctx,x,bottom-5,b.w*TILE*.43);const rect=sprite(ctx,'environment',b.sprite,x,bottom,b.w*TILE+22,(b.h+1.1)*TILE);
      if(rect&&b.service)hitboxes.push({...rect,o:b.service});
      if(Math.abs(s.x-(b.x+b.w/2))<5&&Math.abs(s.y-(b.y+b.h))<4)label(b.name,x,bottom+10,'#f3dda6',11);
      continue;
    }
    if(entry.player){
      const x=(px+.5)*TILE-camera.x,bottom=(py+.93)*TILE-camera.y;shadow(ctx,x,bottom,15);groundRing(px,py,'#f4d99d',16);
      drawAnimatedPlayer(x,bottom);
      label(s.character?.name||'Adventurer',x,bottom-69,'#ffedbd',11);
      continue;
    }
    const o=entry.o,x=(o.drawX+.5)*TILE-camera.x,bottom=(o.drawY+.96)*TILE-camera.y;
    if(x< -90||x>w+90||bottom< -20||bottom>h+130)continue;
    const living=fighter(o)||o.characterSprite||['elder','shop'].includes(o.type),atlas=o.type==='spirit'?'spirits':MONSTER_ART[o.kind]!==undefined?'monsters':living&&o.type!=='dummy'?'heroes':living?'characters':'environment';
    let width=living?48:56,height=living?59:62;
    if(o.type==='crop'){width=37;height=o.harvestedUntil>time?13:37;}if(o.type==='tree'){width=91;height=111;}if(o.type==='ore'){width=58;height=47;}if(o.type==='fish'){width=36;height=28;}if(o.type==='boss'||o.kind==='warden'){width=70;height=90;}if(o.kind==='wolf'||o.kind==='ridgewolf'){width=58;height=49;}if(o.kind==='slime'||o.kind==='rat'){width=45;height=37;}
    if(o.type!=='fish')shadow(ctx,x,bottom,Math.min(25,width*.3));
    if(target===o)groundRing(o.x,o.y,fighter(o)?'#ef957d':'#f5d79a',22);
    const pulse=time-o.hitAt<.25?Math.sin((time-o.hitAt)/.25*Math.PI)*.045:0;
    const walking=Math.hypot(o.drawX-o.x,o.drawY-o.y)>.02;
    const bob=living&&o.type!=='dummy'?(walking?Math.sin(time*11+o.id)*1.8:Math.sin(time*2+o.id)*.6):o.type==='spirit'?Math.sin(time*2.8+o.id)*3:0;
    const attacking=time-o.attackAt<.28;const lunge=attacking?Math.sin((time-o.attackAt)/.28*Math.PI)*5*(s.x<o.x?-1:1):0;const rect=sprite(ctx,atlas,atlas==='monsters'?MONSTER_ART[o.kind]:atlas==='heroes'?(o.sprite%4)*4+(walking?Math.floor(time*8+o.id)%4:1):o.sprite,x+lunge,bottom+bob,width*(1+pulse),height*(1-pulse),living&&s.x<o.x?-1:1,pulse*.35+(o.type==='tree'?Math.sin(time*.9+o.id)*.009:walking?Math.sin(time*11+o.id)*.025:0));
    if(rect)hitboxes.push({...rect,o});
    if(o.type==='questgiver')label('!',x,bottom-height-15,'#ffe0a0',20);
    if(o.type==='elder')label(ready()?'?':'!',x,bottom-height-15,'#ffe0a0',23);
    if(tutPoint===o)label('▼',x,bottom-height-12,'#ffdda0',16);
    if(target===o||(fighter(o)&&Math.abs(s.x-o.x)+Math.abs(s.y-o.y)<4&&o.type!=='dummy')){
      label(o.name.replace('Man · ','')+' · '+(o.level||''),x,bottom-height-9,fighter(o)?'#ffd5bd':'#f4e4bb',11);
      if(fighter(o)){ctx.fillStyle='#172125';ctx.fillRect(x-21,bottom-height-22,42,5);ctx.fillStyle='#cf7867';ctx.fillRect(x-21,bottom-height-22,42*Math.max(0,o.hp/o.maxhp),5);}
    }
    if(o.type==='camp'){const g=ctx.createRadialGradient(x,bottom-13,2,x,bottom-13,43);g.addColorStop(0,'#f9b34a22');g.addColorStop(1,'#f9b34a00');ctx.fillStyle=g;ctx.fillRect(x-43,bottom-56,86,86);}
  }
  drawWorldMood();drawProjectiles();drawSpiritEffect();
  for(const f of floaters){ctx.globalAlpha=Math.min(1,f.life*2);label(f.text,(f.x+.5)*TILE-camera.x,(f.y+.5)*TILE-camera.y-48-(1.4-f.life)*25,f.color,15);}ctx.globalAlpha=1;
  const region=s.y<9&&s.x>10&&s.x<22?['Hollow Ruins','Skeletons & the Hollow King']:s.x>=26&&s.y>=26?['The Southern Road','Bandit territory']:s.y>25&&s.x<15?['Marsh Edge','Slimes in the reeds']:s.y>18&&s.x<11?['Stillwater Lake','Fishing waters']:s.x>21&&s.y<11?['Iron Ridge','Rich iron deposits']:s.x>=24&&s.y>=11&&s.y<20?['Goblin Camp','Scavengers on the old road']:s.x>19&&s.y>=20?['Wolf Thicket','Briar wolf territory']:s.x<10?['Oakwood','Ancient oaks & wild rats']:['Briarhaven','Inn · General store · Smithy'];
  const activeRegion=regionInfo()||region;$('region').textContent=activeRegion[0];$('regionSub').textContent=activeRegion[1];drawMinimap();
}
const playerMotion={phase:0,moving:false,running:false,speed:0,blend:0,heading:0};
function renderRun(){const button=$('runButton');if(!button)return;const energy=Math.max(0,Math.min(100,s.runEnergy??100)),shown=Math.ceil(energy),key=s.runEnabled+':'+shown;if(button.dataset.value===key)return;button.dataset.value=key;button.setAttribute('aria-pressed',String(s.runEnabled));button.setAttribute('aria-label',(s.runEnabled?'Disable':'Enable')+' running. Run energy '+shown+' percent.');$('runLabel').textContent=s.runEnabled?'Run on':'Run off';$('runEnergy').textContent=shown+'%';button.style.setProperty?.('--energy',energy+'%');}
function toggleRun(){s.runEnabled=!s.runEnabled;if(s.runEnabled&&s.runEnergy<1){s.runEnabled=false;toast('Catch your breath. Run energy recovers while walking or resting.');}renderRun();save();}
function advanceMovement(dt){
 let remaining=dt,travelled=0,runningTime=0,walkingTime=0;
 while(remaining>1e-7){
  let distance=Math.hypot(s.x-px,s.y-py);
  if(distance<1e-6){
   px=s.x;py=s.y;if(!path.length)break;
   const next=path.shift();if(!land(...next)){stop();toast('The way is blocked. Choose another path.');break;}
   if(next[0]!==s.x)facing=next[0]>s.x?1:-1;[s.x,s.y]=next;distance=Math.hypot(s.x-px,s.y-py);if(distance<1e-6)continue;
  }
  const running=s.runEnabled&&s.runEnergy>0,speed=running?4:2;
  const used=Math.min(remaining,distance/speed,running?s.runEnergy/1.8:Infinity),step=Math.min(distance,used*speed);
  playerMotion.heading=Math.atan2(s.x-px,s.y-py);px+=(s.x-px)/distance*step;py+=(s.y-py)/distance*step;
  travelled+=step;playerMotion.phase=(playerMotion.phase+step/(running?2.4:1.5))%1;playerMotion.running=running;
  if(running){runningTime+=used;s.runEnergy=Math.max(0,s.runEnergy-used*1.8);if(s.runEnergy<1e-6){s.runEnergy=0;s.runEnabled=false;toast('Out of run energy. Walking while you recover.');}}
  else walkingTime+=used;
  remaining-=used;
  if(step>=distance-1e-6){px=s.x;py=s.y;tutorialEvent('walk');if(!path.length){arrive();break;}}
 }
 s.runEnergy=Math.min(100,s.runEnergy+walkingTime*2.5+Math.max(0,dt-runningTime-walkingTime)*5);
 playerMotion.moving=travelled>0;playerMotion.speed=travelled/Math.max(dt,.001);playerMotion.blend+=(Number(playerMotion.moving)-playerMotion.blend)*Math.min(1,dt*14);renderRun();return travelled>0;
}
let nextFrameAt=0;
function frame(now){
  const interval=1000/60;if(now+.2<nextFrameAt){requestAnimationFrame(frame);return;}nextFrameAt=now+interval-Math.max(0,now-nextFrameAt)%interval;
  if(assetsReady&&!document.hidden&&!$('modal').open&&!$('creator').open&&!$('spiritsDialog').open&&typeof observeRenderTime==='function')observeRenderTime(now-last);
  const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(assetsReady&&!cloudConflict&&!$('modal').open&&!$('creator').open&&!$('spiritsDialog').open&&!document.hidden&&!document.body.classList.contains('portrait-mode')){
    time+=dt;observeTutorialCamera();const moving=advanceMovement(dt);
    if(!moving&&!path.length&&target){
      if(fighter(target)&&!inAttackRange(target)){const p=route(target.x,target.y,true,attackRange());if(p===null)stop();else path=p;}
      else{elapsed+=dt;const skill={tree:'Woodcutting',ore:'Mining',fish:'Fishing'}[target.type]||'Combat';const duration=fighter(target)?(combatStyle()==='magic'?1.35:combatStyle()==='ranged'?1:1.15):Math.max(.8,2.3-(lv(skill)-1)*.1);$('activity').style.width=Math.min(100,elapsed/duration*100)+'%';if(elapsed>=duration){elapsed=0;tickAction();}}
    }
    updateCombat(dt);livingWorld(dt);updateSpirits(dt);if(typeof updateDoorThreshold==='function')updateDoorThreshold();
    for(const o of objects)if(o.expires&&o.expires<=time){o.collected=true;o.dead=Infinity;}
    for(const o of objects){if(o.dead&&o.dead<=time){o.dead=0;o.hp=o.maxhp;o.x=o.homeX;o.y=o.homeY;o.drawX=o.x;o.drawY=o.y;}o.drawX+=(o.x-o.drawX)*Math.min(1,dt*10);o.drawY+=(o.y-o.drawY)*Math.min(1,dt*10);}
    for(const f of floaters)f.life-=dt;floaters=floaters.filter(f=>f.life>0);
    if(time>toastUntil)$('toast').style.opacity=0;
    saveClock+=dt;if(saveClock>10){saveClock=0;save();}
  }
  if($('modal').open||$('creator').open||$('spiritsDialog').open){playerMotion.moving=false;playerMotion.blend=Math.max(0,playerMotion.blend-dt*10);}
  if(assetsReady&&!document.hidden)draw();requestAnimationFrame(frame);
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(c=>c.classList.toggle('selected',c===b));renderPanel();});
$('combatButtons').querySelectorAll('button').forEach(b=>b.onclick=()=>chooseStyle(b.dataset.style));
$('eat').onclick=eat;$('stop').onclick=stop;$('closeModal').onclick=close;$('journal').onclick=showHelp;$('portrait').onclick=()=>openCreator(true);$('mapBtn').onclick=worldMap;$('guide').onclick=guide;
$('runButton').onclick=toggleRun;
$('skipTutorial').onclick=()=>dialog('Skip first steps?','<p>You can replay the tutorial from the help menu whenever you like.</p>',[['Skip tutorial',()=>{s.tutorial=tutorialSteps.length;close();renderTutorial();$('eat').classList.remove('tutorialfocus');}],['Keep learning',close]]);
$('characterForm').onsubmit=async e=>{e.preventDefault();if(!await finishCharacter($('characterName').value,selectedLook)){$('characterName').setCustomValidity('Enter a character name.');$('characterName').reportValidity();}};
$('characterName').oninput=()=> $('characterName').setCustomValidity('');
$('cancelCreator').onclick=()=> $('creator').close();$('creator').addEventListener('cancel',e=>{if(!editingCharacter)e.preventDefault();});
$('modal').addEventListener('close',()=>{renderUI();save();});
document.addEventListener('visibilitychange',()=>{save();last=performance.now();});window.addEventListener('pagehide',save);window.addEventListener('resize',resize);
document.addEventListener('keydown',e=>{
  if(!assetsReady||$('modal').open||$('creator').open||$('spiritsDialog').open||e.target?.closest?.('input,textarea,select,[contenteditable]')||e.ctrlKey||e.metaKey||e.altKey)return;
  const key=e.key.toLowerCase();const d={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]}[e.key]||({w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]})[key];
  if(d){e.preventDefault();const x=s.x+d[0],y=s.y+d[1],o=objects.find(o=>o.x===x&&o.y===y&&o.dead<=time);if(o)select(o);else if(land(x,y))walkTo(x,y);}if(key==='e')eat();if(key==='r'&&!e.repeat){e.preventDefault();toggleRun();}
});
async function boot(){
  try{await initializeCloud();}catch(error){
    const needsSignIn=error.status===401;
    $('loading').innerHTML=needsSignIn?'<p>Your signed-in account is unavailable. Reopen Emberfall from ChatGPT, then try again.</p><button id="retryCloud">Retry account connection</button>':'<p>Your account save could not load. Your saved character has not been replaced.</p><button id="retryCloud">Retry</button>';
    $('retryCloud').onclick=()=>location.reload();cloudStatus(needsSignIn?'Sign in to continue':'Could not load account save');return;
  }
  setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();initHud();resize();renderUI();renderAction();
  try{
    const names=['characters','environment','terrain','items','poses','walking','spirits','heroes','monsters'];
    await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{art[name]=img;resolve();};img.onerror=reject;img.src='assets/'+name+'.png';})));
    const response=await fetch('assets/bounds.json');if(response.ok)art.bounds=await response.json();
    prepareAnimationAtlases();assetsReady=true;save();$('loading').hidden=true;renderUI();renderTutorial();if(!s.character?.name?.trim())openCreator(false);
  }catch{
    $('loading').innerHTML='';const message=document.createElement('p');message.textContent='The realm could not load. Check your connection and try again.';$('loading').appendChild(message);const b=document.createElement('button');b.textContent='Try again';b.onclick=()=>location.reload();$('loading').appendChild(b);
  }
  requestAnimationFrame(frame);
}
