'use strict';
// Load the pinned Filament runtime and immutable renderer assets before boot.
// The world never silently drops back to the retired WebGL renderer.
(function(){
 function browserPixels(url){
  return new Promise((resolve,reject)=>{
   const image=new Image();image.decoding='async';
   image.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Browser image canvas is unavailable');context.drawImage(image,0,0);const rgba=context.getImageData(0,0,canvas.width,canvas.height).data;resolve({width:canvas.width,height:canvas.height,pixels:new Uint8Array(rgba)});}catch(error){reject(error);}};
   image.onerror=()=>reject(new Error('Browser image decode failed: '+url));image.src=url;
  });
 }
 const material=realmAssetURL('materials/veldren-world.filamat');
 const terrainMaterial=realmAssetURL('materials/veldren-terrain.filamat');
 const mobile=window.matchMedia?.('(pointer: coarse)')?.matches===true||/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'');
 const atlas=realmAssetURL('assets/realms/atlas-filament'+(mobile?'-mobile':'')+'.png');
 const groundSurfacesType=mobile?'mobile-png':'png',groundSurfaces=realmAssetURL('assets/realms/ground-surfaces'+(mobile?'-mobile.png':'.png'));
 window.filamentReady=new Promise((resolve,reject)=>{
  if(typeof Filament==='undefined'){reject(new Error('Filament runtime did not load'));return;}
  let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('Filament renderer initialization timed out'));}},120000);
  try{realmLoadStatus('Starting the Filament renderer…',32,'filament-init');Filament.init(mobile?[material,terrainMaterial]:[material,terrainMaterial,atlas],async()=>{if(settled)return;try{const decodedAtlas=mobile?await browserPixels(atlas):null,decodedGround=await browserPixels(groundSurfaces);if(settled)return;settled=true;clearTimeout(timer);window.VELDREN_FILAMENT_ASSETS={material,terrainMaterial,atlas,groundSurfaces,groundSurfacesType,atlasPixels:decodedAtlas,groundSurfacesPixels:decodedGround};resolve(Filament);}catch(error){if(settled)return;settled=true;clearTimeout(timer);reject(error);}});}
  catch(error){settled=true;clearTimeout(timer);reject(error);}
 });
 window.filamentReady.catch(error=>realmLoadFailure('The Filament renderer could not start. Please retry; your character is safe.',error,'filament-init'));
})();
