'use strict';
// Continuous heightfield: geometry, camera, picking and characters share one surface.
const landHeights=new Map(),landWater=new Map();
function cachedLandWater(x,z){const key=x+":"+z;if(!landWater.has(key))landWater.set(key,terrainType(x,z)===3);return landWater.get(key);}
function landBase(x,z){const ridge=Math.exp(-Math.pow((x-185)/27,2))*7*(.65+.35*Math.cos(z*.045));return 2.4+1.5*Math.sin(x*.052)*Math.cos(z*.061)+1.1*Math.sin(z*.026+x*.019)+ridge;}
function landNode(x,z){if(!inWorld())return 0;const key=x+':'+z;if(landHeights.has(key))return landHeights.get(key);let h=landBase(x,z);
 // Each building has a level foundation, with an eased apron back to the hillside.
 let nearest=Infinity,foundation=h;for(const b of buildings){const dx=Math.max(b.x-.7-x,0,x-b.x-b.w-.7),dz=Math.max(b.y-.7-z,0,z-b.y-b.h-.7),d=Math.hypot(dx,dz);if(d<nearest){nearest=d;foundation=landBase(b.x+b.w/2,b.y+b.h/2);}}
 if(nearest<4){const t=Math.min(1,nearest/4),blend=t*t*(3-2*t);h=foundation*(1-blend)+h*blend;}
 // Rivers remain level; banks climb gradually from the waterline.
 let water=Infinity;for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++){const d=Math.hypot(dx,dz);if(d<water&&cachedLandWater(x+dx,z+dz))water=d;}
 h=Math.min(h,water*.72);if(cachedLandWater(x,z))h=0;landHeights.set(key,h);return h;
}
function landHeight(x,z){if(!inWorld())return 0;const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;return (landNode(ix,iz)*(1-u)+landNode(ix+1,iz)*u)*(1-v)+(landNode(ix,iz+1)*(1-u)+landNode(ix+1,iz+1)*u)*v;}
const flatProject3=project3;
project3=function(x,y,z,v=view3d,cx=px+.5,cz=py+.5,w=screen.w,h=screen.h){return flatProject3(x,y+(v===view3d?landHeight(x,z)-landHeight(cx,cz):0),z,v,cx,cz,w,h);};
unproject3=function(sx,sy){const v=view3d,c=Math.cos(v.yaw),sn=Math.sin(v.yaw),u=(sx-screen.w/2)/v.zoom,screenD=(sy-screen.h*.54)/v.zoom,base=landHeight(px+.5,py+.5);let d=screenD/Math.sin(v.tilt);for(let i=0;i<24;i++){const x=px+.5+u*c+d*sn,z=py+.5-u*sn+d*c,next=(screenD+(landHeight(x,z)-base)*Math.cos(v.tilt))/Math.sin(v.tilt);if(Math.abs(next-d)<.0001){d=next;break;}d=d*.35+next*.65;}return {x:px+.5+u*c+d*sn,z:py+.5-u*sn+d*c};};
const flatFaceData=realmFaceData;
realmFaceData=function(data,points,color,normals,material,colors,uvs){const lifted=points.map(p=>[p[0],p[1]+landHeight(p[0],p[2]),p[2]]);return flatFaceData(data,lifted,color,material>=1&&material<=4?null:normals,material,colors,uvs);};
const flatIndexedData=realmIndexedData;
let packingLocalMesh=false;
realmIndexedData=function(data,mesh,m){if(packingLocalMesh)return flatIndexedData(data,mesh,m);const transform=Array.from(m);transform[7]+=landHeight(m[3],m[11]);return flatIndexedData(data,mesh,transform);};
// Fallback rendering uses the same raised terrain instead of a flat bitmap.
drawTerrainLayer3=function(){const r=canvasPainterRealm(ctx,project3),[mw,mh]=sceneSize(),corners=[[0,0],[screen.w,0],[0,screen.h],[screen.w,screen.h]].map(p=>unproject3(...p));const minx=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))-10),maxx=Math.min(mw,Math.ceil(Math.max(...corners.map(p=>p.x)))+10),minz=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.z)))-10),maxz=Math.min(mh,Math.ceil(Math.max(...corners.map(p=>p.z)))+10);for(let z=minz;z<maxz;z++)for(let x=minx;x<maxx;x++){const t=terrainType(x,z);r.face([[x,0,z],[x,0,z+1],[x+1,0,z+1],[x+1,0,z]],['#628047','#aa956e','#989e8a','#427e89'][t]);}r.flush();};
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
creature3=function(r,o,x,z){if(o.kind==='goblin')return goblinRealm3(r,x,z,Math.atan2(px-x,py-z),Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)>.02?time*8:0,Math.max(0,Math.sin(Math.min(1,(time-(o.attackAt||-9))/.4)*Math.PI)));return distinctCreatureBefore(r,o,x,z);};
