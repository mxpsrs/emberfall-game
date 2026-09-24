// Offline review of the exact production avatar, weapon and animation meshes.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createCanvas}=require('@napi-rs/canvas');
const {ctx}=require('./benchmark-desktop.cjs');const out=process.argv[2];if(!out)throw Error('Output directory required');fs.mkdirSync(out,{recursive:true});
ctx.createCanvas=createCanvas;ctx.saveReview=(c,n)=>fs.writeFileSync(path.join(out,n),c.toBuffer('image/png'));
vm.runInContext('startRebuiltRealm=()=>{};',ctx);vm.runInContext(fs.readFileSync('dist/character-creation.js','utf8'),ctx);
vm.runInContext(`
currentScene='mine';time=10;creatorDraft=null;playerMotion.blend=0;playerAction=null;target=null;path=[];s.equippedAmmoCount=2500;
for(const sex of ['male','female']){
 s.character={frame:sex,skin:1,hair:0,topStyle:5,bottomStyle:4,topColor:2,bottomColor:7};s.equipment={weapon:'shortbow',ammo:'arrows'};
 const sheet=createCanvas(4*360,3*400),g=sheet.getContext('2d');
 for(const [row,yaw]of [0,Math.PI/2,-Math.PI/2].entries())for(const [col,age]of [-1,.50,.90,1.08].entries()){
  const c=createCanvas(360,400),p=c.getContext('2d'),cy=Math.cos(yaw),sy=Math.sin(yaw),scale=170;
  p.fillStyle='#34403e';p.fillRect(0,0,360,400);
  const r=creatorPainter(p,(x,y,z)=>({x:180+(x*cy-z*sy)*scale,y:374+((x*sy+z*cy)*.10-y*.995)*scale,depth:(x*sy+z*cy)*.995+y*.10}),360,400);
  lastAttack=age<0?-100:time-age;playerAttackMotion=age<0?null:{weapon:'shortbow',ammo:'arrows'};
  humanoid3(r,0,0,0,s.equipment);r.flush();p.fillStyle='#f0e5c7';p.font='15px sans-serif';p.fillText(sex+' '+['front','left','right'][row]+' '+['idle','draw','hold','release'][col],10,20);g.drawImage(c,col*360,row*400);
 }
 saveReview(sheet,'bow-'+sex+'.png');
}
`,ctx);
