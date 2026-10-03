'use strict';
// Authored architecture and industry. Object IDs and scene IDs remain stable across saves.
const CIVILIZATION_VERSION=4, civilFloors=new Map(), civilWalls=new Map(), civilStairWells=new Map(),civilLegacyReturns=new Map();let surfaceQuarries=[],civilWalkableStructures=[],civilGatehouses=[];
const CIVIL_ARCHITECTURE_SCALE=Object.freeze({castleGateWidth:5.5,castleGateHeight:8.25,castleGateTowerFootprint:7,castleGateTowerHeight:9.2,cityGateWidth:9,cityGateHeight:9,cityGateTowerFootprint:11,cityGateTowerDepth:13,cityGateTowerHeight:8.8,cityGateDoorWidth:2.4,cityGateDoorHeight:3.2,cityGateRampartHeight:5.4,cityWallTowerFootprint:10,cityWallTowerHeight:11});
let civilizationReady=false,civilSerial=7400000;
function civilMove(o,x,y){Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});}
function civilPut(world,type,name,x,y,extra={}){const o={id:civilSerial++,type,name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:12,dead:0,hitAt:-100,attackAt:-100,civilization:true,...extra};world.objects.push(o);return o;}
function civilResident(world,name,x,y,race,talk,extra={}){return civilPut(world,'villager',name,x,y,{race,characterSprite:true,_stationary:true,talk,...extra});}
function civilRectWalls(map,x,y,w,h,height=3){for(let a=x;a<x+w;a++){map.set(a+':'+y,{x:a,y,height,axis:'x'});map.set(a+':'+(y+h-1),{x:a,y:y+h-1,height,axis:'x'});}for(let b=y+1;b<y+h-1;b++){map.set(x+':'+b,{x,y:b,height,axis:'y'});map.set((x+w-1)+':'+b,{x:x+w-1,y:b,height,axis:'y'});}}
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
 civilOpening(walls,x+24,y+b.h-1,'x',3);b.civilRooms=rooms;b.civilWallTiles=walls;b.civilGateHalfWidth=1;
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
function civilContinuousUpper(world,b,{rise=3.05,deckDepth=3}={}){
 const deck={x:b.x+1,y:b.y+1,w:b.w-2,h:Math.min(deckDepth,b.h-7)},ramp={x:b.x+b.w-3,y:b.y+deck.h,w:2,h:b.h-deck.h-2},structure={building:b,rise,ramp,decks:[deck],kind:'interiorUpper'};
 b.civilUpper=structure;b.usableUpper='overworld';civilWalkableStructures.push(structure);
 const occupied=(x,y,o)=>world.objects.some(p=>p!==o&&Math.hypot(p.x-x,p.y-y)<1.2);
 for(const o of world.objects.filter(o=>o.x>=ramp.x-1&&o.x<ramp.x+ramp.w+1&&o.y>=ramp.y-1&&o.y<ramp.y+ramp.h+1&&o!==b.service)){
  let moved=false;for(let y=b.y+deck.h+1;y<b.y+b.h-1&&!moved;y++)for(let x=b.x+1;x<b.x+b.w-4&&!moved;x++)if(!occupied(x,y,o)&&Math.abs(x-b.service.x)>1){civilMove(o,x,y);moved=true;}
  if(!moved)o.walkThrough=true;
 }
 civilPut(world,'prop','Physical stairs to the upper floor',ramp.x+1,ramp.y+ramp.h-1,{civilContinuousStair:structure,interiorBuilding:b.service.destination,walkThrough:true,blocksSight:false});
 return structure;
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
 // Old saves may name these scenes, but all normal upper circulation now stays
 // in the live castle.  The courtyard stair reaches the royal gallery and wall
 // walk directly; only the genuinely subterranean vault remains a scene.
 civilLegacyReturns.set(upperId,[b.x+32,b.y+22]);civilLegacyReturns.set(towerId,[b.x+32,b.y+22]);
 const lowerRooms=[civilRoom('Guard station',1,1,14,10,[8,10,'x'],'guard'),civilRoom(b.race==='dwarf'?'Military stores':'Treasury vault',15,1,18,10,[24,10,'x'],b.race==='dwarf'?'supply':'treasury'),civilRoom('Food cellar',33,1,15,10,[40,10,'x'],'cellar'),civilRoom('Secure cell',1,15,11,9,[6,15,'x'],'cell'),civilRoom('Holding cell',11,15,11,9,[16,15,'x'],'cell'),civilRoom(b.race==='elf'?'Root memorial':'Ancestral crypt',22,15,14,9,[29,15,'x'],'crypt'),civilRoom('Service stores',36,15,12,9,[41,15,'x'],'supply')];
 const lower=civilFloorScene(lowerId,b.name+' · '+(b.race==='dwarf'?'Vaults and dungeon':'Cellars and secure rooms'),[49,25],lowerRooms,b.race,b,[b.x+44,b.y+7]);lower.entry=[37,12];
 civilStair(lower,'Stone stairs up to the guard hall',36,12,'overworld',[b.x+44,b.y+7],null);
 civilStair(world,'Guarded stone stairs to the lower vaults',b.x+43,b.y+7,lowerId,[37,12],b.service.destination);
 civilResident(lower,'Vault warden',9,5,b.race,'The cells open off the guarded passage. Supplies and the historical vault are kept on separate sides.');
 civilResident(lower,'Detained road smuggler',5,19,b.race,'I hauled untaxed cargo. The royal road is watched more closely now.');
 civilResident(world,'Courtyard captain',b.x+29,b.y+28,b.race,'Great hall ahead. Library on its left, guard hall and stairs on its right. The barracks and armory face this yard.',{civilCourtyard:b.service.destination});
 for(const [name,a,c]of [['Courtyard well',20,28],['Training dummy',27,32],['Supplies crate',7,36],['Stable feed',10,36]])civilPut(world,'prop',name,b.x+a,b.y+c,{civilCourtyard:b.service.destination,civilDecor:name==='Training dummy'?'dummy':null});
 // Continuous courtyard stairs and wall walks: normal pathfinding walks this
 // geometry without activating another scene.
 const rampart={building:b,rise:4.4,ramp:{x:b.x+31,y:b.y+23,w:3,h:12},decks:[{x:b.x+14,y:b.y+21,w:21,h:3},{x:b.x+14,y:b.y+21,w:3,h:14},{x:b.x+32,y:b.y+21,w:3,h:14}]};
 b.civilRampart=rampart;civilWalkableStructures.push(rampart);
 civilPut(world,'prop','Walkable stone stairs to the ramparts',b.x+32,b.y+29,{civilRampartStair:rampart,walkThrough:true,blocksSight:false,civilCourtyard:b.service.destination});
 b.usableUpper='overworld';b.civilUpperRooms=[{name:'Royal gallery',x:b.x+17,y:b.y+21,w:15,h:3},{name:'Tower watch',x:b.x+32,y:b.y+24,w:3,h:8}];
 for(const [name,x,y]of [['Royal gallery table',b.x+23,b.y+22],['Royal gallery chair',b.x+20,b.y+22],['Royal gallery bookcase',b.x+29,b.y+22],['Upper guard weapon rack',b.x+33,b.y+27]])civilPut(world,'prop',name,x,y,{interiorBuilding:b.service.destination,civilUpper:true});
 civilResident(world,'Tower lookout',b.x+33,b.y+31,b.race,'The main avenue runs from our gate to the civic square. Watch the approaches before the rooftops.',{interiorBuilding:b.service.destination,civilUpper:true});
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
  if(!t.legacy){civilPut(world,'prop',city?'Civic market monument':'Village well',x-5,y+3,{civilDecor:city?(race==='elf'?'grove':'monument'):null,civicEmblem:t.id});
   for(const [a,b]of city?[[-8,-7],[8,-7],[-8,7],[8,7]]:[[-6,2]])civilPut(world,'prop','Market stall',x+a,y+b,{collisionRadius:1.1});
  }
  civilResident(world,city?'Market steward':'Village steward',x+4,y+2,race,regionalAccount(t.id).place+' '+regionalAccount(t.id).belief);
  if(city){civilResident(world,'Civic banker',x-5,y-5,race,'The bank keeps your belongings safe.',{type:'banker',mapService:'bank'});for(const [dx,dy]of [[-53,0],[53,0],[0,57]])civilResident(world,'Road guard',x+dx,y+dy,race,'The avenue leads to the market. Keep the gateways clear.',{appearanceRole:'guard'});}
  if(race==='elf'&&city)for(const [dx,dy]of [[-28,-20],[27,-20],[-28,41],[27,41]])civilPut(world,'prop','Sheltering grove tree',x+dx,y+dy,{civilDecor:'grove',race,walkThrough:true});
  const townBuildings=world.buildings.filter(b=>b.settlement===t.id);plan.buildings=townBuildings.map(b=>b.service?.destination);plan.bounds={left:Math.min(...townBuildings.map(b=>b.x))-5,top:Math.min(...townBuildings.map(b=>b.y))-5,right:Math.max(...townBuildings.map(b=>b.x+b.w))+5,bottom:Math.max(...townBuildings.map(b=>b.y+b.h))+5};
  for(const b of townBuildings){if(b.archetype==='forge'){civilPut(world,'prop','Forge furnace',b.service.x+3,b.service.y+2,{workstation:'furnace'});civilPut(world,'prop','Tool table',b.x+2,b.y+b.h-3,{interiorBuilding:b.service.destination});}if(b.archetype==='shop')civilPut(world,'prop','Merchandise counter',b.x+3,b.y+b.h-3,{interiorBuilding:b.service.destination});}
  // Productive fringes stay outside the road/gate axis.
  for(const side of [-1,1]){const xx=x+side*(city?45:25),yy=plan.bounds.bottom+6;if(worldWaterDistance(xx,yy)>4){civilPut(world,'prop',race==='dwarf'?'Masons’ stone stock':'Farm supplies',xx,yy);for(let i=0;i<3;i++)if(race!=='dwarf')civilPut(world,'crop','Herb patch',xx+i*2,yy+3,{resourceId:'herbs'});}}
 }
}
function civilGatehousePoint(gate,u,v){const c=Math.cos(gate.turn),s=Math.sin(gate.turn);return [gate.x+u*c+v*s,gate.y-u*s+v*c];}
function civilGatehouseLocal(gate,x,z){const dx=x-gate.x,dz=z-gate.y,c=Math.cos(gate.turn),s=Math.sin(gate.turn);return [dx*c-dz*s,dx*s+dz*c];}
function civilAddGatehouseWalls(map,gate){
 const horizontal=Math.abs(Math.cos(gate.turn))>.5,w=CIVIL_ARCHITECTURE_SCALE.cityGateTowerFootprint,d=CIVIL_ARCHITECTURE_SCALE.cityGateTowerDepth,rise=CIVIL_ARCHITECTURE_SCALE.cityGateRampartHeight;
 for(const side of [-1,1]){
  const [cx,cz]=civilGatehousePoint(gate,side*w,0),ix=Math.floor(cx),iz=Math.floor(cz),left=ix-Math.floor((horizontal?w:d)/2),top=iz-Math.floor((horizontal?d:w)/2),width=horizontal?w:d,depth=horizontal?d:w;
  if(horizontal)civilOpening(map,ix,Math.floor(gate.y),'x',w);else civilOpening(map,Math.floor(gate.x),iz,'y',w);
  civilRectWalls(map,left,top,width,depth,rise+.6);
  if(horizontal){civilOpening(map,ix,top,'x',3);civilOpening(map,ix,top+depth-1,'x',3);}else{civilOpening(map,left,iz,'y',3);civilOpening(map,left+width-1,iz,'y',3);}
  const low=civilGatehousePoint(gate,side*w,d/2-1.5),high=civilGatehousePoint(gate,side*w,-d/2+1.5),structure={gate,side,rise,rampLine:{ax:low[0],az:low[1],bx:high[0],bz:high[1],width:3},decks:[{x:left+1,y:top+1,w:width-2,h:depth-2}]};
  gate.towers.push({side,x:cx,z:cz,left,top,width,depth,low,high,structure});civilWalkableStructures.push(structure);
 }
}
function buildHabitableFloors(world){
 for(const b of world.buildings){if(!b.walkIn||b.civilCastle||!b.service||!/inn|house|hall/.test(b.archetype||''))continue;
  // Selected sizable residences and every mainland inn gain actual stairs and rooms.
  if(b.archetype!=='inn'&&!(b.w>=10&&b.h>=9&&(b.variant||0)%3===1))continue;
  const id=b.service.destination+'_upper',structure=civilContinuousUpper(world,b);civilLegacyReturns.set(id,[structure.ramp.x+1,structure.ramp.y]);
  const deck=structure.decks[0],upperObjects=b.archetype==='inn'?
   [['Guest bed',deck.x+2,deck.y+1],['Guest bed',deck.x+deck.w-3,deck.y+1],['Upper landing table',deck.x+Math.floor(deck.w/2),deck.y+1],['Guest chest',deck.x+deck.w-2,deck.y+1]]:
   [['Family bed',deck.x+2,deck.y+1],['Private study table',deck.x+Math.floor(deck.w/2),deck.y+1],['Upper bookcase',deck.x+deck.w-2,deck.y+1]];
  for(const [name,x,y]of upperObjects)civilPut(world,'prop',name,x,y,{interiorBuilding:b.service.destination,civilUpper:true});
  b.civilUpperRooms=[{name:b.archetype==='inn'?'Guest loft':'Private loft',...deck}];
  if(b.archetype==='inn'){
   world.objects=world.objects.filter(o=>o.interiorBuilding!==b.service.destination||!/^Bed/.test(o.name)||o.civilUpper);
   const returnAt=[b.x+3,b.y+b.h-3],cellarId=b.service.destination+'_cellar',cellar=civilFloorScene(cellarId,b.name+' · Store cellar',[16,13],[civilRoom('Supplies cellar',1,1,14,11,[8,11,'x'],'cellar')],b.race||'human',b,returnAt);cellar.entry=[8,9];
   civilStair(world,'Trapdoor ladder down to the store cellar',b.x+2,b.y+b.h-3,cellarId,[8,9],b.service.destination,'ladder');civilStair(cellar,'Ladder up to the inn',8,10,'overworld',returnAt,null,'ladder');
  }
 }
}
function civilClearUpperRoutes(world){
 for(const b of world.buildings.filter(b=>b.civilUpper)){const {ramp,decks}=b.civilUpper,deck=decks[0],blocked=o=>o!==b.service&&!o.civilContinuousStair&&o.x>=ramp.x-1.5&&o.x<ramp.x+ramp.w+1.5&&o.y>=ramp.y-1.5&&o.y<ramp.y+ramp.h+1;
  for(const o of world.objects.filter(blocked)){let moved=false;for(let y=b.y+deck.h+2;y<b.y+b.h-1&&!moved;y++)for(let x=b.x+1;x<ramp.x-2&&!moved;x++)if(!world.objects.some(p=>p!==o&&Math.hypot(p.x-x,p.y-y)<1.8)){civilMove(o,x,y);moved=true;}if(!moved)o.walkThrough=true;}
 }
}
function civilCityWalls(world){
 const map=new Map();civilWalls.set('overworld',map);
 for(const t of SETTLEMENTS.filter(t=>t.capital)){const plan=settlementPlans.get(t.id),margin=14,industry=surfaceQuarries.filter(q=>q.town===t.id),left=Math.floor(Math.min(t.x-59,(plan.bounds?.left??t.x-45)-margin,...industry.map(q=>q.x-q.rx-margin))),right=Math.ceil(Math.max(t.x+59,(plan.bounds?.right??t.x+45)+margin,...industry.map(q=>q.x+q.rx+margin))),top=Math.floor(Math.min(t.y-85,(plan.bounds?.top??t.y-65)-margin,...industry.map(q=>q.y-q.ry-margin))),bottom=Math.ceil(Math.max(t.y+67,(plan.bounds?.bottom??t.y+48)+margin,...industry.map(q=>q.y+q.ry+margin)));plan.fortification={left,right,top,bottom};
  civilRectWalls(map,left,top,right-left+1,bottom-top+1,t.kingdom==='sylvaran'?3.5:4.2);
  civilOpening(map,t.x,bottom,'x',CIVIL_ARCHITECTURE_SCALE.cityGateWidth);civilOpening(map,left,t.y,'y',CIVIL_ARCHITECTURE_SCALE.cityGateWidth);civilOpening(map,right,t.y,'y',CIVIL_ARCHITECTURE_SCALE.cityGateWidth);
  // A gate is now a real gatehouse: two multi-storey guard towers with
  // player-sized through doors and physical stairs to the upper wall walk.
  for(const [x,y,turn]of [[t.x,bottom,0],[left,t.y,Math.PI/2],[right,t.y,Math.PI/2]]){const race=KINGDOMS.find(k=>k.id===t.kingdom).race,gate={x:x+.5,y:y+.5,turn,race,town:t.id,towers:[]};civilAddGatehouseWalls(map,gate);civilGatehouses.push(gate);civilPut(world,'prop',t.name+' city gatehouse',x,y,{civilDecor:'gate',civilGatehouse:gate,walkThrough:true,roomYaw:turn,race});}
  for(const [x,y]of [[left,top],[right,top],[left,bottom],[right,bottom]])civilPut(world,'prop',t.name+' wall tower',x,y,{civilDecor:'tower',race:KINGDOMS.find(k=>k.id===t.kingdom).race,walkThrough:true});
 }
}
function civilWalkableArchitectureAt(x,z){
 if(currentScene!=='overworld')return null;
 const candidates=globalThis.VeldrenBuildingScene?.surfaceCandidates?.(civilWalkableStructures,x,z)||civilWalkableStructures;
 for(const structure of candidates){if(structure._sceneEntityId){const found=globalThis.VeldrenBuildingScene.surfaceAt(structure,x,z);if(found)return found;continue;}const {ramp,decks,rise}=structure,base=structure.base||0;
  if(structure.rampLine){const line=structure.rampLine,dx=line.bx-line.ax,dz=line.bz-line.az,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length,rx=x-line.ax,rz=z-line.az,t=(rx*ux+rz*uz)/length,cross=Math.abs(rx*uz-rz*ux);if(t>=0&&t<=1&&cross<=line.width/2)return {height:base+rise*t,kind:'ramp',structure};}
  if(ramp&&x>=ramp.x&&x<ramp.x+ramp.w&&z>=ramp.y&&z<ramp.y+ramp.h){const t=Math.max(0,Math.min(1,(ramp.y+ramp.h-z)/(ramp.h-1)));return {height:base+rise*t,kind:'ramp',structure};}
  // Editor stairs share the original deck's structure identity. The player
  // can therefore climb onto that deck without switching to a separate height.
  for(const line of structure.editorRamps||[]){const dx=line.bx-line.ax,dz=line.bz-line.az,length=Math.hypot(dx,dz);if(length<.01)continue;const ux=dx/length,uz=dz/length,rx=x-line.ax,rz=z-line.az,t=(rx*ux+rz*uz)/length,cross=Math.abs(rx*uz-rz*ux);if(t>=0&&t<=1&&cross<=line.width/2)return {height:base+rise*t,kind:'ramp',structure};}
  if(decks.some(d=>x>=d.x&&x<d.x+d.w&&z>=d.y&&z<d.y+d.h))return {height:base+rise,kind:'rampart',structure};
 }
 return null;
}
const civilWalkHeightBefore=walkSurfaceHeight;
walkSurfaceHeight=function(x,z){const architecture=civilWalkableArchitectureAt(x,z);return civilWalkHeightBefore(x,z)+(architecture?.height||0);};
let civilGroundingObject3=null;
function withCivilGrounding3(o,draw){const before=civilGroundingObject3;civilGroundingObject3=o;try{return draw();}finally{civilGroundingObject3=before;}}
function civilObjectGroundHeight3(x,z){return currentScene==='overworld'&&civilGroundingObject3?.interiorBuilding&&!civilGroundingObject3.civilUpper?civilWalkHeightBefore(x,z):walkSurfaceHeight(x,z);}
function civilPickSurfaceHeight(x,z){const playerStructure=civilWalkableArchitectureAt(px+.5,py+.5)?.structure,target=civilWalkableArchitectureAt(x,z);return civilWalkHeightBefore(x,z)+(playerStructure&&target?.structure===playerStructure?target.height:0);}
const civilCellBlockedBefore=realmCellBlocked;
realmCellBlocked=function(nav,id){const x=id%nav.w,y=Math.floor(id/nav.w),architecture=civilWalkableArchitectureAt(x+.5,y+.5);if(architecture?.kind==='ramp'){const value=Number(!!(worldWall(x,y)||water(x,y)||terrainCellBlocked(x,y)||globalThis.VeldrenGatherableScene?.blocked(currentScene,x,y)||globalThis.VeldrenServiceScene?.blocked(currentScene,x,y)));nav.cells[id]=value;return value;}return civilCellBlockedBefore(nav,id);};
function setupSurfaceQuarries(world){
 const defs=[
 {id:'ironhollow',name:'Ironhollow Crown Quarry',x:858,y:129,rx:27,ry:27,levels:3,type:'industrial',town:'ironhollow',ores:['copper','tin','iron','iron','coal']},
 {id:'copperdelve',name:'Copperdelve Cut',x:671,y:257,rx:20,ry:20,levels:2,type:'local',town:'copperdelve',ores:['copper','tin','copper']},
 {id:'crownreach',name:'Crown Masonry Quarry',x:465,y:165,rx:22,ry:22,levels:2,type:'industrial',town:'crownreach',ores:['copper','tin','iron']},
 {id:'deepforge',name:'Deepforge Regional Quarry',x:959,y:344,rx:33,ry:33,levels:4,type:'regional',town:'deepforge',ores:['iron','iron','coal','coal','mithril']},
 {id:'stoneford',name:'Old Stoneford Cut',x:275,y:278,rx:20,ry:20,levels:2,type:'abandoned',town:'stoneford',ores:['copper','tin']}
 ];
 for(const q of defs){q.level=Math.max(3.2,landBase(q.x,q.y));surfaceQuarries.push(q);settlementPlans.get(q.town).quarries.push(q.id);
  world.objects=world.objects.filter(o=>o.mainStoryKey||o.mountainKey||o.type==='door'||o.interiorBuilding||Math.abs(o.x-q.x)>q.rx+3||Math.abs(o.y-q.y)>q.ry+3);
  const bottom=q.y+q.ry+5,town=SETTLEMENTS.find(t=>t.id===q.town),gate=settlementPlans.get(q.town).entrances[1];
  const roadStart=organicRoads.length,workRoad=[[q.x+.5,bottom],[q.x-q.rx-6,bottom],[q.x-q.rx-6,town.y+.5],gate];for(let i=1;i<workRoad.length;i++)plannedRoad(workRoad[i-1],workRoad[i],1.8,false);plannedRoad([q.x+.5,bottom],[q.x+.5,q.y-8],1.6,false);for(const road of organicRoads.slice(roadStart))road.quarry=q.id;
  for(let i=0;i<q.ores.length;i++){const inset=7+Math.min(q.levels-1,i)*5,x=q.x-q.rx+inset+2,y=q.y+(i%2?7:-7);civilPut(world,'ore',ORE_RESOURCES[q.ores[i]].name,x,y,{resourceId:q.ores[i],quarry:q.id});}
  const abandoned=q.type==='abandoned';
  const shed=addCivilHouse(world,town,100+surfaceQuarries.length,q.x+14,bottom+10,'hall',abandoned?'Abandoned quarry office':'Quarry records and stores');shed.quarry=q.id;
  for(const [name,dx,dy,decor]of [[abandoned?'Broken quarry cart':'Quarry loading cart',-8,q.ry+3,null],['Cut stone stock',9,q.ry+3,'stoneStock'],['Quarry lifting crane',q.rx-4,-5,'crane'],['Rubble',-q.rx+3,5,'rubble'],['Tool table',8,q.ry-1,null],['Supplies crate',11,q.ry-1,null]])civilPut(world,'prop',name,q.x+dx,q.y+dy,{civilDecor:decor,quarry:q.id});
  if(abandoned){civilPut(world,'prop','Collapsed work ramp',q.x+q.rx-4,q.y+q.ry-4,{civilDecor:'brokenRamp',quarry:q.id});for(const [dx,dy]of [[-8,-4],[8,6]])civilPut(world,'tree','Old-growth oak',q.x+dx,q.y+dy,{resourceId:'normal',quarry:q.id});}
  else {for(let i=0;i<(q.type==='regional'?5:3);i++)civilResident(world,'Quarry '+['mason','hauler','foreman','guard','surveyor'][i],q.x+5+i*3,bottom+4,'dwarf','The work road descends between the cut terraces. Copper and tin remain accessible; richer stone needs the usual Mining training.',{quarry:q.id});civilPut(world,'prop','Quarry headframe',q.x+q.rx-3,q.y+q.ry-3,{civilDecor:'headframe',quarry:q.id});}
 }
}
function quarryAt(x,y,pad=0){return surfaceQuarries.find(q=>Math.abs(x-q.x)<q.rx+pad&&Math.abs(y-q.y)<q.ry+pad);}
function quarryShapeEdge(q,x,y){const nx=Math.abs(x-q.x)/q.rx,ny=Math.abs(y-q.y)/q.ry,r=Math.pow(Math.pow(nx,4)+Math.pow(ny,4),.25);return (1-r)*Math.min(q.rx,q.ry);}
function quarryDepth(q,x,y){const edge=quarryShapeEdge(q,x,y);if(edge<=0)return 0;const ramp=Math.abs(x-q.x)<2.6&&y>=q.y-8;
 if(ramp)return Math.min(q.levels*1.25,Math.max(0,(q.y+q.ry-y)/q.ry*q.levels*1.25));
 let depth=0;for(let i=1;i<=q.levels;i++){const t=Math.max(0,Math.min(1,(edge-(i*5-1))));depth+=t*1.25;}return depth;
}
function quarryCliff(q,x,y){if(Math.abs(x+.5-q.x)<3&&y+.5>=q.y-9)return false;const edge=quarryShapeEdge(q,x+.5,y+.5);return Array.from({length:q.levels},(_,i)=>(i+1)*5-.5).some(d=>Math.abs(edge-d)<.65);}
const civilGradeBefore=gradeLand;
const civilGradeBuckets=new Map();let civilGradeBucketsReady=false;
function buildCivilGradeBuckets(){
 civilGradeBuckets.clear();for(const plan of settlementPlans.values()){
  if(plan.id==='briarhaven'||!Number.isFinite(plan.grade))continue;const town=SETTLEMENTS.find(t=>t.id===plan.id);if(!town||!Number.isFinite(plan.radius))continue;
  const outer=plan.radius+28,entry={plan,town,radius:plan.radius+8};
  for(let by=Math.floor((town.y-outer)/16);by<=Math.floor((town.y+outer)/16);by++)for(let bx=Math.floor((town.x-outer)/16);bx<=Math.floor((town.x+outer)/16);bx++){const key=bx+':'+by;if(!civilGradeBuckets.has(key))civilGradeBuckets.set(key,[]);civilGradeBuckets.get(key).push(entry);}
 }civilGradeBucketsReady=true;
}
gradeLand=function(x,y,height){
 const before=civilGradeBefore(x,y,height);if(currentScene!=='overworld')return before;
 let result=before,adjusted=false;const q=quarryAt(x,y,14);
 if(q&&globalThis.VeldrenQuarryScene?.enabled){const sample=VeldrenQuarryScene.sample(x,y,0,q);result=before*(1-sample.blend)+sample.height*sample.blend;adjusted=true;}
 else if(q){const dx=Math.max(Math.abs(x-q.x)-q.rx,0),dy=Math.max(Math.abs(y-q.y)-q.ry,0),d=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,d/14)),blend=1-t*t*(3-2*t),cut=Math.max(.15,q.level-quarryDepth(q,x,y));result=before*(1-blend)+cut*blend;adjusted=true;}
 else for(const candidate of civilGradeBucketsReady?(civilGradeBuckets.get(Math.floor(x/16)+':'+Math.floor(y/16))||[]):settlementPlans.values()){
  const plan=civilGradeBucketsReady?candidate.plan:candidate;if(plan.id==='briarhaven'||!Number.isFinite(plan.grade))continue;
  const town=civilGradeBucketsReady?candidate.town:SETTLEMENTS.find(t=>t.id===plan.id),d=Math.hypot(x-town.x,y-town.y),r=civilGradeBucketsReady?candidate.radius:plan.radius+8;if(d>r+20)continue;
  const k=Math.max(0,Math.min(1,(r+20-d)/20));result=before*(1-k)+plan.grade*k;adjusted=true;break;
 }
 // The inherited terrain grade already applied road shaping. Apply it again
 // only when this wrapper changed the height for a quarry or settlement.
 return adjusted?gradeRoadLand(x,y,result):before;
};
const civilWallBefore=worldWall;
worldWall=function(x,y){if(civilWalkableArchitectureAt(x+.5,y+.5))return false;if(globalThis.VeldrenStructureScene?.enabled?VeldrenStructureScene.borderAt(currentScene,x+.5,y+.5):civilStairWells.get(currentScene)?.some(h=>x===h.tx&&Math.abs(y-h.ty)===1))return true;if(globalThis.VeldrenStructureScene?.enabled?VeldrenStructureScene.blocked(currentScene,x+.5,y+.5):civilWalls.get(currentScene)?.has(x+':'+y))return true;if(currentScene==='overworld'){const q=quarryAt(x+.5,y+.5);if(q&&quarryCliff(q,x,y))return true;}return civilWallBefore(x,y);};
const civilBuildingBefore=inBuilding;
inBuilding=function(b,x,y){if(!b.civilWallTiles)return civilBuildingBefore(b,x,y);if(b.civilWallTiles.has(x+':'+y))return true;const [dx,dy]=doorThreshold(b.service),half=b.civilGateHalfWidth||0;return y===dy&&Math.abs(x-dx)<=half&&b.service.openedAt===undefined;};
const civilInteractionBefore=handleWorldInteraction;
handleWorldInteraction=function(o){if(!o.civilStair)return civilInteractionBefore(o);const {destination,entry}=o.civilStair;stop();s.returnPoint=destination==='overworld'?[...entry]:worldScenes[destination]?.returnAt||s.returnPoint;activateScene(destination,...entry);toast(o.name+'.');return true;};
const civilLeaveBefore=leaveInterior;
leaveInterior=function(){const room=worldScenes[currentScene];if(!room?.civilFloor)return civilLeaveBefore();const stair=room.objects.find(o=>o.civilStair);if(stair)engage(stair);};
const civilRegionBefore=regionInfo;
regionInfo=function(){const q=currentScene==='overworld'&&quarryAt(s.x,s.y,8);if(q)return [q.name,q.type==='abandoned'?'Abandoned workings · Weathered terraces':q.type+' quarry · Surface Mining'];const floor=civilFloors.get(currentScene);if(floor){const room=globalThis.VeldrenStructureScene?.enabled?VeldrenStructureScene.roomAt(currentScene,s.x,s.y):floor.rooms.find(r=>s.x>r.x&&s.x<r.x+r.w-1&&s.y>r.y&&s.y<r.y+r.h-1);return [worldScenes[currentScene].title,room?.name||'Stair hall and connecting passage'];}if(currentScene==='overworld'){const b=buildings.find(b=>withinWalkIn(b,s.x,s.y));if(b){const upper=b.civilUpperRooms?.find(r=>s.x>=r.x&&s.x<r.x+r.w&&s.y>=r.y&&s.y<r.y+r.h),r=b.civilRooms?.find(r=>s.x>r.x&&s.x<r.x+r.w-1&&s.y>r.y&&s.y<r.y+r.h-1);return [b.name,upper?.name||r?.name||'Courtyard · Great hall ahead'];}}return civilRegionBefore();};
function civilClearRoutes(world){
 const protectedObject=o=>o.civilization||o.raiderCamp||(o.briarhavenDetail&&o.type!=='tree')||o.mainStoryKey||o.mountainKey||o.interiorBuilding||o.type==='door'||o.quarry||o.civilDecor==='gate'||o.civilDecor==='tower';
 const bad=(x,y)=>civilWalls.get('overworld')?.has(x+':'+y)||world.buildings.some(b=>inBuilding(b,x,y))||expandedWater(x,y);
 for(const o of world.objects){if(protectedObject(o)||!bad(o.x,o.y))continue;let found=false;for(let r=1;r<=20&&!found;r++)for(let dy=-r;dy<=r&&!found;dy++)for(let dx=-r;dx<=r&&!found;dx++){const x=o.x+dx,y=o.y+dy;if(Math.max(Math.abs(dx),Math.abs(dy))!==r||bad(x,y)||world.objects.some(p=>p!==o&&Math.hypot(p.x-x,p.y-y)<1.2))continue;civilMove(o,x,y);found=true;}}
 world.objects=world.objects.filter(o=>protectedObject(o)||!['tree','prop','ore','crop'].includes(o.type)||o.workstation||roadInfluence(o.x+.5,o.y+.5)[0]<(o.type==='tree'?.03:.55));
}
function buildBeaconLevels(world){
 const b=world.buildings.find(b=>b.name==='The coastal beacon');if(!b)return;const ground='coastal_beacon_guard',upper='coastal_beacon_watch',roof='coastal_beacon_roof',x=b.x+Math.floor(b.w/2),y=b.y+b.h;
 b.service=civilPut(world,'door','Coastal beacon entrance',x,y,{destination:ground,walkThrough:true});b.service.building=b;b.race='human';b.walkIn=true;b.archetype='hall';b.doorFacing='south';
 const first=civilContinuousUpper(world,b,{rise:3.05,deckDepth:3}),start=[first.decks[0].x+1,first.decks[0].y+1],end=[b.x-5,b.y+2],roofDeck={x:b.x-9,y:b.y,w:4,h:5},second={building:b,base:first.rise,rise:3.05,rampLine:{ax:start[0],az:start[1],bx:end[0],bz:end[1],width:2},decks:[roofDeck],kind:'beaconRoof'};
 civilWalkableStructures.push(second);b.civilUpperLevels=[first,second];b.usableUpper='overworld';b.civilUpperRooms=[{name:'Watch barracks',...first.decks[0]},{name:'Beacon lookout',...roofDeck}];
 for(const id of [ground,upper,roof])civilLegacyReturns.set(id,id===roof?[roofDeck.x+2,roofDeck.y+2]:id===upper?[first.decks[0].x+1,first.decks[0].y+1]:[x,y-2]);
 for(const [name,a,c,extra]of [['Guard table',b.x+2,b.y+b.h-3,{}],['Watch bed',first.decks[0].x+2,first.decks[0].y+1,{civilUpper:true}],['Coastal signal brazier',roofDeck.x+2,roofDeck.y+2,{civilUpper:true,walkThrough:true}]])civilPut(world,/brazier/i.test(name)?'camp':'prop',name,a,c,{...extra,interiorBuilding:extra.civilUpper&&a>=b.x?ground:null});
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
 for(const p of settlementPlans.values()){const t=SETTLEMENTS.find(t=>t.id===p.id);p.grade=p.id==='briarhaven'?.75:Math.max(1.5,landBase(t.x,t.y));}buildCivilGradeBuckets();
 const workbench=world.objects.find(o=>o.mountainKey==='workbench');if(workbench)civilMove(workbench,780,123);
 expandLegacyNeighborhoods(world);for(const b of world.buildings.filter(b=>b.archetype==='castle'))buildCastle(world,b);
 addSettlementIdentity(world);buildHabitableFloors(world);buildBeaconLevels(world);reinforceGoblinVillage(world);setupSurfaceQuarries(world);civilCityWalls(world);civilClearUpperRoutes(world);
 // Replace the old radial lanes with a readable civic spine and three neighborhoods.
 for(let i=organicRoads.length-1;i>=0;i--){const r=organicRoads[i],x=(r.a[0]+r.b[0])/2,y=(r.a[1]+r.b[1])/2;if(x>=29&&x<=105&&y>=15&&y<=117)organicRoads.splice(i,1);}
 const briarRoutes=[[[64,15],[64,50],[55,50],[55,70],[64,70],[64,118]],[[27,69],[105,69]],[[30,29],[100,29]],[[30,115],[80,115]],[[40,50],[40,52],[55,52]],[[55,46],[55,50]],[[64,43],[78,43]],[[55,56],[64,56]],[[47,78],[64,78]],[[75,69],[75,76]],[[40,27],[40,29]],[[73,28],[73,29]],[[88,28],[88,29]],[[37,111],[37,115]],[[55,114],[55,115]],[[71,109],[71,115]],[[48,92],[64,92]],[[95,69],[95,85],[91,85],[91,97]],[[95,69],[95,52],[112,52]]];
 const briarPlan=settlementPlans.get('briarhaven');briarPlan.roads=[];briarPlan.entrances=[[64,15],[105,69],[64,118]];
 for(const [i,points]of briarRoutes.entries())for(let j=1;j<points.length;j++)briarPlan.roads.push({a:points[j-1],b:points[j],width:i===0?1.6:1.2,role:i<2?'main road':'neighborhood street'});
 for(const route of briarRoutes)for(let i=1;i<route.length;i++)plannedRoad(route[i-1],route[i],route===briarRoutes[0]?1.6:1.2,true,'briarhaven');
 for(const b of world.buildings.filter(b=>b.planned&&b.settlement!=='briarhaven'&&!b.quarry)){const t=SETTLEMENTS.find(t=>t.id===b.settlement);laneOccupancy.clear();curveRoad(t.x+.5,t.y+.5,b.service.x+.5,b.service.y+.5,1.1,true);}
 for(const q of surfaceQuarries){const p=settlementPlans.get(q.town);p.resourcePurpose=q.name+' supplies '+SETTLEMENTS.find(t=>t.id===q.town).name;}
 roadBuckets=null;civilClearRoutes(world);roadBuckets=null;realmNavigation.clear();resetLandSurface();miniTerrain=null;worldAtlasTerrain=null;mapServicesCache=null;
 if(civilLegacyReturns.has(saved.scene)){const returnPoint=civilLegacyReturns.get(saved.scene);saved.scene='overworld';[saved.x,saved.y]=returnPoint;s.sceneId='overworld';s.x=saved.x;s.y=saved.y;px=s.x;py=s.y;}
 currentScene=saved.scene;(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(worldScenes[currentScene].objects):objects.splice(0,objects.length,...worldScenes[currentScene].objects));buildings.splice(0,buildings.length,...worldScenes[currentScene].buildings);
 if(!land(saved.x,saved.y)){let point=null;for(let r=1;r<40&&!point;r++)for(let dy=-r;dy<=r&&!point;dy++)for(let dx=-r;dx<=r&&!point;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r&&land(saved.x+dx,saved.y+dy))point=[saved.x+dx,saved.y+dy];if(point)activateScene(currentScene,...point,false);}
 s.civilizationVersion=CIVILIZATION_VERSION;
};

function civilStairWellAt(x,y){if(globalThis.VeldrenStructureScene?.enabled)return VeldrenStructureScene.holeAt(currentScene,x,y);return civilStairWells.get(currentScene)?.some(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h);}
function civilPaintFloor(r,x,y,w,h,color,material,height=.04,cutouts=[]){let rects=[[x,y,w,h]];for(const hole of [...(civilStairWells.get(currentScene)||[]),...cutouts]){const next=[];for(const [a,b,c,d]of rects){const left=Math.max(a,hole.x),right=Math.min(a+c,hole.x+hole.w),top=Math.max(b,hole.y),bottom=Math.min(b+d,hole.y+hole.h);if(left>=right||top>=bottom){next.push([a,b,c,d]);continue;}if(top>b)next.push([a,b,c,top-b]);if(bottom<b+d)next.push([a,bottom,c,b+d-bottom]);if(left>a)next.push([a,top,left-a,bottom-top]);if(right<a+c)next.push([right,top,a+c-right,bottom-top]);}rects=next;}
 // Small floor faces sort correctly around actors in the Canvas fallback.
 // A whole castle-sized polygon can otherwise paint over a character above it.
 for(const [a,b,c,d]of rects)for(let xx=a;xx<a+c;xx+=2)for(let zz=b;zz<b+d;zz+=2){const right=Math.min(xx+2,a+c),bottom=Math.min(zz+2,b+d);r.face([[xx,height,zz],[xx,height,bottom],[right,height,bottom],[right,height,zz]],color,null,material);}
}
// Modular geometry shares materials and caches; the same wall tiles drive collision.
function civilWallGeometry(r,tile,height=tile.height){
 const mesh=rebuiltModels.Wall_UnevenBrick_Straight;
 return environmentModule3(r,mesh,tile.x+.5,0,tile.y+.5,1,height,1,tile.axis==='y'?Math.PI/2:0);
}
const civilWallRunsCache=new WeakMap();
function civilWallRuns(map){
 if(civilWallRunsCache.has(map))return civilWallRunsCache.get(map);
 const unused=new Map(map),runs=[];
 // Longer horizontal runs first, then vertical leftovers. Every collision tile
 // belongs to exactly one run; doors and intentional breaches remain open.
 for(const axis of ['x','y'])for(const tile of map.values()){
  if(!unused.has(tile.x+':'+tile.y))continue;
  if(tile.axis&&tile.axis!==axis)continue;
  if(!tile.axis&&axis==='x'&&!unused.has((tile.x+1)+':'+tile.y))continue;
  let length=1;
  while(length<8){const next=unused.get((tile.x+(axis==='x'?length:0))+':'+(tile.y+(axis==='y'?length:0)));if(!next||next.height!==tile.height||next.axis&&next.axis!==axis)break;length++;}
  for(let i=0;i<length;i++)unused.delete((tile.x+(axis==='x'?i:0))+':'+(tile.y+(axis==='y'?i:0)));
  runs.push({x:tile.x,y:tile.y,height:tile.height,length,axis});
 }
 const spatial={size:32,maxHeight:0,buckets:new Map()};
 for(const run of runs){const horizontal=run.axis==='x',x=run.x+(horizontal?run.length/2:.5),z=run.y+(horizontal?.5:run.length/2),key=Math.floor(x/spatial.size)+':'+Math.floor(z/spatial.size);let bucket=spatial.buckets.get(key);if(!bucket){bucket=[];spatial.buckets.set(key,bucket);}bucket.push(run);spatial.maxHeight=Math.max(spatial.maxHeight,run.height);}
 Object.defineProperty(runs,'spatial',{value:spatial});
 civilWallRunsCache.set(map,runs);return runs;
}
function civilWallCandidates(runs,bounds,pitch){
 const index=runs.spatial;if(!index||!bounds?.valid)return runs;
 const pad=(index.maxHeight+1.5)/Math.max(.05,Math.tan(pitch))+12,size=index.size,x0=Math.floor((bounds.minx-pad)/size),x1=Math.floor((bounds.maxx+pad)/size),z0=Math.floor((bounds.minz-pad)/size),z1=Math.floor((bounds.maxz+pad)/size),bucketCount=(x1-x0+1)*(z1-z0+1);
 if(bucketCount>index.buckets.size*2)return runs;
 const candidates=[];for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const bucket=index.buckets.get(x+':'+z);if(bucket)candidates.push(...bucket);}return candidates;
}
function civilDrawWallRuns(r,map,race='human',cull=false){
 const limit=cull&&typeof realmWideWorldLimit3==='function'?Math.max(0,realmWideWorldLimit3()-12):cull?Math.hypot(screen.w,screen.h)/cameraZoom3()+12:Infinity;
 const bounds=globalThis.realmViewBounds3,runs=civilWallRuns(map),candidates=cull?civilWallCandidates(runs,bounds,cameraPitch3()):runs;
 for(const run of candidates){
  const horizontal=run.axis==='x',x=run.x+(horizontal?run.length/2:.5),z=run.y+(horizontal?.5:run.length/2);
  if(Math.abs(x-px)>limit||Math.abs(z-py)>limit)continue;
  if(cull&&bounds?.valid){const pad=(run.height+1.5)/Math.max(.05,Math.tan(cameraPitch3()))+8,halfX=horizontal?run.length/2:.5,halfZ=horizontal?.5:run.length/2;if(x+halfX<bounds.minx-pad||x-halfX>bounds.maxx+pad||z+halfZ<bounds.minz-pad||z-halfZ>bounds.maxz+pad)continue;}
  const mesh=run.height>=4.5?realmArtMesh('curtainWall',race):rebuiltModels.Wall_UnevenBrick_Straight;
  environmentModule3(r,mesh,x,0,z,run.length,run.height,1,horizontal?0:Math.PI/2);
 }
}
const civilDrawBuildingBefore=building3;
function civilFortressTower3(r,x,z,race,w,h){
 const p=worldStyle[race]||worldStyle.human,q=r,stone=materialRealm(q,18),radius=w/2;
 turretRealm(q,x,z,radius,h,p.stone,p.roof[0]);
 // Heavy lower courses and arrow loops make this read as fortification, not
 // as a complete miniature house enlarged until its decorative door fits.
 for(const y of [1.1,3.2,h-1.1])profile3(stone,x,y,z,w+.18,.18,w+.18,[[-.5,1],[.5,1]],shade3(p.stone,.78),a=>a,12);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box3(stone,x+Math.cos(a)*radius*.94,h+.2,z+Math.sin(a)*radius*.94,.48,.55,.48,p.stone);}
 return h+.5;
}
function civilAuthoredStair3(r,structure){
 const stair=rebuiltModels.Stair_Interior_SolidExtended;if(!stair)return;
 const [lo,hi]=stair.bounds,nativeRise=hi[1]-lo[1],base=structure.base||0,rise=structure.rise,draw=(x,z,heading,stepRise)=>environmentNative3(r,stair,x,base,z,heading,stepRise/nativeRise);
 if(structure.rampLine){const line=structure.rampLine,dx=line.bx-line.ax,dz=line.bz-line.az;draw((line.ax+line.bx)/2,(line.az+line.bz)/2,Math.atan2(-dx,-dz),rise);return;}
 const ramp=structure.ramp;if(!ramp)return;const x=ramp.x+ramp.w/2;
 if(ramp.h<=8){draw(x,ramp.y+ramp.h/2,0,rise);return;}
 // Long castle runs use two complete flights with a real landing instead of
 // elongating one staircase until its treads become unusable.
 const half=rise/2,span=(hi[2]-lo[2])*(half/nativeRise),low=ramp.y+ramp.h-.5,high=ramp.y+.5;
 draw(x,low-span/2,0,half);const upper=worldLocal(r,0,half,0);environmentNative3(upper,stair,x,0,high+span/2,0,half/nativeRise);
 const landing=materialRealm(r,18);box3(landing,x,half,low-span,ramp.w,.16,Math.max(.6,low-high-span*2),'#8f9188');
}
function civilDeckModules3(r,structure,wood=true){
 const top=(structure.base||0)+structure.rise,mesh=rebuiltModels[wood?'Floor_WoodDark':'Floor_UnevenBrick'];
 for(const deck of structure.decks)for(let x=deck.x+1;x<=deck.x+deck.w-1;x+=2)for(let z=deck.y+1;z<=deck.y+deck.h-1;z+=2)environmentNative3(r,mesh,x,top,z,0,1);
}
function civilGateArch3(r,x,z,turn,width,race){
 const count=width>7?3:2,scale=width/(count*2),local=worldLocal(r,x,0,z,turn),wall=rebuiltModels.Wall_UnevenBrick_Window_Wide_Flat;
 for(let i=0;i<count;i++){const u=(i-(count-1)/2)*2*scale;environmentNative3(local,rebuiltModels.Wall_Arch,u,0,0,0,scale);environmentNative3(local,wall,u,3*scale,0,0,scale);}
 return 6*scale;
}
function civilNativeWallCourse3(r,length,fixed,y,heading,model,skipCenter=0){
 const count=Math.max(1,Math.round(length/2)),scale=length/(count*2);
 for(let i=0;i<count;i++){const along=(i-(count-1)/2)*2*scale;if(y<.01&&skipCenter&&Math.abs(along)<skipCenter)continue;environmentNative3(r,model,heading?fixed:along,y,heading?along:fixed,heading,scale);}
 return 3*scale;
}
function civilGateTower3(r,gate,tower){
 const race=gate.race||'human',p=worldStyle[race]||worldStyle.human,w=CIVIL_ARCHITECTURE_SCALE.cityGateTowerFootprint,d=CIVIL_ARCHITECTURE_SCALE.cityGateTowerDepth,h=CIVIL_ARCHITECTURE_SCALE.cityGateTowerHeight,doorW=CIVIL_ARCHITECTURE_SCALE.cityGateDoorWidth,doorH=CIVIL_ARCHITECTURE_SCALE.cityGateDoorHeight,rise=CIVIL_ARCHITECTURE_SCALE.cityGateRampartHeight;
 const q=worldLocal(r,tower.x,0,tower.z,gate.turn),stone=materialRealm(q,18),[u,v]=civilGatehouseLocal(gate,px+.5,py+.5),inside=tower._sceneEntityId?VeldrenStructureScene.towerContains(tower,px+.5,py+.5):Math.abs(u-tower.side*w)<w/2-1&&Math.abs(v)<d/2-1;
 civilPaintFloor(q,-w/2+.7,-d/2+.7,w-1.4,d-1.4,'#777b75',18,.055);
 if(inside){for(const side of [-1,1])box3(stone,side*w/2,.58,0,.42,1.16,d,p.stone);for(const face of [-1,1]){box3(stone,-(doorW/2+(w-doorW)/4),.58,face*d/2,(w-doorW)/2,1.16,.42,p.stone);box3(stone,doorW/2+(w-doorW)/4,.58,face*d/2,(w-doorW)/2,1.16,.42,p.stone);}}
 else for(let floor=0,y=0;y<h-.3;floor++,y+=3){
  const model=floor===1?rebuiltModels.Wall_UnevenBrick_Window_Wide_Flat:rebuiltModels.Wall_UnevenBrick_Straight;
  for(const side of [-1,1])civilNativeWallCourse3(q,d,side*w/2,y,Math.PI/2,model);
  for(const face of [-1,1]){civilNativeWallCourse3(q,w,face*d/2,y,0,model,floor?0:doorW/2+.2);if(!floor)environmentNative3(q,rebuiltModels.Wall_Arch,0,0,face*d/2,face===1?0:Math.PI,Math.max(1,doorH/3));}
 }
 // The stair and upper guard floor are continuous overworld geometry.  The
 // complete authored stair keeps player-scale treads and rail proportions.
 civilAuthoredStair3(r,tower.structure);
 if(!inside){civilPaintFloor(q,-w/2+1,-d/2+1,w-2,d-2,'#8d9189',18,rise+.06,[{x:-1.7,y:-d/2+2,w:3.4,h:d-4}]);for(let i=0;i<6;i++)for(const face of [-1,1])box3(stone,-w/2+.65+i*(w-1.3)/5,h+.28,face*d/2,.5,.58,.7,p.stone);for(let i=0;i<7;i++)for(const side of [-1,1])box3(stone,side*w/2,h+.28,-d/2+.65+i*(d-1.3)/6,.7,.58,.5,p.stone);}
 else{box3(materialRealm(q,5),-3,.48,1.2,2.6,.55,.65,p.wood);box3(stone,3,.35,-1.5,1.15,.7,1.15,p.stone);}
 return h+.6;
}
function civilDrawContinuousUpper3(r,b){
 const structures=b.civilUpperLevels||[b.civilUpper],q=groundedPainter(r,b.x+b.w/2,b.y+b.h/2),rail=rebuiltModels.Balcony_Simple_Straight;
 for(const structure of structures){if(!structure)continue;civilDeckModules3(q,structure,true);civilAuthoredStair3(q,structure);const top=(structure.base||0)+structure.rise;
  for(const deck of structure.decks){
   for(let x=deck.x+1;x<deck.x+deck.w;x+=2){environmentNative3(q,rail,x,top,deck.y,0,1);environmentNative3(q,rail,x,top,deck.y+deck.h,Math.PI,1);}
   for(let z=deck.y+1;z<deck.y+deck.h;z+=2){environmentNative3(q,rail,deck.x,top,z,Math.PI/2,1);environmentNative3(q,rail,deck.x+deck.w,top,z,-Math.PI/2,1);}
  }
 }
}
building3=function(r,b){
 if(!b.civilWallTiles){const height=civilDrawBuildingBefore(r,b);if(b.civilUpper)civilDrawContinuousUpper3(r,b);return Math.max(height||0,...(b.civilUpperLevels||[b.civilUpper]).filter(Boolean).map(o=>(o.base||0)+o.rise+1.25));}
 const p=worldStyle[b.race],q=groundedPainter(r,b.x+b.w/2,b.y+b.h/2),stone=materialRealm(q,18),cut=!!b._cutaway;
 civilPaintFloor(q,b.x,b.y,b.w,b.h,'#9b9b8b',18,.04,b.civilRooms.map(room=>({x:room.x+.8,y:room.y+.8,w:room.w-1.6,h:room.h-1.6})));
 for(const room of b.civilRooms)civilPaintFloor(q,room.x+.8,room.y+.8,room.w-1.6,room.h-1.6,room.usage==='hall'?'#807065':room.usage==='library'?'#a18b68':'#8b8a7d',room.usage==='library'?5:18,.065);
 civilDrawWallRuns(q,b.civilWallTiles,b.race);
 for(const room of b.civilRooms){
  const hall=room.usage==='hall',height=hall?8:room.usage==='library'||room.usage==='guard'?6.5:4.3;
  // Opening the gate reveals all ground-floor rooms without moving the camera.
  // Curtain walls and the ground-floor shell remain intact.
  if(!cut){
   if(height>4.3)for(const side of [-1,1]){
    for(let xx=room.x+1;xx<room.x+room.w-1;xx+=2)environmentModule3(q,rebuiltModels.Wall_UnevenBrick_Window_Wide_Flat,xx,4,room.y+(side===1?room.h-.5:.5),2,height-4,.55);
    for(let zz=room.y+1;zz<room.y+room.h-1;zz+=2)environmentModule3(q,rebuiltModels.Wall_UnevenBrick_Window_Wide_Flat,room.x+(side===1?room.w-.5:.5),4,zz,2,height-4,.55,Math.PI/2);
   }
   environmentModule3(q,environmentRoofMesh3(b.race),room.x+room.w/2,height,room.y+room.h/2,room.w+.4,hall?3.8:1.8,room.h+.4);
  }
 }
 for(const [dx,dy]of [[0,0],[b.w-3,0],[0,b.h-3],[b.w-3,b.h-3]]){
  const x=b.x+dx+1.5,z=b.y+dy+1.5;
  civilFortressTower3(q,x,z,b.race,6.2,b.race==='elf'?13:12);
 }
 // Use the authored arch without its decorative closed gate leaf; the game's
 // synchronized door remains the only movable/interactive gate.
 const gateX=b.x+24.5,gateZ=b.y+b.h-.5;
 civilGateArch3(q,gateX,gateZ,0,CIVIL_ARCHITECTURE_SCALE.castleGateWidth,b.race);
 for(const side of [-1,1])civilFortressTower3(q,gateX+side*5.8,gateZ,b.race,CIVIL_ARCHITECTURE_SCALE.castleGateTowerFootprint,CIVIL_ARCHITECTURE_SCALE.castleGateTowerHeight);
 if(b.civilRampart){const {ramp,decks,rise}=b.civilRampart;
  civilDeckModules3(q,b.civilRampart,false);for(const deck of decks){for(const side of [-1,1])beamArt(stone,[deck.x,rise+.55,deck.y+(side>0?deck.h:0)],[deck.x+deck.w,rise+.55,deck.y+(side>0?deck.h:0)],.10,p.stone,8);}
  civilAuthoredStair3(q,b.civilRampart);
  for(const side of [-1,1])beamArt(stone,[ramp.x+(side>0?ramp.w:0),.55,ramp.y+ramp.h],[ramp.x+(side>0?ramp.w:0),rise+.55,ramp.y],.09,p.stone,8);
 }
 if(!b._generatedBuildingEntity)b.visualHeight=12;return 12;
};
const civilPropBefore=prop3;
prop3=function(r,o,x,z){
 if(o.civilRampartStair||o.civilContinuousStair)return .1;
 if(o.civilStair){const q=groundedPainter(r,x,z),wood=o.civilStair.kind==='wood',p=materialRealm(q,wood?5:18),color=wood?'#826044':'#a1a49a';
  if(o.civilStair.kind==='ladder'){const timber=materialRealm(q,5);box3(materialRealm(q,18),x,-.06,z,2.1,.16,2.1,'#666a63');for(const side of [-1,1])beamArt(timber,[x+side*.52,.15,z-.8],[x+side*.52,-2.7,z-.8],.07,'#72533a',7);for(let i=0;i<8;i++)beamArt(timber,[x-.52,.05-i*.34,z-.8],[x+.52,.05-i*.34,z-.8],.045,'#866445',6);return .4;}
  if(o.civilStair.down){for(const side of [-1,1])box3(p,x+side*.79,-1.3,z,.08,2.6,3,'#484e4d');box3(p,x,-2.65,z,1.6,.1,3,'#303737');for(let i=0;i<8;i++)box3(p,x,-.14-i*.25,z+1.25-i*.36,1.45,.16,.37,color);for(const side of [-1,1]){beamArt(p,[x+side*.78,.65,z+1.4],[x+side*.78,.65,z-1.4],.055,color);for(const zz of [-1.3,1.3])beamArt(p,[x+side*.78,.02,z+zz],[x+side*.78,.7,z+zz],.055,color);}return .9;}
  if(o.civilStair.kind==='spiral'){profile3(p,x,1.2,z,.3,2.4,.3,[[-.5,1],[.5,1]],color,a=>a,8);for(let i=0;i<10;i++){const a=i*.5;box3(p,x+Math.cos(a)*.55,i*.22+.1,z+Math.sin(a)*.55,.7,.18,.7,color);}}
  else{for(let i=0;i<8;i++)box3(p,x,.12+i*.13,z+.95-i*.28,1.45,.24+i*.26,.3,color);for(const side of [-1,1]){beamArt(p,[x+side*.8,.8,z+1.1],[x+side*.8,2.4,z-1.2],.055,color);for(const zz of [-1,1])beamArt(p,[x+side*.8,0,z+zz],[x+side*.8,zz>0?.85:2.35,z+zz],.045,color);}}
  return 2.5;
 }
 if(!o.civilDecor)return civilPropBefore(r,o,x,z);
 const q=groundedPainter(r,x,z),p=worldStyle[o.race||'dwarf'],stone=materialRealm(q,18),wood=materialRealm(q,5);
 if(o.civilDecor==='cellBars'){for(let a=-o.barWidth/2;a<=o.barWidth/2;a+=.5){if(Math.abs(a)<1.6)continue;beamArt(q,[x+a,.3,z+.5],[x+a,2.6,z+.5],.035,'#424b4b',6);}for(const side of [-1,1])beamArt(q,[x+side*1.6,2.5,z+.5],[x+side*o.barWidth/2,2.5,z+.5],.055,'#424b4b',6);return 2.6;}
 if(o.civilDecor==='gate'){
  const gate=o.civilGatehouse,turn=gate?.turn||o.roomYaw||0,gx=gate?.x||x,gz=gate?.y||z;
  for(const tower of gate?.towers||[])civilGateTower3(q,gate,tower);
  civilGateArch3(q,gx,gz,turn,CIVIL_ARCHITECTURE_SCALE.cityGateWidth,o.race||'human');
  const local=worldLocal(q,gx,0,gz,turn),stone=materialRealm(local,18),p=worldStyle[o.race||'human'];for(let i=0;i<7;i++)box3(stone,-CIVIL_ARCHITECTURE_SCALE.cityGateWidth/2+.45+i*(CIVIL_ARCHITECTURE_SCALE.cityGateWidth-.9)/6,CIVIL_ARCHITECTURE_SCALE.cityGateHeight+.25,0,.48,.55,2.7,p.stone);
  return CIVIL_ARCHITECTURE_SCALE.cityGateTowerHeight+.6;
 }
 if(o.civilDecor==='tower')return civilFortressTower3(q,x,z,o.race||'human',CIVIL_ARCHITECTURE_SCALE.cityWallTowerFootprint,CIVIL_ARCHITECTURE_SCALE.cityWallTowerHeight);
 if(o.civilDecor==='crane'||o.civilDecor==='headframe'){for(const side of [-1,1]){beamArt(wood,[x+side*1.7,0,z],[x+side*.6,5,z],.18,p.wood,8);beamArt(wood,[x+side*1.7,0,z+1.4],[x+side*.6,5,z],.15,p.wood,8);}beamArt(wood,[x-1.1,4.6,z],[x+3.8,4.6,z],.17,p.wood,8);beamArt(q,[x+3,4.6,z],[x+3,.8,z],.025,'#b6a989',6);box3(stone,x+3,.65,z,1,.8,1,p.stone);return 5.2;}
 if(o.civilDecor==='stoneStock'){for(let i=0;i<6;i++)box3(stone,x+(i%3-.5)*.65,.25+Math.floor(i/3)*.5,z, .6,.5,1.3,'#aaa996');return 1.2;}
 if(o.civilDecor==='rubble'){for(let i=0;i<4;i++)worldModel(q,'Rock_Medium_1',x+Math.sin(i*2)*.6,0,z+Math.cos(i*2)*.6,.4+i*.12);return 1;}
 if(o.civilDecor==='brokenRamp'){for(let i=0;i<5;i++)beamArt(wood,[x-.7,i*.12,z-i*.45],[x+.7,i*.12,z-i*.45+.2],.1,p.wood,6);return 1;}
 if(o.civilDecor==='dummy')return drawPracticeDummy(q,{tutorialRole:'melee-dummy'},x,z);
 if(o.civilDecor==='grove'){environmentModule3(q,rebuiltModels.TwistedTree_1,x,0,z,4.5,7,4.5);return 7;}
 if(o.civilDecor==='monument'){
  // Different civic crafts, contained within the existing protected plinth.
  if(['greyhaven','ironhollow','deepforge'].includes(o.civicEmblem)){
   box3(stone,x,.3,z,2.1,.6,2.1,p.stone);
   if(o.civicEmblem==='greyhaven'){beamArt(stone,[x, .6,z],[x,3.2,z],.16,p.stone,8);beamArt(stone,[x-.85,2.8,z],[x+.85,2.8,z],.10,p.stone,8);for(const side of [-1,1]){beamArt(stone,[x+side*.72,2.8,z],[x+side*.72,1.9,z],.025,p.stone,6);box3(stone,x+side*.72,1.85,z,.5,.12,.6,p.stone);}return 3.3;}
   if(o.civicEmblem==='ironhollow'){beamArt(stone,[x,.6,z],[x,2.5,z],.18,p.stone,8);box3(stone,x,2.65,z,1.65,.65,.75,p.stone);return 3;}
   box3(stone,x,1,z,.8,.8,.9,p.stone);box3(stone,x,1.6,z,1.8,.4,1.1,p.stone);return 1.9;
  }
  box3(stone,x,.3,z,2.1,.6,2.1,p.stone);profile3(stone,x,2.3,z,.7,4,.7,[[-.5,1.3],[.4,1],[.5,.1]],p.stone,a=>a,8);return 4.5;}
 return civilPropBefore(r,o,x,z);
};
const civilWallArtBefore=drawRealmWall;
drawRealmWall=function(r,x,y){if(globalThis.VeldrenStructureScene?.enabled&&civilFloors.has(currentScene))return;const floor=civilFloors.get(currentScene);if(!floor)return civilWallArtBefore(r,x,y);const tile=floor.walls.get(x+':'+y);if(tile)civilWallGeometry(r,tile);};
const civilCrossingsBefore=drawRealmCrossings;
drawRealmCrossings=function(r){civilCrossingsBefore(r);if(globalThis.VeldrenStructureScene?.enabled)return;
 if(currentScene==='overworld'){const walls=civilWalls.get('overworld');if(walls)civilDrawWallRuns(r,walls,'human',true);}
 else if(civilFloors.has(currentScene)){for(const room of civilFloors.get(currentScene).rooms)civilPaintFloor(r,room.x+.5,room.y+.5,room.w-1,room.h-1,['library','study','bedroom','guest'].includes(room.usage)?'#a38a68':'#95988b',5);}
};
const civilRoadBefore=roadInfluence;
roadInfluence=function(x,y){const out=civilRoadBefore(x,y);if(currentScene!=='overworld')return out;const q=quarryAt(x,y);if(q)return [1,0,1];return out;};
function civilizationReviewPoint(name){
 const castle=worldScenes.overworld.buildings.find(b=>b.settlement==='ironhollow'&&b.civilCastle),town=id=>{const t=SETTLEMENTS.find(t=>t.id===id);return ['overworld',t.x,t.y+5];};
 const cityGate=civilGatehouses.find(g=>g.town==='crownreach'),gatePoint=(u,v)=>{const [x,z]=civilGatehousePoint(cityGate,u,v);return ['overworld',x,z];};
 const points={briarhaven:town('briarhaven'),ironhollow:town('ironhollow'),'small-village':town('fernwatch'),'large-village':town('copperdelve'),town:town('willowcross'),capital:town('crownreach'),goblins:['overworld',95,99],dwarven:town('deepforge'),elven:town('aelindor'),
 'city-gate-exterior':gatePoint(0,22),'city-gate-interior':gatePoint(-CIVIL_ARCHITECTURE_SCALE.cityGateTowerFootprint,3),'city-gate-upper':gatePoint(-CIVIL_ARCHITECTURE_SCALE.cityGateTowerFootprint,-4),
 'citadel-exterior':['overworld',castle.x+24,castle.y+castle.h+12],'citadel-courtyard':['overworld',castle.x+24,castle.y+28],'citadel-hall':['overworld',castle.x+24,castle.y+12],'citadel-library':['overworld',castle.x+8,castle.y+7],'citadel-upper':['overworld',castle.x+32,castle.y+22],'citadel-lower':[castle.service.destination+'_lower',24,12]};
 for(const [key,id]of [['ironhollow-quarry','ironhollow'],['active-quarry','deepforge'],['abandoned-quarry','stoneford']]){const q=surfaceQuarries.find(q=>q.id===id);if(q){const p=globalThis.VeldrenQuarryScene?.enabled?VeldrenQuarryScene.point(q,0,8):[q.x,0,q.y+8];points[key]=['overworld',p[0],p[2]];}}
 return points[name];
}
