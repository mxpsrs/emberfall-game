const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};setupExpandedWorld();setupLoot();s.gear={bronzeSword:1};s.equipment={};s.bag={fish:2,normalLogs:2};
let pending=null,menus=0;setTimeout=fn=>{pending=fn;return 1};clearTimeout=()=>{pending=null};itemDetails=()=>menus++;
const handlers={},b={setAttribute:()=>{},addEventListener:(type,fn)=>handlers[type]=fn};bindItemPress(b,'bronzeSword',true);
const e={button:0,clientX:10,clientY:10,preventDefault:()=>{}};
handlers.pointerdown(e);handlers.pointerup(e);b.onclick(e);assert.equal(s.equipment.weapon,'bronzeSword');assert.equal(menus,0);
s.equipment.weapon=null;handlers.pointerdown(e);pending();handlers.pointerup(e);b.onclick(e);assert.equal(menus,1);assert.equal(s.equipment.weapon,null);
handlers.pointerdown(e);handlers.pointermove({...e,clientX:40});assert.equal(pending,null);handlers.pointerup(e);b.onclick(e);assert.equal(s.equipment.weapon,null);
s.hp=1;primaryItemAction('fish',true);assert(s.hp>1);assert.equal(s.bag.fish,1);assert.equal(itemActions('fish',true)[0][0],'Eat');withinWalkIn=()=>false;primaryItemAction('normalLogs',true);assert.equal(s.bag.normalLogs,1);assert(s.xp.Firemaking>0);
let dest=null;walkTo=(x,y)=>dest=[x,y];assetsReady=true;$('minimap').getBoundingClientRect=()=>({left:20,top:30,width:240,height:180});
walkFromMinimap({clientX:140,clientY:120});assert.equal(dest[0],48);assert.equal(dest[1],36);
currentScene='inn';walkFromMinimap({clientX:140,clientY:120});assert.equal(dest[0],7);assert.equal(dest[1],6);
console.log('PASS: tap primary action, hold-only menu, suppressed release click, scroll cancellation, food/material actions, minimap coordinates in world and interior.');
`,ctx);