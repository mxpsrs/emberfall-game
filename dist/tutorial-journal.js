'use strict';
// Select a quest, then read its completed history and current instruction.
// No floating task panel and no spoilers for future quest steps.
let questJournalSelection=null;
function tutorialNextAction(){const step=tutorialStep();return step?{title:step.title,instruction:step.desc,run:guide}:null;}
function questJournalEntries(){
 const entries=[{id:'tutorial',title:'Firstlight apprenticeship',complete:!tutorialStep(),active:!!tutorialStep()}];
 for(let i=1;i<quests.length-1;i++)entries.push({id:'village-'+i,title:quests[i].title,complete:s.quest>i,active:s.quest===i});
 for(let i=0;i<frontierQuests.length;i++)entries.push({id:'frontier-'+i,title:frontierQuests[i].title,complete:(s.frontier?.quest||0)>i,active:(s.frontier?.quest||0)===i&&s.frontier?.accepted});
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
 if(id.startsWith('mountain-')){
  const stage=mountainState().stage,start=id==='mountain-1'?0:11,end=id==='mountain-1'?11:20,rows=[];
  if(stage<start)return [{text:'Complete Part One of The King Beneath the Mountain first.',done:false}];
  for(let i=start;i<Math.min(stage,end);i++)rows.push({text:MOUNTAIN_STEPS[i][1],done:true});
  if(stage<end)rows.push({text:MOUNTAIN_STEPS[stage][1],done:false,run:mountainGuide});
  return rows;
 }
 const index=Number(id.split('-')[1]),frontier=id.startsWith('frontier-'),q=frontier?frontierQuests[index]:quests[index];
 if(!q)return [];
 const progress=frontier?(s.frontier?.quest||0):s.quest,finished=progress>index,accepted=finished||progress===index&&(!frontier||s.frontier.accepted),npc=frontier?q.npc:'Elder Rowan';
 if(!accepted)return [{text:(progress<index-(frontier?0:1)?'Finish the earlier '+(frontier?'Stoneford':'Briarhaven')+' quest, then speak to ': 'Speak to ')+npc+' to begin.',done:false}];
 const rows=[{text:'Accepted '+q.title+' from '+npc+'.',done:true}];
 const checks=frontier?q.kind==='hunt'?[[q.desc,s.frontier.kills,q.goal]]:q.item?[[q.desc,s.bag[q.item]||0,q.goal]]:[]:q.checks?.()||[];
 for(const [label,value,goal]of checks){const done=finished||value>=goal;rows.push({text:label+(done?'':' · '+Math.min(value,goal)+' / '+goal),done});if(!done)return rows;}
 if(!checks.length)rows.push({text:q.desc,done:finished});
 if(finished||checks.length)rows.push({text:'Return to '+npc+' to complete the quest.',done:finished});
 return rows;
}
function renderQuestJournal(){
 pageControls(1,1);const panel=$('panel'),scroll=panel.scrollTop;panel.replaceChildren();
 const entries=questJournalEntries(),selected=entries.find(q=>q.id===questJournalSelection);
 if(!selected){
  const title=document.createElement('h2');title.className='quest-journal-title';title.textContent='Quest journal';panel.appendChild(title);
  const list=document.createElement('div');list.className='quest-journal-list';
  for(const quest of entries){const button=document.createElement('button');button.type='button';button.dataset.questId=quest.id;button.className=quest.complete?'quest-complete':quest.active?'quest-active':'quest-not-started';button.textContent=quest.title;button.setAttribute('aria-label',quest.title+' — '+(quest.complete?'complete':quest.active?'in progress':'not started'));button.onclick=()=>{questJournalSelection=quest.id;panel.scrollTop=0;renderQuestJournal();};list.appendChild(button);}panel.appendChild(list);return;
 }
 const back=document.createElement('button');back.textContent='All quests';back.className='quest-journal-back';back.onclick=()=>{questJournalSelection=null;renderQuestJournal();};panel.appendChild(back);
 const title=document.createElement('h2');title.className='quest-journal-title';title.textContent=selected.title;panel.appendChild(title);
 const history=document.createElement('ol');history.className='quest-journal-history';
 for(const row of questJournalRows(selected.id)){
  const line=document.createElement('li');line.className=row.done?'quest-step-done':'quest-step-current';
  const text=document.createElement(row.done?'s':'p');text.textContent=row.text;line.appendChild(text);
  if(!row.done){line.setAttribute('aria-current','step');text.setAttribute('role','status');if(row.run){const button=document.createElement('button');button.type='button';button.textContent='Show me where';button.onclick=row.run;line.appendChild(button);}}
  history.appendChild(line);
 }
 panel.appendChild(history);
 if(selected.complete){const complete=document.createElement('p');complete.className='quest-journal-complete';complete.textContent='Quest complete.';panel.appendChild(complete);}
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
 panel.scrollTop=scroll;
}
function renderTutorialJournal(){questJournalSelection='tutorial';renderQuestJournal();}
