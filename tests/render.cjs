// Rasterize current production meshes with the actual depth-buffered preview
// painter. This is CPU/offscreen coverage, not physical-device or GPU certification.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas}=require('@napi-rs/canvas');
const {ctx,vm}=require('../scripts/game-fixture.cjs');
ctx.createCanvas=createCanvas;
vm.runInContext('startRebuiltRealm=()=>{};',ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../dist/character-creation.js','utf8'),ctx);
const samples=[];
ctx.recordSample=(canvas,label)=>{
 const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let covered=0;for(let i=3;i<data.length;i+=4)if(data[i])covered++;
 assert(covered>500,label+' renders a nonempty figure: '+covered);
 assert(covered<canvas.width*canvas.height*.75,label+' does not fill the frame');
 samples.push({label,hash:crypto.createHash('sha256').update(data).digest('hex'),canvas});
};
vm.runInContext(`
currentScene='mine';time=1;lastAttack=-100;meshDetail3=1;
const outfits=[{},
 {weapon:'ironSword',head:'iron_head',body:'iron_body',legs:'iron_legs',hands:'iron_hands',feet:'iron_feet',shield:'ironShield'},
 {weapon:'shortbow',body:'leatherArmor',feet:'leatherBoots'},
 {weapon:'oakStaff',body:'mageRobe',feet:'leatherBoots'}];
for(const sex of ['male','female'])for(const [outfit,gear]of outfits.entries())for(const moving of [false,true])for(const yaw of [0,Math.PI]){
 const canvas=createCanvas(180,240),g=canvas.getContext('2d'),cy=Math.cos(yaw),sy=Math.sin(yaw),scale=100;
 const painter=creatorPainter(g,(x,y,z)=>({x:90+(x*cy-z*sy)*scale,y:220+((x*sy+z*cy)*.1-y*.995)*scale,depth:(x*sy+z*cy)*.995+y*.1}),180,240);
 const face=painter.face;painter.face=(points,color)=>{assert(points.flat().every(Number.isFinite),'finite production vertices');face(points,color);};
 humanoid3(painter,0,0,0,{...gear,_frame:sex,_appearance:{frame:sex,hair:1},_peerMotion:{running:true,phase:.25}},0,moving?1:0);
 painter.flush();recordSample(canvas,sex+':'+outfit+':'+moving+':'+yaw);
}
`,ctx);
assert.equal(samples.length,32);
assert.equal(new Set(samples.map(s=>s.hash)).size,32,'sex, equipment, pose and front/back changes reach the rasterizer');
const sheet=createCanvas(180*8,240*4),g=sheet.getContext('2d');
g.fillStyle='#33433c';g.fillRect(0,0,sheet.width,sheet.height);
samples.forEach((s,i)=>g.drawImage(s.canvas,(i%8)*180,Math.floor(i/8)*240));
fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/equipment-polish.png',sheet.toBuffer('image/png'));
console.log('PASS: 32 current-mesh CPU preview renders; both bodies, four outfits, idle/run and front/back produce finite, nonempty, distinct images without retired sprites.');
