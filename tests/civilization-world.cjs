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
}
for(const [id,floor]of civilFloors){activateScene(id,...worldScenes[id].entry,false);assert(land(s.x,s.y),id+' entry');
 for(const o of objects.filter(o=>o.civilStair||o.characterSprite)){if(!route(o.x,o.y,true))errors.push('Floor inaccessible: '+id+' / '+o.name);}
 for(const room of floor.rooms){const inside=[];for(let y=room.y+1;y<room.y+room.h-1;y++)for(let x=room.x+1;x<room.x+room.w-1;x++)if(land(x,y))inside.push([x,y]);if(!inside.some(p=>route(...p)))errors.push('Room inaccessible: '+id+' / '+room.name);}
 const stair=objects.find(o=>o.civilStair);assert(stair&&stair.civilStair.kind);assert(worldScenes[stair.civilStair.destination]);
 const approach=route(stair.x,stair.y,true).at(-1)||[s.x,s.y];s.x=px=approach[0];s.y=py=approach[1];engage(stair);assert.equal(currentScene,stair.civilStair.destination,id+' actual stair interaction');assert.equal(s.x,stair.civilStair.entry[0]);assert.equal(s.y,stair.civilStair.entry[1]);
}
for(const q of surfaceQuarries){activateScene('overworld',q.x,q.y+q.ry+5,false);assert(land(s.x,s.y),q.id+' ramp entrance');assert(landHeight(q.x,q.y)<landHeight(q.x,q.y+q.ry+2)-2,q.id+' actually excavated');
 for(let y=q.y-q.ry;y<=q.y+q.ry;y++)for(let x=q.x-q.rx;x<=q.x+q.rx;x++)assert(!expandedWater(x,y),q.id+' dry excavation');
 for(const ore of objects.filter(o=>o.quarry===q.id&&o.type==='ore')){if(!route(ore.x,ore.y,true))errors.push('Quarry ore inaccessible: '+q.id+' '+ore.x+','+ore.y);assert.equal(resourceDefinition(ore).level,ORE_RESOURCES[ore.resourceId].level);}
}
activateScene('overworld',55,61,false);
for(const o of objects.filter(o=>o.mainStoryKey||o.mountainKey)){if(o.interiorBuilding)continue;if(worldWall(o.x,o.y))errors.push('Quest blocked: '+o.name);}
assert.deepEqual(errors,[]);
console.log(JSON.stringify({settlements:settlementPlans.size,castles:3,floors:civilFloors.size,quarries:surfaceQuarries.length,quests:'reachable',goblins:15}));
`,ctx);
