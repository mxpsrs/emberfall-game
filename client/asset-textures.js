'use strict';
// Filament handle marshalling. C++ determines texture identity, processing and
// shared pixel ownership; this adapter owns the handles for one rendering engine.
function createVeldrenTextureResources(engine,assets,filament=Filament){
 const resources=new Map(),leases=new Set();let disposed=false;
 const unsubscribe=assets.onDispose(destroy);
 function destroy(){
  if(disposed)return;disposed=true;unsubscribe();
  for(const lease of [...leases])lease.release();
 }
 function acquire(encoded,settings){
  if(disposed)throw Error('Texture resource owner destroyed');
  const native=assets.processTexture(encoded,settings);let resource=resources.get(native.handle);
  try{
   if(!resource){
    const info=native.info,first=info.levels[0];let texture=null;
    try{
     texture=filament.Texture.Builder().width(first.width).height(first.height).levels(info.levels.length)
      .sampler(filament.Texture$Sampler.SAMPLER_2D)
      .format(info.colorSpace==='srgb'?filament.Texture$InternalFormat.SRGB8_A8:filament.Texture$InternalFormat.RGBA8).build(engine);
     for(let level=0;level<info.levels.length;level++){
      const buffer=filament.PixelBuffer(native.level(level),filament.PixelDataFormat.RGBA,filament.PixelDataType.UBYTE);
      // setImage consumes the PixelBuffer descriptor in Filament's JS binding.
      try{texture.setImage(engine,level,buffer);}
      catch(error){if(!buffer.isDeleted())buffer.delete();throw error;}
     }
    }catch(error){if(texture)engine.destroyTexture(texture);throw error;}
    resource={texture,users:0,bytes:info.gpuBytes,info};resources.set(native.handle,resource);
   }
   resource.users++;let closed=false;
   const lease=Object.freeze({texture:resource.texture,info:resource.info,release(){
    if(closed)return;closed=true;leases.delete(lease);
    try{if(--resource.users===0){resources.delete(native.handle);engine.destroyTexture(resource.texture);}}
    finally{native.release();}
   }});leases.add(lease);return lease;
  }catch(error){native.release();throw error;}
 }
 return Object.freeze({acquire,destroy,diagnostics:()=>({textures:resources.size,leases:leases.size,gpuBytes:[...resources.values()].reduce((sum,entry)=>sum+entry.bytes,0)})});
}
