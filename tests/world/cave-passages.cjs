const {ctx,vm}=require('../../scripts/qa/game-fixture.cjs');
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;s.character={name:'Cave review'};s.tutorial=38;s.tutorialReward=true;s.mainStoryQuest={stage:25};s.mountainQuest={stage:20,lairKey:true};screen={w:800,h:390};
let pairs=0,furnishings=0,apertures=0,shoulders=0;
for(const [id,w]of Object.entries(worldScenes)){
 const kind=cavePassageKind(id);if(!kind)continue;
 const door=worldScenes.overworld.objects.find(o=>o.type==='door'&&o.destination===id);assert(door,id+' has a surface entrance');assert.equal(door.passageKind,kind);assert.equal(w.exit.passageKind,kind);
 activateScene('overworld',door.x,door.y+2);assert(route(door.x,door.y,true,1.45)!==null,id+' surface access');enterInterior(door);assert.equal(currentScene,id);assert(land(s.x,s.y),id+' safe arrival');assert(route(w.exit.x,w.exit.y,true,1.45)!==null,id+' exit reachable');
 assert(worldOptionsFor(w.exit)[0][0].startsWith(kind==='ladder'?'Climb up':'Leave through'));assert(worldOptionsFor(door)[0][0].startsWith(kind==='ladder'?'Climb down':'Enter'));
 if(CREATURE_LAIRS[id]){
  const lair=CREATURE_LAIRS[id];assert(route(...(lair.spawn||lair.arena),true,4)!==null,id+' arena connected');
  for(const o of w.decor.filter(o=>o.kind==='model'&&/^World_/.test(o.model)||o.kind==='hearth')){assert(caveFurnitureFits(id,o),id+' '+(o.model||o.kind)+' entirely on floor and clear of rocks');furnishings++;}
  for(const o of w.objects.filter(o=>o.characterSprite||o.mainStoryKey||o.mountainKey))assert(route(o.x,o.y,true,1.45)!==null,id+' '+o.name+' reachable');
  const nav=realmNav();for(let z=0;z<nav.h;z++)for(let x=0;x<nav.w;x++)if(!worldWall(x,z)&&lairRockBlocked(id,x,z)){assert(realmCellBlocked(nav,z*nav.w+x),'visible rock blocks movement');shoulders++;}
 }
 const base={face(){},indexed(){},skinned(){}};
 for(const o of [w.exit,door]){
  if(o===door)activateScene('overworld',door.x,door.y+2);
  else activateScene(id);
  if(kind==='cave'){
   for(const yaw of [-1,.5,3.14]){view3d.yaw=yaw;const polygon=caveOpeningPolygon3(o),q=polygon.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});hitboxes=[{o,polygon,depth:0}];assert.equal(worldHits3(q.x,q.y)[0]?.o,o,'visible mouth selects at camera angle');assert.equal(worldPick({clientX:q.x,clientY:q.y}).objects[0],o,'context menu uses same mouth');assert.equal(worldHits3(-10000,-10000).length,0);apertures++;}
  }else{const capture=capturePickGeometry3(base);prop3(capture.painter,o,o.x+.5,o.y+.5);assert(capture.geometry.length>8,'ladder rails and rungs render');const hatch=capture.geometry.find(c=>c.points?.length===4),q=hatch.points.reduce((a,p)=>{const t=project3(...p);return {x:a.x+t.x/4,y:a.y+t.y/4}},{x:0,y:0});assert(pickGeometry3(capture.geometry,q.x,q.y),'shaft/hatch target selectable');}
 }
 activateScene(id);handleWorldInteraction(w.exit);assert.equal(currentScene,'overworld','physical exit leaves '+id);assert(land(s.x,s.y),'safe return');pairs++;
}
activateScene('story_mine');for(const key of ['bera','oren']){const o=mainStoryObject(key);assert(o.x>=4&&o.x<22&&o.y>=5&&o.y<24,'miners inhabit connected refuge');}
// Both story gates still prevent premature entry after passage presentation changes.
activateScene('overworld');s.mountainQuest={stage:0};enterInterior(worldScenes.overworld.objects.find(o=>o.destination==='quest_underiron'));assert.equal(currentScene,'overworld');
// Click feedback follows the aperture, rather than sending movement to the rock.
s.mountainQuest={stage:20,lairKey:true};activateScene('story_mine');const exit=worldScenes.story_mine.exit,polygon=caveOpeningPolygon3(exit),q=polygon.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});hitboxes=[{o:exit,polygon,depth:0}];let selected=null,walked=false;select=o=>selected=o;walkTo=()=>walked=true;$('modal').open=$('creator').open=$('spiritsDialog').open=false;clickWorld3({clientX:q.x,clientY:q.y});assert.equal(selected,exit);assert(!walked);assert(worldClickFeedback.interaction);
assert(pairs>=11&&furnishings>=50&&shoulders>500);console.log('PASS: '+pairs+' paired entrances/exits, '+apertures+' projected cave apertures, '+furnishings+' grounded furnishings, '+shoulders+' solid rock shoulder cells; connected objectives/refuge, ladders, story gate, context menu and red click feedback.');
`,ctx);
