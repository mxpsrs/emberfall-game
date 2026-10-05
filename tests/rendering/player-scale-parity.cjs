'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs');
ctx.assert=assert;
vm.runInContext(fs.readFileSync('client/multiplayer.js','utf8'),ctx,{filename:'multiplayer.js'});
vm.runInContext(`{
 s=defaults();s.tutorial=tutorialSteps.length;currentScene='overworld';
 screen={w:1920,h:1080};px=42;py=51;time=10;lastAttack=-100;creatorDraft=null;
 playerMotion.blend=0;playerMotion.moving=false;playerHeading=0;
 worldObjectsInBounds=()=>[];buildings.length=0;drawRealmCrossings=()=>{};
 drawTerrainLayer3=drawRoadDetails3=drawMinimap=drawWorldClick=()=>{};
 tutorialGuideRoute=()=>[];tutorialGoal=()=>null;
 const originalHuman=humanoid3,calls=[];
 humanoid3=function(...args){calls.push({gear:args[4],size:args[8],detail:meshDetail3});};
 for(const frame of ['male','female']){
  const appearance={frame,hair:0,skin:2,topStyle:5,bottomStyle:3,topColor:1,bottomColor:7};
  s.character={name:'Local',look:0,...appearance};s.equipment={};
  onlinePeers.clear();onlineScene=currentScene;
  acceptPeerSnapshot({id:'peer',username:'Peer',name:'Peer',race:'human',frame,hair:0,
   appearance,equipment:{},look:0,x:px,y:py,heading:0,stamp:Date.now(),running:false,moving:false},performance.now(),Date.now());
  calls.length=0;draw3d();
  const local=calls.find(call=>call.gear===s.equipment),remote=calls.find(call=>call.gear._animationActor);
  assert(local&&remote,'both player paths were rendered');
  assert.equal(local.size,remote.size,'a peer must have the same world scale as the local player');
  assert.equal(local.detail,remote.detail,'world detail must not change only the peer body');
  const transforms=[];
  const painter={face(){},indexed(){},skinned(mesh,root){transforms.push(root);}};
  meshDetail3=local.detail;
  originalHuman(painter,px+.5,py+.5,0,s.equipment,0,0,0,local.size);
  originalHuman(painter,px+.5,py+.5,0,remote.gear,0,0,0,remote.size);
  assert.equal(transforms.length,2);
  for(let i=0;i<12;i++)assert(Math.abs(transforms[0][i]-transforms[1][i])<1e-9,'both authored character frames use identical world transforms');
  meshDetail3=.55;drawOnlinePlayers(painter,[]);assert.equal(meshDetail3,.55,'peer draw restores scenery detail');
 }
 console.log('PASS: local and peer player size, detail, authored model transforms and restored scenery detail.');
}`,ctx);
