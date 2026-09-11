'use strict';
// Orthographic 3D geometry: world X/Z, height Y, a freely orbiting camera.
const view3d={yaw:-.55,tilt:.85,zoom:34,min:14,max:65};
try{const v=JSON.parse(localStorage.getItem('emberfall-camera-v1'));if(v){view3d.yaw=Number(v.yaw)||-.55;view3d.tilt=Math.max(.5,Math.min(1.2,Number(v.tilt)||.85));view3d.zoom=Math.max(14,Math.min(65,Number(v.zoom)||34));}}catch{}
function rememberView(){try{localStorage.setItem('emberfall-camera-v1',JSON.stringify(view3d));}catch{}}
function project3(x,y,z,v=view3d,cx=px+.5,cz=py+.5,w=screen.w,h=screen.h){const dx=x-cx,dz=z-cz,c=Math.cos(v.yaw),s=Math.sin(v.yaw),u=dx*c-dz*s,d=dx*s+dz*c;return {x:w/2+u*v.zoom,y:h*.54+(d*Math.sin(v.tilt)-y*Math.cos(v.tilt))*v.zoom,depth:d*Math.cos(v.tilt)+y*Math.sin(v.tilt)};}
function unproject3(sx,sy){const u=(sx-screen.w/2)/view3d.zoom,d=(sy-screen.h*.54)/view3d.zoom/Math.sin(view3d.tilt),c=Math.cos(view3d.yaw),s=Math.sin(view3d.yaw);return {x:px+.5+u*c+d*s,z:py+.5-u*s+d*c};}
function shade3(hex,f){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*f))).toString(16).padStart(2,'0')).join('');}
let meshDetail3=1;
const staticMeshes3=new WeakMap(),terrainLayers3=new Map();
const staticMeshQueues3={building:new Map(),prop:new Map()};
function cachedMesh3(key,kind,build){
 const queue=staticMeshQueues3[kind==='building'?'building':'prop'];queue.delete(key);queue.set(key,true);
 const limit=kind==='building'?80:640;
 if(queue.size>limit){const oldest=queue.keys().next().value;queue.delete(oldest);const discarded=staticMeshes3.get(oldest);if(typeof realmGPU!=='undefined'&&realmGPU&&discarded)for(const mesh of discarded.values()){const entry=realmGPU.cache.get(mesh);if(entry){realmGPU.gl.deleteBuffer(entry.buffer);realmGPU.cache.delete(mesh);}}staticMeshes3.delete(oldest);}
 let variants=staticMeshes3.get(key);if(!variants){variants=new Map();staticMeshes3.set(key,variants);}
 const tag=kind+':'+(typeof briarModels==='undefined'?meshDetail3:1)+':'+(key._cutaway?1:0);
 if(!variants.has(tag)){const faces=[],instances=[],collector={face:(points,color,normals,material,colors,uvs)=>faces.push({points,color,normals,material,colors,uvs})};if(kind!=='building')collector.indexed=(mesh,matrix)=>instances.push({mesh,matrix});const height=build(collector);variants.set(tag,{faces,instances,height,kind});}return variants.get(tag);
}
function emitMesh3(r,cached){if(r.cached)return r.cached(cached);for(const instance of cached.instances||[])briarEmit(r,instance.mesh,instance.matrix);for(const f of cached.faces)r.face(f.points,f.color,f.normals,f.material,f.colors,f.uvs);return cached.height;}
function painter3(g,project){const faces=[],fast=project===project3,cy=Math.cos(view3d.yaw),sy=Math.sin(view3d.yaw),ct=Math.cos(view3d.tilt),st=Math.sin(view3d.tilt),zoom=view3d.zoom,ox=px+.5,oz=py+.5,sw=screen.w,sh=screen.h;
 return {face(points,color){const p=[];let depth=0,minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
 for(const a of points){let q;if(fast&&typeof landHeight==='undefined'){const dx=a[0]-ox,dz=a[2]-oz,u=dx*cy-dz*sy,d=dx*sy+dz*cy;q={x:sw/2+u*zoom,y:sh*.54+(d*st-a[1]*ct)*zoom,depth:d*ct+a[1]*st};}else q=project(...a);p.push(q);depth+=q.depth;minx=Math.min(minx,q.x);maxx=Math.max(maxx,q.x);miny=Math.min(miny,q.y);maxy=Math.max(maxy,q.y);}
 if(fast&&(maxx<0||minx>sw||maxy<0||miny>sh))return;
 faces.push({p,color,d:depth/p.length});},flush(){faces.sort((a,b)=>a.d-b.d);for(const {p,color}of faces){g.fillStyle=color;g.beginPath();g.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)g.lineTo(p[i].x,p[i].y);g.closePath();g.fill();}}};}
function drawTerrainLayer3(){
 const unit=20,[mw,mh]=sceneSize();let layer=terrainLayers3.get(currentScene);
 if(!layer){layer=document.createElement('canvas');layer.width=mw*unit;layer.height=mh*unit;const g=layer.getContext('2d');
 for(let z=0;z<mh;z++)for(let x=0;x<mw;x++){const bridge=inWorld()&&x>=36&&x<=38&&((z>=16&&z<=18)||(z>=34&&z<=36)),t=bridge?3:terrainType(x,z),colors=['#658048','#b2a074','#969b83','#4d8192'];g.fillStyle=shade3(colors[t],.99+.018*Math.sin(x*.37+z*.19));g.fillRect(x*unit,z*unit,unit,unit);
 if(t===2){g.strokeStyle='#727c69';g.lineWidth=.7;for(let i=0;i<2;i++){g.fillStyle=(x+z+i)%3?'#a4aa90':'#b0b497';const ax=x*unit+2+i*9,ay=z*unit+2+((x+z+i)%2)*8;g.fillRect(ax,ay,7,6);g.strokeRect(ax,ay,7,6);}}
 if(t===0&&(x*3+z)%3===0){g.fillStyle='#789151';for(let i=0;i<3;i++)g.fillRect(x*unit+3+i*5,z*unit+((x+z+i*3)%15),1,3);}
 if(t===1){g.fillStyle='#c2b18a';g.fillRect(x*unit+((x*7+z)%14),z*unit+7,3,1);}
 if(t===3){g.fillStyle='#7ba1a4';g.fillRect(x*unit+3,z*unit+6,8,1);g.fillStyle='#608e9b';g.fillRect(x*unit+10,z*unit+14,6,1);}
 }
 terrainLayers3.set(currentScene,layer);}
 const c=Math.cos(view3d.yaw),sn=Math.sin(view3d.yaw),st=Math.sin(view3d.tilt),k=view3d.zoom/unit,origin=project3(0,0,0);
 ctx.save();ctx.transform(k*c,k*sn*st,-k*sn,k*c*st,origin.x,origin.y);ctx.drawImage(layer,0,0);ctx.restore();
}
function box3(r,x,y,z,w,h,d,color,transform=a=>a){const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>transform([x+a*w/2,y+b*h/2,z+c*d/2]));[[[0,1,2,3],.72],[[4,7,6,5],1],[[0,4,5,1],.55],[[3,2,6,7],1.18],[[1,5,6,2],.85],[[0,3,7,4],.95]].forEach(([ids,f])=>r.face(ids.map(i=>p[i]),shade3(color,f)));}
function cone3(r,x,y,z,radius,height,color,n=7){const top=[x,y+height,z];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;r.face([[x+Math.cos(a)*radius,y,z+Math.sin(a)*radius],top,[x+Math.cos(b)*radius,y,z+Math.sin(b)*radius]],shade3(color,.8+.25*Math.sin(a)));}}
// Curved surfaces share a consistent, soft directional light.
function surface3(r,points,color){const a=points[0],b=points[1],c=points[2],u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;const light=.88+(.22*n[1]-.16*n[0]+.1*n[2])/len;r.face(points,shade3(color,light));}
function profile3(r,x,y,z,w,h,d,rings,color,t=a=>a,n=8){
 if(meshDetail3<1){n=Math.max(4,Math.round(n*meshDetail3));if(rings.length>3)rings=[rings[0],rings[Math.floor(rings.length/2)],rings.at(-1)];}
 const rows=rings.map(([yy,rr])=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return t([x+Math.cos(a)*w*.5*rr,y+yy*h,z+Math.sin(a)*d*.5*rr]);}));
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++)surface3(r,[rows[j][i],rows[j][(i+1)%n],rows[j+1][(i+1)%n],rows[j+1][i]],color);
 r.face([...rows[0]].reverse(),shade3(color,.7));r.face(rows.at(-1),shade3(color,1.08));
}
function oval3(r,x,y,z,w,h,d,color,t=a=>a,n=8){profile3(r,x,y,z,w,h,d,[[-.5,.04],[-.35,.72],[0,1],[.35,.72],[.5,.04]],color,t,n);}
function limb3(r,x,y,z,w,h,d,color,t=a=>a){profile3(r,x,y,z,w,h,d,[[-.5,.62],[-.36,.9],[.28,1],[.5,.68]],color,t);}
function groundShadow3(g,x,z,rx,rz,alpha=.16){g.fillStyle='rgba(14,27,28,'+alpha+')';g.beginPath();for(let i=0;i<20;i++){const a=i/20*Math.PI*2,p=project3(x+Math.cos(a)*rx,.016,z+Math.sin(a)*rz);if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);}g.closePath();g.fill();}
function ring3(g,x,z,color,r=.4,y=.035){g.beginPath();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,p=project3(x+Math.cos(a)*r,y,z+Math.sin(a)*r);if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);}g.strokeStyle=color;g.lineWidth=2;g.stroke();}
let playerHeading=0;
function humanoid3(r,x,z,look,gear={},heading=0,walk=0,attack=0,size=1){
 const cloth=gear._bones?'#d7d2bd':['#3f6e82','#5b7359','#87505c','#6d5a89'][look%4],skin=gear._skin||['#d7aa87','#b78562','#e0b99b','#896349'][look%4],hair=['#4f3829','#332a28','#96724d','#252931'][look%4];
 const robe=gear.body==='mageRobe',armor=robe?'#655b89':gear.body?'#896c4e':cloth,metal='#abb9bf',leather='#503d31';
 const c=Math.cos(heading),sn=Math.sin(heading),bob=Math.abs(Math.sin(walk))*.022;
 const root=([a,b,d])=>[x+(a*c+d*sn)*size,(b+bob)*size,z+(-a*sn+d*c)*size];
 const part=(a,b,d,w,h,dep,col,t=root)=>oval3(r,a,b,d,w,h,dep,col,t);
 // Chest contour narrows at the waist and wraps around the shoulders and back.
 profile3(r,0,1.13,0,.53,.57,.30,[[-.5,.72],[-.22,.82],[.24,1],[.43,.95],[.5,.57]],armor,root,10);
 if(gear.body&&!gear._bones){for(const side of [-1,1])surface3(r,[[side*.05,.89,.155],[side*.2,1.23,.15],[side*.14,1.37,.11],[side*.015,1.1,.164]].map(root),robe?'#9983ae':'#b58a55');}
 if(gear._bones){for(let i=0;i<3;i++)for(const side of [-1,1])part(side*.13,1.03+i*.105,.13,.2,.047,.1,'#e7debd');}
 profile3(r,0,.85,0,.43,.085,.28,[[-.5,1],[.5,1]],leather,root);box3(r,0,.85,.14,.075,.065,.025,'#c5ad76',root);
 if(robe)profile3(r,0,.57,0,.61,.5,.41,[[-.5,1],[-.25,.95],[.5,.62]],armor,root,10);
 part(0,1.46,0,.14,.15,.15,skin);profile3(r,0,1.66,0,.285,.365,.28,[[-.5,.57],[-.2,.85],[.2,1],[.5,.75]],skin,root);
 // Rounded skull, fitted helmet cap, visible cheeks and a small nose.
 profile3(r,0,1.8,-.025,.32,.18,.31,[[-.5,1],[-.15,1],[.5,.4]],gear.head?metal:hair,root);
 if(gear.head){part(-.137,1.67,-.025,.045,.23,.24,metal);part(.137,1.67,-.025,.045,.23,.24,metal);part(0,1.76,.132,.28,.045,.04,'#d0d7d3');}
 else part(0,1.68,-.125,.28,.23,.09,hair);
 part(0,1.66,.153,.045,.068,.075,skin);part(0,1.565,.12,.11,.025,.018,'#ac7960');
 for(const side of [-1,1]){
  part(side*.061,1.695,.136,.026,.026,.016,'#29313a');part(side*.065,1.724,.137,.068,.018,.02,hair);
  const legAngle=Math.sin(walk)*.46*side,knee=Math.max(0,-Math.sin(walk)*side)*.45;
  const leg=([a,b,d])=>{const yy=b-.81;return root([a,.81+yy*Math.cos(legAngle)-d*Math.sin(legAngle),yy*Math.sin(legAngle)+d*Math.cos(legAngle)]);};
  const calf=([a,b,d])=>{const yy=b-.43;return leg([a,.43+yy*Math.cos(knee)-d*Math.sin(knee),yy*Math.sin(knee)+d*Math.cos(knee)]);};
  const trouser=gear._bones?'#d7d2bd':'#46505a';
  limb3(r,side*.123,.61,0,.185,.4,.22,trouser,leg);part(side*.123,.43,0,.15,.15,.18,trouser,leg);
  limb3(r,side*.123,.25,0,.145,.32,.175,gear.feet?leather:trouser,calf);part(side*.123,.075,.072,.18,.15,.34,gear.feet?leather:'#66645a',calf);
  if(gear.feet)profile3(r,side*.123,.375,0,.175,.08,.2,[[-.5,1],[.5,1]],'#756047',calf);
  const angle=Math.sin(walk)*-.43*side+(side===1?-attack*1.65:attack*.25);
  const arm=([a,b,d])=>{const yy=b-1.34;return root([a,1.34+yy*Math.cos(angle)-d*Math.sin(angle),yy*Math.sin(angle)+d*Math.cos(angle)]);};
  part(side*.285,1.32,0,.235,.21,.27,armor,arm);limb3(r,side*.315,1.14,0,.17,.31,.185,armor,arm);part(side*.326,.983,.015,.135,.14,.15,skin,arm);limb3(r,side*.335,.861,.028,.13,.2,.15,skin,arm);part(side*.34,.729,.04,.125,.155,.145,skin,arm);
  if(gear.body&&!robe)part(side*.29,1.365,0,.255,.1,.285,'#a08764',arm);
  if(side===-1&&gear.shield){
   const points=[[-.445,1.12,-.17],[-.445,1.14,.23],[-.445,.89,.31],[-.445,.51,.06],[-.445,.89,-.22]],center=[-.51,.88,.055];for(let i=0;i<5;i++)surface3(r,[arm(points[i]),arm(points[(i+1)%5]),arm(center)],metal);part(-.52,.88,.055,.05,.14,.14,'#c4ab73',arm);
  }
  if(side===1&&gear.weapon){const id=gear.weapon;
   if(id==='oakStaff'){limb3(r,.34,1.03,.055,.055,1.58,.055,'#735538',arm);part(.34,1.84,.055,.16,.2,.16,'#91bfc8',arm);}
   else if(id==='shortbow'){
    const points=Array.from({length:9},(_,i)=>{const a=-1.3+i/8*2.6;return [.34,.79+Math.sin(a)*.5,.01+Math.cos(a)*.22];});for(let i=0;i<8;i++){const a=points[i],b=points[i+1];surface3(r,[arm([a[0]-.025,a[1],a[2]]),arm([a[0]+.025,a[1],a[2]]),arm([b[0]+.025,b[1],b[2]]),arm([b[0]-.025,b[1],b[2]])],'#b39161');}limb3(r,.34,.79,.065,.009,.96,.009,'#d9cfac',arm);
   }else{limb3(r,.34,.75,.04,.065,.22,.065,leather,arm);part(.34,.9,.04,.26,.055,.075,'#bca575',arm);const blade=id==='bronzeSword'?'#ceb58f':metal;surface3(r,[[.285,.93,.04],[.34,1.73,.04],[.34,.94,.071]].map(arm),blade);surface3(r,[[.34,.94,.071],[.34,1.73,.04],[.395,.93,.04]].map(arm),shade3(blade,1.18));}
  }
 }
}
function creature3(r,o,x,z){const kind=o.kind,walk=Math.hypot(o.drawX-o.x,o.drawY-o.y)>.02?time*9:0;
 if(['wolf','ridgewolf','rat'].includes(kind)){const rat=kind==='rat',k=rat?.58:1,col=rat?'#807369':kind==='ridgewolf'?'#a9b4b6':'#707e83';oval3(r,x,.48*k,z,.44*k,.48*k,.95*k,col);oval3(r,x,.7*k,z+.42*k,.35*k,.37*k,.38*k,col);oval3(r,x,.64*k,z+.64*k,.2*k,.16*k,.3*k,'#44464b');for(const side of [-1,1])cone3(r,x+side*.12*k,.81*k,z+.36*k,.08*k,.19*k,col,5);for(const a of [-1,1])for(const b of [-1,1])limb3(r,x+a*.16*k,.19*k,z+b*.29*k,.105*k,.38*k,.13*k,col);return .95*k;}
 if(kind==='slime'){oval3(r,x,.29,z,.87,.6,.76,'#77a987');oval3(r,x-.13,.39,z+.32,.07,.08,.03,'#293f3b');oval3(r,x+.13,.39,z+.32,.07,.08,.03,'#293f3b');return .75;}
 if(o.type==='spirit'){cone3(r,x,.45+Math.sin(time*3)*.08,z,.24,.52,['#db9764','#83baca','#d7c379','#a0b98a'][o.sprite%4]);return 1.3;}
 const enemy=fighter(o),gear=enemy?{body:kind==='skeleton'?null:'leatherArmor',weapon:'ironSword',_kind:kind,_race:kind==='goblin'?'goblin':'human',_bones:kind==='skeleton',_skin:kind==='skeleton'?'#d3d1b5':kind==='goblin'?'#789568':null}:{};
 humanoid3(r,x,z,(o.sprite||0)%4,gear,Math.atan2(px-x,py-z),walk,Math.max(0,Math.sin(Math.min(1,(time-(o.attackAt||-9))/.4)*Math.PI)),kind==='warden'||o.type==='boss'?1.35:1);return o.type==='boss'?2.6:2;
}
function prop3(r,o,x,z){
 if(o.type==='tree'){
  const seed=(o.id||1)*1.73,pine=o.name?.includes('Pine');limb3(r,x,.9,z,.28,1.8,.3,'#705443');
  for(let i=0;i<4;i++){const a=seed+i*2.4;limb3(r,x+Math.cos(a)*.18,1.32+i*.12,z+Math.sin(a)*.18,.16,.7,.16,'#705443');}
  if(pine){for(let i=0;i<4;i++)profile3(r,x,1.15+i*.4,z,1.55-i*.27,.85,1.45-i*.25,[[-.5,.8],[-.34,1],[.5,.04]],i%2?'#537660':'#426950',a=>a,10);}
  else{for(let i=0;i<5;i++){const a=seed+i*2.4,rad=i===4?0:.48;oval3(r,x+Math.cos(a)*rad,1.92+(i===4?.52:Math.sin(a)*.12),z+Math.sin(a)*rad,1.2,1.15,1.16,['#4b7357','#5d805d','#668961','#527754','#719265'][i]);}}return 3;
 }
 if(o.type==='ore'){oval3(r,x,.24,z,.83,.5,.7,'#828f90',a=>a,7);oval3(r,x-.22,.33,z-.12,.45,.47,.41,'#a3aeab',a=>a,6);return .8;}
 if(o.type==='camp'){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;oval3(r,x+Math.cos(a)*.3,.08,z+Math.sin(a)*.3,.18,.15,.18,'#7c8176',a=>a,6);}limb3(r,x,.13,z,.5,.15,.14,'#6e513c');cone3(r,x,.15,z,.17,.5+Math.sin(time*12)*.06,'#e9ad6b',8);return 1;}
 if(o.type==='crop'){for(const a of [-.2,0,.2])oval3(r,x+a,.13,z,.25,o.harvestedUntil>time?.07:.3,.37,'#849665',a=>a,6);return .6;}
 if(o.type==='fish')return .1;
 if(o.type==='door'||o.type==='exit'){box3(r,x,.025,z,.8,.05,.55,'#b3a789');return .1;}
 if(o.type==='forge'){profile3(r,x,.28,z,.56,.56,.4,[[-.5,1],[-.2,.55],[.3,.52],[.5,1]],'#6b7e83');box3(r,x,.61,z,.76,.13,.35,'#94a0a0');return .8;}
 if(o.type==='cache'){box3(r,x,.22,z,.55,.4,.4,'#826947');oval3(r,x,.45,z,.56,.28,.41,'#a08658');return .7;}
 profile3(r,x,.35,z,.53,.7,.53,[[-.5,.8],[-.35,.95],[0,1],[.35,.95],[.5,.8]],'#8d7452',a=>a,10);for(const y of [.12,.56])profile3(r,x,y,z,.51,.045,.51,[[-.5,1],[.5,1]],'#576665',a=>a,10);return .8;
}
function arch3(r,x,z,width,depth=1,height=1.35){
 const inner=width/2-.6,outer=inner+.38,col='#a7aa9b';
 for(const side of [-1,1]){box3(r,x+side*(inner+.19),height/2,z,.38,height,depth,col);box3(r,x+side*(inner+.19),.15,z,.55,.3,depth+.15,'#828d87');}
 for(let i=0;i<12;i++){const a=i/12*Math.PI,b=(i+1)/12*Math.PI,ring=(rad,t,zz)=>[x+Math.cos(t)*rad,height+Math.sin(t)*rad,zz];
 const fa=[ring(inner,a,z+depth/2),ring(outer,a,z+depth/2),ring(outer,b,z+depth/2),ring(inner,b,z+depth/2)],ba=fa.map(p=>[p[0],p[1],z-depth/2]);r.face(fa,shade3(col,i%2?1:.93));r.face([...ba].reverse(),shade3(col,.77));r.face([fa[0],ba[0],ba[3],fa[3]],'#727d78');r.face([fa[1],fa[2],ba[2],ba[1]],'#bcc0ac');}
}
function bridge3(r,startY){const x=37.5,z=startY+1.5;
 for(let i=0;i<14;i++)box3(r,36+(i+.5)*3/14,.08,z,3/14-.013,.14,2.72,i%2?'#a58c64':'#9b805b');
 for(const side of [-1,1]){box3(r,x,.54,z+side*1.38,3.4,.1,.1,'#675941');box3(r,x,.3,z+side*1.38,3.4,.06,.07,'#7c684a');for(const xx of [35.95,37.5,39.05]){box3(r,xx,.34,z+side*1.38,.14,.66,.14,'#655740');oval3(r,xx,.06,z+side*1.38,.42,.2,.38,'#879185',a=>a,6);}}
}
function building3(r,b){if(b.arch){arch3(r,b.x+b.w/2,b.y+b.h/2,b.w,b.h,1.3);return;}if(/Mine|Crypt|ruins/.test(b.name)){arch3(r,b.x+b.w/2,b.y+b.h-.3,b.w,.75,1.4);for(const side of [-1,1])oval3(r,b.x+b.w/2+side*b.w*.43,1.05,b.y+b.h/2,.8,2.1,b.h,'#79887f',a=>a,7);return;}if(/beacon/.test(b.name)){profile3(r,b.x+b.w/2,1.6,b.y+b.h/2,1.75,3.2,1.75,[[-.5,1.1],[-.4,1],[.42,.8],[.5,.95]],'#a5aa97',a=>a,12);cone3(r,b.x+b.w/2,3.2,b.y+b.h/2,.46,.9,'#dca75c',8);return;}const x=b.x+b.w/2,z=b.y+b.h/2,w=b.w,d=b.h,h=1.8,roof=b.sprite===0?'#885b48':b.sprite===2?'#566f68':'#666d78';box3(r,x,h/2,z,w,h,d,'#acaa8c');for(const a of [-1,1])for(const c of [-1,1])box3(r,x+a*(w/2-.09),h/2,z+c*(d/2-.09),.16,h,.16,'#5b5041');
 const a=[x-w/2-.18,h,z-d/2-.18],bb=[x+w/2+.18,h,z-d/2-.18],c=[x+w/2+.18,h,z+d/2+.18],dd=[x-w/2-.18,h,z+d/2+.18],e=[x,h+1.2,z-d/2-.18],f=[x,h+1.2,z+d/2+.18];r.face([a,dd,f,e],shade3(roof,.85));r.face([bb,e,f,c],shade3(roof,1.1));r.face([a,e,bb],'#8c938b');r.face([dd,c,f],'#9ba291');box3(r,x,.65,z+d/2+.02,.6,1.3,.06,'#544b40');
 // Timber gable bracing and inset loft window give each roof a readable facade.
 for(const side of [-1,1]){const end=x+side*w*.43; r.face([[x-.04,2.89,z+d/2+.03],[x+.04,2.89,z+d/2+.03],[end+.04,1.85,z+d/2+.03],[end-.04,1.85,z+d/2+.03]],'#63523e');}
 r.face([[x-.17,2.24,z+d/2+.045],[x,2.46,z+d/2+.045],[x+.17,2.24,z+d/2+.045],[x,2.04,z+d/2+.045]],'#3e555a');
 box3(r,x,.65,z+d/2+.065,.028,1.26,.025,'#9a8054');oval3(r,x+.19,.64,z+d/2+.078,.035,.06,.025,'#d7b868',a=>a,6);

 for(const side of [-1,1]){for(let i=1;i<5;i++){const f=i/5,xx=x+side*(w/2+.18)*f,yy=h+1.2*(1-f);box3(r,xx,yy+.025,z,.045,.035,d+.37,'#526571');}limb3(r,x+side*.36,.66,z+d/2+.075,.08,1.4,.08,'#78634c');}
 for(let i=0;i<Math.ceil(w);i++)oval3(r,x-w/2+(i+.5)*w/Math.ceil(w),.16,z+d/2+.02,w/Math.ceil(w)*.98,.3,.17,'#92988a',a=>a,6);
 box3(r,x,.47,z+d/2+.06,w,.07,.06,'#736551');box3(r,x,1.57,z+d/2+.04,w,.08,.07,'#736551');box3(r,x-w*.28,2.25,z-d*.22,.36,1.1,.36,'#979c8d');for(const side of [-1,1]){const wx=x+side*w*.3;box3(r,wx,1.07,z+d/2+.04,.45,.48,.07,'#536b71');box3(r,wx,1.07,z+d/2+.085,.035,.49,.035,'#a18b69');box3(r,wx,1.07,z+d/2+.085,.45,.035,.035,'#a18b69');box3(r,wx,.79,z+d/2+.08,.59,.085,.17,'#8b8065');}
 for(const step of [0,1])box3(r,x,.065+step*.06,z+d/2+.45-step*.18,.9,.12,.34,'#a8ac9a');
 for(const side of [-1,1])for(const offset of [-.24,.24]){box3(r,x+side*(w/2+.025),1.08,z+offset*d,.065,.58,.49,'#576d72');box3(r,x+side*(w/2+.07),1.08,z+offset*d,.035,.58,.04,'#aa9471');}
}

function drawWorldMood3(){
 const hours=(s.worldClock/480*24+4)%24,night=(hours>=20||hours<5)?1:hours>=17?(hours-17)/3:hours<8?(8-hours)/3:0;
 const dark=!inWorld()?(currentScene==='dungeon'?.35:currentScene==='mine'?.22:.08):night*.29;
 if(!realmGPU){ctx.fillStyle='rgba(7,15,40,'+dark+')';ctx.fillRect(0,0,screen.w,screen.h);}
 $('worldClock').textContent=(hours<5||hours>=20?'Night':hours<8?'Dawn':hours>=17?'Dusk':'Day')+' '+String(Math.floor(hours)).padStart(2,'0')+':'+String(Math.floor(hours%1*60)).padStart(2,'0');
}
function drawRoadDetails3(minx,maxx,minz,maxz){
 const road=painter3(ctx,project3);for(let z=minz;z<=maxz;z++)for(let x=minx;x<=maxx;x++){const t=terrainType(x,z);if(t!==1&&t!==2)continue;if(inWorld()&&x>=36&&x<=38&&((z>=16&&z<=18)||(z>=34&&z<=36)))continue;
 if(t===2){for(let i=0;i<2;i++){const xx=x+.12+i*.43,zz=z+.13+((x+z+i)%2)*.39;road.face([[xx,.009,zz],[xx+.34,.009,zz-.03],[xx+.37,.009,zz+.25],[xx+.04,.009,zz+.3]],'#969e90');}}
 else if((x*3+z)%5===0)road.face([[x+.23,.009,z+.31],[x+.48,.009,z+.27],[x+.54,.009,z+.4],[x+.32,.009,z+.46]],'#aca180');
 }road.flush();
}
function draw3d(){meshDetail3=view3d.zoom<24?.5:view3d.zoom<36?.75:1;const w=screen.w,h=screen.h;ctx.clearRect(0,0,w,h);ctx.fillStyle='#243b40';ctx.fillRect(0,0,w,h);const r=painter3(ctx,project3),corners=[[0,0],[w,0],[w,h],[0,h]].map(p=>unproject3(...p)),[mw,mh]=sceneSize();
 const minx=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))-4),maxx=Math.min(mw-1,Math.ceil(Math.max(...corners.map(p=>p.x)))+4),minz=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.z)))-4),maxz=Math.min(mh-1,Math.ceil(Math.max(...corners.map(p=>p.z)))+4);
 if(!realmGPU)drawTerrainLayer3();
 for(const o of objects){if(o.dead>time||view3d.zoom<24)continue;const q=project3(o.x,0,o.y);if(q.x< -90||q.x>w+90||q.y< -90||q.y>h+90)continue;groundShadow3(ctx,o.x+.5,o.y+.5,o.type==='tree'?.84:.32,o.type==='tree'?.6:.24,o.type==='tree'?.12:.16);}
 const mesh=painter3(ctx,project3),labels=[];hitboxes=[];if(!inWorld()){for(let z=minz;z<=maxz;z++)for(let x=minx;x<=maxx;x++)if(worldWall(x,z)){if(typeof drawRealmWall==='function')drawRealmWall(mesh,x,z);else box3(mesh,x+.5,.65,z+.5,1,1.3,1,'#62716e');}}if(inWorld()){for(const by of [48,102]){const bp=project3(112.5,0,by+4.5);if(bp.x>-160&&bp.x<w+160&&bp.y>-120&&bp.y<h+150)bridge3(mesh,by);}}
 if(inWorld()&&typeof drawRealmCrossings==='function')drawRealmCrossings(mesh);
 const near=(x,z)=>{if(x<minx-3||x>maxx+3||z<minz-3||z>maxz+3)return false;const q=project3(x,1,z);return q.x>-130&&q.x<w+130&&q.y>-160&&q.y<h+140;};
 const hit=(o,x,z,height,width=.65)=>{const a=project3(x,0,z),b=project3(x,height,z);hitboxes.push({x:a.x-width*view3d.zoom/2,y:Math.min(a.y,b.y)-8,w:width*view3d.zoom,h:Math.abs(a.y-b.y)+16,o,depth:a.depth});};
 for(const b of buildings){b._cutaway=!!b.walkIn&&px+.5>b.x&&px+.5<b.x+b.w&&py+.5>b.y&&py+.5<b.y+b.h+1;const center=project3(b.x+b.w/2,(b.visualHeight||3.3)/2,b.y+b.h/2),radius=(Math.hypot(b.w,b.h)+(b.visualHeight||3.3))*view3d.zoom*.6;if(center.x< -radius||center.x>w+radius||center.y< -radius||center.y>h+radius)continue;const cached=cachedMesh3(b,'building',r=>building3(r,b));emitMesh3(mesh,cached);if(b.service&&!b._cutaway){const polygon=buildingHull3(cached);hitboxes.push({polygon,o:b.service,building:b,depth:project3(b.x+b.w/2,0,b.y+b.h/2).depth});}if(Math.hypot(px-b.x,py-b.y)<10)labels.push([b.name,b.x+b.w/2,(b.visualHeight||3.3)+.15,b.y+b.h/2,'#e8d9b0']);}
 for(const o of objects){if(o.dead>time||(o.type==='boss'&&s.boss)||!near(o.x,o.y))continue;const x=(o.drawX??o.x)+.5,z=(o.drawY??o.y)+.5,living=fighter(o)||o.characterSprite||['elder','shop','questgiver','spirit','villager','inn'].includes(o.type),height=living?creature3(mesh,o,x,z):['camp','crop','spirit'].includes(o.type)?prop3(mesh,o,x,z):emitMesh3(mesh,cachedMesh3(o,'prop',r=>prop3(r,o,x,z))); hit(o,x,z,height,o.type==='tree'?1.1:.7);if(['elder','questgiver'].includes(o.type))labels.push(['!',x,height+.3,z,'#ffdb8d']);if(target===o)labels.push([o.name,x,height+.35,z,'#ffe0bb',o]);}
 const moving=Math.hypot(s.x-px,s.y-py)>.01;if(moving)playerHeading=Math.atan2(s.x-px,s.y-py);else if(target)playerHeading=Math.atan2(target.x-px,target.y-py);
 const worldDetail=meshDetail3;meshDetail3=1;humanoid3(mesh,px+.5,py+.5,s.character?.look||0,s.equipment,playerHeading,moving?time*10:0,Math.max(0,Math.sin(Math.min(1,(time-lastAttack)/.42)*Math.PI)));meshDetail3=worldDetail;
 for(const pile of s.groundLoot||[])if(pile.scene===currentScene&&near(pile.x,pile.y)){box3(mesh,pile.x+.5,.1,pile.y+.5,.3,.2,.26,'#d7b66b');hit(pile,pile.x+.5,pile.y+.5,.35,.7);if(Math.hypot(px-pile.x,py-pile.y)<4)labels.push([groundItemLabel(pile),pile.x+.5,.55,pile.y+.5,'#f4daa0']);}
 if(typeof drawOnlinePlayers==='function')drawOnlinePlayers(mesh,labels);mesh.flush();
 if(path.length){ctx.beginPath();for(const [i,p]of [[px,py],...path].entries()){const q=project3(p[0]+.5,.035,p[1]+.5);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);}ctx.strokeStyle='#e9dba6';ctx.lineWidth=2;ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);}
 groundShadow3(ctx,px+.5,py+.5,.38,.27,.23);ring3(ctx,px+.5,py+.5,'#e4d6a2',.33);if(target)ring3(ctx,target.x+.5,target.y+.5,fighter(target)?'#e79580':'#e4d6a2');
 const tp=inWorld()&&s.character&&s.tutorial<14?tutorialSteps[s.tutorial].point():null;if(tp)ring3(ctx,tp.x+.5,tp.y+.5,'#f3d280',.58);

 drawWorldMood3();hitboxes.sort((a,b)=>a.depth-b.depth);
 labels.push([s.character?.name||'Adventurer',px+.5,2.15,py+.5,'#ffedbd']);for(const [text,x,y,z,color,o]of labels){const p=project3(x,y,z);label(text,p.x,p.y,color,11);if(o&&fighter(o)){ctx.fillStyle='#202e32';ctx.fillRect(p.x-22,p.y-14,44,5);ctx.fillStyle='#cc776c';ctx.fillRect(p.x-22,p.y-14,44*Math.max(0,o.hp/o.maxhp),5);}}
 for(const p of projectiles){const t=Math.min(1,p.age/p.duration),q=project3(p.x+(p.tx-p.x)*t+.5,1+Math.sin(t*Math.PI)*.3,p.y+(p.ty-p.y)*t+.5);ctx.fillStyle=p.color||'#e3c382';ctx.beginPath();ctx.arc(q.x,q.y,p.style==='ranged'?3:5,0,Math.PI*2);ctx.fill();}
 if(spiritEffect)ring3(ctx,spiritEffect.x+.5,spiritEffect.y+.5,'#bce4d5',.6+spiritEffect.age);
 for(const f of floaters){const p=project3(f.x+.5,2+(1.4-f.life)*.8,f.y+.5);label(f.text,p.x,p.y,f.color,14);}
 const region=regionInfo()||['Briarhaven','The Border Realms'];$('region').textContent=region[0];$('regionSub').textContent=region[1];drawMinimap();
}
// Creation, equipment previews and gameplay share precisely the same fitted model.
drawEquippedCharacter=function(g,x,bottom,look,moving=false,age=10,scale=1){const prevDetail=meshDetail3;meshDetail3=1;const v={yaw:-.45,tilt:.35,zoom:29*scale},proj=(a,b,c)=>project3(a,b,c,v,0,0,0,0),r=painter3(g,(a,b,c)=>{const p=proj(a,b,c);return {...p,x:p.x+x,y:p.y+bottom};});humanoid3(r,0,0,look,s.equipment,0,moving?time*10:0,Math.max(0,Math.sin(Math.min(1,age/.42)*Math.PI)));r.flush();meshDetail3=prevDetail;};
draw=draw3d;
function buildingHull3(cached){
 const key=[view3d.yaw,view3d.tilt,view3d.zoom].join(':');if(cached.hullKey!==key){
 const points=cached.faces.flatMap(f=>f.points.map(p=>project3(...p,view3d,0,0,0,0))).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lower=[],upper=[];
 for(const p of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}lower.pop();upper.pop();cached.hull=lower.concat(upper);cached.hullKey=key;
 }const offset=project3(0,0,0);return cached.hull.map(p=>({x:p.x+offset.x,y:p.y+offset.y}));
}
function pointInHull3(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function openBuilding3(b){if(!b.service?.destination){toast(b.name);return;}dialog(b.name,'<p>Enter this building?</p>',[['Enter',()=>{close();engage(b.service);}],['Cancel',close]]);}
function clickWorld3(e){if(!assetsReady||$('creator').open||$('modal').open||$('spiritsDialog').open)return;const b=canvas.getBoundingClientRect(),sx=e.clientX-b.left,sy=e.clientY-b.top,p=unproject3(sx,sy),x=Math.floor(p.x),y=Math.floor(p.z);const hit=[...hitboxes].reverse().find(b=>b.polygon?pointInHull3(sx,sy,b.polygon):sx>=b.x&&sx<=b.x+b.w&&sy>=b.y&&sy<=b.y+b.h);if(hit){if(hit.building)openBuilding3(hit.building);else select(hit.o);return;}const pile=(s.groundLoot||[]).find(p=>p.scene===currentScene&&p.x===x&&p.y===y);if(pile){select(pile);return;}walkTo(x,y);}
const cameraPointers=new Map();let gestureMoved=false,pinchStart=null;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button});if(cameraPointers.size===1)gestureMoved=false;if(cameraPointers.size===2){const [a,b]=[...cameraPointers.values()];pinchStart={distance:Math.hypot(a.x-b.x,a.y-b.y),angle:Math.atan2(b.y-a.y,b.x-a.x),yaw:view3d.yaw,zoom:view3d.zoom,tilt:view3d.tilt,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};gestureMoved=true;}});
canvas.addEventListener('pointermove',e=>{const p=cameraPointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.startX,p.y-p.startY)>7)gestureMoved=true;if(cameraPointers.size===2&&pinchStart){const [a,b]=[...cameraPointers.values()];view3d.zoom=Math.max(14,Math.min(65,pinchStart.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinchStart.distance)));view3d.yaw=pinchStart.yaw+Math.atan2(b.y-a.y,b.x-a.x)-pinchStart.angle+((a.x+b.x)/2-pinchStart.cx)*.007;view3d.tilt=Math.max(.5,Math.min(1.2,pinchStart.tilt+((a.y+b.y)/2-pinchStart.cy)*.004));}else if(gestureMoved&&(e.pointerType==='mouse'||e.pointerType==='pen')){view3d.yaw+=dx*.009;view3d.tilt=Math.max(.5,Math.min(1.2,view3d.tilt+dy*.005));}});
canvas.addEventListener('pointerup',e=>{const p=cameraPointers.get(e.pointerId);if(!p)return;cameraPointers.delete(e.pointerId);if(!gestureMoved&&p.button===0)clickWorld3(e);pinchStart=null;rememberView();});
canvas.addEventListener('pointercancel',e=>{cameraPointers.delete(e.pointerId);gestureMoved=true;pinchStart=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();view3d.zoom=Math.max(14,Math.min(65,view3d.zoom*Math.exp(-e.deltaY*.001)));rememberView();},{passive:false});
$('cameraLeft').onclick=()=>{view3d.yaw-=Math.PI/8;rememberView();};$('cameraRight').onclick=()=>{view3d.yaw+=Math.PI/8;rememberView();};$('zoomOut').onclick=()=>{view3d.zoom=Math.max(14,view3d.zoom/1.2);rememberView();};$('zoomIn').onclick=()=>{view3d.zoom=Math.min(65,view3d.zoom*1.2);rememberView();};$('cameraReset').onclick=()=>{Object.assign(view3d,{yaw:-.55,tilt:.85,zoom:34});rememberView();};
