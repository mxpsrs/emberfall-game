'use strict';
// Continuous heightfield: geometry, camera, picking and characters share one surface.
const landHeights=new Map();
let foundationLevels=new WeakMap(),foundationBuckets=null;
function resetLandSurface(){worldObjectRevision++;worldObjectIndex=null;landHeights.clear();foundationLevels=new WeakMap();foundationBuckets=null;}
function shoreDistance(x,z){return Math.max(0,worldWaterDistance(x,z));}
function cachedLandWater(x,z){return worldWaterSurface(x,z);}
function landBase(x,z){const ridge=Math.exp(-Math.pow((x-185)/27,2))*7*(.65+.35*Math.cos(z*.045));return 2.4+1.5*Math.sin(x*.052)*Math.cos(z*.061)+1.1*Math.sin(z*.026+x*.019)+ridge;}
function gradeLand(x,z,height){return height;}
function shoreHeight(x,z){return Math.max(0,Math.min(gradeLand(x,z,landBase(x,z)),shoreDistance(x,z)*.33));}
function foundationLevel(b){if(foundationLevels.has(b))return foundationLevels.get(b);let level=Infinity;for(let z=Math.floor(b.y-.7);z<=Math.ceil(b.y+b.h+.7);z++)for(let x=Math.floor(b.x-.7);x<=Math.ceil(b.x+b.w+.7);x++)level=Math.min(level,shoreHeight(x,z));level=Math.max(.03,level);foundationLevels.set(b,level);return level;}
function landNode(x,z){
 if(!inWorld())return 0;const key=x+z*2048;if(landHeights.has(key))return landHeights.get(key);
 const water=shoreDistance(x,z);if(!water){const floor=Math.max(-1.2,worldWaterDistance(x,z)*.33);landHeights.set(key,floor);return floor;}
 let h=shoreHeight(x,z),weight=0,total=0,strength=0;
 const excavation=currentScene==='overworld'&&typeof quarryAt==='function'&&quarryAt(x,z,8);
 if(!foundationBuckets){foundationBuckets=new Map();for(const b of buildings)for(let bz=Math.floor((b.y-13)/16);bz<=Math.floor((b.y+b.h+13)/16);bz++)for(let bx=Math.floor((b.x-13)/16);bx<=Math.floor((b.x+b.w+13)/16);bx++){const key=bx+bz*128;if(!foundationBuckets.has(key))foundationBuckets.set(key,[]);foundationBuckets.get(key).push(b);}}
 for(const b of foundationBuckets.get(Math.floor(x/16)+Math.floor(z/16)*128)||[]){const dx=Math.max(b.x-.7-x,0,x-b.x-b.w-.7),dz=Math.max(b.y-.7-z,0,z-b.y-b.h-.7),d=Math.hypot(dx,dz);if(d>=12||excavation&&d>0)continue;
  const foundation=foundationLevel(b);if(d===0){h=foundation;weight=0;break;}
  const t=d/12,blend=1-t*t*(3-2*t),w=blend/Math.max(.0001,d*d);weight+=w;total+=w*foundation;strength=Math.max(strength,blend);
 }
 if(weight)h=h*(1-strength)+total/weight*strength;
 // Grading already happens in shoreHeight. Applying it again would tilt a level foundation.
 h=Math.min(h,water*.45);landHeights.set(key,h);if(landHeights.size>70000)landHeights.delete(landHeights.keys().next().value);return h;
}
function landNormal(x,z){const a=landHeight(x-.2,z)-landHeight(x+.2,z),b=landHeight(x,z-.2)-landHeight(x,z+.2),length=Math.hypot(a,.4,b);return [a/length,.4/length,b/length];}
function landHeight(x,z){if(!inWorld())return 0;const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;return v>=u?landNode(ix,iz)*(1-v)+landNode(ix,iz+1)*(v-u)+landNode(ix+1,iz+1)*u:landNode(ix,iz)*(1-u)+landNode(ix+1,iz)*(u-v)+landNode(ix+1,iz+1)*v;}
const flatProject3=project3;
project3=function(x,y,z,v=view3d,cx=px+.5,cz=py+.5,w=screen.w,h=screen.h){return flatProject3(x,y+(v===view3d?landHeight(x,z)-walkSurfaceHeight(cx,cz):0),z,v,cx,cz,w,h);};
// Intersect the camera ray with the visible surface, from front to back.
// Fixed-point iteration diverged on banks and snapped taps across bridge edges.
unproject3=function(sx,sy){
 const v=view3d,c=Math.cos(v.yaw),sn=Math.sin(v.yaw),st=Math.sin(v.tilt),ct=Math.cos(v.tilt),u=(sx-screen.w/2)/cameraZoom3(v),screenD=(sy-screen.h*.54)/cameraZoom3(v),base=walkSurfaceHeight(px+.5,py+.5);
 const point=d=>({x:px+.5+u*c+d*sn,z:py+.5-u*sn+d*c});
 const value=d=>{const p=point(d);return d*st-(walkSurfaceHeight(p.x,p.z)-base)*ct-screenD;};
 let hi=(screenD+(32-base)*ct)/st,lo=(screenD+(-2-base)*ct)/st,previous=hi;
 for(let d=hi-1.5;d>lo;d-=1.5){if(value(d)<=0){lo=d;hi=previous;break;}previous=d;}
 for(let i=0;i<19;i++){const mid=(lo+hi)/2;if(value(mid)>0)hi=mid;else lo=mid;}
 return point((lo+hi)/2);
};
const flatFaceData=realmFaceData;
realmFaceData=function(data,points,color,normals,material,colors,uvs){const lifted=points.map(p=>[p[0],p[1]+landHeight(p[0],p[2]),p[2]]);return flatFaceData(data,lifted,color,material===4?points.map(()=>[0,1,0]):material>=1&&material<=3?points.map(p=>landNormal(p[0],p[2])):normals,material,colors,uvs);};
const flatIndexedData=realmIndexedData;
let packingLocalMesh=false;
realmIndexedData=function(data,mesh,m){if(packingLocalMesh)return flatIndexedData(data,mesh,m);const transform=Array.from(m);transform[7]+=landHeight(m[3],m[11]);return flatIndexedData(data,mesh,transform);};
// Ground an articulated object once; children inherit that root height.
// Sampling terrain separately for a hand or hair mesh made equipment float on hills.
function groundedPainter(r,x,z){
 const base=walkSurfaceHeight(x,z),out={face(points,color,normals,material,colors,uvs){r.face(points.map(p=>[p[0],p[1]+base-landHeight(p[0],p[2]),p[2]]),color,normals,material,colors,uvs);}};
 if(r.indexed)out.indexed=(mesh,m,style)=>{const matrix=Array.from(m);matrix[7]+=base-landHeight(m[3],m[11]);r.indexed(mesh,matrix,style);};
 if(r.skinned)out.skinned=(mesh,m,palette,style)=>{const matrix=Array.from(m);matrix[7]+=base-landHeight(m[3],m[11]);r.skinned(mesh,matrix,palette,style);};
 out.software=r.software;
 return out;
}
// Fallback rendering uses the same raised terrain instead of a flat bitmap.
drawTerrainLayer3=function(){const r=canvasPainterRealm(ctx,project3),[mw,mh]=sceneSize(),corners=[[0,0],[screen.w,0],[0,screen.h],[screen.w,screen.h]].map(p=>unproject3(...p));const minx=Math.max(inWorld()?-128:0,Math.floor(Math.min(...corners.map(p=>p.x)))-10),maxx=Math.min(inWorld()?mw+128:mw,Math.ceil(Math.max(...corners.map(p=>p.x)))+10),minz=Math.max(inWorld()?-128:0,Math.floor(Math.min(...corners.map(p=>p.z)))-10),maxz=Math.min(inWorld()?mh+128:mh,Math.ceil(Math.max(...corners.map(p=>p.z)))+10);for(let z=minz;z<maxz;z++)for(let x=minx;x<maxx;x++){if(typeof civilStairWellAt==='function'&&civilStairWellAt(x+.5,z+.5))continue;const t=terrainType(x,z),road=typeof roadInfluence==='function'?roadInfluence(x+.5,z+.5):[0,0,0],color=t===3?'#427e89':road[2]>.5?'#97978a':road[0]>.4?(road[1]>.4?'#b3ab92':'#aa956e'):['#628047','#aa956e','#989e8a','#427e89'][t];r.face([[x,0,z],[x,0,z+1],[x+1,0,z+1],[x+1,0,z]],color);}r.flush();};
// Goblins have their own anatomy and motion, independent of the human avatar mesh.
function goblinRealm3(r,x,z,heading,walk,attack,size=1,hurt=0){
 if(!r.indexed)return buildGoblinRealm3(r,x,z,heading,walk,attack,size,hurt);
 const stride=Math.round(Math.sin(walk)*24)/24,swing=Math.round(attack*32)/32,recoil=Math.round(hurt*16)/16,key=['goblin',meshDetail3,stride,swing,recoil].join(':');
 return cachedRealmShape(r,key,briarTransform(x,0,z,size,heading),q=>buildGoblinRealm3(q,0,0,0,Math.asin(stride),swing,1,recoil))*size;
}
function buildGoblinRealm3(r,x,z,heading,walk,attack,size=1,hurt=0){
 const c=Math.cos(heading),sn=Math.sin(heading),stride=Math.sin(walk),k=.88*size,bob=Math.abs(stride)*.025;
 const root=([a,b,d])=>[x+(a*c+d*sn)*k,(b+bob-hurt*.035)*k,z+(-a*sn+d*c-hurt*.07)*k];
 const skin='#748b51',shade='#566d3f',cloth='#69573e',leather='#493d2e',local={face(p,col,n,mat){r.face(p.map(root),col,null,mat);}};
 const joint=(p,w,h,d,col)=>oval3(local,...p,w,h,d,col,p=>p,12);
 // Bent legs and digitigrade stance distinguish scavengers from human residents.
 for(const side of [-1,1]){
  const step=stride*side,hip=[side*.14,.59,-.06],knee=[side*.19,.34,.09+step*.09],ankle=[side*.17,.10,.02+step*.16];
  beamArt(local,hip,knee,.095,cloth,9);joint(knee,.17,.18,.18,shade);beamArt(local,knee,ankle,.072,skin,9);joint([ankle[0],.07,ankle[2]+.12],.22,.13,.36,shade);
 }
 joint([0,.88,-.025],.57,.70,.37,skin);joint([0,.64,.0],.45,.27,.34,cloth);
 // A fitted, ragged leather vest and belt give the body readable material changes.
 const vest=materialRealm(local,5);
 for(const side of [-1,1]){vest.face([[side*.05,1.17,.095],[side*.25,1.12,.10],[side*.25,.66,.16],[side*.09,.62,.17]],cloth);beamArt(vest,[side*.25,1.12,.04],[side*.20,1.19,-.10],.048,cloth,6);}
 profile3(vest,0,.66,.01,.47,.085,.37,[[-.5,1],[.5,1]],leather,p=>p,12);box3(local,0,.66,.208,.07,.06,.025,'#b39a65');
 joint([0,1.22,.13],.28,.29,.27,skin);joint([0,1.43,.20],.49,.46,.40,skin);joint([0,1.34,.415],.21,.14,.22,shade);
 for(const side of [-1,1]){
  const ear=[[side*.20,1.50,.15],[side*.52,1.57,.025],[side*.29,1.31,.15],[side*.26,1.44,.24]];for(const tri of [[0,1,3],[1,2,3],[2,0,3]])local.face(tri.map(i=>ear[i]),skin);
  beamArt(local,[side*.055,1.48,.37],[side*.195,1.50,.34],.033,shade,6);joint([side*.12,1.447,.382],.064,.046,.030,'#dbb869');joint([side*.12,1.448,.403],.020,.030,.016,'#1b2417');
  local.face([[side*.135,1.25,.38],[side*.103,1.35,.45],[side*.065,1.26,.42]],'#d8cfad');
  const shoulder=[side*.30,1.07,-.01],swing=side===1?attack:0,elbow=[side*.40,.78+swing*.35,.06-swing*.30+stride*side*.05],hand=[side*.38,.48+swing*.85,.20-swing*.14+stride*side*.10];
  joint(shoulder,.22,.25,.23,skin);beamArt(local,shoulder,elbow,.082,skin,10);joint(elbow,.17,.17,.17,shade);beamArt(local,elbow,hand,.073,skin,10);joint(hand,.17,.20,.16,skin);
  for(let finger=-1;finger<=1;finger++)beamArt(local,[hand[0]+finger*.045,hand[1]-.025,hand[2]+.015],[hand[0]+finger*.04,hand[1]-.11,hand[2]+.07],.017,shade,5);
  if(side===1){const tip=[hand[0],hand[1]+.17+swing*.26,hand[2]+.48-swing*.28];beamArt(vest,hand,tip,.035,'#604d32',8);joint(tip,.18,.27,.23,'#828679');for(const t of [-1,1])local.face([[tip[0]+t*.08,tip[1]+.06,tip[2]],[tip[0]+t*.17,tip[1]+.10,tip[2]],[tip[0]+t*.08,tip[1]+.12,tip[2]+.05]],'#b6afa0');}
 }
 return 1.75*size;
}
function npcDressRealm(r,headTransform,root,gear){if(!['bandit','warden'].includes(gear._kind))return;const local={face(p,col){r.face(p.map(v=>briarPoint(v,0,headTransform)),col);}},color=gear._kind==='warden'?'#454b53':'#443a35';
 // Open-front cowl, fitted face wrap and a separate short cloak.
 const rings=[[1.47,.20],[1.63,.22],[1.79,.20],[1.87,.10]];for(let j=0;j<rings.length-1;j++)for(let i=0;i<14;i++){const a=.65+i/14*(Math.PI*2-1.3),b=.65+(i+1)/14*(Math.PI*2-1.3),p=(angle,row)=>[Math.sin(angle)*rings[row][1],rings[row][0],Math.cos(angle)*rings[row][1]-.015];local.face([p(a,j),p(b,j),p(b,j+1),p(a,j+1)],color);}
 profile3(local,0,1.59,.115,.30,.115,.21,[[-.5,.75],[0,1],[.5,.85]],'#332d2a',p=>p,12);
 for(let i=0;i<8;i++){const a=-.26+i*.065,b=a+.065;const p=(v,y)=>[v*(y<1?1.3:1),y,-.18-(1.4-y)*.13+Math.sin(v*45)*.022];r.face([p(a,1.4),p(b,1.4),p(b,.66),p(a,.66)].map(v=>briarPoint(v,0,root)),color);}
}
const distinctCreatureBefore=creature3;
creature3=function(r,o,x,z){
 if(['wolf','ridgewolf','rat'].includes(o.kind)&&r.indexed){const moving=Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)>.02,phase=moving?Math.round((time*9%(Math.PI*2))*24)/24:0;return cachedRealmShape(groundedPainter(r,x,z),[o.kind,meshDetail3,moving,phase].join(':'),briarTransform(x,0,z,1,Math.atan2(px-x,py-z)),q=>quadrupedArt(q,{...o,x:0,y:0,drawX:moving?1:0,drawY:0},0,0,0,phase));}
 if(o.kind==='dummy'){r=groundedPainter(r,x,z);return r.indexed?cachedRealmShape(r,'dummy:'+meshDetail3+':'+o.tutorialRole,briarTransform(x,0,z),q=>drawPracticeDummy(q,o,0,0)):drawPracticeDummy(r,o,x,z);}
 if(o.tutor||o.appearanceRole){humanoid3(r,x,z,o.sprite%4,npcEquipment(o),Math.atan2(px-x,py-z),0,0);return 1.9;}
 if(o.kind==='goblin')return goblinRealm3(groundedPainter(r,x,z),x,z,Math.atan2(px-x,py-z),Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)>.02?time*8:0,Math.max(0,Math.sin(Math.min(1,(time-(o.attackAt??-9))/.65)*Math.PI)),1,Math.max(0,Math.sin(Math.min(1,(time-(o.hitAt??-9))/.3)*Math.PI)));return distinctCreatureBefore(['wolf','ridgewolf','rat','slime'].includes(o.kind)?groundedPainter(r,x,z):r,o,x,z);};

function drawPracticeDummy(r,o,x,z){const wood=materialRealm(r,5),straw=materialRealm(r,13);beamArt(wood,[x,.02,z],[x,1.65,z],.09,'#6c5034',8);beamArt(wood,[x-.62,1.15,z],[x+.62,1.15,z],.07,'#81613d',8);
  for(const side of [-1,1])beamArt(wood,[x,.2,z],[x+side*.38,.03,z+.25],.06,'#5b4831',6);
  profile3(straw,x,1.06,z,.57,.69,.35,[[-.5,.8],[-.2,1],[.4,.95],[.5,.8]],'#afa071',p=>p,12);oval3(straw,x,1.57,z,.33,.35,.31,'#c2b484',p=>p,12);
  const color=o.tutorialRole==='magic-dummy'?'#796b9b':'#8a4938';for(const [radius,c]of [[.19,color],[.115,'#d2bd87'],[.045,color]]){const points=Array.from({length:24},(_,i)=>[x+Math.cos(i*Math.PI/12)*radius,1.09+Math.sin(i*Math.PI/12)*radius,z+.184+(1-radius)*.004]);straw.face(points,c);}
  return 1.85;
}
