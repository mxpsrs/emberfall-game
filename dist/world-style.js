'use strict';
// Shared environment art. Building footprints, interactable IDs and routes are
// owned by the world simulation; these builders only replace visible geometry.
const worldStyle={
 human:{stone:'#a3a394',wood:'#67503b',trim:'#bc9d6c',roof:['#52606b','#796654','#8b513d'],cloth:'#788267'},
 elf:{stone:'#b4b7a2',wood:'#77735a',trim:'#c3bf92',roof:['#456d61','#4c746a','#52736c'],cloth:'#648e78'},
 dwarf:{stone:'#858e8c',wood:'#594e40',trim:'#ae9263',roof:['#4f5b63','#59636a','#606966'],cloth:'#9b7351'}
};
function worldRand(x,z=0){const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);}
function worldLocal(r,x,y,z,heading=0){const c=Math.cos(heading),s=Math.sin(heading);return {face(p,col,n,mat,colors,uv){r.face(p.map(a=>[x+a[0]*c+a[2]*s,y+a[1],z-a[0]*s+a[2]*c]),col,n?.map(a=>[a[0]*c+a[2]*s,a[1],-a[0]*s+a[2]*c]),mat,colors,uv);}};}
function worldModel(r,name,x,y,z,height=1,heading=0,tint,maxWidth=Infinity){const mesh=rebuiltModels['World_'+name];if(!mesh)return 0;const [lo,hi]=mesh.bounds,k=Math.min(height/(hi[1]-lo[1]),maxWidth/Math.max(hi[0]-lo[0],hi[2]-lo[2]));const c=Math.cos(heading),s=Math.sin(heading),cx=(lo[0]+hi[0])*.5*k,cz=(lo[2]+hi[2])*.5*k;rebuiltPlace(r,'World_'+name,x-cx*c-cz*s,y-lo[1]*k,z+cx*s-cz*c,k,heading,k,tint);return (hi[1]-lo[1])*k;}

// Tile courses follow the roof surface. Hips and curved eaves are geometry,
// with a bounded number of courses rather than multiplying tiny tiles forever.
function worldRoof(r,x,y,z,w,d,rise,color,{hip=false,curve=false}={}){
 const half=(w+.85)/2,depth=d+.85,rows=Math.ceil(half/.62),cols=Math.ceil(depth/.72),trim=materialRealm(r,5);
 const roofY=u=>y+rise*Math.pow(1-u,curve?1.65:1)+(curve?.30*Math.pow(u,8):0),inset=u=>hip?Math.min(depth*.23,half*.72)*(1-u):0;
 for(const side of [-1,1])for(let row=0;row<rows;row++){
  const u=row/rows,v=(row+1)/rows;
  for(let j=0;j<cols;j++){
   const at=(a,b)=>[x+side*half*a,roofY(a)+.035,z+(b-.5)*(depth-2*inset(a))];
   r.face([at(u,j/cols),at(u,(j+1)/cols),at(v,(j+1)/cols),at(v,j/cols)],shade3(color,.94+.10*worldRand(row*11+j,x)),null,17,null,[[0,0],[1,0],[1,1],[0,1]]);
  }
 }
 for(const side of [-1,1]){
  if(hip){
   for(let i=0;i<rows;i++){
    const a=i/rows,b=(i+1)/rows,count=Math.max(1,Math.ceil(half*2*b/.72));
    for(let j=0;j<count;j++){
     const at=(u,t)=>[x+(t-.5)*half*2*u,roofY(u)+.035,z+side*(depth/2-inset(u))];
     r.face([at(a,j/count),at(a,(j+1)/count),at(b,(j+1)/count),at(b,j/count)],shade3(color,.94+.08*worldRand(i,j)),null,17,null,[[0,0],[1,0],[1,1],[0,1]]);
    }
   }
  }else{
   const zz=z+side*d/2,points=[[x-half,y,zz],...Array.from({length:rows+1},(_,i)=>{const u=1-i/rows;return [x-half*u,roofY(u),zz];}),...Array.from({length:rows},(_,i)=>{const u=(i+1)/rows;return [x+half*u,roofY(u),zz];})];
   r.face(points,'#beb59b',null,7);
   for(const dir of [-1,1])for(let i=0;i<rows;i++)beamArt(trim,[x+dir*half*i/rows,roofY(i/rows),zz+side*.04],[x+dir*half*(i+1)/rows,roofY((i+1)/rows),zz+side*.04],.075,'#63513e',5);
   beamArt(trim,[x,y,zz+side*.055],[x,y+rise,zz+side*.055],.065,'#6e5a41',5);
  }
  beamArt(trim,[x-half,roofY(1),z+side*depth/2],[x+half,roofY(1),z+side*depth/2],.065,'#5c4a36',5);
 }
 for(const side of [-1,1])beamArt(trim,[x+side*half,roofY(1),z-depth/2],[x+side*half,roofY(1),z+depth/2],.085,'#594b3a',6);
 beamArt(materialRealm(r,6),[x,y+rise+.05,z-depth/2+inset(0)],[x,y+rise+.05,z+depth/2-inset(0)],.115,shade3(color,1.14),8);
}
function worldDormer(r,x,y,z,heading,palette){
 const q=worldLocal(r,x,y,z,heading),wood=materialRealm(q,5);
 box3(materialRealm(q,7),0,.35,0,1.65,.72,1.15,'#c2b89e');
 worldRoof(q,0,.71,0,1.8,1.45,.82,palette.roof[0]);
 windowRealm(q,0,.40,.594,.78,.60,palette.trim);
 for(const a of [-.8,.8])box3(wood,a,.33,.58,.085,.76,.085,palette.wood);
}
function worldHouseRoof(r,b,y,rise){
 if(b._castleCurtain)return y;
 const race=b.race||realmArtRace(b.x,b.y),p=worldStyle[race],x=b.x+b.w/2,z=b.y+b.h/2,v=b.variant||0;
 const roofRise=race==='elf'?Math.max(rise,b.w*.25):race==='dwarf'?Math.max(1.35,rise*.7):rise;
 worldRoof(r,x,y,z,b.w,b.h,roofRise,p.roof[v%3],{hip:race==='dwarf'||race==='human'&&v===4,curve:race==='elf'});
 const q=groundedPainter(r,x,z),wood=materialRealm(q,5),stone=materialRealm(q,18),front=b.y+b.h+.15;
 if(race==='human'&&b.w>=9&&b.archetype!=='castle'){
  worldDormer(q,x+b.w*.27,y+roofRise*.47,z-b.h*.13,Math.PI/2,p);
  worldDormer(q,x-b.w*.27,y+roofRise*.47,z+b.h*.17,-Math.PI/2,p);
 }
 for(const side of [-1,1]){
  const xx=x+side*(b.w/2-.13);
  if(race==='dwarf'){
   for(const zz of [b.y+.25,z,b.y+b.h-.25]){
    const rib=worldLocal(q,xx,0,zz),s=materialRealm(rib,18);
    s.face([[-.42,0,-.45],[.42,0,-.45],[.23,y-.22,-.26],[-.23,y-.22,-.26]],p.stone);
    s.face([[.42,0,-.45],[.42,0,.45],[.23,y-.22,.26],[.23,y-.22,-.26]],p.stone);
    s.face([[.42,0,.45],[-.42,0,.45],[-.23,y-.22,.26],[.23,y-.22,.26]],p.stone);
    s.face([[-.42,0,.45],[-.42,0,-.45],[-.23,y-.22,-.26],[-.23,y-.22,.26]],p.stone);
    box3(rib,0,y-.16,0,.64,.20,.70,p.trim);box3(rib,0,.20,0,.9,.35,.95,p.stone);
   }
  }else if(race==='elf'){
   for(const zz of [b.y+.1,b.y+b.h-.1]){
    const root=[[xx+side*.55,.05,zz],[xx+side*.18,.95,zz],[xx,y*.66,zz],[xx-side*.52,y+.75,zz],[xx-side*1.1,y+1.28,zz]];
    for(let i=0;i<root.length-1;i++)beamArt(wood,root[i],root[i+1],.16-i*.025,p.wood,9);
    rebuiltPlace(q,'Prop_Vine1',xx,1.1,zz,.85,side===1?Math.PI/2:0);
   }
  }else{
   for(const yy of [1.8,y-.12])beamArt(wood,[xx,yy,front],[xx-side*.66,yy-.60,front],.055,p.wood,5);
  }
 }
 const doorX=b.service?b.service.x+.5:x;
 if(!['castle','forge'].includes(b.archetype))for(const side of [-1,1])worldModel(q,'Lantern_Wall',doorX+side*1.12,1.75,front,.58,Math.PI);
 if(['hall','temple'].includes(b.archetype)){
  for(const side of [-1,1]){
   const a=doorX+side*2.3;
   box3(wood,a,2.05,front,.065,1.5,.085,p.wood);
   q.face([[a-.38,2.80,front+.065],[a+.38,2.80,front+.065],[a+.38,1.55,front+.065],[a,1.3,front+.065],[a-.38,1.55,front+.065]],p.cloth,null,13);
   q.face([[a,2.5,front+.07],[a+.18,2.20,front+.07],[a,1.92,front+.07],[a-.18,2.20,front+.07]],p.trim,null,13);
  }
 }
 return y+roofRise;
}
function worldCastle(r,b){
 const height=rebuiltHouse(r,{...b,_castleCurtain:true});if(b._cutaway)return height;
 const race=b.race||'human',p=worldStyle[race],q=groundedPainter(r,b.x+b.w/2,b.y+b.h/2),stone=materialRealm(q,18),segments=Math.max(1,Math.round(b.w/2)),baseY=2.65*(b.w/segments/2);
 const rad=Math.min(2.3,b.w*.065),h=baseY+4.2;
 // A keep, courtyard and crenellated perimeter replace the warehouse-sized roof.
 // All supports sit on the existing perimeter; the walkable room stays clear.
 const kx=b.x+b.w*.5,kz=b.y+b.h*.36,kw=b.w*.43,kd=b.h*.48,keepTop=baseY+3.9;
 box3(stone,kx,baseY+1.95,kz,kw,3.9,kd,p.stone);
 worldRoof(q,kx,keepTop,kz,kw+.15,kd+.15,race==='elf'?3.7:2.8,p.roof[0],{hip:race==='dwarf',curve:race==='elf'});
 for(const side of [-1,1]){
  for(let i=1;i<5;i++){const xx=kx-kw/2+i*kw/5;windowRealm(q,xx,baseY+2.5,kz+side*(kd/2+.015),.58,1.43,p.trim,true);}
  for(let i=0;i<Math.ceil(b.w/1.4);i++)box3(stone,b.x+.5+i*(b.w-1)/Math.ceil(b.w/1.4),baseY+.27,b.y+(side===1?b.h:0),.65,.54,.55,p.stone);
  for(let i=0;i<Math.ceil(b.h/1.4);i++)box3(stone,b.x+(side===1?b.w:0),baseY+.27,b.y+.5+i*(b.h-1)/Math.ceil(b.h/1.4),.55,.54,.65,p.stone);
 }
 const doorX=b.service.x+.5,front=b.y+b.h+.12;
 for(const side of [-1,1]){
  box3(stone,doorX+side*1.15,1.5,front,.55,3,.46,p.stone);
  q.face([[doorX+side*2.5,2.5,front],[doorX+side*1.7,2.5,front],[doorX+side*1.7,1.18,front],[doorX+side*2.1,.92,front],[doorX+side*2.5,1.18,front]],p.cloth,null,13);
 }
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=b.x+(sx===1?b.w-rad:rad),z=b.y+(sz===1?b.h-rad:rad);
  profile3(stone,x,h/2,z,rad*2,h,rad*2,[[-.5,1.12],[-.44,1],[.37,1],[.43,1.12],[.5,1.12]],p.stone,a=>a,race==='dwarf'?8:16);
  for(const yy of [.35,h*.51,h-.3])profile3(stone,x,yy,z,rad*2.19,.20,rad*2.19,[[-.5,1],[.5,1]],p.stone,a=>a,16);
  if(race==='dwarf'){
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box3(stone,x+Math.cos(a)*rad,h+.24,z+Math.sin(a)*rad,.7,.62,.7,p.stone);}
  }else{
   profile3(materialRealm(q,6),x,h+1.32,z,rad*2.75,2.8,rad*2.75,[[-.5,1],[-.32,.9],[.04,.5],[.5,.015]],p.roof[0],a=>a,16);
   beamArt(q,[x,h+2.7,z],[x,h+3.55,z],.045,p.trim,6);
   q.face([[x,h+3.55,z],[x+1.0,h+3.42,z],[x+.8,h+2.98,z],[x,h+3.0,z]],p.cloth,null,13);
  }
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
   const win=worldLocal(q,x,0,z,angle);
   windowRealm(win,0,h-1.3,rad+.03,.45,1.20,p.trim,race==='elf');
  }
 }
 return h+(race==='dwarf'?.65:3.6);
}

const worldPropsBefore=prop3;
prop3=function(r,o,x,z){
 const name=o.name||'',race=o.race||realmArtRace(x,z),p=worldStyle[race];
 if(o.type==='forge'||o.type==='practiceForge'){
  return worldModel(groundedPainter(r,x,z),'Anvil_Log',x,0,z,.96);
 }
 if(o.type==='cache')return worldModel(groundedPainter(r,x,z),'Chest_Wood',x,0,z,.75);
 if(o.type==='camp')return worldFire(r,o,x,z);
 if(o.type==='prop'){
  const q=groundedPainter(r,x,z);let model,height;
  if(/Bookcase/i.test(name)){worldModel(q,'Bookcase_2',x,0,z,1.8);for(const yy of [.30,.78,1.28])worldModel(q,'BookGroup_Medium_1',x,yy,z+.03,.29);return 1.82;}
  if(/table/i.test(name)){
   const tool=/Tool|Smith/i.test(name),display=/Display/i.test(name),large=/Banquet/i.test(name),h=tool?.90:.78;
   worldModel(q,tool?'Workbench':large?'Table_Large':'Table_Large',x,0,z,h);
   if(tool){worldModel(q,'Pickaxe_Bronze',x-.32,h,z,.42,Math.PI/2);worldModel(q,'Bucket_Wooden_1',x+.34,.01,z+.18,.35);}
   else if(display){worldModel(q,'Potion_1',x-.34,h,z,.23);worldModel(q,'FarmCrate_Apple',x+.32,h,z,.23);}
   else{worldModel(q,'Table_Plate',x-.34,h,z,.035,0,null,.30);worldModel(q,'Mug',x+.30,h,z-.12,.17,0,null,.18);worldModel(q,'CandleStick',x,h,z,.29);}
   return h+.45;
  }
  if(/Altar/i.test(name)){
   const s=materialRealm(q,18);profile3(s,x,.44,z,1.35,.87,.78,[[-.5,1],[-.38,.78],[.30,.80],[.42,1],[.5,1]],p.stone,a=>a,8);
   worldModel(q,'BookStand',x,.88,z,.28,0,null,.58);for(const side of [-1,1])worldModel(q,'CandleStick',x+side*.49,.88,z,.38,0,null,.2);return 1.4;
  }
  if(/pillar/i.test(name)){profile3(materialRealm(q,18),x,1.5,z,.73,3,.73,[[-.5,1.25],[-.43,1],[-.39,.8],[.39,.8],[.43,1],[.5,1.25]],p.stone,a=>a,12);return 3;}
  if(/throne/i.test(name)){
   worldModel(q,'Chair_1',x,0,z,1.3);const w=materialRealm(q,5);box3(w,x,1.28,z-.24,.78,1.12,.12,p.wood);q.face([[x-.31,.9,z-.165],[x+.31,.9,z-.165],[x+.31,1.72,z-.165],[x,1.95,z-.165],[x-.31,1.72,z-.165]],p.cloth,null,13);for(const side of [-1,1])beamArt(q,[x+side*.37,.87,z-.17],[x+side*.37,1.96,z-.17],.035,p.trim,6);return 2.1;
  }
  if(name==='Merchant wagon'){worldModel(q,'Stall_Cart_Empty',x,0,z,1.55);worldModel(q,'FarmCrate_Apple',x,1.03,z,.28);return 1.58;}
  if(/Bed/i.test(name)){model=(o.id||0)%2?'Bed_Twin1':'Bed_Twin2';height=.82;}
  else if(/Barrel/i.test(name)){model='Barrel';height=.82;}
  else if(/Chair/i.test(name)){model='Chair_1';height=1.03;}
  else if(/Bench/i.test(name)){model='Bench';height=.48;}
  else if(/crate|supplies/i.test(name)){model='Crate_Wooden';height=.75;}
  else if(/sack|bag/i.test(name)){model='Pouch_Large';height=.48;}
  else if(/rack/i.test(name)){model='WeaponStand';height=1.3;}
  else if(/chest/i.test(name)){model='Chest_Wood';height=.75;}
  else if(/cart/i.test(name)){model='Stall_Cart_Empty';height=1.55;}
  if(model)return worldModel(q,model,x,0,z,height);
 }
 return worldPropsBefore(r,o,x,z);
};

function worldFire(r,o,x,z){
 const q=groundedPainter(r,x,z),brazier=/brazier/i.test(o.name),hearth=/hearth/i.test(o.name),y=brazier?.76:.22;
 const build=base=>{
  if(brazier){profile3(materialRealm(base,18),0,.37,0,.38,.72,.38,[[-.5,1.25],[-.35,1],[.30,.65],[.5,.95]],'#7f8379',p=>p,10);profile3(base,0,.77,0,.71,.27,.71,[[-.5,.6],[.5,1]],'#4d514c',p=>p,12);}
  else{for(let i=0;i<10;i++){const a=i/10*Math.PI*2;rebuiltPlace(base,'Rock_Medium_1',Math.cos(a)*.45,0,Math.sin(a)*.45,.085,a,.075);}for(const a of [-1,1])beamArt(materialRealm(base,5),[-.38,.14,a*.17],[.38,.14,-a*.17],.085,'#5c4431',8);}
  if(hearth){for(const side of [-1,1])box3(materialRealm(base,18),side*.58,.48,0,.24,.94,.65,'#8f9082');box3(materialRealm(base,18),0,1.04,0,1.4,.22,.72,'#a6a18e');}
  return 1.3;
 };
 if(q.indexed)cachedRealmShape(q,'world-fire:'+brazier+':'+hearth,briarTransform(x,0,z),build);else{const local=worldLocal(q,x,0,z);build(local);}
 for(let i=0;i<3;i++){
  const a=time*(3+i*.25)+i*2.1,dx=Math.sin(a)*.05+(i-1)*.09,h=.31+.11*Math.sin(time*5+i);
  profile3(materialRealm(q,19),x+dx,y+h*.5,z+Math.cos(a)*.05,.22,h,.20,[[-.5,.7],[-.25,1],[.20,.45],[.5,.015]],i===1?'#f2c982':'#d68b45',p=>p,7);
 }
 return hearth?1.25:brazier?1.45:.8;
}

// Irregular, stable clusters replace the visible three-metre decoration grid.
// A chunk is generated once and streamed with the camera; details never grow
// with the full continent size or change position while the player is moving.
const worldUnderstory=new Map();
function drawWorldUnderstory(r){
 if(!inWorld())return;const cell=8,range=Math.min(43,Math.max(18,screen.w/cameraZoom3()*.53));
 let drawn=0;
 for(let bz=Math.floor((py-range)/cell);bz<=Math.floor((py+range)/cell);bz++)for(let bx=Math.floor((px-range)/cell);bx<=Math.floor((px+range)/cell);bx++){
  const cx=bx*cell+4,cz=bz*cell+4,p=project3(cx,0,cz);if(p.x< -70||p.x>screen.w+70||p.y< -70||p.y>screen.h+70||drawn>=64)continue;
  const id=bx+':'+bz;let chunk=worldUnderstory.get(id);
  if(!chunk){chunk={};worldUnderstory.set(id,chunk);if(worldUnderstory.size>192)worldUnderstory.delete(worldUnderstory.keys().next().value);}
  emitMesh3(r,cachedMesh3(chunk,'prop',q=>{
   const race=kingdomAt(cx,cz).race;
   for(let i=0;i<5;i++){
    const cluster=worldRand(bx*5,bz+3);if(cluster<.35)continue;
    const ax=bx*cell+1+worldRand(bx*19,bz)*6,az=bz*cell+1+worldRand(bz*17,bx+8)*6;
    const x=ax+(worldRand(bx*3+i,bz)-.5)*3.2,z=az+(worldRand(bz*3+i,bx)-.5)*3.2;
    if(x<2||z<2||worldWaterDistance(x,z)<.55||roadInfluence(x,z)[0]>.13||buildings.some(b=>x>b.x-.8&&x<b.x+b.w+.8&&z>b.y-.8&&z<b.y+b.h+.8))continue;
    const seed=worldRand(x,z),rock=race==='dwarf'&&seed<.52;
    const name=rock?(i%2?'Rock_Medium_1':'Rock_Medium_3'):race==='elf'&&seed<.56?'Fern_1':cluster>.91&&i<2?'Flower_3_Group':'Grass_Wispy_Short';
    rebuiltPlace(q,name,x,0,z,rock?.12+seed*.3:.29+seed*.20,seed*6.28,rock?.12+seed*.3:.29+seed*.20,rock?null:[.72,.87,.68]);
    if(!rock&&seed>.6)rebuiltPlace(q,'Fern_1',x+.24,0,z-.18,.26,seed*4,.26,[.83,.96,.86]);
   }
   return 1;
  }));drawn++;
 }
}

let worldGardensReady=false;
const setupBeforeWorldStyle=setupExpandedWorld;
setupExpandedWorld=function(){
 setupBeforeWorldStyle();if(worldGardensReady)return;worldGardensReady=true;
 const world=worldScenes.overworld,used=new Set(world.objects.map(o=>o.x+':'+o.y));let count=0;
 for(const b of world.buildings){
  if(b.race!=='elf')continue;
  for(const side of [-1,1]){
   const x=Math.round(b.x+(side===1?b.w+4:-4)),y=Math.round(b.y+b.h*(.2+.55*worldRand(b.x,b.y+side)));
   if(used.has(x+':'+y)||worldWaterDistance(x,y)<4||roadInfluence(x,y)[0]>.08||world.buildings.some(a=>x>a.x-2&&x<a.x+a.w+2&&y>a.y-2&&y<a.y+a.h+2)||world.objects.some(o=>Math.hypot(x-o.x,y-o.y)<2))continue;
   world.objects.push({id:2800000+count++,type:'tree',x,y,drawX:x,drawY:y,name:'Silverwood tree',sprite:4,race:'elf',realmScenery:true,dead:0});used.add(x+':'+y);
  }
 }
 if(inWorld())objects.splice(0,objects.length,...world.objects);
 realmNavigation.clear();
};

// Organic forms use continuous surface normals, like the authored humans and
// nature meshes, rather than baking hard bands of light into every polygon.
function worldOrganic(r,x,y,z,w,h,d,color,material=14){
 const sides=12,rings=8,point=(a,b)=>[x+w*.5*Math.cos(a)*Math.sin(b),y+h*.5*Math.cos(b),z+d*.5*Math.sin(a)*Math.sin(b)];
 const normal=(a,b)=>{const v=[Math.cos(a)*Math.sin(b)/w,Math.cos(b)/h,Math.sin(a)*Math.sin(b)/d],len=Math.hypot(...v);return v.map(c=>c/len);};
 for(let row=0;row<rings;row++)for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,u=row/rings*Math.PI,v=(row+1)/rings*Math.PI;
  r.face([point(a,u),point(b,u),point(b,v),point(a,v)],color,[normal(a,u),normal(b,u),normal(b,v),normal(a,v)],material);
 }
}
function worldLimb(r,a,b,ra,rb,color,material=14){
 const axis=b.map((v,i)=>v-a[i]),len=Math.hypot(...axis);for(let i=0;i<3;i++)axis[i]/=len||1;
 let side=Math.abs(axis[1])<.9?[axis[2],0,-axis[0]]:[1,0,0];const length=Math.hypot(...side);side=side.map(v=>v/length);
 const out=[axis[1]*side[2]-axis[2]*side[1],axis[2]*side[0]-axis[0]*side[2],axis[0]*side[1]-axis[1]*side[0]],n=10;
 const normal=i=>side.map((v,k)=>v*Math.cos(i/n*Math.PI*2)+out[k]*Math.sin(i/n*Math.PI*2));
 const p=(t,i)=>normal(i).map((v,k)=>a[k]+(b[k]-a[k])*t+v*(ra+(rb-ra)*t));
 for(let i=0;i<n;i++)r.face([p(0,i),p(0,i+1),p(1,i+1),p(1,i)],color,[normal(i),normal(i+1),normal(i+1),normal(i)],material);
}
buildGoblinRealm3=function(r,x,z,heading,walk,attack,size=1,hurt=0){
 const q=worldLocal(r,x,0,z,heading),stride=Math.sin(walk),skin='#7d8960',shadow='#626f4d',vest='#69513c',iron='#9c9e8a';
 const scaled={face(p,c,n,m){q.face(p.map(v=>[v[0]*size,(v[1]-hurt*.025)*size,(v[2]-hurt*.05)*size]),c,n,m);}};
 const body=scaled,part=(p,w,h,d,c)=>worldOrganic(body,...p,w,h,d,c);
 // A squat, hunched scavenger: broad cranium, long forearms, narrow hips.
 part([0,.83,-.035],.53,.56,.35,skin);part([0,.64,0],.38,.29,.32,vest);
 for(const side of [-1,1]){
  const t=stride*side,hip=[side*.13,.63,-.015],knee=[side*.18,.35,.085+t*.08],foot=[side*.19,.09,.09+t*.16];
  worldLimb(body,hip,knee,.105,.086,vest);part(knee,.17,.19,.19,shadow);worldLimb(body,knee,foot,.072,.052,skin);part([foot[0],.075,foot[2]+.095],.22,.145,.34,shadow);
  for(const toe of [-1,0,1])part([foot[0]+toe*.063,.052,foot[2]+.24],.055,.05,.08,'#beb391');
 }
 part([0,1.08,.08],.28,.24,.27,skin);part([0,1.30,.14],.44,.44,.38,skin);
 part([0,1.15,.27],.32,.18,.29,shadow);part([0,1.30,.36],.12,.22,.20,skin);
 worldLimb(body,[-.11,1.144,.397],[.11,1.144,.397],.012,.012,'#343d28');
 for(const side of [-1,1]){
  part([side*.125,1.255,.292],.17,.15,.15,skin);
  const ear=[[side*.18,1.4,.085],[side*.49,1.47,-.015],[side*.28,1.19,.10],[side*.26,1.32,.17],[side*.26,1.33,.055]];
  for(const tri of [[0,1,3],[1,2,3],[2,0,3],[0,4,1],[1,4,2],[2,4,0]])body.face(tri.map(i=>ear[i]),tri.includes(3)?skin:shadow,null,14);
  body.face([[side*.235,1.37,.13],[side*.40,1.425,.035],[side*.29,1.27,.13]],'#929674',null,14);
  worldLimb(body,[side*.042,1.38,.298],[side*.175,1.377,.273],.032,.047,shadow);
  part([side*.105,1.337,.313],.085,.045,.041,'#b9aa72');part([side*.099,1.338,.332],.021,.035,.014,'#202a1d');
  const tusk=[side*.13,1.13,.375];worldLimb(body,tusk,[side*.114,1.25,.397],.025,.003,'#c9bd99');
  const shoulder=[side*.29,.965,-.03],angle=-stride*.33*side+(side===1?-attack*1.45:attack*.17),elbow=[side*.36,shoulder[1]-.29*Math.cos(angle),shoulder[2]-.29*Math.sin(angle)],bend=angle+.25+(side===1?attack*.72:0),hand=[side*.37,elbow[1]-.28*Math.cos(bend),elbow[2]-.28*Math.sin(bend)+.04];
  part(shoulder,.24,.25,.29,side===-1?vest:skin);worldLimb(body,shoulder,elbow,.088,.074,skin);part(elbow,.15,.16,.16,skin);worldLimb(body,elbow,hand,.088,.057,skin);part(hand,.145,.16,.145,skin);
  worldLimb(body,elbow.map((v,i)=>v*.18+hand[i]*.82),hand,.077,.069,vest);
  for(let i=0;i<3;i++)worldLimb(body,[hand[0]-.047+i*.045,hand[1]-.015,hand[2]+.059],[hand[0]-.047+i*.045,hand[1]-.061,hand[2]+.025],.019,.018,shadow);
  if(side===1){
   const tip=[hand[0],hand[1]+.11+attack*.38,hand[2]+.46-attack*.14];worldLimb(body,hand,tip,.026,.045,'#66523a',5);part(tip,.15,.22,.18,iron);
   for(const dx of [-1,1])worldLimb(body,[tip[0]+dx*.06,tip[1],tip[2]],[tip[0]+dx*.13,tip[1]+.06,tip[2]],.027,.003,iron);
  }
 }
 // Leather panels wrap the ribcage; seams and a pouch fit its anatomy.
 for(const side of [-1,1]){
  body.face([[side*.045,1.05,.12],[side*.21,1.00,.116],[side*.21,.70,.137],[side*.085,.66,.167]],vest,null,13);
  worldLimb(body,[side*.14,1.075,-.16],[side*.17,1.075,.12],.046,.038,vest,13);
  worldLimb(body,[side*.08,.73,.177],[side*.055,1.00,.164],.009,.009,'#a58b63',13);
 }
 profile3(materialRealm(body,13),0,.685,.015,.41,.068,.35,[[-.5,1],[.5,1]],'#433b2e',p=>p,12);
 box3(body,0,.685,.193,.072,.065,.025,'#b19b66');part([-.23,.66,-.09],.15,.23,.17,'#665642');
 return 1.52*size;
};

quadrupedArt=function(r,o,x,z,heading=Math.atan2(px-x,py-z),phase=time*9){
 const rat=o.kind==='rat',k=rat?.48:1,base=o.kind==='ridgewolf'?'#9caaa4':rat?'#817767':'#7e8980',pale=rat?'#a69c88':'#b5b8a1',q=worldLocal(r,x,0,z,heading),body={face(p,c,n,m){q.face(p.map(v=>v.map(c=>c*k)),c,n,m);}},part=(p,w,h,d,c)=>worldOrganic(body,...p,w,h,d,c),moving=Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)>.02;
 part([0,.60,-.03],.43,.47,1.12,base);part([0,.73,.31],.46,.55,.49,base);part([0,.66,.41],.30,.37,.27,pale);
 part([0,.91,.47],.31,.35,.39,base);part([0,.83,.70],.21,.15,.32,pale);part([0,.84,.864],.13,.087,.07,'#333e37');
 for(const side of [-1,1]){
  if(rat)part([side*.16,1.05,.45],.21,.23,.09,'#a39484');
  else{const ear=[[side*.075,1.04,.40],[side*.22,1.29,.35],[side*.22,1.00,.37],[side*.15,1.05,.51]];for(const tri of [[0,1,3],[1,2,3],[2,0,3]])body.face(tri.map(i=>ear[i]),base,null,14);body.face([[side*.10,1.04,.43],[side*.204,1.20,.39],[side*.20,1.035,.415]],'#b0ac97',null,14);}
  part([side*.131,.938,.596],.039,.044,.035,'#283a2d');
  for(const end of [-1,1]){
   const t=moving?Math.sin(phase+(side===end?0:Math.PI)):0,hip=[side*.18,.59,end*.34],knee=[side*.185,.34,end*.36+t*.12],ankle=[side*.19,.10,end*.35+t*.22];
   worldLimb(body,hip,knee,.091,.053,base);worldLimb(body,knee,ankle,.048,.032,base);part([ankle[0],.075,ankle[2]+.055],.125,.13,.20,pale);
  }
 }
 worldLimb(body,[0,.57,-.48],[.02,.46,-.78],rat?.025:.10,rat?.025:.07,base);worldLimb(body,[.02,.46,-.78],[.10,.25,-1.02],rat?.025:.07,.012,rat?'#a59887':pale);
 return (rat?1.18:1.3)*k;
};

const worldCreatureBefore=creature3;
const worldBoneOrigins=rebuiltAvatars.male.rig.names.map((name,i)=>{
 const m=rebuiltAvatars.male.rig.bind.subarray(i*12,i*12+12);
 return [[1,0,0],[0,1,0],[0,0,1]].map(axis=>{const v=briarNormal(axis,0,m);return -(v[0]*m[3]+v[1]*m[7]+v[2]*m[11]);});
});
function worldSkeleton(r,clip,phase){
 const a=rebuiltAvatars.male,frame=Math.round(phase*(a.clips[clip].frames-1)),pose=realmSkeletonPose(a,clip,frame,1,'swordIdle',0),bone='#b6b09a',dark='#797b69';
 const at=name=>{const i=a.rig.names.indexOf(name);return briarPoint(worldBoneOrigins[i],0,pose.subarray(i*12,i*12+12));};
 const attached=name=>{const i=a.rig.names.indexOf(name),m=pose.subarray(i*12,i*12+12);return {face(p,c,n,mat){r.face(p.map(v=>briarPoint(v,0,m)),c,n?.map(v=>briarNormal(v,0,m)),mat);}};};
 for(const side of ['l','r']){
  for(const [start,end,radius]of [['thigh','calf',.034],['calf','foot',.022],['upperarm','lowerarm',.026],['lowerarm','hand',.019]]){
   const p=at(start+'_'+side),q=at(end+'_'+side);worldLimb(r,p,q,radius,radius*.72,bone);worldOrganic(r,...p,radius*2.8,radius*2.8,radius*2.8,bone);
  }
  worldLimb(r,at('clavicle_'+side),at('upperarm_'+side),.022,.027,bone);
  const foot=at('foot_'+side),ball=at('ball_'+side);worldLimb(r,foot,ball,.025,.040,bone);
  for(const finger of ['thumb','index','middle','ring','pinky'])for(let i=1;i<3;i++)worldLimb(r,at(finger+'_0'+i+'_'+side),at(finger+'_0'+(i+1)+'_'+side),.008,.007,bone);
 }
 worldLimb(r,at('pelvis'),at('spine_03'),.031,.027,bone);worldLimb(r,at('spine_03'),at('Head'),.027,.023,bone);
 const pelvis=attached('pelvis');
 for(const side of [-1,1])worldOrganic(pelvis,side*.10,.91,-.03,.15,.18,.20,bone);
 const ribs=attached('spine_02');
 for(let row=0;row<5;row++){
  const y=1.10+row*.056,rx=.145+Math.sin(row/5*Math.PI)*.034;
  for(const side of [-1,1])for(let i=0;i<7;i++){
   const point=t=>[side*Math.sin(t)*rx,y+.018*Math.sin(t),-.03+Math.cos(t)*.11];
   worldLimb(ribs,point(i/7*Math.PI),point((i+1)/7*Math.PI),.012,.012,bone);
  }
 }
 worldLimb(ribs,[0,1.10,.082],[0,1.36,.082],.015,.019,bone);
 const head=attached('Head');worldOrganic(head,0,1.745,0,.275,.325,.26,bone);worldOrganic(head,0,1.635,.055,.20,.10,.19,bone);
 for(const side of [-1,1])worldOrganic(head,side*.063,1.75,.118,.071,.079,.039,'#323c35');
 head.face([[-.027,1.707,.140],[0,1.748,.145],[.027,1.707,.14]],dark,null,14);
 for(let i=0;i<6;i++)worldLimb(head,[-.075+i*.03,1.672,.147],[-.075+i*.03,1.642,.145],.011,.009,'#d0c7aa');
 fittedSwordRealm(r,pose.subarray(a.right*12,a.right*12+12),false);
 return 1.94;
}
creature3=function(r,o,x,z){
 if(o.kind==='skeleton'){
  const a=rebuiltAvatars.male,moving=Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)>.02,age=time-(o.attackAt??-9),attacking=age>=0&&age<a.clips.melee.duration,clip=attacking?'melee':moving?'walk':'swordIdle',phase=attacking?age/a.clips.melee.duration:moving?(time/a.clips.walk.duration)%1:0,quant=Math.round(phase*32)/32,q=groundedPainter(r,x,z),heading=Math.atan2(px-x,py-z);
  if(q.indexed)return cachedRealmShape(q,'world-skeleton:'+clip+':'+quant,briarTransform(x,0,z,1,heading),r=>worldSkeleton(r,clip,quant));
  return worldSkeleton(worldLocal(q,x,0,z,heading),clip,quant);
 }
 if(o.kind==='slime'){
  const q=groundedPainter(r,x,z),squash=.04*Math.sin(time*3.5+(o.id||0)),shape=local=>{
   worldOrganic(local,0,.31,0,.91,.64,.79,'#819b78');worldOrganic(local,0,.44,-.04,.52,.35,.49,'#99ad84');
   for(const side of [-1,1])worldOrganic(local,side*.14,.39,.346,.050,.065,.029,'#314b3a');return .72;
  };
  if(q.indexed)return cachedRealmShape(q,'world-slime',briarTransform(x,0,z,1-squash,0,1+squash),shape);
  return shape(worldLocal(q,x,0,z));
 }
 if(o.type==='spirit'){
  const colors=['#b89164','#779a9c','#b1a67b','#899b77'],q=groundedPainter(r,x,z),y=.60+Math.sin(time*2.5)*.045;
  worldOrganic(q,x,y,z,.32,.51,.31,colors[(o.sprite||0)%4],19);
  for(const side of [-1,1])worldOrganic(q,x+side*.056,y+.05,z+.151,.018,.033,.014,'#dae2bf',19);
  for(let i=0;i<2;i++){const a=time*.8+i*Math.PI;worldOrganic(q,x+Math.sin(a)*.27,y-.08,z+Math.cos(a)*.22,.047,.061,.047,'#b8c49b',19);}
  return 1.15;
 }
 return worldCreatureBefore(r,o,x,z);
};

const worldWallBefore=drawRealmWall;
drawRealmWall=function(r,x,z){
 const mine=currentScene==='mine'||realmSceneInfo.get(currentScene)?.kind==='mine';if(!mine)return worldWallBefore(r,x,z);
 const [width,depth]=sceneSize();
 if(x>0&&z>0&&x<width-1&&z<depth-1&&[[1,0],[-1,0],[0,1],[0,-1]].every(([a,b])=>worldWall(x+a,z+b)))return;
 const id=currentScene+':cave:'+x+':'+z;let key=realmArtWalls.get(id);if(!key){key={};realmArtWalls.set(id,key);if(realmArtWalls.size>400)realmArtWalls.delete(realmArtWalls.keys().next().value);}
 emitMesh3(r,cachedMesh3(key,'prop',q=>{
  const corner=(xx,zz)=>[xx,2.08+worldRand(xx,zz)*.42,zz],corners=[corner(x,z),corner(x+1,z),corner(x+1,z+1),corner(x,z+1)],rock=materialRealm(q,14),height=Math.max(...corners.map(p=>p[1]));
  rock.face([corners[0],corners[3],corners[2],corners[1]],'#747c6b');
  for(let side=0;side<4;side++){
   const a=corners[side],b=corners[(side+1)%4],dx=[0,1,0,-1][side],dz=[-1,0,1,0][side];if(x+dx>=0&&z+dz>=0&&x+dx<width&&z+dz<depth&&worldWall(x+dx,z+dz))continue;
   const center=[(a[0]+b[0])*.5+dx*.055,.85+worldRand(x+side,z)*.35,(a[2]+b[2])*.5+dz*.055],lowA=[a[0],0,a[2]],lowB=[b[0],0,b[2]];
   for(const [tri,color]of [[[lowA,center,lowB],'#677363'],[[lowA,a,center],'#7c8270'],[[a,b,center],'#828874'],[[center,b,lowB],'#727c69']])rock.face(tri,color);
  }
  if((x+z)%5===0){const wood=materialRealm(q,5);beamArt(wood,[x+.16,0,z+.5],[x+.16,2.18,z+.5],.09,'#67513a',8);beamArt(wood,[x+.16,1.55,z+.5],[x+.75,2.2,z+.5],.07,'#7d6549',6);}
  return height;
 }));
};
