const vm=require('vm'),assert=require('assert/strict');
const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};
s=defaults();s.gear={};s.equipment={};s.bag={};
const slots=inventorySlots().length;normalizeToolBelt(s);assert.equal(inventorySlots().length,slots,'tools take no bag space');
for(const id of Object.keys(TOOL_BELT_TOOLS))assert(useBeltTool(id));assert.equal(s.lastToolUsed,'hammer');
assert(!EQUIPMENT_SLOTS.some(([slot])=>slot==='beltAttachment'),'pouch is part of the permanent tool belt');assert(!Object.values(ITEMS).some(item=>item.slot==='beltAttachment'));const restored=JSON.parse(JSON.stringify(s));restored.toolBelt.futureTool=true;normalizeToolBelt(restored);assert(restored.toolBelt.futureTool,'future tool entries survive normalization');
s.toolBelt.axe=false;assert.equal(useBeltTool('axe'),false);s.toolBelt.axe=true;
s.gear.mithril_body=1;assert.equal(equipItem('mithril_body'),false,'armor honors its Defense requirement');
s.xp.Defense=s.xp.Attack=200000;
for(const id of ['bronze_head','iron_body','gold_shoulders','bronze_hands','iron_legs','bronze_feet','helmet_crest_1','copperNecklace']){s.gear[id]=1;assert(equipItem(id),id);}
assert.equal(s.equipment.head,'bronze_head');assert.equal(s.equipment.body,'iron_body');assert.equal(s.equipment.neck,'copperNecklace');
assert.equal(s.equipment.shoulders,'gold_shoulders','independent pieces mix across sets');
assert.equal(transferBank('gold_shoulders'),false,'bank never removes a worn shoulder piece');assert.equal(sell('gold_shoulders',12),false,'shop never sells a worn armor piece');
s.bag.bones=24;assert.equal(unequipItem('head'),false,'headgear and its crest require two free slots');assert.equal(s.equipment.crest,'helmet_crest_1');
s.bag={};assert(unequipItem('head'));assert.equal(s.equipment.crest,null);assert.equal(s.gear.helmet_crest_1,1);assert.equal(equipItem('helmet_crest_1'),false,'a crest cannot float without headgear');
for(const set of MODULAR_ARMOR_SETS){
 const gear=Object.fromEntries(['head','shoulders','body','hands','legs','feet','weapon','shield'].map(slot=>[slot,set.id+'_'+slot]));gear.crest='helmet_crest_1';gear.neck='copperNecklace';
 for(const id of Object.values(gear)){assert(shopStock.some(row=>row[0]===id),'every new item is obtainable');assert(modularModel(id));}
 for(const sex of ['male','female']){
  const material=avatarMaterial(sex,gear,0);assert(material.p.length/3<65536);assert(material.p.length>rebuiltAvatars[sex].mesh.p.length,'armor adds actual geometry');
  for(let i=0;i<material.w.length;i+=4){assert(Math.abs(material.w[i]+material.w[i+1]+material.w[i+2]+material.w[i+3]-1)<.00001);for(let j=0;j<4;j++)assert(material.j[i+j]<65,'armor uses the existing character skeleton');}
  for(const clip of ['walk','run','melee'])for(const phase of [0,.25,.5,.75]){
   const posed=avatarPose(sex,clip,phase,gear,0);assert(Array.from(posed.p).every(Number.isFinite),set.id+' '+sex+' '+clip);
   const y=Array.from(posed.p).filter((_,i)=>i%3===1);assert(Math.min(...y)>-.055,'boots stay above the floor');assert(Math.max(...y)<2.8,'armor stays with the body');
  }
  const sword=modularMesh(sex,ITEMS[gear.weapon].model);assert(sword.bounds[1][1]-sword.bounds[0][1]<.95,'one-handed sword has a human-scale blade');
 }
}
const plain=avatarMaterial('male',{},0),mixed=avatarMaterial('male',{hands:'iron_hands'},0);assert.notEqual(plain,mixed,'changing gauntlets invalidates the visible equipment cache');assert(plain.p.length>rebuiltAvatars.male.mesh.p.length,'the tool belt remains worn without armor');
const npc=avatarMaterial('male',{_civilian:'chosan'},1);assert(npc.p.length>0);assert.notEqual(npc.p.length,plain.p.length,'civilian uses the supplied body and outfit meshes');
console.log('PASS: independent armor, requirements, acquisition, protected worn items, tool belt persistence, both rigs through movement/combat, real geometry and civilian body.');
`,ctx);
