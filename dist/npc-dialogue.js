'use strict';
let npcDialogueState=null,npcConversationSpeaker=null;
function dialoguePages(html){
 const text=html.replace(/<br\s*\/?\s*>/gi,' ').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/[“”]/g,'');
 const pages=[];for(const paragraph of text.split('\n').map(p=>p.trim()).filter(Boolean)){
  let page='';for(const sentence of paragraph.match(/[^.!?]+[.!?]+(?:\s|$)|.+$/g)||[paragraph]){if(page&&page.length+sentence.length>340){pages.push(page.trim());page='';}page+=sentence;}
  if(page)pages.push(page.trim());
 }return pages.length?pages:['…'];
}
function withNpcSpeaker(o,action){const previous=npcConversationSpeaker;npcConversationSpeaker=o;try{return action();}finally{npcConversationSpeaker=previous;}}
function findDialogueSpeaker(title){
 if(npcConversationSpeaker)return npcConversationSpeaker;
 return objects.find(o=>o.name===title&&(o.tutor||o.characterSprite||['elder','villager','questgiver','inn','banker'].includes(o.type)))||Object.entries(TUTORS).map(([tutor,o])=>({...o,tutor,sprite:o.look})).find(o=>o.name===title)||null;
}
function endNpcDialogue(){npcDialogueState=null;$('modal').classList.remove('npc-dialogue');document.body.classList.remove('npc-talking');$('modal').removeAttribute('aria-labelledby');$('closeModal').textContent='Back to adventure';$('closeModal').setAttribute('aria-label','Back to adventure');}
function drawNpcPortrait(){
 const state=npcDialogueState,c=$('npcPortrait');if(!state||!c||typeof creatorPainter!=='function'||!assetsReady)return;
 const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);const speaker=state.speaker,look=speaker.sprite??speaker.look??0,gear={...npcEquipment(speaker),_portrait:true};
 if(!speaker.tutor&&!speaker.appearanceRole){gear._frame=speaker.kind==='man'?'male':speaker.frame||((look%3===2)?'female':'male');gear._appearance={topStyle:4,bottomStyle:3,topColor:(speaker.id||0)%8,bottomColor:7,hair:(speaker.id||0)%4,hairColor:(speaker.id||0)%4};}
 if(speaker.civilianModel)gear._civilian=speaker.civilianModel;
 const scale=275,angle=-.18,cy=Math.cos(angle),sy=Math.sin(angle),before=meshDetail3;meshDetail3=1;
 try{const painter=creatorPainter(g,(x,y,z)=>({x:c.width/2+(x*cy-z*sy)*scale,y:32+(1.91-y)*scale+(x*sy+z*cy)*scale*.035,depth:x*sy+z*cy+y*.035}),c.width,c.height);humanoid3(painter,0,0,look,gear,0);painter.flush();}finally{meshDetail3=before;}
}
function renderNpcDialogue(){
 const state=npcDialogueState;if(!state)return;
 $('npcName').textContent=state.speaker.name;$('npcTopic').textContent=state.topic===state.speaker.name?'':state.topic;
 $('npcWords').textContent=state.pages[state.page];$('npcPage').textContent=state.pages.length>1?(state.page+1)+' / '+state.pages.length:'';
 const choices=$('npcChoices');choices.replaceChildren();
 const actions=state.page<state.pages.length-1?[['Click here to continue',()=>{state.page++;renderNpcDialogue();}]]:state.choices.length?state.choices:[['Click here to continue',close]];
 actions.forEach(([label,action],index)=>{const button=document.createElement('button');button.type='button';button.className='npc-choice';const number=document.createElement('span'),copy=document.createElement('span');number.className='npc-choice-number';number.textContent=actions.length>1?String(index+1)+'.':'›';copy.textContent=label;button.append(number,copy);button.setAttribute('aria-label',label);button.onclick=()=>{if(typeof playGameSound==='function')playGameSound('click');action();};choices.appendChild(button);});
 choices.querySelector('button')?.focus({preventScroll:true});
}
function openNpcDialogue(speaker,html,choices=[],topic=speaker.name){
 if(window.realmTrade||window.realmWorkbench||window.equipmentStatsOpen)close();
 if($('modal').open)$('modal').close();stop();closeWorldOptions();
 npcDialogueState={speaker,topic,pages:Array.isArray(html)?html:dialoguePages(html),page:0,choices};
 $('modal').classList.add('npc-dialogue');$('modal').setAttribute('aria-labelledby','npcName');document.body.classList.add('npc-talking');
 $('modalBody').innerHTML='<div class="npc-portrait-frame"><canvas id="npcPortrait" width="220" height="240" aria-hidden="true"></canvas></div><section class="npc-conversation"><div class="npc-name-row"><h2 id="npcName"></h2><span id="npcPage"></span></div><small id="npcTopic"></small><p id="npcWords" aria-live="polite"></p><div id="npcChoices" class="npc-choices"></div></section>';
 $('closeModal').textContent='×';$('closeModal').setAttribute('aria-label','Leave conversation');$('modal').showModal();renderNpcDialogue();drawNpcPortrait();
}
const dialogBeforePortrait=dialog;
dialog=function(title,html,choices=[]){const speaker=findDialogueSpeaker(title);if(speaker)return openNpcDialogue(speaker,html,choices,title);if(npcDialogueState)endNpcDialogue();return dialogBeforePortrait(title,html,choices);};
const closeBeforePortrait=close;
close=function(){if(npcDialogueState)endNpcDialogue();return closeBeforePortrait();};
const talkTutorBeforePortrait=talkTutor;
talkTutor=function(o){return withNpcSpeaker(o,()=>talkTutorBeforePortrait(o));};
const frontierBeforePortrait=frontierTalk;
frontierTalk=function(o){return withNpcSpeaker(o,()=>frontierBeforePortrait(o));};
const worldBeforePortrait=handleWorldInteraction;
handleWorldInteraction=function(o){if(o.type==='villager')return withNpcSpeaker(o,()=>worldBeforePortrait(o));return worldBeforePortrait(o);};
talkVillager=function(o){stop();openNpcDialogue(o,o.talk||'The roads are dangerous these days. Stock up on food before you leave town.');};
$('modal').addEventListener('close',()=>{if(!$('modal').open&&npcDialogueState)endNpcDialogue();});
document.addEventListener('keydown',e=>{if(!npcDialogueState||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const buttons=$('npcChoices').querySelectorAll('button');if(e.key===' '&&!e.target?.closest?.('button')){e.preventDefault();buttons[0]?.click();}else if(/^[1-9]$/.test(e.key)){e.preventDefault();buttons[Number(e.key)-1]?.click();}});

const innBeforePortrait=inn;
inn=function(){const keeper=objects.find(o=>o.type==='inn')||{name:'Innkeeper',sprite:1,characterSprite:true};return withNpcSpeaker(keeper,()=>innBeforePortrait());};
