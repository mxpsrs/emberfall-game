'use strict';
// One objective drives the world arrow, minimap arrow and tracked journal step.
function trackedQuestId(){
 if(currentScene==='tutorial'&&tutorialStep())return 'tutorial';
 // Viewing a journal entry and tracking an objective are independent choices.
 if(s.trackedQuest){const id=s.trackedQuest;
  if(id.startsWith('village-'))return s.quest===Number(id.split('-')[1])||s.quest===0&&id==='village-1'?id:null;
  if(id.startsWith('frontier-'))return (s.frontier?.quest||0)===Number(id.split('-')[1])?id:null;
  if(id.startsWith('main-')){const q=MAIN_STORY_QUESTS[Number(id.slice(5))],stage=mainStoryState().stage;return q&&stage>=q.start&&stage<q.end?id:null;}
  if(id.startsWith('mountain-')){const stage=mountainState().stage;return id==='mountain-1'&&stage<11&&mainStoryComplete()||id==='mountain-2'&&stage>=11&&stage<20?id:null;}
  return null;
 }
 return null;
}
function trackQuest(id){s.trackedQuest=id;miniTerrain=null;save();}
function rawQuestObjective(id){
 if(!id)return null;
 if(id==='tutorial'){const o=tutorialGoal();return o?{scene:currentScene,o:o.tutorialDoor||o}:null;}
 if(id.startsWith('village-')||id.startsWith('frontier-'))return {scene:'overworld',o:sideQuestObjective(id.startsWith('frontier-'),Number(id.split('-')[1]))};
 if(id.startsWith('main-')){
  const q=mainStoryState(),selected=MAIN_STORY_QUESTS[Number(id.slice(5))];if(!selected||q.stage<selected.start||q.stage>=selected.end)return null;let key=MAIN_STORY_STEPS[q.stage][1];if(q.stage===13&&q.excavation)key='lift';if(q.stage===6&&!arcOwnsAnywhere('forgedOrders'))key='dispatch';
  if(key==='clues')key=Object.keys(MAIN_STORY_CLUES).find(k=>!q.clues.includes(k));
  if(key==='stones')key=Object.keys(MAIN_STORY_STONES).find(k=>!q.stones.includes(k));
  if(key==='escort')return ['bera','oren'].map(mainStoryFound).find(f=>!q.rescued.includes(f.o.mainStoryKey)&&f.scene===currentScene&&Math.hypot(f.o.x-px,f.o.y-py)>8)||(currentScene==='story_mine'?{scene:currentScene,o:worldScenes.story_mine.exit}:mainStoryFound('hesta'));
  return mainStoryFound(key);
 }
 if(id.startsWith('mountain-')){
  const q=mountainState(),start=id==='mountain-1'?0:11,end=id==='mountain-1'?11:20;if(q.stage<start||q.stage>=end||q.stage===0&&!mainStoryComplete()||q.stage===12&&!q.inscription)return null;
  let key=MOUNTAIN_STEPS[q.stage][2];if(q.stage===6&&!q.fieldOrders)key='fieldOrders';if(key==='clues')key=Object.keys(MOUNTAIN_CLUES).find(k=>!q.clues.includes(k));if(key==='bindings')key='binding_'+Object.keys(MOUNTAIN_BINDINGS).find(k=>!q.bindings.includes(k));
  return key==='veyr'?{scene:'lair_veyr',o:worldScenes.lair_veyr.objects.find(o=>o.encounter==='veyr')}:mountainObject(key);
 }return null;
}
function questWorldObjective(){
 let found=rawQuestObjective(trackedQuestId());if(!found?.o)return null;
 if(found.scene!==currentScene)found={scene:currentScene,o:currentScene==='overworld'?objects.find(o=>o.destination===found.scene):worldScenes[currentScene]?.exit};
 let o=found.o;if(!o||o.collected||o.dead>time)return null;
 const inside=buildings.find(b=>b.walkIn&&withinWalkIn(b,px,py)),room=buildings.find(b=>b.walkIn&&(o.interiorBuilding===b.service?.destination||withinWalkIn(b,o.x,o.y)));
 const closed=inside&&inside!==room&&inside.service.openedAt===undefined?inside:room&&room!==inside&&room.service.openedAt===undefined?room:null;
 return closed?.service||o;
}
function questNpcMarker(o){
 if(fighter(o))return null;
 if(!(o.characterSprite||o.tutor||['elder','questgiver'].includes(o.type)))return null;
 if(currentScene==='tutorial')return rawQuestObjective('tutorial')?.o===o?'?':null;
 const stage=mainStoryState().stage,mountain=mountainState().stage;
 // Offers are gated by story order and the actual dialogue's skill requirements.
 if(o.mainStoryKey==='rellan'&&stage===0||o.mainStoryKey==='hesta'&&stage===7&&lv('Mining')>=5&&lv('Smithing')>=5||o.mainStoryKey==='ilyra'&&stage===18&&lv('Magic')>=5||o.mountainKey==='maerin'&&mainStoryComplete()&&[0,11].includes(mountain)&&!arcGate(mountain===0?4:5))return '!';
 const f=s.frontier?.quest||0,q=frontierQuests[f];if(q&&o.name===q.npc&&!s.frontier.accepted)return '!';
 if(o.type==='elder'&&s.quest===0)return '!';
 const ids=[!mainStoryComplete()?'main-'+MAIN_STORY_QUESTS.findIndex(q=>stage>=q.start&&stage<q.end):mountain<11?'mountain-1':'mountain-2',s.quest>0&&s.quest<quests.length-1?'village-'+s.quest:null,q&&s.frontier.accepted?'frontier-'+f:null];
 return ids.some(id=>{const goal=rawQuestObjective(id);return goal?.scene===currentScene&&goal.o===o;})?'?':null;
}
function questPulse(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:.68+.32*Math.sin(time*Math.PI*2);}
function paintQuestArrow(g,x,y,angle=0,size=1,color='#ffe06d'){
 g.save();g.translate(x,y);g.rotate(angle);g.scale(size,size);g.globalAlpha=questPulse();g.fillStyle=color;g.strokeStyle=color==='#50efff'?'#073941':'#34270b';g.lineWidth=2.5;g.beginPath();g.moveTo(-5,-22);g.lineTo(5,-22);g.lineTo(5,-11);g.lineTo(12,-11);g.lineTo(0,2);g.lineTo(-12,-11);g.lineTo(-5,-11);g.closePath();g.fill();g.stroke();g.restore();
}
function drawQuestWorldGuide(g){
 const o=questWorldObjective();if(!o||Math.hypot(o.x-px,o.y-py)>32)return;
 const x=(o.drawX??o.x)+.5,z=(o.drawY??o.y)+.5,head=o.characterSprite||o.tutor?2.6:o.type==='tree'?4:o.mainStoryKey==='cart'?2:o.passageKind==='cave'?2.6:.55;
 g.save();g.globalAlpha=questPulse();ring3(g,x,z,'#ffe06d',o.mainStoryKey==='boots'?1.3:.8);g.restore();const p=project3(x,head,z);paintQuestArrow(g,p.x,p.y);
}
function drawQuestMinimap(g,point,cw,ch){
 const o=questWorldObjective();if(!o)return;const [x,y]=point(o.drawX??o.x,o.drawY??o.y),dx=x-cw/2,dy=y-ch/2,t=Math.min(1,(cw/2-30)/Math.max(1,Math.abs(dx)),(ch/2-30)/Math.max(1,Math.abs(dy)));
 paintQuestArrow(g,cw/2+dx*t,ch/2+dy*t,t<1?Math.atan2(dy,dx)-Math.PI/2:0,1.1,'#50efff');
}
