// Exercise the production draw path that duplicated selected tutor names.
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');
const vm=require('vm'),fs=require('fs');
for(const file of ['tutorial-journal','tutorial-vale','tutorial-guidance'])vm.runInContext(fs.readFileSync('client/'+file+'.js','utf8'),ctx,{filename:file});
vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};
s.metRowan=true;setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;
s.character={name:'Adventurer',frame:'male',look:0};s.tutorial=0;s.tutorialReward=false;activateScene('tutorial',42,51);
const drawn=[];label=(text)=>drawn.push(text);screen={w:1112,h:512};view3d.zoom=65;
for(const name of ['Forester Ash','Cook Bram','Elder Rowan','Captain Vale']){
 const tutor=objects.find(o=>o.name===name);assert(tutor,name+' exists');
 activateScene('tutorial',tutor.x,tutor.y+1);if(tutor.interiorBuilding){const b=buildings.find(b=>b.service?.destination===tutor.interiorBuilding);setWalkInDoor(b.service,true,true);}
 for(let i=0;i<4;i++){
  target=i%2===0?tutor:null;drawn.length=0;draw3d();
  assert.equal(drawn.filter(n=>n===name).length,1,name+' has exactly one nameplate, selected or nearby');
 }
}
s.tutorialReward=true;s.tutorial=tutorialSteps.length;activateScene('overworld',55,61);const enemy=objects.find(o=>o.kind==='goblin');activateScene('overworld',enemy.x-1,enemy.y);target=enemy;
for(let i=0;i<3;i++){drawn.length=0;draw3d();assert.equal(drawn.filter(n=>n===enemy.name).length,1,'one selected enemy name');}
console.log('PASS: selected and nearby tutor names, repeated selection changes, and enemy combat nameplates draw once.');
`,ctx);
