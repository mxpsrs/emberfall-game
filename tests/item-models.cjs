const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;ctx.createCanvas=createCanvas;
ctx.document.createElement=()=>createCanvas(96,96);
vm.runInContext(fs.readFileSync(__dirname+'/../dist/item-models.js','utf8'),ctx,{filename:'item-models.js'});
vm.runInContext(`
setupExpandedWorld();const ids=[...Object.keys(ITEMS),'coins'];
for(const id of ids){
 const m=itemVisual(id);assert(m,id+' has an item model');assert(m.faces.length>4,id+' is a solid model');assert(m.mesh.packed.length>0,id+' has GPU geometry');assert(Array.from(m.mesh.packed).every(Number.isFinite),id+' has valid geometry');
 const canvas=createCanvas(96,96),g=canvas.getContext('2d');assert(drawItemModelIcon(g,id),id+' renders in inventory');const pixels=g.getImageData(0,0,96,96).data;let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])visible++;assert(visible>60,id+' icon is visible');
 const received=[];assert(drawGroundItemModel({indexed:(mesh,matrix)=>received.push({mesh,matrix})},id,42.5,51.5));assert.equal(received[0].mesh,m.mesh,id+' shares its model on the ground');assert(received[0].matrix.every(Number.isFinite));
 const matrix=groundItemTransform(m,0,0);for(const face of m.faces)for(const p of face.points)assert(briarPoint(p,0,matrix)[1]>=.024,id+' rests above the ground');
}
for(const f of Object.values(FISH_RESOURCES))assert.notDeepEqual(itemVisual(f.raw).mesh.packed,itemVisual(f.food).mesh.packed,'raw and cooked catches differ');
assert.notDeepEqual(itemVisual('copperOre').mesh.packed,itemVisual('tinOre').mesh.packed);assert.notDeepEqual(itemVisual('ore').mesh.packed,itemVisual('ironBar').mesh.packed);
assert.notDeepEqual(itemVisual('arrowheads').mesh.packed,itemVisual('ironArrows').mesh.packed);assert.notDeepEqual(itemVisual('airRunes').mesh.packed,itemVisual('waterRunes').mesh.packed);
assert(itemVisual('iron_body').faces.length>wornModularMesh('male','iron_body').i.length/3,'inventory and ground chest pieces include matching shoulders');
const pile={items:{rawShrimp:1,bronze_body:1,coins:12}},received=[];drawGroundPileModels({indexed:m=>received.push(m)},pile,42.5,51.5);assert.deepEqual(received,['rawShrimp','bronze_body','coins'].map(id=>itemVisual(id).mesh),'mixed piles keep their item identities and order');
assert.equal(itemVisual('not-an-item'),null);
console.log('PASS: '+ids.length+' item types render in inventory and on the ground; distinct resources, food states, combined armor, valid GPU geometry, and mixed loot piles.');
`,ctx);
