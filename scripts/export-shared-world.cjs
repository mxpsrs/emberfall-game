const {ctx,vm,fs}=require('./game-fixture.cjs');
vm.runInContext(`
let seed=91482;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();
// Fail publication before duplicate object IDs can misdirect server receipts.
for(const [scene,w] of Object.entries(worldScenes)){
 const ids=new Map();for(const o of w.objects){const id=String(o.id);if(ids.has(id))throw new Error('Duplicate world ID '+scene+':'+id+' ('+ids.get(id)+' / '+o.name+')');ids.set(id,o.name);}
}
`,ctx);

vm.runInContext(fs.readFileSync(__dirname+'/../dist/prebuilt-world.js','utf8'),ctx);
fs.writeFileSync(__dirname+'/../dist/world-construction.json',vm.runInContext('JSON.stringify(VeldrenPrebuiltWorld.encode())',ctx)+'\n');
vm.runInContext(`
function sharedNavigation(o,scene){
 const world=worldScenes[scene],previous=currentScene;currentScene=scene;
 const left=Math.round(o.homeX??o.x)-21,top=Math.round(o.homeY??o.y)-21,width=43,cells=[];
 const props=new Map();for(const p of world.objects.filter(p=>!fighter(p)&&!p.characterSprite&&!p.collected&&!p.walkThrough)){if(!p.propKind)props.set(p.x+':'+p.y,p);if(p.propKind)for(const [x,y]of propCollisionTiles(p))props.set(x+':'+y,p);if(p.collisionRadius)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.hypot(dx,dy)<p.collisionRadius+.3)props.set((p.x+dx)+':'+(p.y+dy),p);}
 try{for(let y=top;y<top+width;y++)for(let x=left;x<left+width;x++){
  const prop=props.get(x+':'+y),wall=worldWall(x,y)||lairRockBlocked(scene,x,y)||cavePassageBlocked(scene,x,y),decor=lairDecorBlocked(scene,x,y),building=world.buildings.some(b=>inBuilding(b,x,y));
  const sight=wall||building||prop&&(prop.type==='tree'||prop.blocksSight&&!prop.penFence&&!/fence/i.test(prop.name||''));
  const pen=o.penId&&!insideTrainingPen(x,y,1),village=o.briarhavenGoblin&&(x<GOBLIN_VILLAGE.left||x>GOBLIN_VILLAGE.right||y<GOBLIN_VILLAGE.top||y>GOBLIN_VILLAGE.bottom);
  cells.push(String((wall||decor||building||water(x,y)||prop||pen||village?1:0)+(sight?2:0)));
 }}finally{currentScene=previous;}
 return {left,top,width,cells:cells.join('')};
}
`,ctx);
const catalog=vm.runInContext(`JSON.stringify({version:2,tutorial:{version:TUTORIAL_VERSION,finishStage:tutorialSteps.findIndex(t=>t.event==='talk-finish'),finishStages:Object.fromEntries([[2,TUTORIAL_V2_EVENTS],[3,TUTORIAL_V3_EVENTS],[4,TUTORIAL_V4_EVENTS],[5,TUTORIAL_V5_EVENTS],[6,TUTORIAL_V6_EVENTS],[TUTORIAL_VERSION,tutorialSteps.map(t=>t.event)]].map(([version,events])=>[version,events.indexOf('talk-finish')]))},homeTeleport:{scene:'overworld',entry:[...BRIARHAVEN_PLAZA]},moves:ENCOUNTER_MOVES,hunts:HUNT_ENCOUNTERS,scenes:sceneSizes,entries:Object.fromEntries([...Object.entries(CREATURE_LAIRS).map(([id,lair])=>[id,lair.entry]),...Object.entries(worldScenes).filter(([,w])=>w.civilFloor).map(([id,w])=>[id,w.entry])]),civilization:{version:CIVILIZATION_VERSION,floors:[...civilFloors.keys()],upperDecks:worldScenes.overworld.buildings.filter(b=>b.civilUpper).map(b=>({building:b.service.destination,name:b.name,scene:'overworld',ramp:b.civilUpper.ramp,deck:b.civilUpper.decks[0],rise:b.civilUpper.rise})),quarries:surfaceQuarries.map(q=>({id:q.id,x:q.x,y:q.y,rx:q.rx,ry:q.ry,levels:q.levels}))},items:ITEMS,spells:SPELLS,fieldSpells:FIELD_SPELLS,relicRecipes:RELIC_RECIPES,relicAnchors:RELIC_ANCHORS,xp:SKILL_XP,trees:TREE_RESOURCES,entities:Object.fromEntries(Object.entries(worldScenes).flatMap(([scene,w])=>w.objects.filter(o=>fighter(o)||resourceDefinition(o)||o.building?.walkIn).map(o=>{const d=resourceDefinition(o);return [scene+':'+o.id,{id:String(o.id),scene,name:o.name,type:o.type,kind:o.kind,x:o.building?.walkIn?o.x:o.homeX??o.x,y:o.building?.walkIn?o.y:o.homeY??o.y,hp:o.maxhp||0,nav:fighter(o)?sharedNavigation(o,scene):null,mainStoryStage:o.mainStoryStage??null,stationary:!!o._stationary,speed:actorWalkSpeed(o),style:o.attackStyle||'melee',level:o.level||1,maxHit:o.maxHit||1,attackLevel:o.attackLevel||1,defenseLevel:o.defenseLevel||1,interval:o.interval||3.2,encounter:o.encounter||null,coins:o.coins||0,weak:o.weak||null,radius:o.combatRadius||0,respawn:o.encounter?60000:o.type==='dummy'?8000:d?d.respawn*1000:25000,resource:d?{...d,skill:{tree:'Woodcutting',ore:'Mining',fish:'Fishing'}[o.type],resourceId:o.resourceId}:null,door:o.building?.walkIn?o.destination:null,rareDrops:HUNT_ENCOUNTERS[o.encounter]?.rareDrops||null,drops:HUNT_ENCOUNTERS[o.encounter]?.drops||null,marks:HUNT_ENCOUNTERS[o.encounter]?.marks||0}];})))})`,ctx);
fs.writeFileSync(__dirname+'/../worker/shared-catalog.json',catalog+'\n');
fs.writeFileSync(__dirname+'/../worker/quest-fights.js','// Generated from dist/world.js; keep client and server phasing identical.\nexport '+vm.runInContext('questFightVisible.toString()',ctx)+'\n');
console.log('Exported '+Object.keys(JSON.parse(catalog).entities).length+' shared world entities.');

fs.writeFileSync(__dirname+'/../worker/field-rules.js', "// Generated from the browser fieldwork and relic rules.\nimport catalog from './shared-catalog.json' with {type:'json'};\nconst ITEMS=catalog.items,FIELD_SPELLS=catalog.fieldSpells,RELIC_RECIPES=catalog.relicRecipes,RELIC_ANCHORS=catalog.relicAnchors;\nfunction skillLevel(skill,xp){xp=Math.max(0,Number(xp)||0);if(skill==='Worship')return Math.min(99,1+Math.floor(Math.sqrt(xp/35)));let n=1;while(n<99&&xp>=catalog.xp[n+1])n++;return n;}\n"+['fieldEquipmentEffects','fieldSpellFailure','relicOperation'].map(name=>'export '+vm.runInContext(name+'.toString()',ctx)).join('\n')+'\n');
fs.writeFileSync(__dirname+'/../dist/world-ecology-layout.js','// Generated deterministic woodland placement; regenerated by the world exporter.\nconst ECOLOGY_LAYOUT='+vm.runInContext('JSON.stringify(ecologyLayouts)',ctx)+';\n');
