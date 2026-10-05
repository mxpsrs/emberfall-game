const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(fs.readFileSync('client/item-models.js','utf8'),ctx);
vm.runInContext(`{
renderUI=renderAction=save=()=>{};currentScene='mine';time=10;lastAttack=-100;creatorDraft=null;
for(const frame of ['male','female'])for(const topStyle of [4,5])for(const armoured of [false,true]){
 s=defaults();s.character={name:'Gatherer',look:2,frame,hair:4,hairColor:3,skin:4,topStyle,bottomStyle:topStyle===4?3:4,topColor:1,bottomColor:2};
 s.equipment={weapon:'shortbow',shield:'woodenShield',...(armoured?{body:'iron_body',legs:'iron_legs',feet:'iron_feet'}:{})};
 const savedCharacter=JSON.stringify(s.character),savedGear=JSON.stringify(s.equipment),expected=avatarMaterial(frame,s.equipment,2);
 s.x=px=5;s.y=py=5;path=[];playerMotion.blend=0;
 for(const type of ['tree','ore','fish']){
  target={type,resourceId:type==='tree'?'normal':type==='ore'?'copper':'shrimp',x:6,y:5,dead:0};elapsed=actionDuration(target)*.45;
  assert(gatheringActivity(),type+' has a real active gathering animation');
  for(const gpu of [false,true]){
   let body=null,tool=null;const originalTool=drawGatheringTool;drawGatheringTool=(r,m,t)=>{tool=t;originalTool(r,m,t);};
   const painter={face(){},indexed(mesh){body??=mesh;}};if(gpu)painter.skinned=mesh=>{body??=mesh;};
   humanoid3(painter,5.5,5.5,2,s.equipment);drawGatheringTool=originalTool;
   assert(body,'actual world renderer emitted the character');
   assert.deepEqual(body.c,expected.c,type+' retains skin, hair and clothing colours');
   assert.deepEqual(body.i,expected.i,type+' retains all clothing and hair geometry');
   assert.equal(body.p.length,expected.p.length,type+' does not substitute another body');
   if(gpu)assert.deepEqual(body.p,expected.p,type+' retains the exact resting model beneath animation');
   assert.equal(tool,type==='tree'?'axe':type==='ore'?'pickaxe':'fishingNet');
  }
  stop();let restored=null;humanoid3({face(){},indexed(){},skinned(mesh){restored??=mesh;}},5.5,5.5,2,s.equipment);assert.deepEqual(restored.p,expected.p,'stopping restores the same character');
 }
 assert.equal(JSON.stringify(s.character),savedCharacter);assert.equal(JSON.stringify(s.equipment),savedGear);
}
console.log('PASS: chopping, mining and fishing retain both body types, both outfits, hair, colours and armour through CPU/GPU rendering and cancellation.');
}`,ctx);
