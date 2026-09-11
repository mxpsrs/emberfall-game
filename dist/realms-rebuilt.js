'use strict';
// Human-scale modular architecture and textured, articulated characters.
function rebuiltMesh(m){const result={bounds:m.bounds};for(const k of ['p','uv'])result[k]=briarDecode(m[k],Float32Array);result.n=Float32Array.from(briarDecode(m.n,Int8Array),v=>v/127);for(const k of ['c','f'])result[k]=Float32Array.from(briarDecode(m[k],Uint8Array),v=>v/255);result.t=briarDecode(m.t,Uint8Array);if(m.j){result.j=briarDecode(m.j,Uint8Array);result.w=Float32Array.from(briarDecode(m.w,Uint8Array),v=>v/255);for(let i=0;i<result.w.length;i+=4){const sum=result.w[i]+result.w[i+1]+result.w[i+2]+result.w[i+3]||1;for(let j=0;j<4;j++)result.w[i+j]/=sum;}}result.i=briarDecode(m.i,Uint16Array);return result;}
const rebuiltModels=Object.fromEntries(Object.entries(REALM_MODELS.models).map(([k,m])=>[k,rebuiltMesh(m)]));
const rebuiltAvatars=Object.fromEntries(Object.entries(REALM_MODELS.avatars).map(([k,a])=>[k,{...a,mesh:rebuiltMesh(a.mesh),rig:a.rig?{...a.rig,bind:briarDecode(a.rig.bind,Float32Array)}:null,clips:Object.fromEntries(Object.entries(a.clips).map(([k,c])=>[k,{...c,m:c.m?briarDecode(c.m,Float32Array):null,trs:c.trs?briarDecode(c.trs,Float32Array):null}]))}]));
const rebuiltTints=new WeakMap();
function rebuiltPlace(r,name,x,y,z,scale=1,heading=0,vertical=scale,tint){let mesh=rebuiltModels[name];if(!mesh)return;
 if(tint){let variants=rebuiltTints.get(mesh);if(!variants){variants=new Map();rebuiltTints.set(mesh,variants);}const key=tint.join(':');if(!variants.has(key))variants.set(key,{...mesh,c:Float32Array.from(mesh.c,(c,i)=>c*tint[i%3])});mesh=variants.get(key);}
 briarEmit(r,mesh,briarTransform(x,y,z,scale,heading,vertical));
}
function rebuiltRoof(r,x,y,z,w,d,rise,color){
 const half=(w+.7)/2,depth=d+.7,rows=Math.ceil(half/.44),columns=Math.ceil(depth/.52),tiles=materialRealm(r,13),trim=materialRealm(r,5);
 for(const side of [-1,1])tiles.face([[x,y+rise,z-depth/2],[x,y+rise,z+depth/2],[x+side*half,y,z+depth/2],[x+side*half,y,z-depth/2]],shade3(color,.60));
 for(const side of [-1,1])for(let row=0;row<rows;row++){
  const u0=row/rows,u1=(row+1)/rows;
  for(let col=-1;col<columns;col++){
   const z0=Math.max(-depth/2,(col+(row%2)*.5)*depth/columns-depth/2),z1=Math.min(depth/2,(col+1+(row%2)*.5)*depth/columns-depth/2-.012);if(z1<=z0)continue;
   const a=[x+side*half*u0,y+rise*(1-u0)+.028,z+z0],b=[a[0],a[1],z+z1],c=[x+side*half*u1,y+rise*(1-u1)+.035,z+z1],e=[c[0],c[1],z+z0];
   const shade=.90+.12*(Math.sin(row*29.7+col*18.1+x)*.5+.5);r.face([a,b,c,e],shade3(color,shade),null,17,null,[[0,0],[1,0],[1,1],[0,1]]);
   tiles.face([e,c,[c[0],c[1]-.045,c[2]],[e[0],e[1]-.045,e[2]]],shade3(color,.69));
  }
 }
 for(const side of [-1,1]){
  const zz=z+side*d/2;materialRealm(r,7).face([[x-w/2,y-.05,zz],[x+w/2,y-.05,zz],[x,y+rise-.04,zz]],'#b6aa8b');
  beamArt(trim,[x-half,y,zz],[x,y+rise,zz],.09,'#67503b');beamArt(trim,[x,y+rise,zz],[x+half,y,zz],.09,'#67503b');
 }
 beamArt(tiles,[x,y+rise+.06,z-depth/2],[x,y+rise+.06,z+depth/2],.12,shade3(color,.82),6);
}
function rebuiltHouse(r,b,{tower=false,castle=false}={}){
 const race=b.race||kingdomAt(b.x,b.y).race,w=b.w,d=b.h,x=b.x+w/2,z=b.y+d/2,stone=race==='dwarf'||tower||castle||['temple','castle'].includes(b.archetype),wall=stone?'UnevenBrick':'Plaster',segments=Math.max(1,Math.round(w/2)),sideSegments=Math.max(1,Math.round(d/2)),scale=w/segments/2,sideScale=d/sideSegments/2,wallScale=scale*.85,level=2.65*scale;
 const floors=b._cutaway?1:tower?3:castle?2:['hall','temple'].includes(b.archetype)||b.archetype==='inn'&&b.variant%2===0?2:1+(b.archetype==='house'&&b.variant===3?1:0),tint=race==='elf'?[.90,1,.91]:race==='dwarf'?[.83,.87,.91]:[1,.97,.92];
 if(b.walkIn){for(let zz=b.y+.15;zz<b.y+d-.15;zz+=1)for(let xx=b.x+.15;xx<b.x+w-.15;xx+=1)r.face([[xx,.055,zz],[xx,.055,Math.min(zz+1,b.y+d-.15)],[Math.min(xx+1,b.x+w-.15),.055,Math.min(zz+1,b.y+d-.15)],[Math.min(xx+1,b.x+w-.15),.055,zz]],'#9b8465',null,b.archetype==='forge'?3:5);}
 for(let floor=0;floor<floors;floor++){
  for(const side of [-1,1])for(let i=0;i<segments;i++){
   const xx=b.x+(i+.5)*w/segments,door=floor===0&&side===1&&i===Math.floor(segments/2),window=!door&&(i+floor)%2===0;
   if(b._cutaway&&side*Math.cos(view3d.yaw)>.05&&!door){box3(r,xx,.32,z+d/2,w/segments,.64,.16,'#938675');continue;}
   const name='Wall_'+wall+'_'+(door?'Door_Round':window?'Window_Wide_Flat':'Straight');rebuiltPlace(r,name,xx,floor*level,z+side*d/2,scale,side===1?0:Math.PI,wallScale,tint);
   if(window)rebuiltPlace(r,'Window_Wide_Flat1',xx,floor*level,z+side*d/2,scale,side===1?0:Math.PI,wallScale);
   if(door){rebuiltPlace(r,'DoorFrame_Round_WoodDark',xx,floor*level,z+d/2+.04,scale,0,wallScale);}
  }
  for(const side of [-1,1])for(let i=0;i<sideSegments;i++){
   const zz=b.y+(i+.5)*d/sideSegments,angle=side===1?Math.PI/2:-Math.PI/2,window=(i+floor)%2===0;
   if(b._cutaway&&side*Math.sin(view3d.yaw)>.05){box3(r,x+side*w/2,.32,zz,.16,.64,d/sideSegments,'#938675');continue;}
   rebuiltPlace(r,'Wall_'+wall+'_'+(window?'Window_Wide_Flat':'Straight'),x+side*w/2,floor*level,zz,sideScale,angle,wallScale,tint);
   if(window)rebuiltPlace(r,'Window_Wide_Flat1',x+side*w/2,floor*level,zz,sideScale,angle,wallScale);
  }
 }
 if(b.walkIn&&['inn','house','hall','temple'].includes(b.archetype)){
  const rx=x,rz=b.y+d*.55,rw=Math.min(w-3,4.2),rd=Math.min(d-4,4.8),rug=materialRealm(r,13);
  rug.face([[rx-rw/2,.072,rz-rd/2],[rx-rw/2,.072,rz+rd/2],[rx+rw/2,.072,rz+rd/2],[rx+rw/2,.072,rz-rd/2]],race==='elf'?'#405d50':'#654c44');
  for(const side of [-1,1])rug.face([[rx-rw/2+.15,.076,rz+side*(rd/2-.24)],[rx+rw/2-.15,.076,rz+side*(rd/2-.24)],[rx+rw/2-.15,.076,rz+side*(rd/2-.12)],[rx-rw/2+.15,.076,rz+side*(rd/2-.12)]],'#b39a6b');
 }
 if(b._cutaway)return level;
 // Service fronts use their own materials and furnishings at the same scale as residents.
 const front=groundedPainter(r,x,z),doorX=b.x+(Math.floor(segments/2)+.5)*w/segments,frontZ=b.y+d+.12,wood=materialRealm(front,5);
 if(['shop','inn','forge'].includes(b.archetype)){
  const awningWidth=b.archetype==='shop'?4.0:2.8,awningY=level-.30,depth=b.archetype==='forge'?1.0:1.35;
  const colors=b.archetype==='shop'?['#68785a','#cfbf94']:b.archetype==='inn'?['#986552','#c7ad83']:['#615953','#787068'];
  for(let i=0;i<8;i++){
   const a=doorX-awningWidth/2+i*awningWidth/8,bb=a+awningWidth/8;
   front.face([[a,awningY,frontZ],[bb,awningY,frontZ],[bb,awningY-.28,frontZ+depth],[a,awningY-.28,frontZ+depth]],colors[i%2],null,13);
   front.face([[a,awningY-.28,frontZ+depth],[bb,awningY-.28,frontZ+depth],[bb,awningY-.45,frontZ+depth],[a,awningY-.42,frontZ+depth]],colors[i%2],null,13);
  }
  for(const side of [-1,1])beamArt(wood,[doorX+side*awningWidth/2,awningY-.95,frontZ],[doorX+side*awningWidth/2,awningY-.29,frontZ+depth],.045,'#644d36');
 }
 // Shutters and window boxes break up repeated blank plaster walls.
 if(!stone)for(let i=0;i<segments;i++)if(i%2===0&&i!==Math.floor(segments/2)){
  const wx=b.x+(i+.5)*w/segments;
  for(const side of [-1,1])box3(wood,wx+side*.60*scale,1.46*scale,frontZ,.24*scale,.72*scale,.065,'#666b4c');
  box3(wood,wx,1.02*scale,frontZ+.14,.85*scale,.16,.28,'#755a3e');
  for(const side of [-1,0,1])oval3(front,wx+side*.25*scale,1.18*scale,frontZ+.14,.34,.22,.27,'#607544',p=>p,6);
 }
 // Roof tiles keep a human-scale size as the footprint grows.
 const roofY=floors*level-.04,roofRise=tower?1.65:castle?Math.min(5,w*.18):Math.min(3.0,1.25+w*.11);
 const tileColor=race==='elf'?'#45635b':race==='dwarf'||b.archetype==='forge'?'#59636b':b.variant%3===1?'#746555':'#9b5038';
 const actualRoofTop=worldHouseRoof(r,b,roofY,roofRise,tileColor);
 if(!tower&&!b._castleCurtain)rebuiltPlace(r,b.archetype==='forge'?'Prop_Chimney2':'Prop_Chimney',x+w*.26,roofY+.1,z-d*.19,scale*.60);
 if(race==='elf'&&!tower)for(const side of [-1,1])rebuiltPlace(r,'Prop_Vine1',x+side*w*.35,level*.45,z+d*.5+.08,scale*.9);
 return Math.max(roofY+roofRise,actualRoofTop);
}
building3=function(r,b){
 const kind=b.archetype;
 if(b.arch||/crypt|ruins/i.test(b.name)){const k=b.w/2;rebuiltPlace(r,'Wall_Arch',b.x+b.w/2,0,b.y+b.h/2,k,0,1.1);b.visualHeight=3.3;return 3.3;}
 if(kind==='castle'){b.visualHeight=worldCastle(r,b);return b.visualHeight;}
 b.visualHeight=rebuiltHouse(r,b,{tower:/beacon/i.test(b.name)});return b.visualHeight;
};

const propBeforeRebuild=prop3;
prop3=function(r,o,x,z){
 let name,height;
 if(o.type==='camp'&&r.indexed){const base=groundedPainter(r,x,z);cachedRealmShape(base,'camp-base:'+meshDetail3,briarTransform(x,0,z),q=>{for(let i=0;i<8;i++){const a=i/8*Math.PI*2;oval3(q,Math.cos(a)*.3,.08,Math.sin(a)*.3,.18,.15,.18,'#7c8176',p=>p,6);}limb3(q,0,.13,0,.5,.15,.14,'#6e513c');return 1;});cone3(base,x,.15,z,.17,.5+Math.sin(time*12)*.06,'#e9ad6b',8);return 1;}
 if(o.name==='Village well'){
  const base=groundedPainter(r,x,z),stone=materialRealm(base,3),wood=materialRealm(base,5),segments=16;
  for(let row=0;row<3;row++)for(let i=0;i<segments;i++){
   const a=(i+(row%2)*.5)/segments*Math.PI*2,bb=a+Math.PI*2/segments-.014,y=.08+row*.23;
   const p=(angle,h,radius)=>[x+Math.cos(angle)*radius,h,z+Math.sin(angle)*radius];
   stone.face([p(a,y,.73),p(bb,y,.73),p(bb,y+.22,.73),p(a,y+.22,.73)],'#a3a08a');
   stone.face([p(a,y+.22,.73),p(bb,y+.22,.73),p(bb,y+.22,.48),p(a,y+.22,.48)],'#bbb7a0');
   stone.face([p(a,y+.22,.48),p(bb,y+.22,.48),p(bb,y,.48),p(a,y,.48)],'#777e72');
  }
  base.face(Array.from({length:segments},(_,i)=>[x+Math.cos(i*Math.PI*2/segments)*.48,.30,z+Math.sin(i*Math.PI*2/segments)*.48]),'#345d61',null,13);
  for(const side of [-1,1])beamArt(wood,[x+side*.86,.02,z],[x+side*.86,1.95,z],.075,'#705539',8);
  beamArt(wood,[x-.93,1.49,z],[x+.93,1.49,z],.065,'#8a6945',8);beamArt(wood,[x+.92,1.49,z],[x+.92,1.17,z+.04],.035,'#594b38');
  beamArt(base,[x,1.5,z],[x,.35,z],.012,'#b9a67c',5);rebuiltRoof(base,x,1.92,z,2.0,1.1,.40,'#776252');return 2.4;
 }
 if(o.name==='Log pile'){
  const base=groundedPainter(r,x,z),wood=materialRealm(base,5);
  for(const [dx,y]of [[-.32,.19],[0,.19],[.32,.19],[-.16,.46],[.16,.46]]){
   beamArt(wood,[x+dx,y,z-.65],[x+dx,y,z+.65],.155,'#68523a',10);
   for(const side of [-1,1])base.face(Array.from({length:10},(_,i)=>[x+dx+Math.cos(i*Math.PI/5)*.137,y+Math.sin(i*Math.PI/5)*.137,z+side*.654]),'#b09665',null,5);
  }return .7;
 }
 if(o.name==='Merchant wagon'){name='Prop_Wagon';height=1.45;r=groundedPainter(r,x,z);}
 else if(o.type==='practiceForge')return propBeforeRebuild(r,{...o,type:'forge'},x,z);
 else if(o.type==='tree'){const race=o.race||realmArtRace(x,z);name=race==='elf'?'TwistedTree_1':/pine/i.test(o.name)?(o.id%2?'Pine_1':'Pine_3'):(o.id%2?'CommonTree_1':'CommonTree_4');height=race==='elf'?7:5+(o.id%4)*.4;}
 else if(o.type==='ore'||o.name==='Mountain outcrop'){name=o.id%2?'Rock_Medium_1':'Rock_Medium_3';height=o.type==='ore'?.65:3;}
 else if(o.type==='prop'&&/fence/i.test(o.name)){name='Prop_WoodenFence_Single';height=1;}
 else if(o.type==='prop'&&/crate|supplies/i.test(o.name)){name='Prop_Crate';height=.8;}
 if(name){const mesh=rebuiltModels[name],[lo,hi]=mesh.bounds,k=height/(hi[1]-lo[1]);rebuiltPlace(r,name,x,-lo[1]*k,z,k,o.type==='tree'?x+z:0);return height;}
 return propBeforeRebuild(r,o,x,z);
};
const crossingsBeforeRebuild=drawRealmCrossings,rebuiltGround=new Map();
drawRealmCrossings=function(r){crossingsBeforeRebuild(r);drawWorldUnderstory(r);};
drawRealmWall=function(r,x,z){const id=currentScene+':'+x+':'+z;let key=realmArtWalls.get(id);if(!key){key={};realmArtWalls.set(id,key);if(realmArtWalls.size>400)realmArtWalls.delete(realmArtWalls.keys().next().value);}emitMesh3(r,cachedMesh3(key,'prop',q=>{rebuiltPlace(q,'Wall_UnevenBrick_Straight',x+.5,0,z+.5,.5,worldWall(x-1,z)||worldWall(x+1,z)?0:Math.PI/2,.44);return 1.4;}));};

let creatorDraft=null;
const rebuiltPoses=new Map();
function sampleRealmJoint(motion,frame,bone,joints,out){
 const lo=Math.floor(frame),hi=Math.min(motion.frames-1,lo+1),mix=frame-lo,a=(lo*joints+bone)*10,b=(hi*joints+bone)*10,data=motion.trs;
 const sign=data[a+3]*data[b+3]+data[a+4]*data[b+4]+data[a+5]*data[b+5]+data[a+6]*data[b+6]<0?-1:1;
 for(let j=0;j<10;j++)out[j]=data[a+j]*(1-mix)+data[b+j]*mix*(j>=3&&j<=6?sign:1);
 const length=Math.hypot(out[3],out[4],out[5],out[6]);for(let j=3;j<7;j++)out[j]/=length;
}
function realmJointMatrix(v){
 const [tx,ty,tz,x,y,z,w,sx,sy,sz]=v;
 return new Float32Array([(1-2*(y*y+z*z))*sx,2*(x*y-z*w)*sy,2*(x*z+y*w)*sz,tx,2*(x*y+z*w)*sx,(1-2*(x*x+z*z))*sy,2*(y*z-x*w)*sz,ty,2*(x*z-y*w)*sx,2*(y*z+x*w)*sy,(1-2*(x*x+y*y))*sz,tz]);
}
function realmSkeletonPose(a,clip,frame,blend,baseClip,baseFrame){
 const motion=a.clips[clip];if(!motion.trs){const offset=Math.round(frame)*a.count*12;return new Float32Array(motion.m.subarray(offset,offset+a.count*12));}
 const rig=a.rig,global=[],pose=new Float32Array(a.count*12),v=new Float32Array(10),base=new Float32Array(10);
 for(let bone=0;bone<a.joints;bone++){
  sampleRealmJoint(motion,frame,bone,a.joints,v);
  if(blend<1){sampleRealmJoint(a.clips[baseClip],baseFrame,bone,a.joints,base);const sign=v[3]*base[3]+v[4]*base[4]+v[5]*base[5]+v[6]*base[6]<0?-1:1;for(let j=0;j<10;j++)v[j]=base[j]*(1-blend)+v[j]*blend*(j>=3&&j<=6?sign:1);const length=Math.hypot(v[3],v[4],v[5],v[6]);for(let j=3;j<7;j++)v[j]/=length;}
  const local=realmJointMatrix(v),parent=rig.parents[bone];global.push(parent<0?local:affineMultiply(global[parent],local));
  pose.set(affineMultiply(global[bone],rig.bind.subarray(bone*12,bone*12+12)),bone*12);
 }
 pose.set(global[rig.head],a.head*12);pose.set(affineMultiply(global[rig.right],rig.rightGrip),a.right*12);pose.set(affineMultiply(global[rig.left],rig.leftGrip),a.left*12);
 return pose;
}
function avatarPose(sex,clip,phase,gear,look,blend=1,baseClip='idle',basePhase=0){
 const a=rebuiltAvatars[sex]||rebuiltAvatars.male,motion=a.clips[clip],frame=Math.min(motion.frames-1,Math.max(0,Math.round(phase*(motion.frames-1)*2)/2)),baseFrame=Math.min(a.clips[baseClip].frames-1,Math.max(0,Math.round(basePhase*(a.clips[baseClip].frames-1)*2)/2));blend=Math.round(blend*16)/16;
 const key=[sex,clip,frame,look,gear.body,gear.feet,gear.head,gear._cloth,blend,blend<1?baseClip:'',blend<1?baseFrame:''].join(':');if(rebuiltPoses.has(key))return rebuiltPoses.get(key);
 const mesh=a.mesh,p=new Float32Array(mesh.p.length),n=new Float32Array(mesh.n.length),c=new Float32Array(mesh.c),f=new Float32Array(mesh.f),t=new Uint8Array(mesh.t),m=realmSkeletonPose(a,clip,frame,blend,baseClip,baseFrame);
 const cloth=[[.22,.38,.50],[.47,.20,.20],[.23,.39,.26],[.36,.26,.46]][look%4],skin=[[1.48,1.36,1.17],[1.08,.99,.90],[1.67,1.48,1.23],[.75,.70,.66]][look%4];
 for(let v=0;v<p.length/3;v++){
  const i=v*3,x=mesh.p[i],y=mesh.p[i+1],torso=y>.80&&y<1.55&&Math.abs(x)<.78&&(y<1.45||Math.abs(x)<.42),feet=y<.25;
  if(torso){const color=gear._cloth|| (gear.body==='mageRobe'?[.30,.24,.40]:gear.body==='leatherArmor'?[.38,.24,.14]:cloth);for(let j=0;j<3;j++)c[i+j]=f[i+j]=color[j];t[v]=20;}
  else if(y>1.49||Math.abs(x)>.70){for(let j=0;j<3;j++){c[i+j]*=skin[j];f[i+j]*=skin[j];}}
  if(feet&&gear.feet){for(let j=0;j<3;j++)c[i+j]=f[i+j]=[.20,.13,.08][j];t[v]=20;}
  if(y>.89&&y<.96){for(let j=0;j<3;j++)c[i+j]=f[i+j]=[.19,.14,.085][j];t[v]=20;}
  const expand=torso?(y<1.02?.020:.010):feet&&gear.feet?.012:0;
  for(let w=0;w<4;w++){const weight=mesh.w[v*4+w];if(!weight)continue;const bone=mesh.j[v*4+w]*12;for(let axis=0;axis<3;axis++){const k=bone+axis*4;p[i+axis]+=weight*(m[k]*(x+mesh.n[i]*expand)+m[k+1]*(y+mesh.n[i+1]*expand)+m[k+2]*(mesh.p[i+2]+mesh.n[i+2]*expand)+m[k+3]);n[i+axis]+=weight*(m[k]*mesh.n[i]+m[k+1]*mesh.n[i+1]+m[k+2]*mesh.n[i+2]);}}
 }
 const pose=m;
 const result={...mesh,p,n,c,f,t,pose,avatar:a};rebuiltPoses.set(key,result);if(rebuiltPoses.size>128)rebuiltPoses.delete(rebuiltPoses.keys().next().value);return result;
}
function affineMultiply(a,b){const m=new Float32Array(12);for(let row=0;row<3;row++)for(let col=0;col<4;col++){m[row*4+col]=(col===3?a[row*4+3]:0);for(let k=0;k<3;k++)m[row*4+col]+=a[row*4+k]*b[k*4+col];}return m;}
const hairPalette=[[.30,.20,.12],[.45,.22,.12],[.10,.10,.11],[.67,.68,.65]],hairTintCache=new Map();
function tintedHair(name,look){const key=name+':'+look%4;if(!hairTintCache.has(key)){const m=rebuiltModels[name],t=hairPalette[look%4];hairTintCache.set(key,{...m,c:Float32Array.from(m.c,(v,i)=>v*t[i%3]),f:Float32Array.from(m.f,(v,i)=>v*t[i%3])});}return hairTintCache.get(key);}
const humanoidBeforeRebuild=humanoid3;
humanoid3=function(r,x,z,look,gear={},heading=0,walk=0,attack=0,size=1){
 r=groundedPainter(r,x,z);
 if(gear._bones){if(!r.indexed)return humanoidBeforeRebuild(r,x,z,look,gear,heading,walk,attack,size);const phase=Math.round((walk%(Math.PI*2))*24)/24,swing=Math.round(attack*32)/32,key=['skeleton',meshDetail3,look,gear.weapon,gear.shield,phase,swing].join(':');return cachedRealmShape(r,key,briarTransform(x,0,z,size,heading),q=>{humanoidBeforeRebuild(q,0,0,look,gear,0,phase,swing,1);return 2;});}
 const identity=gear===s.equipment?(creatorDraft||s.character||{}):{race:gear._race||'human',frame:gear._frame||(look%3===2?'female':'male'),hair:gear._hair??look%3},race=identity.race||gear._race||'human',sex=identity.frame||'male';
 const player=gear===s.equipment&&!creatorDraft,locomotion=player&&playerMotion.blend>.01,a=rebuiltAvatars[sex]||rebuiltAvatars.male;
 const attackClip=gear.weapon==='oakStaff'?'magic':gear.weapon==='shortbow'?'ranged':gear.weapon?'melee':'unarmed',duration=a.clips[attackClip].duration,age=player?time-lastAttack:Number.isFinite(gear._attackAt)?time-gear._attackAt:Infinity,attacking=age>=0&&age<duration;
 // Small, distant NPCs retain the authored resting pose. Updating every finger
 // on every background character was needlessly repacking megabytes per frame.
 const idleClip=gear.weapon&&['bronzeSword','ironSword'].includes(gear.weapon)?'swordIdle':'idle',nearbyIdle=!player&&cameraZoom3()*size>85&&Math.hypot(x-px-.5,z-py-.5)<6,idleTime=player?time:nearbyIdle?Math.floor(time*8)/8:0,idlePhase=(idleTime/a.clips[idleClip].duration)%1,clip=attacking?attackClip:locomotion?(playerMotion.running?'run':'walk'):!player&&walk?'walk':idleClip;
 const phase=attacking?age/duration:locomotion?playerMotion.phase:!player&&walk?(walk/10/.75)%1:idlePhase,blend=attacking?Math.max(0,Math.min(1,age/.10,(duration-age)/.14)):locomotion?playerMotion.blend:1;
 const mesh=avatarPose(sex,clip,phase,gear,look,blend,idleClip,idlePhase);
 const k=size*(race==='dwarf'?1.07:race==='elf'?.94:1),root=briarTransform(x,player?Math.max(0,Math.sin(Math.min(1,(time-playerHitAt)/.28)*Math.PI))*.025:0,z,k,heading,size*(race==='dwarf'?.77:race==='elf'?1.1:1));briarEmit(r,mesh,root);
 const head=mesh.pose.subarray(mesh.avatar.head*12,mesh.avatar.head*12+12),headTransform=affineMultiply(root,affineMultiply(head,mesh.avatar.headBind));
 if(gear._role==='guide')briarEmit(r,tintedHair('Hair_Beard',3),headTransform);
 if(gear._role==='cooking'){const hat={face(p,c){r.face(p.map(v=>briarPoint(v,0,headTransform)),c);}};profile3(hat,0,1.84,-.01,.39,.19,.36,[[-.5,.85],[.1,1],[.5,.85]],'#d1c9ad',p=>p,12);}
 if(typeof npcDressRealm==='function')npcDressRealm(r,headTransform,root,gear);
 if(!gear.head&&!['bandit','warden'].includes(gear._kind)){const hair=['Hair_SimpleParted','Hair_Long','Hair_Buzzed'][identity.hair%3||0];briarEmit(r,tintedHair(hair,look),headTransform);if(race==='dwarf')briarEmit(r,rebuiltModels.Hair_Beard,headTransform);}
 else if(gear.head){if(!mesh.helmet){const indices=[];for(let j=0;j<mesh.i.length;j+=3){const ids=[mesh.i[j],mesh.i[j+1],mesh.i[j+2]],y=ids.reduce((s,v)=>s+mesh.avatar.mesh.p[v*3+1],0)/3,z=ids.reduce((s,v)=>s+mesh.avatar.mesh.p[v*3+2],0)/3;if(y>1.62&&(y>1.74||z<.035))indices.push(...ids);}const p=Float32Array.from(mesh.p,(v,i)=>v+mesh.n[i]*.017),c=Float32Array.from(mesh.c,(_,i)=>[.48,.53,.55][i%3]);mesh.helmet={...mesh,p,c,f:c,t:new Uint8Array(mesh.t.length).fill(20),i:new Uint16Array(indices)};}briarEmit(r,mesh.helmet,root);}
 // Weapon meshes are attached to the new rig's actual palms.
 for(const [slot,bone]of [['weapon',mesh.avatar.right],['shield',mesh.avatar.left]])if(gear[slot]){
  const source=slot==='shield'?briarRigs.Knight.meshes.Badge_Shield:gear.weapon==='oakStaff'?briarRigs.Mage.meshes['2H_Staff']:gear.weapon==='shortbow'?null:briarRigs.Knight.meshes['1H_Sword'];
  const socket=mesh.pose.subarray(bone*12,bone*12+12),world=affineMultiply(root,socket);
  if(slot==='weapon'&&['bronzeSword','ironSword'].includes(gear.weapon)){fittedSwordRealm(r,world,gear.weapon==='bronzeSword');}
  else if(source){const k=slot==='shield'?.62:.78;briarEmit(r,source,affineMultiply(world,slot==='shield'?[k,0,0,0,0,0,-k,0,0,k,0,0]:[k,0,0,0,0,k,0,0,0,0,k,0]));}
  else{const bow={face(p,c){r.face(p.map(v=>briarPoint(v,0,world)),c);}},points=Array.from({length:13},(_,i)=>[.13*Math.sin(i*Math.PI/12),-.45+i*.075,0]);for(let i=0;i<12;i++)beamArt(bow,points[i],points[i+1],.016,'#81613b',5);beamArt(bow,points[0],points[12],.004,'#c9bd9d',4);}
 }
};

// A tapered blade with a narrow grip and guard, built around the palm socket.
function fittedSwordRealm(r,m,bronze){
 if(r.indexed){cachedRealmShape(r,'fitted-sword:'+bronze,m,q=>{buildFittedSwordRealm(q,[1,0,0,0,0,1,0,0,0,0,1,0],bronze);return 1;});return;}
 buildFittedSwordRealm(r,m,bronze);
}
function buildFittedSwordRealm(r,m,bronze){
 const local={face(p,c,n,material){r.face(p.map(v=>briarPoint(v,0,m)),c,null,material||0);}},steel=bronze?'#ad9261':'#b6c3c3',edge=bronze?'#d2b781':'#e1e4da';
 const blade=[[-.040,.08,0],[.040,.08,0],[.029,.60,0],[0,.74,0],[-.029,.60,0]],ridge=[0,.35,.014];
 for(let i=0;i<blade.length;i++){local.face([blade[i],blade[(i+1)%blade.length],ridge],i<2?steel:edge);local.face([blade[(i+1)%blade.length],blade[i],[0,.40,-.019]],steel);}
 beamArt(local,[-.095,.07,0],[.095,.07,0],.020,bronze?'#7b633e':'#727f80',7);
 beamArt(materialRealm(local,5),[0,-.10,0],[0,.055,0],.014,'#42352b',8);
 oval3(local,0,-.12,0,.05,.045,.044,bronze?'#9c8050':'#939d9b',p=>p,8);
}

let REALM_ATLAS_IMAGE=null;
function startRebuiltRealm(){if(typeof Image==='undefined'){boot();return;}REALM_ATLAS_IMAGE=new Image();REALM_ATLAS_IMAGE.onload=()=>{if(window.matchMedia('(pointer: coarse)').matches){const source=REALM_ATLAS_IMAGE,small=document.createElement('canvas');small.width=small.height=2048;small.getContext('2d').drawImage(source,0,0,2048,2048);source.onload=null;REALM_ATLAS_IMAGE=small;}boot();};REALM_ATLAS_IMAGE.onerror=()=>{$('loading').innerHTML='The world textures could not load. <button id="retryArt">Retry</button>';$('retryArt').onclick=startRebuiltRealm;};REALM_ATLAS_IMAGE.src='assets/realms/atlas.png';}
