'use strict';
// Authored silhouettes and exposed seams, fixed by ore type across the world.
const ORE_APPEARANCE={
 copper:{stone:'#705449',vein:'#d78348',sides:7,rocks:[[-.15,0,.44,.59],[.30,.16,.25,.34]]},
 tin:{stone:'#788184',vein:'#d7e1df',sides:5,rocks:[[-.18,-.05,.39,.42],[.26,.12,.32,.34]]},
 iron:{stone:'#554a49',vein:'#a94f39',sides:5,rocks:[[0,0,.40,.79],[-.30,.20,.24,.37]]},
 coal:{stone:'#272c32',vein:'#4d555b',sides:6,rocks:[[0,0,.49,.31],[.10,.04,.34,.47]]},
 gold:{stone:'#55565b',vein:'#e3b74f',sides:7,rocks:[[0,0,.46,.64],[.31,-.19,.21,.30]]},
 mithril:{stone:'#454b61',vein:'#6f96d9',sides:4,rocks:[[-.24,0,.26,.58],[.08,.07,.28,.86],[.32,-.13,.21,.47]]},
 adamant:{stone:'#42574c',vein:'#79ad75',sides:4,rocks:[[-.12,0,.42,.68],[.28,.14,.26,.51]]},
 rune:{stone:'#384d5b',vein:'#6cc8cd',sides:5,rocks:[[-.17,0,.31,.96],[.24,.10,.29,.72]]}
};
function oreAppearance(o){return ORE_APPEARANCE[o.resourceId]||ORE_APPEARANCE.copper;}
function buildOreRock(r,look){
 let height=0;
 for(const [rock,[x,z,radius,h]]of look.rocks.entries()){
  height=Math.max(height,h);const bottom=[],shoulder=[];
  for(let i=0;i<look.sides;i++){const angle=i*Math.PI*2/look.sides+.27*rock;bottom.push([x+Math.cos(angle)*radius,.015,z+Math.sin(angle)*radius]);shoulder.push([x+Math.cos(angle+.12)*radius*.80,h*(.48+(i%2)*.10),z+Math.sin(angle+.12)*radius*.80]);}
  const top=[x-radius*.16,h,z+radius*.10];
  for(let i=0;i<look.sides;i++){
   const next=(i+1)%look.sides,side=[bottom[next],bottom[i],shoulder[i],shoulder[next]],cap=[shoulder[next],shoulder[i],top];
   for(const [band,face]of [side,cap].entries()){
    r.face(face,look.stone,null,12);
    if((i+rock+band)%3!==1){
     const center=[0,1,2].map(axis=>face.reduce((n,p)=>n+p[axis],0)/face.length);
     const u=face[1].map((v,k)=>v-face[0][k]),v=face[2].map((v,k)=>v-face[0][k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...normal)||1;
     const seam=face.map(p=>p.map((v,axis)=>center[axis]+(v-center[axis])*(axis===1?.73:.60)+normal[axis]/length*.005));
     r.face(seam,look.vein,null,12);
    }
   }
  }
 }
 return height;
}
function drawOreRock(r,o,x,z){
 const look=oreAppearance(o),q=groundedPainter(r,x,z);
 if(q.indexed)return cachedRealmShape(q,'ore-type:'+Object.keys(ORE_APPEARANCE).find(k=>ORE_APPEARANCE[k]===look),briarTransform(x,0,z),p=>buildOreRock(p,look));
 return buildOreRock({face:(points,...args)=>q.face(points.map(p=>[p[0]+x,p[1],p[2]+z]),...args)},look);
}
const propBeforeOreIdentity=prop3;
prop3=function(r,o,x,z){return o.type==='ore'?drawOreRock(r,o,x,z):propBeforeOreIdentity(r,o,x,z);};
