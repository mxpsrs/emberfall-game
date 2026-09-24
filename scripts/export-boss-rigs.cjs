const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {ctx}=require('./benchmark-desktop.cjs');
const output=path.resolve(process.argv[2]||'../boss-work');fs.mkdirSync(output,{recursive:true});
ctx.writeBoss=(name,data)=>fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(data,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
vm.runInContext(`for(const kind of ['king','wolf','skeleton','goblin','slime']){const a=creatureAssets[kind],pose=creaturePose(kind,'idle',0),rig=creatureRigPose(kind,'idle',0);writeBoss(kind,{...a,posed:pose.p,palette:rig.palette});}`,ctx);
