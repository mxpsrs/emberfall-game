const {ctx,counters,gl}=require('../scripts/benchmark-desktop.cjs');
const vm=require('node:vm');
const parameters=gl.getParameter;
gl.getParameter=key=>key===gl.MAX_VERTEX_UNIFORM_VECTORS?256:parameters(key);
gl.getAttribLocation=(program,name)=>['aPosition','aNormal','aColor','aMaterial','aUV','aJoints','aWeights'].indexOf(name);
let palettes=0;const bossColors=new Set(),dissolves=new Set();
gl.uniform1f=(name,value)=>{if(name==='uBossColor')bossColors.add(value);if(name==='uDissolve')dissolves.add(value);};
gl.uniform4fv=(name,data)=>{if(name==='uBones[0]'){if(!data.every(Number.isFinite)||data.length>960)throw new Error('Invalid skin palette');palettes++;}};
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
activateScene('mine',10,12);screen={w:1112,h:512};view3d.zoom=90;
const monsters=Object.keys(creatureAssets).map((kind,id)=>({type:'enemy',kind,creatureLook:kind,id,x:10+id%2,y:12+Math.floor(id/2),dead:0,attackAt:-100,hitAt:-100}));
const frameCosts=[];let uploaded;
for(let frame=0;frame<90;frame++){
 time=1+frame/60;const painter=painter3(ctx,project3);assert(painter.skinned,'supported hardware uses GPU skinning');
 const start=performance.now();
 for(const o of monsters){o.attackAt=time-(frame%60)/60*creatureAssets[o.kind].clips.attack.duration;creature3(painter,o,o.x+.5,o.y+.5);}
 frameCosts.push(performance.now()-start);painter.flush();
 if(frame===0)uploaded=counters.static;
 else assert.equal(counters.static,uploaded,'animated creatures never re-upload their geometry');
}
assert.equal(creaturePoses.size,0,'GPU animation does not allocate deformed CPU meshes');
assert(creatureRigPoses.size<=80,'bone cache stays bounded');
frameCosts.sort((a,b)=>a-b);console.log('Creature CPU preparation, '+monsters.length+' simultaneous attacks: median '+frameCosts[45].toFixed(2)+' ms, p95 '+frameCosts[85].toFixed(2)+' ms. GPU execution is not included.');
`,ctx);
if(palettes!==90*vm.runInContext('monsters.reduce((n,o)=>n+(creatureAssets[o.kind].splitSkinPalette?creatureSkinBatches(creatureAssets[o.kind]).length:1),0)',ctx)*2)throw new Error('Both shadows and color must receive every creature palette, including split B-bone draws');
vm.runInContext(`
const crystal=monsters.find(o=>o.creatureLook==='boss_colossus');crystal.enraged=true;crystal.dead=time+60;crystal.deathAt=time-.6;
const deathPainter=painter3(ctx,project3);creature3(deathPainter,crystal,11,12);creature3(deathPainter,monsters[0],9,12);deathPainter.flush();
`,ctx);
if(!bossColors.has(2)||!bossColors.has(0)||![...dissolves].some(v=>v>0&&v<1)||!dissolves.has(0))throw new Error('Boss recolor/dissolve must be applied and reset for ordinary geometry');
vm.runInContext(`
const walkingGear={body:'leatherArmor',feet:'leatherBoots',head:'ironHelm',weapon:'ironSword',shield:'ironShield'};
for(const sex of ['male','female']){
 let body;for(let frame=0;frame<60;frame++){
  const posed=avatarGpuPose(sex,'walk',frame/60,walkingGear,0);body??=posed.gpuMesh;
  assert.equal(posed.gpuMesh,body,'walking and equipment retain one mesh');assert(posed.pose.every(Number.isFinite));assert(posed.pose.length<=960);
 }
 const middle=avatarGpuPose(sex,'walk',.5,walkingGear,0),cpu=avatarPose(sex,'walk',.5,walkingGear,0),m=middle.gpuMesh;
 for(let v=0;v<m.p.length/3;v+=37)for(let axis=0;axis<3;axis++){let value=0;for(let j=0;j<4;j++){const b=m.j[v*4+j]*12+axis*4;value+=m.w[v*4+j]*(middle.pose[b]*m.p[v*3]+middle.pose[b+1]*m.p[v*3+1]+middle.pose[b+2]*m.p[v*3+2]+middle.pose[b+3]);}assert(Math.abs(value-cpu.p[v*3+axis])<.0001,'GPU body and fitted armor match the reference rig');}
}
const actorPainter=painter3(ctx,project3);humanoid3(actorPainter,10.5,12.5,0,{...walkingGear,_frame:'female'},0,1);actorPainter.flush();
assert(avatarRigPoses.size<=128);assert(avatarMaterials.size<=64);
`,ctx);
gl.getParameter=key=>key===gl.MAX_VERTEX_UNIFORM_VECTORS?128:parameters(key);
vm.runInContext(`realmGPU=null;const fallback=painter3(ctx,project3);assert(!fallback.skinned,'limited hardware retains CPU animation');creature3(fallback,monsters[0],10.5,12.5);creature3(fallback,monsters.find(o=>o.kind==='boss_xalith'),11.5,12.5);fallback.flush();assert(creaturePoses.size>0);`,ctx);
console.log('PASS: stable creature and avatar geometry, fitted armor, finite bone palettes, animated shadows, bounded caches, and low-capability fallback.');
