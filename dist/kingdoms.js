'use strict';
// Stable settlement/building IDs keep saved interiors valid across world updates.
const KINGDOMS=[
 {id:'aurelia',name:'Kingdom of Aurelia',race:'human',castle:'Sunspire Castle',description:'Crown cities, farmland and the old border villages.'},
 {id:'khazdur',name:'Kingdom of Khaz-Dur',race:'dwarf',castle:'Ironcrown Citadel',description:'Dwarven mountain halls, foundries and deep mines.'},
 {id:'sylvaran',name:'Kingdom of Sylvaran',race:'elf',castle:'The Bough Palace',description:'Elven forest cities beneath ancient silverwoods.'}
];
const SETTLEMENTS=[
 {id:'crownreach',name:'Crownreach',kingdom:'aurelia',kind:'city',x:126,y:38,capital:true},
 {id:'greyhaven',name:'Greyhaven',kingdom:'aurelia',kind:'city',x:128,y:112},
 {id:'briarhaven',name:'Briarhaven',kingdom:'aurelia',kind:'village',x:14,y:17,legacy:true},
 {id:'willowcross',name:'Willowcross',kingdom:'aurelia',kind:'village',x:54,y:26,legacy:true},
 {id:'stoneford',name:'Stoneford',kingdom:'aurelia',kind:'village',x:75,y:62,legacy:true},
 {id:'ironhollow',name:'Ironhollow',kingdom:'khazdur',kind:'city',x:254,y:39,capital:true},
 {id:'deepforge',name:'Deepforge',kingdom:'khazdur',kind:'city',x:290,y:112},
 {id:'copperdelve',name:'Copperdelve',kingdom:'khazdur',kind:'village',x:204,y:84},
 {id:'stonehearth',name:'Stonehearth',kingdom:'khazdur',kind:'village',x:344,y:62},
 {id:'aelindor',name:'Aelindor',kingdom:'sylvaran',kind:'city',x:131,y:199,capital:true},
 {id:'moonwillow',name:'Moonwillow',kingdom:'sylvaran',kind:'city',x:265,y:201},
 {id:'fernwatch',name:'Fernwatch',kingdom:'sylvaran',kind:'village',x:72,y:179},
 {id:'silverbrook',name:'Silverbrook',kingdom:'sylvaran',kind:'village',x:199,y:199}
];
// Regional accounts describe existing places; they do not grant quests or alter shared state.
const REGIONAL_ACCOUNTS={
 "crownreach": {
  "title": "The road court",
  "place": "Grain levies and road contracts keep Sunspire supplied. Courtyard markets leave the gate approaches clear for arriving caravans.",
  "voice": "Our clerks keep two copies of every road order. A seal is useful; a witness is better.",
  "belief": "We light a candle for those who keep the roads, not only those who rule them."
 },
 "greyhaven": {
  "title": "The caravan exchange",
  "place": "Storehouses and market courts gather goods from the western farms before the long roads east. Repair yards matter as much as shopfronts here.",
  "voice": "Count your supplies before you leave. Beyond the town, the Badlands offer fewer safe places to stop.",
  "belief": "A traveler may leave an offering for the next traveler without giving a name."
 },
 "briarhaven": {
  "title": "A haven for returning travelers",
  "place": "The bank, kitchen and market face a shared square. The Magic School teaches Relic shaping beside the gathering country that supplies it.",
  "voice": "Firstlight teaches you to survive. Here you decide what to make of those skills. Ask Captain Rellan about the trouble on the northern road.",
  "belief": "Remembrance is a duty to the people whose work made a safe haven possible."
 },
 "willowcross": {
  "title": "The working village",
  "place": "Fields, kitchens and timber work support the nearby roads. Willowcross measures a good season in full stores and repaired homes.",
  "voice": "Wood is shelter before it is fuel. Leave the paths clear when you work among the trees.",
  "belief": "We remember the hands that planted and harvested before ours."
 },
 "stoneford": {
  "title": "The crossing ward",
  "place": "Masonry and roadside trade sustain Stoneford. Its lanes gather travelers before they head into rougher country.",
  "voice": "Stay on the approaches near a crossing. A shortcut through the bank can be longer than the road.",
  "belief": "A sound crossing is our offering to people we will never meet."
 },
 "ironhollow": {
  "title": "The city above the seals",
  "place": "Ironcrown and the mine works share a mountain. Working shafts support the city; the Wardkeepers maintained older chambers beneath them.",
  "voice": "Hesta keeps the rescue camp. If you hear a voice in a closed shaft, bring a witness before following it.",
  "belief": "Remembering the dead does not mean obeying every voice that uses their names."
 },
 "deepforge": {
  "title": "The foundry city",
  "place": "Workshop courts and heavy stone halls serve the eastern mineral country. Ore, fuel and finished equipment pass through different hands here.",
  "voice": "A smith needs miners and fuel cutters. A fine blade begins long before it reaches my anvil.",
  "belief": "We set aside the first quiet moment after the furnaces cool to remember absent workers."
 },
 "copperdelve": {
  "title": "The prospectors’ village",
  "place": "Small workshops and stores support crews traveling into mineral country. Tools are repaired here before they are replaced.",
  "voice": "Start with ore you can actually work. A heavier pick does not make an unfamiliar seam safe.",
  "belief": "Stone rewards patient work; no one owns the mountain simply because they cut into it."
 },
 "stonehearth": {
  "title": "The shelter on the road",
  "place": "Compact stone homes and shared hearths give travelers a resting place among the eastern hills. Stores are kept close to the houses.",
  "voice": "Fill your food bag before you leave. The country beyond our lamps is not a town square.",
  "belief": "A place beside the hearth is offered before a stranger is asked for a story."
 },
 "aelindor": {
  "title": "The living court",
  "place": "The Bough Palace governs from a city of woodland courts. Open ground belongs to paths and gathering places as well as to buildings.",
  "voice": "A forest is not empty land waiting for houses. Its clearings already serve a purpose.",
  "belief": "The forest has its own seasons. Attention comes before command."
 },
 "moonwillow": {
  "title": "The watch beneath the canopy",
  "place": "Woodland homes stand above root caverns. The Brood Hollow makes watching the forest floor as necessary as watching the road.",
  "voice": "The roots hide passages. Do not mistake a quiet cave for an abandoned one.",
  "belief": "We keep remembrance close to living trees; the forest continues after each of us."
 },
 "fernwatch": {
  "title": "The woodland threshold",
  "place": "Rangers and craftspeople share a village at the edge of the southern forest routes. Clear approaches help travelers recognize shelter.",
  "voice": "Thick woodland needs a path, not a cleared hillside. Follow the road until you know the ground.",
  "belief": "Cutting wood and tending what remains are parts of the same responsibility."
 },
 "silverbrook": {
  "title": "The waterside craft village",
  "place": "The village joins woodland craft with the needs of travelers moving between the elven cities. Water and timber shape its daily work.",
  "voice": "Fishing and crafting reward patience. Bring useful materials home instead of an overflowing bag of things you cannot use.",
  "belief": "The water is shared, even when the catch is yours."
 }
};
function regionalAccount(id){return REGIONAL_ACCOUNTS[id]||REGIONAL_ACCOUNTS.briarhaven;}
const realmRoads=[],realmSceneInfo=new Map(),realmNavigation=new Map();let kingdomsReady=false;
function kingdomAt(x,y){return KINGDOMS[y>=153&&x>=50?2:x>=185&&y<153?1:0];}
function realmDestination(t){return t.legacy?[t.x,t.y+1]:[t.x+2,t.y+3];}
function settlementAt(x,y){return SETTLEMENTS.find(t=>Math.abs(x-t.x)<(t.kind==='city'?27:15)&&Math.abs(y-t.y)<(t.kind==='city'?30:12));}
function onRealmRoad(x,y){return realmRoads.some(([ax,ay,bx,by])=>ax===bx?Math.abs(x-ax)<=1&&y>=Math.min(ay,by)&&y<=Math.max(ay,by):Math.abs(y-ay)<=1&&x>=Math.min(ax,bx)&&x<=Math.max(ax,bx));}
const borderTerrain=expandedTerrain,borderWater=expandedWater;
expandedWater=function(x,y){if(!inWorld())return false;if(x<96&&y<84)return borderWater(x,y);if(onRealmRoad(x,y)||settlementAt(x,y))return false;return (y>=150&&y<=153&&x>45&&x<365)||(x>=180&&x<=183&&y>5&&y<149)||(x>340&&y>170);};
expandedTerrain=function(x,y){if(!inWorld())return realmSceneInfo.get(currentScene)?.race==='elf'?1:borderTerrain(x,y);if(x<96&&y<84)return borderTerrain(x,y);if(expandedWater(x,y))return 3;const town=settlementAt(x,y);if(town)return town.kingdom==='sylvaran'?1:2;if(onRealmRoad(x,y))return 1;return kingdomAt(x,y).race==='dwarf'?1:0;};
function connectRealmRoad(ax,ay,bx,by){realmRoads.push([ax,ay,bx,ay],[bx,ay,bx,by]);}
function realmBuilding(t,index,x,y,kind,w=4,h=4){
 const kingdom=KINGDOMS.find(k=>k.id===t.kingdom),id='realm_'+t.id+'_'+index;
 const names={inn:['The Lantern Rest','The Wayfarer Inn'],shop:['Provisioner','Market Hall'],forge:['Forge','Armorer'],house:['Townhouse','Cottage','Weaver’s Home','Baker’s House','Herbalist’s Home'],hall:['Guild Hall','Archive'],temple:['Sanctuary','Shrine'],mine:['Deep Mines'],castle:[kingdom.castle]};
 const list=names[kind]||names.house,title=kind==='castle'?kingdom.castle:t.name+' '+list[index%list.length]+(kind==='house'?' '+(index+1):'');
 const service=add('door',x+Math.floor(w/2),y+h,title,13,{destination:id});
 const b={x,y,w,h,sprite:kind==='forge'?1:kind==='shop'?2:0,name:title,service,settlement:t.id,kingdom:t.kingdom,race:kingdom.race,archetype:kind,variant:index%5,visualHeight:kind==='castle'?8:kingdom.race==='elf'?5.5:4.7};buildings.push(b);
 sceneSizes[id]=kind==='castle'?[24,22]:kind==='mine'?[26,22]:[16,14];realmSceneInfo.set(id,{id,title,kind,race:kingdom.race,settlement:t.id,building:b});return b;
}
function makeRealmInterior(info){
 const {id,kind,title,race}=info;makeInterior(id,['inn','shop','forge','mine'].includes(kind)?kind:'residence',title);
 const room=worldScenes[id];room.race=race;room.kingdom=info.building.kingdom;
 const oldO=objects.splice(0),oldB=buildings.splice(0),oldScene=currentScene;currentScene=id;objects.push(...room.objects);buildings.push(...room.buildings);
 const resident=(x,y,name,talk)=>add('villager',x,y,name,2,{characterSprite:true,race,talk});
 if(kind==='house'){resident(5,5,race==='elf'?'Elven artisan':race==='dwarf'?'Dwarven stoneworker':'Town resident',regionalAccount(info.settlement).voice);add('prop',3,3,'Bed',12);add('prop',10,4,'Dining table',12);add('prop',11,7,'Bookcase',12);add('camp',3,9,'Household hearth',7);}
 if(kind==='hall'){resident(5,4,SETTLEMENTS.find(t=>t.id===info.settlement).name+' archivist',regionalAccount(info.settlement).place);for(const x of [2,4,10,12])add('prop',x,2,'Bookcase',12);add('prop',8,7,'Reading table',12);}
 if(kind==='temple'){resident(5,5,race==='elf'?'Moon priestess':race==='dwarf'?'Ancestor keeper':'Temple keeper',regionalAccount(info.settlement).belief+' Bury bones to gain Worship experience.');add('prop',8,3,'Altar',12);for(const x of [3,11])add('camp',x,3,'Sacred brazier',7);}
 if(kind==='castle'){resident(12,4,race==='elf'?'Queen Aelira':race==='dwarf'?'King Thargrim':'Queen Elowen','Welcome to '+title+'. You may explore our cities and villages, trade with our merchants, and seek shelter within our halls.');add('prop',12,2,'Royal throne',12);for(const x of [4,18]){add('camp',x,5,'Royal brazier',7);add('prop',x,10,'Banquet table',12);resident(x,15,race==='dwarf'?'Ironcrown guard':race==='elf'?'Bough sentinel':'Crown guard','The roads to our neighboring kingdoms are open.');}for(const x of [3,20])for(const y of [4,10,16])add('prop',x,y,'Stone pillar',12);}
 for(const o of objects)if(o.characterSprite||['shop','inn','villager'].includes(o.type))o.race=race;
 room.objects=objects.splice(0);room.buildings=buildings.splice(0);objects.push(...oldO);buildings.push(...oldB);currentScene=oldScene;
}
function buildKingdoms(){
 if(kingdomsReady)return;sceneSizes.overworld=[384,256];
 const savedScene=currentScene,savedX=s.x,savedY=s.y;activateScene('overworld',14,17,false);
 for(const t of SETTLEMENTS){connectRealmRoad(96,112,t.x,t.y);if(t.legacy)continue;
  const count=t.kind==='city'?25:SETTLEMENT_PURPOSES[t.id]?.[0]==='large village'?12:6,lots=organicLots(t,count);
  for(let i=0;i<count;i++){const [x,y]=lots[i];
   const kind=i===0?'inn':i===1?'shop':i===2?'forge':i===3?'hall':i===4?'temple':i===5&&t.kingdom==='khazdur'?'mine':'house';realmBuilding(t,i,x,y,kind,4+(i%7===0?1:0),4);
  }
  if(t.capital)realmBuilding(t,25,t.x-6,t.y-32,'castle',12,10);
 }
 // Expand the original villages without displacing their NPCs or tutorial targets.
 const additions={briarhaven:[[5,32],[10,32]],willowcross:[[48,31],[54,31],[60,31]],stoneford:[[68,65],[74,65],[80,65]]};
 for(const t of SETTLEMENTS.filter(t=>t.legacy)){
  const existing=buildings.filter(b=>b.service&&Math.abs(b.x-t.x)<11&&Math.abs(b.y-t.y)<10&&!/Mine|Crypt/.test(b.name));for(const b of existing){b.settlement=t.id;b.kingdom=t.kingdom;b.race='human';b.archetype=b.sprite===1?'forge':b.sprite===2?'shop':'inn';b.variant=existing.indexOf(b);b.visualHeight=4.7;}
  for(const [i,[x,y]]of additions[t.id].entries()){for(let j=objects.length-1;j>=0;j--)if(objects[j].x>=x&&objects[j].x<x+4&&objects[j].y>=y&&objects[j].y<y+4&&['tree','prop'].includes(objects[j].type))objects.splice(j,1);realmBuilding(t,existing.length+i,x,y,'house');}
 }
 // Move any legacy roaming creatures out of newly added village footprints.
 for(const o of objects)if((fighter(o)||o.type==='villager')&&buildings.some(b=>inBuilding(b,o.x,o.y))){let placed=false;for(let radius=1;radius<12&&!placed;radius++)for(let dy=-radius;dy<=radius&&!placed;dy++)for(let dx=-radius;dx<=radius&&!placed;dx++){const x=o.x+dx,y=o.y+dy;if(!worldWall(x,y)&&!water(x,y)&&!buildings.some(b=>inBuilding(b,x,y))&&!objects.some(p=>p!==o&&p.x===x&&p.y===y)){o.x=o.drawX=o.homeX=x;o.y=o.drawY=o.homeY=y;placed=true;}}}
 // Streets between the blocks remain open, and every city has resident tradespeople.
 for(const t of SETTLEMENTS.filter(t=>!t.legacy)){
  const race=KINGDOMS.find(k=>k.id===t.kingdom).race;
  for(let i=0;i<(t.kind==='city'?8:3);i++){const x=t.x-15+(i%4)*9,y=t.id==='ironhollow'&&i===6?t.y+1:t.y-12+Math.floor(i/4)*16;add('villager',x,y,(race==='elf'?'Elven':race==='dwarf'?'Dwarven':'Aurelian')+' '+['ranger','mason','traveler','weaver'][i%4],i%4,{race,characterSprite:true,talk:[regionalAccount(t.id).voice,regionalAccount(t.id).place,regionalAccount(t.id).belief][i%3]});}
 }
 for(let y=4;y<250;y+=7)for(let x=5;x<375;x+=7){if(x<96&&y<84||settlementAt(x,y)||onRealmRoad(x,y)||expandedWater(x,y)||buildings.some(b=>x>=b.x-2&&x<b.x+b.w+2&&y>=b.y-2&&y<b.y+b.h+2))continue;const race=kingdomAt(x,y).race,seed=(x*17+y*31)%11;if(race==='dwarf'){if(seed<5)add('prop',x,y,'Mountain outcrop',12,{realmScenery:true});if(seed===6)add('ore',x,y,'Mountain iron',6);}else if(seed<7)add('tree',x,y,race==='elf'?'Silverwood tree':'Highland oak',4,{race,realmScenery:true});}
 for(const [x,y,race]of [[197,32,'dwarf'],[322,122,'dwarf'],[99,174,'elf'],[237,172,'elf']]){add('camp',x,y,'Roadside camp',7);add('villager',x+2,y,'Road warden',2,{race,characterSprite:true,talk:'Rest at the fire. All three kingdoms can be reached on foot.'});spawn('wolf',x+7,y+6,{name:race==='elf'?'Silverwood wolf':'Mountain wolf',level:5,hp:35,maxhp:35});}
 worldScenes.overworld.objects=objects.slice();worldScenes.overworld.buildings=buildings.slice();worldScenes.overworld.title='The Three Kingdoms';
 for(const info of realmSceneInfo.values())makeRealmInterior(info);
 // The old Pinewatch mine is inhabited by dwarves too.
 for(const o of worldScenes.mine.objects)if(o.characterSprite){o.race='dwarf';o.name='Aldis the dwarf';}
 const mine=worldScenes.mine;mine.race='dwarf';const savedO=objects.splice(0),savedB=buildings.splice(0);currentScene='mine';objects.push(...mine.objects);add('villager',19,17,'Dwarven prospector',1,{race:'dwarf',characterSprite:true,talk:'Our people come from Khaz-Dur, east across the mountain road. Visit Ironhollow and Deepforge to see our halls.'});mine.objects=objects.splice(0);objects.push(...savedO);buildings.push(...savedB);currentScene='overworld';
 kingdomsReady=true;realmNavigation.clear();activateScene(worldScenes[savedScene]?savedScene:'overworld',savedX,savedY,false);
}
const setupBorderWorld=setupExpandedWorld;
setupExpandedWorld=function(){const id=s.sceneId,x=s.x,y=s.y;setupBorderWorld();buildKingdoms();if(id&&worldScenes[id])activateScene(id,x,y,false);};
const oldRegionInfo=regionInfo;
regionInfo=function(){if(!inWorld()){const info=realmSceneInfo.get(currentScene);if(info)return [info.title,KINGDOMS.find(k=>k.id===(info.kingdom??info.building?.kingdom))?.name||''];return oldRegionInfo();}const t=settlementAt(s.x,s.y);if(t)return [t.name,KINGDOMS.find(k=>k.id===t.kingdom).name+' · '+(t.settlementClass||t.kind)];if(s.x<96&&s.y<84)return oldRegionInfo();const k=kingdomAt(s.x,s.y);return [typeof forestAt==='function'&&forestAt(s.x,s.y)?.name||'Badlands',k.name+' · '+k.description];};
expandedMap=function(page=0){
 if(!inWorld()){dialog(worldScenes[currentScene].title,'<p>You are inside. Leave to return to the roads between kingdoms.</p>',[['Leave building',()=>{close();leaveInterior();}]]);return;}
 const k=KINGDOMS[page%3],places=SETTLEMENTS.filter(t=>t.kingdom===k.id);
 dialog('World atlas · '+k.name,'<p>'+k.description+'</p><p>3 kingdoms · 6 cities · 7 villages · 3 castles</p><div id="kingdomAtlas" class="mapgrid"></div>',[['Next kingdom',()=>expandedMap((page+1)%3)],['Borderland landmarks',()=>borderlandMap()]]);
 for(const t of places){const b=document.createElement('button');b.textContent=t.name+' · '+t.kind+(t.capital?' · Castle':'');b.onclick=()=>{close();walkTo(...realmDestination(t));};$('kingdomAtlas').appendChild(b);}
};
function borderlandMap(){const places=[['Pinewatch Mine',55,9],['Sunken Crypt',58,46],['Stillwater',9,21],['Ashwatch',89,35],['Riverbend Farms',44,25]];dialog('Borderland landmarks','<div id="oldAtlas" class="mapgrid"></div>',[['Kingdoms',()=>expandedMap()]]);for(const [name,x,y]of places){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{close();walkTo(x*3,y*3);};$('oldAtlas').appendChild(b);}}
function realmNav(){
 let nav=realmNavigation.get(currentScene);if(nav)return nav;const [w,h]=sceneSize(),cells=new Uint8Array(w*h),moving=[];
 // Terrain collision is resolved when a route first visits a tile. Loading a
 // village should not evaluate water and walls across the entire continent.
 cells.fill(2);
 for(const b of buildings){const bounds=b.assembly&&window.VeldrenBuildings?window.VeldrenBuildings.worldBounds(b):{x:b.x,y:b.y,w:b.w,h:b.h};for(let y=Math.floor(bounds.y);y<bounds.y+bounds.h;y++)for(let x=Math.floor(bounds.x);x<bounds.x+bounds.w;x++)if(inBuilding(b,x,y)&&x>=0&&y>=0&&x<w&&y<h)cells[y*w+x]=1;}
 for(const o of objects){if(fighter(o)||o.collected||o.walkThrough)continue;if(o.type==='villager'||o.type==='spirit'){moving.push(o);continue;}if(o.x>=0&&o.y>=0&&o.x<w&&o.y<h){if(!o.propKind)cells[o.y*w+o.x]=1;if(o.propKind&&typeof propCollisionTiles==='function')for(const [x,y]of propCollisionTiles(o))if(x>=0&&y>=0&&x<w&&y<h)cells[y*w+x]=1;if(o.collisionRadius)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.hypot(dx,dy)<o.collisionRadius+.3&&o.x+dx>=0&&o.y+dy>=0&&o.x+dx<w&&o.y+dy<h)cells[(o.y+dy)*w+o.x+dx]=1;}}
 nav={w,h,cells,moving};realmNavigation.set(currentScene,nav);return nav;
}
function realmCellBlocked(nav,id){let value=nav.cells[id];if(value===2){const x=id%nav.w,y=Math.floor(id/nav.w);value=Number(!!(worldWall(x,y)||water(x,y)||terrainCellBlocked(x,y)));nav.cells[id]=value;}return value;}
const beforeRealmBlocked=blocked;
blocked=function(x,y){if(!kingdomsReady)return beforeRealmBlocked(x,y);const n=realmNav();return x<0||y<0||x>=n.w||y>=n.h||realmCellBlocked(n,y*n.w+x)||trainingGateClosedAt(x,y)||n.moving.some(o=>!o.collected&&o.x===x&&o.y===y);};
const borderRoute=route;
route=function(tx,ty,adjacent=false,reach=1.45,startX=s.x,startY=s.y,actor=null){
 if(!kingdomsReady)return borderRoute(tx,ty,adjacent,reach,startX,startY,actor);const nav=realmNav(),{w,h}=nav;if(tx<0||ty<0||tx>=w||ty>=h)return null;
 const native=window.realmNative;if(!native?.pathfind){
  const moving=new Set(nav.moving.filter(o=>!o.collected).map(o=>o.y*w+o.x)),isSolid=id=>realmCellBlocked(nav,id)||moving.has(id)||actor&&!trainingRatCanMove(actor,id%w,Math.floor(id/w));
  const start=startY*w+startX,goal=ty*w+tx;if(!adjacent&&isSolid(goal))return null;const costs=new Map([[start,0]]),previous=new Map(),heap=[];
  const push=o=>{heap.push(o);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=o.f)break;heap[i]=heap[p];i=p;}heap[i]=o;},pop=()=>{const out=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return out;};
  const estimate=(x,y)=>{const dx=Math.abs(tx-x),dy=Math.abs(ty-y);return Math.max(0,Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy)-(adjacent?reach:0));};push({id:start,g:0,f:estimate(startX,startY)});let end=-1;
  while(heap.length&&costs.size<45000){const a=pop(),x=a.id%w,y=Math.floor(a.id/w);if(a.g>(costs.get(a.id)??Infinity)+.001)continue;if(adjacent?Math.hypot(x-tx,y-ty)<=reach+.01&&lineOfSight(x,y,tx,ty):a.id===goal){end=a.id;break;}for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0],[-1,-1],[1,-1],[1,1],[-1,1]]){const nx=x+dx,ny=y+dy,id=ny*w+nx;if(nx<1||ny<1||nx>=w-1||ny>=h-1||isSolid(id)||dx&&dy&&(isSolid(y*w+nx)||isSolid(ny*w+x)))continue;const g=a.g+(dx&&dy?Math.SQRT2:1);if(g<(costs.get(id)??Infinity)-.001){costs.set(id,g);previous.set(id,a.id);push({id,g,f:g+estimate(nx,ny)});}}}
  if(end<0)return null;const result=[];while(end!==start){result.push([end%w,Math.floor(end/w)]);end=previous.get(end);if(end===undefined)return null;}return result.reverse();
 }
 const moving=nav.moving.filter(o=>!o.collected).map(o=>o.y*w+o.x),excluded=new Set(moving),isSolid=id=>realmCellBlocked(nav,id)||excluded.has(id);
 // Rare fenced actors provide an overlay mask; the path search itself and all
 // ordinary creature movement stay in the native core.
 if(actor&&(actor.penId||actor.briarhavenGoblin))for(let id=0;id<w*h;id++)if(!trainingRatCanMove(actor,id%w,Math.floor(id/w)))excluded.add(id);
 const goal=ty*w+tx;if(!adjacent&&isSolid(goal))return null;const longJourney=Math.hypot(tx-startX,ty-startY)>180;
 for(let attempt=0;attempt<24;attempt++){
 const result=native.pathfind(nav.cells,w,h,startX,startY,tx,ty,adjacent,reach,longJourney?90000:45000,[...excluded]);if(!result)return null;
  let previous=[startX,startY],invalid=false;
  for(const [x,y]of result){const id=y*w+x,dx=x-previous[0],dy=y-previous[1];invalid=isSolid(id)||invalid;if(dx&&dy)invalid=isSolid(previous[1]*w+x)||isSolid(y*w+previous[0])||invalid;previous=[x,y];}
  if(invalid)continue;
  if(!adjacent||!result.length||lineOfSight(result.at(-1)[0],result.at(-1)[1],tx,ty))return result;
  excluded.add(result.at(-1)[1]*w+result.at(-1)[0]);
 }
 return null;
};
