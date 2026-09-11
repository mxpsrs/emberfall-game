// Geometry and navigation contracts for the shared world art pass.
const {ctx}=require('../scripts/benchmark-desktop.cjs');
const vm=require('vm');
vm.runInContext(`
const normalsMatch=build=>{
 let checked=0;
 build({face(p,c,n){
  if(!n)return;
  const u=p[1].map((v,i)=>v-p[0][i]),v=p[2].map((v,i)=>v-p[0][i]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(Math.hypot(...cross)<1e-8)return;
  const normal=[0,1,2].map(i=>n.reduce((a,v)=>a+v[i],0));
  assert(cross.reduce((a,v,i)=>a+v*normal[i],0)>0,'surface winding and lighting normals agree');checked++;
 }});
 assert(checked>20);
};
normalsMatch(r=>worldOrganic(r,0,0,0,.7,1.3,.5,'#ffffff'));
normalsMatch(r=>{worldLimb(r,[0,0,0],[.3,1,.4],.2,.08,'#ffffff');worldLimb(r,[0,0,0],[1,.1,-.3],.1,.15,'#ffffff');worldLimb(r,[0,0,0],[0,1,0],.15,.15,'#ffffff');});
for(const [name,m]of Object.entries(rebuiltModels).filter(([n])=>n.startsWith('World_'))){assert(m.i.every(i=>i<m.p.length/3));assert(m.p.every(Number.isFinite));assert(m.n.every(Number.isFinite));assert(m.t.every(t=>t>=20&&t<84));}
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
assert(worldScenes.overworld.objects.filter(o=>o.id>=2800000&&o.id<2900000).length>20,'elven streets receive woodland, not only roof tint');
for(const b of worldScenes.overworld.buildings.filter(b=>b.archetype==='castle')){
 activateScene('overworld',b.service.x,b.service.y);setWalkInDoor(b.service,false,true);
 assert(inBuilding(b,b.service.x,b.service.y-1));setWalkInDoor(b.service,true,true);
 assert(!inBuilding(b,b.service.x,b.service.y-1));
 const p=route(b.service.x,b.service.y-2);assert(p&&p.length,'castle doorway still leads inside');
 activateScene('overworld',b.service.x,b.service.y-2);assert(route(b.service.x,b.service.y+1)?.length,'castle doorway still leads outside');
}
`,ctx);
console.log('PASS: organic surface normals, imported mesh bounds/materials, elven woodland and all three castle entrances and exits.');
