// Offline front/side/back review of every production cape and movement state.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas');
const {ctx}=require('./benchmark-desktop.cjs'),out=process.argv[2];if(!out)throw new Error('Output directory required');fs.mkdirSync(out,{recursive:true});
ctx.createCanvas=createCanvas;ctx.saveReview=(canvas,name)=>fs.writeFileSync(path.join(out,name),canvas.toBuffer('image/png'));
vm.runInContext(`
setupExpandedWorld();currentScene='mine';time=1;lastAttack=-100;s.character={name:'Review',frame:'male',skin:1,hair:3,topColor:0,bottomColor:5};
for(const sex of ['male','female']){
 const rows=[['Forest',{cape:'adventureCloakForest'}],['Crimson',{cape:'adventureCloakCrimson'}],['Azure',{cape:'adventureCloakAzure'}],['Shadow',{cape:'adventureCloakShadow'}],['Sand',{cape:'adventureCloakSand'}],['Red leather · idle',{cape:'redLeatherCape'}],['Red leather · run',{cape:'redLeatherCape'},true]];
 const plate=createCanvas(660,rows.length*255),g=plate.getContext('2d');g.fillStyle='#263330';g.fillRect(0,0,plate.width,plate.height);
 for(const [row,[name,gear,running]]of rows.entries())for(const [column,yaw]of [0,Math.PI/2,Math.PI].entries()){
  s.character.frame=sex;s.equipment=gear;playerMotion.moving=!!running;playerMotion.running=!!running;playerMotion.phase=.38;playerMotion.blend=running?1:0;playerMotion.heading=0;playerHeading=0;
  const faces=[],r={software:true,face(points,color,normals){faces.push({points,color,normals});}};humanoid3(r,0,0,0,gear,0,0,0,1);
  const cy=Math.cos(yaw),sy=Math.sin(yaw),tilt=.10,st=Math.sin(tilt),ct=Math.cos(tilt),zoom=112;
  const projected=faces.map(f=>({...f,p:f.points.map(([x,y,z])=>({x:x*cy-z*sy,y:(x*sy+z*cy)*st-y*ct,depth:(x*sy+z*cy)*ct+y*st}))}));projected.sort((a,b)=>a.p.reduce((s,p)=>s+p.depth,0)/a.p.length-b.p.reduce((s,p)=>s+p.depth,0)/b.p.length);
  for(const f of projected){g.fillStyle=f.color;g.beginPath();f.p.forEach((p,i)=>g[i?'lineTo':'moveTo'](column*220+110+p.x*zoom,row*255+230+p.y*zoom));g.closePath();g.fill();}
  g.fillStyle='#e5dec4';g.font='14px sans-serif';g.textAlign='center';g.fillText(name+' · '+['front','side','back'][column],column*220+110,row*255+20);
 }saveReview(plate,'capes-'+sex+'.png');
}
`,ctx);
console.log('Rendered both body types, five Adventure colors, and static/wind red leather states.');
