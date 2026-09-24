'use strict';
// The approved Briarhaven art direction across all kingdoms and interiors.
// Gameplay objects, collision footprints and save IDs stay stable.
function briarDecode(text,Type){const binary=atob(text),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Type(bytes.buffer);}
function briarMesh(source){return {p:briarDecode(source.p,Float32Array),n:Float32Array.from(briarDecode(source.n,Int8Array),v=>v/127),c:Float32Array.from(briarDecode(source.c,Uint8Array),v=>v/255),i:briarDecode(source.i,Uint16Array),j:source.j?briarDecode(source.j,Uint8Array):null,w:source.w?briarDecode(source.w,Uint8Array):null,bounds:source.bounds};}
const briarModels=Object.fromEntries(Object.entries(BRIARHAVEN_ASSETS.models).map(([k,m])=>[k,briarMesh(m)]));
const briarRigs=Object.fromEntries(Object.entries(BRIARHAVEN_ASSETS.rigs).map(([k,r])=>[k,{...r,meshes:Object.fromEntries(Object.entries(r.meshes).map(([n,m])=>[n,briarMesh(m)])),clips:Object.fromEntries(Object.entries(r.clips).map(([n,c])=>[n,{...c,m:briarDecode(c.m,Float32Array)}]))}]));
// Keep the artist's material separation, with slate roofs suited to this world.
for(const [key,mesh] of Object.entries(briarModels))if(['inn','shop','forge','homeA','homeB','castle','hall','temple','tower','watchTower','towerBase','well','mine','windmill'].includes(key))for(let i=0;i<mesh.c.length;i+=3){const r=mesh.c[i],g=mesh.c[i+1],b=mesh.c[i+2];if(b>r*1.15&&b>g*1.05){mesh.c[i]=r*.7+b*.22;mesh.c[i+1]=g*.78;mesh.c[i+2]=b*.70;}}

function briarTransform(x,y,z,scale=1,heading=0,vertical=scale){const c=Math.cos(heading),s=Math.sin(heading);return [c*scale,0,s*scale,x,0,vertical,0,y,-s*scale,0,c*scale,z];}
function briarPoint(p,i,m){return [m[0]*p[i]+m[1]*p[i+1]+m[2]*p[i+2]+m[3],m[4]*p[i]+m[5]*p[i+1]+m[6]*p[i+2]+m[7],m[8]*p[i]+m[9]*p[i+1]+m[10]*p[i+2]+m[11]];}
function briarNormal(n,i,m){const a=m[0],b=m[1],c=m[2],d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],k=m[10],det=a*(e*k-f*h)-b*(d*k-f*g)+c*(d*h-e*g)||1;return [((e*k-f*h)*n[i]+(f*g-d*k)*n[i+1]+(d*h-e*g)*n[i+2])/det,((c*h-b*k)*n[i]+(a*k-c*g)*n[i+1]+(b*g-a*h)*n[i+2])/det,((b*f-c*e)*n[i]+(c*d-a*f)*n[i+1]+(a*e-b*d)*n[i+2])/det];}
function realmIndexedData(data,mesh,m){
 const p=mesh.p,n=mesh.n,c=mesh.c,positions=new Float32Array(p.length),normals=new Float32Array(n.length);
 const a=m[0],b=m[1],cc=m[2],d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],k=m[10],det=a*(e*k-f*h)-b*(d*k-f*g)+cc*(d*h-e*g)||1,N=[e*k-f*h,f*g-d*k,d*h-e*g,cc*h-b*k,a*k-cc*g,b*g-a*h,b*f-cc*e,cc*d-a*f,a*e-b*d].map(v=>v/det);
 for(let i=0;i<p.length;i+=3){positions[i]=a*p[i]+b*p[i+1]+cc*p[i+2]+m[3];positions[i+1]=d*p[i]+e*p[i+1]+f*p[i+2]+m[7];positions[i+2]=g*p[i]+h*p[i+1]+k*p[i+2]+m[11];normals[i]=N[0]*n[i]+N[1]*n[i+1]+N[2]*n[i+2];normals[i+1]=N[3]*n[i]+N[4]*n[i+1]+N[5]*n[i+2];normals[i+2]=N[6]*n[i]+N[7]*n[i+1]+N[8]*n[i+2];}
 // Atlas slots are categorical: interpolating slot numbers across a sleeve
 // boundary sampled unrelated textures and produced stripes across the wrist.
 for(let j=0;j<mesh.i.length;j+=3){
  const ids=[mesh.i[j],mesh.i[j+1],mesh.i[j+2]],materials=ids.map(v=>mesh.t?.[v]||(mesh.uv?20:12)),mixed=materials[0]!==materials[1]||materials[1]!==materials[2],material=mixed?20:materials[0],colors=mixed&&mesh.f?mesh.f:c;
  for(const v of ids){const i=v*3;data.push(positions[i],positions[i+1],positions[i+2],normals[i],normals[i+1],normals[i+2],colors[i],colors[i+1],colors[i+2],material,mesh.uv?.[v*2]||0,mesh.uv?.[v*2+1]||0);}
 }
}
function briarEmit(r,mesh,m){
 if(r.indexed){r.indexed(mesh,m);return;}
 // Procedural scenery uses packed triangles; software and picking painters
 // must accept the same geometry as the GPU renderer.
 if(mesh.packed){
  const data=mesh.packed;
  for(let i=0;i<data.length;i+=36){const ids=[i,i+12,i+24],colors=ids.map(j=>[data[j+6],data[j+7],data[j+8]]),col='#'+[0,1,2].map(k=>Math.min(255,Math.max(0,Math.round(colors.reduce((a,c)=>a+c[k],0)/3*255))).toString(16).padStart(2,'0')).join('');
   r.face(ids.map(j=>briarPoint(data,j,m)),col,ids.map(j=>briarNormal(data,j+3,m)),data[i+9],colors,ids.map(j=>[data[j+10],data[j+11]]));
  }return;
 }
 for(let i=0;i<mesh.i.length;i+=3){const ids=[mesh.i[i]*3,mesh.i[i+1]*3,mesh.i[i+2]*3];if(r.software&&mesh.softwareCullBackfaces){const normal=briarNormal(mesh.n,ids[0],m),pitch=cameraPitch3(),dot=normal[0]*Math.sin(view3d.yaw)*Math.cos(pitch)+normal[1]*Math.sin(pitch)+normal[2]*Math.cos(view3d.yaw)*Math.cos(pitch);if(dot<=0)continue;}const colors=ids.map(j=>{const c=r.software&&mesh.f?mesh.f:mesh.c;return [c[j],c[j+1],c[j+2]];}),col='#'+[0,1,2].map(k=>Math.min(255,Math.max(0,Math.round(ids.reduce((a,j)=>a+(mesh.f||mesh.c)[j+k],0)/3*255))).toString(16).padStart(2,'0')).join('');r.face(ids.map(j=>briarPoint(mesh.p,j,m)),col,ids.map(j=>briarNormal(mesh.n,j,m)),mesh.t?.[ids[0]/3]||(mesh.uv?20:12),colors,mesh.uv?ids.map(j=>[mesh.uv[j/3*2],mesh.uv[j/3*2+1]]):null);}
}
// Reuse source meshes and their atlas colors, with regional materials.
const realmArtVariants=new Map();
function realmArtMesh(key,race='human'){
 const id=key+':'+race;if(realmArtVariants.has(id))return realmArtVariants.get(id);
 const base=briarModels[key];if(race==='human')return base;
 const c=new Float32Array(base.c);
 for(let i=0;i<c.length;i+=3){const r=c[i],g=c[i+1],b=c[i+2],light=Math.max(r,g,b);let color;
  if(b>r*1.08&&b>g*.98)color=race==='elf'?[.27,.56,.43]:[.36,.40,.44];
  else if(g>r*1.08&&g>b*1.08)color=race==='elf'?[.38,.64,.48]:[.38,.47,.33];
  else if(Math.max(r,g,b)-Math.min(r,g,b)<.19&&light>.35)color=race==='elf'?[.79,.81,.65]:[.48,.53,.57];
  if(color)for(let a=0;a<3;a++)c[i+a]=Math.min(1,color[a]*(.4+light*.75));
 }
 const mesh={...base,c};realmArtVariants.set(id,mesh);return mesh;
}
function realmArtRace(x,z){return inWorld()?kingdomAt(x,z).race:(realmSceneInfo.get(currentScene)?.race||worldScenes[currentScene]?.race||'human');}
function realmBuildingAsset(b){
 if(b.arch)return 'gate';
 if(b.archetype)return ({house:(b.variant||0)%2?'homeB':'homeA',inn:'inn',shop:'shop',forge:'forge',hall:'hall',temple:'temple',mine:'mine',castle:'castle'})[b.archetype]||'homeA';
 if(/mine/i.test(b.name))return 'mine';if(/crypt|ruins/i.test(b.name))return 'gate';if(/beacon/i.test(b.name))return 'tower';
 return b.sprite===1?'forge':b.sprite===2?'shop':'inn';
}
function realmArtFit(r,key,race,x,z,w,d,height=0){
 const mesh=realmArtMesh(key,race),[lo,hi]=mesh.bounds,scale=Math.min(w/(hi[0]-lo[0]),d/(hi[2]-lo[2])),vertical=height?height/(hi[1]-lo[1]):scale;
 briarEmit(r,mesh,briarTransform(x-(lo[0]+hi[0])/2*scale,-lo[1]*vertical,z-(lo[2]+hi[2])/2*scale,scale,0,vertical));return (hi[1]-lo[1])*vertical;
}
// Independent axis fitting is reserved for authored architectural modules.
// Furniture and complete buildings continue to use proportional fitting.
function environmentModule3(r,mesh,x,y,z,w,h,d,heading=0){
 const [lo,hi]=mesh.bounds,sx=w/(hi[0]-lo[0]),sy=h/(hi[1]-lo[1]),sz=d/(hi[2]-lo[2]),c=Math.cos(heading),s=Math.sin(heading),cx=(lo[0]+hi[0])*.5*sx,cz=(lo[2]+hi[2])*.5*sz;
 briarEmit(r,mesh,[c*sx,0,s*sz,x-c*cx-s*cz,0,sy,0,y-lo[1]*sy,-s*sx,0,c*sz,z+s*cx-c*cz]);
 return h;
}
const buildingBeforeBriar=building3;
building3=function(r,b){
 // Interior perimeter walls are structural room geometry, not house models.
 if(!inWorld())return buildingBeforeBriar(r,b);
 const race=b.race||realmArtRace(b.x,b.y),key=realmBuildingAsset(b),mesh=briarModels[key],[lo,hi]=mesh.bounds,scale=Math.min((b.w+.12)/(hi[0]-lo[0]),(b.h+.12)/(hi[2]-lo[2]));
 const height=key==='castle'?(race==='elf'?9:race==='dwarf'?7.2:8):key==='gate'?3.5:key==='tower'?6:Math.max(scale*(race==='elf'?1.35:race==='dwarf'?1:1.18)*(hi[1]-lo[1]),race==='dwarf'?3.5:3.9);
 b.visualHeight=realmArtFit(r,key,race,b.x+b.w/2,b.y+b.h/2,b.w+.12,b.h+.12,height);return b.visualHeight;
};
const propBeforeBriar=prop3;
prop3=function(r,o,x,z){
 const race=o.race||realmArtRace(x,z);let key,height;
 if(o.type==='tree'){key=/pine/i.test(o.name)?'treeA':'treeB';height=(race==='elf'?4.7:3.4)+(Math.floor(x*3+z)%5)*.17;}
 else if(o.name==='Mountain outcrop'){key='mountain';height=3.3;}
 else if(o.type==='ore'){key='rockB';height=.65;}
 else if(o.type==='cache'){key='chest';height=.65;}
 else if(o.type==='prop'){
  if(/bed/i.test(o.name)){key='bed';height=1.12;}
  else if(/banquet/i.test(o.name)){key='banquet';height=.9;}
  else if(/table/i.test(o.name)){key='table';height=1.18;}
  else if(/bookcase/i.test(o.name)){const shelf=realmArtMesh('shelf',race);for(const y of [.5,1,1.5])briarEmit(r,shelf,briarTransform(x,y,z,.5));return 1.6;}
  else if(/pillar/i.test(o.name)){key='pillar';height=2.8;}
  else if(/throne|chair/i.test(o.name)){key='chair';height=/throne/i.test(o.name)?1.65:.95;}
  else if(/altar/i.test(o.name)){key='pillar';height=1;}
  else if(/well/i.test(o.name)){key='well';height=1.7;}
  else if(/barrel/i.test(o.name)){key='barrel';height=.65;}
  else if(/crate|chest/i.test(o.name)){key='crate';height=.65;}
  else if(/lumber|log/i.test(o.name)){key='lumber';height=.5;}
  else if(/sack|supplies/i.test(o.name)){key='sack';height=.6;}
  else if(/rack/i.test(o.name)){key='rack';height=1.2;}
  else if(/cart/i.test(o.name)){key='cart';height=.8;}
  else if(/tent/i.test(o.name)){key='tent';height=1.8;}
 }
 if(key){const mesh=realmArtMesh(key,race),[lo,hi]=mesh.bounds,k=height/(hi[1]-lo[1]);briarEmit(r,mesh,briarTransform(x,-lo[1]*k,z,k,key==='treeA'||key==='treeB'?(x+z)*1.7:0));return height;}
 return propBeforeBriar(r,o,x,z);
};
// Both original river crossings share the same authored stone bridge.
function realmBridge(r,x,z,span,width,eastWest){const mesh=realmArtMesh('bridge',realmArtRace(x,z)),[lo,hi]=mesh.bounds,k=Math.min(span/(hi[2]-lo[2]),width/(hi[0]-lo[0]));briarEmit(r,mesh,briarTransform(x,0,z,k,eastWest?Math.PI/2:0,k*.55));return .4;}
bridge3=function(r,startY){realmBridge(r,37.5,startY+1.5,3.4,3,true);};

let realmArtCrossings=null;
function drawRealmCrossings(r){
 if(!realmArtCrossings){const crossings=new Map();for(const [ax,ay,bx,by]of realmRoads){
  if(ay===by&&ay<149&&ay>5&&Math.min(ax,bx)<180&&Math.max(ax,bx)>183)crossings.set('east:'+ay,{x:181.5,z:ay,w:4.4,d:3.1});
  if(ax===bx&&ax>45&&ax<365&&Math.min(ay,by)<150&&Math.max(ay,by)>153)crossings.set('south:'+ax,{x:ax,z:151.5,w:3.1,d:4.4});
 }realmArtCrossings=[...crossings.values()];}
 // Large bridge meshes used to enter the frame long before their terrain,
 // leaving detached slabs above the horizon in distant settlement views.
 for(const b of realmArtCrossings){if(typeof realmWideWorldLimit3==='function'&&Math.hypot(b.x-px,b.z-py)>realmWideWorldLimit3())continue;const p=project3(b.x,0,b.z);if(p.x< -48||p.x>screen.w+48||p.y<40||p.y>screen.h+90)continue;emitMesh3(r,cachedMesh3(b,'prop',r=>realmBridge(r,b.x,b.z,Math.max(b.w,b.d)+6,Math.min(b.w,b.d),b.w>b.d)));}
}

const realmArtWalls=new Map();
function drawRealmWall(r,x,z){
 const id=currentScene+':'+x+':'+z;let key=realmArtWalls.get(id);
 if(!key){key={};realmArtWalls.set(id,key);if(realmArtWalls.size>400)realmArtWalls.delete(realmArtWalls.keys().next().value);}
 emitMesh3(r,cachedMesh3(key,'prop',q=>{const mesh=realmArtMesh('wall',realmArtRace(x,z)),[lo,hi]=mesh.bounds,k=1.02/(hi[0]-lo[0]),v=1.3/(hi[1]-lo[1]),heading=worldWall(x-1,z)||worldWall(x+1,z)?0:Math.PI/2;
 const m=briarTransform(x+.5,-lo[1]*v,z+.5,k,heading,v);briarEmit(q,mesh,m);return 1.3;}));
}

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
 // All three peoples share the authored skeleton pipeline and fitted sockets.
 if(gear._bones)return humanoidBeforeBriar(r,x,z,look,gear,heading,walk,attack,size);
 const clip=attack>.015?(gear.weapon==='oakStaff'?'magic':gear.weapon==='shortbow'?'ranged':gear.weapon?'melee':'unarmed'):walk?'walk':'idle';
 const phase=attack>.015?(gear===s.equipment?Math.max(0,Math.min(.98,(time-lastAttack)/.42)):Math.min(.98,(Math.asin(Math.min(1,attack))/Math.PI)*1.8)):(walk?((walk/10)/briarRigs.Rogue.clips.walk.duration)%1:(time/briarRigs.Rogue.clips.idle.duration)%1);
 const race=gear._race||'human',m=briarTransform(x,0,z,size*.94,heading,size*.94*(race==='dwarf'?.76:race==='elf'?1.08:1));
 let parts=briarEquipment(gear);
 if(race==='dwarf'||race==='elf'){const native=race==='dwarf'?'Barbarian':'Rogue';parts=parts.map(([rig,part,tint])=>['Head','Body','ArmLeft','ArmRight','LegLeft','LegRight'].includes(part)?[native,part,'']: [rig,part,tint]);}
 for(const [rig,part,tint]of parts)briarEmit(r,briarPose(rig,part,clip,phase,String(look%4)+tint),m);
 if(gear.weapon==='shortbow'){
  const rig=briarRigs.Rogue,motion=rig.clips[clip],f=Math.round(phase*(motion.frames-1)),o=(f*rig.jointCount+rig.hand)*12,socket=motion.m.subarray(o,o+12),bow={face(p,c){r.face(p.map(a=>briarPoint(briarPoint(a,0,socket),0,m)),c);}};
  const points=Array.from({length:13},(_,i)=>[Math.sin(i/12*Math.PI)*.17,-.45+i*.075,0]);for(let i=0;i<12;i++)beamArt(bow,points[i],points[i+1],.021,'#987043',6);beamArt(bow,points[0],points[12],.005,'#d7c9a8',4);
 }
};
