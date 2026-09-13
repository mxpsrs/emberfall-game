'use strict';
// Mainland rebuilding happens after the apprenticeship has copied its own scene.
const BRIARHAVEN_LAYOUT=1,BRIARHAVEN_PLAZA=[55,61],GOBLIN_VILLAGE={left:84,top:88,right:106,bottom:110};
let briarhavenReady=false;
const gradeBeforeBriarhaven=gradeLand;
gradeLand=function(x,z,height){
 const base=gradeBeforeBriarhaven(x,z,height);if(currentScene!=='overworld')return base;
 const d=Math.hypot(Math.max(35-x,0,x-90),Math.max(37-z,0,z-86));if(d>=10)return base;
 const t=d/10,blend=1-t*t*(3-2*t);return base*(1-blend)+.75*blend;
};
const roadsBeforeBriarhaven=roadInfluence;
roadInfluence=function(x,z){const out=roadsBeforeBriarhaven(x,z);if(currentScene!=='overworld'||!briarhavenReady)return out;const d=Math.max(Math.abs(x-55)/9,Math.abs(z-61)/11),t=Math.max(0,Math.min(1,(1.05-d)/.15)),amount=t*t*(3-2*t);return [Math.max(out[0],amount),Math.max(out[1],amount),out[2]||0];};
const regionBeforeBriarhaven=regionInfo;
regionInfo=function(){const b=GOBLIN_VILLAGE;if(currentScene==='overworld'&&s.x>=b.left-2&&s.x<=b.right+2&&s.y>=b.top-2&&s.y<=b.bottom+2)return ['Brambleclaw village','Goblin tents · Foragers & scavengers'];return regionBeforeBriarhaven();};
const movementBeforeGoblinVillage=trainingRatCanMove;
trainingRatCanMove=function(o,x,y){const b=GOBLIN_VILLAGE;return movementBeforeGoblinVillage(o,x,y)&&(!o.briarhavenGoblin||x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom);};
function rebuildBriarhaven(){
 if(briarhavenReady)return;briarhavenReady=true;const world=worldScenes.overworld,resumeScene=currentScene;currentScene='overworld';
 const district=(x,y)=>x>=30&&x<=108&&y>=29&&y<=112;
 // Clear incidental scenery and old wandering enemies before laying out the civic lots.
 world.objects=world.objects.filter(o=>!district(o.x,o.y)||o.interiorBuilding||o.type==='door'||!['tree','ore','prop','crop','enemy','man','camp'].includes(o.type));
 for(const [id,x,y,facing]of [['inn',35,40,'south'],['shop',65,52,'west'],['forge',79,37,'west'],['realm_briarhaven_4',51,39,'south'],['realm_briarhaven_3',71,77,'north'],['village_kitchen',39,74,'east']])moveFirstlightBuilding(world,id,x,y,facing);
 const town=SETTLEMENTS.find(t=>t.id==='briarhaven');if(town){town.x=55;town.y=61;}
 let serial=6200000;
 const put=(type,name,x,y,extra={})=>{const o={id:serial++,type,name,x,y,homeX:x,homeY:y,drawX:x,drawY:y,sprite:6,dead:0,hitAt:-100,attackAt:-100,briarhavenDetail:true,...extra};world.objects.push(o);return o;};
 const relocate=(o,x,y)=>{if(o)moveFirstlightObject(o,x-o.x,y-o.y);};
 const rowan=world.objects.find(o=>o.type==='elder');relocate(rowan,54,60);
 const beggar=world.objects.find(o=>o.name==='Tobin the beggar');relocate(beggar,47,66);
 const names={inn:'Hester · Innkeeper',shop:'Mara · General merchant',banker:'Orin · Banker'};
 for(const o of world.objects)if(o.interiorBuilding&&names[o.type]&&world.buildings.some(b=>b.settlement==='briarhaven'&&b.service.destination===o.interiorBuilding))o.name=names[o.type];
 const resident=(name,x,y,talk,extra={})=>put('villager',name,x,y,{characterSprite:true,talk,_stationary:true,...extra});
 resident('Warden Elara',79,70,'“The Brambleclaw goblins have settled southeast of town. Their tents lie beyond the south road. Take food and proper equipment before you approach.”',{appearanceRole:'guard'});
 resident('Ada the gardener',45,57,'“Welcome to Briarhaven. The bank is north of the square, Mara trades to the east, and our kitchen stands southwest. The herb beds beside me are free to harvest.”');
 resident('Bren the woodworker',35,66,'“I tend the trees west of town. Cut a log, find clear ground and work your tinderbox. When the fire catches, step clear and cook your catch.”');
 resident('Cook Iona',44,77,'“This is the village kitchen. Bring dough or a raw catch and use it on our range. Outside, you can cook fish over a log fire too.”',{interiorBuilding:'village_kitchen'});
 resident('Arcanist Selene',74,82,'“Our school teaches the spellbook. Combat magic and travel spells belong to the same craft. Study Magic as you explore the mainland.”',{interiorBuilding:'realm_briarhaven_3',appearanceRole:'magic',mapService:'magic'});
 resident('Smith Doran',83,42,'“The anvil is ready. Bring metal bars to forge equipment; the furnace outside turns ore into bars.”',{interiorBuilding:'forge'});
 resident('Fisher Nessa',28,70,'“These banks are quieter than the square. A raw catch makes a good meal once you have cooked it. Mind the goblins beyond town.”');
 for(const [name,x,y]of [['Village well',57,61],['Village noticeboard',51,56],['Market stall',61,65],['Market stall',51,68],['Bench',48,59],['Bench',60,70],['Flower planter',48,56],['Flower planter',61,70],['Square lantern',50,51],['Square lantern',62,51],['Square lantern',50,71],['Square lantern',64,71],['Log pile',34,69],['Tool table',35,64],['Barrel',78,43],['Crate',79,47]])put('prop',name,x,y,{sprite:12,...(/market stall/i.test(name)?{collisionRadius:1.5}:{})});
 put('prop','Forge furnace',78,49,{sprite:12,workstation:'furnace'});
 for(const [x,y]of [[43,55],[43,58],[43,61]])put('crop','Herb patch',x,y,{sprite:4});
 // A small settlement of tents, shared fires and supplies outside the town boundary.
 for(const [x,y]of [[86,90],[95,89],[104,92],[86,106],[96,109],[105,106]])put('prop','Brambleclaw tent',x,y,{sprite:12,collisionRadius:1.5});
 for(const [name,x,y]of [['Crate',87,94],['Barrel',102,96],['Supplies sack',99,106],['Log pile',88,103]])put('prop',name,x,y,{sprite:12});
 put('camp','Brambleclaw cooking fire',95,100,{sprite:7,walkThrough:true,cooking:true});
 const homes=[[89,91],[92,92],[98,92],[101,93],[88,97],[91,96],[95,96],[99,97],[104,99],[88,101],[91,103],[95,104],[99,103],[102,104],[92,107]];
 for(const [i,[x,y]]of homes.entries()){const o=put('enemy',i%3===0?'Brambleclaw forager':i%3===1?'Brambleclaw scavenger':'Brambleclaw goblin',x,y,{...species.goblin,kind:'goblin',maxhp:species.goblin.hp,briarhavenGoblin:true,roamAt:i*.37});if(typeof applyEnemyTier==='function')applyEnemyTier(o,ENEMY_TIERS.goblin);o.name=['Brambleclaw forager','Brambleclaw scavenger','Brambleclaw goblin'][i%3];}
 // Replace old streets through the town, keeping the roads beyond its boundary.
 for(let i=organicRoads.length-1;i>=0;i--){const r=organicRoads[i];if(district((r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2))organicRoads.splice(i,1);}
 laneOccupancy.clear();
 for(const b of world.buildings.filter(b=>b.settlement==='briarhaven')){const [x,y]=doorApproach(b.service,false);curveRoad(...BRIARHAVEN_PLAZA,x,y,1.25,true);}
 for(const p of [[42,51],[32,51],[55,30],[95,65],[55,94],[95,97]])curveRoad(...BRIARHAVEN_PLAZA,...p,1.15,false);
 roadBuckets=null;
 const occupied=(x,y)=>world.buildings.some(b=>x>=b.x-2&&x<b.x+b.w+2&&y>=b.y-2&&y<b.y+b.h+2)||world.objects.some(o=>Math.hypot(o.x-x,o.y-y)<2)||organicRoads.some(r=>roadSegmentDistance(x+.5,y+.5,r)<r.width+1);
 for(const [x,y]of [[30,44],[30,48],[29,53],[29,58],[33,73],[31,78],[35,83],[38,88],[44,88],[50,88],[62,87],[83,76],[88,79],[95,80],[101,83],[107,86],[108,95],[110,105]])if(!expandedWater(x,y)&&!occupied(x,y))put('tree','Tree',x,y,{resourceId:'normal',sprite:4});
 // Keep door aprons clear of decoration, including the full collision radius.
 const aprons=world.buildings.filter(b=>b.settlement==='briarhaven').map(b=>doorApproach(b.service,false));
 world.objects=world.objects.filter(o=>o.interiorBuilding||!['prop','tree','crop'].includes(o.type)||o.workstation||!aprons.some(([x,y])=>Math.hypot(o.x-x,o.y-y)<2.5));
 world.entry=[...MAINLAND_ENTRY];realmNavigation.clear();resetLandSurface();miniTerrain=null;mapServicesCache=null;
 currentScene=resumeScene;
 if(currentScene==='overworld'){
  const migrate=s.briarhavenLayoutVersion!==BRIARHAVEN_LAYOUT&&district(s.x,s.y);activateScene('overworld',...(migrate?MAINLAND_ENTRY:[s.x,s.y]),false);
 }
 s.briarhavenLayoutVersion=BRIARHAVEN_LAYOUT;
}
const villageBeforeBriarhaven=setupTutorialVillage;
setupTutorialVillage=function(){villageBeforeBriarhaven();rebuildBriarhaven();};
