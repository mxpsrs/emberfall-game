// Exercise the production draw path that duplicated selected tutor names.
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');
const vm=require('vm');
vm.runInContext(`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;
s.character={name:'Adventurer',frame:'male',look:0};s.tutorial=tutorialSteps.length;
const drawn=[];label=(text)=>drawn.push(text);screen={w:1112,h:512};view3d.zoom=65;
for(const name of ['Forester Ash','Cook Bram','Elder Rowan','Captain Vale']){
 const tutor=objects.find(o=>o.name===name);assert(tutor,name+' exists');
 activateScene('overworld',tutor.x,tutor.y+1);
 for(let i=0;i<4;i++){
  target=i%2===0?tutor:null;drawn.length=0;draw3d();
  assert.equal(drawn.filter(n=>n===name).length,1,name+' has exactly one nameplate, selected or nearby');
 }
}
const enemy=objects.find(o=>o.kind==='goblin');activateScene('overworld',enemy.x-1,enemy.y);target=enemy;
for(let i=0;i<3;i++){drawn.length=0;draw3d();assert.equal(drawn.filter(n=>n===enemy.name).length,1,'one selected enemy name');}
console.log('PASS: selected and nearby tutor names, repeated selection changes, and enemy combat nameplates draw once.');
`,ctx);
