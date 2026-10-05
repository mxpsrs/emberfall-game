// Offline render of the real character-creation painter and production meshes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas');
const {ctx}=require('./benchmark-desktop.cjs'),out=process.argv[2];fs.mkdirSync(out,{recursive:true});
ctx.createCanvas=createCanvas;ctx.saveReview=(canvas,name)=>fs.writeFileSync(path.join(out,name),canvas.toBuffer('image/png'));
vm.runInContext('startRebuiltRealm=()=>{};',ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../client/character-creation.js'),'utf8'),ctx);
vm.runInContext(`
currentScene='mine';time=0;lastAttack=-100;
function reviewFigure(appearance,gear,yaw,face){
 const c=createCanvas(340,420),g=c.getContext('2d'),cy=Math.cos(yaw),sy=Math.sin(yaw),scale=face?760:190,anchor=face?210+1.68*scale:380;
 const r=creatorPainter(g,(x,y,z)=>({x:170+(x*cy-z*sy)*scale,y:anchor+((x*sy+z*cy)*.10-y*.995)*scale,depth:(x*sy+z*cy)*.995+y*.10}),340,420);
 humanoid3(r,0,0,0,{...gear,_frame:appearance.frame,_appearance:appearance});r.flush();return c;
}
for(const sex of ['male','female']){
 const hairSheet=createCanvas(1020,5*260),g=hairSheet.getContext('2d');g.fillStyle='#3e443a';g.fillRect(0,0,1020,1300);
 for(let hair=0;hair<5;hair++)for(const [col,yaw]of [0,Math.PI/2,Math.PI].entries()){
  g.drawImage(reviewFigure({frame:sex,hair,hairColor:1,skin:1}, {},yaw,true),col*340,hair*260,340,260);g.fillStyle='#e6dbc2';g.font='14px sans-serif';g.fillText(sex+' · '+CREATOR_FIELDS.find(f=>f[0]==='hair')[2][hair]+' · '+['front','side','back'][col],col*340+10,hair*260+22);
 }saveReview(hairSheet,'hair-'+sex+'.png');
 const outfits=[['Peasant',4,3,{}],['Ranger',5,4,{}],['Hood',5,4,{head:'rangerHood'}],['Mixed',4,4,{}],['Armoured',5,4,{body:'iron_body',legs:'iron_legs',hands:'iron_hands',feet:'iron_feet'}]];
 const sheet=createCanvas(1020,420*outfits.length),p=sheet.getContext('2d');p.fillStyle='#3e443a';p.fillRect(0,0,sheet.width,sheet.height);
 for(const [row,[name,topStyle,bottomStyle,gear]]of outfits.entries())for(const [col,yaw]of [0,Math.PI/2,Math.PI].entries()){
  p.drawImage(reviewFigure({frame:sex,hair:1,hairColor:1,skin:1,topStyle,bottomStyle,topColor:topStyle===4?6:2,bottomColor:7},gear,yaw,false),col*340,row*420);p.fillStyle='#e6dbc2';p.font='14px sans-serif';p.fillText(sex+' · '+name+' · '+['front','side','back'][col],col*340+10,row*420+22);
 }saveReview(sheet,'clothes-'+sex+'.png');
}
`,ctx);
console.log('Rendered both body types, all hairstyles, separated hood, and clothing combinations.');
