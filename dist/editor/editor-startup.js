'use strict';
// Editor control runs only from the authenticated editor viewport. The shared
// world generators and Filament renderer have no player/controller authority.
function editorFrame(now){
 const dt=Math.min(Math.max(0,(now-last)/1000),.05);last=now;
 if(assetsReady&&!document.hidden){time+=dt;draw();}
 requestAnimationFrame(editorFrame);
}
async function bootEditor(){
 if(window.VELDREN_CONTEXT!=='editor')throw Error('Editor boot requires editor context');
 if(window.realmStartup?.failed)return;
 try{
  realmLoadStatus('Preparing the editor world…',35,'assets');
  await Promise.all([window.filamentReady,window.realmNativeReady||Promise.reject(new Error('Native editor Scene core was not scheduled')),window.VELDREN_WORLD_EDITS_READY,loadRebuiltTextures(),
   ...['items','environment'].map(async name=>{art[name]=await realmLoadImage('assets/'+name+'.png');}),
   fetch(realmAssetURL('assets/bounds.json')).then(async response=>{if(!response.ok)throw Error('Item artwork unavailable');art.bounds=await response.json();})]);
  setupExpandedWorld();setupTutorialVillage();setupLoot();
  window.VeldrenSceneOwnership?.captureGenerationIdentity();window.VeldrenBuildingScene?.capture(worldScenes);window.VeldrenLightScene?.capture();window.VeldrenMetadataScene?.capture();window.VeldrenStructureScene?.capture();window.VeldrenSpawnScene?.capture();window.VeldrenGatherableScene?.capture();window.VeldrenBridgeScene?.capture();
  await window.VeldrenWorldEdits.applyFinishedWorld();
  await window.VeldrenSceneOwnership?.migrateStaticProps();await window.VeldrenBuildingScene?.migrate();await window.VeldrenSceneryScene?.migrate();await window.VeldrenRoadScene?.migrate();await window.VeldrenLightScene?.migrate();await window.VeldrenMetadataScene?.migrate();await window.VeldrenStructureScene?.migrate();await window.VeldrenSpawnScene?.migrate();await window.VeldrenGatherableScene?.migrate();await window.VeldrenBridgeScene?.migrate();
  // These viewport coordinates are editor state, never a player spawn or save.
  px=55;py=50;target=null;resize();assetsReady=true;last=performance.now();
  realmLoadComplete();await window.VeldrenEditorBridge?.initialize?.();
  const canonical=window.VeldrenSceneOwnership?.document?.();
  if(canonical)window.VeldrenEditorBridge?.adoptCanonicalDocument?.(canonical);
  requestAnimationFrame(editorFrame);
 }catch(error){assetsReady=false;realmLoadFailure('The editor world could not start.',error,'editor-world');}
}
