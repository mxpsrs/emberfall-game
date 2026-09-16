'use strict';
// Authored shoreline and watersheds in the existing 1152 × 768 world coordinates.
// Smooth interpolation preserves the settled headlands while carving open wilderness.
const COAST_NORTH=[[0,16],[25,2],[65,3],[105,17],[155,2],[185,6],[230,42],[275,48],[315,22],[345,3],[395,2],[450,20],[510,78],[555,104],[610,64],[665,42],[700,18],[745,3],[790,6],[835,38],[885,90],[940,110],[1000,94],[1060,120],[1120,180],[1152,240]];
const COAST_WEST=[[0,5],[70,2],[145,18],[215,7],[275,32],[330,78],[390,105],[445,63],[485,85],[530,112],[570,137],[615,150],[670,205],[720,265],[768,350]];
const COAST_EAST=[[0,960],[100,1055],[160,1115],[230,1100],[285,1118],[330,1070],[380,1060],[430,1000],[475,974],[515,940],[550,965],[610,950],[675,914],[710,850],[768,730]];
const COAST_SOUTH=[[0,400],[120,580],[230,696],[315,728],[410,733],[500,701],[575,738],[650,720],[735,747],[820,735],[900,712],[975,645],[1050,480],[1152,400]];
const IRON_RIVER=[[50,540],[120,498],[190,552],[245,532],[290,510],[336,544.5],[390,575],[465,544.5],[490,536]];
const SILVER_RIVER=[[30,408],[120,438],[180,472],[216,454.5],[275,422],[330,440],[393,454.5],[460,491],[520,478],[544.5,465],[597,454.5],[670,482],[730,470],[795,454.5],[865,440],[925,465],[980,445],[1060,468]];
const WORLD_LAKES=[{name:'Reedwater Mere',x:300,y:232,rx:32,ry:18},{name:'Lake Fenmere',x:168,y:355,rx:28,ry:42},{name:'Ironmirror Lake',x:724,y:379,rx:35,ry:22},{name:'Silverglass Lake',x:554,y:681,rx:34,ry:20}];
function geographyCurve(points,value){
 let lo=0,hi=points.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(points[m][0]>value)hi=m;else lo=m;}
 const a=points[lo],b=points[hi],p=points[Math.max(0,lo-1)],n=points[Math.min(points.length-1,hi+1)],t=Math.max(0,Math.min(1,(value-a[0])/(b[0]-a[0]))),t2=t*t,t3=t2*t;
 const m1=(b[1]-p[1])/(b[0]-p[0])*(b[0]-a[0]),m2=(n[1]-a[1])/(n[0]-a[0])*(b[0]-a[0]);
 return (2*t3-3*t2+1)*a[1]+(t3-2*t2+t)*m1+(-2*t3+3*t2)*b[1]+(t3-t2)*m2;
}
function mainlandCoastDistance(x,y){return Math.min(x-Math.max(1.2,geographyCurve(COAST_WEST,y)),geographyCurve(COAST_EAST,y)-x,y-Math.max(1.2,geographyCurve(COAST_NORTH,x)),geographyCurve(COAST_SOUTH,x)-y)+.65*Math.sin(x*.14+y*.11);}
const geographyWaterBefore=worldWaterDistance;
worldWaterDistance=function(x,y){
 if(currentScene!=='overworld'||!physicalWorldReady)return geographyWaterBefore(x,y);
 let d=mainlandCoastDistance(x,y);
 // The two Briarhaven crossings and the fishing banks keep their established position.
 const smallBend=(1-Math.exp(-Math.pow((y-51.5)/15,2)))*(1-Math.exp(-Math.pow((y-105.5)/15,2)));
 const smallRiver=Math.max(Math.abs(x-(111.5+10*Math.sin((y-52)*.046)*smallBend))-3.6,3-y,y-188);
 const lake=(Math.hypot((x-15.5)/10.5,(y-66.5)/11.5)-1)*10.5+.24*Math.sin(y*.18+x*.12);
 const pond=(Math.hypot((x-141)/15,(y-132)/13.5)-1)*13.5+.35*Math.sin(x*.12-y*.17);
 const source=(Math.hypot((x-111)/11,(y-186)/14)-1)*11;
 const ironWidth=4.5+2.2*(1-Math.exp(-Math.pow((y-336)/24,2)));
 const silverPinch=Math.min(...[216,393,597,795].map(b=>Math.abs(x-b))),silverWidth=4.5+2.3*(1-Math.exp(-Math.pow(silverPinch/24,2)));
 d=Math.min(d,lake,pond,source,smallRiver,Math.max(Math.abs(x-geographyCurve(IRON_RIVER,y))-ironWidth,45-y,y-482),Math.max(Math.abs(y-geographyCurve(SILVER_RIVER,x))-silverWidth,25-x,x-1080));
 // Lake distance also shapes the bank height. A six-tile bounding box cut
 // that distance off abruptly, creating rectangular cliffs around lakes.
 for(const l of WORLD_LAKES){const radius=Math.min(l.rx,l.ry),norm=Math.hypot((x-l.x)/l.rx,(y-l.y)/l.ry);if((norm-1.115)*radius>=d)continue;const a=Math.atan2((y-l.y)/l.ry,(x-l.x)/l.rx),edge=1+.07*Math.sin(a*3+l.x)+.045*Math.cos(a*5);d=Math.min(d,(norm-edge)*radius);}
 return d;
};
let geographyReady=false;
function nearestGeographyLand(x,y,fish=false){
 const w=worldScenes.overworld,valid=(a,b)=>a>2&&b>2&&a<1150&&b<766&&!water(a,b)&&!worldWall(a,b)&&(!fish||worldWaterDistance(a+.5,b+.5)<2.2)&&!w.buildings.some(h=>a>=h.x-1&&a<=h.x+h.w+1&&b>=h.y-1&&b<=h.y+h.h+1)&&!w.objects.some(o=>o.x===a&&o.y===b&&!o.collected);
 for(let radius=2;radius<400;radius+=2)for(let i=0;i<32;i++){const a=Math.round(x+Math.cos(i*Math.PI/16)*radius),b=Math.round(y+Math.sin(i*Math.PI/16)*radius);if(valid(a,b))return [a,b];}
 throw new Error('No safe shoreline position near '+x+','+y);
}
const geographySetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){
 geographySetupBefore();if(geographyReady)return;geographyReady=true;const previous=currentScene;currentScene='overworld';
 const w=worldScenes.overworld;
 for(const o of w.objects){if(o.interiorBuilding||o.building)continue;const fishing=o.type==='fish';if(!water(o.x,o.y)&&(!fishing||worldWaterDistance(o.x+.5,o.y+.5)<2.2))continue;
  if(o.mainStoryKey||o.mountainKey||o.type==='door')throw new Error('Quest location is flooded: '+o.name);
  const [x,y]=nearestGeographyLand(o.x,o.y,fishing);Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y});
 }
 physicalBridges=bridgesInRealm().filter((b,i,a)=>a.findIndex(p=>p.x===b.x&&p.z===b.z)===i);realmNavigation.clear();resetLandSurface();miniTerrain=null;
 for(const p of s.groundLoot||[])if(p.scene==='overworld'&&water(p.x,p.y)){const [x,y]=nearestGeographyLand(p.x,p.y);Object.assign(p,{x,y});}
 if(s.sceneId==='overworld'&&water(s.x,s.y)){const [x,y]=nearestGeographyLand(s.x,s.y);s.x=x;s.y=y;px=x;py=y;}
 currentScene=previous;if(previous==='overworld')objects.splice(0,objects.length,...w.objects);
};

const geographyKingdomBefore=kingdomAt;
kingdomAt=function(x,y){if(!physicalWorldReady||currentScene!=='overworld')return geographyKingdomBefore(x,y);return y>=geographyCurve(SILVER_RIVER,x)?KINGDOMS[2]:x>=geographyCurve(IRON_RIVER,y)?KINGDOMS[1]:KINGDOMS[0];};
