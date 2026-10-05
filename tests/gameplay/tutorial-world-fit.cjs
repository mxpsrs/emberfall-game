const assert=require('node:assert/strict');
const {vm,ctx,fs}=require('../../scripts/qa/game-fixture.cjs');ctx.assert=assert;
vm.runInContext(fs.readFileSync('client/ore-identity.js','utf8'),ctx);
vm.runInContext(`
renderUI=renderTutorial=draw=drawPortrait=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();activateScene('tutorial',42,51);
for(let z=40;z<=54;z+=.5)for(let x=72;x<=90;x+=.5)assert(Math.abs(landHeight(x,z)-FIRSTLIGHT_TOWN_LEVEL)<1e-6,'smith and ore yard share a level work surface');
for(const o of objects.filter(o=>o.tutor==='mining'||['ore','tin','furnace','practice-forge'].includes(o.tutorialRole)))assert(Math.abs(landHeight(o.x+.5,o.y+.5)-FIRSTLIGHT_TOWN_LEVEL)<1e-6,o.name+' is on the graded yard');
for(let z=63;z<=85;z+=.5)assert(Math.abs(landHeight(41,z)-FIRSTLIGHT_TOWN_LEVEL)<1e-6,'approach to Vale has no hill crest');
for(let z=76;z<=88;z+=.5)for(let x=48;x<=64;x+=.5)assert(Math.abs(landHeight(x,z)-FIRSTLIGHT_TOWN_LEVEL)<1e-6,'whole rat pen remains low and level');
assert.equal(Object.keys(ORE_APPEARANCE).length,Object.keys(ORE_RESOURCES).length);
const silhouettes=new Set(),veins=new Set();
for(const key of Object.keys(ORE_RESOURCES)){
 const look=oreAppearance({resourceId:key}),faces=[];const height=buildOreRock({face:(p,c)=>faces.push({p,c})},look);
 assert(height>.25&&height<1.1);assert(faces.length<100,'bounded geometry per ore');assert(faces.some(f=>f.c===look.vein));
 assert(faces.every(f=>f.p.every(p=>p.every(Number.isFinite))));silhouettes.add(JSON.stringify(look.rocks));veins.add(look.vein);
 assert.equal(oreAppearance({resourceId:key,id:999}),look,'identity does not depend on random object ID');
}
assert.equal(silhouettes.size,Object.keys(ORE_RESOURCES).length);assert.equal(veins.size,Object.keys(ORE_RESOURCES).length);
const staff=fittedStaffMesh(),source=briarRigs.Mage.meshes['2H_Staff'];assert.notEqual(staff,source);assert.equal(staff.p.length,source.p.length);
let radius=0;for(let i=0;i<staff.p.length;i+=3)if(Math.abs(staff.p[i+1])<.12)radius=Math.max(radius,Math.hypot(staff.p[i],staff.p[i+2]));
assert(radius<.026,'shaft and grip fit inside the closed fingers');assert(radius>.01,'staff retains a visible shaft');
for(const sex of ['male','female'])for(const clip of ['staffIdle','magic','walk','run'])for(const phase of [0,.25,.5,.75,1]){
 const gear={weapon:'oakStaff',_appearance:{frame:sex}},cpu=avatarPose(sex,clip,phase,gear,0),gpu=avatarGpuPose(sex,clip,phase,gear,0);
 assert(Array.from(cpu.p).every(Number.isFinite));assert(Array.from(gpu.pose).every(Number.isFinite));
 const hand=cpu.pose.subarray(cpu.avatar.right*12,cpu.avatar.right*12+12),offset=briarPoint([sex==='female'?-.003:-.008,0,-.006],0,hand);
 assert(Math.hypot(offset[0]-hand[3],offset[1]-hand[7],offset[2]-hand[11])<.011,'staff stays attached to palm during '+clip);
}
console.log('PASS: graded smith/ore yard, nine stable ore silhouettes and veins, fitted staff geometry on both rigs through idle, casting, walking and running.');
`,ctx);
