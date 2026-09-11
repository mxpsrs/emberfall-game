'use strict';
let panelPage=0;
function pageItems(items,size){const pages=Math.max(1,Math.ceil(items.length/size));panelPage=Math.min(panelPage,pages-1);return items.slice(panelPage*size,(panelPage+1)*size);}
function pageControls(total,size){const pages=Math.max(1,Math.ceil(total/size));$('pageLabel').textContent=(panelPage+1)+' / '+pages;$('prevPage').disabled=panelPage===0;$('nextPage').disabled=panelPage>=pages-1;$('panelPager').hidden=pages<=1;}
function updateOrientation(){const portrait=window.matchMedia('(orientation: portrait)').matches;$('rotateScreen').hidden=!portrait;document.body.classList.toggle('portrait-mode',portrait);if(typeof resize==='function')resize();}
function initHud(){
 $('minimapButton').onclick=walkFromMinimap;
 $('togglePanels').onclick=()=>{const open=$('gameDock').hidden;$('gameDock').hidden=!open;document.body.classList.toggle('panels-open',open);$('togglePanels').setAttribute('aria-expanded',String(open));$('togglePanels').textContent=open?'Close panels':'Bag & menus';if(open){tab='bag';tutorialEvent('bag');panelPage=0;syncTabs();renderPanel();}};
 $('prevPage').onclick=()=>{panelPage=Math.max(0,panelPage-1);renderPanel();};$('nextPage').onclick=()=>{panelPage++;renderPanel();};
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{panelPage=0;renderPanel();}));
 $('tutCollapse').onclick=()=>{const collapsed=$('tutorial').classList.toggle('collapsed');$('tutCollapse').textContent=collapsed?'Expand':'Minimize';};
 window.addEventListener('resize',updateOrientation);window.addEventListener('orientationchange',updateOrientation);updateOrientation();
}

function drawMinimap(){
 const c=$('minimap'),g=c.getContext('2d'),[mapW,mapH]=sceneSize(),sx=c.width/mapW,sy=c.height/mapH;
 if(!miniTerrain){miniTerrain=document.createElement('canvas');miniTerrain.width=c.width;miniTerrain.height=c.height;const bg=miniTerrain.getContext('2d');const stride=Math.max(1,Math.ceil(mapW/192));for(let y=0;y<mapH;y+=stride)for(let x=0;x<mapW;x+=stride){bg.fillStyle=worldWall(x,y)?'#182730':['#426044','#9d8657','#727d78','#3c839d'][terrainType(x,y)];bg.fillRect(x*sx,y*sy,sx*stride+.4,sy*stride+.4);}if(inWorld()&&typeof organicRoads!=='undefined'){bg.strokeStyle='#a8976c';bg.lineWidth=1;bg.beginPath();for(const road of organicRoads){bg.moveTo(road.a[0]*sx,road.a[1]*sy);bg.lineTo(road.b[0]*sx,road.b[1]*sy);}bg.stroke();}for(const b of buildings){bg.fillStyle='#d7bd86';bg.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);}}
 g.drawImage(miniTerrain,0,0);
 for(const o of objects){if(o.dead>time||(o.type==='boss'&&s.boss)||['tree','prop','crop'].includes(o.type))continue;g.fillStyle=fighter(o)?'#ee897a':'#f5d995';g.beginPath();g.arc((o.x+.5)*sx,(o.y+.5)*sy,fighter(o)?1.5:1.2,0,Math.PI*2);g.fill();}
 for(const pile of s.groundLoot||[])if(pile.scene===currentScene){g.fillStyle='#f4d45e';g.fillRect((pile.x+.5)*sx-1,(pile.y+.5)*sy-1,2,2);}
 g.strokeStyle='#ffffff70';g.lineWidth=1;if(typeof unproject3==='function'){g.beginPath();[[0,0],[screen.w,0],[screen.w,screen.h],[0,screen.h]].forEach(([x,y],i)=>{const p=unproject3(x,y);if(i)g.lineTo(p.x*sx,p.z*sy);else g.moveTo(p.x*sx,p.z*sy);});g.closePath();g.stroke();}
 const x=(px+.5)*sx,y=(py+.5)*sy;g.fillStyle='#fff3be';g.strokeStyle='#15252a';g.lineWidth=2;g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();g.stroke();
}

function walkFromMinimap(e){
 if(!assetsReady||cloudConflict||$('creator').open||$('modal').open||$('spiritsDialog').open)return;
 const rect=$('minimap').getBoundingClientRect(),[w,h]=sceneSize();
 if(!rect.width||!rect.height)return;
 const u=(e.clientX-rect.left)/rect.width,v=(e.clientY-rect.top)/rect.height;
 if(u<0||v<0||u>=1||v>=1)return;
 walkTo(Math.floor(u*w),Math.floor(v*h));
}
