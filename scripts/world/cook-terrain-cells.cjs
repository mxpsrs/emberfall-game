'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function deliver(cache,out){
 const manifest=JSON.parse(fs.readFileSync(cache+'/manifest.json')),groups=new Map();
 fs.mkdirSync(out,{recursive:true});
 for(const [key,name]of Object.entries(manifest.pages)){
  const p=JSON.parse(fs.readFileSync(path.join(cache,path.basename(name))));
  if(Array.isArray(p.heights)){let last=0;const bytes=[];for(const h of p.heights){let v=0;if(h!==null){const d=h-last;last=h;v=(d>=0?d*2:-d*2-1)+1;}while(v>=128){bytes.push((v&127)|128);v=Math.floor(v/128);}bytes.push(v);}p.heightsPacked=Buffer.from(bytes).toString('base64');delete p.heights;}
  const group=Math.floor(p.x/64)*64+'_'+Math.floor(p.z/64)*64+'.json';if(!groups.has(group))groups.set(group,[]);groups.get(group).push(p);manifest.pages[key]='terrain-cells/'+group;
 }
 for(const [name,pages]of groups)fs.writeFileSync(path.join(out,name),JSON.stringify({version:1,pages}));
 fs.writeFileSync(out+'/manifest.json',JSON.stringify(manifest));
}
// Cook actual authored terrain into independent 32-unit pages. Runtime IO only
// fetches nearby pages; neither startup nor a render frame samples the whole map.
(async()=>{
 // GPU and camera presentation cannot change cooked heights, road masks or collision.
 const presentation=new Set(['view3d.js','renderer-filament.js','renderer-occlusion.js','renderer-gl.js','asset-draws.js']);
 const inputs=['world-native.json','world-construction.json',...fs.readdirSync('client').filter(p=>p.endsWith('.js')&&!presentation.has(p))].sort();
 const hash=crypto.createHash('sha256');for(const p of inputs)hash.update(fs.readFileSync('client/'+p));const key=hash.digest('hex'),cache=path.resolve('.terrain-cache',key),out=path.resolve('client/terrain-cells');
 fs.rmSync(out,{recursive:true,force:true});
 if(fs.existsSync(cache+'/manifest.json')){deliver(cache,out);console.log('Reused cooked terrain cells '+key.slice(0,12));return;}
 const f=await require('./native-world-fixture.cjs')(),{ctx,run,capture}=f,cooked=JSON.parse(fs.readFileSync('client/world-native.json'));
 ctx.construction=JSON.parse(fs.readFileSync('client/world-construction.json'));run('VeldrenPrebuiltWorld.decode(construction);');capture();await ctx.VeldrenWorldEdits.prepareNativeWorld();await ctx.VeldrenSceneOwnership.hydrateWorld(cooked.document);
 run("currentScene='overworld';VeldrenWorldObjects.select(worldScenes.overworld.objects);buildings.splice(0,buildings.length,...worldScenes.overworld.buildings);resetLandSurface();");
 run(fs.readFileSync('client/terrain-mesher.js','utf8'));
 fs.mkdirSync(cache,{recursive:true});const size=32,dimensions=run('sceneSize()'),manifest={format:'veldren.terrain-cells',version:1,size,sourceKey:cooked.sourceKey,constructionKey:cooked.constructionKey,pages:{},heightError:.00005};
 ctx.pageSize=size;
 for(let z=-128;z<dimensions[1]+128;z+=size){
  for(let x=-128;x<dimensions[0]+128;x+=size){
   ctx.pageX=x;ctx.pageZ=z;
   const page=run(`(()=>{
    const n=pageSize,x=pageX,z=pageZ,heights=[],colors=new Uint8Array((n*2+1)**2*3),flags=new Uint8Array(n*n),materials=new Uint8Array(n*n*4);
    for(let j=-1;j<=n+1;j++)for(let i=-1;i<=n+1;i++){const h=landNode(x+i,z+j),b=VeldrenTerrainMesher.base(x+i,z+j);heights.push(Math.abs(h-b)<.00005?null:Math.round(h*10000));}
    for(let j=0;j<=n*2;j++)for(let i=0;i<=n*2;i++){const a=x+i/2,b=z+j/2,r=roadInfluence(a,b),k=(i+j*(n*2+1))*3;colors[k]=Math.round(Math.max(0,Math.min(1,r[0]))*255);colors[k+1]=Math.round(Math.max(0,Math.min(1,r[1]))*255);colors[k+2]=Math.round(Math.max(0,Math.min(1,shoreDistance(a,b)/4))*255);}
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=x+i,b=z+j,t=terrainType(a,b),shore=[[a,b],[a,b+1],[a+1,b+1],[a+1,b]].some(p=>Math.abs(worldWaterDistance(...p))<2);flags[i+j*n]=(t!==3||shore?1:0)|(t===3||shore?2:0)|(civilStairWellAt(a+.5,b+.5)?4:0);}
    for(let j=0;j<n*2;j++)for(let i=0;i<n*2;i++){const a=x+i/2,b=z+j/2;materials[i+j*n*2]=realmTerrainMaterial(roadInfluence(a+.25,b+.25),Math.floor(a),Math.floor(b));if(VeldrenTerrainEdits.paint(a,b))materials[i+j*n*2]|=128;}
    return {version:1,x,z,size:n,heights:heights.every(h=>h===heights[0])?heights[0]:heights,colors,flags,materials};
   })()`);
   for(const field of ['colors','flags','materials'])page[field]=Buffer.from(page[field]).toString('base64');
   const name=x+'_'+z+'.json';fs.writeFileSync(path.join(cache,name),JSON.stringify(page));manifest.pages[x+':'+z]='terrain-cells/'+name;
  }
  console.log('Cooked terrain row '+z+' / '+(dimensions[1]+128));
 }
 fs.writeFileSync(cache+'/manifest.json',JSON.stringify(manifest));deliver(cache,out);ctx.realmNative.destroy();console.log('Cooked '+Object.keys(manifest.pages).length+' terrain pages.');
})().catch(error=>{console.error(error);process.exitCode=1;});
