const vm=require('node:vm'),assert=require('node:assert/strict');const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};save=()=>{};
assert.deepEqual(EQUIPMENT_SLOTS.map(([slot])=>slot),['head','neck','weapon','body','shield','hands','legs','feet']);
const saved={gear:{iron_body:1,iron_shoulders:2,helmet_crest_1:1},bag:{logs:25},equipment:{body:'iron_body',shoulders:'iron_shoulders',crest:'helmet_crest_1'},bank:{iron_shoulders:3}};
normalizeEquipmentSlots(saved);assert.equal(saved.equipment.body,'iron_body');assert(!('crest' in saved.equipment));assert(!('shoulders' in saved.equipment));assert.equal(saved.gear.iron_shoulders,1);assert.equal(saved.bank.iron_shoulders,4);assert.equal(saved.bank.helmet_crest_1,1);assert.equal(saved.bag.logs,25);const once=JSON.stringify(saved);normalizeEquipmentSlots(saved);assert.equal(JSON.stringify(saved),once,'migration preserves every copy exactly once');
s=defaults();s.tutorialReward=true;s.tutorial=tutorialSteps.length;s.xp.Defense=s.xp.Attack=400000;s.gear={iron_body:1,iron_shoulders:1};assert(equipItem('iron_body'));assert.equal(equipItem('iron_shoulders'),false);assert.equal(s.equipment.body,'iron_body');
function depth(m,low,high,width=.32){const samples=[.15,.5,.85].map(t=>meshSliceDepth(m,low+(high-low)*t,width));return [Math.min(...samples.map(s=>s[0])),Math.max(...samples.map(s=>s[1]))];}
for(const sex of ['male','female']){
 const body=rebuiltAvatars[sex].mesh;
 for(const tier of ['bronze','iron','gold','mithril','dragonslayer']){
  for(const [part,low,high]of [['body',1.18,1.40],['legs',.78,.99]]){const m=wornModularMesh(sex,tier+'_'+part),[a,b]=depth(body,low,high),[c,d]=depth(m,low,high);assert(c<a,sex+' '+tier+' '+part+' covers the back');assert(d>b,sex+' '+tier+' '+part+' covers the front');}
  const belt=modularMesh(sex,'Belt.'+GEAR_TIERS.find(t=>t.id===tier).source+'.001'),[a,b]=depth(body,.86,.99),[c,d]=depth(belt,.86,.99);assert(c<a&&d>b,sex+' '+tier+' belt surrounds the hips');
  const gear={body:tier+'_body',legs:tier+'_legs',head:tier+'_head',hands:tier+'_hands',feet:tier+'_feet'},material=avatarMaterial(sex,gear,0);
  assert(material.p.length/3<65536);assert(Array.from(material.p).every(Number.isFinite));
  const shoulder=wornModularMesh(sex,tier+'_shoulders');assert(material.p.length>=body.p.length+shoulder.p.length,'shoulders are bundled into body armor');
  for(const clip of ['idle','walk','run','melee'])for(const phase of [0,.35,.7]){const pose=avatarPose(sex,clip,phase,gear,0);assert(Array.from(pose.p).every(Number.isFinite),'fitted armor follows '+sex+' '+clip);}
 }
}
console.log('PASS: eight wearable slots; legacy gear preserved; complete chest pieces; chest, hip and belt volume for both body types and five armor shapes through idle, walking, running and attacks.');
`,ctx);
