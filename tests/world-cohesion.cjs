const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
draw=drawPortrait=renderUI=renderTutorial=renderAction=save=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();setupLoot();assetsReady=true;
s.character={name:'World checker'};s.tutorial=38;s.tutorialReward=true;activateScene('overworld',55,61);
const wet=[];let ranges=0,rooms=0;
for(const scene of ['overworld','tutorial']){
 currentScene=scene;const world=worldScenes[scene];
 for(const b of world.buildings){
  for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)if(worldWaterDistance(x+.5,y+.5)<0)wet.push(b.name+' at '+x+','+y);
  if(!b.walkIn||!b.service)continue;rooms++;
  const heights=[];for(let y=b.y+1;y<b.y+b.h-1;y++)for(let x=b.x+1;x<b.x+b.w-1;x++)heights.push(landHeight(x+.5,y+.5));assert(Math.max(...heights)-Math.min(...heights)<.12,b.name+' has a level floor after all grading');
  const props=world.objects.filter(o=>o.interiorBuilding===b.service.destination&&o.furnished);
  for(const o of props){assert(o.x>b.x&&o.x<b.x+b.w-1&&o.y>b.y&&o.y<b.y+b.h-1,o.name+' outside '+b.name);if(o.type==='range'){ranges++;assert(o.placement?.wall,'range has a wall anchor');}}
  for(let i=0;i<props.length;i++)for(let j=i+1;j<props.length;j++)assert(!propBoxesOverlap(propBox(props[i]),propBox(props[j])),'overlapping furniture in '+b.name);
 }
}
assert.deepEqual(wet,[],'all building footprints stay dry');assert(ranges>=2,'both mainland and tutorial ranges checked');assert(rooms>=180);
currentScene='overworld';objects.splice(0,objects.length,...worldScenes.overworld.objects);buildings.splice(0,buildings.length,...worldScenes.overworld.buildings);
assert(WORLD_FORESTS.every(f=>objects.filter(o=>o.forest===f.name).length>=5),'every named forest has actual trees');
for(const o of objects.filter(o=>o.forest||o.settlementTree)){assert(!water(o.x,o.y),o.name+' in water');assert(!buildings.some(b=>o.x>b.x-4&&o.x<b.x+b.w+4&&o.y>b.y-4&&o.y<b.y+b.h+4),'tree clips building');assert(roadInfluence(o.x+.5,o.y+.5)[0]<.04,'tree blocks a street');}
for(const l of WORLD_LAKES){assert(worldWaterSurface(l.x,l.y),l.name+' is actual water');for(let y=l.y-l.ry-8;y<=l.y+l.ry+8;y++)for(let x=l.x-l.rx-8;x<=l.x+l.rx+8;x++)for(const [dx,dy]of [[1,0],[0,1]])assert(worldWaterDistance(x,y)<0&&worldWaterDistance(x+dx,y+dy)<0||Math.abs(worldWaterDistance(x+dx,y+dy)-worldWaterDistance(x,y))<2.5,l.name+' has a continuous shoreline distance');}
const east=[200,300,400,500,600].map(y=>geographyCurve(COAST_EAST,y));assert(Math.max(...east)-Math.min(...east)>120,'substantial coastline variation');
assert(Math.abs(geographyCurve(IRON_RIVER,120)-geographyCurve(IRON_RIVER,390))>60,'river visibly meanders');
for(const b of bridgesInRealm()){assert(worldWaterSurface(b.x,b.z),'bridge spans actual water');assert(!water(Math.floor(b.x),Math.floor(b.z)),'bridge remains walkable');}
// Open every house and traverse the real navigation grid once, including all kingdoms.
for(const b of buildings)if(b.walkIn)setWalkInDoor(b.service,true,true);
const nav=realmNav(),seen=new Uint8Array(nav.w*nav.h),queue=new Int32Array(nav.w*nav.h);let read=0,write=0;const start=61*nav.w+55;queue[write++]=start;seen[start]=1;
while(read<write){const id=queue[read++],x=id%nav.w,y=Math.floor(id/nav.w);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,n=b*nav.w+a;if(a<0||b<0||a>=nav.w||b>=nav.h||seen[n]||realmCellBlocked(nav,n))continue;seen[n]=1;queue[write++]=n;}}
const unreachable=[];for(const o of objects.filter(o=>!o.interiorBuilding&&(resourceDefinition(o)||o.tutor||o.characterSprite||o.passageKind||o.mainStoryKey||o.mountainKey))){const x=Math.round(o.homeX??o.x),y=Math.round(o.homeY??o.y);if(![[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1],[0,0]].some(([dx,dy])=>seen[(y+dy)*nav.w+x+dx]))unreachable.push({id:o.id,name:o.name,type:o.type,x,y});}assert.deepEqual(unreachable,[],'all resources and interactions connected');
for(const t of SETTLEMENTS)assert([[-3,0],[3,0],[0,-3],[0,3],[0,0]].some(([dx,dy])=>seen[(t.y+dy)*nav.w+t.x+dx]),t.name+' connected to Briarhaven');
for(const b of buildings)if(b.walkIn){const [x,y]=doorApproach(b.service,true);assert(seen[y*nav.w+x],b.name+' interior reachable');}
localMapState={span:1152,x:576,y:384};assert.deepEqual(localMapBounds(),{x:0,y:0,w:1152,h:768});
const atlas=atlasEntries(localMapBounds(),'all');assert.equal(atlas.filter(e=>e.settlement).length,13);assert.equal(atlas.filter(e=>e.quarry).length,surfaceQuarries.length);assert.equal(ATLAS_KINGDOM_LABELS.length,3);
const oldScene=currentScene,oldObjects=[...objects];localMapState.player=[55,61];withAtlasWorld(()=>assert.equal(currentScene,'overworld'));assert.equal(currentScene,oldScene);assert.deepEqual(objects,oldObjects,'map never changes the player scene');
console.log('PASS: '+rooms+' house interiors, both wall-mounted ranges, furniture spacing, dry buildings, real forest clusters, clear streets, winding water, every bridge, all 13 connected settlements, all room entrances, whole-world bounds and labels.');
`,ctx);
