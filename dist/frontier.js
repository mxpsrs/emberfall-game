'use strict';
const frontierQuests=[
 {title:'Medicine for Stoneford',npc:'Healer Nessa',desc:'Bring 5 fresh herbs from Riverbend Farms to Healer Nessa in Stoneford.',goal:5,reward:45,kind:'deliver',item:'herbs'},
 {title:'Wolves on the ridge',npc:'Ranger Vale',desc:'Speak with Ranger Vale, then defeat 4 ridge wolves east of Stoneford.',goal:4,reward:70,kind:'hunt',enemy:'ridgewolf'},
 {title:'The broken beacon',npc:'Keeper Orin',desc:'Bring 4 iron ore and 4 oak logs to Keeper Orin at the coastal beacon.',goal:4,reward:90,kind:'repair'},
 {title:'Ashwatch oath',npc:'Keeper Orin',desc:'Defeat the Ashwatch guardian in the eastern ruins, then return to Keeper Orin.',goal:1,reward:150,kind:'hunt',enemy:'sentinel'}
];
function setupFrontier(){
 s.frontier=s.frontier||{quest:0,accepted:false,kills:0};
 const inn=add('door',73,59,'Stoneford Lodge',13,{destination:'stoneInn'}),shop=add('door',79,59,'Stoneford Supplies',13,{destination:'stoneShop'});
 buildings.push({x:71,y:55,w:3,h:4,sprite:0,name:'Stoneford Lodge',service:inn},{x:77,y:55,w:3,h:4,sprite:2,name:'Stoneford Supplies',service:shop});
 add('camp',75,62,'Stoneford hearth',7);
 for(const [x,y,name]of [[71,62,'Healer Nessa'],[79,62,'Ranger Vale'],[87,71,'Keeper Orin']])add('questgiver',x,y,name,5,{characterSprite:true});
 buildings.push({x:87,y:66,w:3,h:4,sprite:3,name:'The coastal beacon'});
 for(let x=65;x<=90;x+=4)for(let y=42;y<=78;y+=6)if(!(y>=54&&y<=64)&&!(x>=85&&y>=65))add('tree',x,y,'Highland pine',5);
 for(const [x,y]of [[83,51],[86,56],[88,61],[82,68]])spawn('wolf',x,y,{kind:'ridgewolf',name:'Ridge wolf',hp:28,maxhp:28,atk:3,xp:38,coins:11});
 for(const [x,y]of [[76,72],[80,76],[89,75]])spawn('bandit',x,y,{name:'Ashwatch raider',hp:42,maxhp:42,coins:22,xp:55});
 spawn('skeleton',90,35,{kind:'sentinel',name:'Ashwatch guardian',hp:120,maxhp:120,atk:7,xp:230,coins:120,level:12});
 buildings.push({x:88,y:30,w:4,h:3,sprite:3,name:'Ashwatch ruins'});
 add('ore',83,44,'Ridge iron vein',6);add('ore',88,46,'Ridge iron vein',6);add('fish',66,76,'Highland fishing',9);
}
function frontierTalk(o){
 const state=s.frontier,q=frontierQuests[state.quest];stop();
 if(!q){dialog(o.name,'<p>The roads are safer, the beacon burns again, and Stoneford remembers your help.</p>');return;}
 if(o.name!==q.npc){dialog(o.name,'<p>Speak to <b>'+q.npc+'</b> about “'+q.title+'”. Check the second page of your quest journal.</p>');return;}
 if(!state.accepted){dialog(q.title,'<p>'+q.desc+'</p><p>Reward: '+q.reward+' coins.</p>',[['Accept quest',()=>{state.accepted=true;state.kills=0;close();toast('Quest started: '+q.title);save();}]]);return;}
 const ready=q.kind==='deliver'?s.bag.herbs>=5:q.kind==='repair'?s.bag.ore>=4&&s.bag.logs>=4:state.kills>=q.goal;
 dialog(q.title,'<p>'+q.desc+'</p><p>'+(ready?'You have completed the task.':q.kind==='hunt'?state.kills+' / '+q.goal+' defeated.':'Gather the supplies and return.')+'</p>',ready?[['Complete quest',()=>{if(q.kind==='deliver')s.bag.herbs-=5;if(q.kind==='repair'){s.bag.ore-=4;s.bag.logs-=4;}receiveCoins(q.reward);state.quest++;state.accepted=false;state.kills=0;close();toast(q.title+' completed · +'+q.reward+' coins');save();}]]:[]);
}
function frontierKill(o){const q=frontierQuests[s.frontier?.quest];if(q?.kind==='hunt'&&s.frontier.accepted&&q.enemy===o.kind)s.frontier.kills=Math.min(q.goal,s.frontier.kills+1);}
function renderFrontierQuest(){const f=s.frontier,q=frontierQuests[f.quest];$('panel').innerHTML='<div class="questhead"><h2>'+(q?q.title:'Friend of Stoneford')+'</h2><small>Stoneford · '+Math.min(4,f.quest+1)+' / 4</small></div><p class="desc">'+(q?q.desc:'You restored the beacon and secured the highlands.')+'</p><p class="desc">'+(q?(f.accepted?'In progress':'Speak to '+q.npc+' to begin'):'Quest chain complete')+'</p>'+(q?.kind==='hunt'&&f.accepted?'<p>'+f.kills+' / '+q.goal+' defeated</p>':'');}
