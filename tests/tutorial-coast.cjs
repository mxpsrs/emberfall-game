const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(\`
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();s.tutorial=0;s.tutorialReward=false;activateScene('tutorial',42,51);
assert.deepEqual(sceneSize(),[128,136]);
// The land is surrounded by ocean, including every corner of the scene.
for(let x=0;x<=128;x++){assert(worldWaterDistance(x,0)<-2);assert(worldWaterDistance(x,136)<-2);}
for(let y=0;y<=136;y++){assert(worldWaterDistance(0,y)<-2);assert(worldWaterDistance(128,y)<-2);}
assert(bridgesInRealm().length===0,'mainland bridges must not appear in the expanded island');
for(const fish of objects.filter(o=>o.type==='fish'))assert(worldWaterSurface(fish.x,fish.y),'existing fishing spots remain in water');
for(const b of buildings)for(const [x,y]of [[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]])assert(worldWaterDistance(x,y)>2,'building corners retain dry shoreline clearance');
const dry=new Set();for(let y=1;y<135;y++)for(let x=1;x<127;x++)if(!water(x,y))dry.add(x+','+y);
const visited=new Set(['42,51']),queue=[[42,51]];for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(x+dx)+','+(y+dy);if(dry.has(key)&&!visited.has(key)){visited.add(key);queue.push([x+dx,y+dy]);}}}
assert.equal(visited.size,dry.size,'all dry land connects to the island core');
const expanded=queue.find(([x,y])=>(x>103||y>111)&&worldWaterDistance(x,y)>3);assert(expanded,'new headlands extend beyond the former map');
const restored={...s,x:expanded[0],y:expanded[1],tutorialIslandVersion:FIRSTLIGHT_LAYOUT_VERSION};normalizeJourney(restored);assert.deepEqual([restored.x,restored.y],expanded,'a save on the expanded coast resumes in place');
const oldCorner={...s,x:94,y:30,tutorialIslandVersion:FIRSTLIGHT_LAYOUT_VERSION};if(!insideFirstlightLand(oldCorner.x,oldCorner.y)){normalizeJourney(oldCorner);assert.deepEqual([oldCorner.x,oldCorner.y],TUTORIAL_ENTRY,'old positions now in water recover to the square');}
const north=[];for(let x=15;x<105;x+=3){let y=0;while(y<136&&worldWaterDistance(x,y)<0)y+=.25;if(y<136)north.push(y);}assert(Math.max(...north)-Math.min(...north)>20,'northern shore has headlands rather than a straight boundary');
currentScene='overworld';assert(worldWaterSurface(111,52));assert(bridgeAt(111,52),'mainland river crossing stays intact');
console.log('PASS: ocean border, continuous island, curved headlands, dry foundations, fishing cove, expanded-coast save recovery, and isolated mainland bridges.');
\`,ctx);`);
