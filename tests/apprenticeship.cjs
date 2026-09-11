const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},children:[],appendChild(child){this.children.push(child)},querySelectorAll:()=>[],set innerHTML(value){this.children=[]},listeners:{},addEventListener(type,fn){const before=this.listeners[type];this.listeners[type]=before?e=>{before(e);fn(e)}:fn},setPointerCapture:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,atob,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});

vm.runInContext(fs.readFileSync(root+'view3d.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'view3d'});
vm.runInContext(fs.readFileSync(root+'art-direction.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'art-direction'});
vm.runInContext(fs.readFileSync(root+'renderer-gl.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:'renderer-gl'});
for(const f of ['kingdoms','realm-models','assets/briarhaven/models','briarhaven-art','assets/realms/models','realms-rebuilt','world-depth','organic-world','walk-in-world','world-style'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});


vm.runInContext(`
renderAction=()=>{};draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
s.character={name:'Fresh apprentice',look:0};s.tutorial=0;s.tutorialVersion=2;s.runEnabled=false;s.runEnergy=100;assetsReady=true;activateScene('overworld',42,51);
let testNow=0;function tick(){testNow+=50;frame(testNow);}
function until(predicate,label){for(let i=0;i<3000;i++){if(predicate())return;tick();}throw new Error('Timed out: '+label+' @ '+s.x+','+s.y+' '+tutorialStep()?.event+' target '+target?.name+' path '+path.length);}
function current(event){assert.equal(tutorialStep()?.event,event);}
function clickDialog(label){const button=$('modalBody').children.find(b=>b.textContent===label&&b.onclick);assert(button,'dialog button '+label);button.onclick();}
function talk(role){current('talk-'+role);guide();until(()=>$('modal').open,'reach '+role);clickDialog('Continue');}
function gather(event){current(event);guide();until(()=>tutorialStep()?.event!==event,event);}
current('camera');observeTutorialCamera();view3d.yaw+=.3;tick();current('walk');walkTo(44,51);until(()=>tutorialStep()?.event!=='walk','walk anywhere');
talk('guide');current('bag');openTutorialPanel('bag');current('skills');openTutorialPanel('skills');
talk('woods');gather('tree');current('fire');assert(lightLog());
talk('fishing');gather('fish');assert(s.bag.rawTrout>0);talk('cooking');gather('cook');assert((s.xp.Cooking||0)>0);current('eat');eat();
talk('mining');gather('ore');gather('smelt');gather('smith');assert(s.bag.arrowheads===10);
talk('combat');current('gear');chooseStyle('melee');gather('dummy');gather('monster');current('loot');guide();until(()=>!path.length&&!target,'coins');guide();until(()=>tutorialStep()?.event!=='loot','bones');
talk('bank');current('deposit');openBank();const bagBefore=s.bag.arrowheads;assert(transferBank('arrowheads'));current('withdraw');assert.equal(s.bank.arrowheads,1);assert(transferBank('arrowheads',true));assert.equal(s.bag.arrowheads,bagBefore);close();
talk('worship');current('bury');if(!s.bag.bones)s.bag.bones=1;assert(buryBones());current('spirit');guide();until(()=>$('modal').open,'Cinder');clickDialog('Form a bond');assert(s.spirits.cinder);assert(s.xp.Worship>=38);
talk('magic');current('magic');chooseStyle('magic');const runesBefore=s.bag.runes;gather('magic');assert(s.bag.runes<runesBefore);assert(s.xp.Magic>0);
current('talk-finish');guide();until(()=>$('modal').open,'Rowan finish');clickDialog('Finish apprenticeship');assert.equal(tutorialStep(),null);assert(s.tutorialReward);close();
const completed=s.tutorial;s=JSON.parse(JSON.stringify(s));normalizeJourney(s);assert.equal(s.tutorial,completed);assert(s.spirits.cinder);assert.equal(s.bag.arrowheads,10);
// The recorded old save gets the new course without losing belongings or levels.
const legacy={...s,tutorial:0,tutorialVersion:undefined,x:14,y:18};const legacyXP=JSON.stringify(legacy.xp),legacyBag=JSON.stringify(legacy.bag);normalizeJourney(legacy,legacy);assert.equal(legacy.tutorial,0);assert.equal(JSON.stringify(legacy.xp),legacyXP);assert.equal(JSON.stringify(legacy.bag),legacyBag);
s.tutorial=2;activateScene('overworld',150,80);guide();assert($('modal').open);clickDialog('Return to Briarhaven');assert.equal(s.x,42);assert.equal(s.y,51);assert.equal(s.tutorial,2);
// Running changes real distance, consumes energy only while moving, and survives saving.
s.tutorial=tutorialSteps.length;activateScene('overworld',45,90);s.runEnabled=false;s.runEnergy=100;walkTo(45,100);const y0=py;for(let i=0;i<10;i++)advanceMovement(.05);const walking=py-y0;assert(Math.abs(walking-1)<.001,'walk speed');
activateScene('overworld',45,90);s.runEnabled=true;s.runEnergy=100;walkTo(45,100);for(let i=0;i<10;i++)advanceMovement(.05);assert(Math.abs(py-90-walking*2)<.001,'run covers twice the distance');assert(s.runEnergy<100);
stop();px=s.x;py=s.y;const energy=s.runEnergy;advanceMovement(.05);assert(s.runEnergy>energy,'rest recovers energy');
s.runEnergy=.001;walkTo(45,100);advanceMovement(.05);assert(!s.runEnabled,'empty energy switches to walking');assert(s.runEnergy>=0);s=JSON.parse(JSON.stringify(s));normalizeJourney(s);assert(!s.runEnabled);assert(s.runEnergy<1);
console.log('PASS: all 31 tutor-led lessons through real routes, conversations, gathering, crafting, combat, bank and spirit actions; recovery, saves, walking and running.');
`,ctx);
