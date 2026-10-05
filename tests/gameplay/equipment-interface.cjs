// Exercise the same bag clicks, worn slots and shared-window lifecycle as play.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const noop=()=>{},elements={},closeEvents=[];
function element(){
 const classes=new Set(),listeners={};
 return {children:[],dataset:{},style:{},attributes:{},scrollTop:0,
  classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:v=>classes.has(v),toggle(v,on){on??=!classes.has(v);on?classes.add(v):classes.delete(v);return on;}},
  set innerHTML(v){this.html=v;this.children=[];},get innerHTML(){return this.html||'';},
  appendChild(c){this.children.push(c);if(c.id)elements[c.id]=c;return c;},append(...c){c.forEach(n=>this.appendChild(n));},replaceChildren(...c){this.children=c;},
  querySelectorAll:()=>[],querySelector(){return null;},addEventListener(type,fn){(listeners[type]??=[]).push(fn);},
  setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},getContext:()=>new Proxy({},{get:()=>noop}),
  show(){this.open=true;this.presentation='nonmodal';},showModal(){this.open=true;this.presentation='modal';},
  close(){if(this.open){this.open=false;closeEvents.push(()=>{for(const fn of listeners.close||[])fn({});});}},focus:noop,setPointerCapture:noop,
  getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})};
}
const context={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},
 document:{getElementById:id=>elements[id]??=element(),querySelectorAll:()=>[],createElement:element,addEventListener:noop,body:element()},
 window:{addEventListener:noop,matchMedia:()=>({matches:false})},flushCloseEvents(){while(closeEvents.length)closeEvents.shift()();}};
vm.createContext(context);
for(const f of ['cloud','loot','spirits','hud','systems','trading','frontier','world','tutorial','skills','game','equipment-interface'])vm.runInContext(fs.readFileSync(__dirname+'/../../client/'+f+'.js','utf8'),context,{filename:f});
vm.runInContext(`
renderAction=()=>{};drawPortrait=()=>{};renderTutorial=()=>{};save=()=>{};gameIcon=()=>'';paintItemIcons=()=>{};
let previewWeapon=null,previewRenders=0;paintEquipmentPreview=()=>{previewWeapon=s.equipment.weapon;previewRenders++;};
s=defaults();s.character={name:'Tester'};s.tutorial=tutorialSteps.length;s.gear={bronzeSword:1,shortbow:1};s.bag={arrows:20};s.equipment={};
const clickBag=id=>{const button=$('inventoryGrid').children.find(b=>b.title===ITEMS[id].name);assert(button,'Bag contains '+id);button.onclick({preventDefault:()=>{}});};
const statsText=()=>$('combatStatGroups').children.flatMap(section=>section.children[1].children.map(el=>el.textContent));
openGamePanel('gear');assert(window.equipmentOpen,'the equipment tab opens compact worn slots');assert(!window.equipmentStatsOpen,'the stats view requires its own button');assert.equal(tab,'bag');assert.equal($('modal').presentation,'nonmodal');assert($('modal').classList.contains('equipment-window'));
assert.equal($('wornEquipmentGrid').children.length,EQUIPMENT_SLOTS.length);assert($('wornEquipmentGrid').children.some(b=>b.dataset.equipmentSlot==='ammo'));
clickBag('bronzeSword');assert.equal(s.equipment.weapon,'bronzeSword');assert($('wornEquipmentGrid').children.find(b=>b.dataset.equipmentSlot==='weapon').title.includes('Bronze sword'));
$('equipmentTools').onclick();assert.equal($('wornEquipmentTitle').textContent,'Tool belt');assert.equal(tab,'bag');assert($('inventoryGrid').children.some(b=>b.title===ITEMS.shortbow.name));$('wornEquipmentContents').children[0].onclick();assert.equal($('wornEquipmentTitle').textContent,'Worn equipment');
openGamePanel('gear',true);flushCloseEvents();assert(!window.equipmentOpen);assert(!$('modal').open);openGamePanel('gear');openGamePanel('skills');flushCloseEvents();assert(!window.equipmentOpen);assert(!$('modal').classList.contains('equipment-window'));
openGamePanel('gear');$('equipmentStats').onclick();assert(!window.equipmentOpen);assert(!$('modal').classList.contains('equipment-window'));assert(window.equipmentStatsOpen);assert($('modal').classList.contains('combat-stats-window'));
// Put the sword back into the bag for the same equip/swap checks in stats.
$('statsEquipment').children.find(b=>b.dataset.equipmentSlot==='weapon').onclick({preventDefault:()=>{}});
assert.equal(tab,'bag');assert.equal($('gameDock').hidden,false);assert.equal($('modal').presentation,'nonmodal');assert(window.equipmentStatsOpen);
$('pairedEquipmentTools').onclick();assert.equal(tab,'bag');assert($('inventoryGrid').children.some(b=>b.title===ITEMS.bronzeSword.name),'tool belt keeps the bag visible');$('pairedEquipmentTools').onclick();
clickBag('bronzeSword');assert.equal(s.equipment.weapon,'bronzeSword');assert.equal(previewWeapon,'bronzeSword');assert(statsText().includes('melee'));
clickBag('shortbow');assert.equal(s.equipment.weapon,'shortbow');assert.equal(previewWeapon,'shortbow');assert(statsText().includes('ranged'));
assert($('inventoryGrid').children.some(b=>b.title===ITEMS.bronzeSword.name),'previous weapon returns to the visible bag');
const worn=$('statsEquipment').children.find(b=>b.dataset.equipmentSlot==='weapon');assert(!worn.disabled);worn.onclick({preventDefault:()=>{}});
assert.equal(s.equipment.weapon,null);assert.equal(previewWeapon,null);assert($('inventoryGrid').children.some(b=>b.title===ITEMS.shortbow.name));
close();flushCloseEvents();assert(!window.equipmentStatsOpen);assert(!$('modal').classList.contains('combat-stats-window'));assert.equal($('gameDock').hidden,false);
openCombatStats();dialog('Item details','<p>Details</p>');flushCloseEvents();assert(!window.equipmentStatsOpen);assert.equal($('modal').presentation,'nonmodal');assert(!$('modal').classList.contains('combat-stats-window'));
openCombatStats();flushCloseEvents();assert(window.equipmentStatsOpen,'queued close from the previous dialog cannot tear down the reopened equipment window');
openGamePanel('skills');flushCloseEvents();assert(!window.equipmentStatsOpen);assert.equal(tab,'skills');assert(!$('modal').open);
openCombatStats();openBank();flushCloseEvents();assert(window.realmTrade);assert(!window.equipmentStatsOpen);assert(!$('modal').classList.contains('combat-stats-window'));assert.equal(tab,'bag');
openCombatStats();flushCloseEvents();assert(!window.realmTrade);assert(window.equipmentStatsOpen);assert(!$('modal').classList.contains('trade-window'));
openGamePanel('bag',true);flushCloseEvents();assert(!window.equipmentStatsOpen);assert($('gameDock').hidden);assert(previewRenders>=6);openGamePanel('gear');openBank();flushCloseEvents();assert(!window.equipmentOpen);assert(!$('modal').classList.contains('equipment-window'));assert(window.realmTrade);
console.log('PASS: compact Equipment with Stats/Tool belt/Spirits controls, explicit stats expansion, paired bag in both views, live weapon/bonus/preview refresh, unequip, window switching, close/reopen races and bank compatibility.');
`,context);
