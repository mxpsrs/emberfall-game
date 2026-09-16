'use strict';
// Authored architecture and industry. Object IDs and scene IDs remain stable across saves.
const CIVILIZATION_VERSION=1, civilFloors=new Map(), civilWalls=new Map(), surfaceQuarries=[],civilStairWells=new Map();
let civilizationReady=false,civilSerial=7400000;
function civilMove(o,x,y){Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});}
function civilPut(world,type,name,x,y,extra={}){const o={id:civilSerial++,type,name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:12,dead:0,hitAt:-100,attackAt:-100,civilization:true,...extra};world.objects.push(o);return o;}
function civilResident(world,name,x,y,race,talk,extra={}){return civilPut(world,'villager',name,x,y,{race,characterSprite:true,_stationary:true,talk,...extra});}
function civilRectWalls(map,x,y,w,h,height=3){for(let a=x;a<x+w;a++){map.set(a+':'+y,{x:a,y,height});map.set(a+':'+(y+h-1),{x:a,y:y+h-1,height});}for(let b=y+1;b<y+h-1;b++){map.set(x+':'+b,{x,y:b,height});map.set((x+w-1)+':'+b,{x:x+w-1,y:b,height});}}
function civilOpening(map,x,y,axis='x',width=3){for(let i=-Math.floor(width/2);i<=Math.floor(width/2);i++)map.delete((x+(axis==='x'?i:0))+':'+(y+(axis==='y'?i:0)));}
function civilRoom(name,x,y,w,h,door,usage){return {name,x,y,w,h,door,usage};}
function civilFurnish(world,room,race,building){
 const {x,y,w,h,usage}=room,extra={race,interiorBuilding:building,civilRoom:room.name},put=(name,a,b,type='prop',more={})=>civilPut(world,type,name,x+a,y+b,{...extra,...more});
 const homes=['bedroom','barracks','guest','servant'].includes(usage);
 if(homes){put('Bed',2,2);if(w>9)put('Bed',w-3,2);put('Storage chest',w-3,h-3);put('Dining table',3,h-4);put('Chair',3,h-2);}
 if(['library','study','council'].includes(usage)){for(let a=2;a<w-2;a+=3)put('Bookcase',a,1);put(usage==='council'?'Council table':'Reading table',Math.floor(w/2),Math.floor(h/2));put('Chair',Math.floor(w/2)-2,Math.floor(h/2));}
 if(['kitchen','pantry','cellar','supply','treasury'].includes(usage)){for(let a=2;a<w-2;a+=3)put(usage==='treasury'?'Secure treasury chest':usage==='pantry'?'Supplies crate':'Barrel',a,1);put('Service table',2,h-3);if(usage==='kitchen'){put('Kitchen hearth',w-3,2,'camp');put('Cooking range',w-3,h-3,'range',{workstation:'range'});}}
 if(['armory','guard','barracks'].includes(usage)){put('Weapon rack',w-3,h-2);if(usage==='guard')put('Guard duty table',3,3);}
 if(usage==='hall'){put('Royal throne',Math.floor(w/2),2);for(const a of [3,w-4]){put('Royal brazier',a,3,'camp');put('Banquet table',a,h-5);}}
 if(usage==='chapel'){put('Altar',Math.floor(w/2),2);put('Sacred brazier',2,2,'camp');put('Bench',Math.floor(w/2),h-3);}
 if(usage==='cell'){put('Bed',2,2);put('Barrel',w-3,2);}
 if(usage==='crypt'){put('Ancestor memorial',Math.floor(w/2),2);put('Sacred brazier',2,h-3,'camp');}
}
function castleGroundPlan(b){
 const x=b.x,y=b.y,rooms=[
 civilRoom('Great hall',x+15,y+1,19,20,[x+24,y+20,'x'],'hall'),
 civilRoom('Library',x+1,y+1,15,11,[x+15,y+6,'y'],'library'),
 civilRoom('Council chamber',x+1,y+11,15,10,[x+15,y+16,'y'],'council'),
 civilRoom('Guard and stair hall',x+33,y+1,15,11,[x+33,y+6,'y'],'guard'),
 civilRoom('Kitchen and pantry',x+33,y+11,15,10,[x+33,y+16,'y'],'kitchen'),
 civilRoom('Barracks',x+1,y+24,13,11,[x+13,y+29,'y'],'barracks'),
 civilRoom('Armory',x+35,y+24,13,11,[x+35,y+29,'y'],'armory')];
 const walls=new Map();civilRectWalls(walls,x,y,b.w,b.h,4.5);for(const r of rooms)civilRectWalls(walls,r.x,r.y,r.w,r.h,4);
 for(const r of rooms)civilOpening(walls,...r.door);
 civilOpening(walls,x+24,y+b.h-1,'x',1);b.civilRooms=rooms;b.civilWallTiles=walls;
 return rooms;
}
function civilStair(world,name,x,y,destination,entry,building,kind='stone'){const down=/down|lower vaults/i.test(name);const o=civilPut(world,'prop',name,x,y,{civilStair:{destination,entry,kind,down},interiorBuilding:building,walkThrough:false,blocksSight:false});if(world.civilFloor&&!world.exit)world.exit=o;if(down){const scene=Object.entries(worldScenes).find(([,w])=>w===world)?.[0]||'overworld';if(!civilStairWells.has(scene))civilStairWells.set(scene,[]);civilStairWells.get(scene).push({x:x-.3,y:y-1,w:1.6,h:3,tx:x,ty:y});}return o;}
function civilFloorScene(id,title,size,rooms,race,building,returnAt){
 const world={objects:[],buildings:[],title,entry:[Math.floor(size[0]/2),Math.floor(size[1]/2)],race,civilFloor:true,exterior:building.service.destination,returnAt};worldScenes[id]=world;sceneSizes[id]=size;
 const walls=new Map();civilRectWalls(walls,0,0,...size,3);for(const r of rooms)civilRectWalls(walls,r.x,r.y,r.w,r.h,3);for(const r of rooms)civilOpening(walls,...r.door);
 civilFloors.set(id,{id,rooms,walls,building,race});civilWalls.set(id,walls);
 for(const r of rooms){civilFurnish(world,r,race,null);if(r.usage==='cell'){for(let x=r.x+1;x<r.x+r.w-1;x++){const wall=walls.get(x+':'+r.y);if(wall)wall.height=.5;}civilPut(world,'prop','Cell bars',r.x+Math.floor(r.w/2),r.y,{civilDecor:'cellBars',walkThrough:true,barWidth:r.w-2});}}
 return world;
}
function buildCastle(world,b){
 // Replace the old one-room furnishing, retaining the actual quest identities.
 const oldContents=world.objects.filter(o=>o.interiorBuilding===b.service.destination),questObjects=oldContents.filter(o=>o.mountainKey||o.mainStoryKey),royal=oldContents.find(o=>/Queen|King Thargrim/.test(o.name));
 world.objects=world.objects.filter(o=>o.interiorBuilding!==b.service.destination||questObjects.includes(o));
 const rooms=castleGroundPlan(b);for(const r of rooms)civilFurnish(world,r,b.race,b.service.destination);
 if(royal){civilMove(royal,b.x+24,b.y+5);world.objects.push(royal);}
 const library=rooms.find(r=>r.name==='Library');
 for(const o of questObjects){if(o.mountainKey==='expert')civilMove(o,library.x+5,library.y+6);else if(o.mountainKey==='library_books')civilMove(o,library.x+10,library.y+6);else civilMove(o,library.x+3,library.y+7);o.civilRoom='Library';}
 if(b.settlement==='ironhollow'){const expert=questObjects.find(o=>o.mountainKey==='expert');if(expert)mountainLibraryHome={x:expert.x,y:expert.y,building:b.service.destination};}
 const upperId=b.service.destination+'_upper',lowerId=b.service.destination+'_lower',towerId=b.service.destination+'_tower';
 const upperRooms=[civilRoom('Royal chambers',1,1,15,11,[8,11,'x'],'bedroom'),civilRoom('Private council',16,1,17,11,[24,11,'x'],'council'),civilRoom('Private study',33,1,15,11,[40,11,'x'],'study'),civilRoom('Guest chambers',1,16,15,9,[8,16,'x'],'guest'),civilRoom('Ancestor chapel',16,16,17,9,[24,16,'x'],'chapel'),civilRoom('Servants’ quarters',33,16,15,9,[40,16,'x'],'servant')];
 const upper=civilFloorScene(upperId,b.name+' · Upper chambers',[49,26],upperRooms,b.race,b,[b.x+40,b.y+7]);upper.entry=[36,13];
 civilStair(upper,'Stone stairs down to the guard hall',35,13,'overworld',[b.x+40,b.y+7],null);
 civilStair(world,'Stone stairs to the upper chambers',b.x+39,b.y+7,upperId,[36,13],b.service.destination);
 civilStair(upper,'Spiral stairs to the watchtower',44,13,towerId,[6,10],null,'spiral');
 const lowerRooms=[civilRoom('Guard station',1,1,14,10,[8,10,'x'],'guard'),civilRoom(b.race==='dwarf'?'Military stores':'Treasury vault',15,1,18,10,[24,10,'x'],b.race==='dwarf'?'supply':'treasury'),civilRoom('Food cellar',33,1,15,10,[40,10,'x'],'cellar'),civilRoom('Secure cell',1,15,11,9,[6,15,'x'],'cell'),civilRoom('Holding cell',11,15,11,9,[16,15,'x'],'cell'),civilRoom(b.race==='elf'?'Root memorial':'Ancestral crypt',22,15,14,9,[29,15,'x'],'crypt'),civilRoom('Service stores',36,15,12,9,[41,15,'x'],'supply')];
 const lower=civilFloorScene(lowerId,b.name+' · '+(b.race==='dwarf'?'Vaults and dungeon':'Cellars and secure rooms'),[49,25],lowerRooms,b.race,b,[b.x+44,b.y+7]);lower.entry=[37,12];
 civilStair(lower,'Stone stairs up to the guard hall',36,12,'overworld',[b.x+44,b.y+7],null);
 civilStair(world,'Guarded stone stairs to the lower vaults',b.x+43,b.y+7,lowerId,[37,12],b.service.destination);
 civilResident(lower,'Vault warden',9,5,b.race,'The cells open off the guarded passage. Supplies and the historical vault are kept on separate sides.');
 civilResident(lower,'Detained road smuggler',5,19,b.race,'I hauled untaxed cargo. The royal road is watched more closely now.');
 const tower=civilFloorScene(towerId,b.name+' · Tower lookout',[13,14],[civilRoom('Watch room',1,1,11,12,[6,12,'x'],'guard')],b.race,b,[b.x+39,b.y+7]);tower.entry=[6,10];civilStair(tower,'Spiral stairs to the upper corridor',6,11,upperId,[43,13],null,'spiral');civilResident(tower,'Tower lookout',8,4,b.race,'The main avenue runs from our gate to the civic square. Watch the approaches before the rooftops.');
 civilResident(world,'Courtyard captain',b.x+29,b.y+28,b.race,'Great hall ahead. Library on its left, guard hall and stairs on its right. The barracks and armory face this yard.',{civilCourtyard:b.service.destination});
 for(const [name,a,c]of [['Courtyard well',20,28],['Training dummy',30,32],['Supplies crate',7,36],['Stable feed',10,36]])civilPut(world,'prop',name,b.x+a,b.y+c,{civilCourtyard:b.service.destination,civilDecor:name==='Training dummy'?'dummy':null});
 b.visualHeight=14;
}
function addCivilHouse(world,t,index,x,y,kind='house',title){
 const race=KINGDOMS.find(k=>k.id===t.kingdom).race,id='civil_'+t.id+'_'+index,w=11,h=10;
 world.objects=world.objects.filter(o=>o.raiderCamp||o.mainStoryKey||o.mountainKey||o.interiorBuilding||o.type==='door'||o.x<x-5||o.x>x+w+5||o.y<y-5||o.y>y+h+5);
 const service=civilPut(world,'door',title||t.name+' '+(kind==='house'?'residence':'workshop'),x+5,y+h,{destination:id,walkThrough:true});
 const b={x,y,w,h,service,name:service.name,archetype:kind,settlement:t.id,kingdom:t.kingdom,race,walkIn:true,doorFacing:'south',variant:index%5,visualHeight:6,planned:true};service.building=b;world.buildings.push(b);
 worldScenes[id]={objects:[],buildings:[],title:b.name,entry:[5,7]};sceneSizes[id]=[11,10];realmSceneInfo.set(id,{id,title:b.name,kind,race,settlement:t.id,building:b});
 const room=civilRoom(b.name,x,y,w,h,[x+5,y+h-1,'x'],kind==='house'?'bedroom':kind==='hall'?'library':'supply');civilFurnish(world,room,race,id);
 if(kind==='house'){civilPut(world,'camp','Household hearth',x+8,y+6,{interiorBuilding:id});civilPut(world,'prop','Bookcase',x+1,y+4,{interiorBuilding:id});civilPut(world,'prop','Cooking shelf',x+8,y+4,{interiorBuilding:id});}
 civilResident(world,kind==='house'?'Local householder':'Guild worker',x+5,y+4,race,'Our homes face the street; the square is where we trade and gather.',{interiorBuilding:id});return b;
}
function expandLegacyNeighborhoods(world){
 const plans={briarhaven:[[35,17],[68,18],[83,18],[32,101],[50,104],[66,99]],willowcross:[[137,38],[154,38],[175,38],[192,59],[192,76],[207,59],[207,76],[176,112]],stoneford:[[193,151],[193,170],[249,174],[248,151],[188,193],[206,215],[227,215]]};
 for(const [id,lots]of Object.entries(plans)){const t=SETTLEMENTS.find(t=>t.id===id);for(const [i,[x,y]]of lots.entries())addCivilHouse(world,t,i,x,y,i===lots.length-1?'hall':'house');}
}
function addSettlementIdentity(world){
 for(const t of SETTLEMENTS){const plan=settlementPlans.get(t.id),race=KINGDOMS.find(k=>k.id===t.kingdom).race;plan.center=[t.x,t.y];
  const x=t.x,y=t.y,city=t.kind==='city';
  if(!t.legacy){civilPut(world,'prop',city?'Civic market monument':'Village well',x-5,y+3,{civilDecor:city?(race==='elf'?'grove':'monument'):null});
   for(const [a,b]of city?[[-8,-7],[8,-7],[-8,7],[8,7]]:[[-6,2]])civilPut(world,'prop','Market stall',x+a,y+b,{collisionRadius:1.1});
  }
  civilResident(world,city?'Market steward':'Village steward',x+4,y+2,race,plan.purpose+'. '+plan.landmark+' is our landmark. The main road meets the market here.');
  if(city){civilResident(world,'Civic banker',x-5,y-5,race,'The bank keeps your belongings safe.',{type:'banker',mapService:'bank'});for(const [dx,dy]of [[-53,0],[53,0],[0,57]])civilResident(world,'Road guard',x+dx,y+dy,race,'The avenue leads to the market. Keep the gateways clear.',{appearanceRole:'guard'});}
  if(race==='elf'&&city)for(const [dx,dy]of [[-28,-20],[27,-20],[-28,41],[27,41]])civilPut(world,'prop','Sheltering grove tree',x+dx,y+dy,{civilDecor:'grove',race,walkThrough:true});
  const townBuildings=world.buildings.filter(b=>b.settlement===t.id);plan.buildings=townBuildings.map(b=>b.service?.destination);plan.bounds={left:Math.min(...townBuildings.map(b=>b.x))-5,top:Math.min(...townBuildings.map(b=>b.y))-5,right:Math.max(...townBuildings.map(b=>b.x+b.w))+5,bottom:Math.max(...townBuildings.map(b=>b.y+b.h))+5};
  for(const b of townBuildings){if(b.archetype==='forge'){civilPut(world,'prop','Forge furnace',b.service.x+3,b.service.y+2,{workstation:'furnace'});civilPut(world,'prop','Tool table',b.x+2,b.y+b.h-3,{interiorBuilding:b.service.destination});}if(b.archetype==='shop')civilPut(world,'prop','Merchandise counter',b.x+3,b.y+b.h-3,{interiorBuilding:b.service.destination});}
  // Productive fringes stay outside the road/gate axis.
  for(const side of [-1,1]){const xx=x+side*(city?45:25),yy=plan.bounds.bottom+6;if(worldWaterDistance(xx,yy)>4){civilPut(world,'prop',race==='dwarf'?'Masons’ stone stock':'Farm supplies',xx,yy);for(let i=0;i<3;i++)if(race!=='dwarf')civilPut(world,'crop','Herb patch',xx+i*2,yy+3,{resourceId:'herbs'});}}
 }
}
function buildHabitableFloors(world){
 for(const b of world.buildings){if(!b.walkIn||b.civilCastle||!b.service||!/inn|house|hall/.test(b.archetype||''))continue;
  // Selected sizable residences and every mainland inn gain actual stairs and rooms.
  if(b.archetype!=='inn'&&!(b.w>=10&&b.h>=9&&(b.variant||0)%3===1))continue;
  const id=b.service.destination+'_upper';if(civilFloors.has(id))continue;
  const rooms=[civilRoom(b.archetype==='inn'?'Guest room 1':'Family bedroom',1,1,9,9,[5,9,'x'],'guest'),civilRoom(b.archetype==='inn'?'Guest room 2':'Private study',10,1,9,9,[14,9,'x'],b.archetype==='inn'?'guest':'study')];
  let spot=null;for(let y=b.y+2;y<b.y+b.h-2&&!spot;y++)for(let x=b.x+2;x<b.x+b.w-2&&!spot;x++)if(!world.objects.some(o=>Math.hypot(o.x-x,o.y-y)<1.6)&&Math.abs(x-b.service.x)>1)spot=[x,y];if(!spot)continue;
  const upper=civilFloorScene(id,b.name+' · Upstairs',[20,15],rooms,b.race||'human',b,[spot[0],spot[1]+1]);upper.entry=[10,12];
  civilStair(world,'Wooden stairs to '+(b.archetype==='inn'?'the guest rooms':'the private rooms'),...spot,id,[10,12],b.service.destination,'wood');civilStair(upper,'Wooden stairs to the ground floor',10,13,'overworld',[spot[0],spot[1]+1],null,'wood');
  if(b.archetype==='inn'){world.objects=world.objects.filter(o=>o.interiorBuilding!==b.service.destination||!/^Bed/.test(o.name));const cellarId=b.service.destination+'_cellar',cellar=civilFloorScene(cellarId,b.name+' · Store cellar',[16,13],[civilRoom('Supplies cellar',1,1,14,11,[8,11,'x'],'cellar')],b.race||'human',b,[spot[0],spot[1]+1]);cellar.entry=[8,9];civilStair(upper,'Service stairs down to the cellar',17,12,cellarId,[8,9],null,'stone');civilStair(cellar,'Service stairs up to the guest hallway',8,10,id,[16,12],null,'stone');}
  b.usableUpper=id;
 }
}
function civilCityWalls(world){
 const map=new Map();civilWalls.set('overworld',map);
 for(const t of SETTLEMENTS.filter(t=>t.capital)){const plan=settlementPlans.get(t.id),left=t.x-59,right=t.x+59,top=t.y-85,bottom=t.y+67;plan.fortification={left,right,top,bottom};
  civilRectWalls(map,left,top,right-left+1,bottom-top+1,t.kingdom==='sylvaran'?3.5:4.2);
  civilOpening(map,t.x,bottom,'x',7);civilOpening(map,left,t.y,'y',7);civilOpening(map,right,t.y,'y',7);
  // Gate piers and towers flank openings; their collision is the same as the walls.
  for(const [x,y,turn]of [[t.x,bottom,0],[left,t.y,Math.PI/2],[right,t.y,Math.PI/2]])civilPut(world,'prop',t.name+' city gate',x,y,{civilDecor:'gate',walkThrough:true,roomYaw:turn,race:KINGDOMS.find(k=>k.id===t.kingdom).race});
  for(const [x,y]of [[left,top],[right,top],[left,bottom],[right,bottom]])civilPut(world,'prop',t.name+' wall tower',x,y,{civilDecor:'tower',race:KINGDOMS.find(k=>k.id===t.kingdom).race,walkThrough:true});
 }
}
function setupSurfaceQuarries(world){
 const defs=[
 {id:'ironhollow',name:'Ironhollow Crown Quarry',x:858,y:129,rx:27,ry:27,levels:3,type:'industrial',town:'ironhollow',ores:['copper','tin','iron','iron','coal']},
 {id:'copperdelve',name:'Copperdelve Cut',x:671,y:257,rx:20,ry:20,levels:2,type:'local',town:'copperdelve',ores:['copper','tin','copper']},
 {id:'crownreach',name:'Crown Masonry Quarry',x:465,y:165,rx:22,ry:22,levels:2,type:'industrial',town:'crownreach',ores:['copper','tin','iron']},
 {id:'deepforge',name:'Deepforge Regional Quarry',x:959,y:344,rx:33,ry:33,levels:4,type:'regional',town:'deepforge',ores:['iron','iron','coal','coal','mithril']},
 {id:'stoneford',name:'Old Stoneford Cut',x:275,y:278,rx:20,ry:20,levels:2,type:'abandoned',town:'stoneford',ores:['copper','tin']}
 ];
 for(const q of defs){q.level=Math.max(8,landBase(q.x,q.y));surfaceQuarries.push(q);settlementPlans.get(q.town).quarries.push(q.id);
  world.objects=world.objects.filter(o=>o.mainStoryKey||o.mountainKey||o.type==='door'||o.interiorBuilding||Math.abs(o.x-q.x)>q.rx+3||Math.abs(o.y-q.y)>q.ry+3);
  const bottom=q.y+q.ry+5,town=SETTLEMENTS.find(t=>t.id===q.town),gate=settlementPlans.get(q.town).entrances[1];
  const workRoad=[[q.x+.5,bottom],[q.x-q.rx-6,bottom],[q.x-q.rx-6,town.y+.5],gate];for(let i=1;i<workRoad.length;i++)plannedRoad(workRoad[i-1],workRoad[i],1.8,false);plannedRoad([q.x+.5,bottom],[q.x+.5,q.y-8],1.6,false);
  for(let i=0;i<q.ores.length;i++){const inset=7+Math.min(q.levels-1,i)*5,x=q.x-q.rx+inset+2,y=q.y+(i%2?7:-7);civilPut(world,'ore',ORE_RESOURCES[q.ores[i]].name,x,y,{resourceId:q.ores[i],quarry:q.id});}
  const abandoned=q.type==='abandoned';
  const shed=addCivilHouse(world,town,100+surfaceQuarries.length,q.x+14,bottom+10,'hall',abandoned?'Abandoned quarry office':'Quarry records and stores');shed.quarry=q.id;
  for(const [name,dx,dy,decor]of [[abandoned?'Broken quarry cart':'Quarry loading cart',-8,q.ry+3,null],['Cut stone stock',9,q.ry+3,'stoneStock'],['Quarry lifting crane',q.rx-4,-5,'crane'],['Rubble',-q.rx+3,5,'rubble'],['Tool table',8,q.ry-1,null],['Supplies crate',11,q.ry-1,null]])civilPut(world,'prop',name,q.x+dx,q.y+dy,{civilDecor:decor,quarry:q.id});
  if(abandoned){civilPut(world,'prop','Collapsed work ramp',q.x+q.rx-4,q.y+q.ry-4,{civilDecor:'brokenRamp',quarry:q.id});for(const [dx,dy]of [[-8,-4],[8,6]])civilPut(world,'tree','Old-growth oak',q.x+dx,q.y+dy,{resourceId:'normal',quarry:q.id});}
  else {for(let i=0;i<(q.type==='regional'?5:3);i++)civilResident(world,'Quarry '+['mason','hauler','foreman','guard','surveyor'][i],q.x+5+i*3,bottom+4,'dwarf','The work road descends between the cut terraces. Copper and tin remain accessible; richer stone needs the usual Mining training.',{quarry:q.id});civilPut(world,'prop','Quarry headframe',q.x+q.rx-3,q.y+q.ry-3,{civilDecor:'headframe',quarry:q.id});}
 }
}
function quarryAt(x,y,pad=0){return surfaceQuarries.find(q=>Math.abs(x-q.x)<q.rx+pad&&Math.abs(y-q.y)<q.ry+pad);}
function quarryDepth(q,x,y){const edge=Math.min(q.rx-Math.abs(x-q.x),q.ry-Math.abs(y-q.y));if(edge<=0)return 0;const ramp=Math.abs(x-q.x)<2.6&&y>=q.y-8;
 if(ramp)return Math.min(q.levels*2.2,Math.max(0,(q.y+q.ry-y)/(q.ry+8)*q.levels*2.2));
 let depth=0;for(let i=1;i<=q.levels;i++){const t=Math.max(0,Math.min(1,(edge-(i*5-1))));depth+=t*2.2;}return depth;
}
function quarryCliff(q,x,y){if(Math.abs(x+.5-q.x)<3&&y+.5>=q.y-9)return false;const edge=Math.min(q.rx-Math.abs(x+.5-q.x),q.ry-Math.abs(y+.5-q.y));return Array.from({length:q.levels},(_,i)=>(i+1)*5-.5).some(d=>Math.abs(edge-d)<.65);}
const civilGradeBefore=gradeLand;
gradeLand=function(x,y,height){const before=civilGradeBefore(x,y,height);if(currentScene!=='overworld')return before;const q=quarryAt(x,y,12);if(q){const d=Math.max(Math.abs(x-q.x)-q.rx,Math.abs(y-q.y)-q.ry,0),t=Math.max(0,Math.min(1,(d-6)/6)),blend=1-t*t*(3-2*t);return before*(1-blend)+(q.level-quarryDepth(q,x,y))*blend;}
 for(const plan of settlementPlans.values()){if(plan.id==='briarhaven'||!Number.isFinite(plan.grade))continue;const t=SETTLEMENTS.find(t=>t.id===plan.id),d=Math.hypot(x-t.x,y-t.y),r=plan.radius+8;if(d>r+20)continue;const k=Math.max(0,Math.min(1,(r+20-d)/20));return before*(1-k)+plan.grade*k;}
 return before;};
const civilWallBefore=worldWall;
worldWall=function(x,y){if(civilStairWells.get(currentScene)?.some(h=>x===h.tx&&Math.abs(y-h.ty)===1))return true;if(civilWalls.get(currentScene)?.has(x+':'+y))return true;if(currentScene==='overworld'){const q=quarryAt(x+.5,y+.5);if(q&&quarryCliff(q,x,y))return true;}return civilWallBefore(x,y);};
const civilBuildingBefore=inBuilding;
inBuilding=function(b,x,y){if(!b.civilWallTiles)return civilBuildingBefore(b,x,y);if(b.civilWallTiles.has(x+':'+y))return true;const [dx,dy]=doorThreshold(b.service);return x===dx&&y===dy&&b.service.openedAt===undefined;};
const civilInteractionBefore=handleWorldInteraction;
handleWorldInteraction=function(o){if(!o.civilStair)return civilInteractionBefore(o);const {destination,entry}=o.civilStair;stop();s.returnPoint=destination==='overworld'?[...entry]:worldScenes[destination]?.returnAt||s.returnPoint;activateScene(destination,...entry);toast(o.name+'.');return true;};
const civilLeaveBefore=leaveInterior;
leaveInterior=function(){const room=worldScenes[currentScene];if(!room?.civilFloor)return civilLeaveBefore();const stair=room.objects.find(o=>o.civilStair);if(stair)engage(stair);};
const civilRegionBefore=regionInfo;
regionInfo=function(){const q=currentScene==='overworld'&&quarryAt(s.x,s.y,8);if(q)return [q.name,q.type==='abandoned'?'Abandoned workings · Weathered terraces':q.type+' quarry · Surface Mining'];const floor=civilFloors.get(currentScene);if(floor){const room=floor.rooms.find(r=>s.x>r.x&&s.x<r.x+r.w-1&&s.y>r.y&&s.y<r.y+r.h-1);return [worldScenes[currentScene].title,room?.name||'Stair hall and connecting passage'];}if(currentScene==='overworld'){const b=buildings.find(b=>b.civilRooms&&withinWalkIn(b,s.x,s.y));if(b){const r=b.civilRooms.find(r=>s.x>r.x&&s.x<r.x+r.w-1&&s.y>r.y&&s.y<r.y+r.h-1);return [b.name,r?.name||'Courtyard · Great hall ahead'];}}return civilRegionBefore();};
function civilClearRoutes(world){
 const protectedObject=o=>o.civilization||o.raiderCamp||(o.briarhavenDetail&&o.type!=='tree')||o.mainStoryKey||o.mountainKey||o.interiorBuilding||o.type==='door'||o.quarry||o.civilDecor==='gate'||o.civilDecor==='tower';
 const bad=(x,y)=>civilWalls.get('overworld')?.has(x+':'+y)||world.buildings.some(b=>inBuilding(b,x,y))||expandedWater(x,y);
 for(const o of world.objects){if(protectedObject(o)||!bad(o.x,o.y))continue;let found=false;for(let r=1;r<=20&&!found;r++)for(let dy=-r;dy<=r&&!found;dy++)for(let dx=-r;dx<=r&&!found;dx++){const x=o.x+dx,y=o.y+dy;if(Math.max(Math.abs(dx),Math.abs(dy))!==r||bad(x,y)||world.objects.some(p=>p!==o&&Math.hypot(p.x-x,p.y-y)<1.2))continue;civilMove(o,x,y);found=true;}}
 world.objects=world.objects.filter(o=>protectedObject(o)||!['tree','prop','ore','crop'].includes(o.type)||o.workstation||roadInfluence(o.x+.5,o.y+.5)[0]<(o.type==='tree'?.03:.55));
}
function buildBeaconLevels(world){
 const b=world.buildings.find(b=>b.name==='The coastal beacon');if(!b)return;const ground='coastal_beacon_guard',upper='coastal_beacon_watch',roof='coastal_beacon_roof',x=b.x+Math.floor(b.w/2),y=b.y+b.h;
 b.service=civilPut(world,'door','Coastal beacon entrance',x,y,{destination:ground});b.race='human';
 const levels=[[ground,'Guard room','guard'],[upper,'Watch barracks','barracks'],[roof,'Beacon lookout','guard']];
 for(const [i,[id,title,usage]]of levels.entries()){const floor=civilFloorScene(id,'Coastal beacon · '+title,[15,16],[civilRoom(title,1,1,13,14,[7,14,'x'],usage)],'human',b,[x,y+1]);floor.entry=[6,12];
  civilStair(floor,i?'Spiral stairs down to '+levels[i-1][1]:'Door to the coastal road',7,13,i?levels[i-1][0]:'overworld',i?[6,11]:[x,y+1],null,'spiral');if(i<2)civilStair(floor,'Spiral stairs to '+levels[i+1][1],11,10,levels[i+1][0],[6,12],null,'spiral');
  if(i===2)civilPut(floor,'camp','Coastal signal brazier',7,4,{walkThrough:true});
 }
}
function reinforceGoblinVillage(world){
 for(const o of world.objects.filter(o=>o.name==='Brambleclaw tent'))o.campModel='tent';
 for(const x of [85,87,89,101,103,105])civilPut(world,'prop','Scavenged goblin barrier',x,86,{campModel:'palisade'});
 for(const y of [91,93,95,103,105,107])civilPut(world,'prop','Scavenged goblin barrier',109,y,{campModel:'palisade',heading:Math.PI/2});
 for(const [x,y]of [[83,89],[108,108]])civilPut(world,'prop','Goblin watch platform',x,y,{civilDecor:'headframe'});
 for(const [x,y]of [[99,108],[101,108],[103,108]])civilPut(world,'prop','Scavenged pen fence',x,y,{campModel:'palisade'});
 civilPut(world,'prop','Goblin food store',98,102,{campModel:'bedroll'});civilPut(world,'prop','Scavenged weapon rack',101,101);
}
const civilizationSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){civilizationSetupBefore();if(civilizationReady)return;civilizationReady=true;
 const saved={scene:currentScene,x:s.x,y:s.y},world=worldScenes.overworld;currentScene='overworld';
 for(const p of settlementPlans.values()){const t=SETTLEMENTS.find(t=>t.id===p.id);p.grade=p.id==='briarhaven'?.75:Math.max(1.5,landBase(t.x,t.y));}
 const workbench=world.objects.find(o=>o.mountainKey==='workbench');if(workbench)civilMove(workbench,780,123);
 expandLegacyNeighborhoods(world);for(const b of world.buildings.filter(b=>b.archetype==='castle'))buildCastle(world,b);
 addSettlementIdentity(world);buildHabitableFloors(world);buildBeaconLevels(world);reinforceGoblinVillage(world);civilCityWalls(world);setupSurfaceQuarries(world);
 // Replace the old radial lanes with a readable civic spine and three neighborhoods.
 for(let i=organicRoads.length-1;i>=0;i--){const r=organicRoads[i],x=(r.a[0]+r.b[0])/2,y=(r.a[1]+r.b[1])/2;if(x>=29&&x<=105&&y>=15&&y<=117)organicRoads.splice(i,1);}
 const briarRoutes=[[[64,15],[64,50],[55,50],[55,70],[64,70],[64,118]],[[27,69],[105,69]],[[30,29],[100,29]],[[30,115],[80,115]],[[40,50],[40,52],[55,52]],[[55,46],[55,50]],[[64,43],[78,43]],[[55,56],[64,56]],[[47,78],[64,78]],[[75,69],[75,76]],[[40,27],[40,29]],[[73,28],[73,29]],[[88,28],[88,29]],[[37,111],[37,115]],[[55,114],[55,115]],[[71,109],[71,115]],[[48,92],[64,92]],[[95,69],[95,85],[91,85],[91,97]],[[95,69],[95,52],[112,52]]];
 const briarPlan=settlementPlans.get('briarhaven');briarPlan.roads=[];briarPlan.entrances=[[64,15],[105,69],[64,118]];
 for(const [i,points]of briarRoutes.entries())for(let j=1;j<points.length;j++)briarPlan.roads.push({a:points[j-1],b:points[j],width:i===0?1.6:1.2,role:i<2?'main road':'neighborhood street'});
 for(const route of briarRoutes)for(let i=1;i<route.length;i++)plannedRoad(route[i-1],route[i],route===briarRoutes[0]?1.6:1.2,true,'briarhaven');
 for(const b of world.buildings.filter(b=>b.planned&&b.settlement!=='briarhaven'&&!b.quarry)){const t=SETTLEMENTS.find(t=>t.id===b.settlement);laneOccupancy.clear();curveRoad(t.x+.5,t.y+.5,b.service.x+.5,b.service.y+.5,1.1,true);}
 for(const q of surfaceQuarries){const p=settlementPlans.get(q.town);p.resourcePurpose=q.name+' supplies '+SETTLEMENTS.find(t=>t.id===q.town).name;}
 roadBuckets=null;civilClearRoutes(world);roadBuckets=null;realmNavigation.clear();resetLandSurface();miniTerrain=null;worldAtlasTerrain=null;mapServicesCache=null;
 currentScene=saved.scene;objects.splice(0,objects.length,...worldScenes[currentScene].objects);buildings.splice(0,buildings.length,...worldScenes[currentScene].buildings);
 if(!land(saved.x,saved.y)){let point=null;for(let r=1;r<40&&!point;r++)for(let dy=-r;dy<=r&&!point;dy++)for(let dx=-r;dx<=r&&!point;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r&&land(saved.x+dx,saved.y+dy))point=[saved.x+dx,saved.y+dy];if(point)activateScene(currentScene,...point,false);}
 s.civilizationVersion=CIVILIZATION_VERSION;
};

function civilStairWellAt(x,y){return civilStairWells.get(currentScene)?.some(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h);}
function civilPaintFloor(r,x,y,w,h,color,material,height=.04){let rects=[[x,y,w,h]];for(const hole of civilStairWells.get(currentScene)||[]){const next=[];for(const [a,b,c,d]of rects){const left=Math.max(a,hole.x),right=Math.min(a+c,hole.x+hole.w),top=Math.max(b,hole.y),bottom=Math.min(b+d,hole.y+hole.h);if(left>=right||top>=bottom){next.push([a,b,c,d]);continue;}if(top>b)next.push([a,b,c,top-b]);if(bottom<b+d)next.push([a,bottom,c,b+d-bottom]);if(left>a)next.push([a,top,left-a,bottom-top]);if(right<a+c)next.push([right,top,a+c-right,bottom-top]);}rects=next;}
 for(const [a,b,c,d]of rects)r.face([[a,height,b],[a,height,b+d],[a+c,height,b+d],[a+c,height,b]],color,null,material);
}
// Modular geometry shares materials and caches; the same wall tiles drive collision.
function civilWallGeometry(r,tile,height=tile.height){const q=materialRealm(r,18);box3(q,tile.x+.5,height/2,tile.y+.5,1,height,1,'#858c85');box3(q,tile.x+.5,height+.06,tile.y+.5,1.07,.12,1.07,'#b0afa0');}
const civilDrawBuildingBefore=building3;
building3=function(r,b){
 if(!b.civilWallTiles)return civilDrawBuildingBefore(r,b);
 const p=worldStyle[b.race],q=groundedPainter(r,b.x+b.w/2,b.y+b.h/2),stone=materialRealm(q,18),cut=!!b._cutaway;
 civilPaintFloor(q,b.x,b.y,b.w,b.h,'#9b9b8b',18);
 for(const room of b.civilRooms)civilPaintFloor(q,room.x+.8,room.y+.8,room.w-1.6,room.h-1.6,room.usage==='hall'?'#807065':room.usage==='library'?'#a18b68':'#8b8a7d',room.usage==='library'?5:18,.065);
 for(const tile of b.civilWallTiles.values()){
  // The near side drops to waist height while roofs lift, preserving room boundaries.
  const ahead=(tile.x-(b.x+b.w/2))*Math.sin(view3d.yaw)+(tile.y-(b.y+b.h/2))*Math.cos(view3d.yaw),h=cut&&ahead> -8?.65:tile.height;
  civilWallGeometry(q,tile,h);
  if(!cut&&tile.height>4&&((tile.x+tile.y)%2===0))box3(stone,tile.x+.5,h+.4,tile.y+.5,.7,.7,.7,p.stone);
 }
 if(!cut){
  for(const room of b.civilRooms){const hall=room.usage==='hall',height=hall?8:room.name==='Library'||room.usage==='guard'?6.5:4.3;
   if(hall){box3(stone,room.x+room.w/2,6,room.y+room.h/2,room.w-1,4,room.h-1,p.stone);for(let i=3;i<room.w-2;i+=4)windowRealm(q,room.x+i,6.6,room.y+room.h-.4,.8,1.8,p.trim,true);}
   worldRoof(q,room.x+room.w/2,height,room.y+room.h/2,room.w,room.h,hall?3.8:1.8,p.roof[0],{hip:b.race==='dwarf',curve:b.race==='elf'});
  }
 }
 for(const [dx,dy]of [[0,0],[b.w-3,0],[0,b.h-3],[b.w-3,b.h-3]]){
  const x=b.x+dx+1.5,y=b.y+dy+1.5,h=cut?1.1:8.5;
  profile3(stone,x,h/2,y,3.6,h,3.6,[[-.5,1.12],[-.40,1],[.40,1],[.5,1.1]],p.stone,v=>v,b.race==='dwarf'?8:12);
  if(!cut){for(let i=0;i<8;i++){const a=i*Math.PI/4;box3(stone,x+Math.cos(a)*1.65,h+.4,y+Math.sin(a)*1.65,.7,.8,.7,p.stone);}beamArt(q,[x,h,y],[x,h+3,y],.05,p.trim);q.face([[x,h+3,y],[x+1.3,h+2.7,y],[x+1.1,h+1.8,y],[x,h+1.9,y]],p.cloth,null,13);}
 }
 const gateX=b.x+24.5,gateY=b.y+b.h-.1;
 for(const side of [-1,1])box3(stone,gateX+side*2.1,2.8,gateY,1.4,5.6,2,p.stone);
 box3(stone,gateX,5.2,gateY,5.7,1.0,2,p.stone);
 return b.visualHeight=12;
};
const civilPropBefore=prop3;
prop3=function(r,o,x,z){
 if(o.civilStair){const q=groundedPainter(r,x,z),wood=o.civilStair.kind==='wood',p=materialRealm(q,wood?5:18),color=wood?'#826044':'#a1a49a';
  if(o.civilStair.down){for(const side of [-1,1])box3(p,x+side*.79,-1.3,z,.08,2.6,3,'#484e4d');box3(p,x,-2.65,z,1.6,.1,3,'#303737');for(let i=0;i<8;i++)box3(p,x,-.14-i*.25,z+1.25-i*.36,1.45,.16,.37,color);for(const side of [-1,1]){beamArt(p,[x+side*.78,.65,z+1.4],[x+side*.78,.65,z-1.4],.055,color);for(const zz of [-1.3,1.3])beamArt(p,[x+side*.78,.02,z+zz],[x+side*.78,.7,z+zz],.055,color);}return .9;}
  if(o.civilStair.kind==='spiral'){profile3(p,x,1.2,z,.3,2.4,.3,[[-.5,1],[.5,1]],color,a=>a,8);for(let i=0;i<10;i++){const a=i*.5;box3(p,x+Math.cos(a)*.55,i*.22+.1,z+Math.sin(a)*.55,.7,.18,.7,color);}}
  else{for(let i=0;i<8;i++)box3(p,x,.12+i*.13,z+.95-i*.28,1.45,.24+i*.26,.3,color);for(const side of [-1,1]){beamArt(p,[x+side*.8,.8,z+1.1],[x+side*.8,2.4,z-1.2],.055,color);for(const zz of [-1,1])beamArt(p,[x+side*.8,0,z+zz],[x+side*.8,zz>0?.85:2.35,z+zz],.045,color);}}
  return 2.5;
 }
 if(!o.civilDecor)return civilPropBefore(r,o,x,z);
 const q=groundedPainter(r,x,z),p=worldStyle[o.race||'dwarf'],stone=materialRealm(q,18),wood=materialRealm(q,5);
 if(o.civilDecor==='cellBars'){for(let a=-o.barWidth/2;a<=o.barWidth/2;a+=.5){if(Math.abs(a)<1.6)continue;beamArt(q,[x+a,.3,z+.5],[x+a,2.6,z+.5],.035,'#424b4b',6);}for(const side of [-1,1])beamArt(q,[x+side*1.6,2.5,z+.5],[x+side*o.barWidth/2,2.5,z+.5],.055,'#424b4b',6);return 2.6;}
 if(o.civilDecor==='gate'){const turn=o.roomYaw||0,loc=worldLocal(q,x,0,z,turn),s=materialRealm(loc,18);for(const side of [-1,1]){box3(s,side*4.4,3,0,2,6,3,p.stone);for(const dx of [-.65,.65])box3(s,side*4.4+dx,6.4,0,.55,.8,3,p.stone);loc.face([[side*3.35,4.5,1.55],[side*2.55,4.5,1.55],[side*2.55,2.6,1.55],[side*3,2.2,1.55]],p.cloth,null,13);}box3(s,0,5.8,0,8,1,2.5,p.stone);return 7;}
 if(o.civilDecor==='tower'){profile3(stone,x,4,z,3.4,8,3.4,[[-.5,1.1],[-.4,1],[.4,1],[.5,1.1]],p.stone,a=>a,8);for(let i=0;i<8;i++){const a=i*Math.PI/4;box3(stone,x+Math.cos(a)*1.6,8.4,z+Math.sin(a)*1.6,.6,.8,.6,p.stone);}return 9;}
 if(o.civilDecor==='crane'||o.civilDecor==='headframe'){for(const side of [-1,1]){beamArt(wood,[x+side*1.7,0,z],[x+side*.6,5,z],.18,p.wood,8);beamArt(wood,[x+side*1.7,0,z+1.4],[x+side*.6,5,z],.15,p.wood,8);}beamArt(wood,[x-1.1,4.6,z],[x+3.8,4.6,z],.17,p.wood,8);beamArt(q,[x+3,4.6,z],[x+3,.8,z],.025,'#b6a989',6);box3(stone,x+3,.65,z,1,.8,1,p.stone);return 5.2;}
 if(o.civilDecor==='stoneStock'){for(let i=0;i<6;i++)box3(stone,x+(i%3-.5)*.65,.25+Math.floor(i/3)*.5,z, .6,.5,1.3,'#aaa996');return 1.2;}
 if(o.civilDecor==='rubble'){for(let i=0;i<4;i++)worldModel(q,'Rock_Medium_1',x+Math.sin(i*2)*.6,0,z+Math.cos(i*2)*.6,.4+i*.12);return 1;}
 if(o.civilDecor==='brokenRamp'){for(let i=0;i<5;i++)beamArt(wood,[x-.7,i*.12,z-i*.45],[x+.7,i*.12,z-i*.45+.2],.1,p.wood,6);return 1;}
 if(o.civilDecor==='dummy')return drawPracticeDummy(q,{tutorialRole:'melee-dummy'},x,z);
 if(o.civilDecor==='grove'){profile3(wood,x,3,z,1.8,6,1.8,[[-.5,1.3],[-.4,1],[.5,.6]],'#6d6550',a=>a,12);for(const side of [-1,1]){beamArt(wood,[x,3,z],[x+side*3,6,z],.25,'#6d6550',8);oval3(q,x+side*2,6.2,z,5,2.5,4,'#4e785d',a=>a,10);}return 8;}
 if(o.civilDecor==='monument'){box3(stone,x,.3,z,2.1,.6,2.1,p.stone);profile3(stone,x,2.3,z,.7,4,.7,[[-.5,1.3],[.4,1],[.5,.1]],p.stone,a=>a,8);return 4.5;}
 return civilPropBefore(r,o,x,z);
};
const civilWallArtBefore=drawRealmWall;
drawRealmWall=function(r,x,y){const floor=civilFloors.get(currentScene);if(!floor)return civilWallArtBefore(r,x,y);const tile=floor.walls.get(x+':'+y);if(!tile)return;const close=Math.hypot(x-px,y-py)<18,ahead=(x-px)*Math.sin(view3d.yaw)+(y-py)*Math.cos(view3d.yaw);civilWallGeometry(r,tile,Math.min(tile.height,close&&ahead>0?.65:2.8));};
const civilCrossingsBefore=drawRealmCrossings;
drawRealmCrossings=function(r){civilCrossingsBefore(r);
 if(currentScene==='overworld'){const limit=Math.hypot(screen.w,screen.h)/cameraZoom3()+10;for(const tile of civilWalls.get('overworld')?.values()||[]){if(Math.abs(tile.x-px)>limit||Math.abs(tile.y-py)>limit)continue;civilWallGeometry(r,tile);if((tile.x+tile.y)%2===0)box3(materialRealm(r,18),tile.x+.5,tile.height+.4,tile.y+.5,.6,.8,.6,'#969e92');}}
 else if(civilFloors.has(currentScene)){for(const room of civilFloors.get(currentScene).rooms)civilPaintFloor(r,room.x+.5,room.y+.5,room.w-1,room.h-1,['library','study','bedroom','guest'].includes(room.usage)?'#a38a68':'#95988b',5);}
};
const civilRoadBefore=roadInfluence;
roadInfluence=function(x,y){const out=civilRoadBefore(x,y);if(currentScene!=='overworld')return out;const q=quarryAt(x,y);if(q)return [1,0,1];return out;};
function civilizationReviewPoint(name){
 const castle=worldScenes.overworld.buildings.find(b=>b.settlement==='ironhollow'&&b.civilCastle),town=id=>{const t=SETTLEMENTS.find(t=>t.id===id);return ['overworld',t.x,t.y+5];};
 const points={briarhaven:town('briarhaven'),ironhollow:town('ironhollow'),'small-village':town('fernwatch'),'large-village':town('copperdelve'),town:town('willowcross'),capital:town('crownreach'),goblins:['overworld',95,99],dwarven:town('deepforge'),elven:town('aelindor'),
 'citadel-exterior':['overworld',castle.x+24,castle.y+castle.h+12],'citadel-courtyard':['overworld',castle.x+24,castle.y+28],'citadel-hall':['overworld',castle.x+24,castle.y+12],'citadel-library':['overworld',castle.x+8,castle.y+7],'citadel-upper':[castle.service.destination+'_upper',24,13],'citadel-lower':[castle.service.destination+'_lower',24,12]};
 for(const [key,id]of [['ironhollow-quarry','ironhollow'],['active-quarry','deepforge'],['abandoned-quarry','stoneford']]){const q=surfaceQuarries.find(q=>q.id===id);points[key]=['overworld',q.x,q.y+8];}
 return points[name];
}
