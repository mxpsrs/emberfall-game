const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../../client/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};dialog=()=>{throw new Error('Loot must not open a dialog')};
setupExpandedWorld();setupLoot();activateScene('overworld',14,17);s.groundLoot=[];s.bag={};s.gear={};s.equipment={};px=s.x;py=s.y;
let pile=groundDrop({coins:12,bones:2,arrows:8});const gold=s.gold;select(pile);assert.equal(s.gold,gold);assert.equal(s.bag.coins,12);assert.equal(target,null);assert.equal(s.bag.bones,undefined);
select(pile);assert.equal(s.bag.bones,1);assert.equal(pile.items.bones,1);select(pile);assert.equal(s.bag.bones,2);select(pile);assert.equal(s.bag.arrows,8);assert.equal(s.groundLoot.length,0);
pile=groundDrop({fish:1});s.bag={bones:25};select(pile);assert.equal(pile.items.fish,1);assert.equal(s.groundLoot.length,1);assert.equal(target,null);
s.bag={};pile=groundDrop({runes:9},14,18);select(pile);assert(path.length>0);assert.equal(s.bag.runes,undefined);stop();assert.equal(pile.items.runes,9);
console.log('PASS: no loot dialog, direct one-item pickup, coin/ammo stacks, full-bag retention, walk-before-pickup and cancellation.');
`,ctx);