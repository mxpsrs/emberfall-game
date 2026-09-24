const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
renderUI=renderAction=renderTutorial=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
s.tutorial=tutorialSteps.length;s.tutorialReward=true;activateScene('overworld',55,61,false);
assert(propFootingsReady);let checked=0;
for(const o of objects.filter(o=>o.propKind==='tent'&&o.name==='Brambleclaw tent'||o.quarry&&['crane','workbench','storage','cart','stoneStock'].includes(o.propKind))){
 const b=propBox(o),h=[[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom],[o.x+.5,o.y+.5]].map(p=>walkSurfaceHeight(...p));
 assert(Math.max(...h)-Math.min(...h)<.25,o.name+' at '+o.x+','+o.y+' has sloped footing '+JSON.stringify(h));checked++;
}
assert(checked>=25);
const exceptions=[];
for(const [scene,w] of Object.entries(worldScenes)){
 currentScene=scene;objects.splice(0,objects.length,...w.objects);buildings.splice(0,buildings.length,...w.buildings);resetLandSurface();
 for(const o of objects.filter(o=>o.placement)){
  const b=propBox(o),samples=[[o.x+.5,o.y+.5],[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom]],heights=samples.map(p=>o.civilUpper?walkSurfaceHeight(...p):currentScene==='overworld'?civilWalkHeightBefore(...p):walkSurfaceHeight(...p)),spread=Math.max(...heights)-Math.min(...heights);
  if(!heights.every(Number.isFinite)||spread>.3)exceptions.push({scene,id:o.id,name:o.name,spread,position:[o.x,o.y]});
 }
}
assert.deepEqual(exceptions,[],'every placed prop has a stable final support surface');
assert(propSupportPads.length>0,'final terrain audit exercised support pads');
for(const q of surfaceQuarries)for(let y=q.y-8;y<=q.y+q.ry+6;y++)for(const dx of [-2,0,2]){
 currentScene='overworld';
 const expected=gradeLand(q.x+dx,y,0);assert.equal(propWorkFootingHeight(q.x+dx,y,expected),expected,'preserve quarry access ramp');
}
console.log('PASS: '+checked+' shelter/quarry footprints and every placed prop are level after final smoothing; all five quarry ramps preserved.');
`,ctx);
