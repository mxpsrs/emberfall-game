const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
setupExpandedWorld();setupTutorialVillage();activateScene('overworld',55,61,false);
const houses=worldScenes.overworld.buildings.filter(b=>b.service&&!b.civilCastle&&!b.civilWallTiles&&!b.arch&&!/crypt|ruins|mine|beacon/i.test(b.name));
const sizes=new Set(houses.map(b=>b.w+':'+b.h));assert(sizes.size>=8,'settlements use distinct footprints');
const meshes=new Map(Object.entries(rebuiltModels).map(([key,value])=>[value,key]));
const used=new Set();let checked=0;
for(const b of houses){
 const entries=[],painter={face(){},indexed(mesh,matrix){entries.push({name:meshes.get(mesh)||mesh.canonicalAsset?.split(':')[1],mesh,matrix});}};
 building3(painter,b);
 const roof=entries.filter(e=>/^Roof_RoundTiles_|^Roof_Tower_|^Roof_Wooden_2x1_Center$/.test(e.name||''));if(b.briarDesign)assert.equal(roof.length,b.briarDesign.volumes.length,b.name+' has one roof per structural volume');else assert(roof.length<=1,b.name+' has one main roof');
 assert(entries.some(e=>/^Floor_/.test(e.name||'')),b.name+' has authored floor');
 if(b.briarDesign)assert.equal(entries.filter(e=>/^Roof_Front_Brick/.test(e.name||'')).length,2*b.briarDesign.volumes.filter(v=>v.roof==='gable').length,b.name+' closes every gabled volume');
 else if(roof.length&&roof[0].name!=='Roof_Tower_RoundTiles')assert.equal(entries.filter(e=>/^Roof_Front_Brick/.test(e.name||'')).length,2,b.name+' closes both gable ends');
 const openings=entries.filter(e=>/Wall_.*Door_Round$/.test(e.name||''));assert.equal(openings.length,1,b.name+' has one ground entrance');
 setWalkInDoor(b.service,false,true);const leaf=buildingDoorTransform(b),center=briarPoint([.514,0,0],0,leaf),opening=briarPoint([0,0,0],0,openings[0].matrix);
 assert(Math.hypot(center[0]-opening[0],center[2]-opening[2])<.06,b.name+' leaf aligns with wall opening');
 const [tx,tz]=doorThreshold(b.service);assert(Math.hypot(center[0]-tx-.5,center[2]-tz-.5)<.6,b.name+' wall opening aligns with walkable threshold');
 for(const e of entries){assert(e.matrix.every(Number.isFinite));if(e.name)used.add(e.name);}
 checked++;
}
assert(used.has('Wall_Plaster_WoodGrid'));assert(used.has('Wall_Plaster_Window_Thin_Round'));assert(used.has('Window_Thin_Round1'));assert(used.has('Roof_Front_Brick6'));assert(used.has('Roof_Front_Brick8'));
console.log('PASS: '+checked+' building shells, '+sizes.size+' footprint sizes, one main roof, paired gables, authored floors and exact leaf/opening/threshold alignment; '+used.size+' kit modules used.');
`,ctx);
