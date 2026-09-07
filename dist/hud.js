'use strict';
let panelPage=0;
function pageItems(items,size){const pages=Math.max(1,Math.ceil(items.length/size));panelPage=Math.min(panelPage,pages-1);return items.slice(panelPage*size,(panelPage+1)*size);}
function pageControls(total,size){const pages=Math.max(1,Math.ceil(total/size));$('pageLabel').textContent=(panelPage+1)+' / '+pages;$('prevPage').disabled=panelPage===0;$('nextPage').disabled=panelPage>=pages-1;$('panelPager').hidden=pages<=1;}
function updateOrientation(){const portrait=window.matchMedia('(orientation: portrait)').matches;$('rotateScreen').hidden=!portrait;document.body.classList.toggle('portrait-mode',portrait);if(typeof resize==='function')resize();}
function initHud(){
 $('minimapButton').onclick=worldMap;
 $('prevPage').onclick=()=>{panelPage=Math.max(0,panelPage-1);renderPanel();};$('nextPage').onclick=()=>{panelPage++;renderPanel();};
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{panelPage=0;renderPanel();}));
 $('tutCollapse').onclick=()=>{const collapsed=$('tutorial').classList.toggle('collapsed');$('tutCollapse').textContent=collapsed?'Expand':'Minimize';};
 window.addEventListener('resize',updateOrientation);window.addEventListener('orientationchange',updateOrientation);updateOrientation();
}

function drawMinimap(){
 const c=$('minimap'),g=c.getContext('2d'),[mapW,mapH]=sceneSize(),sx=c.width/mapW,sy=c.height/mapH;
 if(!miniTerrain){miniTerrain=document.createElement('canvas');miniTerrain.width=c.width;miniTerrain.height=c.height;const bg=miniTerrain.getContext('2d');for(let y=0;y<mapH;y++)for(let x=0;x<mapW;x++){bg.fillStyle=worldWall(x,y)?'#182730':['#426044','#9d8657','#727d78','#3c839d'][terrainType(x,y)];bg.fillRect(x*sx,y*sy,sx+.4,sy+.4);}for(const b of buildings){bg.fillStyle='#d7bd86';bg.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);}}
 g.drawImage(miniTerrain,0,0);
 for(const o of objects){if(o.dead>time||(o.type==='boss'&&s.boss)||['tree','prop','crop'].includes(o.type))continue;g.fillStyle=fighter(o)?'#ee897a':'#f5d995';g.beginPath();g.arc((o.x+.5)*sx,(o.y+.5)*sy,fighter(o)?1.5:1.2,0,Math.PI*2);g.fill();}
 g.strokeStyle='#ffffff70';g.lineWidth=1;g.strokeRect(camera.x/TILE*sx,camera.y/TILE*sy,screen.w/TILE*sx,screen.h/TILE*sy);
 const x=(px+.5)*sx,y=(py+.5)*sy;g.fillStyle='#fff3be';g.strokeStyle='#15252a';g.lineWidth=2;g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();g.stroke();
}
