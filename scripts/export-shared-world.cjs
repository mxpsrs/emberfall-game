const {ctx,vm,fs}=require('./game-fixture.cjs');
vm.runInContext(`
let seed=91482;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
`,ctx);
vm.runInContext(`
function sharedNavigation(o,scene){
 const world=worldScenes[scene],previous=currentScene;currentScene=scene;
 const left=Math.round(o.homeX??o.x)-21,top=Math.round(o.homeY??o.y)-21,width=43,cells=[];
 const props=new Map(world.objects.filter(p=>!fighter(p)&&!p.characterSprite&&!p.collected&&!p.walkThrough).map(p=>[p.x+':'+p.y,p]));
 try{for(let y=top;y<top+width;y++)for(let x=left;x<left+width;x++){
  const prop=props.get(x+':'+y),wall=worldWall(x,y),building=world.buildings.some(b=>inBuilding(b,x,y));
  const sight=wall||building||prop&&(prop.type==='tree'||prop.blocksSight&&!prop.penFence&&!/fence/i.test(prop.name||''));
  const pen=o.penId&&!insideTrainingPen(x,y,1),village=o.briarhavenGoblin&&(x<GOBLIN_VILLAGE.left||x>GOBLIN_VILLAGE.right||y<GOBLIN_VILLAGE.top||y>GOBLIN_VILLAGE.bottom);
  cells.push(String((wall||building||water(x,y)||prop||pen||village?1:0)+(sight?2:0)));
 }}finally{currentScene=previous;}
 return {left,top,width,cells:cells.join('')};
}
`,ctx);
const catalog=vm.runInContext(`JSON.stringify({version:2,tutorial:{version:TUTORIAL_VERSION,finishStage:tutorialSteps.findIndex(t=>t.event==='talk-finish'),finishStages:Object.fromEntries([[2,TUTORIAL_V2_EVENTS],[3,TUTORIAL_V3_EVENTS],[4,TUTORIAL_V4_EVENTS],[5,TUTORIAL_V5_EVENTS],[6,TUTORIAL_V6_EVENTS],[TUTORIAL_VERSION,tutorialSteps.map(t=>t.event)]].map(([version,events])=>[version,events.indexOf('talk-finish')]))},moves:ENCOUNTER_MOVES,hunts:HUNT_ENCOUNTERS,scenes:sceneSizes,items:ITEMS,spells:SPELLS,spirits:SPIRITS,xp:SKILL_XP,trees:TREE_RESOURCES,entities:Object.fromEntries(Object.entries(worldScenes).flatMap(([scene,w])=>w.objects.filter(o=>fighter(o)||resourceDefinition(o)||o.building?.walkIn).map(o=>{const d=resourceDefinition(o);return [scene+':'+o.id,{id:String(o.id),scene,name:o.name,type:o.type,kind:o.kind,x:o.building?.walkIn?o.x:o.homeX??o.x,y:o.building?.walkIn?o.y:o.homeY??o.y,hp:o.maxhp||0,nav:fighter(o)?sharedNavigation(o,scene):null,mainStoryStage:o.mainStoryStage??null,stationary:!!o._stationary,speed:actorWalkSpeed(o),style:o.attackStyle||'melee',level:o.level||1,maxHit:o.maxHit||1,attackLevel:o.attackLevel||1,defenseLevel:o.defenseLevel||1,interval:o.interval||3.2,encounter:o.encounter||null,coins:o.coins||0,weak:o.weak||null,radius:o.combatRadius||0,respawn:o.encounter?60000:o.type==='dummy'?8000:d?d.respawn*1000:25000,resource:d?{...d,skill:{tree:'Woodcutting',ore:'Mining',fish:'Fishing'}[o.type],resourceId:o.resourceId}:null,door:o.building?.walkIn?o.destination:null,drops:HUNT_ENCOUNTERS[o.encounter]?.drops||null,marks:HUNT_ENCOUNTERS[o.encounter]?.marks||0}];})))})`,ctx);
fs.writeFileSync(__dirname+'/../worker/shared-catalog.json',catalog+'\n');
console.log('Exported '+Object.keys(JSON.parse(catalog).entities).length+' shared world entities.');
