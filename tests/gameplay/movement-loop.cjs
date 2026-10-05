const fs=require('fs'),vm=require('vm'),assert=require('assert');const root=__dirname+'/../../client/';const noop=()=>{};
function el(){return {style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},getBoundingClientRect:()=>({width:800,height:390,left:0,top:0})};}
const els={},data={},ctx={assert,console,performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>id==='spiritBuildHud'?null:els[id]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener:noop,body:el()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(ctx);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(root+f+'.js','utf8').replace(/boot\(\);\s*$/,''),ctx,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};draw=()=>{};setupExpandedWorld();setupSpirits();setupLoot();activateScene('overworld',14,17);assetsReady=true;s.tutorial=tutorialSteps.length;s.tutorialReward=true;
let now=0;function advance(){for(let i=0;i<100;i++){now+=50;frame(now);}}
walkTo(14,18);advance();assert.equal(px,14);assert.equal(py,18);assert.equal(path.length,0);
walkTo(15,18);advance();assert.equal(px,15);assert.equal(py,18);
s.groundLoot=[];s.bag={};s.gear={};s.equipment={};const before=carriedCoins();const pile=groundDrop({coins:7,bones:1},14,18);select(pile);advance();assert.equal(carriedCoins(),before+7);assert.equal(target,null);select(pile);advance();assert.equal(s.bag.bones,1);assert.equal(s.groundLoot.length,0);
walkTo(14,17);advance();assert.equal(px,14);assert.equal(py,17);assert(time>20);
const scheduled=[],reported=[];requestAnimationFrame=callback=>scheduled.push(callback);realmReportRuntimeFailure=(error,phase)=>reported.push({message:error.message,phase});
const originalDraw=draw;let drawAttempts=0;draw=()=>{if(++drawAttempts===1)throw Error('temporary render failure');};
now+=50;assert.doesNotThrow(()=>frame(now));assert.equal(scheduled.length,1,'a failed draw schedules exactly one successor');assert.equal(reported.at(-1).phase,'frame-render');
now+=50;scheduled.shift()(now);assert.equal(drawAttempts,2,'the next scheduled frame retries drawing');assert.equal(scheduled.length,1);
const originalTimers=updateWorldTimers;let timerAttempts=0;updateWorldTimers=()=>{if(++timerAttempts===1)throw Error('temporary simulation failure');};
now+=50;scheduled.shift()(now);assert.equal(reported.at(-1).phase,'frame-simulation');assert.equal(scheduled.length,1);
now+=50;scheduled.shift()(now);assert.equal(timerAttempts,2);assert.equal(drawAttempts,3);assert.equal(scheduled.length,1);
nextFrameAt=now+100;now+=1;scheduled.shift()(now);assert.equal(scheduled.length,1,'frame pacing never schedules duplicate callbacks');assert.equal(drawAttempts,3,'an early callback remains paced');
draw=originalDraw;updateWorldTimers=originalTimers;walkTo(15,17);for(let i=0;i<100;i++){now+=50;scheduled.shift()(now);}assert.equal(px,15);assert.equal(py,17);assert.equal(scheduled.length,1);
console.log('PASS: repeated movement and loot; drawing and simulation recover on the next scheduled frame after errors, without duplicate callbacks.');
`,ctx);
