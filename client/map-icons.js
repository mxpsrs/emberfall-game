'use strict';
const MAP_SERVICE_TYPES={all:['map','All services'],tutor:['tutor','Tutors'],shop:['shop','General stores'],weapons:['attack','Weapons'],armour:['gear','Armour'],bank:['bank','Banks'],forge:['forge','Forges'],inn:['inn','Inns'],magic:['spells','Magic schools'],shrine:['shrine','Shrines'],mine:['mine','Mines & quarries']};
const MAP_TUTOR_SUBJECTS={guide:'First steps',woods:'Woodcutting',fishing:'Fishing & Firemaking',cooking:'Cooking',mining:'Mining & Smithing',combat:'Combat',bank:'Banking',worship:'Worship',magic:'Magic'};
let mapServicesCache=null,miniServiceMarkers=[],localMapState=null;
function mapObjectService(o){
 if(o.mapService)return {kind:o.mapService,tags:[o.mapService],detail:MAP_SERVICE_TYPES[o.mapService]?.[1]||o.name};
 if(o.civilStair)return {kind:'all',tags:[],detail:'Visible stairs · '+(worldScenes[o.civilStair.destination]?.title||'Ground floor')};
 if(o.tutor)return {kind:o.tutor==='bank'?'bank':'tutor',tags:['tutor',...(o.tutor==='bank'?['bank']:o.tutor==='magic'?['magic']:o.tutor==='worship'?['shrine']:[])],detail:MAP_TUTOR_SUBJECTS[o.tutor]+' tutor'};
 if(o.type==='banker')return {kind:'bank',tags:['bank'],detail:'Deposit and withdraw supplies'};
 if(o.type==='shop')return {kind:'shop',tags:['shop','weapons','armour'],detail:'Supplies, weapons & armour'};
 if(o.type==='forge')return {kind:'forge',tags:['forge'],detail:'Smithing anvil'};
 if(o.type==='inn')return {kind:'inn',tags:['inn'],detail:'Rest & recover health'};
 return null;
}
function collectMapServices(){
 const quarries=currentScene==='overworld'&&typeof surfaceQuarries!=='undefined'?surfaceQuarries:[];
 const key=currentScene+':'+objects.length+':'+buildings.length+':'+quarries.length;
 if(mapServicesCache?.key===key)return mapServicesCache.entries;
 const entries=[],represented=new Set(),rooms=new Map(buildings.filter(b=>b.service).map(b=>[b.service.destination,b]));
 for(const o of objects){const info=mapObjectService(o);if(!info)continue;const building=rooms.get(o.interiorBuilding),name=o.tutor?o.name:building?.name||o.name,id='object:'+o.id+':'+o.x+':'+o.y;
  entries.push({...info,id,name,x:o.x,y:o.y,target:o,building});if(building)represented.add(building.service.destination+':'+info.kind);
 }
 for(const b of buildings){if(!b.service)continue;const kind=/bank/i.test(b.name)?'bank':/magic school/i.test(b.name)?'magic':/shrine|temple/i.test(b.name)?'shrine':/mine/i.test(b.name)?'mine':({shop:'shop',forge:'forge',inn:'inn',temple:'shrine',mine:'mine'})[b.archetype];if(!kind)continue;
  if(represented.has(b.service.destination+':'+kind)||entries.some(e=>e.building===b&&e.tags.includes(kind)))continue;
  entries.push({id:'building:'+b.service.destination,kind,tags:kind==='shop'?['shop','weapons','armour']:[kind],name:b.name,detail:kind==='shop'?'Supplies, weapons & armour':MAP_SERVICE_TYPES[kind][1],x:b.service.x,y:b.service.y,target:b.service,building:b});
 }
 for(const q of quarries){
  const ores=[...new Set(objects.filter(o=>o.type==='ore'&&o.quarry===q.id).map(o=>o.resourceId))].map(id=>ORE_RESOURCES[id]).filter(Boolean);
  if(!ores.length)continue;
  entries.push({id:'quarry:'+q.id,kind:'mine',tags:['mine'],name:q.name,detail:'Surface Mining'+(q.type==='abandoned'?' · Abandoned quarry':'')+' · '+ores.map(o=>o.name+' (Mining '+o.level+')').join(', ')+'. Follow the work road to the south access ramp; bring a pickaxe.',x:q.x,y:q.y+q.ry+5,quarry:q});
 }
 mapServicesCache={key,entries};return entries;
}
const MAP_TUTOR_ICONS={guide:'tutor',woods:'woodcutting',fishing:'fish',cooking:'cooking',mining:'mine',combat:'melee',bank:'bank',worship:'shrine',magic:'spells'};
function mapIconFor(entry,filter='all'){if(filter!=='weapons'&&filter!=='armour'&&entry.target?.tutor)return MAP_TUTOR_ICONS[entry.target.tutor]||'tutor';return MAP_SERVICE_TYPES[filter==='weapons'||filter==='armour'?filter:entry.kind]?.[0]||'map';}
function mapEntriesInBounds(bounds,filter='all'){return collectMapServices().filter(e=>(filter==='all'||e.tags.includes(filter))&&e.x>=bounds.x&&e.x<bounds.x+bounds.w&&e.y>=bounds.y&&e.y<bounds.y+bounds.h);}
function layoutMapMarkers(entries,bounds,width,height,small=false){
 const diameter=small?32:30,markers=[],inside=(x,y)=>!small||Math.hypot((x-width/2)/(width/2-18),(y-height/2)/(height/2-18))<=1;
 const sorted=[...entries].sort((a,b)=>Number(b.tags.includes('tutor'))-Number(a.tags.includes('tutor'))||a.id.localeCompare(b.id));
 for(const entry of sorted){const ax=(entry.x+.5-bounds.x)*width/bounds.w,ay=(entry.y+.5-bounds.y)*height/bounds.h;if(!inside(ax,ay))continue;
  const options=[[0,0],[0,-diameter],[diameter,0],[-diameter,0],[0,diameter],[diameter*.8,-diameter*.8],[-diameter*.8,-diameter*.8]];
  const offset=options.find(([dx,dy])=>inside(ax+dx,ay+dy)&&ax+dx>diameter/2&&ay+dy>diameter/2&&ax+dx<width-diameter/2&&ay+dy<height-diameter/2&&!markers.some(m=>Math.hypot(m.x-ax-dx,m.y-ay-dy)<diameter))||[0,0];
  markers.push({entry,x:ax+offset[0],y:ay+offset[1],anchorX:ax,anchorY:ay,r:diameter/2});
 }return markers;
}
function drawMapServices(g,bounds,width,height,small=false,filter='all',selected=null,entries=mapEntriesInBounds(bounds,filter)){
 const markers=layoutMapMarkers(entries,bounds,width,height,small);
 for(const m of markers){const active=m.entry.id===selected;g.save();if(m.x!==m.anchorX||m.y!==m.anchorY){g.strokeStyle='#ddc58c';g.lineWidth=1.5;g.beginPath();g.moveTo(m.anchorX,m.anchorY);g.lineTo(m.x,m.y);g.stroke();}
  g.fillStyle=active?'#76633a':m.entry.tags.includes('tutor')?'#53482e':'#263b2a';g.strokeStyle=active?'#ffe6a8':m.entry.tags.includes('tutor')?'#dbba76':'#a9a478';g.lineWidth=active?2.5:1.3;g.beginPath();g.arc(m.x,m.y,m.r,0,Math.PI*2);g.fill();g.stroke();drawGameIcon(g,mapIconFor(m.entry,filter),m.x-m.r+3,m.y-m.r+3,m.r*2-6);g.restore();
 }if(small)miniServiceMarkers=markers;return markers;
}
function hitMapService(markers,clientX,clientY,rect,width,height){if(!rect.width||!rect.height)return null;const x=(clientX-rect.left)*width/rect.width,y=(clientY-rect.top)*height/rect.height;return markers.map(m=>({m,d:Math.hypot((m.x-x)*rect.width/width,(m.y-y)*rect.height/height)})).filter(({d})=>d<=20).sort((a,b)=>a.d-b.d)[0]?.m.entry||null;}
function mapServiceAtMinimap(e){const c=$('minimap');return hitMapService(miniServiceMarkers,e.clientX,e.clientY,c.getBoundingClientRect(),c.width,c.height);}
function mapTravelGoal(entry){
 const inside=buildings.find(b=>b.walkIn&&withinWalkIn(b,px,py)),room=entry.building?.walkIn?entry.building:null;
 const closed=inside&&inside!==room&&inside.service.openedAt===undefined?inside:room&&inside!==room&&room.service.openedAt===undefined?room:null;
 if(closed){const [x,y]=doorApproach(closed.service,closed===inside);return {target:closed.service,x,y,door:true,label:closed===inside?'Open exit door':'Go to entrance',detail:'Open the '+closed.name+' door to continue.'};}
 if(entry.quarry)return {x:entry.x,y:entry.y,walk:true,label:'Go to quarry',detail:entry.detail};
 if(entry.target===entry.building?.service&&entry.building.walkIn){const door=entry.building.service,[x,y]=doorApproach(door,inside===room);return {target:door,x,y,walk:true,label:'Go to entrance',detail:'Entrance to '+entry.name+'.'};}
 return {target:entry.target,x:entry.x,y:entry.y,door:false,label:entry.kind==='tutor'||entry.tags.includes('tutor')?'Go to tutor':'Go here',detail:entry.detail};
}
function localMapBounds(){const [w,h]=sceneSizes.overworld,width=localMapState.span,height=width*2/3;return {x:width>=w?(w-width)/2:Math.max(0,Math.min(w-width,localMapState.x-width/2)),y:height>=h?(h-height)/2:Math.max(0,Math.min(h-height,localMapState.y-height/2)),w:width,h:height};}
function selectMapService(entry){if(!localMapState)return;if(entry?.settlement){localMapState.x=entry.x;localMapState.y=entry.y;localMapState.span=260;localMapState.selected=null;}else localMapState.selected=entry?.id||null;renderLocalMap();}
function renderLocalMap(){
 if(!localMapState||!$('modal').open)return;const c=$('localMap');if(!c)return;const g=c.getContext('2d'),bounds=localMapBounds(),state=localMapState,selected=collectMapServices().find(e=>e.id===state.selected),point=(x,y)=>[(x+.5-bounds.x)*c.width/bounds.w,(y+.5-bounds.y)*c.height/bounds.h];drawMapTerrain(g,bounds,c.width,c.height);
 if(selected){const goal=mapTravelGoal(selected),points=route(goal.x,goal.y,!goal.door&&!goal.walk,1.45)||[];if(points.length){g.strokeStyle='#f7d982';g.lineWidth=2;g.setLineDash([5,4]);g.beginPath();[[px,py],...points].forEach(([x,y],i)=>{if(i)g.lineTo(...point(x,y));else g.moveTo(...point(x,y));});g.stroke();g.setLineDash([]);}}
 const visibleEntries=mapEntriesInBounds(bounds,state.filter).filter(e=>bounds.w<=400||state.filter!=='all'||e.quarry);
 state.markers=drawMapServices(g,bounds,c.width,c.height,false,state.filter,state.selected,visibleEntries);drawAtlasLabels(g,bounds,c.width,c.height,state.markers);
 const p=point(px,py);g.fillStyle='#fff3c6';g.strokeStyle='#273326';g.lineWidth=2;g.beginPath();g.arc(...p,5,0,Math.PI*2);g.fill();g.stroke();
 $('mapScale').textContent=Math.round(bounds.w)+' tiles across';
 const entries=atlasEntries(bounds,state.filter).sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py)),list=$('mapPlaces');list.replaceChildren();
 for(const entry of entries){const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(entry.id===state.selected));button.innerHTML=gameIcon(mapIconFor(entry,state.filter));button.title=entry.name+' — '+entry.detail;const copy=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=entry.name;detail.textContent=entry.detail;copy.append(name,detail);button.appendChild(copy);button.onclick=()=>selectMapService(entry);list.appendChild(button);}
 if(!entries.length){const empty=document.createElement('p');empty.textContent='No '+MAP_SERVICE_TYPES[state.filter][1].toLowerCase()+' in this area. Drag the map or zoom out.';list.appendChild(empty);}
 const selection=$('mapSelection');selection.replaceChildren();const copy=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('p');copy.append(name,detail);selection.appendChild(copy);
 name.textContent=selected?.name||'Choose a map icon';detail.textContent=selected?mapTravelGoal(selected).detail:'Select a settlement to zoom in, or a Mining icon for surface quarry resources and access. The white dot is you.';
 if(selected){const go=document.createElement('button'),goal=mapTravelGoal(selected);go.type='button';go.className='primary';go.textContent=goal.label;go.onclick=()=>{if(currentScene!=='overworld'){toast(currentScene==='tutorial'?'Finish Firstlight’s apprenticeship to travel to the mainland.':'Leave this area before following a mainland route.');return;}const next=mapTravelGoal(selected);close();if(next.walk)walkTo(next.x,next.y);else engage(next.target);};selection.appendChild(go);}
 document.querySelectorAll('[data-map-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapFilter===state.filter)));
}
function openLocalMap(selectedId=null){
 if(!assetsReady||cloudConflict||cloudDisconnected||$('creator').open)return;
 const [w,h]=sceneSizes.overworld;localMapState={x:w/2,y:h/2,span:atlasFullSpan(),filter:'all',selected:null,markers:[],player:atlasPlayerPoint(),originScene:currentScene};
 dialog('World map','<div class="map-heading"><p>Drag to explore · Pinch or use + / − to zoom</p><button id="mapKingdoms" type="button"></button></div><div id="mapFilters" class="map-filters" role="group" aria-label="Map services"></div><div class="map-content"><div><div class="local-map-frame"><canvas id="localMap" width="900" height="600" aria-label="World map showing Aurelia, Khaz-Dur, Sylvaran, all towns and villages, and surface quarries marked with Mining icons. Locations are also listed beside the map."></canvas><div class="map-compass" role="img" aria-label="Compass: north up, east right, south down, west left"><svg viewBox="0 0 72 72" aria-hidden="true"><path d="M36 18L42 36L36 54L30 36Z" fill="#dfbd79"/><path d="M36 18L36 36L30 36Z" fill="#e56e5f"/><path d="M18 36L36 30L54 36L36 42Z" fill="#a9c3c8"/><circle cx="36" cy="36" r="3" fill="#f2eddf"/><g fill="#f2eddf" font-family="Arial" font-size="14" text-anchor="middle"><text x="36" y="14">N</text><text x="64" y="41">E</text><text x="36" y="69">S</text><text x="8" y="41">W</text></g></svg></div><span id="mapScale" class="map-scale"></span></div><div class="map-toolbar"><p id="mapFilterName">All services</p><div class="map-tools"><button id="mapZoomOut" type="button"></button><button id="mapRecenter" type="button"></button><button id="mapZoomIn" type="button"></button></div></div></div><div id="mapPlaces" class="map-places" role="group" aria-label="Services in this area"></div></div><p class="atlas-legend">Badlands beyond the settlements · Mining icons mark quarry access ramps · Houses · Trees · Rocks · Bridges</p><div id="mapSelection" aria-live="polite"></div>');
 $('modal').classList.add('world-map-window');setHudButton('mapKingdoms','Show the whole world','map');setHudButton('mapZoomOut','Zoom map out','zoomOut');setHudButton('mapZoomIn','Zoom map in','zoomIn');setHudButton('mapRecenter','Centre on your character','recenter');
 for(const [id,[icon,label]]of Object.entries(MAP_SERVICE_TYPES)){const b=document.createElement('button');b.type='button';b.dataset.mapFilter=id;setHudButton(b,label,icon);b.onclick=()=>{localMapState.filter=id;localMapState.selected=null;$('mapFilterName').textContent=label;renderLocalMap();};$('mapFilters').appendChild(b);}
 $('mapKingdoms').onclick=()=>{localMapState.span=atlasFullSpan();localMapState.x=sceneSizes.overworld[0]/2;localMapState.y=sceneSizes.overworld[1]/2;localMapState.filter='all';$('mapFilterName').textContent='All locations';renderLocalMap();};
 $('mapRecenter').onclick=()=>{[localMapState.x,localMapState.y]=localMapState.player;localMapState.span=180;renderLocalMap();};
 const zoom=factor=>{localMapState.span=Math.max(48,Math.min(atlasFullSpan(),localMapState.span*factor));renderLocalMap();};$('mapZoomOut').onclick=()=>zoom(1.4);$('mapZoomIn').onclick=()=>zoom(1/1.4);
 const c=$('localMap');let drag=null,pinch=null;const pointers=new Map();
 c.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.15:1/1.15);},{passive:false});
 c.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){e.preventDefault();c.setPointerCapture(e.pointerId);const [a,b]=[...pointers.values()];pinch={distance:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1])),span:localMapState.span};if(drag)drag.moved=true;return;}if(drag)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,bounds:localMapBounds(),moved:false};c.setPointerCapture(e.pointerId);});
 c.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId))pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pinch&&pointers.size===2){e.preventDefault();const [a,b]=[...pointers.values()],distance=Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1]));localMapState.span=Math.max(48,Math.min(atlasFullSpan(),pinch.span*pinch.distance/distance));renderLocalMap();return;}if(!drag){const entry=hitMapService(localMapState.markers,e.clientX,e.clientY,c.getBoundingClientRect(),c.width,c.height);c.title=entry?entry.name+' · '+entry.detail:'Drag to explore the map';return;}if(drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>7)drag.moved=true;if(!drag.moved)return;const rect=c.getBoundingClientRect(),[w,h]=sceneSizes.overworld;localMapState.x=Math.max(0,Math.min(w,drag.bounds.x+drag.bounds.w/2-dx*drag.bounds.w/rect.width));localMapState.y=Math.max(0,Math.min(h,drag.bounds.y+drag.bounds.h/2-dy*drag.bounds.h/rect.height));renderLocalMap();});
 c.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(pinch){pinch=null;drag=null;return;}if(!drag||drag.id!==e.pointerId)return;const tap=!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<=7;drag=null;if(tap)selectMapService(hitMapService(localMapState.markers,e.clientX,e.clientY,c.getBoundingClientRect(),c.width,c.height));});
 for(const event of ['pointercancel','lostpointercapture'])c.addEventListener(event,e=>{pointers.delete(e.pointerId);pinch=null;if(drag?.id===e.pointerId)drag=null;});
 renderLocalMap();
}
$('minimapButton').addEventListener('pointermove',e=>{const entry=mapServiceAtMinimap(e);$('minimapButton').title=entry?entry.name+' · '+entry.detail:'Tap to walk. Open the world map for service details';});
$('modal').addEventListener('close',()=>{$('modal').classList.remove('world-map-window');localMapState=null;});
worldMap=function(){openLocalMap();};$('mapBtn').onclick=worldMap;
