// Rig contracts that do not depend on a rendering backend or a particular pose.
const vm=require('vm'),assert=require('assert');
const {ctx}=require('../scripts/benchmark-desktop.cjs');
ctx.assert=assert;
vm.runInContext(`
function invertMotionAffine(m){
 const [a,b,c,x,d,e,f,y,g,h,i,z]=m,det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
 assert(Math.abs(det)>1e-6,'bone matrix remains invertible');
 const r=[(e*i-f*h)/det,(c*h-b*i)/det,(b*f-c*e)/det,0,(f*g-d*i)/det,(a*i-c*g)/det,(c*d-a*f)/det,0,(d*h-e*g)/det,(b*g-a*h)/det,(a*e-b*d)/det,0];
 for(let row=0;row<3;row++)r[row*4+3]=-(r[row*4]*x+r[row*4+1]*y+r[row*4+2]*z);return r;
}
for(const sex of ['male','female']){
 const a=rebuiltAvatars[sex],rig=a.rig,rest=Array.from({length:a.joints},(_,i)=>invertMotionAffine(rig.bind.subarray(i*12,i*12+12)));
 assert.equal(rig.names.length,65);
 assert(a.clips.walk.source==='Walk_Loop'&&a.clips.melee.source==='Sword_Attack','the original artist clips are identified');
 for(const clip of ['idle','swordIdle','walk','run','melee','unarmed','magic','ranged','bowIdle','bury','firemaking']){
  const motion=a.clips[clip];assert(motion.trs&&!motion.m,'authored clips use local skeletal transforms');
  for(let f=0;f<=24;f++)for(const blend of [1,.5]){
   const frame=f/24*(motion.frames-1),p=realmSkeletonPose(a,clip,frame,blend,'swordIdle',0);
   const global=rest.map((bind,i)=>affineMultiply(p.subarray(i*12,i*12+12),bind));
   for(let j=1;j<a.joints;j++){
    const parent=rig.parents[j];if(parent<0||rig.names[j]==='pelvis')continue;
    const length=m=>Math.hypot(m[j][3]-m[parent][3],m[j][7]-m[parent][7],m[j][11]-m[parent][11]);
    assert(Math.abs(length(global)-length(rest))<.001,'bones retain their length through playback and transitions');
   }
   const hand=invertMotionAffine(global[rig.right]),socket=affineMultiply(hand,p.subarray(a.right*12,a.right*12+12));
   for(let j=0;j<12;j++)assert(Math.abs(socket[j]-rig.rightGrip[j])<.0001,'the sword stays attached to the same place in the palm');
   const knuckle=affineMultiply(hand,global[rig.names.indexOf('middle_01_r')]),tip=affineMultiply(hand,global[rig.names.indexOf('middle_04_leaf_r')]);
   if(!['ranged','bowIdle','bury','firemaking'].includes(clip))assert(Math.hypot(knuckle[3]-tip[3],knuckle[7]-tip[7],knuckle[11]-tip[11])<.09,sex+' '+clip+' frame '+f+' blend '+blend+': the right fingers stay curled around the grip');
  }
 }
 for(const clip of ['walk','run','melee','ranged','magic','bury'])for(const phase of [0,.125,.25,.375,.5,.625,.75,.875,1]){
  const mesh=avatarPose(sex,clip,phase,{weapon:'bronzeSword',body:'leatherArmor'},0);
  assert([...mesh.p,...mesh.n].every(Number.isFinite));
  let lowest=Infinity;for(let i=1;i<mesh.p.length;i+=3)lowest=Math.min(lowest,mesh.p[i]);
  assert(lowest>-.015,'feet do not sink into a level floor after retargeting');
 }
 const packed=[];packingLocalMesh=true;
 realmIndexedData(packed,avatarPose(sex,'swordIdle',0,{weapon:'bronzeSword',body:'leatherArmor'},0),[1,0,0,0,0,1,0,0,0,0,1,0]);packingLocalMesh=false;
 for(let i=0;i<packed.length;i+=36)assert(packed[i+9]===packed[i+21]&&packed[i+21]===packed[i+33],'atlas slots stay constant within every rendered triangle');
}
`,ctx);
console.log('PASS: both rigs, authored clips, joint lengths during blends, curled fingers, stable sword sockets, and floor contact.');
