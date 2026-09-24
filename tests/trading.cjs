const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const noop=()=>{},elements={};
function element(){return {children:[],dataset:{},style:{},attributes:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},set innerHTML(v){this.children=[]},appendChild(c){this.children.push(c)},replaceChildren(...c){this.children=c},querySelectorAll:()=>[],querySelector:()=>null,addEventListener:noop,setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},getContext:()=>new Proxy({},{get:()=>noop}),show(){this.open=true;this.presentation='nonmodal'},showModal(){this.open=true;this.presentation='modal'},close(){this.open=false},focus:noop,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})};}
const context={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},document:{getElementById:id=>elements[id]??=element(),querySelectorAll:()=>[],createElement:element,addEventListener:noop,body:element()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(context);
for(const f of ['cloud','loot','spirits','hud','systems','trading','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+f+'.js','utf8'),context,{filename:f});
vm.runInContext(`
renderAction=()=>{};drawPortrait=()=>{};renderTutorial=()=>{};save=()=>{};renderUI=()=>{renderInventory();if(window.realmTrade)renderTradeContents();};
s=defaults();s.character={name:'Test'};s.bag={bones:3,fish:3,arrows:80};s.gear={bronzeSword:2,ironHelm:1};s.equipment={weapon:'bronzeSword',head:'ironHelm'};s.bank={};
const clickBag=id=>{const b=$('inventoryGrid').children.find(b=>b.attributes['aria-label']?.includes(ITEMS[id].name));assert(b,'Bag slot '+id);b.onclick({preventDefault:()=>{}});};
const clickStock=id=>{const b=$('tradeGrid').children.find(b=>b.attributes['aria-label']?.includes(ITEMS[id].name));assert(b,'Stock slot '+id);b.onclick({preventDefault:()=>{}});};
openBank();assert.equal($('modal').presentation,'nonmodal');assert.equal($('gameDock').hidden,false);assert.equal(tab,'bag');
const worship=s.xp.Worship;clickBag('bones');assert.equal(s.bank.bones,1);assert.equal(s.bag.bones,2);assert.equal(s.xp.Worship,worship,'banking never buries bones');
clickStock('bones');assert.equal(s.bank.bones,0);assert.equal(s.bag.bones,3);
window.realmTrade.quantity='All';renderUI();clickBag('bronzeSword');assert.equal(s.bank.bronzeSword,1);assert.equal(s.gear.bronzeSword,1);assert.equal(s.equipment.weapon,'bronzeSword');assert.equal(transferBank('ironHelm'),false,'worn helm stays equipped');
window.realmTrade.quantity=5;renderUI();clickBag('arrows');assert.equal(s.bank.arrows,5);assert.equal(s.bag.arrows,75);
s.bank.fish=100;s.bag={bones:24};s.gear={bronzeSword:1,ironHelm:1};window.realmTrade.quantity='All';renderUI();clickStock('fish');assert.equal(s.bag.fish,1);assert.equal(s.bank.fish,99);assert.equal(inventorySlots().length,25);assert.equal(transferBank('fish',true,10),false);
s.bag={bones:24,arrows:1};s.bank.arrows=500;renderUI();clickStock('arrows');assert.equal(s.bag.arrows,501,'existing stack accepts withdrawal in full bag');assert.equal(inventorySlots().length,25);
depositInventory();assert.equal(inventorySlots().length,0);assert.equal(s.gear.bronzeSword,1);assert.equal(s.gear.ironHelm,1);
const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(saved.bank,s.bank);close();assert.equal(window.realmTrade,null);
s.bag={fish:3,bones:2};s.hp=1;s.gold=100;shop();assert.equal($('modal').presentation,'nonmodal');const hp=s.hp;clickBag('fish');assert.equal(s.hp,hp,'shop click never eats');assert.equal(s.bag.fish,2);assert.equal(s.gold,100,'selling preserves pouch');assert.equal(s.bag.coins,1,'sale coins enter inventory');
clickStock('fish');assert.equal(s.bag.fish,3);assert.equal(s.gold,98);window.realmTrade.quantity=5;renderUI();clickStock('arrows');assert.equal(s.bag.arrows,5);assert.equal(s.gold,93);
window.realmTrade.quantity=1;s.gold=200;renderUI();clickStock('ironHelm');clickStock('ironHelm');assert.equal(s.gear.ironHelm,3,'buying additional gear keeps existing equipment');assert.equal(s.gold,100);
window.realmTrade.quantity='All';renderUI();clickBag('ironHelm');assert.equal(s.gear.ironHelm,1);assert.equal(s.equipment.head,'ironHelm');assert.equal(s.gold,100);assert.equal(s.bag.coins,50);
s.bag={bones:25};const coins=s.gold;renderUI();assert.equal(tradeItemAction('fish','stock'),false);assert.equal(s.gold,coins);s.bag={};s.gold=2;renderUI();assert.equal(tradeItemAction('fish','stock'),false);assert.equal(s.gold,2);
window.realmTrade.quantity='X';window.realmTrade.custom='7';assert.equal(tradeAmount(),7);window.realmTrade.custom='invalid';assert.equal(tradeAmount(),1);
close();s.bag={fish:1};renderUI();clickBag('fish');assert(s.hp>hp,'normal bag action restored when shop closes');
console.log('PASS: actual bag and stock click handlers; single, bulk and custom amounts; full inventory; stack limits; worn gear; duplicate purchases; coin conservation; normal item actions restored.');
`,context);
