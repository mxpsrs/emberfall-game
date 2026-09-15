const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
draw=drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();s.tutorialReward=true;s.tutorial=39;s.mountainQuest={stage:17,lairKey:true};
const report=[];
for(const [id,lair]of Object.entries(CREATURE_LAIRS)){
 if(!lair.approach&&id!=='story_mine')continue;
 activateScene(id,...lair.entry);realmNavigation.clear();
 const nav=realmNav(),start=Math.floor(lair.entry[1])*nav.w+Math.floor(lair.entry[0]),distance=new Map([[start,0]]),queue=[start];
 for(let n=0;n<queue.length;n++){const i=queue[n],x=i%nav.w,y=Math.floor(i/nav.w);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*nav.w+xx;if(xx<0||yy<0||xx>=nav.w||yy>=nav.h||realmCellBlocked(nav,j)||distance.has(j))continue;distance.set(j,distance.get(i)+1);queue.push(j);}}
 const reachable=o=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const k=(Math.floor(o.y)+dy)*nav.w+Math.floor(o.x)+dx;if(distance.has(k))return distance.get(k);}return null;};
 if(lair.approach){const boss=objects.find(o=>o.encounter===lair.boss);assert(boss);const steps=reachable(boss);assert(steps>=90,id+' has a substantial approach: '+steps);const guards=objects.filter(o=>o.dungeonGuard);assert.equal(guards.length,6);for(const o of guards)assert.notEqual(reachable(o),null,'guard reachable '+o.name);report.push({scene:id,steps,guards:guards.length});}
 else for(const key of ['lift','airway','support','bera','oren'])assert.notEqual(reachable(mainStoryObject(key)),null,'rescue objective reachable '+key);
 assert(route(worldScenes[id].exit.x,worldScenes[id].exit.y,true,1.45),'exit reachable');
}
const dist=(a,b)=>Math.hypot(mainStoryObject(a).x-mainStoryObject(b).x,mainStoryObject(a).y-mainStoryObject(b).y);
assert(dist('driver','cart')>70);assert(dist('cart','lookout')>55);assert(dist('hesta','ilyra')>180);for(const [a,b]of [['bell','lantern'],['lantern','hand'],['hand','bell']])assert(dist(a,b)>30);
assert.equal(mainStoryFound('lift').scene,'story_mine');assert.equal(mainStoryFound('forge').scene,'overworld');
console.log('PASS: physical routes, six guards per boss approach, connected rescue mine and separated quest locations. '+JSON.stringify(report));
`,ctx);
