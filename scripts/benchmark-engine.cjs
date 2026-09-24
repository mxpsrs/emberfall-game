// Deterministic moving-world and crowd workload. CPU time and GPU submissions;
// this does not execute browser layout or measure a physical device's GPU FPS.
const fs=require('fs'),vm=require('vm'),path=require('path'),{performance}=require('perf_hooks');
const started=performance.now(),{ctx,counters}=require('./benchmark-desktop.cjs');
const root=(process.env.VELDREN_BENCH_ROOT||process.env.EMBERFALL_BENCH_ROOT)||path.join(__dirname,'../dist/');
for(const f of ['multiplayer','trading','world-options','item-models','equipment-interface','item-use','tutorial-island','npc-dialogue','realm-story','lairs','encounters','briarhaven','guardian-spirits','game-audio'])vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),ctx,{filename:f});
if(fs.existsSync(path.join(root,'engine-world.js')))vm.runInContext(fs.readFileSync(path.join(root,'engine-world.js'),'utf8'),ctx,{filename:'engine-world'});
ctx.measureNow=()=>performance.now();ctx.bootstrapMs=performance.now()-started;ctx.heapUsed=()=>process.memoryUsage().heapUsed;
vm.runInContext(`
let seed=18341,benchNow=0;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
performance={now:()=>benchNow};Date.now=()=>1789300000000+benchNow;
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};renderRun=()=>{};save=()=>{};
const profile={};for(const key of ['updateWorldTimers','advanceActorMovement','livingWorld','updateEnemyRecovery','lineOfSight','avatarPose','avatarGpuPose','realmTerrainEntries','draw3d','setupExpandedWorld','setupTutorialVillage','setupEncounters','realmNav']){const fn=globalThis[key];if(!fn)continue;globalThis[key]=function(...args){const start=measureNow();try{return fn(...args);}finally{const row=profile[key]??={ms:0,calls:0};row.ms+=measureNow()-start;row.calls++;}};}
let setupAt=measureNow();setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
console.log(JSON.stringify({stage:'setup',bootstrapMs,setupMs:measureNow()-setupAt,heapMiB:heapUsed()/1048576,objects:objects.length,scenes:Object.keys(worldScenes).length,profile}));
assetsReady=true;s.character={name:'Engine check',look:0,frame:'male',hair:0,topStyle:5,bottomStyle:4};s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.worldClock=120;
for(const [scene,x,y,label,count]of [['tutorial',43,55,'tutorial moving',0],['overworld',55,61,'mainland moving',0],['tutorial',43,55,'tutorial crowd',24]]){
 s.tutorial=scene==='tutorial'?0:tutorialSteps.length;s.tutorialReward=scene!=='tutorial';activateScene(scene,x,y);screen={w:1920,h:1080};view3d.zoom=14;window.devicePixelRatio=1;realmResolution.scale=1;cloudDisconnected=false;cloudConflict=false;onlineScene=scene;onlinePeers.clear();
 const walkers=objects.filter(o=>['enemy','man','villager'].includes(o.type)&&!o._stationary&&Math.hypot(o.x-x,o.y-y)<18);for(const o of walkers)o.roamClock=7;
 const samples=[];for(let i=0;i<75;i++){
  for(const k of Object.keys(counters))counters[k]=0;for(const k of Object.keys(profile))delete profile[k];benchNow+=1000/60;
  for(let n=0;n<count;n++){const xx=x-5+(n%8)*1.4+Math.sin(i/50)*2,yy=y-5+Math.floor(n/8)*2;
   acceptPeerSnapshot({id:'peer-'+n,username:'peer-'+n,name:'Player '+n,look:n%4,frame:n%2?'female':'male',race:'human',appearance:{topStyle:n%2?4:5,bottomStyle:3+n%2,topColor:n%8,bottomColor:(n+2)%8,hair:4,hairColor:n%6},equipment:{weapon:n%3===0?'shortbow':null},visibleArrows:5,scene,x:xx,y:yy,stamp:Date.now(),heading:Math.PI/2,moving:true,running:false,route:[[xx+1,yy],[xx+2,yy]]},benchNow,Date.now(),0);
  }
  const begin=measureNow();updateWorldTimers();time+=1/60;livingWorld(1/60);updateEnemyRecovery(1/60);if(typeof advanceWorldActors==='function')advanceWorldActors(1/60);else for(const o of objects)advanceActorMovement(o,1/60);
  const simulated=measureNow();draw3d();samples.push({simulationMs:simulated-begin,renderMs:measureNow()-simulated,...counters,profile:JSON.parse(JSON.stringify(profile))});
 }
 const warm=samples.slice(15),summary={};for(const key of ['simulationMs','renderMs','draws','vertices','bytes']){const values=warm.map(s=>s[key]).sort((a,b)=>a-b);summary[key]={median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)]};}
 console.log(JSON.stringify({stage:label,objects:objects.length,walkers:walkers.length,crowd:count,skinning:realmGPU.skinning,summary,cold:samples[0],heapMiB:heapUsed()/1048576,profile:samples.at(-1).profile}));
}
`,ctx);
