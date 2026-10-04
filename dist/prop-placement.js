'use strict';
// One placement contract for every settlement, floor, tutorial room and worksite.
// Dimensions are in world units, in model-local X/Z; fronts point along local +Z.
const PROP_RULES={
 bookcase:{size:[1.05,.34],indoorOnly:true,requiresWall:true,anchors:['wall'],rooms:['library','study','magic','house','bedroom','office','council'],clearance:1},
 shelf:{size:[1.15,.48],indoorOnly:true,requiresWall:true,anchors:['wall'],rooms:['kitchen','house','shop','storage','pantry'],clearance:1},
 range:{size:[1.5,1.2],indoorOnly:true,requiresWall:true,anchors:['wall'],rooms:['kitchen','house'],clearance:1,required:true},
 hearth:{size:[1.45,1.0],indoorOnly:true,requiresWall:true,anchors:['fireplace-wall'],rooms:['house','bedroom','tavern','hall','study','kitchen','barracks'],clearance:1},
 bed:{size:[2.03,2.62],indoorOnly:true,requiresWall:true,anchors:['bedside'],rooms:['house','bedroom','guest','servant','barracks','cell'],clearance:1},
 rack:{size:[1.64,1.18],prefersWall:true,anchors:['wall','workbench'],rooms:['workshop','armory','guard','barracks','storage'],zones:['camp','workshop'],clearance:1},
 throne:{size:[.85,.65],indoorOnly:true,anchors:['focal-axis'],rooms:['hall','council'],clearance:1},
 altar:{size:[1.4,.85],prefersWall:true,anchors:['focal-axis','wall'],rooms:['chapel','temple','magic'],zones:['shrine'],clearance:1},
 counter:{size:[2.1,1.1],anchors:['shop-counter'],rooms:['bank','shop','tavern','office'],zones:['market'],clearance:1},
 table:{size:[2.75,1.1],anchors:['table'],rooms:['house','bedroom','guest','servant','barracks','tavern','hall','library','study','council','kitchen','pantry','cellar','supply','treasury','guard','bank','shop','office','storage','magic','workshop'],zones:['courtyard','market','workshop','camp','quarry','residential yard'],clearance:0},
 workbench:{size:[2.05,1.05],anchors:['workbench','wall'],rooms:['workshop','storage','kitchen','office'],zones:['workshop','quarry','dock','camp'],clearance:1},
 chair:{size:[.55,.52],anchors:['table','fireplace'],rooms:['house','bedroom','guest','servant','barracks','tavern','hall','library','study','council','kitchen','guard','bank','shop','office','magic'],zones:['market','courtyard','camp'],clearance:0},
 bench:{size:[2.5,.5],anchors:['table','courtyard-edge','roadside'],rooms:['hall','chapel','temple','tavern','guard','barracks'],zones:['plaza','courtyard','road edge','camp','residential yard'],clearance:1},
 storage:{size:[1.0,.85],anchors:['corner','wall','market-edge'],rooms:['house','bedroom','guest','servant','barracks','workshop','shop','tavern','kitchen','pantry','cellar','supply','treasury','guard','armory','cell','storage','bank','office','library','study'],zones:['market','quarry','dock','workshop','camp','farm','residential yard','courtyard'],clearance:1},
 barrel:{size:[.65,.65],anchors:['corner','wall','market-edge'],rooms:['house','workshop','shop','tavern','kitchen','pantry','cellar','supply','guard','storage','cell'],zones:['market','quarry','dock','workshop','camp','farm'],clearance:0},
 anvil:{size:[1.2,.9],anchors:['workbench'],rooms:['workshop'],zones:['workshop','quarry','camp'],clearance:1,required:true},
 furnace:{size:[1.5,1.3],prefersWall:true,anchors:['exterior-building-wall','workbench'],rooms:['workshop'],zones:['workshop','quarry'],clearance:1,required:true},
 lamp:{size:[.64,.64],outdoorOnly:true,anchors:['roadside','courtyard-edge'],zones:['road edge','plaza','courtyard','market','dock','workshop'],clearance:0,minSpacing:9},
 well:{size:[2.05,1.2],outdoorOnly:true,anchors:['plaza-center'],zones:['plaza','courtyard'],clearance:1},
 monument:{size:[2.5,2.5],outdoorOnly:true,anchors:['plaza-center'],zones:['plaza','courtyard'],clearance:1},
 stall:{size:[3.25,2.0],outdoorOnly:true,anchors:['market-edge'],zones:['market'],clearance:1},
 sign:{size:[1.5,.3],outdoorOnly:true,anchors:['roadside','exterior-building-wall'],zones:['road edge','plaza','market','quarry','camp'],clearance:1},
 planter:{size:[.65,.65],anchors:['corner','courtyard-edge'],rooms:['house','hall','study'],zones:['plaza','courtyard','residential yard'],clearance:0},
 cart:{size:[1.8,1.0],outdoorOnly:true,anchors:['roadside','market-edge','workbench'],zones:['quarry','market','dock','farm','workshop','camp'],clearance:1},
 logs:{size:[1,1.35],anchors:['corner','workbench'],rooms:['workshop','storage'],zones:['workshop','farm','camp','quarry'],clearance:0},
 fire:{size:[1.15,1.15],anchors:['camp-center','courtyard-edge'],rooms:['hall','chapel','temple','crypt','workshop'],zones:['camp','courtyard','workshop','shrine'],clearance:1},
 tent:{size:[4.2,3.2],outdoorOnly:true,anchors:['camp-edge'],zones:['camp'],clearance:1,maxSlope:1},
 bedroll:{size:[.75,1.7],anchors:['camp-edge'],zones:['camp'],clearance:1},
 barrier:{size:[2.1,.4],outdoorOnly:true,anchors:['fence-line'],zones:['camp','farm','workshop'],clearance:0},
 crane:{size:[5.8,1.8],modelCenter:[1,.7],outdoorOnly:true,anchors:['workbench'],zones:['quarry','dock','camp'],clearance:1},
 watchpost:{size:[2,2],outdoorOnly:true,anchors:['fence-line'],zones:['camp'],clearance:0},
 stoneStock:{size:[2,1.5],outdoorOnly:true,anchors:['workbench'],zones:['quarry','workshop'],clearance:0}
};
// Classification is data-driven; producers may set propKind directly.
const PROP_KINDS=[
 ['lamp',o=>o.streetLantern||o.name==='Square lantern'],['counter',o=>/counter|Serving table/.test(o.name||'')],
 ['bookcase',o=>/Bookcase/.test(o.name||'')],['shelf',o=>/shelf|cupboard|wardrobe/i.test(o.name||'')],
 ['range',o=>o.type==='range'],['hearth',o=>o.type==='camp'&&/hearth/i.test(o.name||'')],
 ['fire',o=>o.type==='camp'],['anvil',o=>['forge','practiceForge'].includes(o.type)],
 ['furnace',o=>o.type==='furnace'||o.workstation==='furnace'],['tent',o=>o.campModel==='tent'],
 ['bedroll',o=>o.campModel==='bedroll'],['barrier',o=>o.campModel==='palisade'],
 ['bed',o=>/^Bed$/.test(o.name||'')],['rack',o=>/rack/i.test(o.name||'')],
 ['throne',o=>/throne/i.test(o.name||'')],['altar',o=>/altar/i.test(o.name||'')],
 ['workbench',o=>/Tool table|Smith.*table|tool table/.test(o.name||'')],['table',o=>/\btable\b/i.test(o.name||'')],
 ['chair',o=>/Chair/.test(o.name||'')],['bench',o=>/Bench/.test(o.name||'')],
 ['well',o=>/well$/i.test(o.name||'')],['monument',o=>o.name==='Civic market monument'],
 ['stall',o=>/market stall/i.test(o.name||'')],['cart',o=>/cart|wagon/i.test(o.name||'')],
 ['barrel',o=>/barrel/i.test(o.name||'')],['logs',o=>/Log pile|Oak stock/.test(o.name||'')],
 ['sign',o=>/sign|noticeboard/i.test(o.name||'')],['planter',o=>/planter/i.test(o.name||'')],
 ['watchpost',o=>o.civilDecor==='goblinWatch'],['crane',o=>['crane','headframe'].includes(o.civilDecor)],['stoneStock',o=>o.civilDecor==='stoneStock'],
 ['storage',o=>/crate|supplies|chest|sack|stock|feed|store/i.test(o.name||'')]
];
const propPlacementRooms=new Map(),propPlacementReport={rooms:0,placed:0,removed:[],protected:0},propPlacementZones=new Map();
let propWorkPads=[],propSupportPads=[];
const propPadBuckets=new Map();
let propFootingsReady=false;
function propIndexPad(p){
 for(let y=Math.floor((p.y-p.ry-2)/16);y<=Math.floor((p.y+p.ry+2)/16);y++)for(let x=Math.floor((p.x-p.rx-2)/16);x<=Math.floor((p.x+p.rx+2)/16);x++){
  const key=x+':'+y;if(!propPadBuckets.has(key))propPadBuckets.set(key,[]);propPadBuckets.get(key).push(p);
 }
}
// Apply these existing small worksite footings after road/foundation smoothing.
// A one-node border keeps interpolated terrain flat across the whole prop base.
function propWorkFootingHeight(x,y,height){
 if(!propFootingsReady||currentScene!=='overworld')return height;
 if(globalThis.VeldrenQuarryScene?.enabled)return VeldrenQuarryScene.padHeight(x,y,height,true);
 const pads=propPadBuckets.get(Math.floor(x/16)+':'+Math.floor(y/16));if(!pads)return height;
 const quarryRamp=surfaceQuarries.some(q=>Math.abs(x-q.x)<3&&y>=q.y-9&&y<=q.y+q.ry+6);
 let result=height;
 // Broad authored work pads establish the site first; the tiny final support
 // then wins only beneath the prop itself so its feet cannot visibly tilt.
 for(const p of pads){
  if(p.supportOnly||quarryRamp)continue;const d=Math.max(Math.abs(x-p.x)-p.rx-1,Math.abs(y-p.y)-p.ry-1,0);if(d>=1)continue;
  const blend=1-d*d*(3-2*d);result=result*(1-blend)+p.height*blend;
 }
 let support=null,area=-1;
 for(const p of pads){if(!p.supportOnly)continue;const d=Math.max(Math.abs(x-p.x)-p.rx-1,Math.abs(y-p.y)-p.ry-1,0);if(d>=1)continue;const q=p.rx*p.ry;if(q>area){area=q;support=p;}}
 if(support){const d=Math.max(Math.abs(x-support.x)-support.rx-1,Math.abs(y-support.y)-support.ry-1,0),blend=1-d*d*(3-2*d);result=result*(1-blend)+support.height*blend;}
 return result;
}
const propGradeBefore=gradeLand;
gradeLand=function(x,y,height){
 const base=propGradeBefore(x,y,height);if(currentScene!=='overworld')return base;
 if(globalThis.VeldrenQuarryScene?.enabled)return VeldrenQuarryScene.padHeight(x,y,base);
 const pads=propPadBuckets.get(Math.floor(x/16)+':'+Math.floor(y/16));if(!pads)return base;
 // Worksite footings must never lower or raise the existing quarry access ramp.
 if(surfaceQuarries.some(q=>Math.abs(x-q.x)<3&&y>=q.y-9&&y<=q.y+q.ry+6))return base;
 let result=base;for(const p of pads){if(p.supportOnly)continue;const d=Math.max(Math.abs(x-p.x)-p.rx,Math.abs(y-p.y)-p.ry,0);if(d>=2)continue;const t=d/2,blend=1-t*t*(3-2*t);result=result*(1-blend)+p.height*blend;}return result;
};
function propPrepareWorkPads(){
 const add=(x,y,rx,ry,reason,quarry=null)=>propWorkPads.push({x,y,rx,ry,height:landHeight(x,y),reason,quarry});
 // Small work and shelter pads support their props; town footprints/roads stay intact.
 for(const [x,y]of [[85,90],[95,89],[102,89],[85,106],[96,110],[84,98]])add(x+.5,y+.5,2.3,2.3,'Packed-earth shelter footing');
 for(const q of surfaceQuarries){add(q.x+8,q.y+q.ry+7,7,6,'Level quarry loading apron',q.id);add(q.x-9,q.y+q.ry+12,5,4,'Quarry timber lifting pad',q.id);}
 for(const p of propWorkPads)propIndexPad(p);
 resetLandSurface();
}
// Ecology performs the final terrain pass after semantic prop placement. Add
// tiny, support-only pads beneath any outdoor footprint that the final pass
// left visibly tilted. They do not move the prop, alter roads, or grade the
// broader terrain; they only keep the rendered support surface level.
function propFinalizeSupportPads(){
 const saved={scene:currentScene,objects:[...objects],buildings:[...buildings],footingsReady:propFootingsReady},w=worldScenes.overworld,pending=[];
 // Measure the terrain exactly as players will see it, including the earlier
 // tent and quarry pads, before introducing any of these final supports.
 propFootingsReady=true;currentScene='overworld';(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(w.objects):objects.splice(0,objects.length,...w.objects));buildings.splice(0,buildings.length,...w.buildings);resetLandSurface();
 for(const o of w.objects){
  if(!o.placement||o.placement.room)continue;
  const box=propBox(o),cx=(box.left+box.right)/2,cy=(box.top+box.bottom)/2,samples=[[cx,cy],[box.left,box.top],[box.right,box.top],[box.left,box.bottom],[box.right,box.bottom]],heights=samples.map(([x,y])=>walkSurfaceHeight(x,y));
  if(!heights.every(Number.isFinite)||Math.max(...heights)-Math.min(...heights)<=.25)continue;
  pending.push({x:cx,y:cy,rx:(box.right-box.left)/2+.55,ry:(box.bottom-box.top)/2+.55,height:Math.min(...heights),reason:'Final terrain support for '+o.name,supportOnly:true,objectId:o.id});
 }
 propFootingsReady=saved.footingsReady;
 for(const p of pending){propWorkPads.push(p);propSupportPads.push(p);propIndexPad(p);}
 currentScene=saved.scene;(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(saved.objects):objects.splice(0,objects.length,...saved.objects));buildings.splice(0,buildings.length,...saved.buildings);resetLandSurface();
}
let propPlacementReady=false;
function propKind(o){if(o.propKind)return o.propKind;if(!['prop','range','camp','forge','practiceForge','furnace','cache'].includes(o.type))return null;return PROP_KINDS.find(([,match])=>match(o))?.[0]||null;}
function propEditorAuthored(o){const key=currentScene+':'+String(o.id),changes=globalThis.VeldrenWorldEdits?.state?.changes;return globalThis.VELDREN_AUTHORED_GENERATION?.has(key)||changes?.some(c=>c.scene===currentScene&&c.kind==='object'&&String(c.id)===String(o.id)&&!c.deleted);}
function propPinned(o){return !!propEditorAuthored(o)||!o.placementMovable&&!!(o.mainStoryKey||o.mountainKey||o.questModel||o.civilStair||o.workplace||o.penFence||o.lairEntrance||o.raiderCamp||['gate','tower','cellBars','brokenRamp','dummy','grove'].includes(o.civilDecor));}
function propDimensions(o,yaw=o.placement?.yaw??o.roomYaw??o.heading??0){const [w,d]=PROP_RULES[propKind(o)]?.size||[.8,.8],c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));return [w*c+d*s,d*c+w*s];}
function propBox(o,x=o.x,y=o.y,yaw=o.placement?.yaw??o.roomYaw??o.heading??0,offset=o.placement?.offset||[0,0]){const [w,d]=propDimensions(o,yaw),[cx,cy]=PROP_RULES[propKind(o)]?.modelCenter||[0,0];x+=offset[0]+cx*Math.cos(yaw)+cy*Math.sin(yaw);y+=offset[1]-cx*Math.sin(yaw)+cy*Math.cos(yaw);return {left:x+.5-w/2,right:x+.5+w/2,top:y+.5-d/2,bottom:y+.5+d/2};}
function propBoxesOverlap(a,b,gap=0){return a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;}
function propFrontBox(o,x=o.x,y=o.y,yaw=o.placement?.yaw??0){const d=PROP_RULES[propKind(o)],distance=d.size[1]/2+.8,fx=x+.5+Math.sin(yaw)*distance,fy=y+.5+Math.cos(yaw)*distance;return {left:fx-.25,right:fx+.25,top:fy-.25,bottom:fy+.25};}
function propCollisionTiles(o){
 if(!o.propKind||o.walkThrough)return [[o.x,o.y]];
 const b=propBox(o),cells=[];
 for(let y=Math.ceil(b.top-.7);y<=Math.floor(b.bottom-.3);y++)for(let x=Math.ceil(b.left-.7);x<=Math.floor(b.right-.3);x++)cells.push([x,y]);
 return cells.length?cells:[[o.x,o.y]];
}
function propRoomUsage(b){
 if(/bank/i.test(b.name))return 'bank';if(/kitchen/i.test(b.name))return 'kitchen';if(/magic|school/i.test(b.name))return 'magic';
 if(/records|stores|office/i.test(b.name))return 'office';return {inn:'tavern',forge:'workshop',shop:'shop',hall:'library',temple:'temple',castle:'hall'}[b.archetype]||'house';
}
function propRoomContexts(scene,w){
 const rooms=[];
 for(const b of w.buildings.filter(b=>b.walkIn&&b.service)){
  const threshold=doorThreshold(b.service),usage=propRoomUsage(b);
  const parts=b.briarDesign?b.briarDesign.volumes.filter(v=>!v.open&&v.w>=4&&v.h>=4).map((v,i)=>({name:b.name+(i?' · Wing '+i:''),...briarVolumeWorldRect(b,v),usage,door:[...threshold,b.doorFacing==='east'||b.doorFacing==='west'?'y':'x']})):b.civilRooms||[{name:b.name,x:b.x,y:b.y,w:b.w,h:b.h,usage,door:[...threshold,b.doorFacing==='east'||b.doorFacing==='west'?'y':'x']}];
  for(const r of parts)rooms.push({...r,id:scene+':'+b.service.destination+':'+r.name,building:b.service.destination,race:b.race||'human',outer:b,scene});
 }
 const floor=civilFloors.get(scene);
 if(floor)for(const r of floor.rooms)rooms.push({...r,id:scene+':'+r.name,building:null,race:floor.race||'human',scene});
 if(!rooms.length&&scene!=='overworld'&&scene!=='tutorial'&&!CREATURE_LAIRS[scene]&&!(typeof cavePassageKind==='function'&&cavePassageKind(scene))){
  const info=realmSceneInfo.get(scene),[width,height]=sceneSizes[scene]||[14,12];
  if(info||['inn','shop','forge','willowInn','willowShop','stoneInn','stoneShop'].includes(scene))rooms.push({id:scene,name:w.title||scene,x:0,y:0,w:width,h:height,usage:propRoomUsage(info?.building||{name:w.title||scene,archetype:info?.kind||(/inn/i.test(scene)?'inn':/forge/i.test(scene)?'forge':'shop')}),door:[...(w.entry||[Math.floor(width/2),height-2]),'x'],building:null,race:info?.race||'human',scene});
 }
 for(const r of rooms){r.center=[r.x+Math.floor(r.w/2),r.y+Math.floor(r.h/2)];r.doors=[r.door];r.contents=w.objects.filter(o=>o.type!=='door'&&(r.building?o.interiorBuilding===r.building&&!o.civilUpper:true)&&o.x>r.x&&o.x<r.x+r.w-1&&o.y>r.y&&o.y<r.y+r.h-1);propPlacementRooms.set(r.id,r);}
 return rooms;
}
function propFacing(x,y,point){return Math.atan2(point[0]-x,point[1]-y);}
function propCardinal(yaw){return Math.round(yaw/(Math.PI/2))*Math.PI/2;}
function propAnchor(type,x,y,yaw,reason,extra={}){return {type,x:Math.round(x),y:Math.round(y),yaw,reason,...extra};}
function propAssign(o,a,room,zone){
 civilMove(o,a.x,a.y);o.propKind=propKind(o);o.roomYaw=0;
 o.placement={anchor:a.type,yaw:a.yaw,offset:a.offset||[0,0],reason:a.reason,room:room?.id||null,roomType:room?.usage||null,zone:zone||null,wall:a.wall||null,target:a.target||null};
 delete o.collisionRadius;propPlacementReport.placed++;
}
function propRemove(w,o,reason){const i=w.objects.indexOf(o);if(i<0)return;w.objects.splice(i,1);propPlacementReport.removed.push({id:o.id,name:o.name,scene:currentScene,reason});}
function propDoorExclusion(r,box){
 const half=r.outer&&!r.outer.civilCastle? .8:1.6;
 return r.doors.some(([x,y,axis])=>propBoxesOverlap(box,{left:x+.5-(axis==='x'?half:1.75),right:x+.5+(axis==='x'?half:1.75),top:y+.5-(axis==='y'?half:1.75),bottom:y+.5+(axis==='y'?half:1.75)}));
}
function propWindowExclusion(r,o,a,box){
 if(!['bookcase','shelf','range','hearth','rack'].includes(propKind(o))||!r.outer||r.outer.civilCastle)return false;
 if(r.windowExclusions)return r.windowExclusions.some(w=>propBoxesOverlap(box,w));
 const b=r.outer,source=b.southPlan?{...b,...b.southPlan}:b,rotate=b.southPlan&&b.doorFacing!=='south'?buildingRotation(b):null;
 const windows=[],add=(x,z,half,axis)=>{
  const ends=axis==='x'?[[x-half,0,z],[x+half,0,z]]:[[x,0,z-half],[x,0,z+half]],p=ends.map(v=>rotate?briarPoint(v,0,rotate):v);
  windows.push({left:Math.min(p[0][0],p[1][0])-.4,right:Math.max(p[0][0],p[1][0])+.4,top:Math.min(p[0][2],p[1][2])-.4,bottom:Math.max(p[0][2],p[1][2])+.4});
 };
 const nx=Math.max(1,Math.round(source.w/2)),ny=Math.max(1,Math.round(source.h/2));
 for(const side of [-1,1]){
  for(let i=0;i<nx;i+=2)if(!(side===1&&i===Math.floor(nx/2)))add(source.x+(i+.5)*source.w/nx,source.y+(side===1?source.h:0),.45*source.w/nx/2,'x');
  for(let i=0;i<ny;i+=2)add(source.x+(side===1?source.w:0),source.y+(i+.5)*source.h/ny,.45*source.h/ny/2,'y');
 }
 r.windowExclusions=windows;return windows.some(w=>propBoxesOverlap(box,w));
}
function propRoomAisle(r,box){
 const [dx,dy]=r.door,[cx,cy]=r.center,px=(box.left+box.right)/2,py=(box.top+box.bottom)/2;
 // Connect the door to the room centre, leaving an open public circulation spine.
 const vertical=Math.abs(dy-cy)>=Math.abs(dx-cx),line=vertical?{left:cx+.02,right:cx+.98,top:Math.min(dy,cy),bottom:Math.max(dy,cy)+1}:{left:Math.min(dx,cx),right:Math.max(dx,cx)+1,top:cy+.02,bottom:cy+.98};
 if(propBoxesOverlap(box,line))return true;
 return r.usage==='hall'&&Math.abs(px-(cx+.5))<(box.right-box.left)/2+.8&&py>r.y+5;
}
function propWallAnchors(r,o){
 const d=PROP_RULES[propKind(o)],depth=d.size[1],offset=Math.ceil(depth/2+.53),out=[];
 const kind=d.anchors[0];
 for(let x=r.x+1;x<r.x+r.w-1;x++){
  out.push(propAnchor(kind,x,r.y+offset,0,'Against the north wall, facing the usable room',{wall:'north'}));
  out.push(propAnchor(kind,x,r.y+r.h-1-offset,Math.PI,'Against the south wall, facing the usable room',{wall:'south'}));
 }
 for(let y=r.y+1;y<r.y+r.h-1;y++){
  out.push(propAnchor(kind,r.x+offset,y,Math.PI/2,'Against the west wall, facing the usable room',{wall:'west'}));
  out.push(propAnchor(kind,r.x+r.w-1-offset,y,-Math.PI/2,'Against the east wall, facing the usable room',{wall:'east'}));
 }
 const gap=offset+.5-depth/2-(r.outer&&!r.outer.civilCastle? .22:1.12);
 for(const a of out)a.offset=[-Math.sin(a.yaw)*gap,-Math.cos(a.yaw)*gap];
 return out;
}
function propRoomAnchors(r,o,placed,fixed){
 const kind=propKind(o),rule=PROP_RULES[kind],[cx,cy]=r.center;
 if(kind==='chair')return placed.filter(t=>['table','counter','workbench'].includes(propKind(t))).flatMap(t=>{
  const [w,d]=propDimensions(t),dx=Math.ceil(w/2+.55),dy=Math.ceil(d/2+.55);
  return [[0,dy],[0,-dy],[dx,0],[-dx,0]].map(([x,y])=>propAnchor('table',t.x+x,t.y+y,propFacing(t.x+x,t.y+y,[t.x,t.y]),'Seating faces its table; the surrounding aisle stays open',{target:t.id}));
 });
 if(kind==='counter'){
  const staff=fixed.find(p=>['banker','shop','inn'].includes(p.type)||/banker|merchant|innkeeper/i.test(p.name||''));
  if(!staff)return [];
  const toward=propCardinal(propFacing(staff.x,staff.y,r.door)),directions=[toward,toward+Math.PI/2,toward-Math.PI/2,toward+Math.PI];
  const out=directions.map(a=>propAnchor('shop-counter',staff.x+Math.sin(a),staff.y+Math.cos(a),a,'Counter separates the attendant from the customer approach',{target:staff.id}));
  for(const [sx,sy,yaw]of [[r.x+2,cy,Math.PI/2],[r.x+r.w-3,cy,-Math.PI/2],[cx,r.y+2,0],[cx,r.y+r.h-3,Math.PI]])out.push(propAnchor('shop-counter',sx+Math.sin(yaw),sy+Math.cos(yaw),yaw,'Attendant and counter form an accessible service station beside the room aisle',{target:staff.id,staffAt:[sx,sy]}));
  return out;
 }
 if(kind==='throne'||kind==='altar'){
  const north=r.door[1]<=cy;
  return [propAnchor('focal-axis',cx,north?r.y+r.h-3:r.y+2,north?Math.PI:0,'The ceremonial focal point faces the entrance',{wall:north?'south':'north'})];
 }
 if(kind==='bench'){
  const focus=placed.find(p=>['altar','throne','hearth'].includes(propKind(p)));
  if(focus)return [-3,3].map(dx=>propAnchor('courtyard-edge',cx+dx,r.y+r.h-3,propCardinal(propFacing(cx+dx,r.y+r.h-3,[focus.x,focus.y])),'Seating faces the room focal point',{target:focus.id}));
 }
 if(rule.requiresWall||rule.prefersWall||['storage','barrel','logs','planter'].includes(kind))return propWallAnchors(r,o);
 if(kind==='table'||kind==='workbench'||kind==='anvil'){
  const hall=r.usage==='hall',out=[];
  for(const [x,y]of [[cx-3,cy],[cx+3,cy],[cx-3,r.y+3],[cx+3,r.y+3],[r.x+2,r.y+3],[r.x+r.w-3,r.y+3],[r.x+2,r.y+r.h-4],[r.x+r.w-3,r.y+r.h-4]])out.push(propAnchor(kind==='table'?'table':'workbench',x,y,hall?Math.PI/2:0,hall?'Long tables frame the great hall aisle':'Work or dining group beside the circulation spine'));
  return [...out,...(kind==='workbench'?propWallAnchors(r,o):[])];
 }
 if(kind==='fire')return [[r.x+3,r.y+3],[r.x+r.w-4,r.y+3]].map(([x,y])=>propAnchor('courtyard-edge',x,y,0,'Brazier lights the edge of the ceremonial or working area'));
 return [];
}
function propFitsRoom(r,o,a,placed,fixed,w){
 const rule=PROP_RULES[propKind(o)],box=propBox(o,a.x,a.y,a.yaw,a.offset||[0,0]);
 const margin=(r.outer&&!r.outer.civilCastle) ? .18 : 1.03;
 if(rule.outdoorOnly||!rule.rooms?.includes(r.usage)||box.left<r.x+margin||box.right>r.x+r.w-margin||box.top<r.y+margin||box.bottom>r.y+r.h-margin)return false;
 if(r.outer?.briarDesign&&r.outer.civilUpper&&!o.civilUpper){
  const upper=r.outer.civilUpper,ramp=upper.ramp;if(propBoxesOverlap(box,{left:ramp.x-.2,right:ramp.x+ramp.w+.2,top:ramp.y-.2,bottom:ramp.y+ramp.h+.2}))return false;
  if((rule.required||propKind(o)==='counter'||o.name==='Study table')&&upper.decks.some(d=>propBoxesOverlap(box,{left:d.x,right:d.x+d.w,top:d.y,bottom:d.y+d.h})))return false;
  if(a.staffAt&&!briarGroundServiceClear(r.outer,...a.staffAt))return false;
 }
 if(propWindowExclusion(r,o,a,box))return false;
 if(propDoorExclusion(r,box)||(propKind(o)!=='counter'&&propRoomAisle(r,box)))return false;
 const stairClear=w.objects.filter(p=>p.civilStair&&Math.abs(p.x-a.x)<5&&Math.abs(p.y-a.y)<5);
 if(stairClear.some(p=>propBoxesOverlap(box,{left:p.x-1,right:p.x+2,top:p.y-2,bottom:p.y+3})))return false;
 if(placed.some(p=>propBoxesOverlap(box,propBox(p),.16)))return false;
 if(fixed.some(p=>!(a.staffAt&&p.id===a.target)&&propBoxesOverlap(box,propPinned(p)?{left:p.x-.2,right:p.x+1.2,top:p.y-.2,bottom:p.y+1.2}:{left:p.x+.2,right:p.x+.8,top:p.y+.2,bottom:p.y+.8},.05)))return false;
 if(a.staffAt){const [x,y]=a.staffAt,staffBox={left:x+.2,right:x+.8,top:y+.2,bottom:y+.8};
  if(propDoorExclusion(r,staffBox)||stairClear.some(p=>propBoxesOverlap(staffBox,{left:p.x-1,right:p.x+2,top:p.y-2,bottom:p.y+3})))return false;
  if(placed.some(p=>propBoxesOverlap(staffBox,propBox(p),.2))||fixed.some(p=>p.id!==a.target&&Math.hypot(p.x-x,p.y-y)<1.4))return false;
 }
 if(rule.clearance){
  const depth=rule.size[1]/2+.65,fx=a.x+.5+(a.offset?.[0]||0)+Math.sin(a.yaw)*depth,fy=a.y+.5+(a.offset?.[1]||0)+Math.cos(a.yaw)*depth;
  if(fx<r.x+1||fx>r.x+r.w-1||fy<r.y+1||fy>r.y+r.h-1)return false;
  if(placed.some(p=>propBoxesOverlap({left:fx-.25,right:fx+.25,top:fy-.25,bottom:fy+.25},propBox(p))))return false;
 }
 // Do not fill another prop's interaction/front clearance with this candidate.
 for(const p of placed){const d=PROP_RULES[propKind(p)];if(!d.clearance)continue;const y=p.placement.yaw,dist=d.size[1]/2+.65,fx=p.x+.5+p.placement.offset[0]+Math.sin(y)*dist,fy=p.y+.5+p.placement.offset[1]+Math.cos(y)*dist;if(propBoxesOverlap(box,{left:fx-.25,right:fx+.25,top:fy-.25,bottom:fy+.25}))return false;}
 return true;
}
function propDressRoom(w,r){
 const movable=r.contents.filter(o=>propKind(o)&&!propPinned(o)),fixed=r.contents.filter(o=>!movable.includes(o)),placed=[];
 const priority={range:0,anvil:1,counter:2,throne:3,altar:3,bed:4,hearth:5,bookcase:6,rack:6,workbench:7,table:8,chair:10,bench:10};
 movable.sort((a,b)=>(priority[propKind(a)]??9)-(priority[propKind(b)]??9)||a.id-b.id);
 for(const o of movable){o.propKind=propKind(o);const rule=PROP_RULES[o.propKind],anchors=propRoomAnchors(r,o,placed,fixed);
  // Keep appropriate existing wall groups, with stable IDs; no random angles/tiles.
  if(rule.requiresWall||['storage','barrel'].includes(o.propKind))anchors.sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y));
  const a=anchors.find(a=>propFitsRoom(r,o,a,placed,fixed,w));
  if(!a){if(rule.required||o.mainStoryKey||o.mountainKey)throw new Error('No accessible '+o.name+' anchor in '+r.id);propRemove(w,o,'No compatible, clear '+o.propKind+' anchor in '+r.usage);continue;}
  propAssign(o,a,r);placed.push(o);if(a.staffAt){const staff=fixed.find(p=>p.id===a.target);civilMove(staff,...a.staffAt);staff.heading=a.yaw;}
 }
 r.props=placed;propPlacementReport.rooms++;
 for(const o of fixed.filter(o=>o.characterSprite)){
  const station=placed.find(p=>p.placement.target===o.id)||placed.filter(p=>['anvil','workbench','table','bookcase'].includes(propKind(p))).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];
  if(station){o.workstationId=station.id;o.heading=propFacing(o.x,o.y,[station.x,station.y]);}
 }
}
function propNearestRoad(x,y){let best=null,d=Infinity;for(const road of organicRoads){const distance=roadSegmentDistance(x+.5,y+.5,road);if(distance<d){best=road;d=distance;}}return best;}
function propRoadProjection(x,y,road){const dx=road.b[0]-road.a[0],dy=road.b[1]-road.a[1],l=Math.hypot(dx,dy)||1,t=Math.max(0,Math.min(1,((x-road.a[0])*dx+(y-road.a[1])*dy)/(l*l)));return {x:road.a[0]+dx*t,y:road.a[1]+dy*t,dx:dx/l,dy:dy/l};}
function propBridgeOverlap(box){return currentScene==='overworld'&&bridgesInRealm().some(b=>propBoxesOverlap(box,b._generatedBridge?globalThis.VeldrenBridgeScene.bounds(b,2):{left:b.x-(b.eastWest?b.span/2+2:b.width/2),right:b.x+(b.eastWest?b.span/2+2:b.width/2),top:b.z-(b.eastWest?b.width/2:b.span/2+2),bottom:b.z+(b.eastWest?b.width/2:b.span/2+2)}));}
function propTravelOverlap(box,scene=currentScene){
 if(scene!=='overworld')return false;
 if(propBridgeOverlap(box))return true;
 return organicRoads.some(r=>{if(box.right<Math.min(...[r.a[0],r.b[0]])-r.width||box.left>Math.max(...[r.a[0],r.b[0]])+r.width||box.bottom<Math.min(r.a[1],r.b[1])-r.width||box.top>Math.max(r.a[1],r.b[1])+r.width)return false;
  return [[box.left,box.top],[box.right,box.top],[box.left,box.bottom],[box.right,box.bottom],[(box.left+box.right)/2,(box.top+box.bottom)/2]].some(([x,y])=>roadSegmentDistance(x,y,r)<r.width+.35);
 });
}
function propOutdoorContext(o,w){
 const town=currentScene==='overworld'?SETTLEMENTS.reduce((a,t)=>!a||Math.hypot(t.x-o.x,t.y-o.y)<Math.hypot(a.x-o.x,a.y-o.y)?t:a,null):{id:'firstlight',x:44,y:54,kind:'village'};
 const kind=propKind(o),q=surfaceQuarries.find(q=>o.quarry===q.id),compatible={table:['inn'],workbench:['forge'],furnace:['forge'],anvil:['forge'],logs:['forge'],storage:['shop','inn','forge','hall'],barrel:['shop','inn','forge'],cart:['shop']}[kind];
 const candidates=w.buildings.filter(b=>b.service&&(!compatible||compatible.includes(b.archetype)));
 const b=w.buildings.find(b=>o.civilCourtyard&&o.civilCourtyard===b.service?.destination)||candidates.reduce((a,b)=>!a||Math.hypot(b.x+b.w/2-o.x,b.y+b.h/2-o.y)<Math.hypot(a.x+a.w/2-o.x,a.y+a.h/2-o.y)?b:a,null);
 let zone=q?'quarry':o.civilCourtyard?'courtyard':currentScene==='overworld'&&o.x>=81&&o.x<=110&&o.y>=85&&o.y<=113||o.campModel||o.raiderCamp?'camp':/farm/i.test(o.name||'')?'farm':/fishing/i.test(o.name||'')?'dock':Math.hypot(o.x-town.x,o.y-town.y)<15?'plaza':'residential yard';
 if(kind==='counter')zone='market';if(kind==='fire'&&!o.civilCourtyard)zone='camp';if(kind==='stall'||kind==='cart'&&!q)zone='market';else if(kind==='lamp'||kind==='sign')zone='road edge';else if(['anvil','furnace','workbench','logs','stoneStock'].includes(kind)&&!q)zone='workshop';else if(['storage','barrel'].includes(kind)&&zone==='plaza')zone='market';
 return {town,q,b,zone};
}
function propOutdoorAnchors(o,context,w){
 const kind=propKind(o),{town,b,q,zone}=context,rule=PROP_RULES[kind],out=[],reason='';
 if(kind==='counter'&&o.serviceOwner){
  const staff=w.objects.find(p=>p.id===o.serviceOwner);if(!staff)return out;
  const station=(sx,sy,yaw,move)=>propAnchor('shop-counter',sx+Math.sin(yaw),sy+Math.cos(yaw),yaw,'Public banking counter faces customers with the clerk behind it',{target:staff.id,...(move?{staffAt:[sx,sy]}:{})});
  for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI])out.push(station(staff.x,staff.y,yaw,false));
  // City avenues cross the old clerk position. Move the generated station as
  // a pair onto a nearby clear market edge, retaining authored placements.
  if(!propEditorAuthored(staff))for(let r=1;r<=8;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r)
   for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI])out.push(station(staff.x+dx,staff.y+dy,yaw,true));
  return out;
 }
 if(kind==='well'||kind==='monument'){
  const focal=o.civilCourtyard?[b.x+20,b.y+28]:kind==='well'&&w.objects.some(p=>p!==o&&propKind(p)==='monument'&&Math.hypot(p.x-town.x,p.y-town.y)<12)?[town.x-5,town.y+3]:[town.x,town.y];
  for(const [dx,dy]of [[0,0],[1,1],[-1,1],[1,-1],[-1,-1],[0,1],[1,0],[-1,0],[0,-1]])out.push(propAnchor('plaza-center',focal[0]+dx,focal[1]+dy,0,'Public water or monument is the planned civic focal point',{target:focal}));return out;
 }
 if(o.civilCourtyard&&kind==='storage')return [[7,36],[10,36],[37,36],[40,36]].map(([dx,dy])=>propAnchor('courtyard-edge',b.x+dx,b.y+dy,Math.PI,'Courtyard supplies line the service edge beyond the barracks, clear of the gate and hall axis'));
 if(kind==='stall'){
  const distance=town.kind==='city'?8:7;
  for(const [dx,dy]of [[-distance,-distance],[distance,-distance],[-distance,distance],[distance,distance]])for(const slide of [0,2,-2]){const x=town.x+dx+slide,y=town.y+dy;out.push(propAnchor('market-edge',x,y,dy<0?0:Math.PI,'Stall faces the market customer aisle, with loading behind',{target:[town.x,town.y]}));}
  for(const side of [-1,1])for(const dy of [-3,3])out.push(propAnchor('market-edge',town.x+side*distance,town.y+dy,-side*Math.PI/2,'Stall row fronts the side aisle of the square',{target:[town.x,town.y]}));return out;
 }
 if(kind==='lamp'||kind==='sign'||kind==='cart'){
  const road=currentScene==='overworld'?propNearestRoad(o.x,o.y):null;
  if(road){const p=propRoadProjection(o.x+.5,o.y+.5,road),offset=road.width+Math.max(...rule.size)/2+1.1;
   for(const along of [0,-3,3,-6,6])for(const side of [-1,1]){const x=p.x+p.dx*along-p.dy*offset*side-.5,y=p.y+p.dy*along+p.dx*offset*side-.5;out.push(propAnchor('roadside',x,y,kind==='cart'?Math.atan2(p.dx,p.dy):Math.atan2(p.dy*side,-p.dx*side),'Beside the road shoulder, outside the travel lane',{target:[p.x-.5,p.y-.5]}));}
  }else if(b?.service){const [dx,dy]=doorNormal(b.service);for(const side of [-1,1])out.push(propAnchor('exterior-building-wall',b.service.x+dy*side*3+dx*2,b.service.y-dx*side*3+dy*2,Math.atan2(dx,dy),'Entrance lighting or signage outside the clear doorstep'));}
  return out;
 }
 if(kind==='bench'||kind==='planter'){
  for(const [dx,dy]of [[-7,0],[7,0],[-5,-7],[5,7]])out.push(propAnchor('courtyard-edge',town.x+dx,town.y+dy,propCardinal(propFacing(town.x+dx,town.y+dy,[town.x,town.y])),'Frames the public space and faces its focal point',{target:[town.x,town.y]}));return out;
 }
 if(zone==='camp'){
  if(o.name==='Brambleclaw tent'){for(const [x,y]of [[85,90],[95,89],[102,89],[85,106],[96,110],[84,98]])out.push(propAnchor('camp-edge',x,y,propCardinal(propFacing(x,y,[95,100])),'Shelter opens toward the shared goblin fire, clear of the river crossing'));return out;}
  if(kind==='watchpost')return [[82,85],[107,98]].map(([x,y])=>propAnchor('fence-line',x,y,0,'Watch platform overlooks a camp approach without occupying the crossing'));
  out.push(propAnchor(rule.anchors[0],o.x,o.y,o.heading||0,'Supplies and defenses belong to the camp perimeter'));
  if(kind==='barrier')for(const [x,y]of [[85,86],[87,86],[89,86],[101,86],[103,86],[105,86],[109,91],[109,93],[99,110],[101,110],[103,110]])out.push(propAnchor('fence-line',x,y,y===91||y===93?Math.PI/2:0,'Defensive edge leaves the bridge and camp entrance open'));
  return out;
 }
 if(q){
  const target=[q.x,q.y+q.ry+5];
  const authored=o.civilDecor==='crane'?[8,3,0]:o.civilDecor==='headframe'?[-10,13,0]:kind==='stoneStock'?[12,12,0]:kind==='workbench'?[6,12,0]:kind==='storage'?[3,12,0]:null;
  if(authored)out.push(propAnchor('workbench',q.x+authored[0],q.y+q.ry+authored[1],authored[2],'Equipment and materials grouped on the level loading apron',{target}));
  out.push(propAnchor('workbench',o.x,o.y,propCardinal(propFacing(o.x,o.y,target)),'Equipment serves the quarry loading apron or cut face',{target}));
  for(const [dx,dy]of [[8,4],[12,4],[-8,5],[-12,5],[8,9],[-8,9],[q.rx+3,0]])out.push(propAnchor('workbench',q.x+dx,q.y+q.ry+dy,propCardinal(propFacing(q.x+dx,q.y+q.ry+dy,target)),'Level quarry loading apron, beside the ramp and hauling route',{target}));return out;
 }
 if(b?.service){
  const [dx,dy]=doorNormal(b.service),sx=b.service.x,sy=b.service.y;
  for(const side of [-1,1])for(const along of [3,5,7]){const x=sx+dy*along*side+dx*2,y=sy-dx*along*side+dy*2;out.push(propAnchor(kind==='furnace'?'exterior-building-wall':rule.anchors[0],x,y,Math.atan2(dx,dy),'Service or storage group along the working building frontage'));}
  // A busy shopfront is not a dumping ground: use an actual side/service yard.
  for(let x=b.x+2;x<b.x+b.w-1;x+=2)for(const [y,yaw]of [[b.y-2,Math.PI],[b.y+b.h+1,0]])out.push(propAnchor('exterior-building-wall',x,y,yaw,'Building service yard against the exterior wall; frontage stays open'));
  for(let y=b.y+2;y<b.y+b.h-1;y+=2)for(const [x,yaw]of [[b.x-2,-Math.PI/2],[b.x+b.w+1,Math.PI/2]])out.push(propAnchor('exterior-building-wall',x,y,yaw,'Building service yard against the exterior wall; frontage stays open'));
 }
 return out;
}
function propOutdoorRejection(o,a,context,w,occupied){
 const rule=PROP_RULES[propKind(o)],box=propBox(o,a.x,a.y,a.yaw),{zone}=context;
 if(a.staffAt){
  const [x,y]=a.staffAt,staffBox={left:x+.1,right:x+.9,top:y+.1,bottom:y+.9};
  if(water(x,y)||worldWall(x,y)||propTravelOverlap(staffBox))return 'staff access';
  if(w.buildings.some(b=>propBoxesOverlap(staffBox,{left:b.x-.15,right:b.x+b.w+.15,top:b.y-.15,bottom:b.y+b.h+.15})))return 'staff access';
  if(occupied.some(p=>p.id!==o.serviceOwner&&!p.walkThrough&&Math.abs(p.x-x)<8&&Math.abs(p.y-y)<8&&propBoxesOverlap(staffBox,propBox(p),.15)))return 'staff access';
 }
 if(rule.indoorOnly||!rule.zones?.includes(zone))return 'incompatible';
 if(propBridgeOverlap(box))return 'bridge';
 if(w.buildings.some(b=>propBoxesOverlap(box,{left:b.x-.15,right:b.x+b.w+.15,top:b.y-.15,bottom:b.y+b.h+.15})&&!(o.civilCourtyard===b.service?.destination)))return 'building';
 if(w.buildings.some(b=>b.service&&propBoxesOverlap(box,{left:b.service.x-1.25,right:b.service.x+2.25,top:b.service.y-1.25,bottom:b.service.y+2.25})))return 'door';
 if(!['well','monument'].includes(propKind(o))&&propTravelOverlap(box))return 'road';
 if(occupied.some(p=>!(a.staffAt&&p.id===o.serviceOwner)&&!p.walkThrough&&Math.abs(p.x-a.x)<8&&Math.abs(p.y-a.y)<8&&propBoxesOverlap(box,propBox(p),(o.serviceOwner===p.id ? .04 : .4))))return 'object';
 if(rule.clearance){const front=propFrontBox(o,a.x,a.y,a.yaw),fx=(front.left+front.right)/2,fy=(front.top+front.bottom)/2;
  if(water(Math.floor(fx),Math.floor(fy))||worldWall(Math.floor(fx),Math.floor(fy)))return 'front access';
  if(w.buildings.some(b=>b.service?.destination!==o.civilCourtyard&&propBoxesOverlap(front,{left:b.x,right:b.x+b.w,top:b.y,bottom:b.y+b.h})))return 'front access';
  if(occupied.some(p=>!(a.staffAt&&p.id===o.serviceOwner)&&!p.walkThrough&&Math.abs(p.x-fx)<8&&Math.abs(p.y-fy)<8&&propBoxesOverlap(front,propBox(p))))return 'front access';
 }
 if(occupied.some(p=>p.placement&&!p.placement.room&&PROP_RULES[propKind(p)]?.clearance&&Math.abs(p.x-a.x)<8&&Math.abs(p.y-a.y)<8&&propBoxesOverlap(box,propFrontBox(p))))return 'front access';
 if(w.entry&&Math.hypot(a.x-w.entry[0],a.y-w.entry[1])<1.5||currentScene==='overworld'&&Math.hypot(a.x-55,a.y-61)<1.2)return 'entry';
 if(rule.minSpacing&&occupied.some(p=>propKind(p)===propKind(o)&&Math.hypot(p.x-a.x,p.y-a.y)<rule.minSpacing))return 'density';
 const samples=[[box.left,box.top],[box.right,box.top],[box.left,box.bottom],[box.right,box.bottom],[a.x+.5,a.y+.5]],heights=[];
 for(const [x,y]of samples){if(water(Math.floor(x),Math.floor(y))||worldWall(Math.floor(x),Math.floor(y)))return 'terrain';heights.push(landHeight(x,y));}
 if(Math.max(...heights)-Math.min(...heights)>(rule.maxSlope||.55))return 'slope';
 return null;
}
function propFitsOutdoor(...args){return !propOutdoorRejection(...args);}
function propDressOutdoors(w,rooms){
 const interior=new Set(rooms.flatMap(r=>r.contents)),candidates=w.objects.filter(o=>!interior.has(o)&&!o.interiorBuilding&&propKind(o)&&!propPinned(o));
 const occupied=w.objects.filter(o=>!candidates.includes(o)&&!o.collected);
 candidates.sort((a,b)=>({monument:0,well:1,furnace:2,anvil:2,tent:3,stall:4,lamp:20}[propKind(a)]??10)-({monument:0,well:1,furnace:2,anvil:2,tent:3,stall:4,lamp:20}[propKind(b)]??10)||a.id-b.id);
 const focal=new Set();
 for(const o of candidates){const context=propOutdoorContext(o,w),kind=propKind(o),rule=PROP_RULES[kind];o.propKind=kind;
  const focalKey=(o.civilCourtyard||context.town.id)+':'+kind;
  if(['well','monument'].includes(kind)&&focal.has(focalKey)){propRemove(w,o,'Duplicate civic focal object');continue;}
  const anchors=propOutdoorAnchors(o,context,w),a=anchors.find(a=>propFitsOutdoor(o,a,context,w,occupied));
  if(!a){if(rule.required)throw new Error('No usable outdoor '+o.name+' anchor at '+o.x+','+o.y+' '+JSON.stringify(anchors.map(a=>[a.x,a.y,propOutdoorRejection(o,a,context,w,occupied)])));propRemove(w,o,'No compatible '+kind+' anchor outside entrances, roads and bridges');continue;}
  propAssign(o,a,null,context.zone);occupied.push(o);if(o.serviceOwner){const staff=w.objects.find(p=>p.id===o.serviceOwner);if(a.staffAt)civilMove(staff,...a.staffAt);staff.heading=a.yaw;staff.workstationId=o.id;}if(['well','monument'].includes(kind))focal.add(focalKey);
 }
 // Low-risk natural dressing still cannot occupy a bridge, doorstep or travel lane.
 for(const o of [...w.objects])if(!o.interiorBuilding&&!propPinned(o)&&['tree','crop'].includes(o.type)){
  const box={left:o.x+.05,right:o.x+.95,top:o.y+.05,bottom:o.y+.95};
  if(propBridgeOverlap(box)||w.buildings.some(b=>b.service&&Math.hypot(o.x-b.service.x,o.y-b.service.y)<2))propRemove(w,o,'Natural clutter obstructs a bridge or doorway');
 }
}
function propAnnotateAuthored(w,scene){
 for(const o of w.objects){if(propEditorAuthored(o)||!propPinned(o)||o.civilStair||o.workplace||o.penFence||o.lairEntrance||['gate','tower','cellBars'].includes(o.civilDecor))continue;
  const model=o.questModel||o.campModel;
  const anchor={papers:'table',ledger:'table',satchel:'camp-edge',courier:'battlefield',tracks:'trail',seal:'ritual',oathstone:'ritual',wardStatue:'shrine',waymarker:'roadside',tent:'camp-edge',bedroll:'camp-edge',palisade:'fence-line',cart:'loading-area',tools:'workbench'}[model]||'authored-quest';
  o.placementContext={anchor,reason:'Authored '+(o.mainStoryKey||o.mountainKey||o.name)+' scene; gameplay identity and approach retained',scene};propPlacementReport.protected++;
 }
}
const propSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){
 propSetupBefore();if(propPlacementReady)return;propPlacementReady=true;const saved={scene:currentScene,x:s.x,y:s.y},began=Date.now();currentScene='overworld';propPrepareWorkPads();
 for(const o of worldScenes.overworld.objects)if(o.name==='Goblin watch platform')o.civilDecor='goblinWatch';
 let counterId=8600000;for(const o of [...worldScenes.overworld.objects])if(o.name==='Civic banker')worldScenes.overworld.objects.push({id:counterId++,type:'prop',name:'Civic bank counter',propKind:'counter',serviceOwner:o.id,x:o.x,y:o.y+1,homeX:o.x,homeY:o.y+1,dead:0});
 for(const [scene,w]of Object.entries(worldScenes)){
  currentScene=scene;
  // Legacy decorative arches have no interaction/quest identity. Reject any
  // whose old footprint now intrudes into a usable building (Hollow Gate did).
  w.buildings=w.buildings.filter(b=>{const invalid=b.arch&&!b.service&&w.buildings.some(home=>home!==b&&home.walkIn&&propBoxesOverlap({left:b.x,right:b.x+b.w,top:b.y,bottom:b.y+b.h},{left:home.x,right:home.x+home.w,top:home.y,bottom:home.y+home.h}));if(invalid)propPlacementReport.removed.push({name:b.name,scene,reason:'Obsolete architectural dressing overlaps an inhabited building'});return !invalid;});
  for(const o of w.objects)if(o.mountainKey==='library_books'){o.propKind='bookcase';o.placementMovable=true;}
  const rooms=propRoomContexts(scene,w);for(const room of rooms)propDressRoom(w,room);
  if(scene==='overworld'||scene==='tutorial')propDressOutdoors(w,rooms);propAnnotateAuthored(w,scene);
 }
 currentScene=saved.scene;(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(worldScenes[currentScene].objects):objects.splice(0,objects.length,...worldScenes[currentScene].objects));buildings.splice(0,buildings.length,...worldScenes[currentScene].buildings);realmNavigation.clear();resetLandSurface();miniTerrain=null;worldObjectRevision++;
 propPlacementReport.setupMilliseconds=Date.now()-began;
 if(!land(saved.x,saved.y)){let point=null;for(let r=1;r<=12&&!point;r++)for(let dy=-r;dy<=r&&!point;dy++)for(let dx=-r;dx<=r&&!point;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r&&land(saved.x+dx,saved.y+dy))point=[saved.x+dx,saved.y+dy];if(point)activateScene(currentScene,...point,false);}
};
// Rotate every rendering branch once, including later-added stalls/camp models.
const propRenderBefore=prop3;
prop3=function(r,o,x,z){
 if(!o.placement)return propRenderBefore(r,o,x,z);
 x+=o.placement.offset[0];z+=o.placement.offset[1];
 const yaw=o.placement.yaw,source={...o,roomYaw:0,heading:0};let q=r;
 if(yaw){const m=affineMultiply(briarTransform(x,0,z,1,yaw),briarTransform(-x,0,-z));q={face(points,color,normals,material,colors,uvs){r.face(points.map(p=>briarPoint(p,0,m)),color,normals?.map(n=>[m[0]*n[0]+m[2]*n[2],n[1],m[8]*n[0]+m[10]*n[2]]),material,colors,uvs);}};if(r.indexed)q.indexed=(mesh,transform)=>r.indexed(mesh,affineMultiply(m,transform));}
 if(o.propKind==='well')source.name='Village well';
 if(o.propKind==='stall')source.briarhavenDetail=true;
 if(o.propKind==='counter')source.name='Bank counter';
 if(o.propKind==='shelf')source.name='Bookcase';
 if(o.propKind==='storage'&&o.name==='Stable feed')source.name='Supplies crate';
 if(o.propKind==='watchpost'){
  const p=groundedPainter(q,x,z),wood=materialRealm(p,5);for(const dx of [-.8,.8])for(const dz of [-.8,.8])box3(wood,x+dx,1.2,z+dz,.14,2.4,.14,'#71543c');box3(wood,x,2.1,z,2,.15,2,'#997951');for(const side of [-1,1])beamArt(wood,[x+side*.8,2.85,z-.8],[x+side*.8,2.85,z+.8],.07,'#71543c',5);for(let i=0;i<6;i++)box3(wood,x, .25+i*.31,z+.86,.7,.07,.12,'#997951');return 2.9;
 }
 if(o.mountainKey==='library_books'){
  const p=groundedPainter(q,x,z);worldModel(p,'Bookcase_2',x,0,z,1.8);for(const yy of [.3,.78,1.28])worldModel(p,'BookGroup_Medium_1',x,yy,z+.03,.29);return 1.82;
 }
 if(o.propKind==='table'&&['library','study','council','office','magic','bank'].includes(o.placement.roomType)){
  const p=groundedPainter(q,x,z);worldModel(p,'Table_Large',x,0,z,.78);worldModel(p,'BookStand',x-.35,.78,z,.35);worldModel(p,'BookGroup_Medium_1',x+.55,.78,z,.2);worldModel(p,'CandleStick',x+1,.78,z,.3);return 1.15;
 }
 return propRenderBefore(q,source,x,z);
};
