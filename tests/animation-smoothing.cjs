'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ctx}=require('../scripts/benchmark-desktop.cjs');ctx.assert=assert;
vm.runInContext(`{
 const track={frames:2,trs:new Float32Array([0,0,0,0,0,0,1,1,1,1,10,0,0,0,0,Math.sin(Math.PI/3),Math.cos(Math.PI/3),1,1,1])},sample=new Float32Array(10);
 sampleRealmJoint(track,.25,0,1,sample);assert(Math.abs(sample[0]-2.5)<1e-6);assert(Math.abs(sample[5]-Math.sin(Math.PI/12))<1e-6,'rotation progresses at constant angular speed');
 const reverse={...track,trs:new Float32Array(track.trs)};for(let k=13;k<17;k++)reverse.trs[k]*=-1;const other=new Float32Array(10);sampleRealmJoint(reverse,.25,0,1,other);assert(sample.every((v,i)=>Math.abs(v-other[i])<1e-6),'equivalent quaternion signs take the same short arc');
 let animated=0;
 for(const sex of ['male','female'])for(const clip of Object.keys(rebuiltAvatars[sex].clips)){
  const gear={_appearance:{frame:sex,hair:3,skin:1,topStyle:6,bottomStyle:5}},a=avatarGpuPose(sex,clip,.231,gear,0),b=avatarGpuPose(sex,clip,.2312,gear,0),cpu=avatarPose(sex,clip,.2312,gear,0);
  assert([...a.pose,...b.pose,...cpu.p].every(Number.isFinite),sex+' '+clip+' remains finite');
  let delta=0;for(let i=0;i<a.pose.length;i++)delta=Math.max(delta,Math.abs(a.pose[i]-b.pose[i]));if(delta>1e-7){animated++;assert(delta<.05,'small frame advances cannot jump: '+sex+' '+clip);assert.notDeepEqual(avatarPose(sex,clip,.231,gear,0).p,cpu.p,'CPU previews interpolate fractional frames');}
 }
 for(const [kind,asset]of Object.entries(creatureAssets))for(const clip of Object.keys(asset.clips)){
  const a=creatureRigPose(kind,clip,.271),b=creatureRigPose(kind,clip,.2712);assert([...a.palette,...b.palette].every(Number.isFinite));let delta=0;for(let i=0;i<a.palette.length;i++)delta=Math.max(delta,Math.abs(a.palette[i]-b.palette[i]));if(delta>1e-7){animated++;const pa=creaturePose(kind,clip,.271),pb=creaturePose(kind,clip,.2712);let movement=0;for(let i=0;i<pa.p.length;i++)movement=Math.max(movement,Math.abs(pa.p[i]-pb.p[i]));assert(movement*asset.scale<.03,'visible creature vertices advance smoothly: '+kind+' '+clip);}
 }
 assert(animated>30,'real humanoid and creature motion clips are exercised');
 const gear={_appearance:{hair:3,topStyle:6,bottomStyle:5}},actor={};
 const renderMotion=motion=>avatarGpuPose('male',motion.clip,motion.phase,gear,0,motion.blend,motion.baseClip,motion.basePhase,motion).pose;
 time=10;const walk=renderMotion(realmAnimationTransition(actor,'walk',.2,.08,'idle',.2,rebuiltAvatars.male.clips));
 time+=1/60;const first=realmAnimationTransition(actor,'idle',.1,1,'idle',.3,rebuiltAvatars.male.clips);assert.equal(first.transition.weight,0);const stopped=renderMotion(first);assert.deepEqual(stopped,walk,'stopping starts from the displayed mixed walk, not a full-stride pose');
 time+=.07;const middle=realmAnimationTransition(actor,'idle',.2,1,'idle',.4,rebuiltAvatars.male.clips);assert(Math.abs(middle.transition.weight-.5)<1e-6);const halfway=renderMotion(middle);
 time+=.01;const interrupted=renderMotion(realmAnimationTransition(actor,'melee',.05,.2,'idle',.4,rebuiltAvatars.male.clips));assert.deepEqual(interrupted,halfway,'an interrupted fade starts from the exact displayed pose');
 time+=.17;const complete=realmAnimationTransition(actor,'melee',.3,1,'idle',.5,rebuiltAvatars.male.clips);assert(!complete.transition);renderMotion(complete);
 const creature={};time=20;let motion=realmAnimationTransition(creature,'walk',.3,.2,'idle',.4,creatureAssets.wolf.clips);const before=creatureRigPose('wolf',motion.clip,motion.phase,motion.blend,motion.baseClip,motion.basePhase,motion);time+=1/60;motion=realmAnimationTransition(creature,'idle',.4,1,'idle',.4,creatureAssets.wolf.clips);const after=creatureRigPose('wolf',motion.clip,motion.phase,motion.blend,motion.baseClip,motion.basePhase,motion);assert(after.palette.every((v,i)=>Math.abs(v-before.palette[i])<.00003),'creature clip changes preserve their displayed pose within float precision');
 console.log('PASS: fractional humanoid/creature poses, constant-speed rotations, quaternion sign parity, and eased actor transitions ('+animated+' moving clips).');
}`,ctx);
