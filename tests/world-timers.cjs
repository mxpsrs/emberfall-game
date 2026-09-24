const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),noop=()=>{};
const elements={};function element(){return {style:{setProperty:noop},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,querySelectorAll:()=>[],addEventListener:noop,setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),close(){this.open=false}};}
const context={assert,console,gameIcon:()=>'',performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},document:{getElementById:id=>elements[id]??=element(),querySelectorAll:()=>[],createElement:element,addEventListener:noop,body:element()},window:{addEventListener:noop,matchMedia:()=>({matches:false})}};vm.createContext(context);
for(const f of ['cloud','loot','spirits','hud','systems','frontier','world','tutorial','skills','game'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+f+'.js','utf8'),context,{filename:f});
vm.runInContext(`
renderUI=()=>{};renderAction=()=>{};renderTutorial=()=>{};save=()=>{};draw=()=>{};frontierKill=()=>{};tutorialEvent=()=>{};
let wall=100000;Date.now=()=>wall;time=10;s=defaults();s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.groundLoot=[];s.bag={};s.gear={};s.equipment={};
const mob={kind:'goblin',type:'enemy',name:'Goblin',hp:0,maxhp:20,homeX:20,homeY:30,x:40,y:40,dead:0,coins:9};objects.splice(0,objects.length,mob);worldScenes={overworld:{objects:[mob]},mine:{objects:[]}};
awardDefeat(mob,'melee');assert.equal(mob.respawnAt,125000);assert.equal(s.groundLoot.length,1);const drop=s.groundLoot[0];assert.equal(drop.expiresAt,220000);
projectiles=[{o:mob}];meleeImpacts=[{o:mob}];$('modal').open=true;assetsReady=true;wall=124000;frame(1000);assert(mob.dead>time);assert(time>10,'world time continues while interfaces are open');
wall=126000;frame(1100);assert.equal(mob.dead,0,'respawn progresses while bank or shop is open');assert.equal(mob.hp,20);assert(Math.hypot(mob.x-20,mob.y-30)<=1,'respawn returns home and the open interface permits normal wandering');assert.equal(projectiles.length,0);assert.equal(meleeImpacts.length,0);
const remote={...mob,hp:0,dead:40,respawnAt:127000};worldScenes.mine.objects.push(remote);wall=128000;frame(1200);assert.equal(remote.hp,20,'off-scene monsters recover');
wall=219000;frame(1300);assert(s.groundLoot.includes(drop));target=drop;wall=221000;frame(1400);assert.equal(s.groundLoot.length,0);assert.equal(target,null);assert.equal(takeGroundItem(drop,'coins'),false,'expired loot cannot be collected');
const fresh=groundDrop({bones:2});wall+=60000;groundDrop({arrows:3});assert.equal(fresh.expiresAt,wall+120000,'new loot is not immediately expired by an older pile');
s.groundLoot=JSON.parse(JSON.stringify(s.groundLoot));wall+=130000;setupLoot();assert.equal(s.groundLoot.length,0,'saved expired drops stay expired after reload');
s.groundLoot=[{x:1,y:1,scene:'overworld',items:{bones:1}}];setupLoot();assert.equal(s.groundLoot[0].expiresAt,wall+120000,'legacy drops receive a full collection window');
s.groundLoot=[];groundDrop({ironSword:1},2,2,'overworld',true);wall+=500000;expireGroundLoot();assert.equal(s.groundLoot.length,1,'recovered save overflow remains protected');
objects.splice(0,objects.length);buildings.splice(0,buildings.length);worldScenes.overworld.objects=[];s.bag.normalLogs=1;currentScene='overworld';s.x=14;s.y=17;px=s.x;py=s.y;
Math.random=()=>0;assert(lightLog());time+=2.5;updatePlayerAction();const fire=objects.find(o=>o.name==='Log fire');assert.equal(fire.expiresAt,wall+150000);
const hearth={type:'camp',name:'Village hearth',dead:0,x:5,y:5};objects.push(hearth);worldScenes.overworld.objects.push(hearth);target=fire;
wall+=149000;frame(1500);assert(objects.includes(fire));wall+=1500;frame(1600);assert(!objects.includes(fire));assert(!worldScenes.overworld.objects.includes(fire));assert(objects.includes(hearth));assert.equal(target,null);
const ashes=s.groundLoot.find(p=>p.items.ashes);assert(ashes);assert.equal(ashes.items.ashes,1);assert.equal(ashes.x,fire.x);assert.equal(ashes.scene,'overworld');wall+=1000;frame(1700);assert.equal(ashes.items.ashes,1,'a fire leaves ashes exactly once');assert(takeGroundItem(ashes,'ashes'));assert.equal(s.bag.ashes,1);
console.log('PASS: real-time respawns, loot cleanup and saved expiry; player fires become collectible ashes after 150 seconds; permanent hearths stay.');
`,context);
