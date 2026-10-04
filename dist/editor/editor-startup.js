'use strict';
// Editor control runs only from the authenticated editor viewport. The shared
// world generators and Filament renderer have no player/controller authority.
function editorFrame(now){
 let phase='editor-frame';
 try{
  const dt=Math.min(Math.max(0,(now-last)/1000),.05);last=now;
  if(assetsReady&&!document.hidden){time+=dt;phase='editor-preparation';window.VeldrenEditorBridge?.prepareFrame?.();phase='editor-render';draw();}
 }catch(error){if(typeof realmReportRuntimeFailure==='function')realmReportRuntimeFailure(error,phase);else console.error('Editor frame failed',error);}
 finally{requestAnimationFrame(editorFrame);}
}
async function bootEditor(){
 if(window.VELDREN_CONTEXT!=='editor')throw Error('Editor boot requires editor context');
 if(window.realmStartup?.failed)return;
 try{
  realmLoadStatus('Preparing the editor world…',35,'assets');
  await Promise.all([window.filamentReady,window.realmNativeReady||Promise.reject(new Error('Native editor Scene core was not scheduled')),window.VELDREN_WORLD_EDITS_READY,loadRebuiltTextures(),
   ...['items','environment'].map(async name=>{art[name]=await realmLoadImage('assets/'+name+'.png');}),
   fetch(realmAssetURL('assets/bounds.json')).then(async response=>{if(!response.ok)throw Error('Item artwork unavailable');art.bounds=await response.json();})]);
  const prebuilt=await realmStartupStep('Loading the world…',76,'world-generation',()=>globalThis.VeldrenPrebuiltWorld.load());
  if(!prebuilt){
   await realmStartupStep('Preparing Briarhaven…',76,'world-generation',()=>setupExpandedWorld());
   await realmStartupStep('Preparing the landscape…',77,'tutorial-generation',()=>setupTutorialVillage());
  }
  if(!globalThis.VeldrenPrebuiltWorld.nativeReady)setupLoot();
  window.VeldrenSceneOwnership?.captureGenerationIdentity();window.VeldrenBuildingScene?.capture(worldScenes);window.VeldrenLightScene?.capture();window.VeldrenMetadataScene?.capture();window.VeldrenStructureScene?.capture();window.VeldrenSpawnScene?.capture();window.VeldrenGatherableScene?.capture();window.VeldrenBridgeScene?.capture();window.VeldrenQuarryScene?.capture();window.VeldrenServiceScene?.capture();
  if(!await globalThis.VeldrenPrebuiltWorld.activateNative(realmStartupStep)){
   await window.VeldrenWorldEdits.applyFinishedWorld();
   await window.VeldrenSceneOwnership.migrateWorld(realmStartupStep);
  }
  // These viewport coordinates are editor state, never a player spawn or save.
  // The editor opens the authored overworld, independent of the fresh-player
  // tutorial destination chosen while hydrating the shared construction graph.
  currentScene='overworld';
  if(window.VeldrenWorldObjects?.enabled)VeldrenWorldObjects.select(worldScenes.overworld.objects);
  else objects.splice(0,objects.length,...worldScenes.overworld.objects);
  buildings.splice(0,buildings.length,...worldScenes.overworld.buildings);
  resetLandSurface();px=55;py=50;target=null;resize();assetsReady=true;last=performance.now();
  const bridge=window.VeldrenEditorBridge;
  if(!bridge)throw Error('Editor controls did not load');
  await bridge.initialize();
  if(!bridge.isReady())throw Error('Editor controls could not initialize');
  const canonical=window.VeldrenSceneOwnership?.document?.();
  if(canonical)bridge.adoptCanonicalDocument(canonical);
  realmLoadComplete();
  requestAnimationFrame(editorFrame);
 }catch(error){assetsReady=false;realmLoadFailure('The editor world could not start.',error,'editor-world');}
}
