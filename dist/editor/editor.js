'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const frame=$('gameFrame'),stage=$('stage'),marker=$('selectionMarker');
 const status=$('connectionStatus'),cameraState=$('cameraState'),modeBadge=$('modeBadge'),cameraBadge=$('cameraBadge');
 const saveState=$('saveState'),saveButton=$('saveWorld');
 const terminal=$('terminalLog'),terminalState=$('terminalState');
 const fields=$('transformFields'),objectName=$('objectName'),objectType=$('objectType'),hint=$('selectionHint');
 const sceneField=$('sceneField'),idField=$('idField'),xField=$('xField'),yField=$('yField'),rotationField=$('rotationField'),scaleField=$('scaleField');
 const focusButton=$('focusObject'),duplicateButton=$('duplicateObject'),revertButton=$('revertObject'),deleteButton=$('deleteObject'),protectedNote=$('protectedNote');
 const search=$('entitySearch'),entityList=$('entityList'),entityCount=$('entityCount'),sceneName=$('sceneName');
 const showObjects=$('showObjects'),showBuildings=$('showBuildings'),positionSnap=$('positionSnap'),rotationSnap=$('rotationSnap');
 const tools={select:$('selectTool'),move:$('moveTool'),rotate:$('rotateTool'),scale:$('scaleTool'),place:$('placeTool'),camera:$('cameraTool')};
 const playerView=$('playerView');
 const gameUiToggle=$('gameUiToggle');
 const worldBrowserTab=$('worldBrowserTab'),assetBrowserTab=$('assetBrowserTab'),worldBrowser=$('worldBrowser'),assetBrowser=$('assetBrowser');
 const assetSearch=$('assetSearch'),assetCategory=$('assetCategory'),assetList=$('assetList'),assetHint=$('assetHint'),cancelPlacement=$('cancelPlacement');
 let bridge=null,selection=null,dirty=false,tool='select',poll=null,entities=[],assets=[],activeAsset=null,playerViewOn=false,gameUiVisible=false,lastCameraText='';

 let building=null,partAssets=[];
 function buildingAction(fn){try{const state=fn();renderBuilding(state===true?null:state);markDirty();}catch(error){log(error.message,'error');}}
 function renderBuilding(state){
  building=state;$('buildingPanel').hidden=!state;worldBrowser.hidden=!!state;assetBrowser.hidden=true;
  $('buildingEditTool').classList.toggle('active',!!state);if(!state){renderHierarchy();return;}
  $('buildingName').textContent=state.name;$('buildingUndo').disabled=!state.undo;$('buildingRedo').disabled=!state.redo;
  const hierarchy=$('partHierarchy');hierarchy.replaceChildren();
  for(const part of state.parts){const row=document.createElement('button');row.className='part-row'+(state.selected===part.id?' active':'');row.textContent=(part.role==='roof'?'Roof':'Floor '+(part.floor+1))+' · '+(part.name||part.model.split(':').at(-1));row.onclick=()=>renderBuilding(bridge.selectPart(part.id));hierarchy.appendChild(row);}
  const p=state.parts.find(p=>p.id===state.selected);$('partTransform').disabled=!p;
  if(p){$('partX').value=p.local[3];$('partHeight').value=p.local[7];$('partZ').value=p.local[11];$('partRotation').value=Math.atan2(p.local[2],p.local[0])*180/Math.PI;$('partFloor').value=p.floor;}
  const walls=$('entranceWall'),value=walls.value;walls.replaceChildren();for(const p of state.parts.filter(p=>p.role==='wall'))walls.appendChild(new Option(p.id+' · '+p.model.split(':').at(-1),p.id));if([...walls.options].some(o=>o.value===value))walls.value=value;
 }
 function listPartAssets(){const category=$('partCategory').value;$('partAsset').replaceChildren();for(const a of partAssets.filter(a=>!category||a.category===category))$('partAsset').appendChild(new Option(a.name,a.id));}
 $('buildingEditTool').onclick=()=>{try{renderBuilding(bridge.enterBuilding());partAssets=bridge.buildingAssets();$('partCategory').replaceChildren(new Option('All parts',''));for(const c of [...new Set(partAssets.map(a=>a.category))].sort())$('partCategory').appendChild(new Option(c,c));listPartAssets();}catch(error){log(error.message,'warn');}};
 $('exitBuilding').onclick=()=>{bridge.exitBuilding();renderBuilding(null);};
 $('partCategory').onchange=listPartAssets;
 $('buildingUndo').onclick=()=>buildingAction(()=>bridge.buildingUndo());$('buildingRedo').onclick=()=>buildingAction(()=>bridge.buildingUndo(true));
 $('duplicatePart').onclick=()=>buildingAction(()=>bridge.duplicatePart());$('deletePart').onclick=()=>buildingAction(()=>bridge.deletePart());
 $('applyPart').onclick=()=>buildingAction(()=>bridge.setPart({x:Number($('partX').value),height:Number($('partHeight').value),z:Number($('partZ').value),rotation:Number($('partRotation').value),floor:Number($('partFloor').value)}));
 $('moveEntrance').onclick=()=>buildingAction(()=>bridge.moveEntrance($('entranceWall').value));
 $('placePart').onclick=()=>{try{renderBuilding(bridge.beginPartPlacement($('partAsset').value));$('buildingHint').textContent='Move over the viewport to preview; click to place. Red means invalid.';}catch(error){log(error.message,'error')}};
 $('replacePart').onclick=()=>buildingAction(()=>bridge.setPart({model:$('partAsset').value}));
 $('buildingFloor').onchange=$('isolateFloor').onchange=$('showBelow').onchange=()=>renderBuilding(bridge.setFloor($('buildingFloor').value,$('isolateFloor').checked,$('showBelow').checked));
 $('buildingSnap').onchange=$('floorIncrement').onchange=()=>bridge?.setBuildingSnap({mode:$('buildingSnap').value,vertical:Math.max(.25,Number($('floorIncrement').value)||3)});
 window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='veldren-editor-building')renderBuilding(e.data.state);});
 document.addEventListener('keydown',e=>{if(building&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();buildingAction(()=>bridge.buildingUndo(e.shiftKey));}});
 function log(message,level='info'){
  const row=document.createElement('div');row.className='terminal-line '+level;
  const time=document.createElement('span');time.className='terminal-time';time.textContent=new Date().toLocaleTimeString([], {hour12:false});
  const type=document.createElement('span');type.className='terminal-level';type.textContent=level.toUpperCase();
  const body=document.createElement('span');body.textContent=String(message);
  row.append(time,type,body);terminal.appendChild(row);
  while(terminal.children.length>300)terminal.firstChild.remove();
  terminal.scrollTop=terminal.scrollHeight;
 }
 $('clearTerminal').onclick=()=>{terminal.replaceChildren();log('Terminal cleared.','info');};

 function markDirty(value=true){
  dirty=value;saveState.textContent=value?'Unsaved changes':'No unsaved changes';
  saveState.classList.toggle('dirty',value);if(value)saveState.classList.remove('saved');
 }
 function saved(result){
  dirty=false;saveState.textContent='Saved + verified';saveState.classList.remove('dirty');saveState.classList.add('saved');
  log(`SAVE CONFIRMED · revision ${result.revision} · ${result.count} edits · ${result.path} · ${result.bytes.toLocaleString()} bytes · sha256 ${String(result.sha256).slice(0,12)}.`,'ok');
  for(const item of result.confirmed?.slice(-20)||[])log(`SAVED ENTITY CONFIRMED · ${item.scene} · ${item.kind} · ${item.name||item.id} · ${item.action}.`,'ok');
 }


 function showBrowser(which){
  const assetsOn=which==='assets';
  worldBrowser.hidden=assetsOn;assetBrowser.hidden=!assetsOn;
  worldBrowserTab.classList.toggle('active',!assetsOn);assetBrowserTab.classList.toggle('active',assetsOn);
  worldBrowserTab.setAttribute('aria-selected',String(!assetsOn));assetBrowserTab.setAttribute('aria-selected',String(assetsOn));
  if(assetsOn)renderAssets();else renderHierarchy();
 }
 worldBrowserTab.onclick=()=>showBrowser('world');
 assetBrowserTab.onclick=()=>showBrowser('assets');

 function renderAssets(){
  const q=assetSearch.value.trim().toLowerCase(),category=assetCategory.value;
  const filtered=assets.filter(a=>(!category||a.category===category)&&(!q||[a.name,a.key,a.category,a.source].some(v=>String(v||'').toLowerCase().includes(q))));
  assetList.replaceChildren();
  for(const asset of filtered){
   const row=document.createElement('button');row.type='button';row.className='asset-row '+(asset.source==='creature'?'creature':asset.source==='preset'?'preset':'mesh')+(activeAsset?.id===asset.id?' active':'');
   row.innerHTML='<span class="asset-icon"></span><span></span><small></small>';
   row.children[1].textContent=asset.name;
   const meta=document.createElement('span');meta.className='asset-meta';meta.textContent=asset.key;row.children[1].appendChild(meta);
   row.children[2].textContent=asset.category;
   row.onclick=()=>{
    if(!bridge)return;
    activeAsset=bridge.beginPlacement(asset.id);setTool('place');showBrowser('assets');cancelPlacement.disabled=false;
    assetHint.textContent=`PLACING: ${asset.name} · click terrain to place · click repeatedly for more`;
    renderAssets();log(`Placement armed · ${asset.name} · ${asset.source}:${asset.key}.`,'ok');
   };
   assetList.appendChild(row);
  }
  if(!filtered.length){const note=document.createElement('div');note.className='hint';note.textContent='No matching assets.';assetList.appendChild(note);}
 }
 assetSearch.oninput=renderAssets;assetCategory.onchange=renderAssets;
 cancelPlacement.onclick=()=>{
  bridge?.cancelPlacement();activeAsset=null;cancelPlacement.disabled=true;assetHint.textContent='Choose an asset, then click in the world to place it.';
  if(tool==='place')setTool('select');renderAssets();log('Asset placement cancelled.','info');
 };

 async function refreshAssets(){
  if(!bridge)return;
  assets=bridge.listAssets();
  const categories=[...new Set(assets.map(a=>a.category))].sort();
  const previous=assetCategory.value;assetCategory.replaceChildren(new Option('All categories',''));
  for(const category of categories)assetCategory.appendChild(new Option(category,category));
  if(categories.includes(previous))assetCategory.value=previous;
  renderAssets();
 }

 function setTool(next){
  tool=next;for(const [name,button]of Object.entries(tools))button.classList.toggle('active',name===next);
  modeBadge.textContent=next.toUpperCase();
  bridge?.setTool(next);
  if(next==='place'&&!activeAsset){showBrowser('assets');assetHint.textContent='Choose an asset before placing.';}
  if(next!=='place'&&activeAsset){bridge?.cancelPlacement();activeAsset=null;cancelPlacement.disabled=true;assetHint.textContent='Choose an asset, then click in the world to place it.';renderAssets();}
  log(`Tool: ${next}.`,'info');
 }
 for(const [name,button]of Object.entries(tools))button.onclick=()=>setTool(name);

 function updateSnap(){
  const config={position:Number(positionSnap.value)||0,rotation:Number(rotationSnap.value)||0};
  bridge?.setSnap(config);bridge?.setBuildingSnap({grid:config.position,rotation:config.rotation});log(`Snap · position ${config.position||'off'} · rotation ${config.rotation?config.rotation+'°':'off'}.`,'info');
 }
 positionSnap.onchange=rotationSnap.onchange=updateSnap;

 playerView.onclick=()=>{
  if(!bridge)return;
  const state=bridge.togglePlayerView();playerViewOn=!!state.playerView;
  playerView.classList.toggle('active',playerViewOn);playerView.textContent=playerViewOn?'Exit Player View':'Player View';
  cameraBadge.textContent=playerViewOn?'PLAYER VIEW':'FREE CAMERA';cameraBadge.classList.toggle('player',playerViewOn);
  log(playerViewOn?'Player View enabled · normal player camera limits restored.':'Free camera restored · editor movement and extended zoom enabled.','ok');
 };

 gameUiToggle.onclick=()=>{
  if(!bridge)return;
  gameUiVisible=!!bridge.setGameUiVisible(!gameUiVisible);
  gameUiToggle.classList.toggle('active',gameUiVisible);
  gameUiToggle.setAttribute('aria-pressed',String(gameUiVisible));
  gameUiToggle.textContent=gameUiVisible?'Hide Game UI':'UI Edit';
  log(gameUiVisible?'Game UI revealed for UI editing.':'Game UI hidden · clean world viewport restored.','ok');
 };

 function renderSelection(info){
  selection=info||null;const on=!!selection;fields.disabled=!on;
  for(const b of [focusButton,duplicateButton,revertButton,deleteButton])b.disabled=!on;
  marker.hidden=!on;protectedNote.hidden=!selection?.protected;
  if(!on){
   objectName.textContent='Nothing selected';objectType.textContent='—';sceneField.value=idField.value=xField.value=yField.value=rotationField.value=scaleField.value='';
   hint.textContent='Select any entity or building from the viewport or hierarchy.';return;
  }
  objectName.textContent=selection.name||'Unnamed';objectType.textContent=selection.kind||selection.type||'entity';
  sceneField.value=selection.scene||'';idField.value=selection.id||'';
  xField.value=Number(selection.x).toFixed(2);yField.value=Number(selection.y).toFixed(2);rotationField.value=Number(selection.rotation||0).toFixed(1);scaleField.value=Number(selection.scale||1).toFixed(2);
  hint.textContent=[selection.type,selection.subtype,selection.protected?'gameplay-linked':null].filter(Boolean).join(' · ');
  renderHierarchy();
 }
 function renderHierarchy(){
  const q=search.value.trim().toLowerCase(),showO=showObjects.checked,showB=showBuildings.checked;
  const filtered=entities.filter(e=>(e.kind==='building'?showB:showO)&&(!q||[e.name,e.type,e.subtype,e.id].some(v=>String(v||'').toLowerCase().includes(q))));
  entityCount.textContent=`${filtered.length} / ${entities.length}`;entityList.replaceChildren();
  for(const e of filtered.slice(0,800)){
   const row=document.createElement('button');row.type='button';row.className='entity-row '+e.kind+(e.protected?' protected':'')+(selection&&selection.kind===e.kind&&String(selection.id)===String(e.id)?' selected':'');
   row.innerHTML='<span class="dot"></span><span></span><small></small>';row.children[1].textContent=e.name||e.type||e.id;row.children[2].textContent=e.subtype||e.type||e.kind;
   row.onclick=()=>bridge?.selectByRef(e.kind,e.id);entityList.appendChild(row);
  }
  if(filtered.length>800){const note=document.createElement('div');note.className='hint';note.textContent='Showing first 800 matches. Search to narrow the list.';entityList.appendChild(note);}
 }
 search.oninput=renderHierarchy;showObjects.onchange=showBuildings.onchange=renderHierarchy;

 async function refreshEntities(){
  if(!bridge)return;
  entities=bridge.listEntities();sceneName.textContent=bridge.currentSceneName();renderHierarchy();
 }

 function updateFromFields(){
  if(!bridge||!selection)return;
  try{
   const info=bridge.setTransform({x:Number(xField.value),y:Number(yField.value),rotation:Number(rotationField.value),scale:Number(scaleField.value)});
   if(info){renderSelection(info);markDirty();log(`Transform · ${info.name} · x ${info.x.toFixed(2)} · z ${info.y.toFixed(2)} · rot ${info.rotation.toFixed(1)}° · scale ${info.scale.toFixed(2)}.`,'info');refreshEntities();}
  }catch(error){log('Transform failed: '+error.message,'error');}
 }
 for(const input of [xField,yField,rotationField,scaleField])input.addEventListener('change',updateFromFields);

 focusButton.onclick=()=>{if(bridge&&selection){bridge.focusSelection();log(`Focused camera on ${selection.name}.`,'info');}};
 duplicateButton.onclick=()=>{
  if(!bridge||!selection)return;
  if(selection.protected&&!confirm('This entity is gameplay-linked. Duplicate it anyway?'))return;
  try{const info=bridge.duplicateSelection();if(info){renderSelection(info);markDirty();refreshEntities();log(`Duplicated ${info.name} · new id ${info.id}.`,'ok');}}catch(error){log('Duplicate failed: '+error.message,'error');}
 };
 revertButton.onclick=()=>{
  if(!bridge||!selection)return;
  try{const info=bridge.revertSelection();renderSelection(info);markDirty();refreshEntities();log(`Reverted ${selection.name} to its generated Veldren transform.`,'ok');}catch(error){log('Revert failed: '+error.message,'error');}
 };
 deleteButton.onclick=()=>{
  if(!bridge||!selection)return;
  const warning=selection.protected?'This is gameplay-linked and deleting it can break quests/services/shared state. Delete anyway?':'Delete this entity from the edited world?';
  if(!confirm(warning))return;
  try{const name=selection.name;bridge.deleteSelection();renderSelection(null);markDirty();refreshEntities();log(`Deleted ${name} from the editor layer.`,'warn');}catch(error){log('Delete failed: '+error.message,'error');}
 };

 saveButton.onclick=async()=>{
  if(!bridge)return;
  saveButton.disabled=true;saveState.textContent='Writing + verifying…';log('Beginning transactional save…','info');
  try{const result=await bridge.save();saved(result);}
  catch(error){saveState.textContent='SAVE FAILED';saveState.classList.add('dirty');log('SAVE FAILED · '+error.message,'error');}
  finally{saveButton.disabled=false;}
 };

 function injectBridge(){
  try{
   const win=frame.contentWindow,doc=frame.contentDocument;if(!win||!doc)return;
   if(win.VeldrenEditorBridge){connect(win.VeldrenEditorBridge);return;}
   if(doc.getElementById('veldrenEditorRuntime'))return;
   const script=doc.createElement('script');script.id='veldrenEditorRuntime';script.src='/editor/editor-runtime.js';
   script.onload=waitForBridge;script.onerror=()=>log('Editor runtime failed to load.','error');doc.body.appendChild(script);
   status.textContent='Waiting for Veldren world…';
  }catch(error){log('Bridge injection failed: '+error.message,'error');}
 }
 function waitForBridge(){
  let tries=0;const timer=setInterval(()=>{
   const candidate=frame.contentWindow?.VeldrenEditorBridge;
   if(candidate){clearInterval(timer);connect(candidate);}
   else if(++tries>600){clearInterval(timer);log('World never became editor-ready.','error');}
  },100);
 }
 async function connect(candidate){
  bridge=candidate;bridge.setTool(tool);updateSnap();status.textContent='Connected to Veldren world';terminalState.textContent='Connected';
  gameUiVisible=!!bridge.gameUiVisible?.();
  if(gameUiVisible)bridge.setGameUiVisible(false);
  gameUiVisible=false;gameUiToggle.classList.remove('active');gameUiToggle.setAttribute('aria-pressed','false');gameUiToggle.textContent='UI Edit';
  renderSelection(bridge.getSelection());await refreshEntities();await refreshAssets();
  try{
   const persisted=await bridge.savedState();
   if(persisted.count)log(`Loaded revision ${persisted.revision} · ${persisted.count} project edits from ${persisted.path}.`,'ok');
   else log('No project-file world edits are currently saved.','info');
  }catch(error){log('Could not read project persistence: '+error.message,'error');}
  log('Clean editor viewport ready · playable game HUD hidden · UI Edit reveals it when needed.','ok');
  if(poll)clearInterval(poll);
  poll=setInterval(()=>{
   if(!bridge)return;
   const c=bridge.cameraState?.();
   if(c){
    const txt=`${c.playerView?'PLAYER':'FREE'} · ${Number(c.x).toFixed(1)}, ${Number(c.y).toFixed(1)} · yaw ${Math.round(c.yaw*180/Math.PI)}° · zoom ${Number(c.zoom).toFixed(1)}`;
    cameraState.textContent=txt;if(txt!==lastCameraText){lastCameraText=txt;terminalState.textContent=c.playerView?'Player View':'Free Camera';}
    playerViewOn=!!c.playerView;playerView.classList.toggle('active',playerViewOn);cameraBadge.textContent=playerViewOn?'PLAYER VIEW':'FREE CAMERA';cameraBadge.classList.toggle('player',playerViewOn);
   }
   const p=bridge.selectionProjection?.();
   if(!p){marker.hidden=true;return;}
   const fr=frame.getBoundingClientRect(),sr=stage.getBoundingClientRect();marker.style.left=(fr.left-sr.left+p.x)+'px';marker.style.top=(fr.top-sr.top+p.y)+'px';marker.hidden=false;
  },50);
 }
 frame.addEventListener('load',()=>setTimeout(injectBridge,60));

 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  const m=event.data;
  if(m?.type==='veldren-editor-ready'){const candidate=frame.contentWindow?.VeldrenEditorBridge;if(candidate)connect(candidate);}
  if(m?.type==='veldren-editor-selection'){renderSelection(m.selection);if(m.selection)log(`Selected ${m.selection.kind} · ${m.selection.name} · id ${m.selection.id}.`,'info');}
  if(m?.type==='veldren-editor-change'){renderSelection(m.selection);markDirty();refreshEntities();if(m.placed)log(`PLACED · ${m.selection?.name||'asset'} · ${m.selection?.id||''}.`,'ok');}
  if(m?.type==='veldren-editor-log')log(m.message,m.level||'info');
  if(m?.type==='veldren-editor-scene'){refreshEntities();}
 });

 window.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveButton.click();}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'){event.preventDefault();duplicateButton.click();}
  if(event.key==='Delete'&&!deleteButton.disabled&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){event.preventDefault();deleteButton.click();}
  if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){
   const map={q:'select',w:'move',e:'rotate',r:'scale',p:'place',c:'camera'};const next=map[event.key.toLowerCase()];if(next){event.preventDefault();setTool(next);}
  }
 });

 log('Veldren editor v5 starting.','info');setTimeout(injectBridge,300);
})();
