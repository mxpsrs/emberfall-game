'use strict';
const WORLD_FORESTS=[
 {name:'Elderwood',x:80,y:240,rx:70,ry:92,race:'human'},
 {name:'Crownwood',x:280,y:224,rx:110,ry:55,race:'human'},
 {name:'Westmere Woods',x:209,y:359,rx:98,ry:86,race:'human'},
 {name:'Ironpine Foothills',x:663,y:215,rx:144,ry:107,race:'dwarf'},
 {name:'Stonehearth Pines',x:994,y:287,rx:110,ry:92,race:'dwarf'},
 {name:'Silverwood Forest',x:524,y:601,rx:363,ry:116,race:'elf'}
];
function forestAt(x,y){return WORLD_FORESTS.find(f=>Math.hypot((x-f.x)/f.rx,(y-f.y)/f.ry)<1+.10*Math.sin(x*.045+y*.031));}
function furnishingRadius(o){return o.type==='range'||o.type==='camp'?.8:/Bed|table/i.test(o.name)?1:/Bookcase|rack/i.test(o.name)?.65:.5;}
function arrangeRoomContents(world,b){
 const contents=world.objects.filter(o=>o.interiorBuilding===b.service?.destination),movable=contents.filter(o=>(o.type==='prop'||o.type==='range'||o.type==='camp')&&!o.mainStoryKey&&!o.mountainKey&&!o.questModel&&!/pillar/i.test(o.name));
 const occupied=contents.filter(o=>!movable.includes(o)).map(o=>({x:o.x,y:o.y,r:.55})),[dx,dy]=doorNormal(b.service),door=[b.service.x-dx,b.service.y-dy],center=[b.x+b.w/2,b.y+b.h/2];
 const inAisle=(x,y)=>roadSegmentDistance(x,y,{a:door,b:center})<1.0;
 const fits=(x,y,r)=>x>=b.x+1&&x<=b.x+b.w-2&&y>=b.y+1&&y<=b.y+b.h-2&&!inAisle(x,y)&&!occupied.some(p=>Math.hypot(x-p.x,y-p.y)<r+p.r+.1);
 const wall=o=>o.type==='range'||o.type==='camp'||/Bed|Bookcase|Barrel|supplies|crate|rack|chest|throne|Altar/i.test(o.name);
 const priority=o=>o.type==='range'?0:o.type==='camp'?1:/Bed/i.test(o.name)?2:wall(o)?3:/table/i.test(o.name)?4:5;
 movable.sort((a,b)=>priority(a)-priority(b)||a.id-b.id);const tables=[];
 for(const o of movable){const r=furnishingRadius(o),slots=[],offset=/Bed/i.test(o.name)?2:1;
  if(wall(o)){
   for(let x=b.x+2;x<=b.x+b.w-3;x++){slots.push([x,b.y+offset,0],[x,b.y+b.h-1-offset,Math.PI]);}
   for(let y=b.y+2;y<=b.y+b.h-3;y++){slots.push([b.x+offset,y,Math.PI/2],[b.x+b.w-1-offset,y,-Math.PI/2]);}
  }else for(let y=b.y+2;y<=b.y+b.h-3;y++)for(let x=b.x+2;x<=b.x+b.w-3;x++)slots.push([x,y,o.roomYaw||0]);
  const score=p=>/Chair/i.test(o.name)&&tables.length?Math.min(...tables.map(t=>Math.abs(Math.hypot(p[0]-t.x,p[1]-t.y)-1.8)*10)):Math.hypot(p[0]-o.x,p[1]-o.y);
  const chosen=slots.filter(([x,y])=>fits(x,y,r)).sort((a,b)=>score(a)-score(b))[0];
  if(!chosen){if(o.type==='range')throw new Error('No wall position for cooking range in '+b.name);if(o.type==='prop'&&!o.workplace){world.objects.splice(world.objects.indexOf(o),1);continue;}occupied.push({x:o.x,y:o.y,r});continue;}
  const [x,y,yaw]=chosen;Object.assign(o,{x,y,homeX:x,homeY:y,drawX:x,drawY:y,roomYaw:yaw,furnished:true});occupied.push({x,y,r});
  if(/table/i.test(o.name))tables.push(o);
  if(/Chair/i.test(o.name)&&tables.length){const table=tables.reduce((a,t)=>Math.hypot(t.x-x,t.y-y)<Math.hypot(a.x-x,a.y-y)?t:a);o.roomYaw=Math.atan2(table.x-x,table.y-y);}
 }
}
function dressWorldForests(){
 const world=worldScenes.overworld,used=new Set(world.objects.map(o=>o.x+':'+o.y));let serial=6800000;
 const clear=(x,y)=>!world.objects.some(o=>o.lairEntrance&&Math.abs(x-o.x)<12&&Math.abs(y-o.y)<15)&&worldWaterDistance(x+.5,y+.5)>4&&!worldWall(x,y)&&!used.has(x+':'+y)&&roadInfluence(x+.5,y+.5)[0]<.03&&!world.buildings.some(b=>x>b.x-5&&x<b.x+b.w+5&&y>b.y-5&&y<b.y+b.h+5)&&!questSites.some(q=>Math.abs(x-q.x)<(q.rx||12)+6&&Math.abs(y-q.y)<(q.ry||12)+6)&&!world.objects.some(o=>(o.type==='tree'&&Math.hypot(o.x-x,o.y-y)<4.5)||(o.characterSprite||o.type==='camp'||o.mainStoryKey||o.mountainKey)&&Math.hypot(o.x-x,o.y-y)<6);
 // Sparse trees around inhabited lots; woodland begins beyond the streets.
 for(const town of SETTLEMENTS){let kept=0;world.objects=world.objects.filter(o=>{if(o.type!=='tree'||!((o.id>=2400000&&o.id<2500000)||o.realmScenery)||Math.hypot(o.x-town.x,o.y-town.y)>(town.kind==='city'?90:40))return true;return ++kept<=6;});}
 for(let y=30;y<744;y+=8)for(let x=20;x<1120;x+=8){serial++;const a=Math.round(x+Math.sin(x*1.27+y*.71)*3),b=Math.round(y+Math.cos(x*.53-y*1.19)*3),f=forestAt(a,b);if(!f||Math.sin(a*.067+b*.043)+Math.cos(b*.058-a*.039)<-.95||SETTLEMENTS.some(t=>Math.hypot(a-t.x,b-t.y)<(t.kind==='city'?92:44))||!clear(a,b))continue;
  const o={id:serial,type:'tree',name:f.race==='elf'?'Silverwood tree':f.race==='dwarf'?'Mountain pine':'Old-growth oak',race:f.race,x:a,y:b,homeX:a,homeY:b,drawX:a,drawY:b,sprite:4,dead:0,forest:f.name};world.objects.push(o);used.add(a+':'+b);
 }
 for(const town of SETTLEMENTS)for(let i=0;i<5;i++){const a=town.x+Math.round(Math.cos(i*2.399)*(town.kind==='city'?37:22)),b=town.y+Math.round(Math.sin(i*2.399)*(town.kind==='city'?37:22));serial++;if(!clear(a,b))continue;const race=KINGDOMS.find(k=>k.id===town.kingdom).race;world.objects.push({id:serial,type:'tree',name:race==='elf'?'Silverwood tree':race==='dwarf'?'Mountain pine':'Old-growth oak',race,x:a,y:b,homeX:a,homeY:b,sprite:4,dead:0,settlementTree:town.id});used.add(a+':'+b);}
}
let worldDressingReady=false;
const dressingSetupBefore=setupTutorialVillage;
setupTutorialVillage=function(){dressingSetupBefore();if(worldDressingReady)return;worldDressingReady=true;const previous=currentScene;
 for(const scene of ['overworld','tutorial']){currentScene=scene;const world=worldScenes[scene];for(const b of world.buildings.filter(b=>b.walkIn&&b.service))arrangeRoomContents(world,b);}
 currentScene='overworld';dressWorldForests();currentScene=previous;objects.splice(0,objects.length,...worldScenes[currentScene].objects);realmNavigation.clear();resetLandSurface();miniTerrain=null;
 // Recover a save placed inside newly corrected scenery without changing progress.
 if(!land(s.x,s.y)){let point=null;for(let radius=1;radius<=16&&!point;radius++)for(let dy=-radius;dy<=radius&&!point;dy++)for(let dx=-radius;dx<=radius&&!point;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===radius&&land(s.x+dx,s.y+dy))point=[s.x+dx,s.y+dy];if(point){[s.x,s.y]=point;[px,py]=point;path=[];}}
};
