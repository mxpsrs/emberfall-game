'use strict';
function organicLots(t,count){const lots=[],city=t.kind==='city',radius=city?27:13;let seed=[...t.id].reduce((a,c)=>a*31+c.charCodeAt(0),7)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let attempts=0;lots.length<count&&attempts<20000;attempts++){const angle=random()*Math.PI*2,r=Math.sqrt(random())*radius,x=Math.round(t.x+Math.cos(angle)*r-2),y=Math.round(t.y+Math.sin(angle)*r*.92-2);if(Math.hypot(x+2-t.x,y+2-t.y)<5)continue;if(t.capital&&x<t.x+8&&x+5>t.x-8&&y<t.y-19)continue;if(lots.some(([a,b])=>x<a+7.5&&x+7.5>a&&y<b+6.5&&y+6.5>b))continue;lots.push([x,y]);}if(lots.length!==count)throw new Error('Settlement layout could not fit '+t.id);return lots;}
const organicRoads=[];
function curveRoad(ax,az,bx,bz,width=1.1,paved=false){
 const points=planVillageLane([ax,az],[bx,bz]);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],normal=j=>{const before=points[Math.max(0,j-1)],after=points[Math.min(points.length-1,j+1)],dx=after[0]-before[0],dz=after[1]-before[1],len=Math.hypot(dx,dz)||1;return [-dz/len,dx/len];};organicRoads.push({a,b,na:normal(i-1),nb:normal(i),width,paved});}
}
const laneOccupancy=new Map();
function laneBlocked(x,z){const key=x+':'+z;if(laneOccupancy.has(key))return laneOccupancy.get(key);const bad=x<1||z<1||x>=sceneSizes.overworld[0]-1||z>=sceneSizes.overworld[1]-1||expandedWater(x,z)||worldScenes.overworld.buildings.some(b=>x+.5>b.x-.2&&x+.5<b.x+b.w+.2&&z+.5>b.y-.2&&z+.5<b.y+b.h+.2);laneOccupancy.set(key,bad);return bad;}
function planVillageLane(start,end){const sx=Math.floor(start[0]),sz=Math.floor(start[1]),ex=Math.floor(end[0]),ez=Math.floor(end[1]);if(sx===ex&&sz===ez)return [start,end];
 const key=(x,z)=>x+z*1152,origin=key(sx,sz),goal=key(ex,ez),cost=new Map([[origin,0]]),previous=new Map(),heap=[];
 const push=node=>{heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;};push({x:sx,z:sz,id:origin,g:0,f:0});let found=false;
 while(heap.length&&cost.size<70000){const a=pop();if(a.g>cost.get(a.id)+.001)continue;if(a.id===goal){found=true;break;}for(const [dx,dz]of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]]){const x=a.x+dx,z=a.z+dz,id=key(x,z);if(laneBlocked(x,z)||dx&&dz&&(laneBlocked(a.x+dx,a.z)||laneBlocked(a.x,a.z+dz)))continue;const bend=.055*(1+Math.sin(x*.14+z*.09)),g=a.g+(dx&&dz?1.4142:1)+bend;if(g<(cost.get(id)??Infinity)){cost.set(id,g);previous.set(id,a.id);push({x,z,id,g,f:g+Math.hypot(ex-x,ez-z)});}}}
 if(!found)throw new Error('No street route from '+start+' to '+end);
 const raw=[];for(let id=goal;id!==origin;id=previous.get(id))raw.push([id%1152+.5,Math.floor(id/1152)+.5]);raw.push([sx+.5,sz+.5]);raw.reverse();
 // Corner cutting gives the path a continuous edge while keeping it outside walls.
 let result=raw;for(let pass=0;pass<2;pass++){const next=[result[0]];for(let i=0;i<result.length-1;i++){const a=result[i],b=result[i+1];for(const t of [.25,.75]){const p=[a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t];if(!laneBlocked(Math.floor(p[0]),Math.floor(p[1])))next.push(p);}}next.push(result[result.length-1]);result=next;}
 const spaced=[result[0]];for(let i=1;i<result.length-1;i++)if(Math.hypot(result[i][0]-spaced.at(-1)[0],result[i][1]-spaced.at(-1)[1])>.8)spaced.push(result[i]);spaced.push(result.at(-1));return spaced;
}
function arrangeBriarhaven(world){const plan={inn:[30,32,11,10],shop:[49,35,9,8],forge:[63,30,11,10],realm_briarhaven_3:[30,63,9,8],realm_briarhaven_4:[54,65,9,7]};for(const b of world.buildings){const p=plan[b.service?.destination];if(p)Object.assign(b,{x:p[0],y:p[1],w:p[2],h:p[3]});}
 for(const o of world.objects){if(o.type==='elder'){Object.assign(o,{x:43,y:52,homeX:43,homeY:52,drawX:43,drawY:52});}if(['enemy','boss'].includes(o.type)&&o.x>28&&o.x<78&&o.y>28&&o.y<79){const x=83+(o.id%5)*4,y=65+(o.id%4)*5;Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});}}
}
const terrainBeforeOrganic=expandedTerrain;
expandedTerrain=function(x,z){if(!inWorld())return terrainBeforeOrganic(x,z);return expandedWater(x,z)?3:0;};
const setupBeforeOrganic=setupExpandedWorld;
setupExpandedWorld=function(){const resume={scene:s.sceneId,x:s.x,y:s.y,scale:s.worldScale};setupBeforeOrganic();if(organicRoads.length)return;const world=worldScenes.overworld;expandPhysicalWorld(world);arrangeBriarhaven(world);
 for(const b of world.buildings){if(!b.service)continue;const seg=Math.max(1,Math.round(b.w/2)),xx=b.x+(Math.floor(seg/2)+.5)*b.w/seg;b.service.x=Math.round(xx-.5);b.service.y=Math.round(b.y+b.h);}
 // One connected inter-town network; every lane is routed around real obstacles.
 const connected=[SETTLEMENTS.find(t=>t.id==='briarhaven')],remaining=SETTLEMENTS.filter(t=>t.id!=='briarhaven');
 while(remaining.length){let best=null;for(const a of connected)for(const b of remaining){const d=Math.hypot(a.x-b.x,a.y-b.y);if(!best||d<best.d)best={a,b,d};}curveRoad(best.a.x+.5,best.a.y+.5,best.b.x+.5,best.b.y+.5,1.3);connected.push(best.b);remaining.splice(remaining.indexOf(best.b),1);}
 for(const t of SETTLEMENTS){const local=world.buildings.filter(b=>b.settlement===t.id),junctions=[[t.x+.5,t.y+.5]];local.sort((a,b)=>Math.hypot(a.service.x-t.x,a.service.y-t.y)-Math.hypot(b.service.x-t.x,b.service.y-t.y));for(const b of local){const door=[b.service.x+.5,b.service.y+.5],join=junctions.reduce((best,p)=>Math.hypot(p[0]-door[0],p[1]-door[1])<Math.hypot(best[0]-door[0],best[1]-door[1])?p:best);curveRoad(...join,...door,.95,t.kind==='city');junctions.push(door);}}
 for(const [a,b]of [[[42.5,51.5],[42.5,105.5]],[[42.5,51.5],[28.5,63.5]],[[42.5,51.5],[165.5,24.5]],[[42.5,105.5],[165.5,135.5]]])curveRoad(...a,...b,1.15);
 clearStreetObstacles(world);plantSettlementGroves(world);populateWalkInRooms(world);landHeights.clear();landWater.clear();realmNavigation.clear();const resuming=resume.scale===3&&resume.scene==='overworld';restoreWalkInDoors(world,resuming?resume:null);if(resuming)activateScene('overworld',resume.x,resume.y,false);
};
function clearStreetObstacles(world){for(const o of world.objects){if(!['tree','ore','prop'].includes(o.type))continue;const conflicts=(x,z)=>world.buildings.some(b=>x>=b.x-1&&x<b.x+b.w+1&&z>=b.y-1&&z<b.y+b.h+1)||organicRoads.some(seg=>Math.abs((seg.a[0]+seg.b[0])/2-x)<3&&Math.abs((seg.a[1]+seg.b[1])/2-z)<3&&roadSegmentDistance(x+.5,z+.5,seg)<seg.width+.45);if(!conflicts(o.x,o.y))continue;let found=false;for(let radius=2;radius<=12&&!found;radius+=2)for(let i=0;i<16&&!found;i++){const x=Math.round(o.x+Math.cos(i*Math.PI/8)*radius),z=Math.round(o.y+Math.sin(i*Math.PI/8)*radius);if(!expandedWater(x,z)&&!conflicts(x,z)&&!world.objects.some(p=>p!==o&&p.x===x&&p.y===z)){Object.assign(o,{x,y:z,homeX:x,homeY:z,drawX:x,drawY:z});found=true;}}}}
function roadSegmentDistance(x,z,seg){const dx=seg.b[0]-seg.a[0],dz=seg.b[1]-seg.a[1],t=Math.max(0,Math.min(1,((x-seg.a[0])*dx+(z-seg.a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-seg.a[0]-dx*t,z-seg.a[1]-dz*t);}
const realmCrossingsBeforeOrganic=drawRealmCrossings;
drawRealmCrossings=function(r){realmCrossingsBeforeOrganic(r);for(const seg of organicRoads){const x=(seg.a[0]+seg.b[0])/2,z=(seg.a[1]+seg.b[1])/2;if(Math.abs(x-px)>screen.w/view3d.zoom+20||Math.abs(z-py)>Math.hypot(screen.w,screen.h)/view3d.zoom+20)continue;const q=project3(x,0,z);if(q.x< -100||q.x>screen.w+100||q.y< -100||q.y>screen.h+100||expandedWater(x,z))continue;emitMesh3(r,cachedMesh3(seg,'prop',m=>{const dx=seg.b[0]-seg.a[0],dz=seg.b[1]-seg.a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,na=seg.na||[nx,nz],nb=seg.nb||[nx,nz],edge=p=>seg.width*(1+.10*Math.sin(p[0]*2.3+p[1]*1.7)),a=seg.a,b=seg.b,wa=edge(a),wb=edge(b);const along=Math.max(1,Math.ceil(len/.35)),across=Math.max(2,Math.ceil(Math.max(wa,wb)*2/.35));
const point=(t,u)=>{const xx=a[0]*(1-t)+b[0]*t,zz=a[1]*(1-t)+b[1]*t,nx=na[0]*(1-t)+nb[0]*t,nz=na[1]*(1-t)+nb[1]*t,w=wa*(1-t)+wb*t;return [xx+nx*w*(u*2-1),.065,zz+nz*w*(u*2-1)];};
for(let i=0;i<along;i++)for(let j=0;j<across;j++){const t=i/along,v=(i+1)/along,u=j/across,w=(j+1)/across;m.face([point(t,u),point(v,u),point(v,w),point(t,w)],'#aa9167',null,seg.paved?16:15,null,[[u,t],[u,v],[w,v],[w,t]]);}return .05;}));}
 for(const b of buildings){if(!b.service||b.archetype==='castle'||b.arch)continue;const q=project3(b.x,0,b.y);if(q.x< -150||q.x>screen.w+150||q.y< -200||q.y>screen.h+150)continue;const seg=Math.max(1,Math.round(b.w/2)),scale=b.w/seg/2,xx=b.x+(Math.floor(seg/2)+.5)*b.w/seg,open=typeof doorOpenFraction==='function'?doorOpenFraction(b.service):(b.service.openedAt===undefined?0:1);rebuiltPlace(r,'Door_1_Round',xx-.53*scale,0,b.y+b.h+.04,scale,-open*Math.PI*.52,scale*.85);}
};
let doorReturnUntil=0;
const engageBeforeDoors=engage;
engage=function(o){if(o.type!=='door'||!o.destination)return engageBeforeDoors(o);const p=route(o.x,o.y,false);if(p===null){toast('There is no clear path to this door.');return;}o.openedAt=time;target=o;path=p;elapsed=0;renderAction();if(!p.length&&Math.hypot(px-o.x,py-o.y)<.05)arrive();};
openBuilding3=function(b){if(b.walkIn){walkTo(b.service.x,b.service.y);return;}if(b.service?.destination)engage(b.service);};
const leaveBeforeDoors=leaveInterior;
leaveInterior=function(){doorReturnUntil=time+2;leaveBeforeDoors();};
function updateDoorThreshold(){if(!inWorld()||time<doorReturnUntil||target?.type==='door')return;const door=objects.find(o=>o.type==='door'&&o.destination&&o.openedAt!==undefined&&Math.hypot(px-o.x,py-o.y)<.18);if(door)enterInterior(door);}

// Irregular groups of the existing tree assets frame towns and their approaches.
function plantSettlementGroves(world){let id=2400000;const occupied=new Set(world.objects.map(o=>o.x+':'+o.y));
 for(const town of SETTLEMENTS)for(let group=0;group<8;group++){
  const angle=group*2.399+town.x*.013,radius=(town.kind==='city'?65:26)+(group%3)*6,cx=town.x+Math.cos(angle)*radius,cz=town.y+Math.sin(angle)*radius;
  for(let n=0;n<5;n++){
   const x=Math.round(cx+Math.cos(n*2.399)*Math.sqrt(n)*2.2),y=Math.round(cz+Math.sin(n*2.399)*Math.sqrt(n)*2.2);id++;
   if(x<2||y<2||x>1149||y>765||expandedWater(x,y)||occupied.has(x+':'+y)||Math.hypot(s.x-x,s.y-y)<2)continue;
   if(world.buildings.some(b=>x>b.x-4&&x<b.x+b.w+4&&y>b.y-4&&y<b.y+b.h+4)||organicRoads.some(seg=>Math.abs(seg.a[0]-x)<6&&Math.abs(seg.a[1]-y)<6&&roadSegmentDistance(x+.5,y+.5,seg)<seg.width+2))continue;
   world.objects.push({id,type:'tree',name:town.kingdom==='khazdur'?'Mountain pine':'Old-growth oak',race:town.kingdom==='sylvaran'?'elf':town.kingdom==='khazdur'?'dwarf':'human',x,y,homeX:x,homeY:y,sprite:4,dead:0});occupied.add(x+':'+y);
  }
 }
}
