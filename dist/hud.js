'use strict';
let panelPage=0;
function pageItems(items,size){const pages=Math.max(1,Math.ceil(items.length/size));panelPage=Math.min(panelPage,pages-1);return items.slice(panelPage*size,(panelPage+1)*size);}
function pageControls(total,size){const pages=Math.max(1,Math.ceil(total/size));$('pageLabel').textContent=(panelPage+1)+' / '+pages;$('prevPage').disabled=panelPage===0;$('nextPage').disabled=panelPage>=pages-1;$('panelPager').hidden=pages<=1;}
function updateOrientation(){const portrait=window.matchMedia('(pointer: coarse)').matches&&window.matchMedia('(orientation: portrait)').matches;$('rotateScreen').hidden=!portrait;document.body.classList.toggle('portrait-mode',portrait);if(typeof resize==='function')resize();}
function initHud(){
 $('minimapButton').onclick=walkFromMinimap;
 $('togglePanels').onclick=()=>{if(window.realmTrade){close();return;}const open=$('gameDock').hidden;$('gameDock').hidden=!open;document.body.classList.toggle('panels-open',open);$('togglePanels').setAttribute('aria-expanded',String(open));$('togglePanels').textContent=open?'Close panels':'Bag & menus';if(open){tab='bag';tutorialEvent('bag');panelPage=0;syncTabs();renderPanel();}};
 $('prevPage').onclick=()=>{panelPage=Math.max(0,panelPage-1);renderPanel();};$('nextPage').onclick=()=>{panelPage++;renderPanel();};
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{panelPage=0;renderPanel();}));
 if(window.matchMedia('(pointer: coarse)').matches){$('tutorial').classList.add('collapsed');$('tutCollapse').textContent='Expand';}
 $('tutCollapse').onclick=()=>{const collapsed=$('tutorial').classList.toggle('collapsed');$('tutCollapse').textContent=collapsed?'Expand':'Minimize';};
 window.addEventListener('resize',updateOrientation);window.addEventListener('orientationchange',updateOrientation);updateOrientation();
}

function minimapBounds(){
 const [w,h]=sceneSize(),width=Math.min(w,96),height=Math.min(h,width*.75);
 return {x:Math.max(0,Math.min(w-width,px+.5-width/2)),y:Math.max(0,Math.min(h-height,py+.5-height/2)),w:width,h:height};
}
function drawMinimap(){
 const c=$('minimap'),g=c.getContext('2d'),bounds=minimapBounds(),cw=c.width||240,ch=c.height||180,sx=cw/bounds.w,sy=ch/bounds.h;
 if(!miniTerrain||miniTerrain.scene!==currentScene)miniTerrain={scene:currentScene,tiles:new Map(),next:0};
 if(time<miniTerrain.next)return;miniTerrain.next=time+.12;
 g.clearRect(0,0,cw,ch);g.fillStyle='#173d42';g.fillRect(0,0,cw,ch);
 for(let z=Math.floor(bounds.y/32);z<=Math.floor((bounds.y+bounds.h)/32);z++)for(let x=Math.floor(bounds.x/32);x<=Math.floor((bounds.x+bounds.w)/32);x++){
  const key=x+':'+z;let tile=miniTerrain.tiles.get(key);
  if(!tile){tile=document.createElement('canvas');tile.width=tile.height=64;const bg=tile.getContext('2d');
   for(let b=0;b<32;b++)for(let a=0;a<32;a++){const xx=x*32+a,zz=z*32+b,type=terrainType(xx,zz),road=inWorld()&&typeof roadInfluence==='function'?roadInfluence(xx+.5,zz+.5)[0]:0;
    bg.fillStyle=worldWall(xx,zz)?'#172523':type===3?'#28646d':road>.35?'#b2a078':['#506f43','#a8956b','#929586'][type]||'#506f43';bg.fillRect(a*2,b*2,2,2);}
   for(const b of buildings)if(b.x+b.w>x*32&&b.x<(x+1)*32&&b.y+b.h>z*32&&b.y<(z+1)*32){bg.fillStyle='#c4ad80';bg.fillRect((b.x-x*32)*2,(b.y-z*32)*2,b.w*2,b.h*2);bg.strokeStyle='#64553c';bg.lineWidth=1;bg.strokeRect((b.x-x*32)*2,(b.y-z*32)*2,b.w*2,b.h*2);}
   miniTerrain.tiles.set(key,tile);if(miniTerrain.tiles.size>32)miniTerrain.tiles.delete(miniTerrain.tiles.keys().next().value);
  }
  g.drawImage(tile,(x*32-bounds.x)*sx,(z*32-bounds.y)*sy,32*sx,32*sy);
 }
 const point=(x,y)=>[(x+.5-bounds.x)*sx,(y+.5-bounds.y)*sy];
 const guidePath=tutorialGuideRoute();if(guidePath.length){g.strokeStyle='#e6d8a0';g.lineWidth=1.5;g.beginPath();for(const [i,p]of [[px,py],...guidePath].entries()){const q=point(...p);if(i)g.lineTo(...q);else g.moveTo(...q);}g.stroke();}
 for(const o of objects){if(o.dead>time||o.collected||(o.type==='boss'&&s.boss)||['tree','prop','crop'].includes(o.type)||o.x<bounds.x||o.x>bounds.x+bounds.w||o.y<bounds.y||o.y>bounds.y+bounds.h)continue;const q=point(o.x,o.y);g.fillStyle=fighter(o)?'#e2836c':o.tutor?'#ffe1a0':'#d8d3b5';g.beginPath();g.arc(...q,o.tutor?2.5:2,0,Math.PI*2);g.fill();}
 for(const pile of s.groundLoot||[])if(pile.scene===currentScene){const q=point(pile.x,pile.y);g.fillStyle='#f4d45e';g.fillRect(q[0]-1.5,q[1]-1.5,3,3);}
 const [x,y]=point(px,py);g.fillStyle='#fff5d0';g.strokeStyle='#16271e';g.lineWidth=2;g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();g.stroke();
}

function walkFromMinimap(e){
 if(!assetsReady||cloudConflict||$('creator').open||$('modal').open||$('spiritsDialog').open)return;
 const rect=$('minimap').getBoundingClientRect(),bounds=minimapBounds();
 if(!rect.width||!rect.height)return;
 const u=(e.clientX-rect.left)/rect.width,v=(e.clientY-rect.top)/rect.height;
 if(u<0||v<0||u>=1||v>=1)return;
 walkTo(Math.floor(bounds.x+u*bounds.w),Math.floor(bounds.y+v*bounds.h));
}
