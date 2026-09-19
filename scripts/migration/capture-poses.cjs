const {ctx,vm,fs}=require('./content-fixture.cjs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),samples=[];
ctx.poseSample=(group,name,clip,time,palette)=>samples.push({group,name,clip,time,palette:Array.from(palette)});
vm.runInContext('('+function(){
 for(const [sex,a]of Object.entries(rebuiltAvatars))for(const [name,c]of Object.entries(a.clips))for(const frame of [...new Set([0,Math.floor((c.frames-1)/2),c.frames-1])]){
  poseSample('characters',sex,name,c.frames>1?frame/(c.frames-1)*c.duration:0,realmSkeletonPose(a,name,frame,1,'idle',0,name==='staffIdle'));
  if(['idle','walk','run'].includes(name))poseSample('characters',sex,name+'_staff',c.frames>1?frame/(c.frames-1)*c.duration:0,realmSkeletonPose(a,name,frame,1,'idle',0,true));
 }
 for(const [kind,a]of Object.entries(creatureAssets))for(const [name,c]of Object.entries(a.clips))for(const frame of [...new Set([0,Math.floor((c.frames-1)/2),c.frames-1])])
  poseSample('creatures',kind,name,c.frames>1?frame/(c.frames-1)*c.duration:0,creatureRigPose(kind,name,c.frames>1?frame/(c.frames-1):0).palette);
 for(const [name,a]of Object.entries(briarRigs))for(const [clip,c]of Object.entries(a.clips))for(const f of [...new Set([0,Math.floor((c.frames-1)/2),c.frames-1])])
  poseSample('kaykit-legacy-rigs',name,clip,c.frames>1?f/(c.frames-1)*c.duration:0,c.m.subarray(f*a.jointCount*12,(f+1)*a.jointCount*12));
}.toString()+')()',ctx,{timeout:180000});
fs.writeFileSync(path.join(root,'.qa/migration/poses.json'),JSON.stringify(samples));console.log('Captured '+samples.length+' actual renderer pose samples');
