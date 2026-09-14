// Drive the real browser save/presence functions through deferred HTTP responses.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function client(layout=2){
 const elements={},requests=[],pending=[];
 let saved={sceneId:'tutorial',tutorial:35,tutorialReward:false,tutorialIslandVersion:layout};
 const element=()=>({style:{},open:false,setAttribute(){},appendChild(){},focus(){}});
 const context={console,AbortSignal,Date,Map,Set,JSON,performance,playerMotion:{running:false,moving:false},path:[],setTimeout(){},clearTimeout(){},
  document:{hidden:false,body:element(),createElement:element,addEventListener(){},querySelectorAll:()=>[]},
  window:{addEventListener(){}},localStorage:{setItem(){}},stop(){},
  $:id=>elements[id]??=element(),
  fetch(url,options){const body=JSON.parse(options.body);requests.push({url,body});return new Promise(resolve=>pending.push({url,body,resolve}));}};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(new URL('../dist/cloud.js',import.meta.url),'utf8'),context);
 vm.runInContext(`let s=${JSON.stringify(saved)},assetsReady=true,currentScene='tutorial',px=42,py=51,playerHeading=0;s.character={name:'Apprentice'};cloudReady=true;`,context);
 vm.runInContext(fs.readFileSync(new URL('../dist/multiplayer.js',import.meta.url),'utf8'),context);
 vm.runInContext("onlineScene='tutorial';",context);
 const run=code=>vm.runInContext(code,context);
 async function reply(url,status){
  const index=pending.findIndex(r=>r.url===url);assert(index>=0,'request exists: '+url);const request=pending.splice(index,1)[0];
  if(status===undefined){
   if(url==='/api/character'){
    const state=request.body.state;
    assert.equal(state.sceneId==='tutorial',!state.tutorialReward,'completion and destination travel in the same save');saved=state;status=200;
   }else status=request.body.scene===saved.sceneId?200:403;
  }
  request.resolve({ok:status===200,status,json:async()=>url==='/api/character'?{revision:1}:{players:[]}});
  for(let i=0;i<8;i++)await Promise.resolve();
 }
 const complete=()=>run("s.tutorial=36;s.tutorialReward=true;s.sceneId=currentScene='overworld';queueCloudSave();");
 return {run,reply,complete,requests,pending};
}
for(const layout of [1,2,3]){
 const c=client(layout);c.complete();const sync=c.run('syncOnlineWorld()');
 assert.deepEqual(c.requests.map(r=>r.url),['/api/character'],'no premature mainland presence');
 await c.reply('/api/character');await c.reply('/api/players');await sync;
 assert(!c.run('cloudDisconnected'));assert.equal(c.run('onlineScene'),'overworld');
}
{
 const c=client();const oldPresence=c.run('syncOnlineWorld()');c.complete();const save=c.run('flushCloudSave()');
 await c.reply('/api/character');await save;await c.reply('/api/players');await oldPresence;
 assert(!c.run('cloudDisconnected'),'late island rejection does not disconnect a completed crossing');
 const sync=c.run('syncOnlineWorld()');await c.reply('/api/players');await sync;
 assert.equal(c.run('onlineScene'),'overworld');
}
{
 const c=client();c.run('queueCloudSave()');const oldSave=c.run('flushCloudSave()');c.complete();await c.run('syncOnlineWorld()');
 assert.equal(c.requests.length,1,'presence waits while an older save is in flight');
 await c.reply('/api/character');await oldSave;assert(c.run('cloudDirty'));
 const sync=c.run('syncOnlineWorld()');await c.reply('/api/character');await c.reply('/api/players');await sync;
 assert(!c.run('cloudDisconnected'));
}
{
 const c=client();c.complete();const sync=c.run('syncOnlineWorld()');await c.reply('/api/character',503);await sync;
 assert(c.run('cloudDisconnected'),'real save failures still pause gameplay');
 assert(!c.requests.some(r=>r.url==='/api/players'),'failed saves never announce mainland arrival');
}
console.log('PASS: saved scene precedes presence across island versions, old in-flight saves and presence, with real failure handling retained.');
