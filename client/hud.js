'use strict';
let panelPage=0;
const JOURNAL_TAB_LABELS={combat:'Combat',skills:'Skills',quests:'Journal',bag:'Bag',gear:'Equipment',worship:'Worship',spells:'Magic',friends:'Friends',ignore:'Blocked',settings:'Settings'};
function setHudButton(button,label,icon){const b=typeof button==='string'?$(button):button;if(!b)return;b.title=label;b.setAttribute('aria-label',label);if(typeof gameIcon==='function'){b.innerHTML=gameIcon(icon);b.classList.add('hud-icon');b.dataset.icon=icon;b.dataset.helpHold='true';}else b.textContent=label;if(b.dataset.tab&&JOURNAL_TAB_LABELS[b.dataset.tab]){const text=document.createElement('span');text.className='journal-tab-label';text.textContent=JOURNAL_TAB_LABELS[b.dataset.tab];b.appendChild(text);}}
function syncPanelButton(){const open=!$('gameDock').hidden;setHudButton('togglePanels',window.realmTrade?'Close '+window.realmTrade.kind:open?'Close panel':'Open bag',open?'close':'bag');$('togglePanels').setAttribute('aria-expanded',String(open));}
function openGamePanel(which,toggle=false){if(window.realmTrade)return;if(which==='gear'&&typeof openEquipment==='function')return openEquipment(toggle);if((window.equipmentStatsOpen||window.equipmentOpen||window.realmWorkbench)&&(which!=='bag'||toggle))close();const open=!(toggle&&!$('gameDock').hidden&&tab===which);$('gameDock').hidden=!open;document.body.classList.toggle('panels-open',open);tab=which;panelPage=0;syncPanelButton();syncTabs();if(open){tutorialEvent(which);renderPanel();}}
function syncAmbientIcon(){const on=typeof ambientEnabled!=='undefined'&&ambientEnabled,b=$('ambientButton');if(!b)return;setHudButton(b,on?'Mute sound':'Enable sound',on?'sound':'mute');b.setAttribute('aria-pressed',String(on));}
function pageItems(items,size){const pages=Math.max(1,Math.ceil(items.length/size));panelPage=Math.min(panelPage,pages-1);return items.slice(panelPage*size,(panelPage+1)*size);}
function pageControls(total,size){const pages=Math.max(1,Math.ceil(total/size));$('pageLabel').textContent=(panelPage+1)+' / '+pages;$('prevPage').disabled=panelPage===0;$('nextPage').disabled=panelPage>=pages-1;$('panelPager').hidden=pages<=1;}
function updateOrientation(){const portrait=window.matchMedia('(pointer: coarse)').matches&&window.matchMedia('(orientation: portrait)').matches;$('rotateScreen').hidden=!portrait;document.body.classList.toggle('portrait-mode',portrait);if(typeof resize==='function')resize();}
// Orientation must keep working even before game assets finish loading.
window.addEventListener('resize',updateOrientation);
window.addEventListener('orientationchange',updateOrientation);
window.matchMedia('(orientation: portrait)').addEventListener?.('change',updateOrientation);
function initHud(){
 $('minimapButton').onclick=walkFromMinimap;
 setHudButton('minimapCompass','Face north','compass');$('minimapCompass').onclick=()=>{view3d.yaw=0;rememberView();miniMapLastYaw=null;if(miniTerrain)miniTerrain.next=0;drawMinimap();};
 $('togglePanels').onclick=()=>{if(window.realmTrade){close();return;}openGamePanel(tab,true);};
 $('prevPage').onclick=()=>{panelPage=Math.max(0,panelPage-1);renderPanel();};$('nextPage').onclick=()=>{panelPage++;renderPanel();};
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{panelPage=0;renderPanel();}));
 updateOrientation();
}

function minimapBounds(){
 const c=$('minimap'),width=60,height=width*(c.height||300)/(c.width||300);
 return {x:px+.5-width/2,y:py+.5-height/2,w:width,h:height};
}
function minimapPoint(x,y,bounds=minimapBounds(),yaw=view3d.yaw){
 const c=$('minimap'),dx=x+.5-(bounds.x+bounds.w/2),dy=y+.5-(bounds.y+bounds.h/2),co=Math.cos(yaw),si=Math.sin(yaw);
 return [(c.width||300)/2+(dx*co-dy*si)*(c.width||300)/bounds.w,(c.height||300)/2+(dx*si+dy*co)*(c.height||300)/bounds.h];
}
function minimapTile(u,v,bounds=minimapBounds(),yaw=view3d.yaw){
 const dx=(u-.5)*bounds.w,dy=(v-.5)*bounds.h,co=Math.cos(yaw),si=Math.sin(yaw);
 return [Math.floor(bounds.x+bounds.w/2+dx*co+dy*si),Math.floor(bounds.y+bounds.h/2-dx*si+dy*co)];
}
let miniMapLayer=null,miniMapLastYaw=null;
function drawMapTerrain(g,bounds,cw,ch){
 const sx=cw/bounds.w,sy=ch/bounds.h;
 if(!miniTerrain||miniTerrain.scene!==currentScene)miniTerrain={scene:currentScene,tiles:new Map(),next:0};
 g.clearRect(0,0,cw,ch);g.fillStyle='#173d42';g.fillRect(0,0,cw,ch);
 for(let z=Math.floor(bounds.y/32);z<=Math.floor((bounds.y+bounds.h)/32);z++)for(let x=Math.floor(bounds.x/32);x<=Math.floor((bounds.x+bounds.w)/32);x++){
  const key=x+':'+z;let tile=miniTerrain.tiles.get(key);
  if(!tile){tile=document.createElement('canvas');tile.width=tile.height=64;const bg=tile.getContext('2d');
   for(let b=0;b<32;b++)for(let a=0;a<32;a++){const xx=x*32+a,zz=z*32+b,type=terrainType(xx,zz),road=inWorld()&&typeof roadInfluence==='function'?roadInfluence(xx+.5,zz+.5)[0]:0;
    bg.fillStyle=worldWall(xx,zz)?'#172523':type===3?'#28646d':road>.35?'#b2a078':['#506f43','#a8956b','#929586'][type]||'#506f43';bg.fillRect(a*2,b*2,2,2);}
   for(const b of buildings)if(b.x+b.w>x*32&&b.x<(x+1)*32&&b.y+b.h>z*32&&b.y<(z+1)*32){bg.fillStyle='#c4ad80';bg.fillRect((b.x-x*32)*2,(b.y-z*32)*2,b.w*2,b.h*2);bg.strokeStyle='#64553c';bg.lineWidth=1;bg.strokeRect((b.x-x*32)*2,(b.y-z*32)*2,b.w*2,b.h*2);}
   miniTerrain.tiles.set(key,tile);if(miniTerrain.tiles.size>128)miniTerrain.tiles.delete(miniTerrain.tiles.keys().next().value);
  }
  g.drawImage(tile,(x*32-bounds.x)*sx,(z*32-bounds.y)*sy,32*sx,32*sy);
 }
}
function drawMinimap(){
 const c=$('minimap'),g=c.getContext('2d'),bounds=minimapBounds(),cw=c.width||300,ch=c.height||300,yaw=view3d.yaw;
 // Ten updates per second are visually smooth at this size. Redrawing on every
 // camera tick previously scanned the whole world and repainted the canvas at
 // up to 60 Hz while the player rotated.
 if(miniTerrain&&miniTerrain.scene===currentScene&&time<miniTerrain.next)return;
 miniMapLastYaw=yaw;
 if(!miniMapLayer)miniMapLayer=document.createElement('canvas');
 const size=Math.ceil(Math.hypot(cw,ch));if(miniMapLayer.width!==size){miniMapLayer.width=miniMapLayer.height=size;}
 const span=bounds.w*size/cw,outer={x:px+.5-span/2,y:py+.5-span/2,w:span,h:span};
 const layerKey=[currentScene,outer.x,outer.y,outer.w,size].join(':');
 if(!miniTerrain||miniMapLayer._terrainKey!==layerKey||time>=(miniMapLayer._refreshAt||0)){drawMapTerrain(miniMapLayer.getContext('2d'),outer,size,size);miniMapLayer._terrainKey=layerKey;miniMapLayer._refreshAt=time+.5;}
 miniTerrain.next=time+.10;
 g.clearRect(0,0,cw,ch);g.save();g.beginPath();g.rect(0,0,cw,ch);g.clip();
 g.save();g.translate(cw/2,ch/2);g.rotate(yaw);g.drawImage(miniMapLayer,-size/2,-size/2);g.restore();
 const point=(x,y)=>minimapPoint(x,y,bounds,yaw);
 const guidePath=tutorialGuideRoute();if(guidePath.length){g.strokeStyle='#e6d8a0';g.lineWidth=1.5;g.beginPath();for(const [i,p]of [[px,py],...guidePath].entries()){const q=point(...p);if(i)g.lineTo(...q);else g.moveTo(...q);}g.stroke();}
 const mapObjects=typeof worldObjectsInBounds==='function'?worldObjectsInBounds(Math.floor(bounds.x)-2,Math.ceil(bounds.x+bounds.w)+2,Math.floor(bounds.y)-2,Math.ceil(bounds.y+bounds.h)+2):objects;
 for(const o of mapObjects){if(!questFightVisible(o,s)||o.dead>time||o.collected||!(['enemy','man','villager','elder','banker','shop','inn'].includes(o.type)||o.tutor))continue;const q=point(o.drawX??o.x,o.drawY??o.y);g.fillStyle='#ffff35';g.fillRect(q[0]-2,q[1]-2,4,4);}
 for(const pile of s.groundLoot||[])if(pile.scene===currentScene){const q=point(pile.x,pile.y);g.fillStyle='#ee403a';g.fillRect(q[0]-2,q[1]-2,4,4);}
 if(typeof onlinePeers!=='undefined'&&onlineScene===currentScene)for(const peer of onlinePeers.values()){const q=point(peer.drawX??peer.x,peer.drawY??peer.y);g.fillStyle='#fff';g.fillRect(q[0]-2,q[1]-2,4,4);}
 miniServiceMarkers=[];
 if(typeof collectMapServices==='function')for(const entry of collectMapServices()){
  const [x,y]=point(entry.x,entry.y);if(x<13||y<13||x>cw-13||y>ch-13)continue;
  miniServiceMarkers.push({entry,x,y,r:13});g.save();g.shadowColor='#141a12';g.shadowBlur=3;drawGameIcon(g,mapIconFor(entry),x-13,y-13,26);g.restore();
  if(entry.quarry){g.save();g.font='600 15px Georgia';g.textAlign='center';g.textBaseline='middle';const half=Math.min(cw-12,g.measureText(entry.name).width)/2,labelX=Math.max(half+6,Math.min(cw-half-6,x)),labelY=Math.min(ch-12,y+24);g.strokeStyle='#152b2a';g.lineWidth=4;g.strokeText(entry.name,labelX,labelY,cw-12);g.fillStyle='#cde6ed';g.fillText(entry.name,labelX,labelY,cw-12);g.restore();}
 }
 if(path.length){const q=point(...path[path.length-1]);g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(q[0],q[1]+5);g.lineTo(q[0],q[1]-9);g.stroke();g.fillStyle='#e84436';g.fillRect(q[0]+1,q[1]-9,8,5);}
 if(typeof drawQuestMinimap==='function')drawQuestMinimap(g,point,cw,ch);
 g.fillStyle='#fff';g.strokeStyle='#16271e';g.lineWidth=1.5;g.fillRect(cw/2-3,ch/2-3,6,6);g.strokeRect(cw/2-3,ch/2-3,6,6);g.restore();
 g.save();g.font='bold 28px Arial';g.textAlign='center';g.textBaseline='middle';g.lineWidth=5;g.strokeStyle='#101f24';for(const [letter,angle]of [['N',-Math.PI/2],['E',0],['S',Math.PI/2],['W',Math.PI]]){const a=angle+yaw,x=cw/2+Math.cos(a)*(cw/2-19),y=ch/2+Math.sin(a)*(ch/2-19);g.fillStyle=letter==='N'?'#ffcf7b':'#f2eddf';g.strokeText(letter,x,y);g.fillText(letter,x,y);}g.restore();
 const compass=$('minimapCompass');if(compass)compass.style.transform='rotate('+yaw+'rad)';
}
function walkFromMinimap(e){
 if(!assetsReady||cloudConflict||cloudDisconnected||$('creator').open||$('modal').open)return;
 const rect=$('minimap').getBoundingClientRect();if(!rect.width||!rect.height)return;
 const u=(e.clientX-rect.left)/rect.width,v=(e.clientY-rect.top)/rect.height;
 if(u<0||v<0||u>=1||v>=1)return;
 const [x,y]=minimapTile(u,v),[w,h]=sceneSize();if(x>=0&&y>=0&&x<w&&y<h)walkTo(x,y);
}
