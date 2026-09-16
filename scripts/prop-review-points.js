// Shared by disposable browser review and the production-renderer capture harness.
function propReviewPoint(name){
 const world=worldScenes.overworld,b=world.buildings.find(b=>b.settlement==='ironhollow'&&b.civilCastle);
 const small=world.buildings.find(b=>b.service?.destination==='civil_briarhaven_0');
 const upper=world.buildings.find(b=>b.settlement==='briarhaven'&&b.usableUpper&&b.archetype==='house');
 const elven=world.buildings.find(b=>b.race==='elf'&&b.civilCastle);
 const town=id=>{const t=SETTLEMENTS.find(t=>t.id===id);return ['overworld',t.x,t.y+4];};
 const points={
  'small-house':['overworld',small.x+5,small.y+6],
  'two-story-house':[upper.usableUpper,5,6],
  tavern:['overworld',40,45],shop:['overworld',70,56],
  library:['overworld',b.x+8,b.y+7],
  'castle-hall':['overworld',b.x+24,b.y+12],
  'castle-council':['overworld',b.x+8,b.y+16],
  'castle-guard':['overworld',b.x+40,b.y+6],
  'castle-kitchen':['overworld',b.x+40,b.y+16],
  'castle-barracks':['overworld',b.x+7,b.y+29],
  'castle-armory':['overworld',b.x+41,b.y+29],
  'castle-courtyard':['overworld',b.x+24,b.y+29],
  'castle-study':[b.service.destination+'_upper',40,7],
  'castle-cellar':[b.service.destination+'_lower',40,6],
  'castle-bedroom':[b.service.destination+'_upper',8,7],
  dungeon:[b.service.destination+'_lower',8,18],
  square:['overworld',55,62],'ironhollow-street':town('ironhollow'),
  quarry: ['overworld',858,164],market:town('crownreach'),
  'road-night':['overworld',64,69],'goblin-bridge':['overworld',107,105],
  'dwarven-workshop':['overworld',861,306],
  'elven-library':['overworld',elven.x+8,elven.y+7],
  'firstlight-kitchen':['tutorial',78,69],
  'abandoned-quarry':['overworld',280,307]
 };
 if(!points[name])throw new Error('Unknown prop review '+name);
 return points[name];
}
function visitPropReview(name){
 const [scene,x,y]=propReviewPoint(name);s.tutorial=scene==='tutorial'?0:tutorialSteps.length;s.tutorialReward=scene!=='tutorial';activateScene(scene);
 for(const b of buildings)if(b.walkIn)setWalkInDoor(b.service,true,true);
 let at=null;for(let r=0;r<=6&&!at;r++)for(let dy=-r;dy<=r&&!at;dy++)for(let dx=-r;dx<=r&&!at;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r&&land(x+dx,y+dy))at=[x+dx,y+dy];
 if(!at)throw new Error('No review position near '+name);activateScene(scene,...at);
}
