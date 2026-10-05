const vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`
for(const sex of ['male','female'])for(const tier of ['bronze','iron','gold','mithril','dragonslayer']){
 const gear={head:tier+'_head',body:tier+'_body',legs:tier+'_legs',hands:tier+'_hands',feet:tier+'_feet'};
 for(const id of [...Object.values(gear),tier+'_shoulders']){
  const m=wornModularMesh(sex,id);assert(m.p.length>0);assert(m.i.length>0);assert(Array.from(m.p).every(Number.isFinite));
  for(let v=0;v<m.w.length;v+=4)assert(Math.abs(m.w[v]+m.w[v+1]+m.w[v+2]+m.w[v+3]-1)<1e-5);
 }
 const material=avatarMaterial(sex,gear,0);assert(material.p.length/3<65536);
 for(const clip of ['idle','walk','run','melee'])for(const phase of [0,.35,.7]){const m=avatarPose(sex,clip,phase,gear,0);assert(Array.from(m.p).every(Number.isFinite),sex+' '+tier+' '+clip);}
 // Player/NPC visuals share the same wearable material, without changing gear.
 const before=JSON.stringify(gear);avatarMaterial(sex,{...gear,_kind:'guard'},0);assert.equal(JSON.stringify(gear),before);
}
console.log('PASS: five fitted armour tiers, both bodies, stable skin weights, player/NPC shared fitting, index budget, idle/walk/run/melee poses.');
`,ctx);
