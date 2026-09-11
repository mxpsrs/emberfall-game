'use strict';
let currentScene='overworld',worldScenes={},ambient=null,ambientEnabled=false,ambientTimer=0,miniTerrain=null;
const sceneSizes={overworld:[96,84],stoneInn:[14,12],stoneShop:[14,12],inn:[14,12],shop:[14,12],forge:[14,12],willowInn:[14,12],willowShop:[14,12],mine:[26,22],dungeon:[28,25]};
function sceneSize(){return sceneSizes[currentScene]||sceneSizes.overworld;}
function worldWall(x,y){const [w,h]=sceneSize();if(x<1||y<1||x>=w-1||y>=h-1)return true;if(currentScene==='mine')return (x===10&&y>2&&y<18&&![7,8,15].includes(y))||(y===12&&x>10&&x<23&&x!==18);if(currentScene==='dungeon')return (x===9&&y>1&&y<22&&![5,6,17,18].includes(y))||(x===18&&y>3&&y<24&&![10,11,20].includes(y));return false;}
function inWorld(){return currentScene==='overworld';}
function expandedWater(x,y){if(!inWorld())return false;return (x>=2&&x<=8&&y>=19&&y<=25&&!((x===8&&y===19)||(x===2&&y===25)))||(x>=36&&x<=38&&y>0&&y<59&&!((y>=16&&y<=18)||(y>=34&&y<=36)))||(x>=43&&x<=51&&y>=40&&y<=48);}
function expandedTerrain(x,y){
 if(!inWorld())return currentScene==='mine'?1:2;
 if(expandedWater(x,y))return 3;
 if(x>=70&&x<=81&&y>=54&&y<=64)return 2;
 if((y>=59&&y<=61&&x>=55&&x<=91)||(x>=73&&x<=75&&y>=34)||(y>=70&&y<=72&&x>=74))return 1;
 if((x>=48&&x<=62&&y>=16&&y<=29)||(y<8&&x>10&&x<21)||(x>=10&&x<=22&&y>=12&&y<=19))return 2;
 if((x>=40&&x<=46&&y>=21&&y<=29)||(x>=13&&x<=15)||(y>=16&&y<=18&&x>=7&&x<=68)||(y>=34&&y<=36&&x>=14&&x<=60)||(x>=54&&x<=56&&y>=7&&y<=46)||(x>=27&&x<=29&&y>=17&&y<=35))return 1;
 return 0;
}
function makeInterior(id,kind,title){
 const oldO=objects.splice(0),oldB=buildings.splice(0);currentScene=id;const [w,h]=sceneSize();
 const exit=add('exit',Math.floor(w/2),h-2,'Exit to the road',13);
 if(kind==='inn'){
  add('inn',4,4,'Innkeeper · Rest',4,{characterSprite:true});add('camp',9,3,'Hearth',7);
  add('villager',7,6,'Traveling storyteller',7,{characterSprite:true,talk:'“The pinewoods stretch beyond Willowcross. The old mine is rich, but the crypt to the south is crawling with skeletons.”'});
  for(const x of [2,3,9,10])add('prop',x,7,'Barrel',12);
 }else if(kind==='shop'){
  add('shop',6,3,'Merchant',5);for(const x of [2,3,9,10])add('prop',x,3,'Supplies',12);add('prop',3,5,'Oak stock',10);
 }else if(kind==='forge'){
  add('forge',6,4,'Smithing anvil',8);add('camp',10,3,'Forge fire',7);add('ore',3,3,'Iron stock',6);
 }else if(kind==='mine'){
  [[4,4],[7,9],[13,5],[18,4],[22,8],[15,17],[21,18]].forEach(([x,y])=>add('ore',x,y,'Deep iron vein',6));
  [[6,8],[14,9],[21,15]].forEach(([x,y])=>spawn('rat',x,y,{name:'Mine rat',hp:16,maxhp:16}));
  add('villager',5,17,'Miner Aldis',6,{characterSprite:true,talk:'“The richest iron is past the eastern passage. Bring a light, and keep an eye on those rats.”'});add('camp',7,18,'Miners’ fire',7);
 }else if(kind==='dungeon'){
  [[5,6],[7,13],[12,6],[14,17],[21,7],[22,15]].forEach(([x,y])=>spawn('skeleton',x,y));
  add('enemy',23,20,'Crypt Warden',12,{kind:'warden',hp:85,maxhp:85,atk:5,spread:3,xp:150,coins:70,level:9,loot:'bones'});
  add('cache',24,22,'Warden’s supply cache',12);add('camp',4,20,'Abandoned brazier',7);
 }
 const scene={objects:objects.splice(0),buildings:buildings.splice(0),title,entry:[Math.floor(w/2),h-3],exit};
 objects.push(...oldO);buildings.push(...oldB);currentScene='overworld';worldScenes[id]=scene;
}
function setupExpandedWorld(){
 s.worldClock=Number.isFinite(s.worldClock)?s.worldClock:160;s.bag.herbs=s.bag.herbs||0;s.xp.Farming=s.xp.Farming||0;
 ITEMS.herbs={name:'Fresh herbs',icon:14,atlas:'environment',desc:'Harvested on the farm. Eat to restore 6 health, or sell at a shop.'};
 function door(o,id){o.type='door';o.destination=id;o.sprite=13;}
 door(innObj,'inn');door(shopObj,'shop');door(forgeObj,'forge');
 // Willowcross and the river farms, connected by two road bridges.
 const innDoor=add('door',50,24,'Willowcross Inn',13,{destination:'willowInn'}),marketDoor=add('door',58,24,'Willowcross Market',13,{destination:'willowShop'});
 buildings.push({x:49,y:20,w:3,h:4,sprite:0,name:'Willowcross Inn',service:innDoor},{x:57,y:20,w:3,h:4,sprite:2,name:'Willowcross Market',service:marketDoor});
 add('camp',54,25,'Town fire',7);add('prop',53,21,'Town well',15);
 for(const [x,y,name,talk]of [[52,27,'Miller Fen','“Follow the road west across the river to Briarhaven. We trade herbs and grain with the farmers.”'],[60,27,'Scout Elin','“Skeletons guard the Sunken Crypt. The Warden keeps a supply cache in the deepest room.”'],[42,25,'Farmer Tessa','“Help yourself to the herb rows. They grow back after a short while. Fresh herbs will patch you up.”']])add('villager',x,y,name,5,{characterSprite:true,talk});
 for(const [x,y]of [[50,18],[59,17],[53,28],[44,31]])spawn('man',x,y,{name:'Man · villager'});
 for(let x=41;x<=45;x+=2)for(let y=22;y<=28;y+=2)add('crop',x,y,'Herb patch',14,{harvestedUntil:0});
 for(let x=41;x<47;x+=2)add('prop',x,30,'Farm fence',11);
 // Woods retain clear roads, with a lighter density near settlements.
 for(let x=41;x<=68;x+=3)for(let y=3;y<=12;y+=3)if(!(x>=53&&x<=58))add('tree',x,y,'Pine tree',5);
 for(let x=4;x<31;x+=4)for(let y=38;y<56;y+=4)if(!(x>=12&&x<=16))add('tree',x,y,'Old-growth oak',4);
 [[42,9],[49,10],[65,10],[20,44],[24,51]].forEach(([x,y])=>spawn('wolf',x,y));
 [[62,31],[65,35],[58,39]].forEach(([x,y])=>spawn('bandit',x,y));
 [[42,50],[52,50],[45,54]].forEach(([x,y])=>spawn('slime',x,y));
 add('fish',43,43,'Reedwater fishing',9);add('fish',51,46,'Reedwater fishing',9);
 const mineDoor=add('door',55,8,'Pinewatch Mine',13,{destination:'mine'}),cryptDoor=add('door',58,45,'Sunken Crypt',13,{destination:'dungeon'});
 buildings.push({x:53,y:4,w:4,h:4,sprite:3,name:'Pinewatch Mine',service:mineDoor},{x:56,y:41,w:4,h:4,sprite:3,name:'Sunken Crypt',service:cryptDoor});
 add('prop',35,16,'Willowcross sign',13);add('prop',39,35,'Southern crossing sign',13);
 setupFrontier();
 worldScenes.overworld={objects:objects.slice(),buildings:buildings.slice(),title:'The Border Realms',entry:[14,17]};
 for(const [id,kind,title]of [['stoneInn','inn','Stoneford Lodge'],['stoneShop','shop','Stoneford Supplies'],['inn','inn','Wayfarer’s Rest'],['shop','shop','Mara’s General Store'],['forge','forge','Briarhaven Smithy'],['willowInn','inn','Willowcross Inn'],['willowShop','shop','Willowcross Market'],['mine','mine','Pinewatch Mine'],['dungeon','dungeon','Sunken Crypt']])makeInterior(id,kind,title);
 const savedScene=s.sceneId||'overworld',savedX=s.x,savedY=s.y;activateScene(worldScenes[savedScene]?savedScene:'overworld',savedX,savedY,false);
 $('ambientButton').onclick=toggleAmbient;
 canvas.addEventListener('pointerdown',()=>{if(s.sound!==false&&!ambient)startAmbient();},{once:true});
 $('leaveInterior').onclick=leaveInterior;
 document.addEventListener('visibilitychange',()=>{if(ambient){if(document.hidden)ambient.context.suspend();else if(ambientEnabled)ambient.context.resume();}});
}
function activateScene(id,x,y,persist=true){
 const scene=worldScenes[id];if(!scene)return;stop();projectiles=[];floaters=[];currentScene=id;s.sceneId=id;
 objects.splice(0,objects.length,...scene.objects);buildings.splice(0,buildings.length,...scene.buildings);
 s.x=x??scene.entry[0];s.y=y??scene.entry[1];if(!land(s.x,s.y)){[s.x,s.y]=scene.entry;}px=s.x;py=s.y;miniTerrain=null;
 $('leaveInterior').hidden=inWorld();renderTutorial();if(persist)save();
}
function enterInterior(o){s.returnPoint=[s.x,s.y];activateScene(o.destination);tutorialEvent('inn');toast('Entered '+worldScenes[o.destination].title+'.');}
function leaveInterior(){if(inWorld())return;const point=s.returnPoint||[14,17];activateScene('overworld',point[0],point[1]);}
function returnToVillage(){activateScene('overworld',14,17);}
function handleWorldInteraction(o){
 if(handleTutorialInteraction(o))return true;
 if(o.type==='questgiver'){frontierTalk(o);return true;}
 if(o.type==='loot'){pickupGroundLoot(o);return true;}
 if(o.type==='spirit'){collectSpirit(o);return true;}
 if(o.type==='door'){enterInterior(o);return true;}
 if(o.type==='exit'){leaveInterior();return true;}
 if(o.type==='villager'){stop();dialog(o.name,'<p>'+o.talk+'</p>');return true;}
 if(o.type==='prop'){stop();toast(o.name+'.');return true;}
 if(o.type==='cache'){stop();if(!s.wardenClear){toast('The Crypt Warden still guards this cache.');return true;}if(s.cryptLoot){toast('You already recovered these supplies.');return true;}groundDrop({coins:100,runes:30,arrows:40});s.cryptLoot=true;save();renderUI();dialog('Warden’s supply cache','<p>The cache leaves <b>100 coins, 30 rune stones, and 40 arrows</b> at your feet. Tap the loot to collect it.</p>');return true;}
 return false;
}
function livingWorld(dt){
 s.worldClock=(s.worldClock+dt)%480;
 for(const o of objects){
  if(o===target||o.dead>time||!['enemy','man','villager'].includes(o.type)||o.kind==='warden')continue;
  if(Math.hypot(o.x-s.x,o.y-s.y)>18)continue;
  o.roamClock=(o.roamClock||0)+dt;if(o.roamClock<3+(o.id%5))continue;o.roamClock=0;
  const atHome=Math.hypot(o.x-o.homeX,o.y-o.homeY)<3;
  const dirs=atHome?[[1,0],[-1,0],[0,1],[0,-1]]:[[Math.sign(o.homeX-o.x),0],[0,Math.sign(o.homeY-o.y)]];
  const [dx,dy]=dirs[Math.floor(Math.random()*dirs.length)],nx=o.x+dx,ny=o.y+dy;
  if(land(nx,ny)&&!(nx===s.x&&ny===s.y)&&!objects.some(other=>other!==o&&other.dead<=time&&other.x===nx&&other.y===ny)){o.x=nx;o.y=ny;}
 }
 ambientTimer+=dt;if(ambientTimer>5){ambientTimer=0;ambientChirp();}
}
function regionInfo(){
 if(!inWorld())return [worldScenes[currentScene].title,currentScene==='mine'?'Iron veins & miners':currentScene==='dungeon'?'The Warden’s domain':'Shelter from the road'];
 if(s.x>=70&&s.y>=54&&s.y<=65)return ['Stoneford','Lodge · Market · Highland quests'];
 if(s.x>=85&&s.y<42)return ['Ashwatch ruins','The Sentinel keeps watch'];
 if(s.x>=64&&s.y>=40)return ['The High Marches','Ridge wolves & the coastal beacon'];
 if(s.x>=48&&s.x<=63&&s.y>=16&&s.y<=30)return ['Willowcross','A market town beyond the river'];
 if(s.x>=40&&s.x<=47&&s.y>=20&&s.y<=31)return ['Riverbend Farms','Growing herbs & village life'];
 if(s.x>39&&s.y<14)return ['Pinewatch Woods','Ancient pines & hidden iron'];
 if(s.x>39&&s.y>=39)return ['Reedwater & the Crypt','Quiet water, restless dead'];
 if(s.y>=37&&s.x<35)return ['Elderwood','Old-growth forest'];
 if(s.x>=36)return ['Eastbank Road','Road to Willowcross'];
 return null;
}
function drawWorldMood(){
 const hours=(s.worldClock/480*24+4)%24,night=(hours>=20||hours<5)?1:hours>=17?(hours-17)/3:hours<8?(8-hours)/3:0;
 const dark=!inWorld()?(currentScene==='dungeon'?.35:currentScene==='mine'?.22:.08):night*.29;
 ctx.fillStyle='rgba(7,15,40,'+dark+')';ctx.fillRect(0,0,screen.w,screen.h);
 for(const o of objects)if(o.type==='camp'){const x=(o.x+.5)*TILE-camera.x,y=(o.y+.5)*TILE-camera.y,g=ctx.createRadialGradient(x,y,0,x,y,110);g.addColorStop(0,'rgba(255,186,83,.17)');g.addColorStop(1,'rgba(255,186,83,0)');ctx.fillStyle=g;ctx.fillRect(x-110,y-110,220,220);}
 $('worldClock').textContent=(hours<5||hours>=20?'Night':hours<8?'Dawn':hours>=17?'Dusk':'Day')+' '+String(Math.floor(hours)).padStart(2,'0')+':'+String(Math.floor(hours%1*60)).padStart(2,'0');
}
function drawSceneWalls(){
 if(inWorld())return;const minX=Math.floor(camera.x/TILE),minY=Math.floor(camera.y/TILE);
 for(let x=minX;x<minX+screen.w/TILE+2;x++)for(let y=minY;y<minY+screen.h/TILE+2;y++)if(worldWall(x,y)){const a=x*TILE-camera.x,b=y*TILE-camera.y;ctx.fillStyle='#19242b';ctx.fillRect(a,b,TILE+1,TILE+1);ctx.fillStyle='#526065';ctx.fillRect(a+1,b+1,TILE-2,8);ctx.fillStyle='#0d171d';ctx.fillRect(a,b+TILE-5,TILE,5);}
}
function expandedMap(page=0){
 if(!inWorld()){dialog(worldScenes[currentScene].title,'<p>You are inside. Use the exit marker or Exit button to return to the road.</p>',[['Leave building',()=>{close();leaveInterior();}]]);return;}
 const places=[['Stoneford','New town & quests',75,62],['Coastal beacon','Keeper Orin',86,71],['Ashwatch','Sentinel encounter',89,35],['Briarhaven','Your starting village',14,17],['Willowcross','Inn & market',54,26],['Riverbend Farms','Harvest herbs',44,25],['Pinewatch Mine','Enter & mine iron',55,9],['Sunken Crypt','Dungeon & Warden',58,46],['Elderwood','Ancient oak forest',14,44],['Stillwater','Fishing',9,21],['Reedwater','Southern lake',52,46],['Goblin camp','Combat level 3',27,16],['Wolf thicket','Combat level 2',23,23],['Hollow Ruins','The Hollow King',15,8],['Iron Ridge','Mining',23,7]];
 const pages=Math.ceil(places.length/4);dialog('The borderlands','<p>Choose a destination to walk there. '+(page+1)+' / '+pages+'</p><div class="mapgrid" id="destinations"></div>',[[page+1<pages?'More destinations':'First destinations',()=>expandedMap((page+1)%pages)]]);
 for(const [name,desc,x,y]of places.slice(page*4,page*4+4)){const b=document.createElement('button');b.innerHTML=name+'<br><small>'+desc+'</small>';b.onclick=()=>{close();walkTo(x,y);};$('destinations').appendChild(b);}
}
function startAmbient(){
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const context=new AC(),master=context.createGain();master.gain.value=.08;master.connect(context.destination);
 const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let value=0;for(let i=0;i<data.length;i++){value=(value+(Math.random()*2-1)*.02)/1.02;data[i]=value*3;}
 const wind=context.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;wind.connect(filter);filter.connect(master);wind.start();ambient={context,master,filter};ambientEnabled=true;s.sound=true;context.resume();$('ambientButton').textContent='Sound on';save();}catch{$('ambientButton').textContent='Sound unavailable';}
}
function toggleAmbient(){if(!ambient){startAmbient();return;}ambientEnabled=!ambientEnabled;s.sound=ambientEnabled;if(ambientEnabled)ambient.context.resume();else ambient.context.suspend();$('ambientButton').textContent=ambientEnabled?'Sound on':'Sound off';save();}
function ambientChirp(){
 if(!ambient||!ambientEnabled)return;const {context,master,filter}=ambient;filter.frequency.setTargetAtTime(!inWorld()?140:expandedWater(s.x-2,s.y)||expandedWater(s.x+2,s.y)?800:450,context.currentTime,.5);
 const night=(s.worldClock/480*24+4)%24;const osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime;osc.type='sine';const frequency=!inWorld()?100:night>=20||night<5?3200:1800+Math.random()*700;
 osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(frequency*(!inWorld()?1.05:1.3),now+.12);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.18,now+.03);gain.gain.exponentialRampToValueAtTime(.001,now+.24);osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+.25);
}
