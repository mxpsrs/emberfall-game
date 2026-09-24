const {ctx,vm,fs}=require('../scripts/game-fixture.cjs');
const {createCanvas,Path2D}=require('@napi-rs/canvas');
ctx.Path2D=Path2D;
const oldCreate=ctx.document.createElement;
ctx.document.createElement=type=>type==='canvas'?createCanvas(64,64):oldCreate(type);
const map=createCanvas(900,600),mini=createCanvas(300,300),labels=[];
const g=map.getContext('2d'),fill=g.fillText.bind(g);
g.fillText=(text,...args)=>{labels.push(text);return fill(text,...args);};
Object.assign(ctx.document.getElementById('localMap'),{width:900,height:600,getContext:()=>g,getBoundingClientRect:()=>({left:20,top:10,width:900,height:600})});
Object.assign(ctx.document.getElementById('minimap'),{width:300,height:300,getContext:()=>mini.getContext('2d'),getBoundingClientRect:()=>({left:800,top:10,width:180,height:180})});
ctx.quarryLabels=labels;
fs.mkdirSync('.qa/quarry-maps',{recursive:true});
ctx.captureQuarryMap=name=>fs.writeFileSync('.qa/quarry-maps/'+name+'.png',map.toBuffer('image/png'));
ctx.captureQuarryMini=name=>fs.writeFileSync('.qa/quarry-maps/'+name+'-minimap.png',mini.toBuffer('image/png'));
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};
setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
s.character={name:'Quarry surveyor'};s.tutorial=tutorialSteps.length;s.tutorialReward=true;
activateScene('overworld',55,61,false);
const sites=collectMapServices().filter(e=>e.quarry);assert.equal(sites.length,5);assert.equal(new Set(sites.map(e=>e.id)).size,5);
for(const e of sites){
 assert.equal(mapIconFor(e),'mine');assert(e.tags.includes('mine'));assert(e.detail.includes('Surface Mining'));assert(e.detail.includes('pickaxe'));
 const q=e.quarry,goal=mapTravelGoal(e);assert(goal.walk&&!goal.target,'quarry travel uses the real access ramp, not an invented interactable');
 assert.equal(goal.x,q.x);assert.equal(goal.y,q.y+q.ry+5);
 activateScene('overworld',goal.x,goal.y,false);assert(land(goal.x,goal.y));
 const ores=objects.filter(o=>o.type==='ore'&&o.quarry===q.id);assert(ores.length>=2);
 for(const ore of ores){assert(route(ore.x,ore.y,true),e.name+' reachable ore '+ore.resourceId);const r=resourceDefinition(ore);assert(e.detail.includes(r.name+' (Mining '+r.level+')'));}
 if(q.id!=='deepforge')assert(ores.some(o=>resourceDefinition(o).level===1),'starter surface ore at '+q.id);
 time+=1;miniTerrain=null;view3d.yaw=0;drawMinimap();assert(miniServiceMarkers.some(m=>m.entry.id===e.id),'quarry icon visible from the work road');captureQuarryMini(q.id);
}
s.tutorial=0;s.tutorialReward=false;activateScene('tutorial',42,51,false);assert.equal(currentScene,'tutorial');const original=[currentScene,px,py];worldMap();
assert.deepEqual([currentScene,px,py],original,'viewing mainland sites preserves the real tutorial scene');
for(const e of sites){assert(quarryLabels.includes(e.name),'full atlas names '+e.name);assert(localMapState.markers.some(m=>m.entry.id===e.id));}
assert.equal(withAtlasWorld(()=>atlasEntries(localMapBounds(),'all')).filter(e=>e.quarry).length,5,'quarries are listed before zooming');
captureQuarryMap('world-desktop');
localMapState.filter='mine';renderLocalMap();assert.equal(localMapState.markers.filter(m=>m.entry.quarry).length,5);captureQuarryMap('mining-desktop');
const mapCanvas=$('localMap');mapCanvas.getBoundingClientRect=()=>({left:20,top:10,width:450,height:300});renderLocalMap();captureQuarryMap('mining-landscape');
const marker=localMapState.markers.find(m=>m.entry.id===sites[0].id),event={button:0,pointerId:5,clientX:20+marker.x/2,clientY:10+marker.y/2,preventDefault(){}};
mapCanvas.listeners.pointerdown(event);mapCanvas.listeners.pointerup(event);assert.equal(localMapState.selected,sites[0].id,'scaled touch picks the quarry');
let walked=null;const originalWalk=walkTo;walkTo=(x,y)=>walked=[x,y];let notice='';toast=text=>notice=text;
$('mapSelection').children.at(-1).onclick();assert.equal(walked,null);assert(notice.includes('Firstlight'),'quarry routing cannot bypass tutorial');
s.tutorial=tutorialSteps.length;s.tutorialReward=true;activateScene('overworld',sites[0].x,sites[0].y,false);localMapState.player=[px,py];renderLocalMap();$('mapSelection').children.at(-1).onclick();assert.deepEqual(walked,[sites[0].x,sites[0].y]);walkTo=originalWalk;
console.log('PASS: five named quarries, proper Mining icons, all surface ore access and skill requirements, atlas/list/filter/minimap visibility, scaled touch selection and safe travel with tutorial gating.');
`,ctx);
