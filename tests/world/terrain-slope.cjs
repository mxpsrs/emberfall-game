const assert=require('node:assert/strict');
(async()=>{
 const {ctx,run}=await require('../../scripts/world/native-world-fixture.cjs')();
 run("currentScene='overworld';bridgeAt=()=>null;quarryAt=()=>null;");
 for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI*3/4,Math.PI]){
  const grade=1.1,dx=Math.cos(angle)*grade,dz=Math.sin(angle)*grade;
  ctx.landHeight=(x,z)=>x*dx+z*dz;
  assert(Math.abs(ctx.terrainCellSlope(200,300)-grade)<1e-10,'a hillside has the same grade at every heading');
  assert.equal(ctx.terrainCellBlocked(200,300),false);
  const cells=new Uint8Array(11*11);for(let z=0;z<11;z++)for(let x=0;x<11;x++)cells[x+z*11]=Number(ctx.terrainCellBlocked(x+200,z+300));
  assert(ctx.realmNative.pathfind(cells,11,11,1,1,9,9)?.length,'real C++ pathfinding crosses the climbable hillside');
 }
 ctx.landHeight=(x,z)=>1.21*x;
 assert.equal(ctx.terrainCellBlocked(200,300),true,'steep ground remains blocked');
 ctx.landHeight=(x,z)=>(x+z)%2;
 assert.equal(ctx.terrainCellBlocked(200,300),true,'both triangles of a sharp crease are checked');
 ctx.bridgeAt=()=>({});assert.equal(ctx.terrainCellBlocked(200,300),false,'bridge decks retain their walkable surface');
 ctx.bridgeAt=()=>null;ctx.quarryAt=()=>({});assert.equal(ctx.terrainCellBlocked(200,300),false,'authored quarry ramps retain their existing navigation');
 ctx.realmNative.destroy();console.log('PASS: heading-independent terrain grade, real native routes across diagonal hills, steep/creased ground and bridge/quarry exceptions.');
})().catch(error=>{console.error(error);process.exitCode=1});
