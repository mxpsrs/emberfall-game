const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../dist/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};draw=()=>{};setupExpandedWorld();setupSpirits();setupLoot();activateScene('overworld',14,17);assetsReady=true;s.tutorial=14;
let now=0;function advance(){for(let i=0;i<100;i++){now+=50;frame(now);}}
walkTo(14,18);advance();assert.equal(px,14);assert.equal(py,18);assert.equal(path.length,0);
walkTo(15,18);advance();assert.equal(px,15);assert.equal(py,18);
s.groundLoot=[];s.bag={};s.gear={};s.equipment={};const before=s.gold;const pile=groundDrop({coins:7,bones:1},14,18);select(pile);advance();assert.equal(s.gold,before+7);assert.equal(target,null);select(pile);advance();assert.equal(s.bag.bones,1);assert.equal(s.groundLoot.length,0);
walkTo(14,17);advance();assert.equal(px,14);assert.equal(py,17);assert(time>20);
console.log('PASS: repeated movement completes without stopping the frame loop; walk-to-loot, consecutive pickups and movement afterward.');
`,ctx);