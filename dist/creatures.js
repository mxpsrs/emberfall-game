'use strict';
// Imported meshes and skeletal motion replace every procedural monster body.
const creatureAssets=Object.fromEntries(Object.entries({...REALM_CREATURES,...(typeof APPROVED_CREATURES==='undefined'?{}:APPROVED_CREATURES)}).map(([key,a])=>[key,{
 ...a,mesh:rebuiltMesh(a.mesh),rig:{...a.rig,bind:briarDecode(a.rig.bind,Float32Array)},
 clips:Object.fromEntries(Object.entries(a.clips).map(([key,c])=>[key,{...c,trs:briarDecode(c.trs,Float32Array)}]))
}]));
const creaturePoses=new Map();
const creatureRigPoses=new Map();
const creatureKinds={forestgiant:'forestgiant',ork:'ork',goblin:'goblin',wolf:'wolf',ridgewolf:'wolf',rat:'rat',slime:'slime',skeleton:'skeleton',warden:'skeleton',sentinel:'skeleton',king:'king'};
function creatureSize(o){if(o.size)return o.size;return o.kind==='rat'?1.9:o.kind==='ridgewolf'?1.12:o.kind==='warden'||o.kind==='sentinel'?1.16:1;}
function creatureAsset(o){return creatureAssets[o.creatureLook||creatureKinds[o.kind]];}
function creatureRigPose(kind,clip,phase,blend=1,baseClip='idle',basePhase=0){
 const a=creatureAssets[kind],motion=a.clips[clip],frame=Math.max(0,Math.min(motion.frames-1,phase*(motion.frames-1)));
 const baseFrame=Math.max(0,Math.min(a.clips[baseClip].frames-1,basePhase*(a.clips[baseClip].frames-1)));
 const key=[kind,clip,frame.toFixed(3),blend.toFixed(3),blend<1?baseClip:'',blend<1?baseFrame.toFixed(3):''].join(':');
 if(creatureRigPoses.has(key))return creatureRigPoses.get(key);
 const global=[],palette=new Float32Array(a.rig.deforms.length*12),v=new Float32Array(10),b=new Float32Array(10);
 for(let i=0;i<a.joints;i++){
  sampleRealmJoint(motion,frame,i,a.joints,v);
  if(blend<1){sampleRealmJoint(a.clips[baseClip],baseFrame,i,a.joints,b);const sign=v[3]*b[3]+v[4]*b[4]+v[5]*b[5]+v[6]*b[6]<0?-1:1;
   for(let j=0;j<10;j++)v[j]=b[j]*(1-blend)+v[j]*blend*(j>=3&&j<=6?sign:1);
   const length=Math.hypot(v[3],v[4],v[5],v[6]);for(let j=3;j<7;j++)v[j]/=length;
  }
  const local=realmJointMatrix(v),parent=a.rig.parents[i],world=parent<0?local:affineMultiply(global[parent],local);global.push(world);
 }
 for(let i=0;i<a.rig.deforms.length;i++)palette.set(affineMultiply(global[a.rig.deforms[i]],a.rig.bind.subarray(i*12,i*12+12)),i*12);
 // Only solve contact height on the CPU. Positions and normals are deformed
 // by the GPU, using the same palette, in both the color and shadow passes.
 const mesh=a.mesh;let floorY=Infinity;
 for(let i=0,k=0;i<mesh.p.length/3;i++,k+=3){let y=0;
  for(let j=0;j<4;j++){const weight=mesh.w[i*4+j];if(!weight)continue;const t=mesh.j[i*4+j]*12+4;y+=weight*(palette[t]*mesh.p[k]+palette[t+1]*mesh.p[k+1]+palette[t+2]*mesh.p[k+2]+palette[t+3]);}
  floorY=Math.min(floorY,y);
 }
 const pose={key,palette,floorY};creatureRigPoses.set(key,pose);
 if(creatureRigPoses.size>80)creatureRigPoses.delete(creatureRigPoses.keys().next().value);
 return pose;
}
function creaturePose(kind,clip,phase,blend=1,baseClip='idle',basePhase=0){
 const rig=creatureRigPose(kind,clip,phase,blend,baseClip,basePhase);
 if(creaturePoses.has(rig.key))return creaturePoses.get(rig.key);
 const mesh=creatureAssets[kind].mesh,p=new Float32Array(mesh.p.length),n=new Float32Array(mesh.n.length),m=rig.palette;
 for(let i=0;i<mesh.p.length/3;i++){
  const k=i*3;
  for(let j=0;j<4;j++){
   const weight=mesh.w[i*4+j];if(!weight)continue;const bone=mesh.j[i*4+j]*12;
   for(let axis=0;axis<3;axis++){const t=bone+axis*4;
    p[k+axis]+=weight*(m[t]*mesh.p[k]+m[t+1]*mesh.p[k+1]+m[t+2]*mesh.p[k+2]+m[t+3]);
    n[k+axis]+=weight*(m[t]*mesh.n[k]+m[t+1]*mesh.n[k+1]+m[t+2]*mesh.n[k+2]);
   }
  }
  const length=Math.hypot(n[k],n[k+1],n[k+2])||1;for(let axis=0;axis<3;axis++)n[k+axis]/=length;
 }
 const result={...mesh,p,n,floorY:rig.floorY};creaturePoses.set(rig.key,result);
 if(creaturePoses.size>80)creaturePoses.delete(creaturePoses.keys().next().value);
 return result;
}
function creatureMotion(o,x,z){
 const state=o._creatureMotion??={time,x,z,phase:0,blend:0,speed:0,heading:((o.id||0)*2.399)% (Math.PI*2)};
 const dt=Math.min(.1,Math.max(0,time-state.time)),dx=x-state.x,dz=z-state.z,distance=Math.hypot(dx,dz);
 if(dt>0){
  const walking=distance>.0003&&distance<2;
  state.speed+=(walking?distance/dt-state.speed:-state.speed)*Math.min(1,dt*8);
  state.blend+=(walking?1-state.blend:-state.blend)*Math.min(1,dt*12);
  if(walking)state.phase=(state.phase+distance/((o.creatureLook||creatureKinds[o.kind])==='rat'?.52*creatureSize(o):(o.creatureLook||creatureKinds[o.kind])==='wolf'?1.6:1.15))%1;
  let desired=walking?Math.atan2(dx,dz):state.heading;
  if(!walking&&(target===o||o._inCombat)&&Math.hypot(px+.5-x,py+.5-z)<12)desired=Math.atan2(px+.5-x,py+.5-z);
  const delta=Math.atan2(Math.sin(desired-state.heading),Math.cos(desired-state.heading));state.heading+=delta*Math.min(1,dt*15);
  state.time=time;state.x=x;state.z=z;
 }
 return state;
}
function creatureDying(o){const a=creatureAsset(o);return !!a&&o.dead>time&&Number.isFinite(o.deathAt)&&time-o.deathAt<a.clips.death.duration+.6;}
const creatureBeforeImports=creature3;
creature3=function(r,o,x,z){
 if(o.civilianModel){const moving=Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)>.02;humanoid3(r,x,z,1,{_civilian:o.civilianModel,_frame:'male',_race:'human'},Math.atan2(px-x,py-z),moving?time*9:0);return 1.9;}
 if(!o.tutor&&!o.appearanceRole&&(o.type==='man'||o.type==='villager'||o.characterSprite||['elder','shop','questgiver','inn'].includes(o.type))){
  const state=creatureMotion(o,x,z),gear=npcEquipment(o);gear._attackAt=o.attackAt;
  gear._frame=o.kind==='man'?'male':o.frame||((o.sprite||0)%3===2?'female':'male');
  gear._appearance={topStyle:4,bottomStyle:3,topColor:(o.id||0)%8,bottomColor:7,hair:(o.id||0)%4,hairColor:(o.id||0)%4};
  humanoid3(r,x,z,(o.sprite||0)%4,gear,state.heading,state.blend>.015?state.phase*7.5:0);return gear._race==='dwarf'?1.8:2;
 }
 const kind=o.creatureLook||creatureKinds[o.kind],a=creatureAssets[kind];if(!a)return creatureBeforeImports(r,o,x,z);
 const variant=creatureSize(o),dying=creatureDying(o),state=creatureMotion(o,x,z),large=cameraZoom3()*a.height*variant>65,near=Math.hypot(x-px-.5,z-py-.5)<8;
 const idlePhase=near?((Math.floor(time*(large?16:8))/(large?16:8)+(o.id||0)*.371)/a.clips.idle.duration)%1:0;
 let clip='idle',phase=idlePhase,blend=1,baseClip='idle',basePhase=idlePhase;
 const gait=state.speed>3.2?'run':'walk';
 const attackAge=time-(o.attackAt??-100),hitAge=time-(o.hitAt??-100),attack=creatureAttackAnimation(o,a,attackAge);
 if(dying){clip='death';phase=Math.min(1,(time-o.deathAt)/a.clips.death.duration);blend=Math.min(1,(time-o.deathAt)/.12);baseClip=state.lastClip||'idle';basePhase=state.lastPhase||0;}
 else if(attack){({clip,phase,blend}=attack);}
 else if(a.clips.hit&&hitAge>=0&&hitAge<a.clips.hit.duration){clip='hit';phase=hitAge/a.clips.hit.duration;blend=Math.min(1,hitAge/.065,(a.clips.hit.duration-hitAge)/.10);}
 else if(state.blend>.015){clip=gait;phase=state.phase;blend=state.blend;}
 if(!dying&&['attack','attack2','attack3','cast','throw','hit'].includes(clip)&&state.blend>.5){baseClip=gait;basePhase=state.phase;}
 const steps=r.skinned?Math.ceil(a.clips[clip].duration*60):large?48:24,blendSteps=r.skinned?64:16;
 phase=Math.round(phase*steps)/steps;blend=Math.round(Math.max(0,blend)*blendSteps)/blendSteps;
 if(!dying){state.lastClip=clip;state.lastPhase=phase;}
 const mesh=r.skinned?creatureRigPose(kind,clip,phase,blend,baseClip,basePhase):creaturePose(kind,clip,phase,blend,baseClip,basePhase),k=a.scale*variant;
 const crystal=kind==='boss_colossus',dissolve=crystal&&dying?Math.min(1,(time-o.deathAt)/a.clips.death.duration):0;
 const sink=dying?(crystal?dissolve*dissolve*1.2:Math.max(0,time-o.deathAt-a.clips.death.duration)*.3):0;
 // Imported motion can dip below the original bind-pose floor. Keep the
 // lowest contact above the terrain while preserving genuine airborne steps.
 const floor=dying?mesh.floorY:Math.min(mesh.floorY,a.mesh.bounds[0][1]);
 const hop=o.attackMove==='pounce'&&attack?Math.sin(Math.PI*Math.max(0,Math.min(1,(attackAge/(o.attackWindup||1.8)-.6)/.4)))*.55:0;
 const painter=groundedPainter(r,x,z),transform=briarTransform(x,-floor*k-sink+hop,z,k,state.heading);
 const style=crystal?{bossColor:o.enraged?2:1,dissolve}:{};
 if(painter.skinned)painter.skinned(creatureTint(o,a.mesh),transform,mesh.palette,style);else if(painter.indexed)painter.indexed(creatureTint(o,mesh),transform,style);else if(dissolve<.8)briarEmit(painter,creatureTint(o,mesh),transform);
 if(crystal&&dying&&typeof drawColossusShatter==='function')drawColossusShatter(painter,x,z,dissolve,o.enraged);
 return a.height*variant;
};

const creatureTints=new WeakMap();
function creatureTint(o,mesh){
 if(!o.tint&&!o.enraged)return mesh;let variants=creatureTints.get(mesh);if(!variants){variants=new Map();creatureTints.set(mesh,variants);}
 const tint=o.tint||[1,1,1],key=tint.join()+':'+!!o.enraged;if(variants.has(key))return variants.get(key);
 const tinted={...mesh,c:Float32Array.from(mesh.c,(v,i)=>Math.min(1,v*tint[i%3])),f:Float32Array.from(mesh.f,(v,i)=>Math.min(1,v*tint[i%3]))};if(o.enraged)for(let i=0;i<tinted.f.length;i+=3){const red=tinted.f[i],green=tinted.f[i+1],blue=tinted.f[i+2];tinted.f[i]=Math.max(blue,green*.95);tinted.f[i+1]=red*.45;tinted.f[i+2]=red*.35;}variants.set(key,tinted);return tinted;
}
function creatureAttackAnimation(o,a,age){
 const style=o.attackVisualStyle,clip=o.attackClip&&a.clips[o.attackClip]?o.attackClip:style==='magic'&&a.clips.cast?'cast':style==='ranged'&&a.clips.throw?'throw':'attack';
 const windup=o.attackWindup;if(!windup)return age>=0&&age<a.clips.attack.duration?{clip:'attack',phase:age/a.clips.attack.duration,blend:Math.min(1,age/.1,(a.clips.attack.duration-age)/.14)}:null;
 const recovery=o.attackRecovery||.55,duration=windup+recovery;if(age<0||age>=duration)return null;
 const release=a.clips[clip].release??(clip==='cast'?.51:clip==='throw'?.48:.38),phase=age<windup?age/windup*release:release+(age-windup)/recovery*(1-release);
 return {clip,phase,blend:Math.min(1,age/.1,(duration-age)/.14)};
}
// Reuse the authored human casting and punch motions on matching upper-body
// bones. Relative rotations preserve each monster's proportions and rest pose.
function addCreatureStyleClips(){
 const source=rebuiltAvatars.male,multiply=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
 const aliases={'Abdomen':'spine_01','Torso':'spine_03','Neck':'neck_01','Shoulder.L':'clavicle_l','Shoulder.R':'clavicle_r','UpperArm.L':'upperarm_l','UpperArm.R':'upperarm_r','LowerArm.L':'lowerarm_l','LowerArm.R':'lowerarm_r'};
 for(const kind of ['king','goblin','skeleton']){const a=creatureAssets[kind];for(const [name,original,rest]of [['cast','magic','staffIdle'],['throw','unarmed','idle']]){
  const motion=source.clips[original],trs=new Float32Array(motion.frames*a.joints*10);
  for(let f=0;f<motion.frames;f++)for(let j=0;j<a.joints;j++){
   const target=new Float32Array(10);sampleRealmJoint(a.clips.idle,0,j,a.joints,target);const bone=aliases[a.rig.names[j]]||a.rig.names[j],from=source.rig.names.indexOf(bone);
   if(from>=0&&!/^(root|pelvis|thigh|calf|foot|ball)/.test(bone)){
    const pose=new Float32Array(10),base=new Float32Array(10);sampleRealmJoint(motion,f,from,source.joints,pose);sampleRealmJoint(source.clips[rest],0,from,source.joints,base);
    const q=multiply(target.subarray(3,7),multiply([-base[3],-base[4],-base[5],base[6]],pose.subarray(3,7))),length=Math.hypot(...q)||1;for(let axis=0;axis<4;axis++)target[3+axis]=q[axis]/length;
   }trs.set(target,(f*a.joints+j)*10);
  }a.clips[name]={frames:motion.frames,duration:motion.duration,trs};
 }}
}
addCreatureStyleClips();
