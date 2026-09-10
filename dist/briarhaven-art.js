'use strict';
// An authored-asset pilot. Other settlements retain their existing art until
// Briarhaven's direction is approved. Gameplay objects and save IDs are intact.
function briarDecode(text,Type){const bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));return new Type(bytes.buffer);}
function briarMesh(source){return {p:briarDecode(source.p,Float32Array),n:Float32Array.from(briarDecode(source.n,Int8Array),v=>v/127),c:Float32Array.from(briarDecode(source.c,Uint8Array),v=>v/255),i:briarDecode(source.i,Uint16Array),j:source.j?briarDecode(source.j,Uint8Array):null,w:source.w?briarDecode(source.w,Uint8Array):null,bounds:source.bounds};}
const briarModels=Object.fromEntries(Object.entries(BRIARHAVEN_ASSETS.models).map(([k,m])=>[k,briarMesh(m)]));
const briarRigs=Object.fromEntries(Object.entries(BRIARHAVEN_ASSETS.rigs).map(([k,r])=>[k,{...r,meshes:Object.fromEntries(Object.entries(r.meshes).map(([n,m])=>[n,briarMesh(m)])),clips:Object.fromEntries(Object.entries(r.clips).map(([n,c])=>[n,{...c,m:briarDecode(c.m,Float32Array)}]))}]));
// Keep the artist's material separation, with slate roofs suited to this world.
for(const [key,mesh] of Object.entries(briarModels))if(['inn','shop','forge','homeA','homeB'].includes(key))for(let i=0;i<mesh.c.length;i+=3){const r=mesh.c[i],g=mesh.c[i+1],b=mesh.c[i+2];if(b>r*1.15&&b>g*1.05){mesh.c[i]=r*.7+b*.22;mesh.c[i+1]=g*.78;mesh.c[i+2]=b*.70;}}

function briarTransform(x,y,z,scale=1,heading=0,vertical=scale){const c=Math.cos(heading),s=Math.sin(heading);return [c*scale,0,s*scale,x,0,vertical,0,y,-s*scale,0,c*scale,z];}
function briarPoint(p,i,m){return [m[0]*p[i]+m[1]*p[i+1]+m[2]*p[i+2]+m[3],m[4]*p[i]+m[5]*p[i+1]+m[6]*p[i+2]+m[7],m[8]*p[i]+m[9]*p[i+1]+m[10]*p[i+2]+m[11]];}
function briarNormal(n,i,m){const sx=m[0]*m[0]+m[8]*m[8],sy=m[5]*m[5];return [m[0]*n[i]/sx+m[2]*n[i+2]/sx,m[5]*n[i+1]/sy,m[8]*n[i]/sx+m[10]*n[i+2]/sx];}
function realmIndexedData(data,mesh,m){
 const p=mesh.p,n=mesh.n,c=mesh.c,positions=new Float32Array(p.length),normals=new Float32Array(n.length);
 const sx=m[0]*m[0]+m[8]*m[8],sy=m[5]*m[5];
 for(let i=0;i<p.length;i+=3){positions[i]=m[0]*p[i]+m[2]*p[i+2]+m[3];positions[i+1]=m[5]*p[i+1]+m[7];positions[i+2]=m[8]*p[i]+m[10]*p[i+2]+m[11];normals[i]=(m[0]*n[i]+m[2]*n[i+2])/sx;normals[i+1]=m[5]*n[i+1]/sy;normals[i+2]=(m[8]*n[i]+m[10]*n[i+2])/sx;}
 for(let j=0;j<mesh.i.length;j++){const i=mesh.i[j]*3;data.push(positions[i],positions[i+1],positions[i+2],normals[i],normals[i+1],normals[i+2],c[i],c[i+1],c[i+2],12);}
}
function briarEmit(r,mesh,m){
 if(r.indexed){r.indexed(mesh,m);return;}
 for(let i=0;i<mesh.i.length;i+=3){const ids=[mesh.i[i]*3,mesh.i[i+1]*3,mesh.i[i+2]*3],colors=ids.map(j=>[mesh.c[j],mesh.c[j+1],mesh.c[j+2]]),col='#'+[0,1,2].map(k=>Math.round(colors.reduce((a,c)=>a+c[k],0)/3*255).toString(16).padStart(2,'0')).join('');r.face(ids.map(j=>briarPoint(mesh.p,j,m)),col,ids.map(j=>briarNormal(mesh.n,j,m)),12,colors);}
}
const buildingBeforeBriar=building3;
building3=function(r,b){
 if(b.settlement!=='briarhaven')return buildingBeforeBriar(r,b);
 const key=['inn','shop','forge'].includes(b.archetype)?b.archetype:(b.x<8?'homeA':'homeB'),mesh=briarModels[key],[lo,hi]=mesh.bounds,scale=Math.min((b.w+.12)/(hi[0]-lo[0]),(b.h+.12)/(hi[2]-lo[2])),vertical=Math.max(scale*1.18,3.9/(hi[1]-lo[1]));
 const m=briarTransform(b.x+b.w/2-(lo[0]+hi[0])/2*scale,-lo[1]*vertical,b.y+b.h/2-(lo[2]+hi[2])/2*scale,scale,0,vertical);
 briarEmit(r,mesh,m);b.visualHeight=(hi[1]-lo[1])*vertical;return b.visualHeight;
};
const propBeforeBriar=prop3;
prop3=function(r,o,x,z){
 const local=inWorld()?x<32&&z<38:currentScene==='inn'||currentScene==='shop'||currentScene==='forge'||currentScene.startsWith('realm_briarhaven_');
 if(local){let key,height;if(o.type==='tree'){key=(Math.floor(x+z)%2)?'treeA':'treeB';height=3.4+(Math.floor(x*3+z)%5)*.17;}else if(o.type==='prop'&&/barrel/i.test(o.name)){key='barrel';height=.65;}else if(o.type==='prop'&&/crate/i.test(o.name)){key='crate';height=.65;}
  if(key){const mesh=briarModels[key],[lo,hi]=mesh.bounds,k=height/(hi[1]-lo[1]);briarEmit(r,mesh,briarTransform(x,-lo[1]*k,z,k,(x+z)*1.7));return height;}}
 return propBeforeBriar(r,o,x,z);
};

// Skin pieces with their own source rig. Equipment meshes use authored head and
// hand sockets, so the grip and helmet remain attached through every pose.
const briarPoseCache=new Map();
function briarPose(rigName,part,clip,phase,tint=''){
 const rig=briarRigs[rigName],motion=rig.clips[clip],frame=Math.min(motion.frames-1,Math.max(0,Math.round(phase*(motion.frames-1)))),key=[rigName,part,clip,frame,tint].join(':');
 if(briarPoseCache.has(key))return briarPoseCache.get(key);
 const mesh=rig.meshes[part],p=new Float32Array(mesh.p.length),n=new Float32Array(mesh.n.length),offset=frame*rig.jointCount*12,m=motion.m;
 for(let v=0;v<mesh.p.length/3;v++){const i=v*3;let sum=0;for(let a=0;a<4;a++)sum+=mesh.w[v*4+a];for(let a=0;a<4;a++){const w=mesh.w[v*4+a]/(sum||255);if(!w)continue;const j=offset+mesh.j[v*4+a]*12;for(let axis=0;axis<3;axis++){const k=j+axis*4;p[i+axis]+=w*(m[k]*mesh.p[i]+m[k+1]*mesh.p[i+1]+m[k+2]*mesh.p[i+2]+m[k+3]);n[i+axis]+=w*(m[k]*mesh.n[i]+m[k+1]*mesh.n[i+1]+m[k+2]*mesh.n[i+2]);}}}
 if(part==='Head'||part==='Helmet'){const h=offset+rig.head*12;for(let i=0;i<p.length;i+=3)for(let a=0;a<3;a++){const pivot=m[h+a*4+3];p[i+a]=pivot+(p[i+a]-pivot)*.72;}}
 let colors=mesh.c;
 if(tint){colors=new Float32Array(mesh.c);const cloth=[[.37,.53,.63],[.49,.55,.32],[.61,.34,.39],[.48,.40,.61]][Number(tint[0])||0];for(let i=0;i<colors.length;i+=3){const r=colors[i],g=colors[i+1],b=colors[i+2];let target=null;if(part==='Head'&&r>.70&&g/r>.62&&g/r<.87&&b/g>.55&&b/g<.90)target=[[.86,.67,.49],[.66,.45,.30],[.91,.75,.57],[.49,.32,.23]][Number(tint[0])||0];else if(tint.includes('leather')&&Math.max(r,g,b)-Math.min(r,g,b)<.20&&r>.22)target=[.51,.34,.20];else if(tint.includes('bronze')&&Math.max(r,g,b)-Math.min(r,g,b)<.20&&r>.22)target=[.72,.53,.30];else if(tint.includes('cloth')&&g>r*1.13&&g>b*1.10)target=cloth;if(target){const light=Math.max(r,g,b);for(let a=0;a<3;a++)colors[i+a]=target[a]*(.5+light*.65);}}}
 const result={...mesh,p,n,c:colors};briarPoseCache.set(key,result);if(briarPoseCache.size>140)briarPoseCache.delete(briarPoseCache.keys().next().value);return result;
}
function briarEquipment(gear){
 const body=gear.body==='mageRobe'?'Mage':gear.body==='leatherArmor'?'Knight':'Rogue',feet=gear.feet?'Knight':'Rogue';
 const parts=[[body,'Body',gear.body==='leatherArmor'?'leather':'cloth'],[body,'ArmLeft',gear.body==='leatherArmor'?'leather':'cloth'],[body,'ArmRight',gear.body==='leatherArmor'?'leather':'cloth'],[feet,'LegLeft',gear.feet?'leather':''],[feet,'LegRight',gear.feet?'leather':''],[gear.head?'Knight':'Mage','Head','']];
 if(gear.head)parts.push(['Knight','Helmet','']);
 if(gear.weapon==='bronzeSword'||gear.weapon==='ironSword')parts.push(['Knight','1H_Sword',gear.weapon==='bronzeSword'?'bronze':'']);
 if(gear.weapon==='oakStaff')parts.push(['Mage','2H_Staff','']);
 if(gear.shield)parts.push(['Knight','Badge_Shield','']);
 return parts;
}
const humanoidBeforeBriar=humanoid3;
humanoid3=function(r,x,z,look,gear={},heading=0,walk=0,attack=0,size=1){
 // Preserve the distinctive races and monsters. The player and other human
 // adventurers use the new character consistently, including portraits.
 if(gear._bones||(gear._race&&gear._race!=='human'))return humanoidBeforeBriar(r,x,z,look,gear,heading,walk,attack,size);
 const clip=attack>.015?(gear.weapon==='oakStaff'?'magic':gear.weapon==='shortbow'?'ranged':gear.weapon?'melee':'unarmed'):walk?'walk':'idle';
 const phase=attack>.015?(gear===s.equipment?Math.max(0,Math.min(.98,(time-lastAttack)/.42)):Math.min(.98,(Math.asin(Math.min(1,attack))/Math.PI)*1.8)):(walk?((walk/10)/briarRigs.Rogue.clips.walk.duration)%1:(time/briarRigs.Rogue.clips.idle.duration)%1);
 const m=briarTransform(x,0,z,size*.94,heading);
 for(const [rig,part,tint]of briarEquipment(gear))briarEmit(r,briarPose(rig,part,clip,phase,String(look%4)+tint),m);
 if(gear.weapon==='shortbow'){
  const rig=briarRigs.Rogue,motion=rig.clips[clip],f=Math.round(phase*(motion.frames-1)),o=(f*rig.jointCount+rig.hand)*12,socket=motion.m.subarray(o,o+12),bow={face(p,c){r.face(p.map(a=>briarPoint(briarPoint(a,0,socket),0,m)),c);}};
  const points=Array.from({length:13},(_,i)=>[Math.sin(i/12*Math.PI)*.17,-.45+i*.075,0]);for(let i=0;i<12;i++)beamArt(bow,points[i],points[i+1],.021,'#987043',6);beamArt(bow,points[0],points[12],.005,'#d7c9a8',4);
 }
};
boot();
