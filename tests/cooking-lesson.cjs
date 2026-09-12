const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(fs.readFileSync('dist/item-models.js','utf8'),ctx);
vm.runInContext(`{
renderUI=renderAction=draw=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;s.character={name:'Cooking apprentice'};s.tutorialVersion=4;s.tutorial=tutorialSteps.findIndex(t=>t.event==='fire');
let now=0;Date.now=()=>now;function tick(){now+=50;frame(now);}function settle(){for(let i=0;i<1000;i++){if(!path.length&&!target&&Math.hypot(px-s.x,py-s.y)<.02)return;tick();}throw new Error('Cooking action did not finish');}
const nell=tutorialTutor('fishing'),tree=tutorialObject('fishing-tree');assert(tree&&tree.resourceId==='normal');assert(Math.hypot(tree.x-nell.x,tree.y-nell.y)<5,'level-one tree beside Nell');
s.bag[TREE_RESOURCES.normal.item]=1;s.bag.rawShrimp=2;const fishing=tutorialObject('fish'),approach=route(fishing.x,fishing.y,true,1.45)?.at(-1);assert(approach);activateScene('overworld',...approach);let notice='';toast=text=>notice=text;assert(lightLog(),notice+' @ '+s.x+','+s.y);assert.equal(tutorialStep().event,'cook-shrimp');const fire=tutorialObject('fishing-fire');assert(fire);
activateScene('overworld',31,67);assert(Math.hypot(fire.x-px,fire.y-py)>2);const before=s.bag.rawShrimp;assert(requestCookFish('rawShrimp'));assert.equal(s.bag.rawShrimp,before,'no cooking before arrival');assert(pendingCooking);walkTo(s.x,s.y);settle();assert.equal(s.bag.rawShrimp,before,'cancelled cooking leaves ingredients intact');
assert(requestCookFish('rawShrimp'));settle();assert.equal(s.bag.rawShrimp,before-1);assert(s.bag.shrimp>0);assert.equal(tutorialStep().event,'talk-cooking');assert(s.tutorialActions['cook-shrimp']);assert(besideFishingTutor());
const kitchen=buildings.find(b=>b.service?.destination==='village_kitchen'),bram=tutorialTutor('cooking'),range=tutorialObject('range');assert(withinWalkIn(kitchen,bram.x,bram.y));assert(withinWalkIn(kitchen,range.x,range.y));assert(!tutorialObject('hearth'),'outdoor hearth replaced');
s.bag.flour=1;s.bag.jugWater=1;assert(mixBreadDough());assert.equal(s.bag.flour,0);assert.equal(s.bag.jugWater,0);assert(!bakeBread(),'bread cannot bake at a campfire');assert.equal(s.bag.breadDough,1);
for(const id of ['flour','jugWater','breadDough','bread']){const visual=itemVisual(id);assert(visual&&visual.mesh.packed.every(Number.isFinite),id+' has an inventory and ground model');}
console.log('PASS: Nell’s nearby tree, fire and shrimp lesson; ingredient-preserving walk-to-cook/cancel, indoor kitchen/range and distinct modelled baking ingredients.');
}`,ctx);
