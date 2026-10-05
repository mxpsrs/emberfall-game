const {ctx,vm,fs}=require('./game-fixture.cjs');
ctx.auditOutput=process.argv[2]||'.qa/world-audit.json';
vm.runInContext(`
renderUI=renderAction=draw=drawPortrait=save=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();s.character={name:'World audit'};
const result={settlements:SETTLEMENTS,ecology:ecologyReport,scenes:[],issues:[],reviewStops:[]};
function stopFor(name,scene,x,y,kind){result.reviewStops.push({name,scene,x:Math.round(x),y:Math.round(y),kind});}
for(const [scene,w]of Object.entries(worldScenes)){
 s.tutorialReward=scene!=='tutorial';s.tutorial=scene==='tutorial'?0:tutorialSteps.length;activateScene(scene,...w.entry||[42,51]);
 const trees=w.objects.filter(o=>o.type==='tree');
 result.scenes.push({scene,title:w.title,objects:w.objects.length,trees:trees.length,buildings:w.buildings.length,size:sceneSizes[scene]});
 const context=ecologyScenes.get(scene);
 for(const o of trees){const issue=context&&ecologyTreeProblem(context,o);if(issue)result.issues.push({scene,id:o.id,name:o.name,x:o.x,y:o.y,kind:'tree',issue});}
 for(const b of w.buildings){if(!b.walkIn)continue;const samples=[];for(let y=b.y+1;y<b.y+b.h-1;y++)for(let x=b.x+1;x<b.x+b.w-1;x++)samples.push(landHeight(x+.5,y+.5));const variation=Math.max(...samples)-Math.min(...samples);if(variation>.12)result.issues.push({scene,name:b.name,x:b.x,y:b.y,kind:'foundation',variation});}
 if(scene==='overworld'){
  for(const t of SETTLEMENTS)stopFor(t.name,scene,t.x,t.y,'settlement');
  for(const q of surfaceQuarries)stopFor(q.name,scene,q.x,q.y,'quarry');
  for(const o of w.objects.filter(o=>o.passageKind||o.lairEntrance||o.mainStoryKey||o.mountainKey))stopFor(o.name,scene,o.x,o.y,'quest/entrance');
  for(const b of physicalBridges)stopFor('Bridge '+result.reviewStops.length,scene,b.x,b.z,'bridge');
 }else if(scene==='tutorial'||scene==='fairy_between'||scene.startsWith('lair_')||scene==='mine'||scene==='dungeon')stopFor(w.title||scene,scene,...(w.entry||[20,20]),'scene');
}
fs.writeFileSync(auditOutput,JSON.stringify(result,null,2));
console.log(JSON.stringify({scenes:result.scenes.length,trees:result.scenes.filter(s=>s.trees),issues:result.issues.length,issueTypes:result.issues.reduce((a,x)=>(a[x.issue||x.kind]=(a[x.issue||x.kind]||0)+1,a),{}),stops:result.reviewStops.length,settlements:result.settlements.map(t=>[t.name,t.x,t.y])}));
`,Object.assign(ctx,{fs}));
