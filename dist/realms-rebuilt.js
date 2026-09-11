'use strict';
// Human-scale modular architecture and textured, articulated characters.
function rebuiltMesh(m){const result={bounds:m.bounds};for(const k of ['p','uv'])result[k]=briarDecode(m[k],Float32Array);result.n=Float32Array.from(briarDecode(m.n,Int8Array),v=>v/127);for(const k of ['c','f'])result[k]=Float32Array.from(briarDecode(m[k],Uint8Array),v=>v/255);result.t=briarDecode(m.t,Uint8Array);if(m.j){result.j=briarDecode(m.j,Uint8Array);result.w=Float32Array.from(briarDecode(m.w,Uint8Array),v=>v/255);for(let i=0;i<result.w.length;i+=4){const sum=result.w[i]+result.w[i+1]+result.w[i+2]+result.w[i+3]||1;for(let j=0;j<4;j++)result.w[i+j]/=sum;}}result.i=briarDecode(m.i,Uint16Array);return result;}
const rebuiltModels=Object.fromEntries(Object.entries(REALM_MODELS.models).map(([k,m])=>[k,rebuiltMesh(m)]));
const rebuiltAvatars=Object.fromEntries(Object.entries(REALM_MODELS.avatars).map(([k,a])=>[k,{...a,mesh:rebuiltMesh(a.mesh),clips:Object.fromEntries(Object.entries(a.clips).map(([k,c])=>[k,{...c,m:briarDecode(c.m,Float32Array)}]))}]));
function rebuiltPlace(r,name,x,y,z,scale=1,heading=0,vertical=scale,tint){const mesh=rebuiltModels[name];if(!mesh)return;const m=briarTransform(x,y,z,scale,heading,vertical);briarEmit(r,tint?{...mesh,c:Float32Array.from(mesh.c,(c,i)=>c*tint[i%3])}:mesh,m);}
function rebuiltHouse(r,b,{tower=false,castle=false}={}){
 const race=b.race||kingdomAt(b.x,b.y).race,w=b.w,d=b.h,x=b.x+w/2,z=b.y+d/2,stone=race==='dwarf'||tower||castle||b.archetype==='temple',wall=stone?'UnevenBrick':'Plaster',segments=Math.max(1,Math.round(w/2)),sideSegments=Math.max(1,Math.round(d/2)),scale=w/segments/2,sideScale=d/sideSegments/2,level=2.7*scale;
 const floors=tower?3:castle?2:['inn','hall','temple'].includes(b.archetype)?2:1+(b.variant===3?1:0),tint=race==='elf'?[.90,1,.91]:race==='dwarf'?[.83,.87,.91]:[1,.97,.92];
 for(let floor=0;floor<floors;floor++){
  for(const side of [-1,1])for(let i=0;i<segments;i++){
   const xx=b.x+(i+.5)*w/segments,door=floor===0&&side===1&&i===Math.floor(segments/2),window=!door&&((i+floor)%2===0||b.archetype==='inn');
   const name='Wall_'+wall+'_'+(door?'Door_Round':window?'Window_Wide_Flat':'Straight');rebuiltPlace(r,name,xx,floor*level,z+side*d/2,scale,side===1?0:Math.PI,scale,tint);
   if(window)rebuiltPlace(r,'Window_Wide_Flat1',xx,floor*level,z+side*d/2,scale,side===1?0:Math.PI,scale);
   if(door){rebuiltPlace(r,'DoorFrame_Round_WoodDark',xx,floor*level,z+d/2+.04,scale);rebuiltPlace(r,'Door_1_Round',xx-.53*scale,floor*level,z+d/2+.04,scale);}
  }
  for(const side of [-1,1])for(let i=0;i<sideSegments;i++){
   const zz=b.y+(i+.5)*d/sideSegments,angle=side===1?Math.PI/2:-Math.PI/2,window=(i+floor)%2===0;
   rebuiltPlace(r,'Wall_'+wall+'_'+(window?'Window_Wide_Flat':'Straight'),x+side*w/2,floor*level,zz,sideScale,angle,scale,tint);
   if(window)rebuiltPlace(r,'Window_Wide_Flat1',x+side*w/2,floor*level,zz,sideScale,angle,scale);
  }
 }
 const roofScale=Math.max(w,d)/4,roofY=floors*level+.1;
 rebuiltPlace(r,'Roof_RoundTiles_4x4',x,roofY,z,roofScale,0,roofScale*.72,race==='elf'?[.59,.76,.72]:race==='dwarf'?[.62,.66,.70]:[.78,.69,.60]);
 for(const side of [-1,1])rebuiltPlace(r,'Roof_Front_Brick4',x,roofY,z+side*d/2,roofScale,side===1?0:Math.PI,roofScale*.72,tint);
 if(!tower)rebuiltPlace(r,b.archetype==='forge'?'Prop_Chimney2':'Prop_Chimney',x+w*.26,roofY+.1,z-d*.19,scale*.60);
 if(race==='elf'&&!tower)for(const side of [-1,1])rebuiltPlace(r,'Prop_Vine1',x+side*w*.35,level*.45,z+d*.5+.08,scale*.9);
 return roofY+3.1*roofScale;
}
building3=function(r,b){
 const kind=b.archetype;
 if(b.arch||/crypt|ruins/i.test(b.name)){const k=b.w/2;rebuiltPlace(r,'Wall_Arch',b.x+b.w/2,0,b.y+b.h/2,k,0,1.1);b.visualHeight=3.3;return 3.3;}
 if(kind==='castle'){
  // A broad central hall with four full-height corner towers.
  let top=rebuiltHouse(r,{...b,x:b.x+1.2,y:b.y+1.2,w:b.w-2.4,h:b.h-2.4},{castle:true});
  for(const sx of [-1,1])for(const sz of [-1,1]){const size=2.15;top=Math.max(top,rebuiltHouse(r,{...b,x:b.x+(sx===1?b.w-size:0),y:b.y+(sz===1?b.h-size:0),w:size,h:size},{tower:true}));}
  b.visualHeight=top;return top;
 }
 b.visualHeight=rebuiltHouse(r,b,{tower:/beacon/i.test(b.name)});return b.visualHeight;
};

const propBeforeRebuild=prop3;
prop3=function(r,o,x,z){
 let name,height;
 if(o.type==='tree'){const race=o.race||realmArtRace(x,z);name=race==='elf'?'TwistedTree_1':/pine/i.test(o.name)?(o.id%2?'Pine_1':'Pine_3'):(o.id%2?'CommonTree_1':'CommonTree_4');height=race==='elf'?7:5+(o.id%4)*.4;}
 else if(o.type==='ore'||o.name==='Mountain outcrop'){name=o.id%2?'Rock_Medium_1':'Rock_Medium_3';height=o.type==='ore'?.65:3;}
 else if(o.type==='prop'&&/fence/i.test(o.name)){name='Prop_WoodenFence_Single';height=1;}
 else if(o.type==='prop'&&/crate|supplies/i.test(o.name)){name='Prop_Crate';height=.8;}
 if(name){const mesh=rebuiltModels[name],[lo,hi]=mesh.bounds,k=height/(hi[1]-lo[1]);rebuiltPlace(r,name,x,-lo[1]*k,z,k,o.type==='tree'?x+z:0);return height;}
 return propBeforeRebuild(r,o,x,z);
};
const crossingsBeforeRebuild=drawRealmCrossings,rebuiltGround=new Map();
drawRealmCrossings=function(r){crossingsBeforeRebuild(r);let count=0;for(let x=Math.floor((px-15)/3)*3;x<px+15;x+=3)for(let z=Math.floor((py-15)/3)*3;z<py+15;z+=3){
 if(count>=65||x<1||z<1||terrainType(x,z)!==0||Math.abs(Math.sin(x*78.3+z*31.7))<.35||buildings.some(b=>x>b.x-1&&x<b.x+b.w+1&&z>b.y-1&&z<b.y+b.h+1))continue;
 const p=project3(x,0,z);if(p.x< -40||p.x>screen.w+40||p.y< -40||p.y>screen.h+40)continue;count++;
 const id=x+':'+z;let key=rebuiltGround.get(id);if(!key){key={};rebuiltGround.set(id,key);if(rebuiltGround.size>200)rebuiltGround.delete(rebuiltGround.keys().next().value);}
 emitMesh3(r,cachedMesh3(key,'prop',q=>{rebuiltPlace(q,(x+z)%7===0?'Fern_1':(x+z)%5===0?'Flower_3_Group':'Grass_Wispy_Short',x+.2,0,z+.1,.28+(Math.abs(x+z)%3)*.04,x+z);return .4;}));
}};
drawRealmWall=function(r,x,z){const id=currentScene+':'+x+':'+z;let key=realmArtWalls.get(id);if(!key){key={};realmArtWalls.set(id,key);if(realmArtWalls.size>400)realmArtWalls.delete(realmArtWalls.keys().next().value);}emitMesh3(r,cachedMesh3(key,'prop',q=>{rebuiltPlace(q,'Wall_UnevenBrick_Straight',x+.5,0,z+.5,.5,worldWall(x-1,z)||worldWall(x+1,z)?0:Math.PI/2,.44);return 1.4;}));};

let creatorDraft=null;
const rebuiltPoses=new Map();
function avatarPose(sex,clip,phase,gear,look){
 const a=rebuiltAvatars[sex]||rebuiltAvatars.male,motion=a.clips[clip],frame=Math.min(motion.frames-1,Math.max(0,Math.round(phase*(motion.frames-1)))),key=[sex,clip,frame,look,gear.body,gear.feet,gear.head].join(':');if(rebuiltPoses.has(key))return rebuiltPoses.get(key);
 const mesh=a.mesh,p=new Float32Array(mesh.p.length),n=new Float32Array(mesh.n.length),c=new Float32Array(mesh.c),f=new Float32Array(mesh.f),t=new Uint8Array(mesh.t),off=frame*a.count*12,m=motion.m;
 const cloth=[[.26,.40,.47],[.35,.41,.27],[.46,.27,.28],[.36,.29,.43]][look%4],skin=[[1.48,1.36,1.17],[1.08,.99,.90],[1.67,1.48,1.23],[.75,.70,.66]][look%4];
 for(let v=0;v<p.length/3;v++){
  const i=v*3,x=mesh.p[i],y=mesh.p[i+1],torso=y>.90&&y<1.48&&Math.abs(x)<.62,feet=y<.25;
  if(torso){const color=gear.body==='mageRobe'?[.30,.24,.40]:gear.body==='leatherArmor'?[.38,.24,.14]:cloth;for(let j=0;j<3;j++)c[i+j]=f[i+j]=color[j];t[v]=20;}
  else if(y>1.49||Math.abs(x)>.70){for(let j=0;j<3;j++){c[i+j]*=skin[j];f[i+j]*=skin[j];}}
  if(feet&&gear.feet){for(let j=0;j<3;j++)c[i+j]=f[i+j]=[.20,.13,.08][j];t[v]=20;}
  const expand=(torso&&gear.body||feet&&gear.feet)?.018:0;
  for(let w=0;w<4;w++){const weight=mesh.w[v*4+w];if(!weight)continue;const bone=off+mesh.j[v*4+w]*12;for(let axis=0;axis<3;axis++){const k=bone+axis*4;p[i+axis]+=weight*(m[k]*(x+mesh.n[i]*expand)+m[k+1]*(y+mesh.n[i+1]*expand)+m[k+2]*(mesh.p[i+2]+mesh.n[i+2]*expand)+m[k+3]);n[i+axis]+=weight*(m[k]*mesh.n[i]+m[k+1]*mesh.n[i+1]+m[k+2]*mesh.n[i+2]);}}
 }
 const result={...mesh,p,n,c,f,t,pose:m.subarray(off,off+a.count*12),avatar:a};rebuiltPoses.set(key,result);if(rebuiltPoses.size>48)rebuiltPoses.delete(rebuiltPoses.keys().next().value);return result;
}
function affineMultiply(a,b){const m=new Float32Array(12);for(let row=0;row<3;row++)for(let col=0;col<4;col++){m[row*4+col]=(col===3?a[row*4+3]:0);for(let k=0;k<3;k++)m[row*4+col]+=a[row*4+k]*b[k*4+col];}return m;}
const humanoidBeforeRebuild=humanoid3;
humanoid3=function(r,x,z,look,gear={},heading=0,walk=0,attack=0,size=1){
 if(gear._bones)return humanoidBeforeRebuild(r,x,z,look,gear,heading,walk,attack,size);
 const identity=gear===s.equipment?(creatorDraft||s.character||{}):{race:gear._race||'human',frame:gear._frame||(look%3===2?'female':'male'),hair:gear._hair??look%3},race=identity.race||gear._race||'human',sex=identity.frame||'male';
 const clip=attack>.01?(gear.weapon==='oakStaff'?'magic':gear.weapon==='shortbow'?'ranged':'melee'):walk?'walk':'idle',phase=attack>.01?Math.min(.99,Math.max(0,gear===s.equipment?(time-lastAttack)/.42:attack*.8)):walk?(walk/10/.8)%1:(time/2)%1;
 const mesh=avatarPose(sex,clip,phase,gear,look),k=size*(race==='dwarf'?1.07:race==='elf'?.94:1),root=briarTransform(x,0,z,k,heading,size*(race==='dwarf'?.77:race==='elf'?1.1:1));briarEmit(r,mesh,root);
 const head=mesh.pose.subarray(mesh.avatar.head*12,mesh.avatar.head*12+12),headTransform=affineMultiply(root,affineMultiply(head,mesh.avatar.headBind));
 if(!gear.head){const hair=['Hair_SimpleParted','Hair_Long','Hair_Buzzed'][identity.hair%3||0];briarEmit(r,rebuiltModels[hair],headTransform);if(race==='dwarf')briarEmit(r,rebuiltModels.Hair_Beard,headTransform);}
 else{const indices=[];for(let j=0;j<mesh.i.length;j+=3){const ids=[mesh.i[j],mesh.i[j+1],mesh.i[j+2]],y=ids.reduce((s,v)=>s+mesh.avatar.mesh.p[v*3+1],0)/3,z=ids.reduce((s,v)=>s+mesh.avatar.mesh.p[v*3+2],0)/3;if(y>1.62&&(y>1.74||z<.035))indices.push(...ids);}const p=Float32Array.from(mesh.p,(v,i)=>v+mesh.n[i]*.017),c=Float32Array.from(mesh.c,(_,i)=>[.48,.53,.55][i%3]);briarEmit(r,{...mesh,p,c,f:c,t:new Uint8Array(mesh.t.length).fill(20),i:new Uint16Array(indices)},root);}
 // Weapon meshes are attached to the new rig's actual palms.
 for(const [slot,bone]of [['weapon',mesh.avatar.right],['shield',mesh.avatar.left]])if(gear[slot]){
  const source=slot==='shield'?briarRigs.Knight.meshes.Badge_Shield:gear.weapon==='oakStaff'?briarRigs.Mage.meshes['2H_Staff']:gear.weapon==='shortbow'?null:briarRigs.Knight.meshes['1H_Sword'];
  const socket=mesh.pose.subarray(bone*12,bone*12+12),world=affineMultiply(root,socket);
  if(source)briarEmit(r,source,world);
  else{const bow={face(p,c){r.face(p.map(v=>briarPoint(v,0,world)),c);}},points=Array.from({length:13},(_,i)=>[.13*Math.sin(i*Math.PI/12),-.45+i*.075,0]);for(let i=0;i<12;i++)beamArt(bow,points[i],points[i+1],.016,'#81613b',5);beamArt(bow,points[0],points[12],.004,'#c9bd9d',4);}
 }
};

let REALM_ATLAS_IMAGE=null;
function startRebuiltRealm(){if(typeof Image==='undefined'){boot();return;}REALM_ATLAS_IMAGE=new Image();REALM_ATLAS_IMAGE.onload=()=>boot();REALM_ATLAS_IMAGE.onerror=()=>{$('loading').innerHTML='The world textures could not load. <button id="retryArt">Retry</button>';$('retryArt').onclick=startRebuiltRealm;};REALM_ATLAS_IMAGE.src='assets/realms/atlas.png';}
