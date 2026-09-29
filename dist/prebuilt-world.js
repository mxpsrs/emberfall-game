'use strict';
// Build-time construction graph. It contains no player state or renderer resources.
// Native Scene migration and the authored editor layer remain authoritative.
(function(root){
 const bindings=()=>({
  MONSTER_ART:{get:()=>MONSTER_ART},
  sceneSizes:{get:()=>sceneSizes},
  SETTLEMENTS:{get:()=>SETTLEMENTS},
  realmRoads:{get:()=>realmRoads},
  realmSceneInfo:{get:()=>realmSceneInfo},
  settlementPlans:{get:()=>settlementPlans},
  civilFloors:{get:()=>civilFloors},
  civilWalls:{get:()=>civilWalls},
  civilStairWells:{get:()=>civilStairWells},
  civilLegacyReturns:{get:()=>civilLegacyReturns},
  questSites:{get:()=>questSites},
  questSceneryBounds:{get:()=>questSceneryBounds},
  raiderCampFootprints:{get:()=>raiderCampFootprints},
  ecologyRoads:{get:()=>ecologyRoads},
  ecologyPads:{get:()=>ecologyPads},
  propPadBuckets:{get:()=>propPadBuckets},
  RELIC_ANCHORS:{get:()=>RELIC_ANCHORS},
  CREATURE_LAIRS:{get:()=>CREATURE_LAIRS},
  TUTORS:{get:()=>TUTORS},
  TRAINING_PEN:{get:()=>TRAINING_PEN},
  tutorialWorkplaces:{get:()=>tutorialWorkplaces},
  elderObj:{get:()=>elderObj},
  campObj:{get:()=>campObj},
  shopObj:{get:()=>shopObj},
  forgeObj:{get:()=>forgeObj},
  innObj:{get:()=>innObj},
  dummyObj:{get:()=>dummyObj},
  worldScenes:{get:()=>worldScenes,set:value=>{worldScenes=value;}},
  organicRoads:{get:()=>organicRoads,set:value=>{organicRoads=value;}},
  physicalBridges:{get:()=>physicalBridges,set:value=>{physicalBridges=value;}},
  realmArtCrossings:{get:()=>realmArtCrossings,set:value=>{realmArtCrossings=value;}},
  surfaceQuarries:{get:()=>surfaceQuarries,set:value=>{surfaceQuarries=value;}},
  civilWalkableStructures:{get:()=>civilWalkableStructures,set:value=>{civilWalkableStructures=value;}},
  civilGatehouses:{get:()=>civilGatehouses,set:value=>{civilGatehouses=value;}},
  propWorkPads:{get:()=>propWorkPads,set:value=>{propWorkPads=value;}},
  propSupportPads:{get:()=>propSupportPads,set:value=>{propSupportPads=value;}},
  trainingPenGate:{get:()=>trainingPenGate,set:value=>{trainingPenGate=value;}},
  mountainLibraryHome:{get:()=>mountainLibraryHome,set:value=>{mountainLibraryHome=value;}},
  serial:{get:()=>serial,set:value=>{serial=value;}},
  mountainSerial:{get:()=>mountainSerial,set:value=>{mountainSerial=value;}},
  mainStorySerial:{get:()=>mainStorySerial,set:value=>{mainStorySerial=value;}},
  questScenerySerial:{get:()=>questScenerySerial,set:value=>{questScenerySerial=value;}},
  civilSerial:{get:()=>civilSerial,set:value=>{civilSerial=value;}},
  relicSerial:{get:()=>relicSerial,set:value=>{relicSerial=value;}},
  physicalWorldReady:{get:()=>physicalWorldReady,set:value=>{physicalWorldReady=value;}},
  kingdomsReady:{get:()=>kingdomsReady,set:value=>{kingdomsReady=value;}},
  tutorialVillageReady:{get:()=>tutorialVillageReady,set:value=>{tutorialVillageReady=value;}},
  townBuildingsOriented:{get:()=>townBuildingsOriented,set:value=>{townBuildingsOriented=value;}},
  worldGardensReady:{get:()=>worldGardensReady,set:value=>{worldGardensReady=value;}},
  tutorialIslandReady:{get:()=>tutorialIslandReady,set:value=>{tutorialIslandReady=value;}},
  creatureLairsReady:{get:()=>creatureLairsReady,set:value=>{creatureLairsReady=value;}},
  encountersReady:{get:()=>encountersReady,set:value=>{encountersReady=value;}},
  briarhavenReady:{get:()=>briarhavenReady,set:value=>{briarhavenReady=value;}},
  mountainReady:{get:()=>mountainReady,set:value=>{mountainReady=value;}},
  mainStoryReady:{get:()=>mainStoryReady,set:value=>{mainStoryReady=value;}},
  questWorldReady:{get:()=>questWorldReady,set:value=>{questWorldReady=value;}},
  raiderCampReady:{get:()=>raiderCampReady,set:value=>{raiderCampReady=value;}},
  geographyReady:{get:()=>geographyReady,set:value=>{geographyReady=value;}},
  worldDressingReady:{get:()=>worldDressingReady,set:value=>{worldDressingReady=value;}},
  civilizationReady:{get:()=>civilizationReady,set:value=>{civilizationReady=value;}},
  cavePassagesReady:{get:()=>cavePassagesReady,set:value=>{cavePassagesReady=value;}},
  fishingShoresReady:{get:()=>fishingShoresReady,set:value=>{fishingShoresReady=value;}},
  worldLightingReady:{get:()=>worldLightingReady,set:value=>{worldLightingReady=value;}},
  propPlacementReady:{get:()=>propPlacementReady,set:value=>{propPlacementReady=value;}},
  relicWorldReady:{get:()=>relicWorldReady,set:value=>{relicWorldReady=value;}},
  ecologyReady:{get:()=>ecologyReady,set:value=>{ecologyReady=value;}},
  propFootingsReady:{get:()=>propFootingsReady,set:value=>{propFootingsReady=value;}}
 });
 function encode(){
  const nodes=[],seen=new Map();
  const ref=value=>{
   if(value===undefined)return {special:'undefined'};
   if(typeof value==='number'&&!Number.isFinite(value))return {special:String(value)};
   if(value===null||typeof value!=='object'){if(typeof value==='function'||typeof value==='symbol')throw Error('Non-data world construction value');return value;}
   if(seen.has(value))return [seen.get(value)];
   const id=nodes.length;seen.set(value,id);nodes.push(null);
   if(value instanceof Map)nodes[id]=['map',[...value].map(([k,v])=>[ref(k),ref(v)])];
   else if(value instanceof Set)nodes[id]=['set',[...value].map(ref)];
   else if(Array.isArray(value))nodes[id]=['array',value.map(ref)];
   else {if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw Error('Unsupported world construction object');nodes[id]=['object',Object.entries(value).map(([k,v])=>[k,ref(v)])];}
   return [id];
  };
  return {format:'veldren.construction',version:1,roots:Object.fromEntries(Object.entries(bindings()).map(([name,b])=>[name,ref(b.get())])),nodes};
 }
 function decode(data){
  const table=bindings();
  if(data?.format!=='veldren.construction'||data.version!==1||!Array.isArray(data.nodes)||Object.keys(table).some(k=>!Object.hasOwn(data.roots||{},k)))throw Error('Incompatible prebuilt world');
  const values=data.nodes.map(([kind])=>kind==='map'?new Map():kind==='set'?new Set():kind==='array'?[]:kind==='object'?{}:null);
  const ref=value=>{if(Array.isArray(value)){if(value.length!==1||!Number.isInteger(value[0])||value[0]<0||value[0]>=values.length)throw Error('Invalid world reference');return values[value[0]];}if(value&&typeof value==='object'){if(value.special==='undefined')return undefined;if(value.special==='Infinity')return Infinity;if(value.special==='-Infinity')return -Infinity;if(value.special==='NaN')return NaN;throw Error('Invalid world value');}return value;};
  // Bind const roots before resolving any links so lexical gameplay references
  // and cyclic door/building relationships retain exactly the same identity.
  for(const [name,b]of Object.entries(table))if(!b.set){const index=data.roots[name]?.[0];if(!Number.isInteger(index))throw Error('Invalid construction root');values[index]=b.get();}
  // Validate the entire graph before changing any existing runtime object.
  for(const [kind,entries]of data.nodes){if(!['map','set','array','object'].includes(kind)||!Array.isArray(entries))throw Error('Invalid construction node');for(const entry of entries){if(kind==='map'){ref(entry[0]);ref(entry[1]);}else if(kind==='object'){if(typeof entry[0]!=='string'||['__proto__','prototype','constructor'].includes(entry[0]))throw Error('Invalid construction key');ref(entry[1]);}else ref(entry);}}
  data.nodes.forEach(([kind,entries],i)=>{const value=values[i];if(kind==='map'){value.clear();for(const [k,v]of entries)value.set(ref(k),ref(v));}else if(kind==='set'){value.clear();for(const v of entries)value.add(ref(v));}else if(kind==='array'){value.length=0;for(const v of entries)value.push(ref(v));}else{for(const key of Object.keys(value))delete value[key];for(const [k,v]of entries)value[k]=ref(v);}});
  for(const [name,b]of Object.entries(table))if(b.set)b.set(ref(data.roots[name]));
 }
 function eligible(){
  // Old layout saves retain their original migration sequence unchanged.
  return !s.character&&!s.worldScale&&s.tutorial===0 || s.worldScale===3&&s.buildingLayoutVersion===BUILDING_LAYOUT_VERSION&&s.kitchenLayoutVersion===KITCHEN_LAYOUT_VERSION&&s.tutorialIslandVersion===FIRSTLIGHT_LAYOUT_VERSION&&s.briarhavenLayoutVersion===BRIARHAVEN_LAYOUT&&s.civilizationVersion===CIVILIZATION_VERSION;
 }
 function resume(){
  const fresh=!s.worldScale,completed=tutorialComplete(s);
  s.worldScale=3;s.buildingLayoutVersion=BUILDING_LAYOUT_VERSION;s.kitchenLayoutVersion=KITCHEN_LAYOUT_VERSION;s.briarhavenLayoutVersion=BRIARHAVEN_LAYOUT;s.civilizationVersion=CIVILIZATION_VERSION;
  s.frontier=s.frontier||{quest:0,accepted:false,kills:0};
  s.worldClock=worldCycleSeconds();s.bag.herbs=s.bag.herbs||0;s.xp.Farming=s.xp.Farming||0;
  ITEMS.herbs={name:'Fresh herbs',icon:14,atlas:'environment',desc:'Harvested on the farm. Eat to restore 6 health, or sell at a shop.'};
  normalizeJourney(s);
  let scene=completed?(s.sceneId===TUTORIAL_SCENE?'overworld':s.sceneId||'overworld'):TUTORIAL_SCENE;
  let point=fresh?TUTORIAL_ENTRY:completed&&s.sceneId===TUTORIAL_SCENE?MAINLAND_ENTRY:[s.x,s.y];
  if(civilLegacyReturns.has(scene)){point=civilLegacyReturns.get(scene);scene='overworld';}
  if(!worldScenes[scene]){scene='overworld';point=MAINLAND_ENTRY;}
  roadBuckets=null;realmNavigation.clear();resetLandSurface();miniTerrain=null;mapServicesCache=null;worldObjectRevision++;worldObjectIndex=null;
  restoreWalkInDoors(worldScenes[scene],{scene:'overworld',x:point[0],y:point[1]});
  activateScene(scene,...point,false);
  s.insideBuilding=buildings.find(b=>withinWalkIn(b,s.x,s.y))?.service.destination||null;
  applyStoryIdentity();if(s.tutorial>2)s.storyOpeningSeen=true;
  setupSpirits();huntProgress();syncMainStoryWorld();syncMountainWorld();
  if(!mountainCanEnter(currentScene)){const at=CREATURE_LAIRS[currentScene]?.returnPoint;if(at)activateScene('overworld',...at,false);}
  $('ambientButton').onclick=toggleAmbient;$('leaveInterior').onclick=leaveInterior;
  if(window.VELDREN_CONTEXT!=='editor')canvas.addEventListener('pointerdown',()=>{if(s.sound!==false&&!ambient)startAmbient();},{once:true});
  document.addEventListener('visibilitychange',()=>{if(ambient){if(document.hidden)ambient.context.suspend();else if(ambientEnabled)ambient.context.resume();}});
  renderTutorial();
 }
 async function load(){
  if(!eligible())return false;
  let data;
  try{const response=await fetch(realmAssetURL('world-construction.json'));if(!response.ok)throw Error('Prebuilt world unavailable');data=await response.json();}
  catch(error){console.warn('Using world generation:',error.message);return false;}
  decode(data);data=null;resume();return true;
 }
 root.VeldrenPrebuiltWorld={encode,decode,eligible,resume,load};
})(globalThis);
