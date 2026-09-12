'use strict';
// Imported meshes and skeletal motion replace every procedural monster body.
const creatureAssets=Object.fromEntries(Object.entries(REALM_CREATURES).map(([key,a])=>[key,{
 ...a,mesh:rebuiltMesh(a.mesh),rig:{...a.rig,bind:briarDecode(a.rig.bind,Float32Array)},
 clips:Object.fromEntries(Object.entries(a.clips).map(([key,c])=>[key,{...c,trs:briarDecode(c.trs,Float32Array)}]))
}]));
const creaturePoses=new Map();
const creatureKinds={goblin:'goblin',wolf:'wolf',ridgewolf:'wolf',rat:'rat',slime:'slime',skeleton:'skeleton',warden:'skeleton',sentinel:'skeleton',king:'king'};
function creatureAsset(o){return creatureAssets[creatureKinds[o.kind]];}
function creaturePose(kind,clip,phase,blend=1,baseClip='idle',basePhase=0){
 const a=creatureAssets[kind],motion=a.clips[clip],frame=Math.max(0,Math.min(motion.frames-1,phase*(motion.frames-1)));
 const baseFrame=Math.max(0,Math.min(a.clips[baseClip].frames-1,basePhase*(a.clips[baseClip].frames-1)));
 const key=[kind,clip,frame.toFixed(2),blend.toFixed(2),blend<1?baseClip:'',blend<1?baseFrame.toFixed(2):''].join(':');
 if(creaturePoses.has(key))return creaturePoses.get(key);
 const global=[],skin=[],v=new Float32Array(10),b=new Float32Array(10);
 for(let i=0;i<a.joints;i++){
  sampleRealmJoint(motion,frame,i,a.joints,v);
  if(blend<1){sampleRealmJoint(a.clips[baseClip],baseFrame,i,a.joints,b);const sign=v[3]*b[3]+v[4]*b[4]+v[5]*b[5]+v[6]*b[6]<0?-1:1;
   for(let j=0;j<10;j++)v[j]=b[j]*(1-blend)+v[j]*blend*(j>=3&&j<=6?sign:1);
   const length=Math.hypot(v[3],v[4],v[5],v[6]);for(let j=3;j<7;j++)v[j]/=length;
  }
  const local=realmJointMatrix(v),parent=a.rig.parents[i],world=parent<0?local:affineMultiply(global[parent],local);global.push(world);
 }
 for(let i=0;i<a.rig.deforms.length;i++)skin.push(affineMultiply(global[a.rig.deforms[i]],a.rig.bind.subarray(i*12,i*12+12)));
 const mesh=a.mesh,p=new Float32Array(mesh.p.length),n=new Float32Array(mesh.n.length);let floorY=Infinity;
 for(let i=0;i<mesh.p.length/3;i++){
  const k=i*3;
  for(let j=0;j<4;j++){
   const weight=mesh.w[i*4+j];if(!weight)continue;const m=skin[mesh.j[i*4+j]];
   for(let axis=0;axis<3;axis++){const t=axis*4;
    p[k+axis]+=weight*(m[t]*mesh.p[k]+m[t+1]*mesh.p[k+1]+m[t+2]*mesh.p[k+2]+m[t+3]);
    n[k+axis]+=weight*(m[t]*mesh.n[k]+m[t+1]*mesh.n[k+1]+m[t+2]*mesh.n[k+2]);
   }
  }
  const length=Math.hypot(n[k],n[k+1],n[k+2])||1;for(let axis=0;axis<3;axis++)n[k+axis]/=length;
  floorY=Math.min(floorY,p[k+1]);
 }
 const result={...mesh,p,n,floorY};creaturePoses.set(key,result);
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
  if(walking)state.phase=(state.phase+distance/(o.kind==='rat'?.52:['wolf','ridgewolf'].includes(o.kind)?1.6:1.15))%1;
  let desired=walking?Math.atan2(dx,dz):state.heading;
  if(target===o&&Math.hypot(px+.5-x,py+.5-z)<3)desired=Math.atan2(px+.5-x,py+.5-z);
  const delta=Math.atan2(Math.sin(desired-state.heading),Math.cos(desired-state.heading));state.heading+=delta*Math.min(1,dt*15);
  state.time=time;state.x=x;state.z=z;
 }
 return state;
}
function creatureDying(o){const a=creatureAsset(o);return !!a&&o.dead>time&&Number.isFinite(o.deathAt)&&time-o.deathAt<a.clips.death.duration+.6;}
const creatureBeforeImports=creature3;
creature3=function(r,o,x,z){
 const kind=creatureKinds[o.kind],a=creatureAssets[kind];if(!a)return creatureBeforeImports(r,o,x,z);
 const dying=creatureDying(o),state=creatureMotion(o,x,z),large=cameraZoom3()*a.height>65,near=Math.hypot(x-px-.5,z-py-.5)<8;
 const idlePhase=near?(Math.floor(time*(large?16:8))/(large?16:8)/a.clips.idle.duration)%1:0;
 let clip='idle',phase=idlePhase,blend=1,baseClip='idle',basePhase=idlePhase;
 const attackAge=time-(o.attackAt??-100),hitAge=time-(o.hitAt??-100);
 if(dying){clip='death';phase=Math.min(1,(time-o.deathAt)/a.clips.death.duration);}
 else if(attackAge>=0&&attackAge<a.clips.attack.duration){clip='attack';phase=attackAge/a.clips.attack.duration;blend=Math.min(1,attackAge/.07,(a.clips.attack.duration-attackAge)/.10);}
 else if(a.clips.hit&&hitAge>=0&&hitAge<a.clips.hit.duration){clip='hit';phase=hitAge/a.clips.hit.duration;blend=Math.min(1,hitAge/.045,(a.clips.hit.duration-hitAge)/.08);}
 else if(state.blend>.015){clip=state.speed>3.2?'run':'walk';phase=state.phase;blend=state.blend;}
 const steps=large?48:24;phase=Math.round(phase*steps)/steps;blend=Math.round(Math.max(0,blend)*8)/8;
 const mesh=creaturePose(kind,clip,phase,blend,baseClip,basePhase),variant=o.kind==='ridgewolf'?1.12:o.kind==='warden'||o.kind==='sentinel'?1.16:1,k=a.scale*variant;
 const sink=dying?Math.max(0,time-o.deathAt-a.clips.death.duration)*.3:0;
 // Imported motion can dip below the original bind-pose floor. Keep the
 // lowest contact above the terrain while preserving genuine airborne steps.
 const floor=dying?mesh.floorY:Math.min(mesh.floorY,a.mesh.bounds[0][1]);
 briarEmit(groundedPainter(r,x,z),mesh,briarTransform(x,-floor*k-sink,z,k,state.heading));
 return a.height*variant;
};
