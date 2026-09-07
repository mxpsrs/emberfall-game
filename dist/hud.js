'use strict';
let panelPage=0;
function pageItems(items,size){const pages=Math.max(1,Math.ceil(items.length/size));panelPage=Math.min(panelPage,pages-1);return items.slice(panelPage*size,(panelPage+1)*size);}
function pageControls(total,size){const pages=Math.max(1,Math.ceil(total/size));$('pageLabel').textContent=(panelPage+1)+' / '+pages;$('prevPage').disabled=panelPage===0;$('nextPage').disabled=panelPage>=pages-1;$('panelPager').hidden=pages<=1;}
function updateOrientation(){const portrait=window.matchMedia('(orientation: portrait)').matches;$('rotateScreen').hidden=!portrait;document.body.classList.toggle('portrait-mode',portrait);if(typeof resize==='function')resize();}
function initHud(){
 $('prevPage').onclick=()=>{panelPage=Math.max(0,panelPage-1);renderPanel();};$('nextPage').onclick=()=>{panelPage++;renderPanel();};
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{panelPage=0;renderPanel();}));
 $('tutCollapse').onclick=()=>{const collapsed=$('tutorial').classList.toggle('collapsed');$('tutCollapse').textContent=collapsed?'Expand':'Minimize';};
 window.addEventListener('resize',updateOrientation);window.addEventListener('orientationchange',updateOrientation);updateOrientation();
}
