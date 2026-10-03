'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {ctx,run,capture}=await require('../scripts/native-world-fixture.cjs')();
 ctx.construction=JSON.parse(fs.readFileSync('dist/world-construction.json','utf8'));
 run('VeldrenPrebuiltWorld.decode(construction);VeldrenPrebuiltWorld.resume();setupLoot();');capture();
 await ctx.VeldrenSceneOwnership.hydrateWorld(JSON.parse(fs.readFileSync('dist/world-native.json','utf8')).document);
 run("s.tutorialReward=true;s.tutorial=100;activateScene('overworld',75,49,false);");
 const original=ctx.realmNative.scenes.serialize();
 run(`
 const benches=objects.filter(o=>propKind(o)==='workbench'&&/Woodcutter|Smith|Tool table/.test(o.name)&&Math.hypot(o.x-55,o.y-61)<72);
 assert(benches.length,'the actual cooked Briar service-yard workbench must exercise the regression');
 const bounds=rebuiltModels.World_Workbench.bounds;
 const width=(bounds[1][0]-bounds[0][0])*.90/(bounds[1][1]-bounds[0][1]);
 const depth=(bounds[1][2]-bounds[0][2])*.90/(bounds[1][1]-bounds[0][1]);
 for(const o of benches){
  const cx=o.x+.5,cz=o.y+.5,scale=o.editorTransform.scale,yaw=o.heading,c=Math.cos(yaw),s=Math.sin(yaw),plants=[];
  for(let bz=Math.floor((cz-4)/8);bz<=Math.floor((cz+4)/8);bz++)for(let bx=Math.floor((cx-4)/8);bx<=Math.floor((cx+4)/8);bx++)plants.push(...worldUnderstoryPlacements(bx,bz));
  assert(plants.every(p=>{const dx=p.x-cx,dz=p.z-cz,x=dx*c-dz*s,z=dx*s+dz*c;return Math.abs(x)>width*scale/2+.2||Math.abs(z)>depth*scale/2+.2}),o.name+' keeps generated vegetation out of the actual fitted Quaternius mesh footprint');
  assert(worldUnderstoryNearBuilding(cx,cz),o.name+' occupies its cached clearance');
 }
 const odd={type:'prop',name:benches[0].name,id:1,x:benches[0].x,y:benches[0].y};
 const model=worldModel,place=rebuiltPlace,models=[],parts=[];
 try{worldModel=(...args)=>{models.push(args);return args[6]||1;};rebuiltPlace=(...args)=>parts.push(args);prop3({face(){},indexed(){}},odd,odd.x+.5,odd.y+.5);}finally{worldModel=model;rebuiltPlace=place;}
 assert(models.some(a=>a[1]==='Workbench'),'a real full workbench supplies its legs, frame and surface');
 assert(!models.some(a=>a[1]==='Workbench_Drawers'),'a drawer cannot be fitted as an entire table');
 const drawer=parts.find(a=>a[1]==='World_Workbench_Drawers');assert(drawer,'the drawer remains part of the assembled workbench');
 assert(drawer[5]>.95&&drawer[5]<1.05,'the drawer remains near authored size on the full bench');
 const actor=objects.find(o=>o._generatedSpawn),actorBefore=JSON.stringify(actor._generatedEntity),bucketBefore=worldUnderstoryBuildingBuckets.get(Math.floor(odd.x/16)+':'+Math.floor(odd.y/16));
 assert(actor,'use a real native actor for the cache regression');actor.x+=.1;worldUnderstoryNearBuilding(odd.x+.5,odd.y+.5);
 assert.strictEqual(worldUnderstoryBuildingBuckets.get(Math.floor(odd.x/16)+':'+Math.floor(odd.y/16)),bucketBefore,'unrelated actor movement keeps the placement index');
 const bench=benches[0],before=JSON.stringify(bench._generatedEntity);
 bench.x=115;bench.y=64;bench.editorTransform={rotation:90,scale:1.6};
 assert(worldUnderstoryNearBuilding(bench.x+.5,bench.y+.5),'a native prop move refreshes vegetation clearance');
 assert(worldUnderstoryNearBuilding(bench.x+.5,bench.y+.5+width*.8),'scaled and rotated clearance follows the edited workbench');
 assert.notEqual(JSON.stringify(bench._generatedEntity),before,'the regression edits the canonical entity');
 `);
 assert(ctx.realmNative.scenes.load(original));
 const restored=ctx.realmNative.scenes.serialize();assert.deepEqual(restored,original,'planting clearance never changes authored Scene persistence');
 console.log('PASS: actual cooked Briar workbench bounds, generated vegetation clearance, native move/rotation/scale invalidation and unchanged serialized world.');
})().catch(error=>{console.error(error);process.exitCode=1;});
