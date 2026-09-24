const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
draw=()=>{};drawPortrait=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();
s.tutorial=tutorialSteps.length;s.tutorialReward=true;s.mainStoryQuest={stage:25};s.mountainQuest={stage:20,lairKey:true};
activateScene('overworld',55,61,false);
for(const b of buildings)if(b.walkIn)setWalkInDoor(b.service,true,true);
assert.equal(surfaceQuarries.length,5);assert.equal(worldScenes.overworld.objects.filter(o=>o.briarhavenGoblin).length,15);
for(const plan of settlementPlans.values()){
 assert(plan.purpose&&plan.industry&&plan.water&&plan.population>0&&plan.terrain);
 assert(plan.roads.some(r=>r.role==='main road'));assert(plan.landmark);assert(Number.isFinite(landHeight(...plan.center)),plan.id+' finite terrain');
 const count=buildings.filter(b=>b.settlement===plan.id).length;
 if(plan.settlementClass==='small village')assert(count>=4&&count<=10,plan.id+' hamlet count');
 if(plan.settlementClass==='large village')assert(count>=10&&count<=20,plan.id+' village count');
}
const errors=[];
for(const b of buildings.filter(b=>b.civilCastle)){
 assert(b.civilRooms.length>=7);assert(b.civilRooms.some(r=>r.name==='Library'));
 setWalkInDoor(b.service,false,true);const [gx,gy]=doorThreshold(b.service);assert(inBuilding(b,gx,gy),'closed gate blocks its threshold');assert(inBuilding(b,gx-1,gy)&&inBuilding(b,gx+1,gy),'curtain wall has no side bypass');setWalkInDoor(b.service,true,true);assert(!inBuilding(b,gx,gy),'open gate is traversable');
 const start=[b.x+24,b.y+27];activateScene('overworld',...start,false);
 for(const o of objects.filter(o=>o.interiorBuilding===b.service.destination&&(o.civilStair||o.mountainKey||o.characterSprite))){const p=route(o.x,o.y,true);if(!p)errors.push('Castle inaccessible: '+b.name+' / '+o.name+' '+o.x+','+o.y);}
 assert(b.civilRampart&&b.civilRampart.rise>=4,'castle has a full-height walkable rampart');
 const ramp=b.civilRampart.ramp,low=[ramp.x+1,ramp.y+ramp.h-1],high=[ramp.x+1,ramp.y];activateScene('overworld',...low,false);const rampRoute=route(...high);assert(rampRoute&&rampRoute.length>=8,b.name+' rampart uses a continuous traversable stair run');assert.equal(currentScene,'overworld',b.name+' stair route stays in the live town scene');
 assert(walkSurfaceHeight(high[0]+.5,high[1]+.5)-walkSurfaceHeight(low[0]+.5,low[1]+.5)>3.5,b.name+' stair reaches a real upper elevation');
 const physicalStair=objects.find(o=>o.civilRampartStair===b.civilRampart);assert(physicalStair&&physicalStair.walkThrough&&!physicalStair.civilStair,b.name+' rampart is geometry, not a scene-loading interaction');
}
assert(CIVIL_ARCHITECTURE_SCALE.cityGateTowerFootprint>=11&&CIVIL_ARCHITECTURE_SCALE.cityGateTowerDepth>=13,'city gate towers use full guardroom-scale footprints');
assert(CIVIL_ARCHITECTURE_SCALE.cityGateDoorWidth>=2&&CIVIL_ARCHITECTURE_SCALE.cityGateDoorHeight>=3,'city gate tower entrances are visibly player-sized');
assert.equal(civilGatehouses.length,SETTLEMENTS.filter(t=>t.capital).length*3,'every capital entrance is a complete gatehouse');
for(const gate of civilGatehouses){assert.equal(gate.towers.length,2,gate.town+' gatehouse has two structural towers');for(const tower of gate.towers){assert(tower.structure?.rampLine&&tower.structure.rise>=5,gate.town+' gate tower has physical stairs and an upper walk');const horizontal=Math.abs(Math.cos(gate.turn))>.5,front=horizontal?[Math.round(tower.x),tower.top]:[tower.left,Math.round(tower.z)],corner=[tower.left,tower.top];assert(!civilWalls.get('overworld').has(front.join(':')),gate.town+' guardroom door is an actual collision opening');assert(civilWalls.get('overworld').has(corner.join(':')),gate.town+' tower shell has structural collision');const overlaps=worldScenes.overworld.buildings.filter(b=>b.x<tower.left+tower.width&&b.x+b.w>tower.left&&b.y<tower.top+tower.depth&&b.y+b.h>tower.top);assert.deepEqual(overlaps.map(b=>b.name),[],gate.town+' gate tower has its own architectural footprint instead of occupying another building');}}
{const tower=civilGatehouses[0].towers[0],low=tower.low.map(Math.floor),high=tower.high.map(Math.floor);activateScene('overworld',...low,false);const gateRoute=route(...high);assert(gateRoute&&gateRoute.length>=8,'city gate stair is continuously walkable');assert.equal(currentScene,'overworld','city gate stair never loads another scene');assert(walkSurfaceHeight(high[0]+.5,high[1]+.5)-walkSurfaceHeight(low[0]+.5,low[1]+.5)>4.5,'city gate stair reaches the upper guard walk');}
assert(CIVIL_ARCHITECTURE_SCALE.castleGateWidth>=4.5&&CIVIL_ARCHITECTURE_SCALE.castleGateHeight>=5.5,'castle gate opening is visibly larger than a player');
for(const [id,floor]of civilFloors){activateScene(id,...worldScenes[id].entry,false);assert(land(s.x,s.y),id+' entry');
 assert(/_lower$|_cellar$/.test(id),id+' is an intentional subterranean scene');
 const runs=civilWallRuns(floor.walls),covered=new Set();assert(runs.some(run=>run.axis==='x'),id+' has horizontal wall faces');assert(runs.some(run=>run.axis==='y'),id+' has vertical wall faces');
 for(const run of runs)for(let i=0;i<run.length;i++)covered.add((run.x+(run.axis==='x'?i:0))+':'+(run.y+(run.axis==='y'?i:0)));assert.deepEqual([...covered].sort(),[...floor.walls.keys()].sort(),id+' renders every structural wall tile');
 const wallDraws=[];const wallRecorder={indexed:(mesh,matrix)=>wallDraws.push({mesh,matrix}),face(){}};for(const tile of floor.walls.values())drawRealmWall(wallRecorder,tile.x,tile.y);assert.equal(wallDraws.length,floor.walls.size,id+' production wall path renders every wall');assert(wallDraws.some(o=>Math.abs(o.matrix[0])<.01&&Math.abs(o.matrix[2])>.9),id+' production wall path rotates side walls');
 for(const o of objects.filter(o=>o.civilStair||o.characterSprite)){if(!route(o.x,o.y,true))errors.push('Floor inaccessible: '+id+' / '+o.name);}
 for(const room of floor.rooms){const inside=[];for(let y=room.y+1;y<room.y+room.h-1;y++)for(let x=room.x+1;x<room.x+room.w-1;x++)if(land(x,y))inside.push([x,y]);if(!inside.some(p=>route(...p)))errors.push('Room inaccessible: '+id+' / '+room.name);}
 const stair=objects.find(o=>o.civilStair);assert(stair&&stair.civilStair.kind);assert(worldScenes[stair.civilStair.destination]);
 const approach=route(stair.x,stair.y,true).at(-1)||[s.x,s.y];s.x=px=approach[0];s.y=py=approach[1];handleWorldInteraction(stair);assert.equal(currentScene,stair.civilStair.destination,id+' actual descent/ascent interaction');assert(land(s.x,s.y)&&Math.hypot(s.x-stair.civilStair.entry[0],s.y-stair.civilStair.entry[1])<=8,id+' resolves to a safe point beside the passage');
}
const stairBuildings=worldScenes.overworld.buildings.filter(b=>b.civilUpper);assert(stairBuildings.length>0);
for(const b of stairBuildings){assert.equal(b.usableUpper,'overworld',b.name+' upper floor stays in the cohesive world');const {ramp,decks,rise}=b.civilUpper,low=[Math.floor(ramp.x+ramp.w/2),Math.floor(ramp.y+ramp.h-1)],high=[Math.floor(ramp.x+ramp.w/2),Math.floor(ramp.y)];activateScene('overworld',...low,false);const upperRoute=route(...high);assert(upperRoute&&upperRoute.length>=4,b.name+' physical stair is traversable');assert.equal(currentScene,'overworld');assert(walkSurfaceHeight(high[0]+.5,high[1]+.5)-walkSurfaceHeight(low[0]+.5,low[1]+.5)>2.5,b.name+' stair reaches a real upper elevation');assert(decks.length&&decks[0].w>=7,b.name+' has a walkable furnished upper deck');b._cutaway=false;assert.equal(rebuiltHouseFloorCount(b),2,b.name+' exterior shows its usable upper floor');b._cutaway=true;assert.equal(rebuiltHouseFloorCount(b),2,b.name+' occupied building keeps its physical upper floor');}
for(const id of civilLegacyReturns.keys())if(/_upper$|_tower$|coastal_beacon_(guard|watch|roof)/.test(id))assert(!worldScenes[id],id+' no longer loads as a normal-building scene');
for(const model of ['Stair_Interior_SolidExtended','Roof_RoundTiles_8x14','Grass_Common_Tall','Bush_Common_Flowers','World_Cabinet','World_Chandelier'])assert(rebuiltModels[model],model+' imported from the complete authored catalog');
for(const q of surfaceQuarries){activateScene('overworld',q.x,q.y+q.ry+5,false);assert(land(s.x,s.y),q.id+' ramp entrance');const pit=Math.min(landHeight(q.x-6,q.y),landHeight(q.x+6,q.y)),rim=Math.max(landHeight(q.x-q.rx-2,q.y),landHeight(q.x+q.rx+2,q.y),landHeight(q.x,q.y-q.ry-2));assert(pit<rim-1.5,q.id+' actually excavated away from its graded ramp');
 assert(q.level<5,q.id+' is cut into the terrain instead of raised into a square mesa');assert(quarryShapeEdge(q,q.x+q.rx*.9,q.y+q.ry*.9)<0,q.id+' has rounded corners');
 const cliff=[];for(let y=q.y-q.ry;y<=q.y+q.ry&&!cliff.length;y++)for(let x=q.x-q.rx;x<=q.x+q.rx;x++)if(quarryCliff(q,x,y)){cliff.push(x,y);break;}assert(cliff.length,q.id+' has an intentional blocked face');const nav=realmNav();assert(realmCellBlocked(nav,cliff[1]*nav.w+cliff[0]),q.id+' visible cliff blocks movement');assert(!quarryCliff(q,Math.floor(q.x),Math.floor(q.y+q.ry-3)),q.id+' graded access ramp stays open');
 for(let y=q.y-q.ry;y<=q.y+q.ry;y++)for(let x=q.x-q.rx;x<=q.x+q.rx;x++)assert(!expandedWater(x,y),q.id+' dry excavation');
 for(const ore of objects.filter(o=>o.quarry===q.id&&o.type==='ore')){if(!route(ore.x,ore.y,true))errors.push('Quarry ore inaccessible: '+q.id+' '+ore.x+','+ore.y);assert.equal(resourceDefinition(ore).level,ORE_RESOURCES[ore.resourceId].level);}
}
let broadMax=-Infinity,baseSlope=0;for(let y=8;y<760;y+=12)for(let x=8;x<1144;x+=12){broadMax=Math.max(broadMax,landHeight(x,y));baseSlope=Math.max(baseSlope,Math.abs(landBase(x+1,y)-landBase(x,y)),Math.abs(landBase(x,y+1)-landBase(x,y)));if(!quarryAt(x,y,2)&&!expandedWater(x,y)&&terrainCellSlope(x,y)>1.2)assert(terrainCellBlocked(x,y),'a visibly steep non-quarry face blocks movement');}assert(broadMax<6,'overworld no longer contains unreasonable peaks');assert(baseSlope<.2,'ordinary generated terrain stays gently traversable');
assert(organicRoads.every(seg=>!terrainCellBlocked(Math.floor((seg.a[0]+seg.b[0])/2),Math.floor((seg.a[1]+seg.b[1])/2))),'visible road centers remain traversable');
activateScene('overworld',55,61,false);
for(const o of objects.filter(o=>o.mainStoryKey||o.mountainKey)){if(o.interiorBuilding)continue;if(worldWall(o.x,o.y))errors.push('Quest blocked: '+o.name);}
assert.deepEqual(errors,[]);
console.log(JSON.stringify({settlements:settlementPlans.size,castles:3,floors:civilFloors.size,quarries:surfaceQuarries.length,quests:'reachable',goblins:15}));
`,ctx);
