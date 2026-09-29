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
// Place an authored environment mesh around its own native centre.  This is
// deliberately uniform: doors, steps, tiles and trim retain the proportions
// Quaternius authored instead of becoming large, stretched stand-ins.
function environmentNative3(r,mesh,x,y,z,heading=0,scale=1){
 const [lo,hi]=mesh.bounds,c=Math.cos(heading),s=Math.sin(heading),cx=(lo[0]+hi[0])*.5*scale,cz=(lo[2]+hi[2])*.5*scale;
 briarEmit(r,mesh,briarTransform(x-cx*c-cz*s,y-lo[1]*scale,z+cx*s-cz*c,scale,heading,scale));
 return (hi[1]-lo[1])*scale;
}

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
const environmentRoofVariants=new Map();
const environmentRoofCatalog=['Roof_RoundTiles_4x4','Roof_RoundTiles_4x6','Roof_RoundTiles_4x8','Roof_RoundTiles_6x4','Roof_RoundTiles_6x6','Roof_RoundTiles_6x8','Roof_RoundTiles_6x10','Roof_RoundTiles_6x12','Roof_RoundTiles_6x14','Roof_RoundTiles_8x8','Roof_RoundTiles_8x10','Roof_RoundTiles_8x12','Roof_RoundTiles_8x14'];
function environmentRoofMesh3(race,name='Roof_RoundTiles_4x6',variant=0){
 const base=rebuiltModels[name]||rebuiltModels.Roof_RoundTiles_4x6,index=Math.abs(variant)%4;if(race==='human'&&index===0)return base;
 const key=race+':'+name+':'+index;if(environmentRoofVariants.has(key))return environmentRoofVariants.get(key);
 const human=['#52606b','#796654','#65705b'],hex=parseInt((race==='human'?human[index-1]:worldStyle[race].roof[index%worldStyle[race].roof.length]).slice(1),16),color=[hex>>16,(hex>>8)&255,hex&255].map(v=>v/255),c=new Float32Array(base.c.length);
 for(let i=0;i<c.length;i+=3){const light=.65+Math.max(base.f[i],base.f[i+1],base.f[i+2])*.55;for(let k=0;k<3;k++)c[i+k]=color[k]*light;}
 const mesh={...base,c,f:c,t:new Uint8Array(c.length/3).fill(12)};environmentRoofVariants.set(key,mesh);return mesh;
}
function environmentRoofChoice3(w,d){
 let best=null;
 for(const name of environmentRoofCatalog){const mesh=rebuiltModels[name];if(!mesh)continue;const [lo,hi]=mesh.bounds,mw=hi[0]-lo[0],md=hi[2]-lo[2];for(const turn of [0,Math.PI/2]){
  const rw=turn?md:mw,rd=turn?mw:md,scale=Math.max((w+.35)/rw,(d+.35)/rd),overhang=(rw*scale-w)+(rd*scale-d),score=Math.abs(Math.log(scale))*2+Math.max(0,scale-1.18)*8+overhang*.08;
  if(!best||score<best.score)best={name,turn,scale,score};
 }}return best;
}
function environmentRoofBays3(r,race,x,y,z,w,d,variant=0){
 const columns=Math.max(1,Math.ceil(w/10)),rows=Math.max(1,Math.ceil(d/14)),bw=w/columns,bd=d/rows;let top=y;
 for(let ix=0;ix<columns;ix++)for(let iz=0;iz<rows;iz++){
  const choice=environmentRoofChoice3(bw,bd),mesh=environmentRoofMesh3(race,choice.name,variant+ix+iz),cx=x-w/2+bw*(ix+.5),cz=z-d/2+bd*(iz+.5);
  top=Math.max(top,y+environmentNative3(r,mesh,cx,y,cz,choice.turn,choice.scale));
 }
 return top;
}
function worldHouseRoof(r,b,y,rise){
 if(b._castleCurtain)return y;
 const race=b.race||realmArtRace(b.x,b.y),p=worldStyle[race],x=b.x+b.w/2,z=b.y+b.h/2,v=b.variant||0;
 const roofRise=race==='elf'?Math.max(rise,b.w*.25):race==='dwarf'?Math.max(1.35,rise*.7):rise;
 let authoredTop=y;
 if(race==='dwarf'&&v%5===2){
  // A stone workshop terrace, using floor and battlement modules. Low parapets
  // sit entirely on the roof; they add no ground-level collision or clutter.
  environmentModule3(r,rebuiltModels.Floor_UnevenBrick,x,y,z,b.w,.16,b.h);
  for(const side of [-1,1]){
   environmentModule3(r,realmArtMesh('curtainWall','dwarf'),x,y,z+side*(b.h/2-.2),b.w,.65,.4);
   environmentModule3(r,realmArtMesh('curtainWall','dwarf'),x+side*(b.w/2-.2),y,z,b.h,.65,.4,Math.PI/2);
  }
 }else authoredTop=environmentRoofBays3(r,race,x,y,z,b.w+.45,b.h+.45,v+Math.floor(worldRand(b.x,b.y)*4));
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
    rebuiltLivingVine(q,xx,.45,zz,.85,side===1?Math.PI/2:0);
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
 if(b.settlement==='briarhaven'&&!b._cutaway){
  // Local planting ties the architecture into the denser verge instead of
  // leaving every house on an empty rectangular lawn.
  for(const side of [-1,1]){
   const xx=x+side*Math.max(1.15,b.w*.34),seed=worldRand(b.x+side,b.y);
   rebuiltPlace(q,seed>.45?'Flower_3_Group':'Fern_1',xx,.03,front+.38,.34+seed*.16,seed*6.28,.34+seed*.16,seed>.45?[.88,.82,.64]:[.69,.84,.66]);
   if(b.w>8)rebuiltPlace(q,'Grass_Wispy_Short',xx+side*.46,.02,front+.28,.52,seed*4.1,.46,[.63,.77,.53]);
  }
  if((b.variant||0)%2===1)rebuiltLivingVine(q,b.x+.28,.18,b.y+b.h+.19,.72,0);
  if(b.w>=8&&(b.variant||0)%3===0)rebuiltPlace(q,'Kenney_HangingMoss',x-b.w*.24,y-.86,front+.03,2.1,0,2.1,[.72,.83,.60]);
 }
 if(b.service?.destination==='realm_briarhaven_3'){
  const tower=realmArtMesh('tower','human');
  environmentModule3(q,tower,x,y+roofRise*.38,z-b.h*.22,5.0,11.4,5.0);
  // Four facets repeat the school's existing Relic symbol in the skyline.
  const cap=y+roofRise*.38+11.75;
  for(let i=0;i<4;i++){const a=i*Math.PI/2,xx=x+Math.cos(a)*.32,zz=z-b.h*.22+Math.sin(a)*.32;q.face([[xx,cap,zz],[x,cap+.48,z-b.h*.22],[x,cap-.1,z-b.h*.22]],['#86c6d6','#779fc6','#be9cde','#8eb9a3'][i],null,13);}
  return cap+.48;
 }
 return Math.max(y+roofRise,authoredTop);
}
function worldCastle(r,b){
 const height=rebuiltHouse(r,{...b,_castleCurtain:true});if(b._cutaway)return height;
 const race=b.race||'human',p=worldStyle[race],q=groundedPainter(r,b.x+b.w/2,b.y+b.h/2),stone=materialRealm(q,18),segments=Math.max(1,Math.round(b.w/2)),baseY=2.65*(b.w/segments/2);
 const rad=Math.min(2.3,b.w*.065),h=baseY+4.2;
 // A keep, courtyard and crenellated perimeter replace the warehouse-sized roof.
 // All supports sit on the existing perimeter; the walkable room stays clear.
 const kx=b.x+b.w*.5,kz=b.y+b.h*.36,kw=b.w*.43,kd=b.h*.48,keepTop=baseY+3.9;
 box3(stone,kx,keepTop/2,kz,kw,keepTop,kd,p.stone);
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
  if(/Bookcase/i.test(name)){worldModel(q,(o.id||0)%3?'Bookcase_2':'Shelf_Arch',x,0,z,1.8);for(const yy of [.30,.78,1.28])worldModel(q,'BookGroup_Medium_'+(1+(Math.abs(o.id||0)+Math.round(yy*10))%3),x,yy,z+.03,.29);return 1.82;}
  if(/Cooking shelf/i.test(name)){worldModel(q,'Shelf_Simple',x,0,z,1.65);worldModel(q,'Pot_1',x-.24,.82,z,.24);worldModel(q,'Bottle_1',x+.25,1.28,z,.22);return 1.7;}
  if(/cabinet|cupboard/i.test(name)){return worldModel(q,'Cabinet',x,0,z,1.8);}
  if(/chandelier/i.test(name)){return worldModel(q,'Chandelier',x,1.65,z,1.25);}
  if(/table/i.test(name)){
   const tool=/Tool|Smith/i.test(name),display=/Display|Merchandise/i.test(name),large=/Banquet|Council/i.test(name),h=tool?.90:.78;
   worldModel(q,tool?(o.id||0)%2?'Workbench_Drawers':'Workbench':'Table_Large',x,0,z,h);
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
  if(/Log pile/i.test(name)){rebuiltPlace(q,'Kenney_LogStack',x,.12,z,2.15,0,2.15,[.88,.84,.75]);return .8;}
  if(/Bed/i.test(name)){model=(o.id||0)%2?'Bed_Twin1':'Bed_Twin2';height=.82;}
  else if(/Barrel/i.test(name)){model='Barrel';height=.82;}
  else if(/Chair/i.test(name)){model='Chair_1';height=1.03;}
  else if(/Bench/i.test(name)){model='Bench';height=.48;}
  else if(/crate|supplies/i.test(name)){model=(o.id||0)%3?'Crate_Wooden':'FarmCrate_Empty';height=.75;}
  else if(/sack|bag/i.test(name)){model='Pouch_Large';height=.48;}
  else if(/rack/i.test(name)){model=/peg/i.test(name)?'Peg_Rack':'WeaponStand';height=1.3;}
  else if(/cauldron|cooking range/i.test(name)){model='Cauldron';height=.82;}
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
function worldUnderstoryPlacements(bx,bz){
 const cell=8,cx=bx*cell+4,cz=bz*cell+4,race=kingdomAt(cx,cz).race,cluster=worldRand(bx*5,bz+3),nearBriar=currentScene==='overworld'&&Math.hypot(cx-55,cz-61)<72,out=[];
 if(cluster<(nearBriar?.025:race==='elf'?.09:race==='dwarf'?.30:.15))return out;
 const count=nearBriar?36:race==='elf'?26:race==='dwarf'?12:20;
 for(let i=0;i<count;i++){
  const patch=i%2,ax=bx*cell+1.2+worldRand(bx*19+patch*41,bz+patch*7)*5.6,az=bz*cell+1.2+worldRand(bz*17+patch*37,bx+8+patch)*5.6;
  const x=ax+(worldRand(bx*3+i,bz+i*7)-.5)*2.8,z=az+(worldRand(bz*3+i,bx+i*11)-.5)*2.8;
  const road=roadInfluence(x,z)[0];
  if(x<2||z<2||worldWaterDistance(x,z)<.55||road>.23||buildings.some(b=>x>b.x-.8&&x<b.x+b.w+.8&&z>b.y-.8&&z<b.y+b.h+.8))continue;
  const seed=worldRand(x,z),waterEdge=worldWaterDistance(x,z)<3.2;let name,scale,tint;
  if(race==='dwarf'&&seed<.40){name='Pebble_'+(i%2?'Round_':'Square_')+(1+i%5);scale=.42+seed*.34;}
  else if(nearBriar&&!waterEdge&&seed<.055){name='Kenney_MushroomRed';scale=.86+worldRand(z,x)*.22;}
  else if(nearBriar&&!waterEdge&&seed<.11){name='Kenney_BushDetailed';scale=.92+worldRand(z,x)*.24;}
  else if(nearBriar&&!waterEdge&&seed<.16){name='Kenney_RockLarge';scale=.70+worldRand(z+2,x)*.18;}
  else if(nearBriar&&!waterEdge&&seed<.24){name=i%2?'Kenney_GrassLarge':'Kenney_GrassLeafsLarge';scale=.96+worldRand(z,x)*.30;}
  else if(nearBriar&&!waterEdge&&seed<.30){name=i%2?'Mushroom_Common':'Mushroom_Laetiporus';scale=.62+worldRand(z,x)*.28;tint=[.90,.91,.82];}
  else if(nearBriar&&waterEdge&&seed<.16){name=i%2?'Plant_1_Big':'Plant_7_Big';scale=.62+worldRand(z,x)*.24;tint=[.66,.79,.57];}
  else if(!waterEdge&&seed<(nearBriar?.24:race==='elf'?.22:race==='dwarf'?.10:.17)){name=i%3===0?'Bush_Common_Flowers':'Bush_Common';scale=.52+worldRand(z,x)*.30;tint=race==='elf'?[.68,.84,.66]:[.70,.82,.58];}
  else if(nearBriar&&!waterEdge&&seed<.31){name='Pebble_'+(i%3===0?'Square_':'Round_')+(1+i%5);scale=.48+worldRand(z+2,x)*.26;tint=[.75,.78,.69];}
  else if(race==='elf'&&seed<.53||waterEdge&&seed<.42){name=i%3===0?'Plant_7':'Fern_1';scale=.45+worldRand(z+2,x)*.27;tint=[.70,.88,.70];}
  else if(nearBriar&&!waterEdge&&seed>.74&&i<24){name=['Kenney_FlowerPurple','Kenney_FlowerRed','Kenney_FlowerYellow'][i%3];scale=.95+worldRand(x+4,z)*.28;}
  else if(!waterEdge&&seed>(nearBriar?.79:.84)&&i<(nearBriar?18:9)){name=i%2?'Flower_3_Group':'Flower_4_Group';scale=.36+worldRand(x+4,z)*.23;tint=race==='elf'?[.82,.92,.80]:[.91,.83,.64];}
  else{name=['Grass_Common_Short','Grass_Common_Tall','Grass_Wispy_Short','Grass_Wispy_Tall'][i%4];scale=.48+worldRand(z,x+6)*.34;tint=waterEdge?[.62,.82,.64]:[.65,.80,.54];}
  out.push({name,x,z,scale,heading:seed*6.28,tint});
  const companions=/Grass/.test(name)?2:/Bush|Plant/.test(name)?1:0;
  for(let companion=0;companion<companions;companion++){
   const angle=seed*9.7+companion*2.4,distance=.34+companion*.22,gx=x+Math.cos(angle)*distance,gz=z+Math.sin(angle)*distance;
   if(worldWaterDistance(gx,gz)>=.55&&roadInfluence(gx,gz)[0]<=.23&&!buildings.some(b=>gx>b.x-.8&&gx<b.x+b.w+.8&&gz>b.y-.8&&gz<b.y+b.h+.8))out.push({name:companion?'Grass_Common_Short':'Grass_Wispy_Short',x:gx,z:gz,scale:scale*(.68+companion*.13),heading:angle+1.2,tint:waterEdge?[.60,.80,.63]:[.63,.78,.52]});
  }
 }
 return out;
}
function visibleWorldUnderstoryChunks(){
 if(!inWorld())return [];const cell=8,range=Math.min(46,Math.max(20,screen.w/cameraZoom3()*.57)),chunks=[];
 for(let bz=Math.floor((py-range)/cell);bz<=Math.floor((py+range)/cell);bz++)for(let bx=Math.floor((px-range)/cell);bx<=Math.floor((px+range)/cell);bx++){
  const cx=bx*cell+4,cz=bz*cell+4,p=project3(cx,0,cz);if(p.x< -90||p.x>screen.w+90||p.y< -100||p.y>screen.h+90||chunks.length>=104)continue;
  chunks.push([bx,bz]);
 }
 return chunks;
}
function prepareWorldUnderstory(){if(globalThis.VeldrenSceneryScene?.enabled)globalThis.VeldrenSceneryScene.prepareChunks(visibleWorldUnderstoryChunks());}
function drawWorldUnderstory(r){
 for(const [bx,bz]of visibleWorldUnderstoryChunks()){
  const id=bx+':'+bz;let chunk=worldUnderstory.get(id);
  if(!chunk){chunk={};worldUnderstory.set(id,chunk);if(worldUnderstory.size>240)worldUnderstory.delete(worldUnderstory.keys().next().value);}
  emitMesh3(r,cachedMesh3(chunk,'prop',q=>{
   if(globalThis.VeldrenSceneryScene?.enabled){for(const plant of globalThis.VeldrenSceneryScene.readChunk(bx,bz))globalThis.VeldrenSceneryScene.render(q,plant);}
   else for(const plant of worldUnderstoryPlacements(bx,bz))rebuiltPlace(q,plant.name,plant.x,0,plant.z,plant.scale,plant.heading,plant.scale,plant.tint);
   return 1;
  }));
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
 if(inWorld())(globalThis.VeldrenWorldObjects?.enabled?globalThis.VeldrenWorldObjects.select(world.objects):objects.splice(0,objects.length,...world.objects));
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
 if(o.type==='spirit')return 0;

 return worldCreatureBefore(r,o,x,z);
};

const worldWallBefore=drawRealmWall;
drawRealmWall=function(r,x,z){
 const mine=currentScene==='mine'||realmSceneInfo.get(currentScene)?.kind==='mine';if(!mine)return worldWallBefore(r,x,z);
 const [width,depth]=sceneSize();
 if(x>0&&z>0&&x<width-1&&z<depth-1&&[[1,0],[-1,0],[0,1],[0,-1]].every(([a,b])=>worldWall(x+a,z+b)))return;
 const id=currentScene+':cave:'+x+':'+z;let key=realmArtWalls.get(id);if(!key){key={};realmArtWalls.set(id,key);if(realmArtWalls.size>400)realmArtWalls.delete(realmArtWalls.keys().next().value);}
 emitMesh3(r,cachedMesh3(key,'prop',q=>{
  // Reuse the installed authored boulders on exposed mine boundary tiles.
  // Keep their footprint within the existing one-tile navigation boundary.
  const height=2.08+worldRand(x,z)*.42,mesh=rebuiltModels[(x+z)%3?'Rock_Medium_1':'Rock_Medium_3'];
  // A continuous cut-rock core seals the natural taper between modules.
  // Broader boulders form the visible surface without changing walkable tiles.
  const horizontal=worldWall(x-1,z)||worldWall(x+1,z),axis=horizontal?'x':'z';
  let start=horizontal?x:z;while(start>0&&worldWall(horizontal?start-1:x,horizontal?z:start-1))start--;
  const offset=(horizontal?x:z)-start;
  if(offset%3===0){let length=1;while(length<3&&worldWall(horizontal?x+length:x,horizontal?z:z+length))length++;
   environmentModule3(q,mesh,horizontal?x+length/2:x+.5,-.35,horizontal?z+.5:z+length/2,horizontal?length+.35:1.35,height+.35,horizontal?1.35:length+.35,0);
  }
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])if(!worldWall(x+dx,z+dz))environmentModule3(q,rebuiltModels.Wall_UnevenBrick_Straight,x+.5+dx*.44,0,z+.5+dz*.44,1.04,1.5,.20,Math.atan2(dx,dz));
  if((x+z)%5===0){const wood=materialRealm(q,5);beamArt(wood,[x+.16,0,z+.5],[x+.16,2.18,z+.5],.09,'#67513a',8);beamArt(wood,[x+.16,1.55,z+.5],[x+.75,2.2,z+.5],.07,'#7d6549',6);}
  return height;
 }));
};

const propBeforeWorkplaces=prop3;
prop3=function(r,o,x,z){
 const q=groundedPainter(r,x,z),wood=materialRealm(q,5),stone=materialRealm(q,18),name=o.name||'';
 if(o.type==='range'){
  box3(stone,x,.55,z,1.5,1.1,.9,'#847766');box3(q,x,1.14,z,1.62,.13,1,'#3d403a');
  box3(q,x,.57,z+.46,.85,.55,.04,'#292b28');box3(q,x,.53,z+.49,.63,.28,.035,'#ad582c');
  for(const offset of [-.26,0,.26])box3(q,x+offset,.55,z+.515,.035,.40,.03,'#30332d');
  for(const offset of [-.4,.4])profile3(q,x+offset,1.22,z,.42,.045,.42,[[-.5,1],[.5,1]],'#232723',v=>v,12);
  box3(stone,x,1.9,z-.35,.58,1.45,.42,'#817462');box3(q,x,1.34,z+.12,.44,.16,.32,'#ad7750');return 2.7;
 }
 if(o.workplace){
  if(['woodland','kitchen','smithy'].includes(o.workplace)){
   const w=o.workplace==='kitchen'?7:5,d=2.7,zz=z-2.5;
   for(const side of [-1,1]){box3(wood,x+side*w/2,1.4,zz-.9,.16,2.8,.16,'#705639');box3(wood,x+side*w/2,1.4,zz+1,.16,2.8,.16,'#705639');beamArt(wood,[x+side*w/2,2.25,zz+1],[x+side*(w/2-.65),2.8,zz+1],.05,'#816345',6);}
   worldRoof(q,x,2.85,zz,w,d,.9,o.workplace==='smithy'?'#586169':o.workplace==='woodland'?'#726447':'#8b694e');
  }
  if(o.workplace==='shrine'){
   for(const side of [-1,1]){profile3(stone,x+side*2.3,1.5,z, .48,3,.48,[[-.5,1.4],[-.4,1],[.4,1],[.5,1.3]],'#a5a58f',a=>a,10);worldModel(q,'CandleStick',x+side*2.3,3,z,.35);}
   for(let i=0;i<12;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;beamArt(stone,[x+Math.cos(a)*2.3,3+Math.sin(a)*1.1,z],[x+Math.cos(b)*2.3,3+Math.sin(b)*1.1,z],.15,'#a5a58f',8);}
  }
  if(o.workplace==='fishing'){
   worldModel(q,'Stall_Cart_Empty',x+1.1,0,z-2.1,1.1);worldModel(q,'Bucket_Wooden_1',x-.45,0,z-.6,.42);
  }
  return .1;
 }
 if(o.penFence){
  const woodColor='#806345',ironColor='#454744';
  if(o.type==='gate'){
   for(const side of [-1,1]){box3(wood,x,.86,z+side*.52,.18,1.72,.18,'#67513b');box3(q,x,1.48,z+side*.52,.20,.09,.20,ironColor);}
   const leaf=worldLocal(q,x,0,z-.5,-trainingGateFraction()*Math.PI/2),timber=materialRealm(leaf,5);
   for(const zz of [.13,.37,.63,.87])box3(timber,0,.8,zz,.09,1.38,.17,woodColor);
   for(const yy of [.26,1.25])box3(timber,0,yy,.5,.15,.14,1,woodColor);
   beamArt(timber,[0,.28,.06],[0,1.23,.94],.045,'#ab8960',4);box3(leaf,-.09,.97,.86,.04,.09,.18,ironColor);
  }else{
   const f=worldLocal(q,x,0,z,o.heading||0),timber=materialRealm(f,5);
   box3(timber,0,.85,0,.18,1.7,.18,'#69533b');box3(f,0,1.46,0,.20,.08,.20,ironColor);
   for(const zz of [-.32,.32])box3(timber,0,.78,zz,.095,1.48,.16,woodColor);
   for(const yy of [.25,1.22])box3(timber,0,yy,0,.14,.14,1.04,'#96764f');
   box3(timber,0,.10,0,.16,.18,1.04,'#685139');
   if((o.x===TRAINING_PEN.left||o.x===TRAINING_PEN.right)&&(o.y===TRAINING_PEN.top||o.y===TRAINING_PEN.bottom)){
    const direction=o.y===TRAINING_PEN.top?1:-1;
    for(const yy of [.25,1.22])box3(wood,x,yy,z+direction*.25,.14,.14,.54,'#96764f');
    box3(wood,x,.78,z+direction*.32,.095,1.48,.16,woodColor);
   }
  }
  return 1.72;
 }
 if(/yard fence/.test(name)){environmentModule3(q,realmArtMesh('timberFence',o.race||realmArtRace(x,z)),x,0,z,.13,1.1,1.8,o.heading||0);return 1.1;}
 if(name==='Village noticeboard'){
  for(const side of [-1,1])box3(wood,x+side*.55,1,z,.12,2,.12,'#665037');box3(wood,x,1.45,z,1.4,.95,.12,'#785d40');
  for(const side of [-1,1])box3(q,x+side*.28,1.48,z+.08,.45,.58,.02,'#d8c49a');return 2;
 }
 if(name==='Forge furnace'){
  profile3(stone,x,.9,z,1.45,1.8,1.2,[[-.5,1],[-.28,1],[.2,.8],[.5,.65]],'#8d8b7a',a=>a,8);box3(stone,x,2.25,z,.65,1.2,.65,'#777c72');box3(q,x,.68,z+.62,.70,.68,.02,'#332821');box3(materialRealm(q,19),x,.45,z+.64,.45,.2,.025,'#d8994d');return 2.9;
 }
 if(name==='Axe chopping block'){worldModel(q,'Anvil_Log',x,0,z,.5);worldModel(q,'Pickaxe_Bronze',x,.35,z,.45,Math.PI/2);return .8;}
 if(name==='Flower planter'){worldModel(q,'Crate_Wooden',x,0,z,.43);rebuiltPlace(q,'Flower_3_Group',x,.3,z,.5,0,.5);return .8;}
 if(name==='Offering bowl'){worldModel(q,'Bucket_Wooden_1',x,0,z,.38);worldModel(q,'CandleStick',x,.38,z,.28);return .7;}
 if(name==='Arrow target'){return drawPracticeDummy(q,{tutorialRole:'dummy'},x,z);}
 if(name==='Bank counter'){worldModel(q,'Workbench',x,0,z,.93);worldModel(q,'BookStand',x,.93,z,.25);return 1.2;}
 if(name==='Study table'||name==='Ledger table'){worldModel(q,'Table_Large',x,0,z,.8);worldModel(q,'BookStand',x,.8,z,.27);worldModel(q,'CandleStick',x+.4,.8,z,.28);return 1.15;}
 return propBeforeWorkplaces(r,o,x,z);
};
const roadBeforeWorkplaces=roadInfluence;
roadInfluence=function(x,z){const result=roadBeforeWorkplaces(x,z);if(currentScene!=='tutorial'||x<18||x>84||z<40||z>94)return result;for(const a of tutorialWorkplaces){const d=Math.hypot((x-a.x)/a.rx,(z-a.y)/a.ry),edge=1+.035*Math.sin(x*2.5+z*1.4),t=Math.max(0,Math.min(1,(edge-d)/.25)),blend=t*t*(3-2*t);result[0]=Math.max(result[0],blend);if(a.paved)result[1]=Math.max(result[1],blend);}return result;};
