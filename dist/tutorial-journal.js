'use strict';
// Select a quest, then read its completed history and current instruction.
// No floating task panel and no spoilers for future quest steps.
let questJournalSelection=null,questJournalStepKey='';
function tutorialNextAction(){const step=tutorialStep();return step?{title:step.title,instruction:step.desc,run:guide}:null;}
function questJournalEntries(){
 const entries=[{id:'tutorial',title:'Firstlight apprenticeship',complete:!tutorialStep(),active:!!tutorialStep()}];
 for(let i=1;i<quests.length-1;i++)entries.push({id:'village-'+i,title:quests[i].title,complete:s.quest>i,active:s.quest===i});
 for(let i=0;i<frontierQuests.length;i++)entries.push({id:'frontier-'+i,title:frontierQuests[i].title,complete:(s.frontier?.quest||0)>i,active:(s.frontier?.quest||0)===i&&s.frontier?.accepted});
 if(typeof mainStoryState==='function'){const stage=mainStoryState().stage;MAIN_STORY_QUESTS.forEach((q,i)=>entries.push({id:'main-'+i,title:(i+1)+'. '+q.title,complete:stage>=q.end,active:stage>=q.start&&stage<q.end}));}
 if(typeof mountainState==='function'){const stage=mountainState().stage;entries.push({id:'mountain-1',title:'The King Beneath the Mountain — Part One',complete:stage>=11,active:stage>0&&stage<11},{id:'mountain-2',title:'The King Beneath the Mountain — Part Two',complete:stage>=20,active:stage>=11&&stage<20});}
 return entries;
}
function questJournalRows(id){
 if(id==='tutorial'){
  const completed=new Set(s.tutorialCompleted||tutorialSteps.slice(0,s.tutorial).map(t=>t.event));
  const rows=tutorialSteps.filter(t=>completed.has(t.event)).map(t=>({text:t.title,done:true}));
  const action=tutorialNextAction();if(action)rows.push({text:action.instruction,done:false,run:action.run});
  return rows;
 }
 if(id.startsWith('main-')){
  const index=Number(id.slice(5)),quest=MAIN_STORY_QUESTS[index],state=mainStoryState(),rows=[];if(!quest)return rows;
  if(state.stage<quest.start)return [{text:'Complete '+MAIN_STORY_QUESTS[index-1].title+' first.',done:false,run:mainStoryGuide}];
  for(let i=quest.start;i<Math.min(state.stage,quest.end);i++)rows.push({text:MAIN_STORY_STEPS[i][0],done:true});
  if(state.stage<quest.end)rows.push({text:MAIN_STORY_STEPS[state.stage][0],done:false,run:mainStoryGuide});return rows;
 }
 if(id.startsWith('mountain-')){
  const stage=mountainState().stage,start=id==='mountain-1'?0:11,end=id==='mountain-1'?11:20,rows=[];
  if(stage===0&&typeof mainStoryComplete==='function'&&!mainStoryComplete())return [{text:'Complete The Broken Watch, The Weight of an Oath and Echoes Without a Name, in that order.',done:false,run:mainStoryGuide}];
  if(stage<start)return [{text:'Complete Part One of The King Beneath the Mountain first.',done:false}];
  for(let i=start;i<Math.min(stage,end);i++)rows.push({text:MOUNTAIN_STEPS[i][1],done:true});
  if(stage<end)rows.push({text:MOUNTAIN_STEPS[stage][1],done:false,run:mountainGuide});
  return rows;
 }
 const index=Number(id.split('-')[1]),frontier=id.startsWith('frontier-'),q=frontier?frontierQuests[index]:quests[index];
 if(!q)return [];
 const progress=frontier?(s.frontier?.quest||0):s.quest,finished=progress>index,accepted=finished||progress===index&&(!frontier||s.frontier.accepted),npc=frontier?q.npc:'Elder Rowan';
 if(!accepted)return [{run:()=>guideSideQuest(frontier,index),text:(progress<index-(frontier?0:1)?'Finish the earlier '+(frontier?'Stoneford':'Briarhaven')+' quest, then speak to ': 'Speak to ')+npc+' to begin.',done:false}];
 const rows=[{text:'Accepted '+q.title+' from '+npc+'.',done:true}];
 const checks=frontier?q.kind==='hunt'?[[q.desc,s.frontier.kills,q.goal]]:q.item?[[q.desc,s.bag[q.item]||0,q.goal]]:q.kind==='repair'?[['Iron ore',s.bag.ore||0,4],['Oak logs',s.bag.logs||0,4]]:[]:q.checks?.()||[];
 for(const [label,value,goal]of checks){const done=finished||value>=goal;rows.push({text:label+(done?'':' · '+Math.min(value,goal)+' / '+goal),done,run:()=>guideSideQuest(frontier,index)});if(!done)return rows;}
 if(!checks.length)rows.push({text:q.desc,done:finished});
 if(finished||checks.length)rows.push({text:'Return to '+npc+' to complete the quest.',done:finished,run:()=>guideSideQuest(frontier,index)});
 return rows;
}
function renderQuestJournal(){
 if(questJournalSelection===s.trackedQuest){const next=trackedQuestId();if(next&&next!==questJournalSelection){questJournalSelection=next;s.trackedQuest=next;}}
 pageControls(1,1);const panel=$('panel'),scroll=panel.scrollTop;panel.replaceChildren();
 const entries=questJournalEntries(),selected=entries.find(q=>q.id===questJournalSelection);
 if(!selected){
  const title=document.createElement('h2');title.className='quest-journal-title';title.textContent='Quest journal';panel.appendChild(title);
  const list=document.createElement('div');list.className='quest-journal-list';
  for(const quest of entries){const button=document.createElement('button');button.type='button';button.dataset.questId=quest.id;button.className=quest.complete?'quest-complete':quest.active?'quest-active':'quest-not-started';button.textContent=quest.title;button.setAttribute('aria-label',quest.title+' — '+(quest.complete?'complete':quest.active?'in progress':'not started'));button.onclick=()=>{questJournalSelection=quest.id;if(!quest.complete)trackQuest(quest.id);panel.scrollTop=0;renderQuestJournal();};list.appendChild(button);}panel.appendChild(list);return;
 }
 const back=document.createElement('button');back.textContent='All quests';back.className='quest-journal-back';back.onclick=()=>{questJournalSelection=null;renderQuestJournal();};panel.appendChild(back);
 const title=document.createElement('h2');title.className='quest-journal-title';title.textContent=selected.title;panel.appendChild(title);
 let currentLine=null,currentKey='';
 const history=document.createElement('ol');history.className='quest-journal-history';
 for(const row of questJournalRows(selected.id)){
  const line=document.createElement('li');line.className=row.done?'quest-step-done':'quest-step-current';
  const text=document.createElement(row.done?'s':'p');text.textContent=row.text;line.appendChild(text);
  if(!row.done){currentLine=line;currentKey=selected.id+':'+row.text;const badge=document.createElement('strong');badge.className='quest-next-label';badge.textContent='NEXT STEP';line.prepend(badge);line.setAttribute('aria-current','step');text.setAttribute('role','status');if(row.run){const button=document.createElement('button');button.type='button';button.textContent='Show me where';button.onclick=()=>{trackQuest(selected.id);row.run();};line.appendChild(button);}}
  history.appendChild(line);
 }
 panel.appendChild(history);
 if(selected.complete){const complete=document.createElement('p');complete.className='quest-journal-complete';complete.textContent='Quest complete.';panel.appendChild(complete);}
 if(selected.id.startsWith('main-')){
  const q=mainStoryState(),notes=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Evidence and quest notes';notes.className='mountain-notes';notes.appendChild(summary);
  const note=text=>{const p=document.createElement('p');p.textContent=text;notes.appendChild(p);},index=Number(selected.id.slice(5));
  if(index===0){if(q.witness)note('Tovin: the courier escaped west; the raider took the dispatch east.');for(const k of q.clues)note(MAIN_STORY_CLUES[k][1]);if(q.dispatch)note('Forged dispatch: withdraw patrols and abandon the lift crew. The obsolete seal has seven crown points; current royal orders have five.');}
  if(index===1){if(q.safety)note('Lift safety: Air before entry. Pin the brake. Seat the weight. Open the ramp.');if(q.pin)note('Bound rescue tool: forged locking pin.');if(q.stage>=15)note('Bera lost her voice before the alarm, yet Oren heard her calling from below while standing beside her.');if(q.testimony)note('Hesta’s signed testimony: both workers rescued; false orders copied the royal seal; stolen voices called from below.');}
  if(index===2){for(const k of q.stones)note(MAIN_STORY_STONES[k][1]);if(q.comparison)note('The curse steals living voices. Restore the oath: Bell, Lantern, Hand.');if(q.memoryShard)note('Whispering memory shard: Send the ward-keepers below. Let the borrowed voice carry the order.');}
  const reward=MAIN_STORY_QUESTS[index];note('Reward: '+reward.coins+' coins; '+Object.entries(reward.xp).map(([skill,xp])=>xp+' '+skill+' XP').join('; ')+'.');panel.appendChild(notes);
 }
 if(selected.id.startsWith('mountain-')){
  const state=mountainState(),notes=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Evidence and quest notes';notes.className='mountain-notes';notes.appendChild(summary);
  const note=text=>{const p=document.createElement('p');p.textContent=text;notes.appendChild(p);};
  for(const key of state.clues)note(MOUNTAIN_CLUES[key][2]);
  if(state.stage>=3)note('Seal inscription: Stone remembers. Iron carries. Breath awakens.');
  if(state.inscription)note('Inscription: Within the broken oath, the listener waits. Return the witness to the threshold.');
  if(state.lairKey)note('Alaric identified the fragment as the key to Veyr’s lair.');
  if(state.truths)for(const binding of Object.values(MOUNTAIN_BINDINGS))note(binding.memory);
  for(const key of state.bindings)note(MOUNTAIN_BINDINGS[key].name+': freed.');
  panel.appendChild(notes);
 }
 panel.scrollTop=scroll;if(currentLine&&currentKey!==questJournalStepKey){questJournalStepKey=currentKey;panel.scrollTop=Math.max(0,(currentLine.offsetTop||0)-(panel.offsetTop||0)-24);}
}
function renderTutorialJournal(){questJournalSelection='tutorial';renderQuestJournal();}
