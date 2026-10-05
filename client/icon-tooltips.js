'use strict';
// One tooltip for the whole interface, including dynamically rebuilt panels.
// Item/world long presses keep their existing action menus.
const iconTooltip=document.createElement('div');
iconTooltip.id='gameTooltip';iconTooltip.hidden=true;iconTooltip.setAttribute('role','tooltip');
document.body.appendChild(iconTooltip);
let tooltipOwner=null,tooltipTitle=null,tooltipPoint=null,tooltipTimer=0,tooltipRefresh=0,tooltipRelease=0,tooltipPress=null,tooltipBlockedClick=null;
function tooltipLabel(el){return el?.dataset?.tooltip||el?.getAttribute('title')||(el===tooltipOwner?tooltipTitle:null)||el?.getAttribute('aria-label')||'';}
function tooltipElement(node){return node?.closest?.('[data-tooltip],[title],button[aria-label]')||null;}
function positionIconTooltip(){
 if(!tooltipOwner)return;
 const rect=tooltipOwner.getBoundingClientRect(),box=iconTooltip.getBoundingClientRect(),view=window.visualViewport;
 const left=view?.offsetLeft||0,top=view?.offsetTop||0,width=view?.width||window.innerWidth,height=view?.height||window.innerHeight;
 const x=tooltipPoint?.x??rect.left+rect.width/2,y=tooltipPoint?.y??rect.bottom;
 iconTooltip.style.left=Math.max(left+6,Math.min(x+12,left+width-box.width-6))+'px';
 iconTooltip.style.top=Math.max(top+6,Math.min(y+18+box.height>top+height-6?y-box.height-14:y+18,top+height-box.height-6))+'px';
}
function hideIconTooltip(){
 clearTimeout(tooltipTimer);clearTimeout(tooltipRefresh);clearTimeout(tooltipRelease);
 if(tooltipOwner){
  if(tooltipTitle!==null&&!tooltipOwner.hasAttribute('title'))tooltipOwner.setAttribute('title',tooltipTitle);
  const ids=(tooltipOwner.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==iconTooltip.id);
  if(ids.length)tooltipOwner.setAttribute('aria-describedby',ids.join(' '));else tooltipOwner.removeAttribute('aria-describedby');
 }
 tooltipOwner=null;tooltipTitle=null;tooltipPoint=null;iconTooltip.hidden=true;
}
function refreshIconTooltip(){
 if(!tooltipOwner?.isConnected||tooltipOwner.closest('[hidden]')){hideIconTooltip();return;}
 // Running energy, ammunition counts and minimap names can change under a pointer.
 if(tooltipOwner.hasAttribute('title')){tooltipTitle=tooltipOwner.getAttribute('title');tooltipOwner.removeAttribute('title');}
 const label=tooltipLabel(tooltipOwner);if(!label){hideIconTooltip();return;}
 if(iconTooltip.textContent!==label)iconTooltip.textContent=label;
 positionIconTooltip();tooltipRefresh=setTimeout(refreshIconTooltip,150);
}
function showIconTooltip(el,point=null){
 hideIconTooltip();if(!el?.isConnected||!tooltipLabel(el))return;
 tooltipOwner=el;tooltipTitle=el.getAttribute('title');tooltipPoint=point;
 const modal=el.closest('dialog[open]');(modal||document.body).appendChild(iconTooltip);
 const ids=new Set((el.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));ids.add(iconTooltip.id);el.setAttribute('aria-describedby',[...ids].join(' '));
 iconTooltip.hidden=false;refreshIconTooltip();
}
function queueIconTooltip(el,point=null,delay=180){
 clearTimeout(tooltipTimer);if(!el)return;
 tooltipTimer=setTimeout(()=>showIconTooltip(el,point),delay);
}
document.addEventListener('pointerover',e=>{
 if(e.pointerType==='touch'||e.buttons)return;
 const el=tooltipElement(e.target);if(el&&el!==tooltipElement(e.relatedTarget)){hideIconTooltip();queueIconTooltip(el,{x:e.clientX,y:e.clientY});}
});
document.addEventListener('pointermove',e=>{
 if(tooltipPress&&Math.hypot(e.clientX-tooltipPress.x,e.clientY-tooltipPress.y)>9){tooltipPress=null;hideIconTooltip();}
 if(e.pointerType!=='touch'&&tooltipOwner===tooltipElement(e.target)){tooltipPoint={x:e.clientX,y:e.clientY};positionIconTooltip();}
});
document.addEventListener('pointerout',e=>{if(e.pointerType!=='touch'&&tooltipElement(e.target)!==tooltipElement(e.relatedTarget))hideIconTooltip();});
document.addEventListener('focusin',e=>{if(e.target.matches?.(':focus-visible'))queueIconTooltip(tooltipElement(e.target));});
document.addEventListener('focusout',hideIconTooltip);
document.addEventListener('pointerdown',e=>{
 hideIconTooltip();tooltipPress=null;tooltipBlockedClick=null;
 if(e.pointerType!=='touch')return;
 const el=e.target.closest?.('[data-help-hold="true"]');
 if(!el||el.dataset.itemId||el.querySelector('[data-item-icon]')||el.closest('#worldOptions,#socialOptions'))return;
 tooltipPress={el,x:e.clientX,y:e.clientY,id:e.pointerId};
 tooltipTimer=setTimeout(()=>{if(tooltipPress?.el!==el)return;showIconTooltip(el);tooltipBlockedClick=el;},500);
},true);
document.addEventListener('pointerup',()=>{
 clearTimeout(tooltipTimer);tooltipPress=null;
 if(tooltipBlockedClick)tooltipRelease=setTimeout(hideIconTooltip,2200);
});
document.addEventListener('pointercancel',()=>{tooltipPress=null;tooltipBlockedClick=null;hideIconTooltip();});
document.addEventListener('click',e=>{
 if(tooltipBlockedClick?.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();tooltipBlockedClick=null;return;}
 hideIconTooltip();
},true);
document.addEventListener('contextmenu',e=>{if(tooltipBlockedClick?.contains(e.target)){e.preventDefault();return;}hideIconTooltip();});
document.addEventListener('scroll',hideIconTooltip,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideIconTooltip();});
window.addEventListener('resize',hideIconTooltip);window.addEventListener('blur',hideIconTooltip);
window.visualViewport?.addEventListener('resize',hideIconTooltip);
