'use strict';
importScripts(new URL(new URL(self.location.href).searchParams.get('mesher')||'terrain-mesher.js',self.location.href).href);
const pages=new Map();let config=null;
self.onmessage=async event=>{
 const job=event.data;
 if(job.type==='init'){config=job;return;}
 if(job.type==='clear'){pages.clear();return;}
 if(job.type!=='mesh')return;
 try{
  let c=job.snapshot;
  if(!c){
   const n=config.manifest.size,x=Math.floor(job.x/n)*n,z=Math.floor(job.z/n)*n,key=x+':'+z,path=config.manifest.pages[key];
   if(!path)throw Error('Terrain page is not in this release');
   let page=pages.get(key);
   if(!page){const response=await fetch(config.urls[path]||path);if(!response.ok)throw Error('Terrain page HTTP '+response.status);const document=await response.json();
    for(const source of document.pages||[document]){const prepared=VeldrenTerrainMesher.prepare(source);pages.set(prepared.x+':'+prepared.z,prepared);}page=pages.get(key);if(!page)throw Error('Terrain group is missing its cell');
   }
   pages.delete(key);pages.set(key,page);
   while(pages.size>config.maxPages)pages.delete(pages.keys().next().value);
   c=VeldrenTerrainMesher.cell(page,job.x,job.z,job.size);
  }
  const started=performance.now(),result=VeldrenTerrainMesher.mesh(c,job.step),bytes=[...pages.values()].reduce((n,p)=>n+p.bytes,0);
  self.postMessage({type:'mesh',id:job.id,epoch:job.epoch,data:result.data,step:result.step,requestedStep:result.requestedStep,ms:performance.now()-started,pages:pages.size,pageBytes:bytes},[result.data.buffer]);
 }catch(error){self.postMessage({type:'error',id:job.id,epoch:job.epoch,error:error.message});}
};
