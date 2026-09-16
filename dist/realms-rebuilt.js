'use strict';
// Human-scale modular architecture and textured, articulated characters.
function rebuiltMesh(m){const result={bounds:m.bounds};result.p=m.pScale?Float32Array.from(briarDecode(m.p,Int16Array),v=>v*m.pScale):briarDecode(m.p,Float32Array);result.uv=m.uv?briarDecode(m.uv,Float32Array):new Float32Array(result.p.length/3*2);result.n=Float32Array.from(briarDecode(m.n,Int8Array),v=>v/127);result.c=Float32Array.from(briarDecode(m.c,Uint8Array),v=>v/255);result.f=m.f?Float32Array.from(briarDecode(m.f,Uint8Array),v=>v/255):result.c;result.t=m.t?briarDecode(m.t,Uint8Array):new Uint8Array(result.p.length/3).fill(20);if(m.j){result.j=briarDecode(m.j,Uint8Array);result.w=Float32Array.from(briarDecode(m.w,Uint8Array),v=>v/255);for(let i=0;i<result.w.length;i+=4){const sum=result.w[i]+result.w[i+1]+result.w[i+2]+result.w[i+3]||1;for(let j=0;j<4;j++)result.w[i+j]/=sum;}}if(m.skin)result.skin=briarDecode(m.skin,Uint8Array);if(m.dye)result.dye=briarDecode(m.dye,Uint8Array);result.i=briarDecode(m.i,Uint16Array);return result;}
const rebuiltModels=Object.fromEntries(Object.entries(REALM_MODELS.models).map(([k,m])=>[k,rebuiltMesh(m)]));
const rebuiltAvatars=Object.fromEntries(Object.entries(REALM_MODELS.avatars).map(([k,a])=>[k,{...a,mesh:rebuiltMesh(a.mesh),rig:a.rig?{...a.rig,bind:briarDecode(a.rig.bind,Float32Array)}:null,clips:Object.fromEntries(Object.entries(a.clips).map(([k,c])=>[k,{...c,m:c.m?briarDecode(c.m,Float32Array):null,trs:c.trs?briarDecode(c.trs,Float32Array):null}]))}]));
const rebuiltTints=new WeakMap();
const modularMeshes=new Map();
function meshSliceDepth(mesh,y,width){
 let lo=Infinity,hi=-Infinity;const p=mesh.p;
 // Intersect real triangle surfaces; sparse low-poly belts may have no
 // vertices at hip height even though a broad face crosses that height.
 for(let i=0;i<mesh.i.length;i+=3){const hits=[];
  for(let e=0;e<3;e++){const a=mesh.i[i+e]*3,b=mesh.i[i+(e+1)%3]*3,dy=p[b+1]-p[a+1];if(Math.abs(dy)<1e-8)continue;const t=(y-p[a+1])/dy;if(t>=0&&t<=1)hits.push([p[a]+(p[b]-p[a])*t,p[a+2]+(p[b+2]-p[a+2])*t]);}
  if(hits.length<2)continue;const a=hits[0],b=hits[1],dx=b[0]-a[0];let t0=0,t1=1;
  if(Math.abs(dx)<1e-8){if(Math.abs(a[0])>width)continue;}else{const u=(-width-a[0])/dx,v=(width-a[0])/dx;t0=Math.max(0,Math.min(u,v));t1=Math.min(1,Math.max(u,v));if(t0>t1)continue;}
  for(const t of [t0,t1]){const z=a[1]+(b[1]-a[1])*t;lo=Math.min(lo,z);hi=Math.max(hi,z);}
 }return [lo,hi];
}
function fitModularArmorMesh(sex,name,mesh){
 const part=name.split('.')[0];
 if(['Shoulder','Gauntlets','Boots','Headgear'].includes(part)){
  const p=new Float32Array(mesh.p),n=new Float32Array(mesh.n),female=sex==='female';
  for(let i=0;i<p.length;i+=3){
   const x=p[i],y=p[i+1],z=p[i+2];
   if(part==='Gauntlets'){const cy=female?1.413:1.447,cz=-.062;p[i+1]=cy+(y-cy)*1.17;p[i+2]=cz+(z-cz)*1.28;n[i+1]/=1.17;n[i+2]/=1.28;}
   if(part==='Shoulder'){const cy=female?1.415:1.45,cz=-.067;p[i+1]=cy+(y-cy)*1.05;p[i+2]=cz+(z-cz)*1.24;n[i+1]/=1.05;n[i+2]/=1.24;}
   if(part==='Boots'){const cx=Math.sign(x)*(female?.128:.132);p[i]=cx+(x-cx)*1.12;p[i+1]=Math.max(.006,y*1.12+.006);p[i+2]=-.03+(z+.03)*1.12;}
   if(part==='Headgear'){p[i]*=female?1.14:1.09;p[i+2]=-.02+(z+.02)*1.19;n[i]/=female?1.14:1.09;n[i+2]/=1.19;}
   const length=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let k=0;k<3;k++)n[i+k]/=length;
  }
  return remeasureArmour({...mesh,p,n});
 }
 // Bone retargeting compressed front/back volume at the chest and pelvis.
 // Fit shells around the actual body, never scale or erase the body to fit them.
 if(name==='Hair.007'){
  const scale=[sex==='female'?1.12:1.07,1,1.70],top=rebuiltAvatars[sex].mesh.bounds[1][1],p=new Float32Array(mesh.p),n=new Float32Array(mesh.n);
  for(let i=0;i<p.length;i+=3){p[i]*=scale[0];p[i+2]*=p[i+2]<0?scale[2]:1.05;
   // Keep the fringe above the eyes while retaining the author's uneven tips.
   if(p[i+2]>.018&&Math.abs(p[i])<.07&&p[i+1]<top-.055)p[i+1]=top-.055+(p[i+1]-(top-.055))*.35;
   n[i]/=scale[0];n[i+2]/=mesh.p[i+2]<0?scale[2]:1.05;const length=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let k=0;k<3;k++)n[i+k]/=length;
  }
  return {...mesh,p,n};
 }
 const chest=name.startsWith('Chestplate.'),legs=name.startsWith('Legguards.'),belt=name.startsWith('Belt.');
 if(!chest&&!legs&&!belt&&!name.startsWith('BeltAttch.'))return mesh;
 if(name.startsWith('BeltAttch.')){
  const raw=rebuiltMesh(REALM_MODELS.armor[sex]['Belt.B.001']),fitted=modularMesh(sex,'Belt.B.001'),delta=fitted.bounds[1][2]-raw.bounds[1][2],p=Float32Array.from(mesh.p,(v,i)=>v+(i%3===2?delta:0));
  return {...mesh,p,bounds:mesh.bounds.map(row=>row.map((v,k)=>v+(k===2?delta:0)))};
 }
 if(belt){
  // The broad belt faces span the whole pelvis. A single volume transform
  // preserves those faces and avoids pinching between sparse vertex rows.
  const samples=[.84,.90,.96,1.02].map(y=>({source:meshSliceDepth(mesh,y,.34),body:meshSliceDepth(rebuiltAvatars[sex].mesh,y,.32)})).filter(s=>s.source.every(Number.isFinite)&&s.body.every(Number.isFinite));
  const center=samples.reduce((sum,s)=>sum+(s.source[0]+s.source[1])/2,0)/samples.length,target=samples.reduce((sum,s)=>sum+(s.body[0]+s.body[1])/2,0)/samples.length;
  let scale=1;for(const sample of samples){const [a,b]=sample.source,[c,d]=sample.body;if(b-center>.025)scale=Math.max(scale,(d+.035-target)/(b-center));if(center-a>.025)scale=Math.max(scale,(target-c+.035)/(center-a));}
  const p=Float32Array.from(mesh.p,(v,i)=>i%3===2?target+(v-center)*scale:v),n=new Float32Array(mesh.n);
  for(let i=0;i<n.length;i+=3){n[i+2]/=scale;const length=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let k=0;k<3;k++)n[i+k]/=length;}
  return {...mesh,p,n,bounds:mesh.bounds.map(row=>row.map((v,k)=>k===2?target+(v-center)*scale:v))};
 }
 const body=rebuiltAvatars[sex].mesh,source=mesh.p,rows=[];
 const start=mesh.bounds[0][1]-.05,end=mesh.bounds[1][1]+.05,clearance=belt?.040:.043;
 for(let y=start;y<=end+.025;y+=.025){const [a,b]=meshSliceDepth(mesh,y,chest?.28:.34),[c,d]=meshSliceDepth(body,y,chest?.24:.32);if(!Number.isFinite(a+b+c+d)||b-a<.04){rows.push({y,scale:1,offset:0});continue;}const lo=Math.min(a,c-clearance),hi=Math.max(b,d+clearance),scale=(hi-lo)/(b-a);rows.push({y,scale,offset:lo-a*scale});}
 const fit=y=>{const v=Math.max(0,Math.min(rows.length-1,(y-rows[0].y)/.025)),i=Math.floor(v),a=rows[i],b=rows[Math.min(i+1,rows.length-1)],t=v-i;return {scale:a.scale+(b.scale-a.scale)*t,offset:a.offset+(b.offset-a.offset)*t};};
 const p=new Float32Array(source),n=new Float32Array(mesh.n);
 for(let i=0;i<p.length;i+=3){const y=source[i+1],z=source[i+2],f=fit(y),a=fit(y-.001),b=fit(y+.001),slope=((b.scale-a.scale)*z+b.offset-a.offset)/.002;
  p[i+2]=z*f.scale+f.offset;const normal=[n[i],n[i+1]-slope*n[i+2]/f.scale,n[i+2]/f.scale],length=Math.hypot(...normal)||1;for(let k=0;k<3;k++)n[i+k]=normal[k]/length;
 }
 const bounds=[0,1,2].map(k=>{const values=Array.from(p).filter((_,i)=>i%3===k);return [Math.min(...values),Math.max(...values)];});
 return {...mesh,p,n,bounds:[bounds.map(v=>v[0]),bounds.map(v=>v[1])]};
}

function remeasureArmour(mesh,tier=null){
 const bounds=[0,1,2].map(k=>Array.from(mesh.p).filter((_,i)=>i%3===k));
 const palettes={B:['#9f7549','#ceaa74'],I:['#8d9fab','#c1cbd0'],G:['#b89b50','#ead7a2'],M:['#557e99','#a5c4d2'],DS:['#475363','#b3a28c']},palette=palettes[tier],c=new Float32Array(mesh.c),f=new Float32Array(c.length);
 const rgb=hex=>[1,3,5].map(k=>parseInt(hex.slice(k,k+2),16)/255);
 for(let i=0;i<f.length;i+=3){
  if(palette){const source=Array.from(mesh.c.subarray(i,i+3),v=>Math.round(v*255)),[r,g,b]=source;let color;
   if(r<65&&g<65&&b<65)color='#303c45';
   else if(Math.max(r,g,b)-Math.min(r,g,b)<14)color=palette[0];
   else if(r>170&&g>140&&b>110)color=palette[1];
   else if(r>g*1.25&&g>b*1.1)color=r>145?'#785437':'#533e30';
   if(color)c.set(rgb(color),i);
  }
  const light=.52+.48*Math.max(0,-mesh.n[i]*.40+mesh.n[i+1]*.75+mesh.n[i+2]*.53);for(let k=0;k<3;k++)f[i+k]=c[i+k]*light;
 }
 return {...mesh,c,f,bounds:[bounds.map(v=>Math.min(...v)),bounds.map(v=>Math.max(...v))]};
}
function fittedPlateArmour(sex,name){
 // Metal tiers use the fitted plate silhouette with their own metal palette.
 const shapeName=name.replace(/\.(B|M|G|DS)\./,'.I.'),source=REALM_MODELS.armor[sex][shapeName]||REALM_MODELS.armor[sex][name];if(!source)return null;
 let mesh=fitModularArmorMesh(sex,name,rebuiltMesh(source));
 if(/^(Chestplate|Shoulder|Gauntlets|Legguards)\./.test(name)){const indices=[];for(let t=0;t<mesh.i.length;t+=3){const ids=Array.from(mesh.i.subarray(t,t+3));if(ids.every(id=>Math.max(...mesh.c.subarray(id*3,id*3+3))<.27)&&(!name.startsWith('Chestplate.')||ids.every(id=>Math.abs(mesh.p[id*3])>.265)))continue;indices.push(...ids);}mesh={...mesh,i:new Uint16Array(indices)};}
 if(name.startsWith('Chestplate.'))mesh=joinArmourMeshes(mesh,contouredBackplate(sex));
 if(name.startsWith('Shoulder.'))mesh=joinArmourMeshes(mesh,contouredLimbPlates(sex,'upperArms'));
 if(name.startsWith('Gauntlets.'))mesh=joinArmourMeshes(mesh,contouredLimbPlates(sex,'forearms'));
 if(name.startsWith('Legguards.'))mesh=joinArmourMeshes(mesh,contouredLimbPlates(sex,'thighs'));
 return remeasureArmour(mesh,name.split('.')[1]);
}
function joinArmourMeshes(a,b){
 const result={...a},count=a.p.length/3;
 for(const key of ['p','n','c','f','j','w','uv','t']){const Type=a[key].constructor,resultArray=new Type(a[key].length+b[key].length);resultArray.set(a[key]);resultArray.set(b[key],a[key].length);result[key]=resultArray;}
 result.i=new Uint16Array(a.i.length+b.i.length);result.i.set(a.i);result.i.set(Array.from(b.i,v=>v+count),a.i.length);return result;
}
function contouredBackplate(sex){
 // A complete cuirass back, shaped around the shoulder blades and tapered at
 // the waist. The surface, bevel and inside are separate closed geometry.
 const body=rebuiltAvatars[sex].mesh,female=sex==='female',p=[],n=[],c=[],j=[],w=[],i=[];
 function sample(x,y){
  let hit=null;
  for(let t=0;t<body.i.length;t+=3){const ids=[body.i[t],body.i[t+1],body.i[t+2]],q=ids.map(v=>Array.from(body.p.subarray(v*3,v*3+3))),[a,b,d]=q;
   const denom=(b[1]-d[1])*(a[0]-d[0])+(d[0]-b[0])*(a[1]-d[1]);if(Math.abs(denom)<1e-9)continue;
   const u=((b[1]-d[1])*(x-d[0])+(d[0]-b[0])*(y-d[1]))/denom,v=((d[1]-a[1])*(x-d[0])+(a[0]-d[0])*(y-d[1]))/denom,h=1-u-v;
   if(Math.min(u,v,h)<-.0001)continue;const z=u*a[2]+v*b[2]+h*d[2];if(hit&&z>=hit.z)continue;
   const weights={};for(let a=0;a<3;a++)for(let k=0;k<4;k++){const bone=body.j[ids[a]*4+k];weights[bone]=(weights[bone]||0)+body.w[ids[a]*4+k]*[u,v,h][a];}
   hit={z,weights};
  }
  return hit;
 }
 const rows=[[1.028,.18],[1.13,.177],[1.27,.209],[1.405,.234],[1.48,.208],[1.535,.113]],columns=[-1,-.83,-.47,0,.47,.83,1];
 const grid=rows.map(([height,width])=>columns.map(fraction=>{
  const x=fraction*width*(female?.90:1),y=height*(female?.976:1),hit=sample(x,y)||sample(x*.82,y)||sample(0,y),weights=Object.entries(hit?.weights||{4:1}).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=weights.reduce((sum,q)=>sum+q[1],0)||1;
  return {p:[x,y,(hit?.z||-.13)-.038-(1-Math.abs(fraction))*.008],weights:weights.map(([bone,weight])=>[Number(bone),weight/sum])};
 }));
 function face(vertices,rgb){const base=p.length/3,a=vertices[0].p,b=vertices[1].p,d=vertices[2].p,u=b.map((v,k)=>v-a[k]),v=d.map((v,k)=>v-a[k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...normal)||1;
  for(const q of vertices){p.push(...q.p);n.push(...normal.map(v=>v/length));c.push(...rgb);for(let k=0;k<4;k++){j.push(q.weights[k]?.[0]||0);w.push(q.weights[k]?.[1]||0);}}
  for(let k=1;k<vertices.length-1;k++)i.push(base,base+k,base+k+1);
 }
 const metal=[177/255,177/255,177/255],rim=[191/255,167/255,143/255],inner=q=>({...q,p:[q.p[0],q.p[1],q.p[2]+.018]});
 for(let row=1;row<grid.length;row++)for(let col=1;col<columns.length;col++){
  const points=[grid[row-1][col-1],grid[row][col-1],grid[row][col],grid[row-1][col]];
  face(points,metal);face([...points].reverse().map(inner),metal);
 }
 const outline=[...grid[0],...grid.slice(1).map(row=>row.at(-1)),...grid.at(-1).slice(0,-1).reverse(),...grid.slice(1,-1).reverse().map(row=>row[0])];
 for(let k=0;k<outline.length;k++){const a=outline[k],b=outline[(k+1)%outline.length];face([a,inner(a),inner(b),b],rim);}
 return {p:new Float32Array(p),n:new Float32Array(n),c:new Float32Array(c),f:new Float32Array(c),j:new Uint8Array(j),w:new Float32Array(w),i:new Uint16Array(i),uv:new Float32Array(p.length/3*2),t:new Uint8Array(p.length/3).fill(20)};
}

const contouredLimbCache=new Map();
function contouredLimbPlates(sex,part){
 const cacheKey=sex+':'+part;if(contouredLimbCache.has(cacheKey))return contouredLimbCache.get(cacheKey);
 // Closed, tapered armour sleeves follow each limb's actual cross section.
 // Both surfaces and the rolled rims carry interpolated body skin weights.
 const body=rebuiltAvatars[sex].mesh,female=sex==='female',p=[],n=[],c=[],j=[],w=[],indices=[];
 const arm=part!=='thighs',axis=arm?0:1,u=arm?1:0,v=2,scale=female?.976:1;
 const spans=part==='upperArms'?[[.315,.525]]:part==='forearms'?[[.545,.705]]:[[.515,.935],[.455,.505]];
 // Every ray in a sleeve row intersects the same body cross-section.
 // Keep the exact triangle order and interpolation, but compute it once per
 // plane instead of allocating and scanning the entire body for every ray.
 const slices=new Map();
 function sliceAt(position){
  if(slices.has(position))return slices.get(position);
  const slice=[];
  for(let t=0;t<body.i.length;t+=3){
   const ia=body.i[t],ib=body.i[t+1],ic=body.i[t+2],a=body.p[ia*3+axis],b=body.p[ib*3+axis],c=body.p[ic*3+axis];
   if(position<Math.min(a,b,c)||position>Math.max(a,b,c))continue;
   const ids=[ia,ib,ic],points=ids.map(id=>Array.from(body.p.subarray(id*3,id*3+3))),hits=[];
   for(let a=0;a<3;a++){const b=(a+1)%3,delta=points[b][axis]-points[a][axis];if(Math.abs(delta)<1e-8)continue;const q=(position-points[a][axis])/delta;if(q<0||q>1)continue;hits.push({p:points[a].map((x,k)=>x+(points[b][k]-x)*q),weights:[0,1,2].map(k=>k===a?1-q:k===b?q:0)});}
   if(hits.length>=2)slice.push({ids,hits});
  }
  slices.set(position,slice);return slice;
 }
 function surface(center,direction){
  let best=null;
  for(const {ids,hits}of sliceAt(center[axis])){
   const a=hits[0],b=hits[1],dx=b.p[u]-a.p[u],dz=b.p[v]-a.p[v],ax=a.p[u]-center[u],az=a.p[v]-center[v],den=direction[u]*dz-direction[v]*dx;if(Math.abs(den)<1e-8)continue;
   const radius=(ax*dz-az*dx)/den,q=(ax*direction[v]-az*direction[u])/den;if(radius<=0||radius>(arm?.12:.15)||q<-.0001||q>1.0001||best&&radius>=best.radius)continue;
   const weights={};for(let z=0;z<3;z++)for(let k=0;k<4;k++){const bone=body.j[ids[z]*4+k],mix=a.weights[z]+(b.weights[z]-a.weights[z])*q;weights[bone]=(weights[bone]||0)+body.w[ids[z]*4+k]*mix;}
   best={radius,weights};
  }
  return best;
 }
 function face(vertices,color){
  const start=p.length/3,a=vertices[0].p,b=vertices[1].p,d=vertices[2].p,ab=b.map((x,k)=>x-a[k]),ad=d.map((x,k)=>x-a[k]),normal=[ab[1]*ad[2]-ab[2]*ad[1],ab[2]*ad[0]-ab[0]*ad[2],ab[0]*ad[1]-ab[1]*ad[0]],length=Math.hypot(...normal)||1;
  for(const vertex of vertices){p.push(...vertex.p);n.push(...normal.map(x=>x/length));c.push(...color);for(let k=0;k<4;k++){j.push(vertex.weights[k]?.[0]||0);w.push(vertex.weights[k]?.[1]||0);}}
  for(let k=1;k<vertices.length-1;k++)indices.push(start,start+k,start+k+1);
 }
 const metal=[.694,.694,.694],trim=[.75,.655,.56],sides=12;
 for(const side of [-1,1])for(const [lo,hi]of spans){
  const grid=[0,.045,.28,.70,.955,1].map((progress,row)=>Array.from({length:sides},(_,k)=>{
   const center=arm?[side*(lo+(hi-lo)*progress)*scale,(female?1.413:1.44),female?-.054:-.075]:[side*(female?.113:.122),(lo+(hi-lo)*progress)*scale,-.045];
   const angle=k/sides*Math.PI*2,direction=[0,0,0];direction[u]=Math.cos(angle);direction[v]=Math.sin(angle);
   const hit=surface(center,direction),fallback=arm?.060:.075,edge=row===0||row===5,clearance=edge?.015:.023,radius=(hit?.radius||fallback)+clearance;
   const weights=Object.entries(hit?.weights||{}).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=weights.reduce((n,q)=>n+q[1],0)||1;
   // Missing rays use the nearest body vertex's rig, never an unrelated bone.
   if(!weights.length){let nearest=0,distance=Infinity;for(let z=0;z<body.p.length;z+=3){if(!arm&&body.p[z]*side<.025)continue;const d=center.reduce((sum,x,a)=>sum+(body.p[z+a]-(x+direction[a]*radius))**2,0);if(d<distance){distance=d;nearest=z/3;}}for(let k=0;k<4;k++)weights.push([body.j[nearest*4+k],body.w[nearest*4+k]]);}
   return {p:center.map((x,a)=>x+direction[a]*radius),direction,weights:weights.map(([bone,weight])=>[Number(bone),weight/sum])};
  }));
  const inner=q=>({...q,p:q.p.map((x,a)=>x-q.direction[a]*.012)});
  for(let row=1;row<grid.length;row++)for(let k=0;k<sides;k++){
   const next=(k+1)%sides,points=[grid[row-1][k],grid[row][k],grid[row][next],grid[row-1][next]];
   // Winding depends on the sleeve's axis and the mirrored arm.
   if(arm&&side>0)points.reverse();
   face(points,row===1||row===5?trim:metal);face([...points].reverse().map(inner),metal);
  }
  for(const row of [0,grid.length-1])for(let k=0;k<sides;k++){const a=grid[row][k],b=grid[row][(k+1)%sides],points=[a,b,inner(b),inner(a)];if((row===0)!==(arm&&side>0))points.reverse();face(points,trim);}
 }
 const result={p:new Float32Array(p),n:new Float32Array(n),c:new Float32Array(c),f:new Float32Array(c),j:new Uint8Array(j),w:new Float32Array(w),i:new Uint16Array(indices),uv:new Float32Array(p.length/3*2),t:new Uint8Array(p.length/3).fill(20)};contouredLimbCache.set(cacheKey,result);return result;
}

function modularMesh(sex,name){const key=sex+':'+name;if(!modularMeshes.has(key)){if(/^(Chestplate|Shoulder|Gauntlets|Legguards|Boots|Headgear|Belt|Robe)\./.test(name))modularMeshes.set(key,fittedPlateArmour(sex,name));else if(name==='Veldren_Necklace')modularMeshes.set(key,makeRealmNecklace(sex));else if(name==='Veldren_WoodenSword'||name==='Veldren_WoodenShield')modularMeshes.set(key,makeTrainingMesh(name));else{const source=REALM_MODELS.armor?.[sex]?.[name];if(!source)return null;modularMeshes.set(key,fitModularArmorMesh(sex,name,rebuiltMesh(source)));}}return modularMeshes.get(key);}
function makeTrainingMesh(name){
 const p=[],n=[],colors=[],indices=[];
 const r={face(points,color){const a=points[0],b=points[1],c=points[2],u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...normal)||1,rgb=parseInt(color.slice(1),16),base=p.length/3;for(const point of points){p.push(...point);n.push(...normal.map(v=>v/length));colors.push((rgb>>16)/255,(rgb>>8&255)/255,(rgb&255)/255);}for(let i=1;i<points.length-1;i++)indices.push(base,base+i,base+i+1);}};
 const plank=(outline,depth,color)=>{const front=outline.map(([x,y,z=0])=>[x,y,z+depth/2]),back=outline.map(([x,y,z=0])=>[x,y,z-depth/2]);r.face(front,color);r.face([...back].reverse(),color);for(let i=0;i<front.length;i++){const j=(i+1)%front.length;r.face([front[i],back[i],back[j],front[j]],'#795737');}};
 if(name==='Veldren_WoodenSword'){
  plank([[-.047,.08],[.047,.08],[.047,.56],[.018,.66],[-.018,.66],[-.047,.56]],.045,'#b68e54');
  beamArt(r,[-.10,.07,0],[.10,.07,0],.03,'#785235',6);beamArt(r,[0,-.11,0],[0,.065,0],.019,'#624531',8);beamArt(r,[0,-.12,0],[0,-.10,0],.032,'#a27a46',8);
  for(const x of [-.026,.012])beamArt(r,[x,.13,.024],[x+.006,.53,.024],.002,'#916b3f',4);
 }else{
  // Shield face lies in the palm's Y/Z plane, like the other held shields.
  const shield={face(points,color){r.face(points.map(([x,y,z])=>[z+.045,x,y]),color);}};
  const outline=[[-.25,.26],[.25,.26],[.29,.07],[.21,-.20],[0,-.34],[-.21,-.20],[-.29,.07]],front=outline.map(([x,y])=>[x,y,.024]),back=outline.map(([x,y])=>[x,y,-.024]);shield.face(front,'#a77b46');shield.face([...back].reverse(),'#795435');
  for(let i=0;i<7;i++){const j=(i+1)%7;shield.face([front[i],back[i],back[j],front[j]],'#574a35');beamArt(shield,front[i],front[j],.018,'#6f644a',5);}
  for(const x of [-.15,0,.15])beamArt(shield,[x,.23,.026],[x,-.20,.026],.004,'#765333',4);
  oval3(shield,0,0,.047,.13,.13,.045,'#8b8769',p=>p,8);beamArt(shield,[-.1,-.07,-.056],[.1,.07,-.056],.021,'#4d392a',6);
 }
 const bounds=[0,1,2].map(k=>Array.from({length:p.length/3},(_,i)=>p[i*3+k]));return {p:new Float32Array(p),n:new Float32Array(n),c:new Float32Array(colors),f:new Float32Array(colors),i:new Uint16Array(indices),t:new Uint8Array(p.length/3).fill(12),uv:new Float32Array(p.length/3*2),bounds:[bounds.map(v=>Math.min(...v)),bounds.map(v=>Math.max(...v))]};
}
function makeRealmNecklace(sex){
 const p=[],n=[],c=[],j=[],w=[],indices=[],cy=sex==='female'?1.46:1.50;
 for(let bead=0;bead<25;bead++){const a=bead/24*Math.PI*2,pendant=bead===24,center=pendant?[0,cy-.13,.09]:[Math.cos(a)*.118,cy-.025-Math.max(0,Math.sin(a))*.075,-.035+Math.sin(a)*.12],radius=pendant?.025:.008,color=pendant?[.25,.55,.43]:[.70,.43,.24],offset=p.length/3;
  for(const v of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){p.push(...center.map((x,k)=>x+v[k]*radius));n.push(...v);c.push(...color);j.push(4,0,0,0);w.push(1,0,0,0);}
  for(const face of [[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]])indices.push(...face.map(x=>x+offset));
 }
 return {p:new Float32Array(p),n:new Float32Array(n),c:new Float32Array(c),f:new Float32Array(c),j:new Uint8Array(j),w:new Float32Array(w),i:new Uint16Array(indices),uv:new Float32Array(p.length/3*2),t:new Uint8Array(p.length/3).fill(20),bounds:[[-.13,cy-.16,-.16],[.13,cy,.11]]};
}
function modularModel(id){return ITEMS[id]?.model||(id==='ironHelm'?'Headgear.I.001':null);}
function armorShoulderItem(id){const tier=ITEMS[id]?.armorSet;return ITEMS[id]?.slot==='body'&&tier?tier+'_shoulders':null;}
function modularBelt(gear){const set=GEAR_TIERS.find(a=>a.id===ITEMS[gear.body]?.armorSet);return 'Belt.'+(set?.source||'B')+'.001';}
const wornTintCache=new Map();
function wornModularMesh(sex,id){const mesh=modularMesh(sex,modularModel(id)),tint=ITEMS[id]?.modelTint,scale=ITEMS[id]?.modelScale||1;if(!mesh||!tint&&scale===1)return mesh;const key=sex+':'+id;if(!wornTintCache.has(key)){const tintColors=source=>Float32Array.from(source,(v,i)=>Math.min(1,v*(tint?.[i%3]||1))),c=tintColors(mesh.c),f=tintColors(mesh.f||mesh.c);wornTintCache.set(key,{...mesh,p:scale===1?mesh.p:Float32Array.from(mesh.p,v=>v*scale),bounds:mesh.bounds.map(v=>v.map(x=>x*scale)),c,f});}return wornTintCache.get(key);}
function armorAppearanceKey(gear){return EQUIPMENT_SLOTS.map(([slot])=>gear[slot]||'').join('/')+':'+(gear._civilian||'')+':'+(gear._hoodColor??'');}
function mergeWornMeshes(base,sex,gear){
 const sources=[base],indices=[];
 if(gear._civilian){sources.splice(0);for(const name of ['Default_Male_Head_Medium','Default_Male_Arms_Medium','Default_Male_Feet_Medium','Male_Shirt.002','Male_Pants.002','Beard.007','Hair.007']){const part=modularMesh(sex,name);if(part)sources.push(part);}}
 const outfit=avatarIdentity(gear),wearShirt=outfit.topStyle===3&&!gear.body,wearPants=outfit.bottomStyle===2&&!gear.legs,outfitTop=!gear.body?['Peasant','Ranger'][outfit.topStyle-4]:null,outfitBottom=!gear.legs?['Peasant','Ranger'][outfit.bottomStyle-3]:null;
 const shoulderId=armorShoulderItem(gear.body),covered={head:!!modularModel(gear.head)&&!ITEMS[gear.head]?.openFace,body:!!modularModel(gear.body)||wearShirt,hands:!!modularModel(gear.hands),legs:!!modularModel(gear.legs)||wearPants,feet:!!modularModel(gear.feet),shoulders:!!shoulderId};
 for(let i=0;i<base.i.length;i+=3){const ids=[base.i[i],base.i[i+1],base.i[i+2]],x=ids.reduce((n,v)=>n+Math.abs(base.p[v*3]),0)/3,y=ids.reduce((n,v)=>n+base.p[v*3+1],0)/3;
  if(outfitTop&&y>1.02&&y<1.535||outfitBottom&&y<1.02&&(!gear.feet||y>.34))continue;
  // Clothing underneath rigid armour must not cut through its contoured plates.
  // Keep uncovered joints and the open face, but cull the covered body surface.
  const z=ids.reduce((n,v)=>n+base.p[v*3+2],0)/3;
  if(covered.body&&y>1.02&&y<1.49&&x<.235)continue;
  if(covered.shoulders&&y>1.32&&y<1.55&&x>.28&&x<.53)continue;
  if(covered.hands&&x>.565&&y>1.32)continue;
  if(covered.legs&&y>.15&&y<(/^Legguards\./.test(modularModel(gear.legs))?.935:.47))continue;
  if(covered.feet&&y<.11)continue;
  if(covered.head&&(y>1.72||y>1.60&&z<-.03))continue;
  indices.push(...ids);
 }
 if(!gear._civilian)sources[0]={...base,i:new Uint16Array(indices)};
 for(const [slot]of EQUIPMENT_SLOTS){if(['weapon','shield'].includes(slot)||slot==='crest'&&!gear.head)continue;const model=modularModel(gear[slot]);if(model){const mesh=slot==='head'&&gear.head==='rangerHood'&&Number.isInteger(gear._hoodColor)?outfitClothingMesh(sex,'Ranger','Head_Hood',gear._hoodColor,outfit.skin):wornModularMesh(sex,gear[slot]);if(mesh)sources.push(mesh);}}
 if(shoulderId){const shoulders=wornModularMesh(sex,shoulderId);if(shoulders)sources.push(shoulders);}
 for(const [enabled,name,color]of [[wearShirt,'Male_Shirt.002',outfit.topColor],[wearPants,'Male_Pants.002',outfit.bottomColor],[outfit.hair===4&&(!gear.head||gear.head==='rangerCap'),'Hair.007',null],[outfit.beard===2&&(!gear.head||gear.head==='rangerCap'),'Beard.007',null]])if(enabled){const part=modularMesh(sex,name);if(part){const tint=color===null?APPEARANCE_HAIR[outfit.hairColor||0]:APPEARANCE_COLORS[color||0],c=Float32Array.from(part.c,(v,i)=>(color===null?Math.max(.70,v):v)*tint[i%3]);sources.push({...part,c,f:c});}}
 if(!gear._civilian&&(!gear.head||gear.head==='rangerCap')&&outfit.hair===4)sources.push(avatarHairCap(sex,outfit.hairColor??0));
 if(outfitTop)for(const part of ['Body','Arms'])sources.push(outfitClothingMesh(sex,outfitTop,part,outfit.topColor,outfit.skin));
 if(outfitBottom)for(const part of ['Legs',...(!gear.feet?['Feet']:[])])sources.push(outfitClothingMesh(sex,outfitBottom,part,outfit.bottomColor,outfit.skin));
 if(!gear._civilian&&(!outfitTop&&!outfitBottom||gear.body||gear.legs))for(const name of [modularBelt(gear)]){const part=modularMesh(sex,name);if(part)sources.push(part);}
 let vertices=0,indexCount=0;for(const m of sources){vertices+=m.p.length/3;indexCount+=m.i.length;}if(vertices>=65536)throw new Error('Worn mesh exceeds index budget');
 const result={...base};for(const [key,width,Type]of [['p',3,Float32Array],['n',3,Float32Array],['c',3,Float32Array],['f',3,Float32Array],['uv',2,Float32Array],['t',1,Uint8Array],['j',4,Uint8Array],['w',4,Float32Array]]){const data=new Type(vertices*width);let offset=0;for(const m of sources){data.set(m[key],offset);offset+=m[key].length;}result[key]=data;}
 result.i=new Uint16Array(indexCount);let offset=0,count=0;for(const m of sources){for(const index of m.i)result.i[count++]=index+offset;offset+=m.p.length/3;}return result;
}
const avatarHairCaps=new Map();
function avatarHairCap(sex,color){
 const key=sex+':'+color;if(avatarHairCaps.has(key))return avatarHairCaps.get(key);
 const base=rebuiltAvatars[sex].mesh,top=base.bounds[1][1],tint=APPEARANCE_HAIR[color]||APPEARANCE_HAIR[0],vertices=[],indices=[],mapped=new Map();
 for(let t=0;t<base.i.length;t+=3){const ids=Array.from(base.i.subarray(t,t+3));
  if(!ids.every(id=>{const yy=base.p[id*3+1],zz=base.p[id*3+2];return yy>top-(zz>.025?.078:zz<-.025?.17:.12);}))continue;for(const id of ids){if(!mapped.has(id)){mapped.set(id,vertices.length);vertices.push(id);}indices.push(mapped.get(id));}
 }
 const result={bounds:base.bounds,i:new Uint16Array(indices)};
 for(const [key,width,Type]of [['p',3,Float32Array],['n',3,Float32Array],['c',3,Float32Array],['f',3,Float32Array],['uv',2,Float32Array],['t',1,Uint8Array],['j',4,Uint8Array],['w',4,Float32Array]]){
  result[key]=new Type(vertices.length*width);vertices.forEach((id,v)=>{for(let k=0;k<width;k++)result[key][v*width+k]=key==='p'?base.p[id*3+k]+base.n[id*3+k]*.007:key==='c'||key==='f'?tint[k]*.78:key==='t'?20:base[key][id*width+k];});
 }
 avatarHairCaps.set(key,result);return result;
}
const outfitClothingCache=new Map();
function outfitClothingMesh(sex,outfit,part,color=0,skin=1){
 const key=[sex,outfit,part,color,skin].join(':');if(outfitClothingCache.has(key))return outfitClothingCache.get(key);
 const mesh=modularMesh(sex,'Outfit_'+outfit+'_'+part),tint=APPEARANCE_COLORS[color]||APPEARANCE_COLORS[0],skinTint=APPEARANCE_SKINS[skin]||APPEARANCE_SKINS[1],c=new Float32Array(mesh.c);
 for(let v=0;v<c.length/3;v++){
  const i=v*3,light=Math.max(.30,Math.min(1.25,(mesh.c[i]+mesh.c[i+1]+mesh.c[i+2])/3*2.1));
  if(mesh.skin?.[v])for(let k=0;k<3;k++)c[i+k]=[.66,.44,.31][k]*skinTint[k];
  else if(mesh.dye?.[v]||part==='Legs'||part==='Head_Hood')for(let k=0;k<3;k++)c[i+k]=tint[k]*light;
 }
 const result={...mesh,c,f:c};outfitClothingCache.set(key,result);if(outfitClothingCache.size>96)outfitClothingCache.delete(outfitClothingCache.keys().next().value);return result;
}
function rebuiltPlace(r,name,x,y,z,scale=1,heading=0,vertical=scale,tint){let mesh=rebuiltModels[name];if(!mesh)return;
 if(tint){let variants=rebuiltTints.get(mesh);if(!variants){variants=new Map();rebuiltTints.set(mesh,variants);}const key=tint.join(':');if(!variants.has(key))variants.set(key,{...mesh,c:Float32Array.from(mesh.c,(c,i)=>c*tint[i%3]),f:Float32Array.from(mesh.f,(c,i)=>c*tint[i%3])});mesh=variants.get(key);}
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
   if(b._cutaway&&side*Math.cos(view3d.yaw-(b._orientationYaw||0))>.05&&!door){box3(r,xx,.32,z+side*d/2,w/segments,.64,.16,'#938675');continue;}
   const name='Wall_'+wall+'_'+(door?'Door_Round':window?'Window_Wide_Flat':'Straight');rebuiltPlace(r,name,xx,floor*level,z+side*d/2,scale,side===1?0:Math.PI,wallScale,tint);
   if(window)rebuiltPlace(r,'Window_Wide_Flat1',xx,floor*level,z+side*d/2,scale,side===1?0:Math.PI,wallScale);
   if(door){rebuiltPlace(r,'DoorFrame_Round_WoodDark',xx,floor*level,z+d/2+.04,scale,0,wallScale);}
  }
  for(const side of [-1,1])for(let i=0;i<sideSegments;i++){
   const zz=b.y+(i+.5)*d/sideSegments,angle=side===1?Math.PI/2:-Math.PI/2,window=(i+floor)%2===0;
   if(b._cutaway&&side*Math.sin(view3d.yaw-(b._orientationYaw||0))>.05){box3(r,x+side*w/2,.32,zz,.16,.64,d/sideSegments,'#938675');continue;}
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
 if(o.type==='camp'&&r.indexed){const base=groundedPainter(r,x,z);cachedRealmShape(base,'camp-base:'+meshDetail3,briarTransform(x,0,z),q=>{for(let i=0;i<8;i++){const a=i/8*Math.PI*2;oval3(q,Math.cos(a)*.3,.08,Math.sin(a)*.3,.18,.15,.18,'#7c8176',p=>p,6);}limb3(q,0,.13,0,.5,.15,.14,'#6e513c');return 1;});cone3(materialRealm(base,19),x,.15,z,.17,.5+Math.sin(time*12)*.06,'#e9ad6b',8);return 1;}
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
 else if(o.type==='tree'){if(typeof drawSpeciesTree==='function')return drawSpeciesTree(r,o,x,z);const race=o.race||realmArtRace(x,z);name=race==='elf'?'TwistedTree_1':o.treeArt==='pine'||/pine/i.test(o.name)?(o.id%2?'Pine_1':'Pine_3'):(o.id%2?'CommonTree_1':'CommonTree_4');height=race==='elf'?7:5+(o.id%4)*.4;}
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
const APPEARANCE_COLORS=[[.24,.39,.51],[.51,.22,.22],[.25,.40,.29],[.39,.27,.51],[.69,.55,.30],[.21,.22,.24],[.68,.65,.53],[.37,.25,.19]];
const APPEARANCE_SKINS=[[1.67,1.48,1.23],[1.48,1.36,1.17],[1.22,1.09,.94],[1.02,.84,.70],[.78,.62,.51],[.55,.43,.36]];
const APPEARANCE_HAIR=[[.10,.10,.11],[.30,.20,.12],[.45,.22,.12],[.69,.51,.25],[.67,.68,.65],[.85,.83,.72]];
function avatarIdentity(gear){return gear===s.equipment?(creatorDraft||s.character||{}):gear._appearance||{};}

const rebuiltPoses=new Map();
const avatarMaterials=new Map(),avatarRigPoses=new Map();
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
function realmSkeletonPose(a,clip,frame,blend,baseClip,baseFrame,holdStaff=false){
 const motion=a.clips[clip];if(!motion.trs){const offset=Math.round(frame)*a.count*12;return new Float32Array(motion.m.subarray(offset,offset+a.count*12));}
 const rig=a.rig,global=[],pose=new Float32Array(a.count*12),v=new Float32Array(10),base=new Float32Array(10);
 for(let bone=0;bone<a.joints;bone++){
  sampleRealmJoint(motion,frame,bone,a.joints,v);
  if(blend<1){sampleRealmJoint(a.clips[baseClip],baseFrame,bone,a.joints,base);const sign=v[3]*base[3]+v[4]*base[4]+v[5]*base[5]+v[6]*base[6]<0?-1:1;for(let j=0;j<10;j++)v[j]=base[j]*(1-blend)+v[j]*blend*(j>=3&&j<=6?sign:1);const length=Math.hypot(v[3],v[4],v[5],v[6]);for(let j=3;j<7;j++)v[j]/=length;}
  if(holdStaff&&['walk','run','idle'].includes(clip)&&/^(index|middle|ring|pinky|thumb)_.*_r$/.test(rig.names[bone]))sampleRealmJoint(a.clips.staffIdle,0,bone,a.joints,v);
  const local=realmJointMatrix(v),parent=rig.parents[bone];global.push(parent<0?local:affineMultiply(global[parent],local));
  pose.set(affineMultiply(global[bone],rig.bind.subarray(bone*12,bone*12+12)),bone*12);
 }
 pose.set(global[rig.head],a.head*12);pose.set(affineMultiply(global[rig.right],rig.rightGrip),a.right*12);pose.set(affineMultiply(global[rig.left],rig.leftGrip),a.left*12);
 return pose;
}
function avatarMaterial(sex,gear,look){
 const identity=avatarIdentity(gear),key=[sex,look,armorAppearanceKey(gear),gear._cloth,JSON.stringify(identity)].join(':');if(avatarMaterials.has(key)){const cached=avatarMaterials.get(key);avatarMaterials.delete(key);avatarMaterials.set(key,cached);return cached;}
 const mesh=(rebuiltAvatars[sex]||rebuiltAvatars.male).mesh,p=new Float32Array(mesh.p),c=new Float32Array(mesh.c),f=new Float32Array(mesh.f),t=new Uint8Array(mesh.t);
 const cloth=APPEARANCE_COLORS[identity.topColor]||APPEARANCE_COLORS[look%4],skin=APPEARANCE_SKINS[identity.skin]||[[1.48,1.36,1.17],[1.08,.99,.90],[1.67,1.48,1.23],[.75,.70,.66]][look%4];
 for(let v=0;v<p.length/3;v++){
  const i=v*3,x=mesh.p[i],y=mesh.p[i+1],torso=y>.80&&y<1.55&&Math.abs(x)<.78&&(y<1.45||Math.abs(x)<.42),feet=y<.25;
  if(torso){const color=gear._cloth|| (modularModel(gear.body)?[.188,.235,.270]:ITEMS[gear.body]?.magicAccuracy>0?(gear.body==='mysticRobe'?[.20,.34,.57]:gear.body==='adeptRobe'?[.42,.22,.48]:[.30,.24,.40]):ITEMS[gear.body]?.rangedAccuracy>0?(gear.body==='blackHideBody'?[.14,.17,.18]:gear.body==='redHideBody'?[.48,.20,.16]:gear.body==='blueHideBody'?[.19,.34,.50]:gear.body==='greenHideBody'?[.25,.39,.22]:[.38,.24,.14]):cloth);for(let j=0;j<3;j++)c[i+j]=f[i+j]=color[j];t[v]=20;}
  else if(y>1.49||Math.abs(x)>.70){for(let j=0;j<3;j++){c[i+j]*=skin[j];f[i+j]*=skin[j];}}
  if(modularModel(gear.body)&&y>1.49&&y<1.625&&Math.abs(x)<.12){for(let k=0;k<3;k++)c[i+k]=f[i+k]=[.188,.235,.270][k];t[v]=20;}
  if(identity.topStyle===1&&Math.abs(x)>.42&&y>1.0&&y<1.55){for(let j=0;j<3;j++)c[i+j]=f[i+j]=mesh.c[i+j]*skin[j];t[v]=mesh.t[v];}
  if(identity.topStyle===2&&torso&&Math.abs(x)<.07&&y>1.05){for(let j=0;j<3;j++)c[i+j]=f[i+j]=[.72,.56,.30][j];}
  if(y>.24&&y<.89&&identity.bottomColor!==undefined){const color=APPEARANCE_COLORS[identity.bottomColor]||APPEARANCE_COLORS[5];for(let j=0;j<3;j++)c[i+j]=f[i+j]=color[j];t[v]=20;}
  if(identity.bottomStyle===1&&y>.25&&y<.48){for(let j=0;j<3;j++)c[i+j]=f[i+j]=[.55,.50,.39][j];}
  if(feet&&gear.feet){for(let j=0;j<3;j++)c[i+j]=f[i+j]=[.20,.13,.08][j];t[v]=20;}
  if(y>.89&&y<.96){for(let j=0;j<3;j++)c[i+j]=f[i+j]=[.19,.14,.085][j];t[v]=20;}
  const expand=torso?(y<1.02?.020:.010):feet&&gear.feet?.012:0;
  for(let axis=0;axis<3;axis++)p[i+axis]+=mesh.n[i+axis]*expand;
 }
 const material=mergeWornMeshes({...mesh,p,c,f,t},sex,gear);avatarMaterials.set(key,material);if(avatarMaterials.size>128)avatarMaterials.delete(avatarMaterials.keys().next().value);return material;
}
function avatarPose(sex,clip,phase,gear,look,blend=1,baseClip='idle',basePhase=0){
 const a=rebuiltAvatars[sex]||rebuiltAvatars.male,motion=a.clips[clip],frame=Math.min(motion.frames-1,Math.max(0,Math.round(phase*(motion.frames-1)*2)/2)),baseFrame=Math.min(a.clips[baseClip].frames-1,Math.max(0,Math.round(basePhase*(a.clips[baseClip].frames-1)*2)/2));blend=Math.round(blend*16)/16;
 const key=[sex,clip,frame,look,armorAppearanceKey(gear),gear._cloth,JSON.stringify(avatarIdentity(gear)),blend,blend<1?baseClip:'',blend<1?baseFrame:''].join(':');if(rebuiltPoses.has(key))return rebuiltPoses.get(key);
 const mesh=avatarMaterial(sex,gear,look),p=new Float32Array(mesh.p.length),n=new Float32Array(mesh.n.length),pose=realmSkeletonPose(a,clip,frame,blend,baseClip,baseFrame,ITEMS[gear.weapon]?.style==='magic');
 for(let v=0;v<p.length/3;v++){const i=v*3;
  for(let w=0;w<4;w++){const weight=mesh.w[v*4+w];if(!weight)continue;const bone=mesh.j[v*4+w]*12;for(let axis=0;axis<3;axis++){const k=bone+axis*4;p[i+axis]+=weight*(pose[k]*mesh.p[i]+pose[k+1]*mesh.p[i+1]+pose[k+2]*mesh.p[i+2]+pose[k+3]);n[i+axis]+=weight*(pose[k]*mesh.n[i]+pose[k+1]*mesh.n[i+1]+pose[k+2]*mesh.n[i+2]);}}
 }
 const result={...mesh,p,n,pose,avatar:a,helmet:null};rebuiltPoses.set(key,result);if(rebuiltPoses.size>128)rebuiltPoses.delete(rebuiltPoses.keys().next().value);return result;
}
function avatarGpuPose(sex,clip,phase,gear,look,blend=1,baseClip='idle',basePhase=0){
 const a=rebuiltAvatars[sex]||rebuiltAvatars.male,frame=Math.max(0,Math.min(a.clips[clip].frames-1,phase*(a.clips[clip].frames-1))),baseFrame=Math.max(0,Math.min(a.clips[baseClip].frames-1,basePhase*(a.clips[baseClip].frames-1)));
 const key=[sex,clip,ITEMS[gear.weapon]?.style==='magic',frame.toFixed(3),blend.toFixed(3),blend<1?baseClip:'',blend<1?baseFrame.toFixed(3):''].join(':');let pose=avatarRigPoses.get(key);
 if(!pose){pose=realmSkeletonPose(a,clip,frame,blend,baseClip,baseFrame,ITEMS[gear.weapon]?.style==='magic');avatarRigPoses.set(key,pose);if(avatarRigPoses.size>128)avatarRigPoses.delete(avatarRigPoses.keys().next().value);}
 const gpuMesh=avatarMaterial(sex,gear,look);return {...gpuMesh,gpuMesh,pose,avatar:a};
}
function avatarHelmet(mesh,a){
 const indices=[];for(let j=0;j<mesh.i.length;j+=3){const ids=[mesh.i[j],mesh.i[j+1],mesh.i[j+2]],y=ids.reduce((s,v)=>s+a.mesh.p[v*3+1],0)/3,z=ids.reduce((s,v)=>s+a.mesh.p[v*3+2],0)/3;if(y>1.62&&(y>1.74||z<.035))indices.push(...ids);}
 const p=Float32Array.from(mesh.p,(v,i)=>v+mesh.n[i]*.017),c=Float32Array.from(mesh.c,(_,i)=>[.48,.53,.55][i%3]);
 return {...mesh,p,c,f:c,t:new Uint8Array(mesh.t.length).fill(20),i:new Uint16Array(indices)};
}
function affineMultiply(a,b){const m=new Float32Array(12);for(let row=0;row<3;row++)for(let col=0;col<4;col++){m[row*4+col]=(col===3?a[row*4+3]:0);for(let k=0;k<3;k++)m[row*4+col]+=a[row*4+k]*b[k*4+col];}return m;}
const hairPalette=[[.30,.20,.12],[.45,.22,.12],[.10,.10,.11],[.67,.68,.65]],hairTintCache=new Map();
const fittedHairCache=new Map();
function fittedHairMesh(name,sex='male'){
 const key=sex+':'+name;if(fittedHairCache.has(key))return fittedHairCache.get(key);
 const mesh=rebuiltModels[name],sourceSex=name==='Hair_Long'?'female':'male',source=rebuiltAvatars[sourceSex],target=rebuiltAvatars[sex]||rebuiltAvatars.male;
 const crown=a=>a.mesh.bounds[1][1],sourceTop=crown(source),targetTop=crown(target);
 const skullWidth=(a,y)=>{let width=0;for(let i=0;i<a.mesh.p.length;i+=3)if(a.mesh.p[i+1]>y&&a.mesh.p[i+1]<y+.10)width=Math.max(width,Math.abs(a.mesh.p[i]));return width;};
 const sx=skullWidth(target,targetTop-.16)/skullWidth(source,sourceTop-.16),sy=(targetTop-(sex==='female'?1.549:1.599))/(sourceTop-(sourceSex==='female'?1.549:1.599));
 const p=new Float32Array(mesh.p),n=new Float32Array(mesh.n),clearance=name==='Hair_Beard'?0:.009,sz=sex==='female'&&['Hair_SimpleParted','Hair_Buzzed'].includes(name)?1.18:1.035;
 for(let i=0;i<p.length;i+=3){p[i]*=sx;p[i+1]=targetTop+(mesh.p[i+1]-sourceTop)*sy+clearance;p[i+2]*=sz;
  n[i]/=sx;n[i+1]/=sy;n[i+2]/=sz;const len=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let k=0;k<3;k++)n[i+k]/=len;
 }
 const bounds=[0,1].map(side=>[0,1,2].map(k=>{let value=side?-Infinity:Infinity;for(let i=k;i<p.length;i+=3)value=side?Math.max(value,p[i]):Math.min(value,p[i]);return value;}));
 const fitted={...mesh,p,n,bounds};fittedHairCache.set(key,fitted);return fitted;
}
function tintedHair(name,look,sex='male'){const key=sex+':'+name+':'+look%6;if(!hairTintCache.has(key)){const m=fittedHairMesh(name,sex),t=APPEARANCE_HAIR[look%6]||APPEARANCE_HAIR[0];hairTintCache.set(key,{...m,c:Float32Array.from(m.c,(v,i)=>v*t[i%3]),f:Float32Array.from(m.f,(v,i)=>v*t[i%3])});}return hairTintCache.get(key);}


// The source staff's decorative grip was wider than the closed fingers.
// Fit the shaft to the palm while preserving the artist's full-sized crown.
let fittedStaffCache=null;
function fittedStaffMesh(){
 if(fittedStaffCache)return fittedStaffCache;
 const source=briarRigs.Mage.meshes['2H_Staff'],p=new Float32Array(source.p),n=new Float32Array(source.n.length);
 for(let i=0;i<p.length;i+=3){const blend=Math.max(0,Math.min(1,(p[i+1]-.32)/.34)),width=.28+blend*.40;p[i]*=width;p[i+1]*=.68;p[i+2]*=width;}
 for(let i=0;i<source.i.length;i+=3){const a=source.i[i]*3,b=source.i[i+1]*3,c=source.i[i+2]*3,u=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],v=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]],normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(const index of [a,b,c])for(let k=0;k<3;k++)n[index+k]+=normal[k];}
 for(let i=0;i<n.length;i+=3){const length=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let k=0;k<3;k++)n[i+k]/=length;}
 const bounds=[0,1].map(side=>[0,1,2].map(axis=>{let value=side?-Infinity:Infinity;for(let i=axis;i<p.length;i+=3)value=side?Math.max(value,p[i]):Math.min(value,p[i]);return value;}));
 return fittedStaffCache={...source,p,n,bounds};
}

const humanoidBeforeRebuild=humanoid3;
humanoid3=function(r,x,z,look,gear={},heading=0,walk=0,attack=0,size=1){
 r=groundedPainter(r,x,z);
 if(gear._bones){if(!r.indexed)return humanoidBeforeRebuild(r,x,z,look,gear,heading,walk,attack,size);const phase=Math.round((walk%(Math.PI*2))*24)/24,swing=Math.round(attack*32)/32,key=['skeleton',meshDetail3,look,gear.weapon,gear.shield,phase,swing].join(':');return cachedRealmShape(r,key,briarTransform(x,0,z,size,heading),q=>{humanoidBeforeRebuild(q,0,0,look,gear,0,phase,swing,1);return 2;});}
 const identity=gear===s.equipment?(creatorDraft||s.character||{}):{race:gear._race||'human',frame:gear._frame||(look%3===2?'female':'male'),hair:gear._hair??look%3,...(gear._appearance||{})},race=identity.race||gear._race||'human',sex=identity.frame||'male';
 const player=gear===s.equipment&&!creatorDraft,locomotion=player&&playerMotion.blend>.01,a=rebuiltAvatars[sex]||rebuiltAvatars.male;
 const worship=player&&spiritEffect?.ids&&spiritEffect.scene===currentScene,castAt=worship?spiritEffect.started:gear._castAt,castDuration=worship?spiritEffect.duration:gear._castDuration||2.6;
 const poseAction=player?(typeof questVisualAction==='function'?questVisualAction():playerAction):gear._peerAction?.work,gathering=player&&typeof gatheringActivity==='function'?gatheringActivity():gear._peerAction?.gathering,burying=['bury','cook','firemaking','investigate','repair','ritual'].includes(poseAction?.kind),firemaking=burying&&poseAction.kind==='firemaking',casting=Number.isFinite(castAt)&&time>=castAt&&time-castAt<castDuration,busy=gathering||burying||casting,poseGear=busy?{...gear,_appearance:identity,weapon:null,shield:null}:gear;
 const bow=ITEMS[gear.weapon]?.style==='ranged',attackClip=['ranged','magic'].includes(gear._attackStyle)?gear._attackStyle:ITEMS[gear.weapon]?.style==='magic'?'magic':bow?'ranged':gear.weapon?'melee':'unarmed',duration=a.clips[attackClip].duration,age=player?time-lastAttack:Number.isFinite(gear._attackAt)?time-gear._attackAt:Infinity,attacking=!busy&&!(player?playerMotion.moving:walk)&&age>=0&&age<duration&&(!playerAttackMotion||!player||playerAttackMotion.weapon===gear.weapon);
 // Small, distant NPCs retain the authored resting pose. Updating every finger
 // on every background character was needlessly repacking megabytes per frame.
 const idleClip=gear._portrait&&ITEMS[poseGear.weapon]?.style!=='magic'?'idle':poseGear.weapon?(bow?'bowIdle':ITEMS[poseGear.weapon]?.style==='magic'?'staffIdle':ITEMS[poseGear.weapon]?.style==='melee'?'swordIdle':'idle'):'idle',nearbyIdle=!player&&cameraZoom3()*size>85&&Math.hypot(x-px-.5,z-py-.5)<6,idleTime=player?time:nearbyIdle?Math.floor(time*8)/8:0,idlePhase=(idleTime/a.clips[idleClip].duration)%1,clip=casting?'magic':firemaking?'firemaking':poseAction?.kind==='ritual'?'magic':burying?'bury':gathering?(gathering.object.type==='fish'?'fishing':'melee'):attacking?attackClip:locomotion?(playerMotion.running?'run':'walk'):!player&&walk?(gear._peerMotion?.running?'run':'walk'):idleClip;
 const phase=casting?Math.min(.94,(time-castAt)/castDuration):burying?Math.min(1,(time-poseAction.started)/poseAction.duration):gathering?(gathering.object.type==='fish'?.2+Math.sin(gathering.phase*Math.PI)*.18:gathering.phase):attacking?age/duration:locomotion?playerMotion.phase:!player&&walk?(gear._peerMotion?.phase??(walk/10/.75)%1):idlePhase,blend=casting?Math.min(1,(time-castAt)/.18):burying?1:gathering?Math.min(1,.3+gathering.phase*5):attacking?Math.max(0,Math.min(1,age/.10,(duration-age)/.14)):locomotion?playerMotion.blend:1;
 const mesh=(r.skinned?avatarGpuPose:avatarPose)(sex,clip,phase,poseGear,look,blend,idleClip,idlePhase);
 const k=size*(race==='dwarf'?1.07:race==='elf'?.94:1),root=briarTransform(x,player?Math.max(0,Math.sin(Math.min(1,(time-playerHitAt)/.28)*Math.PI))*.025:0,z,k,heading,size*(race==='dwarf'?.77:race==='elf'?1.1:1));
 if(r.skinned)r.skinned(mesh.gpuMesh,root,mesh.pose);else briarEmit(r,mesh,root);
 const head=mesh.pose.subarray(mesh.avatar.head*12,mesh.avatar.head*12+12),headTransform=affineMultiply(root,affineMultiply(head,mesh.avatar.headBind));
 if(typeof npcDressRealm==='function')npcDressRealm(r,headTransform,root,gear);
 if(!gear._civilian&&(!gear.head||gear.head==='rangerCap')&&!['bandit','warden'].includes(gear._kind)){const hair=['Hair_SimpleParted','Hair_Long','Hair_Buzzed'][identity.hair%3||0];if(identity.hair!==3&&identity.hair!==4)briarEmit(r,tintedHair(hair,identity.hairColor??look,sex),headTransform);if(identity.beard===1)briarEmit(r,tintedHair('Hair_Beard',identity.hairColor??look,sex),headTransform);if(race==='dwarf')briarEmit(r,rebuiltModels.Hair_Beard,headTransform);}
 else if(gear.head&&!modularModel(gear.head)){const base=mesh.gpuMesh||mesh;base.helmet??=avatarHelmet(base,mesh.avatar);if(r.skinned)r.skinned(base.helmet,root,mesh.pose);else briarEmit(r,base.helmet,root);}
 if(gear.head==='rangerCap')briarEmit(r,rebuiltModels.Ranger_Cap,affineMultiply(headTransform,briarTransform(0,a.mesh.bounds[1][1]-.052,.015,1.13)));
 if(typeof drawArcWearables==='function')drawArcWearables(r,root,mesh,gear);
 if(bow)drawArcherQuiver(r,root,mesh,gear===s.equipment?s.equippedAmmoCount:gear._ammoCount||0,gear.ammo);
 if(casting)drawCastingLight(r,root,mesh,phase,worship?spiritEffect.color:gear._castColor||'#a7e6e0');
 if(burying&&poseAction.kind==='bury')drawBoneOffering(r,root,mesh,(time-poseAction.started)/poseAction.duration);
 if(firemaking&&!poseAction.committed){for(const [bone,left]of [[mesh.avatar.left,true],[mesh.avatar.right,false]]){const hand=affineMultiply(root,mesh.pose.subarray(bone*12,bone*12+12));box3(r,0,.01,0,left?.13:.075,.045,left?.085:.045,left?'#695341':'#9d9e93',p=>briarPoint(p,0,hand));}const age=time-poseAction.started,p=briarPoint([0,.08,.35],0,root);if(age>.4&&Math.sin(age*18)>.3)for(let i=0;i<3;i++)oval3(r,p[0]+Math.sin(i*3+age)*.08,p[1]+i*.04,p[2]+Math.cos(i+age)*.06,.025,.025,.025,'#ffd789',p=>p,5);}
 // Weapon meshes are attached to the new rig's actual palms.
 if(gathering&&typeof drawGatheringTool==='function')drawGatheringTool(r,affineMultiply(root,mesh.pose.subarray(mesh.avatar.right*12,mesh.avatar.right*12+12)),gathering.tool);
 if(!busy&&bow)drawFittedBow(r,root,mesh,attacking?age:-1,attacking&&(player?playerAttackMotion?.ammo:gear._ammoCount>0),gear.weapon,gear.ammo);
 for(const [slot,bone]of [['weapon',mesh.avatar.right],['shield',mesh.avatar.left]])if(!busy&&!bow&&gear[slot]){
  const source=slot==='shield'?briarRigs.Knight.meshes.Badge_Shield:ITEMS[gear.weapon]?.style==='magic'?briarRigs.Mage.meshes['2H_Staff']:ITEMS[gear.weapon]?.style==='ranged'?null:briarRigs.Knight.meshes['1H_Sword'];
  const socket=mesh.pose.subarray(bone*12,bone*12+12),world=affineMultiply(root,socket);
  const modular=wornModularMesh(sex,gear[slot]);
  if(modular)briarEmit(r,modular,world);
  else if(slot==='weapon'&&['bronzeSword','ironSword'].includes(gear.weapon)){fittedSwordRealm(r,world,gear.weapon==='bronzeSword');}
  else if(slot==='weapon'&&gear.weapon==='veyrOrb'&&typeof buildArcItem==='function'){const q={face:(points,col)=>r.face(points.map(v=>briarPoint(v,0,world)),col)};buildArcItem(q,'veyrOrb');}
  else if(slot==='weapon'&&ITEMS[gear.weapon]?.style==='magic')briarEmit(r,fittedStaffMesh(),affineMultiply(world,briarTransform(sex==='female'?-.003:-.008,0,-.006)));
  else if(source){const k=slot==='shield'?.62:ITEMS[gear.weapon]?.style==='magic'?.68:.78;briarEmit(r,source,affineMultiply(world,slot==='shield'?[k,0,0,0,0,0,-k,0,0,k,0,0]:[k,0,0,0,0,k,0,0,0,0,k,0]));}
  else{const bow={face(p,c){r.face(p.map(v=>briarPoint(v,0,world)),c);}},points=Array.from({length:13},(_,i)=>[.13*Math.sin(i*Math.PI/12),-.45+i*.075,0]);for(let i=0;i<12;i++)beamArt(bow,points[i],points[i+1],.016,'#81613b',5);beamArt(bow,points[0],points[12],.004,'#c9bd9d',4);}
 }
 if(attacking&&attackClip==='magic'&&age<a.clips.magic.releaseAt)drawCastingLight(r,root,mesh,age/a.clips.magic.releaseAt,playerAttackMotion?.color||'#a2ddea');
};

// Imported props share the same meshes in the world, bag and equipment view.
// The imported mesh has its grip at x=0 and its limb tips at x=-.318.
// Its origin is already the palm: no extra half-turn or hand offset is needed.
const ARCHER_BOW={grip:[.0075,0,0],top:[-.317, .994,0],bottom:[-.317,-.994,0],scale:.65};
const rangedMaterialCache=new Map();
function rangedItemMesh(id,arrow=false){
 const source=rebuiltModels[arrow?'Archer_Arrow':'Archer_Bow'],key=(arrow?'arrow:':'bow:')+id;
 if(rangedMaterialCache.has(key))return rangedMaterialCache.get(key);
 const woods={shortbow:'#ab7844',oakShortbow:'#916037',willowShortbow:'#788c53',mapleShortbow:'#c77c43',yewShortbow:'#856f63',magicShortbow:'#729cbe'};
 const metals={arrows:'#b69358',ironArrows:'#9ca8b5',steelArrows:'#d1dbe0',mithrilArrows:'#91a3de',adamantArrows:'#72ab7b',runeArrows:'#75cddd'};
 const hex=(arrow?metals[id]:woods[id])||(arrow?metals.arrows:woods.shortbow),rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 // Keep the imported geometry and shading. Change only wood or metal: the
 // arrow's shaft and feather colours are shared by all ammunition tiers.
 const dye=colors=>{const out=new Float32Array(colors);for(let i=0;i<out.length;i+=3){const r=colors[i],g=colors[i+1],b=colors[i+2],isHead=Math.max(r,g,b)-Math.min(r,g,b)<.04&&r>.6;
  if(!arrow||isHead){const light=arrow?Math.max(r,g,b):Math.min(1.12,Math.max(.70,r/.36));for(let k=0;k<3;k++)out[i+k]=Math.min(1,rgb[k]*light);}
  else if(r>g*1.2&&g>b*1.5){out[i]=Math.min(1,r*1.65);out[i+1]=Math.min(1,g*1.65);out[i+2]=Math.min(1,b*1.65);}
 }return out;};
 const mesh={...source,c:dye(source.f||source.c),f:dye(source.f||source.c),uv:null,t:new Float32Array(source.p.length/3).fill(12)};
 rangedMaterialCache.set(key,mesh);return mesh;
}
function archerBowMesh(id='shortbow'){return rangedItemMesh(id);}
function arrowTransform(start,end,width=1){
 const y=end.map((v,i)=>v-start[i]),length=Math.hypot(...y)||1;for(let i=0;i<3;i++)y[i]/=length;
 const x=Math.abs(y[1])<.9?[y[2],0,-y[0]]:[1,0,0],xl=Math.hypot(...x)||1;for(let i=0;i<3;i++)x[i]/=xl;
 const z=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
 return [x[0]*width,y[0]*length,z[0]*width,start[0],x[1]*width,y[1]*length,z[1]*width,start[1],x[2]*width,y[2]*length,z[2]*width,start[2]];
}
function fittedBowPose(root,mesh,age){
 const rig=mesh.avatar.rig,hand=affineMultiply(root,affineMultiply(mesh.pose.subarray(rig.left*12,rig.left*12+12),rig.bowBind)),k=ARCHER_BOW.scale;
 const m=affineMultiply(hand,[k,0,0,-ARCHER_BOW.grip[0]*k,0,k,0,0,0,0,k,0]);
 const top=briarPoint(ARCHER_BOW.top,0,m),bottom=briarPoint(ARCHER_BOW.bottom,0,m),rest=top.map((v,i)=>(v+bottom[i])/2),grip=briarPoint(ARCHER_BOW.grip,0,m);
 const right=affineMultiply(root,mesh.pose.subarray(mesh.avatar.right*12,mesh.avatar.right*12+12)),draw=briarPoint([0,0,0],0,right),release=mesh.avatar.clips.ranged.releaseAt;
 const pull=age<0?0:age<release?Math.min(1,Math.max(0,(age-.12)/.32)):Math.max(0,1-(age-release)/.07),nock=rest.map((v,i)=>v+(draw[i]-v)*pull);
 const d=grip.map((v,i)=>v-nock[i]),distance=Math.hypot(...d)||1,length=Math.max(.78,distance+.16),tip=nock.map((v,i)=>v+d[i]/distance*length);
 return {m,top,bottom,grip,nock,tip,length,release};
}
function drawFittedBow(r,root,mesh,age,loaded,weapon='shortbow',ammo='arrows'){
 const pose=fittedBowPose(root,mesh,age);briarEmit(r,archerBowMesh(weapon),pose.m);
 beamArt(r,pose.top,pose.nock,.0035,'#d4c9ac',4);beamArt(r,pose.nock,pose.bottom,.0035,'#d4c9ac',4);
 if(loaded&&age>=.15&&age<pose.release)briarEmit(r,rangedItemMesh(ammo,true),arrowTransform(pose.nock,pose.tip,.75));
}
function rangedReleasePose(shot){
 const a=rebuiltAvatars[shot.frame||'male'],clip=a.clips.ranged,age=clip.releaseAt-.0001;
 const pose=realmSkeletonPose(a,'ranged',age/clip.duration*(clip.frames-1),1,'bowIdle',0),root=briarTransform(shot.x+.5,0,shot.y+.5,1,shot.heading||0);
 return fittedBowPose(root,{avatar:a,pose},age);
}
function visibleQuiverArrows(count){return Math.min(5,Math.max(0,Math.ceil(Number(count)||0)));}
function drawArcherQuiver(r,root,mesh,count,ammo='arrows'){
 const spine=mesh.avatar.rig.names.indexOf('spine_03'),body=affineMultiply(root,mesh.pose.subarray(spine*12,spine*12+12)),m=affineMultiply(body,[.86,-.22,0,.13,.22,.86,0,1.22,0,0,.9,-.25]);
 briarEmit(r,rebuiltModels.Archer_Quiver,m);
 for(let i=0;i<visibleQuiverArrows(count);i++){const x=(i%3-1)*.029,z=(Math.floor(i/3)-.5)*.039,start=briarPoint([x,.43+(i%2)*.027,z],0,m),end=briarPoint([x,-.21,z],0,m);briarEmit(r,rangedItemMesh(ammo,true),arrowTransform(start,end,.65));}
}
function drawBoneOffering(r,root,mesh,phase){
 if(phase<.53){const hand=affineMultiply(root,mesh.pose.subarray(mesh.avatar.right*12,mesh.avatar.right*12+12)),q={face:(p,c)=>r.face(p.map(v=>briarPoint(v,0,hand)),c)};beamArt(q,[-.10,0,0],[.10,0,0],.018,'#d6cfb8',6);for(const x of [-.10,.10])oval3(q,x,0,0,.065,.048,.04,'#d6cfb8',p=>p,6);}
 else if(phase<.82){const k=(phase-.53)/.29,p=briarPoint([0,.012,.52],0,root);oval3(r,p[0],p[1],p[2],.24*(1-k),.018,.15*(1-k),'#79664c',p=>p,8);}
}
function drawCastingLight(r,root,mesh,phase,color){
 const hand=affineMultiply(root,mesh.pose.subarray(mesh.avatar.left*12,mesh.avatar.left*12+12)),p=briarPoint([0,.05,0],0,hand),size=.045+Math.sin(phase*Math.PI)*.065;
 oval3(r,...p,size,size,size,color,p=>p,8);
 for(let i=0;i<3;i++){const angle=phase*8+i*Math.PI*2/3;oval3(r,p[0]+Math.cos(angle)*.12,p[1]+Math.sin(angle)*.10,p[2],.027,.027,.027,'#e6f5df',p=>p,5);}
}
function drawCombatProjectiles3(r){
 for(const p of projectiles){if(p.style!=='ranged'||p.age<0)continue;
  const t=Math.min(1,p.age/p.duration),start=p.releasePose?.tip||[p.x+.5,1.3,p.y+.5],end=[p.tx+.5,p.targetHeight||.7,p.ty+.5];
  const tip=start.map((v,i)=>v+(end[i]-v)*t);tip[1]+=Math.sin(t*Math.PI)*.15;
  const d=end.map((v,i)=>v-start[i]),distance=Math.hypot(...d)||1,length=p.releasePose?.length||.78,tail=tip.map((v,i)=>v-d[i]/distance*length);
  briarEmit(groundedPainter(r,tip[0],tip[2]),rangedItemMesh(p.ammo,true),arrowTransform(tail,tip,.75));
 }
}

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

let REALM_ATLAS_IMAGE=null,MODULAR_ICON_IMAGE=null;
function drawModularItemIcon(g,id){if(ITEMS[id]?.modelTint||ITEMS[id]?.modelScale)return false;const name=id==='toolBelt'?'PermanentToolBelt':modularModel(id);if(/^(Chestplate|Shoulder|Gauntlets|Legguards|Boots|Headgear|Belt|Robe)\./.test(name))return false;const tile=REALM_MODELS.armorIcons?.[name];if(!MODULAR_ICON_IMAGE||tile===undefined)return false;g.drawImage(MODULAR_ICON_IMAGE,tile%8*128,Math.floor(tile/8)*128,128,128,0,0,g.canvas.width,g.canvas.height);return true;}
async function loadRebuiltTextures(){
 [REALM_ATLAS_IMAGE,MODULAR_ICON_IMAGE]=await Promise.all([realmLoadImage('assets/realms/atlas.png'),realmLoadImage('assets/realms/armor-icons.png')]);
 if(window.matchMedia('(pointer: coarse)').matches){const small=document.createElement('canvas');small.width=small.height=2048;small.getContext('2d').drawImage(REALM_ATLAS_IMAGE,0,0,2048,2048);REALM_ATLAS_IMAGE=small;}
}
function startRebuiltRealm(){boot();}

function drawArcWearables(r,root,mesh,gear){
 const local=(matrix,offset=[0,0,0],scale=1)=>({face:(points,col)=>r.face(points.map(v=>briarPoint(v.map((n,i)=>n*scale+offset[i]),0,matrix)),col)});
 const bone=(name)=>{const i=mesh.avatar.rig.names.indexOf(name);return i>=0?affineMultiply(root,mesh.pose.subarray(i*12,i*12+12)):root;};
 if(['wardkeeperCape','scholarMantle'].includes(gear.cape)&&typeof buildArcItem==='function')buildArcItem(local(bone('spine_03'),[0,1.08,-.22],.78),'wardkeeperCape');
 if(gear.belt==='ironhollowBelt'&&typeof buildArcItem==='function')buildArcItem(local(bone('pelvis'),[0,.93,0],.68),'ironhollowBelt');
 if(['whisperPendant','scholarAmulet'].includes(gear.neck)&&typeof buildArcItem==='function')buildArcItem(local(bone('spine_03'),[0,1.47,.14],.27),'whisperPendant');
 if(ITEMS[gear.ring]?.slot==='ring'&&typeof buildArcItem==='function'){const hand=affineMultiply(root,mesh.pose.subarray(mesh.avatar.left*12,mesh.avatar.left*12+12));buildArcItem(local(hand,[.04,-.035,.015],.075),gear.ring);}
}
const arcProjectileBefore=drawCombatProjectiles3;
drawCombatProjectiles3=function(r){
 arcProjectileBefore(r);
 for(const p of projectiles)if(p.weapon==='veyrOrb'&&p.style==='magic'&&p.age>=0){const t=Math.min(1,p.age/p.duration),x=p.x+.5+(p.tx-p.x)*t,z=p.y+.5+(p.ty-p.y)*t,q=groundedPainter(r,x,z);for(let i=0;i<3;i++){const angle=t*12+i*Math.PI*2/3;oval3(materialRealm(q,19),x+Math.cos(angle)*.16,1.1+Math.sin(angle)*.13,z+Math.sin(angle)*.16,.07,.07,.07,i?'#9272bb':'#e0c9f4',v=>v,7);}}
};
