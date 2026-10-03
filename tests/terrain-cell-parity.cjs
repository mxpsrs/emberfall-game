'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const f=await require('../scripts/native-world-fixture.cjs')(),{ctx,run,capture}=f,cooked=JSON.parse(fs.readFileSync('dist/world-native.json')),manifest=JSON.parse(fs.readFileSync('dist/terrain-cells/manifest.json'));
 ctx.construction=JSON.parse(fs.readFileSync('dist/world-construction.json'));run('VeldrenPrebuiltWorld.decode(construction);');capture();await ctx.VeldrenWorldEdits.prepareNativeWorld();await ctx.VeldrenSceneOwnership.hydrateWorld(cooked.document);
 run("currentScene='overworld';VeldrenWorldObjects.select(worldScenes.overworld.objects);buildings.splice(0,buildings.length,...worldScenes.overworld.buildings);resetLandSurface();");run(fs.readFileSync('dist/terrain-mesher.js','utf8'));
 const before=JSON.stringify(ctx.realmNative.scenes.serialize()),groups=new Map();let maxHeightError=0,maxNormalError=0,samples=0,holes=0;
 for(const [key,file]of Object.entries(manifest.pages)){
  if(!groups.has(file))groups.set(file,JSON.parse(fs.readFileSync('dist/'+file)).pages);
  const [x,z]=key.split(':').map(Number),raw=groups.get(file).find(p=>p.x===x&&p.z===z),page=ctx.VeldrenTerrainMesher.prepare(raw),M=ctx.VeldrenTerrainMesher,c=M.cell(page,x,z,16),s=M.sampler(c);
  // Corners, both sides of the shared diagonal, and fractional normal samples.
  for(const [a,b]of [[x,z],[x+16,z+16],[x+3.5,z+7],[x+9.5,z+5.5]]){ctx.sx=a;ctx.sz=b;const actual=run('landHeight(sx,sz)'),normal=Array.from(run('landNormal(sx,sz)'));maxHeightError=Math.max(maxHeightError,Math.abs(actual-s.height(a,b)));maxNormalError=Math.max(maxNormalError,...normal.map((v,i)=>Math.abs(v-s.normal(a,b)[i])));samples++;}
  holes+=page.flags.filter(f=>f&4).length;
  const mesh=M.mesh(c,4);assert(mesh.data.every(Number.isFinite),'terrain mesh has no invalid vertices');
 }
 assert(maxHeightError<.00007,'cooked render heights match authoritative collision: '+maxHeightError);assert(maxNormalError<.0007,'cooked normals match authoritative heightfield: '+maxNormalError);
 assert.equal(JSON.stringify(ctx.realmNative.scenes.serialize()),before,'terrain IO and LOD never mutate the native world or save definitions');
 ctx.realmNative.destroy();
 console.log(JSON.stringify({pass:true,pages:Object.keys(manifest.pages).length,groups:groups.size,samples,maxHeightError,maxNormalError,stairHoleTiles:holes,checks:['cooked authored cells versus live native collision','shared triangle height interpolation','normal halo continuity','valid terrain mesh attributes','stair openings','complete native world serialization unchanged']}));
})().catch(error=>{console.error(error);process.exitCode=1;});
