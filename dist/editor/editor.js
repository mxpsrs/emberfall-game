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
 const tools={select:$('selectTool'),move:$('moveTool'),rotate:$('rotateTool'),scale:$('scaleTool'),place:$('placeTool'),terrain:$('terrainTool'),camera:$('cameraTool')};
 const terrainPanel=$('terrainPanel'),terrainMode=$('terrainMode'),terrainRadius=$('terrainRadius'),terrainStrength=$('terrainStrength'),terrainMaterial=$('terrainMaterial');
 const playerView=$('playerView');
 const gameUiToggle=$('gameUiToggle');
 const worldBrowserTab=$('worldBrowserTab'),assetBrowserTab=$('assetBrowserTab'),worldBrowser=$('worldBrowser'),assetBrowser=$('assetBrowser');
 const assetSearch=$('assetSearch'),assetCategory=$('assetCategory'),assetList=$('assetList'),assetHint=$('assetHint'),cancelPlacement=$('cancelPlacement');
 const beginAssetPlacement=$('beginAssetPlacement'),modelPreview=$('modelPreview'),modelPreviewCanvas=$('modelPreviewCanvas'),previewPlaceButton=$('previewPlaceButton'),modelPreviewName=$('modelPreviewName'),modelPreviewCategory=$('modelPreviewCategory'),modelPreviewPath=$('modelPreviewPath'),modelPreviewBounds=$('modelPreviewBounds');
 let bridge=null,selection=null,dirty=false,tool='select',poll=null,entities=[],assets=[],assetById=new Map(),activeAsset=null,inspectedAsset=null,playerViewOn=false,gameUiVisible=false,lastCameraText='';
 const thumbnailCache=new Map();let thumbnailAtlasSource=null,thumbnailAtlas=null;
 const thumbnailObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){thumbnailObserver.unobserve(entry.target);queueThumbnail(entry.target)}},{rootMargin:'180px'}):{observe:queueThumbnail,unobserve(){}};let thumbnailQueue=[],thumbnailWorkPending=false,previewOrbit={yaw:.68,tilt:.52,zoom:1},watchedAtlas=null;

 let building=null,partAssets=[],selectedPartAssetId=null;
 function buildingAction(fn){try{const state=fn();renderBuilding(state===true?null:state);markDirty();}catch(error){log(error.message,'error');}}
 function renderBuilding(state){
  building=state;$('buildingPanel').hidden=!state;worldBrowser.hidden=!!state||tool==='terrain';assetBrowser.hidden=true;terrainPanel.hidden=!!state||tool!=='terrain';
  $('buildingEditTool').classList.toggle('active',!!state);if(!state){renderHierarchy();return;}
  $('buildingName').textContent=state.name;$('buildingUndo').disabled=!state.undo;$('buildingRedo').disabled=!state.redo;
  $('buildingX').value=Number(state.transform?.x||0);$('buildingZ').value=Number(state.transform?.z||0);$('buildingRotation').value=Number(state.transform?.rotation||0);$('buildingGrid').value=state.snap.grid;
  const hierarchy=$('partHierarchy');hierarchy.replaceChildren();
  for(const part of state.parts){const row=document.createElement('button');row.className='part-row'+(state.selected===part.id?' active':'');row.textContent=part.role[0].toUpperCase()+part.role.slice(1)+' · Floor '+(part.floor+1)+' · '+(part.name||part.model.split(':').at(-1));row.onclick=()=>renderBuilding(bridge.selectPart(part.id));hierarchy.appendChild(row);}
  const p=state.parts.find(p=>p.id===state.selected);$('partTransform').disabled=!p;$('placePart').disabled=!selectedPartAssetId;$('replacePart').disabled=!p||!selectedPartAssetId;
  if(p){$('partX').value=p.local[3];$('partHeight').value=p.local[7];$('partZ').value=p.local[11];$('partRotation').value=Math.atan2(p.local[2],p.local[0])*180/Math.PI;$('partScale').value=Math.hypot(p.local[0],p.local[8]);$('partFloor').value=p.floor;}
  const walls=$('entranceWall'),value=walls.value;walls.replaceChildren();for(const p of state.parts.filter(p=>p.role==='wall'))walls.appendChild(new Option(p.id+' · '+p.model.split(':').at(-1),p.id));if([...walls.options].some(o=>o.value===value))walls.value=value;
 }
 function listPartAssets(){const category=$('partCategory').value,q=$('partSearch').value.trim().toLowerCase(),filtered=partAssets.filter(a=>(!category||a.category===category)&&(!q||[a.name,a.key,a.category,a.source].some(v=>String(v||'').toLowerCase().includes(q)))),list=$('partAssetList');list.replaceChildren();$('partAsset').replaceChildren();for(const a of filtered)$('partAsset').appendChild(new Option(a.name,a.id));if(!filtered.length){const note=document.createElement('div');note.className='hint';note.textContent='No matching modular models.';list.appendChild(note);return;}const size=48;let shown=Math.min(size,filtered.length);const add=(start,end)=>{for(let i=start;i<end;i++){const a=filtered[i],row=document.createElement('button');row.type='button';row.className='asset-row '+(selectedPartAssetId===a.id?'selected':'');row.setAttribute('role','option');row.setAttribute('aria-selected',String(selectedPartAssetId===a.id));const thumb=canvasFactory(144,96);thumb.className='asset-thumb';thumb.dataset.assetId=a.id;const details=document.createElement('span');details.className='asset-card-details';const title=document.createElement('strong');title.textContent=a.name;const meta=document.createElement('small');meta.textContent=a.category;const dims=document.createElement('small');dims.textContent=a.size?.map(v=>Number(v).toFixed(2)).join(' × ')||'Dimensions unavailable';details.append(title,meta,dims);row.append(thumb,details);row.onclick=()=>{selectedPartAssetId=a.id;$('partAsset').value=a.id;inspectPartAsset(a);listPartAssets();};list.appendChild(row);if(thumbnailCache.has(a.id))thumb.getContext('2d')?.drawImage(thumbnailCache.get(a.id),0,0,thumb.width,thumb.height);else thumbnailObserver.observe(thumb);}};add(0,shown);if(shown<filtered.length){const more=document.createElement('button');more.type='button';more.className='asset-load-more';const update=()=>{more.textContent='Show '+Math.min(size,filtered.length-shown)+' more of '+filtered.length+' models';};more.onclick=()=>{const start=shown;shown=Math.min(shown+size,filtered.length);add(start,shown);if(shown>=filtered.length)more.remove();else update();};update();list.appendChild(more);}}
 function refreshPartLibrary(){partAssets=bridge.buildingAssets().map(a=>({...a,buildingPart:true}));for(const a of partAssets)assetById.set(a.id,a);const categories=[...new Set(partAssets.map(a=>a.category))].sort(),previous=$('partCategory').value;$('partCategory').replaceChildren(new Option('All parts',''));for(const category of categories)$('partCategory').appendChild(new Option(category,category));if(categories.includes(previous))$('partCategory').value=previous;listPartAssets();}
 function openBuildingEditor(state){setTool('select');renderBuilding(state);refreshPartLibrary();}
 $('buildingEditTool').onclick=()=>{try{openBuildingEditor(bridge.enterBuilding());}catch(error){log(error.message,'warn');}};
 $('newBuildingTool').onclick=()=>{try{openBuildingEditor(bridge.startNewBuilding());}catch(error){log(error.message,'error');}};
 $('exitBuilding').onclick=()=>{bridge.exitBuilding();renderBuilding(null);};
 $('partCategory').onchange=listPartAssets;$('partSearch').oninput=listPartAssets;
 $('buildingUndo').onclick=()=>buildingAction(()=>bridge.buildingUndo());$('buildingRedo').onclick=()=>buildingAction(()=>bridge.buildingUndo(true));
 $('duplicatePart').onclick=()=>buildingAction(()=>bridge.duplicatePart());$('deletePart').onclick=()=>buildingAction(()=>bridge.deletePart());
 $('applyBuildingTransform').onclick=()=>buildingAction(()=>bridge.setBuildingTransform({x:Number($('buildingX').value),z:Number($('buildingZ').value),rotation:Number($('buildingRotation').value)}));
 $('applyPart').onclick=()=>buildingAction(()=>bridge.setPart({x:Number($('partX').value),height:Number($('partHeight').value),z:Number($('partZ').value),rotation:Number($('partRotation').value),scale:Number($('partScale').value),floor:Number($('partFloor').value)}));
 $('moveEntrance').onclick=()=>buildingAction(()=>bridge.moveEntrance($('entranceWall').value));
 $('placePart').onclick=()=>{try{const state=bridge.beginPartPlacement($('partAsset').value);setTool('place');renderBuilding(state);$('cancelPartPlacement').disabled=false;$('buildingHint').textContent='Move in the viewport. Green means a valid snap; R rotates; click to place; Escape cancels.';}catch(error){log(error.message,'error')}};
 $('cancelPartPlacement').onclick=()=>{renderBuilding(bridge.cancelPartPlacement());setTool('select');$('cancelPartPlacement').disabled=true;};
 $('replacePart').onclick=()=>buildingAction(()=>bridge.setPart({model:$('partAsset').value}));
 $('buildingFloor').onchange=$('isolateFloor').onchange=$('showBelow').onchange=()=>renderBuilding(bridge.setFloor($('buildingFloor').value,$('isolateFloor').checked,$('showBelow').checked));
 $('buildingSnap').onchange=$('floorIncrement').onchange=$('buildingGrid').onchange=()=>bridge?.setBuildingSnap({mode:$('buildingSnap').value,grid:Math.max(.05,Number($('buildingGrid').value)||.25),vertical:Math.max(.25,Number($('floorIncrement').value)||3)});
 window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='veldren-editor-building')renderBuilding(e.data.state);});
 document.addEventListener('keydown',e=>{if(building&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();buildingAction(()=>bridge.buildingUndo(e.shiftKey));}});
 function terrainState(state=bridge?.terrainState?.()){
  if(!state)return;
  $('terrainUndo').disabled=!state.undo;$('terrainRedo').disabled=!state.redo;
  $('terrainStatus').textContent=state.error?'Terrain load issue: '+state.error:`${state.heightNodes} sculpted height nodes · ${state.paintCells} painted cells · ${state.undo} undo steps`;
 }
 function updateTerrainBrush(){
  $('terrainRadiusValue').textContent=terrainRadius.value+' tiles';$('terrainStrengthValue').textContent=Number(terrainStrength.value).toFixed(2);
  terrainMaterial.disabled=terrainMode.value!=='paint';terrainStrength.disabled=['paint','erase'].includes(terrainMode.value);
  bridge?.setTerrainBrush?.({mode:terrainMode.value,radius:Number(terrainRadius.value),strength:Number(terrainStrength.value),material:terrainMaterial.value});
 }
 for(const field of [terrainMode,terrainRadius,terrainStrength,terrainMaterial])field.addEventListener('input',updateTerrainBrush);
 $('terrainUndo').onclick=()=>{try{terrainState(bridge?.terrainUndo());}catch(error){log(error.message,'error')}};
 $('terrainRedo').onclick=()=>{try{terrainState(bridge?.terrainUndo(true));}catch(error){log(error.message,'error')}};
 document.addEventListener('keydown',e=>{
  if(tool!=='terrain'||!bridge||(e.target?.closest?.('input,textarea,select,[contenteditable]'))||!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z')return;
  e.preventDefault();terrainState(bridge.terrainUndo(e.shiftKey));
 });
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
  if(!assetsOn){thumbnailQueue.length=0;thumbnailWorkPending=false;}
  terrainPanel.hidden=true;
  worldBrowser.hidden=assetsOn;assetBrowser.hidden=!assetsOn;
  worldBrowserTab.classList.toggle('active',!assetsOn);assetBrowserTab.classList.toggle('active',assetsOn);
  worldBrowserTab.setAttribute('aria-selected',String(!assetsOn));assetBrowserTab.setAttribute('aria-selected',String(assetsOn));
  if(assetsOn)renderAssets();else renderHierarchy();
 }
 worldBrowserTab.onclick=()=>{if(tool==='terrain')setTool('select');showBrowser('world')};
 assetBrowserTab.onclick=()=>{if(tool==='terrain')setTool('select');showBrowser('assets')};

 const canvasFactory=(width,height)=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c};
 function drawMeshPreview(canvas,asset,yaw=.68,tilt=.52,zoom=1,thumbnail=false){
  const ctx=canvas.getContext('2d');if(!ctx)return false;const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#111a1f';ctx.fillRect(0,0,w,h);
  const mesh=bridge?.assetGeometry?.(asset.id);if(!mesh?.p?.length||!mesh?.i?.length){ctx.fillStyle='#a6b7bf';ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText('No mesh preview available',w/2,h/2);return false;}
  let atlas=mesh.atlas;if(thumbnail&&atlas?.complete&&atlas.width>0){if(thumbnailAtlasSource!==atlas){thumbnailAtlasSource=atlas;thumbnailAtlas=canvasFactory(512,512);thumbnailAtlas.getContext('2d')?.drawImage(atlas,0,0,512,512);}atlas=thumbnailAtlas;}
  const p=mesh.p,n=mesh.n,c=mesh.c,indices=mesh.i,bounds=mesh.bounds||[[0,0,0],[1,1,1]],cx=(bounds[0][0]+bounds[1][0])/2,cy=(bounds[0][1]+bounds[1][1])/2,cz=(bounds[0][2]+bounds[1][2])/2;
  const cosY=Math.cos(yaw),sinY=Math.sin(yaw),cosT=Math.cos(tilt),sinT=Math.sin(tilt),vertices=new Array(p.length/3),light=[.35,.82,.45],ll=Math.hypot(...light);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(let i=0;i<p.length;i+=3){const x=p[i]-cx,y=p[i+1]-cy,z=p[i+2]-cz,rx=cosY*x-sinY*z,rz=sinY*x+cosY*z,sy=y*cosT-rz*sinT,depth=y*sinT+rz*cosT;vertices[i/3]=[rx,sy,depth];minX=Math.min(minX,rx);maxX=Math.max(maxX,rx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);}
  const spanX=Math.max(.01,maxX-minX),spanY=Math.max(.01,maxY-minY),scale=Math.min((w-24)/spanX,(h-24)/spanY)*zoom,ox=(w-(minX+maxX)*scale)/2,oy=(h+(minY+maxY)*scale)/2,faces=[];
  const faceCount=Math.ceil(indices.length/3),faceStep=thumbnail?Math.max(1,Math.ceil(faceCount/128)):1;
  for(let j=0,face=0;j<indices.length;j+=3,face++){if(face%faceStep)continue;const ia=indices[j],ib=indices[j+1],ic=indices[j+2],a=vertices[ia],b=vertices[ib],d=vertices[ic];if(!a||!b||!d)continue;
   const depth=(a[2]+b[2]+d[2])/3,nx=(Number(n?.[ia*3])||0)+ (Number(n?.[ib*3])||0)+(Number(n?.[ic*3])||0),ny=(Number(n?.[ia*3+1])||0)+(Number(n?.[ib*3+1])||0)+(Number(n?.[ic*3+1])||0),nz=(Number(n?.[ia*3+2])||0)+(Number(n?.[ib*3+2])||0)+(Number(n?.[ic*3+2])||0),rnX=cosY*nx-sinY*nz,rnZ=sinY*nx+cosY*nz,rnY=ny*cosT-rnZ*sinT,dot=(rnX*light[0]+rnY*light[1]+rnZ*light[2])/(Math.hypot(rnX,rnY,rnZ)*ll||1),shade=.36+.64*Math.max(0,dot);
   const colors=mesh.f||c,values=[ia,ib,ic].map(k=>[0,1,2].map(ch=>{const v=Number(colors?.[k*3+ch]);return Number.isFinite(v)?v:.5})),rgb=[0,1,2].map(ch=>Math.round(255*Math.max(0,Math.min(1,values.reduce((sum,v)=>sum+v[ch],0)/3*shade)))),slots=[ia,ib,ic].map(k=>Number(mesh.t?.[k])|| (mesh.uv?20:12)),mixed=slots.some(v=>v!==slots[0]),tile=mixed?0:Math.floor(slots[0]-20),uv=mesh.uv&&tile>=0&&atlas?.complete!==false&&atlas?.width>0?[ia,ib,ic].map(k=>{const u=Number(mesh.uv[k*2])||0,v=Number(mesh.uv[k*2+1])||0,cx=tile%8,cy=Math.floor(tile/8),unit=atlas.width/4096;return [(cx*512+2+u*508)*unit,((7-cy)*512+510-v*508)*unit]}):null;faces.push({depth,a,b,d,color:`rgb(${rgb.join(',')})`,uv,atlas:atlas,shade});
  }
  faces.sort((a,b)=>a.depth-b.depth);ctx.lineJoin='round';ctx.lineWidth=Math.max(.4,w/500);
  for(const f of faces){ctx.beginPath();ctx.moveTo(ox+f.a[0]*scale,oy-f.a[1]*scale);ctx.lineTo(ox+f.b[0]*scale,oy-f.b[1]*scale);ctx.lineTo(ox+f.d[0]*scale,oy-f.d[1]*scale);ctx.closePath();if(f.uv&&f.atlas){const src=f.uv,pts=[f.a,f.b,f.d].map(v=>[ox+v[0]*scale,oy-v[1]*scale]),[x1,y1]=src[0],[x2,y2]=src[1],[x3,y3]=src[2],det=x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2);if(Math.abs(det)>.001){const solve=(q1,q2,q3)=>[(q1*(y2-y3)+q2*(y3-y1)+q3*(y1-y2))/det,(q1*(x3-x2)+q2*(x1-x3)+q3*(x2-x1))/det,(q1*(x2*y3-x3*y2)+q2*(x3*y1-x1*y3)+q3*(x1*y2-x2*y1))/det],[ta,tb,te]=solve(pts[0][0],pts[1][0],pts[2][0]),[tc,td,tf]=solve(pts[0][1],pts[1][1],pts[2][1]);ctx.save();ctx.clip();ctx.setTransform(ta,tc,tb,td,te,tf);ctx.drawImage(f.atlas,0,0);ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='multiply';ctx.fillStyle=`rgba(0,0,0,${Math.max(0,1-f.shade)})`;ctx.fill();ctx.restore();}else{ctx.fillStyle=f.color;ctx.fill();}}else{ctx.fillStyle=f.color;ctx.fill();}ctx.strokeStyle='rgba(4,9,11,.24)';ctx.stroke();}
  return true;
 }
 function queueThumbnail(canvas){if(thumbnailCache.has(canvas.dataset.assetId)){canvas.getContext('2d')?.drawImage(thumbnailCache.get(canvas.dataset.assetId),0,0,canvas.width,canvas.height);return;}if(!thumbnailQueue.includes(canvas))thumbnailQueue.push(canvas);if(thumbnailWorkPending)return;thumbnailWorkPending=true;
  const run=deadline=>{if(assetBrowser.hidden&&!building){thumbnailWorkPending=false;return;}let count=0;while(thumbnailQueue.length&&count<1&&(deadline?.timeRemaining?.()>5||count===0)){const target=thumbnailQueue.shift(),asset=assetById.get(target.dataset.assetId);if(!asset||!target.isConnected)continue;let cached=thumbnailCache.get(asset.id);if(!cached){cached=canvasFactory(144,96);drawMeshPreview(cached,asset,.68,.52,1,true);thumbnailCache.set(asset.id,cached);if(thumbnailCache.size>180)thumbnailCache.delete(thumbnailCache.keys().next().value);}target.getContext('2d')?.drawImage(cached,0,0,target.width,target.height);count++;}if(thumbnailQueue.length){(window.requestIdleCallback||((fn)=>setTimeout(()=>fn(null),20)))(run,{timeout:250});}else thumbnailWorkPending=false;};
  (window.requestIdleCallback||((fn)=>setTimeout(()=>fn(null),20)))(run,{timeout:250});
 }
 function inspectPartAsset(asset){inspectedAsset=asset;$('placePart').disabled=false;modelPreview.hidden=false;modelPreviewName.textContent=asset.name;modelPreviewCategory.textContent=asset.category;modelPreviewPath.textContent=asset.id;modelPreviewBounds.textContent=asset.size?.map(v=>Number(v).toFixed(2)).join(' × ')||'Unavailable';previewPlaceButton.textContent='Place selected building part';previewPlaceButton.disabled=false;previewOrbit={yaw:.68,tilt:.52,zoom:1};drawMeshPreview(modelPreviewCanvas,asset,previewOrbit.yaw,previewOrbit.tilt,previewOrbit.zoom);}
 function inspectAsset(asset,row){inspectedAsset=asset;for(const card of assetList.children)if(String(card.className||'').includes(' selected'))card.className=card.className.replace(' selected','');if(row)row.className+=' selected';previewOrbit={yaw:.68,tilt:.52,zoom:1};modelPreview.hidden=!asset;if(!asset)return;modelPreviewName.textContent=asset.name;modelPreviewCategory.textContent=asset.category;modelPreviewPath.textContent=`${asset.source}:${asset.key}`;modelPreviewBounds.textContent=asset.size?.map(v=>Number(v).toFixed(2)).join(' × ')||'Unavailable';previewPlaceButton.textContent=asset.buildingPart?'Enter Building Edit to place':'Choose for placement';previewPlaceButton.disabled=!!asset.buildingPart&&!building;beginAssetPlacement.disabled=!!asset.buildingPart;drawMeshPreview(modelPreviewCanvas,asset,previewOrbit.yaw,previewOrbit.tilt,previewOrbit.zoom);}
 function armAssetPlacement(){if(!inspectedAsset||!bridge)return;if(building&&inspectedAsset.buildingPart){selectedPartAssetId=inspectedAsset.id;$('partAsset').value=inspectedAsset.id;const state=bridge.beginPartPlacement(inspectedAsset.id);setTool('place');renderBuilding(state);$('cancelPartPlacement').disabled=false;$('buildingHint').textContent='Move in the viewport. Green means a valid snap; R rotates; click to place; Escape cancels.';return;}if(inspectedAsset.buildingPart){log('Start Building Edit to place modular building parts.','warn');return;}activeAsset=bridge.beginPlacement(inspectedAsset.id);setTool('place');showBrowser('assets');cancelPlacement.disabled=false;assetHint.textContent=`PLACING: ${inspectedAsset.name} · move over the viewport to preview · click to place · R rotates · Esc cancels`;renderAssets();log(`Placement armed · ${inspectedAsset.name} · ${inspectedAsset.source}:${inspectedAsset.key}.`,'ok');}
 beginAssetPlacement.onclick=previewPlaceButton.onclick=armAssetPlacement;
 const ASSET_PAGE_SIZE=60;
 function appendAssetCards(filtered,start,end){
  for(let i=start;i<end;i++){const asset=filtered[i],row=document.createElement('button');row.type='button';row.className='asset-row '+(asset.source==='creature'?'creature':asset.source==='preset'?'preset':'mesh')+(inspectedAsset?.id===asset.id?' selected':'');
   const thumb=canvasFactory(144,96);thumb.className='asset-thumb';thumb.dataset.assetId=asset.id;const details=document.createElement('span');details.className='asset-card-details';const title=document.createElement('strong');title.textContent=asset.name;const meta=document.createElement('small');meta.textContent=asset.category;const ref=document.createElement('small');ref.className='asset-reference';ref.textContent=`${asset.source}:${asset.key}`;details.append(title,meta,ref);row.append(thumb,details);
   row.onclick=()=>inspectAsset(asset,row);assetList.appendChild(row);if(thumbnailCache.has(asset.id))thumb.getContext('2d')?.drawImage(thumbnailCache.get(asset.id),0,0,thumb.width,thumb.height);else thumbnailObserver.observe(thumb);
  }
 }
 function renderAssets(){
  const q=assetSearch.value.trim().toLowerCase(),category=assetCategory.value;
  const filtered=assets.filter(a=>(!category||a.category===category)&&(!q||[a.name,a.key,a.category,a.source].some(v=>String(v||'').toLowerCase().includes(q))));assetList.replaceChildren();
  if(!filtered.length){const note=document.createElement('div');note.className='hint';note.textContent='No matching assets.';assetList.appendChild(note);return;}
  let shown=Math.min(ASSET_PAGE_SIZE,filtered.length);appendAssetCards(filtered,0,shown);
  if(shown<filtered.length){const more=document.createElement('button');more.type='button';more.className='asset-load-more';const updateMore=()=>{more.textContent=`Show ${Math.min(ASSET_PAGE_SIZE,filtered.length-shown)} more of ${filtered.length} models`;};more.onclick=()=>{const start=shown;shown=Math.min(shown+ASSET_PAGE_SIZE,filtered.length);appendAssetCards(filtered,start,shown);if(shown>=filtered.length)more.remove();else updateMore();};updateMore();assetList.appendChild(more);}
 }
 modelPreviewCanvas.addEventListener('pointerdown',e=>{modelPreviewCanvas.setPointerCapture(e.pointerId);modelPreviewCanvas._orbitPoint=[e.clientX,e.clientY];});
 modelPreviewCanvas.addEventListener('pointermove',e=>{if(!modelPreviewCanvas._orbitPoint||!inspectedAsset)return;const [x,y]=modelPreviewCanvas._orbitPoint;previewOrbit.yaw+=(e.clientX-x)*.012;previewOrbit.tilt=Math.max(-1.1,Math.min(1.1,previewOrbit.tilt+(e.clientY-y)*.008));modelPreviewCanvas._orbitPoint=[e.clientX,e.clientY];drawMeshPreview(modelPreviewCanvas,inspectedAsset,previewOrbit.yaw,previewOrbit.tilt,previewOrbit.zoom);});
 modelPreviewCanvas.addEventListener('pointerup',()=>{modelPreviewCanvas._orbitPoint=null;});modelPreviewCanvas.addEventListener('pointercancel',()=>{modelPreviewCanvas._orbitPoint=null;});
 modelPreviewCanvas.addEventListener('wheel',e=>{e.preventDefault();previewOrbit.zoom=Math.max(.6,Math.min(2.8,previewOrbit.zoom*Math.exp(-e.deltaY*.001)));if(inspectedAsset)drawMeshPreview(modelPreviewCanvas,inspectedAsset,previewOrbit.yaw,previewOrbit.tilt,previewOrbit.zoom);},{passive:false});
 assetSearch.oninput=renderAssets;assetCategory.onchange=renderAssets;
 cancelPlacement.onclick=()=>{
  bridge?.cancelPlacement();activeAsset=null;cancelPlacement.disabled=true;assetHint.textContent='Select a model to inspect it before placement.';
  if(tool==='place')setTool('select');renderAssets();log('Asset placement cancelled.','info');
 };

 async function refreshAssets(){
  if(!bridge)return;
  assets=bridge.listAssets();assetById=new Map(assets.map(asset=>[asset.id,asset]));
  const sample=assets.find(a=>a.source==='briar'||a.source==='creature'),atlas=sample&&bridge.assetGeometry?.(sample.id)?.atlas;if(atlas&&!atlas.complete&&atlas!==watchedAtlas){watchedAtlas=atlas;atlas.addEventListener?.('load',()=>{thumbnailCache.clear();renderAssets();if(inspectedAsset)drawMeshPreview(modelPreviewCanvas,inspectedAsset,previewOrbit.yaw,previewOrbit.tilt,previewOrbit.zoom);},{once:true});}
  const categories=[...new Set(assets.map(a=>a.category))].sort();
  const previous=assetCategory.value;assetCategory.replaceChildren(new Option('All categories',''));
  for(const category of categories)assetCategory.appendChild(new Option(category,category));
  if(categories.includes(previous))assetCategory.value=previous;
  renderAssets();
 }

 function setTool(next){
  try{bridge?.setTool(next)}catch(error){log(error.message,'warn');return}
  tool=next;for(const [name,button]of Object.entries(tools))button.classList.toggle('active',name===next);
  modeBadge.textContent=next.toUpperCase();
  if(building&&next==='terrain')renderBuilding(null);
  terrainPanel.hidden=next!=='terrain';
  if(next==='terrain'){
   worldBrowser.hidden=true;assetBrowser.hidden=true;updateTerrainBrush();terrainState();
  }else if(!building&&worldBrowser.hidden&&assetBrowser.hidden)showBrowser('world');
  if(next==='place'&&!activeAsset&&!building){showBrowser('assets');assetHint.textContent='Choose an asset before placing.';}
  if(next!=='place'&&building)$('cancelPartPlacement').disabled=true;
  if(next!=='place'&&activeAsset){bridge?.cancelPlacement();activeAsset=null;cancelPlacement.disabled=true;assetHint.textContent='Select a model to inspect it before placement.';renderAssets();}
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
   if(doc.readyState==='loading'||!win.VeldrenAssembly||!win.VeldrenBuildings){setTimeout(injectBridge,100);return;}
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
  bridge=candidate;bridge.setTool(tool);updateSnap();updateTerrainBrush();terrainState();status.textContent='Connected to Veldren world';terminalState.textContent='Connected';
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
  if(m?.type==='veldren-editor-terrain'){terrainState(m.state);if(m.changed){markDirty();log('Terrain stroke recorded. Save World to publish the change.','ok');}}
  if(m?.type==='veldren-editor-log')log(m.message,m.level||'info');
  if(m?.type==='veldren-editor-scene'){refreshEntities();}
 });

 window.addEventListener('keydown',event=>{
  const editing=!!event.target?.closest?.('input,textarea,select,[contenteditable]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  // Toolbar and hierarchy controls keep focus in this outer document. Forward
  // navigation to the renderer iframe so a selected tool cannot steal WASD.
  if(!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&bridge?.setCameraKey?.(event.key,true)){
   event.preventDefault();return;
  }
  if(!editing&&activeAsset&&event.key.toLowerCase()==='r'){event.preventDefault();const angle=bridge?.rotatePlacement?.(15)||0;assetHint.textContent=`PLACING: ${activeAsset.name} · ${Math.round(angle)}° · move over the viewport · click to place · R rotates · Esc cancels`;return;}
  if(!editing&&activeAsset&&event.key==='Escape'){event.preventDefault();cancelPlacement.click();return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveButton.click();}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'){event.preventDefault();duplicateButton.click();}
  if(event.key==='Delete'&&!deleteButton.disabled&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){event.preventDefault();deleteButton.click();}
  if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&!editing){
   const map={'1':'select','2':'move','3':'rotate','4':'scale','5':'place','6':'camera','7':'terrain',r:'scale',p:'place',c:'camera',t:'terrain'};
   const next=map[event.key.toLowerCase()];if(next){event.preventDefault();setTool(next);}
  }
 });
 window.addEventListener('keyup',event=>{
  if(bridge?.setCameraKey?.(event.key,false))event.preventDefault();
 });
 window.addEventListener('blur',()=>bridge?.clearCameraKeys?.());

 log('Veldren editor v5 starting.','info');setTimeout(injectBridge,300);
})();

