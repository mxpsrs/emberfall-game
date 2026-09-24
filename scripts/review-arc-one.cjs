// Offline review of the production meshes, without a browser or live account.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas');
const {ctx}=require('./benchmark-desktop.cjs'),out=process.argv[2];if(!out)throw new Error('Output directory required');fs.mkdirSync(out,{recursive:true});
ctx.document.createElement=()=>createCanvas(96,96);ctx.createCanvas=createCanvas;ctx.saveReview=(canvas,name)=>fs.writeFileSync(path.join(out,name),canvas.toBuffer('image/png'));
vm.runInContext(fs.readFileSync(__dirname+'/../dist/item-models.js','utf8'),ctx);
vm.runInContext(`
setupExpandedWorld();
const chosen=['rellanSignet','ironhollowBelt','whisperPendant','wardkeeperCape','veilbreakerRing','veyrOrb','memoryShard','forgedOrders','mysticStaff','temperedRing','scholarMantle'];
const sheet=createCanvas(8*124,Math.ceil(chosen.length/8)*136),g=sheet.getContext('2d');g.fillStyle='#24322c';g.fillRect(0,0,sheet.width,sheet.height);
chosen.forEach((id,i)=>{const x=i%8*124,y=Math.floor(i/8)*136,icon=createCanvas(96,96);drawItemModelIcon(icon.getContext('2d'),id);g.fillStyle='#1a2723';g.fillRect(x+4,y+4,116,126);g.drawImage(icon,x+14,y+5);g.fillStyle='#e5dec4';g.font='12px sans-serif';g.textAlign='center';g.fillText(ITEMS[id]?.name||'Coins',x+62,y+119,116);});saveReview(sheet,'item-model-review.png');
currentScene='mine';s.character={name:'Review',frame:'male',skin:1,hair:3,topColor:0,bottomColor:5};time=0;lastAttack=-100;
for(const sex of ['male','female']){
 const plate=createCanvas(660,520),g=plate.getContext('2d');g.fillStyle='#263330';g.fillRect(0,0,plate.width,plate.height);
 const outfits=[['Arc rewards',{cape:'wardkeeperCape',ring:'veilbreakerRing',belt:'ironhollowBelt',neck:'whisperPendant'}],['Veyr’s Orb',{weapon:'veyrOrb',cape:'wardkeeperCape',body:'adeptRobe',belt:'ironhollowBelt',neck:'whisperPendant',ring:'veilbreakerRing'}]];
 for(const [row,[name,gear]]of outfits.entries())for(const [column,yaw]of [0,Math.PI/2,Math.PI].entries()){
  s.character.frame=sex;s.equipment=gear;const faces=[],r={software:true,face(points,color,normals){faces.push({points,color,normals});}};humanoid3(r,0,0,0,gear,0,0,0,1);
  const cy=Math.cos(yaw),sy=Math.sin(yaw),tilt=.14,st=Math.sin(tilt),ct=Math.cos(tilt),zoom=108;
  const projected=faces.map(f=>({...f,p:f.points.map(([x,y,z])=>({x:x*cy-z*sy,y:(x*sy+z*cy)*st-y*ct,depth:(x*sy+z*cy)*ct+y*st}))}));projected.sort((a,b)=>a.p.reduce((s,p)=>s+p.depth,0)/a.p.length-b.p.reduce((s,p)=>s+p.depth,0)/b.p.length);
  for(const f of projected){g.fillStyle=f.color;g.beginPath();f.p.forEach((p,i)=>g[i?'lineTo':'moveTo'](column*220+110+p.x*zoom,row*260+238+p.y*zoom));g.closePath();g.fill();}
  g.fillStyle='#e5dec4';g.font='14px sans-serif';g.textAlign='center';g.fillText(name+' · '+['front','side','back'][column],column*220+110,row*260+20);
 }saveReview(plate,'equipment-'+sex+'.png');
}
`,ctx);
console.log('Rendered item and front/side/back equipment review sheets.');
