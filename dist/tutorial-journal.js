'use strict';
// Select a quest, then read its completed history and current instruction.
// No floating task panel and no spoilers for future quest steps.
let questJournalSelection=null,questJournalStepKey='';
function tutorialNextAction(){const step=tutorialStep();return step?{title:step.title,instruction:step.desc,run:guide}:null;}
function questJournalEntries(){
 const entries=[{id:'tutorial',title:'The First Accord',complete:!tutorialStep(),active:!!tutorialStep()}];
 for(let i=1;i<quests.length-1;i++)entries.push({id:'village-'+i,title:quests[i].title,complete:s.quest>i,active:s.quest===i});
 for(let i=0;i<frontierQuests.length;i++)entries.push({id:'frontier-'+i,title:frontierQuests[i].title,complete:(s.frontier?.quest||0)>i,active:(s.frontier?.quest||0)===i&&s.frontier?.accepted});
 if(typeof mainStoryState==='function'){const stage=mainStoryState().stage;MAIN_STORY_QUESTS.forEach((q,i)=>entries.push({id:'main-'+i,title:(i+1)+'. '+q.title,complete:stage>=q.end,active:stage>q.start&&stage<q.end}));}
 if(typeof mountainState==='function'){const stage=mountainState().stage;entries.push({id:'mountain-1',title:'4. The King Beneath the Mountain',complete:stage>=11,active:stage>0&&stage<11},{id:'mountain-2',title:'5. The Borrowed King',complete:stage>=20,active:stage>11&&stage<20});}
 if(typeof relicQuestState==='function'){const stage=relicQuestState().stage;entries.push({id:'relic-shaping',title:'The Well Between Worlds',complete:stage===7,active:stage>0&&stage<7});}
 return entries;
}
function questJournalRows(id){
 if(id==='relic-shaping'&&typeof relicQuestRows==='function')return relicQuestRows();
 if(id==='tutorial'){
  const completed=new Set(s.tutorialCompleted||tutorialSteps.slice(0,s.tutorial).map(t=>t.event));
  const rows=tutorialSteps.filter(t=>completed.has(t.event)).map(t=>({text:t.title,done:true}));
  const action=tutorialNextAction();if(action)rows.push({text:action.instruction,done:false,run:action.run});
  return rows;
 }
 if(id.startsWith('main-')){
  const index=Number(id.slice(5)),quest=MAIN_STORY_QUESTS[index],state=mainStoryState(),rows=[];if(!quest)return rows;
  if(state.stage<quest.start)return [{text:'Requires '+MAIN_STORY_QUESTS[index-1].title+' completed. Other available quests can be played alongside the main story.',done:false}];
  for(let i=quest.start;i<Math.min(state.stage,quest.end);i++)rows.push({text:MAIN_STORY_STEPS[i][0],done:true});
  if(state.stage<quest.end)rows.push({text:MAIN_STORY_STEPS[state.stage][0],done:false,run:mainStoryGuide});return rows;
 }
 if(id.startsWith('mountain-')){
  const stage=mountainState().stage,start=id==='mountain-1'?0:11,end=id==='mountain-1'?11:20,rows=[];
  if(stage===0&&typeof mainStoryComplete==='function'&&!mainStoryComplete())return [{text:'Requires Whispers at Hollow Shrine completed. You can pursue other available quests while investigating the main story.',done:false}];
  if(stage<start)return [{text:'Requires The King Beneath the Mountain completed.',done:false}];
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
 pageControls(1,1);const panel=$('panel'),scroll=panel.scrollTop;panel.replaceChildren();
 const entries=questJournalEntries(),selected=entries.find(q=>q.id===questJournalSelection);
 if(!selected){
  const title=document.createElement('h2');title.className='quest-journal-title';title.textContent='Quest journal';panel.appendChild(title);
  const list=document.createElement('div');list.className='quest-journal-list';
  for(const quest of entries){const button=document.createElement('button');button.type='button';button.dataset.questId=quest.id;button.className=quest.complete?'quest-complete':quest.active?'quest-active':'quest-not-started';button.textContent=quest.title;button.setAttribute('aria-label',quest.title+' — '+(quest.complete?'complete':quest.active?'in progress':'not started'));button.onclick=()=>{questJournalSelection=quest.id;panel.scrollTop=0;renderQuestJournal();};list.appendChild(button);}panel.appendChild(list);return;
 }
 const back=document.createElement('button');back.textContent='All quests';back.className='quest-journal-back';back.onclick=()=>{questJournalSelection=null;renderQuestJournal();};panel.appendChild(back);
 const title=document.createElement('h2');title.className='quest-journal-title';title.textContent=selected.title;panel.appendChild(title);
 const detail=document.createElement('p');detail.className='desc';
 if(selected.id.startsWith('main-')){const i=Number(selected.id.slice(5)),q=MAIN_STORY_QUESTS[i];detail.textContent=[
 'Investigate a murdered courier, follow the evidence to paid raiders, and discover who emptied the northern road. Firstlight Apprenticeship required; recommended Combat 8.',
 'Rescue Ironhollow’s trapped workers, learn the lift safety controls, and uncover deliberate sabotage. Mining 5; Smithing 5; recommended Combat 10.',
 'Explore Hollow Shrine, compare stolen memories with real testimony, and confront the Echo Shade. Magic 5; recommended Combat 12.'
 ][i]+' Rewards: '+q.coins+' coins; '+Object.entries(q.xp).map(([k,n])=>n+' '+k+' XP').join(', ')+'; '+ITEMS[q.item].name+'.';}
 else if(selected.id.startsWith('mountain-'))detail.textContent=selected.id==='mountain-1'?'Trace the missing Wardkeepers into the occupied Underworks. Mining 8, Smithing 8, Magic 8; recommended Combat 15. Rewards: 600 coins, 600 Mining/Smithing/Magic XP, 300 Defence/Hitpoints XP, Wardkeeper Cape.':'Face Veyr with Alaric and the counter-ward. Magic 10, Worship 8; recommended Combat 18. Rewards: 1,000 coins, 750 XP in all seven combat skills, Veilbreaker Ring. Veyr’s Orb is separate 1/250 boss loot.';
 else if(selected.id!=='tutorial'){const i=Number(selected.id.split('-')[1]),q=selected.id.startsWith('frontier-')?frontierQuests[i]:quests[i];detail.textContent=q?.desc||'';}
 if(detail.textContent)panel.appendChild(detail);
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
  if(index===0){if(q.witness)note('Tovin survived the courier’s murder. The raiders took the dispatch east; covered cargo passed toward Ironhollow while patrols were absent.');for(const k of q.clues)if(MAIN_STORY_CLUES[k])note(MAIN_STORY_CLUES[k][1]);if(q.dispatch)note((q.forgedOrdersRecorded?'Forged Orders (archived with Rellan): ':'Forged Orders (recovered): ')+'withdraw the northern patrols. The royal authorities did not issue them. Payment and cargo slips connect the hired raiders to an unseen delivery toward Ironhollow. The copied seal has seven points; current royal orders have five.');}
  if(index===1){if(q.safety)note('Lift safety: Air before entry. Pin the brake. Seat the weight. Open the ramp.');if(q.pin)note('Bound rescue tool: forged locking pin.');if(q.stage>=15)note('Bera lost her voice before the alarm, yet Oren heard her calling from below while standing beside her.');if(q.testimony)note('Hesta’s signed testimony: both workers rescued; false orders copied the royal seal; stolen voices called from below.');}
  if(index===2){for(const k of q.stones)note(MAIN_STORY_STONES[k][1]);if(q.comparison)note('The curse steals living voices. Restore the oath: Bell, Lantern, Hand.');if(q.memoryShard)note('Memory Shard: incomplete references to Wardkeepers, Ironhollow, ancient seals and something imprisoned below. The Echo Shade fed on the phenomenon; it did not create it.');}
  const reward=MAIN_STORY_QUESTS[index];note('Wearable reward: '+ITEMS[reward.item].name+'. Recover from its quest giver if lost.');note('Reward: '+reward.coins+' coins; '+Object.entries(reward.xp).map(([skill,xp])=>xp+' '+skill+' XP').join('; ')+'.');panel.appendChild(notes);
 }
 if(selected.id.startsWith('mountain-')){
  const state=mountainState(),notes=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Evidence and quest notes';notes.className='mountain-notes';notes.appendChild(summary);
  const note=text=>{const p=document.createElement('p');p.textContent=text;notes.appendChild(p);};
  for(const key of state.clues)note(MOUNTAIN_CLUES[key][2]);
  if(state.stage>=3)note('Service-hatch inscription: Stone remembers. Iron carries. Breath awakens. This opens service access, not the prison.');
  if(state.inscription)note('The Wardkeeper record names Alaric among those who previously repaired the prison.');
  if(state.lairKey)note('Alaric is helping resist Veyr. His earlier mistake involved a copied friend’s voice; the present unknown operatives deliberately broke the prison.');
  if(state.truths)for(const binding of Object.values(MOUNTAIN_BINDINGS))note(binding.memory);
  for(const key of state.bindings)note(MOUNTAIN_BINDINGS[key].name+': freed.');
  if(state.awakened)note('The masked operatives completed the final rite. They awakened Veyr; I did not.');
  if(state.signalKnown)note('Three steady lights identify Alaric’s counter-ward. Never lower it on a voice’s command.');
  if(state.lastMemory)note('Enemy survey chart: several prisons are marked across Veldren. Ironhollow was one target; identities and ultimate purpose remain unknown.');
  panel.appendChild(notes);
 }
 panel.scrollTop=scroll;if(currentLine&&currentKey!==questJournalStepKey){questJournalStepKey=currentKey;panel.scrollTop=Math.max(0,(currentLine.offsetTop||0)-(panel.offsetTop||0)-24);}
}
function renderTutorialJournal(){questJournalSelection='tutorial';renderQuestJournal();}
