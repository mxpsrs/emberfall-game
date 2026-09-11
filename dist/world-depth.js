'use strict';
// Continuous heightfield: geometry, camera, picking and characters share one surface.
const landHeights=new Map(),landWater=new Map();
let shoreField=null,foundationLevels=new WeakMap();
function resetLandSurface(){landHeights.clear();landWater.clear();shoreField=null;foundationLevels=new WeakMap();}
// Whole-field distances avoid the former four-tile lookup cliff at every riverbank.
function waterDistances(){
 if(shoreField)return shoreField;
 const [width,height]=sceneSize(),w=width+1,h=height+1,wet=new Uint8Array(w*h),distance=new Float32Array(w*h);
 for(let z=0;z<h;z++)for(let x=0;x<w;x++)wet[z*w+x]=worldWaterSurface(x,z)?1:0;
 for(let z=0;z<h;z++)for(let x=0;x<w;x++){const i=z*w+x;distance[i]=wet[i]||x>0&&wet[i-1]||z>0&&wet[i-w]||x>0&&z>0&&wet[i-w-1]?0:10000;}
 for(let z=0;z<h;z++)for(let x=0;x<w;x++){const i=z*w+x;let d=distance[i];if(x)d=Math.min(d,distance[i-1]+1);if(z){d=Math.min(d,distance[i-w]+1);if(x)d=Math.min(d,distance[i-w-1]+Math.SQRT2);if(x+1<w)d=Math.min(d,distance[i-w+1]+Math.SQRT2);}distance[i]=d;}
 for(let z=h-1;z>=0;z--)for(let x=w-1;x>=0;x--){const i=z*w+x;let d=distance[i];if(x+1<w)d=Math.min(d,distance[i+1]+1);if(z+1<h){d=Math.min(d,distance[i+w]+1);if(x)d=Math.min(d,distance[i+w-1]+Math.SQRT2);if(x+1<w)d=Math.min(d,distance[i+w+1]+Math.SQRT2);}distance[i]=d;}
 return shoreField={w,h,wet,distance};
}
function shoreDistance(x,z){const f=waterDistances(),a=Math.round(x),b=Math.round(z);return a<0||b<0||a>=f.w||b>=f.h?0:f.distance[b*f.w+a];}
function cachedLandWater(x,z){const f=waterDistances();return x<0||z<0||x>=f.w||z>=f.h?true:!!f.wet[z*f.w+x];}
function landBase(x,z){const ridge=Math.exp(-Math.pow((x-185)/27,2))*7*(.65+.35*Math.cos(z*.045));return 2.4+1.5*Math.sin(x*.052)*Math.cos(z*.061)+1.1*Math.sin(z*.026+x*.019)+ridge;}
function shoreHeight(x,z){return Math.max(0,Math.min(landBase(x,z),shoreDistance(x,z)*.40));}
function foundationLevel(b){if(foundationLevels.has(b))return foundationLevels.get(b);let level=Infinity;for(let z=Math.floor(b.y-.7);z<=Math.ceil(b.y+b.h+.7);z++)for(let x=Math.floor(b.x-.7);x<=Math.ceil(b.x+b.w+.7);x++)level=Math.min(level,shoreHeight(x,z));level=Math.max(.03,level);foundationLevels.set(b,level);return level;}
function landNode(x,z){
 if(!inWorld())return 0;const key=x+':'+z;if(landHeights.has(key))return landHeights.get(key);
 const water=shoreDistance(x,z);if(!water){landHeights.set(key,-.22);return -.22;}
 let h=shoreHeight(x,z),weight=0,total=0,strength=0;
 for(const b of buildings){const dx=Math.max(b.x-.7-x,0,x-b.x-b.w-.7),dz=Math.max(b.y-.7-z,0,z-b.y-b.h-.7),d=Math.hypot(dx,dz);if(d>=8)continue;
  const foundation=foundationLevel(b);if(d===0){h=foundation;weight=0;break;}
  const t=d/8,blend=1-t*t*(3-2*t),w=blend/Math.max(.0001,d*d);weight+=w;total+=w*foundation;strength=Math.max(strength,blend);
 }
 if(weight)h=h*(1-strength)+total/weight*strength;
 h=Math.min(h,water*.45);landHeights.set(key,h);if(landHeights.size>70000)landHeights.delete(landHeights.keys().next().value);return h;
}
function landNormal(x,z){const a=landHeight(x-.2,z)-landHeight(x+.2,z),b=landHeight(x,z-.2)-landHeight(x,z+.2),length=Math.hypot(a,.4,b);return [a/length,.4/length,b/length];}
function landHeight(x,z){if(!inWorld())return 0;const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;return v>=u?landNode(ix,iz)*(1-v)+landNode(ix,iz+1)*(v-u)+landNode(ix+1,iz+1)*u:landNode(ix,iz)*(1-u)+landNode(ix+1,iz)*(u-v)+landNode(ix+1,iz+1)*v;}
const flatProject3=project3;
project3=function(x,y,z,v=view3d,cx=px+.5,cz=py+.5,w=screen.w,h=screen.h){return flatProject3(x,y+(v===view3d?landHeight(x,z)-walkSurfaceHeight(cx,cz):0),z,v,cx,cz,w,h);};
unproject3=function(sx,sy){const v=view3d,c=Math.cos(v.yaw),sn=Math.sin(v.yaw),u=(sx-screen.w/2)/v.zoom,screenD=(sy-screen.h*.54)/v.zoom,base=walkSurfaceHeight(px+.5,py+.5);let d=screenD/Math.sin(v.tilt);for(let i=0;i<24;i++){const x=px+.5+u*c+d*sn,z=py+.5-u*sn+d*c,next=(screenD+(walkSurfaceHeight(x,z)-base)*Math.cos(v.tilt))/Math.sin(v.tilt);if(Math.abs(next-d)<.0001){d=next;break;}d=d*.35+next*.65;}return {x:px+.5+u*c+d*sn,z:py+.5-u*sn+d*c};};
const flatFaceData=realmFaceData;
realmFaceData=function(data,points,color,normals,material,colors,uvs){const lifted=points.map(p=>[p[0],p[1]+landHeight(p[0],p[2]),p[2]]);return flatFaceData(data,lifted,color,material===4?points.map(()=>[0,1,0]):material>=1&&material<=3?points.map(p=>landNormal(p[0],p[2])):normals,material,colors,uvs);};
const flatIndexedData=realmIndexedData;
let packingLocalMesh=false;
realmIndexedData=function(data,mesh,m){if(packingLocalMesh)return flatIndexedData(data,mesh,m);const transform=Array.from(m);transform[7]+=landHeight(m[3],m[11]);return flatIndexedData(data,mesh,transform);};
// Ground an articulated object once; children inherit that root height.
// Sampling terrain separately for a hand or hair mesh made equipment float on hills.
function groundedPainter(r,x,z){
 const base=walkSurfaceHeight(x,z),out={face(points,color,normals,material,colors,uvs){r.face(points.map(p=>[p[0],p[1]+base-landHeight(p[0],p[2]),p[2]]),color,normals,material,colors,uvs);}};
 if(r.indexed)out.indexed=(mesh,m)=>{const matrix=Array.from(m);matrix[7]+=base-landHeight(m[3],m[11]);r.indexed(mesh,matrix);};
 return out;
}
// Fallback rendering uses the same raised terrain instead of a flat bitmap.
drawTerrainLayer3=function(){const r=canvasPainterRealm(ctx,project3),[mw,mh]=sceneSize(),corners=[[0,0],[screen.w,0],[0,screen.h],[screen.w,screen.h]].map(p=>unproject3(...p));const minx=Math.max(inWorld()?-128:0,Math.floor(Math.min(...corners.map(p=>p.x)))-10),maxx=Math.min(inWorld()?mw+128:mw,Math.ceil(Math.max(...corners.map(p=>p.x)))+10),minz=Math.max(inWorld()?-128:0,Math.floor(Math.min(...corners.map(p=>p.z)))-10),maxz=Math.min(inWorld()?mh+128:mh,Math.ceil(Math.max(...corners.map(p=>p.z)))+10);for(let z=minz;z<maxz;z++)for(let x=minx;x<maxx;x++){const t=terrainType(x,z);r.face([[x,0,z],[x,0,z+1],[x+1,0,z+1],[x+1,0,z]],['#628047','#aa956e','#989e8a','#427e89'][t]);}r.flush();};
// Goblins have their own anatomy and motion, independent of the human avatar mesh.
function goblinRealm3(r,x,z,heading,walk,attack,size=1){const c=Math.cos(heading),sn=Math.sin(heading),stride=Math.sin(walk),bob=Math.abs(stride)*.035,k=.85*size,root=([a,b,d])=>[x+(a*c+d*sn)*k,(b+bob)*k,z+(-a*sn+d*c)*k];const skin='#718747',dark='#526334',cloth='#69523b';
 const part=(a,b,d,w,h,depth,col,transform=root)=>profile3(r,a,b,d,w,h,depth,[[-.5,.45],[-.3,.85],[.15,1],[.38,.8],[.5,.3]],col,transform,12);
 // Short bowed legs, broad feet, hunched shoulders and unusually long forearms.
 for(const side of [-1,1]){const leg=p=>root([p[0],p[1]+Math.max(0,stride*side)*.07,p[2]+stride*side*.12]);part(side*.15,.30,0,.16,.5,.18,dark,leg);part(side*.16,.07,.12,.23,.12,.37,'#493d29',leg);const swing=stride*side*.12+(side===1?attack*.3:0);part(side*.35,.65,.10+swing,.16,.70,.17,skin);part(side*.36,.31,.16+swing,.20,.20,.18,skin);for(let finger=0;finger<3;finger++)part(side*.36+(finger-1)*.047,.22,.18+swing,.035,.14,.055,dark);}
 part(0,.84,-.06,.52,.68,.37,skin);part(0,.51,0,.46,.28,.37,cloth);part(0,1.10,.12,.31,.27,.28,skin);part(0,1.30,.19,.52,.45,.42,skin);part(0,1.22,.43,.19,.16,.25,dark);
 // Swept pointed ears and heavy brows give an immediately nonhuman silhouette.
 for(const side of [-1,1]){const ear=[[side*.20,1.40,.15],[side*.59,1.55,.02],[side*.30,1.18,.12],[side*.25,1.34,.22]];for(const tri of [[0,1,3],[1,2,3],[2,0,3]])r.face(tri.map(i=>root(ear[i])),skin);part(side*.115,1.36,.385,.18,.07,.07,dark);part(side*.115,1.31,.393,.063,.04,.035,'#ddb654');part(side*.115,1.31,.413,.018,.033,.012,'#1d2715');const tusk=[[side*.13,1.13,.37],[side*.10,1.26,.44],[side*.06,1.13,.40]];r.face(tusk.map(root),'#d9cd9c');}
 const weapon={face(p,col){r.face(p.map(root),col);}};beamArt(weapon,[.36,.30,.23],[.36,.55,.68],.037,'#65482e',7);profile3(weapon,.36,.62,.80,.22,.27,.27,[[-.5,.6],[0,1],[.5,.65]],'#747b6c',p=>p,7);
 return 1.6*size;
}
function npcDressRealm(r,headTransform,root,gear){if(!['bandit','warden'].includes(gear._kind))return;const local={face(p,col){r.face(p.map(v=>briarPoint(v,0,headTransform)),col);}},color=gear._kind==='warden'?'#454b53':'#443a35';
 // Open-front cowl, fitted face wrap and a separate short cloak.
 const rings=[[1.47,.20],[1.63,.22],[1.79,.20],[1.87,.10]];for(let j=0;j<rings.length-1;j++)for(let i=0;i<14;i++){const a=.65+i/14*(Math.PI*2-1.3),b=.65+(i+1)/14*(Math.PI*2-1.3),p=(angle,row)=>[Math.sin(angle)*rings[row][1],rings[row][0],Math.cos(angle)*rings[row][1]-.015];local.face([p(a,j),p(b,j),p(b,j+1),p(a,j+1)],color);}
 profile3(local,0,1.59,.115,.30,.115,.21,[[-.5,.75],[0,1],[.5,.85]],'#332d2a',p=>p,12);
 for(let i=0;i<8;i++){const a=-.26+i*.065,b=a+.065;const p=(v,y)=>[v*(y<1?1.3:1),y,-.18-(1.4-y)*.13+Math.sin(v*45)*.022];r.face([p(a,1.4),p(b,1.4),p(b,.66),p(a,.66)].map(v=>briarPoint(v,0,root)),color);}
}
const distinctCreatureBefore=creature3;
creature3=function(r,o,x,z){
 if(o.kind==='dummy'){
  r=groundedPainter(r,x,z);const wood=materialRealm(r,5),straw=materialRealm(r,13);beamArt(wood,[x,.02,z],[x,1.65,z],.09,'#6c5034',8);beamArt(wood,[x-.62,1.15,z],[x+.62,1.15,z],.07,'#81613d',8);
  for(const side of [-1,1])beamArt(wood,[x,.2,z],[x+side*.38,.03,z+.25],.06,'#5b4831',6);
  profile3(straw,x,1.06,z,.57,.69,.35,[[-.5,.8],[-.2,1],[.4,.95],[.5,.8]],'#afa071',p=>p,12);oval3(straw,x,1.57,z,.33,.35,.31,'#c2b484',p=>p,12);
  const color=o.tutorialRole==='magic-dummy'?'#796b9b':'#8a4938';for(const [radius,c]of [[.19,color],[.115,'#d2bd87'],[.045,color]]){const points=Array.from({length:24},(_,i)=>[x+Math.cos(i*Math.PI/12)*radius,1.09+Math.sin(i*Math.PI/12)*radius,z+.184+(1-radius)*.004]);straw.face(points,c);}
  return 1.85;
 }
 if(o.tutor){const role=o.tutor,colors={guide:[.29,.34,.29],woods:[.26,.37,.21],fishing:[.23,.37,.46],cooking:[.61,.54,.39],mining:[.29,.20,.13],combat:[.31,.33,.34],bank:[.31,.27,.40],worship:[.45,.47,.33],magic:[.35,.25,.45]},gear={_role:role,_cloth:colors[role],_frame:['fishing','bank','worship','magic'].includes(role)?'female':'male',_hair:['fishing','bank','magic'].includes(role)?1:2,weapon:role==='combat'?'bronzeSword':role==='magic'?'oakStaff':null,head:role==='combat'?'ironHelm':null,feet:'leatherBoots'};humanoid3(r,x,z,o.sprite%4,gear,Math.atan2(px-x,py-z),0,0);return 1.9;}
 if(o.kind==='goblin')return goblinRealm3(groundedPainter(r,x,z),x,z,Math.atan2(px-x,py-z),Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)>.02?time*8:0,Math.max(0,Math.sin(Math.min(1,(time-(o.attackAt||-9))/.4)*Math.PI)));return distinctCreatureBefore(['wolf','ridgewolf','rat','slime'].includes(o.kind)?groundedPainter(r,x,z):r,o,x,z);};
