import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {openLocalStorage} from '../../scripts/dev/local-storage.mjs';
import {syncSharedWorld} from '../../worker/shared-world.js';
import os from 'node:os';
import path from 'node:path';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-rowan-'));
const storage=openLocalStorage({dataDirectory:directory});
const require=createRequire(import.meta.url),{ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
try{
 for(const file of ['multiplayer','shared-world'])vm.runInContext(fs.readFileSync('client/'+file+'.js','utf8'),ctx,{filename:file});
 vm.runInContext(`
 renderUI=renderAction=renderTutorial=draw=playGameSound=()=>{};
 setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
 s.character={name:'Rowan regression'};s.tutorialVersion=TUTORIAL_VERSION;
 s.tutorial=tutorialSteps.findIndex(t=>t.event==='talk-finish');s.tutorialReward=false;
 s.tutorialCompleted=tutorialSteps.slice(0,s.tutorial).map(t=>t.event);
 s.bag={bones:2,coins:10};s.bank={normalLogs:3};s.xp.Mining=123;
 activateScene('tutorial',42,51);assetsReady=cloudReady=true;cloudDirty=cloudBusy=false;
 let finalSave=null;save=()=>{finalSave=JSON.parse(JSON.stringify(s));};
 assert.equal(s.tutorial,37);assert(beginTutorialCrossing());assert(sharedPending('teleport'));
 assert.equal(tutorialCrossing,null,'cast cannot begin before the server permit');
 `,ctx);
 const snapshot=()=>JSON.parse(vm.runInContext('JSON.stringify(s)',ctx));
 const packet=()=>JSON.parse(vm.runInContext('JSON.stringify({scene:currentScene,x:px,y:py,world:outgoingSharedWorld()})',ctx));
 const initial=packet(),response=await syncSharedWorld(storage.env,'rowan-integration',snapshot(),initial,Date.now(),'rowan-integration');
 const permit=response.receipts.find(r=>r.kind==='teleport');assert(permit?.ok,JSON.stringify(permit));
 ctx.serverReply={world:response};
 vm.runInContext(`
 applySharedWorld(serverReply);assert(tutorialCrossing,'server permit starts Rowan animation');
 updateTutorialCrossing(2.61);updateTutorialCrossing(1.2);updateTutorialCrossing(1.2);
 assert.equal(currentScene,'overworld');assert.equal(s.sceneId,'overworld');
 assert.equal(s.tutorial,tutorialSteps.length);assert(s.tutorialReward);
 assert.equal(s.bag.bones,2);assert.equal(s.bank.normalLogs,3);assert.equal(s.xp.Mining,123);
 assert.equal(carriedCoins(),31);assert.equal(s.bank.bronzeSword,1);assert.equal(s.bank.arrows,84);assert.equal(s.bank.runes,56);assert.equal(s.bank.airRunes,168);assert.equal(s.bank.fish,4);
 assert(finalSave?.tutorialReward&&finalSave.sceneId==='overworld','completion and destination save together');
 const before=JSON.stringify(s);tutorialEvent('talk-finish');assert.equal(JSON.stringify(s),before,'no duplicated reward');
 `,ctx);
 console.log('PASS: real final-lesson client → server permit → cast → mainland → atomic save, retained belongings and one-time rewards.');
}finally{storage.close();fs.rmSync(directory,{recursive:true,force:true});}
