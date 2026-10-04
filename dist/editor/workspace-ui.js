'use strict';
(() => {
 const $=id=>document.getElementById(id),body=document.body,workspace=document.querySelector('.workspace');
 const menus=[...document.querySelectorAll('.toolbar-menu')],panelButtons=[...document.querySelectorAll('[data-workspace-panel]')],modelButtons=[...document.querySelectorAll('[data-model-library]')];
 const dock=$('assetDock'),preview=$('modelPreview');let panel='viewport',consoleOpen=false;
 function closeMenus(except){for(const menu of menus)if(menu!==except)menu.open=false;}
 function fitMenu(menu){
  const popup=menu.querySelector('.menu-popover'),bounds=menu.getBoundingClientRect();
  popup.style.left=Math.max(8-bounds.left,Math.min(0,window.innerWidth-8-bounds.left-popup.offsetWidth))+'px';
  popup.style.maxHeight=Math.max(48,window.innerHeight-bounds.bottom-16)+'px';
 }
 for(const menu of menus){
  const summary=menu.querySelector('summary');summary.setAttribute('aria-expanded','false');
  menu.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(menu.open));if(menu.open){closeMenus(menu);fitMenu(menu);}});
 }
 document.addEventListener('pointerdown',event=>{if(!event.target.closest?.('.toolbar-menu'))closeMenus();});
 document.addEventListener('click',event=>{const menu=event.target.closest?.('.toolbar-menu');if(menu&&event.target.closest?.('button')){menu.open=false;menu.querySelector('summary').focus();}});
 document.addEventListener('keydown',event=>{
  const menu=event.target.closest?.('.toolbar-menu');if(!menu)return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();event.stopImmediatePropagation();$('saveWorld').click();closeMenus();return;}
  if(event.key==='Escape'&&menu.open){event.preventDefault();event.stopImmediatePropagation();menu.open=false;menu.querySelector('summary').focus();return;}
  const onSummary=event.target.tagName==='SUMMARY';
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&(onSummary||event.target.tagName==='BUTTON')){
   event.preventDefault();event.stopImmediatePropagation();menu.open=true;fitMenu(menu);
   const controls=[...menu.querySelectorAll('button:not([disabled]):not([hidden]),input:not([disabled]),select:not([disabled])')],index=controls.indexOf(document.activeElement);
   const next=event.key==='Home'||onSummary&&event.key==='ArrowDown'?0:event.key==='End'||onSummary&&event.key==='ArrowUp'?controls.length-1:(index+(event.key==='ArrowDown'?1:-1)+controls.length)%controls.length;
   controls[next]?.focus();return;
  }
  // A menu owns its keystrokes; the world camera must not move behind it.
  if(menu.open)event.stopPropagation();
 },true);
 window.addEventListener('resize',()=>{for(const menu of menus)if(menu.open)fitMenu(menu);});
 window.addEventListener('blur',()=>closeMenus());
 function showPanel(name){
  if(!['scene','viewport','inspector','models'].includes(name))return;
  panel=name;body.dataset.panel=name;
  if(name!=='models'){workspace.classList.remove('models-full');$('expandModelLibrary').textContent='Expand';$('expandModelLibrary').setAttribute('aria-pressed','false');}
  for(const button of panelButtons){const active=button.dataset.workspacePanel===name;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
  for(const button of modelButtons){const active=name==='models';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 }
 for(const button of panelButtons)button.addEventListener('click',()=>showPanel(button.dataset.workspacePanel));
 for(const button of modelButtons)button.addEventListener('click',()=>$('assetBrowserTab').click());
 function library(open){dock.hidden=!open;workspace.classList.toggle('models-open',open);if(open)showPanel('models');else if(panel==='models')showPanel('viewport');}
 $('expandModelLibrary').onclick=()=>{const expanded=!workspace.classList.contains('models-full');workspace.classList.toggle('models-full',expanded);$('expandModelLibrary').textContent=expanded?'Restore':'Expand';$('expandModelLibrary').setAttribute('aria-pressed',String(expanded));};
 function showPreview(on){
  const available=!preview.hidden;dock.classList.toggle('has-preview',available);dock.dataset.preview=on&&available?'shown':'list';
  $('modelPreviewView').disabled=!available;$('modelListView').setAttribute('aria-pressed',String(!on||!available));$('modelPreviewView').setAttribute('aria-pressed',String(on&&available));
 }
 $('modelListView').onclick=()=>showPreview(false);$('modelPreviewView').onclick=()=>showPreview(true);
 function toggleConsole(){
  consoleOpen=!consoleOpen;body.classList.toggle('console-open',consoleOpen);$('terminalLog').hidden=!consoleOpen;
  $('terminalToggle').textContent=consoleOpen?'Hide console':'Show console';$('terminalToggle').setAttribute('aria-expanded',String(consoleOpen));
  $('consoleToggle').textContent=consoleOpen?'Hide console':'Show console';$('consoleToggle').setAttribute('aria-pressed',String(consoleOpen));
 }
 $('terminalToggle').onclick=$('consoleToggle').onclick=toggleConsole;
 window.VeldrenEditorLayout={showPanel,library,preview:showPreview,menusOpen:()=>menus.some(menu=>menu.open)};
})();
