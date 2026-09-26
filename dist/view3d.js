'use strict';
// Perspective world camera: the player sits low in frame so roads, hills and
// landmarks read as a place ahead instead of a flat board viewed from above.
const cameraDefault3={yaw:-2.05,tilt:.27,zoom:118},cameraAnchor3=.82,cameraFov3=54;
const view3d={...cameraDefault3,min:58,max:132};
try{const v=JSON.parse(localStorage.getItem('veldren-camera-v6'));if(v){view3d.yaw=Number(v.yaw)||cameraDefault3.yaw;view3d.tilt=Math.max(.22,Math.min(.70,Number(v.tilt)||cameraDefault3.tilt));view3d.zoom=Math.max(view3d.min,Math.min(view3d.max,Number(v.zoom)||cameraDefault3.zoom));}}catch{}
function syncCameraZoom(){const percent=Math.round((view3d.max-view3d.zoom)/(view3d.max-view3d.min)*100),slider=$('cameraZoom'),label=$('cameraZoomValue');if(slider){slider.value=String(percent);slider.setAttribute('aria-valuetext',percent+' percent zoomed out');}if(label)label.textContent=percent+'%';}
function rememberView(){syncCameraZoom();try{localStorage.setItem('veldren-camera-v6',JSON.stringify(view3d));}catch{}}
// Camera angle changes only through the player's camera controls.
function cameraPitch3(){return view3d.tilt;}
function cameraZoom3(v=view3d){return v.zoom*(v===view3d?Math.max(1,screen.h/640):1);}
function cameraFocalLength3(h=screen.h){return (h||500)/(2*Math.tan(cameraFov3*Math.PI/360));}
function cameraDistance3(v=view3d,h=screen.h){return cameraFocalLength3(h)/cameraZoom3(v);}
function project3(x,y,z,v=view3d,cx=px+.5,cz=py+.5,w=screen.w,h=screen.h){const dx=x-cx,dz=z-cz,c=Math.cos(v.yaw),s=Math.sin(v.yaw),u=dx*c-dz*s,d=dx*s+dz*c,pitch=v===view3d?cameraPitch3():v.tilt,anchor=v===view3d?cameraAnchor3:.54;if(v!==view3d)return {x:w/2+u*cameraZoom3(v),y:h*anchor+(d*Math.sin(pitch)-y*Math.cos(pitch))*cameraZoom3(v),depth:d*Math.cos(pitch)+y*Math.sin(pitch)};w=w||900;h=h||500;const depth=d*Math.cos(pitch)+y*Math.sin(pitch),focal=cameraFocalLength3(h),distance=cameraDistance3(v,h),scale=focal/Math.max(.35,distance-depth);return {x:w/2+u*scale,y:h*anchor+(d*Math.sin(pitch)-y*Math.cos(pitch))*scale,depth};}
function unproject3(sx,sy){const p=cameraPitch3(),c=Math.cos(view3d.yaw),s=Math.sin(view3d.yaw),sw=screen.w||900,sh=screen.h||500,f=cameraFocalLength3(sh),distance=cameraDistance3(view3d,sh),qx=(sx-sw/2)/f,qy=(sy-sh*cameraAnchor3)/f,dy=-Math.sin(p)-qy*Math.cos(p),t=Math.abs(dy)>.0001?Math.sin(p)*distance/-dy:distance;return {x:px+.5+Math.sin(view3d.yaw)*Math.cos(p)*distance+t*(-Math.sin(view3d.yaw)*Math.cos(p)+qx*c+qy*s*Math.sin(p)),z:py+.5+Math.cos(view3d.yaw)*Math.cos(p)*distance+t*(-Math.cos(view3d.yaw)*Math.cos(p)-qx*s+qy*c*Math.sin(p))};}
function boundedViewPoint3(sx,sy,max=72){const p=unproject3(sx,sy),dx=p.x-px-.5,dz=p.z-py-.5,d=Math.hypot(dx,dz);return d>max?{x:px+.5+dx/d*max,z:py+.5+dz/d*max}:p;}
function shade3(hex,f){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*f))).toString(16).padStart(2,'0')).join('');}
let meshDetail3=1;
let meshFrame3=0;
const staticMeshes3=new WeakMap(),terrainLayers3=new Map();
const staticMeshQueues3={building:new Map(),prop:new Map()};
function cachedMesh3(key,kind,build){
 const queue=staticMeshQueues3[kind==='building'?'building':'prop'];queue.delete(key);queue.set(key,meshFrame3);
 let variants=staticMeshes3.get(key);if(!variants){variants=new Map();staticMeshes3.set(key,variants);}
 const tag=kind+':'+meshDetail3+':'+(key._cutaway?'ground-floor':'closed');
 if(!variants.has(tag)){const faces=[],instances=[],collector={face:(points,color,normals,material,colors,uvs)=>faces.push({points,color,normals,material,colors,uvs})};collector.indexed=(mesh,matrix)=>instances.push({mesh,matrix});const height=build(collector);variants.set(tag,{faces,instances,height,kind});}return variants.get(tag);
}
function trimStaticMeshes3(){for(const [kind,queue]of Object.entries(staticMeshQueues3)){const limit=kind==='building'?80:480;for(const [key,used]of queue){if(queue.size<=limit)break;if(used===meshFrame3)continue;queue.delete(key);const discarded=staticMeshes3.get(key);if(realmGPU&&discarded)for(const mesh of discarded.values()){const entry=realmGPU.cache.get(mesh);if(entry){realmGPU.gl.deleteBuffer(entry.buffer);realmGPU.cache.delete(mesh);}}staticMeshes3.delete(key);}}}
function emitMesh3(r,cached){if(r.cached)return r.cached(cached);if(cached.kind==='assembly'){for(const i of cached.instances||[])briarEmit(r,i.mesh,affineMultiply(cached.model,i.matrix));for(const f of cached.faces)r.face(f.points.map(p=>briarPoint(p,0,cached.model)),f.color,f.normals,f.material,f.colors,f.uvs);return cached.height;}for(const instance of cached.instances||[])briarEmit(r,instance.mesh,instance.matrix);for(const f of cached.faces)r.face(f.points,f.color,f.normals,f.material,f.colors,f.uvs);return cached.height;}
function painter3(g,project){const faces=[],fast=project===project3,sw=screen.w,sh=screen.h;
 return {face(points,color){const p=[];let depth=0,minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
 for(const a of points){const q=project(...a);p.push(q);depth+=q.depth;minx=Math.min(minx,q.x);maxx=Math.max(maxx,q.x);miny=Math.min(miny,q.y);maxy=Math.max(maxy,q.y);}
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
 const c=Math.cos(view3d.yaw),sn=Math.sin(view3d.yaw),st=Math.sin(cameraPitch3()),k=cameraZoom3()/unit,origin=project3(0,0,0);
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
function ring3(g,x,z,color,r=.4,y=.035){g.beginPath();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,p=project3(x+Math.cos(a)*r,y+(typeof walkSurfaceHeight==='function'?walkSurfaceHeight(x,z)-landHeight(x,z):0),z+Math.sin(a)*r);if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);}g.strokeStyle=color;g.lineWidth=2;g.stroke();}
let playerHeading=cameraDefault3.yaw+Math.PI;
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
// One appearance definition is shared by world characters and dialogue portraits.
function npcLook(o){return Math.abs(Number(o.look??o.sprite)||0)%4;}
function npcAppearance(o){
 const role=o.tutor||o.appearanceRole;
 const styles={guide:[5,4,5,5,2,3,1],woods:[5,3,2,7,2,1,2],fishing:[4,4,0,7,1,1,1],cooking:[4,3,6,7,0,0,2],mining:[4,4,7,5,2,2,3],combat:[5,4,5,5,2,0,2],bank:[4,3,3,5,1,2,1],worship:[4,4,6,2,0,3,2],magic:[5,3,3,5,1,3,1]};
 let seed=2166136261;for(const c of String(role||o.id||o.name||'resident'))seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const preset=styles[role],pick=n=>Math.floor(seed/n),frame=role?(['fishing','bank','worship','magic'].includes(role)?'female':'male'):o.frame||(o.kind==='man'||o.type==='man'||o.civilianModel?'male':npcLook(o)%3===2?'female':'male');
 const [topStyle,bottomStyle,topColor,bottomColor,hair,hairColor,skin]=preset||[4+seed%2,3+pick(2)%2,seed%8,pick(8)%8,pick(64)%5,pick(320)%6,pick(1920)%5];
 return {race:o.race||'human',frame,look:npcLook(o),topStyle,bottomStyle,topColor,bottomColor,hair,hairColor,skin,beard:frame==='male'?(role==='guide'?1:pick(9600)%3):0};
}
function npcEquipment(o){
 const role=o.tutor||o.appearanceRole,appearance=npcAppearance(o),gear={_appearance:appearance,_frame:appearance.frame,_race:appearance.race,_castAt:o._castAt,_castDuration:o._castDuration,_castColor:o._castColor};
 if(role){
  if(role==='guide')Object.assign(gear,{head:'rangerHood',_hoodColor:5});
  if(role==='combat')Object.assign(gear,{body:'mithril_body',legs:'mithril_legs',hands:'mithril_hands',feet:'mithril_feet',shield:'mithril_shield',weapon:'mithril_weapon',head:null});
  if(role==='magic')gear.weapon='oakStaff';
  return gear;
 }
 const duty=/\b(guard|captain|knight|soldier|sentinel)\b/i.test(o.name||'');
 if(duty)return {...gear,body:'iron_body',head:'iron_head',weapon:'ironSword',shield:'ironShield'};
 if(o.civilianModel||o.type==='man'||o.type==='villager'||o.characterSprite||!fighter(o))return gear;
 const kind=o.kind;
 if(['bandit','warden','sentinel'].includes(kind))return {...gear,weapon:'ironSword'};
 return {body:kind==='skeleton'?null:'leatherArmor',weapon:'ironSword',_kind:kind,_race:kind==='goblin'?'goblin':o.race||'human',_bones:kind==='skeleton',_skin:kind==='skeleton'?'#d3d1b5':kind==='goblin'?'#789568':null};
}
function creature3(r,o,x,z){const kind=o.kind,walk=Math.hypot(o.drawX-o.x,o.drawY-o.y)>.02?time*(o.type==='man'||o.type==='villager'?3.8:6):0;
 if(['wolf','ridgewolf','rat'].includes(kind)){const rat=kind==='rat',k=rat?.58:1,col=rat?'#807369':kind==='ridgewolf'?'#a9b4b6':'#707e83';oval3(r,x,.48*k,z,.44*k,.48*k,.95*k,col);oval3(r,x,.7*k,z+.42*k,.35*k,.37*k,.38*k,col);oval3(r,x,.64*k,z+.64*k,.2*k,.16*k,.3*k,'#44464b');for(const side of [-1,1])cone3(r,x+side*.12*k,.81*k,z+.36*k,.08*k,.19*k,col,5);for(const a of [-1,1])for(const b of [-1,1])limb3(r,x+a*.16*k,.19*k,z+b*.29*k,.105*k,.38*k,.13*k,col);return .95*k;}
 if(kind==='slime'){oval3(r,x,.29,z,.87,.6,.76,'#77a987');oval3(r,x-.13,.39,z+.32,.07,.08,.03,'#293f3b');oval3(r,x+.13,.39,z+.32,.07,.08,.03,'#293f3b');return .75;}
 if(o.type==='spirit')return 0;
 const gear=npcEquipment(o),heading=walk?Math.atan2(o.x-(o.drawX??o.x),o.y-(o.drawY??o.y)):target===o?Math.atan2(px-x,py-z):(o.id||0)*2.399;
 gear._attackAt=o.attackAt;humanoid3(r,x,z,npcLook(o),gear,heading,walk,Math.max(0,Math.sin(Math.min(1,(time-(o.attackAt||-9))/.4)*Math.PI)),kind==='warden'||o.type==='boss'?1.35:1);return o.type==='boss'?2.6:2;
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
 const hours=worldHour(),night=(hours>=20||hours<5)?1:hours>=17?(hours-17)/3:hours<8?(8-hours)/3:0;
 const dark=!inWorld()?(currentScene==='dungeon'?.35:currentScene==='mine'?.22:.08):night*.29;
 if(!realmGPU){ctx.fillStyle='rgba(7,15,40,'+dark+')';ctx.fillRect(0,0,screen.w,screen.h);}
}
function realmVisibilityBudget3(){const agent=typeof navigator==='undefined'?'':navigator.userAgent||'',mobile=window.matchMedia?.('(pointer: coarse)')?.matches===true||/iPhone|iPad|iPod|Android/i.test(agent);if(mobile)return {tiles:7,pixels:160};return view3d.zoom<24?{tiles:14,pixels:420}:{tiles:30,pixels:620};}
function realmGeometryDetail3(){const agent=typeof navigator==='undefined'?'':navigator.userAgent||'',mobile=window.matchMedia?.('(pointer: coarse)')?.matches===true||/iPhone|iPad|iPod|Android/i.test(agent),zoom=view3d.zoom;if(zoom<74)return mobile?.55:.66;if(zoom<100)return mobile?.72:.82;return 1;}
function realmWideWorldLimit3(){return view3d.zoom<24?Math.hypot(screen.w,screen.h)/cameraZoom3()*.72+10:Infinity;}
function drawRoadDetails3(minx,maxx,minz,maxz){
 const road=painter3(ctx,project3);for(let z=minz;z<=maxz;z++)for(let x=minx;x<=maxx;x++){const t=terrainType(x,z);if(t!==1&&t!==2)continue;if(inWorld()&&x>=36&&x<=38&&((z>=16&&z<=18)||(z>=34&&z<=36)))continue;
 if(t===2){for(let i=0;i<2;i++){const xx=x+.12+i*.43,zz=z+.13+((x+z+i)%2)*.39;road.face([[xx,.009,zz],[xx+.34,.009,zz-.03],[xx+.37,.009,zz+.25],[xx+.04,.009,zz+.3]],'#969e90');}}
 else if((x*3+z)%5===0)road.face([[x+.23,.009,z+.31],[x+.48,.009,z+.27],[x+.54,.009,z+.4],[x+.32,.009,z+.46]],'#aca180');
 }road.flush();
}
let realmViewCorners=null;const basicBridgeKeys3=[{},{}];
function draw3d(){meshFrame3++;meshDetail3=realmGeometryDetail3();const w=screen.w,h=screen.h,visibility=realmVisibilityBudget3();ctx.clearRect(0,0,w,h);const r=painter3(ctx,project3);if(!realmGPU?.presented){ctx.fillStyle='#243b40';ctx.fillRect(0,0,w,h);}const corners=[[0,0],[w,0],[w,h],[0,h]].map(p=>boundedViewPoint3(...p)),[mw,mh]=sceneSize();
 realmViewCorners=corners;
 const minx=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))-visibility.tiles),maxx=Math.min(mw-1,Math.ceil(Math.max(...corners.map(p=>p.x)))+visibility.tiles),minz=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.z)))-visibility.tiles),maxz=Math.min(mh-1,Math.ceil(Math.max(...corners.map(p=>p.z)))+visibility.tiles);
 const viewObjects=worldObjectsInBounds(minx-3,maxx+3,minz-3,maxz+3);
 if(!realmGPU)drawTerrainLayer3();
 if(!realmGPU)for(const o of viewObjects){if(o.dead>time||view3d.zoom<24||Math.hypot(o.x-px,o.y-py)>Math.hypot(w,h)/cameraZoom3()+12)continue;const q=project3(o.x,0,o.y);if(q.x< -90||q.x>w+90||q.y< -90||q.y>h+90)continue;groundShadow3(ctx,o.x+.5,o.y+.5,o.type==='tree'?.84:.32,o.type==='tree'?.6:.24,o.type==='tree'?.12:.16);}
 const mesh=painter3(ctx,project3),labels=[],visibleBuildings=[],openRooms=new Set(),wideWorldLimit=realmWideWorldLimit3();hitboxes=[];if(!inWorld()){for(let z=minz;z<=maxz;z++)for(let x=minx;x<=maxx;x++)if(worldWall(x,z)){if(typeof drawRealmWall==='function')drawRealmWall(mesh,x,z);else box3(mesh,x+.5,.65,z+.5,1,1.3,1,'#62716e');}}if(inWorld()&&!globalThis.VeldrenBridgeScene?.enabled){for(const by of [48,102]){const bx=112.5,bz=by+4.5;if(Math.hypot(bx-px,bz-py)>wideWorldLimit||bx<minx-5||bx>maxx+5||bz<minz-5||bz>maxz+5)continue;const bp=project3(bx,0,bz);if(bp.x>-48&&bp.x<w+48&&bp.y>40&&bp.y<h+90)emitMesh3(mesh,cachedMesh3((typeof villageBridges==='undefined'?basicBridgeKeys3:villageBridges)[by===48?0:1],'prop',r=>bridge3(r,by)));}}
 if(inWorld()&&typeof drawRealmCrossings==='function')drawRealmCrossings(mesh);
 if(globalThis.VeldrenBridgeScene?.enabled)VeldrenBridgeScene.draw(mesh,currentScene);
 if(globalThis.VeldrenStructureScene?.enabled)VeldrenStructureScene.draw(mesh,currentScene);
 if(typeof drawCreatureLair==='function')drawCreatureLair(mesh,minx,maxx,minz,maxz);
 const near=(x,z)=>{if(Math.hypot(x-px,z-py)>wideWorldLimit||x<minx-3||x>maxx+3||z<minz-3||z>maxz+3)return false;const q=project3(x,1,z),m=visibility.pixels;return q.x>-m&&q.x<w+m&&q.y>-m&&q.y<h+m;};
 const hit=(o,x,z,height,width=.65,geometry=null)=>{const a=project3(x,0,z),b=project3(x,height,z);hitboxes.push({x:a.x-width*cameraZoom3()/2,y:Math.min(a.y,b.y)-8,w:width*cameraZoom3(),h:Math.abs(a.y-b.y)+16,o,depth:a.depth,geometry});};
 for(const b of buildings){b._cutaway=buildingRoofHidden(b);const bx=b.x+b.w/2,bz=b.y+b.h/2;if(Math.hypot(bx-px,bz-py)>wideWorldLimit+Math.hypot(b.w,b.h)/2)continue;const padding=Math.max(b.visualHeight||0,b.civilCastle?30:18)/Math.tan(cameraPitch3())+8;if(b.x+b.w<minx-padding||b.x>maxx+padding||b.y+b.h<minz-padding||b.y>maxz+padding)continue;const center=project3(bx,(b.visualHeight||3.3)/2,bz),radius=(Math.hypot(b.w,b.h)+(b.visualHeight||3.3))*cameraZoom3()*.6;if(center.x< -radius||center.x>w+radius||center.y< -radius||center.y>h+radius)continue;visibleBuildings.push(b);if(b._cutaway)openRooms.add(b.service?.destination);const cached=cachedMesh3(b,'building',r=>building3(r,b));b.visualHeight=cached.height||b.visualHeight;emitMesh3(mesh,cached);if(b.service&&!b._cutaway){hitboxes.push({get polygon(){return buildingHull3(cached);},o:b.service,building:b,depth:project3(bx,0,bz).depth});}if((s.insideBuilding===b.service?.destination||target===b.service)&&Math.hypot(px-b.x,py-b.y)<10)labels.push([b.name,bx,(b.visualHeight||3.3)+.15,bz,'#e8d9b0']);}
 for(const o of viewObjects){if(o.type==='spirit')continue;const treeState=o.type==='tree'&&typeof treeLifecycle==='function'?treeLifecycle(o):null;if(treeState==='syncing')continue;if(o.interiorBuilding&&!openRooms.has(o.interiorBuilding)||o.building?.walkIn||(o.dead>time&&!creatureDying(o)&&!treeState)||(o.kind==='king'&&s.boss&&!o.repeatable&&!creatureDying(o))||!near(o.x,o.y))continue;const x=(o.drawX??o.x)+.5,z=(o.drawY??o.y)+.5,living=fighter(o)||o.characterSprite||['elder','shop','questgiver','spirit','villager','inn'].includes(o.type),pickable=o.type==='tree'||fighter(o)||o.passageKind==='ladder'||o.mainStoryKey||o.mountainKey||o.questModel,precisePick=pickable&&(target===o||Math.hypot(o.x-px,o.y-py)<6),pick=precisePick?capturePickGeometry3(mesh):null,objectPainter=pick?.painter||mesh,drawObject=()=>treeState&&['stump','regrowing'].includes(treeState)?emitMesh3(objectPainter,cachedMesh3(o,'tree-'+treeState,r=>drawTreeStump(r,o,x,z,treeState==='regrowing'))):living?creature3(objectPainter,o,x,z):(o.arcPhantom||o.mountainKey==='memory'||['camp','crop','spirit','gate'].includes(o.type))?prop3(objectPainter,o,x,z):emitMesh3(objectPainter,cachedMesh3(o,'prop',r=>prop3(r,o,x,z))),height=typeof withCivilGrounding3==='function'?withCivilGrounding3(o,drawObject):drawObject(); if(o.dead>time)continue;if(o.passageKind==='cave'||o.lairEntrance&&cavePassageKind(o.destination)==='cave')hitboxes.push({o,polygon:caveOpeningPolygon3(o,x,z),depth:project3(x,0,z).depth});else hit(o,x,z,height,o.type==='tree'?1.1:o.kind==='rat'?1.35:.7+(o.combatRadius||0)*2,pick?.geometry);const marker=typeof questNpcMarker==='function'?questNpcMarker(o):null;if(marker)labels.push([marker,x,height+.55,z,'#ffdb8d']);if(o.type==='fish'){const q=project3(x,.12,z);hitboxes.push({o,x:q.x-24,y:q.y-18,w:48,h:36,depth:q.depth});if(target!==o&&Math.hypot(x-px,z-py)<12)labels.push([o.name,x,.7,z,'#ccefff']);}if(target===o||fighter(o)&&typeof sharedCombatVisible==='function'&&sharedCombatVisible(o))labels.push([o.name,x,height+.35,z,'#ffe0bb',o]);else if(o.tutor&&Math.hypot(x-px,z-py)<7&&!target)labels.push([o.name,x,height+.35,z,'#e8d6a6']);}
 if(typeof drawWorldLightFixtures3==='function')drawWorldLightFixtures3(mesh,minx,maxx,minz,maxz);
 if(window.VELDREN_CONTEXT!=='editor'){
 const moving=playerMotion.moving;if(moving){const delta=Math.atan2(Math.sin(playerMotion.heading-playerHeading),Math.cos(playerMotion.heading-playerHeading));playerHeading+=delta*.3;}else if(target)playerHeading=Math.atan2(target.x-px,target.y-py);
 const worldDetail=meshDetail3;meshDetail3=1;humanoid3(mesh,px+.5,py+.5,s.character?.look||0,s.equipment,playerHeading,moving?1:0,Math.max(0,Math.sin(Math.min(1,(time-lastAttack)/.65)*Math.PI)),1.18);meshDetail3=worldDetail;
 }
 for(const pile of s.groundLoot||[])if(pile.scene===currentScene&&near(pile.x,pile.y)){
  const x=pile.x+.5,z=pile.y+.5;
  if(typeof drawGroundPileModels==='function')drawGroundPileModels(mesh,pile,x,z);
  else box3(mesh,x,.1,z,.3,.2,.26,'#d7b66b');
  hit(pile,x,z,.40,1);if(Math.hypot(px-pile.x,py-pile.y)<4)labels.push([groundItemLabel(pile),x,.65,z,'#f4daa0']);
 }
 if(typeof drawCombatProjectiles3==='function')drawCombatProjectiles3(mesh);
 if(typeof drawTutorialCrossing3==='function')drawTutorialCrossing3(mesh);
 if(typeof drawOnlinePlayers==='function')drawOnlinePlayers(mesh,labels);if(typeof drawGuardianSpecial==='function')drawGuardianSpecial(mesh);if(typeof drawLevelCelebration==='function')drawLevelCelebration(mesh);mesh.flush();
 // A full-height door target remains selectable with the roof cut away.
 for(const b of visibleBuildings)if(b.walkIn){const o=b.service,seg=Math.max(1,Math.round(b.w/2)),scale=b.w/seg/2,xx=b.x+(Math.floor(seg/2)+.5)*b.w/seg,m=typeof buildingDoorTransform==='function'?buildingDoorTransform(b):briarTransform(xx-.53*scale,0,b.y+b.h+.04,scale,-doorOpenFraction(o)*Math.PI*.52,scale*.85);hitboxes.push({polygon:[[-.05,0,0],[1.08,0,0],[1.08,2.36,0],[-.05,2.36,0]].map(p=>project3(...briarPoint(p,0,m))),o,door:true,depth:project3(o.x+.5,0,o.y+.5).depth});}
 const guidePath=tutorialGuideRoute();if(guidePath.length){ctx.beginPath();for(const [i,p]of [[px,py],...guidePath].entries()){const q=project3(p[0]+.5,.035+walkSurfaceHeight(p[0]+.5,p[1]+.5)-landHeight(p[0]+.5,p[1]+.5),p[1]+.5);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);}ctx.strokeStyle='#e9dba6';ctx.lineWidth=2;ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);}
 if(window.VELDREN_CONTEXT!=='editor'){groundShadow3(ctx,px+.5,py+.5,.38,.27,.23);ring3(ctx,px+.5,py+.5,'#e4d6a2',.33);if(target)ring3(ctx,target.x+.5,target.y+.5,fighter(target)?'#e79580':'#e4d6a2');}
 if(typeof drawQuestWorldGuide==='function')drawQuestWorldGuide(ctx);
 const tp=tutorialGoal();if(tp){ring3(ctx,tp.x+.5,tp.y+.5,'#f3d280',.58);if(tutorialStep()?.event==='talk-finish')labels.push(['Finish apprenticeship · Elder Rowan',tp.x+.5,3.2,tp.y+.5,'#ffdb8d']);}

 drawWorldMood3();for(const o of viewObjects){if(o.type!=='fish'||o.dead>time||!near(o.x,o.y))continue;const q=project3(o.x+.5,.14,o.y+.5);ctx.save();ctx.strokeStyle='#bceafa';ctx.lineWidth=2;for(let i=0;i<3;i++){const phase=(time*.5+i/3)%1;ctx.globalAlpha=1-phase;ctx.beginPath();ctx.ellipse(q.x,q.y,7+phase*15,3+phase*6,0,0,Math.PI*2);ctx.stroke();}ctx.restore();}hitboxes.sort((a,b)=>a.depth-b.depth);
 if(typeof socialOverheads!=='undefined'){const chat=socialOverheads.get(accountUsername?.toLowerCase());if(chat&&Date.now()<chat.until)pushOverheadChat(labels,chat.text,px,py);}
 if(window.VELDREN_CONTEXT!=='editor'&&(!target||!fighter(target)))labels.push([s.character?.name||'Adventurer',px+.5,2.3+walkSurfaceHeight(px+.5,py+.5)-landHeight(px+.5,py+.5),py+.5,'#ffedbd']);
 const occupiedLabels=[];
 for(const [text,x,y,z,color,o]of labels){const p=project3(x,y,z),width=Math.max(40,text.length*6.5);let yy=p.y;
  for(let attempt=0;attempt<8&&occupiedLabels.some(b=>Math.abs(p.x-b.x)<(width+b.width)/2+6&&Math.abs(yy-b.y)<20);attempt++)yy-=21;
  occupiedLabels.push({x:p.x,y:yy,width});label(text,p.x,yy,color,12);
  if(o&&fighter(o)){ctx.fillStyle='#15221d';ctx.fillRect(p.x-25,yy-17,50,6);ctx.fillStyle='#cc776c';ctx.fillRect(p.x-24,yy-16,48*Math.max(0,o.hp/o.maxhp),4);}
 }
 if(target&&fighter(target)){const q=project3(px+.5,2.2+walkSurfaceHeight(px+.5,py+.5)-landHeight(px+.5,py+.5),py+.5);ctx.fillStyle='#15221d';ctx.fillRect(q.x-22,q.y-4,44,6);ctx.fillStyle=s.hp/maxhp()<.25?'#ed9a64':'#95b47a';ctx.fillRect(q.x-21,q.y-3,42*Math.max(0,s.hp/maxhp()),4);}

 for(const p of projectiles){if(p.age<0||p.style==='ranged')continue;const t=Math.min(1,p.age/p.duration),q=project3(p.x+(p.tx-p.x)*t+.5,1.3+Math.sin(t*Math.PI)*.15,p.y+(p.ty-p.y)*t+.5),back=Math.max(0,t-.16),tail=project3(p.x+(p.tx-p.x)*back+.5,1.3+Math.sin(back*Math.PI)*.15,p.y+(p.ty-p.y)*back+.5);ctx.save();ctx.shadowColor=p.color||'#a2ddea';ctx.shadowBlur=12;ctx.strokeStyle=p.color||'#a2ddea';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.fillStyle='#eefbdf';ctx.beginPath();ctx.arc(q.x,q.y,4,0,Math.PI*2);ctx.fill();ctx.restore();}
 if(spiritEffect)ring3(ctx,spiritEffect.x+.5,spiritEffect.y+.5,spiritEffect.color,.6+spiritEffect.age);
 if(spiritBondEffect)ring3(ctx,spiritBondEffect.x+.5,spiritBondEffect.y+.5,SPIRITS[spiritBondEffect.id].color,.4+spiritBondEffect.age*.4);
 for(const f of floaters){const combat=/^(?:-\d|Miss|Blocked)/.test(f.text),p=project3(f.x+.5,(combat?1.3:2.6)+(1.4-f.life)*.55,f.y+.5),player=Math.hypot(f.x-px,f.y-py)<.4,offset=combat?(player?-23:23):0;if(f.experience){drawExperienceDrop(f,p.x,p.y);continue;}if(combat){ctx.fillStyle=player?'#652f29e8':'#343a30ed';const half=Math.max(12,f.text.length*3.7);ctx.beginPath();ctx.ellipse(p.x+offset,p.y,half,12,0,0,Math.PI*2);ctx.fill();}label(f.text,p.x+offset,p.y,f.color,combat?12:14);}
 const region=regionInfo()||['Briarhaven','Veldren'],regionTitle=$('region'),regionSubtitle=$('regionSub');if(regionTitle.textContent!==region[0])regionTitle.textContent=region[0];if(regionSubtitle.textContent!==region[1])regionSubtitle.textContent=region[1];drawMinimap();trimStaticMeshes3();drawWorldClick();
}
// Creation, equipment previews and gameplay share precisely the same fitted model.
drawEquippedCharacter=function(g,x,bottom,look,moving=false,age=10,scale=1){const prevDetail=meshDetail3;meshDetail3=1;const v={yaw:-.45,tilt:.35,zoom:29*scale},proj=(a,b,c)=>project3(a,b,c,v,0,0,0,0),r=painter3(g,(a,b,c)=>{const p=proj(a,b,c);return {...p,x:p.x+x,y:p.y+bottom};});humanoid3(r,0,0,look,s.equipment,0,moving?time*10:0,Math.max(0,Math.sin(Math.min(1,age/.42)*Math.PI)));r.flush();meshDetail3=prevDetail;};
draw=draw3d;
// Project building selection hulls only when a click needs them. Orbiting
// never changes visible geometry and should not rebuild interaction polygons.
function buildingHull3(cached){
 if(!cached.pickPoints){const layers=new Map(),add=p=>{const key=Math.round(p[1]*20),b=layers.get(key);if(b){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.min(b[2],p[2]);b[3]=Math.max(b[3],p[0]);b[4]=Math.max(b[4],p[1]);b[5]=Math.max(b[5],p[2]);}else layers.set(key,[...p,...p]);};
  for(const f of cached.faces)for(const p of f.points)add(p);
  for(const {mesh,matrix}of cached.instances||[])if(mesh.bounds){const [lo,hi]=mesh.bounds;for(const x of [lo[0],hi[0]])for(const y of [lo[1],hi[1]])for(const z of [lo[2],hi[2]])add(briarPoint([x,y,z],0,matrix));}
  cached.pickPoints=[...layers.values()].flatMap(b=>[[b[0],b[1],b[2]],[b[3],b[1],b[2]],[b[3],b[4],b[5]],[b[0],b[4],b[5]]]);
 }
 const pickW=screen.w||900,pickH=screen.h||500,key=[view3d.yaw,cameraPitch3(),cameraZoom3(),px,py,pickW,pickH].join(':');if(cached.hullKey!==key){
 const points=cached.pickPoints.map(p=>project3(...p,view3d,px+.5,py+.5,pickW,pickH)).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lower=[],upper=[];
 for(const p of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}lower.pop();upper.pop();cached.hull=lower.concat(upper);cached.hullKey=key;
 }return cached.hull;
}
function pointInHull3(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function openBuilding3(b){if(!b.service?.destination){toast(b.name);return;}dialog(b.name,'<p>Enter this building?</p>',[['Enter',()=>{close();engage(b.service);}],['Cancel',close]]);}
// Keep references to the geometry already submitted for this frame. Mesh work
// happens on a click, not in the animation loop or shared combat simulation.
function capturePickGeometry3(base){
 const geometry=[],painter=Object.create(base);
 painter.face=(points,...args)=>{geometry.push({points});return base.face(points,...args);};
 if(base.indexed)painter.indexed=(mesh,m,...args)=>{geometry.push({mesh,m});return base.indexed(mesh,m,...args);};
 if(base.skinned)painter.skinned=(mesh,m,palette,...args)=>{geometry.push({mesh,m,palette});return base.skinned(mesh,m,palette,...args);};
 painter.cached=cached=>{geometry.push({cached});return emitMesh3(base,cached);};
 return {painter,geometry};
}
const pickPositionBounds3=new WeakMap(),pickBoneBounds3=new WeakMap(),pickPackedMeshes3=new WeakMap();
function pickReadableMesh3(mesh){if(!mesh.packed)return mesh;let result=pickPackedMeshes3.get(mesh.packed);if(result)return result;const count=mesh.packed.length/12,p=new Float32Array(count*3),i=new Uint32Array(count);for(let n=0;n<count;n++){p.set(mesh.packed.subarray(n*12,n*12+3),n*3);i[n]=n;}result={p,i};pickPackedMeshes3.set(mesh.packed,result);return result;}
function pickBounds3(p){let b=pickPositionBounds3.get(p);if(b)return b;b=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];for(let i=0;i<p.length;i+=3)for(let a=0;a<3;a++){b[0][a]=Math.min(b[0][a],p[i+a]);b[1][a]=Math.max(b[1][a],p[i+a]);}pickPositionBounds3.set(p,b);return b;}
function pickCorners3(b){const out=[];for(const x of [b[0][0],b[1][0]])for(const y of [b[0][1],b[1][1]])for(const z of [b[0][2],b[1][2]])out.push([x,y,z]);return out;}
function pickSkinBounds3(mesh,palette){
 let bones=pickBoneBounds3.get(mesh.p);if(!bones){bones=new Map();for(let i=0;i<mesh.p.length/3;i++)for(let n=0;n<4;n++)if(mesh.w[i*4+n]>0){const id=mesh.j[i*4+n];let b=bones.get(id);if(!b){b=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];bones.set(id,b);}for(let a=0;a<3;a++){b[0][a]=Math.min(b[0][a],mesh.p[i*3+a]);b[1][a]=Math.max(b[1][a],mesh.p[i*3+a]);}}pickBoneBounds3.set(mesh.p,bones);}
 const bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
 for(const [id,b]of bones)for(const p of pickCorners3(b))for(let a=0;a<3;a++){const row=id*12+a*4,v=palette[row]*p[0]+palette[row+1]*p[1]+palette[row+2]*p[2]+palette[row+3];bounds[0][a]=Math.min(bounds[0][a],v);bounds[1][a]=Math.max(bounds[1][a],v);}
 return bounds;
}
function pickMeshProject3(p,m){const q=briarPoint(p,0,m);q[1]+=landHeight(m[3],m[11]);return flatProject3(q[0],q[1]-walkSurfaceHeight(px+.5,py+.5),q[2]);}
function pickTriangle3(x,y,a,b,c,pad){
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x),p={x,y},area=cross(a,b,c);if(Math.abs(area)<.00001)return null;
 const u=cross(p,b,c)/area,v=cross(a,p,c)/area,w=1-u-v;
 if(u>=0&&v>=0&&w>=0)return {depth:u*a.depth+v*b.depth+w*c.depth,distance:0};
 let best=null;for(const [p,q]of [[a,b],[b,c],[c,a]]){const dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,((x-p.x)*dx+(y-p.y)*dy)/(dx*dx+dy*dy||1))),distance=Math.hypot(x-p.x-t*dx,y-p.y-t*dy);if(distance<=pad&&(!best||distance<best.distance))best={distance,depth:p.depth+t*(q.depth-p.depth)};}return best;
}
function pickGeometry3(geometry,x,y,pad=4){
 let best=null;const accept=hit=>{if(hit&&(!best||hit.distance===0&&best.distance>0||hit.distance===0&&best.distance===0&&hit.depth>best.depth||hit.distance>0&&best.distance>0&&hit.distance<best.distance))best=hit;};
 const outside=points=>x<Math.min(...points.map(p=>p.x))-pad||x>Math.max(...points.map(p=>p.x))+pad||y<Math.min(...points.map(p=>p.y))-pad||y>Math.max(...points.map(p=>p.y))+pad;
 const visit=command=>{
  if(command.cached){for(const f of command.cached.faces)visit({points:f.points});for(const i of command.cached.instances||[])visit({mesh:i.mesh,m:i.matrix});return;}
  if(command.points){const p=command.points.map(v=>project3(...v));if(outside(p))return;for(let i=1;i<p.length-1;i++)accept(pickTriangle3(x,y,p[0],p[i],p[i+1],pad));return;}
  const {m,palette}=command,mesh=pickReadableMesh3(command.mesh),bounds=palette?pickSkinBounds3(mesh,palette):pickBounds3(mesh.p);if(outside(pickCorners3(bounds).map(p=>pickMeshProject3(p,m))))return;
  const projected=new Array(mesh.p.length/3),point=id=>{if(projected[id])return projected[id];let p=[mesh.p[id*3],mesh.p[id*3+1],mesh.p[id*3+2]];if(palette){const v=[0,0,0];for(let n=0;n<4;n++){const weight=mesh.w[id*4+n];if(!weight)continue;const bone=mesh.j[id*4+n]*12;for(let a=0;a<3;a++){const row=bone+a*4;v[a]+=weight*(palette[row]*p[0]+palette[row+1]*p[1]+palette[row+2]*p[2]+palette[row+3]);}}p=v;}return projected[id]=pickMeshProject3(p,m);};
  for(let i=0;i<mesh.i.length;i+=3){const a=point(mesh.i[i]),b=point(mesh.i[i+1]),c=point(mesh.i[i+2]);if(x<Math.min(a.x,b.x,c.x)-pad||x>Math.max(a.x,b.x,c.x)+pad||y<Math.min(a.y,b.y,c.y)-pad||y>Math.max(a.y,b.y,c.y)+pad)continue;accept(pickTriangle3(x,y,a,b,c,pad));}
 };
 for(const command of geometry)visit(command);return best;
}
function worldHits3(sx,sy){
 const hits=[];for(const h of hitboxes){if(h.o&&(h.o.dead>time||h.o.collected))continue;
  const result=h.geometry?pickGeometry3(h.geometry,sx,sy):(h.polygon?pointInHull3(sx,sy,h.polygon):sx>=h.x&&sx<=h.x+h.w&&sy>=h.y&&sy<=h.y+h.h)?{depth:h.depth,distance:0}:null;
  if(result)hits.push({...h,pickDepth:result.depth,pickDistance:result.distance});
 }
 return hits.sort((a,b)=>Number(!!b.o?.passageKind)-Number(!!a.o?.passageKind)||Number(!!b.door)-Number(!!a.door)||Number(a.pickDistance>0)-Number(b.pickDistance>0)||(a.pickDistance&&b.pickDistance?a.pickDistance-b.pickDistance:b.pickDepth-a.pickDepth));
}

let worldClickFeedback=null;
function showWorldClick(e,interaction=false){const b=canvas.getBoundingClientRect();worldClickFeedback={x:(e.clientX-b.left)*screen.w/b.width,y:(e.clientY-b.top)*screen.h/b.height,interaction,started:performance.now()};}
function drawWorldClick(){const f=worldClickFeedback;if(!f)return;const age=(performance.now()-f.started)/1000;if(age>.65){worldClickFeedback=null;return;}const pulse=1+Math.sin(age/.65*Math.PI)*.3,k=9*pulse;ctx.save();ctx.globalAlpha=Math.min(1,(.65-age)/.18);ctx.lineCap='round';for(const [color,width]of [['#201a16',6],[f.interaction?'#f45c46':'#ffdc43',3]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();for(const [dx,dy]of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.moveTo(f.x+dx*3*pulse,f.y+dy*3*pulse);ctx.lineTo(f.x+dx*k,f.y+dy*k);}ctx.stroke();}ctx.restore();}
function worldScreenPoint(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*screen.w/b.width,y:(e.clientY-b.top)*screen.h/b.height};}
function clickWorld3(e){if(window.VELDREN_CONTEXT==='editor'||!assetsReady||$('creator').open||$('modal').open)return;const {x:sx,y:sy}=worldScreenPoint(e),p=unproject3(sx,sy),x=Math.floor(p.x),y=Math.floor(p.z);const hit=worldHits3(sx,sy)[0];if(hit){showWorldClick(e,true);if(hit.o?.type==='player'){openWorldOptions(e);return;}if(hit.building)openBuilding3(hit.building);else select(hit.o);return;}const pile=(s.groundLoot||[]).find(p=>p.scene===currentScene&&p.x===x&&p.y===y);if(pile){showWorldClick(e,true);select(pile);return;}showWorldClick(e);walkTo(x,y);}
const cameraPointers=new Map();let gestureMoved=false,pinchStart=null;
let worldHoldTimer=null,worldHoldOpened=false;
const cancelWorldHold=()=>{clearTimeout(worldHoldTimer);worldHoldTimer=null;};
if(window.VELDREN_CONTEXT!=='editor'){
canvas.addEventListener('contextmenu',e=>{e.preventDefault();cancelWorldHold();if(!worldHoldOpened)openWorldOptions(e);});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();cancelWorldHold();if(cameraPointers.size===0)worldHoldOpened=false;cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button,pointerType:e.pointerType});try{canvas.setPointerCapture(e.pointerId);}catch{}if(cameraPointers.size===1){gestureMoved=false;if(e.button===0&&e.pointerType!=='mouse'){const point={clientX:e.clientX,clientY:e.clientY};worldHoldTimer=setTimeout(()=>{worldHoldOpened=true;gestureMoved=true;openWorldOptions(point);},500);}}if(cameraPointers.size===2){const [a,b]=[...cameraPointers.values()];pinchStart={distance:Math.hypot(a.x-b.x,a.y-b.y),angle:Math.atan2(b.y-a.y,b.x-a.x),yaw:view3d.yaw,zoom:view3d.zoom,tilt:view3d.tilt,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};gestureMoved=true;}});
canvas.addEventListener('pointermove',e=>{const p=cameraPointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.startX,p.y-p.startY)>7){gestureMoved=true;cancelWorldHold();}if(worldHoldOpened)return;if(cameraPointers.size===2&&pinchStart){const [a,b]=[...cameraPointers.values()];view3d.zoom=Math.max(view3d.min,Math.min(view3d.max,pinchStart.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinchStart.distance)));syncCameraZoom();}else if(cameraPointers.size===1&&gestureMoved&&!pinchStart){view3d.yaw+=dx*.009;view3d.tilt=Math.max(.22,Math.min(.70,view3d.tilt+dy*.004));}});
canvas.addEventListener('pointerup',e=>{cancelWorldHold();const p=cameraPointers.get(e.pointerId);if(!p)return;cameraPointers.delete(e.pointerId);if(!gestureMoved&&p.button===0&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<=7)clickWorld3(e);if(!cameraPointers.size)pinchStart=null;rememberView();});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{cancelWorldHold();cameraPointers.delete(e.pointerId);gestureMoved=true;if(!cameraPointers.size)pinchStart=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();view3d.zoom=Math.max(view3d.min,Math.min(view3d.max,view3d.zoom*Math.exp(-e.deltaY*.001)));rememberView();},{passive:false});
}
$('zoomOut').onclick=()=>{view3d.zoom=Math.max(view3d.min,view3d.zoom/1.2);rememberView();};$('zoomIn').onclick=()=>{view3d.zoom=Math.min(view3d.max,view3d.zoom*1.2);rememberView();};$('cameraReset').onclick=()=>{Object.assign(view3d,cameraDefault3);rememberView();};
const cameraKeys=new Set();
function cameraInputAllowed(e){return !window.maintenancePreparing&&assetsReady&&!cloudDisconnected&&!cloudConflict&&!$('creator').open&&!e?.target?.closest?.('input,textarea,select,[contenteditable]')&&!e?.ctrlKey&&!e?.metaKey&&!e?.altKey;}
function stepCameraKeys(dt){const horizontal=Number(cameraKeys.has('ArrowRight'))-Number(cameraKeys.has('ArrowLeft')),vertical=Number(cameraKeys.has('ArrowDown'))-Number(cameraKeys.has('ArrowUp'));view3d.yaw+=horizontal*dt*1.9;view3d.tilt=Math.max(.22,Math.min(.70,view3d.tilt+vertical*dt*.65));}
function cameraKeyDown(e){if(!e.key.startsWith('Arrow')||!cameraInputAllowed(e))return; e.preventDefault();if(!cameraKeys.has(e.key)){cameraKeys.add(e.key);stepCameraKeys(.025);}}
function updateCameraKeys(dt){if(!cameraInputAllowed({target:document.activeElement})){cameraKeys.clear();return;}if(cameraKeys.size)stepCameraKeys(dt);}
if(window.VELDREN_CONTEXT!=='editor')document.addEventListener('keyup',e=>{if(cameraKeys.delete(e.key))rememberView();});
window.addEventListener('blur',()=>{cameraKeys.clear();cameraPointers.clear();cancelWorldHold();gestureMoved=true;pinchStart=null;});

$('cameraZoom').addEventListener('input',e=>{const percent=Math.max(0,Math.min(100,Number(e.target.value)||0));view3d.zoom=view3d.max-(view3d.max-view3d.min)*percent/100;rememberView();});
syncCameraZoom();
