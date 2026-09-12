const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
function enrich(el){
 if(el.enriched)return el;el.enriched=true;el.children=[];const classes=new Set();el.classList={add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),contains:n=>classes.has(n),toggle(n,value){value=value??!classes.has(n);if(value)classes.add(n);else classes.delete(n);return value;}};
 el.appendChild=child=>el.children.push(child);el.append=(...children)=>el.children.push(...children);el.replaceChildren=(...children)=>el.children=children;el.remove=el.removeAttribute=el.focus=()=>{};el.show=function(){this.open=true;this.modeless=true;};el.querySelector=()=>null;
 el.querySelectorAll=selector=>selector==='button'?el.children.filter(c=>c.onclick):[];return el;
}
ctx.enrich=enrich;
const get=ctx.document.getElementById,create=ctx.document.createElement;ctx.document.getElementById=id=>enrich(get(id));ctx.document.createElement=()=>enrich(create());ctx.document.body=enrich(ctx.document.body);ctx.window.innerWidth=844;ctx.window.innerHeight=390;
for(const f of ['game-icons','trading','world-options','map-icons','equipment-interface','item-use'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(`{
renderAction=renderTutorial=save=draw=drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();s.character={name:'Interaction check'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;assetsReady=false;s.bag={rawShrimp:3,breadDough:1,flour:1,jugWater:1,normalLogs:1,arrowShafts:15,feathers:15,headlessArrows:0,bronzeArrowheads:15,copperOre:1,tinOre:1,bronzeBar:1};
const range=tutorialObject('range'),kitchen=buildings.find(b=>b.service?.destination==='village_kitchen');activateScene('overworld',...doorApproach(kitchen.service));setWalkInDoor(kitchen.service,true,true);activateScene('overworld',range.x-1,range.y);
let before=s.bag.rawShrimp;primaryItemAction('rawShrimp',true);assert.equal(selectedUseItem,'rawShrimp');assert.equal(s.bag.rawShrimp,before,'tapping food beside a range only selects it');assert($('inventoryGrid').children.some(b=>b.classList.contains('item-selected')),'chosen bag item is visibly highlighted');
const bread=s.bag.breadDough;clearUseItem();engage(range);assert.equal(s.bag.rawShrimp,before);assert.equal(s.bag.breadDough,bread,'opening a range never consumes dough');assert(window.realmWorkbench);assert($('modal').modeless);assert.equal(tab,'bag');assert.equal($('gameDock').hidden,false);close();
primaryItemAction('rawShrimp',true);assert(requestItemOnObject(range));assert.equal(s.bag.rawShrimp,before-1,'one intentional use cooks one item');
assert(selectUseItem('flour'));assert(useItemOnItem('jugWater'));assert.equal(s.bag.flour,0);assert.equal(s.bag.jugWater,0);assert.equal(s.bag.breadDough,bread+1);
assert(selectUseItem('arrowShafts'));assert(useItemOnItem('feathers'));assert.equal(s.bag.headlessArrows,15);assert(selectUseItem('bronzeArrowheads'));assert(useItemOnItem('headlessArrows'));assert.equal(s.bag.arrows,15);
assert(selectUseItem('rawShrimp'));const material=JSON.stringify(s.bag);assert.equal(useItemOnItem('normalLogs'),false);assert.equal(JSON.stringify(s.bag),material,'invalid combinations preserve both items');
// Movement and a disappearing target cancel safely before any ingredients are spent.
activateScene('overworld',...doorApproach(kitchen.service));before=s.bag.rawShrimp;assert(selectUseItem('rawShrimp'));assert(requestItemOnObject(range));assert(pendingItemUse);walkTo(s.x,s.y);assert.equal(pendingItemUse,null);assert.equal(s.bag.rawShrimp,before);
assert(selectUseItem('rawShrimp'));assert(requestItemOnObject(range));range.collected=true;completeItemUse();assert.equal(s.bag.rawShrimp,before);range.collected=false;
const fire={id:99999,type:'camp',name:'Test fire',x:s.x,y:s.y,dead:0,cooking:true};objects.push(fire);assert(selectUseItem('breadDough'));assert.equal(requestItemOnObject(fire),false);assert.equal(s.bag.breadDough,bread+1,'campfires cannot bake bread');
const handlers={},button=enrich({dataset:{},style:{},addEventListener:(name,fn)=>handlers[name]=fn,setAttribute:()=>{},getBoundingClientRect:()=>({left:400,top:180,width:40,height:40})});let hold=null;setTimeout=fn=>(hold=fn,1);clearTimeout=()=>hold=null;bindItemPress(button,'rawShrimp',true);const event={button:0,clientX:10,clientY:10,preventDefault:()=>{}};
handlers.pointerdown(event);hold();assert($('modal').open===false);const menu=document.body.children.at(-1);assert(menu.children.some(b=>b.textContent==='Use Raw shrimp'),'hold menu includes Use');handlers.pointerup(event);button.onclick(event);assert.equal(s.bag.rawShrimp,before,'releasing a hold does not consume an item');
// Banking is one interaction from either the banker or chest, with a live bag.
const banker=tutorialTutor('bank');activateScene('overworld',banker.x+1,banker.y);handleWorldInteraction(banker);assert.equal(window.realmTrade.kind,'bank');assert.equal(tab,'bag');assert.equal($('gameDock').hidden,false);assert($('modal').modeless);assert(transferBank('rawShrimp'));assert(transferBank('rawShrimp',true));close();
const chest=objects.find(o=>o.name==='Bank chest');assert(chest);handleWorldInteraction(chest);assert.equal(window.realmTrade.kind,'bank');close();
console.log('PASS: highlighted material selection, non-consuming station menus, explicit one-item cooking, dough/arrow combinations, invalid-target and walk cancellation, hold release suppression, and modeless direct banking.');
}`,ctx);
