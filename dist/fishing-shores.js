'use strict';
// Fishing targets sit in visible water; the interaction route ends on dry shore.
let fishingShoresReady=false;
function fishingBank(o){
 for(const [dx,dy]of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]])if(land(o.x+dx,o.y+dy))return [o.x+dx,o.y+dy];
 return null;
}
const fishingSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){
 fishingSetupBefore();if(fishingShoresReady)return;fishingShoresReady=true;const previous=currentScene;
 try{for(const [scene,w]of Object.entries(worldScenes)){
  const fish=w.objects.filter(o=>o.type==='fish');if(!fish.length)continue;currentScene=scene;
  const occupied=new Set(w.objects.filter(o=>o.type!=='fish'&&!o.walkThrough).map(o=>o.x+':'+o.y)),candidates=new Map(),used=[];
  const dry=(x,y)=>!water(x,y)&&!worldWall(x,y)&&!occupied.has(x+':'+y)&&!w.buildings.some(b=>x>=b.x-1&&x<=b.x+b.w&&y>=b.y-1&&y<=b.y+b.h);
  const consider=(x,y)=>{x=Math.round(x);y=Math.round(y);const key=x+':'+y;if(candidates.has(key)||x<2||y<2||x>=sceneSizes[scene][0]-2||y>=sceneSizes[scene][1]-2||!water(x,y)||worldWaterDistance(x+.5,y+.5)>-.2)return;
   if(![[0,1],[1,0],[0,-1],[-1,0]].some(([dx,dy])=>dry(x+dx,y+dy)&&dry(x+dx*2,y+dy*2)))return;
   candidates.set(key,{x,y,ocean:scene==='overworld'&&mainlandCoastDistance(x+.5,y+.5)<1});
  };
  const patch=(x,y,r=3)=>{for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)consider(x+dx,y+dy);};
  for(const o of fish)patch(o.x,o.y,8);
  if(scene==='overworld'){
   for(let x=3;x<1150;x+=3){patch(x,geographyCurve(COAST_NORTH,x),2);patch(x,geographyCurve(COAST_SOUTH,x),2);for(const sign of [-1,1])patch(x,geographyCurve(SILVER_RIVER,x)+sign*6,2);}
   for(let y=3;y<766;y+=3){patch(geographyCurve(COAST_WEST,y),y,2);patch(geographyCurve(COAST_EAST,y),y,2);if(y<483)for(const sign of [-1,1])patch(geographyCurve(IRON_RIVER,y)+sign*6,y,2);}
   for(const l of WORLD_LAKES)for(let i=0;i<100;i++){const a=i*Math.PI/50;patch(l.x+Math.cos(a)*l.rx,l.y+Math.sin(a)*l.ry,4);}
  }
  const choices=[...candidates.values()];
  for(const o of fish){const ocean=!['trout','salmon'].includes(o.resourceId),spots=choices.filter(p=>(scene!=='overworld'||p.ocean===ocean)&&!used.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<3));spots.sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y));const p=spots[0];if(!p)throw new Error('No accessible fishing shore: '+scene+' '+o.id);Object.assign(o,{x:p.x,y:p.y,homeX:p.x,homeY:p.y,drawX:p.x,drawY:p.y,fishingHabitat:p.ocean?'sea':'freshwater'});used.push(p);}
 }}finally{currentScene=previous;realmNavigation.clear();if(worldScenes[previous])objects.splice(0,objects.length,...worldScenes[previous].objects);}
};
const fishingPropBefore=prop3;
prop3=function(p,o,x,z){
 if(o.type!=='fish')return fishingPropBefore(p,o,x,z);
 // Ripples and visible backs identify a shoal even when it is not selected.
 for(const r of [.38,.7])lairRing(p,x,z,r,.10,'#b6e3e5');
 for(let i=0;i<3;i++)oval3(p,x-.3+i*.3,.08,z+(i%2?.18:-.16),.19,.055,.075,'#759fa4',a=>a,8);
 return .2;
};
