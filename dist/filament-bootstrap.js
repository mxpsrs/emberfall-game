'use strict';
// Load the pinned Filament runtime and immutable renderer assets before boot.
// The world never silently drops back to the retired WebGL renderer.
(function(){
 async function encodedImage(url){
  const response=await fetch(url);if(!response.ok)throw Error('Texture source unavailable: '+url);
  return new Uint8Array(await response.arrayBuffer());
 }
 const material=realmAssetURL('materials/veldren-world.filamat');
 const terrainMaterial=realmAssetURL('materials/veldren-terrain.filamat');
 const mobile=window.matchMedia?.('(pointer: coarse)')?.matches===true||/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'');
 const atlas=realmAssetURL('assets/realms/atlas-filament'+(mobile?'-mobile':'')+'.png');
 const groundSurfacesType=mobile?'mobile-png':'png',groundSurfaces=realmAssetURL('assets/realms/ground-surfaces'+(mobile?'-mobile.png':'.png'));
 window.filamentReady=new Promise((resolve,reject)=>{
  if(typeof Filament==='undefined'){reject(new Error('Filament runtime did not load'));return;}
  let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('Filament renderer initialization timed out'));}},120000);
  try{realmLoadStatus('Starting the Filament renderer…',32,'filament-init');Filament.init([material,terrainMaterial],async()=>{if(settled)return;try{const [atlasBytes,groundSurfacesBytes]=await Promise.all([encodedImage(atlas),encodedImage(groundSurfaces),window.realmNativeReady]);if(settled)return;settled=true;clearTimeout(timer);window.VELDREN_FILAMENT_ASSETS={material,terrainMaterial,atlas,groundSurfaces,groundSurfacesType,atlasBytes,groundSurfacesBytes};resolve(Filament);}catch(error){if(settled)return;settled=true;clearTimeout(timer);reject(error);}});}
  catch(error){settled=true;clearTimeout(timer);reject(error);}
 });
 window.filamentReady.catch(error=>realmLoadFailure('The Filament renderer could not start. Please retry; your character is safe.',error,'filament-init'));
})();
